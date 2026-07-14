/**
 * ai-build.js — zero-dependency build identity for the title screen.
 */
(function (root) {
  var BUILD = {
    id: "v9.4",
    stamped: "2026-07-14T01:40:51Z",
    label: "Grandmaster v9.4"
  };
  root.TIENLEN_AI_BUILD = BUILD;
  root.TienLenAI = root.TienLenAI || {};
  root.TienLenAI.AI_BUILD = BUILD;
  if (typeof module === "object" && module.exports) module.exports = BUILD;
}(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this)));
