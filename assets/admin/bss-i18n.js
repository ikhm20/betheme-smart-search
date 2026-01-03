/* global window */
(function (root) {
  if (!root) return;

  var BSS = root.BSSAdmin || (root.BSSAdmin = {});
  var i18n = BSS.i18n || (BSS.i18n = {});

  var wpI18n = root.wp && root.wp.i18n ? root.wp.i18n : {};
  var __ = typeof wpI18n.__ === "function" ? wpI18n.__ : function (msg) { return msg; };
  var sprintf = typeof wpI18n.sprintf === "function"
    ? wpI18n.sprintf
    : function (format) {
        var args = Array.prototype.slice.call(arguments, 1);
        var idx = 0;
        return String(format).replace(/%[sd]/g, function () {
          var val = args[idx++];
          return val == null ? "" : String(val);
        });
      };

  var textDomain = (BSS.config && BSS.config.TEXT_DOMAIN) || "betheme-smart-search";

  i18n.t = function (msg) {
    return __(msg, textDomain);
  };

  i18n.tf = function (msg) {
    var args = Array.prototype.slice.call(arguments, 1);
    return sprintf.apply(null, [i18n.t(msg)].concat(args));
  };

  i18n.__ = __;
  i18n.sprintf = sprintf;
})(window);
