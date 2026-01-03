/* global window */
(function (root) {
  if (!root) return;

  var BSS = root.BSSAdmin || (root.BSSAdmin = {});
  var config = BSS.config || (BSS.config = {});

  config.TEXT_DOMAIN = "betheme-smart-search";
  config.DEFAULT_ROUTE = "/dashboard";
  config.STORAGE_KEYS = {
    navCollapsed: "bss_nav_collapsed",
  };

  var i18n = BSS.i18n || {};
  var t = typeof i18n.t === "function" ? i18n.t : function (msg) { return msg; };

  var NAV_ITEMS = [
    { type: "header", label: t("\u041e\u0441\u043d\u043e\u0432\u043d\u043e\u0435") },
    { to: "/dashboard", label: t("\u0414\u0430\u0448\u0431\u043e\u0440\u0434") },

    { type: "header", label: t("\u041f\u043b\u0430\u0433\u0438\u043d") },
    { to: "/settings/general", label: t("\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438"), activePrefix: "/settings" },

    { type: "header", label: t("\u0414\u0430\u043d\u043d\u044b\u0435") },
    { to: "/analytics/overview", label: t("\u0410\u043d\u0430\u043b\u0438\u0442\u0438\u043a\u0430"), activePrefix: "/analytics" },

    { type: "header", label: t("\u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b") },
    { to: "/tools/status", label: t("\u0421\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435"), activePrefix: "/tools/status" },
    { to: "/tools/test-query", label: t("\u0422\u0435\u0441\u0442 \u0437\u0430\u043f\u0440\u043e\u0441\u0430"), activePrefix: "/tools/test-query" },
  ];

  config.getNavItems = function () {
    return NAV_ITEMS || [];
  };
})(window);
