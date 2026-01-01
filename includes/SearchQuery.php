<?php
/**
 * Backward-compatible wrapper for the search query class.
 */

if (!defined('ABSPATH')) {
    exit;
}


if (function_exists('_deprecated_file')) {
    _deprecated_file(__FILE__, '1.0.1', 'includes/Search/Query.php');
}

if (!class_exists('BeThemeSmartSearch_Query')) {
    require_once dirname(__FILE__) . '/Search/Query.php';
}
