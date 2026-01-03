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

function DashboardPage(props) {
    var analytics = props.analytics;
    var analyticsLoading = props.analyticsLoading;
    var onRefresh = props.onRefresh;
    var status = props.status;
    var statusLoading = props.statusLoading;
    var onStatusRefresh = props.onStatusRefresh;
    var navigate = props.navigate;
    var days = props.days;
    var setDays = props.setDays;

    function row(label, value) {
      return { label: label, value: value == null ? "" : String(value) };
    }

    var statusRows = useMemo(function () {
      if (!status) return [];
      var plugin = status.plugin || {};
      var features = plugin.features || {};
      var caching = plugin.caching || {};
      var live = plugin.live_search || {};
      var wooActive = status.woo && status.woo.active ? "\u0410\u043a\u0442\u0438\u0432\u0435\u043d" : "\u041d\u0435 \u0430\u043a\u0442\u0438\u0432\u0435\u043d";
      var cacheLabel = caching.enabled ? "\u0412\u043a\u043b\u044e\u0447\u0435\u043d\u043e (" + String(caching.ttl || 0) + " \u0441\u0435\u043a.)" : "\u0412\u044b\u043a\u043b\u044e\u0447\u0435\u043d\u043e";
      var liveLabel = live.enabled ? "\u0412\u043a\u043b\u044e\u0447\u0435\u043d (" + String(live.max_results || 0) + " \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432)" : "\u0412\u044b\u043a\u043b\u044e\u0447\u0435\u043d";
      var synonymsLabel = features.enable_synonyms ? "\u0412\u043a\u043b\u044e\u0447\u0435\u043d\u044b" : "\u0412\u044b\u043a\u043b\u044e\u0447\u0435\u043d\u044b";

      return [
        row("WooCommerce", wooActive),
        row("\u0422\u043e\u0432\u0430\u0440\u043e\u0432", status.catalog && status.catalog.products),
        row("Live Search", liveLabel),
        row("\u041a\u0435\u0448\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435", cacheLabel),
        row("\u0421\u0438\u043d\u043e\u043d\u0438\u043c\u044b", synonymsLabel),
        row("\u0412\u0435\u0440\u0441\u0438\u044f \u043f\u043b\u0430\u0433\u0438\u043d\u0430", plugin.version),
      ];
    }, [status]);

    var statusChips = useMemo(function () {
      if (!status || !status.plugin) return [];
      var chips = [];
      if (status.plugin.live_search && status.plugin.live_search.enabled) chips.push("Live Search");
      if (status.plugin.caching && status.plugin.caching.enabled) chips.push("\u041a\u0435\u0448");
      if (status.plugin.logging && status.plugin.logging.enabled) chips.push("\u041b\u043e\u0433\u0438");
      if (status.plugin.features && status.plugin.features.shop_style_results) chips.push("Shop-style");
      return chips;
    }, [status]);

    function refreshAll() {
      if (typeof onRefresh === "function") onRefresh();
      if (typeof onStatusRefresh === "function") onStatusRefresh();
    }

    return el(
      Fragment,
      null,
      el(
        Flex,
        { justify: "space-between", align: "flex-end", style: { marginBottom: "12px" } },
        el(SectionTitle, null, "\u0414\u0430\u0448\u0431\u043e\u0440\u0434"),
        el(
          Flex,
          { gap: 8, align: "flex-end" },
          el(SelectControl, {
            label: "\u041f\u0435\u0440\u0438\u043e\u0434",
            value: days,
            options: [
              { value: 7, label: "7 \u0434\u043d\u0435\u0439" },
              { value: 14, label: "14 \u0434\u043d\u0435\u0439" },
              { value: 30, label: "30 \u0434\u043d\u0435\u0439" },
              { value: 90, label: "90 \u0434\u043d\u0435\u0439" },
            ],
            onChange: function (v) {
              setDays(clampInt(v, 1, 365, 30));
            },
          }),
          el(Button, { variant: "secondary", onClick: refreshAll, isBusy: analyticsLoading || statusLoading }, "\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c")
        )
      ),
      analyticsLoading && el(Spinner, null),
      analytics &&
        el(
          "div",
          { className: "bss-stats" },
          el(StatCard, { label: "\u0412\u0441\u0435\u0433\u043e \u043f\u043e\u0438\u0441\u043a\u043e\u0432", value: String(analytics.summary.total_count || 0) }),
          el(StatCard, { label: "\u0423\u043d\u0438\u043a\u0430\u043b\u044c\u043d\u044b\u0435 \u0437\u0430\u043f\u0440\u043e\u0441\u044b", value: String(analytics.summary.unique_queries || 0) }),
          el(StatCard, { label: "\u0411\u0435\u0437 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432", value: String(analytics.summary.no_results_count || 0) }),
          el(StatCard, {
            label: "\u0421\u0440\u0435\u0434\u043d\u0435\u0435 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432",
            value: String(Math.round((Number(analytics.summary.avg_results) || 0) * 10) / 10),
          })
        ),
      statusLoading && !status && el(Spinner, null),
      status &&
        el(
          Card,
          null,
          el(
            CardBody,
            null,
            el(
              Flex,
              { justify: "space-between", align: "center", style: { marginBottom: "8px" } },
              el("h3", { className: "bss-card-title" }, "\u0421\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 \u0441\u0438\u0441\u0442\u0435\u043c\u044b"),
              el(
                Flex,
                { gap: 8, align: "center" },
                el(Button, { variant: "tertiary", onClick: function () { return navigate("/tools/status"); } }, "\u0414\u0435\u0442\u0430\u043b\u0438"),
                el(Button, { variant: "tertiary", onClick: function () { return navigate("/settings/general"); } }, "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438")
              )
            ),
            el(Table, {
              rows: statusRows,
              columns: [
                { key: "label", label: "\u041f\u0430\u0440\u0430\u043c\u0435\u0442\u0440" },
                { key: "value", label: "\u0417\u043d\u0430\u0447\u0435\u043d\u0438\u0435" },
              ],
              emptyText: "\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445.",
            }),
            statusChips.length > 0 &&
              el(
                "div",
                { className: "bss-chips" },
                statusChips.map(function (chip) {
                  return el("span", { key: chip, className: "bss-chip" }, chip);
                })
              )
          )
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
              el(CardBody, null, el("h3", { className: "bss-card-title" }, "\u0422\u043e\u043f \u0437\u0430\u043f\u0440\u043e\u0441\u043e\u0432"), el(Table, {
                rows: analytics.top_queries || [],
                columns: [
                  { key: "query", label: "\u0417\u0430\u043f\u0440\u043e\u0441" },
                  { key: "hits", label: "\u0425\u0438\u0442\u044b" },
                  { key: "avg_results", label: "\u0421\u0440\u0435\u0434\u043d." },
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
              el(CardBody, null, el("h3", { className: "bss-card-title" }, "\u0422\u043e\u043f \u0431\u0435\u0437 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432"), el(Table, {
                rows: analytics.top_no_results || [],
                columns: [
                  { key: "query", label: "\u0417\u0430\u043f\u0440\u043e\u0441" },
                  { key: "hits", label: "\u0425\u0438\u0442\u044b" },
                  { key: "last_at", label: "\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0439" },
                ],
              }))
            )
          )
        )
    );
  }
  screens.DashboardPage = DashboardPage;


})(window);
