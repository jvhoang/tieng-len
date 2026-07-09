#!/usr/bin/env node
/**
 * run-evolve.js — Self-play evolution of Tiến Lên AI
 *
 * Loop: mutate champion → play ≥100 games vs champion → promote winner
 * Repeat 1000 times (≈100k games). Strategist every 20 loops.
 *
 * Usage:
 *   node evolve/run-evolve.js              # full 1000 × 100
 *   TIENLEN_EVOLVE_SMOKE=1 node evolve/run-evolve.js   # 3 × 100 smoke
 *   TIENLEN_EVOLVE_LOOPS=50 node evolve/run-evolve.js
 *   TIENLEN_EVOLVE_GAMES=100 node evolve/run-evolve.js
 *   TIENLEN_EVOLVE_RESUME=1 node evolve/run-evolve.js  # resume checkpoint
 */
const fs = require('fs');
const path = require('path');

process.env.TIENLEN_EVOLVE = '1';
process.env.TIENLEN_TEST_FAST = '1';

const engine = require('../engine.js');
const ai = require('../ai.js');
const genomeMod = require('../genome.js');

const { createGameState, getLegalPlays, applyPlay, pass } = engine;
const { getAIMove } = ai;
const {
  getBaseline, getChampion, setChampion, mutateGenome, cloneGenome,
  normalizeGenome, seededRandom, GENE_KEYS
} = genomeMod;

const ROOT = path.join(__dirname, '..');
const SCRATCH = process.env.TIENLEN_SCRATCH ||
  '/var/folders/sq/9sj87lh90pvg6yjc6lt30wsw0000gn/T/grok-goal-1b18a7edb33d/implementer';
const CHECKPOINT = path.join(SCRATCH, 'evolve-checkpoint.json');
const FULL_LOG = path.join(SCRATCH, 'evolve-full.log');
const SMOKE_LOG = path.join(SCRATCH, 'evolve-smoke.log');
const STRATEGIST_DIR = path.join(SCRATCH, 'strategist');
const CHAMPION_JSON = path.join(ROOT, 'champion-genome.json');
const CHAMPION_BAKE = path.join(ROOT, 'evolve', 'champion-baked.json');

if (!fs.existsSync(SCRATCH)) fs.mkdirSync(SCRATCH, { recursive: true });
if (!fs.existsSync(STRATEGIST_DIR)) fs.mkdirSync(STRATEGIST_DIR, { recursive: true });

const SMOKE = !!process.env.TIENLEN_EVOLVE_SMOKE;
// Default: 100k loops × 100 games = 10M games (override with env)
const TOTAL_LOOPS = SMOKE ? 3 : parseInt(process.env.TIENLEN_EVOLVE_LOOPS || '100000', 10);
const GAMES_PER = parseInt(process.env.TIENLEN_EVOLVE_GAMES || '100', 10);
const STRATEGIST_EVERY = 20;
const logPath = SMOKE ? SMOKE_LOG : FULL_LOG;

const lines = [];
function log(m) {
  const s = typeof m === 'string' ? m : JSON.stringify(m);
  lines.push(s);
  console.log(s);
}
function flushLog() {
  fs.writeFileSync(logPath, lines.join('\n') + '\n', 'utf8');
}

/**
 * Play one 2p game: seat0 = genomeA, seat1 = genomeB. Returns winner seat.
 * Uses real engine + getAIMove with genomes. Expert-fast path via TIENLEN_EVOLVE.
 */
function playGame(genomeA, genomeB, seed) {
  let state = createGameState(2, seed);
  state.isFirstLead = true;
  let steps = 0;
  const MAX = 200;
  while (!state.roundOver && steps < MAX) {
    const cp = state.currentPlayer;
    const genome = cp === 0 ? genomeA : genomeB;
    const legals = getLegalPlays(
      state.players[cp].hand, state.currentCombo, state.players[cp].passed,
      state.isFirstLead, state.firstLeadCard
    );
    if (!legals.length) {
      if (!state.currentCombo) {
        // should not happen; force lowest card
        if (state.players[cp].hand.length) {
          state = applyPlay(state, cp, [state.players[cp].hand[0]]);
        } else break;
      } else {
        state = pass(state, cp);
      }
    } else {
      let choice = getAIMove(state, cp, { genome, difficulty: 'easy', iterations: 0 });
      if (choice == null) {
        if (state.currentCombo) state = pass(state, cp);
        else {
          choice = legals[0];
          state = applyPlay(state, cp, choice);
        }
      } else {
        // validate
        const sig = choice.map(c => c.rank * 4 + c.suit).sort().join();
        const ok = legals.some(l => l.map(c => c.rank * 4 + c.suit).sort().join() === sig);
        state = applyPlay(state, cp, ok ? choice : legals[0]);
      }
    }
    state.isFirstLead = false;
    steps++;
  }
  if (state.finishOrder && state.finishOrder.length) return state.finishOrder[0];
  // Incomplete: fewer cards wins
  const h0 = state.players[0].hand.length;
  const h1 = state.players[1].hand.length;
  if (h0 < h1) return 0;
  if (h1 < h0) return 1;
  return -1; // draw
}

/**
 * Match with optional multi-lead quality probe (free-lead multi rate for cand).
 * Promote uses wins; multi-lead stats logged for strategist.
 */
function match(genomeCand, genomeChamp, games, baseSeed) {
  let candWins = 0, champWins = 0, draws = 0;
  let candMultiLeads = 0, candLeads = 0;
  for (let i = 0; i < games; i++) {
    const seed = baseSeed + i * 17 + 3;
    let winner;
    if (i % 2 === 0) {
      winner = playGame(genomeCand, genomeChamp, seed);
      if (winner === 0) candWins++;
      else if (winner === 1) champWins++;
      else draws++;
    } else {
      winner = playGame(genomeChamp, genomeCand, seed);
      if (winner === 1) candWins++;
      else if (winner === 0) champWins++;
      else draws++;
    }
    // Probe free-lead multi rate on a dedicated deal for cand
    if (i % 5 === 0) {
      const st = createGameState(2, seed + 99991);
      const cp = st.currentPlayer;
      // Only count when cand would be the one leading first if we force
      const mv = getAIMove(st, cp, { genome: genomeCand, difficulty: 'easy', iterations: 0 });
      if (mv) {
        candLeads++;
        if (mv.length >= 2) candMultiLeads++;
      }
    }
  }
  return {
    candWins, champWins, draws, games,
    candMultiLeadRate: candLeads ? candMultiLeads / candLeads : 0
  };
}

/**
 * Strategist: analyze last N loop outcomes, emit mutation directives.
 */
function runStrategist(history, loopNum) {
  const window = history.slice(-STRATEGIST_EVERY);
  const geneWins = {};
  const geneLoss = {};
  GENE_KEYS.forEach(k => { geneWins[k] = 0; geneLoss[k] = 0; });

  let promotions = 0;
  let totalCandWinRate = 0;
  window.forEach(row => {
    totalCandWinRate += row.candWins / (row.games || 1);
    if (row.promoted) promotions++;
    (row.mutations || []).forEach(m => {
      if (row.promoted) geneWins[m.gene] = (geneWins[m.gene] || 0) + 1;
      else geneLoss[m.gene] = (geneLoss[m.gene] || 0) + 1;
    });
  });

  const scores = GENE_KEYS.map(k => ({
    gene: k,
    score: (geneWins[k] || 0) - 0.5 * (geneLoss[k] || 0)
  })).sort((a, b) => b.score - a.score);

  const preferAxes = scores.filter(s => s.score > 0).slice(0, 8).map(s => s.gene);
  const avoidAxes = scores.filter(s => s.score < 0).slice(0, 5).map(s => s.gene);

  // Creative strategist directives based on patterns
  const notes = [];
  notes.push(`Strategist review at loop ${loopNum}`);
  notes.push(`Last ${window.length} loops: promotions=${promotions}, avg cand WR=${(totalCandWinRate / (window.length || 1)).toFixed(3)}`);
  if (preferAxes.length) notes.push('Focus mutations on: ' + preferAxes.join(', '));
  if (avoidAxes.length) notes.push('De-emphasize: ' + avoidAxes.join(', '));
  if (promotions < 3) {
    notes.push('Low promotion rate → increase mutation scale (explore more).');
  } else if (promotions > 10) {
    notes.push('High promotion rate → reduce scale (exploit current basin).');
  }
  // Domain insight heuristics
  if ((geneWins.twoBeatPen || 0) + (geneWins.twoHold || 0) > 2) {
    notes.push('Two-conservation genes winning → keep pressuring conserve-vs-dump balance.');
  }
  if ((geneWins.multiLeadB || 0) + (geneWins.shedLenB || 0) > 2) {
    notes.push('Multi-combo lead genes winning → continue multi-card shed emphasis.');
  }
  if ((geneWins.passMargin || 0) + (geneWins.passHandMin || 0) > 1) {
    notes.push('Pass thresholds matter → explore pass aggressiveness carefully (never cheap-pass).');
  }
  notes.push('Always preserve: free-lead must play; cheap non-2/non-bomb beats never pass.');

  const scale = promotions < 3 ? 1.35 : (promotions > 10 ? 0.75 : 1.0);
  const directives = { preferAxes, avoidAxes, scale, notes, loop: loopNum, promotions };

  const file = path.join(STRATEGIST_DIR, `strategist-loop-${loopNum}.json`);
  fs.writeFileSync(file, JSON.stringify(directives, null, 2));
  log(`[strategist@${loopNum}] ${notes.join(' | ')}`);
  return directives;
}

function saveCheckpoint(state) {
  fs.writeFileSync(CHECKPOINT, JSON.stringify(state, null, 2));
}

function loadCheckpoint() {
  if (!fs.existsSync(CHECKPOINT)) return null;
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8'));
  } catch (e) {
    return null;
  }
}

function bakeChampion(genome) {
  const g = normalizeGenome(genome);
  g.id = 'champion-evolved-g' + (g.gen || 0);
  setChampion(g);
  fs.writeFileSync(CHAMPION_JSON, JSON.stringify(g, null, 2));
  fs.writeFileSync(CHAMPION_BAKE, JSON.stringify(g, null, 2));
  // Inject into genome.js champion default via rewrite of champion-genome load
  // Also set active AI genome
  if (ai.setActiveGenome) ai.setActiveGenome(g);
  return g;
}

function tryLoadBakedChampion() {
  for (const p of [CHAMPION_JSON, CHAMPION_BAKE]) {
    if (fs.existsSync(p)) {
      try {
        const g = normalizeGenome(JSON.parse(fs.readFileSync(p, 'utf8')));
        setChampion(g);
        if (ai.setActiveGenome) ai.setActiveGenome(g);
        return g;
      } catch (e) { /* continue */ }
    }
  }
  return null;
}

function main() {
  const t0 = Date.now();
  log('=== TIẾN LÊN AI SELF-PLAY EVOLUTION ===');
  log(`loops=${TOTAL_LOOPS} gamesPerLoop=${GAMES_PER} smoke=${SMOKE}`);
  log(`scratch=${SCRATCH}`);

  let champion = tryLoadBakedChampion() || getBaseline();
  setChampion(champion);
  if (ai.setActiveGenome) ai.setActiveGenome(champion);

  let startLoop = 1;
  let history = [];
  let directives = { preferAxes: [], avoidAxes: [], scale: 1 };
  let totalGames = 0;
  let totalPromotions = 0;

  if (process.env.TIENLEN_EVOLVE_RESUME && fs.existsSync(CHECKPOINT)) {
    const ck = loadCheckpoint();
    if (ck && ck.loop < TOTAL_LOOPS) {
      startLoop = ck.loop + 1;
      champion = normalizeGenome(ck.champion);
      history = ck.history || [];
      directives = ck.directives || directives;
      totalGames = ck.totalGames || 0;
      totalPromotions = ck.totalPromotions || 0;
      setChampion(champion);
      if (ai.setActiveGenome) ai.setActiveGenome(champion);
      log(`Resuming from loop ${startLoop} (champion gen=${champion.gen})`);
    }
  }

  const rng = seededRandom(42 + startLoop * 999);

  for (let loop = startLoop; loop <= TOTAL_LOOPS; loop++) {
    const cand = mutateGenome(champion, rng, directives);
    const m = match(cand, champion, GAMES_PER, 100000 + loop * 1000);
    totalGames += m.games;

    // Promote if candidate wins strictly more (tie keeps champion)
    const promoted = m.candWins > m.champWins;
    if (promoted) {
      champion = cloneGenome(cand);
      delete champion._mutations;
      setChampion(champion);
      totalPromotions++;
    }

    const row = {
      loop,
      candWins: m.candWins,
      champWins: m.champWins,
      draws: m.draws,
      games: m.games,
      promoted,
      candId: cand.id,
      champGen: champion.gen,
      mutations: cand._mutations || []
    };
    history.push(row);

    if (loop % 10 === 0 || loop <= 3 || SMOKE) {
      log(`loop ${loop}/${TOTAL_LOOPS}: cand ${m.candWins}-${m.champWins} (d${m.draws}) ${promoted ? 'PROMOTE' : 'keep'} champGen=${champion.gen}`);
    }

    // Strategist every 20 (and once at end of short/smoke runs)
    if (loop % STRATEGIST_EVERY === 0 || (SMOKE && loop === TOTAL_LOOPS) || loop === TOTAL_LOOPS) {
      directives = runStrategist(history, loop);
    }

    // Checkpoint every 50 (or 20 for smaller runs) / last
    const ckEvery = TOTAL_LOOPS >= 10000 ? 50 : 20;
    if (loop % ckEvery === 0 || loop === TOTAL_LOOPS) {
      saveCheckpoint({
        loop,
        champion,
        history: history.slice(-80),
        directives,
        totalGames,
        totalPromotions,
        updatedAt: new Date().toISOString()
      });
      // Persist champion continuously so crash still ships best so far
      bakeChampion(champion);
      flushLog();
    }
  }

  const final = bakeChampion(champion);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  const summary = {
    loopCount: TOTAL_LOOPS,
    gamesPerLoop: GAMES_PER,
    totalGames,
    totalPromotions,
    finalChampion: { id: final.id, gen: final.gen },
    elapsedSec: elapsed,
    strategistFiles: fs.readdirSync(STRATEGIST_DIR).filter(f => f.startsWith('strategist-'))
  };
  log('=== EVOLUTION COMPLETE ===');
  log(JSON.stringify(summary, null, 2));
  const sumName = SMOKE ? 'evolve-summary-smoke.json' : 'evolve-summary.json';
  fs.writeFileSync(path.join(SCRATCH, sumName), JSON.stringify(summary, null, 2));
  // Always keep a pointer to the latest full-scale summary if this was full
  if (!SMOKE) {
    fs.writeFileSync(path.join(SCRATCH, 'evolve-summary.json'), JSON.stringify(summary, null, 2));
  }
  flushLog();

  // Write strategist audit listing
  const audit = summary.strategistFiles.map(f => {
    const p = path.join(STRATEGIST_DIR, f);
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    return { file: f, loop: j.loop, prefer: j.preferAxes, notes: j.notes };
  });
  fs.writeFileSync(path.join(SCRATCH, 'strategist-audit.log'),
    audit.map(a => `${a.file} loop=${a.loop} prefer=[${(a.prefer || []).join(',')}] ${(a.notes || []).join(' // ')}`).join('\n') + '\n');

  if (totalGames < TOTAL_LOOPS * GAMES_PER) {
    console.error('ERROR: total games short');
    process.exit(1);
  }
  const expected = TOTAL_LOOPS * GAMES_PER;
  if (totalGames < expected) {
    console.error('ERROR: expected ' + expected + ' games, got ' + totalGames);
    process.exit(1);
  }
  process.exit(0);
}

main();
