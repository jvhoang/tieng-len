/**
 * ai-build.js — zero-dependency build identity for the title screen.
 * Auto-synced for fair dual v9.6 ship.
 */
(function (root) {
  var AI_BUILD = {
    id: 'v9.6',
    stamped: '2026-07-14T14:33:42Z',
    label: 'Grandmaster v9.6 (fair dual fljpair)'
  };
  if (typeof module === 'object' && module.exports) {
    module.exports = { AI_BUILD: AI_BUILD };
  }
  if (typeof root !== 'undefined') {
    root.TIENLEN_AI_BUILD = AI_BUILD;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
