/**
 * stats-bootstrap.js — site-wide auto-publish (players never paste a PAT).
 * Token material is obfuscated (not a substitute for rotation if leaked).
 */
(function (w) {
  if (!w) return;
  function decodeTok(b64) {
    try {
      var bin = atob(b64);
      var key = 'tienlen-stats-v1';
      var out = '';
      for (var i = 0; i < bin.length; i++) {
        out += String.fromCharCode(bin.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return out;
    } catch (e) { return ''; }
  }
  var tok = decodeTok("EwEVMRkWVlkXPCJDIXw0RkYECz8+PBZ+OEUFBEN8DgchIFc5PisAVA==");
  w.TIENLEN_STATS_TOKEN = tok;
  w.TIENLEN_REMOTE_LOG = Object.assign({
    provider: 'github',
    owner: 'jvhoang',
    repo: 'tieng-len',
    label: 'play-log',
    autoPublish: true,
    token: tok
  }, w.TIENLEN_REMOTE_LOG || {});
  w.TIENLEN_STATS_AUTO = true;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
