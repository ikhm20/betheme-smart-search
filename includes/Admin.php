<?php
/**
 * Backward-compatible wrapper for the admin controller.
 */

if (!defined('ABSPATH')) {
    exit;
}


if (function_exists('_deprecated_file')) {
    _deprecated_file(__FILE__, '1.0.1', 'includes/Admin/Admin.php');
}

if (!class_exists('BeThemeSmartSearch_Admin')) {
    require_once dirname(__FILE__) . '/Admin/Admin.php';
}
