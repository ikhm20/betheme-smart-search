/**
 * BeTheme Smart Search JavaScript
 */

(function($) {
    'use strict';

    var BeThemeSmartSearch = {
        init: function() {
            this.bindEvents();
            this.initLiveSearch();
        },

        bindEvents: function() {
            // Handle search form submission
            $(document).on('submit', 'form[data-ajax-search]', this.handleSearchSubmit);

            // Handle live search input - исправляем селектор на правильный класс
            $(document).on('input', 'input.field[name="s"]', this.debounce(this.handleLiveSearch, 300));
        },

        initLiveSearch: function() {
            // Use existing BeTheme live search container
            // No need to add our own
        },

        handleSearchSubmit: function(e) {
            // Allow normal form submission for now
            // In future, could implement AJAX submission
        },

        handleLiveSearch: function(e) {
            var $input = $(this);
            var query = $input.val().trim();
            var $form = $input.closest('form');
            var $results = $form.siblings('.mfn-live-search-box');

            // Проверяем, включен ли live search для этой формы
            if ($form.attr('mfn-livesearch-dropdown') !== 'true') {
                return;
            }

            if (query.length < 3) { // BeTheme использует минимум 3 символа
                $results.hide();
                return;
            }

            BeThemeSmartSearch.performLiveSearch(query, $results);
        },

        performLiveSearch: function(query, $container) {
            var context = BeThemeSmartSearch.getSearchContext();

            $.ajax({
                url: bethemeSmartSearch.rest_url + 'live-search/',
                method: 'GET',
                data: {
                    q: query,
                    context: context,
                    limit: 5
                },
                beforeSend: function() {
                    $container.html('<div class="search-loading">Searching...</div>').show();
                },
                success: function(response) {
                    BeThemeSmartSearch.displayLiveResults(response, $container);
                },
                error: function() {
                    $container.html('<div class="search-error">Search failed. Please try again.</div>').show();
                }
            });
        },

        displayLiveResults: function(data, $container) {
            var html = '';

            if (data.products && data.products.length > 0) {
                html += '<div class="live-search-section products">';
                html += '<h4>Products</h4>';
                html += '<ul>';
                data.products.forEach(function(product) {
                    html += '<li class="product-item">';
                    html += '<a href="' + product.url + '">';
                    if (product.image) {
                        html += '<img src="' + product.image + '" alt="' + product.title + '" />';
                    }
                    html += '<div class="product-info">';
                    html += '<span class="product-title">' + product.title + '</span>';
                    if (product.sku) {
                        html += '<span class="product-sku">SKU: ' + product.sku + '</span>';
                    }
                    html += '<span class="product-price">' + product.price + '</span>';
                    html += '</div>';
                    html += '</a>';
                    html += '</li>';
                });
                html += '</ul>';
                html += '</div>';
            }

            if (data.categories && data.categories.length > 0) {
                html += '<div class="live-search-section categories">';
                html += '<h4>Categories</h4>';
                html += '<ul>';
                data.categories.forEach(function(category) {
                    html += '<li class="category-item">';
                    html += '<a href="' + category.url + '">';
                    html += '<span class="category-name">' + category.name + '</span>';
                    html += '<span class="category-count">(' + category.count + ')</span>';
                    html += '</a>';
                    html += '</li>';
                });
                html += '</ul>';
                html += '</div>';
            }

            if (data.brands && data.brands.length > 0) {
                html += '<div class="live-search-section brands">';
                html += '<h4>Brands</h4>';
                html += '<ul>';
                data.brands.forEach(function(brand) {
                    html += '<li class="brand-item">';
                    html += '<a href="' + brand.url + '">';
                    html += '<span class="brand-name">' + brand.name + '</span>';
                    html += '<span class="brand-count">(' + brand.count + ')</span>';
                    html += '</a>';
                    html += '</li>';
                });
                html += '</ul>';
                html += '</div>';
            }

            if (html === '') {
                html = '<div class="no-results">No results found</div>';
            } else {
                html += '<div class="view-all-results">';
                html += '<a href="' + window.location.origin + '/?s=' + encodeURIComponent(data.query || '') + '">View all results</a>';
                html += '</div>';
            }

            $container.html(html);
        },

        getSearchContext: function() {
            if (typeof bethemeSmartSearch !== 'undefined' && bethemeSmartSearch.context) {
                return bethemeSmartSearch.context;
            }

            // Determine context from current page
            if (window.location.href.indexOf('/shop') > -1 ||
                window.location.href.indexOf('/product') > -1 ||
                window.location.href.indexOf('/product-category') > -1) {
                return 'shop';
            }

            return 'blog';
        },

        debounce: function(func, wait) {
            var timeout;
            return function executedFunction() {
                var context = this;
                var args = arguments;
                var later = function() {
                    timeout = null;
                    func.apply(context, args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    };

    // Initialize on document ready
    $(document).ready(function() {
        BeThemeSmartSearch.init();
    });

})(jQuery);