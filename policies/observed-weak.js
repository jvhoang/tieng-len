/**
 * Observed-weak policy — encodes the failure modes users report against the
 * pre-fix "grandmaster" (free-lead singles, chronic pass vs high/2s, pair breaks).
 * Used as a regression baseline for strength gates (not shipped to the browser).
 */
'use strict';

const engine = require('../engine.js');

function getAIMove(state, myIdx) {
  const hand = state.players[myIdx].hand;
  const cur = state.currentCombo;
  const leg = engine.getLegalPlays(
    hand, cur, state.players[myIdx].passed, state.isFirstLead, state.firstLeadCard
  );
  if (!leg.length) return null;

  // Free lead: singles only (low first) — classic reported bug
  if (!cur) {
    const singles = leg.filter(function (p) {
      return p.length === 1 && p[0].rank < 12;
    });
    if (singles.length) {
      singles.sort(function (a, b) {
        return a[0].rank - b[0].rank || a[0].suit - b[0].suit;
      });
      return singles[0];
    }
    // fall back: any single, else shortest
    const anyS = leg.filter(function (p) { return p.length === 1; });
    if (anyS.length) return anyS[0];
    return leg.slice().sort(function (a, b) { return a.length - b.length; })[0];
  }

  // Combat: cheapest non-2 non-bomb only; else PASS (chronic fold to highs)
  const cheap = leg.filter(function (pl) {
    if (pl.some(function (c) { return c.rank === 12; })) return false;
    const com = engine.detectCombo(pl);
    if (!com) return false;
    if (com.type === 'quad') return false;
    if (com.type === 'doubleseq' && com.numPairs >= 3) return false;
    return true;
  });
  if (cheap.length) {
    // Prefer breaking structure: pick single from a pair if possible (bad)
    cheap.sort(function (a, b) {
      const ca = engine.detectCombo(a);
      const cb = engine.detectCombo(b);
      // prefer singles (structure break)
      if (a.length !== b.length) return a.length - b.length;
      return ca.top.rank - cb.top.rank;
    });
    // Over-pass: even with a cheap beat, sometimes fold (user-reported chronic pass)
    // Deterministic from hand size so games are reproducible
    var h = hand.length;
    // Chronic over-pass ~40% of cheap beats when hand still deep
    if (h > 5 && ((h * 3 + (cur.top ? cur.top.rank : 0) * 5 + myIdx) % 5) < 2) {
      return null;
    }
    return cheap[0];
  }
  return null; // pass all expensive
}

module.exports = { getAIMove: getAIMove, name: 'observed-weak' };
