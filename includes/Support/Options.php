<?php

/**

 * Options helper (skeleton).

 *

 * Centralized defaults and validation.

 */



if (!defined('ABSPATH')) {

    exit;

}



class BeThemeSmartSearch_Support_Options {

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



    /**

     * Normalize search match mode for multi-word queries.

     * Allowed: auto | and | or

     */

    public static function normalize_search_mode($mode) {

        $mode = is_string($mode) ? strtolower(trim($mode)) : '';

        $allowed = array('auto', 'and', 'or');

        if (in_array($mode, $allowed, true)) {

            return $mode;

        }

        return 'auto';

    }



    /**

     * Centralized access to plugin options with defaults.

     */

    public static function get() {

        $defaults = self::get_default_options();

        $options = get_option(BETHEME_SMART_SEARCH_OPTION_NAME, $defaults);



        return wp_parse_args($options, $defaults);

    }



    /**

     * Default options shared across plugin components.

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

                        'active_engine' => 'default',
            'engines' => array(),
'live_search_enabled' => 1,

            'live_search_debounce' => 300,

            'live_search_max_results' => 5,

            'live_search_show_categories' => 1,

            'live_search_show_brands' => 1,

            'live_search_show_code_products' => 1,

            // Show "related queries" suggestions while typing in the dropdown.

            'live_search_show_suggestions' => 1,

            'search_mode' => 'auto',

            'min_token_length' => 2,

            'stopwords' => '',

            'phrase_boost' => 30,

            'exact_sku_boost' => 120,

            'out_of_stock_penalty' => 15,

            'enable_fuzzy_fallback' => 1,

            'fuzzy_max_distance' => 2,

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

            'synonyms_rules' => "нашивка=значок,патч\nзначок=нашивка,патч\nпатч=нашивка,значок\nшеврон=нашивка,патч\nчехол=корпус\nкорпус=чехол\nбрелок=ключ\nключ=брелок\niphon=iphone,айфон",

            'enable_search_logging' => 1,

        );

    }



    /**

     * Sanitize plugin options payload.

     */

    public static function sanitize($input) {

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



        $sanitized['active_engine'] = isset($input['active_engine']) ? sanitize_text_field($input['active_engine']) : $defaults['active_engine'];
        $engines_raw = isset($input['engines']) && is_array($input['engines']) ? $input['engines'] : $defaults['engines'];
        $sanitized['engines'] = array();
        if (class_exists('BeThemeSmartSearch_Support_Engines')) {
            foreach ($engines_raw as $engine_id => $engine) {
                $engine_id = sanitize_text_field($engine_id);
                if ($engine_id === '') {
                    continue;
                }
                $sanitized['engines'][$engine_id] = BeThemeSmartSearch_Support_Engines::normalize_engine($engine, $defaults);
            }
        } else {
            $sanitized['engines'] = is_array($engines_raw) ? $engines_raw : $defaults['engines'];
        }

        // Live search settings

        $sanitized['live_search_enabled'] = !empty($input['live_search_enabled']) ? 1 : 0;

        $sanitized['live_search_debounce'] = isset($input['live_search_debounce']) ? intval($input['live_search_debounce']) : $defaults['live_search_debounce'];

        $sanitized['live_search_max_results'] = isset($input['live_search_max_results']) ? intval($input['live_search_max_results']) : $defaults['live_search_max_results'];

        $sanitized['live_search_show_categories'] = !empty($input['live_search_show_categories']) ? 1 : 0;

        $sanitized['live_search_show_brands'] = !empty($input['live_search_show_brands']) ? 1 : 0;

        $sanitized['live_search_show_code_products'] = !empty($input['live_search_show_code_products']) ? 1 : 0;

        $sanitized['live_search_show_suggestions'] = !empty($input['live_search_show_suggestions']) ? 1 : 0;

        $sanitized['search_mode'] = isset($input['search_mode'])

            ? self::normalize_search_mode($input['search_mode'])

            : $defaults['search_mode'];

        $sanitized['min_token_length'] = isset($input['min_token_length']) ? intval($input['min_token_length']) : $defaults['min_token_length'];

        $sanitized['stopwords'] = isset($input['stopwords']) ? sanitize_textarea_field($input['stopwords']) : $defaults['stopwords'];

        $sanitized['phrase_boost'] = isset($input['phrase_boost']) ? intval($input['phrase_boost']) : $defaults['phrase_boost'];

        $sanitized['exact_sku_boost'] = isset($input['exact_sku_boost']) ? intval($input['exact_sku_boost']) : $defaults['exact_sku_boost'];

        $sanitized['out_of_stock_penalty'] = isset($input['out_of_stock_penalty']) ? intval($input['out_of_stock_penalty']) : $defaults['out_of_stock_penalty'];

        $sanitized['enable_fuzzy_fallback'] = !empty($input['enable_fuzzy_fallback']) ? 1 : 0;

        $sanitized['fuzzy_max_distance'] = isset($input['fuzzy_max_distance']) ? intval($input['fuzzy_max_distance']) : $defaults['fuzzy_max_distance'];



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

        $sanitized['min_token_length'] = max(1, min(6, (int) $sanitized['min_token_length']));

        $sanitized['phrase_boost'] = max(0, min(200, (int) $sanitized['phrase_boost']));

        $sanitized['exact_sku_boost'] = max(0, min(300, (int) $sanitized['exact_sku_boost']));

        $sanitized['out_of_stock_penalty'] = max(0, min(50, (int) $sanitized['out_of_stock_penalty']));

        $sanitized['fuzzy_max_distance'] = max(1, min(4, (int) $sanitized['fuzzy_max_distance']));



        return wp_parse_args($sanitized, $defaults);

    }

}

