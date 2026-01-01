<?php
/**
 * Shared taxonomy helpers for search.
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Search_Taxonomy {
    public static function get_attribute_taxonomies() {
        if (!function_exists('wc_get_attribute_taxonomy_names')) {
            return array();
        }

        $taxonomies = wc_get_attribute_taxonomy_names();
        if (!is_array($taxonomies)) {
            return array();
        }

        return array_values(array_unique(array_filter(array_map('sanitize_text_field', $taxonomies))));
    }

    public static function get_brand_taxonomies() {
        $taxonomies = array();
        if (taxonomy_exists('product_brand')) {
            $taxonomies[] = 'product_brand';
        } elseif (taxonomy_exists('pa_brand')) {
            $taxonomies[] = 'pa_brand';
        }
        return $taxonomies;
    }

    public static function get_supported_taxonomies($include_attributes = false) {
        $taxonomies = array('product_cat', 'product_tag');
        $taxonomies = array_merge($taxonomies, self::get_brand_taxonomies());

        if ($include_attributes) {
            $taxonomies = array_merge(self::get_attribute_taxonomies(), $taxonomies);
        }

        return array_values(array_unique(array_filter(array_map('sanitize_text_field', $taxonomies))));
    }

    public static function get_fallback_taxonomies() {
        return self::get_supported_taxonomies(true);
    }

    public static function collect_term_ids_by_taxonomies($term, $taxonomies, $args) {
        $term = is_string($term) ? trim($term) : '';
        if ($term === '') {
            return array();
        }

        $taxonomies = is_array($taxonomies) ? $taxonomies : array();
        $args = is_array($args) ? $args : array();

        $taxonomy_to_term_ids = array();
        foreach ($taxonomies as $taxonomy) {
            $taxonomy = sanitize_text_field($taxonomy);
            if ($taxonomy === '' || !taxonomy_exists($taxonomy)) {
                continue;
            }

            $terms = get_terms(array_merge($args, array(
                'taxonomy' => $taxonomy,
            )));

            if (is_wp_error($terms) || empty($terms)) {
                continue;
            }

            $ids = array();
            foreach ($terms as $t) {
                if (is_object($t) && isset($t->term_id)) {
                    $ids[] = (int) $t->term_id;
                }
            }

            $ids = array_values(array_unique(array_filter($ids)));
            if (!empty($ids)) {
                $taxonomy_to_term_ids[$taxonomy] = $ids;
            }
        }

        return $taxonomy_to_term_ids;
    }

    public static function get_terms_map_for_posts($post_ids, $taxonomies) {
        $post_ids = is_array($post_ids) ? array_values(array_filter(array_map('intval', $post_ids))) : array();
        $taxonomies = is_array($taxonomies) ? array_values(array_filter($taxonomies)) : array();
        if (empty($post_ids) || empty($taxonomies)) {
            return array();
        }

        $terms = wp_get_object_terms($post_ids, $taxonomies, array('fields' => 'all_with_object_id'));
        if (is_wp_error($terms) || empty($terms)) {
            return array();
        }

        $map = array();
        foreach ($terms as $term) {
            if (!isset($term->object_id, $term->name)) {
                continue;
            }
            $object_id = (int) $term->object_id;
            $map[$object_id][] = (string) $term->name;
        }

        return $map;
    }
}
