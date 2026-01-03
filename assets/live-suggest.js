/* global bethemeSmartSearchLiveSuggest */

(function (root) {
  "use strict";

  root = root || window;
  var Live = root.BSSLiveSuggest || (root.BSSLiveSuggest = {});

  function getConfig() {
    var cfg = window.bethemeSmartSearchLiveSuggest || {};
    return {
      presearchUrl: String(cfg.presearch_url || ""),
      presearchSelectionUrl: String(cfg.presearch_selection_url || ""),
      presearchLogUrl: String(cfg.presearch_log_url || ""),
      enablePresearchLogging: !!cfg.enable_presearch_logging,
      suggestUrl: String(cfg.suggest_url || ""),
      liveUrl: String(cfg.live_url || ""),
      debounceDesktopMs: Number(cfg.debounce_desktop_ms || cfg.debounce_ms || 250),
      debounceMobileMs: Number(cfg.debounce_mobile_ms || 500),
      minChars: Number(cfg.min_chars || 3),
      context: String(cfg.context || "shop"),
      maxItems: Number(cfg.max_items || 6),
      maxProducts: Number(cfg.max_products || 5),
      showCodeProducts: cfg.show_code_products !== false,
      showSuggestions: !!cfg.show_suggestions,
      storageKey: String(cfg.storage_key || "bss_search_history_v1"),
      strings: cfg.strings || {},
    };
  }

  var FALLBACK_STRINGS = {
    heading_suggestions: "\u041f\u043e\u0445\u043e\u0436\u0438\u0435 \u0437\u0430\u043f\u0440\u043e\u0441\u044b",
    heading_history: "\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u043f\u043e\u0438\u0441\u043a\u0430",
    heading_popular_products: "\u041f\u043e\u043f\u0443\u043b\u044f\u0440\u043d\u044b\u0435 \u0442\u043e\u0432\u0430\u0440\u044b",
    heading_products: "\u0422\u043e\u0432\u0430\u0440\u044b \u043f\u043e \u0430\u0440\u0442\u0438\u043a\u0443\u043b\u0443",
    heading_products_generic: "\u0422\u043e\u0432\u0430\u0440\u044b",
    heading_words: "\u041f\u043e\u0434\u0441\u043a\u0430\u0437\u043a\u0438",
    heading_categories: "\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438",
    heading_brands: "\u0411\u0440\u0435\u043d\u0434\u044b",
    heading_exact: "\u0422\u043e\u0447\u043d\u043e\u0435 \u0441\u043e\u0432\u043f\u0430\u0434\u0435\u043d\u0438\u0435",
    label_loading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430",
    label_clear_history: "\u041e\u0447\u0438\u0441\u0442\u0438\u0442\u044c \u0438\u0441\u0442\u043e\u0440\u0438\u044e",
    label_remove_history: "\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0437\u0430\u043f\u0440\u043e\u0441",
    heading: "\u041f\u043e\u0445\u043e\u0436\u0438\u0435 \u0437\u0430\u043f\u0440\u043e\u0441\u044b",
  };

  function getDebounceMs(cfg) {
    var isCoarse = false;
    try {
      isCoarse = !!window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    } catch (e) {
      isCoarse = false;
    }
    return isCoarse ? cfg.debounceMobileMs : cfg.debounceDesktopMs;
  }

  function debounce(fn, wait) {
    var t = null;
    return function () {
      var ctx = this;
      var args = arguments;
      if (t) window.clearTimeout(t);
      t = window.setTimeout(function () {
        t = null;
        fn.apply(ctx, args);
      }, wait);
    };
  }

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return fallback;
    }
  }

  var HistoryStore = {
    get: function (cfg) {
      try {
        var raw = window.localStorage.getItem(cfg.storageKey);
        var list = safeJsonParse(raw || "[]", []);
        return Array.isArray(list) ? list : [];
      } catch (e) {
        return [];
      }
    },
    save: function (cfg, list) {
      try {
        window.localStorage.setItem(cfg.storageKey, JSON.stringify(list));
      } catch (e) {
        // ignore
      }
    },
    removeItem: function (cfg, query) {
      var q = String(query || "").trim();
      if (!q) return;
      var list = HistoryStore.get(cfg)
        .filter(function (x) {
          return typeof x === "string" && x.trim();
        })
        .filter(function (x) {
          return x.toLowerCase() !== q.toLowerCase();
        });
      HistoryStore.save(cfg, list);
    },
    clear: function (cfg) {
      try {
        window.localStorage.removeItem(cfg.storageKey);
      } catch (e) {
        // ignore
      }
    },
    push: function (cfg, query) {
      var q = String(query || "").trim();
      if (!q) return;
      var list = HistoryStore.get(cfg)
        .filter(function (x) {
          return typeof x === "string" && x.trim();
        })
        .map(function (x) {
          return x.trim();
        });

      list = list.filter(function (x) {
        return x.toLowerCase() !== q.toLowerCase();
      });
      list.unshift(q);
      list = list.slice(0, 10);
      HistoryStore.save(cfg, list);
    },
  };

  function logPresearch(cfg, event, query, meta) {
    if (!cfg.enablePresearchLogging || !cfg.presearchLogUrl) return;
    if (!event) return;

    var payload = {
      event: String(event),
      query: String(query || ""),
      context: String(cfg.context || "shop"),
      meta: meta && typeof meta === "object" ? meta : {},
    };

    try {
      var body = JSON.stringify(payload);
      if (navigator && typeof navigator.sendBeacon === "function") {
        var blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(cfg.presearchLogUrl, blob);
        return;
      }

      window.fetch(cfg.presearchLogUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
        credentials: "same-origin",
        keepalive: true,
      });
    } catch (e) {
      // ignore
    }
  }

  function isCodeLike(query) {
    var q = String(query || "").trim();
    if (!q) return false;

    if (/\s/.test(q)) return false;
    if (/\d/.test(q)) return true;
    if (/[-_]/.test(q)) return true;
    if (/^[A-Za-z]+$/.test(q)) {
      if (q.length > 4) return false;
      return q === q.toUpperCase();
    }
    return false;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeRegExp(s) {
    return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlightHtml(text, needle) {
    var t = String(text || "");
    var n = String(needle || "").trim();
    if (!t || !n) return escapeHtml(t);

    var re;
    try {
      re = new RegExp(escapeRegExp(n), "ig");
    } catch (e) {
      return escapeHtml(t);
    }

    var parts = t.split(re);
    if (parts.length <= 1) return escapeHtml(t);

    var matches = t.match(re) || [];
    var out = "";
    var i;
    for (i = 0; i < parts.length; i++) {
      out += escapeHtml(parts[i]);
      if (i < matches.length) {
        out += '<mark class="bss-highlight">' + escapeHtml(matches[i]) + "</mark>";
      }
    }
    return out;
  }

  function normalizeHeadingValue(value) {
    var s = String(value || "");
    if (!s) return "";
    if (/^[\?\s]+$/.test(s)) return "";
    return s;
  }

  function headingText(cfg, key, fallback) {
    var s = cfg.strings && cfg.strings[key] ? String(cfg.strings[key]) : "";
    s = normalizeHeadingValue(s);
    if (s) return s;
    if (fallback) return fallback;
    return FALLBACK_STRINGS[key] || "";
  }

  function findLiveBox(input) {
    var form = input.closest ? input.closest("form") : null;
    if (!form) return null;
    var box = form.querySelector(".mfn-live-search-box");
    if (box) return box;
    if (form.parentElement) {
      return form.parentElement.querySelector(".mfn-live-search-box");
    }
    return null;
  }

  function getOpenContainer(input, box) {
    if (input && input.closest) {
      var form = input.closest("form");
      if (form) return form;
    }
    return box && box.parentElement ? box.parentElement : document.body;
  }

  function setOpenState(input, box, open) {
    var container = getOpenContainer(input, box);
    if (!container || !container.classList) return;
    if (open) {
      container.classList.add("bss-live-open");
      if (box && box.style && box.style.display === "none") box.style.display = "block";
    } else {
      container.classList.remove("bss-live-open");
      if (box && box.style) box.style.display = "none";
    }
  }

  function ensureSection(box, className) {
    var list = box.querySelector(".mfn-live-search-list");
    if (!list) return null;
    var li = list.querySelector("." + className);
    if (!li) {
      li = document.createElement("li");
      li.className = className;
      li.style.display = "none";
      li.innerHTML = "<ul></ul>";
      list.insertBefore(li, list.firstChild);
    }
    return li;
  }

  function reorderSections(box) {
    var list = box.querySelector(".mfn-live-search-list");
    if (!list) return;
    // Insert in reverse order because we always insert before firstChild.
    var order = [
      "mfn-live-search-list-bss-words",
      "mfn-live-search-list-suggestions",
      "mfn-live-search-list-bss-categories",
      "mfn-live-search-list-bss-brands",
      "mfn-live-search-list-bss-products",
      "mfn-live-search-list-bss-exact",
    ];
    order.forEach(function (cls) {
      var el = list.querySelector("." + cls);
      if (el) list.insertBefore(el, list.firstChild);
    });
  }

  function hideSection(box, className) {
    var section = ensureSection(box, className);
    if (!section) return;
    var ul = section.querySelector("ul");
    if (ul) ul.innerHTML = "";
    section.style.display = "none";
  }

  function buildRestUrl(base, params) {
    var url;
    try {
      url = new URL(base, window.location.origin);
    } catch (e) {
      return null;
    }
    Object.keys(params || {}).forEach(function (k) {
      var v = params[k];
      if (v === undefined || v === null) return;
      url.searchParams.set(k, String(v));
    });
    return url.toString();
  }

  function buildSearchUrl(input, query) {
    var form = input.closest ? input.closest("form") : null;
    var action = form && form.getAttribute("action") ? form.getAttribute("action") : window.location.origin + "/";
    var url;
    try {
      url = new URL(action, window.location.origin);
    } catch (e) {
      url = new URL(window.location.origin + "/");
    }
    url.searchParams.set("s", query);
    url.searchParams.set("post_type", "product");
    return url.toString();
  }

  function renderHeading(ul, text) {
    var hLi = document.createElement("li");
    hLi.className = "mfn-live-search-heading";
    hLi.setAttribute("data-category", "info");
    hLi.textContent = " " + text + " ";
    ul.appendChild(hLi);
  }

  function renderSkeletonList(ul, count) {
    var i;
    for (i = 0; i < count; i++) {
      var li = document.createElement("li");
      li.className = "bss-skeleton";
      li.setAttribute("data-category", "bss-skeleton");
      li.innerHTML = '<span class="bss-skeleton-line"><span class="bss-skeleton-shimmer"></span></span>';
      ul.appendChild(li);
    }
  }

  function showLoading(cfg, box, sectionClass, headingKey, headingFallback, count) {
    var section = ensureSection(box, sectionClass);
    if (!section) return;
    var ul = section.querySelector("ul");
    if (!ul) return;
    ul.innerHTML = "";
    renderHeading(ul, headingText(cfg, headingKey, headingFallback));
    renderSkeletonList(ul, count);
    section.style.display = "block";
    reorderSections(box);
  }

  function renderExactProduct(cfg, box, product) {
    var section = ensureSection(box, "mfn-live-search-list-bss-exact");
    if (!section) return;
    var ul = section.querySelector("ul");
    if (!ul) return;
    ul.innerHTML = "";

    if (!product || !product.url) {
      section.style.display = "none";
      return;
    }

    renderHeading(ul, headingText(cfg, "heading_exact", FALLBACK_STRINGS.heading_exact));

    var li = document.createElement("li");
    li.setAttribute("data-category", "product");
    li.setAttribute("data-bss-type", "product");
    if (product.id) li.setAttribute("data-bss-id", product.id);

    var imgHtml = product.image ? '<img alt="" src="' + product.image + '" />' : "";
    var priceHtml = product.price ? String(product.price) : "";

    li.innerHTML =
      imgHtml +
      '<div class="mfn-live-search-texts">' +
      '<a href="' +
      product.url +
      '">' +
      escapeHtml(String(product.title || "")) +
      "</a>" +
      (priceHtml ? '<span class="mfn-ls-price">' + priceHtml + "</span>" : "") +
      "</div>";

    ul.appendChild(li);
    section.style.display = "block";
    reorderSections(box);
  }

  function renderCodeProducts(cfg, box, products) {
    var section = ensureSection(box, "mfn-live-search-list-bss-products");
    if (!section) return;
    var ul = section.querySelector("ul");
    if (!ul) return;
    ul.innerHTML = "";

    if (!Array.isArray(products) || !products.length) {
      section.style.display = "none";
      return;
    }

    renderHeading(ul, headingText(cfg, "heading_products", FALLBACK_STRINGS.heading_products));

    products.slice(0, cfg.maxProducts).forEach(function (p) {
      if (!p || !p.url) return;
      var li = document.createElement("li");
      li.setAttribute("data-category", "product");
      li.setAttribute("data-bss-type", "product");
      if (p.id) li.setAttribute("data-bss-id", p.id);
      if (q) li.setAttribute("data-bss-query", q);

      var imgHtml = p.image ? '<img alt="" src="' + p.image + '" />' : "";
      var priceHtml = p.price ? String(p.price) : "";

      li.innerHTML =
        imgHtml +
        '<div class="mfn-live-search-texts">' +
        '<a href="' +
        p.url +
        '">' +
        escapeHtml(String(p.title || "")) +
        "</a>" +
        (priceHtml ? '<span class="mfn-ls-price">' + priceHtml + "</span>" : "") +
        "</div>";
      ul.appendChild(li);
    });

    section.style.display = "block";
    reorderSections(box);
  }

  function getThemeSection(box, className) {
    var list = box.querySelector(".mfn-live-search-list");
    if (!list) return null;
    return list.querySelector("." + className);
  }

  function showThemeSection(box, className, open) {
    var section = getThemeSection(box, className);
    if (!section || !section.style) return;
    section.style.display = open ? "block" : "none";
  }

  function showLoadingThemeProducts(cfg, box, headingKey, headingFallback) {
    var section = getThemeSection(box, "mfn-live-search-list-shop");
    if (!section) return;
    var ul = section.querySelector("ul");
    if (!ul) return;
    ul.innerHTML = "";
    renderHeading(
      ul,
      headingText(
        cfg,
        headingKey || "heading_products_generic",
        headingFallback || FALLBACK_STRINGS.heading_products_generic
      )
    );
    renderSkeletonList(ul, Math.min(4, cfg.maxProducts));
    section.style.display = "block";
  }

  function renderThemeProducts(cfg, box, products, q, headingKey, headingFallback) {
    var section = getThemeSection(box, "mfn-live-search-list-shop");
    if (!section) return;
    var ul = section.querySelector("ul");
    if (!ul) return;
    ul.innerHTML = "";

    if (!Array.isArray(products) || !products.length) {
      section.style.display = "none";
      return;
    }

    renderHeading(
      ul,
      headingText(
        cfg,
        headingKey || "heading_products_generic",
        headingFallback || FALLBACK_STRINGS.heading_products_generic
      )
    );

    products.slice(0, cfg.maxProducts).forEach(function (p) {
      if (!p || !p.url) return;
      var li = document.createElement("li");
      li.setAttribute("data-category", "product");
      li.setAttribute("data-bss-type", "product");
      if (p.id) li.setAttribute("data-bss-id", p.id);

      var imgHtml = p.image ? '<img alt="" src="' + p.image + '" />' : "";
      var priceHtml = p.price ? String(p.price) : "";

      li.innerHTML =
        imgHtml +
        '<div class="mfn-live-search-texts">' +
        '<a href="' +
        p.url +
        '">' +
        highlightHtml(String(p.title || ""), q) +
        "</a>" +
        (priceHtml ? '<span class="mfn-ls-price">' + priceHtml + "</span>" : "") +
        "</div>";

      ul.appendChild(li);
    });

    section.style.display = "block";
  }

  function renderWords(cfg, input, box, words, q) {
    var section = ensureSection(box, "mfn-live-search-list-bss-words");
    if (!section) return;
    var ul = section.querySelector("ul");
    if (!ul) return;
    ul.innerHTML = "";

    if (!Array.isArray(words) || !words.length) {
      section.style.display = "none";
      return;
    }

    renderHeading(ul, headingText(cfg, "heading_words", FALLBACK_STRINGS.heading_words));

    words.slice(0, cfg.maxItems).forEach(function (word) {
      var w = String(word || "").trim();
      if (!w) return;
      var li = document.createElement("li");
      li.setAttribute("data-category", "suggestion");
      li.setAttribute("data-bss-type", "word");
      li.setAttribute("data-bss-query", w);

      var a = document.createElement("a");
      a.href = buildSearchUrl(input, w);
      a.innerHTML = highlightHtml(w, q);
      li.appendChild(a);
      ul.appendChild(li);
    });

    section.style.display = "block";
    reorderSections(box);
  }

  function renderSuggestItems(cfg, input, box, suggests, q) {
    var section = ensureSection(box, "mfn-live-search-list-suggestions");
    if (!section) return;
    var ul = section.querySelector("ul");
    if (!ul) return;
    ul.innerHTML = "";

    if (!Array.isArray(suggests) || !suggests.length) {
      section.style.display = "none";
      return;
    }

    renderHeading(ul, headingText(cfg, "heading_suggestions", FALLBACK_STRINGS.heading_suggestions));

    suggests.slice(0, cfg.maxItems).forEach(function (item) {
      var label = item && item.query ? String(item.query).trim() : "";
      if (!label) return;
      var url = item && item.url ? String(item.url) : "";
      if (!url) {
        url = buildSearchUrl(input, label);
      }

      var li = document.createElement("li");
      li.setAttribute("data-category", "suggestion");
      li.setAttribute("data-bss-type", "suggest");
      li.setAttribute("data-bss-query", label);

      var a = document.createElement("a");
      a.href = url;
      a.innerHTML = highlightHtml(label, q);
      li.appendChild(a);
      ul.appendChild(li);
    });

    section.style.display = "block";
    reorderSections(box);
  }

  function renderCategories(cfg, input, box, categories, q) {
    var section = ensureSection(box, "mfn-live-search-list-bss-categories");
    if (!section) return;
    var ul = section.querySelector("ul");
    if (!ul) return;
    ul.innerHTML = "";

    if (!Array.isArray(categories) || !categories.length) {
      section.style.display = "none";
      return;
    }

    renderHeading(ul, headingText(cfg, "heading_categories", FALLBACK_STRINGS.heading_categories));

    categories.slice(0, cfg.maxItems).forEach(function (c) {
      if (!c || !c.url || !c.title) return;
      var li = document.createElement("li");
      li.setAttribute("data-category", "category");
      li.setAttribute("data-bss-type", "category");
      if (c.searchUid) li.setAttribute("data-bss-id", c.searchUid);
      if (c.query || q) li.setAttribute("data-bss-query", c.query || q);

      var imgHtml = c.imageUrl ? '<img alt="" src="' + c.imageUrl + '" />' : "";
      var subtitle = c.rootCategoryTitle
        ? '<span class="mfn-ls-price">' + escapeHtml(String(c.rootCategoryTitle)) + "</span>"
        : "";

      li.innerHTML =
        imgHtml +
        '<div class="mfn-live-search-texts">' +
        '<a href="' +
        c.url +
        '">' +
        highlightHtml(String(c.title || ""), q) +
        "</a>" +
        subtitle +
        "</div>";

      ul.appendChild(li);
    });

    section.style.display = "block";
    reorderSections(box);
  }

  function renderBrands(cfg, input, box, brands, q) {
    var section = ensureSection(box, "mfn-live-search-list-bss-brands");
    if (!section) return;
    var ul = section.querySelector("ul");
    if (!ul) return;
    ul.innerHTML = "";

    if (!Array.isArray(brands) || !brands.length) {
      section.style.display = "none";
      return;
    }

    renderHeading(ul, headingText(cfg, "heading_brands", FALLBACK_STRINGS.heading_brands));

    brands.slice(0, cfg.maxItems).forEach(function (b) {
      if (!b || !b.url || !b.name) return;
      var li = document.createElement("li");
      li.setAttribute("data-category", "brand");
      li.setAttribute("data-bss-type", "brand");
      if (b.id) li.setAttribute("data-bss-id", b.id);
      if (q) li.setAttribute("data-bss-query", q);

      var imgHtml = b.imageUrl ? '<img alt="" src="' + b.imageUrl + '" />' : "";

      li.innerHTML =
        imgHtml +
        '<div class="mfn-live-search-texts">' +
        '<a href="' +
        b.url +
        '">' +
        highlightHtml(String(b.name || ""), q) +
        "</a>" +
        "</div>";

      ul.appendChild(li);
    });

    section.style.display = "block";
    reorderSections(box);
  }

  function renderSelection(cfg, input, box, payload) {
    var q = String(payload && payload.query ? payload.query : (input && input.value ? input.value : "")).trim();
    var words = payload && Array.isArray(payload.words) ? payload.words : [];
    var suggests = payload && Array.isArray(payload.suggests) ? payload.suggests : [];
    var categories = payload && Array.isArray(payload.categories) ? payload.categories : [];
    var brands = payload && Array.isArray(payload.brands) ? payload.brands : [];

    var hasApiData = words.length || suggests.length || categories.length || brands.length;

    if (q === "") {
      var history = HistoryStore.get(cfg);
      if (history && history.length) {
        renderLegacySuggestions(cfg, input, box, payload);
        renderWords(cfg, input, box, [], q);
        renderCategories(cfg, input, box, [], q);
        renderBrands(cfg, input, box, [], q);
        return;
      }
    }

    if (hasApiData) {
      if (q === "") {
        renderWords(cfg, input, box, [], q);
        renderSuggestItems(cfg, input, box, suggests, q);
        renderCategories(cfg, input, box, [], q);
        renderBrands(cfg, input, box, [], q);
        return;
      }

      renderWords(cfg, input, box, words, q);
      renderSuggestItems(cfg, input, box, suggests, q);
      renderCategories(cfg, input, box, categories, q);
      renderBrands(cfg, input, box, brands, q);
      return;
    }

    renderLegacySuggestions(cfg, input, box, payload);
  }

  function renderLegacySuggestions(cfg, input, box, payload) {
    var section = ensureSection(box, "mfn-live-search-list-suggestions");
    if (!section) return;
    var ul = section.querySelector("ul");
    if (!ul) return;

    var q = String(payload && payload.query ? payload.query : "").trim();
    var items = [];

    var history = HistoryStore.get(cfg);

    // When query is empty: show history (if any), otherwise show popular products.
    if (q === "") {
      ul.innerHTML = "";

      if (history && history.length) {
        renderHeading(ul, headingText(cfg, "heading_history", FALLBACK_STRINGS.heading_history));

        // "Clear all" control.
        var clearLi = document.createElement("li");
        clearLi.className = "bss-history-actions";
        clearLi.setAttribute("data-category", "bss-history-actions");
        var clearLabel = headingText(cfg, "label_clear_history", FALLBACK_STRINGS.label_clear_history);
        clearLi.innerHTML =
          '<button type="button" class="bss-history-clear" data-bss-action="clear-history">' +
          escapeHtml(clearLabel) +
          "</button>";
        ul.appendChild(clearLi);

        history.slice(0, cfg.maxItems).forEach(function (h) {
          var li = document.createElement("li");
          li.className = "bss-history-item";
          li.setAttribute("data-category", "suggestion");
          li.setAttribute("data-bss-type", "history");
          li.setAttribute("data-bss-query", h);
          var removeLabel = headingText(cfg, "label_remove_history", FALLBACK_STRINGS.label_remove_history);
          li.innerHTML =
            '<a class="bss-history-link" href="' +
            buildSearchUrl(input, h) +
            '">' +
            escapeHtml(h) +
            '</a><button type="button" class="bss-history-remove" aria-label="' +
            escapeHtml(removeLabel) +
            '" data-bss-action="remove-history" data-bss-query="' +
            escapeHtml(h) +
            '">&times;</button>';
          ul.appendChild(li);
        });

        section.style.display = "block";
        reorderSections(box);
        return;
      }

      var popularProducts = payload && Array.isArray(payload.popular_products) ? payload.popular_products : [];
      popularProducts = popularProducts.filter(function (p) { return p && p.url; }).slice(0, cfg.maxProducts);
      if (!popularProducts.length) {
        section.style.display = "none";
        ul.innerHTML = "";
        return;
      }

      renderHeading(ul, headingText(cfg, "heading_popular_products", FALLBACK_STRINGS.heading_popular_products));
      popularProducts.forEach(function (p) {
        var li = document.createElement("li");
        li.setAttribute("data-category", "product");
        li.setAttribute("data-bss-type", "product");
        if (p && p.id) li.setAttribute("data-bss-id", p.id);

        var imgHtml = p.image ? '<img alt="" src="' + p.image + '" />' : "";
        var priceHtml = p.price ? String(p.price) : "";

        li.innerHTML =
          imgHtml +
          '<div class="mfn-live-search-texts">' +
          '<a href="' +
          p.url +
          '">' +
          escapeHtml(String(p.title || "")) +
          "</a>" +
          (priceHtml ? '<span class="mfn-ls-price">' + priceHtml + "</span>" : "") +
          "</div>";
        ul.appendChild(li);
      });

      section.style.display = "block";
      reorderSections(box);
      return;
    }

    // When user types: optional "related queries" suggestions.
    if (!cfg.showSuggestions) {
      section.style.display = "none";
      ul.innerHTML = "";
      return;
    }

    // When user types: show only suggestions related to the query.
    var qLower = q.toLowerCase();
    var historyMatches = history
      .filter(function (h) {
        return h.toLowerCase().indexOf(qLower) === 0;
      })
      .slice(0, cfg.maxItems);
    historyMatches.forEach(function (h) {
      items.push({ query: h, kind: "history" });
    });

    var matches = payload && Array.isArray(payload.matches) ? payload.matches : [];
    matches.forEach(function (m) {
      var mq = m && m.query ? String(m.query).trim() : "";
      if (!mq) return;
      if (items.some(function (x) { return x.query.toLowerCase() === mq.toLowerCase(); })) return;
      items.push({ query: mq, kind: "match" });
    });

    items = items.slice(0, cfg.maxItems);
    if (!items.length) {
      section.style.display = "none";
      ul.innerHTML = "";
      return;
    }

    ul.innerHTML = "";
    renderHeading(ul, headingText(cfg, "heading_suggestions", FALLBACK_STRINGS.heading_suggestions));

    items.forEach(function (it) {
      var li = document.createElement("li");
      li.setAttribute("data-category", "suggestion");
      li.setAttribute("data-bss-type", "suggest");
      li.setAttribute("data-bss-query", it.query);
      var a = document.createElement("a");
      a.href = buildSearchUrl(input, it.query);
      a.innerHTML = highlightHtml(it.query, q);
      li.appendChild(a);
      ul.appendChild(li);
    });

    section.style.display = "block";
    reorderSections(box);
  }

  Live.config = {
    getConfig: getConfig,
    getDebounceMs: getDebounceMs,
    FALLBACK_STRINGS: FALLBACK_STRINGS,
  };
  Live.utils = {
    debounce: debounce,
    safeJsonParse: safeJsonParse,
    isCodeLike: isCodeLike,
    escapeHtml: escapeHtml,
    escapeRegExp: escapeRegExp,
    highlightHtml: highlightHtml,
    normalizeHeadingValue: normalizeHeadingValue,
    headingText: headingText,
    buildRestUrl: buildRestUrl,
    buildSearchUrl: buildSearchUrl,
  };
  Live.history = HistoryStore;
  Live.render = {
    findLiveBox: findLiveBox,
    getOpenContainer: getOpenContainer,
    setOpenState: setOpenState,
    ensureSection: ensureSection,
    reorderSections: reorderSections,
    hideSection: hideSection,
    renderHeading: renderHeading,
    renderSkeletonList: renderSkeletonList,
    showLoading: showLoading,
    renderExactProduct: renderExactProduct,
    renderCodeProducts: renderCodeProducts,
    getThemeSection: getThemeSection,
    showThemeSection: showThemeSection,
    showLoadingThemeProducts: showLoadingThemeProducts,
    renderThemeProducts: renderThemeProducts,
    renderWords: renderWords,
    renderSuggestItems: renderSuggestItems,
    renderCategories: renderCategories,
    renderBrands: renderBrands,
    renderSelection: renderSelection,
    renderLegacySuggestions: renderLegacySuggestions,
  };
  Live.api = {
    logPresearch: logPresearch,
    fetchSelection: fetchSelection,
    fetchLiveExact: fetchLiveExact,
    fetchProducts: fetchProducts,
  };
  Live.state = {
    getState: getState,
    isSearchInput: isSearchInput,
    handleInputOrFocus: handleInputOrFocus,
  };
  Live.nav = {
    collectNavAnchors: collectNavAnchors,
    clearNavActive: clearNavActive,
    setNavActive: setNavActive,
  };

  var cfg = getConfig();
  var waitMs = getDebounceMs(cfg);

  var perInputState = new WeakMap();
  function getState(input) {
    var st = perInputState.get(input);
    if (!st) {
      st = {
        seq: 0,
        selectionAbort: null,
        productsAbort: null,
        liveExactAbort: null,
        navIndex: -1,
        navQuery: "",
        lastShowQuery: "",
      };
      perInputState.set(input, st);
    }
    return st;
  }

  function isSearchInput(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.tagName !== "INPUT") return false;
    if (el.getAttribute("name") !== "s") return false;
    if (!el.classList.contains("field")) return false;
    return true;
  }

  function logShowOnce(cfg, input, q, meta) {
    if (!cfg.enablePresearchLogging || !cfg.presearchLogUrl) return;
    if (!q) return;
    var st = getState(input);
    if (st.lastShowQuery === q) return;
    st.lastShowQuery = q;
    logPresearch(cfg, "show", q, meta || {});
  }

  function fetchSelection(seq, input, box, q) {
    var st = getState(input);
    if (st.selectionAbort && st.selectionAbort.abort) st.selectionAbort.abort();
    var controller = window.AbortController ? new AbortController() : null;
    st.selectionAbort = controller;

    var useLegacy = !cfg.presearchSelectionUrl && !!cfg.suggestUrl;
    var baseUrl = useLegacy ? cfg.suggestUrl : cfg.presearchSelectionUrl;
    if (!baseUrl) return;

    var params = useLegacy
      ? { q: q, context: cfg.context, limit: cfg.maxItems }
      : { query: q, context: cfg.context, limit: cfg.maxItems };
    var url = buildRestUrl(baseUrl, params);
    if (!url) return;

    window
      .fetch(url, { credentials: "same-origin", signal: controller ? controller.signal : undefined })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (getState(input).seq !== seq) return;
        var payload = data || {};
        renderSelection(cfg, input, box, payload);

        var words = payload && Array.isArray(payload.words) ? payload.words.length : 0;
        var suggests = payload && Array.isArray(payload.suggests) ? payload.suggests.length : 0;
        var categories = payload && Array.isArray(payload.categories) ? payload.categories.length : 0;
        var brands = payload && Array.isArray(payload.brands) ? payload.brands.length : 0;
        logShowOnce(cfg, input, q, {
          words: words,
          suggests: suggests,
          categories: categories,
          brands: brands,
        });
      })
      .catch(function () {
        // fail silently
      });
  }

  function fetchLiveExact(seq, input, box, q) {
    var st = getState(input);
    if (st.liveExactAbort && st.liveExactAbort.abort) st.liveExactAbort.abort();
    var controller = window.AbortController ? new AbortController() : null;
    st.liveExactAbort = controller;

    var url = buildRestUrl(cfg.liveUrl, { q: q, context: cfg.context, limit: 5, stage: "exact" });
    if (!url) return;

    window
      .fetch(url, { credentials: "same-origin", signal: controller ? controller.signal : undefined })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (getState(input).seq !== seq) return;
        renderExactProduct(cfg, box, data && data.exact_product ? data.exact_product : null);
      })
      .catch(function () {
        // ignore
      });
  }

  function fetchProducts(seq, input, box, q) {
    var st = getState(input);
    if (st.productsAbort && st.productsAbort.abort) st.productsAbort.abort();
    var controller = window.AbortController ? new AbortController() : null;
    st.productsAbort = controller;

    var useLegacy = !cfg.presearchUrl && !!cfg.liveUrl;
    var baseUrl = useLegacy ? cfg.liveUrl : cfg.presearchUrl;
    if (!baseUrl) return;

    var params = useLegacy
      ? { q: q, context: cfg.context, limit: cfg.maxProducts, stage: "full" }
      : { query: q, context: cfg.context, limit: cfg.maxProducts };
    var url = buildRestUrl(baseUrl, params);
    if (!url) return;

    window
      .fetch(url, { credentials: "same-origin", signal: controller ? controller.signal : undefined })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (getState(input).seq !== seq) return;
        var products = data && Array.isArray(data.products) ? data.products : [];
        var headingKey = q === "" ? "heading_popular_products" : "heading_products_generic";
        var headingFallback = q === "" ? FALLBACK_STRINGS.heading_popular_products : FALLBACK_STRINGS.heading_products_generic;

        // Always render products into the theme's Shop section (so we don't depend on Betheme's own live-search relevance).
        renderThemeProducts(cfg, box, products, q, headingKey, headingFallback);

        // Keep legacy "code products" section for SKU-like queries if enabled.
        if (cfg.showCodeProducts && isCodeLike(q)) {
          renderCodeProducts(cfg, box, products);
        } else {
          hideSection(box, "mfn-live-search-list-bss-products");
        }
        if (data && data.exact_product) {
          renderExactProduct(cfg, box, data.exact_product);
        }

        logShowOnce(cfg, input, q, { products: products.length });
      })
      .catch(function () {
        // ignore
      });
  }

  function handleInputOrFocus(input) {
    if (!isSearchInput(input)) return;
    var box = findLiveBox(input);
    if (!box) return;
    setOpenState(input, box, true);

    var q = String(input.value || "").trim();
    var st = getState(input);
    if (st.navQuery !== q) {
      st.navIndex = -1;
      st.navQuery = q;
    }
    st.seq += 1;
    var seq = st.seq;

    if (cfg.presearchSelectionUrl || cfg.suggestUrl) {
      if (q === "") {
        showLoading(cfg, box, "mfn-live-search-list-suggestions", "heading_suggestions", FALLBACK_STRINGS.heading_suggestions, 3);
        fetchSelection(seq, input, box, q);
      } else if (cfg.showSuggestions) {
        showLoading(cfg, box, "mfn-live-search-list-suggestions", "heading_suggestions", FALLBACK_STRINGS.heading_suggestions, 3);
        fetchSelection(seq, input, box, q);
      } else {
        hideSection(box, "mfn-live-search-list-bss-words");
        hideSection(box, "mfn-live-search-list-suggestions");
        hideSection(box, "mfn-live-search-list-bss-categories");
        hideSection(box, "mfn-live-search-list-bss-brands");
      }
    }

    // Show product results for text queries too (not only for SKU-like queries).
    if ((cfg.presearchUrl || cfg.liveUrl) && (q === "" || q.length >= cfg.minChars)) {
      var headingKey = q === "" ? "heading_popular_products" : "heading_products_generic";
      var headingFallback = q === "" ? FALLBACK_STRINGS.heading_popular_products : FALLBACK_STRINGS.heading_products_generic;
      showLoadingThemeProducts(cfg, box, headingKey, headingFallback);
      fetchProducts(seq, input, box, q);
    } else {
      // Hide theme products section when query is empty or too short to avoid stale results.
      showThemeSection(box, "mfn-live-search-list-shop", false);
    }

    if (cfg.showCodeProducts && cfg.liveUrl && isCodeLike(q) && q.length >= 2) {
      showLoading(cfg, box, "mfn-live-search-list-bss-exact", "heading_exact", FALLBACK_STRINGS.heading_exact, 1);
      fetchLiveExact(seq, input, box, q);
    } else {
      hideSection(box, "mfn-live-search-list-bss-exact");
      if (!isCodeLike(q) || q.length < cfg.minChars) {
        hideSection(box, "mfn-live-search-list-bss-products");
      }
    }
  }

  var onAny = debounce(function (e) {
    var target = e && e.target ? e.target : null;
    handleInputOrFocus(target);
  }, waitMs);

  document.addEventListener("input", onAny, true);
  document.addEventListener("focusin", onAny, true);

  // Close dropdown when clicking outside of the active search field / box.
  var active = { input: null, box: null };
  document.addEventListener(
    "focusin",
    function (e) {
      var target = e && e.target ? e.target : null;
      if (!isSearchInput(target)) return;
      active.input = target;
      active.box = findLiveBox(target);
    },
    true
  );

  // Prevent history action buttons from stealing focus (otherwise focusout may close the dropdown
  // when the clicked element is removed from DOM during re-render).
  function preventActionFocus(e) {
    var t = e && e.target ? e.target : null;
    if (!t || t.nodeType !== 1) return;
    if (!t.getAttribute("data-bss-action")) return;
    if (!active.box || !active.box.contains(t)) return;

    // Prevent default focus move on pointer/mouse down.
    e.preventDefault();
  }

  document.addEventListener("pointerdown", preventActionFocus, true);
  document.addEventListener("mousedown", preventActionFocus, true);

  function collectNavAnchors(box) {
    if (!box) return [];
    var list = box.querySelector(".mfn-live-search-list");
    if (!list) return [];
    var anchors = Array.prototype.slice.call(list.querySelectorAll("a[href]"));
    return anchors.filter(function (a) {
      if (!a || a.nodeType !== 1) return false;
      var li = a.closest ? a.closest("li") : null;
      if (!li) return false;
      if (li.classList && li.classList.contains("mfn-live-search-heading")) return false;
      if (li.style && li.style.display === "none") return false;
      return true;
    });
  }

  function clearNavActive(box) {
    if (!box) return;
    var prev = box.querySelectorAll(".bss-nav-active");
    Array.prototype.forEach.call(prev, function (el) {
      el.classList.remove("bss-nav-active");
      if (el.removeAttribute) el.removeAttribute("aria-selected");
    });
  }

  function setNavActive(input, box, index) {
    var st = getState(input);
    var anchors = collectNavAnchors(box);
    if (!anchors.length) {
      clearNavActive(box);
      st.navIndex = -1;
      return;
    }

    var idx = index;
    if (idx < 0) idx = anchors.length - 1;
    if (idx >= anchors.length) idx = 0;

    clearNavActive(box);
    st.navIndex = idx;

    var a = anchors[idx];
    var li = a.closest ? a.closest("li") : null;
    if (li && li.classList) {
      li.classList.add("bss-nav-active");
      li.setAttribute("aria-selected", "true");
      if (typeof li.scrollIntoView === "function") {
        try {
          li.scrollIntoView({ block: "nearest" });
        } catch (e) {
          // ignore
        }
      }
    }
  }

  // Keyboard navigation (Ozon/DNS-like): arrows, enter, esc.
  document.addEventListener(
    "keydown",
    function (e) {
      if (!active.input || !active.box) return;
      if (e.target !== active.input) return;

      var key = e.key || "";
      if (key !== "ArrowDown" && key !== "ArrowUp" && key !== "Enter" && key !== "Escape") return;

      var st = getState(active.input);
      var anchors = collectNavAnchors(active.box);

      if (key === "Escape") {
        e.preventDefault();
        setOpenState(active.input, active.box, false);
        clearNavActive(active.box);
        st.navIndex = -1;
        return;
      }

      if (key === "ArrowDown") {
        e.preventDefault();
        if (!anchors.length) return;
        setNavActive(active.input, active.box, st.navIndex + 1);
        return;
      }

      if (key === "ArrowUp") {
        e.preventDefault();
        if (!anchors.length) return;
        setNavActive(active.input, active.box, st.navIndex - 1);
        return;
      }

      if (key === "Enter") {
        if (!anchors.length) return;
        if (st.navIndex < 0) return; // let normal submit happen
        var a = anchors[st.navIndex];
        if (!a || !a.href) return;
        e.preventDefault();
        var li = a.closest ? a.closest("li") : null;
        var q = li && li.getAttribute ? li.getAttribute("data-bss-query") : "";
        var type = li && li.getAttribute ? li.getAttribute("data-bss-type") : "";
        if (type) {
          logPresearch(cfg, "click", q || active.input.value || a.textContent || "", {
            type: type,
            id: li.getAttribute("data-bss-id") || "",
            label: a.textContent || "",
            url: a.href || "",
          });
        }
        HistoryStore.push(cfg, q || active.input.value || a.textContent || "");
        window.location.href = a.href;
      }
    },
    true
  );

  // Save history on any click on a dropdown link (not only on Enter/submit).
  document.addEventListener(
    "click",
    function (e) {
      var t = e && e.target ? e.target : null;
      if (!t || t.nodeType !== 1) return;
      if (!active.box || !active.input) return;

      // Ignore history action buttons.
      if (t.getAttribute && t.getAttribute("data-bss-action")) return;
      if (t.closest && t.closest("[data-bss-action]")) return;

      var a = t.tagName === "A" ? t : (t.closest ? t.closest("a") : null);
      if (!a || !a.href) return;
      if (!active.box.contains(a)) return;

      var li = a.closest ? a.closest("li") : null;
      var q = li && li.getAttribute ? li.getAttribute("data-bss-query") : "";
      var type = li && li.getAttribute ? li.getAttribute("data-bss-type") : "";
      if (type) {
        logPresearch(cfg, "click", q || active.input.value || a.textContent || "", {
          type: type,
          id: li.getAttribute("data-bss-id") || "",
          label: a.textContent || "",
          url: a.href || "",
        });
      }
      HistoryStore.push(cfg, q || active.input.value || a.textContent || "");
    },
    true
  );

  document.addEventListener(
    "mousedown",
    function (e) {
      if (!active.box) return;
      var t = e && e.target ? e.target : null;
      if (!t) return;

      // Keep open when interacting with the search input or the box itself.
      if (active.input && (t === active.input || (active.input.contains && active.input.contains(t)))) {
        return;
      }
      if (active.box.contains && active.box.contains(t)) {
        return;
      }

      setOpenState(active.input, active.box, false);
      active.input = null;
      active.box = null;
    },
    true
  );

  // Also close when focus leaves both the input and the dropdown (keyboard navigation).
  document.addEventListener(
    "focusout",
    function () {
      if (!active.box) return;
      window.setTimeout(function () {
        if (!active.box) return;
        var ae = document.activeElement;
        if (active.input && ae === active.input) return;
        if (active.input && active.input.contains && ae && active.input.contains(ae)) return;
        if (active.box && active.box.contains && ae && active.box.contains(ae)) return;
        setOpenState(active.input, active.box, false);
        active.input = null;
        active.box = null;
      }, 0);
    },
    true
  );

  document.addEventListener(
    "submit",
    function (e) {
      var form = e && e.target ? e.target : null;
      if (!form || form.nodeType !== 1 || form.tagName !== "FORM") return;
      var input = form.querySelector('input.field[name="s"]');
      if (!input) return;
      HistoryStore.push(cfg, input.value);
    },
    true
  );

  // Handle history actions (remove item / clear all) inside the dropdown.
  document.addEventListener(
    "click",
    function (e) {
      var t = e && e.target ? e.target : null;
      if (!t || t.nodeType !== 1) return;
      var action = t.getAttribute("data-bss-action");
      if (!action) return;

      if (!active.box || !active.input) return;
      if (!active.box.contains(t)) return;

      e.preventDefault();
      e.stopPropagation();

      if (action === "clear-history") {
        HistoryStore.clear(cfg);
        handleInputOrFocus(active.input);
        return;
      }

      if (action === "remove-history") {
        var q2 = t.getAttribute("data-bss-query") || "";
        HistoryStore.removeItem(cfg, q2);
        handleInputOrFocus(active.input);
      }
    },
    true
  );
})(window);
