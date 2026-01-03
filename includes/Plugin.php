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

        // Perform lightweight, non-destructive migration of options (merge missing defaults only).
        $this->maybe_migrate_options();

        // Enqueue assets only for search results page
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
    }

    /**
     * Merge missing defaults into the saved options without clobbering admin customizations.
     */
    private function maybe_migrate_options() {
        $opt_name = BETHEME_SMART_SEARCH_OPTION_NAME;
        $saved = get_option($opt_name, array());
        $saved = is_array($saved) ? $saved : array();

        $defaults = BeThemeSmartSearch_Support_Options::get_default_options();
        $changed = false;

        // Merge missing synonyms rules (append missing canonical entries only).
        // Important: do NOT auto-enable behavioral toggles (like showing suggestions) for existing installs.
        $saved_raw = isset($saved['synonyms_rules']) ? (string) $saved['synonyms_rules'] : '';
        $default_raw = isset($defaults['synonyms_rules']) ? (string) $defaults['synonyms_rules'] : '';
        $merged_raw = BeThemeSmartSearch_Support_Options::merge_missing_synonyms_rules($saved_raw, $default_raw);
        if ($merged_raw !== $saved_raw) {
            $saved['synonyms_rules'] = $merged_raw;
            $changed = true;
        }

        if ($changed) {
            update_option($opt_name, $saved);
        }
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

            // Use sanitized options for script localization to ensure booleans/numbers
            // are properly typed and consistent with admin UI.
            $script_options = BeThemeSmartSearch_Support_Options::sanitize($options);

            wp_localize_script('betheme-smart-search-live-suggest', 'bethemeSmartSearchLiveSuggest', array(
                'suggest_url' => rest_url('betheme-smart-search/v1/suggest'),
                'live_url' => rest_url('betheme-smart-search/v1/live'),
                'presearch_url' => rest_url('betheme-smart-search/v1/presearch'),
                'presearch_selection_url' => rest_url('betheme-smart-search/v1/presearch-selection'),
                'presearch_log_url' => rest_url('betheme-smart-search/v1/presearch-log'),
                'enable_presearch_logging' => !empty($script_options['enable_search_logging']),
                'debounce_desktop_ms' => !empty($script_options['live_search_debounce']) ? (int) $script_options['live_search_debounce'] : 250,
                'debounce_ms' => !empty($script_options['live_search_debounce']) ? (int) $script_options['live_search_debounce'] : 250,
                'debounce_mobile_ms' => !empty($script_options['live_search_debounce']) ? max(400, (int) $script_options['live_search_debounce']) : 500,
                'min_chars' => 2,
                'max_items' => 6,
                'max_products' => !empty($script_options['live_search_max_results']) ? (int) $script_options['live_search_max_results'] : 5,
                'context' => $ctx === 'shop' ? 'shop' : 'blog',
                'storage_key' => 'bss_search_history_v1',
                'show_code_products' => !empty($script_options['live_search_show_code_products']),
                'show_suggestions' => !empty($script_options['live_search_show_suggestions']),
                'strings' => array(
                    'heading_suggestions' => __("Похожие запросы", 'betheme-smart-search'),
                    'heading_history' => __("История поиска", 'betheme-smart-search'),
                    'heading_popular_products' => __("Популярные товары", 'betheme-smart-search'),
                    'heading_products' => __("Товары по артикулу", 'betheme-smart-search'),
                    'heading_products_generic' => __("Товары", 'betheme-smart-search'),
                    'heading_words' => __("Подсказки", 'betheme-smart-search'),
                    'heading_categories' => __("Категории", 'betheme-smart-search'),
                    'heading_brands' => __("Бренды", 'betheme-smart-search'),
                    'heading_exact' => __("Точное совпадение", 'betheme-smart-search'),
                    'label_loading' => __("Загрузка", 'betheme-smart-search'),
                    'label_clear_history' => __("Очистить историю поиска", 'betheme-smart-search'),
                    'label_remove_history' => __("Удалить запрос", 'betheme-smart-search'),
                    // Backward compat for earlier script versions.
                    'heading' => __("Похожие запросы", 'betheme-smart-search'),
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
