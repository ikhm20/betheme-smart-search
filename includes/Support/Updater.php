<?php
/**
 * GitHub-based updater (GitHub Releases) for BeTheme Smart Search.
 *
 * Shows update notifications in WP Admin -> Plugins and provides plugin info modal.
 */
if (!defined('ABSPATH')) {
    exit;
}

class BeThemeSmartSearch_Updater {
    private $plugin_file;
    private $plugin_basename;

    private $repo; // e.g. "owner/name"
    private $asset_name; // release asset name

    public function __construct($plugin_file) {
        $this->plugin_file = $plugin_file;
        $this->plugin_basename = plugin_basename($plugin_file);

        $this->repo = defined('BETHEME_SMART_SEARCH_GITHUB_REPO') ? BETHEME_SMART_SEARCH_GITHUB_REPO : '';
        $this->asset_name = 'betheme-smart-search.zip';

        add_filter('pre_set_site_transient_update_plugins', array($this, 'filter_update_plugins_transient'));
        add_filter('plugins_api', array($this, 'filter_plugins_api'), 10, 3);
    }

    public function filter_update_plugins_transient($transient) {
        if (empty($this->repo) || !is_object($transient)) {
            return $transient;
        }

        // If WP hasn't loaded plugin list yet.
        if (empty($transient->checked) || !is_array($transient->checked)) {
            return $transient;
        }

        // Only handle this plugin.
        if (!isset($transient->checked[$this->plugin_basename])) {
            return $transient;
        }

        $release = $this->get_latest_release();
        if (!$release) {
            return $transient;
        }

        $current_version = $this->normalize_version($transient->checked[$this->plugin_basename]);
        $latest_version = $this->normalize_version($release['tag']);

        if ($latest_version === '' || version_compare($latest_version, $current_version, '<=')) {
            return $transient;
        }

        $package = $release['zip_url'];
        if (empty($package)) {
            return $transient;
        }

        $transient->response[$this->plugin_basename] = (object) array(
            'slug' => 'betheme-smart-search',
            'plugin' => $this->plugin_basename,
            'new_version' => $latest_version,
            'url' => $release['html_url'],
            'package' => $package,
        );

        return $transient;
    }

    public function filter_plugins_api($result, $action, $args) {
        if (empty($this->repo) || !is_object($args) || empty($args->slug) || $args->slug !== 'betheme-smart-search') {
            return $result;
        }

        $release = $this->get_latest_release();
        $latest_version = $release ? $this->normalize_version($release['tag']) : BETHEME_SMART_SEARCH_VERSION;

        $info = (object) array(
            'name' => 'BeTheme Smart Search',
            'slug' => 'betheme-smart-search',
            'version' => $latest_version,
            'author' => '<a href="https://github.com/ikhm20">ikhm20</a>',
            'homepage' => 'https://github.com/ikhm20/betheme-smart-search',
            'download_link' => $release ? $release['zip_url'] : '',
            'requires' => '',
            'tested' => '',
            'requires_php' => '',
            'sections' => array(
                'description' => 'Плагин улучшает поиск темы Betheme для WooCommerce: live-search, поиск по SKU/штрихкодам, и страница результатов в стиле магазина.',
                'changelog' => $release && !empty($release['body'])
                    ? wp_kses_post($release['body'])
                    : 'Смотрите историю изменений в репозитории GitHub.',
            ),
        );

        return $info;
    }

    private function normalize_version($version) {
        $version = is_string($version) ? trim($version) : '';
        $version = ltrim($version, "vV");
        return $version;
    }

    private function get_latest_release() {
        $cache_key = 'bss_github_release_latest_v1';
        $cached = get_site_transient($cache_key);
        if (is_array($cached) && isset($cached['__error'])) {
            return null;
        }
        if (is_array($cached)) {
            return $cached;
        }

        $api_url = 'https://api.github.com/repos/' . $this->repo . '/releases/latest';

        $response = wp_remote_get($api_url, array(
            'timeout' => 15,
            'headers' => array(
                'Accept' => 'application/vnd.github+json',
                'User-Agent' => 'WordPress/' . get_bloginfo('version') . '; ' . home_url('/'),
            ),
        ));

        if (is_wp_error($response)) {
            set_site_transient($cache_key, array('__error' => 1), 10 * MINUTE_IN_SECONDS);
            return null;
        }

        $code = (int) wp_remote_retrieve_response_code($response);
        $body = (string) wp_remote_retrieve_body($response);

        if ($code < 200 || $code >= 300 || $body === '') {
            set_site_transient($cache_key, array('__error' => 1), 10 * MINUTE_IN_SECONDS);
            return null;
        }

        $json = json_decode($body, true);
        if (!is_array($json) || empty($json['tag_name'])) {
            set_site_transient($cache_key, array('__error' => 1), 10 * MINUTE_IN_SECONDS);
            return null;
        }

        $zip_url = $this->find_release_asset_zip_url($json);
        if (!$zip_url) {
            // Fallback to GitHub auto-generated zipball. Warning: the folder name may not match plugin folder.
            $zip_url = !empty($json['zipball_url']) ? (string) $json['zipball_url'] : '';
        }

        $data = array(
            'tag' => (string) $json['tag_name'],
            'html_url' => !empty($json['html_url']) ? (string) $json['html_url'] : 'https://github.com/' . $this->repo,
            'zip_url' => $zip_url,
            'body' => !empty($json['body']) ? (string) $json['body'] : '',
        );

        set_site_transient($cache_key, $data, 30 * MINUTE_IN_SECONDS);
        return $data;
    }

    private function find_release_asset_zip_url($release_json) {
        if (!is_array($release_json) || empty($release_json['assets']) || !is_array($release_json['assets'])) {
            return '';
        }

        foreach ($release_json['assets'] as $asset) {
            if (!is_array($asset)) {
                continue;
            }

            $name = isset($asset['name']) ? (string) $asset['name'] : '';
            if ($name !== $this->asset_name) {
                continue;
            }

            $download = isset($asset['browser_download_url']) ? (string) $asset['browser_download_url'] : '';
            if ($download !== '') {
                return $download;
            }
        }

        return '';
    }
}
