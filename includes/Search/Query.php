<?php
/**
 * Modify WordPress search queries for better relevance
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Query {

    private $options;

    public function __construct() {
        $this->options = BeThemeSmartSearch_Support_Options::get();

        if (empty($this->options['preserve_betheme_search'])) {
            add_action('pre_get_posts', array($this, 'modify_search_query'), 20);
            add_filter('posts_join', array($this, 'search_join'), 20, 2);
            add_filter('posts_where', array($this, 'search_where'), 20, 2);
            add_filter('posts_search', array($this, 'search_relevance'), 20, 2);
            add_filter('posts_groupby', array($this, 'search_groupby'), 20, 2);
        }

        // Keep live-search query args hook available for plugin's own AJAX if needed
        add_filter('betheme_smart_search_query_args', array($this, 'apply_search_args'), 10, 1);
    }

    /**
     * Modify the main search query
     */
    public function modify_search_query($query) {
        if (!is_admin() && $query->is_search() && $query->is_main_query()) {
            if ($this->should_preserve_theme_search()) {
                return;
            }

            $search_term = BeThemeSmartSearch_Helpers::get_search_term();

            // Always search in products if WooCommerce is active, but also allow other post types
            if (BeThemeSmartSearch_Helpers::is_woocommerce_active()) {
                $query->set('post_type', array('product', 'post', 'page'));
            }

            // Improve search relevance
            $query->set('posts_per_page', 20);

            // Add meta query for SKU search
            if (!empty($search_term) && BeThemeSmartSearch_Search_Normalize::is_code_like_query($search_term)) {
                $meta_keys = BeThemeSmartSearch_Search_MetaKeys::get_code_meta_keys($this->options);
                $meta_query = $this->build_meta_query_for_codes($search_term, $meta_keys);
                if (!empty($meta_query)) {
                    $existing = $query->get('meta_query', array());
                    if (!is_array($existing)) {
                        $existing = array();
                    }
                    $existing[] = $meta_query;
                    $query->set('meta_query', $existing);
                }
            }
        }
    }

    /**
     * Join postmeta table for SKU search
     */
    public function search_join($join, $query) {
        global $wpdb;

        if (!is_admin() && $query->is_search() && $query->is_main_query()) {
            if ($this->should_preserve_theme_search()) {
                return $join;
            }
            $search_term = BeThemeSmartSearch_Helpers::get_search_term();
            if ($search_term === '' || !BeThemeSmartSearch_Search_Normalize::is_code_like_query($search_term)) {
                return $join;
            }
            if (empty(BeThemeSmartSearch_Search_MetaKeys::get_code_meta_keys($this->options))) {
                return $join;
            }
            // Join postmeta table for meta searches
            $join .= " LEFT JOIN {$wpdb->postmeta} AS smart_search_meta ON {$wpdb->posts}.ID = smart_search_meta.post_id ";
        }

        return $join;
    }

    /**
     * Modify WHERE clause to include SKU and other meta
     */
    public function search_where($where, $query) {
        // We're using posts_search filter instead for better control
        return $where;
    }

    /**
     * Improve search relevance scoring
     */
    public function search_relevance($search, $query) {
        global $wpdb;

        if (!is_admin() && $query->is_search() && $query->is_main_query()) {
            if ($this->should_preserve_theme_search()) {
                return $search;
            }
            $search_term = BeThemeSmartSearch_Helpers::get_search_term();
            if (!empty($search_term)) {
                $code_meta_sql = '';
                if (BeThemeSmartSearch_Search_Normalize::is_code_like_query($search_term)) {
                    $code_meta_sql = $this->build_meta_search_sql($search_term);
                }

                // If there's already a search condition, extend it
                if (!empty($search) && strpos($search, 'AND') !== false) {
                    // Add our additional search conditions
                    if ($code_meta_sql !== '') {
                        $search .= " OR ({$code_meta_sql})";
                    }
                } else {
                    $search_term_escaped = esc_sql($wpdb->esc_like($search_term));
                    // No existing search, create our own
                    $search = " AND (
                        ({$wpdb->posts}.post_title LIKE '%{$search_term_escaped}%')
                        OR ({$wpdb->posts}.post_content LIKE '%{$search_term_escaped}%')
                        OR ({$wpdb->posts}.post_excerpt LIKE '%{$search_term_escaped}%')
                        " . ($code_meta_sql !== '' ? "OR ({$code_meta_sql})" : '') . "
                    ";

                    $search .= ") ";
                }

            }
        }

        return $search;
    }

    /**
     * Group by post ID to avoid duplicates from LEFT JOIN
     */
    public function search_groupby($groupby, $query) {
        global $wpdb;

        if (!is_admin() && $query->is_search() && $query->is_main_query()) {
            if ($this->should_preserve_theme_search()) {
                return $groupby;
            }
            if (!empty($groupby)) {
                $groupby .= ", ";
            }
            $groupby .= "{$wpdb->posts}.ID";
        }

        return $groupby;
    }

    /**
     * Apply search arguments for live search AJAX
     */
    public function apply_search_args($query_args) {
        // Apply our search modifications to the query args
        $search_term = isset($query_args['s']) ? $query_args['s'] : '';

        if (!empty($search_term) && BeThemeSmartSearch_Search_Normalize::is_code_like_query($search_term)) {
            $meta_keys = BeThemeSmartSearch_Search_MetaKeys::get_code_meta_keys($this->options);
            $meta_query = $this->build_meta_query_for_codes($search_term, $meta_keys);
            if (empty($meta_query)) {
                return $query_args;
            }

            // Add meta query for SKU/barcode search
            if (!isset($query_args['meta_query'])) {
                $query_args['meta_query'] = array();
            }

            $query_args['meta_query'][] = $meta_query;
        }

        return $query_args;
    }

    private function build_meta_query_for_codes($term, $meta_keys) {
        $term = is_string($term) ? trim($term) : '';
        if ($term === '' || empty($meta_keys)) {
            return array();
        }

        $mode = BeThemeSmartSearch_Support_Options::normalize_code_match_mode(isset($this->options['code_match_mode']) ? $this->options['code_match_mode'] : null);
        return BeThemeSmartSearch_Search_MetaQuery::build_for_term($term, $meta_keys, $mode);
    }

    private function build_meta_search_sql($term) {
        global $wpdb;

        $meta_keys = BeThemeSmartSearch_Search_MetaKeys::get_code_meta_keys($this->options);
        if (empty($meta_keys)) {
            return '';
        }

        $term = is_string($term) ? trim($term) : '';
        if ($term === '') {
            return '';
        }

        $mode = BeThemeSmartSearch_Support_Options::normalize_code_match_mode(isset($this->options['code_match_mode']) ? $this->options['code_match_mode'] : null);

        if ($mode === 'exact') {
            $value = $term;
            $compare = '=';
        } elseif ($mode === 'startswith') {
            $value = $wpdb->esc_like($term) . '%';
            $compare = 'LIKE';
        } else {
            $value = '%' . $wpdb->esc_like($term) . '%';
            $compare = 'LIKE';
        }

        $conditions = array();
        foreach ($meta_keys as $key) {
            $conditions[] = $wpdb->prepare(
                "(smart_search_meta.meta_key = %s AND smart_search_meta.meta_value {$compare} %s)",
                $key,
                $value
            );
        }

        return implode(' OR ', $conditions);
    }

    /**
     * Check if the user opted to keep BeTheme search logic intact
     */
    private function should_preserve_theme_search() {
        return !empty($this->options['preserve_betheme_search']);
    }
}
