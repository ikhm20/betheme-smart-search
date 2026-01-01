<?php
/**
 * Shared meta query helpers for SKU/barcode searches.
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Search_MetaQuery {
    public static function build_for_term($term, $meta_keys, $mode) {
        $term = is_string($term) ? trim($term) : '';
        if ($term === '') {
            return array();
        }
        return self::build_for_variants(array($term), $meta_keys, $mode);
    }

    public static function build_for_variants($variants, $meta_keys, $mode) {
        $variants = is_array($variants) ? $variants : array();
        $meta_keys = is_array($meta_keys) ? $meta_keys : array();

        $variants = array_values(array_unique(array_filter(array_map('trim', $variants), static function ($value) {
            return $value !== '';
        })));

        $meta_keys = array_values(array_unique(array_filter(array_map('sanitize_text_field', $meta_keys), static function ($value) {
            return $value !== '';
        })));

        if (empty($variants) || empty($meta_keys)) {
            return array();
        }

        $compare = '=';
        $prefix = '';
        $suffix = '';
        if ($mode === 'startswith') {
            $compare = 'LIKE';
            $suffix = '%';
        } elseif ($mode === 'contains') {
            $compare = 'LIKE';
            $prefix = '%';
            $suffix = '%';
        }

        $meta_query = array('relation' => 'OR');
        foreach ($variants as $variant) {
            $value = $prefix . $variant . $suffix;
            foreach ($meta_keys as $key) {
                $meta_query[] = array(
                    'key' => $key,
                    'value' => $value,
                    'compare' => $compare,
                );
            }
        }

        return count($meta_query) > 1 ? $meta_query : array();
    }
}
