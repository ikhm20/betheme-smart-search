<?php
/**
 * Plugin Name: BeTheme Smart Search
 * Plugin URI: https://github.com/ikhm20/betheme-smart-search
 * Description: Enhances BeTheme search with WooCommerce support, live search, and custom results page.
 * Version: 1.0.2
 * Author: Your Name
 * License: GPL v2 or later
 * Text Domain: betheme-smart-search
 * Update URI: https://github.com/ikhm20/betheme-smart-search
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('BETHEME_SMART_SEARCH_VERSION', '1.0.2');
define('BETHEME_SMART_SEARCH_FILE', __FILE__);
define('BETHEME_SMART_SEARCH_DIR', plugin_dir_path(__FILE__));
define('BETHEME_SMART_SEARCH_URL', plugin_dir_url(__FILE__));
define('BETHEME_SMART_SEARCH_OPTION_NAME', 'betheme_smart_search_options');
define('BETHEME_SMART_SEARCH_GITHUB_REPO', 'ikhm20/betheme-smart-search');

// Include autoloader
require_once BETHEME_SMART_SEARCH_DIR . 'includes/Support/Autoload.php';

// Initialize the plugin
new BeThemeSmartSearch();
