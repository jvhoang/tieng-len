/**
 * Tiến Lên Controller — pure integration layer (zero DOM)
 * Owns human/AI/live flow, seat switching, strict turn enforcement, broadcast.
 * UI and tests drive ONLY this module for game actions.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./engine.js'), require('./ai.js'));
  } else {
    root.TienLenController = factory(root.TienLenEngine, root.TienLenAI);
  }
}(typeof self !== 'undefined' ? self : this, function (engine, aiMod) {

  function cloneState(s) {
    return JSON.parse(JSON.stringify(s));
  }

  /**
   * createController({ vsAI, numPlayers, humanSeats, seed })
   * Returns an object with the public API the buttons and tests use.
   */
  function createController(opts = {}) {
    let numPlayers = opts.numPlayers || 4;
    let vsAI = opts.vsAI !== false; // default true
    let humanSeats = Array.isArray(opts.humanSeats) ? opts.humanSeats.slice() : [0];
    let currentHumanSeat = (typeof opts.currentHumanSeat === 'number')
      ? opts.currentHumanSeat
      : (humanSeats[0] || 0);
    let state = engine.createGameState(numPlayers, opts.seed != null ? opts.seed : Date.now());
    state.isFirstLead = true;

    // Listeners for multiplayer / UI (state change hooks)
    const listeners = [];

    function notify(event) {
      for (const fn of listeners) {
        try { fn(event, getState()); } catch (_) {}
      }
    }

    function onChange(fn) {
      if (typeof fn === 'function') listeners.push(fn);
      return () => {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    }

    function getState() { return cloneState(state); }

    function setMode(m = {}) {
      if (typeof m.vsAI === 'boolean') vsAI = m.vsAI;
      if (Array.isArray(m.humanSeats)) humanSeats = m.humanSeats.slice();
      if (typeof m.currentHumanSeat === 'number') currentHumanSeat = m.currentHumanSeat;
      if (typeof m.numPlayers === 'number' && m.numPlayers >= 2 && m.numPlayers <= 4) {
        // Does not re-deal; use reconfigure for full restart
        numPlayers = m.numPlayers;
      }
    }

    /**
     * Fully recreate game with new player count / mode.
     * Critical: must not reuse a stale 4p instance when user picks 2 or 3.
     */
    function reconfigure(m = {}) {
      if (typeof m.vsAI === 'boolean') vsAI = m.vsAI;
      if (typeof m.numPlayers === 'number') numPlayers = m.numPlayers;
      if (Array.isArray(m.humanSeats)) humanSeats = m.humanSeats.slice();
      if (typeof m.currentHumanSeat === 'number') currentHumanSeat = m.currentHumanSeat;
      const seed = m.seed != null ? m.seed : (Date.now() + Math.floor(Math.random() * 1000));
      state = engine.createGameState(numPlayers, seed);
      state.isFirstLead = true;
      notify({ type: 'reconfigure', numPlayers, vsAI });
      return getState();
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
      const sig = cards.map(c => c.rank * 4 + c.suit).sort((a, b) => a - b).join(',');
      return legals.some(l => l.map(c => c.rank * 4 + c.suit).sort((a, b) => a - b).join(',') === sig);
    }

    function isHumanSeat(seat) {
      return humanSeats.includes(seat);
    }

    /**
     * playHuman(seat, cards) — only succeeds if seat is the current player.
     * Pass lockout is enforced by isValidSelection → getLegalPlays(hasPassed):
     * after passing, only bombs vs 2s remain legal (RULES.md), so those still play.
     */
    function playHuman(seat, cards) {
      if (state.roundOver) return { ok: false, error: 'round over' };
      if (seat !== state.currentPlayer) return { ok: false, error: 'not your turn' };
      const p = state.players[seat];
      if (!p || p.finished) return { ok: false, error: 'cannot play' };
      // Do NOT hard-reject p.passed: bombs vs 2s are legal after pass (engine encodes this).
      if (!isValidSelection(seat, cards)) {
        return {
          ok: false,
          error: p.passed ? 'cannot play (passed; only bombs vs 2s allowed)' : 'illegal selection'
        };
      }

      const before = cloneState(state);
      state = engine.applyPlay(state, seat, cards);
      state.isFirstLead = false;

      const payload = { type: 'play', seat, cards: JSON.parse(JSON.stringify(cards)) };
      notify(payload);
      return { ok: true, state: getState(), before, payload };
    }

    function passHuman(seat) {
      if (state.roundOver) return { ok: false, error: 'round over' };
      if (seat !== state.currentPlayer) return { ok: false, error: 'not your turn' };
      const p = state.players[seat];
      if (!p || p.finished) return { ok: false, error: 'cannot pass' };
      // Free lead: must play a combo, cannot pass the lead
      if (!state.currentCombo) return { ok: false, error: 'must lead a combination' };

      const before = cloneState(state);
      state = engine.pass(state, seat);
      state.isFirstLead = false;

      const payload = { type: 'pass', seat };
      notify(payload);
      return { ok: true, state: getState(), before, payload };
    }

    function switchSeat(seat) {
      if (seat < 0 || seat >= state.numPlayers) return { ok: false, error: 'bad seat' };
      currentHumanSeat = seat;
      if (!humanSeats.includes(seat)) humanSeats.push(seat);
      return { ok: true, currentHumanSeat };
    }

    /**
     * Apply a remote play/pass (host authority or guest applying host broadcast).
     * For multiplayer: host applies and broadcasts; guests call applyRemoteState.
     */
    function applyRemoteAction(action) {
      if (!action || state.roundOver) return { ok: false, error: 'invalid' };
      if (action.type === 'play' && action.cards) {
        return playHuman(action.seat, action.cards);
      }
      if (action.type === 'pass') {
        return passHuman(action.seat);
      }
      return { ok: false, error: 'unknown action' };
    }

    /** Replace full state (guest sync from host) */
    function applyRemoteState(remoteState) {
      if (!remoteState || !remoteState.players) return { ok: false };
      state = cloneState(remoteState);
      notify({ type: 'sync' });
      return { ok: true, state: getState() };
    }

    function runAITurnIfNeeded() {
      const results = [];
      if (state.roundOver) return results;
      if (!vsAI) return results;

      let guard = 0;
      while (!state.roundOver && guard < 48) {
        guard++;
        const cp = state.currentPlayer;
        if (isHumanSeat(cp)) break;

        const legals = engine.getLegalPlays(
          state.players[cp].hand,
          state.currentCombo,
          state.players[cp].passed,
          state.isFirstLead,
          state.firstLeadCard
        );

        let action;
        if (legals.length === 0) {
          state = engine.pass(state, cp);
          action = { type: 'pass', seat: cp };
        } else {
          let choice = null;
          try {
            // Prefer live global AI in browser (always freshest module)
            const liveAI = (typeof window !== 'undefined' && window.TienLenAI) ? window.TienLenAI : aiMod;
            if (liveAI && typeof liveAI.getAIMove === 'function') {
              choice = liveAI.getAIMove(state, cp, { difficulty: 'hard' });
            }
          } catch (err) {
            // Never silently turn errors into pass-only — fall through to legal play
            choice = null;
            try { console.warn('[TiengLen] AI error, falling back to legal play', err); } catch (_) {}
          }

          // SAFETY: free lead must play
          if (choice == null && !state.currentCombo) {
            choice = legals[0];
          }

          // SAFETY: if any cheap (non-2, non-bomb) legal exists, never pass
          if (choice == null && state.currentCombo) {
            const cheap = legals.filter(function (pl) {
              const hasTwo = pl.some(function (c) { return c.rank === 12; });
              const com = engine.detectCombo(pl);
              const bomb = com && (com.type === 'quad' || (com.type === 'doubleseq' && com.numPairs >= 3));
              return !hasTwo && !bomb;
            });
            if (cheap.length > 0) {
              // Prefer lowest-top cheap beat
              cheap.sort(function (a, b) {
                const ca = engine.detectCombo(a), cb = engine.detectCombo(b);
                const ta = ca && ca.top ? ca.top.rank : 99;
                const tb = cb && cb.top ? cb.top.rank : 99;
                return ta - tb || a.length - b.length;
              });
              choice = cheap[0];
            }
          }

          // null from AI = strategic pass only when no cheap beat and there is a combo
          if (choice == null) {
            if (state.currentCombo) {
              state = engine.pass(state, cp);
              action = { type: 'pass', seat: cp };
            } else {
              choice = legals[0];
              state = engine.applyPlay(state, cp, choice);
              action = { type: 'play', seat: cp, cards: choice };
            }
          } else {
            // Validate AI choice is legal
            const sig = choice.map(c => c.rank * 4 + c.suit).sort((a, b) => a - b).join(',');
            const ok = legals.some(l => l.map(c => c.rank * 4 + c.suit).sort((a, b) => a - b).join(',') === sig);
            if (!ok) choice = legals[0];
            state = engine.applyPlay(state, cp, choice);
            action = { type: 'play', seat: cp, cards: choice };
          }
        }
        state.isFirstLead = false;
        results.push(action);
        notify(action);
      }
      return results;
    }

    function newRound() {
      state = engine.createGameState(state.numPlayers, Date.now() + Math.floor(Math.random() * 1000));
      state.isFirstLead = true;
      // Clear finished/pass from previous round is handled by createGameState
      notify({ type: 'newRound' });
      return getState();
    }

    /**
     * newRoundAndResume: redeal then immediately run AI seats if they open.
     * Used by UI so "New Round" never freezes on computer's turn.
     */
    function newRoundAndResume() {
      newRound();
      if (vsAI) return runAITurnIfNeeded();
      return [];
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
      reconfigure,
      getLegalFor,
      isValidSelection,
      playHuman,
      passHuman,
      switchSeat,
      runAITurnIfNeeded,
      newRound,
      newRoundAndResume,
      getBroadcastPayload,
      afterHumanAction,
      applyRemoteAction,
      applyRemoteState,
      onChange,
      isHumanSeat: (s) => isHumanSeat(s),
      // for tests/debug
      _getInternals: () => ({ vsAI, humanSeats: humanSeats.slice(), currentHumanSeat, numPlayers })
    };
  }

  return { createController };
}));
