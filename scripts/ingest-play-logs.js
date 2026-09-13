#!/usr/bin/env node
/**
 * Poll the PAT-free play-log mailbox and create GitHub issues with GITHUB_TOKEN.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const playLogMod = require('../play-log.js');
const remote = require('./playlog-remote.json');

const OWNER = remote.owner || 'jvhoang';
const REPO = remote.repo || 'tieng-len';
const LABEL = remote.label || 'play-log';
const TOKEN = process.env.GITHUB_TOKEN;
const SEEN_PATH = path.join(__dirname, '..', 'data', 'ingest-seen.json');

function topicFromUrl(url) {
  return String(url || '').replace(/^https?:\/\/ntfy\.sh\//i, '').replace(/\/$/, '');
}

function githubHeaders() {
  if (!TOKEN) throw new Error('GITHUB_TOKEN required for ingest');
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: 'Bearer ' + TOKEN,
    'User-Agent': 'tieng-len-ingest'
  };
}

function loadSeen() {
  try {
    return JSON.parse(fs.readFileSync(SEEN_PATH, 'utf8'));
  } catch (e) {
    return { ids: [], lastTime: 0 };
  }
}

function saveSeen(seen) {
  fs.mkdirSync(path.dirname(SEEN_PATH), { recursive: true });
  const ids = (seen.ids || []).slice(-400);
  fs.writeFileSync(SEEN_PATH, JSON.stringify({ lastTime: seen.lastTime || 0, ids: ids }) + '\n');
}

async function pollMailbox() {
  const topic = topicFromUrl(remote.ingestUrl);
  if (!topic) return [];
  const url = 'https://ntfy.sh/' + topic + '/json?poll=1&since=all';
  const res = await fetch(url, { headers: { 'User-Agent': 'tieng-len-ingest' } });
  if (!res.ok) throw new Error('ntfy poll HTTP ' + res.status);
  const text = (await res.text()).trim();
  if (!text) return [];
  return text.split('\n').filter(Boolean).map(function (line) {
    return JSON.parse(line);
  }).filter(function (m) {
    return m && m.event === 'message';
  });
}

function parsePayload(msg) {
  var compact = null;
  try {
    compact = JSON.parse(msg.message || '');
  } catch (e) {
    compact = null;
  }
  if (compact && compact.probe) return { skip: true, reason: 'probe' };
  if (compact && compact.k && compact.k !== remote.ingestKey) {
    return { skip: true, reason: 'bad-key' };
  }
  if (compact && compact.id && compact.username && compact.result) {
    if (compact.k !== remote.ingestKey) return { skip: true, reason: 'bad-key' };
    return { compact: compact, title: msg.title || null };
  }
  return { compact: null, title: msg.title || null };
}

async function fetchAttachment(msg) {
  const att = msg.attachment;
  if (!att || !att.url) return null;
  try {
    const res = await fetch(att.url, { headers: { 'User-Agent': 'tieng-len-ingest' } });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    return null;
  }
}

async function recentIssueTitles() {
  const titles = [];
  for (let page = 1; page <= 8; page++) {
    const url = 'https://api.github.com/repos/' + OWNER + '/' + REPO +
      '/issues?labels=' + encodeURIComponent(LABEL) +
      '&state=all&per_page=100&page=' + page +
      '&sort=created&direction=desc';
    const res = await fetch(url, { headers: githubHeaders() });
    if (!res.ok) break;
    const issues = await res.json();
    if (!Array.isArray(issues) || !issues.length) break;
    for (let i = 0; i < issues.length; i++) titles.push(String(issues[i].title || ''));
    if (issues.length < 100) break;
  }
  return titles;
}

async function createIssue(title, body) {
  const res = await fetch('https://api.github.com/repos/' + OWNER + '/' + REPO + '/issues', {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, githubHeaders()),
    body: JSON.stringify({ title: title, body: body, labels: [LABEL] })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data && data.message) || ('create issue HTTP ' + res.status));
  }
  return data;
}

async function main() {
  const seen = loadSeen();
  const seenSet = {};
  (seen.ids || []).forEach(function (id) { seenSet[id] = true; });

  const messages = await pollMailbox();
  console.log('mailbox messages=' + messages.length);
  if (!messages.length) return;

  const titles = await recentIssueTitles();
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || !msg.id || seenSet[msg.id]) {
      skipped++;
      continue;
    }
    const parsed = parsePayload(msg);
    if (parsed.skip) {
      console.log('skip', msg.id, parsed.reason);
      seenSet[msg.id] = true;
      seen.ids.push(msg.id);
      skipped++;
      continue;
    }
    const compact = parsed.compact;
    const gameId = compact && compact.id;
    if (gameId && titles.some(function (t) { return t.indexOf(gameId) >= 0; })) {
      console.log('dup', gameId);
      seenSet[msg.id] = true;
      seen.ids.push(msg.id);
      skipped++;
      continue;
    }

    let rec = compact;
    const att = await fetchAttachment(msg);
    if (att) {
      const decoded = playLogMod.decodeIssueBody(att) || (function () {
        try { return JSON.parse(att); } catch (e) { return null; }
      })();
      if (decoded && decoded.id) rec = decoded;
    }
    if (!rec || !rec.id) {
      console.log('skip', msg.id, 'no-record');
      seenSet[msg.id] = true;
      seen.ids.push(msg.id);
      skipped++;
      continue;
    }
    if (compact && compact.k) rec = Object.assign({}, rec);
    if (rec.k) delete rec.k;

    const title = msg.title || playLogMod.issueTitle(rec);
    const body = playLogMod.encodeIssueBody(rec);
    const issue = await createIssue(title, body);
    console.log('created #' + issue.number + ' ' + rec.id);
    created++;
    seenSet[msg.id] = true;
    seen.ids.push(msg.id);
    seen.lastTime = Math.max(seen.lastTime || 0, msg.time || 0);
    titles.unshift(title);
  }

  saveSeen(seen);
  console.log('ingest created=' + created + ' skipped=' + skipped);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
