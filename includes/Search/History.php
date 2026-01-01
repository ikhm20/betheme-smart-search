<?php
/**
 * Search history (skeleton).
 *
 * Responsible for reading/writing search history.
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Search_History {
    public function get_prefix_matches($prefix, $context, $days, $limit) {
        return BeThemeSmartSearch_Support_Analytics::get_prefix_matches($prefix, $context, $days, $limit);
    }

    public function get_popular_queries($context, $days, $limit) {
        return BeThemeSmartSearch_Support_Analytics::get_popular_queries($context, $days, $limit);
    }

}
