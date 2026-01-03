/* global window */
(function (root) {
  if (!root || !root.wp || !root.wp.element) return;

  var BSS = root.BSSAdmin || (root.BSSAdmin = {});
  var config = BSS.config || {};
  var utils = BSS.utils || {};
  var state = BSS.state || {};
  var api = BSS.api || {};
  var events = BSS.events || {};

  var element = root.wp.element;
  var el = element.createElement;
  var Fragment = element.Fragment;
  var useEffect = element.useEffect;
  var useMemo = element.useMemo;
  var useRef = element.useRef;
  var useState = element.useState;

  var isAbortError = typeof api.isAbortError === "function" ? api.isAbortError : function () { return false; };
  var useHashLocation = state.useHashLocation;

  var components = root.wp.components || {};
  var Button = components.Button;
  var Flex = components.Flex;
  var Notice = components.Notice;
  var Spinner = components.Spinner;
  var TextControl = components.TextControl;

  var ui = BSS.ui || {};
  var notices = BSS.notices || {};
  var useNotices = notices.useNotices;

  var screens = ui.screens || {};
  var NavLink = ui.NavLink;
  var NavHeader = ui.NavHeader;
  var SectionTitle = ui.SectionTitle;
  var Table = ui.Table;
  var Tabs = ui.Tabs;
  var Toasts = ui.Toasts;

  var DashboardPage = screens.DashboardPage;
  var SettingsGeneralPage = screens.SettingsGeneralPage;
  var SettingsLiveSearchPage = screens.SettingsLiveSearchPage;
  var SettingsQualityPage = screens.SettingsQualityPage;
  var SettingsDictionariesPage = screens.SettingsDictionariesPage;
  var SettingsEnginesPage = screens.SettingsEnginesPage;
  var AnalyticsOverviewPage = screens.AnalyticsOverviewPage;
  var ToolsStatusPage = screens.ToolsStatusPage;
  var ToolsTestQueryPage = screens.ToolsTestQueryPage;

  var startsWith = utils.startsWith;
  var safeJson = utils.safeJson;
  var safeJsonStable = typeof utils.safeJsonStable === "function" ? utils.safeJsonStable : utils.safeJson;
  var copyToClipboard = utils.copyToClipboard;
  var makeNavAbbr = utils.makeNavAbbr;
  var storageGet = utils.storageGet;
  var storageSet = utils.storageSet;
  var navStorageKey = config.STORAGE_KEYS && config.STORAGE_KEYS.navCollapsed ? config.STORAGE_KEYS.navCollapsed : "bss_nav_collapsed";

  var NAV_ITEMS = typeof config.getNavItems === "function" ? config.getNavItems() : [];


function App() {
    var router = useHashLocation();

    var _useState = useState(true),
      isLoading = _useState[0],
      setIsLoading = _useState[1];

    var _useState2 = useState(false),
      isSaving = _useState2[0],
      setIsSaving = _useState2[1];

    var _useState4 = useState(null),
      data = _useState4[0],
      setData = _useState4[1];

    var _useState5 = useState(null),
      options = _useState5[0],
      setOptions = _useState5[1];

    var noticesState = typeof useNotices === "function" ? useNotices() : null;
    var toasts = noticesState ? noticesState.toasts : [];
    var pushToast = noticesState ? noticesState.pushNotice : function () {};
    var clearToasts = noticesState ? noticesState.clearNotices : function () {};
    var dismissToast = noticesState ? noticesState.dismissNotice : function () {};

    var savedSnapshotRef = useRef("{}");
    var _useStateNav = useState(function () {
      if (!storageGet) return false;
      return storageGet(navStorageKey, "0") === "1";
    }),
      isNavCollapsed = _useStateNav[0],
      setIsNavCollapsed = _useStateNav[1];

    var pages = useMemo(function () {
      return data && data.pages ? data.pages : [{ value: 0, label: "\u2014 \u041e\u0442\u043a\u043b\u044e\u0447\u0435\u043d\u043e \u2014" }];
    }, [data]);

    var isDirty = useMemo(function () {
      if (!options) return false;
      return safeJsonStable(options) !== savedSnapshotRef.current;
    }, [options]);

    var useBeforeUnload = typeof events.useBeforeUnload === "function" ? events.useBeforeUnload : function () {};
    var useSaveShortcut = typeof events.useSaveShortcut === "function" ? events.useSaveShortcut : function () {};
    var useDirtyNavigationGuard = typeof events.useDirtyNavigationGuard === "function"
      ? events.useDirtyNavigationGuard
      : function () { return { guardedNavigate: router.navigate }; };

    useBeforeUnload(isDirty);

    var guard = useDirtyNavigationGuard(router, isDirty);
    var guardedNavigate = guard && guard.guardedNavigate ? guard.guardedNavigate : router.navigate;

    useSaveShortcut(isDirty, isSaving, save);

    function toggleNav() {
      setIsNavCollapsed(function (prev) {
        var next = !prev;
        if (storageSet) {
          storageSet(navStorageKey, next ? "1" : "0");
        }
        return next;
      });
    }

    var _useStateNavFilter = useState(""),
      navFilter = _useStateNavFilter[0],
      setNavFilter = _useStateNavFilter[1];


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
      api.getAnalytics(analyticsDays, analyticsLimit, { requestKey: "analytics" })
        .then(function (res) {
          setAnalytics(res || null);
        })
        .catch(function (err) {
          if (isAbortError(err)) return;
          pushToast("error", (err && err.message) || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0430\u043d\u0430\u043b\u0438\u0442\u0438\u043a\u0443.", { ttl: 8000 });
        })
        .finally(function () {
          setAnalyticsLoading(false);
        });
    }

    function clearAnalytics() {
      if (!window.confirm("\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c \u0438\u0441\u0442\u043e\u0440\u0438\u044e \u043f\u043e\u0438\u0441\u043a\u043e\u0432?")) return;
      setAnalyticsLoading(true);
      api.clearAnalytics()
        .then(function () {
          pushToast("success", "\u0410\u043d\u0430\u043b\u0438\u0442\u0438\u043a\u0430 \u043e\u0447\u0438\u0449\u0435\u043d\u0430.", { ttl: 4000 });
          setAnalytics(null);
          loadAnalytics();
        })
        .catch(function (err) {
          if (isAbortError(err)) return;
          pushToast("error", (err && err.message) || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0447\u0438\u0441\u0442\u0438\u0442\u044c \u0430\u043d\u0430\u043b\u0438\u0442\u0438\u043a\u0443.", { ttl: 8000 });
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
      api.getStatus({ requestKey: "status" })
        .then(function (res) {
          setStatus(res || null);
        })
        .catch(function (err) {
          if (isAbortError(err)) return;
          pushToast("error", (err && err.message) || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435.", { ttl: 8000 });
        })
        .finally(function () {
          setStatusLoading(false);
        });
    }

    function copyStatusReport() {
      if (!status) {
        pushToast("warning", "\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445 \u0434\u043b\u044f \u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f. \u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043d\u0430\u0436\u043c\u0438\u0442\u0435 \u00ab\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c\u00bb.", { ttl: 5000 });
        return;
      }

      var report = safeJson(status);
      copyToClipboard(report).then(function (ok) {
        if (ok) {
          pushToast("success", "\u041e\u0442\u0447\u0435\u0442 \u0441\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d \u0432 \u0431\u0443\u0444\u0435\u0440 \u043e\u0431\u043c\u0435\u043d\u0430.", { ttl: 4000 });
        } else {
          pushToast("error", "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043e\u0442\u0447\u0435\u0442. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043e\u0442\u043a\u0440\u044b\u0442\u044c JSON \u0438 \u0441\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0432\u0440\u0443\u0447\u043d\u0443\u044e.", { ttl: 8000 });
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

    var _useStateTestQuery = useState(""),
      testQuery = _useStateTestQuery[0],
      setTestQuery = _useStateTestQuery[1];

    var _useStateTestLoading = useState(false),
      testLoading = _useStateTestLoading[0],
      setTestLoading = _useStateTestLoading[1];

    var _useStateTestResult = useState(null),
      testResult = _useStateTestResult[0],
      setTestResult = _useStateTestResult[1];

    function timedFetch(promiseFactory) {
      var started = window.performance && performance.now ? performance.now() : Date.now();
      return Promise.resolve()
        .then(promiseFactory)
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
        pushToast("warning", "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u0435\u0441\u0442\u043e\u0432\u044b\u0439 \u0437\u0430\u043f\u0440\u043e\u0441.", { ttl: 5000 });
        return;
      }

      setBenchmarkLoading(true);
      setBenchmarkResult(null);

      Promise.resolve()
        .then(function () {
          return timedFetch(function () {
            return api.getStatus({ requestKey: "benchmarkStatus" });
          });
        })
        .then(function (statusRes) {
          return timedFetch(function () {
            return api.testQuery(q, 10, { requestKey: "benchmarkTest" });
          }).then(function (testRes) {
            return { statusRes: statusRes, testRes: testRes };
          });
        })
        .then(function (pack) {
          return timedFetch(function () {
            return api.publicQuery(q, 10, { requestKey: "benchmarkPublic" });
          }).then(function (publicRes) {
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
            pushToast("warning", "\u0422\u0435\u0441\u0442 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d, \u043d\u043e \u043e\u0434\u0438\u043d \u0438\u0437 \u0437\u0430\u043f\u0440\u043e\u0441\u043e\u0432 \u0432\u0435\u0440\u043d\u0443\u043b \u043e\u0448\u0438\u0431\u043a\u0443. \u0421\u043c\u043e\u0442\u0440\u0438 \u043a\u043e\u043d\u0441\u043e\u043b\u044c/Network.", { ttl: 8000 });
          } else {
            pushToast("success", "\u0422\u0435\u0441\u0442 \u0441\u043a\u043e\u0440\u043e\u0441\u0442\u0438 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d.", { ttl: 3000 });
          }
        })
        .catch(function () {
          pushToast("error", "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u0442\u0435\u0441\u0442 \u0441\u043a\u043e\u0440\u043e\u0441\u0442\u0438.", { ttl: 8000 });
        })
        .finally(function () {
          setBenchmarkLoading(false);
        });
    }

    function runTestQuery() {
      var q = (testQuery || "").trim();
      if (!q) return;
      setTestLoading(true);
      api.testQuery(q, 10, { requestKey: "testQuery" })
        .then(function (res) {
          setTestResult(res || null);
        })
        .catch(function (err) {
          if (isAbortError(err)) return;
          pushToast("error", (err && err.message) || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u044b\u043f\u043e\u043b\u043d\u0438\u0442\u044c \u0442\u0435\u0441\u0442.", { ttl: 8000 });
        })
        .finally(function () {
          setTestLoading(false);
        });
    }

    useEffect(function () {
      api.getSettings({ requestKey: "settings" })
        .then(function (res) {
          setData(res);
          setOptions(res.options || {});
          savedSnapshotRef.current = safeJsonStable(res.options || {});
        })
        .catch(function (err) {
          if (isAbortError(err)) return;
          pushToast("error", (err && err.message) || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438.", { ttl: 8000 });
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

    useEffect(function () {
      if (!startsWith(router.path, "/dashboard")) return;
      if (statusLoading) return;
      if (status) return;
      loadStatus();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.path]);

    function save() {
      if (!options) return;
      setIsSaving(true);
      clearToasts();

      api.saveSettings(options)
        .then(function (res) {
          var next = (res && res.options) || options;
          setOptions(next);
          savedSnapshotRef.current = safeJsonStable(next);
          pushToast("success", "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u044b.", { ttl: 4000 });
        })
        .catch(function (err) {
          if (isAbortError(err)) return;
          pushToast("error", (err && err.message) || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438.", { ttl: 8000 });
        })
        .finally(function () {
          setIsSaving(false);
        });
    }

    function resetToDefaults() {
      if (!window.confirm("\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u043a \u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f\u043c \u043f\u043e \u0443\u043c\u043e\u043b\u0447\u0430\u043d\u0438\u044e?")) return;
      setIsSaving(true);
      clearToasts();

      api.resetSettings()
        .then(function (res) {
          var next = (res && res.options) || {};
          setOptions(next);
          savedSnapshotRef.current = safeJsonStable(next);
          pushToast("success", "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0441\u0431\u0440\u043e\u0448\u0435\u043d\u044b.", { ttl: 4000 });
        })
        .catch(function (err) {
          if (isAbortError(err)) return;
          pushToast("error", (err && err.message) || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438.", { ttl: 8000 });
        })
        .finally(function () {
          setIsSaving(false);
        });
    }

    function clearCache() {
      if (!window.confirm("\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c \u043a\u0435\u0448 \u043f\u043b\u0430\u0433\u0438\u043d\u0430?")) return;

      setIsSaving(true);
      clearToasts();

      api.clearCache()
        .then(function () {
          pushToast("success", "\u041a\u0435\u0448 \u043e\u0447\u0438\u0449\u0435\u043d.", { ttl: 4000 });
        })
        .catch(function (err) {
          if (isAbortError(err)) return;
          pushToast("error", (err && err.message) || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0447\u0438\u0441\u0442\u0438\u0442\u044c \u043a\u0435\u0448.", { ttl: 8000 });
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
          status: status,
          statusLoading: statusLoading,
          onStatusRefresh: loadStatus,
          navigate: guardedNavigate,
        });
      }

      if (startsWith(router.path, "/settings/general")) {
        return el(SettingsGeneralPage, { options: options, updateOption: updateOption, pages: pages, navigate: guardedNavigate });
      }

      if (startsWith(router.path, "/settings/live-search")) {
        return el(SettingsLiveSearchPage, { options: options, updateOption: updateOption, navigate: guardedNavigate });
      }

      if (startsWith(router.path, "/settings/quality")) {
        return el(SettingsQualityPage, { options: options, updateOption: updateOption, navigate: guardedNavigate });
      }

      if (startsWith(router.path, "/settings/dictionaries")) {
        return el(SettingsDictionariesPage, { options: options, updateOption: updateOption, navigate: guardedNavigate });
      }

      if (startsWith(router.path, "/settings/engines")) {
        return el(SettingsEnginesPage, { options: options, updateOption: updateOption, navigate: guardedNavigate });
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
        status: status,
        statusLoading: statusLoading,
        onStatusRefresh: loadStatus,
        navigate: guardedNavigate,
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
          isDirty && el("span", { className: "bss-dirty" }, "\u0415\u0441\u0442\u044c \u043d\u0435\u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d\u043d\u044b\u0435 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f"),
          el(
            Button,
            { variant: "secondary", onClick: toggleNav, disabled: isSaving, className: "bss-nav-toggle" },
            isNavCollapsed ? "\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u043c\u0435\u043d\u044e" : "\u0421\u043a\u0440\u044b\u0442\u044c \u043c\u0435\u043d\u044e"
          ),
          el(Button, { variant: "secondary", onClick: clearCache, isBusy: isSaving }, "\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c \u043a\u0435\u0448"),
          el(Button, { variant: "secondary", onClick: resetToDefaults, isBusy: isSaving }, "\u0421\u0431\u0440\u043e\u0441"),
          el(Button, { variant: "primary", onClick: save, isBusy: isSaving, disabled: isSaving || !isDirty }, "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c")
        )
      ),
      el(
        "div",
        { className: "bss-body" + (isNavCollapsed ? " is-nav-collapsed" : "") },
        el(
          "nav",
          { className: "bss-nav", "aria-label": "\u041d\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044f" },
          !isNavCollapsed &&
            el(TextControl, {
              label: "\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u043c\u0435\u043d\u044e",
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
        (Toasts
          ? el(Toasts, {
              list: toasts,
              onDismiss: function (id) {
                dismissToast(id);
              },
            })
          : el(
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
                      dismissToast(t.id);
                    },
                  },
                  t.message
                );
              })
            ))
    );
  }

  ui.App = App;
})(window);
