<?php
/**
 * Modify WordPress search queries for better relevance
 */

class BeThemeSmartSearch_Query {

    private $options;

    public function __construct() {
        $this->options = BeThemeSmartSearch_Helpers::get_options();

        if (empty($this->options['preserve_betheme_search'])) {
            add_action('pre_get_posts', array($this, 'modify_search_query'), 20);
            add_filter('posts_join', array($this, 'search_join'), 20, 2);
            add_filter('posts_where', array($this, 'search_where'), 20, 2);
            add_filter('posts_search', array($this, 'search_relevance'), 20, 2);
            add_filter('posts_groupby', array($this, 'search_groupby'), 20, 2);
        }

        // Keep live-search query args hook available for plugin’s own AJAX if needed
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

            $search_term = get_search_query();

            // Always search in products if WooCommerce is active, but also allow other post types
            if (BeThemeSmartSearch_Helpers::is_woocommerce_active()) {
                $query->set('post_type', array('product', 'post', 'page'));
            }

            // Improve search relevance
            $query->set('posts_per_page', 20);

            // Add meta query for SKU search
            if (!empty($search_term)) {
                $meta_query = $query->get('meta_query', array());
                if (!is_array($meta_query)) {
                    $meta_query = array();
                }

                $meta_query[] = array(
                    'key' => '_sku',
                    'value' => $search_term,
                    'compare' => 'LIKE'
                );

                $query->set('meta_query', $meta_query);
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
            $search_term = get_search_query();
            if (!empty($search_term)) {
                $search_term_escaped = esc_sql($wpdb->esc_like($search_term));

                // If there's already a search condition, extend it
                if (!empty($search) && strpos($search, 'AND') !== false) {
                    // Add our additional search conditions
                    $search .= " OR (smart_search_meta.meta_key = '_sku' AND smart_search_meta.meta_value LIKE '%{$search_term_escaped}%')";

                    // Add ACF fields if available
                    if (function_exists('get_field')) {
                        $acf_fields = $this->get_acf_searchable_fields();
                        if (!empty($acf_fields)) {
                            foreach ($acf_fields as $field_key) {
                                $search .= " OR (smart_search_meta.meta_key = '$field_key' AND smart_search_meta.meta_value LIKE '%{$search_term_escaped}%')";
                            }
                        }
                    }
                } else {
                    // No existing search, create our own
                    $search = " AND (
                        ({$wpdb->posts}.post_title LIKE '%{$search_term_escaped}%')
                        OR ({$wpdb->posts}.post_content LIKE '%{$search_term_escaped}%')
                        OR ({$wpdb->posts}.post_excerpt LIKE '%{$search_term_escaped}%')
                        OR (smart_search_meta.meta_key = '_sku' AND smart_search_meta.meta_value LIKE '%{$search_term_escaped}%')
                    ";

                    // Add ACF fields if available
                    if (function_exists('get_field')) {
                        $acf_fields = $this->get_acf_searchable_fields();
                        if (!empty($acf_fields)) {
                            foreach ($acf_fields as $field_key) {
                                $search .= " OR (smart_search_meta.meta_key = '$field_key' AND smart_search_meta.meta_value LIKE '%{$search_term_escaped}%')";
                            }
                        }
                    }

                    $search .= ") ";
                }

                error_log("BeTheme Smart Search - Final search: " . $search);
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

        if (!empty($search_term)) {
            // Add meta query for SKU search
            if (!isset($query_args['meta_query'])) {
                $query_args['meta_query'] = array();
            }

            $query_args['meta_query'][] = array(
                'key' => '_sku',
                'value' => $search_term,
                'compare' => 'LIKE'
            );

            // Add ACF fields if available
            if (function_exists('get_field')) {
                $acf_fields = $this->get_acf_searchable_fields();
                if (!empty($acf_fields)) {
                    foreach ($acf_fields as $field_key) {
                        $query_args['meta_query'][] = array(
                            'key' => $field_key,
                            'value' => $search_term,
                            'compare' => 'LIKE'
                        );
                    }
                }
            }

            // Set meta query relation
            $query_args['meta_query']['relation'] = 'OR';
        }

        return $query_args;
    }

    /**
     * Get ACF fields that should be searchable
     */
    private function get_acf_searchable_fields() {
        if (!function_exists('acf_get_field_groups')) {
            return array();
        }

        $searchable_fields = array();

        // Get field groups for products
        $field_groups = acf_get_field_groups(array('post_type' => 'product'));

        foreach ($field_groups as $field_group) {
            $fields = acf_get_fields($field_group['key']);

            foreach ($fields as $field) {
                // Only include text-based fields
                if (in_array($field['type'], array('text', 'textarea', 'wysiwyg', 'email', 'url'))) {
                    $searchable_fields[] = $field['name'];
                }
            }
        }

        return $searchable_fields;
    }

    /**
     * Check if the user opted to keep BeTheme search logic intact
     */
    private function should_preserve_theme_search() {
        return !empty($this->options['preserve_betheme_search']);
    }
}
