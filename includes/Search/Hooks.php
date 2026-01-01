<?php
/**
 * Hooks and filters for BeTheme Smart Search
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Hooks {

    private $options;
    private $product_meta_keys;
    private $cache_enabled;
    private $cache_ttl;
    private $product_lookup;

    public function __construct() {
        $this->options = BeThemeSmartSearch_Support_Options::get();
        $this->product_meta_keys = BeThemeSmartSearch_Helpers::get_product_meta_keys($this->options);
        $this->product_lookup = new BeThemeSmartSearch_Search_ProductLookup();

        // Cache is shared with REST live-search setting (and can be cleared from the admin UI).
        $this->cache_enabled = !empty($this->options['enable_caching']);
        $this->cache_ttl = !empty($this->options['cache_ttl']) ? absint($this->options['cache_ttl']) : 600;
        $this->cache_ttl = BeThemeSmartSearch_Support_Cache::clamp_ttl($this->cache_ttl, 30, 86400);

        // Optional: force WooCommerce "shop-style" search results (?s=...&post_type=product)
        add_action('template_redirect', array($this, 'maybe_redirect_to_shop_search'), 1);
        add_action('template_redirect', array($this, 'maybe_redirect_exact_match_to_product'), 2);

        // Extend product search query on the shop-style results page (SKU/barcodes via meta_query)
        add_action('pre_get_posts', array($this, 'maybe_enhance_shop_search_query'), 20);

        // Lightweight analytics for full search page loads (not dropdown AJAX)
        add_action('wp', array($this, 'maybe_log_search_page'), 20);

        // Override search template
        add_filter('template_include', array($this, 'override_search_template'));

        // Add custom body classes
        add_filter('body_class', array($this, 'add_search_body_class'));

        // Modify search form
        add_filter('get_search_form', array($this, 'custom_search_form'));

        // Extend BeTheme live search results with SKU/barcode/attributes matches.
        add_filter('the_posts', array($this, 'maybe_extend_betheme_live_search_posts'), 20, 2);

        // On shop-style search, reuse WooCommerce shop sidebar widgets for the search sidebar
        // so BeTheme can render the familiar shop filters/sidebar.
        add_filter('sidebars_widgets', array($this, 'maybe_inherit_shop_sidebar_widgets'), 1);

        // Render BeBuilder layout page above the WooCommerce product search loop
        if (BeThemeSmartSearch_Helpers::is_woocommerce_active()) {
            add_action('woocommerce_before_main_content', array($this, 'maybe_render_shop_search_layout'), 6);
        }

        // Disable BeTheme live search if active
        if (empty($this->options['preserve_betheme_search'])) {
            add_action('wp_enqueue_scripts', array($this, 'disable_betheme_live_search'), 99);
        }
    }

    private function is_betheme_livesearch_ajax_request() {
        return isset($_GET['mfn_livesearch']) && !isset($_GET['searchpage']);
    }

    private function is_shop_style_search_request() {
        if (empty($this->options['shop_style_results'])) {
            return false;
        }

        if (!BeThemeSmartSearch_Helpers::is_woocommerce_active()) {
            return false;
        }

        $post_type = isset($_GET['post_type']) ? sanitize_text_field(wp_unslash($_GET['post_type'])) : '';
        return $post_type === 'product';
    }

    public function maybe_enhance_shop_search_query($query) {
        if (!($query instanceof WP_Query) || is_admin() || wp_doing_ajax()) {
            return;
        }

        if (!$query->is_main_query() || !$query->is_search()) {
            return;
        }

        if (empty($this->options['enhance_shop_search_query'])) {
            return;
        }

        if (!$this->is_shop_style_search_request()) {
            return;
        }

        // BeTheme live-search dropdown should keep its own behavior; we extend results separately via `the_posts`.
        if ($this->is_betheme_livesearch_ajax_request()) {
            return;
        }

        $term = BeThemeSmartSearch_Helpers::get_search_term();
        if ($term === '') {
            return;
        }

        // Important: meta_query is an additional SQL condition (AND), so we should only add it for code-like queries
        // (SKU / barcode). For regular text searches this would incorrectly filter out valid title matches.
        if (!BeThemeSmartSearch_Search_Normalize::is_code_like_query($term)) {
            return;
        }

        $variants = BeThemeSmartSearch_Search_Variants::build($term, $this->options);
        if (empty($variants)) {
            return;
        }

        $mode = BeThemeSmartSearch_Helpers::normalize_code_match_mode(isset($this->options['code_match_mode']) ? $this->options['code_match_mode'] : null);

        $keys = $this->product_meta_keys;
        if (empty($keys)) {
            return;
        }

        // Build meta_query that will match SKU/barcodes/attributes meta keys.
        $meta_query = $query->get('meta_query');
        if (!is_array($meta_query)) {
            $meta_query = array();
        }

        $or = BeThemeSmartSearch_Search_MetaQuery::build_for_variants($variants, $keys, $mode);
        if (empty($or)) {
            return;
        }

        // Ensure we don't break existing meta_query relations.
        $meta_query[] = $or;
        $query->set('meta_query', $meta_query);
    }

    public function maybe_log_search_page() {
        if (is_admin() || wp_doing_ajax()) {
            return;
        }

        if (!is_search()) {
            return;
        }

        // Don't log BeTheme dropdown requests.
        if ($this->is_betheme_livesearch_ajax_request()) {
            return;
        }

        if (empty($this->options['enable_search_logging'])) {
            return;
        }

        $term = BeThemeSmartSearch_Helpers::get_search_term();
        if ($term === '') {
            return;
        }

        global $wp_query;
        if (!($wp_query instanceof WP_Query)) {
            return;
        }

        // Prefer found_posts when available.
        $results_count = isset($wp_query->found_posts) ? (int) $wp_query->found_posts : 0;

        // BeTheme sometimes uses post__in and disables found rows; fall back to actual posts count.
        if ($results_count === 0 && is_array($wp_query->posts)) {
            $results_count = count($wp_query->posts);
        }

        BeThemeSmartSearch_Helpers::log_search_query($term, $results_count);
    }

    /**
     * If the search term matches exactly one product SKU/barcode/variation SKU, redirect straight to the product.
     * This makes "type SKU and press Enter" behave as users expect.
     */
    public function maybe_redirect_exact_match_to_product() {
        if (is_admin() || wp_doing_ajax()) {
            return;
        }

        if (!is_search()) {
            return;
        }

        // Never redirect BeTheme live-search dropdown AJAX.
        if ($this->is_betheme_livesearch_ajax_request()) {
            return;
        }

        if (empty($this->options['redirect_exact_match_to_product'])) {
            return;
        }

        if (!BeThemeSmartSearch_Helpers::is_woocommerce_active()) {
            return;
        }

        $post_type = isset($_GET['post_type']) ? sanitize_text_field(wp_unslash($_GET['post_type'])) : '';
        if ($post_type !== 'product') {
            return;
        }

        $term = BeThemeSmartSearch_Helpers::get_search_term();
        if ($term === '') {
            return;
        }

        // Don't treat very short queries as "SKU".
        if (BeThemeSmartSearch_Search_Normalize::length($term) < 4) {
            return;
        }

        $meta_keys = array_diff($this->product_meta_keys, array('_product_attributes'));
        if (empty($meta_keys)) {
            return;
        }

        $variants = BeThemeSmartSearch_Search_Variants::build($term, $this->options);
        if (empty($variants)) {
            return;
        }

        $product_ids = array();
        $variation_parent_ids = array();
        foreach ($variants as $v) {
            $product_ids = array_merge(
                $product_ids,
                $this->product_lookup->find_product_ids_by_meta($v, $meta_keys, '=', 2)
            );
            $variation_parent_ids = array_merge(
                $variation_parent_ids,
                $this->product_lookup->find_variation_parent_ids_by_meta($v, $meta_keys, '=', 2)
            );

            $candidate_ids = array_values(array_unique(array_map('absint', array_merge($product_ids, $variation_parent_ids))));
            if (count($candidate_ids) > 1) {
                break;
            }
        }

        $candidate_ids = array_values(array_unique(array_map('absint', array_merge($product_ids, $variation_parent_ids))));
        if (count($candidate_ids) !== 1) {
            return;
        }

        $product_id = (int) $candidate_ids[0];
        if (!$product_id) {
            return;
        }

        $url = get_permalink($product_id);
        if (!$url) {
            return;
        }

        wp_safe_redirect($url, 302);
        exit;
    }

    /**
     * Add products matched by SKU/barcode/attributes to BeTheme's live-search response (`?mfn_livesearch`),
     * without changing the theme template.
     */
    public function maybe_extend_betheme_live_search_posts($posts, $query) {
        static $running = false;

        if ($running) {
            return $posts;
        }

        if (!($query instanceof WP_Query) || !$query->is_main_query() || !$query->is_search()) {
            return $posts;
        }

        // Full shop-style results fallback: if text search returns nothing, try taxonomy term matches
        // (attributes/categories/brands) to avoid "no products found" for queries like brand names.
        if (!$this->is_betheme_livesearch_ajax_request()) {
            return $this->maybe_fallback_shop_search_to_taxonomies($posts, $query);
        }

        if (empty($this->options['enhance_betheme_live_search'])) {
            return $posts;
        }

        if (!BeThemeSmartSearch_Helpers::is_woocommerce_active()) {
            return $posts;
        }

        $term = BeThemeSmartSearch_Helpers::get_search_term();
        if ($term === '') {
            return $posts;
        }

        $existing_ids = array();
        if (is_array($posts)) {
            foreach ($posts as $p) {
                if (is_object($p) && isset($p->ID)) {
                    $existing_ids[] = (int) $p->ID;
                }
            }
        }

        $running = true;
        $extra_ids = $this->find_extra_product_ids_for_live_search($term, 12);
        $running = false;

        if (empty($extra_ids)) {
            return $posts;
        }

        $extra_posts = array();
        foreach ($extra_ids as $id) {
            $id = (int) $id;
            if (!$id || in_array($id, $existing_ids, true)) {
                continue;
            }

            $post = get_post($id);
            if ($post && $post->post_status === 'publish') {
                $extra_posts[] = $post;
            }
        }

        if (empty($extra_posts)) {
            return $posts;
        }

        // Prepend SKU/barcode matches to increase chance of being displayed in the dropdown.
        return array_merge($extra_posts, is_array($posts) ? $posts : array());
    }

    private function maybe_fallback_shop_search_to_taxonomies($posts, $query) {
        static $running = false;

        if ($running) {
            return $posts;
        }

        if (!($query instanceof WP_Query) || is_admin() || wp_doing_ajax()) {
            return $posts;
        }

        if (!$this->is_shop_style_search_request()) {
            return $posts;
        }

        // Only fallback when the query returns nothing.
        if (!empty($posts)) {
            return $posts;
        }

        if (!BeThemeSmartSearch_Helpers::is_woocommerce_active()) {
            return $posts;
        }

        $term = BeThemeSmartSearch_Helpers::get_search_term();
        if ($term === '') {
            return $posts;
        }

        // Codes are handled by meta_query / redirect logic; don't apply taxonomy fallback for them.
        if (BeThemeSmartSearch_Search_Normalize::is_code_like_query($term)) {
            return $posts;
        }

        $per_page = (int) $query->get('posts_per_page');
        if ($per_page <= 0) {
            $per_page = 12;
        }
        $per_page = max(1, min(100, $per_page));

        $paged = (int) $query->get('paged');
        if ($paged <= 0) {
            $paged = 1;
        }

        $running = true;
        $fallback_q = $this->build_taxonomy_fallback_query($term, $per_page, $paged);
        $running = false;

        if (!$fallback_q || empty($fallback_q->posts)) {
            return $posts;
        }

        // Mutate the main query so WooCommerce templates render pagination properly.
        $query->posts = $fallback_q->posts;
        $query->post_count = count($fallback_q->posts);
        $query->found_posts = (int) $fallback_q->found_posts;
        $query->max_num_pages = (int) $fallback_q->max_num_pages;

        return $fallback_q->posts;
    }

    private function build_taxonomy_fallback_query($term, $per_page, $paged) {
        $term = is_string($term) ? trim($term) : '';
        if ($term === '') {
            return null;
        }

        // Collect taxonomies to search:
        // - all product attributes (pa_*)
        // - product categories/tags
        // - optional brand taxonomy if present
        $taxonomies = BeThemeSmartSearch_Search_Taxonomy::get_fallback_taxonomies();
        if (empty($taxonomies)) {
            return null;
        }

        $taxonomy_to_term_ids = BeThemeSmartSearch_Search_Taxonomy::collect_term_ids_by_taxonomies($term, $taxonomies, array(
            'search' => $term,
            'number' => 10,
            'hide_empty' => false,
        ));

        if (empty($taxonomy_to_term_ids)) {
            return null;
        }

        $tax_query = array('relation' => 'OR');
        foreach ($taxonomy_to_term_ids as $taxonomy => $ids) {
            $tax_query[] = array(
                'taxonomy' => $taxonomy,
                'field' => 'term_id',
                'terms' => $ids,
            );
        }

        return new WP_Query(array(
            'post_type' => 'product',
            'post_status' => 'publish',
            'posts_per_page' => $per_page,
            'paged' => $paged,
            'tax_query' => $tax_query,
        ));
    }

    private function find_extra_product_ids_for_live_search($term, $limit) {
        $limit = max(1, min(30, (int) $limit));
        $term = is_string($term) ? trim($term) : '';
        if ($term === '') {
            return array();
        }

        $cache_key = 'betheme_search_live_extra_' . md5($term . '|' . implode(',', $this->product_meta_keys) . '|' . $limit);
        if ($this->cache_enabled) {
            $cached = BeThemeSmartSearch_Support_Cache::get($cache_key);
            if (is_array($cached)) {
                return array_slice(array_values(array_unique(array_map('absint', $cached))), 0, $limit);
            }
        }

        $meta_keys = $this->product_meta_keys;
        if (empty($meta_keys)) {
            return array();
        }

        $variants = BeThemeSmartSearch_Search_Variants::build($term, $this->options);
        if (empty($variants)) {
            $variants = array($term);
        }

        $product_ids = array();
        foreach ($variants as $v) {
            $product_ids = array_merge(
                $product_ids,
                $this->product_lookup->find_product_ids_by_meta($v, $meta_keys, 'LIKE', $limit)
            );
        }

        // Also match variation SKUs/barcodes and include parent products.
        $variation_parent_ids = array();
        foreach ($variants as $v) {
            $variation_parent_ids = array_merge(
                $variation_parent_ids,
                $this->product_lookup->find_variation_parent_ids_by_meta($v, $meta_keys, 'LIKE', $limit)
            );
        }
        if (!empty($variation_parent_ids)) {
            $product_ids = array_merge($product_ids, $variation_parent_ids);
        }

        // Attribute term names (pa_*) -> products
        $attribute_product_ids = array();
        foreach ($variants as $v) {
            $attribute_product_ids = array_merge($attribute_product_ids, $this->find_product_ids_by_attribute_terms($v, $limit));
        }
        if (!empty($attribute_product_ids)) {
            $product_ids = array_merge($product_ids, $attribute_product_ids);
        }

        $product_ids = array_values(array_unique(array_map('absint', $product_ids)));
        $product_ids = array_slice($product_ids, 0, $limit);

        if ($this->cache_enabled && $this->cache_ttl > 0) {
            BeThemeSmartSearch_Support_Cache::set($cache_key, $product_ids, $this->cache_ttl);
        }

        return $product_ids;
    }

    private function find_product_ids_by_attribute_terms($term, $limit) {
        $limit = max(1, min(30, (int) $limit));
        $term = is_string($term) ? trim($term) : '';
        if ($term === '') {
            return array();
        }

        $cache_key = 'betheme_search_attr_products_' . md5($term . '|' . $limit);
        if ($this->cache_enabled) {
            $cached = BeThemeSmartSearch_Support_Cache::get($cache_key);
            if (is_array($cached)) {
                return array_slice(array_values(array_unique(array_map('absint', $cached))), 0, $limit);
            }
        }

        $taxonomies = BeThemeSmartSearch_Search_Taxonomy::get_attribute_taxonomies();
        if (empty($taxonomies)) {
            return array();
        }

        $taxonomy_to_terms = BeThemeSmartSearch_Search_Taxonomy::collect_term_ids_by_taxonomies($term, $taxonomies, array(
            'name__like' => $term,
            'number' => 10,
            'hide_empty' => false,
        ));

        if (empty($taxonomy_to_terms)) {
            return array();
        }

        $tax_query = array('relation' => 'OR');
        foreach ($taxonomy_to_terms as $taxonomy => $term_ids) {
            $tax_query[] = array(
                'taxonomy' => $taxonomy,
                'field' => 'term_id',
                'terms' => $term_ids,
            );
        }

        $ids = get_posts(array(
            'post_type' => 'product',
            'post_status' => 'publish',
            'fields' => 'ids',
            'posts_per_page' => $limit,
            'no_found_rows' => true,
            'tax_query' => $tax_query,
        ));

        if ($this->cache_enabled && $this->cache_ttl > 0) {
            BeThemeSmartSearch_Support_Cache::set($cache_key, $ids, $this->cache_ttl);
        }

        return $ids;
    }

    /**
     * If BeTheme is configured to show a sidebar on search pages but the "Search" sidebar is empty,
     * reuse WooCommerce sidebar widgets for product search (`post_type=product`) so the shop sidebar appears.
     */
    public function maybe_inherit_shop_sidebar_widgets($sidebars_widgets) {
        if (!is_array($sidebars_widgets)) {
            return $sidebars_widgets;
        }

        if (is_admin() || wp_doing_ajax()) {
            return $sidebars_widgets;
        }

        if (!$this->is_shop_style_search_request()) {
            return $sidebars_widgets;
        }

        // Only if search sidebar is empty and shop sidebar has widgets.
        $search_sidebar_id = 'mfn-search';
        $shop_sidebar_id = 'shop';

        $search_widgets = isset($sidebars_widgets[$search_sidebar_id]) ? $sidebars_widgets[$search_sidebar_id] : array();
        $shop_widgets = isset($sidebars_widgets[$shop_sidebar_id]) ? $sidebars_widgets[$shop_sidebar_id] : array();

        if (!empty($search_widgets)) {
            return $sidebars_widgets;
        }

        if (empty($shop_widgets)) {
            return $sidebars_widgets;
        }

        $sidebars_widgets[$search_sidebar_id] = $shop_widgets;
        return $sidebars_widgets;
    }

    /**
     * Redirect `?s=...` to `?s=...&post_type=product` when shop-style results are enabled.
     */
    public function maybe_redirect_to_shop_search() {
        if (is_admin() || wp_doing_ajax()) {
            return;
        }

        if (!is_search()) {
            return;
        }

        if (empty($this->options['shop_style_results'])) {
            return;
        }

        if (!BeThemeSmartSearch_Helpers::is_woocommerce_active()) {
            return;
        }

        // Never redirect BeTheme live-search AJAX requests.
        if ($this->is_betheme_livesearch_ajax_request()) {
            return;
        }

        // Already a product search
        if ($this->is_shop_style_search_request()) {
            // If the user arrived from BeTheme live-search "searchpage" link, drop those params
            // to avoid theme-specific behavior affecting the WooCommerce archive search.
            if (isset($_GET['mfn_livesearch']) || isset($_GET['searchpage'])) {
                $clean = remove_query_arg(array('mfn_livesearch', 'searchpage'));
                wp_safe_redirect(esc_url_raw($clean), 302);
                exit;
            }
            return;
        }

        // Avoid redirecting empty searches.
        $term = BeThemeSmartSearch_Helpers::get_search_term();
        if ($term === '') {
            return;
        }

        $url = add_query_arg('post_type', 'product');
        wp_safe_redirect(esc_url_raw($url), 302);
        exit;
    }

    /**
     * Render a BeBuilder page (selected in plugin settings) above the WooCommerce product search results.
     */
    public function maybe_render_shop_search_layout() {
        if (is_admin() || wp_doing_ajax()) {
            return;
        }

        if (!is_search()) {
            return;
        }

        if (!$this->is_shop_style_search_request()) {
            return;
        }

        $layout_page_id = !empty($this->options['results_layout_page_id']) ? absint($this->options['results_layout_page_id']) : 0;
        if (!$layout_page_id) {
            return;
        }

        if (!class_exists('Mfn_Builder_Front')) {
            return;
        }

        $layout_post = get_post($layout_page_id);
        if (!$layout_post || $layout_post->post_status !== 'publish') {
            return;
        }

        echo '<div class="betheme-smart-search-layout betheme-smart-search-layout--shop">';
        do_action('mfn_before_content');
        $builder = new Mfn_Builder_Front($layout_page_id, true);
        $builder->show();
        do_action('mfn_after_content');
        echo '</div>';
    }

    /**
     * Override the search results template
     */
    public function override_search_template($template) {
        if (is_search()) {
            // Keep BeTheme live-search AJAX response intact.
            // BeTheme's JS expects the default theme search template HTML (e.g. `.posts_group`) when requesting `?mfn_livesearch`.
            // The full results page uses `?mfn_livesearch&searchpage` and can be customized safely.
            if ($this->is_betheme_livesearch_ajax_request()) {
                return $template;
            }

            // When using WooCommerce shop-style results, allow the theme/Woo templates (archive-product) to render.
            if ($this->is_shop_style_search_request()) {
                return $template;
            }

            if (empty($this->options['use_custom_template'])) {
                return $template;
            }

            $custom_template = BETHEME_SMART_SEARCH_DIR . 'templates/search-results.php';
            if (file_exists($custom_template)) {
                return $custom_template;
            }
        }
        return $template;
    }

    /**
     * Add custom body classes for search pages
     */
    public function add_search_body_class($classes) {
        if (is_search()) {
            $classes[] = 'betheme-smart-search-results';
            $context = BeThemeSmartSearch_Helpers::get_search_context();
            $classes[] = 'search-context-' . $context;
        }
        return $classes;
    }

    /**
     * Customize the search form
     */
    public function custom_search_form($form) {
        if (!is_search()) {
            return $form;
        }

        $term = BeThemeSmartSearch_Helpers::get_search_term();
        if ($term === '') {
            return $form;
        }

        // Best-effort: ensure the visible search input preserves the query on the results page.
        // Some themes render a custom search form without a value attribute.
        if (strpos($form, 'name="s"') === false && strpos($form, "name='s'") === false) {
            return $form;
        }

        $escaped = esc_attr($term);

        $form = preg_replace_callback(
            '/<input\b[^>]*\bname=(["\'])s\1[^>]*>/i',
            function ($m) use ($escaped) {
                $tag = $m[0];
                if (preg_match('/\btype=(["\'])(hidden)\1/i', $tag)) {
                    return $tag;
                }
                if (preg_match('/\bvalue=(["\']).*?\1/i', $tag)) {
                    return $tag;
                }
                return preg_replace('/>$/', ' value="' . $escaped . '">', $tag);
            },
            $form
        );

        return $form;
    }

    /**
     * Disable BeTheme's built-in live search
     */
    public function disable_betheme_live_search() {
        if (!empty($this->options['preserve_betheme_search'])) {
            return;
        }

        // Dequeue BeTheme live search scripts if they exist
        wp_dequeue_script('betheme-live-search');
        wp_dequeue_style('betheme-live-search');

        // Remove BeTheme search filters that might interfere
        remove_filter('posts_search', 'mfn_search_filter', 10);
        remove_filter('posts_where', 'mfn_search_where', 10);
        remove_filter('posts_join', 'mfn_search_join', 10);
    }
}
