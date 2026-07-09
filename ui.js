/**
 * ui.js — Extracted UI layer (UMD).
 * createUI({ document, engine, controller, handOrder, multiplayer })
 * Hand: default low→high sort, drag-reorder with visual feedback.
 * Trick: stacked prior combos + play animation.
 * Large turn / pass banners.
 * Host/join multiplayer wiring.
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
    const handOrderMod = opts.handOrder ||
      (typeof window !== 'undefined' ? window.TienLenHandOrder : null) ||
      (typeof require === 'function' ? (function () { try { return require('./hand-order.js'); } catch (_) { return null; } })() : null);
    const mpFactory = opts.multiplayerFactory ||
      (typeof window !== 'undefined' && window.TienLenMultiplayer
        ? window.TienLenMultiplayer.createMultiplayer
        : null);

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
    let playMode = 'ai'; // 'ai' | 'hotseat' | 'online'
    let mp = null;
    let onlineRole = null; // host | guest
    let lastNotifiedTurn = null;
    let lastPassSeat = null;
    let customOrderKeys = null; // number[] of card keys for human hand
    let dragState = null; // { fromIndex, key, el }

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

    function recreateController(cfg) {
      const fac = (typeof window !== 'undefined' && window.TienLenController)
        ? window.TienLenController
        : (opts.controllerFactory || null);
      if (fac && fac.createController) {
        controller = fac.createController(cfg);
        if (typeof window !== 'undefined') window.controller = controller;
        return controller;
      }
      // Fallback: reconfigure existing
      if (controller && controller.reconfigure) {
        controller.reconfigure(cfg);
        return controller;
      }
      if (opts.controller) {
        controller = opts.controller;
        if (controller.reconfigure) controller.reconfigure(cfg);
      }
      return controller;
    }

    // ---------- Hand order helpers (delegate to pure module when present) ----------
    function sortHandDefault(hand) {
      if (handOrderMod && handOrderMod.sortHandDefault) return handOrderMod.sortHandDefault(hand);
      return (hand || []).slice().sort(engine.cardCompare);
    }

    function applyHandOrder(hand, keys) {
      if (handOrderMod && handOrderMod.applyHandOrder) return handOrderMod.applyHandOrder(hand, keys);
      return sortHandDefault(hand);
    }

    function reorderCards(arr, from, to) {
      if (handOrderMod && handOrderMod.reorderCards) return handOrderMod.reorderCards(arr, from, to);
      const a = arr.slice();
      const [item] = a.splice(from, 1);
      a.splice(to, 0, item);
      return a;
    }

    function orderKeys(arr) {
      if (handOrderMod && handOrderMod.orderKeys) return handOrderMod.orderKeys(arr);
      return (arr || []).map(c => c.rank * 4 + c.suit);
    }

    function syncOrderKeys(hand, prev) {
      if (handOrderMod && handOrderMod.syncOrderKeys) return handOrderMod.syncOrderKeys(hand, prev);
      return orderKeys(sortHandDefault(hand));
    }

    function getDisplayHand(playerIdx, hand) {
      if (playerIdx !== currentHumanSeat) return sortHandDefault(hand);
      if (!customOrderKeys) {
        customOrderKeys = orderKeys(sortHandDefault(hand));
      } else {
        customOrderKeys = syncOrderKeys(hand, customOrderKeys);
      }
      return applyHandOrder(hand, customOrderKeys);
    }

    function resetHandOrder() {
      const st = getState();
      if (st && st.players[currentHumanSeat]) {
        customOrderKeys = orderKeys(sortHandDefault(st.players[currentHumanSeat].hand));
      } else {
        customOrderKeys = null;
      }
      renderHand(currentHumanSeat);
      showToast('Hand sorted low → high', 'info', 1200);
    }

    // ---------- Cards ----------
    function createCardEl(card, isBack = false, selectable = false, extra = {}) {
      const el = doc.createElement('div');
      el.className = 'card ' + (isBack ? 'card-back' : '');
      if (extra.draggable) el.classList.add('card-draggable');
      if (extra.stack) el.classList.add('stack-card');
      if (extra.animIn) el.classList.add('card-play-in');
      if (!isBack && card) {
        const RANKS = engine.RANKS || [];
        const SUITS = engine.SUITS || [];
        const SUIT_SYMBOLS = engine.SUIT_SYMBOLS || { s: '♠', c: '♣', d: '♦', h: '♥' };
        const r = RANKS[card.rank] || '?';
        const s = SUIT_SYMBOLS[SUITS[card.suit]] || '?';
        const isRed = card.suit === 2 || card.suit === 3;
        el.innerHTML = `<div class="rank ${isRed ? 'red' : ''}">${r}</div><div class="suit ${isRed ? 'red' : ''}">${s}</div>`;
        el.dataset.card = JSON.stringify(card);
        el.dataset.cardKey = String(card.rank * 4 + card.suit);
        if (selectable) {
          el.onclick = (ev) => {
            if (dragState && dragState.moved) return;
            toggleSelect(card, el);
          };
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
      // In vsAI show only seat 0 face-up; in hotseat show current human; online show my seat
      const showCards = vsAI
        ? (playerIdx === 0)
        : (playerIdx === currentHumanSeat);
      const selectableForHand = isTurnSeat && isActiveHuman && !st.roundOver;

      if ((!p.hand || p.hand.length === 0) && !p.finished) {
        container.innerHTML = '<div class="text-xs opacity-50">—</div>';
        return;
      }
      if (p.finished) {
        container.innerHTML = '<div class="text-xs text-[#c9a227]">OUT</div>';
        return;
      }

      const display = showCards ? getDisplayHand(playerIdx, p.hand) : (p.hand || []);

      display.forEach((c, idx) => {
        const isBack = !showCards;
        const el = createCardEl(c, isBack, selectableForHand && !isBack, {
          draggable: showCards && isActiveHuman && !isBack
        });
        if (isTurnSeat && isActiveHuman && !isBack) {
          const isSel = selectedCards.some(sc => sc.rank === c.rank && sc.suit === c.suit);
          if (isSel) el.classList.add('selected');
        }
        if (showCards && isActiveHuman && !isBack) {
          wireDrag(el, idx, container, playerIdx);
        }
        // Fan spacing for human hand
        if (showCards && isActiveHuman) {
          el.style.marginLeft = idx === 0 ? '0' : '-6px';
          el.style.zIndex = String(10 + idx);
        }
        container.appendChild(el);
      });
    }

    // ---------- Drag reorder ----------
    function wireDrag(el, index, container, playerIdx) {
      el.draggable = true;
      el.setAttribute('draggable', 'true');

      el.addEventListener('dragstart', (e) => {
        dragState = { fromIndex: index, key: el.dataset.cardKey, el, moved: false };
        el.classList.add('dragging');
        try {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(index));
          // translucent drag image feel
          if (e.dataTransfer.setDragImage) {
            e.dataTransfer.setDragImage(el, 28, 40);
          }
        } catch (_) {}
        container.classList.add('hand-dragging');
      });

      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        container.classList.remove('hand-dragging');
        container.querySelectorAll('.card.drag-over').forEach(n => n.classList.remove('drag-over'));
        setTimeout(() => { dragState = null; }, 30);
      });

      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!dragState) return;
        el.classList.add('drag-over');
        try { e.dataTransfer.dropEffect = 'move'; } catch (_) {}
      });

      el.addEventListener('dragleave', () => {
        el.classList.remove('drag-over');
      });

      el.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.remove('drag-over');
        if (!dragState) return;
        const from = dragState.fromIndex;
        const to = index;
        if (from === to) return;
        dragState.moved = true;
        const st = getState();
        if (!st) return;
        const hand = st.players[currentHumanSeat].hand;
        const display = getDisplayHand(currentHumanSeat, hand);
        const next = reorderCards(display, from, to);
        customOrderKeys = orderKeys(next);
        selectedCards = [];
        renderHand(currentHumanSeat);
      });

      // Touch-friendly pointer fallback
      el.addEventListener('pointerdown', (e) => {
        if (e.button != null && e.button !== 0) return;
        if (e.pointerType === 'mouse') return; // HTML5 drag handles mouse
        const startX = e.clientX;
        const startY = e.clientY;
        const from = index;
        let moved = false;
        const ghost = el.cloneNode(true);
        ghost.className = el.className + ' drag-ghost';
        ghost.style.position = 'fixed';
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '9999';
        ghost.style.left = (e.clientX - 28) + 'px';
        ghost.style.top = (e.clientY - 40) + 'px';
        ghost.style.opacity = '0.92';
        ghost.style.transform = 'scale(1.08) rotate(-4deg)';
        ghost.style.boxShadow = '0 18px 40px rgba(0,0,0,0.55)';
        doc.body.appendChild(ghost);
        el.classList.add('dragging');

        function onMove(ev) {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
          ghost.style.left = (ev.clientX - 28) + 'px';
          ghost.style.top = (ev.clientY - 40) + 'px';
          // highlight card under pointer
          const under = doc.elementFromPoint(ev.clientX, ev.clientY);
          container.querySelectorAll('.card.drag-over').forEach(n => n.classList.remove('drag-over'));
          if (under && under.classList && under.classList.contains('card') && under !== el) {
            under.classList.add('drag-over');
          }
        }
        function onUp(ev) {
          doc.removeEventListener('pointermove', onMove);
          doc.removeEventListener('pointerup', onUp);
          el.classList.remove('dragging');
          try { ghost.remove(); } catch (_) {}
          container.querySelectorAll('.card.drag-over').forEach(n => n.classList.remove('drag-over'));
          if (!moved) return;
          const under = doc.elementFromPoint(ev.clientX, ev.clientY);
          if (!under || !under.dataset || !under.dataset.cardKey) return;
          const kids = Array.from(container.querySelectorAll('.card'));
          const to = kids.indexOf(under);
          if (to < 0 || to === from) return;
          const st = getState();
          if (!st) return;
          const hand = st.players[currentHumanSeat].hand;
          const display = getDisplayHand(currentHumanSeat, hand);
          const next = reorderCards(display, from, to);
          customOrderKeys = orderKeys(next);
          selectedCards = [];
          renderHand(currentHumanSeat);
        }
        doc.addEventListener('pointermove', onMove);
        doc.addEventListener('pointerup', onUp);
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
      const sig = selectedCards.map(c => c.rank * 4 + c.suit).sort((a, b) => a - b).join(',');
      return legals.some(l => l.map(c => c.rank * 4 + c.suit).sort((a, b) => a - b).join(',') === sig);
    }

    function clearSelection() {
      selectedCards = [];
      const info = doc.getElementById('selection-info');
      if (info) info.innerHTML = '';
      const st = getState();
      if (st) {
        for (let i = 0; i < st.numPlayers; i++) renderHand(i);
      }
      const bp = doc.getElementById('btn-play');
      if (bp) bp.disabled = true;
    }

    // ---------- Notifications ----------
    function ensureBannerHost() {
      let host = doc.getElementById('game-banners');
      if (!host) {
        host = doc.createElement('div');
        host.id = 'game-banners';
        host.className = 'game-banners';
        const table = doc.getElementById('table-area') || doc.getElementById('game-screen') || doc.body;
        table.appendChild(host);
      }
      return host;
    }

    function showBanner(kind, text, ms) {
      const host = ensureBannerHost();
      const el = doc.createElement('div');
      el.className = 'game-banner game-banner-' + kind;
      el.setAttribute('role', 'status');
      el.innerHTML = text;
      host.appendChild(el);
      // force reflow for animation
      void el.offsetWidth;
      el.classList.add('show');
      const ttl = ms == null ? (kind === 'turn' ? 2200 : 1800) : ms;
      setTimeout(() => {
        el.classList.remove('show');
        el.classList.add('hide');
        setTimeout(() => { try { el.remove(); } catch (_) {} }, 350);
      }, ttl);
    }

    function showToast(text, kind, ms) {
      showBanner(kind || 'info', text, ms || 1500);
    }

    // ---------- Play / Pass ----------
    function playSelected() {
      const seat = currentHumanSeat;
      const st = getState();
      if (!st) return;
      // Online guest: send to host
      if (playMode === 'online' && onlineRole === 'guest' && mp) {
        if (!isValidPlaySelection(seat)) return;
        const cards = selectedCards.slice();
        selectedCards = [];
        mp.sendAction({ type: 'play', cards });
        playSound('play');
        return;
      }
      if (playMode === 'online' && onlineRole === 'host' && mp) {
        if (!isValidPlaySelection(seat)) return;
        const cards = selectedCards.slice();
        selectedCards = [];
        const res = mp.sendAction({ type: 'play', cards });
        if (res && res.ok) {
          updateUIFromController();
          playSound('play');
        }
        return;
      }

      const ctrl = getCurrentController();
      if (ctrl && typeof ctrl.playHuman === 'function') {
        const res = ctrl.playHuman(seat, selectedCards);
        if (!res || !res.ok) {
          if (res && res.error) showToast(res.error, 'warn', 1400);
          return;
        }
        selectedCards = [];
        customOrderKeys = syncOrderKeys(ctrl.getState().players[seat].hand, customOrderKeys);
        updateUIFromController();
        if (broadcastChannel && broadcastChannel.postMessage) {
          try { broadcastChannel.postMessage({ type: 'sync', seat }); } catch (_) {}
        }
        playSound('play');
        const c = getCurrentController();
        if (c && typeof c.runAITurnIfNeeded === 'function') {
          setTimeout(() => {
            const acts = c.runAITurnIfNeeded() || [];
            announceAIActions(acts);
            updateUIFromController();
          }, 280);
        }
        return;
      }
    }

    function announceAIActions(acts) {
      (acts || []).forEach((a, i) => {
        setTimeout(() => {
          if (a.type === 'pass') {
            showBanner('pass', `<span class="banner-pass-label">P${a.seat} PASSED</span>`, 1400);
          } else if (a.type === 'play' && a.cards && a.cards.length) {
            const label = describePlay(a.cards);
            showBanner('ok', `<span class="banner-turn-label">P${a.seat} PLAYED</span><span class="banner-sub">${label}</span>`, 1500);
          }
        }, i * 420);
      });
    }

    function describePlay(cards) {
      try {
        const com = engine.detectCombo(cards);
        if (!com) return cards.length + ' cards';
        const top = com.top;
        const r = (engine.RANKS && engine.RANKS[top.rank]) || '?';
        const s = (engine.SUIT_SYMBOLS && engine.SUITS && engine.SUIT_SYMBOLS[engine.SUITS[top.suit]]) || '';
        if (com.type === 'single') return r + s;
        if (com.type === 'pair') return 'Pair of ' + r;
        if (com.type === 'triple') return 'Triple ' + r;
        if (com.type === 'quad') return 'Quad ' + r;
        if (com.type === 'seq') return 'Sequence ×' + com.size;
        if (com.type === 'doubleseq') return 'Double-seq ×' + (com.numPairs || '?');
        return com.type;
      } catch (_) {
        return (cards && cards.length ? cards.length + ' cards' : 'cards');
      }
    }

    function doPass() {
      const seat = currentHumanSeat;
      const st = getState();
      if (!st) return;
      if (!st.currentCombo) {
        showToast('You have free lead — play any combination', 'warn', 2000);
        return;
      }

      if (playMode === 'online' && onlineRole === 'guest' && mp) {
        mp.sendAction({ type: 'pass' });
        playSound('pass');
        showBanner('pass', '<span class="banner-pass-label">YOU PASSED</span>', 1600);
        return;
      }
      if (playMode === 'online' && onlineRole === 'host' && mp) {
        const res = mp.sendAction({ type: 'pass' });
        if (res && res.ok) {
          showBanner('pass', '<span class="banner-pass-label">YOU PASSED</span>', 1600);
          updateUIFromController();
          playSound('pass');
        }
        return;
      }

      const ctrl = getCurrentController();
      if (ctrl && typeof ctrl.passHuman === 'function') {
        const res = ctrl.passHuman(seat);
        if (!res || !res.ok) {
          if (res && res.error) showToast(res.error, 'warn', 1400);
          return;
        }
        selectedCards = [];
        showBanner('pass', '<span class="banner-pass-label">YOU PASSED</span>', 1600);
        updateUIFromController();
        if (broadcastChannel && broadcastChannel.postMessage) {
          try { broadcastChannel.postMessage({ type: 'sync', seat }); } catch (_) {}
        }
        playSound('pass');
        const c = getCurrentController();
        if (c && typeof c.runAITurnIfNeeded === 'function') {
          setTimeout(() => {
            const acts = c.runAITurnIfNeeded() || [];
            announceAIActions(acts);
            updateUIFromController();
          }, 200);
        }
      }
    }

    // ---------- Trick stack render ----------
    function renderTrick(st) {
      const pile = doc.getElementById('trick-pile');
      if (!pile) return;
      pile.innerHTML = '';
      const stack = (st.trickStack && st.trickStack.length)
        ? st.trickStack
        : (st.currentCombo && st.currentCombo.cards
          ? [{ seat: st.lastPlayBy, cards: st.currentCombo.cards, combo: st.currentCombo }]
          : []);

      if (!stack.length) {
        pile.innerHTML = '<div class="text-[11px] text-[#c9a227]/40">— free lead —</div>';
        return;
      }

      // Show up to last 4 layers so previous combos peek underneath
      const layers = stack.slice(-4);
      layers.forEach((layer, li) => {
        const cards = layer.cards || [];
        const baseRot = (li - layers.length + 1) * 4;
        const baseX = li * 10 - 8;
        const baseY = li * 6 - 4;
        const isTop = li === layers.length - 1;
        cards.forEach((c, idx) => {
          const el = createCardEl(c, false, false, {
            stack: true,
            animIn: isTop
          });
          el.style.position = 'absolute';
          el.style.left = (baseX + 24 + idx * 16) + 'px';
          el.style.top = (baseY + 8 + (idx % 2) * 3) + 'px';
          el.style.transform = `rotate(${baseRot + (idx - cards.length / 2) * 2.5}deg)`;
          el.style.zIndex = String(li * 20 + idx);
          el.style.opacity = isTop ? '1' : String(0.55 + li * 0.1);
          if (!isTop) el.style.filter = 'brightness(0.92)';
          pile.appendChild(el);
        });
      });
    }

    function updateUIFromController() {
      const st = getState();
      if (!st) return;

      // Show/hide player zones for 2/3/4 — force visible (override Tailwind hidden)
      for (let i = 0; i < 4; i++) {
        const zone = doc.getElementById('player-' + i);
        if (zone) {
          if (i < st.numPlayers) {
            zone.style.display = '';
            zone.classList.remove('hidden');
            // Ensure md:hidden seats still show when active
            zone.style.visibility = 'visible';
            zone.classList.toggle('active', st.currentPlayer === i && !st.roundOver);
          } else {
            zone.style.display = 'none';
          }
        }
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
          statusEl.className = 'mt-1 text-[11px] ' +
            (p.passed ? 'text-amber-300 font-bold' : 'opacity-80') +
            (st.currentPlayer === i ? ' text-[#c9a227] font-semibold' : '');
        }
      }

      // Your status chip
      const ys = doc.getElementById('your-status');
      if (ys) {
        const me = st.players[currentHumanSeat];
        if (st.roundOver) ys.textContent = 'Round over';
        else if (st.currentPlayer === currentHumanSeat) ys.textContent = 'YOUR TURN';
        else if (me && me.passed) ys.textContent = 'Passed';
        else ys.textContent = (me && me.hand ? me.hand.length : 0) + ' cards';
      }

      renderTrick(st);

      // Free-lead hint
      const freeHint = doc.getElementById('free-lead-hint');
      if (freeHint) {
        if (!st.roundOver && st.currentCombo == null && st.currentPlayer === currentHumanSeat) {
          freeHint.classList.remove('hidden');
          freeHint.textContent = 'Free lead — play any combination (you are not forced to beat your last play)';
        } else {
          freeHint.classList.add('hidden');
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
          turnEl.innerHTML = `Turn: Player ${st.currentPlayer}${st.currentPlayer === currentHumanSeat ? ' (You)' : ''}`;
        }
      }

      // Large YOUR TURN banner when it becomes our turn
      if (!st.roundOver && st.currentPlayer === currentHumanSeat) {
        if (lastNotifiedTurn !== st.currentPlayer + '-' + (st.trickStack ? st.trickStack.length : 0) + '-' + (st.currentCombo ? 'c' : 'f')) {
          lastNotifiedTurn = st.currentPlayer + '-' + (st.trickStack ? st.trickStack.length : 0) + '-' + (st.currentCombo ? 'c' : 'f');
          const free = st.currentCombo == null;
          showBanner(
            'turn',
            free
              ? '<span class="banner-turn-label">YOUR TURN</span><span class="banner-sub">Free lead — any combo</span>'
              : '<span class="banner-turn-label">YOUR TURN</span><span class="banner-sub">Beat the pile or pass</span>',
            2400
          );
        }
      } else if (st.currentPlayer !== currentHumanSeat) {
        lastNotifiedTurn = null;
      }

      // Winner banner
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
      if (info) {
        info.innerHTML = selectedCards.length
          ? `${selectedCards.length} cards selected`
          : (st.roundOver ? 'New round ready' : 'Select cards · drag to reorder hand');
      }

      const bp = doc.getElementById('btn-play');
      if (bp) bp.disabled = st.roundOver || !isValidPlaySelection(currentHumanSeat);
      const bpass = doc.getElementById('btn-pass');
      if (bpass) {
        // Pass only when there is a combo to beat
        bpass.disabled = st.roundOver || !st.currentCombo || st.currentPlayer !== currentHumanSeat;
      }
    }

    // ---------- Start modes ----------
    function startVsAI(nPlayersArg = 4) {
      numPlayers = nPlayersArg || 4;
      vsAI = true;
      playMode = 'ai';
      humanSeats = [0];
      currentHumanSeat = 0;
      selectedCards = [];
      customOrderKeys = null;
      onlineRole = null;
      if (mp) { try { mp.disconnect(); } catch (_) {} mp = null; }

      // ALWAYS recreate so 2/3/4 seats are correct (never reuse stale 4p)
      recreateController({
        vsAI: true,
        numPlayers,
        humanSeats: [0],
        currentHumanSeat: 0,
        seed: Date.now()
      });

      showGameScreen();
      const sub = doc.getElementById('game-subtitle');
      if (sub) sub.innerHTML = `Round 1 • ${numPlayers} Players • vs Smart AI`;

      updatePlayerLabels();
      updateUIFromController();
      ensureSortButton();

      const ctrl = getCurrentController();
      if (ctrl && ctrl.getState && ctrl.getState().currentPlayer !== currentHumanSeat) {
        setTimeout(() => {
          if (ctrl && typeof ctrl.runAITurnIfNeeded === 'function') {
            const acts = ctrl.runAITurnIfNeeded() || [];
            announceAIActions(acts);
            updateUIFromController();
          }
        }, 350);
      }
    }

    function startLive(nPlayersArg = 4) {
      // Show friends lobby (hotseat vs online host/join)
      numPlayers = nPlayersArg || 4;
      showFriendsLobby(numPlayers);
    }

    function startHotseat(nPlayersArg = 4) {
      numPlayers = nPlayersArg || 4;
      vsAI = false;
      playMode = 'hotseat';
      humanSeats = [];
      for (let i = 0; i < numPlayers; i++) humanSeats.push(i);
      currentHumanSeat = 0;
      selectedCards = [];
      customOrderKeys = null;
      onlineRole = null;
      if (mp) { try { mp.disconnect(); } catch (_) {} mp = null; }

      recreateController({
        vsAI: false,
        numPlayers,
        humanSeats: humanSeats.slice(),
        currentHumanSeat: 0,
        seed: Date.now() + 9
      });

      showGameScreen();
      const sub = doc.getElementById('game-subtitle');
      if (sub) sub.innerHTML = `Round 1 • ${numPlayers} Players • Hotseat (same device)`;

      updatePlayerLabels();
      updateUIFromController();
      ensureSeatSwitcher();
      ensureSortButton();

      try {
        if (typeof BroadcastChannel !== 'undefined') {
          if (broadcastChannel) { try { broadcastChannel.close(); } catch (_) {} }
          broadcastChannel = new BroadcastChannel(bcName);
          broadcastChannel.onmessage = (ev) => {
            if (ev.data && ev.data.type === 'sync') updateUIFromController();
          };
        }
      } catch (_) {}
    }

    function showFriendsLobby(n) {
      numPlayers = n || 4;
      let lobby = doc.getElementById('friends-lobby');
      if (!lobby) {
        lobby = doc.createElement('div');
        lobby.id = 'friends-lobby';
        lobby.className = 'friends-lobby';
        const mode = doc.getElementById('mode-screen');
        if (mode && mode.parentNode) mode.parentNode.insertBefore(lobby, mode.nextSibling);
        else doc.body.appendChild(lobby);
      }
      lobby.classList.remove('hidden');
      const mode = doc.getElementById('mode-screen');
      if (mode) mode.classList.add('hidden');
      const game = doc.getElementById('game-screen');
      if (game) game.classList.add('hidden');

      lobby.innerHTML = `
        <div class="max-w-xl mx-auto bg-[#1a0907] border-2 border-[#5c4630] rounded-3xl p-8">
          <div class="flex justify-between items-start mb-4">
            <div>
              <div class="font-display text-3xl text-white">Play with Friends</div>
              <div class="text-sm text-[#c9a227] mt-1">${numPlayers} players</div>
            </div>
            <button type="button" id="lobby-back" class="text-[#c9a227] text-sm">← Back</button>
          </div>
          <p class="text-sm text-[#d2b48c] mb-6">
            <strong class="text-white">Same computer:</strong> hotseat — pass the device each turn.<br>
            <strong class="text-white">Different computers:</strong> host creates a room code; friends join with the code or share link.
          </p>
          <div class="grid gap-3">
            <button type="button" id="btn-hotseat" class="viet-btn w-full py-3 rounded-2xl text-left px-5">
              <div class="text-base">Hotseat (one device)</div>
              <div class="text-xs font-normal opacity-80">Pass the keyboard / mouse each turn</div>
            </button>
            <button type="button" id="btn-host" class="w-full py-3 rounded-2xl border-2 border-[#c9a227] text-left px-5 hover:bg-[#3a1f1a]">
              <div class="text-base text-[#c9a227] font-semibold">Host online game</div>
              <div class="text-xs text-[#d2b48c]">Get a room code &amp; shareable link</div>
            </button>
            <div class="border border-[#5c4630] rounded-2xl p-4">
              <div class="text-sm font-semibold mb-2">Join a friend’s room</div>
              <div class="flex gap-2">
                <input id="join-code-input" maxlength="8" placeholder="Room code"
                       class="flex-1 bg-[#2c0f0a] border border-[#5c4630] rounded-xl px-3 py-2 text-sm tracking-widest uppercase" />
                <button type="button" id="btn-join" class="viet-btn px-5 py-2 rounded-xl">Join</button>
              </div>
              <div class="text-[11px] text-[#8b6f2e] mt-2">Or open a share link with ?room=CODE</div>
            </div>
          </div>
          <div id="lobby-status" class="mt-4 text-sm text-[#c9a227] min-h-[1.25rem]"></div>
          <div id="lobby-room-info" class="hidden mt-3 p-3 rounded-xl bg-[#0a2e1c] border border-[#3a2a1f] text-sm"></div>
        </div>
      `;

      const back = doc.getElementById('lobby-back');
      if (back) back.onclick = () => {
        lobby.classList.add('hidden');
        if (mode) mode.classList.remove('hidden');
      };
      const hs = doc.getElementById('btn-hotseat');
      if (hs) hs.onclick = () => { lobby.classList.add('hidden'); startHotseat(numPlayers); };
      const hostBtn = doc.getElementById('btn-host');
      if (hostBtn) hostBtn.onclick = () => hostOnlineGame(numPlayers);
      const joinBtn = doc.getElementById('btn-join');
      if (joinBtn) joinBtn.onclick = () => {
        const inp = doc.getElementById('join-code-input');
        joinOnlineGame((inp && inp.value) || '');
      };

      // Auto-join from URL ?room=
      try {
        if (typeof location !== 'undefined') {
          const params = new URLSearchParams(location.search || '');
          const room = params.get('room');
          if (room) {
            const inp = doc.getElementById('join-code-input');
            if (inp) inp.value = room;
            joinOnlineGame(room);
          }
        }
      } catch (_) {}
    }

    function ensureMp() {
      if (mp) return mp;
      if (!mpFactory) {
        showToast('Multiplayer module not loaded', 'error', 2000);
        return null;
      }
      // Ensure controller exists for host authority
      if (!getCurrentController()) {
        recreateController({
          vsAI: false,
          numPlayers,
          humanSeats: [0],
          currentHumanSeat: 0,
          seed: Date.now()
        });
      }
      mp = mpFactory({
        controller: getCurrentController(),
        onState: (st) => {
          updateUIFromController();
        },
        onStatus: (s) => {
          const el = doc.getElementById('lobby-status') || doc.getElementById('mp-status');
          if (el) el.textContent = s.message || '';
          if (s.level === 'error') showToast(s.message, 'error', 2500);
        },
        onPeerJoin: (p) => {
          showToast((p.name || 'Player') + ' joined as P' + p.seat, 'ok', 2000);
          updateUIFromController();
        },
        onError: (m) => showToast(m, 'error', 2500)
      });
      return mp;
    }

    function hostOnlineGame(n) {
      numPlayers = n || 4;
      vsAI = false;
      playMode = 'online';
      onlineRole = 'host';
      humanSeats = [];
      for (let i = 0; i < numPlayers; i++) humanSeats.push(i);
      currentHumanSeat = 0;
      selectedCards = [];
      customOrderKeys = null;

      recreateController({
        vsAI: false,
        numPlayers,
        humanSeats: humanSeats.slice(),
        currentHumanSeat: 0,
        seed: Date.now()
      });

      const m = ensureMp();
      if (!m) return;
      m.setController(getCurrentController());

      const status = doc.getElementById('lobby-status');
      if (status) status.textContent = 'Creating room…';

      m.hostGame({ numPlayers, displayName: 'Host' }).then((info) => {
        const box = doc.getElementById('lobby-room-info');
        if (box) {
          box.classList.remove('hidden');
          box.innerHTML = `
            <div class="text-[#c9a227] font-semibold tracking-widest text-lg mb-1">ROOM ${info.roomCode}</div>
            <div class="text-xs break-all mb-2">Share link:<br><a class="text-[#e8d48b] underline" href="${info.shareUrl}">${info.shareUrl}</a></div>
            <div class="text-xs text-[#d2b48c]">Friends open the link (or enter the code) on their own computers. You are P0 (host). Wait for them, then play on your turn.</div>
            <button type="button" id="btn-enter-host-game" class="viet-btn mt-3 px-4 py-2 rounded-xl text-sm">Enter table</button>
          `;
          const enter = doc.getElementById('btn-enter-host-game');
          if (enter) enter.onclick = () => {
            const lobby = doc.getElementById('friends-lobby');
            if (lobby) lobby.classList.add('hidden');
            showGameScreen();
            const sub = doc.getElementById('game-subtitle');
            if (sub) sub.innerHTML = `Online host • Room ${info.roomCode} • ${numPlayers}p`;
            ensureMpStatusBar(info);
            updatePlayerLabels();
            updateUIFromController();
            ensureSortButton();
          };
        }
        if (status) status.textContent = 'Room ready — share code ' + info.roomCode;
        showToast('Room ' + info.roomCode + ' ready', 'ok', 2000);
      }).catch((e) => {
        if (status) status.textContent = 'Host failed: ' + (e.message || e);
        showToast('Host failed — is PeerJS loaded?', 'error', 3000);
      });
    }

    function joinOnlineGame(code) {
      vsAI = false;
      playMode = 'online';
      onlineRole = 'guest';
      selectedCards = [];
      customOrderKeys = null;

      // Guest still needs a controller to hold synced state
      recreateController({
        vsAI: false,
        numPlayers: numPlayers || 4,
        humanSeats: [0, 1, 2, 3],
        currentHumanSeat: 0,
        seed: 1
      });

      const m = ensureMp();
      if (!m) return;
      m.setController(getCurrentController());

      const status = doc.getElementById('lobby-status');
      if (status) status.textContent = 'Joining…';

      m.joinGame({ roomCode: code, displayName: 'Guest' }).then((info) => {
        // mySeat assigned on welcome; poll room info shortly
        setTimeout(() => {
          const ri = m.getRoomInfo();
          currentHumanSeat = (typeof ri.mySeat === 'number') ? ri.mySeat : 0;
          const ctrl = getCurrentController();
          if (ctrl && ctrl.switchSeat) ctrl.switchSeat(currentHumanSeat);
          const lobby = doc.getElementById('friends-lobby');
          if (lobby) lobby.classList.add('hidden');
          showGameScreen();
          const sub = doc.getElementById('game-subtitle');
          if (sub) sub.innerHTML = `Online • Room ${info.roomCode || code} • You are P${currentHumanSeat}`;
          ensureMpStatusBar(Object.assign({}, info, ri));
          updatePlayerLabels();
          updateUIFromController();
          ensureSortButton();
          showToast('Joined as P' + currentHumanSeat, 'ok', 2000);
        }, 600);
      }).catch((e) => {
        if (status) status.textContent = 'Join failed: ' + (e.message || e);
        showToast('Join failed — check code / host is online', 'error', 3000);
      });
    }

    function ensureMpStatusBar(info) {
      let bar = doc.getElementById('mp-status-bar');
      if (!bar) {
        bar = doc.createElement('div');
        bar.id = 'mp-status-bar';
        bar.className = 'mp-status-bar';
        const game = doc.getElementById('game-screen');
        if (game) game.insertBefore(bar, game.firstChild);
      }
      const code = (info && info.roomCode) || '';
      const url = (info && info.shareUrl) || '';
      bar.innerHTML = `
        <span class="text-[#c9a227] font-semibold">Online</span>
        <span class="opacity-80">Room <strong>${code}</strong> · You P${currentHumanSeat}</span>
        <span id="mp-status" class="text-xs opacity-70"></span>
        ${url ? `<button type="button" id="btn-copy-link" class="text-xs underline text-[#e8d48b]">Copy link</button>` : ''}
      `;
      const copy = doc.getElementById('btn-copy-link');
      if (copy && url) {
        copy.onclick = () => {
          try {
            if (navigator.clipboard) navigator.clipboard.writeText(url);
            showToast('Link copied', 'ok', 1200);
          } catch (_) {}
        };
      }
    }

    function showGameScreen() {
      const mode = doc.getElementById('mode-screen');
      const game = doc.getElementById('game-screen');
      const lobby = doc.getElementById('friends-lobby');
      if (mode) mode.classList.add('hidden');
      if (lobby) lobby.classList.add('hidden');
      if (game) game.classList.remove('hidden');
    }

    function updatePlayerLabels() {
      const labels = ['YOU (South)', 'EAST', 'NORTH', 'WEST'];
      const nameIds = [
        { zone: 'player-0', title: labels[0] },
        { zone: 'player-1', title: 'P1 · EAST' },
        { zone: 'player-2', title: 'P2 · NORTH' },
        { zone: 'player-3', title: 'P3 · WEST' }
      ];
      // Prefer a clearer layout: map seats 0..n-1 to visible zones
      for (let i = 0; i < 4; i++) {
        const zone = doc.getElementById('player-' + i);
        if (!zone) continue;
        const title = zone.querySelector('.text-xs.text-\\[\\#c9a227\\], .player-title, [data-player-title]');
        // Set data attribute for CSS/tests
        zone.dataset.seat = String(i);
        const firstLabel = zone.querySelector('[data-player-title]') || zone.querySelector('.text-xs');
        if (firstLabel) {
          firstLabel.setAttribute('data-player-title', '1');
          if (i === 0) firstLabel.innerHTML = 'YOU <span class="opacity-60">(South)</span>';
          else firstLabel.textContent = 'P' + i + (vsAI ? ' · AI' : '');
        }
      }
    }

    function ensureSeatSwitcher() {
      let bar = doc.getElementById('seat-switcher');
      if (!bar) {
        bar = doc.createElement('div');
        bar.id = 'seat-switcher';
        bar.className = 'flex gap-1 mt-2 text-xs flex-wrap';
        const ti = doc.getElementById('turn-indicator');
        if (ti && ti.parentNode) ti.parentNode.appendChild(bar);
      }
      bar.innerHTML = '<span class="opacity-60 mr-1">Act as:</span>';
      for (let s = 0; s < numPlayers; s++) {
        const b = doc.createElement('button');
        b.textContent = 'P' + s;
        b.className = 'px-2 py-0.5 border border-[#5c4630] rounded ' +
          (s === currentHumanSeat ? 'bg-[#c9a227] text-[#1a0907]' : '');
        b.onclick = () => {
          currentHumanSeat = s;
          customOrderKeys = null;
          const ctrl = getCurrentController();
          if (ctrl && typeof ctrl.switchSeat === 'function') ctrl.switchSeat(s);
          selectedCards = [];
          updateUIFromController();
          ensureSeatSwitcher();
        };
        bar.appendChild(b);
      }
    }

    function ensureSortButton() {
      let btn = doc.getElementById('btn-sort-hand');
      if (!btn) {
        const hand0 = doc.getElementById('hand-0');
        const parent = hand0 && hand0.parentNode;
        if (parent) {
          btn = doc.createElement('button');
          btn.id = 'btn-sort-hand';
          btn.type = 'button';
          btn.className = 'text-[10px] px-2 py-0.5 border border-[#5c4630] rounded-full hover:border-[#c9a227] ml-2';
          btn.textContent = 'Sort low→high';
          btn.onclick = () => resetHandOrder();
          const header = parent.querySelector('.flex.justify-between') || parent;
          header.appendChild(btn);
        }
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
          if (k === 'p' || k === 'enter') {
            e.preventDefault();
            playSelected();
          } else if (k === 's' || k === ' ') {
            e.preventDefault();
            doPass();
          } else if (k === 'c' || k === 'escape') {
            e.preventDefault();
            clearSelection();
          } else if (k === 'h') {
            e.preventDefault();
            if (typeof window !== 'undefined' && window.requestHint) window.requestHint();
          } else if (k === 'n') {
            e.preventDefault();
            if (typeof window !== 'undefined' && window.newRound) window.newRound();
          } else if (k === 'r') {
            e.preventDefault();
            resetHandOrder();
          }
        });
      }

      // Auto-open friends join if ?room= present on load
      try {
        if (typeof location !== 'undefined') {
          const params = new URLSearchParams(location.search || '');
          if (params.get('room')) {
            setTimeout(() => showFriendsLobby(4), 100);
          }
        }
      } catch (_) {}

      if (typeof window !== 'undefined') {
        window.TienLenUI = {
          updateUI, startVsAI, startLive, startHotseat, playSelected, doPass,
          clearSelection, ensureSeatSwitcher, resetHandOrder, showFriendsLobby
        };
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
        setTimeout(() => { try { o.stop(); ctx.close && ctx.close(); } catch (_) {} }, 280);
      } catch (_) {}
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
      startHotseat,
      showFriendsLobby,
      ensureSeatSwitcher,
      resetHandOrder,
      // pure helpers for tests
      sortHandDefault,
      applyHandOrder,
      reorderCards,
      orderKeys,
      getDisplayHand,
      boot,
      playSound,
      _setController(c) { controller = c; },
      _getSelected() { return selectedCards.slice(); },
      _getCustomOrderKeys() { return customOrderKeys ? customOrderKeys.slice() : null; },
      _setCustomOrderKeys(k) { customOrderKeys = k ? k.slice() : null; }
    };
  }

  return createUI;
}));
