/**
 * stats-bootstrap.js — site-wide auto-publish (players never paste a PAT).
 *
 * Do NOT embed a GitHub PAT here. GitHub secret scanning revokes leaked tokens;
 * a dead Authorization header then 401s even public issue reads and freezes
 * the leaderboard. Writes go through a PAT-free mailbox; Actions creates issues
 * with GITHUB_TOKEN.
 */
(function (w) {
  if (!w) return;
  w.TIENLEN_STATS_TOKEN = '';
  w.TIENLEN_REMOTE_LOG = Object.assign({
    provider: 'github',
    owner: 'jvhoang',
    repo: 'tieng-len',
    label: 'play-log',
    autoPublish: true,
    token: '',
    ingestUrl: 'https://ntfy.sh/tieng-len-pl-022fdc9cf276b9185c96d7fcc08066d4',
    ingestKey: 'GWDZZKzVsedOEkS5wtWAcLic'
  }, w.TIENLEN_REMOTE_LOG || {});
  w.TIENLEN_STATS_AUTO = true;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
