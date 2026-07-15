'use strict';
/**
 * Living gold inventory for john_uploads/.
 * Usage: node evolve/refresh-gold-manifest.js
 * Writes evolve/eval-registry/gold-manifest.json
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const GOLD_DIR = path.join(ROOT, 'john_uploads');
const OUT = path.join(ROOT, 'evolve', 'eval-registry', 'gold-manifest.json');
const PREV = OUT;

function walk(dir, base) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name === '.DS_Store') continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p, base));
    else {
      const rel = path.relative(base, p);
      const buf = fs.readFileSync(p);
      out.push({
        path: rel.split(path.sep).join('/'),
        bytes: st.size,
        mtimeMs: st.mtimeMs,
        sha256: crypto.createHash('sha256').update(buf).digest('hex')
      });
    }
  }
  return out;
}

function main() {
  const files = walk(GOLD_DIR, GOLD_DIR).sort((a, b) => a.path.localeCompare(b.path));
  let prev = null;
  if (fs.existsSync(PREV)) {
    try { prev = JSON.parse(fs.readFileSync(PREV, 'utf8')); } catch (_) {}
  }
  const prevMap = Object.create(null);
  if (prev && prev.files) {
    for (const f of prev.files) prevMap[f.path] = f.sha256;
  }
  const added = [];
  const changed = [];
  const removed = [];
  const curMap = Object.create(null);
  for (const f of files) {
    curMap[f.path] = f.sha256;
    if (!prevMap[f.path]) added.push(f.path);
    else if (prevMap[f.path] !== f.sha256) changed.push(f.path);
  }
  if (prev && prev.files) {
    for (const f of prev.files) {
      if (!curMap[f.path]) removed.push(f.path);
    }
  }
  const txt = files.filter(function (f) { return /\.txt$/i.test(f.path); }).map(function (f) { return f.path; });
  const playlogs = files.filter(function (f) { return /playlog/i.test(f.path) && /\.json$/i.test(f.path); })
    .sort(function (a, b) {
      const fa = files.find(function (x) { return x.path === a.path; });
      const fb = files.find(function (x) { return x.path === b.path; });
      return (fb.mtimeMs || 0) - (fa.mtimeMs || 0);
    })
    .map(function (f) { return f.path; });
  const images = files.filter(function (f) { return /\.(png|jpe?g|webp)$/i.test(f.path); }).map(function (f) { return f.path; });

  const report = {
    protocol: 'living-gold-manifest-v1',
    stamped: new Date().toISOString(),
    goldDir: 'john_uploads',
    fileCount: files.length,
    files: files,
    diff: { added: added, changed: changed, removed: removed, dirty: !!(added.length || changed.length || removed.length) },
    pointers: {
      textFiles: txt,
      newestPlaylog: playlogs[0] || null,
      playlogs: playlogs,
      imageCount: images.length,
      imagesSample: images.slice(0, 20)
    },
    note: 'Inventory is not frozen; re-run every PAIR_STEP and ≤2h. Prefer newest playlog for BC refresh.'
  };
  const dir = path.dirname(OUT);
  try { fs.mkdirSync(dir); } catch (e) { if (e.code !== 'EEXIST') throw e; }
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    wrote: OUT,
    fileCount: files.length,
    dirty: report.diff.dirty,
    added: added.length,
    changed: changed.length,
    removed: removed.length,
    newestPlaylog: report.pointers.newestPlaylog,
    textFiles: txt
  }, null, 2));
  process.exit(report.diff.dirty && process.env.FAIL_IF_DIRTY === '1' ? 2 : 0);
}

main();
