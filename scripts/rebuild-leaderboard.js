#!/usr/bin/env node
/**
 * Rebuild data/leaderboard.json + data/playlogs-index.json from public play-log issues.
 * Used by GitHub Actions (GITHUB_TOKEN optional) and for a one-time snapshot.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const playLogMod = require('../play-log.js');
const profile = require('../player-profile.js');

const OWNER = process.env.PLAYLOG_OWNER || 'jvhoang';
const REPO = process.env.PLAYLOG_REPO || 'tieng-len';
const LABEL = process.env.PLAYLOG_LABEL || 'play-log';
const OUT_DIR = path.join(__dirname, '..', 'data');
const PAGE_SIZE = 100;
const MAX_PAGES = 50;

function githubHeaders() {
  const h = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'tieng-len-leaderboard'
  };
  if (process.env.GITHUB_TOKEN) h.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
  return h;
}

async function fetchPage(page) {
  const url = 'https://api.github.com/repos/' + OWNER + '/' + REPO +
    '/issues?labels=' + encodeURIComponent(LABEL) +
    '&state=all&per_page=' + PAGE_SIZE +
    '&page=' + page +
    '&sort=created&direction=desc';
  const res = await fetch(url, { headers: githubHeaders() });
  if (!res.ok) {
    throw new Error('GitHub list failed HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
  }
  return res.json();
}

async function fetchAllIssues() {
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = await fetchPage(page);
    if (!Array.isArray(batch) || !batch.length) break;
    all.push.apply(all, batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return all;
}

function toCompact(rec) {
  const c = playLogMod.compactPlayLog(rec);
  delete c.k;
  return c;
}

async function main() {
  const issues = await fetchAllIssues();
  const games = [];
  for (let i = 0; i < issues.length; i++) {
    const iss = issues[i];
    if (!iss || iss.pull_request) continue;
    const rec = playLogMod.decodeIssueBody(iss.body || '');
    if (!rec || !rec.id) continue;
    rec._public = true;
    rec._source = 'github';
    rec._remoteIssueNumber = iss.number;
    rec._remoteIssueUrl = iss.html_url;
    if (!rec.endedAt && iss.created_at) rec.endedAt = iss.created_at;
    if (!rec.startedAt && iss.created_at) rec.startedAt = iss.created_at;
    games.push(rec);
  }

  const board = profile.buildLeaderboard(games, {
    modeFilter: 'all',
    onlyGrandmaster: true
  });
  const generatedAt = new Date().toISOString();
  const snapshot = {
    generatedAt: generatedAt,
    issueCount: issues.length,
    gameCount: games.length,
    newestIssue: issues[0] ? {
      number: issues[0].number,
      createdAt: issues[0].created_at,
      title: issues[0].title
    } : null,
    rows: board.rows,
    meta: board.meta
  };
  const index = {
    generatedAt: generatedAt,
    gameCount: games.length,
    games: games.map(toCompact)
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'leaderboard.json'), JSON.stringify(snapshot, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT_DIR, 'playlogs-index.json'), JSON.stringify(index) + '\n');
  console.log('Wrote data/leaderboard.json rows=' + snapshot.rows.length +
    ' games=' + games.length + ' issues=' + issues.length);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
