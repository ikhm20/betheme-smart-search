/* global bethemeSmartSearchLiveSuggest */

(function () {
  "use strict";

  function getConfig() {
    var cfg = window.bethemeSmartSearchLiveSuggest || {};
    return {
      suggestUrl: String(cfg.suggest_url || ""),
      liveUrl: String(cfg.live_url || ""),
      debounceDesktopMs: Number(cfg.debounce_desktop_ms || cfg.debounce_ms || 250),
      debounceMobileMs: Number(cfg.debounce_mobile_ms || 500),
      minChars: Number(cfg.min_chars || 3),
      context: String(cfg.context || "shop"),
      maxItems: Number(cfg.max_items || 6),
      maxProducts: Number(cfg.max_products || 5),
      showCodeProducts: cfg.show_code_products !== false,
      storageKey: String(cfg.storage_key || "bss_search_history_v1"),
      strings: cfg.strings || {},
    };
  }

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

  function getHistory(cfg) {
    try {
      var raw = window.localStorage.getItem(cfg.storageKey);
      var list = safeJsonParse(raw || "[]", []);
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function removeHistoryItem(cfg, query) {
    var q = String(query || "").trim();
    if (!q) return;
    var list = getHistory(cfg)
      .filter(function (x) {
        return typeof x === "string" && x.trim();
      })
      .filter(function (x) {
        return x.toLowerCase() !== q.toLowerCase();
      });
    try {
      window.localStorage.setItem(cfg.storageKey, JSON.stringify(list));
    } catch (e) {
      // ignore
    }
  }

  function clearHistory(cfg) {
    try {
      window.localStorage.removeItem(cfg.storageKey);
    } catch (e) {
      // ignore
    }
  }

  function pushHistory(cfg, query) {
    var q = String(query || "").trim();
    if (!q) return;
    var list = getHistory(cfg)
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
    try {
      window.localStorage.setItem(cfg.storageKey, JSON.stringify(list));
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

  function headingText(cfg, key, fallback) {
    var s = cfg.strings && cfg.strings[key] ? String(cfg.strings[key]) : "";
    return s || fallback;
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
    } else {
      container.classList.remove("bss-live-open");
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
    var order = ["mfn-live-search-list-suggestions", "mfn-live-search-list-bss-products", "mfn-live-search-list-bss-exact"];
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

    renderHeading(ul, headingText(cfg, "heading_exact", "Точное совпадение"));

    var li = document.createElement("li");
    li.setAttribute("data-category", "product");

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

    renderHeading(ul, headingText(cfg, "heading_products", "Товары по артикулу"));

    products.slice(0, cfg.maxProducts).forEach(function (p) {
      if (!p || !p.url) return;
      var li = document.createElement("li");
      li.setAttribute("data-category", "product");

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

  function renderSuggestions(cfg, input, box, payload) {
    var section = ensureSection(box, "mfn-live-search-list-suggestions");
    if (!section) return;
    var ul = section.querySelector("ul");
    if (!ul) return;

    var q = String(payload && payload.query ? payload.query : "").trim();
    var items = [];

    var history = getHistory(cfg);

    // When query is empty: show history (if any), otherwise show popular products.
    if (q === "") {
      ul.innerHTML = "";

      if (history && history.length) {
        renderHeading(ul, headingText(cfg, "heading_history", "История поиска"));

        // "Clear all" control.
        var clearLi = document.createElement("li");
        clearLi.className = "bss-history-actions";
        clearLi.setAttribute("data-category", "bss-history-actions");
        clearLi.innerHTML =
          '<button type="button" class="bss-history-clear" data-bss-action="clear-history">Очистить историю</button>';
        ul.appendChild(clearLi);

        history.slice(0, cfg.maxItems).forEach(function (h) {
          var li = document.createElement("li");
          li.className = "bss-history-item";
          li.setAttribute("data-category", "suggestion");
          li.setAttribute("data-bss-query", h);
          li.innerHTML =
            '<a class="bss-history-link" href="' +
            buildSearchUrl(input, h) +
            '">' +
            escapeHtml(h) +
            '</a><button type="button" class="bss-history-remove" aria-label="Удалить запрос" data-bss-action="remove-history" data-bss-query="' +
            escapeHtml(h) +
            '">×</button>';
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

      renderHeading(ul, headingText(cfg, "heading_popular_products", "Популярные товары"));
      popularProducts.forEach(function (p) {
        var li = document.createElement("li");
        li.setAttribute("data-category", "product");

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
    renderHeading(ul, headingText(cfg, "heading_suggestions", "Похожие запросы"));

    items.forEach(function (it) {
      var li = document.createElement("li");
      li.setAttribute("data-category", "suggestion");
      var a = document.createElement("a");
      a.href = buildSearchUrl(input, it.query);
      a.textContent = it.query;
      li.appendChild(a);
      ul.appendChild(li);
    });

    section.style.display = "block";
    reorderSections(box);
  }

  var cfg = getConfig();
  var waitMs = getDebounceMs(cfg);

  var perInputState = new WeakMap();
  function getState(input) {
    var st = perInputState.get(input);
    if (!st) {
      st = { seq: 0, suggestAbort: null, liveExactAbort: null, liveFullAbort: null };
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

  function fetchSuggestions(seq, input, box, q) {
    var st = getState(input);
    if (st.suggestAbort && st.suggestAbort.abort) st.suggestAbort.abort();
    var controller = window.AbortController ? new AbortController() : null;
    st.suggestAbort = controller;

    var url = buildRestUrl(cfg.suggestUrl, { q: q, context: cfg.context, limit: cfg.maxItems });
    if (!url) return;

    window
      .fetch(url, { credentials: "same-origin", signal: controller ? controller.signal : undefined })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (getState(input).seq !== seq) return;
        renderSuggestions(cfg, input, box, data || {});
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

  function fetchLiveFull(seq, input, box, q) {
    var st = getState(input);
    if (st.liveFullAbort && st.liveFullAbort.abort) st.liveFullAbort.abort();
    var controller = window.AbortController ? new AbortController() : null;
    st.liveFullAbort = controller;

    var url = buildRestUrl(cfg.liveUrl, { q: q, context: cfg.context, limit: cfg.maxProducts, stage: "full" });
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
        renderCodeProducts(cfg, box, products);
        if (data && data.exact_product) {
          renderExactProduct(cfg, box, data.exact_product);
        }
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
    st.seq += 1;
    var seq = st.seq;

    if (cfg.suggestUrl) {
      if (q === "") {
        showLoading(cfg, box, "mfn-live-search-list-suggestions", "heading_suggestions", "Подсказки", 3);
        fetchSuggestions(seq, input, box, q);
      } else {
        // While typing: suggestions must be related to input, so don't request "empty query" payload.
        var q2 = q.length < cfg.minChars ? q : q;
        showLoading(cfg, box, "mfn-live-search-list-suggestions", "heading_suggestions", "Подсказки", 3);
        fetchSuggestions(seq, input, box, q2);
      }
    }

    if (cfg.showCodeProducts && cfg.liveUrl && isCodeLike(q) && q.length >= 2) {
      showLoading(cfg, box, "mfn-live-search-list-bss-exact", "heading_exact", "Точное совпадение", 1);
      showLoading(cfg, box, "mfn-live-search-list-bss-products", "heading_products", "Товары по артикулу", Math.min(3, cfg.maxProducts));
      fetchLiveExact(seq, input, box, q);
      fetchLiveFull(seq, input, box, q);
    } else {
      hideSection(box, "mfn-live-search-list-bss-exact");
      hideSection(box, "mfn-live-search-list-bss-products");
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
      pushHistory(cfg, input.value);
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
        clearHistory(cfg);
        handleInputOrFocus(active.input);
        return;
      }

      if (action === "remove-history") {
        var q2 = t.getAttribute("data-bss-query") || "";
        removeHistoryItem(cfg, q2);
        handleInputOrFocus(active.input);
      }
    },
    true
  );
})();
