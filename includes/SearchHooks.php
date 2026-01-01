<?php
/**
 * Backward-compatible wrapper for the hooks class.
 */

if (!defined('ABSPATH')) {
    exit;
}


if (function_exists('_deprecated_file')) {
    _deprecated_file(__FILE__, '1.0.1', 'includes/Search/Hooks.php');
}

if (!class_exists('BeThemeSmartSearch_Hooks')) {
    require_once dirname(__FILE__) . '/Search/Hooks.php';
}
