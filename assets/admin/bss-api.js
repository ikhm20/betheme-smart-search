/* global window */
(function (root) {
  if (!root) return;

  var BSS = root.BSSAdmin || (root.BSSAdmin = {});
  var api = BSS.api || (BSS.api = {});
  var utils = BSS.utils || {};

  var gate = utils.createRequestGate ? utils.createRequestGate() : null;

  function getAdminConfig() {
    return root.bethemeSmartSearchAdmin || {};
  }

  function normalizeError(err) {
    if (!err) {
      return { message: "Unknown error", code: "unknown" };
    }
    if (err.code && !err.message) {
      return {
        message: err.code === "abort" ? "Request aborted" : String(err.code),
        code: err.code,
        data: err.data || null,
        status: err.status || null,
        aborted: !!err.aborted,
      };
    }
    if (err.name === "AbortError" || err.code === "abort") {
      return { message: "Request aborted", code: "abort", aborted: true };
    }
    if (typeof err === "string") {
      return { message: err, code: "string" };
    }
    if (err.message && err.code) {
      return { message: err.message, code: err.code, data: err.data || null, status: err.status || null };
    }
    if (err.message) {
      return { message: err.message, code: "error" };
    }
    return { message: String(err), code: "error" };
  }

  function withNonceHeaders(headers) {
    var cfg = getAdminConfig();
    if (!cfg || !cfg.rest_nonce) return headers || {};
    var next = headers ? Object.assign({}, headers) : {};
    next["X-WP-Nonce"] = cfg.rest_nonce;
    return next;
  }

  /**
   * Send a request via wp.apiFetch with nonce headers and optional requestKey.
   * @param {Object} args
   * @returns {Promise<*>}
   */
  api.request = function (args) {
    if (!root.wp || typeof root.wp.apiFetch !== "function") {
      return Promise.reject(normalizeError({ message: "apiFetch unavailable", code: "no_api_fetch" }));
    }

    var nextArgs = Object.assign({}, args || {});
    var requestKey = nextArgs.requestKey;
    delete nextArgs.requestKey;

    var gateToken = null;
    if (requestKey && gate) {
      gateToken = gate.start(requestKey);
      if (gateToken.signal) {
        nextArgs.signal = gateToken.signal;
      }
    }

    nextArgs.headers = withNonceHeaders(nextArgs.headers);

    return root.wp.apiFetch(nextArgs)
      .then(function (res) {
        if (requestKey && gate && gateToken && gate.isStale(requestKey, gateToken.id)) {
          throw { code: "abort", aborted: true, message: "Request aborted" };
        }
        if (requestKey && gate && gateToken) {
          gate.finish(requestKey, gateToken.id);
        }
        return res;
      })
      .catch(function (err) {
        var normalized = normalizeError(err);
        if (requestKey && gate && gateToken) {
          gate.finish(requestKey, gateToken.id);
        }
        throw normalized;
      });
  };

  /**
   * Detect abort errors from AbortController or stale requestKey.
   * @param {Object} err
   * @returns {boolean}
   */
  api.isAbortError = function (err) {
    return !!(err && (err.aborted || err.code === "abort" || err.name === "AbortError"));
  };

  /**
   * Fetch admin settings payload.
   * @param {Object} [opts]
   * @returns {Promise<*>}
   */
  api.getSettings = function (opts) {
    var cfg = getAdminConfig();
    return api.request({
      path: String(cfg.rest_path || "") + "/settings",
      requestKey: opts && opts.requestKey,
      signal: opts && opts.signal,
    });
  };

  /**
   * Persist settings options.
   * @param {Object} options
   * @returns {Promise<*>}
   */
  api.saveSettings = function (options) {
    var cfg = getAdminConfig();
    return api.request({
      path: String(cfg.rest_path || "") + "/settings",
      method: "POST",
      data: { options: options },
      requestKey: "saveSettings",
    });
  };

  /**
   * Reset settings to defaults.
   * @returns {Promise<*>}
   */
  api.resetSettings = function () {
    var cfg = getAdminConfig();
    return api.request({
      path: String(cfg.rest_path || "") + "/reset",
      method: "POST",
      requestKey: "resetSettings",
    });
  };

  /**
   * Clear plugin cache.
   * @returns {Promise<*>}
   */
  api.clearCache = function () {
    var cfg = getAdminConfig();
    return api.request({
      path: String(cfg.rest_path || "") + "/clear-cache",
      method: "POST",
      requestKey: "clearCache",
    });
  };

  /**
   * Trigger a reindex operation (clears transients and bumps an index version).
   * @returns {Promise<*>}
   */
  api.reindex = function () {
    var cfg = getAdminConfig();
    return api.request({
      path: String(cfg.rest_path || "") + "/reindex",
      method: "POST",
      requestKey: "reindex",
    });
  };

  /**
   * Load analytics data.
   * @param {number} days
   * @param {number} limit
   * @param {Object} [opts]
   * @returns {Promise<*>}
   */
  api.getAnalytics = function (days, limit, opts) {
    var cfg = getAdminConfig();
    return api.request({
      path:
        String(cfg.rest_path || "") +
        "/analytics?days=" +
        encodeURIComponent(days) +
        "&limit=" +
        encodeURIComponent(limit),
      requestKey: (opts && opts.requestKey) || "analytics",
      signal: opts && opts.signal,
    });
  };

  /**
   * Clear analytics history.
   * @returns {Promise<*>}
   */
  api.clearAnalytics = function () {
    var cfg = getAdminConfig();
    return api.request({
      path: String(cfg.rest_path || "") + "/analytics/clear",
      method: "POST",
      requestKey: "analytics",
    });
  };

  /**
   * Load status report.
   * @param {Object} [opts]
   * @returns {Promise<*>}
   */
  api.getStatus = function (opts) {
    var cfg = getAdminConfig();
    return api.request({
      path: String(cfg.rest_path || "") + "/status",
      requestKey: (opts && opts.requestKey) || "status",
      signal: opts && opts.signal,
    });
  };

  /**
   * Run test query.
   * @param {string} query
   * @param {number} limit
   * @param {Object} [opts]
   * @returns {Promise<*>}
   */
  api.testQuery = function (query, limit, opts) {
    var cfg = getAdminConfig();
    return api.request({
      path: String(cfg.rest_path || "") + "/test-query?q=" + encodeURIComponent(query) + "&limit=" + encodeURIComponent(limit),
      requestKey: (opts && opts.requestKey) || "testQuery",
      signal: opts && opts.signal,
    });
  };

  /**
   * Run public query (frontend endpoint) for benchmarks.
   * @param {string} query
   * @param {number} limit
   * @param {Object} [opts]
   * @returns {Promise<*>}
   */
  api.publicQuery = function (query, limit, opts) {
    var cfg = getAdminConfig();
    var base = String(cfg.public_rest_path || "/betheme-smart-search/v1/query");
    return api.request({
      path: base + "?q=" + encodeURIComponent(query) + "&context=shop&limit=" + encodeURIComponent(limit),
      requestKey: opts && opts.requestKey,
      signal: opts && opts.signal,
    });
  };
})(window);
