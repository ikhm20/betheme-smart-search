/* global window */
(function (root) {
  if (!root || !root.wp || !root.wp.element) return;

  var BSS = root.BSSAdmin || (root.BSSAdmin = {});
  var events = BSS.events || (BSS.events = {});

  var element = root.wp.element;
  var useEffect = element.useEffect;
  var useRef = element.useRef;

  var i18n = BSS.i18n || {};
  var t = typeof i18n.t === "function" ? i18n.t : function (msg) { return msg; };
  var confirmMessage = t("\u0415\u0441\u0442\u044c\u0020\u043d\u0435\u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d\u043d\u044b\u0435\u0020\u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f\u002e\u0020\u041f\u0435\u0440\u0435\u0439\u0442\u0438\u0020\u0431\u0435\u0437\u0020\u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u044f\u003f");

  /**
   * Warn on tab close when there are unsaved changes.
   * @param {boolean} isDirty
   */
  events.useBeforeUnload = function (isDirty) {
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
  };

  /**
   * Bind Ctrl+S / Cmd+S to save callback.
   * @param {boolean} isDirty
   * @param {boolean} isSaving
   * @param {Function} onSave
   */
  events.useSaveShortcut = function (isDirty, isSaving, onSave) {
    useEffect(function () {
      function onKeyDown(e) {
        if (!e) return;
        if (!isDirty) return;

        var key = String(e.key || "").toLowerCase();
        var isSave = key === "s" && (e.ctrlKey || e.metaKey);
        if (!isSave) return;

        e.preventDefault();
        if (isSaving) return;
        if (typeof onSave === "function") onSave();
      }

      window.addEventListener("keydown", onKeyDown);
      return function () {
        window.removeEventListener("keydown", onKeyDown);
      };
    }, [isDirty, isSaving, onSave]);
  };

  /**
   * Guard hash navigation when there are unsaved changes.
   * @param {{path: string, navigate: Function}} router
   * @param {boolean} isDirty
   * @returns {{guardedNavigate: Function}}
   */
  events.useDirtyNavigationGuard = function (router, isDirty) {
    var config = BSS.config || {};
    var defaultRoute = config.DEFAULT_ROUTE || "/dashboard";

    var lastPathRef = useRef(router.path);
    var allowHashChangeRef = useRef(null);

    useEffect(function () {
      lastPathRef.current = router.path;
    }, [router.path]);

    useEffect(function () {
      function normalizePathFromHash() {
        var raw = typeof window.location.hash === "string" ? window.location.hash.replace(/^#/, "") : "";
        var next = raw || defaultRoute;
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

        var ok = window.confirm(confirmMessage);
        if (ok) return;

        allowHashChangeRef.current = lastPathRef.current;
        window.location.hash = lastPathRef.current;
      }

      window.addEventListener("hashchange", onHashChange);
      return function () {
        window.removeEventListener("hashchange", onHashChange);
      };
    }, [isDirty, defaultRoute]);

    function guardedNavigate(nextPath) {
      if (!nextPath) return;

      var normalized = nextPath.charAt(0) === "/" ? nextPath : "/" + nextPath;
      if (normalized === router.path) return;

      if (isDirty) {
        var ok = window.confirm(confirmMessage);
        if (!ok) return;
      }

      allowHashChangeRef.current = normalized;
      router.navigate(normalized);
    }

    return { guardedNavigate: guardedNavigate };
  };
})(window);
