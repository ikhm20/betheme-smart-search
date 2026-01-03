<?php
/**
 * REST: Suggestions endpoint (skeleton).
 *
 * This file is intentionally minimal for the refactor step-by-step.
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Rest_Suggest {
    private $options;
    private $query_builder;
    private $history;

    public function __construct($register_endpoints = true) {
        $this->options = BeThemeSmartSearch_Support_Options::get();
        $this->query_builder = class_exists('BeThemeSmartSearch_Search_QueryBuilder')
            ? new BeThemeSmartSearch_Search_QueryBuilder()
            : null;
        $this->history = class_exists('BeThemeSmartSearch_Search_History')
            ? new BeThemeSmartSearch_Search_History()
            : null;
        if ($register_endpoints) {
            add_action('rest_api_init', array($this, 'register_endpoints'));
        }
    }

    public function register_endpoints() {
        register_rest_route('betheme-smart-search/v1', '/suggest', array(
            'methods' => 'GET',
            'callback' => array($this, 'handle_suggest_query'),
            'permission_callback' => '__return_true',
            'args' => array(
                'q' => array(
                    'default' => '',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'context' => array(
                    'default' => 'shop',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'limit' => array(
                    'default' => 8,
                    'sanitize_callback' => 'absint',
                ),
                'days' => array(
                    'default' => 30,
                    'sanitize_callback' => 'absint',
                ),
            ),
        ));
    }

    public function handle_suggest_query($request) {
        $q = (string) $request->get_param('q');
        $q = trim($q);
        $context = $this->normalize_context($request->get_param('context'));
        $limit = $this->clamp_int($request->get_param('limit'), 1, 20);
        $days = $this->clamp_int($request->get_param('days'), 1, 365);

        $empty_payload = array(
            'query' => $q,
            'context' => $context,
            'popular' => array(),
            'matches' => array(),
            'popular_products' => array(),
        );

        if (empty($this->options['live_search_enabled'])) {
            return rest_ensure_response($empty_payload);
        }

        // "Show suggestions" is only for non-empty queries; keep popular products for empty state.
        if ($q !== '' && empty($this->options['live_search_show_suggestions'])) {
            return rest_ensure_response($empty_payload);
        }

        $use_cache = !empty($this->options['enable_caching']);
        $cache_ttl = 300;
        if (!empty($this->options['cache_ttl'])) {
            $cache_ttl = (int) $this->options['cache_ttl'];
        }
        $cache_ttl = BeThemeSmartSearch_Support_Cache::clamp_ttl($cache_ttl, 60, 3600);

        $cache_key = 'betheme_search_suggest_' . md5($q . '|' . $context . '|' . $limit . '|' . $days . '|v2');
        if ($use_cache) {
            $cached = BeThemeSmartSearch_Support_Cache::get($cache_key);
            if ($cached !== false) {
                return rest_ensure_response($cached);
            }
        }

        try {
            $popular = array();
            $matches = array();
            $popular_products = array();

            if ($this->history) {
                if ($q !== '' && BeThemeSmartSearch_Search_Normalize::length($q) >= 2) {
                    $matches = $this->history->get_prefix_matches($q, $context, $days, min(30, $limit * 4));
                } else {
                    $popular = $this->history->get_popular_queries($context, $days, min(50, $limit * 6));
                }
            }

            // Popular products (only needed for empty query UI).
            if ($q === '' && $context === 'shop' && BeThemeSmartSearch_Helpers::is_woocommerce_active()) {
                if ($this->query_builder) {
                    $popular_products = $this->query_builder->get_popular_products($limit, $this->options);
                }
            }

            // Fallback: if no history matches found for non-empty query, return product title matches
            if ($q !== '' && empty($matches) && $this->query_builder) {
                // For suggest fallback, honor the live-search strict coverage option without changing global options.
                $opts = $this->options;
                $opts['require_full_coverage'] = !empty($this->options['live_search_require_all_tokens']) ? 1 : 0;
                try {
                    $fb_products = $this->query_builder->search_products_v2($q, $limit, $opts);

                    // Diagnostic: log when fallback returns empty while strict coverage is required
                    if (empty($fb_products) && !empty($opts['require_full_coverage'])) {
                        error_log(sprintf('BeTheme Smart Search: suggest fallback empty with require_full_coverage=1; query="%s" limit=%d', substr($q, 0, 200), $limit));
                    }

                    foreach ($fb_products as $p) {
                        if (!empty($p['title'])) {
                            $matches[] = (string) $p['title'];
                        }
                    }
                    $matches = array_values(array_unique(array_filter($matches)));
                } catch (Throwable $e) {
                    // Silently ignore search errors for suggest endpoint; return empty matches.
                    error_log('BeTheme Smart Search: suggest fallback error: ' . $e->getMessage());
                    if (method_exists($e, 'getTraceAsString')) {
                        error_log($e->getTraceAsString());
                    }
                }
            }

            $payload = array(
                'query' => $q,
                'context' => $context,
                // Popular queries: returned as a fallback, but the UI may prefer popular_products.
                'popular' => array_slice($popular, 0, $limit),
                'matches' => array_slice($matches, 0, $limit),
                'popular_products' => array_slice($popular_products, 0, $limit),
                'meta' => array(
                    'require_full_coverage' => !empty($this->options['live_search_require_all_tokens']) ? 1 : 0,
                ),
            );

            if ($use_cache && $cache_ttl > 0) {
                BeThemeSmartSearch_Support_Cache::set($cache_key, $payload, $cache_ttl);
            }

            return rest_ensure_response($payload);
        } catch (Throwable $e) {
            $msg = sprintf(
                'BeTheme Smart Search: suggest error: %s in %s:%d; query="%s" context="%s"',
                $e->getMessage(),
                $e->getFile(),
                $e->getLine(),
                substr($q, 0, 200),
                $context
            );
            if (method_exists($e, 'getTraceAsString')) {
                $msg .= '\n' . $e->getTraceAsString();
            }
            error_log($msg);

            $payload = array(
                'query' => $q,
                'context' => $context,
                'popular' => array(),
                'matches' => array(),
                'popular_products' => array(),
                'meta' => array(
                    'require_full_coverage' => !empty($this->options['live_search_require_all_tokens']) ? 1 : 0,
                ),
                'timings_ms' => array('error' => 1),
            );

            return rest_ensure_response($payload);
        }
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
