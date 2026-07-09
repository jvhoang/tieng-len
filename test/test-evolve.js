/**
 * test/test-evolve.js — smoke evolution + genome policy on real engine path
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCRATCH = process.env.TIENLEN_SCRATCH ||
  '/var/folders/sq/9sj87lh90pvg6yjc6lt30wsw0000gn/T/grok-goal-1b18a7edb33d/implementer';
if (!fs.existsSync(SCRATCH)) fs.mkdirSync(SCRATCH, { recursive: true });

const engine = require('../engine.js');
const ai = require('../ai.js');
const genome = require('../genome.js');

let passed = 0, failed = 0;
const out = [];
function log(m) { out.push(m); console.log(m); }
function t(name, c, d) {
  if (c) { passed++; log('PASS: ' + name); }
  else { failed++; log('FAIL: ' + name + (d ? ' ' + d : '')); }
}

log('=== EVOLVE / GENOME TESTS ===\n');

// Genome mutate differs
{
  const b = genome.getBaseline();
  const m = genome.mutateGenome(b, genome.seededRandom(7), {});
  t('mutate changes id', m.id !== b.id);
  t('mutate bumps gen', m.gen === (b.gen || 0) + 1);
  t('mutate has mutations list', Array.isArray(m._mutations) && m._mutations.length >= 1);
  let anyDiff = false;
  genome.GENE_KEYS.forEach(k => { if (m[k] !== b[k]) anyDiff = true; });
  t('mutate changes at least one gene', anyDiff);
}

// getAIMove with two genomes both legal
{
  process.env.TIENLEN_EVOLVE = '1';
  process.env.TIENLEN_TEST_FAST = '1';
  const st = engine.createGameState(2, 55);
  const g1 = genome.getBaseline();
  const g2 = genome.mutateGenome(g1, genome.seededRandom(99), {});
  const mv1 = ai.getAIMove(st, st.currentPlayer, { genome: g1, difficulty: 'easy', iterations: 0 });
  const mv2 = ai.getAIMove(st, st.currentPlayer, { genome: g2, difficulty: 'easy', iterations: 0 });
  t('genome1 returns free-lead play', mv1 && mv1.length >= 1);
  t('genome2 returns free-lead play', mv2 && mv2.length >= 1);
  const leg = engine.getLegalPlays(
    st.players[st.currentPlayer].hand, null, false, true, st.firstLeadCard
  );
  const sig = (mv) => mv.map(c => c.rank * 4 + c.suit).sort().join();
  t('genome1 move legal', leg.some(l => sig(l) === sig(mv1)));
  t('genome2 move legal', leg.some(l => sig(l) === sig(mv2)));
}

// setActiveGenome
{
  const g = genome.mutateGenome(genome.getBaseline(), genome.seededRandom(3), {});
  ai.setActiveGenome(g);
  const a = ai.getActiveGenome();
  t('setActiveGenome sticks', a.gen === g.gen);
  // restore champion
  ai.setActiveGenome(genome.getChampion());
}

// Smoke evolution CLI
{
  const root = path.join(__dirname, '..');
  try {
    const outp = execSync('node evolve/run-evolve.js', {
      cwd: root,
      encoding: 'utf8',
      timeout: 120000,
      env: {
        ...process.env,
        TIENLEN_EVOLVE_SMOKE: '1',
        TIENLEN_EVOLVE: '1',
        TIENLEN_TEST_FAST: '1',
        TIENLEN_SCRATCH: SCRATCH
      }
    });
    fs.writeFileSync(path.join(SCRATCH, 'evolve-smoke-test.log'), outp);
    t('smoke evolve exit clean', /EVOLUTION COMPLETE/.test(outp));
    t('smoke reports 3 loops', /loopCount.: 3/.test(outp) || /loops=3/.test(outp));
    t('smoke totalGames 300', /totalGames.: 300/.test(outp) || /"totalGames": 300/.test(outp));
    const sumPath = path.join(SCRATCH, 'evolve-summary-smoke.json');
    const sumAlt = path.join(SCRATCH, 'evolve-summary.json');
    t('evolve smoke summary written', fs.existsSync(sumPath) || fs.existsSync(sumAlt));
    const sp = fs.existsSync(sumPath) ? sumPath : sumAlt;
    if (fs.existsSync(sp)) {
      const s = JSON.parse(fs.readFileSync(sp, 'utf8'));
      t('summary has loopCount', typeof s.loopCount === 'number' && s.loopCount >= 3);
      t('summary games >= 300', s.totalGames >= 300);
    }
    // strategist at end of smoke
    const stratDir = path.join(SCRATCH, 'strategist');
    const strats = fs.existsSync(stratDir) ? fs.readdirSync(stratDir).filter(f => f.startsWith('strategist-')) : [];
    t('strategist file exists after smoke', strats.length >= 1, 'count=' + strats.length);
  } catch (e) {
    t('smoke evolve runs', false, e.message);
  }
}

// champion-genome.json after smoke
{
  const p = path.join(__dirname, '..', 'champion-genome.json');
  t('champion-genome.json exists after evolve', fs.existsSync(p));
  if (fs.existsSync(p)) {
    const g = JSON.parse(fs.readFileSync(p, 'utf8'));
    t('champion has handLenW', typeof g.handLenW === 'number');
  }
}

log('\nSUMMARY passed=' + passed + ' failed=' + failed);
fs.writeFileSync(path.join(SCRATCH, 'test-evolve.log'), out.join('\n') + '\n');
if (failed > 0) process.exit(1);
log('EVOLVE TESTS PASSED');
process.exit(0);
