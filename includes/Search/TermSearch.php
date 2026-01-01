<?php
/**
 * Term search helpers (categories/brands).
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Search_TermSearch {
    public static function search_categories($query, $limit) {
        return self::search_terms('product_cat', $query, $limit);
    }

    public static function search_brands($query, $limit) {
        $taxonomy = self::get_brand_taxonomy();
        if ($taxonomy === '') {
            return array();
        }
        return self::search_terms($taxonomy, $query, $limit);
    }

    public static function get_brand_taxonomy() {
        if (class_exists('BeThemeSmartSearch_Search_Taxonomy')) {
            $taxonomies = BeThemeSmartSearch_Search_Taxonomy::get_brand_taxonomies();
            if (!empty($taxonomies)) {
                return (string) $taxonomies[0];
            }
        }

        if (taxonomy_exists('product_brand')) {
            return 'product_brand';
        }

        if (taxonomy_exists('pa_brand')) {
            return 'pa_brand';
        }

        return '';
    }

    private static function search_terms($taxonomy, $query, $limit) {
        $taxonomy = is_string($taxonomy) ? $taxonomy : '';
        $query = is_string($query) ? trim($query) : '';
        $limit = max(1, min(20, (int) $limit));

        if ($taxonomy === '' || $query === '') {
            return array();
        }

        $terms = get_terms(array(
            'taxonomy' => $taxonomy,
            'name__like' => $query,
            'number' => $limit,
            'hide_empty' => true,
        ));

        if (is_wp_error($terms) || empty($terms)) {
            return array();
        }

        $results = array();
        foreach ($terms as $term) {
            $results[] = array(
                'id' => $term->term_id,
                'name' => $term->name,
                'url' => get_term_link($term),
                'count' => $term->count,
            );
        }

        return $results;
    }
}
