/**
 * Tiến Lên Controller — pure integration layer (zero DOM)
 * Owns human/AI/live flow, seat switching, strict turn enforcement, broadcast.
 * UI and tests drive ONLY this module for game actions.
 */
(function (root, factory) {
  // Browser-first: never take module.exports path when window exists (Safari/iOS stubs).
  if (typeof window !== 'undefined') {
    root.TienLenController = factory(
      root.TienLenEngine,
      root.TienLenAI,
      root.TienLenPlayLog
    );
    if (typeof module === 'object' && module.exports) {
      try { module.exports = root.TienLenController; } catch (_) {}
    }
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./engine.js'),
      require('./ai.js'),
      (function () { try { return require('./play-log.js'); } catch (e) { return null; } })()
    );
  } else {
    root.TienLenController = factory(root.TienLenEngine, root.TienLenAI, root.TienLenPlayLog);
  }
}(typeof self !== 'undefined' ? self : this, function (engine, aiMod, playLogMod) {

  function cloneState(s) {
    return JSON.parse(JSON.stringify(s));
  }

  /**
   * createController({ vsAI, numPlayers, humanSeats, seed, playLog, mode, siteBuild })
   * Returns an object with the public API the buttons and tests use.
   */
  function createController(opts = {}) {
    let numPlayers = opts.numPlayers || 4;
    let vsAI = opts.vsAI !== false; // default true
    let aiDifficulty = opts.aiDifficulty || 'grandmaster'; // easy | medium | hard | grandmaster
    let humanSeats = Array.isArray(opts.humanSeats) ? opts.humanSeats.slice() : [0];
    let currentHumanSeat = (typeof opts.currentHumanSeat === 'number')
      ? opts.currentHumanSeat
      : (humanSeats[0] || 0);
    let playMode = opts.mode || (vsAI ? 'vsAI' : 'hotseat');
    let siteBuild = opts.siteBuild || null;
    let state = engine.createGameState(numPlayers, opts.seed != null ? opts.seed : Date.now());
    state.isFirstLead = true;

    // Play log (analysis-grade). Can inject store for tests.
    let playLog = opts.playLog || null;
    if (!playLog && playLogMod) {
      try {
        playLog = opts.playLogStore
          ? playLogMod.createPlayLog({ storage: opts.playLogStore })
          : (typeof playLogMod.getDefault === 'function' ? playLogMod.getDefault() : playLogMod.createPlayLog());
      } catch (ePl) { playLog = null; }
    }
    let loggingEnabled = opts.logging !== false && !!playLog;
    let humanTurnStartedAt = Date.now();

    function getAIBuild() {
      try {
        const live = (typeof window !== 'undefined' && window.TienLenAI) ? window.TienLenAI : aiMod;
        return (live && live.AI_BUILD) ? live.AI_BUILD : null;
      } catch (e) { return null; }
    }

    function startPlayLog(reason) {
      if (!loggingEnabled || !playLog || typeof playLog.startGame !== 'function') return;
      try {
        playLog.startGame(state, {
          mode: playMode,
          vsAI: vsAI,
          numPlayers: numPlayers,
          humanSeats: humanSeats.slice(),
          aiDifficulty: aiDifficulty,
          aiBuild: getAIBuild(),
          seed: state.seed,
          siteBuild: siteBuild,
          tags: reason ? [reason] : []
        });
        humanTurnStartedAt = Date.now();
      } catch (eStart) {
        try { console.warn('[TiengLen] play-log start failed', eStart); } catch (_) {}
      }
    }

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
      if (typeof m.aiDifficulty === 'string') aiDifficulty = m.aiDifficulty;
      if (typeof m.mode === 'string') playMode = m.mode;
      if (typeof m.siteBuild === 'string') siteBuild = m.siteBuild;
      if (typeof m.logging === 'boolean') loggingEnabled = m.logging && !!playLog;
    }

    function setAIDifficulty(d) {
      if (d === 'easy' || d === 'medium' || d === 'hard' || d === 'grandmaster') {
        aiDifficulty = d;
      }
      return aiDifficulty;
    }

    function getAIDifficulty() {
      return aiDifficulty;
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
      if (typeof m.aiDifficulty === 'string') aiDifficulty = m.aiDifficulty;
      if (typeof m.mode === 'string') playMode = m.mode;
      else playMode = vsAI ? 'vsAI' : 'hotseat';
      if (typeof m.siteBuild === 'string') siteBuild = m.siteBuild;
      if (typeof m.logging === 'boolean') loggingEnabled = m.logging && !!playLog;
      const seed = m.seed != null ? m.seed : (Date.now() + Math.floor(Math.random() * 1000));
      state = engine.createGameState(numPlayers, seed);
      state.isFirstLead = true;
      startPlayLog('reconfigure');
      humanTurnStartedAt = Date.now();
      notify({ type: 'reconfigure', numPlayers, vsAI, aiDifficulty });
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
      const legals = getLegalFor(seat);
      const thinkMs = Date.now() - humanTurnStartedAt;
      const combo = engine.detectCombo(cards);
      state = engine.applyPlay(state, seat, cards);
      state.isFirstLead = false;

      if (loggingEnabled && playLog) {
        try {
          playLog.logAction({
            type: 'play',
            seat: seat,
            actor: isHumanSeat(seat) ? 'human' : 'remote',
            cards: cards,
            combo: combo,
            beforeState: before,
            afterState: state,
            legals: legals,
            humanThinkMs: thinkMs
          });
        } catch (eLog) { /* never break play */ }
      }

      const payload = { type: 'play', seat, cards: JSON.parse(JSON.stringify(cards)) };
      notify(payload);
      humanTurnStartedAt = Date.now();
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
      const legals = getLegalFor(seat);
      const thinkMs = Date.now() - humanTurnStartedAt;
      state = engine.pass(state, seat);
      state.isFirstLead = false;

      if (loggingEnabled && playLog) {
        try {
          playLog.logAction({
            type: 'pass',
            seat: seat,
            actor: isHumanSeat(seat) ? 'human' : 'remote',
            cards: null,
            combo: null,
            beforeState: before,
            afterState: state,
            legals: legals,
            humanThinkMs: thinkMs
          });
        } catch (eLog) { /* never break play */ }
      }

      const payload = { type: 'pass', seat };
      notify(payload);
      humanTurnStartedAt = Date.now();
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
        const beforeAI = cloneState(state);
        let aiMeta = { thinkMs: 0, stats: null, fallbackUsed: false, error: null };
        if (legals.length === 0) {
          state = engine.pass(state, cp);
          action = { type: 'pass', seat: cp };
          if (loggingEnabled && playLog) {
            try {
              playLog.logAction({
                type: 'pass', seat: cp, actor: 'ai', cards: null, combo: null,
                beforeState: beforeAI, afterState: state, legals: legals,
                ai: Object.assign({}, aiMeta, { reason: 'no-legals' })
              });
            } catch (eL) { /* ignore */ }
          }
        } else {
          let choice = null;
          const tThink0 = Date.now();
          try {
            // Prefer live global AI in browser (always freshest module)
            // Re-resolve every turn — ai.js may bind after controller factory captured aiMod.
            const liveAI = (typeof window !== 'undefined' && window.TienLenAI)
              ? window.TienLenAI
              : aiMod;
            if (liveAI && typeof liveAI.getAIMove === 'function') {
              if (liveAI.AI_BUILD) {
                try { aiMeta.build = liveAI.AI_BUILD; } catch (_) {}
              }
              // Superhuman goal fair path: rated GM uses HIDDEN info (no perfectInfo peek).
              // Opt-in perfectInfo only via opts.allowPerfectInfo / env TIENLEN_PERFECT_AI=1.
              //
              // IMPORTANT: Do NOT force mode:'expert'+iterations:0 for product GM.
              // That path never runs search/BR, so the AI opponent diverges from Hint
              // (which uses getAIMove with search) and rarely spends 2s for control.
              // Align opponent with the same hidden search/BR path as hints + duals.
              const allowPerfect = (typeof process !== 'undefined' && process.env && process.env.TIENLEN_PERFECT_AI === '1') ||
                (opts && opts.allowPerfectInfo === true);
              const usePerfect = allowPerfect && state.players.length === 2 &&
                (aiDifficulty === 'hard' || aiDifficulty === 'grandmaster');
              const isGM = aiDifficulty === 'grandmaster';
              const isHard = aiDifficulty === 'hard';
              // Seed for determinize/BR reproducibility; Hint uses the same opts shape
              // (buildProductAiOpts in index.html) so paths stay aligned.
              const thinkSeed = ((Date.now() ^ (Math.random() * 1e9)) >>> 0) || 1;
              try { window.__TIENLEN_LAST_AI_SEED = thinkSeed; } catch (_) {}
              choice = liveAI.getAIMove(state, cp, {
                difficulty: aiDifficulty,
                perfectInfo: usePerfect,
                hiddenInfo: !usePerfect,
                useSearch: true,
                // Browser time budgets (hidden BR is heavier than pure expert leaf)
                timeMs: usePerfect
                  ? (isGM ? 900 : 500)
                  : (isGM ? 700 : (isHard ? 500 : 350)),
                bestResponse: isGM || isHard || usePerfect,
                seed: thinkSeed
              });
              // Empty array is not a legal play (treat as null → free-lead guarantee path)
              if (choice && !choice.length) choice = null;
              if (liveAI.getLastSearchStats) {
                try { aiMeta.stats = liveAI.getLastSearchStats(); } catch (_) {}
              }
            } else {
              aiMeta.error = 'TienLenAI.getAIMove missing (script bind failed)';
            }
          } catch (err) {
            // Never silently turn errors into pass-only — fall through to legal play
            choice = null;
            aiMeta.error = String(err && err.message || err);
            try { console.warn('[TiengLen] AI error, falling back to legal play', err); } catch (_) {}
          }
          aiMeta.thinkMs = Date.now() - tThink0;

          // Free-lead fallback: never use legals[0] raw (singles listed first).
          // Prefer multi, else lowest non-2 single (trash-shed).
          function freeLeadFallback(list) {
            // Prefer search hard free-lead when available (no-gift + multi bias)
            try {
              const S = (typeof window !== 'undefined' && window.TienLenSearch)
                ? window.TienLenSearch
                : (typeof require === 'function' ? require('./search.js') : null);
              if (S && S.pickFreeLeadHard) {
                const hard = S.pickFreeLeadHard(list, state, cp);
                if (hard && hard.length) return hard;
              }
            } catch (_) { /* ignore */ }
            const multi = list.filter(function (pl) {
              if (pl.length < 2) return false;
              const hasTwo = pl.some(function (c) { return c.rank === 12; });
              const com = engine.detectCombo(pl);
              const bomb = com && (com.type === 'quad' || (com.type === 'doubleseq' && com.numPairs >= 3));
              return !hasTwo && !bomb;
            });
            if (multi.length) {
              multi.sort(function (a, b) {
                const ca = engine.detectCombo(a), cb = engine.detectCombo(b);
                const ta = ca && ca.top ? ca.top.rank : 99;
                const tb = cb && cb.top ? cb.top.rank : 99;
                return ta - tb || a.length - b.length;
              });
              return multi[0];
            }
            // No-gift: if any opp has 1 card, prefer high singles
            const oneCardOpp = state.players.some(function (p, i) {
              return i !== cp && !p.finished && p.hand.length === 1;
            });
            let singles = list.filter(function (pl) {
              return pl.length === 1 && pl[0].rank < 12;
            });
            if (oneCardOpp) {
              const highs = singles.filter(function (pl) { return pl[0].rank >= 10; });
              if (highs.length) singles = highs;
              else {
                const twos = list.filter(function (pl) {
                  return pl.length === 1 && pl[0].rank === 12;
                });
                if (twos.length) return twos[0];
              }
            }
            if (singles.length) {
              singles.sort(function (a, b) {
                if (oneCardOpp) return b[0].rank - a[0].rank || b[0].suit - a[0].suit;
                return a[0].rank - b[0].rank || a[0].suit - b[0].suit;
              });
              return singles[0];
            }
            return list[0];
          }

          // SAFETY: free lead must always play when legals exist (product kill-point).
          // Healthy getAIMove already guarantees this; this is last-resort if AI missing.
          if (choice == null && !state.currentCombo) {
            choice = freeLeadFallback(legals);
            aiMeta.fallbackUsed = true;
            aiMeta.fallbackReason = 'null-free-lead';
            if (!aiMeta.stats) {
              aiMeta.stats = { mode: 'controller-free-lead-fallback', freeLeadGuaranteed: true };
            }
          }

          // SAFETY: cheap-force ONLY when AI hard-errored or never produced a decision
          // record. Intentional GM/BR pass MUST set stats (ai.js stampSearchStats) so
          // !stats alone is rare. Do NOT force when stats.intentionalPass / BR modes.
          // Kill-point (DEEP-DIVE §2c): forcing min-beat over intentional PASS destroys
          // gold pass plans (0501/0510/0547/0550) and structure-preserving play.
          var statsOk = aiMeta.stats && !aiMeta.stats.error;
          var intentionalPass = !!(aiMeta.stats && (
            aiMeta.stats.intentionalPass ||
            aiMeta.stats.mode === 'best-response' ||
            aiMeta.stats.mode === 'best-response-det' ||
            aiMeta.stats.mode === 'exact-endgame' ||
            aiMeta.stats.mode === 'endgame' ||
            aiMeta.stats.mode === 'expert' ||
            aiMeta.stats.mode === 'fallback-pass' ||
            aiMeta.stats.mode === 'heuristic-pass' ||
            aiMeta.stats.planPass
          ));
          if (choice == null && state.currentCombo && !intentionalPass &&
              (aiMeta.error || !statsOk)) {
            const cheap = legals.filter(function (pl) {
              const hasTwo = pl.some(function (c) { return c.rank === 12; });
              const com = engine.detectCombo(pl);
              const bomb = com && (com.type === 'quad' || (com.type === 'doubleseq' && com.numPairs >= 3));
              return !hasTwo && !bomb;
            });
            if (cheap.length > 0) {
              cheap.sort(function (a, b) {
                const ca = engine.detectCombo(a), cb = engine.detectCombo(b);
                const ta = ca && ca.top ? ca.top.rank : 99;
                const tb = cb && cb.top ? cb.top.rank : 99;
                return ta - tb || a.length - b.length;
              });
              choice = cheap[0];
              aiMeta.fallbackUsed = true;
              aiMeta.fallbackReason = 'cheap-force-error-only';
            }
          }

          // null from AI = strategic pass only when no cheap beat and there is a combo
          if (choice == null) {
            if (state.currentCombo) {
              state = engine.pass(state, cp);
              action = { type: 'pass', seat: cp };
            } else {
              choice = freeLeadFallback(legals);
              aiMeta.fallbackUsed = true;
              aiMeta.fallbackReason = 'forced-free-lead';
              state = engine.applyPlay(state, cp, choice);
              action = { type: 'play', seat: cp, cards: choice };
            }
          } else {
            // Validate AI choice is legal
            const sig = choice.map(c => c.rank * 4 + c.suit).sort((a, b) => a - b).join(',');
            let ok = legals.some(l => l.map(c => c.rank * 4 + c.suit).sort((a, b) => a - b).join(',') === sig);
            // Free lead: reject illegal; reject gift low single if any opp has 1 card
            if (!state.currentCombo && choice && choice.length === 1) {
              const oneCardOpp = state.players.some(function (p, i) {
                return i !== cp && !p.finished && p.hand.length === 1;
              });
              if (oneCardOpp && choice[0].rank < 10) ok = false;
              // reject early high (K/A/2) singles if multi exists
              if (choice[0].rank >= 10) {
                const multiExists = legals.some(function (pl) {
                  if (pl.length < 2) return false;
                  return !pl.some(function (c) { return c.rank === 12; });
                });
                if (multiExists && state.players[cp].hand.length > 5) ok = false;
              }
            }
            if (!ok) {
              choice = state.currentCombo ? legals[0] : freeLeadFallback(legals);
              aiMeta.fallbackUsed = true;
              aiMeta.fallbackReason = 'illegal-or-guard';
            }
            state = engine.applyPlay(state, cp, choice);
            action = { type: 'play', seat: cp, cards: choice };
          }

          if (loggingEnabled && playLog) {
            try {
              const playedCards = action.type === 'play' ? action.cards : null;
              playLog.logAction({
                type: action.type,
                seat: cp,
                actor: 'ai',
                cards: playedCards,
                combo: playedCards ? engine.detectCombo(playedCards) : null,
                beforeState: beforeAI,
                afterState: state,
                legals: legals,
                ai: Object.assign({}, aiMeta, {
                  choice: playedCards,
                  difficulty: aiDifficulty
                })
              });
            } catch (eLogAi) { /* ignore */ }
          }
        }
        state.isFirstLead = false;
        results.push(action);
        notify(action);
        if (state.roundOver) break;
      }
      humanTurnStartedAt = Date.now();
      return results;
    }

    function newRound() {
      state = engine.createGameState(state.numPlayers, Date.now() + Math.floor(Math.random() * 1000));
      state.isFirstLead = true;
      startPlayLog('newRound');
      humanTurnStartedAt = Date.now();
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

    // Title-screen bootstrap omits seed/beginGame → no log. Real games pass seed.
    if (opts.seed != null || opts.beginGame === true) {
      startPlayLog(opts.beginGame ? 'begin' : 'create');
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
      setAIDifficulty,
      getAIDifficulty,
      isHumanSeat: (s) => isHumanSeat(s),
      getPlayLog: () => playLog,
      // for tests/debug
      _getInternals: () => ({
        vsAI, humanSeats: humanSeats.slice(), currentHumanSeat, numPlayers, aiDifficulty,
        playMode, loggingEnabled
      })
    };
  }

  return { createController };
}));
