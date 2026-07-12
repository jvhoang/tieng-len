/**
 * Refresh ALL 1v1 completed human play-logs from GitHub issues (label: play-log)
 * into {SCRATCH}/issues/ and rebuild playlog-index.json.
 *
 *   TIENLEN_SCRATCH=... node evolve/refresh-playlogs-all.js
 *
 * Optional: GITHUB_TOKEN / GH_TOKEN for higher rate limits.
 * Optional: TIENLEN_PLAYLOG_REPO=owner/repo (default jvhoang/tieng-len)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const SCRATCH = process.env.TIENLEN_SCRATCH || path.join(__dirname);
const ISSUES_DIR = process.env.TIENLEN_CF_ISSUES_DIR || path.join(SCRATCH, 'issues');
const REPO = process.env.TIENLEN_PLAYLOG_REPO || 'jvhoang/tieng-len';
const INDEX = path.join(SCRATCH, 'playlog-index.json');
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

function fetchJson(url) {
  return new Promise(function (resolve, reject) {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'tienlen-ladder-cf-all',
        ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {})
      }
    };
    https.get(opts, function (res) {
      let body = '';
      res.on('data', function (c) { body += c; });
      res.on('end', function () {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error('HTTP ' + res.statusCode + ' ' + body.slice(0, 200)));
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function parseLogFromIssue(issue) {
  let data = issue.log || null;
  const body = issue.body || '';
  if (!data && body) {
    const m = body.match(/```json\s*([\s\S]*?)```/);
    if (m) {
      try { data = JSON.parse(m[1].trim()); } catch (e) { data = null; }
    }
    if (!data) {
      const i0 = body.indexOf('{');
      const i1 = body.lastIndexOf('}');
      if (i0 >= 0 && i1 > i0) {
        try { data = JSON.parse(body.slice(i0, i1 + 1)); } catch (e) { data = null; }
      }
    }
  }
  return data;
}

function isCompleted2p(issue, data) {
  const title = (issue.title || '').toLowerCase();
  if (title.indexOf('abandoned') >= 0) return false;
  if (title.indexOf('4p') >= 0) return false;
  if (!data) return false;
  if (data.numPlayers != null && data.numPlayers !== 2) return false;
  // Prefer explicit 2p markers in title
  if (title.indexOf('2p') < 0 && title.indexOf('1v1') < 0) {
    // still accept if data says 2 players via hands
    const hands = data.deal && data.deal.hands;
    if (!hands || hands.length !== 2) return false;
  }
  // Must have deal hands + events for CF
  if (!data.deal || !data.deal.hands) return false;
  if (!data.events || !data.events.length) return false;
  // Skip abandoned tags
  const tags = data.tags || [];
  if (tags.indexOf('abandoned') >= 0) return false;
  if (data.result && data.result.abandoned) return false;
  return true;
}

async function main() {
  if (!fs.existsSync(ISSUES_DIR)) fs.mkdirSync(ISSUES_DIR, { recursive: true });

  const allIssues = [];
  for (let page = 1; page <= 30; page++) {
    const url = 'https://api.github.com/repos/' + REPO +
      '/issues?labels=play-log&state=all&per_page=100&page=' + page;
    console.log('fetch', page);
    const items = await fetchJson(url);
    if (!items.length) break;
    for (let i = 0; i < items.length; i++) allIssues.push(items[i]);
    if (items.length < 100) break;
  }
  console.log('fetched issues', allIssues.length);

  const completed2p = [];
  const skipped = [];
  for (let i = 0; i < allIssues.length; i++) {
    const issue = allIssues[i];
    // Skip PRs mistakenly labeled
    if (issue.pull_request) continue;
    const n = issue.number;
    const outPath = path.join(ISSUES_DIR, 'issue-' + n + '.json');
    fs.writeFileSync(outPath, JSON.stringify(issue, null, 2));
    // also raw for compatibility
    fs.writeFileSync(path.join(ISSUES_DIR, 'raw-' + n + '.json'), JSON.stringify(issue, null, 2));

    let data = null;
    try {
      data = parseLogFromIssue(issue);
    } catch (e) {
      skipped.push({ issue: n, reason: 'parse-error' });
      continue;
    }
    if (isCompleted2p(issue, data)) {
      completed2p.push(n);
    } else {
      skipped.push({
        issue: n,
        reason: !data ? 'no-json' :
          ((issue.title || '').toLowerCase().indexOf('abandoned') >= 0 ? 'abandoned' : 'not-completed-2p')
      });
    }
  }

  completed2p.sort(function (a, b) { return a - b; });
  const index = {
    completed2p: completed2p,
    totalIssues: allIssues.length,
    completedCount: completed2p.length,
    skipped: skipped,
    note: 'all-1v1-completed-playlogs',
    refreshedAt: new Date().toISOString(),
    repo: REPO
  };
  fs.writeFileSync(INDEX, JSON.stringify(index, null, 2));
  // also under evolve for convenience
  try {
    fs.writeFileSync(path.join(__dirname, 'playlog-index.json'), JSON.stringify(index, null, 2));
  } catch (e) { /* ignore */ }

  console.log(JSON.stringify({
    completed2pCount: completed2p.length,
    totalIssues: allIssues.length,
    skipped: skipped.length,
    index: INDEX,
    first: completed2p.slice(0, 5),
    last: completed2p.slice(-5)
  }, null, 2));
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
