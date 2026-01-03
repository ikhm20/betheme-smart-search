/* global window */
(function (root) {
  if (!root) return;

  var BSS = root.BSSAdmin || (root.BSSAdmin = {});
  var utils = BSS.utils || (BSS.utils = {});

  /**
   * Clamp numeric input to a range with fallback.
   * @param {*} value
   * @param {number} min
   * @param {number} max
   * @param {number} fallback
   * @returns {number}
   */
  utils.clampInt = function (value, min, max, fallback) {
    var n = parseInt(value, 10);
    if (!isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  };

  /**
   * Safe JSON stringify with circular guard.
   * @param {*} value
   * @returns {string}
   */
  utils.safeJson = function (value) {
    try {
      var seen = typeof WeakSet === "function" ? new WeakSet() : null;
      return JSON.stringify(value || {}, function (key, val) {
        if (!seen || !val || typeof val !== "object") return val;
        if (seen.has(val)) return "[Circular]";
        seen.add(val);
        return val;
      });
    } catch (e) {
      try {
        return JSON.stringify({ error: String((e && e.message) || e || "stringify_failed") });
      } catch (err) {
        return "{}";
      }
    }
  };

  /**
   * Stable JSON stringify (sorts object keys recursively) to avoid false positives
   * when comparing snapshots of options whose key order may vary.
   * @param {*} value
   * @returns {string}
   */
  utils.safeJsonStable = function (value) {
    function sortValue(v, seen) {
      if (!v || typeof v !== "object") return v;
      if (seen.has(v)) return "[Circular]";
      seen.add(v);
      if (Array.isArray(v)) {
        return v.map(function (x) { return sortValue(x, seen); });
      }
      var keys = Object.keys(v).sort();
      var out = {};
      keys.forEach(function (k) {
        out[k] = sortValue(v[k], seen);
      });
      return out;
    }

    try {
      var seen = typeof WeakSet === "function" ? new WeakSet() : new Set();
      return JSON.stringify(sortValue(value || {}, seen));
    } catch (e) {
      return utils.safeJson(value);
    }
  };

  /**
   * Copy text to clipboard with fallback.
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  utils.copyToClipboard = function (text) {
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
  };

  /**
   * Ensure value is an array.
   * @param {*} value
   * @param {Array} fallback
   * @returns {Array}
   */
  utils.ensureArray = function (value, fallback) {
    return Array.isArray(value) ? value : fallback;
  };

  utils.startsWith = function (path, prefix) {
    if (!path || !prefix) return false;
    if (path === prefix) return true;
    return path.indexOf(prefix + "/") === 0;
  };

  utils.makeNavAbbr = function (label) {
    if (!label) return "?";
    var cleaned = String(label)
      .replace(/\s*\u00b7\s*/g, " ")
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
  };

  utils.normalizeEngineId = function (value) {
    var id = String(value || "").trim();
    if (!id) return "";
    id = id.replace(/\s+/g, "-").toLowerCase();
    id = id.replace(/[^a-z0-9_-]/g, "");
    return id;
  };

  utils.buildDefaultEngineFromOptions = function (options) {
    var t = BSS.i18n && typeof BSS.i18n.t === "function" ? BSS.i18n.t : function (msg) { return msg; };
    return {
      id: "default",
      label: t("\u041f\u043e \u0443\u043c\u043e\u043b\u0447\u0430\u043d\u0438\u044e"),
      search_fields: utils.ensureArray(options.search_fields, ["title", "sku", "content"]),
      field_weights: options.field_weights || { title: 5, sku: 10, content: 1 },
      product_meta_keys: utils.ensureArray(options.product_meta_keys, []),
      search_mode: options.search_mode || "auto",
      min_token_length: utils.clampInt(options.min_token_length, 1, 6, 2),
      stopwords: options.stopwords || "",
    };
  };

  utils.normalizeEngineRecord = function (engine, fallback) {
    var t = BSS.i18n && typeof BSS.i18n.t === "function" ? BSS.i18n.t : function (msg) { return msg; };
    var e = engine || {};
    return {
      id: e.id || fallback.id,
      label: String(e.label || fallback.label || t("\u0414\u0432\u0438\u0436\u043e\u043a")),
      search_fields: utils.ensureArray(e.search_fields, fallback.search_fields || []),
      field_weights: e.field_weights || fallback.field_weights || {},
      product_meta_keys: utils.ensureArray(e.product_meta_keys, fallback.product_meta_keys || []),
      search_mode: e.search_mode || fallback.search_mode || "auto",
      min_token_length: utils.clampInt(e.min_token_length, 1, 6, fallback.min_token_length || 2),
      stopwords: String(e.stopwords || fallback.stopwords || ""),
    };
  };

  /**
   * Normalize engines map for UI editing.
   * @param {Object} options
   * @returns {Object}
   */
  utils.normalizeEnginesForUI = function (options) {
    var base = utils.buildDefaultEngineFromOptions(options || {});
    var engines = options && options.engines && typeof options.engines === "object" ? options.engines : {};
    var out = {};
    Object.keys(engines || {}).forEach(function (id) {
      var safeId = utils.normalizeEngineId(id);
      if (!safeId) return;
      var record = utils.normalizeEngineRecord(engines[id], base);
      record.id = safeId;
      out[safeId] = record;
    });

    if (!out.default) {
      out.default = base;
    }
    return out;
  };

  /**
   * Sorted engine id list with default first.
   * @param {Object} enginesMap
   * @returns {string[]}
   */
  utils.engineIdList = function (enginesMap) {
    return Object.keys(enginesMap || {}).sort(function (a, b) {
      if (a === "default") return -1;
      if (b === "default") return 1;
      return a.localeCompare(b);
    });
  };

  /**
   * Basic debounce helper.
   * @param {Function} fn
   * @param {number} wait
   * @returns {Function}
   */
  utils.debounce = function (fn, wait) {
    var timerId = null;
    return function () {
      var args = arguments;
      if (timerId) {
        window.clearTimeout(timerId);
      }
      timerId = window.setTimeout(function () {
        timerId = null;
        fn.apply(null, args);
      }, wait);
    };
  };

  /**
   * Abort/ignore stale requests by key.
   * @returns {{start: Function, isStale: Function, finish: Function, abort: Function}}
   */
  utils.createRequestGate = function () {
    var seq = 0;
    var inflight = {};

    function start(key) {
      var id = ++seq;
      var controller = typeof AbortController === "function" ? new AbortController() : null;
      if (inflight[key] && inflight[key].controller) {
        try {
          inflight[key].controller.abort();
        } catch (e) {
          // ignore
        }
      }
      inflight[key] = { id: id, controller: controller };
      return { id: id, signal: controller ? controller.signal : undefined };
    }

    function isStale(key, id) {
      return !inflight[key] || inflight[key].id !== id;
    }

    function finish(key, id) {
      if (inflight[key] && inflight[key].id === id) {
        delete inflight[key];
      }
    }

    function abort(key) {
      if (!inflight[key]) return;
      if (inflight[key].controller) {
        try {
          inflight[key].controller.abort();
        } catch (e) {
          // ignore
        }
      }
      delete inflight[key];
    }

    return {
      start: start,
      isStale: isStale,
      finish: finish,
      abort: abort,
    };
  };

  /**
   * Read from localStorage safely.
   * @param {string} key
   * @param {string} fallback
   * @returns {string}
   */
  utils.storageGet = function (key, fallback) {
    try {
      return window.localStorage.getItem(key) || fallback;
    } catch (e) {
      return fallback;
    }
  };

  /**
   * Write to localStorage safely.
   * @param {string} key
   * @param {string} value
   * @returns {boolean}
   */
  utils.storageSet = function (key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (e) {
      return false;
    }
  };
})(window);
