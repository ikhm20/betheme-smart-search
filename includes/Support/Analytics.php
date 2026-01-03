<?php
/**
 * Analytics table helper.
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Support_Analytics {
    public static function get_table_name() {
        global $wpdb;
        return $wpdb->prefix . 'betheme_search_analytics';
    }

    public static function get_presearch_table_name() {
        global $wpdb;
        return $wpdb->prefix . 'betheme_search_presearch';
    }

    public static function log_query($query, $results_count, $context, $user_ip, $user_agent) {
        if (!self::table_exists()) {
            return;
        }

        $query = sanitize_text_field($query);
        $context = self::normalize_context($context);
        $user_ip = sanitize_text_field($user_ip);
        $user_agent = sanitize_text_field($user_agent);

        if ($query === '') {
            return;
        }

        global $wpdb;
        $table = self::get_table_name();

        $wpdb->insert(
            $table,
            array(
                'query' => $query,
                'results_count' => (int) $results_count,
                'context' => $context,
                'user_ip' => $user_ip,
                'user_agent' => $user_agent,
            ),
            array('%s', '%d', '%s', '%s', '%s')
        );
    }

    public static function log_presearch_event($query, $context, $event, $meta = array()) {
        if (!self::presearch_table_exists()) {
            return;
        }

        $query = sanitize_text_field($query);
        $context = self::normalize_context($context);
        $event = sanitize_text_field($event);

        if ($query === '' || $event === '') {
            return;
        }

        $meta = is_array($meta) ? $meta : array('value' => $meta);
        $meta = wp_json_encode($meta);
        list($user_ip, $user_agent) = self::get_request_meta();

        global $wpdb;
        $table = self::get_presearch_table_name();

        $wpdb->insert(
            $table,
            array(
                'query' => $query,
                'context' => $context,
                'event' => $event,
                'meta' => is_string($meta) ? $meta : '',
                'user_ip' => $user_ip,
                'user_agent' => $user_agent,
            ),
            array('%s', '%s', '%s', '%s', '%s', '%s')
        );
    }

    public static function table_exists() {
        global $wpdb;
        $table = self::get_table_name();
        $exists = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $table));
        return $exists === $table;
    }

    public static function presearch_table_exists() {
        global $wpdb;
        $table = self::get_presearch_table_name();
        $exists = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $table));
        return $exists === $table;
    }

    private static function clamp_days($days) {
        $days = (int) $days;
        return max(1, min(365, $days));
    }

    private static function clamp_limit($limit) {
        $limit = (int) $limit;
        return max(1, min(50, $limit));
    }

    private static function get_since($days) {
        $days = self::clamp_days($days);
        return gmdate('Y-m-d H:i:s', time() - $days * DAY_IN_SECONDS);
    }

    public static function get_summary($days) {
        if (!self::table_exists()) {
            return array(
                'total_count' => 0,
                'unique_queries' => 0,
                'no_results_count' => 0,
                'avg_results' => 0,
                'last_at' => null,
            );
        }

        global $wpdb;
        $table = self::get_table_name();
        $since = self::get_since($days);

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT
                    COUNT(*) as total_count,
                    COUNT(DISTINCT query) as unique_queries,
                    SUM(CASE WHEN results_count = 0 THEN 1 ELSE 0 END) as no_results_count,
                    AVG(results_count) as avg_results,
                    MAX(created_at) as last_at
                FROM {$table}
                WHERE created_at >= %s",
                $since
            ),
            ARRAY_A
        );

        return is_array($row) ? $row : array();
    }

    public static function get_top_queries($days, $limit) {
        if (!self::table_exists()) {
            return array();
        }

        global $wpdb;
        $table = self::get_table_name();
        $since = self::get_since($days);
        $limit = self::clamp_limit($limit);

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT
                    query,
                    COUNT(*) as hits,
                    AVG(results_count) as avg_results,
                    MAX(created_at) as last_at
                FROM {$table}
                WHERE created_at >= %s
                GROUP BY query
                ORDER BY hits DESC, last_at DESC
                LIMIT %d",
                $since,
                $limit
            ),
            ARRAY_A
        );

        return is_array($rows) ? $rows : array();
    }

    public static function get_top_no_results($days, $limit) {
        if (!self::table_exists()) {
            return array();
        }

        global $wpdb;
        $table = self::get_table_name();
        $since = self::get_since($days);
        $limit = self::clamp_limit($limit);

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT
                    query,
                    COUNT(*) as hits,
                    MAX(created_at) as last_at
                FROM {$table}
                WHERE created_at >= %s
                  AND results_count = 0
                GROUP BY query
                ORDER BY hits DESC, last_at DESC
                LIMIT %d",
                $since,
                $limit
            ),
            ARRAY_A
        );

        return is_array($rows) ? $rows : array();
    }

    public static function get_prefix_matches($prefix, $context, $days, $limit) {
        $prefix = is_string($prefix) ? trim($prefix) : '';
        $context = is_string($context) ? $context : '';

        if ($prefix === '' || $context === '') {
            return array();
        }

        if (!self::table_exists()) {
            return array();
        }

        global $wpdb;
        $table = self::get_table_name();
        $since = self::get_since($days);
        $limit = self::clamp_limit($limit);
        $like = $wpdb->esc_like($prefix) . '%';

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT query, COUNT(*) AS cnt
                FROM {$table}
                WHERE created_at >= %s
                  AND context = %s
                  AND query LIKE %s
                GROUP BY query
                ORDER BY cnt DESC
                LIMIT %d",
                $since,
                $context,
                $like,
                $limit
            ),
            ARRAY_A
        );

        $out = array();
        if (is_array($rows)) {
            foreach ($rows as $row) {
                $label = isset($row['query']) ? (string) $row['query'] : '';
                $label = trim($label);
                if ($label === '') {
                    continue;
                }
                $out[] = array(
                    'query' => $label,
                    'count' => isset($row['cnt']) ? (int) $row['cnt'] : 0,
                );
            }
        }

        return $out;
    }

    public static function get_popular_queries($context, $days, $limit) {
        $context = is_string($context) ? $context : '';

        if ($context === '') {
            return array();
        }

        if (!self::table_exists()) {
            return array();
        }

        global $wpdb;
        $table = self::get_table_name();
        $since = self::get_since($days);
        $limit = self::clamp_limit($limit);

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT query, COUNT(*) AS cnt
                FROM {$table}
                WHERE created_at >= %s
                  AND context = %s
                  AND query <> ''
                GROUP BY query
                ORDER BY cnt DESC
                LIMIT %d",
                $since,
                $context,
                $limit
            ),
            ARRAY_A
        );

        $out = array();
        if (is_array($rows)) {
            foreach ($rows as $row) {
                $label = isset($row['query']) ? (string) $row['query'] : '';
                $label = trim($label);
                if ($label === '') {
                    continue;
                }
                $out[] = array(
                    'query' => $label,
                    'count' => isset($row['cnt']) ? (int) $row['cnt'] : 0,
                );
            }
        }

        return $out;
    }

    public static function clear() {
        if (!self::table_exists()) {
            return;
        }

        global $wpdb;
        $table = self::get_table_name();
        $wpdb->query("TRUNCATE TABLE {$table}");
    }

    public static function get_timeline($days) {
        if (!self::table_exists()) {
            return array();
        }

        global $wpdb;
        $table = self::get_table_name();
        $since = self::get_since($days);

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT
                    DATE(created_at) as day,
                    COUNT(*) as total_count,
                    SUM(CASE WHEN results_count = 0 THEN 1 ELSE 0 END) as no_results_count
                FROM {$table}
                WHERE created_at >= %s
                GROUP BY DATE(created_at)
                ORDER BY day ASC",
                $since
            ),
            ARRAY_A
        );

        return is_array($rows) ? $rows : array();
    }

    public static function get_recent($days, $limit) {
        if (!self::table_exists()) {
            return array();
        }

        global $wpdb;
        $table = self::get_table_name();
        $since = self::get_since($days);
        $limit = self::clamp_limit($limit);

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT query, results_count, context, created_at
                FROM {$table}
                WHERE created_at >= %s
                ORDER BY created_at DESC
                LIMIT %d",
                $since,
                min(50, $limit * 2)
            ),
            ARRAY_A
        );

        return is_array($rows) ? $rows : array();
    }

    private static function normalize_context($context) {
        $context = sanitize_text_field($context);
        $context = is_string($context) ? trim($context) : '';
        return $context !== '' ? $context : 'shop';
    }

    private static function get_request_meta() {
        $user_ip = '';
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $user_ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $user_ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
        } elseif (!empty($_SERVER['REMOTE_ADDR'])) {
            $user_ip = $_SERVER['REMOTE_ADDR'];
        }
        $user_ip = sanitize_text_field($user_ip);

        $user_agent = isset($_SERVER['HTTP_USER_AGENT']) ? sanitize_text_field($_SERVER['HTTP_USER_AGENT']) : '';
        return array($user_ip, $user_agent);
    }
}
