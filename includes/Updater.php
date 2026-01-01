<?php
/**
 * Backward-compatible wrapper for updater.
 */

if (!defined('ABSPATH')) {
    exit;
}


if (function_exists('_deprecated_file')) {
    _deprecated_file(__FILE__, '1.0.1', 'includes/Support/Updater.php');
}

if (!class_exists('BeThemeSmartSearch_Updater')) {
    require_once dirname(__FILE__) . '/Support/Updater.php';
}
