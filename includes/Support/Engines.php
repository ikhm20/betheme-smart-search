<?php
/**
 * Search engines helper.
 *
 * Provides a SearchWP-like "engine" abstraction without changing storage format.
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Support_Engines {
    const DEFAULT_ENGINE_ID = 'default';

    /**
     * Return all engines from options, or a generated default engine.
     */
    public static function get_all($options = null) {
        $options = is_array($options) ? $options : BeThemeSmartSearch_Support_Options::get();
        $engines = isset($options['engines']) && is_array($options['engines'])
            ? $options['engines']
            : array();

        if (empty($engines)) {
            $engines = array(
                self::DEFAULT_ENGINE_ID => self::build_default_engine($options),
            );
        }

        // Normalize every engine to ensure required keys exist.
        foreach ($engines as $id => $engine) {
            $engines[$id] = self::normalize_engine($engine, $options);
        }

        return $engines;
    }

    /**
     * Return active engine config.
     */
    public static function get_active($options = null) {
        $options = is_array($options) ? $options : BeThemeSmartSearch_Support_Options::get();
        $engines = self::get_all($options);

        $active_id = isset($options['active_engine']) ? sanitize_text_field($options['active_engine']) : '';
        if ($active_id !== '' && isset($engines[$active_id])) {
            return $engines[$active_id];
        }

        return $engines[self::DEFAULT_ENGINE_ID];
    }

    /**
     * Build default engine from legacy options.
     */
    private static function build_default_engine($options) {
        return array(
            'label' => 'Default',
            'post_types' => isset($options['post_types']) ? $options['post_types'] : array('product'),
            'search_fields' => isset($options['search_fields']) ? $options['search_fields'] : array('title', 'sku', 'content'),
            'field_weights' => isset($options['field_weights']) ? $options['field_weights'] : array(),
            'product_meta_keys' => isset($options['product_meta_keys']) ? $options['product_meta_keys'] : BeThemeSmartSearch_Support_Options::get_default_product_meta_keys(),
            'search_mode' => isset($options['search_mode']) ? $options['search_mode'] : 'auto',
            'min_token_length' => isset($options['min_token_length']) ? (int) $options['min_token_length'] : 2,
            'stopwords' => isset($options['stopwords']) ? $options['stopwords'] : '',
        );
    }

    /**
     * Normalize engine structure and merge defaults.
     */
    public static function normalize_engine($engine, $options = null) {
        $options = is_array($options) ? $options : BeThemeSmartSearch_Support_Options::get();
        $engine = is_array($engine) ? $engine : array();

        $defaults = self::build_default_engine($options);

        $out = array();
        $out['label'] = isset($engine['label']) ? sanitize_text_field($engine['label']) : $defaults['label'];

        $out['post_types'] = isset($engine['post_types']) && is_array($engine['post_types'])
            ? array_map('sanitize_text_field', $engine['post_types'])
            : $defaults['post_types'];

        $out['search_fields'] = isset($engine['search_fields']) && is_array($engine['search_fields'])
            ? array_map('sanitize_text_field', $engine['search_fields'])
            : $defaults['search_fields'];

        $out['field_weights'] = array();
        if (isset($engine['field_weights']) && is_array($engine['field_weights'])) {
            foreach ($engine['field_weights'] as $field => $weight) {
                $out['field_weights'][sanitize_text_field($field)] = (int) $weight;
            }
        } else {
            $out['field_weights'] = $defaults['field_weights'];
        }

        $out['product_meta_keys'] = isset($engine['product_meta_keys']) && is_array($engine['product_meta_keys'])
            ? array_map('sanitize_text_field', $engine['product_meta_keys'])
            : $defaults['product_meta_keys'];

        $out['search_mode'] = isset($engine['search_mode'])
            ? BeThemeSmartSearch_Support_Options::normalize_search_mode($engine['search_mode'])
            : $defaults['search_mode'];

        $out['min_token_length'] = isset($engine['min_token_length']) ? (int) $engine['min_token_length'] : (int) $defaults['min_token_length'];
        $out['min_token_length'] = max(1, min(6, (int) $out['min_token_length']));

        $out['stopwords'] = isset($engine['stopwords']) ? sanitize_textarea_field($engine['stopwords']) : $defaults['stopwords'];

        return $out;
    }
}
