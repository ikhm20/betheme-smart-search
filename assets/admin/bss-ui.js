/* global window */
(function (root) {
  if (!root) return;

  var BSS = root.BSSAdmin || (root.BSSAdmin = {});
  var ui = BSS.ui || (BSS.ui = {});

  function getEl() {
    if (BSS.el) return BSS.el;
    if (root.wp && root.wp.element && root.wp.element.createElement) {
      return root.wp.element.createElement;
    }
    return null;
  }

  ui.NavLink = function (props) {
    var el = getEl();
    if (!el) return null;
    var to = props.to;
    var isActive = props.isActive;
    var onClick = props.onClick;
    var label = props.label;
    var abbr = props.abbr;

    return el(
      "a",
      {
        href: "#" + to,
        className: "bss-nav-link" + (isActive ? " is-active" : ""),
        title: label,
        onClick: function (e) {
          e.preventDefault();
          onClick(to);
        },
      },
      el("span", { className: "bss-nav-abbr", "aria-hidden": "true" }, abbr),
      el("span", { className: "bss-nav-label" }, label)
    );
  };

  ui.NavHeader = function (props) {
    var el = getEl();
    if (!el) return null;
    return el("div", { className: "bss-nav-header" }, props.children);
  };

  ui.SectionTitle = function (props) {
    var el = getEl();
    if (!el) return null;
    return el("h2", { className: "bss-section-title" }, props.children);
  };

  ui.HelpText = function (props) {
    var el = getEl();
    if (!el) return null;
    return el("p", { className: "bss-help" }, props.children);
  };

  ui.StatCard = function (props) {
    var el = getEl();
    if (!el) return null;
    return el(
      "div",
      { className: "bss-stat" },
      el("div", { className: "bss-stat-label" }, props.label),
      el("div", { className: "bss-stat-value" }, props.value)
    );
  };

  ui.Table = function (props) {
    var el = getEl();
    if (!el) return null;
    var rows = props.rows || [];
    var columns = props.columns || [];
    var emptyText = props.emptyText || "\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445.";

    if (!rows.length) {
      return el("div", { className: "bss-muted" }, emptyText);
    }

    return el(
      "table",
      { className: "bss-table" },
      el(
        "thead",
        null,
        el(
          "tr",
          null,
          columns.map(function (c) {
            return el("th", { key: c.key }, c.label);
          })
        )
      ),
      el(
        "tbody",
        null,
        rows.map(function (row, idx) {
          return el(
            "tr",
            { key: idx },
            columns.map(function (c) {
              var v = row && row[c.key] != null ? row[c.key] : "";
              return el("td", { key: c.key }, String(v));
            })
          );
        })
      )
    );
  };

  ui.makeNavAbbr = function (label) {
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

  ui.Tabs = function (props) {
    var el = getEl();
    if (!el) return null;
    var tabs = props.tabs || [];
    var active = props.active;
    var navigate = props.navigate;

    return el(
      "div",
      { className: "bss-tabs", role: "tablist", "aria-label": "\u0420\u0430\u0437\u0434\u0435\u043b\u044b" },
      tabs.map(function (t) {
        var isActive = active === t.to;
        return el(
          "a",
          {
            key: t.to,
            href: "#" + t.to,
            className: "bss-tab" + (isActive ? " is-active" : ""),
            role: "tab",
            "aria-selected": isActive ? "true" : "false",
            onClick: function (e) {
              e.preventDefault();
              navigate(t.to);
            },
          },
          t.label
        );
      })
    );
  };

  ui.Toasts = function (props) {
    var el = getEl();
    if (!el) return null;
    var list = props.list || [];
    var onDismiss = props.onDismiss;
    var Notice = root.wp && root.wp.components ? root.wp.components.Notice : null;
    if (!Notice || !list.length) return null;

    return el(
      "div",
      { className: "bss-toasts", role: "status", "aria-live": "polite" },
      list.map(function (t) {
        return el(
          Notice,
          {
            key: t.id,
            status: t.status,
            isDismissible: true,
            onRemove: function () {
              if (typeof onDismiss === "function") onDismiss(t.id);
            },
          },
          t.message
        );
      })
    );
  };
})(window);
