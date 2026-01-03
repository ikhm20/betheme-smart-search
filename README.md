# BeTheme Smart Search

A WordPress plugin that enhances BeTheme's search functionality with WooCommerce support, live AJAX search, custom results pages, and marketplace-style search capabilities.

## Features

### Core Functionality
- **Enhanced Search Relevance**: Searches by product title, SKU, content, and custom fields
- **Context-Aware Search**: Different search behavior for shop vs blog contexts
- **Custom Search Results Page**: Clean, e-commerce focused results template
- **Live AJAX Search**: Real-time search suggestions with debouncing
- **Marketplace-Style Search**: Returns products, categories, brands, and suggestions in one response

### Advanced Features
- **ACF Integration**: Automatically searches Advanced Custom Fields text content
- **Caching**: Transient-based caching for improved performance
- **Analytics**: Tracks search queries, results count, and user context
- **Mobile Responsive**: Optimized for all device sizes

### WooCommerce Optimized
- Product-only search in shop context
- SKU search support
- Product attributes search
- Category and brand filtering
- Popular products display on no-results

## Installation

1. Download the plugin files
2. Upload to `/wp-content/plugins/betheme-smart-search/`
3. Activate the plugin through the WordPress admin
4. The plugin will automatically override BeTheme's search functionality

## Deployment (Timeweb shared hosting)

If you have Timeweb SSH access, you can deploy without creating ZIP archives.

### Auto-update via Timeweb Cron (recommended)

GitHub Actions -> SSH can be unstable on shared hosting (often blocked/throttled from GitHub runner IPs). The most reliable approach is to let **the server pull updates itself** on a schedule via Timeweb Cron panel:

https://hosting.timeweb.ru/crontab/create

1) Create a cron task (example: every 2 minutes).
2) Command / file to run:

- If Timeweb Cron lets you run a command:  
  `bash /home/c/cn30947/wordpress_nb95i/public_html/wp-content/plugins/betheme-smart-search/scripts/timeweb-cron.sh`
- If Timeweb Cron only lets you choose a file (and runs it via PHP):  
  `/home/c/cn30947/wordpress_nb95i/public_html/wp-content/plugins/betheme-smart-search/scripts/timeweb-cron.php`

Logs are written to:

`/tmp/betheme-smart-search-cron.log`

Note: `scripts/timeweb-cron.sh` and `scripts/timeweb-update.sh` auto-detect the plugin directory (relative to themselves), so they work even if your Timeweb path changes.

### First install (clone + atomic swap)
- Create a private GitHub/GitLab repo with this plugin.
- On the server, add an SSH key (recommended) and ensure `git` works.
- Deactivate the plugin in WP Admin (recommended).
- Run in SSH:

`bash /home/c/cn30947/wordpress_nb95i/public_html/wp-content/plugins/betheme-smart-search/scripts/timeweb-install.sh git@github.com:USER/REPO.git main`

### Update (1 command)
`bash /home/c/cn30947/wordpress_nb95i/public_html/wp-content/plugins/betheme-smart-search/scripts/timeweb-update.sh`

## Updates in WP Admin (GitHub Releases)

If you want WordPress to show native update notifications in **Plugins**:

1) Push code to GitHub (this repo).
2) Bump `Version:` in `betheme-smart-search.php` (and `BETHEME_SMART_SEARCH_VERSION`).
3) Create a tag and push it:

```bash
git tag v1.0.1
git push --tags
```

GitHub Actions will build `betheme-smart-search.zip` and attach it to a GitHub Release.
The plugin checks the latest GitHub Release and will show an update in WP Admin.

Tip: on the server you can force an update re-check by running:

```bash
wp --path=/home/c/cn30947/wordpress_nb95i/public_html transient delete update_plugins
```

## Notes

- Auto-deploy via GitHub Actions SSH is intentionally not included (shared hosting often blocks GitHub runner IPs). Use **Timeweb Cron** (above) for reliable auto-updates.


## Configuration

No configuration needed! The plugin works out of the box. However, you can customize:

### BeBuilder editable Search Results page
Enable `Use Custom Template` in plugin settings and select a page in **Search Results Layout Page**. That page content (including BeBuilder content) will be rendered above the results grid.

Use the shortcode below to control where the results appear:

```
[betheme_smart_search_results per_page="12"]
```

### Brand Taxonomy
If you use a custom brand taxonomy, update the `search_brands()` method in `includes/Search/QueryBuilder.php`:

```php
$args = array(
    'taxonomy' => 'your_brand_taxonomy', // Change this
    'name__like' => $query,
    'number' => $limit,
    'hide_empty' => true
);
```

### Search Analytics
View search analytics in the database table `wp_betheme_search_analytics`.

## API Endpoints

### Live Search
```
GET /wp-json/betheme-smart-search/v1/query?q={search_term}&context={shop|blog}&limit={number}
```

### Live Dropdown (fast)
```
GET /wp-json/betheme-smart-search/v1/live?q={search_term}&context={shop|blog}&limit={number}&stage={exact|full}
```

### Suggestions (history/prefix)
```
GET /wp-json/betheme-smart-search/v1/suggest?q={search_term}&context={shop|blog}&limit={number}
```

Response format:
```json
{
  "products": [
    {
      "id": 123,
      "title": "Product Name",
      "url": "https://example.com/product/product-name/",
      "price": "$29.99",
      "image": "https://example.com/wp-content/uploads/image.jpg",
      "sku": "PROD-001",
      "in_stock": true
    }
  ],
  "categories": [...],
  "brands": [...],
  "suggestions": [...]
}
```

## File Structure

```
betheme-smart-search/
|-- betheme-smart-search.php    # Main plugin file
|-- includes/
|   |-- Plugin.php              # Core plugin bootstrap class
|   |-- Helpers.php             # Utility functions
|   |-- SearchQuery.php         # Legacy wrapper for Search/Query.php
|   |-- SearchHooks.php         # Legacy wrapper for Search/Hooks.php
|   |-- SearchRest.php          # Legacy REST wrapper
|   |-- Admin.php               # Legacy wrapper for Admin/Admin.php
|   |-- AdminRest.php           # Legacy wrapper for Admin/Rest.php
|   |-- Shortcodes.php          # Legacy wrapper for Frontend/Shortcodes.php
|   |-- Updater.php             # Legacy wrapper for Support/Updater.php
|   |-- Rest/
|   |   |-- Query.php           # REST /query endpoint
|   |   |-- LiveSearch.php      # REST /live endpoint
|   |   |-- Suggest.php         # REST /suggest endpoint
|   |-- Search/
|   |   |-- Query.php           # Search query modifications
|   |   |-- Normalize.php       # Normalization helpers
|   |   |-- QueryBuilder.php    # Search query builder
|   |   |-- Scoring.php         # Result scoring
|   |   |-- History.php         # Search history analytics
|   |   |-- Hooks.php           # WordPress hooks and filters
|   |   |-- Service.php         # Search service (/query)
|   |-- Admin/
|   |   |-- Admin.php           # Admin controller
|   |   |-- Rest.php            # Admin REST endpoints
|   |-- Frontend/
|   |   |-- Shortcodes.php      # Shortcode renderer
|   |-- Support/
|       |-- Cache.php           # Cache helpers
|       |-- Autoload.php        # Class autoloader
|       |-- Options.php         # Options defaults and validation
|       |-- Updater.php         # GitHub updater
|-- templates/
|   |-- search-results.php      # Custom search results template
|-- assets/
|   |-- search.css              # Search styling
|   |-- live-suggest.js         # Live dropdown (REST /live)
|-- README.md                   # This file
```

## Hooks and Filters

### Available Filters
- `betheme_smart_search_query_args` - Modify search query arguments
- `betheme_smart_search_results_template` - Override results template
- `betheme_smart_search_live_results` - Modify live search results

### Available Actions
- `betheme_smart_search_before_results` - Before displaying search results
- `betheme_smart_search_after_results` - After displaying search results

## Performance

- Results are cached for 1 hour using WordPress transients
- AJAX requests are debounced to prevent excessive API calls
- Database queries are optimized with proper indexing

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Changelog

### 1.0.2
- Refactor: codebase refactoring and internal improvements
- Bumped version to 1.0.2

### 1.0.0
- Initial release
- Basic search enhancement
- Live search functionality
- Custom results template
- ACF integration
- Analytics and caching

## License

GPL v2 or later

## Support

For support, please create an issue on GitHub or contact the plugin author.

deploy test
