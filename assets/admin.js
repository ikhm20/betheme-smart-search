/**
 * Admin JavaScript for BeTheme Smart Search
 */

(function($) {
    'use strict';

    $(document).ready(function() {

        function setDisabled($container, disabled) {
            $container.attr('data-bss-disabled', disabled ? 'true' : 'false');
        }

        // Weight slider functionality
        $('.weight-slider').on('input', function() {
            var $slider = $(this);
            var $value = $slider.siblings('.weight-value');
            $value.text($slider.val());
        });

        // Initialize weight values on page load
        $('.weight-slider').each(function() {
            var $slider = $(this);
            var $value = $slider.siblings('.weight-value');
            $value.text($slider.val());
        });

        // Test search functionality
        $('#test-search-btn').on('click', function(e) {
            e.preventDefault();

            var $btn = $(this);
            var $results = $('#test-results');
            var query = $('#test-query').val().trim();

            if (!query) {
                alert(bethemeSearchAdmin.strings.enter_search_term);
                return;
            }

            $btn.prop('disabled', true).text(bethemeSearchAdmin.strings.testing);
            $results.html('<p>' + bethemeSearchAdmin.strings.loading + '</p>');

            $.ajax({
                url: bethemeSearchAdmin.ajax_url,
                type: 'POST',
                data: {
                    action: 'betheme_smart_search_test',
                    query: query,
                    nonce: bethemeSearchAdmin.nonce
                },
                success: function(response) {
                    if (response.success) {
                        var html = '<h5>Search Results:</h5>';
                        html += '<pre>' + JSON.stringify(response.data, null, 2) + '</pre>';
                        $results.html(html);
                    } else {
                        $results.html('<p class="error">Error: ' + response.data + '</p>');
                    }
                },
                error: function() {
                    $results.html('<p class="error">' + bethemeSearchAdmin.strings.ajax_error + '</p>');
                },
                complete: function() {
                    $btn.prop('disabled', false).text(bethemeSearchAdmin.strings.test_search);
                }
            });
        });

        // Clear cache functionality
        $('#clear-cache-btn').on('click', function(e) {
            e.preventDefault();

            var $btn = $(this);
            var $status = $('#cache-status');

            $btn.prop('disabled', true).text(bethemeSearchAdmin.strings.clearing);
            $status.html('<p>Clearing cache...</p>');

            $.ajax({
                url: bethemeSearchAdmin.ajax_url,
                type: 'POST',
                data: {
                    action: 'betheme_smart_search_clear_cache',
                    nonce: bethemeSearchAdmin.nonce
                },
                success: function(response) {
                    if (response.success) {
                        $status.html('<p class="success">' + bethemeSearchAdmin.strings.cache_cleared + '</p>');
                    } else {
                        $status.html('<p class="error">Error: ' + response.data + '</p>');
                    }
                },
                error: function() {
                    $status.html('<p class="error">' + bethemeSearchAdmin.strings.ajax_error + '</p>');
                },
                complete: function() {
                    $btn.prop('disabled', false).text(bethemeSearchAdmin.strings.clear_cache);
                }
            });
        });

        // Tab functionality
        $('.nav-tab').on('click', function(e) {
            e.preventDefault();

            var $tab = $(this);
            var target = $tab.attr('href').split('tab=')[1];

            // Update URL without page reload
            if (history.pushState) {
                var url = new URL(window.location);
                url.searchParams.set('tab', target);
                history.pushState(null, '', url);
            }

            // Update active tab
            $('.nav-tab').removeClass('nav-tab-active');
            $tab.addClass('nav-tab-active');

            // Show corresponding content
            $('.tab-content').removeClass('active');
            $('#' + target).addClass('active');
        });

        // Accordion functionality
        $('[data-bss-accordion]').on('click', '.bss-accordion__toggle', function() {
            var $btn = $(this);
            var isExpanded = $btn.attr('aria-expanded') === 'true';
            var $content = $btn.closest('[data-bss-accordion]').find('.bss-accordion__content').first();

            $btn.attr('aria-expanded', isExpanded ? 'false' : 'true');
            if (isExpanded) {
                $content.prop('hidden', true);
            } else {
                $content.prop('hidden', false);
            }
        });

        // Disable plugin search-engine fields when preserving BeTheme search
        function syncPreserveMode() {
            var preserve = $('input[name*="preserve_betheme_search"]').is(':checked');
            var $advancedGroup = $('[data-bss-disabled-when-preserve]');
            setDisabled($advancedGroup, preserve);
        }

        $('input[name*="preserve_betheme_search"]').on('change', syncPreserveMode);
        syncPreserveMode();

        // Disable layout page when template is off
        function syncTemplateMode() {
            var useTemplate = $('input[name*="use_custom_template"]').is(':checked');
            var $layout = $('[data-bss-layout-field]');
            setDisabled($layout, !useTemplate);
        }

        $('input[name*="use_custom_template"]').on('change', syncTemplateMode);
        syncTemplateMode();

        // Form validation
        $('form[action="options.php"]').on('submit', function(e) {
            var $form = $(this);
            var isValid = true;

            // Validate debounce delay
            var debounce = parseInt($('input[name*="live_search_debounce"]').val());
            if (debounce < 100 || debounce > 1000) {
                alert('Debounce delay must be between 100 and 1000 milliseconds');
                isValid = false;
            }

            // Validate max results
            var maxResults = parseInt($('input[name*="live_search_max_results"]').val());
            if (maxResults < 1 || maxResults > 20) {
                alert('Max results must be between 1 and 20');
                isValid = false;
            }

            // Validate cache TTL
            var cacheTtl = parseInt($('input[name*="cache_ttl"]').val());
            if (cacheTtl < 300 || cacheTtl > 86400) {
                alert('Cache TTL must be between 300 and 86400 seconds');
                isValid = false;
            }

            if (!isValid) {
                e.preventDefault();
                return false;
            }

            return true;
        });

        // Add loading states for form submission
        $('form[action="options.php"]').on('submit', function() {
            var $submitBtn = $(this).find('input[type="submit"]');
            $submitBtn.prop('disabled', true).val(bethemeSearchAdmin.strings.saving);
        });

    });

})(jQuery);
