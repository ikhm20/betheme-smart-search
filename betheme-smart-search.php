<?php
/**
 * Plugin Name: BeTheme Smart Search
 * Plugin URI: https://example.com/betheme-smart-search
 * Description: Enhances BeTheme search with WooCommerce support, live search, and custom results page.
 * Version: 1.0.0
 * Author: Your Name
 * License: GPL v2 or later
 * Text Domain: betheme-smart-search
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('BETHEME_SMART_SEARCH_VERSION', '1.0.0');
define('BETHEME_SMART_SEARCH_DIR', plugin_dir_path(__FILE__));
define('BETHEME_SMART_SEARCH_URL', plugin_dir_url(__FILE__));
define('BETHEME_SMART_SEARCH_OPTION_NAME', 'betheme_smart_search_options');

// Include required files
require_once BETHEME_SMART_SEARCH_DIR . 'includes/Helpers.php';
require_once BETHEME_SMART_SEARCH_DIR . 'includes/SearchQuery.php';
require_once BETHEME_SMART_SEARCH_DIR . 'includes/SearchHooks.php';
require_once BETHEME_SMART_SEARCH_DIR . 'includes/SearchRest.php';
require_once BETHEME_SMART_SEARCH_DIR . 'includes/Admin.php';
require_once BETHEME_SMART_SEARCH_DIR . 'includes/Shortcodes.php';
require_once BETHEME_SMART_SEARCH_DIR . 'includes/AdminRest.php';

// Initialize the plugin
class BeThemeSmartSearch {
    public function __construct() {
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
        $this->init();
    }

    public function init() {
        // Initialize components
        new BeThemeSmartSearch_Helpers();
        new BeThemeSmartSearch_Query();
        new BeThemeSmartSearch_Hooks();
        new BeThemeSmartSearch_REST();
        new BeThemeSmartSearch_Shortcodes();
        new BeThemeSmartSearch_Admin_REST();
        new BeThemeSmartSearch_Admin($this->get_plugin_name(), $this->get_version());

        // Enqueue assets only for search results page
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
    }

    public function get_plugin_name() {
        return 'betheme-smart-search';
    }

    public function get_version() {
        return BETHEME_SMART_SEARCH_VERSION;
    }

    public function activate() {
        $this->create_analytics_table();
        $this->clear_cache();
    }

    public function deactivate() {
        // Clean up transients
        global $wpdb;
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_betheme_search_%'");
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_betheme_search_%'");
    }

    public function clear_cache() {
        // Clear all search-related transients
        global $wpdb;
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_betheme_search_%'");
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_betheme_search_%'");

        // Clear object cache if available
        if (function_exists('wp_cache_flush')) {
            wp_cache_flush();
        }
    }

    private function create_analytics_table() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'betheme_search_analytics';

        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            query varchar(255) NOT NULL,
            results_count int NOT NULL,
            context varchar(50) NOT NULL,
            user_ip varchar(45) NOT NULL,
            user_agent text,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            INDEX query_index (query),
            INDEX context_index (context),
            INDEX created_at_index (created_at)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }

    public function enqueue_assets() {
        if (is_admin()) {
            return;
        }

        $options = BeThemeSmartSearch_Helpers::get_options();

        // Live-search suggestions for the BeTheme dropdown (header search).
        // Load on all frontend pages because the search form is typically in the header.
        if (!empty($options['live_search_enabled'])) {
            wp_enqueue_style(
                'betheme-smart-search-live-suggest-css',
                BETHEME_SMART_SEARCH_URL . 'assets/live-suggest.css',
                array(),
                BETHEME_SMART_SEARCH_VERSION
            );

            wp_enqueue_script(
                'betheme-smart-search-live-suggest',
                BETHEME_SMART_SEARCH_URL . 'assets/live-suggest.js',
                array(),
                BETHEME_SMART_SEARCH_VERSION,
                true
            );

            $ctx = BeThemeSmartSearch_Helpers::get_search_context();
            wp_localize_script('betheme-smart-search-live-suggest', 'bethemeSmartSearchLiveSuggest', array(
                'suggest_url' => rest_url('betheme-smart-search/v1/suggest'),
                'live_url' => rest_url('betheme-smart-search/v1/live'),
                'debounce_desktop_ms' => !empty($options['live_search_debounce']) ? (int) $options['live_search_debounce'] : 250,
                'debounce_ms' => !empty($options['live_search_debounce']) ? (int) $options['live_search_debounce'] : 250,
                'debounce_mobile_ms' => !empty($options['live_search_debounce']) ? max(400, (int) $options['live_search_debounce']) : 500,
                'min_chars' => 3,
                'max_items' => 6,
                'max_products' => !empty($options['live_search_max_results']) ? (int) $options['live_search_max_results'] : 5,
                'context' => $ctx === 'shop' ? 'shop' : 'shop',
                'storage_key' => 'bss_search_history_v1',
                'show_code_products' => !empty($options['live_search_show_code_products']),
                'strings' => array(
                    'heading_suggestions' => __('Похожие запросы', 'betheme-smart-search'),
                    'heading_history' => __('История поиска', 'betheme-smart-search'),
                    'heading_popular_products' => __('Популярные товары', 'betheme-smart-search'),
                    'heading_products' => __('Товары по артикулу', 'betheme-smart-search'),
                    'heading_exact' => __('Точное совпадение', 'betheme-smart-search'),
                    'label_loading' => __('Поиск…', 'betheme-smart-search'),
                    // Backward compat for earlier script versions.
                    'heading' => __('Похожие запросы', 'betheme-smart-search'),
                ),
            ));
        }

        // Only load our search-page UI assets on the results page.
        if (is_search()) {
            wp_enqueue_style(
                'betheme-smart-search-css',
                BETHEME_SMART_SEARCH_URL . 'assets/search.css',
                array(),
                BETHEME_SMART_SEARCH_VERSION
            );

            wp_enqueue_script(
                'betheme-smart-search-ui',
                BETHEME_SMART_SEARCH_URL . 'assets/search-ui.js',
                array(),
                BETHEME_SMART_SEARCH_VERSION,
                true
            );
        }
    }
}

// Initialize the plugin
new BeThemeSmartSearch();
