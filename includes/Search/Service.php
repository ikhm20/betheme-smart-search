<?php
/**
 * Search service for REST /query endpoint.
 *
 * Orchestrates caching, query execution, and analytics logging.
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Search_Service {
    private $options;
    private $query_builder;
    private $history;

    public function __construct($options = null) {
        $this->options = is_array($options) ? $options : BeThemeSmartSearch_Support_Options::get();
        $this->query_builder = new BeThemeSmartSearch_Search_QueryBuilder();
        $this->history = new BeThemeSmartSearch_Search_History();
    }

    public function handle_search_query($request) {
        if (empty($this->options['live_search_enabled'])) {
            return new WP_Error('live_search_disabled', 'Live search is disabled', array('status' => 403));
        }

        $query = $request->get_param('q');
        $context = $request->get_param('context');
        $limit = $request->get_param('limit');

        if (empty($query)) {
            return new WP_Error('missing_query', 'Search query is required', array('status' => 400));
        }

        $variants = BeThemeSmartSearch_Search_Variants::build($query, $this->options);
        if (!empty($variants)) {
            $query = $variants[0];
        }

        $use_cache = !empty($this->options['enable_caching']);
        $cache_ttl = !empty($this->options['cache_ttl']) ? absint($this->options['cache_ttl']) : HOUR_IN_SECONDS;
        $cache_ttl = BeThemeSmartSearch_Support_Cache::clamp_ttl($cache_ttl, 60, 86400);

        $cache_key = 'betheme_search_' . md5($query . '|' . $context . '|' . $limit);
        if ($use_cache) {
            $cached_results = BeThemeSmartSearch_Support_Cache::get($cache_key);
            if ($cached_results !== false) {
                return new WP_REST_Response($cached_results, 200);
            }
        }

        $results = $this->perform_search($query, $context, $limit);

        if ($use_cache && $cache_ttl > 0) {
            BeThemeSmartSearch_Support_Cache::set($cache_key, $results, $cache_ttl);
        }

        BeThemeSmartSearch_Helpers::log_search_query($query, count($results['products']));

        return new WP_REST_Response($results, 200);
    }

    private function perform_search($query, $context, $limit) {
        $results = array(
            'products' => array(),
            'categories' => array(),
            'brands' => array(),
            'suggestions' => array()
        );

        if ($context === 'shop' && BeThemeSmartSearch_Helpers::is_woocommerce_active()) {
            $results['products'] = $this->query_builder->search_products_v2($query, $limit, $this->options);
        }

        if (!empty($this->options['live_search_show_categories'])) {
            $results['categories'] = $this->query_builder->search_categories($query, $limit);
        }

        if (!empty($this->options['live_search_show_brands'])) {
            $results['brands'] = $this->query_builder->search_brands($query, $limit);
        }

        $results['suggestions'] = $this->generate_suggestions($query, $context);

        return $results;
    }

    private function generate_suggestions($query, $context) {
        $query = is_string($query) ? trim($query) : '';
        if ($query === '') {
            return array();
        }

        if (empty($this->options['live_search_show_suggestions'])) {
            return array();
        }

        if (!$this->history) {
            return array();
        }

        if (BeThemeSmartSearch_Search_Normalize::is_code_like_query($query)) {
            return array();
        }

        $context = is_string($context) && $context !== '' ? $context : 'shop';
        $days = 30;
        $limit = 8;

        $matches = array();
        if (BeThemeSmartSearch_Search_Normalize::length($query) >= 2) {
            $matches = $this->history->get_prefix_matches($query, $context, $days, $limit);
        }

        $out = array();
        foreach ($matches as $row) {
            $label = isset($row['query']) ? trim((string) $row['query']) : '';
            if ($label === '') {
                continue;
            }
            $out[] = $label;
        }

        return array_slice(array_values(array_unique($out)), 0, 8);
    }
}
