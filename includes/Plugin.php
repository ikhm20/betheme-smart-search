<?php
/**
 * Core plugin bootstrap class.
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch {
    public function __construct() {
        register_activation_hook(BETHEME_SMART_SEARCH_FILE, array($this, 'activate'));
        register_deactivation_hook(BETHEME_SMART_SEARCH_FILE, array($this, 'deactivate'));
        $this->init();
    }

    public function init() {
        // Initialize components
        new BeThemeSmartSearch_Helpers();
        new BeThemeSmartSearch_Query();
        new BeThemeSmartSearch_Hooks();
        new BeThemeSmartSearch_Rest_Query();
        new BeThemeSmartSearch_Rest_LiveSearch();
        new BeThemeSmartSearch_Rest_Suggest();
        new BeThemeSmartSearch_Rest_Presearch();
        new BeThemeSmartSearch_Shortcodes();
        new BeThemeSmartSearch_Admin_REST();
        new BeThemeSmartSearch_Admin($this->get_plugin_name(), $this->get_version());
        new BeThemeSmartSearch_Updater(BETHEME_SMART_SEARCH_FILE);

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
        BeThemeSmartSearch_Support_Cache::clear_search_transients();
    }

    public function clear_cache() {
        BeThemeSmartSearch_Support_Cache::clear_search_transients();
    }

    private function create_analytics_table() {
        global $wpdb;
        $table_name = BeThemeSmartSearch_Support_Analytics::get_table_name();
        $presearch_table = BeThemeSmartSearch_Support_Analytics::get_presearch_table_name();

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

        $presearch_sql = "CREATE TABLE $presearch_table (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            query varchar(255) NOT NULL,
            context varchar(50) NOT NULL,
            event varchar(30) NOT NULL,
            meta longtext,
            user_ip varchar(45) NOT NULL,
            user_agent text,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            INDEX query_index (query),
            INDEX context_index (context),
            INDEX event_index (event),
            INDEX created_at_index (created_at)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        dbDelta($presearch_sql);
    }

    public function enqueue_assets() {
        if (is_admin()) {
            return;
        }

        $options = BeThemeSmartSearch_Support_Options::get();

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
                'presearch_url' => rest_url('betheme-smart-search/v1/presearch'),
                'presearch_selection_url' => rest_url('betheme-smart-search/v1/presearch-selection'),
                'presearch_log_url' => rest_url('betheme-smart-search/v1/presearch-log'),
                'enable_presearch_logging' => !empty($options['enable_search_logging']),
                'debounce_desktop_ms' => !empty($options['live_search_debounce']) ? (int) $options['live_search_debounce'] : 250,
                'debounce_ms' => !empty($options['live_search_debounce']) ? (int) $options['live_search_debounce'] : 250,
                'debounce_mobile_ms' => !empty($options['live_search_debounce']) ? max(400, (int) $options['live_search_debounce']) : 500,
                'min_chars' => 2,
                'max_items' => 6,
                'max_products' => !empty($options['live_search_max_results']) ? (int) $options['live_search_max_results'] : 5,
                'context' => $ctx === 'shop' ? 'shop' : 'blog',
                'storage_key' => 'bss_search_history_v1',
                'show_code_products' => !empty($options['live_search_show_code_products']),
                'show_suggestions' => !empty($options['live_search_show_suggestions']),
                'strings' => array(
                    'heading_suggestions' => __("\x{041F}\x{043E}\x{0445}\x{043E}\x{0436}\x{0438}\x{0435} \x{0437}\x{0430}\x{043F}\x{0440}\x{043E}\x{0441}\x{044B}", 'betheme-smart-search'),
                    'heading_history' => __("\x{0418}\x{0441}\x{0442}\x{043E}\x{0440}\x{0438}\x{044F} \x{043F}\x{043E}\x{0438}\x{0441}\x{043A}\x{0430}", 'betheme-smart-search'),
                    'heading_popular_products' => __("\x{041F}\x{043E}\x{043F}\x{0443}\x{043B}\x{044F}\x{0440}\x{043D}\x{044B}\x{0435} \x{0442}\x{043E}\x{0432}\x{0430}\x{0440}\x{044B}", 'betheme-smart-search'),
                    'heading_products' => __("\x{0422}\x{043E}\x{0432}\x{0430}\x{0440}\x{044B} \x{043F}\x{043E} \x{0430}\x{0440}\x{0442}\x{0438}\x{043A}\x{0443}\x{043B}\x{0443}", 'betheme-smart-search'),
                    'heading_products_generic' => __("\x{0422}\x{043E}\x{0432}\x{0430}\x{0440}\x{044B}", 'betheme-smart-search'),
                    'heading_words' => __("\x{041F}\x{043E}\x{0434}\x{0441}\x{043A}\x{0430}\x{0437}\x{043A}\x{0438}", 'betheme-smart-search'),
                    'heading_categories' => __("\x{041A}\x{0430}\x{0442}\x{0435}\x{0433}\x{043E}\x{0440}\x{0438}\x{0438}", 'betheme-smart-search'),
                    'heading_brands' => __("\x{0411}\x{0440}\x{0435}\x{043D}\x{0434}\x{044B}", 'betheme-smart-search'),
                    'heading_exact' => __("\x{0422}\x{043E}\x{0447}\x{043D}\x{043E}\x{0435} \x{0441}\x{043E}\x{0432}\x{043F}\x{0430}\x{0434}\x{0435}\x{043D}\x{0438}\x{0435}", 'betheme-smart-search'),
                    'label_loading' => __("\x{0417}\x{0430}\x{0433}\x{0440}\x{0443}\x{0437}\x{043A}\x{0430}", 'betheme-smart-search'),
                    'label_clear_history' => __("\x{041E}\x{0447}\x{0438}\x{0441}\x{0442}\x{0438}\x{0442}\x{044C} \x{0438}\x{0441}\x{0442}\x{043E}\x{0440}\x{0438}\x{044E}", 'betheme-smart-search'),
                    'label_remove_history' => __("\x{0423}\x{0434}\x{0430}\x{043B}\x{0438}\x{0442}\x{044C} \x{0437}\x{0430}\x{043F}\x{0440}\x{043E}\x{0441}", 'betheme-smart-search'),
                    // Backward compat for earlier script versions.
                    'heading' => __("\x{041F}\x{043E}\x{0445}\x{043E}\x{0436}\x{0438}\x{0435} \x{0437}\x{0430}\x{043F}\x{0440}\x{043E}\x{0441}\x{044B}", 'betheme-smart-search'),
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
