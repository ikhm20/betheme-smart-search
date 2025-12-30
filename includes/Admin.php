<?php
/**
 * Admin interface for BeTheme Smart Search
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Admin {

    private $plugin_name;
    private $version;
    private $option_name = BETHEME_SMART_SEARCH_OPTION_NAME;

    public function __construct($plugin_name, $version) {
        $this->plugin_name = $plugin_name;
        $this->version = $version;

        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));

        // AJAX handlers for admin actions (test search, clear cache)
        add_action('wp_ajax_betheme_smart_search_test', array($this, 'ajax_test_search'));
        add_action('wp_ajax_betheme_smart_search_clear_cache', array($this, 'ajax_clear_cache'));
    }

    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        $capability = class_exists('WooCommerce') ? 'manage_woocommerce' : 'manage_options';

        add_menu_page(
            __('BeTheme Smart Search', 'betheme-smart-search'),
            __('Smart Search', 'betheme-smart-search'),
            $capability,
            'betheme-smart-search',
            array($this, 'admin_page'),
            'dashicons-search',
            56
        );
    }

    /**
     * Register settings
     */
    public function register_settings() {
        register_setting(
            $this->option_name,
            $this->option_name,
            array($this, 'sanitize_settings')
        );

        // Search Settings Section
        add_settings_section(
            'search_settings',
            __('Search Settings', 'betheme-smart-search'),
            array($this, 'search_settings_callback'),
            $this->option_name
        );

        // Content Types
        add_settings_field(
            'post_types',
            __('Search in Post Types', 'betheme-smart-search'),
            array($this, 'post_types_callback'),
            $this->option_name,
            'search_settings'
        );

        // Keep BeTheme search logic
        add_settings_field(
            'preserve_betheme_search',
            __('Preserve BeTheme Search Logic', 'betheme-smart-search'),
            array($this, 'preserve_betheme_search_callback'),
            $this->option_name,
            'search_settings'
        );

        // Search Fields
        add_settings_field(
            'search_fields',
            __('Search Fields', 'betheme-smart-search'),
            array($this, 'search_fields_callback'),
            $this->option_name,
            'search_settings'
        );

        // Field Weights
        add_settings_field(
            'field_weights',
            __('Field Weights', 'betheme-smart-search'),
            array($this, 'field_weights_callback'),
            $this->option_name,
            'search_settings'
        );

        // Live Search Settings
        add_settings_field(
            'live_search',
            __('Live Search Settings', 'betheme-smart-search'),
            array($this, 'live_search_callback'),
            $this->option_name,
            'search_settings'
        );

        // Template Settings
        add_settings_field(
            'template_settings',
            __('Template Settings', 'betheme-smart-search'),
            array($this, 'template_settings_callback'),
            $this->option_name,
            'search_settings'
        );

        // Results Layout Page (BeBuilder)
        add_settings_field(
            'results_layout_page_id',
            __('Search Results Layout Page', 'betheme-smart-search'),
            array($this, 'results_layout_page_callback'),
            $this->option_name,
            'search_settings'
        );

        // Caching Section
        add_settings_section(
            'caching_settings',
            __('Caching & Performance', 'betheme-smart-search'),
            array($this, 'caching_settings_callback'),
            $this->option_name
        );

        // Enable Caching
        add_settings_field(
            'enable_caching',
            __('Enable Caching', 'betheme-smart-search'),
            array($this, 'enable_caching_callback'),
            $this->option_name,
            'caching_settings'
        );

        // Cache TTL
        add_settings_field(
            'cache_ttl',
            __('Cache Time (seconds)', 'betheme-smart-search'),
            array($this, 'cache_ttl_callback'),
            $this->option_name,
            'caching_settings'
        );
    }

    /**
     * Sanitize settings
     */
    public function sanitize_settings($input) {
        return BeThemeSmartSearch_Helpers::sanitize_options($input);
    }

    /**
     * Enqueue admin scripts and styles
     */
    public function enqueue_admin_scripts($hook) {
        $allowed_hooks = array('toplevel_page_betheme-smart-search');
        if (!in_array($hook, $allowed_hooks, true)) {
            return;
        }

        wp_enqueue_style('wp-components');

        wp_enqueue_style(
            'betheme-smart-search-admin-app',
            BETHEME_SMART_SEARCH_URL . 'assets/admin-app.css',
            array('wp-components'),
            $this->version
        );

        wp_enqueue_script(
            'betheme-smart-search-admin-app',
            BETHEME_SMART_SEARCH_URL . 'assets/admin-app.js',
            array('wp-element', 'wp-components', 'wp-i18n', 'wp-api-fetch'),
            $this->version,
            true
        );

        wp_localize_script('betheme-smart-search-admin-app', 'bethemeSmartSearchAdmin', array(
            // apiFetch expects a REST *path* (it will prefix with the site REST root).
            'rest_path' => '/betheme-smart-search/v1/admin',
            'public_rest_path' => '/betheme-smart-search/v1/query',
            'rest_nonce' => wp_create_nonce('wp_rest'),
            'option_name' => $this->option_name,
        ));
    }

    /**
     * Admin page callback
     */
    public function admin_page() {
        ?>
        <div class="wrap betheme-smart-search-admin">
            <h1><?php _e('BeTheme Smart Search', 'betheme-smart-search'); ?></h1>
            <div id="betheme-smart-search-admin-app"></div>
            <noscript>
                <p><?php _e('This page requires JavaScript.', 'betheme-smart-search'); ?></p>
            </noscript>
        </div>
        <?php
    }

    /**
     * Search settings section callback
     */
    public function search_settings_callback() {
        echo '<p>' . __('Configure how the search functionality works.', 'betheme-smart-search') . '</p>';
    }

    /**
     * Post types field callback
     */
    public function post_types_callback() {
        $options = get_option($this->option_name, $this->get_default_options());
        $post_types = isset($options['post_types']) ? $options['post_types'] : array('product');

        $available_types = array(
            'product' => __('Products', 'betheme-smart-search'),
            'post' => __('Posts', 'betheme-smart-search'),
            'page' => __('Pages', 'betheme-smart-search'),
        );

        echo '<div class="checkbox-group">';
        foreach ($available_types as $type => $label) {
            $checked = in_array($type, $post_types) ? 'checked' : '';
            echo '<label><input type="checkbox" name="' . $this->option_name . '[post_types][]" value="' . $type . '" ' . $checked . '> ' . $label . '</label>';
        }
        echo '</div>';
        echo '<p class="description">' . __('Select which content types to include in search results.', 'betheme-smart-search') . '</p>';
    }

    /**
     * Search fields callback
     */
    public function search_fields_callback() {
        $options = get_option($this->option_name, $this->get_default_options());
        $search_fields = isset($options['search_fields']) ? $options['search_fields'] : array();

        $available_fields = array(
            'title' => __('Product Title', 'betheme-smart-search'),
            'sku' => __('SKU', 'betheme-smart-search'),
            'content' => __('Product Description', 'betheme-smart-search'),
            'excerpt' => __('Short Description', 'betheme-smart-search'),
            'meta' => __('Custom Meta Fields', 'betheme-smart-search'),
            'attributes' => __('Product Attributes', 'betheme-smart-search'),
        );

        echo '<div class="checkbox-group">';
        foreach ($available_fields as $field => $label) {
            $checked = in_array($field, $search_fields) ? 'checked' : '';
            echo '<label><input type="checkbox" name="' . $this->option_name . '[search_fields][]" value="' . $field . '" ' . $checked . '> ' . $label . '</label>';
        }
        echo '</div>';
        echo '<p class="description">' . __('Select which fields to search in.', 'betheme-smart-search') . '</p>';
    }

    /**
     * Preserve BeTheme search logic callback
     */
    public function preserve_betheme_search_callback() {
        $options = get_option($this->option_name, $this->get_default_options());
        $preserve = isset($options['preserve_betheme_search']) ? $options['preserve_betheme_search'] : 1;

        echo '<input type="checkbox" name="' . $this->option_name . '[preserve_betheme_search]" value="1" ' . checked(1, $preserve, false) . ' />';
        echo '<p class="description">' . __('Keep BeTheme\'s native search logic (our plugin will only adjust the search results page and REST/live search).', 'betheme-smart-search') . '</p>';
    }

    /**
     * Field weights callback
     */
    public function field_weights_callback() {
        $options = get_option($this->option_name, $this->get_default_options());
        $weights = isset($options['field_weights']) ? $options['field_weights'] : $this->get_default_weights();

        $fields = array(
            'title' => __('Title', 'betheme-smart-search'),
            'sku' => __('SKU', 'betheme-smart-search'),
            'content' => __('Content', 'betheme-smart-search'),
        );

        echo '<table class="form-table" style="margin-top: 0;">';
        foreach ($fields as $field => $label) {
            $weight = isset($weights[$field]) ? $weights[$field] : 1;
            echo '<tr>';
            echo '<th scope="row">' . $label . '</th>';
            echo '<td>';
            echo '<div class="weight-slider-container">';
            echo '<input type="range" class="weight-slider" name="' . $this->option_name . '[field_weights][' . $field . ']" min="0" max="10" value="' . $weight . '" />';
            echo '<span class="weight-value">' . $weight . '</span>';
            echo '</div>';
            echo '</td>';
            echo '</tr>';
        }
        echo '</table>';
        echo '<p class="description">' . __('Higher weights give more importance to matches in that field.', 'betheme-smart-search') . '</p>';
    }

    /**
     * Live search callback
     */
    public function live_search_callback() {
        $options = get_option($this->option_name, $this->get_default_options());

        $enabled = isset($options['live_search_enabled']) ? $options['live_search_enabled'] : 1;
        $debounce = isset($options['live_search_debounce']) ? $options['live_search_debounce'] : 300;
        $max_results = isset($options['live_search_max_results']) ? $options['live_search_max_results'] : 5;
        $show_categories = isset($options['live_search_show_categories']) ? $options['live_search_show_categories'] : 1;
        $show_brands = isset($options['live_search_show_brands']) ? $options['live_search_show_brands'] : 1;

        echo '<table class="form-table" style="margin-top: 0;">';
        echo '<tr>';
        echo '<th scope="row">' . __('Enable Live Search', 'betheme-smart-search') . '</th>';
        echo '<td><input type="checkbox" name="' . $this->option_name . '[live_search_enabled]" value="1" ' . checked(1, $enabled, false) . ' /></td>';
        echo '</tr>';
        echo '<tr>';
        echo '<th scope="row">' . __('Debounce Delay (ms)', 'betheme-smart-search') . '</th>';
        echo '<td><input type="number" name="' . $this->option_name . '[live_search_debounce]" value="' . $debounce . '" min="100" max="1000" /></td>';
        echo '</tr>';
        echo '<tr>';
        echo '<th scope="row">' . __('Max Results', 'betheme-smart-search') . '</th>';
        echo '<td><input type="number" name="' . $this->option_name . '[live_search_max_results]" value="' . $max_results . '" min="1" max="20" /></td>';
        echo '</tr>';
        echo '<tr>';
        echo '<th scope="row">' . __('Show Categories', 'betheme-smart-search') . '</th>';
        echo '<td><input type="checkbox" name="' . $this->option_name . '[live_search_show_categories]" value="1" ' . checked(1, $show_categories, false) . ' /></td>';
        echo '</tr>';
        echo '<tr>';
        echo '<th scope="row">' . __('Show Brands', 'betheme-smart-search') . '</th>';
        echo '<td><input type="checkbox" name="' . $this->option_name . '[live_search_show_brands]" value="1" ' . checked(1, $show_brands, false) . ' /></td>';
        echo '</tr>';
        echo '</table>';
    }

    /**
     * Template settings callback
     */
    public function template_settings_callback() {
        $options = get_option($this->option_name, $this->get_default_options());
        $use_custom = isset($options['use_custom_template']) ? $options['use_custom_template'] : 1;

        echo '<table class="form-table" style="margin-top: 0;">';
        echo '<tr>';
        echo '<th scope="row">' . __('Use Custom Template', 'betheme-smart-search') . '</th>';
        echo '<td><input type="checkbox" name="' . $this->option_name . '[use_custom_template]" value="1" ' . checked(1, $use_custom, false) . ' /></td>';
        echo '</tr>';
        echo '</table>';
        echo '<p class="description">' . __('Use the plugin\'s custom search results template instead of the theme\'s search.php.', 'betheme-smart-search') . '</p>';
    }

    /**
     * Results layout page callback (BeBuilder editable)
     */
    public function results_layout_page_callback() {
        $options = get_option($this->option_name, $this->get_default_options());
        $page_id = isset($options['results_layout_page_id']) ? absint($options['results_layout_page_id']) : 0;

        $pages = get_pages(array('sort_column' => 'post_title', 'sort_order' => 'asc'));

        echo '<select name="' . $this->option_name . '[results_layout_page_id]">';
        echo '<option value="0">' . esc_html__('— Disabled —', 'betheme-smart-search') . '</option>';
        foreach ($pages as $page) {
            echo '<option value="' . esc_attr($page->ID) . '" ' . selected($page_id, $page->ID, false) . '>' . esc_html($page->post_title) . '</option>';
        }
        echo '</select>';

        echo '<p class="description">' . __('Optional: pick a Page you can design with BeBuilder. Its content will be rendered above the results on the search results page.', 'betheme-smart-search') . '</p>';
        echo '<p class="description">' . __('Tip: use the shortcode [betheme_smart_search_results] inside that page if you want full control over placement.', 'betheme-smart-search') . '</p>';
    }

    /**
     * Caching settings section callback
     */
    public function caching_settings_callback() {
        echo '<p>' . __('Configure caching to improve search performance.', 'betheme-smart-search') . '</p>';
    }

    /**
     * Enable caching callback
     */
    public function enable_caching_callback() {
        $options = get_option($this->option_name, $this->get_default_options());
        $enabled = isset($options['enable_caching']) ? $options['enable_caching'] : 0;

        echo '<input type="checkbox" name="' . $this->option_name . '[enable_caching]" value="1" ' . checked(1, $enabled, false) . ' />';
        echo '<p class="description">' . __('Enable caching for search results to improve performance.', 'betheme-smart-search') . '</p>';
    }

    /**
     * Cache TTL callback
     */
    public function cache_ttl_callback() {
        $options = get_option($this->option_name, $this->get_default_options());
        $ttl = isset($options['cache_ttl']) ? $options['cache_ttl'] : 3600;

        echo '<input type="number" name="' . $this->option_name . '[cache_ttl]" value="' . $ttl . '" min="300" max="86400" />';
        echo '<p class="description">' . __('How long to cache search results (in seconds).', 'betheme-smart-search') . '</p>';
    }

    /**
     * Render analytics tab
     */
    private function render_analytics() {
        // This is a placeholder - in a real implementation, you'd fetch data from logs/analytics
        echo '<div class="cache-section">';
        echo '<h4>' . __('Search Statistics', 'betheme-smart-search') . '</h4>';
        echo '<p>' . __('Analytics functionality will be implemented in the full version.', 'betheme-smart-search') . '</p>';
        echo '<table class="analytics-table">';
        echo '<thead><tr><th>' . __('Metric', 'betheme-smart-search') . '</th><th>' . __('Value', 'betheme-smart-search') . '</th></tr></thead>';
        echo '<tbody>';
        echo '<tr><td>' . __('Total Searches (24h)', 'betheme-smart-search') . '</td><td>0</td></tr>';
        echo '<tr><td>' . __('Average Results', 'betheme-smart-search') . '</td><td>0</td></tr>';
        echo '<tr><td>' . __('No Results Queries', 'betheme-smart-search') . '</td><td>0</td></tr>';
        echo '</tbody></table>';
        echo '</div>';
    }

    /**
     * Render diagnostics tab
     */
    private function render_diagnostics() {
        echo '<div class="diagnostics-section">';
        echo '<h4>' . __('System Status', 'betheme-smart-search') . '</h4>';

        $checks = array(
            'woocommerce' => array(
                'label' => __('WooCommerce', 'betheme-smart-search'),
                'status' => class_exists('WooCommerce') ? 'good' : 'error',
                'message' => class_exists('WooCommerce') ? __('Active', 'betheme-smart-search') : __('Not installed or inactive', 'betheme-smart-search')
            ),
            'betheme' => array(
                'label' => __('BeTheme', 'betheme-smart-search'),
                'status' => function_exists('mfn_ID') ? 'good' : 'warning',
                'message' => function_exists('mfn_ID') ? __('Detected', 'betheme-smart-search') : __('Not detected (may still work)', 'betheme-smart-search')
            ),
            'php_version' => array(
                'label' => __('PHP Version', 'betheme-smart-search'),
                'status' => version_compare(PHP_VERSION, '7.4', '>=') ? 'good' : 'warning',
                'message' => PHP_VERSION
            ),
            'wp_version' => array(
                'label' => __('WordPress Version', 'betheme-smart-search'),
                'status' => version_compare(get_bloginfo('version'), '5.0', '>=') ? 'good' : 'warning',
                'message' => get_bloginfo('version')
            )
        );

        foreach ($checks as $check) {
            echo '<div class="status-item">';
            echo '<span>' . $check['label'] . '</span>';
            echo '<span class="status-' . $check['status'] . '">' . $check['message'] . '</span>';
            echo '</div>';
        }

        echo '<div class="cache-section" style="margin-top: 20px;">';
        echo '<h4>' . __('Cache Management', 'betheme-smart-search') . '</h4>';
        echo '<button id="clear-cache-btn" class="button">' . __('Clear Search Cache', 'betheme-smart-search') . '</button>';
        echo '<div id="cache-status"></div>';
        echo '</div>';

        echo '</div>';
    }

    /**
     * AJAX: Test search (used by admin test-search button)
     */
    public function ajax_test_search() {
        // Verify nonce and capability
        if (empty($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'betheme_smart_search_admin')) {
            wp_send_json_error(__('Invalid nonce', 'betheme-smart-search'));
        }

        if (!current_user_can('manage_options') && !current_user_can('manage_woocommerce')) {
            wp_send_json_error(__('Insufficient permissions', 'betheme-smart-search'));
        }

        $query = isset($_POST['query']) ? sanitize_text_field($_POST['query']) : '';
        if (empty($query)) {
            wp_send_json_error(__('Missing query', 'betheme-smart-search'));
        }

        // Use the REST class to perform search in 'shop' context
        if (!class_exists('BeThemeSmartSearch_REST')) {
            wp_send_json_error(__('Search service not available', 'betheme-smart-search'));
        }

        $request = new WP_REST_Request('GET', '/');
        $request->set_param('q', $query);
        $request->set_param('context', 'shop');
        $request->set_param('limit', 5);

        $rest = new BeThemeSmartSearch_REST();
        $response = $rest->handle_search_query($request);

        if (is_wp_error($response)) {
            wp_send_json_error($response->get_error_message());
        }

        if ($response instanceof WP_REST_Response) {
            wp_send_json_success($response->get_data());
        }

        wp_send_json_error(__('Unexpected response', 'betheme-smart-search'));
    }

    /**
     * AJAX: Clear search cache
     */
    public function ajax_clear_cache() {
        if (empty($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'betheme_smart_search_admin')) {
            wp_send_json_error(__('Invalid nonce', 'betheme-smart-search'));
        }

        if (!current_user_can('manage_options') && !current_user_can('manage_woocommerce')) {
            wp_send_json_error(__('Insufficient permissions', 'betheme-smart-search'));
        }

        global $wpdb;
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_betheme_search_%'");
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_betheme_search_%'");

        if (function_exists('wp_cache_flush')) {
            wp_cache_flush();
        }

        wp_send_json_success(array('message' => __('Cache cleared', 'betheme-smart-search')));
    }

    /**
     * Get default options
     */
    private function get_default_options() {
        return BeThemeSmartSearch_Helpers::get_default_options();
    }

    /**
     * Get default field weights
     */
    private function get_default_weights() {
        return array(
            'title' => 5,
            'sku' => 10,
            'content' => 1,
        );
    }
}
