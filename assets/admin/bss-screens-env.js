/* global window */
(function (root) {
  if (!root || !root.wp || !root.wp.element) return;

  var BSS = root.BSSAdmin || (root.BSSAdmin = {});
  var ui = BSS.ui || (BSS.ui = {});
  ui.screens = ui.screens || {};

  var element = root.wp.element;
  var components = root.wp.components || {};
  var utils = BSS.utils || {};

  ui.screensEnv = {
    element: element,
    el: element.createElement,
    Fragment: element.Fragment,
    useEffect: element.useEffect,
    useMemo: element.useMemo,
    useState: element.useState,
    Button: components.Button,
    Card: components.Card,
    CardBody: components.CardBody,
    CheckboxControl: components.CheckboxControl,
    Flex: components.Flex,
    FlexBlock: components.FlexBlock,
    PanelBody: components.PanelBody,
    Spinner: components.Spinner,
    TextControl: components.TextControl,
    TextareaControl: components.TextareaControl,
    ToggleControl: components.ToggleControl,
    SelectControl: components.SelectControl,
    SectionTitle: ui.SectionTitle,
    HelpText: ui.HelpText,
    StatCard: ui.StatCard,
    Table: ui.Table,
    Tabs: ui.Tabs,
    clampInt: utils.clampInt,
    safeJson: utils.safeJson,
    copyToClipboard: utils.copyToClipboard,
    ensureArray: utils.ensureArray,
    normalizeEnginesForUI: utils.normalizeEnginesForUI,
    normalizeEngineId: utils.normalizeEngineId,
    normalizeEngineRecord: utils.normalizeEngineRecord,
    buildDefaultEngineFromOptions: utils.buildDefaultEngineFromOptions,
    engineIdList: utils.engineIdList,
    t: BSS.i18n && typeof BSS.i18n.t === "function" ? BSS.i18n.t : function (msg) { return msg; },
  };
})(window);
