/**
 * Tiến Lên Controller — pure integration layer (zero DOM)
 * Owns human/AI/live flow, seat switching, strict turn enforcement, broadcast.
 * UI (index.html) and tests drive ONLY this module for game actions.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./engine.js'), require('./ai.js'));
  } else {
    root.TienLenController = factory(root.TienLenEngine, root.TienLenAI);
  }
}(typeof self !== 'undefined' ? self : this, function (engine, aiMod) {

  function cloneState(s) { return JSON.parse(JSON.stringify(s)); }

  function createController(opts = {}) {
    const numPlayers = opts.numPlayers || 4;
    let vsAI = opts.vsAI !== false;
    let humanSeats = Array.isArray(opts.humanSeats) ? opts.humanSeats.slice() : [0];
    let currentHumanSeat = (typeof opts.currentHumanSeat === 'number') ? opts.currentHumanSeat : (humanSeats[0] || 0);
    let state = engine.createGameState(numPlayers, opts.seed || Date.now());
    state.isFirstLead = true;

    function getState() { return cloneState(state); }

    function setMode(m = {}) {
      if (typeof m.vsAI === 'boolean') vsAI = m.vsAI;
      if (Array.isArray(m.humanSeats)) humanSeats = m.humanSeats.slice();
      if (typeof m.currentHumanSeat === 'number') currentHumanSeat = m.currentHumanSeat;
    }

    function getLegalFor(seat) {
      if (!state || state.roundOver) return [];
      const p = state.players[seat];
      if (!p || p.finished) return [];
      return engine.getLegalPlays(p.hand, state.currentCombo, p.passed, state.isFirstLead, state.firstLeadCard);
    }

    function isValidSelection(seat, cards) {
      if (!cards || !cards.length || !state) return false;
      const p = state.players[seat];
      if (!p || p.finished) return false;
      const com = engine.detectCombo(cards);
      if (!com) return false;
      const legals = getLegalFor(seat);
      const sig = cards.map(c => c.rank * 4 + c.suit).sort((a,b)=>a-b).join(',');
      return legals.some(l => l.map(c => c.rank * 4 + c.suit).sort((a,b)=>a-b).join(',') === sig);
    }

    function playHuman(seat, cards) {
      if (state.roundOver) return { ok: false, error: 'round over' };
      if (seat !== state.currentPlayer) return { ok: false, error: 'not your turn' };
      const p = state.players[seat];
      if (!p || p.finished || p.passed) return { ok: false, error: 'cannot play' };
      if (!isValidSelection(seat, cards)) return { ok: false, error: 'illegal selection' };

      const before = cloneState(state);
      state = engine.applyPlay(state, seat, cards);
      state.isFirstLead = false;
      const payload = { type: 'play', seat, cards };
      return { ok: true, state: getState(), before, payload };
    }

    function passHuman(seat) {
      if (state.roundOver) return { ok: false, error: 'round over' };
      if (seat !== state.currentPlayer) return { ok: false, error: 'not your turn' };
      const p = state.players[seat];
      if (!p || p.finished) return { ok: false, error: 'cannot pass' };
      const before = cloneState(state);
      state = engine.pass(state, seat);
      state.isFirstLead = false;
      const payload = { type: 'pass', seat };
      return { ok: true, state: getState(), before, payload };
    }

    function switchSeat(seat) {
      if (seat < 0 || seat >= state.numPlayers) return { ok: false, error: 'bad seat' };
      currentHumanSeat = seat;
      return { ok: true, currentHumanSeat };
    }

    function runAITurnIfNeeded() {
      const results = [];
      if (state.roundOver) return results;
      while (!state.roundOver) {
        const cp = state.currentPlayer;
        const isHuman = humanSeats.includes(cp) || cp === currentHumanSeat;
        if (vsAI && !isHuman) {
          const legals = engine.getLegalPlays(state.players[cp].hand, state.currentCombo, state.players[cp].passed, state.isFirstLead, state.firstLeadCard);
          if (legals.length === 0) {
            state = engine.pass(state, cp);
          } else {
            const choice = (aiMod && aiMod.getAIMove) ? aiMod.getAIMove(state, cp, {difficulty: 'hard'}) : legals[0];
            state = engine.applyPlay(state, cp, choice);
          }
          state.isFirstLead = false;
          results.push({ type: 'ai', seat: cp });
        } else {
          break;
        }
      }
      return results;
    }

    function newRound() {
      state = engine.createGameState(state.numPlayers, Date.now() + Math.random() * 1000);
      state.isFirstLead = true;
      return getState();
    }

    function getBroadcastPayload(extra) {
      return { type: 'sync', state: getState(), extra: extra || null };
    }

    function afterHumanAction() {
      if (state.roundOver) return [];
      return runAITurnIfNeeded();
    }

    return {
      getState,
      setMode,
      getLegalFor,
      isValidSelection,
      playHuman,
      passHuman,
      switchSeat,
      runAITurnIfNeeded,
      newRound,
      getBroadcastPayload,
      afterHumanAction,
      _getInternals: () => ({ vsAI, humanSeats, currentHumanSeat })
    };
  }

  return { createController };
}));
