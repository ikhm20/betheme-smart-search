<?php
/**
 * REST: Query endpoint (/query).
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Rest_Query {

    private $options;

    public function __construct($register_endpoints = true) {
        $this->options = BeThemeSmartSearch_Support_Options::get();
        if ($register_endpoints) {
            add_action('rest_api_init', array($this, 'register_endpoints'));
        }
    }

    /**
     * Register REST API endpoints
     */
    public function register_endpoints() {
        $default_limit = !empty($this->options['live_search_max_results']) ? absint($this->options['live_search_max_results']) : 10;
        if ($default_limit < 1) {
            $default_limit = 10;
        }

        register_rest_route('betheme-smart-search/v1', '/query', array(
            'methods' => 'GET',
            'callback' => array($this, 'handle_search_query'),
            'permission_callback' => '__return_true',
            'args' => array(
                'q' => array(
                    'required' => true,
                    'sanitize_callback' => 'sanitize_text_field'
                ),
                'context' => array(
                    'default' => 'shop',
                    'sanitize_callback' => 'sanitize_text_field'
                ),
                'limit' => array(
                    'default' => $default_limit,
                    'sanitize_callback' => 'absint'
                )
            )
        ));
    }

    /**
     * Handle search query via REST API
     */
    public function handle_search_query($request) {
        if (class_exists('BeThemeSmartSearch_Search_Service')) {
            $service = new BeThemeSmartSearch_Search_Service($this->options);
            return $service->handle_search_query($request);
        }

        return new WP_Error('search_service_unavailable', 'Search service is unavailable', array('status' => 500));
    }
}
