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
        message: wcActive ? "WooCommerce \u0430\u043a\u0442\u0438\u0432\u0435\u043d." : "WooCommerce \u043d\u0435 \u0430\u043a\u0442\u0438\u0432\u0435\u043d - \u043f\u043e\u0438\u0441\u043a \u0442\u043e\u0432\u0430\u0440\u043e\u0432 \u0431\u0443\u0434\u0435\u0442 \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d.",
      });

      checks.push({
        level: isBetheme ? "success" : "info",
        title: "\u0422\u0435\u043c\u0430 Betheme",
        message: isBetheme ? "Betheme \u043e\u0431\u043d\u0430\u0440\u0443\u0436\u0435\u043d\u0430." : "Betheme \u043d\u0435 \u043e\u0431\u043d\u0430\u0440\u0443\u0436\u0435\u043d\u0430 (\u043f\u043b\u0430\u0433\u0438\u043d \u043c\u043e\u0436\u0435\u0442 \u0440\u0430\u0431\u043e\u0442\u0430\u0442\u044c \u0438 \u0441 \u0434\u0440\u0443\u0433\u0438\u043c\u0438 \u0442\u0435\u043c\u0430\u043c\u0438).",
      });

      checks.push({
        level: products >= 1 ? "success" : "warning",
        title: "\u041a\u0430\u0442\u0430\u043b\u043e\u0433 \u0442\u043e\u0432\u0430\u0440\u043e\u0432",
        message: products >= 1 ? "\u0422\u043e\u0432\u0430\u0440\u043e\u0432 \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0435: " + products : "\u041d\u0435\u0442 \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d\u043d\u044b\u0445 \u0442\u043e\u0432\u0430\u0440\u043e\u0432.",
      });

      checks.push({
        level: liveEnabled ? "success" : "warning",
        title: "\u0416\u0438\u0432\u043e\u0439 \u043f\u043e\u0438\u0441\u043a",
        message: liveEnabled ? "\u0416\u0438\u0432\u043e\u0439 \u043f\u043e\u0438\u0441\u043a \u0432\u043a\u043b\u044e\u0447\u0435\u043d." : "\u0416\u0438\u0432\u043e\u0439 \u043f\u043e\u0438\u0441\u043a \u0432\u044b\u043a\u043b\u044e\u0447\u0435\u043d.",
      });

      if (liveEnabled) {
        var debounceOk = isFinite(debounce) && debounce >= 100 && debounce <= 1200;
        checks.push({
          level: debounceOk ? "success" : "warning",
          title: "\u0417\u0430\u0434\u0435\u0440\u0436\u043a\u0430 (debounce)",
          message: debounceOk ? "Debounce: " + debounce + " \u043c\u0441." : "Debounce \u0432\u044b\u0433\u043b\u044f\u0434\u0438\u0442 \u0441\u0442\u0440\u0430\u043d\u043d\u043e. \u0420\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0443\u0435\u043c 200-500 \u043c\u0441.",
        });

        var maxOk = isFinite(liveMax) && liveMax >= 1 && liveMax <= 20;
        checks.push({
          level: maxOk ? "success" : "warning",
          title: "\u041b\u0438\u043c\u0438\u0442 live \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432",
          message: maxOk ? "Live results: " + liveMax : "\u041b\u0438\u043c\u0438\u0442 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432 \u0432\u044b\u0433\u043b\u044f\u0434\u0438\u0442 \u0441\u0442\u0440\u0430\u043d\u043d\u043e.",
        });
      }

      if (metaKeys && typeof metaKeys.count === "number") {
        checks.push({
          level: metaKeys.count >= 1 ? "success" : "warning",
          title: "\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u043c\u0435\u0442\u0430\u043f\u043e\u043b\u044f\u043c",
          message: "Meta keys: " + String(metaKeys.count) + (metaKeys.has_sku ? " (\u0432\u043a\u043b\u044e\u0447\u0430\u044f _sku)" : ""),
        });
      }

      if (products >= 500) {
        checks.push({
          level: cachingEnabled ? "success" : "warning",
          title: "\u041a\u0435\u0448\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435",
          message: cachingEnabled ? "\u041a\u0435\u0448\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0432\u043a\u043b\u044e\u0447\u0435\u043d\u043e (\u0443\u0441\u043a\u043e\u0440\u044f\u0435\u0442 live search)." : "\u0420\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0443\u0435\u0442\u0441\u044f \u0432\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u043a\u0435\u0448\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0434\u043b\u044f \u0441\u043a\u043e\u0440\u043e\u0441\u0442\u0438 \u043d\u0430 \u0431\u043e\u043b\u044c\u0448\u043e\u043c \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0435.",
        });
      } else {
        checks.push({
          level: cachingEnabled ? "success" : "info",
          title: "\u041a\u0435\u0448\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435",
          message: cachingEnabled ? "\u041a\u0435\u0448\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0432\u043a\u043b\u044e\u0447\u0435\u043d\u043e." : "\u041a\u0435\u0448\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0432\u044b\u043a\u043b\u044e\u0447\u0435\u043d\u043e (\u043c\u043e\u0436\u043d\u043e \u0432\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u043f\u0440\u0438 \u0440\u043e\u0441\u0442\u0435 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430).",
        });
      }

      if (cachingEnabled) {
        var ttlOk = isFinite(ttl) && ttl >= 60 && ttl <= 86400;
        checks.push({
          level: ttlOk ? "success" : "warning",
          title: "TTL \u043a\u0435\u0448\u0430",
          message: ttlOk ? "TTL: " + ttl + " \u0441\u0435\u043a." : "TTL \u0432\u044b\u0433\u043b\u044f\u0434\u0438\u0442 \u0441\u0442\u0440\u0430\u043d\u043d\u043e. \u0420\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0443\u0435\u043c 300-3600 \u0441\u0435\u043a.",
        });
      }

      checks.push({
        level: loggingEnabled ? "success" : "info",
        title: "\u0410\u043d\u0430\u043b\u0438\u0442\u0438\u043a\u0430 \u0437\u0430\u043f\u0440\u043e\u0441\u043e\u0432",
        message: loggingEnabled ? "\u041b\u043e\u0433\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0432\u043a\u043b\u044e\u0447\u0435\u043d\u043e." : "\u041b\u043e\u0433\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0432\u044b\u043a\u043b\u044e\u0447\u0435\u043d\u043e (\u043c\u043e\u0436\u043d\u043e \u0432\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u0434\u043b\u044f \u0430\u043d\u0430\u043b\u0438\u0442\u0438\u043a\u0438).",
      });

      checks.push({
        level: features && features.shop_style_results ? "success" : "warning",
        title: "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b \u043a\u0430\u043a \u043c\u0430\u0433\u0430\u0437\u0438\u043d",
        message: features && features.shop_style_results ? "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b \u043e\u0442\u043e\u0431\u0440\u0430\u0436\u0430\u044e\u0442\u0441\u044f \u0432 \u0441\u0442\u0438\u043b\u0435 \u043c\u0430\u0433\u0430\u0437\u0438\u043d\u0430." : "\u0420\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0443\u0435\u043c \u0432\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u00ab\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b \u043a\u0430\u043a \u043c\u0430\u0433\u0430\u0437\u0438\u043d\u00bb.",
      });

      checks.push({
        level: layoutPageId > 0 ? "success" : "info",
        title: "\u0421\u0442\u0440\u0430\u043d\u0438\u0446\u0430 \u043c\u0430\u043a\u0435\u0442\u0430 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432",
        message: layoutPageId > 0 ? "\u041c\u0430\u043a\u0435\u0442 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432: page_id=" + String(layoutPageId) : "\u041c\u0430\u043a\u0435\u0442 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432 \u043d\u0435 \u0437\u0430\u0434\u0430\u043d (\u043c\u043e\u0436\u043d\u043e \u043d\u0430\u0437\u043d\u0430\u0447\u0438\u0442\u044c BeBuilder-\u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0443).",
      });

      checks.push({
        level: features && features.redirect_exact_match_to_product ? "success" : "info",
        title: "\u0420\u0435\u0434\u0438\u0440\u0435\u043a\u0442 \u043f\u043e \u0442\u043e\u0447\u043d\u043e\u043c\u0443 \u0441\u043e\u0432\u043f\u0430\u0434\u0435\u043d\u0438\u044e",
        message: features && features.redirect_exact_match_to_product ? "\u0412\u043a\u043b\u044e\u0447\u0435\u043d \u0440\u0435\u0434\u0438\u0440\u0435\u043a\u0442 \u043d\u0430 \u0442\u043e\u0432\u0430\u0440 \u043f\u0440\u0438 \u0442\u043e\u0447\u043d\u043e\u043c \u0441\u043e\u0432\u043f\u0430\u0434\u0435\u043d\u0438\u0438 \u0430\u0440\u0442\u0438\u043a\u0443\u043b\u0430." : "\u0420\u0435\u0434\u0438\u0440\u0435\u043a\u0442 \u043f\u043e \u0442\u043e\u0447\u043d\u043e\u043c\u0443 \u0441\u043e\u0432\u043f\u0430\u0434\u0435\u043d\u0438\u044e \u0432\u044b\u043a\u043b\u044e\u0447\u0435\u043d.",
      });

      return checks;
    }

    function row(label, value) {
      return { label: label, value: value == null ? "" : String(value) };
    }

    return el(
      Fragment,
      null,
      el(SectionTitle, null, "\u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b"),
      el(Tabs, {
        active: "/tools/status",
        navigate: navigate,
        tabs: [
          { to: "/tools/status", label: "\u0421\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435" },
          { to: "/tools/test-query", label: "\u0422\u0435\u0441\u0442 \u0437\u0430\u043f\u0440\u043e\u0441\u0430" },
        ],
      }),
      el(
        Flex,
        { justify: "flex-end", align: "flex-end", style: { marginBottom: "12px" } },
        el(
          Flex,
          { gap: 10, justify: "flex-end", align: "flex-end", className: "bss-page-actions" },
          el(Button, { variant: "secondary", onClick: onRefresh, isBusy: statusLoading }, "\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c"),
          el(Button, { variant: "tertiary", onClick: onCopyReport, disabled: !status }, "\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043e\u0442\u0447\u0435\u0442"),
          el(Button, { variant: "tertiary", onClick: function () { return setShowRaw(!showRaw); }, disabled: !status }, showRaw ? "\u0421\u043a\u0440\u044b\u0442\u044c JSON" : "\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c JSON")
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
              el("h3", { className: "bss-card-title" }, "\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0438"),
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
                el("h3", { className: "bss-card-title" }, "\u041e\u0442\u0447\u0435\u0442 (JSON)"),
                el("pre", { className: "bss-json" }, safeJson(status))
              )
            ),
          el(
            Card,
            null,
            el(
              CardBody,
              null,
              el("h3", { className: "bss-card-title" }, "\u0411\u044b\u0441\u0442\u0440\u044b\u0439 \u0442\u0435\u0441\u0442 \u0441\u043a\u043e\u0440\u043e\u0441\u0442\u0438"),
              el(
                Flex,
                { gap: 10, align: "flex-end" },
                el(TextControl, {
                  label: "\u0422\u0435\u0441\u0442\u043e\u0432\u044b\u0439 \u0437\u0430\u043f\u0440\u043e\u0441",
                  value: benchmarkQuery,
                  onChange: setBenchmarkQuery,
                  help: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0430\u0440\u0442\u0438\u043a\u0443\u043b \u0438\u043b\u0438 \u0441\u043b\u043e\u0432\u043e \u0438 \u043d\u0430\u0436\u043c\u0438\u0442\u0435 \u00ab\u0417\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c\u00bb.",
                }),
                el(Button, { variant: "secondary", onClick: onBenchmark, isBusy: benchmarkLoading, disabled: benchmarkLoading }, "\u0417\u0430\u043f\u0443\u0441\u0442\u0438\u0442\u044c")
              ),
              benchmarkResult &&
                el(
                  "div",
                  { className: "bss-benchmark" },
                  el("div", { className: "bss-benchmark-row" }, "admin/status: " + String(benchmarkResult.status_ms) + " \u043c\u0441"),
                  el("div", { className: "bss-benchmark-row" }, "admin/test-query: " + String(benchmarkResult.test_query_ms) + " \u043c\u0441"),
                  el("div", { className: "bss-benchmark-row" }, "public/query: " + String(benchmarkResult.public_query_ms) + " \u043c\u0441")
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
                      row("WP \u0432\u0435\u0440\u0441\u0438\u044f", status.wp && status.wp.version),
                      row("\u041b\u043e\u043a\u0430\u043b\u044c", status.wp && status.wp.locale),
                      row("Multisite", status.wp && status.wp.multisite ? "\u0414\u0430" : "\u041d\u0435\u0442"),
                      row("PHP \u0432\u0435\u0440\u0441\u0438\u044f", status.php && status.php.version),
                    ],
                    columns: [
                      { key: "label", label: "\u041f\u0430\u0440\u0430\u043c\u0435\u0442\u0440" },
                      { key: "value", label: "\u0417\u043d\u0430\u0447\u0435\u043d\u0438\u0435" },
                    ],
                    emptyText: "\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445.",
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
                  el("h3", { className: "bss-card-title" }, "WooCommerce / \u041a\u0430\u0442\u0430\u043b\u043e\u0433"),
                  el(Table, {
                    rows: [
                      row("WooCommerce", status.woo && status.woo.active ? "\u0410\u043a\u0442\u0438\u0432\u0435\u043d" : "\u041d\u0435 \u0430\u043a\u0442\u0438\u0432\u0435\u043d"),
                      row("Woo \u0432\u0435\u0440\u0441\u0438\u044f", status.woo && status.woo.version),
                      row("\u0422\u043e\u0432\u0430\u0440\u043e\u0432", status.catalog && status.catalog.products),
                      row("\u0412\u0430\u0440\u0438\u0430\u0446\u0438\u0439", status.catalog && status.catalog.variations),
                    ],
                    columns: [
                      { key: "label", label: "\u041f\u0430\u0440\u0430\u043c\u0435\u0442\u0440" },
                      { key: "value", label: "\u0417\u043d\u0430\u0447\u0435\u043d\u0438\u0435" },
                    ],
                    emptyText: "\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445.",
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
                  el("h3", { className: "bss-card-title" }, "\u0422\u0435\u043c\u0430"),
                  el(Table, {
                    rows: [
                      row("\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435", status.theme && status.theme.name),
                      row("\u0412\u0435\u0440\u0441\u0438\u044f", status.theme && status.theme.version),
                      row("Stylesheet", status.theme && status.theme.stylesheet),
                      row("Template", status.theme && status.theme.template),
                    ],
                    columns: [
                      { key: "label", label: "\u041f\u0430\u0440\u0430\u043c\u0435\u0442\u0440" },
                      { key: "value", label: "\u0417\u043d\u0430\u0447\u0435\u043d\u0438\u0435" },
                    ],
                    emptyText: "\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445.",
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
                  el("h3", { className: "bss-card-title" }, "\u041f\u043b\u0430\u0433\u0438\u043d"),
                  el(Table, {
                    rows: [
                      row("\u0412\u0435\u0440\u0441\u0438\u044f", status.plugin && status.plugin.version),
                      row("\u041a\u0435\u0448\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435", status.plugin && status.plugin.caching && status.plugin.caching.enabled ? "\u0412\u043a\u043b\u044e\u0447\u0435\u043d\u043e" : "\u0412\u044b\u043a\u043b\u044e\u0447\u0435\u043d\u043e"),
                      row("TTL (\u0441\u0435\u043a.)", status.plugin && status.plugin.caching && status.plugin.caching.ttl),
                      row("\u041b\u043e\u0433\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435", status.plugin && status.plugin.logging && status.plugin.logging.enabled ? "\u0412\u043a\u043b\u044e\u0447\u0435\u043d\u043e" : "\u0412\u044b\u043a\u043b\u044e\u0447\u0435\u043d\u043e"),
                    ],
                    columns: [
                      { key: "label", label: "\u041f\u0430\u0440\u0430\u043c\u0435\u0442\u0440" },
                      { key: "value", label: "\u0417\u043d\u0430\u0447\u0435\u043d\u0438\u0435" },
                    ],
                    emptyText: "\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445.",
                  })
                )
              )
            )
          )
        )
    );
  }
  screens.ToolsStatusPage = ToolsStatusPage;

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
      el(SectionTitle, null, "\u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b"),
      el(Tabs, {
        active: "/tools/test-query",
        navigate: navigate,
        tabs: [
          { to: "/tools/status", label: "\u0421\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435" },
          { to: "/tools/test-query", label: "\u0422\u0435\u0441\u0442 \u0437\u0430\u043f\u0440\u043e\u0441\u0430" },
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
              label: "\u0417\u0430\u043f\u0440\u043e\u0441",
              value: testQuery,
              onChange: function (v) {
                setTestQuery(v);
              },
            }),
            el(Button, { variant: "primary", onClick: onRun, isBusy: testLoading }, "\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c")
          ),
          testLoading && el(Spinner, null),
          testResult &&
            el(
              Fragment,
              null,
              el(
                Flex,
                { gap: 10, justify: "flex-end", align: "flex-end", className: "bss-page-actions", style: { marginTop: "10px" } },
                el(Button, { variant: "tertiary", onClick: function () { return setShowDebug(!showDebug); } }, showDebug ? "\u0421\u043a\u0440\u044b\u0442\u044c \u0434\u0438\u0430\u0433\u043d\u043e\u0441\u0442\u0438\u043a\u0443" : "\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0434\u0438\u0430\u0433\u043d\u043e\u0441\u0442\u0438\u043a\u0443"),
                el(
                  Button,
                  {
                    variant: "tertiary",
                    onClick: function () {
                      copyToClipboard(safeJson(testResult)).then(function (ok) {
                        if (ok) {
                          window.alert("JSON \u0441\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d.");
                        } else {
                          window.alert("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c JSON.");
                        }
                      });
                    },
                  },
                  "\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c JSON"
                )
              ),
              showDebug &&
                el(
                  Fragment,
                  null,
                  el("h3", { className: "bss-card-title" }, "\u0414\u0438\u0430\u0433\u043d\u043e\u0441\u0442\u0438\u043a\u0430"),
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
                            : "\u2014",
                      },
                    ],
                    columns: [
                      { key: "label", label: "\u041f\u0430\u0440\u0430\u043c\u0435\u0442\u0440" },
                      { key: "value", label: "\u0417\u043d\u0430\u0447\u0435\u043d\u0438\u0435" },
                    ],
                    emptyText: "\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445.",
                  }),
                  testResult.debug &&
                    testResult.debug.exact_match &&
                    testResult.debug.exact_match.url &&
                    el("p", { style: { marginTop: "10px" } }, el("a", { href: testResult.debug.exact_match.url, target: "_blank", rel: "noreferrer" }, "\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0442\u043e\u0432\u0430\u0440 \u043f\u043e \u0442\u043e\u0447\u043d\u043e\u043c\u0443 \u0441\u043e\u0432\u043f\u0430\u0434\u0435\u043d\u0438\u044e")),
                  testResult.debug &&
                    testResult.debug.meta_keys &&
                    Array.isArray(testResult.debug.meta_keys.keys) &&
                    el(
                      Fragment,
                      null,
                      el("h3", { className: "bss-card-title" }, "Meta keys (\u043f\u0435\u0440\u0432\u044b\u0435 30)"),
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
                        el(Button, { variant: "tertiary", onClick: function () { return setShowSql(!showSql); } }, showSql ? "\u0421\u043a\u0440\u044b\u0442\u044c SQL" : "\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c SQL")
                      ),
                      showSql && el("pre", { className: "bss-json" }, testResult.debug.sql)
                    )
                ),
              el("h3", { className: "bss-card-title" }, "\u0412\u0430\u0440\u0438\u0430\u043d\u0442\u044b \u0437\u0430\u043f\u0440\u043e\u0441\u0430"),
              el(
                "div",
                { className: "bss-chips" },
                (testResult.variants || []).map(function (v, idx) {
                  return el("span", { key: idx, className: "bss-chip" }, v);
                })
              ),
              el("h3", { className: "bss-card-title" }, "\u041d\u0430\u0439\u0434\u0435\u043d\u043d\u044b\u0435 \u0442\u043e\u0432\u0430\u0440\u044b"),
              el(Table, {
                rows: testResult.products || [],
                columns: [
                  { key: "id", label: "ID" },
                  { key: "title", label: "\u0422\u043e\u0432\u0430\u0440" },
                  { key: "sku", label: "SKU" },
                  { key: "price", label: "\u0426\u0435\u043d\u0430" },
                ],
                emptyText: "\u0422\u043e\u0432\u0430\u0440\u044b \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b.",
              })
            )
        )
      )
    );
  }
  screens.ToolsTestQueryPage = ToolsTestQueryPage;


})(window);
