<?php
/**
 * Cache helper (skeleton).
 *
 * Centralized transient caching helpers.
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Support_Cache {
    public static function get($key) {
        return get_transient($key);
    }

    public static function set($key, $value, $ttl) {
        $ttl = (int) $ttl;
        if ($ttl <= 0) {
            return;
        }
        set_transient($key, $value, $ttl);
    }

    public static function clamp_ttl($ttl, $min, $max) {
        $ttl = (int) $ttl;
        return max($min, min($max, $ttl));
    }

    public static function clear_search_transients() {
        global $wpdb;
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_betheme_search_%'");
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_betheme_search_%'");

        if (function_exists('wp_cache_flush')) {
            wp_cache_flush();
        }
    }
}
