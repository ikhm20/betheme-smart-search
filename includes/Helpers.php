<?php
/**
 * Helper functions for BeTheme Smart Search
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Helpers {

    public function __construct() {
        // Initialize any helper hooks if needed
    }

    /**
     * Check if current page is shop or product related
     */
    public static function is_shop_context() {
        return is_shop() || is_product_category() || is_product_tag() || is_product();
    }

    /**
     * Get search context (shop or blog)
     */
    public static function get_search_context() {
        if (self::is_shop_context()) {
            return 'shop';
        }
        return 'blog';
    }

    /**
     * Sanitize search query
     */
    public static function sanitize_search_query($query) {
        return sanitize_text_field($query);
    }

    /**
     * Determine whether a search term looks like a product code (SKU / barcode) rather than a natural-language query.
     *
     * Important: Using meta_query in WP_Query adds an AND condition, so we must only treat truly code-like queries
     * as codes; otherwise we will accidentally filter out valid title/content matches (e.g. brand names).
     */
    public static function is_code_like_query($query) {
        if (function_exists('_deprecated_function')) {
            _deprecated_function(__METHOD__, '1.0.1', 'BeThemeSmartSearch_Search_Normalize::is_code_like_query');
        }

        if (class_exists('BeThemeSmartSearch_Search_Normalize') && method_exists('BeThemeSmartSearch_Search_Normalize', 'is_code_like_query')) {
            return BeThemeSmartSearch_Search_Normalize::is_code_like_query($query);
        }

        $q = is_string($query) ? trim($query) : '';
        if ($q === '') {
            return false;
        }

        if (preg_match('/\s/u', $q)) {
            return false;
        }

        if (preg_match('/\d/', $q)) {
            return true;
        }

        if (preg_match('/[-_]/', $q)) {
            return true;
        }

        if (preg_match('/^[A-Za-z]+$/', $q)) {
            $len = function_exists('mb_strlen') ? mb_strlen($q, 'UTF-8') : strlen($q);
            if ($len > 4) {
                return false;
            }
            return $q === strtoupper($q);
        }

        return false;
    }

    public static function get_default_product_meta_keys() {
        if (function_exists('_deprecated_function')) {
            _deprecated_function(__METHOD__, '1.0.1', 'BeThemeSmartSearch_Support_Options::get_default_product_meta_keys');
        }
        return BeThemeSmartSearch_Support_Options::get_default_product_meta_keys();
    }

    /**
     * Product meta keys used for SKU/barcode matching.
     */
    public static function get_product_meta_keys($options = null) {
        $defaults = self::get_default_product_meta_keys();
        $options = is_array($options) ? $options : self::get_options();

        $keys = isset($options['product_meta_keys']) ? $options['product_meta_keys'] : array();
        if (is_string($keys)) {
            $keys = preg_split('/\s*,\s*/', $keys, -1, PREG_SPLIT_NO_EMPTY);
        }

        if (!is_array($keys)) {
            $keys = array();
        }

        $keys = array_values(array_unique(array_filter(array_map('sanitize_text_field', array_merge($defaults, $keys)))));
        return $keys;
    }

    /**
     * Normalize and validate code match mode used for SKU/barcodes meta matching.
     * Allowed: exact | startswith | contains
     */
    public static function normalize_code_match_mode($mode) {
        return BeThemeSmartSearch_Support_Options::normalize_code_match_mode($mode);
    }

    /**
     * Build a small set of query variants to improve matching (SKU separators, keyboard layout, translit).
     */
    public static function build_query_variants($term) {
        if (function_exists('_deprecated_function')) {
            _deprecated_function(__METHOD__, '1.0.1', 'BeThemeSmartSearch_Search_Variants::build');
        }

        if (class_exists('BeThemeSmartSearch_Search_Variants') && method_exists('BeThemeSmartSearch_Search_Variants', 'build')) {
            return BeThemeSmartSearch_Search_Variants::build($term);
        }

        return array();
    }

    /**
     * Parse synonyms rules from textarea. Format (one per line):
     * - `from=to1,to2`
     * - `from => to1, to2`
     */
    public static function parse_synonyms_rules($raw) {
        if (function_exists('_deprecated_function')) {
            _deprecated_function(__METHOD__, '1.0.1', 'BeThemeSmartSearch_Search_Variants::parse_synonyms_rules');
        }

        if (class_exists('BeThemeSmartSearch_Search_Variants') && method_exists('BeThemeSmartSearch_Search_Variants', 'parse_synonyms_rules')) {
            return BeThemeSmartSearch_Search_Variants::parse_synonyms_rules($raw);
        }

        return array();
    }

    /**
     * Get the current search term reliably even if a theme modifies the main query (e.g. sets `s` to false).
     */
    public static function get_search_term() {
        $term = get_search_query();
        if (is_string($term)) {
            $term = trim($term);
        }

        if (!empty($term)) {
            return $term;
        }

        if (isset($_GET['s'])) {
            $term = sanitize_text_field(wp_unslash($_GET['s']));
            $term = is_string($term) ? trim($term) : '';
            if (!empty($term)) {
                return $term;
            }
        }

        return '';
    }

    /**
     * Check if a given page contains a shortcode either in editor content or in BeBuilder items.
     */
    public static function page_has_shortcode($page_id, $shortcode_tag) {
        $page_id = absint($page_id);
        if (!$page_id || !is_string($shortcode_tag) || $shortcode_tag === '') {
            return false;
        }

        $post = get_post($page_id);
        if (!$post) {
            return false;
        }

        if (!empty($post->post_content) && has_shortcode($post->post_content, $shortcode_tag)) {
            return true;
        }

        // BeBuilder stores content in `mfn-page-items` meta (array or base64-encoded serialized array).
        $raw_items = get_post_meta($page_id, 'mfn-page-items', true);
        if (empty($raw_items)) {
            return false;
        }

        $items = self::decode_mfn_items($raw_items);
        if (empty($items)) {
            return false;
        }

        // BeBuilder shortcode element stores tag as plain text in items, so string match is sufficient.
        return self::value_contains($items, $shortcode_tag);
    }

    private static function decode_mfn_items($raw_items) {
        if (is_array($raw_items)) {
            return $raw_items;
        }

        if (!is_string($raw_items)) {
            return null;
        }

        // Try base64(serialize(...))
        $decoded = base64_decode($raw_items, true);
        if ($decoded !== false) {
            $un = @unserialize($decoded, array('allowed_classes' => false));
            if (is_array($un)) {
                return $un;
            }
        }

        // Try raw serialized array
        $un = @unserialize($raw_items, array('allowed_classes' => false));
        if (is_array($un)) {
            return $un;
        }

        return null;
    }

    private static function value_contains($value, $needle) {
        if (is_string($value)) {
            return strpos($value, $needle) !== false;
        }

        if (is_array($value)) {
            foreach ($value as $item) {
                if (self::value_contains($item, $needle)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Check if WooCommerce is active
     */
    public static function is_woocommerce_active() {
        return class_exists('WooCommerce');
    }

    /**
     * Get product SKU
     */
    public static function get_product_sku($product_id) {
        if (!self::is_woocommerce_active()) {
            return '';
        }
        $product = wc_get_product($product_id);
        return $product ? $product->get_sku() : '';
    }

    /**
     * Log search analytics
     */
    public static function log_search_query($query, $results_count, $context = null) {
        $context = is_string($context) ? trim($context) : '';
        if ($context === '') {
            $context = self::get_search_context();
        }
        $user_ip = self::get_user_ip();
        $user_agent = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';

        BeThemeSmartSearch_Support_Analytics::log_query(
            $query,
            $results_count,
            $context,
            $user_ip,
            $user_agent
        );
    }

    /**
     * Get user IP address
     */
    private static function get_user_ip() {
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
        } else {
            $ip = $_SERVER['REMOTE_ADDR'];
        }
        return sanitize_text_field($ip);
    }

    /**
     * Centralized access to plugin options with defaults
     */
    public static function get_options() {
        if (function_exists('_deprecated_function')) {
            _deprecated_function(__METHOD__, '1.0.1', 'BeThemeSmartSearch_Support_Options::get');
        }
        return BeThemeSmartSearch_Support_Options::get();
    }

    /**
     * Default options shared across plugin components
     */
    public static function get_default_options() {
        if (function_exists('_deprecated_function')) {
            _deprecated_function(__METHOD__, '1.0.1', 'BeThemeSmartSearch_Support_Options::get_default_options');
        }
        return BeThemeSmartSearch_Support_Options::get_default_options();
    }

    /**
     * Sanitize plugin options payload.
     */
    public static function sanitize_options($input) {
        if (function_exists('_deprecated_function')) {
            _deprecated_function(__METHOD__, '1.0.1', 'BeThemeSmartSearch_Support_Options::sanitize');
        }
        return BeThemeSmartSearch_Support_Options::sanitize($input);
    }
}
