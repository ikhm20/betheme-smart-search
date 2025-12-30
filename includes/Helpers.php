<?php
/**
 * Helper functions for BeTheme Smart Search
 */

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
        $q = is_string($query) ? trim($query) : '';
        if ($q === '') {
            return false;
        }

        // Codes are typically single tokens.
        if (preg_match('/\s/u', $q)) {
            return false;
        }

        // Any digits => very likely a code (SKU, barcode, GTIN, etc.)
        if (preg_match('/\d/', $q)) {
            return true;
        }

        // Common separators used in SKUs.
        if (preg_match('/[-_]/', $q)) {
            return true;
        }

        // Short alpha-only tokens can be SKU-like (e.g. "ABCD"), but many real queries are short words/brands
        // (e.g. "Kia"). To avoid filtering out valid text matches, treat alpha-only as codes only when they look
        // like an actual code: ALL CAPS and short.
        if (preg_match('/^[A-Za-z]+$/', $q)) {
            if (mb_strlen($q, 'UTF-8') > 4) {
                return false;
            }
            return $q === strtoupper($q);
        }

        return false;
    }

    public static function get_default_product_meta_keys() {
        return array(
            '_sku',
            'sku',
            '_barcode',
            'barcode',
            '_ean',
            'ean',
            '_gtin',
            'gtin',
            '_upc',
            'upc',
            '_product_attributes',
        );
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

    private static function normalize_code($value) {
        $value = is_string($value) ? trim($value) : '';
        if ($value === '') {
            return '';
        }

        // Remove common separators
        $value = str_replace(array(' ', "\t", "\n", "\r", '-', '–', '—', '_'), '', $value);
        return strtoupper($value);
    }

    private static function normalize_barcode_digits($value) {
        $value = is_string($value) ? trim($value) : '';
        if ($value === '') {
            return '';
        }
        return preg_replace('/\D+/', '', $value);
    }

    /**
     * Normalize and validate code match mode used for SKU/barcodes meta matching.
     * Allowed: exact | startswith | contains
     */
    public static function normalize_code_match_mode($mode) {
        $mode = is_string($mode) ? strtolower(trim($mode)) : '';
        $allowed = array('exact', 'startswith', 'contains');
        if (in_array($mode, $allowed, true)) {
            return $mode;
        }
        return 'contains';
    }

    private static function contains_cyrillic($value) {
        return is_string($value) && preg_match('/[А-Яа-яЁё]/u', $value);
    }

    private static function translit_ru_to_en($value) {
        if (!is_string($value) || $value === '') {
            return '';
        }

        $map = array(
            'а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'g', 'д' => 'd', 'е' => 'e', 'ё' => 'yo', 'ж' => 'zh',
            'з' => 'z', 'и' => 'i', 'й' => 'y', 'к' => 'k', 'л' => 'l', 'м' => 'm', 'н' => 'n', 'о' => 'o',
            'п' => 'p', 'р' => 'r', 'с' => 's', 'т' => 't', 'у' => 'u', 'ф' => 'f', 'х' => 'h', 'ц' => 'ts',
            'ч' => 'ch', 'ш' => 'sh', 'щ' => 'sch', 'ъ' => '', 'ы' => 'y', 'ь' => '', 'э' => 'e', 'ю' => 'yu',
            'я' => 'ya',
        );

        $value = mb_strtolower($value, 'UTF-8');
        $value = strtr($value, $map);
        return $value;
    }

    private static function swap_keyboard_layout($value) {
        if (!is_string($value) || $value === '') {
            return '';
        }

        // Basic EN<->RU QWERTY mapping (lowercase only). We'll preserve case by re-applying it.
        $en = array(
            'q','w','e','r','t','y','u','i','o','p','[',']',
            'a','s','d','f','g','h','j','k','l',';','\'',
            'z','x','c','v','b','n','m',',','.',
        );
        $ru = array(
            'й','ц','у','к','е','н','г','ш','щ','з','х','ъ',
            'ф','ы','в','а','п','р','о','л','д','ж','э',
            'я','ч','с','м','и','т','ь','б','ю',
        );

        $map_en_to_ru = array_combine($en, $ru);
        $map_ru_to_en = array_combine($ru, $en);

        $chars = preg_split('//u', $value, -1, PREG_SPLIT_NO_EMPTY);
        $out = '';

        foreach ($chars as $ch) {
            $lower = mb_strtolower($ch, 'UTF-8');
            $is_upper = ($ch !== $lower);

            if (isset($map_en_to_ru[$lower])) {
                $mapped = $map_en_to_ru[$lower];
            } elseif (isset($map_ru_to_en[$lower])) {
                $mapped = $map_ru_to_en[$lower];
            } else {
                $mapped = $ch;
            }

            if ($is_upper) {
                $mapped = mb_strtoupper($mapped, 'UTF-8');
            }

            $out .= $mapped;
        }

        return $out;
    }

    /**
     * Build a small set of query variants to improve matching (SKU separators, keyboard layout, translit).
     */
    public static function build_query_variants($term) {
        $term = is_string($term) ? trim($term) : '';
        if ($term === '') {
            return array();
        }

        $variants = array($term);

        // Synonyms expansion
        $options = self::get_options();
        if (!empty($options['enable_synonyms'])) {
            $synonyms_map = self::parse_synonyms_rules(isset($options['synonyms_rules']) ? $options['synonyms_rules'] : '');
            if (!empty($synonyms_map)) {
                $variants = array_merge($variants, self::expand_synonyms_variants($term, $synonyms_map, 12));
            }
        }

        $code = self::normalize_code($term);
        if ($code && $code !== $term) {
            $variants[] = $code;
        }

        $digits = self::normalize_barcode_digits($term);
        if ($digits && $digits !== $term && $digits !== $code) {
            $variants[] = $digits;
        }

        $swapped = self::swap_keyboard_layout($term);
        if ($swapped && $swapped !== $term) {
            $variants[] = $swapped;
        }

        if (self::contains_cyrillic($term)) {
            $tr = self::translit_ru_to_en($term);
            if ($tr && $tr !== $term) {
                $variants[] = $tr;
            }
        }

        $variants = array_values(array_unique(array_filter($variants)));
        return array_slice($variants, 0, 8);
    }

    /**
     * Parse synonyms rules from textarea. Format (one per line):
     * - `from=to1,to2`
     * - `from => to1, to2`
     */
    public static function parse_synonyms_rules($raw) {
        $raw = is_string($raw) ? trim($raw) : '';
        if ($raw === '') {
            return array();
        }

        $lines = preg_split("/\\r\\n|\\n|\\r/", $raw);
        $map = array();

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || strpos($line, '#') === 0) {
                continue;
            }

            $line = str_replace('=>', '=', $line);
            $parts = explode('=', $line, 2);
            if (count($parts) !== 2) {
                continue;
            }

            $from = trim($parts[0]);
            $to = trim($parts[1]);
            if ($from === '' || $to === '') {
                continue;
            }

            $targets = preg_split('/\s*,\s*/', $to, -1, PREG_SPLIT_NO_EMPTY);
            if (empty($targets)) {
                continue;
            }

            $from_norm = mb_strtolower($from, 'UTF-8');
            foreach ($targets as $t) {
                $t = trim($t);
                if ($t === '') {
                    continue;
                }
                $map[$from_norm][] = $t;
            }
        }

        foreach ($map as $k => $vals) {
            $vals = array_values(array_unique(array_filter($vals)));
            if (!empty($vals)) {
                $map[$k] = $vals;
            } else {
                unset($map[$k]);
            }
        }

        return $map;
    }

    private static function expand_synonyms_variants($term, $synonyms_map, $limit) {
        $limit = max(1, min(50, (int) $limit));
        if (!is_string($term) || $term === '' || !is_array($synonyms_map) || empty($synonyms_map)) {
            return array();
        }

        // Tokenize by whitespace. Keep it simple and safe.
        $tokens = preg_split('/\s+/', trim($term));
        if (empty($tokens)) {
            return array();
        }

        $expanded = array();

        // Expand up to 2 tokens with synonyms to avoid combinatorial explosion.
        $positions = array();
        foreach ($tokens as $i => $tok) {
            $key = mb_strtolower($tok, 'UTF-8');
            if (isset($synonyms_map[$key])) {
                $positions[] = $i;
            }
        }

        $positions = array_slice($positions, 0, 2);
        if (empty($positions)) {
            return array();
        }

        $queue = array($tokens);
        foreach ($positions as $pos) {
            $next = array();
            foreach ($queue as $tok_list) {
                $orig = $tok_list[$pos];
                $key = mb_strtolower($orig, 'UTF-8');
                $alts = isset($synonyms_map[$key]) ? $synonyms_map[$key] : array();
                foreach ($alts as $alt) {
                    $copy = $tok_list;
                    $copy[$pos] = $alt;
                    $next[] = $copy;
                    if (count($next) >= $limit) {
                        break 2;
                    }
                }
            }
            $queue = array_merge($queue, $next);
            if (count($queue) > $limit) {
                $queue = array_slice($queue, 0, $limit);
            }
        }

        foreach ($queue as $tok_list) {
            $v = trim(implode(' ', $tok_list));
            if ($v !== '' && $v !== $term) {
                $expanded[] = $v;
            }
        }

        return array_slice(array_values(array_unique($expanded)), 0, $limit);
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
    public static function log_search_query($query, $results_count) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'betheme_search_analytics';

        $context = self::get_search_context();

        $wpdb->insert(
            $table_name,
            array(
                'query' => sanitize_text_field($query),
                'results_count' => intval($results_count),
                'context' => $context,
                'user_ip' => self::get_user_ip(),
                'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? sanitize_text_field($_SERVER['HTTP_USER_AGENT']) : ''
            ),
            array('%s', '%d', '%s', '%s', '%s')
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
        $defaults = self::get_default_options();
        $options = get_option(BETHEME_SMART_SEARCH_OPTION_NAME, $defaults);

        // Merge to ensure new defaults are present
        return wp_parse_args($options, $defaults);
    }

    /**
     * Default options shared across plugin components
     */
    public static function get_default_options() {
        return array(
            'post_types' => array('product'),
            'search_fields' => array('title', 'sku', 'content'),
            'field_weights' => array(
                'title' => 5,
                'sku' => 10,
                'content' => 1,
            ),
            'live_search_enabled' => 1,
            'live_search_debounce' => 300,
            'live_search_max_results' => 5,
            'live_search_show_categories' => 1,
            'live_search_show_brands' => 1,
            'live_search_show_code_products' => 1,
            'use_custom_template' => 1,
            'enable_caching' => 1,
            'cache_ttl' => 600,
            'preserve_betheme_search' => 1,
            'results_layout_page_id' => 0,
            'shop_style_results' => 1,
            'enhance_betheme_live_search' => 1,
            'redirect_exact_match_to_product' => 1,
            'enhance_shop_search_query' => 1,
            'product_meta_keys' => self::get_default_product_meta_keys(),
            'code_match_mode' => 'contains',
            'enable_synonyms' => 1,
            'synonyms_rules' => "нашивка=патч,шеврон\nпатч=нашивка,шеврон\nшеврон=нашивка,патч",
            'enable_search_logging' => 1,
        );
    }

    /**
     * Sanitize plugin options payload.
     */
    public static function sanitize_options($input) {
        $input = is_array($input) ? $input : array();
        $sanitized = array();
        $defaults = self::get_default_options();

        // Post types
        $sanitized['post_types'] = isset($input['post_types']) && is_array($input['post_types'])
            ? array_map('sanitize_text_field', $input['post_types'])
            : $defaults['post_types'];

        // Search fields
        $sanitized['search_fields'] = isset($input['search_fields']) && is_array($input['search_fields'])
            ? array_map('sanitize_text_field', $input['search_fields'])
            : $defaults['search_fields'];

        // Field weights
        $sanitized['field_weights'] = array();
        if (isset($input['field_weights']) && is_array($input['field_weights'])) {
            foreach ($input['field_weights'] as $field => $weight) {
                $sanitized['field_weights'][sanitize_text_field($field)] = intval($weight);
            }
        } else {
            $sanitized['field_weights'] = $defaults['field_weights'];
        }

        // Live search settings
        $sanitized['live_search_enabled'] = !empty($input['live_search_enabled']) ? 1 : 0;
        $sanitized['live_search_debounce'] = isset($input['live_search_debounce']) ? intval($input['live_search_debounce']) : $defaults['live_search_debounce'];
        $sanitized['live_search_max_results'] = isset($input['live_search_max_results']) ? intval($input['live_search_max_results']) : $defaults['live_search_max_results'];
        $sanitized['live_search_show_categories'] = !empty($input['live_search_show_categories']) ? 1 : 0;
        $sanitized['live_search_show_brands'] = !empty($input['live_search_show_brands']) ? 1 : 0;
        $sanitized['live_search_show_code_products'] = !empty($input['live_search_show_code_products']) ? 1 : 0;

        // Template settings
        $sanitized['use_custom_template'] = !empty($input['use_custom_template']) ? 1 : 0;
        $sanitized['preserve_betheme_search'] = !empty($input['preserve_betheme_search']) ? 1 : 0;
        $sanitized['results_layout_page_id'] = isset($input['results_layout_page_id']) ? absint($input['results_layout_page_id']) : 0;
        $sanitized['shop_style_results'] = !empty($input['shop_style_results']) ? 1 : 0;
        $sanitized['enhance_betheme_live_search'] = !empty($input['enhance_betheme_live_search']) ? 1 : 0;
        $sanitized['redirect_exact_match_to_product'] = !empty($input['redirect_exact_match_to_product']) ? 1 : 0;
        $sanitized['enhance_shop_search_query'] = !empty($input['enhance_shop_search_query']) ? 1 : 0;
        $sanitized['enable_synonyms'] = !empty($input['enable_synonyms']) ? 1 : 0;
        $sanitized['synonyms_rules'] = isset($input['synonyms_rules']) ? (string) $input['synonyms_rules'] : $defaults['synonyms_rules'];
        $sanitized['synonyms_rules'] = wp_unslash($sanitized['synonyms_rules']);
        $sanitized['synonyms_rules'] = trim($sanitized['synonyms_rules']);
        if (strlen($sanitized['synonyms_rules']) > 8000) {
            $sanitized['synonyms_rules'] = substr($sanitized['synonyms_rules'], 0, 8000);
        }
        $sanitized['enable_search_logging'] = !empty($input['enable_search_logging']) ? 1 : 0;

        // Product meta keys (SKU/barcodes/attributes)
        $product_meta_keys = isset($input['product_meta_keys']) ? $input['product_meta_keys'] : $defaults['product_meta_keys'];
        if (is_string($product_meta_keys)) {
            $product_meta_keys = preg_split('/\s*,\s*/', $product_meta_keys, -1, PREG_SPLIT_NO_EMPTY);
        }
        if (!is_array($product_meta_keys)) {
            $product_meta_keys = $defaults['product_meta_keys'];
        }
        $product_meta_keys = array_values(array_unique(array_filter(array_map('sanitize_text_field', $product_meta_keys))));
        if (empty($product_meta_keys)) {
            $product_meta_keys = $defaults['product_meta_keys'];
        }
        $sanitized['product_meta_keys'] = $product_meta_keys;

        // Matching mode for SKU/barcodes meta queries
        $sanitized['code_match_mode'] = isset($input['code_match_mode'])
            ? self::normalize_code_match_mode($input['code_match_mode'])
            : $defaults['code_match_mode'];

        // Caching
        $sanitized['enable_caching'] = !empty($input['enable_caching']) ? 1 : 0;
        $sanitized['cache_ttl'] = isset($input['cache_ttl']) ? intval($input['cache_ttl']) : $defaults['cache_ttl'];

        // Clamp numeric values
        $sanitized['live_search_debounce'] = max(50, min(2000, (int) $sanitized['live_search_debounce']));
        $sanitized['live_search_max_results'] = max(1, min(50, (int) $sanitized['live_search_max_results']));
        $sanitized['cache_ttl'] = max(0, min(86400, (int) $sanitized['cache_ttl']));

        return wp_parse_args($sanitized, $defaults);
    }
}
