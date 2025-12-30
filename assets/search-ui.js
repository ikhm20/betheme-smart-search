/* global window, document */

(function () {
  var positioned = [];
  var resizeTimer = null;

  function getSearchParam() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      var s = params.get("s");
      return typeof s === "string" ? s : "";
    } catch (e) {
      return "";
    }
  }

  function isTextInput(input) {
    if (!input || input.nodeType !== 1) return false;
    if (!input.name || input.name !== "s") return false;
    var type = (input.getAttribute("type") || "text").toLowerCase();
    return type === "text" || type === "search";
  }

  function ensureWrapped(input) {
    var parent = input.parentNode;
    if (!parent) return null;

    if (parent.classList && parent.classList.contains("bss-search-field-wrap")) {
      return parent;
    }

    var wrap = document.createElement("span");
    wrap.className = "bss-search-field-wrap";

    parent.insertBefore(wrap, input);
    wrap.appendChild(input);
    return wrap;
  }

  function ensureClearButton(wrap, input) {
    if (!wrap || !input) return null;

    var existing = wrap.querySelector(".bss-search-clear");
    if (existing) return existing;

    var button = document.createElement("button");
    button.type = "button";
    button.className = "bss-search-clear";
    button.setAttribute("aria-label", "Очистить поиск");
    button.textContent = "×";

    button.addEventListener("click", function () {
      input.value = "";
      try {
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } catch (e) {
        // ignore
      }
      input.focus();
    });

    wrap.appendChild(button);
    return button;
  }

  function positionButton(input, button) {
    if (!input || !button) return;

    var form = input.closest ? input.closest("form.form-searchform") : null;
    if (!form) form = input.form;
    if (!form) return;

    try {
      var formRect = form.getBoundingClientRect();
      var inputRect = input.getBoundingClientRect();

      var topPx = Math.round(inputRect.top - formRect.top + inputRect.height / 2);
      var rightPx = Math.round(formRect.right - inputRect.right + 8);

      if (!isFinite(topPx)) topPx = 0;
      if (!isFinite(rightPx)) rightPx = 8;
      rightPx = Math.max(8, rightPx);

      button.style.top = topPx + "px";
      button.style.right = rightPx + "px";
    } catch (e) {
      // ignore
    }
  }

  function schedulePositionAll() {
    if (resizeTimer) {
      window.clearTimeout(resizeTimer);
    }

    resizeTimer = window.setTimeout(function () {
      resizeTimer = null;
      positioned.forEach(function (item) {
        positionButton(item.input, item.button);
      });
    }, 80);
  }

  function toggleButton(button, input) {
    if (!button || !input) return;
    var hasValue = !!(input.value || "").trim();
    button.style.display = hasValue ? "" : "none";
  }

  function enhanceSearchInputs() {
    var query = getSearchParam();
    var inputs = Array.prototype.slice.call(document.querySelectorAll('input[name="s"]'));

    inputs.forEach(function (input) {
      if (!isTextInput(input)) return;

      if (query && !(input.value || "").trim()) {
        input.value = query;
      }

      var wrap = ensureWrapped(input);
      var button = ensureClearButton(wrap, input);
      toggleButton(button, input);

      positioned.push({ input: input, button: button });
      positionButton(input, button);

      input.addEventListener("input", function () {
        toggleButton(button, input);
        positionButton(input, button);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhanceSearchInputs);
  } else {
    enhanceSearchInputs();
  }

  window.addEventListener("resize", schedulePositionAll);
})();
