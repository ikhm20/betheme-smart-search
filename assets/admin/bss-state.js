/* global window */
(function (root) {
  if (!root || !root.wp || !root.wp.element) return;

  var BSS = root.BSSAdmin || (root.BSSAdmin = {});
  var state = BSS.state || (BSS.state = {});

  var element = root.wp.element;
  var useEffect = element.useEffect;
  var useRef = element.useRef;
  var useState = element.useState;

  /**
   * Lightweight hash router hook.
   * @param {Function} [shouldBlock]
   * @returns {{path: string, navigate: Function}}
   */
  state.useHashLocation = function (shouldBlock) {
    var config = BSS.config || {};
    var defaultRoute = config.DEFAULT_ROUTE || "/dashboard";
    var initial = typeof window.location.hash === "string" ? window.location.hash : "";
    var initialPath = initial.replace(/^#/, "") || defaultRoute;

    var _useState = useState(initialPath),
      path = _useState[0],
      setPath = _useState[1];

    var pathRef = useRef(initialPath);

    useEffect(function () {
      pathRef.current = path;
    }, [path]);

    useEffect(function () {
      function normalizeHash() {
        var raw = typeof window.location.hash === "string" ? window.location.hash.replace(/^#/, "") : "";
        var next = raw || defaultRoute;
        if (next.charAt(0) !== "/") next = "/" + next;
        return next;
      }

      function onChange() {
        var next = normalizeHash();
        var current = pathRef.current || defaultRoute;
        if (next === current) return;

        if (typeof shouldBlock === "function" && shouldBlock(next, current)) {
          if (window.location.hash.replace(/^#/, "") !== current) {
            window.location.hash = current;
          }
          return;
        }

        pathRef.current = next;
        setPath(next);
      }

      window.addEventListener("hashchange", onChange);
      return function () {
        window.removeEventListener("hashchange", onChange);
      };
    }, [shouldBlock, defaultRoute]);

    function navigate(nextPath) {
      if (!nextPath) return;
      if (nextPath.charAt(0) !== "/") nextPath = "/" + nextPath;
      if (window.location.hash.replace(/^#/, "") === nextPath) return;
      window.location.hash = nextPath;
    }

    return { path: path, navigate: navigate };
  };

  /**
   * Minimal observable store for shared state.
   * @param {Object} initialState
   * @returns {{getState: Function, setState: Function, subscribe: Function}}
   */
  state.createStore = function (initialState) {
    var stateValue = initialState || {};
    var listeners = [];

    function getState() {
      return stateValue;
    }

    function setState(next) {
      stateValue = Object.assign({}, stateValue, next || {});
      listeners.slice().forEach(function (fn) {
        try {
          fn(stateValue);
        } catch (e) {
          // ignore
        }
      });
    }

    function subscribe(fn) {
      listeners.push(fn);
      return function () {
        listeners = listeners.filter(function (cb) {
          return cb !== fn;
        });
      };
    }

    return { getState: getState, setState: setState, subscribe: subscribe };
  };
})(window);
