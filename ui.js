/**
 * ui.js
 * Extracted UI layer (UMD).
 * createUI({ document, engine, controller })
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.createUI = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  function createUI(opts = {}) {
    const doc = opts.document || (typeof document !== 'undefined' ? document : null);
    const engine = opts.engine || (typeof window !== 'undefined' ? window.TienLenEngine : null);
    let controller = opts.controller || null;

    if (!doc || !engine) {
      throw new Error('createUI requires document and engine');
    }

    let selectedCards = [];
    let vsAI = true;
    let numPlayers = 4;
    let humanSeats = [0];
    let currentHumanSeat = 0;
    let broadcastChannel = null;
    let bcName = 'tienglen-live';

    function getCurrentController() {
      if (controller && typeof controller.getState === 'function') return controller;
      if (typeof window !== 'undefined' && window.controller && typeof window.controller.getState === 'function') {
        controller = window.controller;
        return controller;
      }
      return null;
    }

    function getState() {
      const ctrl = getCurrentController();
      if (ctrl) return ctrl.getState();
      return (typeof window !== 'undefined' && window.gameState) || null;
    }

    function createCardEl(card, isBack = false, selectable = false) {
      const el = doc.createElement('div');
      el.className = 'card ' + (isBack ? 'card-back' : '');
      if (!isBack && card) {
        const RANKS = engine.RANKS || (typeof window !== 'undefined' && window.TienLenEngine ? window.TienLenEngine.RANKS : []);
        const SUITS = (engine.SUITS || (typeof window !== 'undefined' && window.TienLenEngine ? window.TienLenEngine.SUITS : []));
        const SUIT_SYMBOLS = (engine.SUIT_SYMBOLS || (typeof window !== 'undefined' && window.TienLenEngine ? window.TienLenEngine.SUIT_SYMBOLS : {s:'♠',c:'♣',d:'♦',h:'♥'}));
        const r = RANKS[card.rank] || '?';
        const s = SUIT_SYMBOLS[SUITS[card.suit]] || '?';
        const isRed = card.suit === 2 || card.suit === 3;
        el.innerHTML = `<div class="rank ${isRed ? 'red' : ''}">${r}</div><div class="suit ${isRed ? 'red' : ''}">${s}</div>`;
        el.dataset.card = JSON.stringify(card);
        if (selectable && typeof toggleSelect === 'function') {
          el.onclick = () => toggleSelect(card, el);
        }
      }
      return el;
    }

    function renderHand(playerIdx) {
      const container = doc.getElementById('hand-' + playerIdx);
      if (!container) return;
      container.innerHTML = '';
      const st = getState();
      if (!st) return;
      const p = st.players[playerIdx];
      if (!p) return;

      const isActiveHuman = (playerIdx === currentHumanSeat);
      const isTurnSeat = (playerIdx === st.currentPlayer);
      const showCards = vsAI ? (playerIdx === 0) : isTurnSeat;
      const selectableForHand = isTurnSeat && isActiveHuman;

      if (!p.hand || p.hand.length === 0 && !p.finished) {
        container.innerHTML = '<div class="text-xs opacity-50">—</div>';
        return;
      }

      (p.hand || []).forEach((c) => {
        const isBack = (playerIdx !== currentHumanSeat) && !showCards;
        const el = createCardEl(c, isBack, selectableForHand);
        if (isTurnSeat && isActiveHuman) {
          const isSel = selectedCards.some(sc => sc.rank === c.rank && sc.suit === c.suit);
          if (isSel) el.classList.add('selected');
        }
        container.appendChild(el);
      });
    }

    function toggleSelect(card, el) {
      const idx = selectedCards.findIndex(sc => sc.rank === card.rank && sc.suit === card.suit);
      if (idx >= 0) {
        selectedCards.splice(idx, 1);
        if (el && el.classList) el.classList.remove('selected');
      } else {
        selectedCards.push(card);
        if (el && el.classList) el.classList.add('selected');
      }
      const info = doc.getElementById('selection-info');
      if (info) info.innerHTML = selectedCards.length ? `${selectedCards.length} cards selected` : '';
      const bp = doc.getElementById('btn-play');
      if (bp) bp.disabled = !isValidPlaySelection(currentHumanSeat);
    }

    function isValidPlaySelection(seat = 0) {
      const st = getState();
      if (!selectedCards.length || !st) return false;
      if (seat !== st.currentPlayer) return false;
      const p = st.players[seat];
      if (!p || p.finished) return false;
      const com = engine.detectCombo(selectedCards);
      if (!com) return false;
      const legals = engine.getLegalPlays(p.hand, st.currentCombo, p.passed, st.isFirstLead, st.firstLeadCard);
      const sig = selectedCards.map(c => c.rank*4 + c.suit).sort((a,b)=>a-b).join(',');
      return legals.some(l => l.map(c=>c.rank*4 + c.suit).sort((a,b)=>a-b).join(',') === sig);
    }

    function clearSelection() {
      selectedCards = [];
      const info = doc.getElementById('selection-info');
      if (info) info.innerHTML = '';
      const st = getState();
      if (st) {
        for (let i = 0; i < st.numPlayers; i++) {
          const c = doc.getElementById('hand-' + i);
          if (c) renderHand(i);
        }
      }
      const bp = doc.getElementById('btn-play');
      if (bp) bp.disabled = true;
    }

    function playSelected() {
      const seat = (typeof currentHumanSeat !== 'undefined' ? currentHumanSeat : 0);
      const st = getState();
      if (!st) return;
      const ctrl = getCurrentController();
      if (ctrl && typeof ctrl.playHuman === 'function') {
        const res = ctrl.playHuman(seat, selectedCards);
        if (!res || !res.ok) return;
        selectedCards = [];
        updateUIFromController();
        if (broadcastChannel && broadcastChannel.postMessage) { try { broadcastChannel.postMessage({type:'sync', seat}); } catch(_) {} }
        playSound('play');
        const c = getCurrentController(); if (c && typeof c.runAITurnIfNeeded === 'function') setTimeout(() => { c.runAITurnIfNeeded(); updateUIFromController(); }, 120);
        return;
      }
    }

    function doPass() {
      const seat = (typeof currentHumanSeat !== 'undefined' ? currentHumanSeat : 0);
      const st = getState();
      if (!st) return;
      const ctrl = getCurrentController();
      if (ctrl && typeof ctrl.passHuman === 'function') {
        const res = ctrl.passHuman(seat);
        if (!res || !res.ok) return;
        selectedCards = [];
        updateUIFromController();
        if (broadcastChannel && broadcastChannel.postMessage) { try { broadcastChannel.postMessage({type:'sync', seat}); } catch(_) {} }
        playSound('pass');
        const c = getCurrentController(); if (c && typeof c.runAITurnIfNeeded === 'function') setTimeout(() => { c.runAITurnIfNeeded(); updateUIFromController(); }, 80);
        return;
      }
    }

    function updateUIFromController() {
      const st = getState();
      if (!st) return;
      for (let i = 0; i < 4; i++) {
        const zone = doc.getElementById('player-' + i);
        if (zone) zone.style.display = (i < st.numPlayers) ? '' : 'none';
      }
      const activeLabel = doc.getElementById('active-seat-label');
      if (activeLabel) activeLabel.textContent = '(P' + currentHumanSeat + ')';

      for (let i = 0; i < st.numPlayers; i++) {
        renderHand(i);
        const statusEl = doc.getElementById('status-' + i);
        if (statusEl) {
          const p = st.players[i];
          let txt = (p.hand ? p.hand.length : 0) + ' cards';
          if (p.finished) txt = 'FINISHED';
          else if (p.passed) txt = 'PASSED';
          if (st.currentPlayer === i) txt += ' • TURN';
          statusEl.innerHTML = txt;
        }
      }

      const pile = doc.getElementById('trick-pile');
      if (pile) {
        pile.innerHTML = '';
        if (st.currentCombo && st.currentCombo.cards) {
          st.currentCombo.cards.forEach((c, idx) => {
            const el = createCardEl(c, false);
            el.style.position = 'absolute';
            el.style.left = (20 + idx * 18) + 'px';
            el.style.top = (10 + (idx % 2) * 4) + 'px';
            el.style.zIndex = 10 + idx;
            pile.appendChild(el);
          });
        } else {
          pile.innerHTML = '<div class="text-[11px] text-[#c9a227]/40">— no trick —</div>';
        }
      }

      const turnEl = doc.getElementById('turn-indicator');
      if (turnEl) {
        if (st.roundOver) {
          const order = (st.finishOrder || []).slice();
          const winner = order.length ? order[0] : null;
          const loser = (typeof st.loser === 'number') ? st.loser : null;
          let txt = 'ROUND OVER';
          if (winner !== null) txt += ` • Winner: P${winner}${winner === currentHumanSeat ? ' (You)' : ''}`;
          if (loser !== null) txt += ` • Last: P${loser}`;
          turnEl.innerHTML = txt;
        } else {
          const cur = st.players[st.currentPlayer];
          turnEl.innerHTML = `Turn: Player ${st.currentPlayer}${st.currentPlayer === currentHumanSeat ? ' (You)' : ''}`;
        }
      }

      let winBanner = doc.getElementById('winner-banner');
      if (!winBanner) {
        const area = doc.getElementById('trick-area') || doc.getElementById('table-area');
        if (area && area.parentNode) {
          winBanner = doc.createElement('div');
          winBanner.id = 'winner-banner';
          winBanner.className = 'absolute -mt-2 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm border border-[#c9a227] bg-[#1a0907] hidden';
          area.parentNode.appendChild(winBanner);
        }
      }
      if (winBanner) {
        if (st.roundOver) {
          const w = (st.finishOrder && st.finishOrder[0] != null) ? st.finishOrder[0] : null;
          winBanner.textContent = (w === currentHumanSeat) ? 'You win the round!' : (w != null ? `P${w} wins the round` : 'Round complete');
          winBanner.classList.remove('hidden');
        } else {
          winBanner.classList.add('hidden');
        }
      }

      const info = doc.getElementById('selection-info');
      if (info) info.innerHTML = selectedCards.length ? `${selectedCards.length} cards selected` : (st.roundOver ? 'New round ready' : 'Select cards from your hand');

      const bp = doc.getElementById('btn-play');
      if (bp) bp.disabled = st.roundOver || !isValidPlaySelection(currentHumanSeat);
      const bpass = doc.getElementById('btn-pass');
      if (bpass) bpass.disabled = st.roundOver;
    }

    function startVsAI(nPlayersArg = 4) {
      numPlayers = nPlayersArg;
      vsAI = true;
      humanSeats = [0];
      currentHumanSeat = 0;
      selectedCards = [];

      if (!getCurrentController() && typeof window !== 'undefined' && window.TienLenController && window.TienLenController.createController) {
        controller = window.TienLenController.createController({ vsAI: true, numPlayers, humanSeats: [0], currentHumanSeat: 0, seed: Date.now() });
      } else if (opts.controller) {
        controller = opts.controller;
      }

      const st = getState() || (controller ? controller.getState() : null);
      const mode = doc.getElementById('mode-screen');
      const game = doc.getElementById('game-screen');
      if (mode) mode.classList.add('hidden');
      if (game) game.classList.remove('hidden');

      const sub = doc.getElementById('game-subtitle');
      if (sub) sub.innerHTML = `Round 1 • ${numPlayers} Players • vs Smart AI`;

      updateUIFromController();

      const ctrl = getCurrentController();
      if (ctrl && ctrl.getState && ctrl.getState().currentPlayer !== currentHumanSeat) {
        setTimeout(() => {
          if (ctrl && typeof ctrl.runAITurnIfNeeded === 'function') {
            ctrl.runAITurnIfNeeded();
            updateUIFromController();
          }
        }, 300);
      }
    }

    function startLive(nPlayersArg = 4) {
      numPlayers = nPlayersArg;
      vsAI = false;
      humanSeats = [0,1,2,3].slice(0, numPlayers);
      currentHumanSeat = 0;
      selectedCards = [];

      if (!getCurrentController() && typeof window !== 'undefined' && window.TienLenController && window.TienLenController.createController) {
        controller = window.TienLenController.createController({ vsAI: false, numPlayers, humanSeats, currentHumanSeat: 0, seed: Date.now() + 9 });
      } else if (opts.controller) {
        controller = opts.controller;
      }

      const mode = doc.getElementById('mode-screen');
      const game = doc.getElementById('game-screen');
      if (mode) mode.classList.add('hidden');
      if (game) game.classList.remove('hidden');

      const sub = doc.getElementById('game-subtitle');
      if (sub) sub.innerHTML = `Round 1 • ${numPlayers} Players • Live (hotseat / tabs)`;

      updateUIFromController();
      ensureSeatSwitcher();

      try {
        if (typeof BroadcastChannel !== 'undefined') {
          if (broadcastChannel) { try { broadcastChannel.close(); } catch(_) {} }
          broadcastChannel = new BroadcastChannel(bcName);
          broadcastChannel.onmessage = (ev) => {
            if (ev.data && ev.data.type === 'sync') {
              updateUIFromController();
            }
          };
        }
      } catch(_) {}
    }

    function ensureSeatSwitcher() {
      let bar = doc.getElementById('seat-switcher');
      if (!bar) {
        bar = doc.createElement('div');
        bar.id = 'seat-switcher';
        bar.className = 'flex gap-1 mt-2 text-xs';
        const ti = doc.getElementById('turn-indicator');
        if (ti && ti.parentNode) ti.parentNode.appendChild(bar);
      }
      bar.innerHTML = '<span class="opacity-60 mr-1">Act as:</span>';
      for (let s = 0; s < numPlayers; s++) {
        const b = doc.createElement('button');
        b.textContent = 'P' + s;
        b.className = 'px-2 py-0.5 border border-[#5c4630] rounded ' + (s === currentHumanSeat ? 'bg-[#c9a227] text-[#1a0907]' : '');
        b.onclick = () => {
          currentHumanSeat = s;
          const ctrl = getCurrentController();
          if (ctrl && typeof ctrl.switchSeat === 'function') ctrl.switchSeat(s);
          selectedCards = [];
          updateUIFromController();
          ensureSeatSwitcher();
        };
        bar.appendChild(b);
      }
    }

    function updateUI() {
      updateUIFromController();
    }

    function boot() {
      const gameScreen = doc.getElementById('game-screen');
      if (gameScreen) gameScreen.classList.add('hidden');

      if (doc.addEventListener) {
        doc.addEventListener('keydown', (e) => {
          if (!getState()) return;
          const k = (e.key || '').toLowerCase();
          if (k === 'p' || k === 'enter') { e.preventDefault(); playSelected(); }
          else if (k === 's' || k === ' ') { e.preventDefault(); doPass(); }
          else if (k === 'c' || k === 'escape') { e.preventDefault(); clearSelection(); }
          else if (k === 'h') { e.preventDefault(); if (typeof window !== 'undefined' && window.requestHint) window.requestHint(); }
          else if (k === 'n') { e.preventDefault(); if (typeof window !== 'undefined' && window.newRound) window.newRound(); }
        });
      }

      if (typeof window !== 'undefined') {
        window.TienLenUI = { updateUI, startVsAI, startLive, playSelected, doPass, clearSelection, ensureSeatSwitcher };
      }
    }

    function playSound(type) {
      try {
        const AC = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext));
        if (!AC) return;
        const ctx = new AC();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = (type === 'play') ? 'sine' : 'triangle';
        o.frequency.value = (type === 'play') ? 680 : 420;
        g.gain.value = 0.03;
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200;
        const end = ctx.createGain(); end.gain.value = 1;
        o.connect(f); f.connect(g); g.connect(end); end.connect(ctx.destination);
        o.start();
        setTimeout(() => { g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.18); }, 40);
        setTimeout(() => { try { o.stop(); ctx.close && ctx.close(); } catch(_) {} }, 280);
      } catch(_) {}
    }

    return {
      createCardEl,
      renderHand,
      toggleSelect,
      isValidPlaySelection,
      playSelected,
      doPass,
      clearSelection,
      updateUI,
      updateUIFromController,
      startVsAI,
      startLive,
      ensureSeatSwitcher,
      boot,
      playSound,
      _setController(c) { controller = c; },
      _getSelected() { return selectedCards.slice(); }
    };
  }

  return createUI;
}));
