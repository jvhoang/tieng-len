/**
 * ai-build.js — zero-dependency build identity for the title screen.
 * Auto-synced for fair dual v9.5 ship.
 */
(function (root) {
  var BUILD = {
    id: 'v9.5',
    stamped: '2026-07-14T09:35:31Z',
    label: 'Grandmaster v9.5 (fair dual sbc0)'
  };
  root.TIENLEN_AI_BUILD = BUILD;
  root.TienLenAI = root.TienLenAI || {};
  root.TienLenAI.AI_BUILD = BUILD;
  if (typeof module === 'object' && module.exports) module.exports = BUILD;
}(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this)));
