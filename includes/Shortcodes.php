<?php
/**
 * Backward-compatible wrapper for shortcodes.
 */

if (!defined('ABSPATH')) {
    exit;
}


if (function_exists('_deprecated_file')) {
    _deprecated_file(__FILE__, '1.0.1', 'includes/Frontend/Shortcodes.php');
}

if (!class_exists('BeThemeSmartSearch_Shortcodes')) {
    require_once dirname(__FILE__) . '/Frontend/Shortcodes.php';
}
