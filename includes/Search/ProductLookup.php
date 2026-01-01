<?php
/**
 * Product lookup helpers (meta-based).
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Search_ProductLookup {
    /**
     * Build a simple OR meta_query for a single term.
     */
    public function build_meta_query($term, $meta_keys, $compare, $skip_attributes = false) {
        $term = is_string($term) ? $term : '';
        if ($term === '') {
            return array();
        }

        if (!is_array($meta_keys) || empty($meta_keys)) {
            return array();
        }

        $compare = is_string($compare) ? strtoupper(trim($compare)) : 'LIKE';
        if (!in_array($compare, array('=', 'LIKE'), true)) {
            $compare = 'LIKE';
        }

        $meta_query = array('relation' => 'OR');
        foreach ($meta_keys as $key) {
            $key = sanitize_text_field($key);
            if ($key === '') {
                continue;
            }
            if ($skip_attributes && $key === '_product_attributes') {
                continue;
            }
            $meta_query[] = array(
                'key' => $key,
                'value' => $term,
                'compare' => $compare,
            );
        }

        return count($meta_query) > 1 ? $meta_query : array();
    }

    /**
     * Find product IDs by meta keys.
     */
    public function find_product_ids_by_meta($term, $meta_keys, $compare, $limit, $post_type = 'product', $skip_attributes = false) {
        $limit = max(1, min(30, (int) $limit));
        $post_type = is_string($post_type) && $post_type !== '' ? $post_type : 'product';

        $meta_query = $this->build_meta_query($term, $meta_keys, $compare, $skip_attributes);
        if (empty($meta_query)) {
            return array();
        }

        return get_posts(array(
            'post_type' => $post_type,
            'post_status' => 'publish',
            'fields' => 'ids',
            'posts_per_page' => $limit,
            'no_found_rows' => true,
            'meta_query' => $meta_query,
        ));
    }

    /**
     * Find parent product IDs for variations matched by meta keys.
     */
    public function find_variation_parent_ids_by_meta($term, $meta_keys, $compare, $limit) {
        $variation_keys = is_array($meta_keys) ? array_diff($meta_keys, array('_product_attributes')) : array();
        if (empty($variation_keys)) {
            return array();
        }

        $variation_ids = $this->find_product_ids_by_meta(
            $term,
            $variation_keys,
            $compare,
            $limit,
            'product_variation',
            true
        );

        if (empty($variation_ids)) {
            return array();
        }

        $parents = array();
        foreach ($variation_ids as $variation_id) {
            $parent = (int) wp_get_post_parent_id($variation_id);
            if ($parent) {
                $parents[] = $parent;
            }
        }

        return array_values(array_unique($parents));
    }
}
