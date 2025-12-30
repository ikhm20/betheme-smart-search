<?php
/**
 * REST API endpoints for live search
 */

class BeThemeSmartSearch_REST {

    private $options;

    public function __construct() {
        $this->options = BeThemeSmartSearch_Helpers::get_options();
        add_action('rest_api_init', array($this, 'register_endpoints'));
    }

    /**
     * Register REST API endpoints
     */
    public function register_endpoints() {
        $default_limit = !empty($this->options['live_search_max_results']) ? absint($this->options['live_search_max_results']) : 10;
        if ($default_limit < 1) {
            $default_limit = 10;
        }

        register_rest_route('betheme-smart-search/v1', '/query', array(
            'methods' => 'GET',
            'callback' => array($this, 'handle_search_query'),
            'permission_callback' => '__return_true',
            'args' => array(
                'q' => array(
                    'required' => true,
                    'sanitize_callback' => 'sanitize_text_field'
                ),
                'context' => array(
                    'default' => 'shop',
                    'sanitize_callback' => 'sanitize_text_field'
                ),
                'limit' => array(
                    'default' => $default_limit,
                    'sanitize_callback' => 'absint'
                )
            )
        ));

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

    /**
     * Live dropdown endpoint: exact code match + optional "smart" product results + categories.
     * This endpoint is designed to be called frequently, so it avoids heavy work and avoids logging.
     */
    public function handle_live_query($request) {
        if (empty($this->options['live_search_enabled'])) {
            return new WP_Error('live_search_disabled', 'Live search is disabled', array('status' => 403));
        }

        $t0 = microtime(true);

        $query = (string) $request->get_param('q');
        $query = trim($query);
        if ($query === '') {
            return new WP_Error('missing_query', 'Search query is required', array('status' => 400));
        }

        $context = (string) $request->get_param('context');
        $context = $context !== '' ? $context : 'shop';

        $limit = (int) $request->get_param('limit');
        $limit = max(1, min(20, $limit));

        $stage = (string) $request->get_param('stage');
        $stage = strtolower(trim($stage));
        if (!in_array($stage, array('exact', 'full'), true)) {
            $stage = 'full';
        }

        $variants = BeThemeSmartSearch_Helpers::build_query_variants($query);
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

        $payload['exact_product'] = $this->find_exact_product($variants);
        $tExact = microtime(true);

        if ($stage === 'exact') {
            $payload['timings_ms'] = array(
                'exact' => (int) round(($tExact - $t0) * 1000),
                'total' => (int) round((microtime(true) - $t0) * 1000),
            );
            return rest_ensure_response($payload);
        }

        // For dropdown usage, cache aggressively with a short TTL to reduce DB load.
        $use_cache = !empty($this->options['enable_caching']);
        $cache_ttl = 30;
        if (!empty($this->options['cache_ttl'])) {
            $cache_ttl = max(10, min(120, (int) $this->options['cache_ttl']));
        }

        $cache_key = 'betheme_search_live_' . md5($variants[0] . '|' . $context . '|' . $limit . '|v1');
        if ($use_cache) {
            $cached = get_transient($cache_key);
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
            $payload['products'] = $this->search_products($variants[0], $limit);
            if (!empty($this->options['live_search_show_categories'])) {
                $payload['categories'] = $this->search_categories($variants[0], min(10, $limit));
            }
        }

        $tFull = microtime(true);
        $payload['timings_ms'] = array(
            'exact' => (int) round(($tExact - $t0) * 1000),
            'full' => (int) round(($tFull - $tExact) * 1000),
            'total' => (int) round((microtime(true) - $t0) * 1000),
        );

        if ($use_cache && $cache_ttl > 0) {
            set_transient($cache_key, $payload, $cache_ttl);
        }

        return rest_ensure_response($payload);
    }

    /**
     * Handle search query via REST API
     */
    public function handle_search_query($request) {
        // Allow disabling REST live search
        if (empty($this->options['live_search_enabled'])) {
            return new WP_Error('live_search_disabled', 'Live search is disabled', array('status' => 403));
        }

        $query = $request->get_param('q');
        $context = $request->get_param('context');
        $limit = $request->get_param('limit');

        if (empty($query)) {
            return new WP_Error('missing_query', 'Search query is required', array('status' => 400));
        }

        $variants = BeThemeSmartSearch_Helpers::build_query_variants($query);
        if (!empty($variants)) {
            // Use normalized query for caching to avoid duplicate caches (e.g. SKU with/without dashes).
            $query = $variants[0];
        }

        $use_cache = !empty($this->options['enable_caching']);
        $cache_ttl = !empty($this->options['cache_ttl']) ? absint($this->options['cache_ttl']) : HOUR_IN_SECONDS;

        // Create cache key
        $cache_key = 'betheme_search_' . md5($query . '|' . $context . '|' . $limit);
        if ($use_cache) {
            $cached_results = get_transient($cache_key);
            if ($cached_results !== false) {
                return new WP_REST_Response($cached_results, 200);
            }
        }

        $results = $this->perform_search($query, $context, $limit);

        // Cache results
        if ($use_cache && $cache_ttl > 0) {
            set_transient($cache_key, $results, $cache_ttl);
        }

        // Log the search
        BeThemeSmartSearch_Helpers::log_search_query($query, count($results['products']));

        return new WP_REST_Response($results, 200);
    }

    /**
     * Live suggestions endpoint (popular queries + prefix matches).
     */
    public function handle_suggest_query($request) {
        $q = (string) $request->get_param('q');
        $q = trim($q);
        $context = (string) $request->get_param('context');
        $context = $context !== '' ? $context : 'shop';

        $limit = (int) $request->get_param('limit');
        $limit = max(1, min(20, $limit));

        $days = (int) $request->get_param('days');
        $days = max(1, min(365, $days));

        $use_cache = !empty($this->options['enable_caching']);
        $cache_ttl = 300;
        if (!empty($this->options['cache_ttl'])) {
            $cache_ttl = max(60, min(3600, (int) $this->options['cache_ttl']));
        }

        $cache_key = 'betheme_search_suggest_' . md5($q . '|' . $context . '|' . $limit . '|' . $days . '|v2');
        if ($use_cache) {
            $cached = get_transient($cache_key);
            if ($cached !== false) {
                return rest_ensure_response($cached);
            }
        }

        global $wpdb;
        $table = $wpdb->prefix . 'betheme_search_analytics';
        $exists = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $table));

        $popular = array();
        $matches = array();
        $popular_products = array();

        if ($exists === $table) {
            $since = gmdate('Y-m-d H:i:s', time() - ($days * DAY_IN_SECONDS));

            // Prefix matches (only if query is long enough)
            if ($q !== '' && mb_strlen($q, 'UTF-8') >= 2) {
                $like = $wpdb->esc_like($q) . '%';
                $rows2 = $wpdb->get_results(
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
                        min(30, $limit * 4)
                    ),
                    ARRAY_A
                );

                if (is_array($rows2)) {
                    foreach ($rows2 as $r) {
                        $label = isset($r['query']) ? (string) $r['query'] : '';
                        $label = trim($label);
                        if ($label === '') {
                            continue;
                        }
                        $matches[] = array(
                            'query' => $label,
                            'count' => isset($r['cnt']) ? (int) $r['cnt'] : 0,
                        );
                        if (count($matches) >= $limit) {
                            break;
                        }
                    }
                }
            } else {
                // No query entered: collect popular queries as a fallback (UI may prefer popular products).
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
                        min(50, $limit * 6)
                    ),
                    ARRAY_A
                );

                if (is_array($rows)) {
                    foreach ($rows as $r) {
                        $label = isset($r['query']) ? (string) $r['query'] : '';
                        $label = trim($label);
                        if ($label === '') {
                            continue;
                        }
                        $popular[] = array(
                            'query' => $label,
                            'count' => isset($r['cnt']) ? (int) $r['cnt'] : 0,
                        );
                    }
                }
            }
        }

        // Popular products (only needed for empty query UI).
        if ($q === '' && $context === 'shop' && BeThemeSmartSearch_Helpers::is_woocommerce_active()) {
            $popular_products = $this->get_popular_products($limit);
        }

        $payload = array(
            'query' => $q,
            'context' => $context,
            // Popular queries: returned as a fallback, but the UI may prefer popular_products.
            'popular' => array_slice($popular, 0, $limit),
            'matches' => array_slice($matches, 0, $limit),
            'popular_products' => array_slice($popular_products, 0, $limit),
        );

        if ($use_cache && $cache_ttl > 0) {
            set_transient($cache_key, $payload, $cache_ttl);
        }

        return rest_ensure_response($payload);
    }

    private function get_popular_products($limit) {
        $limit = max(1, min(20, (int) $limit));
        $cache_key = 'betheme_search_popular_products_' . md5((string) $limit);
        if (!empty($this->options['enable_caching'])) {
            $cached = get_transient($cache_key);
            if ($cached !== false) {
                return is_array($cached) ? $cached : array();
            }
        }

        // Use total_sales for a stable "popular products" list.
        $q = new WP_Query(array(
            'post_type' => 'product',
            'post_status' => 'publish',
            'posts_per_page' => $limit,
            'meta_key' => 'total_sales',
            'orderby' => 'meta_value_num',
            'order' => 'DESC',
            'no_found_rows' => true,
            'fields' => 'ids',
        ));

        $out = array();
        if (!empty($q->posts) && is_array($q->posts)) {
            foreach ($q->posts as $product_id) {
                $product_id = (int) $product_id;
                if ($product_id <= 0) {
                    continue;
                }
                $out[] = $this->format_product_for_live($product_id);
            }
        }

        $out = array_values(array_filter($out));

        if (!empty($this->options['enable_caching'])) {
            // Popular products rarely need to update per keystroke.
            set_transient($cache_key, $out, 30 * MINUTE_IN_SECONDS);
        }

        return $out;
    }

    /**
     * Perform the actual search
     */
    private function perform_search($query, $context, $limit) {
        $results = array(
            'products' => array(),
            'categories' => array(),
            'brands' => array(),
            'suggestions' => array()
        );

        // Search products
        if ($context === 'shop' && BeThemeSmartSearch_Helpers::is_woocommerce_active()) {
            $results['products'] = $this->search_products($query, $limit);
        }

        // Search categories
        if (!empty($this->options['live_search_show_categories'])) {
            $results['categories'] = $this->search_categories($query, $limit);
        }

        // Search brands (if using product brands)
        if (!empty($this->options['live_search_show_brands'])) {
            $results['brands'] = $this->search_brands($query, $limit);
        }

        // Generate suggestions
        $results['suggestions'] = $this->generate_suggestions($query);

        return $results;
    }

    /**
     * Try to find a single product by an exact code match (SKU or configured meta keys).
     * Returns a lightweight product payload or null.
     */
    private function find_exact_product($variants) {
        if (!BeThemeSmartSearch_Helpers::is_woocommerce_active()) {
            return null;
        }

        $variants = is_array($variants) ? array_values(array_unique(array_filter(array_map('trim', $variants)))) : array();
        if (empty($variants)) {
            return null;
        }

        foreach ($variants as $v) {
            if ($v === '') {
                continue;
            }
            $id = wc_get_product_id_by_sku($v);
            if (!empty($id)) {
                return $this->format_product_for_live($id);
            }
        }

        $meta_keys = BeThemeSmartSearch_Helpers::get_product_meta_keys($this->options);
        $meta_keys = is_array($meta_keys) ? $meta_keys : array();
        if (empty($meta_keys)) {
            return null;
        }

        $meta_keys = array_values(array_filter($meta_keys, function ($k) {
            return is_string($k) && $k !== '' && $k !== '_product_attributes';
        }));
        if (empty($meta_keys)) {
            return null;
        }

        global $wpdb;
        $meta_table = $wpdb->postmeta;
        $posts_table = $wpdb->posts;

        foreach ($meta_keys as $key) {
            foreach ($variants as $v) {
                if ($v === '') {
                    continue;
                }

                $product_id = $wpdb->get_var(
                    $wpdb->prepare(
                        "SELECT pm.post_id
                        FROM {$meta_table} pm
                        INNER JOIN {$posts_table} p ON p.ID = pm.post_id
                        WHERE pm.meta_key = %s
                          AND pm.meta_value = %s
                          AND p.post_type = 'product'
                          AND p.post_status = 'publish'
                        LIMIT 1",
                        $key,
                        $v
                    )
                );

                $product_id = (int) $product_id;
                if ($product_id > 0) {
                    return $this->format_product_for_live($product_id);
                }
            }
        }

        return null;
    }

    private function format_product_for_live($product_id) {
        $product_id = (int) $product_id;
        if ($product_id <= 0) {
            return null;
        }

        $product = wc_get_product($product_id);
        if (!$product) {
            return null;
        }

        return array(
            'id' => $product_id,
            'title' => get_the_title($product_id),
            'url' => get_permalink($product_id),
            'price' => $product->get_price_html(),
            'image' => get_the_post_thumbnail_url($product_id, 'thumbnail'),
            'sku' => $product->get_sku(),
            'in_stock' => $product->is_in_stock(),
        );
    }

    /**
     * Search products
     */
    private function search_products($query, $limit) {
        $variants = BeThemeSmartSearch_Helpers::build_query_variants($query);
        if (empty($variants)) {
            $variants = array($query);
        }

        $meta_keys = BeThemeSmartSearch_Helpers::get_product_meta_keys($this->options);
        $meta_keys = is_array($meta_keys) ? $meta_keys : array();

        // meta_query is an additional AND in WP_Query, so only use it for code-like searches (SKU/barcodes).
        $is_code_like = BeThemeSmartSearch_Helpers::is_code_like_query($query);
        $mode = BeThemeSmartSearch_Helpers::normalize_code_match_mode(isset($this->options['code_match_mode']) ? $this->options['code_match_mode'] : null);

        $meta_query = null;
        if ($is_code_like && !empty($meta_keys)) {
            $meta_query = array('relation' => 'OR');

            foreach ($meta_keys as $key) {
                $key = sanitize_text_field($key);
                if ($key === '') {
                    continue;
                }

                // Attributes meta is huge; restrict to original query only.
                if ($key === '_product_attributes') {
                    $meta_query[] = array('key' => $key, 'value' => $variants[0], 'compare' => 'LIKE');
                    continue;
                }

                foreach ($variants as $v) {
                    $v = (string) $v;
                    $v = trim($v);
                    if ($v === '') {
                        continue;
                    }

                    if ($mode === 'exact') {
                        $meta_query[] = array('key' => $key, 'value' => $v, 'compare' => '=');
                        continue;
                    }

                    if ($mode === 'startswith') {
                        // Use REGEXP to avoid wrapping with %...% (WP_Meta_Query does that for LIKE).
                        // Escape value to prevent regex injection; anchor to the beginning.
                        $pattern = '^' . preg_quote($v, '/');
                        $meta_query[] = array('key' => $key, 'value' => $pattern, 'compare' => 'REGEXP');
                        continue;
                    }

                    // contains (default)
                    $meta_query[] = array('key' => $key, 'value' => $v, 'compare' => 'LIKE');
                }
            }
        }

        $args = array(
            'post_type' => 'product',
            'post_status' => 'publish',
            'posts_per_page' => $limit,
            's' => $query
        );

        if (is_array($meta_query) && count($meta_query) > 1) {
            $args['meta_query'] = $meta_query;
        }

        $products_query = new WP_Query($args);
        $products = array();

        if ($products_query->have_posts()) {
            while ($products_query->have_posts()) {
                $products_query->the_post();
                $product = wc_get_product(get_the_ID());

                $products[] = array(
                    'id' => get_the_ID(),
                    'title' => get_the_title(),
                    'url' => get_permalink(),
                    'price' => $product->get_price_html(),
                    'image' => get_the_post_thumbnail_url(get_the_ID(), 'thumbnail'),
                    'sku' => $product->get_sku(),
                    'in_stock' => $product->is_in_stock()
                );
            }
        }

        wp_reset_postdata();

        // Smart ordering: push exact SKU matches and in-stock items to the top.
        if (!empty($products)) {
            $needleCode = strtoupper(preg_replace('/[\\s\\-–—_]+/', '', (string) $query));
            $needleCode = is_string($needleCode) ? trim($needleCode) : '';

            usort($products, function ($a, $b) use ($query, $needleCode) {
                $score = function ($p) use ($query, $needleCode) {
                    $s = 0;
                    $sku = isset($p['sku']) ? (string) $p['sku'] : '';
                    $skuCode = strtoupper(preg_replace('/[\\s\\-–—_]+/', '', $sku));

                    if ($needleCode !== '' && $skuCode !== '' && $skuCode === $needleCode) {
                        $s += 100;
                    } elseif ($needleCode !== '' && $skuCode !== '' && strpos($skuCode, $needleCode) === 0) {
                        $s += 60;
                    } elseif ($needleCode !== '' && $skuCode !== '' && strpos($skuCode, $needleCode) !== false) {
                        $s += 40;
                    }

                    $title = isset($p['title']) ? (string) $p['title'] : '';
                    if ($title !== '' && $query !== '' && mb_stripos($title, $query, 0, 'UTF-8') !== false) {
                        $s += 10;
                    }

                    $inStock = !empty($p['in_stock']);
                    if ($inStock) {
                        $s += 5;
                    } else {
                        $s -= 20;
                    }

                    return $s;
                };

                $sa = $score($a);
                $sb = $score($b);
                if ($sa === $sb) {
                    return strcasecmp((string) ($a['title'] ?? ''), (string) ($b['title'] ?? ''));
                }
                return $sb <=> $sa;
            });
        }

        return $products;
    }

    /**
     * Search categories
     */
    private function search_categories($query, $limit) {
        $args = array(
            'taxonomy' => 'product_cat',
            'name__like' => $query,
            'number' => $limit,
            'hide_empty' => true
        );

        $categories = get_terms($args);
        $results = array();

        foreach ($categories as $category) {
            $results[] = array(
                'id' => $category->term_id,
                'name' => $category->name,
                'url' => get_term_link($category),
                'count' => $category->count
            );
        }

        return $results;
    }

    /**
     * Search brands (placeholder - implement based on your brand taxonomy)
     */
    private function search_brands($query, $limit) {
        // This is a placeholder. Implement based on your brand taxonomy
        // For example, if using 'product_brand' taxonomy
        $args = array(
            'taxonomy' => 'product_brand', // Change to your brand taxonomy
            'name__like' => $query,
            'number' => $limit,
            'hide_empty' => true
        );

        $brands = get_terms($args);
        $results = array();

        foreach ($brands as $brand) {
            $results[] = array(
                'id' => $brand->term_id,
                'name' => $brand->name,
                'url' => get_term_link($brand),
                'count' => $brand->count
            );
        }

        return $results;
    }

    /**
     * Generate search suggestions
     */
    private function generate_suggestions($query) {
        // Simple suggestions based on popular searches
        // In a real implementation, this could come from analytics
        $suggestions = array(
            $query . ' accessories',
            'best ' . $query,
            $query . ' reviews'
        );

        return array_slice($suggestions, 0, 3);
    }
}
