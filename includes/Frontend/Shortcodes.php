<?php
/**
 * Shortcodes for BeTheme Smart Search
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Shortcodes {

    public function __construct() {
        add_shortcode('betheme_smart_search_results', array($this, 'render_results'));
    }

    /**
     * Shortcode: [betheme_smart_search_results per_page="12" source="auto|main|query"]
     */
    public function render_results($atts) {
        if (is_admin() && !wp_doing_ajax()) {
            return '';
        }

        if (!function_exists('wc_get_product') || !BeThemeSmartSearch_Helpers::is_woocommerce_active()) {
            return '';
        }

        $atts = shortcode_atts(
            array(
                'per_page' => 12,
                'source' => 'auto',
            ),
            $atts,
            'betheme_smart_search_results'
        );

        $options = BeThemeSmartSearch_Support_Options::get();
        $source = is_string($atts['source']) ? strtolower(trim($atts['source'])) : 'auto';

        // When "shop-style" results are enabled, the theme/WooCommerce template renders the product loop.
        // Prevent duplicate product grids if the shortcode is placed on that page.
        if (is_search() && !empty($options['shop_style_results'])) {
            $post_type = isset($_GET['post_type']) ? sanitize_text_field(wp_unslash($_GET['post_type'])) : '';
            if ($post_type === 'product') {
                return '';
            }
        }

        $use_main_query_ids = false;
        if ($source === 'main') {
            $use_main_query_ids = true;
        } elseif ($source === 'query') {
            $use_main_query_ids = false;
        } elseif (!empty($options['preserve_betheme_search']) && is_search()) {
            // When BeTheme search logic is preserved, it often sets `s` to false and uses `post__in`.
            $use_main_query_ids = true;
        }

        $paged = max(1, absint(get_query_var('paged')), absint(get_query_var('page')));
        $per_page = max(1, min(60, absint($atts['per_page'])));

        $product_query = null;
        $total_pages = 1;

        if ($use_main_query_ids) {
            global $wp_query;
            $post__in = array();

            if ($wp_query instanceof WP_Query) {
                $post__in = $wp_query->get('post__in');
                if (!is_array($post__in)) {
                    $post__in = array();
                }
            }

            if (!empty($post__in)) {
                $all_product_ids = get_posts(array(
                    'post_type' => 'product',
                    'post_status' => 'publish',
                    'post__in' => $post__in,
                    'orderby' => 'post__in',
                    'posts_per_page' => -1,
                    'fields' => 'ids',
                ));

                $total_products = is_array($all_product_ids) ? count($all_product_ids) : 0;
                $total_pages = max(1, (int) ceil($total_products / $per_page));
                $paged = min($paged, $total_pages);

                $offset = ($paged - 1) * $per_page;
                $page_product_ids = array_slice($all_product_ids, $offset, $per_page);

                if (!empty($page_product_ids)) {
                    $product_query = new WP_Query(array(
                        'post_type' => 'product',
                        'post_status' => 'publish',
                        'post__in' => $page_product_ids,
                        'orderby' => 'post__in',
                        'posts_per_page' => count($page_product_ids),
                        'no_found_rows' => true,
                    ));
                }
            }
        }

        if (!$use_main_query_ids || $product_query === null) {
            $search_term = BeThemeSmartSearch_Helpers::get_search_term();
            if (!$search_term) {
                return '';
            }

            $query_args = array(
                'post_type' => 'product',
                'post_status' => 'publish',
                's' => $search_term,
                'posts_per_page' => $per_page,
                'paged' => $paged,
            );

            if (BeThemeSmartSearch_Search_Normalize::is_code_like_query($search_term)) {
                $meta_keys = BeThemeSmartSearch_Search_MetaKeys::get_code_meta_keys($options, false);
                $meta_query = $this->build_meta_query_for_codes($search_term, $meta_keys, $options);
                if (!empty($meta_query)) {
                    $query_args['meta_query'] = array($meta_query);
                }
            }

            $product_query = new WP_Query($query_args);
            $total_pages = max(1, (int) $product_query->max_num_pages);
        }

        ob_start();

        echo '<div class="woocommerce betheme-smart-search-results">';

        if ($product_query && $product_query->have_posts()) {
            woocommerce_product_loop_start();

            while ($product_query->have_posts()) {
                $product_query->the_post();
                wc_get_template_part('content', 'product');
            }

            woocommerce_product_loop_end();

            $pagination = paginate_links(array(
                'total' => max(1, (int) $total_pages),
                'current' => $paged,
                'type' => 'list',
            ));

            if ($pagination) {
                echo '<nav class="betheme-smart-search-pagination">' . $pagination . '</nav>';
            }
        } else {
            echo '<p>' . esc_html__('Товары не найдены.', 'betheme-smart-search') . '</p>';
        }

        echo '</div>';

        wp_reset_postdata();
        return ob_get_clean();
    }

    private function build_meta_query_for_codes($term, $meta_keys, $options) {
        $term = is_string($term) ? trim($term) : '';
        if ($term === '' || empty($meta_keys)) {
            return array();
        }

        $mode = BeThemeSmartSearch_Support_Options::normalize_code_match_mode(isset($options['code_match_mode']) ? $options['code_match_mode'] : null);
        return BeThemeSmartSearch_Search_MetaQuery::build_for_term($term, $meta_keys, $mode);
    }
}
