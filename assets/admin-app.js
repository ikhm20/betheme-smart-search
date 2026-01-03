/* global window */
(function () {
  var root = window;
  if (!root || !root.wp || !root.wp.element) return;

  var container = document.getElementById("betheme-smart-search-admin-app");
  if (!container) return;

  var BSS = root.BSSAdmin || (root.BSSAdmin = {});
  var App = BSS.ui && typeof BSS.ui.App === "function" ? BSS.ui.App : null;
  if (!App) return;

  var el = root.wp.element.createElement;
  BSS.el = BSS.el || el;

  root.wp.element.render(el(App, null), container);
})();
