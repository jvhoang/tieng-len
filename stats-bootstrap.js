/**
 * stats-bootstrap.js — site-wide auto-publish of play stats to GitHub Issues.
 * Players never paste a PAT. Write token is injected at deploy (Pages workflow
 * secret TIENLEN_STATS_TOKEN) or via gitignored stats-bootstrap.local.js.
 *
 * Do not put classic personal access tokens in this file — push protection will block them.
 */
(function (w) {
  if (!w) return;
  var tok = '';
  // Prefer already-injected values (deploy artifact / .local.js loaded after this)
  if (w.TIENLEN_STATS_TOKEN) tok = String(w.TIENLEN_STATS_TOKEN);
  if (w.TIENLEN_REMOTE_LOG && w.TIENLEN_REMOTE_LOG.token) {
    tok = String(w.TIENLEN_REMOTE_LOG.token);
  }
  w.TIENLEN_STATS_TOKEN = tok;
  w.TIENLEN_REMOTE_LOG = Object.assign({
    provider: 'github',
    owner: 'jvhoang',
    repo: 'tieng-len',
    label: 'play-log',
    autoPublish: true,
    token: tok
  }, w.TIENLEN_REMOTE_LOG || {});
  // Hide player PAT permission UI; publish works when token is present via .local / CI
  w.TIENLEN_STATS_AUTO = true;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
