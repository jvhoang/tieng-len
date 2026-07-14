/**
 * ai-build.js — zero-dependency build identity for the title screen.
 * Auto-synced for fair dual v9.7 ship.
 */
(function (root) {
  var AI_BUILD = {
    id: 'v9.7',
    stamped: '2026-07-14T15:35:16Z',
    label: 'Grandmaster v9.7 (fair dual fl7open stack)'
  };
  if (typeof module === 'object' && module.exports) {
    module.exports = { AI_BUILD: AI_BUILD };
  }
  if (typeof root !== 'undefined') {
    root.TIENLEN_AI_BUILD = AI_BUILD;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
