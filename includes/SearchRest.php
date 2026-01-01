<?php
/**
 * Backward-compatible wrapper for the legacy REST class name.
 */

if (!defined('ABSPATH')) {
    exit;
}


if (function_exists('_deprecated_file')) {
    _deprecated_file(__FILE__, '1.0.1', 'includes/Rest/Query.php');
}

if (!class_exists('BeThemeSmartSearch_Rest_Query')) {
    require_once dirname(__FILE__) . '/Rest/Query.php';
}

class BeThemeSmartSearch_REST extends BeThemeSmartSearch_Rest_Query {}
