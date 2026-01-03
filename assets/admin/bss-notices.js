/* global window */
(function (root) {
  if (!root || !root.wp || !root.wp.element) return;

  var BSS = root.BSSAdmin || (root.BSSAdmin = {});
  var notices = BSS.notices || (BSS.notices = {});

  var element = root.wp.element;
  var useEffect = element.useEffect;
  var useRef = element.useRef;
  var useState = element.useState;

  /**
   * Hook for toast-style notices.
   * @returns {{toasts: Array, pushNotice: Function, clearNotices: Function, dismissNotice: Function}}
   */
  notices.useNotices = function () {
    var _useState = useState([]),
      toasts = _useState[0],
      setToasts = _useState[1];

    var timersRef = useRef({});

    useEffect(function () {
      return function () {
        var current = timersRef.current || {};
        Object.keys(current).forEach(function (id) {
          window.clearTimeout(current[id]);
        });
        timersRef.current = {};
      };
    }, []);

    function clearNotices() {
      setToasts(function (prev) {
        (prev || []).forEach(function (t) {
          if (t && t.id && timersRef.current[t.id]) {
            window.clearTimeout(timersRef.current[t.id]);
            delete timersRef.current[t.id];
          }
        });
        return [];
      });
    }

    function dismissNotice(id) {
      if (!id) return;
      if (timersRef.current[id]) {
        window.clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
      }
      setToasts(function (prev) {
        return (prev || []).filter(function (t) {
          return t && t.id !== id;
        });
      });
    }

    function pushNotice(status, message, opts) {
      var id = String(Date.now()) + "-" + String(Math.random()).slice(2, 8);
      var ttl = opts && typeof opts.ttl === "number" ? opts.ttl : null;

      setToasts(function (prev) {
        var next = (prev || []).slice(-2);
        next.push({ id: id, status: status || "info", message: String(message || "") });
        return next;
      });

      if (ttl != null && isFinite(ttl) && ttl > 0) {
        timersRef.current[id] = window.setTimeout(function () {
          dismissNotice(id);
        }, ttl);
      }

      return id;
    }

    return {
      toasts: toasts,
      pushNotice: pushNotice,
      clearNotices: clearNotices,
      dismissNotice: dismissNotice,
    };
  };
})(window);
