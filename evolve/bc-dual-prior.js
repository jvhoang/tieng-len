'use strict';
/**
 * Build dual free-lead prior from playlog BC (TRAIN).
 * Emits evolve/eval-registry/bc-dual-prior.json with general stats:
 *   P(pair free lead | deep, control), P(seq free lead | ...), etc.
 * Does not emit byR fingerprints.
 *
 *   node evolve/bc-dual-prior.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const goldDir = path.join(ROOT, 'john_uploads');

function newestPlaylog() {
  const files = fs.readdirSync(goldDir).filter(f => /^tienlen-playlogs-.*\.json$/.test(f));
  let best = null, bestM = 0;
  for (const f of files) {
    const st = fs.statSync(path.join(goldDir, f));
    if (st.mtimeMs > bestM) { bestM = st.mtimeMs; best = f; }
  }
  return best ? path.join(goldDir, best) : null;
}

function main() {
  const p = newestPlaylog();
  if (!p) throw new Error('no playlog');
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const bins = {
    deep_ctrl_pair: { n: 0, hit: 0 },
    deep_ctrl_seq: { n: 0, hit: 0 },
    deep_ctrl_single: { n: 0, hit: 0 },
    deep_ctrl_trash: { n: 0, hit: 0 },
    short_multi: { n: 0, hit: 0 },
    short_high: { n: 0, hit: 0 }
  };
  let freeN = 0;
  for (const g of j.games || []) {
    if (!g.vsAI || g.numPlayers !== 2) continue;
    let free = true;
    for (const e of g.events || []) {
      if (e.type === 'play' && e.actor === 'human') {
        const cards = e.cards || [];
        const hand = e.handBefore || [];
        const handLen = hand.length;
        const by = {};
        let twos = 0;
        for (const c of hand) {
          by[c.rank] = (by[c.rank] || 0) + 1;
          if (c.rank === 12) twos++;
        }
        const hasPairLow = Object.keys(by).some(r => +r <= 6 && by[r] >= 2);
        const control = twos >= 1 || Object.keys(by).filter(r => +r >= 10 && by[r] >= 2).length >= 1;
        const typ = (e.combo && e.combo.type) || (cards.length === 1 ? 'single' : 'other');
        const top = cards.reduce((m, c) => Math.max(m, c.rank), 0);
        if (free && handLen >= 9 && control) {
          bins.deep_ctrl_pair.n++;
          bins.deep_ctrl_seq.n++;
          bins.deep_ctrl_single.n++;
          bins.deep_ctrl_trash.n++;
          if (typ === 'pair' && top <= 7) bins.deep_ctrl_pair.hit++;
          if (typ === 'seq' && cards.length <= 4) bins.deep_ctrl_seq.hit++;
          if (typ === 'single' && top <= 6) bins.deep_ctrl_trash.hit++;
          if (typ === 'single') bins.deep_ctrl_single.hit++;
        }
        if (free && handLen <= 6) {
          bins.short_multi.n++;
          bins.short_high.n++;
          if (cards.length >= 2) bins.short_multi.hit++;
          if (typ === 'single' && top >= 10) bins.short_high.hit++;
        }
        freeN++;
        free = false;
      }
      if (e.type === 'pass' || e.type === 'trick_end') {
        // approximate free after take
      }
      if (e.type === 'play' && e.tookControl) free = true;
    }
  }
  const rates = {};
  for (const k of Object.keys(bins)) {
    rates[k] = bins[k].n ? bins[k].hit / bins[k].n : 0;
  }
  const out = {
    protocol: 'bc-dual-prior-v1',
    playlog: path.basename(p),
    freeN: freeN,
    bins: bins,
    rates: rates,
    dualHints: {
      // If deep+control, prefer low pair over long multi when rate high
      preferLowPairWhenDeepCtrl: rates.deep_ctrl_pair >= 0.15,
      preferTrashWhenDeepCtrl: rates.deep_ctrl_trash >= 0.2,
      preferMultiWhenShort: rates.short_multi >= 0.3
    }
  };
  const outPath = path.join(ROOT, 'evolve', 'eval-registry', 'bc-dual-prior.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main();
