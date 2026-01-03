<?php
/**
 * Search query builder (skeleton).
 *
 * Responsible for building WP_Query args and meta queries.
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Search_QueryBuilder {
    public function search_products_v2($query, $limit, $options = array()) {
        if (!BeThemeSmartSearch_Helpers::is_woocommerce_active()) {
            return array();
        }

        $query = is_string($query) ? trim($query) : '';
        $limit = max(1, (int) $limit);
        $options = is_array($options) ? $options : array();

        if ($query === '') {
            return array();
        }

        if (class_exists('BeThemeSmartSearch_Support_Engines')) {
            $engine = BeThemeSmartSearch_Support_Engines::get_active($options);
            if (is_array($engine)) {
                $options = wp_parse_args($engine, $options);
            }
        }

        $tokens = BeThemeSmartSearch_Search_Normalize::tokenize($query, $options);
        $min_len = isset($options['min_token_length']) ? (int) $options['min_token_length'] : 2;
        $min_len = max(1, min(10, $min_len));

        $tokens_lc = $this->build_tokens_lc($tokens, $min_len, $options);
        $token_pool = $this->build_token_pool($tokens, $min_len);

        $variants = BeThemeSmartSearch_Search_Variants::build($query, $options);
        if (empty($variants)) {
            $variants = array($query);
        }

        $is_code_like = BeThemeSmartSearch_Search_Normalize::is_code_like_query($query);
        $mode = BeThemeSmartSearch_Support_Options::normalize_code_match_mode(isset($options['code_match_mode']) ? $options['code_match_mode'] : null);
        $search_mode = BeThemeSmartSearch_Support_Options::normalize_search_mode(isset($options['search_mode']) ? $options['search_mode'] : null);
        $meta_keys = BeThemeSmartSearch_Helpers::get_product_meta_keys($options);
        $meta_keys = is_array($meta_keys) ? array_values(array_filter($meta_keys)) : array();

        $meta_query = null;
        if ($is_code_like && !empty($meta_keys)) {
            $code_keys = array();
            $attr_keys = array();

            foreach ($meta_keys as $key) {
                $key = sanitize_text_field($key);
                if ($key === '') {
                    continue;
                }
                if ($key === '_product_attributes') {
                    $attr_keys[] = $key;
                    continue;
                }
                $code_keys[] = $key;
            }

            $meta_query = BeThemeSmartSearch_Search_MetaQuery::build_for_variants($variants, $code_keys, $mode);

            // Attributes meta is huge; restrict to original query only.
            if (!empty($attr_keys) && !empty($variants)) {
                if (empty($meta_query)) {
                    $meta_query = array('relation' => 'OR');
                }

                $attr_value = $variants[0];
                foreach ($attr_keys as $key) {
                    $meta_query[] = array(
                        'key' => $key,
                        'value' => $attr_value,
                        'compare' => 'LIKE',
                    );
                }
            }
        }

        $max_candidates = max(60, $limit * 20);
        $max_candidates = min(160, $max_candidates);
        $stage_cap = min(220, $max_candidates + 40);

        $candidate_ids = array();

        // Stage 1: full query (phrase).
        $candidate_ids = array_merge($candidate_ids, $this->query_product_ids($query, $max_candidates, $meta_query));
        $candidate_ids = array_values(array_unique($candidate_ids));

        $candidate_ids = $this->stage_add_variants($candidate_ids, $variants, $stage_cap, $is_code_like);
        $candidate_ids = $this->stage_widen_tokens($candidate_ids, $token_pool, $stage_cap, $is_code_like);
        $candidate_ids = $this->stage_widen_taxonomies($candidate_ids, $token_pool, $stage_cap, $is_code_like, $min_len);
        $candidate_ids = $this->stage_fuzzy_fallback($candidate_ids, $tokens, $stage_cap, $is_code_like, $options);

        if (empty($candidate_ids)) {
            return array();
        }

        if (count($candidate_ids) > $max_candidates) {
            $candidate_ids = array_slice($candidate_ids, 0, $max_candidates);
        }

        $tax_terms_map = array();
        $taxonomies = BeThemeSmartSearch_Search_Taxonomy::get_supported_taxonomies();
        if (!empty($taxonomies)) {
            $tax_terms_map = BeThemeSmartSearch_Search_Taxonomy::get_terms_map_for_posts($candidate_ids, $taxonomies);
        }

        $products = array();
        foreach ($candidate_ids as $product_id) {
            $product_id = (int) $product_id;
            if ($product_id <= 0) {
                continue;
            }

            $product = wc_get_product($product_id);
            if (!$product) {
                continue;
            }

            $products[] = array(
                'id' => $product_id,
                'title' => get_the_title($product_id),
                'url' => get_permalink($product_id),
                'price' => $product->get_price_html(),
                'image' => get_the_post_thumbnail_url($product_id, 'thumbnail'),
                'sku' => $product->get_sku(),
                'in_stock' => $product->is_in_stock(),
                'tax_terms' => isset($tax_terms_map[$product_id]) ? $tax_terms_map[$product_id] : array(),
            );
        }

        if (empty($products)) {
            return array();
        }

        $coverage_tokens = array();
        foreach ($tokens_lc as $token) {
            if ($token === '' || BeThemeSmartSearch_Search_Normalize::length($token) < $min_len) {
                continue;
            }
            $coverage_tokens[] = $token;
        }
        $coverage_tokens = array_values(array_unique($coverage_tokens));
        $token_total = count($coverage_tokens);
        if ($token_total > 1) {
            $has_full_match = false;

            foreach ($products as &$product) {
                $title = isset($product['title']) ? (string) $product['title'] : '';
                $title_lc = $title !== '' ? BeThemeSmartSearch_Search_Normalize::to_lc($title) : '';

                $sku = isset($product['sku']) ? (string) $product['sku'] : '';
                $sku_code = $sku !== '' ? BeThemeSmartSearch_Search_Normalize::normalize_code($sku) : '';

                $tax_terms = isset($product['tax_terms']) && is_array($product['tax_terms']) ? $product['tax_terms'] : array();
                $tax_terms_lc = array();
                if (!empty($tax_terms)) {
                    foreach ($tax_terms as $term) {
                        $term = is_string($term) ? trim($term) : '';
                        if ($term === '') {
                            continue;
                        }
                        $tax_terms_lc[] = BeThemeSmartSearch_Search_Normalize::to_lc($term);
                    }
                }

                $hits = 0;
                foreach ($coverage_tokens as $token) {
                    $matched = false;

                    if ($title_lc !== '' && BeThemeSmartSearch_Search_Normalize::contains_ci($title_lc, $token)) {
                        $matched = true;
                    }

                    if (!$matched && $sku_code !== '') {
                        $token_code = BeThemeSmartSearch_Search_Normalize::normalize_code($token);
                        if ($token_code !== '' && strpos($sku_code, $token_code) !== false) {
                            $matched = true;
                        }
                    }

                    if (!$matched && !empty($tax_terms_lc)) {
                        foreach ($tax_terms_lc as $term_lc) {
                            if ($term_lc !== '' && BeThemeSmartSearch_Search_Normalize::contains_ci($term_lc, $token)) {
                                $matched = true;
                                break;
                            }
                        }
                    }

                    if ($matched) {
                        $hits++;
                    }
                }

                $product['token_hits'] = $hits;
                $product['token_total'] = $token_total;
                if ($hits === $token_total) {
                    $has_full_match = true;
                }
            }
            unset($product);

            if ($search_mode === 'and' && !$has_full_match) {
                return array();
            }

            if ($search_mode === 'and' || ($search_mode === 'auto' && $has_full_match)) {
                $products = array_values(array_filter($products, function ($product) use ($token_total) {
                    return isset($product['token_hits']) && (int) $product['token_hits'] === $token_total;
                }));
            }

            // If live search requests strict coverage, enforce it regardless of global search_mode.
            if (!empty($options['require_full_coverage']) && $token_total > 1) {
                $pre_strict_products = $products;

                $products = array_values(array_filter($products, function ($product) use ($token_total) {
                    return isset($product['token_hits']) && (int) $product['token_hits'] === $token_total;
                }));

                if (empty($products)) {
                    // Log this to help debugging queries that become too restrictive.
                    error_log(sprintf('BeTheme Smart Search: strict coverage removed all products; relaxing for query="%s" tokens="%s"', substr($query, 0, 200), implode(',', $coverage_tokens)));

                    // Fallback: allow partial matches — keep products with at least one token hit.
                    $products = array_values(array_filter($pre_strict_products, function ($product) {
                        return isset($product['token_hits']) && (int) $product['token_hits'] > 0;
                    }));

                    // If still empty, give up and return no results.
                    if (empty($products)) {
                        return array();
                    }
                }
            }
        }

        $scoring = new BeThemeSmartSearch_Search_Scoring();
        $ranked = $scoring->rank_products($products, $query, $tokens_lc, $options);
        return array_slice($ranked, 0, $limit);
    }

    private function merge_candidate_ids($candidate_ids, $more) {
        $candidate_ids = is_array($candidate_ids) ? $candidate_ids : array();
        if (!is_array($more) || empty($more)) {
            return $candidate_ids;
        }
        return array_values(array_unique(array_merge($candidate_ids, $more)));
    }

    private function stage_add_variants($candidate_ids, $variants, $stage_cap, $is_code_like) {
        if ($is_code_like) {
            return $candidate_ids;
        }

        $variants = is_array($variants) ? $variants : array();
        if (count($variants) <= 1 || count($candidate_ids) >= $stage_cap) {
            return $candidate_ids;
        }

        $extra_variants = array_slice($variants, 1, 2);
        foreach ($extra_variants as $v) {
            if (count($candidate_ids) >= $stage_cap) {
                break;
            }
            $more = $this->query_product_ids($v, $stage_cap - count($candidate_ids), null);
            $candidate_ids = $this->merge_candidate_ids($candidate_ids, $more);
        }

        return $candidate_ids;
    }

    private function stage_widen_tokens($candidate_ids, $token_pool, $stage_cap, $is_code_like) {
        if ($is_code_like) {
            return $candidate_ids;
        }

        $token_pool = is_array($token_pool) ? $token_pool : array();
        if (count($token_pool) <= 1 || count($candidate_ids) >= $stage_cap) {
            return $candidate_ids;
        }

        $token_budget = (int) floor($stage_cap / max(1, count($token_pool)));
        $token_budget = max(20, min($stage_cap, $token_budget));

        foreach ($token_pool as $tok) {
            $more = $this->query_product_ids($tok, $token_budget, null);
            $candidate_ids = $this->merge_candidate_ids($candidate_ids, $more);
        }

        if (count($candidate_ids) > $stage_cap) {
            $candidate_ids = array_slice($candidate_ids, 0, $stage_cap);
        }

        return $candidate_ids;
    }

    private function stage_widen_taxonomies($candidate_ids, $token_pool, $stage_cap, $is_code_like, $min_len) {
        if ($is_code_like) {
            return $candidate_ids;
        }

        $token_pool = is_array($token_pool) ? $token_pool : array();
        if (empty($token_pool) || count($candidate_ids) >= $stage_cap) {
            return $candidate_ids;
        }

        $taxonomies = BeThemeSmartSearch_Search_Taxonomy::get_supported_taxonomies();
        if (empty($taxonomies)) {
            return $candidate_ids;
        }

        $tax_tokens = array_slice($token_pool, 0, 2);
        $token_budget = (int) floor($stage_cap / max(1, count($tax_tokens)));
        $token_budget = max(20, min($stage_cap, $token_budget));

        $min_tax_len = max(3, (int) $min_len);
        foreach ($tax_tokens as $tok) {
            if (BeThemeSmartSearch_Search_Normalize::length($tok) < $min_tax_len) {
                continue;
            }

            $terms = get_terms(array(
                'taxonomy' => $taxonomies,
                'name__like' => $tok,
                'number' => 3,
                'hide_empty' => true,
            ));

            if (is_wp_error($terms) || empty($terms)) {
                continue;
            }

            $tax_query = array('relation' => 'OR');
            foreach ($terms as $term) {
                if (!isset($term->taxonomy, $term->term_id)) {
                    continue;
                }
                $tax_query[] = array(
                    'taxonomy' => $term->taxonomy,
                    'field' => 'term_id',
                    'terms' => (int) $term->term_id,
                );
            }

            if (count($tax_query) <= 1) {
                continue;
            }

            $remaining_tokens = array_values(array_diff($token_pool, array($tok)));
            $remaining_query = '';
            if (!empty($remaining_tokens)) {
                $remaining_query = implode(' ', $remaining_tokens);
            }

            $more = $this->query_product_ids($remaining_query, $token_budget, null, $tax_query);
            $candidate_ids = $this->merge_candidate_ids($candidate_ids, $more);

            if (count($candidate_ids) >= $stage_cap) {
                break;
            }
        }

        if (count($candidate_ids) > $stage_cap) {
            $candidate_ids = array_slice($candidate_ids, 0, $stage_cap);
        }

        return $candidate_ids;
    }

    private function stage_fuzzy_fallback($candidate_ids, $tokens, $stage_cap, $is_code_like, $options) {
        if ($is_code_like) {
            return $candidate_ids;
        }

        if (!empty($candidate_ids) || empty($options['enable_fuzzy_fallback'])) {
            return $candidate_ids;
        }

        $max_dist = isset($options['fuzzy_max_distance']) ? (int) $options['fuzzy_max_distance'] : 2;
        $fuzzy_tokens = $this->build_fuzzy_tokens($tokens, $max_dist);
        if (empty($fuzzy_tokens)) {
            return $candidate_ids;
        }

        $token_budget = (int) floor($stage_cap / max(1, count($fuzzy_tokens)));
        $token_budget = max(20, min($stage_cap, $token_budget));

        foreach ($fuzzy_tokens as $tok) {
            $more = $this->query_product_ids($tok, $token_budget, null);
            $candidate_ids = $this->merge_candidate_ids($candidate_ids, $more);
            if (count($candidate_ids) >= $stage_cap) {
                break;
            }
        }

        if (count($candidate_ids) > $stage_cap) {
            $candidate_ids = array_slice($candidate_ids, 0, $stage_cap);
        }

        return $candidate_ids;
    }

    private function build_tokens_lc($tokens, $min_len, $options = array()) {
        $tokens = is_array($tokens) ? $tokens : array();
        $out = array();

        // Build canonical synonyms map (variant -> canonical)
        $syn_map = BeThemeSmartSearch_Support_Options::get_synonyms_canonical_map($options);

        foreach ($tokens as $t) {
            $t = is_string($t) ? trim($t) : '';
            if ($t === '') {
                continue;
            }
            if (BeThemeSmartSearch_Search_Normalize::length($t) < $min_len) {
                continue;
            }

            // Normalize token (strip diacritics, normalize whitespace) and lowercase
            $tok_norm = BeThemeSmartSearch_Search_Normalize::to_lc($t);

            // Map via synonyms canonical map if possible
            if (isset($syn_map[$tok_norm])) {
                $tok_norm = $syn_map[$tok_norm];
            }

            $out[] = $tok_norm;
        }

        return array_values(array_unique(array_filter($out)));
    }

    private function build_token_pool($tokens, $min_len) {
        $tokens = is_array($tokens) ? $tokens : array();
        $pool = array();

        foreach ($tokens as $tok) {
            $tok = is_string($tok) ? trim($tok) : '';
            if ($tok === '') {
                continue;
            }
            if (BeThemeSmartSearch_Search_Normalize::length($tok) < $min_len) {
                continue;
            }
            $pool[] = $tok;
        }

        $pool = array_values(array_unique($pool));
        usort($pool, function ($a, $b) {
            $la = BeThemeSmartSearch_Search_Normalize::length($a);
            $lb = BeThemeSmartSearch_Search_Normalize::length($b);
            if ($la === $lb) {
                return 0;
            }
            return ($lb <=> $la);
        });

        return array_slice($pool, 0, 4);
    }

    private function build_fuzzy_tokens($tokens, $max_distance) {
        $tokens = is_array($tokens) ? $tokens : array();
        $max_distance = max(1, min(4, (int) $max_distance));
        $out = array();

        foreach ($tokens as $tok) {
            $tok = is_string($tok) ? trim($tok) : '';
            if ($tok === '') {
                continue;
            }

            $len = BeThemeSmartSearch_Search_Normalize::length($tok);
            if ($len <= 3) {
                continue;
            }

            $short_len = max(3, $len - $max_distance);
            if ($short_len >= $len) {
                continue;
            }

            if (BeThemeSmartSearch_Search_Normalize::has_mb()) {
                $short = mb_substr($tok, 0, $short_len, 'UTF-8');
            } else {
                $short = substr($tok, 0, $short_len);
            }

            if ($short !== '') {
                $out[] = $short;
            }
        }

        return array_values(array_unique($out));
    }

    private function query_product_ids($search_term, $per_page, $meta_query_for_term = null, $tax_query_for_term = null) {
        $search_term = is_string($search_term) ? trim($search_term) : '';
        if ($per_page < 1) {
            return array();
        }
        if ($search_term === '' && empty($tax_query_for_term)) {
            return array();
        }

        $args = array(
            'post_type' => 'product',
            'post_status' => 'publish',
            'posts_per_page' => (int) $per_page,
            's' => $search_term,
            'orderby' => 'relevance',
            'fields' => 'ids',
            'no_found_rows' => true,
            'ignore_sticky_posts' => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
            // Avoid theme/plugin "search tweaks" that can change token logic (AND/OR) and relevance.
            'suppress_filters' => true,
        );

        if (is_array($meta_query_for_term) && count($meta_query_for_term) > 1) {
            $args['meta_query'] = $meta_query_for_term;
        }

        if (is_array($tax_query_for_term) && count($tax_query_for_term) > 1) {
            $args['tax_query'] = $tax_query_for_term;
        }

        $q = new WP_Query($args);
        $ids = is_array($q->posts) ? $q->posts : array();
        $ids = array_map('intval', $ids);
        $ids = array_values(array_unique(array_filter($ids)));
        return $ids;
    }

    public function find_exact_product($variants, $options = array()) {
        if (!BeThemeSmartSearch_Helpers::is_woocommerce_active()) {
            return null;
        }

        $variants = is_array($variants) ? array_values(array_unique(array_filter(array_map('trim', $variants)))) : array();
        if (empty($variants)) {
            return null;
        }

        foreach ($variants as $v) {
            if ($v === '') {
                continue;
            }
            $id = wc_get_product_id_by_sku($v);
            if (!empty($id)) {
                return $this->format_product_for_live($id);
            }
        }

        $meta_keys = BeThemeSmartSearch_Helpers::get_product_meta_keys($options);
        $meta_keys = is_array($meta_keys) ? $meta_keys : array();
        if (empty($meta_keys)) {
            return null;
        }

        $meta_keys = array_values(array_filter($meta_keys, function ($k) {
            return is_string($k) && $k !== '' && $k !== '_product_attributes';
        }));
        if (empty($meta_keys)) {
            return null;
        }

        global $wpdb;
        $meta_table = $wpdb->postmeta;
        $posts_table = $wpdb->posts;

        foreach ($meta_keys as $key) {
            foreach ($variants as $v) {
                if ($v === '') {
                    continue;
                }

                $product_id = $wpdb->get_var(
                    $wpdb->prepare(
                        "SELECT pm.post_id
                        FROM {$meta_table} pm
                        INNER JOIN {$posts_table} p ON p.ID = pm.post_id
                        WHERE pm.meta_key = %s
                          AND pm.meta_value = %s
                          AND p.post_type = 'product'
                          AND p.post_status = 'publish'
                        LIMIT 1",
                        $key,
                        $v
                    )
                );

                $product_id = (int) $product_id;
                if ($product_id > 0) {
                    return $this->format_product_for_live($product_id);
                }
            }
        }

        return null;
    }

    public function get_popular_products($limit, $options = array()) {
        $limit = max(1, min(20, (int) $limit));
        $cache_key = 'betheme_search_popular_products_' . md5((string) $limit);
        if (!empty($options['enable_caching'])) {
            $cached = BeThemeSmartSearch_Support_Cache::get($cache_key);
            if ($cached !== false) {
                return is_array($cached) ? $cached : array();
            }
        }

        $q = new WP_Query(array(
            'post_type' => 'product',
            'post_status' => 'publish',
            'posts_per_page' => $limit,
            'meta_key' => 'total_sales',
            'orderby' => 'meta_value_num',
            'order' => 'DESC',
            'no_found_rows' => true,
            'fields' => 'ids',
        ));

        $out = array();
        if (!empty($q->posts) && is_array($q->posts)) {
            foreach ($q->posts as $product_id) {
                $product_id = (int) $product_id;
                if ($product_id <= 0) {
                    continue;
                }
                $out[] = $this->format_product_for_live($product_id);
            }
        }

        $out = array_values(array_filter($out));

        if (!empty($options['enable_caching'])) {
            BeThemeSmartSearch_Support_Cache::set($cache_key, $out, 30 * MINUTE_IN_SECONDS);
        }

        return $out;
    }

    public function search_categories($query, $limit) {
        return BeThemeSmartSearch_Search_TermSearch::search_categories($query, $limit);
    }

    public function search_brands($query, $limit) {
        return BeThemeSmartSearch_Search_TermSearch::search_brands($query, $limit);
    }

    public function format_product_for_live($product_id) {
        $product_id = (int) $product_id;
        if ($product_id <= 0) {
            return null;
        }

        $product = wc_get_product($product_id);
        if (!$product) {
            return null;
        }

        return array(
            'id' => $product_id,
            'title' => get_the_title($product_id),
            'url' => get_permalink($product_id),
            'price' => $product->get_price_html(),
            'image' => get_the_post_thumbnail_url($product_id, 'thumbnail'),
            'sku' => $product->get_sku(),
            'in_stock' => $product->is_in_stock(),
        );
    }
}
