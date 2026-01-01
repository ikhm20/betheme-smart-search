<?php
/**
 * Admin REST endpoints for BeTheme Smart Search
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Admin_REST {

    public function __construct() {
        add_action('rest_api_init', array($this, 'register_endpoints'));
    }

    public function register_endpoints() {
        register_rest_route('betheme-smart-search/v1', '/admin/settings', array(
            array(
                'methods' => 'GET',
                'callback' => array($this, 'get_settings'),
                'permission_callback' => array($this, 'permission_check'),
            ),
            array(
                'methods' => 'POST',
                'callback' => array($this, 'update_settings'),
                'permission_callback' => array($this, 'permission_check'),
                'args' => array(
                    'options' => array(
                        'required' => true,
                    ),
                ),
            ),
        ));

        register_rest_route('betheme-smart-search/v1', '/admin/reset', array(
            'methods' => 'POST',
            'callback' => array($this, 'reset_settings'),
            'permission_callback' => array($this, 'permission_check'),
        ));

        register_rest_route('betheme-smart-search/v1', '/admin/clear-cache', array(
            'methods' => 'POST',
            'callback' => array($this, 'clear_cache'),
            'permission_callback' => array($this, 'permission_check'),
        ));

        register_rest_route('betheme-smart-search/v1', '/admin/analytics', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_analytics'),
            'permission_callback' => array($this, 'permission_check'),
            'args' => array(
                'days' => array(
                    'default' => 30,
                    'sanitize_callback' => 'absint',
                ),
                'limit' => array(
                    'default' => 10,
                    'sanitize_callback' => 'absint',
                ),
            ),
        ));

        register_rest_route('betheme-smart-search/v1', '/admin/analytics/clear', array(
            'methods' => 'POST',
            'callback' => array($this, 'clear_analytics'),
            'permission_callback' => array($this, 'permission_check'),
        ));

        register_rest_route('betheme-smart-search/v1', '/admin/test-query', array(
            'methods' => 'GET',
            'callback' => array($this, 'test_query'),
            'permission_callback' => array($this, 'permission_check'),
            'args' => array(
                'q' => array(
                    'required' => true,
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'limit' => array(
                    'default' => 10,
                    'sanitize_callback' => 'absint',
                ),
            ),
        ));

        register_rest_route('betheme-smart-search/v1', '/admin/status', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_status'),
            'permission_callback' => array($this, 'permission_check'),
        ));
    }

    public function permission_check() {
        return current_user_can('manage_options') || current_user_can('manage_woocommerce');
    }

    public function get_settings() {
        $options = BeThemeSmartSearch_Support_Options::get();

        $pages = get_pages(array(
            'sort_column' => 'post_title',
            'sort_order' => 'asc',
            'post_status' => array('publish', 'draft', 'private'),
        ));

        $page_options = array(
            array('value' => 0, 'label' => '-- Disabled --'),
        );

        foreach ($pages as $page) {
            $page_options[] = array(
                'value' => (int) $page->ID,
                'label' => html_entity_decode($page->post_title, ENT_QUOTES, get_bloginfo('charset')),
            );
        }

        return rest_ensure_response(array(
            'options' => $options,
            'defaults' => BeThemeSmartSearch_Support_Options::get_default_options(),
            'pages' => $page_options,
        ));
    }

    public function update_settings(WP_REST_Request $request) {
        $payload = $request->get_param('options');
        $options = BeThemeSmartSearch_Support_Options::sanitize(is_array($payload) ? $payload : array());

        update_option(BETHEME_SMART_SEARCH_OPTION_NAME, $options, false);

        return rest_ensure_response(array(
            'options' => BeThemeSmartSearch_Support_Options::get(),
        ));
    }

    public function reset_settings() {
        update_option(BETHEME_SMART_SEARCH_OPTION_NAME, BeThemeSmartSearch_Support_Options::get_default_options(), false);

        return rest_ensure_response(array(
            'options' => BeThemeSmartSearch_Support_Options::get(),
        ));
    }

    public function clear_cache() {
        BeThemeSmartSearch_Support_Cache::clear_search_transients();

        return rest_ensure_response(array('ok' => true));
    }

    public function get_analytics(WP_REST_Request $request) {
        $days = (int) $request->get_param('days');
        $limit = (int) $request->get_param('limit');

        $days = max(1, min(365, $days));
        $limit = max(1, min(50, $limit));

        $since = gmdate('Y-m-d H:i:s', time() - $days * DAY_IN_SECONDS);

        $summary = BeThemeSmartSearch_Support_Analytics::get_summary($days);
        $top_queries = BeThemeSmartSearch_Support_Analytics::get_top_queries($days, $limit);
        $top_no_results = BeThemeSmartSearch_Support_Analytics::get_top_no_results($days, $limit);
        $timeline = BeThemeSmartSearch_Support_Analytics::get_timeline($days);
        $recent = BeThemeSmartSearch_Support_Analytics::get_recent($days, $limit);

        return rest_ensure_response(array(
            'since' => $since,
            'days' => $days,
            'summary' => array(
                'total_count' => isset($summary['total_count']) ? (int) $summary['total_count'] : 0,
                'unique_queries' => isset($summary['unique_queries']) ? (int) $summary['unique_queries'] : 0,
                'no_results_count' => isset($summary['no_results_count']) ? (int) $summary['no_results_count'] : 0,
                'avg_results' => isset($summary['avg_results']) ? (float) $summary['avg_results'] : 0.0,
                'last_at' => isset($summary['last_at']) ? (string) $summary['last_at'] : '',
            ),
            'top_queries' => is_array($top_queries) ? $top_queries : array(),
            'top_no_results' => is_array($top_no_results) ? $top_no_results : array(),
            'timeline' => is_array($timeline) ? $timeline : array(),
            'recent' => is_array($recent) ? $recent : array(),
        ));
    }

    public function clear_analytics() {
        BeThemeSmartSearch_Support_Analytics::clear();
        return rest_ensure_response(array('ok' => true));
    }

    public function test_query(WP_REST_Request $request) {
        $q = (string) $request->get_param('q');
        $q = trim($q);
        $limit = (int) $request->get_param('limit');
        $limit = max(1, min(20, $limit));

        if ($q === '') {
            return rest_ensure_response(array(
                'query' => '',
                'variants' => array(),
                'products' => array(),
                'debug' => array(),
            ));
        }

        $t0 = microtime(true);
        $mem0 = function_exists('memory_get_usage') ? (int) memory_get_usage(true) : null;

        $options = BeThemeSmartSearch_Support_Options::get();
        $variants = BeThemeSmartSearch_Search_Variants::build($q, $options);
        if (empty($variants)) {
            $variants = array($q);
        }

        $products = array();
        $debug = array(
            'limit' => $limit,
            'variants_count' => count($variants),
            'timing_ms' => array(),
        );

        $exact_match = null;
        if (class_exists('WooCommerce')) {
            $t_exact = microtime(true);
            if (function_exists('wc_get_product_id_by_sku')) {
                $pid = (int) wc_get_product_id_by_sku($q);
                if ($pid > 0) {
                    $exact_match = array(
                        'id' => $pid,
                        'url' => get_permalink($pid),
                    );
                }
            }
            $debug['timing_ms']['exact_sku_lookup'] = (int) round((microtime(true) - $t_exact) * 1000);

            $meta_keys = BeThemeSmartSearch_Helpers::get_product_meta_keys($options);
            $meta_keys = array_diff($meta_keys, array('_product_attributes'));
            $meta_keys = array_values(array_unique(array_map('strval', is_array($meta_keys) ? $meta_keys : array())));
            sort($meta_keys);
            $mode = BeThemeSmartSearch_Support_Options::normalize_code_match_mode(isset($options['code_match_mode']) ? $options['code_match_mode'] : null);
            $meta_query = BeThemeSmartSearch_Search_MetaQuery::build_for_variants($variants, $meta_keys, $mode);

            $query_args = array(
                'post_type' => 'product',
                'post_status' => 'publish',
                'posts_per_page' => $limit,
                's' => $q,
            );
            if (!empty($meta_query)) {
                $query_args['meta_query'] = $meta_query;
            }

            $debug['meta_keys'] = array(
                'count' => count($meta_keys),
                'keys' => array_slice($meta_keys, 0, 30),
            );
            $debug['meta_query'] = array(
                'clauses' => empty($meta_query) ? 0 : max(0, count($meta_query) - 1),
                'variants' => $variants,
                'mode' => $mode,
            );
            $debug['query_args'] = array(
                'post_type' => $query_args['post_type'],
                'post_status' => $query_args['post_status'],
                'posts_per_page' => $query_args['posts_per_page'],
                's' => $query_args['s'],
            );

            $t_query = microtime(true);
            $q_products = new WP_Query($query_args);
            $debug['timing_ms']['wp_query'] = (int) round((microtime(true) - $t_query) * 1000);
            $debug['found_posts'] = isset($q_products->found_posts) ? (int) $q_products->found_posts : null;
            $debug['max_num_pages'] = isset($q_products->max_num_pages) ? (int) $q_products->max_num_pages : null;

            if (isset($q_products->request) && is_string($q_products->request)) {
                $sql = $q_products->request;
                if (strlen($sql) > 2500) {
                    $sql = substr($sql, 0, 2500) . '...';
                }
                $debug['sql'] = $sql;
            }

            $t_loop = microtime(true);
            if ($q_products->have_posts()) {
                while ($q_products->have_posts()) {
                    $q_products->the_post();
                    $product = wc_get_product(get_the_ID());
                    if (!$product) {
                        continue;
                    }
                    $products[] = array(
                        'id' => get_the_ID(),
                        'title' => get_the_title(),
                        'url' => get_permalink(),
                        'sku' => $product->get_sku(),
                        'price' => $product->get_price_html(),
                    );
                }
                wp_reset_postdata();
            } else {
                wp_reset_postdata();
            }
            $debug['timing_ms']['loop'] = (int) round((microtime(true) - $t_loop) * 1000);
        } else {
            $debug['warning'] = 'WooCommerce is not active.';
        }

        $debug['products_returned'] = count($products);
        $debug['exact_match'] = $exact_match;
        $debug['timing_ms']['total'] = (int) round((microtime(true) - $t0) * 1000);

        $mem1 = function_exists('memory_get_usage') ? (int) memory_get_usage(true) : null;
        $peak = function_exists('memory_get_peak_usage') ? (int) memory_get_peak_usage(true) : null;
        $debug['memory'] = array(
            'start' => $mem0,
            'end' => $mem1,
            'peak' => $peak,
        );

        return rest_ensure_response(array(
            'query' => $q,
            'variants' => $variants,
            'products' => $products,
            'debug' => $debug,
        ));
    }

    public function get_status() {
        $theme = wp_get_theme();

        $wc_version = null;
        if (defined('WC_VERSION')) {
            $wc_version = WC_VERSION;
        } elseif (class_exists('WooCommerce') && function_exists('WC')) {
            try {
                $wc = WC();
                if (is_object($wc) && isset($wc->version)) {
                    $wc_version = (string) $wc->version;
                }
            } catch (Exception $e) {
                $wc_version = null;
            }
        }

        $products_count = 0;
        $variations_count = 0;
        $count_products = wp_count_posts('product');
        $count_variations = wp_count_posts('product_variation');
        if (is_object($count_products) && isset($count_products->publish)) {
            $products_count = (int) $count_products->publish;
        }
        if (is_object($count_variations) && isset($count_variations->publish)) {
            $variations_count = (int) $count_variations->publish;
        }

        $options = BeThemeSmartSearch_Support_Options::get();
        $meta_keys = BeThemeSmartSearch_Helpers::get_product_meta_keys($options);
        $meta_keys = array_values(array_unique(array_map('strval', is_array($meta_keys) ? $meta_keys : array())));
        sort($meta_keys);

        return rest_ensure_response(array(
            'wp' => array(
                'version' => get_bloginfo('version'),
                'locale' => get_locale(),
                'multisite' => is_multisite(),
            ),
            'php' => array(
                'version' => phpversion(),
            ),
            'woo' => array(
                'active' => class_exists('WooCommerce'),
                'version' => $wc_version,
            ),
            'theme' => array(
                'name' => $theme->get('Name'),
                'version' => $theme->get('Version'),
                'stylesheet' => $theme->get_stylesheet(),
                'template' => $theme->get_template(),
            ),
            'catalog' => array(
                'products' => $products_count,
                'variations' => $variations_count,
            ),
            'plugin' => array(
                'version' => defined('BETHEME_SMART_SEARCH_VERSION') ? BETHEME_SMART_SEARCH_VERSION : null,
                'caching' => array(
                    'enabled' => !empty($options['enable_caching']),
                    'ttl' => isset($options['cache_ttl']) ? (int) $options['cache_ttl'] : null,
                ),
                'logging' => array(
                    'enabled' => !empty($options['enable_search_logging']),
                ),
                'live_search' => array(
                    'enabled' => !empty($options['live_search_enabled']),
                    'debounce' => isset($options['live_search_debounce']) ? (int) $options['live_search_debounce'] : null,
                    'max_results' => isset($options['live_search_max_results']) ? (int) $options['live_search_max_results'] : null,
                ),
                'features' => array(
                    'preserve_betheme_search' => !empty($options['preserve_betheme_search']),
                    'shop_style_results' => !empty($options['shop_style_results']),
                    'enhance_betheme_live_search' => !empty($options['enhance_betheme_live_search']),
                    'redirect_exact_match_to_product' => !empty($options['redirect_exact_match_to_product']),
                    'enhance_shop_search_query' => !empty($options['enhance_shop_search_query']),
                    'enable_synonyms' => !empty($options['enable_synonyms']),
                    'code_match_mode' => isset($options['code_match_mode']) ? (string) $options['code_match_mode'] : null,
                    'results_layout_page_id' => isset($options['results_layout_page_id']) ? (int) $options['results_layout_page_id'] : 0,
                ),
                'meta_keys' => array(
                    'count' => count($meta_keys),
                    'has_sku' => in_array('_sku', $meta_keys, true),
                    'keys' => array_slice($meta_keys, 0, 30),
                ),
            ),
        ));
    }
}
