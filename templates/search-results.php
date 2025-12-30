<?php
/**
 * Custom search results template for BeTheme Smart Search
 */

// Live search is handled by BeTheme natively (AJAX: ?mfn_livesearch without searchpage)

get_header(); ?>

<div id="Content">
    <div class="content_wrapper clearfix">
        <div class="sections_group">
            <div class="entry-content">

                <?php
                $options = BeThemeSmartSearch_Helpers::get_options();
                $layout_page_id = !empty($options['results_layout_page_id']) ? absint($options['results_layout_page_id']) : 0;

                if ($layout_page_id && class_exists('Mfn_Builder_Front')) {
                    $layout_post = get_post($layout_page_id);
                    if ($layout_post && $layout_post->post_status === 'publish') {
                        do_action('mfn_before_content');

                        $builder = new Mfn_Builder_Front($layout_page_id, true);
                        $builder->show();

                        do_action('mfn_after_content');
                    }
                }
                ?>

                <section class="section betheme-smart-search-section">
                    <div class="section_wrapper clearfix">
                        <div class="column one">
                            <div class="mcb-column-inner">
                                <div class="betheme-smart-search-header">
                                    <?php $search_term = BeThemeSmartSearch_Helpers::get_search_term(); ?>
                                    <h1><?php echo 'Результаты поиска: <span>' . esc_html($search_term) . '</span>'; ?></h1>
                                </div>

                                <?php
                                // If the layout page includes the shortcode, it will render inside builder content.
                                // Otherwise, render a default WooCommerce-style product grid here.
                                $layout_contains_shortcode = false;
                                if ($layout_page_id) {
                                    $layout_post = get_post($layout_page_id);
                                    if ($layout_post && BeThemeSmartSearch_Helpers::page_has_shortcode($layout_page_id, 'betheme_smart_search_results')) {
                                        $layout_contains_shortcode = true;
                                    }
                                }

                                if (!$layout_contains_shortcode) {
                                    $shortcode_source = !empty($options['preserve_betheme_search']) ? 'main' : 'query';
                                    echo do_shortcode('[betheme_smart_search_results source="' . esc_attr($shortcode_source) . '"]');
                                }
                                ?>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    </div>
</div>

<?php get_footer(); ?>
