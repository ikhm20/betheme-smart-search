<?php
/**
 * REST: Presearch endpoints (DNS-style suggestions + products).
 */

if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Rest_Presearch {
    private $options;
    private $query_builder;
    private $history;

    public function __construct($register_endpoints = true) {
        $this->options = BeThemeSmartSearch_Support_Options::get();
        $this->query_builder = class_exists('BeThemeSmartSearch_Search_QueryBuilder')
            ? new BeThemeSmartSearch_Search_QueryBuilder()
            : null;
        $this->history = class_exists('BeThemeSmartSearch_Search_History')
            ? new BeThemeSmartSearch_Search_History()
            : null;

        if ($register_endpoints) {
            add_action('rest_api_init', array($this, 'register_endpoints'));
        }
    }

    public function register_endpoints() {
        register_rest_route('betheme-smart-search/v1', '/presearch', array(
            'methods' => 'GET',
            'callback' => array($this, 'handle_presearch'),
            'permission_callback' => '__return_true',
            'args' => array(
                'query' => array(
                    'default' => '',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'q' => array(
                    'default' => '',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'context' => array(
                    'default' => 'shop',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'limit' => array(
                    'default' => 6,
                    'sanitize_callback' => 'absint',
                ),
            ),
        ));

        register_rest_route('betheme-smart-search/v1', '/presearch-selection', array(
            'methods' => 'GET',
            'callback' => array($this, 'handle_selection'),
            'permission_callback' => '__return_true',
            'args' => array(
                'query' => array(
                    'default' => '',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'q' => array(
                    'default' => '',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'context' => array(
                    'default' => 'shop',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'limit' => array(
                    'default' => 8,
                    'sanitize_callback' => 'absint',
                ),
                'days' => array(
                    'default' => 30,
                    'sanitize_callback' => 'absint',
                ),
            ),
        ));

        register_rest_route('betheme-smart-search/v1', '/presearch-log', array(
            'methods' => 'POST',
            'callback' => array($this, 'handle_log'),
            'permission_callback' => '__return_true',
            'args' => array(
                'event' => array(
                    'required' => true,
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'query' => array(
                    'default' => '',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'context' => array(
                    'default' => 'shop',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
            ),
        ));
    }

    public function handle_presearch($request) {
        $query = $this->read_query($request);
        $context = $this->normalize_context($request->get_param('context'));
        $limit = $this->clamp_int($request->get_param('limit'), 1, 20);

        $payload = array(
            'query' => $query,
            'context' => $context,
            'products' => array(),
        );

        if (empty($this->options['live_search_enabled'])) {
            return rest_ensure_response($payload);
        }

        if (!$this->query_builder) {
            return rest_ensure_response($payload);
        }

        if ($query === '') {
            $payload['products'] = $this->query_builder->get_popular_products($limit, $this->options);
        } else {
            $payload['products'] = $this->query_builder->search_products_v2($query, $limit, $this->options);
        }

        return rest_ensure_response($payload);
    }

    public function handle_selection($request) {
        $query = $this->read_query($request);
        $context = $this->normalize_context($request->get_param('context'));

        if (empty($this->options['live_search_enabled'])) {
            return rest_ensure_response(array(
                'query' => $query,
                'context' => $context,
                'redirect' => null,
                'suggests' => array(),
                'categories' => array(),
                'words' => array(),
                'actionProducts' => array(),
                'brands' => array(),
            ));
        }

        $limit = $this->clamp_int($request->get_param('limit'), 1, 20);
        $days = $this->clamp_int($request->get_param('days'), 1, 365);

        $suggests = array();
        if ($this->history) {
            $rows = array();
            if ($query === '') {
                $rows = $this->history->get_popular_queries($context, $days, $limit);
            } else {
                $rows = $this->history->get_prefix_matches($query, $context, $days, $limit);
            }

            foreach ($rows as $row) {
                $label = isset($row['query']) ? trim((string) $row['query']) : '';
                if ($label === '') {
                    continue;
                }
                $suggests[] = array(
                    'query' => $label,
                    'url' => $this->build_search_url($label),
                );
            }
        }

        $words = $this->build_words($suggests);

        $categories = array();
        $brands = array();
        if ($query !== '' && $this->query_builder) {
            $categories = $this->query_builder->search_categories($query, min(5, $limit));
            $brands = $this->query_builder->search_brands($query, min(5, $limit));
        }

        $payload = array(
            'query' => $query,
            'context' => $context,
            'redirect' => null,
            'suggests' => $suggests,
            'categories' => $this->normalize_categories($categories, $query),
            'words' => $words,
            'actionProducts' => array(),
            'brands' => $this->normalize_brands($brands),
        );

        return rest_ensure_response($payload);
    }

    public function handle_log($request) {
        if (empty($this->options['enable_search_logging'])) {
            return rest_ensure_response(array('ok' => true, 'skipped' => 1));
        }

        $event = sanitize_text_field($request->get_param('event'));
        $query = sanitize_text_field($request->get_param('query'));
        $context = $this->normalize_context($request->get_param('context'));
        $meta = $request->get_param('meta');

        if (!is_array($meta)) {
            $meta = array('value' => $meta);
        }
        $meta = $this->sanitize_meta($meta);

        BeThemeSmartSearch_Support_Analytics::log_presearch_event($query, $context, $event, $meta);

        return rest_ensure_response(array('ok' => true));
    }

    private function read_query($request) {
        $query = $request->get_param('query');
        if (!is_string($query) || $query === '') {
            $query = $request->get_param('q');
        }
        $query = is_string($query) ? trim($query) : '';
        return $query;
    }

    private function normalize_context($context) {
        $context = sanitize_text_field($context);
        $context = is_string($context) ? trim($context) : '';
        return $context !== '' ? $context : 'shop';
    }

    private function clamp_int($value, $min, $max) {
        $value = (int) $value;
        $min = (int) $min;
        $max = (int) $max;
        return max($min, min($max, $value));
    }

    private function build_search_url($query) {
        $query = is_string($query) ? trim($query) : '';
        if ($query === '') {
            return home_url('/');
        }

        $args = array('s' => $query);
        if (!empty($this->options['shop_style_results']) && BeThemeSmartSearch_Helpers::is_woocommerce_active()) {
            $args['post_type'] = 'product';
        }

        return add_query_arg($args, home_url('/'));
    }

    private function build_words($suggests) {
        if (empty($suggests)) {
            return array();
        }

        $words = array();
        foreach ($suggests as $row) {
            $label = isset($row['query']) ? trim((string) $row['query']) : '';
            if ($label === '') {
                continue;
            }
            $parts = preg_split('/\\s+/u', $label);
            $first = is_array($parts) && !empty($parts) ? trim((string) $parts[0]) : '';
            if ($first !== '') {
                $words[] = $first;
            }
        }

        $words = array_values(array_unique($words));
        return array_slice($words, 0, 3);
    }

    private function normalize_categories($categories, $query) {
        $out = array();
        if (!is_array($categories)) {
            return $out;
        }

        foreach ($categories as $cat) {
            $title = isset($cat['name']) ? (string) $cat['name'] : '';
            $url = isset($cat['url']) ? (string) $cat['url'] : '';
            if ($title === '' || $url === '') {
                continue;
            }
            $out[] = array(
                'query' => $query,
                'title' => $title,
                'url' => $url,
                'imageUrl' => '',
                'rootCategoryTitle' => '',
                'searchUid' => isset($cat['id']) ? (string) $cat['id'] : '',
            );
        }

        return $out;
    }

    private function normalize_brands($brands) {
        $out = array();
        if (!is_array($brands)) {
            return $out;
        }

        foreach ($brands as $brand) {
            $name = isset($brand['name']) ? (string) $brand['name'] : '';
            $url = isset($brand['url']) ? (string) $brand['url'] : '';
            if ($name === '' || $url === '') {
                continue;
            }
            $out[] = array(
                'id' => isset($brand['id']) ? (string) $brand['id'] : '',
                'name' => $name,
                'url' => $url,
                'imageUrl' => '',
            );
        }

        return $out;
    }

    private function sanitize_meta($meta) {
        $out = array();
        foreach ($meta as $key => $value) {
            $key = sanitize_text_field($key);
            if ($key === '') {
                continue;
            }
            if (is_scalar($value)) {
                $out[$key] = sanitize_text_field((string) $value);
            }
        }
        return $out;
    }
}
