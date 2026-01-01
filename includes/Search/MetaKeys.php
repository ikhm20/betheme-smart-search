<?php
/**
 * Shared meta-key helpers for SKU/barcode searches.
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Search_MetaKeys {
    public static function get_code_meta_keys($options = null, $include_acf = true) {
        $keys = BeThemeSmartSearch_Helpers::get_product_meta_keys($options);
        $keys = is_array($keys) ? $keys : array();
        $keys = array_values(array_unique(array_filter(array_map('sanitize_text_field', $keys))));
        $keys = array_values(array_diff($keys, array('_product_attributes')));

        if ($include_acf && function_exists('acf_get_field_groups')) {
            $acf_fields = self::get_acf_searchable_fields();
            if (!empty($acf_fields)) {
                $keys = array_merge($keys, array_map('sanitize_text_field', $acf_fields));
            }
        }

        return array_values(array_unique(array_filter($keys)));
    }

    private static function get_acf_searchable_fields() {
        if (!function_exists('acf_get_field_groups')) {
            return array();
        }

        $searchable_fields = array();
        $field_groups = acf_get_field_groups(array('post_type' => 'product'));

        foreach ($field_groups as $field_group) {
            $fields = acf_get_fields($field_group['key']);

            foreach ($fields as $field) {
                if (in_array($field['type'], array('text', 'textarea', 'wysiwyg', 'email', 'url'), true)) {
                    $searchable_fields[] = $field['name'];
                }
            }
        }

        return $searchable_fields;
    }
}
