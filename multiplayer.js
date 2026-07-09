/**
 * multiplayer.js — Host/join real-time multiplayer for Tiến Lên
 * Uses PeerJS free cloud signaling (works on GitHub Pages static hosting).
 * Host is game authority; guests send intents; host applies and broadcasts state.
 *
 * API:
 *   createMultiplayer({ controller, onState, onStatus, onPeerJoin, PeerClass })
 *   .hostGame({ numPlayers, displayName })
 *   .joinGame({ roomCode, displayName })
 *   .sendAction({ type, seat, cards })
 *   .getRoomInfo()
 *   .disconnect()
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TienLenMultiplayer = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const ROOM_PREFIX = 'tienglen-';

  function randomCode(len) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < (len || 5); i++) {
      s += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return s;
  }

  function makeRoomId(code) {
    return ROOM_PREFIX + String(code).toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function parseRoomCode(input) {
    if (!input) return '';
    let s = String(input).trim().toUpperCase();
    // Accept full peer id or bare code
    if (s.indexOf(ROOM_PREFIX.toUpperCase()) === 0) {
      s = s.slice(ROOM_PREFIX.length);
    }
    // Accept URL with ?room=
    try {
      if (s.indexOf('ROOM=') >= 0) {
        const m = /ROOM=([A-Z0-9]+)/i.exec(s);
        if (m) s = m[1];
      }
    } catch (_) {}
    return s.replace(/[^A-Z0-9]/g, '').slice(0, 8);
  }

  function createMultiplayer(opts = {}) {
    let controller = opts.controller || null;
    const onState = opts.onState || function () {};
    const onStatus = opts.onStatus || function () {};
    const onPeerJoin = opts.onPeerJoin || function () {};
    const onError = opts.onError || function () {};
    const PeerClass = opts.PeerClass || (typeof Peer !== 'undefined' ? Peer : null);

    let role = null; // 'host' | 'guest'
    let peer = null;
    let roomCode = null;
    let connections = {}; // peerId -> DataConnection
    let mySeat = 0;
    let displayName = 'Player';
    let seatNames = {};
    let nextGuestSeat = 1;
    let numPlayers = 4;
    let destroyed = false;

    function setStatus(msg, level) {
      onStatus({ message: msg, level: level || 'info', role, roomCode, mySeat });
    }

    function broadcast(msg) {
      const data = typeof msg === 'string' ? msg : JSON.stringify(msg);
      Object.keys(connections).forEach(id => {
        const c = connections[id];
        try {
          if (c && c.open) c.send(data);
        } catch (_) {}
      });
    }

    function sendTo(conn, msg) {
      try {
        if (conn && conn.open) conn.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
      } catch (_) {}
    }

    function fullSyncPayload() {
      const st = controller && controller.getState ? controller.getState() : null;
      return {
        type: 'full_sync',
        state: st,
        seatNames: Object.assign({}, seatNames),
        numPlayers,
        hostSeat: 0
      };
    }

    function handleHostMessage(conn, raw) {
      let msg;
      try { msg = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (_) { return; }
      if (!msg || !msg.type) return;

      if (msg.type === 'hello') {
        // Assign seat to joining guest
        let seat = msg.preferredSeat;
        if (typeof seat !== 'number' || seat < 1 || seat >= numPlayers || seatNames[seat]) {
          seat = nextGuestSeat;
          while (seat < numPlayers && seatNames[seat]) seat++;
          if (seat >= numPlayers) {
            sendTo(conn, { type: 'error', message: 'Room is full' });
            return;
          }
        }
        nextGuestSeat = seat + 1;
        seatNames[seat] = msg.displayName || ('Player ' + seat);
        conn._tlSeat = seat;
        sendTo(conn, {
          type: 'welcome',
          seat,
          roomCode,
          numPlayers,
          seatNames: Object.assign({}, seatNames),
          state: controller.getState()
        });
        broadcast({ type: 'peer_joined', seat, name: seatNames[seat], seatNames: Object.assign({}, seatNames) });
        onPeerJoin({ seat, name: seatNames[seat] });
        setStatus((seatNames[seat] || 'Guest') + ' joined as P' + seat, 'ok');
        return;
      }

      if (msg.type === 'action') {
        // Guest requests play/pass; host applies if valid for that seat
        const seat = conn._tlSeat;
        if (typeof seat !== 'number') return;
        if (!controller) return;
        const st = controller.getState();
        if (st.currentPlayer !== seat) {
          sendTo(conn, { type: 'error', message: 'Not your turn' });
          sendTo(conn, fullSyncPayload());
          return;
        }
        let res;
        if (msg.action === 'play' && msg.cards) {
          res = controller.playHuman(seat, msg.cards);
        } else if (msg.action === 'pass') {
          res = controller.passHuman(seat);
        }
        if (res && res.ok) {
          broadcast(fullSyncPayload());
          onState(controller.getState(), { type: msg.action, seat });
        } else {
          sendTo(conn, { type: 'error', message: (res && res.error) || 'Illegal move' });
          sendTo(conn, fullSyncPayload());
        }
        return;
      }

      if (msg.type === 'request_sync') {
        sendTo(conn, fullSyncPayload());
      }
    }

    function handleGuestMessage(raw) {
      let msg;
      try { msg = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (_) { return; }
      if (!msg || !msg.type) return;

      if (msg.type === 'welcome') {
        mySeat = msg.seat;
        seatNames = msg.seatNames || {};
        numPlayers = msg.numPlayers || numPlayers;
        if (controller && msg.state) controller.applyRemoteState(msg.state);
        setStatus('Joined room ' + roomCode + ' as P' + mySeat, 'ok');
        onState(controller ? controller.getState() : msg.state, { type: 'welcome', seat: mySeat });
        return;
      }

      if (msg.type === 'full_sync' || msg.type === 'sync') {
        if (controller && msg.state) controller.applyRemoteState(msg.state);
        if (msg.seatNames) seatNames = msg.seatNames;
        onState(controller ? controller.getState() : msg.state, { type: 'sync' });
        return;
      }

      if (msg.type === 'peer_joined') {
        seatNames = msg.seatNames || seatNames;
        setStatus((msg.name || 'Player') + ' joined (P' + msg.seat + ')', 'info');
        onPeerJoin({ seat: msg.seat, name: msg.name });
        return;
      }

      if (msg.type === 'error') {
        setStatus(msg.message || 'Error', 'error');
        onError(msg.message);
      }
    }

    function wireConnection(conn, asHost) {
      connections[conn.peer] = conn;
      conn.on('data', (raw) => {
        if (asHost) handleHostMessage(conn, raw);
        else handleGuestMessage(raw);
      });
      conn.on('close', () => {
        delete connections[conn.peer];
        if (asHost && typeof conn._tlSeat === 'number') {
          const s = conn._tlSeat;
          const name = seatNames[s];
          delete seatNames[s];
          setStatus((name || 'P' + s) + ' left', 'warn');
          broadcast({ type: 'peer_left', seat: s, seatNames: Object.assign({}, seatNames) });
        }
      });
      conn.on('error', (e) => {
        setStatus('Connection error: ' + (e && e.message ? e.message : e), 'error');
      });
    }

    function ensurePeerClass() {
      if (!PeerClass) {
        throw new Error('PeerJS not loaded. Include peerjs CDN script for online multiplayer.');
      }
    }

    /**
     * Host a new room. Returns { roomCode, peerId, shareUrl }.
     */
    function hostGame(cfg = {}) {
      ensurePeerClass();
      destroyPeerOnly();
      role = 'host';
      numPlayers = cfg.numPlayers || 4;
      displayName = cfg.displayName || 'Host';
      mySeat = 0;
      seatNames = { 0: displayName };
      nextGuestSeat = 1;
      roomCode = (cfg.roomCode && parseRoomCode(cfg.roomCode)) || randomCode(5);
      const peerId = makeRoomId(roomCode);

      if (controller && controller.reconfigure) {
        controller.reconfigure({
          vsAI: false,
          numPlayers,
          humanSeats: [0], // host local seat; remote humans send actions to host
          currentHumanSeat: 0,
          seed: cfg.seed != null ? cfg.seed : Date.now()
        });
        // Mark all seats as human for online (no AI unless host enables fill)
        if (cfg.fillWithAI) {
          // humanSeats only host; AI fills rest — handled by controller vsAI
          controller.reconfigure({
            vsAI: true,
            numPlayers,
            humanSeats: [0],
            currentHumanSeat: 0,
            seed: cfg.seed != null ? cfg.seed : Date.now()
          });
        } else {
          // All seats potentially human; host only acts for seat 0 locally
          const allSeats = [];
          for (let i = 0; i < numPlayers; i++) allSeats.push(i);
          // Host controller: only seat 0 is "local human" for AI skip; remote seats
          // are not AI — they wait for guest actions. So humanSeats = all, but local UI only seat 0.
          controller.reconfigure({
            vsAI: false,
            numPlayers,
            humanSeats: allSeats,
            currentHumanSeat: 0,
            seed: cfg.seed != null ? cfg.seed : Date.now()
          });
        }
      }

      setStatus('Creating room ' + roomCode + '…', 'info');

      return new Promise((resolve, reject) => {
        try {
          peer = new PeerClass(peerId, cfg.peerOptions || undefined);
        } catch (e) {
          reject(e);
          return;
        }
        peer.on('open', (id) => {
          setStatus('Room ready: ' + roomCode + ' — share with friends', 'ok');
          const shareUrl = buildShareUrl(roomCode);
          resolve({ roomCode, peerId: id, shareUrl, role: 'host', mySeat: 0 });
        });
        peer.on('connection', (conn) => {
          conn.on('open', () => {
            wireConnection(conn, true);
            setStatus('Someone is connecting…', 'info');
          });
        });
        peer.on('error', (e) => {
          const msg = e && e.message ? e.message : String(e);
          setStatus('Host error: ' + msg, 'error');
          // If ID taken, retry with new code
          if (String(msg).indexOf('taken') >= 0 || (e && e.type === 'unavailable-id')) {
            roomCode = randomCode(5);
            reject(new Error('Room code taken — try again'));
          } else {
            reject(e);
          }
        });
      });
    }

    /**
     * Join an existing room by code.
     */
    function joinGame(cfg = {}) {
      ensurePeerClass();
      destroyPeerOnly();
      role = 'guest';
      displayName = cfg.displayName || 'Guest';
      roomCode = parseRoomCode(cfg.roomCode);
      if (!roomCode) return Promise.reject(new Error('Enter a valid room code'));

      const hostId = makeRoomId(roomCode);
      setStatus('Joining room ' + roomCode + '…', 'info');

      return new Promise((resolve, reject) => {
        try {
          peer = new PeerClass(cfg.peerOptions || undefined); // random guest id
        } catch (e) {
          reject(e);
          return;
        }
        peer.on('open', () => {
          const conn = peer.connect(hostId, { reliable: true });
          conn.on('open', () => {
            wireConnection(conn, false);
            sendTo(conn, {
              type: 'hello',
              displayName,
              preferredSeat: cfg.preferredSeat
            });
            // Resolve after welcome (or timeout)
            const t = setTimeout(() => {
              resolve({ roomCode, role: 'guest', mySeat, shareUrl: buildShareUrl(roomCode) });
            }, 2500);
            const prevOnState = onState;
            // welcome handler sets mySeat; we already resolve with current mySeat after short wait
            void prevOnState;
            resolve({ roomCode, role: 'guest', peerId: peer.id, hostId, shareUrl: buildShareUrl(roomCode), mySeat });
            clearTimeout(t);
          });
          conn.on('error', (e) => {
            setStatus('Join failed: ' + (e.message || e), 'error');
            reject(e);
          });
        });
        peer.on('error', (e) => {
          setStatus('Peer error: ' + (e.message || e), 'error');
          reject(e);
        });
      });
    }

    function buildShareUrl(code) {
      try {
        if (typeof location !== 'undefined' && location.href) {
          const u = new URL(location.href);
          u.searchParams.set('room', code);
          // strip hash noise
          return u.toString();
        }
      } catch (_) {}
      return '?room=' + code;
    }

    /**
     * Local player performs action. Host applies locally + broadcast.
     * Guest sends intent to host.
     */
    function sendAction(action) {
      if (role === 'host') {
        if (!controller) return { ok: false, error: 'no controller' };
        let res;
        if (action.type === 'play') res = controller.playHuman(mySeat, action.cards);
        else if (action.type === 'pass') res = controller.passHuman(mySeat);
        else return { ok: false, error: 'bad action' };
        if (res && res.ok) {
          broadcast(fullSyncPayload());
          onState(controller.getState(), action);
        }
        return res || { ok: false };
      }
      if (role === 'guest') {
        const conn = Object.values(connections)[0];
        if (!conn) return { ok: false, error: 'not connected' };
        sendTo(conn, {
          type: 'action',
          action: action.type,
          cards: action.cards || null,
          seat: mySeat
        });
        return { ok: true, pending: true };
      }
      return { ok: false, error: 'not in multiplayer' };
    }

    function getRoomInfo() {
      return {
        role,
        roomCode,
        mySeat,
        numPlayers,
        seatNames: Object.assign({}, seatNames),
        connected: Object.keys(connections).length,
        shareUrl: roomCode ? buildShareUrl(roomCode) : null,
        isOnline: !!role
      };
    }

    function setController(c) {
      controller = c;
    }

    function destroyPeerOnly() {
      try {
        Object.keys(connections).forEach(id => {
          try { connections[id].close(); } catch (_) {}
        });
      } catch (_) {}
      connections = {};
      if (peer) {
        try { peer.destroy(); } catch (_) {}
        peer = null;
      }
    }

    function disconnect() {
      destroyed = true;
      destroyPeerOnly();
      role = null;
      roomCode = null;
      setStatus('Disconnected', 'info');
    }

    // --- Logic-level sync helpers for unit tests (no PeerJS required) ---
    /**
     * Simulate host+guest over an in-memory bus (tests).
     * Returns { hostApply, guestReceive, getGuestView }
     */
    function createLocalBus() {
      let guestState = null;
      const hostApply = (action) => {
        if (!controller) return null;
        let res;
        if (action.type === 'play') res = controller.playHuman(action.seat, action.cards);
        else if (action.type === 'pass') res = controller.passHuman(action.seat);
        if (res && res.ok) {
          guestState = controller.getState();
        }
        return res;
      };
      const guestReceive = () => guestState;
      return { hostApply, guestReceive, getGuestView: () => guestState };
    }

    return {
      hostGame,
      joinGame,
      sendAction,
      getRoomInfo,
      setController,
      disconnect,
      parseRoomCode,
      makeRoomId,
      randomCode,
      createLocalBus,
      ROOM_PREFIX
    };
  }

  return { createMultiplayer, parseRoomCode: function (s) {
    const m = createMultiplayer({});
    return m.parseRoomCode(s);
  }, makeRoomId, randomCode, ROOM_PREFIX };
}));
