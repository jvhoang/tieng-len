/**
 * genome.js — Serializable AI policy parameters for self-play evolution.
 * Pure data + mutators. No DOM. Browser + Node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TienLenGenome = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  /** Generation-0 baseline (matches pre-evolution heuristic intent). */
  const BASELINE_GENOME = {
    // evaluatePosition
    handLenW: 18,
    pairB: 2.5,
    tripB: 4,
    quadB: 8,
    seqB: 3,
    twoHold: 6,
    isoHighPen: 1.2,
    freeLeadB: 8,
    leaderB: 4,
    threat1: 35,
    threat2: 18,
    threat3: 8,
    threat5: 2,
    fewerCardsB: 1.5,
    oneCardFreeB: 80,
    // scorePlay lead
    multiLeadB: 4,
    shedLenB: 2.5,
    topLeadCost: 0.5,
    twoLeadMid: 40,
    twoLeadLate: 8,
    singleHighPen: 6,
    singleTwoLeadPen: 25,
    lowMultiB: 5,
    // scorePlay beat
    afterLenCost: 1.2,
    beatTopCost: 0.9,
    beatLenCost: 0.1,
    twoBeatPen: 30,
    bombBeatPen: 50,
    bombVs2B: 20,
    // endgame
    endgameShed: 2,
    endgameTwoUse: 12,
    shortHandB: 5,
    // pass policy (expensive-only)
    passHandMin: 4,
    passOppMin: 2,
    passMargin: 0.08,
    // ranking
    winProbEdge: 0.02,
    // meta
    gen: 0,
    id: 'baseline-g0'
  };

  /** Evolved champion — loaded from champion-genome.json when present (Node), else baseline. */
  let CHAMPION_GENOME = Object.assign({}, BASELINE_GENOME, {
    id: 'champion-pending',
    gen: 0
  });

  // Node: try load baked champion from repo root
  if (typeof require === 'function' && typeof __dirname !== 'undefined') {
    try {
      const fs = require('fs');
      const path = require('path');
      const candidates = [
        path.join(__dirname, 'champion-genome.json'),
        path.join(__dirname, 'evolve', 'champion-baked.json')
      ];
      for (let i = 0; i < candidates.length; i++) {
        if (fs.existsSync(candidates[i])) {
          const raw = JSON.parse(fs.readFileSync(candidates[i], 'utf8'));
          CHAMPION_GENOME = Object.assign({}, BASELINE_GENOME, raw);
          break;
        }
      }
    } catch (e) { /* keep baseline */ }
  }

  function cloneGenome(g) {
    return Object.assign({}, g || BASELINE_GENOME);
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  const GENE_BOUNDS = {
    handLenW: [8, 40],
    pairB: [0.5, 8],
    tripB: [1, 12],
    quadB: [2, 20],
    seqB: [0.5, 10],
    twoHold: [1, 20],
    isoHighPen: [0, 5],
    freeLeadB: [0, 20],
    leaderB: [0, 12],
    threat1: [10, 80],
    threat2: [5, 50],
    threat3: [2, 30],
    threat5: [0, 10],
    fewerCardsB: [0, 5],
    oneCardFreeB: [20, 150],
    multiLeadB: [1, 12],
    shedLenB: [0.5, 8],
    topLeadCost: [0.1, 2],
    twoLeadMid: [10, 80],
    twoLeadLate: [2, 30],
    singleHighPen: [0, 20],
    singleTwoLeadPen: [5, 50],
    lowMultiB: [0, 15],
    afterLenCost: [0.3, 4],
    beatTopCost: [0.2, 2.5],
    beatLenCost: [0, 1],
    twoBeatPen: [5, 70],
    bombBeatPen: [10, 100],
    bombVs2B: [5, 50],
    endgameShed: [0.5, 8],
    endgameTwoUse: [2, 30],
    shortHandB: [0, 15],
    passHandMin: [2, 8],
    passOppMin: [1, 4],
    passMargin: [0.01, 0.25],
    winProbEdge: [0.005, 0.08]
  };

  const GENE_KEYS = Object.keys(GENE_BOUNDS);

  function normalizeGenome(g) {
    const out = cloneGenome(g);
    GENE_KEYS.forEach(k => {
      const [lo, hi] = GENE_BOUNDS[k];
      let v = out[k];
      if (typeof v !== 'number' || !isFinite(v)) v = BASELINE_GENOME[k];
      // integer genes
      if (k === 'passHandMin' || k === 'passOppMin' || k === 'gen') {
        out[k] = Math.round(clamp(v, lo, hi));
      } else {
        out[k] = clamp(v, lo, hi);
      }
    });
    return out;
  }

  /**
   * Mutate genome. focusAxes: optional list of gene keys to prefer (from strategist).
   * directives: { preferAxes: string[], avoidAxes: string[], scale: number }
   */
  function mutateGenome(parent, rng, directives) {
    const g = normalizeGenome(parent);
    const rand = rng || Math.random;
    const scale = (directives && directives.scale) || 1;
    const prefer = (directives && directives.preferAxes) || [];
    const avoid = (directives && directives.avoidAxes) || [];

    // Number of genes to touch: 1–5
    const nTouch = 1 + Math.floor(rand() * 5);
    const weights = GENE_KEYS.map(k => {
      if (prefer.indexOf(k) >= 0) return 3 * scale;
      if (avoid.indexOf(k) >= 0) return 0.25;
      return 1;
    });
    const picked = [];
    for (let t = 0; t < nTouch; t++) {
      let sum = 0;
      for (let i = 0; i < weights.length; i++) {
        if (picked.indexOf(GENE_KEYS[i]) >= 0) continue;
        sum += weights[i];
      }
      if (sum <= 0) break;
      let r = rand() * sum;
      for (let i = 0; i < GENE_KEYS.length; i++) {
        if (picked.indexOf(GENE_KEYS[i]) >= 0) continue;
        r -= weights[i];
        if (r <= 0) {
          picked.push(GENE_KEYS[i]);
          break;
        }
      }
    }

    const mutations = [];
    picked.forEach(k => {
      const [lo, hi] = GENE_BOUNDS[k];
      const old = g[k];
      // multiplicative or additive noise
      const mode = rand();
      let next;
      if (mode < 0.5) {
        const factor = 0.75 + rand() * 0.5; // 0.75–1.25
        next = old * factor;
      } else if (mode < 0.85) {
        const span = (hi - lo) * (0.05 + rand() * 0.15);
        next = old + (rand() * 2 - 1) * span;
      } else {
        // jump toward opposite of current relative position
        next = lo + rand() * (hi - lo);
      }
      if (k === 'passHandMin' || k === 'passOppMin') next = Math.round(next);
      g[k] = clamp(next, lo, hi);
      mutations.push({ gene: k, from: old, to: g[k] });
    });

    g.gen = (parent.gen || 0) + 1;
    g.id = 'mut-g' + g.gen + '-' + Math.floor(rand() * 1e9).toString(36);
    g._mutations = mutations;
    return normalizeGenome(g);
  }

  /** Seeded RNG for reproducible evolution. */
  function seededRandom(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function setChampion(g) {
    CHAMPION_GENOME = normalizeGenome(g);
    CHAMPION_GENOME.id = CHAMPION_GENOME.id || 'champion';
    return cloneGenome(CHAMPION_GENOME);
  }

  function getChampion() {
    return cloneGenome(CHAMPION_GENOME);
  }

  function getBaseline() {
    return cloneGenome(BASELINE_GENOME);
  }

  return {
    BASELINE_GENOME,
    GENE_KEYS,
    GENE_BOUNDS,
    cloneGenome,
    normalizeGenome,
    mutateGenome,
    seededRandom,
    setChampion,
    getChampion,
    getBaseline
  };
}));
