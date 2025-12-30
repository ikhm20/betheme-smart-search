/* global bethemeSmartSearchAdmin, wp */

(function () {
  if (!window.wp || !document.getElementById("betheme-smart-search-admin-app")) {
    return;
  }

  var el = wp.element.createElement;
  var Fragment = wp.element.Fragment;
  var useEffect = wp.element.useEffect;
  var useMemo = wp.element.useMemo;
  var useRef = wp.element.useRef;
  var useState = wp.element.useState;

  var apiFetch = wp.apiFetch;
  apiFetch.use(apiFetch.createNonceMiddleware(bethemeSmartSearchAdmin.rest_nonce));

  var components = wp.components;
  var Button = components.Button;
  var Card = components.Card;
  var CardBody = components.CardBody;
  var CheckboxControl = components.CheckboxControl;
  var Flex = components.Flex;
  var FlexBlock = components.FlexBlock;
  var Notice = components.Notice;
  var PanelBody = components.PanelBody;
  var Spinner = components.Spinner;
  var TextControl = components.TextControl;
  var TextareaControl = components.TextareaControl;
  var ToggleControl = components.ToggleControl;
  var SelectControl = components.SelectControl;

  var NAV_ITEMS = [
    { type: "header", label: "Основное" },
    { to: "/dashboard", label: "Дашборд" },

    { type: "header", label: "Плагин" },
    { to: "/settings/general", label: "Настройки", activePrefix: "/settings" },

    { type: "header", label: "Данные" },
    { to: "/analytics/overview", label: "Аналитика", activePrefix: "/analytics" },

    { type: "header", label: "Инструменты" },
    { to: "/tools/status", label: "Состояние", activePrefix: "/tools/status" },
    { to: "/tools/test-query", label: "Тест запроса", activePrefix: "/tools/test-query" },
  ];

  function clampInt(value, min, max, fallback) {
    var n = parseInt(value, 10);
    if (!isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function safeJson(value) {
    try {
      return JSON.stringify(value || {});
    } catch (e) {
      return "{}";
    }
  }

  function copyToClipboard(text) {
    var value = String(text || "");
    if (!value) return Promise.resolve(false);

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      return navigator.clipboard
        .writeText(value)
        .then(function () {
          return true;
        })
        .catch(function () {
          return false;
        });
    }

    return new Promise(function (resolve) {
      try {
        var elTa = document.createElement("textarea");
        elTa.value = value;
        elTa.setAttribute("readonly", "readonly");
        elTa.style.position = "fixed";
        elTa.style.top = "-1000px";
        elTa.style.left = "-1000px";
        document.body.appendChild(elTa);
        elTa.select();
        elTa.setSelectionRange(0, elTa.value.length);
        var ok = false;
        try {
          ok = document.execCommand("copy");
        } catch (e) {
          ok = false;
        }
        document.body.removeChild(elTa);
        resolve(!!ok);
      } catch (e) {
        resolve(false);
      }
    });
  }

  function useHashLocation() {
    var initial = typeof window.location.hash === "string" ? window.location.hash : "";
    var initialPath = initial.replace(/^#/, "") || "/dashboard";

    var _useState = useState(initialPath),
      path = _useState[0],
      setPath = _useState[1];

    useEffect(function () {
      function onChange() {
        var next = typeof window.location.hash === "string" ? window.location.hash.replace(/^#/, "") : "";
        setPath(next || "/dashboard");
      }

      window.addEventListener("hashchange", onChange);
      return function () {
        window.removeEventListener("hashchange", onChange);
      };
    }, []);

    function navigate(nextPath) {
      if (!nextPath) return;
      if (nextPath.charAt(0) !== "/") nextPath = "/" + nextPath;
      if (window.location.hash.replace(/^#/, "") === nextPath) return;
      window.location.hash = nextPath;
    }

    return { path: path, navigate: navigate };
  }

  function startsWith(path, prefix) {
    if (!path || !prefix) return false;
    if (path === prefix) return true;
    return path.indexOf(prefix + "/") === 0;
  }

  function NavLink(props) {
    var to = props.to;
    var isActive = props.isActive;
    var onClick = props.onClick;
    var label = props.label;
    var abbr = props.abbr;

    return el(
      "a",
      {
        href: "#"+to,
        className: "bss-nav-link" + (isActive ? " is-active" : ""),
        title: label,
        onClick: function (e) {
          e.preventDefault();
          onClick(to);
        },
      },
      el("span", { className: "bss-nav-abbr", "aria-hidden": "true" }, abbr),
      el("span", { className: "bss-nav-label" }, label)
    );
  }

  function NavHeader(props) {
    return el("div", { className: "bss-nav-header" }, props.children);
  }

  function SectionTitle(props) {
    return el("h2", { className: "bss-section-title" }, props.children);
  }

  function HelpText(props) {
    return el("p", { className: "bss-help" }, props.children);
  }

  function StatCard(props) {
    return el(
      "div",
      { className: "bss-stat" },
      el("div", { className: "bss-stat-label" }, props.label),
      el("div", { className: "bss-stat-value" }, props.value)
    );
  }

  function Table(props) {
    var rows = props.rows || [];
    var columns = props.columns || [];
    var emptyText = props.emptyText || "Нет данных.";

    if (!rows.length) {
      return el("div", { className: "bss-muted" }, emptyText);
    }

    return el(
      "table",
      { className: "bss-table" },
      el(
        "thead",
        null,
        el(
          "tr",
          null,
          columns.map(function (c) {
            return el("th", { key: c.key }, c.label);
          })
        )
      ),
      el(
        "tbody",
        null,
        rows.map(function (row, idx) {
          return el(
            "tr",
            { key: idx },
            columns.map(function (c) {
              var v = row && row[c.key] != null ? row[c.key] : "";
              return el("td", { key: c.key }, String(v));
            })
          );
        })
      )
    );
  }

  function makeNavAbbr(label) {
    if (!label) return "?";
    var cleaned = String(label)
      .replace(/\s*·\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) return "?";

    var parts = cleaned.split(" ").filter(Boolean);
    if (!parts.length) return cleaned.slice(0, 1).toUpperCase();

    var letters = parts
      .map(function (w) {
        return w.slice(0, 1);
      })
      .join("");

    return letters.slice(0, 2).toUpperCase();
  }

  function Tabs(props) {
    var tabs = props.tabs || [];
    var active = props.active;
    var navigate = props.navigate;

    return el(
      "div",
      { className: "bss-tabs", role: "tablist", "aria-label": "Разделы" },
      tabs.map(function (t) {
        var isActive = active === t.to;
        return el(
          "a",
          {
            key: t.to,
            href: "#" + t.to,
            className: "bss-tab" + (isActive ? " is-active" : ""),
            role: "tab",
            "aria-selected": isActive ? "true" : "false",
            onClick: function (e) {
              e.preventDefault();
              navigate(t.to);
            },
          },
          t.label
        );
      })
    );
  }

  function DashboardPage(props) {
    var analytics = props.analytics;
    var analyticsLoading = props.analyticsLoading;
    var onRefresh = props.onRefresh;
    var days = props.days;
    var setDays = props.setDays;

    return el(
      Fragment,
      null,
      el(
        Flex,
        { justify: "space-between", align: "flex-end", style: { marginBottom: "12px" } },
        el(SectionTitle, null, "Дашборд"),
        el(
          Flex,
          { gap: 8, align: "flex-end" },
          el(SelectControl, {
            label: "Период",
            value: days,
            options: [
              { value: 7, label: "7 дней" },
              { value: 14, label: "14 дней" },
              { value: 30, label: "30 дней" },
              { value: 90, label: "90 дней" },
            ],
            onChange: function (v) {
              setDays(clampInt(v, 1, 365, 30));
            },
          }),
          el(Button, { variant: "secondary", onClick: onRefresh, isBusy: analyticsLoading }, "Обновить")
        )
      ),
      analyticsLoading && el(Spinner, null),
      analytics &&
        el(
          "div",
          { className: "bss-stats" },
          el(StatCard, { label: "Всего поисков", value: String(analytics.summary.total_count || 0) }),
          el(StatCard, { label: "Уникальные запросы", value: String(analytics.summary.unique_queries || 0) }),
          el(StatCard, { label: "Без результатов", value: String(analytics.summary.no_results_count || 0) }),
          el(StatCard, {
            label: "Среднее результатов",
            value: String(Math.round((Number(analytics.summary.avg_results) || 0) * 10) / 10),
          })
        ),
      analytics &&
        el(
          Flex,
          { gap: 16, align: "stretch" },
          el(
            FlexBlock,
            null,
            el(
              Card,
              null,
              el(CardBody, null, el("h3", { className: "bss-card-title" }, "Топ запросов"), el(Table, {
                rows: analytics.top_queries || [],
                columns: [
                  { key: "query", label: "Запрос" },
                  { key: "hits", label: "Хиты" },
                  { key: "avg_results", label: "Средн." },
                ],
              }))
            )
          ),
          el(
            FlexBlock,
            null,
            el(
              Card,
              null,
              el(CardBody, null, el("h3", { className: "bss-card-title" }, "Топ без результатов"), el(Table, {
                rows: analytics.top_no_results || [],
                columns: [
                  { key: "query", label: "Запрос" },
                  { key: "hits", label: "Хиты" },
                  { key: "last_at", label: "Последний" },
                ],
              }))
            )
          )
        )
    );
  }

  function SettingsGeneralPage(props) {
    var options = props.options;
    var updateOption = props.updateOption;
    var pages = props.pages;
    var navigate = props.navigate;

    var metaKeysValue = Array.isArray(options.product_meta_keys)
      ? options.product_meta_keys.join(", ")
      : options.product_meta_keys || "";

    var layoutSelectEnabled = !!options.use_custom_template || !!options.shop_style_results;
    var layoutHelp = options.shop_style_results
      ? "Контент этой страницы (BeBuilder) будет выводиться над списком товаров (WooCommerce) на странице результатов."
      : "Контент этой страницы (BeBuilder) будет выводиться в шаблоне результатов поиска плагина.";

    return el(
      Fragment,
      null,
      el(SectionTitle, null, "Настройки"),
      el(Tabs, {
        active: "/settings/general",
        navigate: navigate,
        tabs: [
          { to: "/settings/general", label: "Общее" },
          { to: "/settings/live-search", label: "Живой поиск" },
          { to: "/settings/dictionaries", label: "Словари" },
        ],
      }),
      el(
        Card,
        null,
        el(
          CardBody,
          null,
          el(PanelBody, { title: "Режимы", initialOpen: true },
            el(ToggleControl, {
              label: "Сохранять поведение поиска BeTheme",
              help: "Если включено — тема продолжит управлять live search и стандартным поиском. Плагин только расширяет возможности.",
              checked: !!options.preserve_betheme_search,
              onChange: function (v) {
                updateOption("preserve_betheme_search", v ? 1 : 0);
              },
            }),
            el(ToggleControl, {
              label: "Результаты как страница магазина (shop-style)",
              help: "Поиск будет перенаправляться на `?post_type=product`, и страницу результатов отрисует WooCommerce/BeTheme.",
              checked: !!options.shop_style_results,
              onChange: function (v) {
                updateOption("shop_style_results", v ? 1 : 0);
              },
            }),
            el(ToggleControl, {
              label: "Если введён артикул — открыть товар (Enter)",
              help: "Если запрос совпал ровно с одним SKU/штрихкодом/вариацией — вместо списка результатов откроется карточка товара.",
              checked: !!options.redirect_exact_match_to_product,
              onChange: function (v) {
                updateOption("redirect_exact_match_to_product", v ? 1 : 0);
              },
            })
          ),
          el(PanelBody, { title: "Поиск товаров (WooCommerce)", initialOpen: false },
            el(ToggleControl, {
              label: "Искать по SKU/штрихкоду на странице результатов",
              help: "Добавляет meta_query для code-like запросов (цифры/латиница), чтобы артикулы находили товары.",
              checked: !!options.enhance_shop_search_query,
              onChange: function (v) {
                updateOption("enhance_shop_search_query", v ? 1 : 0);
              },
            }),
            el(TextControl, {
              label: "Meta-ключи для SKU/штрихкодов",
              help: "Через запятую. Пример: _sku, _ean, _barcode, _gtin, _upc",
              value: metaKeysValue,
              onChange: function (v) {
                updateOption("product_meta_keys", v);
              },
            })
          ),
          el(PanelBody, { title: "BeBuilder (страница-шаблон)", initialOpen: false },
            el(SelectControl, {
              label: "Страница-шаблон",
              help: layoutHelp,
              disabled: !layoutSelectEnabled,
              value: options.results_layout_page_id || 0,
              options: pages,
              onChange: function (v) {
                updateOption("results_layout_page_id", parseInt(v, 10) || 0);
              },
            }),
            el(HelpText, null, "Шорткод (для кастомного шаблона):"),
            el("code", { className: "bss-code" }, '[betheme_smart_search_results per_page="12"]')
          )
        )
      )
    );
  }

  function SettingsLiveSearchPage(props) {
    var options = props.options;
    var updateOption = props.updateOption;
    var navigate = props.navigate;

    return el(
      Fragment,
      null,
      el(SectionTitle, null, "Настройки"),
      el(Tabs, {
        active: "/settings/live-search",
        navigate: navigate,
        tabs: [
          { to: "/settings/general", label: "Общее" },
          { to: "/settings/live-search", label: "Живой поиск" },
          { to: "/settings/dictionaries", label: "Словари" },
        ],
      }),
      el(
        Card,
        null,
        el(
          CardBody,
          null,
          el(PanelBody, { title: "Живой поиск", initialOpen: true },
            el(ToggleControl, {
              label: "REST endpoint живого поиска (плагин)",
              checked: !!options.live_search_enabled,
              onChange: function (v) {
                updateOption("live_search_enabled", v ? 1 : 0);
              },
            }),
            el(SelectControl, {
              label: "Режим поиска по артикулу/штрихкоду",
              help: "Управляет тем, как плагин ищет по SKU/штрихкодам в meta полях: точное совпадение, по началу или вхождение.",
              value: options.code_match_mode || "contains",
              options: [
                { value: "contains", label: "contains (вхождение)" },
                { value: "startswith", label: "startswith (по началу)" },
                { value: "exact", label: "exact (точно)" },
              ],
              onChange: function (v) {
                updateOption("code_match_mode", v);
              },
            }),
            el(ToggleControl, {
              label: "Расширять live search BeTheme (SKU/штрихкоды/атрибуты)",
              help: "Добавляет в dropdown результаты по артикулам, штрихкодам, атрибутам (pa_*).",
              checked: !!options.enhance_betheme_live_search,
              onChange: function (v) {
                updateOption("enhance_betheme_live_search", v ? 1 : 0);
              },
            }),
            el(TextControl, {
              label: "Задержка (debounce), мс",
              type: "number",
              value: options.live_search_debounce,
              onChange: function (v) {
                updateOption("live_search_debounce", clampInt(v, 50, 2000, 300));
              },
            }),
            el(TextControl, {
              label: "Максимум результатов",
              type: "number",
              value: options.live_search_max_results,
              onChange: function (v) {
                updateOption("live_search_max_results", clampInt(v, 1, 50, 10));
              },
            }),
            el(CheckboxControl, {
              label: "Показывать категории",
              checked: !!options.live_search_show_categories,
              onChange: function (v) {
                updateOption("live_search_show_categories", v ? 1 : 0);
              },
            }),
            el(CheckboxControl, {
              label: "Показывать бренды",
              checked: !!options.live_search_show_brands,
              onChange: function (v) {
                updateOption("live_search_show_brands", v ? 1 : 0);
              },
            }),
            el(CheckboxControl, {
              label: "Показывать товары по артикулу (выпадашка)",
              help: "Показывает в выпадашке быстрые результаты по артикулам/штрихкодам через REST /v1/live (особенно полезно, когда BeTheme не ищет по SKU).",
              checked: !!options.live_search_show_code_products,
              onChange: function (v) {
                updateOption("live_search_show_code_products", v ? 1 : 0);
              },
            }),
            el(CheckboxControl, {
              label: "Показывать «Похожие запросы» при вводе",
              help: "Если выключено — подсказки по запросам не показываются во время набора текста. История/популярные остаются при пустом поле.",
              checked: !!options.live_search_show_suggestions,
              onChange: function (v) {
                updateOption("live_search_show_suggestions", v ? 1 : 0);
              },
            })
          ),
          el(PanelBody, { title: "Кеширование (ускорение)", initialOpen: false },
            el(ToggleControl, {
              label: "Включить кеширование",
              checked: !!options.enable_caching,
              onChange: function (v) {
                updateOption("enable_caching", v ? 1 : 0);
              },
            }),
            el(TextControl, {
              label: "TTL (сек.)",
              type: "number",
              value: options.cache_ttl,
              disabled: !options.enable_caching,
              onChange: function (v) {
                updateOption("cache_ttl", clampInt(v, 30, 86400, 600));
              },
            }),
            el(HelpText, null, "Кеш применяется и к расширению BeTheme live search (выпадающий список).")
          )
        )
      )
    );
  }

  function SettingsDictionariesPage(props) {
    var options = props.options;
    var updateOption = props.updateOption;
    var navigate = props.navigate;

    return el(
      Fragment,
      null,
      el(SectionTitle, null, "Настройки"),
      el(Tabs, {
        active: "/settings/dictionaries",
        navigate: navigate,
        tabs: [
          { to: "/settings/general", label: "Общее" },
          { to: "/settings/live-search", label: "Живой поиск" },
          { to: "/settings/dictionaries", label: "Словари" },
        ],
      }),
      el(
        Card,
        null,
        el(
          CardBody,
          null,
          el(ToggleControl, {
            label: "Логирование поисковых запросов",
            help: "Записывает запросы и количество результатов в таблицу аналитики.",
            checked: !!options.enable_search_logging,
            onChange: function (v) {
              updateOption("enable_search_logging", v ? 1 : 0);
            },
          }),
          el(ToggleControl, {
            label: "Синонимы",
            checked: !!options.enable_synonyms,
            onChange: function (v) {
              updateOption("enable_synonyms", v ? 1 : 0);
            },
          }),
          el(TextareaControl, {
            label: "Правила синонимов",
            help: "Формат: `слово=вариант1,вариант2` (по одной строке).",
            value: options.synonyms_rules || "",
            disabled: !options.enable_synonyms,
            onChange: function (v) {
              updateOption("synonyms_rules", v);
            },
          })
        )
      )
    );
  }

  function AnalyticsOverviewPage(props) {
    var analytics = props.analytics;
    var analyticsLoading = props.analyticsLoading;
    var onRefresh = props.onRefresh;
    var onClear = props.onClear;
    var days = props.days;
    var setDays = props.setDays;
    var limit = props.limit;
    var setLimit = props.setLimit;
    var navigate = props.navigate;

    return el(
      Fragment,
      null,
      el(SectionTitle, null, "Аналитика"),
      el(Tabs, { active: "/analytics/overview", navigate: navigate, tabs: [{ to: "/analytics/overview", label: "Обзор" }, { to: "/tools/status", label: "Состояние" }, { to: "/tools/test-query", label: "Тест запроса" }] }),
      el(
        Flex,
        { gap: 12, align: "flex-end", style: { marginBottom: "12px" } },
        el(SelectControl, {
          label: "Период",
          value: days,
          options: [
            { value: 7, label: "7 дней" },
            { value: 14, label: "14 дней" },
            { value: 30, label: "30 дней" },
            { value: 90, label: "90 дней" },
          ],
          onChange: function (v) {
            setDays(clampInt(v, 1, 365, 30));
          },
        }),
        el(SelectControl, {
          label: "Лимит",
          value: limit,
          options: [
            { value: 5, label: "5" },
            { value: 10, label: "10" },
            { value: 20, label: "20" },
            { value: 50, label: "50" },
          ],
          onChange: function (v) {
            setLimit(clampInt(v, 1, 50, 10));
          },
        }),
        el(Button, { variant: "secondary", onClick: onRefresh, isBusy: analyticsLoading }, "Обновить"),
        el(Button, { variant: "tertiary", onClick: onClear, isBusy: analyticsLoading }, "Очистить")
      ),
      analyticsLoading && el(Spinner, null),
      analytics &&
        el(
          "div",
          { className: "bss-stats" },
          el(StatCard, { label: "Всего поисков", value: String(analytics.summary.total_count || 0) }),
          el(StatCard, { label: "Уникальные запросы", value: String(analytics.summary.unique_queries || 0) }),
          el(StatCard, { label: "Без результатов", value: String(analytics.summary.no_results_count || 0) }),
          el(StatCard, {
            label: "Среднее результатов",
            value: String(Math.round((Number(analytics.summary.avg_results) || 0) * 10) / 10),
          })
        ),
      analytics &&
        el(
          Card,
          null,
          el(
            CardBody,
            null,
            el("h3", { className: "bss-card-title" }, "Последние запросы"),
            el(Table, {
              rows: analytics.recent || [],
              columns: [
                { key: "created_at", label: "Время" },
                { key: "query", label: "Запрос" },
                { key: "results_count", label: "Результатов" },
                { key: "context", label: "Контекст" },
              ],
              emptyText: "Пока нет данных (или логирование выключено).",
            })
          )
        )
    );
  }

  function ToolsStatusPage(props) {
    var status = props.status;
    var statusLoading = props.statusLoading;
    var onRefresh = props.onRefresh;
    var onCopyReport = props.onCopyReport;
    var navigate = props.navigate;
    var benchmarkQuery = props.benchmarkQuery;
    var setBenchmarkQuery = props.setBenchmarkQuery;
    var benchmarkLoading = props.benchmarkLoading;
    var benchmarkResult = props.benchmarkResult;
    var onBenchmark = props.onBenchmark;

    var _useStateShowRaw = useState(false),
      showRaw = _useStateShowRaw[0],
      setShowRaw = _useStateShowRaw[1];

    function buildChecks() {
      if (!status) return [];

      var checks = [];
      var wcActive = !!(status.woo && status.woo.active);
      var themeTemplate = status.theme && (status.theme.template || status.theme.stylesheet) ? String(status.theme.template || status.theme.stylesheet) : "";
      var isBetheme = /betheme/i.test(themeTemplate);
      var products = status.catalog && typeof status.catalog.products === "number" ? status.catalog.products : 0;
      var cachingEnabled = !!(status.plugin && status.plugin.caching && status.plugin.caching.enabled);
      var ttl = status.plugin && status.plugin.caching ? Number(status.plugin.caching.ttl) : null;
      var loggingEnabled = !!(status.plugin && status.plugin.logging && status.plugin.logging.enabled);
      var liveEnabled = !!(status.plugin && status.plugin.live_search && status.plugin.live_search.enabled);
      var debounce = status.plugin && status.plugin.live_search ? Number(status.plugin.live_search.debounce) : null;
      var liveMax = status.plugin && status.plugin.live_search ? Number(status.plugin.live_search.max_results) : null;
      var features = status.plugin && status.plugin.features ? status.plugin.features : {};
      var metaKeys = status.plugin && status.plugin.meta_keys ? status.plugin.meta_keys : {};
      var layoutPageId = features && typeof features.results_layout_page_id === "number" ? features.results_layout_page_id : Number(features.results_layout_page_id || 0);

      checks.push({
        level: wcActive ? "success" : "warning",
        title: "WooCommerce",
        message: wcActive ? "WooCommerce активен." : "WooCommerce не активен - поиск товаров будет ограничен.",
      });

      checks.push({
        level: isBetheme ? "success" : "info",
        title: "Тема Betheme",
        message: isBetheme ? "Betheme обнаружена." : "Betheme не обнаружена (плагин может работать и с другими темами).",
      });

      checks.push({
        level: products >= 1 ? "success" : "warning",
        title: "Каталог товаров",
        message: products >= 1 ? "Товаров в каталоге: " + products : "Нет опубликованных товаров.",
      });

      checks.push({
        level: liveEnabled ? "success" : "warning",
        title: "Живой поиск",
        message: liveEnabled ? "Живой поиск включен." : "Живой поиск выключен.",
      });

      if (liveEnabled) {
        var debounceOk = isFinite(debounce) && debounce >= 100 && debounce <= 1200;
        checks.push({
          level: debounceOk ? "success" : "warning",
          title: "Задержка (debounce)",
          message: debounceOk ? "Debounce: " + debounce + " мс." : "Debounce выглядит странно. Рекомендуем 200-500 мс.",
        });

        var maxOk = isFinite(liveMax) && liveMax >= 1 && liveMax <= 20;
        checks.push({
          level: maxOk ? "success" : "warning",
          title: "Лимит live результатов",
          message: maxOk ? "Live results: " + liveMax : "Лимит результатов выглядит странно.",
        });
      }

      if (metaKeys && typeof metaKeys.count === "number") {
        checks.push({
          level: metaKeys.count >= 1 ? "success" : "warning",
          title: "Поиск по метаполям",
          message: "Meta keys: " + String(metaKeys.count) + (metaKeys.has_sku ? " (включая _sku)" : ""),
        });
      }

      if (products >= 500) {
        checks.push({
          level: cachingEnabled ? "success" : "warning",
          title: "Кеширование",
          message: cachingEnabled ? "Кеширование включено (ускоряет live search)." : "Рекомендуется включить кеширование для скорости на большом каталоге.",
        });
      } else {
        checks.push({
          level: cachingEnabled ? "success" : "info",
          title: "Кеширование",
          message: cachingEnabled ? "Кеширование включено." : "Кеширование выключено (можно включить при росте каталога).",
        });
      }

      if (cachingEnabled) {
        var ttlOk = isFinite(ttl) && ttl >= 60 && ttl <= 86400;
        checks.push({
          level: ttlOk ? "success" : "warning",
          title: "TTL кеша",
          message: ttlOk ? "TTL: " + ttl + " сек." : "TTL выглядит странно. Рекомендуем 300-3600 сек.",
        });
      }

      checks.push({
        level: loggingEnabled ? "success" : "info",
        title: "Аналитика запросов",
        message: loggingEnabled ? "Логирование включено." : "Логирование выключено (можно включить для аналитики).",
      });

      checks.push({
        level: features && features.shop_style_results ? "success" : "warning",
        title: "Результаты как магазин",
        message: features && features.shop_style_results ? "Результаты отображаются в стиле магазина." : "Рекомендуем включить «Результаты как магазин».",
      });

      checks.push({
        level: layoutPageId > 0 ? "success" : "info",
        title: "Страница макета результатов",
        message: layoutPageId > 0 ? "Макет результатов: page_id=" + String(layoutPageId) : "Макет результатов не задан (можно назначить BeBuilder-страницу).",
      });

      checks.push({
        level: features && features.redirect_exact_match_to_product ? "success" : "info",
        title: "Редирект по точному совпадению",
        message: features && features.redirect_exact_match_to_product ? "Включен редирект на товар при точном совпадении артикула." : "Редирект по точному совпадению выключен.",
      });

      return checks;
    }

    function row(label, value) {
      return { label: label, value: value == null ? "" : String(value) };
    }

    return el(
      Fragment,
      null,
      el(SectionTitle, null, "Инструменты"),
      el(Tabs, {
        active: "/tools/status",
        navigate: navigate,
        tabs: [
          { to: "/tools/status", label: "Состояние" },
          { to: "/tools/test-query", label: "Тест запроса" },
        ],
      }),
      el(
        Flex,
        { justify: "flex-end", align: "flex-end", style: { marginBottom: "12px" } },
        el(
          Flex,
          { gap: 10, justify: "flex-end", align: "flex-end", className: "bss-page-actions" },
          el(Button, { variant: "secondary", onClick: onRefresh, isBusy: statusLoading }, "Обновить"),
          el(Button, { variant: "tertiary", onClick: onCopyReport, disabled: !status }, "Скопировать отчет"),
          el(Button, { variant: "tertiary", onClick: function () { return setShowRaw(!showRaw); }, disabled: !status }, showRaw ? "Скрыть JSON" : "Показать JSON")
        )
      ),
      statusLoading && el(Spinner, null),
      status &&
        el(
          Fragment,
          null,
          el(
            Card,
            null,
            el(
              CardBody,
              null,
              el("h3", { className: "bss-card-title" }, "Проверки"),
              el(
                "div",
                { className: "bss-checks" },
                buildChecks().map(function (c, idx) {
                  return el(
                    "div",
                    { key: idx, className: "bss-check bss-check-" + c.level },
                    el("div", { className: "bss-check-title" }, c.title),
                    el("div", { className: "bss-check-message" }, c.message)
                  );
                })
              )
            )
          ),
          showRaw &&
            el(
              Card,
              null,
              el(
                CardBody,
                null,
                el("h3", { className: "bss-card-title" }, "Отчет (JSON)"),
                el("pre", { className: "bss-json" }, safeJson(status))
              )
            ),
          el(
            Card,
            null,
            el(
              CardBody,
              null,
              el("h3", { className: "bss-card-title" }, "Быстрый тест скорости"),
              el(
                Flex,
                { gap: 10, align: "flex-end" },
                el(TextControl, {
                  label: "Тестовый запрос",
                  value: benchmarkQuery,
                  onChange: setBenchmarkQuery,
                  help: "Введите артикул или слово и нажмите «Запустить».",
                }),
                el(Button, { variant: "secondary", onClick: onBenchmark, isBusy: benchmarkLoading, disabled: benchmarkLoading }, "Запустить")
              ),
              benchmarkResult &&
                el(
                  "div",
                  { className: "bss-benchmark" },
                  el("div", { className: "bss-benchmark-row" }, "admin/status: " + String(benchmarkResult.status_ms) + " мс"),
                  el("div", { className: "bss-benchmark-row" }, "admin/test-query: " + String(benchmarkResult.test_query_ms) + " мс"),
                  el("div", { className: "bss-benchmark-row" }, "public/query: " + String(benchmarkResult.public_query_ms) + " мс")
                )
            )
          ),
          el(
            Flex,
            { gap: 12, align: "stretch", wrap: true },
            el(
              FlexBlock,
              null,
              el(
                Card,
                null,
                el(
                  CardBody,
                  null,
                  el("h3", { className: "bss-card-title" }, "WordPress / PHP"),
                  el(Table, {
                    rows: [
                      row("WP версия", status.wp && status.wp.version),
                      row("Локаль", status.wp && status.wp.locale),
                      row("Multisite", status.wp && status.wp.multisite ? "Да" : "Нет"),
                      row("PHP версия", status.php && status.php.version),
                    ],
                    columns: [
                      { key: "label", label: "Параметр" },
                      { key: "value", label: "Значение" },
                    ],
                    emptyText: "Нет данных.",
                  })
                )
              )
            ),
            el(
              FlexBlock,
              null,
              el(
                Card,
                null,
                el(
                  CardBody,
                  null,
                  el("h3", { className: "bss-card-title" }, "WooCommerce / Каталог"),
                  el(Table, {
                    rows: [
                      row("WooCommerce", status.woo && status.woo.active ? "Активен" : "Не активен"),
                      row("Woo версия", status.woo && status.woo.version),
                      row("Товаров", status.catalog && status.catalog.products),
                      row("Вариаций", status.catalog && status.catalog.variations),
                    ],
                    columns: [
                      { key: "label", label: "Параметр" },
                      { key: "value", label: "Значение" },
                    ],
                    emptyText: "Нет данных.",
                  })
                )
              )
            )
          ),
          el(
            Flex,
            { gap: 12, align: "stretch", wrap: true },
            el(
              FlexBlock,
              null,
              el(
                Card,
                null,
                el(
                  CardBody,
                  null,
                  el("h3", { className: "bss-card-title" }, "Тема"),
                  el(Table, {
                    rows: [
                      row("Название", status.theme && status.theme.name),
                      row("Версия", status.theme && status.theme.version),
                      row("Stylesheet", status.theme && status.theme.stylesheet),
                      row("Template", status.theme && status.theme.template),
                    ],
                    columns: [
                      { key: "label", label: "Параметр" },
                      { key: "value", label: "Значение" },
                    ],
                    emptyText: "Нет данных.",
                  })
                )
              )
            ),
            el(
              FlexBlock,
              null,
              el(
                Card,
                null,
                el(
                  CardBody,
                  null,
                  el("h3", { className: "bss-card-title" }, "Плагин"),
                  el(Table, {
                    rows: [
                      row("Версия", status.plugin && status.plugin.version),
                      row("Кеширование", status.plugin && status.plugin.caching && status.plugin.caching.enabled ? "Включено" : "Выключено"),
                      row("TTL (сек.)", status.plugin && status.plugin.caching && status.plugin.caching.ttl),
                      row("Логирование", status.plugin && status.plugin.logging && status.plugin.logging.enabled ? "Включено" : "Выключено"),
                    ],
                    columns: [
                      { key: "label", label: "Параметр" },
                      { key: "value", label: "Значение" },
                    ],
                    emptyText: "Нет данных.",
                  })
                )
              )
            )
          )
        )
    );
  }

  function ToolsTestQueryPage(props) {
    var testQuery = props.testQuery;
    var setTestQuery = props.setTestQuery;
    var testLoading = props.testLoading;
    var testResult = props.testResult;
    var onRun = props.onRun;
    var navigate = props.navigate;

    var _useStateShowDebug = useState(true),
      showDebug = _useStateShowDebug[0],
      setShowDebug = _useStateShowDebug[1];

    var _useStateShowSql = useState(false),
      showSql = _useStateShowSql[0],
      setShowSql = _useStateShowSql[1];

    return el(
      Fragment,
      null,
      el(SectionTitle, null, "Инструменты"),
      el(Tabs, {
        active: "/tools/test-query",
        navigate: navigate,
        tabs: [
          { to: "/tools/status", label: "Состояние" },
          { to: "/tools/test-query", label: "Тест запроса" },
        ],
      }),
      el(
        Card,
        null,
        el(
          CardBody,
          null,
          el(
            Flex,
            { gap: 10, align: "flex-end" },
            el(TextControl, {
              label: "Запрос",
              value: testQuery,
              onChange: function (v) {
                setTestQuery(v);
              },
            }),
            el(Button, { variant: "primary", onClick: onRun, isBusy: testLoading }, "Проверить")
          ),
          testLoading && el(Spinner, null),
          testResult &&
            el(
              Fragment,
              null,
              el(
                Flex,
                { gap: 10, justify: "flex-end", align: "flex-end", className: "bss-page-actions", style: { marginTop: "10px" } },
                el(Button, { variant: "tertiary", onClick: function () { return setShowDebug(!showDebug); } }, showDebug ? "Скрыть диагностику" : "Показать диагностику"),
                el(
                  Button,
                  {
                    variant: "tertiary",
                    onClick: function () {
                      copyToClipboard(safeJson(testResult)).then(function (ok) {
                        if (ok) {
                          window.alert("JSON скопирован.");
                        } else {
                          window.alert("Не удалось скопировать JSON.");
                        }
                      });
                    },
                  },
                  "Скопировать JSON"
                )
              ),
              showDebug &&
                el(
                  Fragment,
                  null,
                  el("h3", { className: "bss-card-title" }, "Диагностика"),
                  el(Table, {
                    rows: [
                      {
                        label: "Total (ms)",
                        value: testResult.debug && testResult.debug.timing_ms ? testResult.debug.timing_ms.total : "",
                      },
                      {
                        label: "WP_Query (ms)",
                        value: testResult.debug && testResult.debug.timing_ms ? testResult.debug.timing_ms.wp_query : "",
                      },
                      {
                        label: "Loop (ms)",
                        value: testResult.debug && testResult.debug.timing_ms ? testResult.debug.timing_ms.loop : "",
                      },
                      {
                        label: "Found posts",
                        value: testResult.debug ? testResult.debug.found_posts : "",
                      },
                      {
                        label: "Returned",
                        value: testResult.debug ? testResult.debug.products_returned : "",
                      },
                      {
                        label: "Meta keys",
                        value: testResult.debug && testResult.debug.meta_keys ? testResult.debug.meta_keys.count : "",
                      },
                      {
                        label: "Meta clauses",
                        value: testResult.debug && testResult.debug.meta_query ? testResult.debug.meta_query.clauses : "",
                      },
                      {
                        label: "Exact SKU match",
                        value:
                          testResult.debug && testResult.debug.exact_match && testResult.debug.exact_match.id
                            ? String(testResult.debug.exact_match.id)
                            : "—",
                      },
                    ],
                    columns: [
                      { key: "label", label: "Параметр" },
                      { key: "value", label: "Значение" },
                    ],
                    emptyText: "Нет данных.",
                  }),
                  testResult.debug &&
                    testResult.debug.exact_match &&
                    testResult.debug.exact_match.url &&
                    el("p", { style: { marginTop: "10px" } }, el("a", { href: testResult.debug.exact_match.url, target: "_blank", rel: "noreferrer" }, "Открыть товар по точному совпадению")),
                  testResult.debug &&
                    testResult.debug.meta_keys &&
                    Array.isArray(testResult.debug.meta_keys.keys) &&
                    el(
                      Fragment,
                      null,
                      el("h3", { className: "bss-card-title" }, "Meta keys (первые 30)"),
                      el(
                        "div",
                        { className: "bss-chips" },
                        testResult.debug.meta_keys.keys.map(function (k, idx) {
                          return el("span", { key: idx, className: "bss-chip" }, k);
                        })
                      )
                    ),
                  testResult.debug &&
                    typeof testResult.debug.sql === "string" &&
                    el(
                      Fragment,
                      null,
                      el(
                        Flex,
                        { justify: "flex-end", align: "flex-end", style: { marginTop: "8px" } },
                        el(Button, { variant: "tertiary", onClick: function () { return setShowSql(!showSql); } }, showSql ? "Скрыть SQL" : "Показать SQL")
                      ),
                      showSql && el("pre", { className: "bss-json" }, testResult.debug.sql)
                    )
                ),
              el("h3", { className: "bss-card-title" }, "Варианты запроса"),
              el(
                "div",
                { className: "bss-chips" },
                (testResult.variants || []).map(function (v, idx) {
                  return el("span", { key: idx, className: "bss-chip" }, v);
                })
              ),
              el("h3", { className: "bss-card-title" }, "Найденные товары"),
              el(Table, {
                rows: testResult.products || [],
                columns: [
                  { key: "id", label: "ID" },
                  { key: "title", label: "Товар" },
                  { key: "sku", label: "SKU" },
                  { key: "price", label: "Цена" },
                ],
                emptyText: "Товары не найдены.",
              })
            )
        )
      )
    );
  }

  function App() {
    var router = useHashLocation();

    var _useState = useState(true),
      isLoading = _useState[0],
      setIsLoading = _useState[1];

    var _useState2 = useState(false),
      isSaving = _useState2[0],
      setIsSaving = _useState2[1];

    var _useState3 = useState([]),
      toasts = _useState3[0],
      setToasts = _useState3[1];

    var _useState4 = useState(null),
      data = _useState4[0],
      setData = _useState4[1];

    var _useState5 = useState(null),
      options = _useState5[0],
      setOptions = _useState5[1];

    var savedSnapshotRef = useRef("{}");
    var toastTimersRef = useRef({});

    function clearToasts() {
      setToasts(function (prev) {
        (prev || []).forEach(function (t) {
          if (t && t.id && toastTimersRef.current[t.id]) {
            window.clearTimeout(toastTimersRef.current[t.id]);
            delete toastTimersRef.current[t.id];
          }
        });
        return [];
      });
    }

    function pushToast(status, message, opts) {
      var id = String(Date.now()) + "-" + String(Math.random()).slice(2, 8);
      var ttl = opts && typeof opts.ttl === "number" ? opts.ttl : null;

      setToasts(function (prev) {
        var next = (prev || []).slice(-2);
        next.push({ id: id, status: status || "info", message: String(message || "") });
        return next;
      });

      if (ttl != null && isFinite(ttl) && ttl > 0) {
        toastTimersRef.current[id] = window.setTimeout(function () {
          setToasts(function (prev) {
            return (prev || []).filter(function (t) {
              return t && t.id !== id;
            });
          });
          delete toastTimersRef.current[id];
        }, ttl);
      }
    }

    var _useStateNav = useState(function () {
      try {
        return window.localStorage.getItem("bss_nav_collapsed") === "1";
      } catch (e) {
        return false;
      }
    }),
      isNavCollapsed = _useStateNav[0],
      setIsNavCollapsed = _useStateNav[1];

    var pages = useMemo(function () {
      return data && data.pages ? data.pages : [{ value: 0, label: "— Отключено —" }];
    }, [data]);

    var isDirty = useMemo(function () {
      if (!options) return false;
      return safeJson(options) !== savedSnapshotRef.current;
    }, [options]);

    var lastPathRef = useRef(router.path);
    var allowHashChangeRef = useRef(null);

    useEffect(function () {
      lastPathRef.current = router.path;
    }, [router.path]);

    useEffect(function () {
      function beforeUnload(e) {
        if (!isDirty) return;
        e.preventDefault();
        e.returnValue = "";
        return "";
      }

      window.addEventListener("beforeunload", beforeUnload);
      return function () {
        window.removeEventListener("beforeunload", beforeUnload);
      };
    }, [isDirty]);

    useEffect(function () {
      function normalizePathFromHash() {
        var raw = typeof window.location.hash === "string" ? window.location.hash.replace(/^#/, "") : "";
        var next = raw || "/dashboard";
        if (next.charAt(0) !== "/") next = "/" + next;
        return next;
      }

      function onHashChange() {
        var next = normalizePathFromHash();

        if (allowHashChangeRef.current === next) {
          allowHashChangeRef.current = null;
          return;
        }

        if (!isDirty) return;
        if (next === lastPathRef.current) return;

        var ok = window.confirm("Есть несохранённые изменения. Перейти без сохранения?");
        if (ok) return;

        allowHashChangeRef.current = lastPathRef.current;
        window.location.hash = lastPathRef.current;
      }

      window.addEventListener("hashchange", onHashChange);
      return function () {
        window.removeEventListener("hashchange", onHashChange);
      };
    }, [isDirty]);

    function guardedNavigate(nextPath) {
      if (!nextPath) return;

      var normalized = nextPath.charAt(0) === "/" ? nextPath : "/" + nextPath;
      if (normalized === router.path) return;

      if (isDirty) {
        var ok = window.confirm("Есть несохранённые изменения. Перейти без сохранения?");
        if (!ok) return;
      }

      allowHashChangeRef.current = normalized;
      router.navigate(normalized);
    }

    function toggleNav() {
      setIsNavCollapsed(function (prev) {
        var next = !prev;
        try {
          window.localStorage.setItem("bss_nav_collapsed", next ? "1" : "0");
        } catch (e) {
          // ignore
        }
        return next;
      });
    }

    var _useStateNavFilter = useState(""),
      navFilter = _useStateNavFilter[0],
      setNavFilter = _useStateNavFilter[1];

    useEffect(function () {
      function onKeyDown(e) {
        if (!e) return;
        if (!isDirty) return;

        var key = String(e.key || "").toLowerCase();
        var isSave = key === "s" && (e.ctrlKey || e.metaKey);
        if (!isSave) return;

        e.preventDefault();
        if (isSaving) return;
        save();
      }

      window.addEventListener("keydown", onKeyDown);
      return function () {
        window.removeEventListener("keydown", onKeyDown);
      };
    }, [isDirty, isSaving, options]);

    function updateOption(key, value) {
      setOptions(function (prev) {
        var next = Object.assign({}, prev || {});
        next[key] = value;
        return next;
      });
    }

    // Analytics
    var _useState6 = useState(30),
      analyticsDays = _useState6[0],
      setAnalyticsDays = _useState6[1];

    var _useState7 = useState(10),
      analyticsLimit = _useState7[0],
      setAnalyticsLimit = _useState7[1];

    var _useState8 = useState(null),
      analytics = _useState8[0],
      setAnalytics = _useState8[1];

    var _useState9 = useState(false),
      analyticsLoading = _useState9[0],
      setAnalyticsLoading = _useState9[1];

    function loadAnalytics() {
      setAnalyticsLoading(true);
      apiFetch({
        path:
          bethemeSmartSearchAdmin.rest_path +
          "/analytics?days=" +
          encodeURIComponent(analyticsDays) +
          "&limit=" +
          encodeURIComponent(analyticsLimit),
      })
        .then(function (res) {
          setAnalytics(res || null);
        })
        .catch(function (err) {
          pushToast("error", (err && err.message) || "Не удалось загрузить аналитику.", { ttl: 8000 });
        })
        .finally(function () {
          setAnalyticsLoading(false);
        });
    }

    function clearAnalytics() {
      if (!window.confirm("Очистить историю поисков?")) return;
      setAnalyticsLoading(true);
      apiFetch({ path: bethemeSmartSearchAdmin.rest_path + "/analytics/clear", method: "POST" })
        .then(function () {
          pushToast("success", "Аналитика очищена.", { ttl: 4000 });
          setAnalytics(null);
          loadAnalytics();
        })
        .catch(function (err) {
          pushToast("error", (err && err.message) || "Не удалось очистить аналитику.", { ttl: 8000 });
        })
        .finally(function () {
          setAnalyticsLoading(false);
        });
    }

    // Tools: status
    var _useStateStatus = useState(null),
      status = _useStateStatus[0],
      setStatus = _useStateStatus[1];

    var _useStateStatusLoading = useState(false),
      statusLoading = _useStateStatusLoading[0],
      setStatusLoading = _useStateStatusLoading[1];

    function loadStatus() {
      setStatusLoading(true);
      apiFetch({ path: bethemeSmartSearchAdmin.rest_path + "/status" })
        .then(function (res) {
          setStatus(res || null);
        })
        .catch(function (err) {
          pushToast("error", (err && err.message) || "Не удалось загрузить состояние.", { ttl: 8000 });
        })
        .finally(function () {
          setStatusLoading(false);
        });
    }

    function copyStatusReport() {
      if (!status) {
        pushToast("warning", "Нет данных для копирования. Сначала нажмите «Обновить».", { ttl: 5000 });
        return;
      }

      var report = safeJson(status);
      copyToClipboard(report).then(function (ok) {
        if (ok) {
          pushToast("success", "Отчет скопирован в буфер обмена.", { ttl: 4000 });
        } else {
          pushToast("error", "Не удалось скопировать отчет. Попробуйте открыть JSON и скопировать вручную.", { ttl: 8000 });
        }
      });
    }

    var _useStateBenchmarkQuery = useState(""),
      benchmarkQuery = _useStateBenchmarkQuery[0],
      setBenchmarkQuery = _useStateBenchmarkQuery[1];

    var _useStateBenchmarkLoading = useState(false),
      benchmarkLoading = _useStateBenchmarkLoading[0],
      setBenchmarkLoading = _useStateBenchmarkLoading[1];

    var _useStateBenchmarkResult = useState(null),
      benchmarkResult = _useStateBenchmarkResult[0],
      setBenchmarkResult = _useStateBenchmarkResult[1];

    function timedFetch(path) {
      var started = window.performance && performance.now ? performance.now() : Date.now();
      return apiFetch({ path: path })
        .then(function (res) {
          var ended = window.performance && performance.now ? performance.now() : Date.now();
          return { ok: true, ms: Math.round(ended - started), res: res };
        })
        .catch(function (err) {
          var endedErr = window.performance && performance.now ? performance.now() : Date.now();
          return { ok: false, ms: Math.round(endedErr - started), err: err };
        });
    }

    function runBenchmark() {
      var q = String(benchmarkQuery || "").trim();
      if (!q) {
        pushToast("warning", "Введите тестовый запрос.", { ttl: 5000 });
        return;
      }

      setBenchmarkLoading(true);
      setBenchmarkResult(null);

      Promise.resolve()
        .then(function () {
          return timedFetch(bethemeSmartSearchAdmin.rest_path + "/status");
        })
        .then(function (statusRes) {
          return timedFetch(bethemeSmartSearchAdmin.rest_path + "/test-query?q=" + encodeURIComponent(q) + "&limit=10")
            .then(function (testRes) {
              return { statusRes: statusRes, testRes: testRes };
            });
        })
        .then(function (pack) {
          return timedFetch(String(bethemeSmartSearchAdmin.public_rest_path || "/betheme-smart-search/v1/query") + "?q=" + encodeURIComponent(q) + "&context=shop&limit=10")
            .then(function (publicRes) {
              return { statusRes: pack.statusRes, testRes: pack.testRes, publicRes: publicRes };
            });
        })
        .then(function (pack) {
          setBenchmarkResult({
            status_ms: pack.statusRes.ms,
            test_query_ms: pack.testRes.ms,
            public_query_ms: pack.publicRes.ms,
          });

          if (!pack.statusRes.ok || !pack.testRes.ok || !pack.publicRes.ok) {
            pushToast("warning", "Тест выполнен, но один из запросов вернул ошибку. Смотри консоль/Network.", { ttl: 8000 });
          } else {
            pushToast("success", "Тест скорости выполнен.", { ttl: 3000 });
          }
        })
        .catch(function () {
          pushToast("error", "Не удалось выполнить тест скорости.", { ttl: 8000 });
        })
        .finally(function () {
          setBenchmarkLoading(false);
        });
    }

    // Tools: test query
    var _useState10 = useState(""),
      testQuery = _useState10[0],
      setTestQuery = _useState10[1];

    var _useState11 = useState(false),
      testLoading = _useState11[0],
      setTestLoading = _useState11[1];

    var _useState12 = useState(null),
      testResult = _useState12[0],
      setTestResult = _useState12[1];

    function runTestQuery() {
      var q = (testQuery || "").trim();
      if (!q) return;
      setTestLoading(true);
      apiFetch({
        path:
          bethemeSmartSearchAdmin.rest_path +
          "/test-query?q=" +
          encodeURIComponent(q) +
          "&limit=10",
      })
        .then(function (res) {
          setTestResult(res || null);
        })
        .catch(function (err) {
          pushToast("error", (err && err.message) || "Не удалось выполнить тест.", { ttl: 8000 });
        })
        .finally(function () {
          setTestLoading(false);
        });
    }

    useEffect(function () {
      apiFetch({ path: bethemeSmartSearchAdmin.rest_path + "/settings" })
        .then(function (res) {
          setData(res);
          setOptions(res.options || {});
          savedSnapshotRef.current = safeJson(res.options || {});
        })
        .catch(function (err) {
          pushToast("error", (err && err.message) || "Не удалось загрузить настройки.", { ttl: 8000 });
        })
        .finally(function () {
          setIsLoading(false);
        });
    }, []);

    useEffect(function () {
      // Lazy-load analytics when user opens dashboard/analytics.
      if (analytics) return;
      if (!startsWith(router.path, "/dashboard") && !startsWith(router.path, "/analytics")) return;
      loadAnalytics();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.path]);

    useEffect(function () {
      if (!startsWith(router.path, "/tools/status")) return;
      if (statusLoading) return;
      if (status) return;
      loadStatus();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.path]);

    function save() {
      if (!options) return;
      setIsSaving(true);
      clearToasts();

      apiFetch({
        path: bethemeSmartSearchAdmin.rest_path + "/settings",
        method: "POST",
        data: { options: options },
      })
        .then(function (res) {
          var next = (res && res.options) || options;
          setOptions(next);
          savedSnapshotRef.current = safeJson(next);
          pushToast("success", "Настройки сохранены.", { ttl: 4000 });
        })
        .catch(function (err) {
          pushToast("error", (err && err.message) || "Не удалось сохранить настройки.", { ttl: 8000 });
        })
        .finally(function () {
          setIsSaving(false);
        });
    }

    function resetToDefaults() {
      if (!window.confirm("Сбросить настройки к значениям по умолчанию?")) return;
      setIsSaving(true);
      clearToasts();

      apiFetch({ path: bethemeSmartSearchAdmin.rest_path + "/reset", method: "POST" })
        .then(function (res) {
          var next = (res && res.options) || {};
          setOptions(next);
          savedSnapshotRef.current = safeJson(next);
          pushToast("success", "Настройки сброшены.", { ttl: 4000 });
        })
        .catch(function (err) {
          pushToast("error", (err && err.message) || "Не удалось сбросить настройки.", { ttl: 8000 });
        })
        .finally(function () {
          setIsSaving(false);
        });
    }

    function clearCache() {
      if (!window.confirm("Очистить кеш плагина?")) return;

      setIsSaving(true);
      clearToasts();

      apiFetch({ path: bethemeSmartSearchAdmin.rest_path + "/clear-cache", method: "POST" })
        .then(function () {
          pushToast("success", "Кеш очищен.", { ttl: 4000 });
        })
        .catch(function (err) {
          pushToast("error", (err && err.message) || "Не удалось очистить кеш.", { ttl: 8000 });
        })
        .finally(function () {
          setIsSaving(false);
        });
    }

    var nav = NAV_ITEMS;

    var filteredNav = useMemo(function () {
      var q = String(navFilter || "").trim().toLowerCase();
      if (!q) return nav;

      var next = [];
      var pendingHeader = null;

      nav.forEach(function (item) {
        if (item.type === "header") {
          pendingHeader = item;
          return;
        }

        var label = String(item.label || "").toLowerCase();
        if (label.indexOf(q) === -1) return;

        if (pendingHeader) {
          next.push(pendingHeader);
          pendingHeader = null;
        }
        next.push(item);
      });

      return next;
    }, [navFilter]);

    if (isLoading || !options) {
      return el("div", { className: "bss-app" }, el(Flex, { justify: "center" }, el(Spinner, null)));
    }

    function renderRoute() {
      if (startsWith(router.path, "/dashboard")) {
        return el(DashboardPage, {
          analytics: analytics,
          analyticsLoading: analyticsLoading,
          onRefresh: loadAnalytics,
          days: analyticsDays,
          setDays: setAnalyticsDays,
        });
      }

      if (startsWith(router.path, "/settings/general")) {
        return el(SettingsGeneralPage, { options: options, updateOption: updateOption, pages: pages, navigate: guardedNavigate });
      }

      if (startsWith(router.path, "/settings/live-search")) {
        return el(SettingsLiveSearchPage, { options: options, updateOption: updateOption, navigate: guardedNavigate });
      }

      if (startsWith(router.path, "/settings/dictionaries")) {
        return el(SettingsDictionariesPage, { options: options, updateOption: updateOption, navigate: guardedNavigate });
      }

      if (startsWith(router.path, "/analytics")) {
        return el(AnalyticsOverviewPage, {
          analytics: analytics,
          analyticsLoading: analyticsLoading,
          onRefresh: loadAnalytics,
          onClear: clearAnalytics,
          days: analyticsDays,
          setDays: setAnalyticsDays,
          limit: analyticsLimit,
          setLimit: setAnalyticsLimit,
          navigate: guardedNavigate,
        });
      }

      if (startsWith(router.path, "/tools/status")) {
        return el(ToolsStatusPage, {
          status: status,
          statusLoading: statusLoading,
          onRefresh: loadStatus,
          onCopyReport: copyStatusReport,
          navigate: guardedNavigate,
          benchmarkQuery: benchmarkQuery,
          setBenchmarkQuery: setBenchmarkQuery,
          benchmarkLoading: benchmarkLoading,
          benchmarkResult: benchmarkResult,
          onBenchmark: runBenchmark,
        });
      }

      if (startsWith(router.path, "/tools/test-query")) {
        return el(ToolsTestQueryPage, {
          testQuery: testQuery,
          setTestQuery: setTestQuery,
          testLoading: testLoading,
          testResult: testResult,
          onRun: runTestQuery,
          navigate: guardedNavigate,
        });
      }

      return el(DashboardPage, {
        analytics: analytics,
        analyticsLoading: analyticsLoading,
        onRefresh: loadAnalytics,
        days: analyticsDays,
        setDays: setAnalyticsDays,
      });
    }

    return el(
      "div",
      { className: "bss-app bss-shell" },
      el(
        "div",
        { className: "bss-topbar" },
        el("div", { className: "bss-topbar-title" }, "BeTheme Smart Search"),
        el(
          "div",
          { className: "bss-topbar-actions" },
          isDirty && el("span", { className: "bss-dirty" }, "Есть несохранённые изменения"),
          el(
            Button,
            { variant: "secondary", onClick: toggleNav, disabled: isSaving, className: "bss-nav-toggle" },
            isNavCollapsed ? "Показать меню" : "Скрыть меню"
          ),
          el(Button, { variant: "secondary", onClick: clearCache, isBusy: isSaving }, "Очистить кеш"),
          el(Button, { variant: "secondary", onClick: resetToDefaults, isBusy: isSaving }, "Сброс"),
          el(Button, { variant: "primary", onClick: save, isBusy: isSaving, disabled: isSaving || !isDirty }, "Сохранить")
        )
      ),
      el(
        "div",
        { className: "bss-body" + (isNavCollapsed ? " is-nav-collapsed" : "") },
        el(
          "nav",
          { className: "bss-nav", "aria-label": "Навигация" },
          !isNavCollapsed &&
            el(TextControl, {
              label: "Поиск по меню",
              value: navFilter,
              onChange: setNavFilter,
            }),
          filteredNav.map(function (item, idx) {
            if (item.type === "header") {
              return !isNavCollapsed ? el(NavHeader, { key: "h-" + idx }, item.label) : null;
            }

            return el(NavLink, {
              key: item.to,
              to: item.to,
              isActive: startsWith(router.path, item.activePrefix || item.to),
              label: item.label,
              abbr: makeNavAbbr(item.label),
              onClick: guardedNavigate,
            });
          })
        ),
        el("main", { className: "bss-main" }, renderRoute())
      ),
      toasts &&
        toasts.length > 0 &&
        el(
          "div",
          { className: "bss-toasts", role: "status", "aria-live": "polite" },
          toasts.map(function (t) {
            return el(
              Notice,
              {
                key: t.id,
                status: t.status,
                isDismissible: true,
                onRemove: function () {
                  setToasts(function (prev) {
                    return (prev || []).filter(function (x) {
                      return x && x.id !== t.id;
                    });
                  });
                },
              },
              t.message
            );
          })
        )
    );
  }

  wp.element.render(el(Fragment, null, el(App, null)), document.getElementById("betheme-smart-search-admin-app"));
})();
