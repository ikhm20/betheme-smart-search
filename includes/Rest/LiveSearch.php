<?php
/**
 * REST: Live Search endpoint (skeleton).
 *
 * This file is intentionally minimal for the refactor step-by-step.
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Rest_LiveSearch {
    private $options;
    private $query_builder;

    public function __construct($register_endpoints = true) {
        $this->options = BeThemeSmartSearch_Support_Options::get();
        $this->query_builder = class_exists('BeThemeSmartSearch_Search_QueryBuilder')
            ? new BeThemeSmartSearch_Search_QueryBuilder()
            : null;
        if ($register_endpoints) {
            add_action('rest_api_init', array($this, 'register_endpoints'));
        }
    }

    public function register_endpoints() {
        $default_limit = !empty($this->options['live_search_max_results'])
            ? absint($this->options['live_search_max_results'])
            : 10;
        if ($default_limit < 1) {
            $default_limit = 10;
        }

        // Public endpoint tailored for BeTheme live-search dropdown enhancements.
        // Important: does NOT log analytics (to avoid noise from keystrokes).
        register_rest_route('betheme-smart-search/v1', '/live', array(
            'methods' => 'GET',
            'callback' => array($this, 'handle_live_query'),
            'permission_callback' => '__return_true',
            'args' => array(
                'q' => array(
                    'required' => true,
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'context' => array(
                    'default' => 'shop',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'limit' => array(
                    'default' => min(10, $default_limit),
                    'sanitize_callback' => 'absint',
                ),
                'stage' => array(
                    'default' => 'full',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
            ),
        ));
    }

    public function handle_live_query($request) {
        if (empty($this->options['live_search_enabled'])) {
            return new WP_Error('live_search_disabled', 'Live search is disabled', array('status' => 403));
        }

        if (!$this->query_builder) {
            return new WP_Error('search_builder_unavailable', 'Search query builder is unavailable', array('status' => 500));
        }

        $t0 = microtime(true);

        $query = (string) $request->get_param('q');
        $query = trim($query);
        if ($query === '') {
            return new WP_Error('missing_query', 'Search query is required', array('status' => 400));
        }

        $context = $this->normalize_context($request->get_param('context'));
        $limit = $this->clamp_int($request->get_param('limit'), 1, 20);

        $stage = (string) $request->get_param('stage');
        $stage = strtolower(trim($stage));
        if (!in_array($stage, array('exact', 'full'), true)) {
            $stage = 'full';
        }

        $variants = BeThemeSmartSearch_Search_Variants::build($query, $this->options);
        if (empty($variants)) {
            $variants = array($query);
        }

        $payload = array(
            'query' => $query,
            'context' => $context,
            'stage' => $stage,
            'exact_product' => null,
            'products' => array(),
            'categories' => array(),
            'timings_ms' => array(),
        );

        $payload['exact_product'] = $this->query_builder->find_exact_product($variants, $this->options);
        $tExact = microtime(true);

        if ($stage === 'exact') {
            $payload['timings_ms'] = array(
                'exact' => (int) round(($tExact - $t0) * 1000),
                'total' => (int) round((microtime(true) - $t0) * 1000),
            );
            return rest_ensure_response($payload);
        }

        $use_cache = !empty($this->options['enable_caching']);
        $cache_ttl = 30;
        if (!empty($this->options['cache_ttl'])) {
            $cache_ttl = (int) $this->options['cache_ttl'];
        }
        $cache_ttl = BeThemeSmartSearch_Support_Cache::clamp_ttl($cache_ttl, 10, 120);

        $cache_key = 'betheme_search_live_' . md5($variants[0] . '|' . $context . '|' . $limit . '|v1');
        if ($use_cache) {
            $cached = BeThemeSmartSearch_Support_Cache::get($cache_key);
            if ($cached !== false && is_array($cached)) {
                $cached['exact_product'] = $payload['exact_product'];
                $cached['timings_ms'] = array(
                    'exact' => (int) round(($tExact - $t0) * 1000),
                    'cached' => 1,
                    'total' => (int) round((microtime(true) - $t0) * 1000),
                );
                return rest_ensure_response($cached);
            }
        }

        if ($context === 'shop' && BeThemeSmartSearch_Helpers::is_woocommerce_active()) {
            $payload['products'] = $this->query_builder->search_products_v2($variants[0], $limit, $this->options);
            if (!empty($this->options['live_search_show_categories'])) {
                $payload['categories'] = $this->query_builder->search_categories($variants[0], min(10, $limit));
            }
        }

        $tFull = microtime(true);
        $payload['timings_ms'] = array(
            'exact' => (int) round(($tExact - $t0) * 1000),
            'full' => (int) round(($tFull - $tExact) * 1000),
            'total' => (int) round((microtime(true) - $t0) * 1000),
        );

        if ($use_cache && $cache_ttl > 0) {
            BeThemeSmartSearch_Support_Cache::set($cache_key, $payload, $cache_ttl);
        }

        return rest_ensure_response($payload);
    }

    private function normalize_context($context) {
        $context = sanitize_text_field($context);
        $context = is_string($context) ? trim($context) : '';
        return $context !== '' ? $context : 'shop';
    }

    private function clamp_int($value, $min, $max) {
        $value = (int) $value;
        $min = (int) $min;
        $max = (int) $max;
        return max($min, min($max, $value));
    }
}
