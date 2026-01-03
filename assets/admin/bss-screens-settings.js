/* global window */
(function (root) {
  if (!root || !root.wp || !root.wp.element) return;

  var BSS = root.BSSAdmin || (root.BSSAdmin = {});
  var ui = BSS.ui || (BSS.ui = {});
  var screens = ui.screens || (ui.screens = {});
  var env = ui.screensEnv;
  if (!env) return;

  var element = env.element;
  var el = env.el;
  var Fragment = env.Fragment;
  var useEffect = env.useEffect;
  var useMemo = env.useMemo;
  var useState = env.useState;

  var Button = env.Button;
  var Card = env.Card;
  var CardBody = env.CardBody;
  var CheckboxControl = env.CheckboxControl;
  var Flex = env.Flex;
  var FlexBlock = env.FlexBlock;
  var PanelBody = env.PanelBody;
  var Spinner = env.Spinner;
  var TextControl = env.TextControl;
  var TextareaControl = env.TextareaControl;
  var ToggleControl = env.ToggleControl;
  var SelectControl = env.SelectControl;

  var SectionTitle = env.SectionTitle;
  var HelpText = env.HelpText;
  var StatCard = env.StatCard;
  var Table = env.Table;
  var Tabs = env.Tabs;

  var clampInt = env.clampInt;
  var safeJson = env.safeJson;
  var copyToClipboard = env.copyToClipboard;
  var ensureArray = env.ensureArray;
  var normalizeEnginesForUI = env.normalizeEnginesForUI;
  var normalizeEngineId = env.normalizeEngineId;
  var normalizeEngineRecord = env.normalizeEngineRecord;
  var buildDefaultEngineFromOptions = env.buildDefaultEngineFromOptions;
  var engineIdList = env.engineIdList;
  var t = env.t;

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
      ? "\u041a\u043e\u043d\u0442\u0435\u043d\u0442 \u044d\u0442\u043e\u0439 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u044b (BeBuilder) \u0431\u0443\u0434\u0435\u0442 \u0432\u044b\u0432\u043e\u0434\u0438\u0442\u044c\u0441\u044f \u043d\u0430\u0434 \u0441\u043f\u0438\u0441\u043a\u043e\u043c \u0442\u043e\u0432\u0430\u0440\u043e\u0432 (WooCommerce) \u043d\u0430 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0435 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432."
      : "\u041a\u043e\u043d\u0442\u0435\u043d\u0442 \u044d\u0442\u043e\u0439 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u044b (BeBuilder) \u0431\u0443\u0434\u0435\u0442 \u0432\u044b\u0432\u043e\u0434\u0438\u0442\u044c\u0441\u044f \u0432 \u0448\u0430\u0431\u043b\u043e\u043d\u0435 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432 \u043f\u043e\u0438\u0441\u043a\u0430 \u043f\u043b\u0430\u0433\u0438\u043d\u0430.";

    return el(
      Fragment,
      null,
      el(SectionTitle, null, "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438"),
      el(Tabs, {
        active: "/settings/general",
        navigate: navigate,
        tabs: [
          { to: "/settings/general", label: "\u041e\u0431\u0449\u0435\u0435" },
          { to: "/settings/live-search", label: "\u0416\u0438\u0432\u043e\u0439 \u043f\u043e\u0438\u0441\u043a" },
          { to: "/settings/quality", label: "\u041a\u0430\u0447\u0435\u0441\u0442\u0432\u043e" },
          { to: "/settings/dictionaries", label: "\u0421\u043b\u043e\u0432\u0430\u0440\u0438" },
          { to: "/settings/engines", label: "Engines" },
        ],
      }),
      el(
        Card,
        null,
        el(
          CardBody,
          null,
          el(PanelBody, { title: "\u0420\u0435\u0436\u0438\u043c\u044b", initialOpen: true },
            el(ToggleControl, {
              label: "\u0421\u043e\u0445\u0440\u0430\u043d\u044f\u0442\u044c \u043f\u043e\u0432\u0435\u0434\u0435\u043d\u0438\u0435 \u043f\u043e\u0438\u0441\u043a\u0430 BeTheme",
              help: "\u0415\u0441\u043b\u0438 \u0432\u043a\u043b\u044e\u0447\u0435\u043d\u043e \u2014 \u0442\u0435\u043c\u0430 \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442 \u0443\u043f\u0440\u0430\u0432\u043b\u044f\u0442\u044c live search \u0438 \u0441\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u043d\u044b\u043c \u043f\u043e\u0438\u0441\u043a\u043e\u043c. \u041f\u043b\u0430\u0433\u0438\u043d \u0442\u043e\u043b\u044c\u043a\u043e \u0440\u0430\u0441\u0448\u0438\u0440\u044f\u0435\u0442 \u0432\u043e\u0437\u043c\u043e\u0436\u043d\u043e\u0441\u0442\u0438.",
              checked: !!options.preserve_betheme_search,
              onChange: function (v) {
                updateOption("preserve_betheme_search", v ? 1 : 0);
              },
            }),
            el(ToggleControl, {
              label: "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b \u043a\u0430\u043a \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0430 \u043c\u0430\u0433\u0430\u0437\u0438\u043d\u0430 (shop-style)",
              help: "\u041f\u043e\u0438\u0441\u043a \u0431\u0443\u0434\u0435\u0442 \u043f\u0435\u0440\u0435\u043d\u0430\u043f\u0440\u0430\u0432\u043b\u044f\u0442\u044c\u0441\u044f \u043d\u0430 `?post_type=product`, \u0438 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0443 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432 \u043e\u0442\u0440\u0438\u0441\u0443\u0435\u0442 WooCommerce/BeTheme.",
              checked: !!options.shop_style_results,
              onChange: function (v) {
                updateOption("shop_style_results", v ? 1 : 0);
              },
            }),
            el(ToggleControl, {
              label: "\u0415\u0441\u043b\u0438 \u0432\u0432\u0435\u0434\u0451\u043d \u0430\u0440\u0442\u0438\u043a\u0443\u043b \u2014 \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u0442\u043e\u0432\u0430\u0440 (Enter)",
              help: "\u0415\u0441\u043b\u0438 \u0437\u0430\u043f\u0440\u043e\u0441 \u0441\u043e\u0432\u043f\u0430\u043b \u0440\u043e\u0432\u043d\u043e \u0441 \u043e\u0434\u043d\u0438\u043c SKU/\u0448\u0442\u0440\u0438\u0445\u043a\u043e\u0434\u043e\u043c/\u0432\u0430\u0440\u0438\u0430\u0446\u0438\u0435\u0439 \u2014 \u0432\u043c\u0435\u0441\u0442\u043e \u0441\u043f\u0438\u0441\u043a\u0430 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432 \u043e\u0442\u043a\u0440\u043e\u0435\u0442\u0441\u044f \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0430 \u0442\u043e\u0432\u0430\u0440\u0430.",
              checked: !!options.redirect_exact_match_to_product,
              onChange: function (v) {
                updateOption("redirect_exact_match_to_product", v ? 1 : 0);
              },
            })
          ),
          el(PanelBody, { title: "\u041f\u043e\u0438\u0441\u043a \u0442\u043e\u0432\u0430\u0440\u043e\u0432 (WooCommerce)", initialOpen: false },
            el(ToggleControl, {
              label: "\u0418\u0441\u043a\u0430\u0442\u044c \u043f\u043e SKU/\u0448\u0442\u0440\u0438\u0445\u043a\u043e\u0434\u0443 \u043d\u0430 \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0435 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432",
              help: "\u0414\u043e\u0431\u0430\u0432\u043b\u044f\u0435\u0442 meta_query \u0434\u043b\u044f code-like \u0437\u0430\u043f\u0440\u043e\u0441\u043e\u0432 (\u0446\u0438\u0444\u0440\u044b/\u043b\u0430\u0442\u0438\u043d\u0438\u0446\u0430), \u0447\u0442\u043e\u0431\u044b \u0430\u0440\u0442\u0438\u043a\u0443\u043b\u044b \u043d\u0430\u0445\u043e\u0434\u0438\u043b\u0438 \u0442\u043e\u0432\u0430\u0440\u044b.",
              checked: !!options.enhance_shop_search_query,
              onChange: function (v) {
                updateOption("enhance_shop_search_query", v ? 1 : 0);
              },
            }),
            el(TextControl, {
              label: "Meta-\u043a\u043b\u044e\u0447\u0438 \u0434\u043b\u044f SKU/\u0448\u0442\u0440\u0438\u0445\u043a\u043e\u0434\u043e\u0432",
              help: "\u0427\u0435\u0440\u0435\u0437 \u0437\u0430\u043f\u044f\u0442\u0443\u044e. \u041f\u0440\u0438\u043c\u0435\u0440: _sku, _ean, _barcode, _gtin, _upc",
              value: metaKeysValue,
              onChange: function (v) {
                updateOption("product_meta_keys", v);
              },
            })
          ),
          el(PanelBody, { title: "BeBuilder (\u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0430-\u0448\u0430\u0431\u043b\u043e\u043d)", initialOpen: false },
            el(SelectControl, {
              label: "\u0421\u0442\u0440\u0430\u043d\u0438\u0446\u0430-\u0448\u0430\u0431\u043b\u043e\u043d",
              help: layoutHelp,
              disabled: !layoutSelectEnabled,
              value: options.results_layout_page_id || 0,
              options: pages,
              onChange: function (v) {
                updateOption("results_layout_page_id", parseInt(v, 10) || 0);
              },
            }),
            el(HelpText, null, "\u0428\u043e\u0440\u0442\u043a\u043e\u0434 (\u0434\u043b\u044f \u043a\u0430\u0441\u0442\u043e\u043c\u043d\u043e\u0433\u043e \u0448\u0430\u0431\u043b\u043e\u043d\u0430):"),
            el("code", { className: "bss-code" }, '[betheme_smart_search_results per_page="12"]')
          )
        )
      )
    );
  }
  screens.SettingsGeneralPage = SettingsGeneralPage;

  function SettingsLiveSearchPage(props) {
    var options = props.options;
    var updateOption = props.updateOption;
    var navigate = props.navigate;

    var _useStateLiveQ = useState("") , liveTestQuery = _useStateLiveQ[0], setLiveTestQuery = _useStateLiveQ[1];
    var _useStateLiveLoading = useState(false), liveTestLoading = _useStateLiveLoading[0], setLiveTestLoading = _useStateLiveLoading[1];
    var _useStateLiveResult = useState(null), liveTestResult = _useStateLiveResult[0], setLiveTestResult = _useStateLiveResult[1];

    return el(
      Fragment,
      null,
      el(SectionTitle, null, "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438"),
      el(Tabs, {
        active: "/settings/live-search",
        navigate: navigate,
        tabs: [
          { to: "/settings/general", label: "\u041e\u0431\u0449\u0435\u0435" },
          { to: "/settings/live-search", label: "\u0416\u0438\u0432\u043e\u0439 \u043f\u043e\u0438\u0441\u043a" },
          { to: "/settings/quality", label: "\u041a\u0430\u0447\u0435\u0441\u0442\u0432\u043e" },
          { to: "/settings/dictionaries", label: "\u0421\u043b\u043e\u0432\u0430\u0440\u0438" },
          { to: "/settings/engines", label: "Engines" },
        ],
      }),
      el(
        Card,
        null,
        el(
          CardBody,
          null,
          el(PanelBody, { title: "\u0416\u0438\u0432\u043e\u0439 \u043f\u043e\u0438\u0441\u043a", initialOpen: true },
            el(ToggleControl, {
              label: "REST endpoint \u0436\u0438\u0432\u043e\u0433\u043e \u043f\u043e\u0438\u0441\u043a\u0430 (\u043f\u043b\u0430\u0433\u0438\u043d)",
              checked: !!options.live_search_enabled,
              onChange: function (v) {
                updateOption("live_search_enabled", v ? 1 : 0);
              },
            }),
            el(SelectControl, {
              label: "\u0420\u0435\u0436\u0438\u043c \u043f\u043e\u0438\u0441\u043a\u0430 \u043f\u043e \u0430\u0440\u0442\u0438\u043a\u0443\u043b\u0443/\u0448\u0442\u0440\u0438\u0445\u043a\u043e\u0434\u0443",
              help: "\u0423\u043f\u0440\u0430\u0432\u043b\u044f\u0435\u0442 \u0442\u0435\u043c, \u043a\u0430\u043a \u043f\u043b\u0430\u0433\u0438\u043d \u0438\u0449\u0435\u0442 \u043f\u043e SKU/\u0448\u0442\u0440\u0438\u0445\u043a\u043e\u0434\u0430\u043c \u0432 meta \u043f\u043e\u043b\u044f\u0445: \u0442\u043e\u0447\u043d\u043e\u0435 \u0441\u043e\u0432\u043f\u0430\u0434\u0435\u043d\u0438\u0435, \u043f\u043e \u043d\u0430\u0447\u0430\u043b\u0443 \u0438\u043b\u0438 \u0432\u0445\u043e\u0436\u0434\u0435\u043d\u0438\u0435.",
              value: options.code_match_mode || "contains",
              options: [
                { value: "contains", label: "contains (\u0432\u0445\u043e\u0436\u0434\u0435\u043d\u0438\u0435)" },
                { value: "startswith", label: "startswith (\u043f\u043e \u043d\u0430\u0447\u0430\u043b\u0443)" },
                { value: "exact", label: "exact (\u0442\u043e\u0447\u043d\u043e)" },
              ],
              onChange: function (v) {
                updateOption("code_match_mode", v);
              },
            }),
            el(ToggleControl, {
              label: "\u0420\u0430\u0441\u0448\u0438\u0440\u044f\u0442\u044c live search BeTheme (SKU/\u0448\u0442\u0440\u0438\u0445\u043a\u043e\u0434\u044b/\u0430\u0442\u0440\u0438\u0431\u0443\u0442\u044b)",
              help: "\u0414\u043e\u0431\u0430\u0432\u043b\u044f\u0435\u0442 \u0432 dropdown \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b \u043f\u043e \u0430\u0440\u0442\u0438\u043a\u0443\u043b\u0430\u043c, \u0448\u0442\u0440\u0438\u0445\u043a\u043e\u0434\u0430\u043c, \u0430\u0442\u0440\u0438\u0431\u0443\u0442\u0430\u043c (pa_*).",
              checked: !!options.enhance_betheme_live_search,
              onChange: function (v) {
                updateOption("enhance_betheme_live_search", v ? 1 : 0);
              },
            }),
            el(TextControl, {
              label: "\u0417\u0430\u0434\u0435\u0440\u0436\u043a\u0430 (debounce), \u043c\u0441",
              type: "number",
              value: options.live_search_debounce,
              onChange: function (v) {
                updateOption("live_search_debounce", clampInt(v, 50, 2000, 300));
              },
            }),
            el(TextControl, {
              label: "\u041c\u0430\u043a\u0441\u0438\u043c\u0443\u043c \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432",
              type: "number",
              value: options.live_search_max_results,
              onChange: function (v) {
                updateOption("live_search_max_results", clampInt(v, 1, 50, 10));
              },
            }),
            el(CheckboxControl, {
              label: "\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438",
              checked: !!options.live_search_show_categories,
              onChange: function (v) {
                updateOption("live_search_show_categories", v ? 1 : 0);
              },
            }),
            el(CheckboxControl, {
              label: "\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c \u0431\u0440\u0435\u043d\u0434\u044b",
              checked: !!options.live_search_show_brands,
              onChange: function (v) {
                updateOption("live_search_show_brands", v ? 1 : 0);
              },
            }),
            el(CheckboxControl, {
              label: "\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c \u0442\u043e\u0432\u0430\u0440\u044b \u043f\u043e \u0430\u0440\u0442\u0438\u043a\u0443\u043b\u0443 (\u0432\u044b\u043f\u0430\u0434\u0430\u0448\u043a\u0430)",
              help: "\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442 \u0432 \u0432\u044b\u043f\u0430\u0434\u0430\u0448\u043a\u0435 \u0431\u044b\u0441\u0442\u0440\u044b\u0435 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b \u043f\u043e \u0430\u0440\u0442\u0438\u043a\u0443\u043b\u0430\u043c/\u0448\u0442\u0440\u0438\u0445\u043a\u043e\u0434\u0430\u043c \u0447\u0435\u0440\u0435\u0437 REST /v1/live (\u043e\u0441\u043e\u0431\u0435\u043d\u043d\u043e \u043f\u043e\u043b\u0435\u0437\u043d\u043e, \u043a\u043e\u0433\u0434\u0430 BeTheme \u043d\u0435 \u0438\u0449\u0435\u0442 \u043f\u043e SKU).",
              checked: !!options.live_search_show_code_products,
              onChange: function (v) {
                updateOption("live_search_show_code_products", v ? 1 : 0);
              },
            }),
            el(CheckboxControl, {
              label: "\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c \u00ab\u041f\u043e\u0445\u043e\u0436\u0438\u0435 \u0437\u0430\u043f\u0440\u043e\u0441\u044b\u00bb \u043f\u0440\u0438 \u0432\u0432\u043e\u0434\u0435",
              help: "\u0415\u0441\u043b\u0438 \u0432\u044b\u043a\u043b\u044e\u0447\u0435\u043d\u043e \u2014 \u043f\u043e\u0434\u0441\u043a\u0430\u0437\u043a\u0438 \u043f\u043e \u0437\u0430\u043f\u0440\u043e\u0441\u0430\u043c \u043d\u0435 \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u044e\u0442\u0441\u044f \u0432\u043e \u0432\u0440\u0435\u043c\u044f \u043d\u0430\u0431\u043e\u0440\u0430 \u0442\u0435\u043a\u0441\u0442\u0430. \u0418\u0441\u0442\u043e\u0440\u0438\u044f/\u043f\u043e\u043f\u0443\u043b\u044f\u0440\u043d\u044b\u0435 \u043e\u0441\u0442\u0430\u044e\u0442\u0441\u044f \u043f\u0440\u0438 \u043f\u0443\u0441\u0442\u043e\u043c \u043f\u043e\u043b\u0435.",
              checked: !!options.live_search_show_suggestions,
              onChange: function (v) {
                updateOption("live_search_show_suggestions", v ? 1 : 0);
              },
            }),
            el(CheckboxControl, {
              label: "Требовать совпадения всех слов в выпадашке",
              help: "Если включено — в выпадающем live‑поиске будут показываться только товары, совпадающие со всеми словами запроса.",
              checked: !!options.live_search_require_all_tokens,
              onChange: function (v) {
                updateOption("live_search_require_all_tokens", v ? 1 : 0);
              },
            }),
            el("div", { style: { marginTop: 12 } },
              el(TextControl, {
                label: "Quick Test (Live search)",
                value: liveTestQuery,
                onChange: function (v) {
                  setLiveTestQuery(v);
                },
              }),
              el(Flex, { gap: 10, align: "flex-end" },
                el(Button, { variant: "primary", onClick: function () {
                  var q = (liveTestQuery || "").trim();
                  if (!q) return;
                  setLiveTestLoading(true);
                  setLiveTestResult(null);
                  api.testQuery(q, 5, { requestKey: "liveQuickTest" })
                    .then(function (res) {
                      setLiveTestResult(res || null);
                    })
                    .catch(function (err) {
                      window.alert(err && err.message ? err.message : "Test failed");
                    })
                    .finally(function () {
                      setLiveTestLoading(false);
                    });
                }, isBusy: liveTestLoading }, "Run Test"),
                el(Button, { variant: "tertiary", onClick: function () { navigate("/tools/test-query"); } }, "Open full Test Query")
              ),
              liveTestResult && el("div", { style: { marginTop: 12 } }, el("div", null, "Products: " + (Array.isArray(liveTestResult.products) ? String(liveTestResult.products.length) : "0")), Array.isArray(liveTestResult.products) ? liveTestResult.products.slice(0, 3).map(function (p, i) {
                return el("div", { key: i }, el("a", { href: p.url, target: "_blank", rel: "noreferrer" }, p.title || ""));
              }) : null)
            )
          ),
          el(PanelBody, { title: "\u041a\u0435\u0448\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 (\u0443\u0441\u043a\u043e\u0440\u0435\u043d\u0438\u0435)", initialOpen: false },
            el(ToggleControl, {
              label: "\u0412\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u043a\u0435\u0448\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435",
              checked: !!options.enable_caching,
              onChange: function (v) {
                updateOption("enable_caching", v ? 1 : 0);
              },
            }),
            el(TextControl, {
              label: "TTL (\u0441\u0435\u043a.)",
              type: "number",
              value: options.cache_ttl,
              disabled: !options.enable_caching,
              onChange: function (v) {
                updateOption("cache_ttl", clampInt(v, 30, 86400, 600));
              },
            }),
            el(HelpText, null, "\u041a\u0435\u0448 \u043f\u0440\u0438\u043c\u0435\u043d\u044f\u0435\u0442\u0441\u044f \u0438 \u043a \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043d\u0438\u044e BeTheme live search (\u0432\u044b\u043f\u0430\u0434\u0430\u044e\u0449\u0438\u0439 \u0441\u043f\u0438\u0441\u043e\u043a).")
          )
        )
      )
    );
  }
  screens.SettingsLiveSearchPage = SettingsLiveSearchPage;

  function SettingsQualityPage(props) {
    var options = props.options;
    var updateOption = props.updateOption;
    var navigate = props.navigate;

    return el(
      Fragment,
      null,
      el(SectionTitle, null, "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438"),
      el(Tabs, {
        active: "/settings/quality",
        navigate: navigate,
        tabs: [
          { to: "/settings/general", label: "\u041e\u0431\u0449\u0435\u0435" },
          { to: "/settings/live-search", label: "\u0416\u0438\u0432\u043e\u0439 \u043f\u043e\u0438\u0441\u043a" },
          { to: "/settings/quality", label: "\u041a\u0430\u0447\u0435\u0441\u0442\u0432\u043e" },
          { to: "/settings/dictionaries", label: "\u0421\u043b\u043e\u0432\u0430\u0440\u0438" },
          { to: "/settings/engines", label: "Engines" },
        ],
      }),
      el(
        Card,
        null,
        el(
          CardBody,
          null,
          el(PanelBody, { title: "\u041a\u0430\u0447\u0435\u0441\u0442\u0432\u043e \u043f\u043e\u0438\u0441\u043a\u0430", initialOpen: true },
            el(SelectControl, {
              label: "\u0420\u0435\u0436\u0438\u043c \u0441\u043e\u0432\u043f\u0430\u0434\u0435\u043d\u0438\u0439 \u0434\u043b\u044f \u043c\u043d\u043e\u0433\u043e\u0441\u043b\u043e\u0432\u043d\u044b\u0445 \u0437\u0430\u043f\u0440\u043e\u0441\u043e\u0432",
              help: "Auto \u043f\u044b\u0442\u0430\u0435\u0442\u0441\u044f \u0441\u043d\u0430\u0447\u0430\u043b\u0430 \u0441\u0442\u0440\u043e\u0433\u0438\u0439 \u0440\u0435\u0436\u0438\u043c, \u0437\u0430\u0442\u0435\u043c \u043c\u044f\u0433\u043a\u0438\u0439. AND \u2014 \u0432\u0441\u0435 \u0441\u043b\u043e\u0432\u0430 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u044b. OR \u2014 \u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u0447\u0430\u0441\u0442\u0438.",
              value: options.search_mode || "auto",
              options: [
                { value: "auto", label: "auto" },
                { value: "and", label: "and" },
                { value: "or", label: "or" },
              ],
              onChange: function (v) {
                updateOption("search_mode", v);
              },
            }),
            el(TextControl, {
              label: "\u041c\u0438\u043d\u0438\u043c\u0430\u043b\u044c\u043d\u0430\u044f \u0434\u043b\u0438\u043d\u0430 \u0442\u043e\u043a\u0435\u043d\u0430",
              type: "number",
              help: "\u0421\u043b\u0438\u0448\u043a\u043e\u043c \u043a\u043e\u0440\u043e\u0442\u043a\u0438\u0435 \u0441\u043b\u043e\u0432\u0430 \u0434\u0430\u044e\u0442 \u0448\u0443\u043c. \u0414\u043b\u044f SKU \u0438 \u043a\u043e\u0440\u043e\u0442\u043a\u0438\u0445 \u0431\u0440\u0435\u043d\u0434\u043e\u0432 \u043e\u0441\u0442\u0430\u0432\u044c\u0442\u0435 2.",
              value: options.min_token_length,
              onChange: function (v) {
                updateOption("min_token_length", clampInt(v, 1, 6, 2));
              },
            }),
            el(TextareaControl, {
              label: "\u0421\u0442\u043e\u043f-\u0441\u043b\u043e\u0432\u0430",
              help: "\u041e\u0434\u043d\u043e \u0441\u043b\u043e\u0432\u043e \u043d\u0430 \u0441\u0442\u0440\u043e\u043a\u0443 \u0438\u043b\u0438 \u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043f\u044f\u0442\u0443\u044e. \u042d\u0442\u0438 \u0441\u043b\u043e\u0432\u0430 \u0431\u0443\u0434\u0443\u0442 \u0438\u0433\u043d\u043e\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c\u0441\u044f \u0432 \u0437\u0430\u043f\u0440\u043e\u0441\u0430\u0445.",
              value: options.stopwords || "",
              onChange: function (v) {
                updateOption("stopwords", v);
              },
            })
          ),
          el(PanelBody, { title: "\u0420\u0430\u043d\u0436\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435", initialOpen: false },
            el(TextControl, {
              label: "\u0411\u0443\u0441\u0442 \u0444\u0440\u0430\u0437\u044b (\u043f\u043e\u043b\u043d\u043e\u0435 \u0441\u043e\u0432\u043f\u0430\u0434\u0435\u043d\u0438\u0435)",
              type: "number",
              value: options.phrase_boost,
              onChange: function (v) {
                updateOption("phrase_boost", clampInt(v, 0, 200, 30));
              },
            }),
            el(TextControl, {
              label: "\u0411\u0443\u0441\u0442 \u0442\u043e\u0447\u043d\u043e\u0433\u043e SKU",
              type: "number",
              value: options.exact_sku_boost,
              onChange: function (v) {
                updateOption("exact_sku_boost", clampInt(v, 0, 300, 120));
              },
            }),
            el(TextControl, {
              label: "\u0428\u0442\u0440\u0430\u0444 \u0437\u0430 \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u0435 \u043d\u0430 \u0441\u043a\u043b\u0430\u0434\u0435",
              type: "number",
              value: options.out_of_stock_penalty,
              onChange: function (v) {
                updateOption("out_of_stock_penalty", clampInt(v, 0, 50, 15));
              },
            })
          ),
          el(PanelBody, { title: "Fuzzy-\u0440\u0435\u0437\u0435\u0440\u0432", initialOpen: false },
            el(ToggleControl, {
              label: "\u0412\u043a\u043b\u044e\u0447\u0438\u0442\u044c fuzzy-\u0440\u0435\u0437\u0435\u0440\u0432 (\u043e\u043f\u0435\u0447\u0430\u0442\u043a\u0438)",
              help: "\u0415\u0441\u043b\u0438 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432 \u043d\u0435\u0442 \u2014 \u043f\u0440\u043e\u0431\u0443\u0435\u043c \u043c\u044f\u0433\u043a\u0438\u0439 \u0440\u0435\u0436\u0438\u043c (\u0434\u043e\u0440\u043e\u0436\u0435 \u043f\u043e CPU).",
              checked: !!options.enable_fuzzy_fallback,
              onChange: function (v) {
                updateOption("enable_fuzzy_fallback", v ? 1 : 0);
              },
            }),
            el(TextControl, {
              label: "\u041c\u0430\u043a\u0441. \u0440\u0430\u0441\u0441\u0442\u043e\u044f\u043d\u0438\u0435 (Levenshtein)",
              type: "number",
              value: options.fuzzy_max_distance,
              disabled: !options.enable_fuzzy_fallback,
              onChange: function (v) {
                updateOption("fuzzy_max_distance", clampInt(v, 1, 4, 2));
              },
            })
          )
        )
      )
    );
  }
  screens.SettingsQualityPage = SettingsQualityPage;

  function SettingsDictionariesPage(props) {
    var options = props.options;
    var updateOption = props.updateOption;
    var navigate = props.navigate;

    return el(
      Fragment,
      null,
      el(SectionTitle, null, "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438"),
      el(Tabs, {
        active: "/settings/dictionaries",
        navigate: navigate,
        tabs: [
          { to: "/settings/general", label: "\u041e\u0431\u0449\u0435\u0435" },
          { to: "/settings/live-search", label: "\u0416\u0438\u0432\u043e\u0439 \u043f\u043e\u0438\u0441\u043a" },
          { to: "/settings/quality", label: "\u041a\u0430\u0447\u0435\u0441\u0442\u0432\u043e" },
          { to: "/settings/dictionaries", label: "\u0421\u043b\u043e\u0432\u0430\u0440\u0438" },
          { to: "/settings/engines", label: "Engines" },
        ],
      }),
      el(
        Card,
        null,
        el(
          CardBody,
          null,
          el(ToggleControl, {
            label: "\u041b\u043e\u0433\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u043f\u043e\u0438\u0441\u043a\u043e\u0432\u044b\u0445 \u0437\u0430\u043f\u0440\u043e\u0441\u043e\u0432",
            help: "\u0417\u0430\u043f\u0438\u0441\u044b\u0432\u0430\u0435\u0442 \u0437\u0430\u043f\u0440\u043e\u0441\u044b \u0438 \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432 \u0432 \u0442\u0430\u0431\u043b\u0438\u0446\u0443 \u0430\u043d\u0430\u043b\u0438\u0442\u0438\u043a\u0438.",
            checked: !!options.enable_search_logging,
            onChange: function (v) {
              updateOption("enable_search_logging", v ? 1 : 0);
            },
          }),
          el(ToggleControl, {
            label: "\u0421\u0438\u043d\u043e\u043d\u0438\u043c\u044b",
            checked: !!options.enable_synonyms,
            onChange: function (v) {
              updateOption("enable_synonyms", v ? 1 : 0);
            },
          }),
          el(TextareaControl, {
            label: "\u041f\u0440\u0430\u0432\u0438\u043b\u0430 \u0441\u0438\u043d\u043e\u043d\u0438\u043c\u043e\u0432",
            help: "\u0424\u043e\u0440\u043c\u0430\u0442: `\u0441\u043b\u043e\u0432\u043e=\u0432\u0430\u0440\u0438\u0430\u043d\u04421,\u0432\u0430\u0440\u0438\u0430\u043d\u04422` (\u043f\u043e \u043e\u0434\u043d\u043e\u0439 \u0441\u0442\u0440\u043e\u043a\u0435).",
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
  screens.SettingsDictionariesPage = SettingsDictionariesPage;

  function SettingsEnginesPage(props) {
    var options = props.options;
    var updateOption = props.updateOption;
    var navigate = props.navigate;

    var enginesMap = normalizeEnginesForUI(options);
    var engineIds = engineIdList(enginesMap);
    var activeEngineId = normalizeEngineId(options.active_engine || "default");
    if (!activeEngineId || !enginesMap[activeEngineId]) {
      activeEngineId = "default";
    }

    var _useStateEngine = useState(activeEngineId),
      selectedEngineId = _useStateEngine[0],
      setSelectedEngineId = _useStateEngine[1];

    useEffect(
      function () {
        if (!enginesMap[selectedEngineId]) {
          setSelectedEngineId(activeEngineId);
        }
      },
      [engineIds.join("|"), activeEngineId]
    );

    var selectedEngine = enginesMap[selectedEngineId] || enginesMap.default;
    var defaultEngine = enginesMap.default || buildDefaultEngineFromOptions(options || {});

    var fieldList = ["title", "sku", "content"];
    var fieldLabels = { title: "Title", sku: "SKU", content: "Content" };

    function engineLabel(id) {
      var record = enginesMap[id];
      if (!record) return id;
      return record.label || id;
    }

    function parseMetaKeys(value) {
      return String(value || "")
        .split(",")
        .map(function (v) {
          return v.trim();
        })
        .filter(Boolean);
    }

    function updateEngineField(field, value) {
      var nextEngines = Object.assign({}, enginesMap);
      var current = Object.assign({}, nextEngines[selectedEngineId] || {});
      current[field] = value;
      nextEngines[selectedEngineId] = current;
      updateOption("engines", nextEngines);
    }

    function setActiveEngine(nextId) {
      var safeId = normalizeEngineId(nextId) || "default";
      if (!enginesMap[safeId]) {
        safeId = "default";
      }
      updateOption("active_engine", safeId);
    }

    function addEngine() {
      var base = buildDefaultEngineFromOptions(options || {});
      var baseLabel = "Engine";
      var idBase = "engine";
      var nextId = idBase;
      var idx = 1;
      while (enginesMap[nextId]) {
        idx += 1;
        nextId = idBase + "-" + idx;
      }
      var record = normalizeEngineRecord({}, base);
      record.id = nextId;
      record.label = baseLabel + " " + idx;
      var nextEngines = Object.assign({}, enginesMap);
      nextEngines[nextId] = record;
      updateOption("engines", nextEngines);
      setSelectedEngineId(nextId);
    }

    function removeEngine() {
      if (selectedEngineId === "default") return;
      var label = engineLabel(selectedEngineId);
      if (!window.confirm('Remove engine "' + label + '"?')) return;
      var nextEngines = Object.assign({}, enginesMap);
      delete nextEngines[selectedEngineId];
      updateOption("engines", nextEngines);
      if (selectedEngineId === activeEngineId) {
        updateOption("active_engine", "default");
      }
      setSelectedEngineId("default");
    }

    var activeOptions = engineIds.map(function (id) {
      return { value: id, label: engineLabel(id) };
    });

    var editOptions = engineIds.map(function (id) {
      return { value: id, label: engineLabel(id) };
    });

    var metaKeysValue = Array.isArray(selectedEngine.product_meta_keys)
      ? selectedEngine.product_meta_keys.join(", ")
      : selectedEngine.product_meta_keys || "";

    return el(
      Fragment,
      null,
      el(SectionTitle, null, "Engines"),
      el(Tabs, {
        active: "/settings/engines",
        navigate: navigate,
        tabs: [
          { to: "/settings/general", label: "Settings" },
          { to: "/settings/live-search", label: "Live Search" },
          { to: "/settings/quality", label: "Quality" },
          { to: "/settings/dictionaries", label: "Dictionaries" },
          { to: "/settings/engines", label: "Engines" },
        ],
      }),
      el(
        Card,
        null,
        el(
          CardBody,
          null,
          el(PanelBody, { title: "Engine selection", initialOpen: true },
            el(SelectControl, {
              label: "Active engine",
              value: activeEngineId,
              options: activeOptions,
              onChange: setActiveEngine,
            }),
            el(SelectControl, {
              label: "Edit engine",
              value: selectedEngineId,
              options: editOptions,
              onChange: function (v) {
                setSelectedEngineId(normalizeEngineId(v) || "default");
              },
            }),
            el(
              Flex,
              { gap: 8 },
              el(Button, { isSecondary: true, onClick: addEngine }, "Add engine"),
              el(
                Button,
                {
                  isDestructive: true,
                  disabled: selectedEngineId === "default",
                  onClick: removeEngine,
                },
                "Remove engine"
              )
            ),
            el(
              HelpText,
              null,
              "Engine settings override General/Quality values for live search and REST endpoints."
            )
          ),
          el(PanelBody, { title: "Engine settings", initialOpen: false },
            el(TextControl, {
              label: "Label",
              value: selectedEngine.label || "",
              onChange: function (v) {
                updateEngineField("label", v);
              },
            }),
            el(
              "div",
              { className: "bss-form-row" },
              el("div", { className: "bss-form-label" }, "Search fields"),
              el(
                "div",
                { className: "bss-form-control" },
                fieldList.map(function (field) {
                  var list = Array.isArray(selectedEngine.search_fields)
                    ? selectedEngine.search_fields
                    : defaultEngine.search_fields || [];
                  var checked = list.indexOf(field) !== -1;
                  return el(CheckboxControl, {
                    key: field,
                    label: fieldLabels[field] || field,
                    checked: checked,
                    onChange: function (v) {
                      var next = list.slice(0);
                      if (v) {
                        if (next.indexOf(field) === -1) next.push(field);
                      } else {
                        next = next.filter(function (f) {
                          return f !== field;
                        });
                      }
                      updateEngineField("search_fields", next);
                    },
                  });
                })
              )
            ),
            el(
              "div",
              { className: "bss-form-row" },
              el("div", { className: "bss-form-label" }, "Field weights"),
              el(
                "div",
                { className: "bss-form-control" },
                fieldList.map(function (field) {
                  var currentWeights = selectedEngine.field_weights || {};
                  var val = currentWeights[field];
                  if (val == null) val = (defaultEngine.field_weights || {})[field] || 0;
                  return el(TextControl, {
                    key: field,
                    label: (fieldLabels[field] || field) + " weight",
                    type: "number",
                    value: val,
                    onChange: function (v) {
                      var nextWeights = Object.assign({}, currentWeights);
                      nextWeights[field] = clampInt(v, 0, 50, 0);
                      updateEngineField("field_weights", nextWeights);
                    },
                  });
                })
              )
            ),
            el(SelectControl, {
              label: "Search mode",
              value: selectedEngine.search_mode || "auto",
              options: [
                { value: "auto", label: "auto" },
                { value: "and", label: "and" },
                { value: "or", label: "or" },
              ],
              onChange: function (v) {
                updateEngineField("search_mode", v);
              },
            }),
            el(TextControl, {
              label: "Min token length",
              type: "number",
              value: selectedEngine.min_token_length,
              onChange: function (v) {
                updateEngineField("min_token_length", clampInt(v, 1, 6, 2));
              },
            }),
            el(TextControl, {
              label: "Meta keys (SKU/barcode)",
              help: "Comma-separated list. Example: _sku, _ean, barcode",
              value: metaKeysValue,
              onChange: function (v) {
                updateEngineField("product_meta_keys", parseMetaKeys(v));
              },
            }),
            el(TextareaControl, {
              label: "Stopwords",
              help: "One per line.",
              value: selectedEngine.stopwords || "",
              onChange: function (v) {
                updateEngineField("stopwords", v);
              },
            })
          )
        )
      )
    );
  }
  screens.SettingsEnginesPage = SettingsEnginesPage;


})(window);
