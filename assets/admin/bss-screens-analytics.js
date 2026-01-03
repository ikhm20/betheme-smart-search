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
      el(SectionTitle, null, "\u0410\u043d\u0430\u043b\u0438\u0442\u0438\u043a\u0430"),
      el(Tabs, { active: "/analytics/overview", navigate: navigate, tabs: [{ to: "/analytics/overview", label: "\u041e\u0431\u0437\u043e\u0440" }, { to: "/tools/status", label: "\u0421\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435" }, { to: "/tools/test-query", label: "\u0422\u0435\u0441\u0442 \u0437\u0430\u043f\u0440\u043e\u0441\u0430" }] }),
      el(
        Flex,
        { gap: 12, align: "flex-end", style: { marginBottom: "12px" } },
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
        el(SelectControl, {
          label: "\u041b\u0438\u043c\u0438\u0442",
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
        el(Button, { variant: "secondary", onClick: onRefresh, isBusy: analyticsLoading }, "\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c"),
        el(Button, { variant: "tertiary", onClick: onClear, isBusy: analyticsLoading }, "\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c")
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
      analytics &&
        el(
          Card,
          null,
          el(
            CardBody,
            null,
            el("h3", { className: "bss-card-title" }, "\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0435 \u0437\u0430\u043f\u0440\u043e\u0441\u044b"),
            el(Table, {
              rows: analytics.recent || [],
              columns: [
                { key: "created_at", label: "\u0412\u0440\u0435\u043c\u044f" },
                { key: "query", label: "\u0417\u0430\u043f\u0440\u043e\u0441" },
                { key: "results_count", label: "\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432" },
                { key: "context", label: "\u041a\u043e\u043d\u0442\u0435\u043a\u0441\u0442" },
              ],
              emptyText: "\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445 (\u0438\u043b\u0438 \u043b\u043e\u0433\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0432\u044b\u043a\u043b\u044e\u0447\u0435\u043d\u043e).",
            })
          )
        )
    );
  }
  screens.AnalyticsOverviewPage = AnalyticsOverviewPage;


})(window);
