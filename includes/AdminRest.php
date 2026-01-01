<?php
/**
 * Backward-compatible wrapper for the admin REST class.
 */

if (!defined('ABSPATH')) {
    exit;
}


if (function_exists('_deprecated_file')) {
    _deprecated_file(__FILE__, '1.0.1', 'includes/Admin/Rest.php');
}

if (!class_exists('BeThemeSmartSearch_Admin_REST')) {
    require_once dirname(__FILE__) . '/Admin/Rest.php';
}
