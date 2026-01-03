<?php
/**
 * Simple autoloader for plugin classes.
 */

if (!defined('ABSPATH')) {
    exit;
}

spl_autoload_register(function ($class) {
    if ($class !== 'BeThemeSmartSearch' && strpos($class, 'BeThemeSmartSearch_') !== 0) {
        return;
    }

    static $map = array(
        'BeThemeSmartSearch' => 'includes/Plugin.php',
        'BeThemeSmartSearch_Admin' => 'includes/Admin/Admin.php',
        'BeThemeSmartSearch_Admin_REST' => 'includes/Admin/Rest.php',
        'BeThemeSmartSearch_Helpers' => 'includes/Helpers.php',
        'BeThemeSmartSearch_Hooks' => 'includes/Search/Hooks.php',
        'BeThemeSmartSearch_Query' => 'includes/Search/Query.php',
        'BeThemeSmartSearch_REST' => 'includes/SearchRest.php',
        'BeThemeSmartSearch_Rest_LiveSearch' => 'includes/Rest/LiveSearch.php',
        'BeThemeSmartSearch_Rest_Query' => 'includes/Rest/Query.php',
        'BeThemeSmartSearch_Rest_Suggest' => 'includes/Rest/Suggest.php',
        'BeThemeSmartSearch_Rest_Presearch' => 'includes/Rest/Presearch.php',
        'BeThemeSmartSearch_Search_History' => 'includes/Search/History.php',
        'BeThemeSmartSearch_Search_MetaQuery' => 'includes/Search/MetaQuery.php',
        'BeThemeSmartSearch_Search_MetaKeys' => 'includes/Search/MetaKeys.php',
        'BeThemeSmartSearch_Search_Normalize' => 'includes/Search/Normalize.php',
        'BeThemeSmartSearch_Search_ProductLookup' => 'includes/Search/ProductLookup.php',
        'BeThemeSmartSearch_Search_QueryBuilder' => 'includes/Search/QueryBuilder.php',
        'BeThemeSmartSearch_Search_Scoring' => 'includes/Search/Scoring.php',
        'BeThemeSmartSearch_Search_Service' => 'includes/Search/Service.php',
        'BeThemeSmartSearch_Search_Taxonomy' => 'includes/Search/Taxonomy.php',
        'BeThemeSmartSearch_Search_TermSearch' => 'includes/Search/TermSearch.php',
        'BeThemeSmartSearch_Search_Variants' => 'includes/Search/Variants.php',
        'BeThemeSmartSearch_Shortcodes' => 'includes/Frontend/Shortcodes.php',
        'BeThemeSmartSearch_Support_Cache' => 'includes/Support/Cache.php',
        'BeThemeSmartSearch_Support_Engines' => 'includes/Support/Engines.php',
        'BeThemeSmartSearch_Support_Analytics' => 'includes/Support/Analytics.php',
        'BeThemeSmartSearch_Support_Options' => 'includes/Support/Options.php',
        'BeThemeSmartSearch_Updater' => 'includes/Support/Updater.php',
    );

    if (!isset($map[$class])) {
        return;
    }

    $path = BETHEME_SMART_SEARCH_DIR . $map[$class];
    if (file_exists($path)) {
        require_once $path;
    }
});
