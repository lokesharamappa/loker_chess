(() => {
  const $ = (id) => document.getElementById(id);

  const socket = (typeof window !== 'undefined' && typeof window.io === 'function')
    ? window.io()
    : { emit: () => {}, on: () => {} };
  let roomId = null;
  let color = 'spectator';
  let chess = null;
  let board = null;
  let ended = false;
  let mode = 'online'; // 'online' or 'cpu'
  let humanColor = null; // 'w' or 'b' in cpu mode
  let cpuColor = null;
  const MOVES_EL = 'movesContainer';
  const CLOCK_W_EL = 'clockWhite';
  const CLOCK_B_EL = 'clockBlack';
  const START_TIME_MS = 5 * 60 * 1000; // 5+0 clocks
  let wTimeMs = START_TIME_MS;
  let bTimeMs = START_TIME_MS;
  let clockTimer = null;
  let lastTick = null;
  let cpuDepth = 2; // default Medium; controlled by difficultySelect
  let analysisQuickDepth = 2; // quick eval depth (analysis slider)
  let analysisDeepDepth = 4; // deeper eval depth (Deeper Eval button)
  let cpuMoves = null; // [{san, delta_ms, ts}] in vs-computer
  let lastPlyTsCpu = null;
  let selectedSquare = null;
  let lastMoveSquares = null; // {from,to}
  let premove = null; // {from,to}
  let serverSAN = null; // SAN history from server (online)
  let serverMoves = null; // [{san, ts}] for online
  let inAnalysis = false;
  let lastCpuFen = null; // used to trigger CPU move once per position

  const roomInput = $('roomInput');
  const joinBtn = $('joinBtn');
  const vsCpuWhite = $('vsCpuWhite');
  const vsCpuBlack = $('vsCpuBlack');
  const gameEl = $('game');
  const roomLabel = $('roomLabel');
  const colorLabel = $('colorLabel');
  const turnLabel = $('turnLabel');
  const playersLabel = $('playersLabel');
  const notice = $('notice');
  const copyLinkBtn = $('copyLinkBtn');
  const restartBtn = $('restartBtn');
  const resignBtn = $('resignBtn');
  const backBtn = $('backBtn');
  const copyOk = $('copyOk');
  const exitCpuBtn = $('exitCpuBtn');
  const themeSelect = document.getElementById('themeSelect');
  const sizeSelect = document.getElementById('sizeSelect');
  const difficultySelect = document.getElementById('difficultySelect');
  const pgnBtn = document.getElementById('pgnBtn');
  const offerDrawBtn = document.getElementById('offerDrawBtn');
  const offerTakebackBtn = document.getElementById('offerTakebackBtn');
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const bannersEl = document.getElementById('banners');
  const enterAnalysisBtn = document.getElementById('enterAnalysisBtn');
  const exitAnalysisBtn = document.getElementById('exitAnalysisBtn');
  const analysisSlider = document.getElementById('analysisSlider');
  const evalBar = document.getElementById('evalBar');
  const analysisInfo = document.getElementById('analysisInfo');
  const analysisTicks = document.getElementById('analysisTicks');
  const boardOverlay = document.getElementById('boardOverlay');
  const muteAll = document.getElementById('muteAll');
  const sndMove = document.getElementById('sndMove');
  const sndCapture = document.getElementById('sndCapture');
  const sndCheck = document.getElementById('sndCheck');
  const sndGame = document.getElementById('sndGame');
  const deeperEvalBtn = document.getElementById('deeperEvalBtn');
  const toastStack = document.getElementById('toastStack');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPopover = document.getElementById('settingsPopover');
  const analysisQuickSel = document.getElementById('analysisQuickDepth');
  const analysisDeepSel = document.getElementById('analysisDeepDepth');

  // Initialize default theme
  if (!document.body.classList.contains('theme-classic')) {
    document.body.classList.add('theme-classic');
  }

  // ---- Preferences (localStorage) ----
  const PREF_KEY = 'chess_prefs_v1';
  function savePrefs() {
    try {
      const prefs = {
        theme: Array.from(document.body.classList).find(c => c.startsWith('theme-')) || 'theme-classic',
        size: sizeSelect?.value || '560',
        difficulty: difficultySelect?.value || '2',
        sound: {
          mute: !!muteAll?.checked,
          move: !!sndMove?.checked,
          capture: !!sndCapture?.checked,
          check: !!sndCheck?.checked,
          game: !!sndGame?.checked,
        },
        analysis: { quick: String(analysisQuickDepth), deep: String(analysisDeepDepth) },
      };
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    } catch {}
  }
  function loadPrefs() {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p.theme) {
        document.body.classList.remove('theme-classic', 'theme-green', 'theme-blue', 'theme-gray');
        document.body.classList.add(p.theme);
        if (themeSelect) themeSelect.value = p.theme.replace('theme-', '');
      }
      if (p.size && sizeSelect) {
        sizeSelect.value = String(p.size);
        const el = document.getElementById('board');
        if (el) el.style.width = `${parseInt(p.size,10)}px`;
      }
      if (p.difficulty && difficultySelect) {
        difficultySelect.value = String(p.difficulty);
        cpuDepth = Math.min(4, Math.max(1, parseInt(difficultySelect.value||'2',10)));
      }
      if (p.sound) {
        if (muteAll) muteAll.checked = !!p.sound.mute;
        if (sndMove) sndMove.checked = !!p.sound.move;
        if (sndCapture) sndCapture.checked = !!p.sound.capture;
        if (sndCheck) sndCheck.checked = !!p.sound.check;
        if (sndGame) sndGame.checked = !!p.sound.game;
      }
      if (p.analysis) {
        if (p.analysis.quick) analysisQuickDepth = Math.max(1, parseInt(p.analysis.quick,10)||2);
        if (p.analysis.deep) analysisDeepDepth = Math.max(2, parseInt(p.analysis.deep,10)||4);
        if (analysisQuickSel) analysisQuickSel.value = String(analysisQuickDepth);
        if (analysisDeepSel) analysisDeepSel.value = String(analysisDeepDepth);
      }
    } catch {}
  }
  loadPrefs();

  // ---- Opening Book (weighted) ----
  // Keys are SAN history prefixes (space-separated). Values are arrays of { san, w } with weights.
  const BOOK = {
    '': [
      { san: 'e4', w: 30 }, { san: 'd4', w: 25 }, { san: 'c4', w: 10 }, { san: 'Nf3', w: 15 }, { san: 'g3', w: 5 }, { san: 'b3', w: 2 }
    ],
    'e4': [ { san: 'e5', w: 25 }, { san: 'c5', w: 25 }, { san: 'e6', w: 10 }, { san: 'c6', w: 10 }, { san: 'd5', w: 6 }, { san: 'g6', w: 4 }, { san: 'd6', w: 5 } ],
    'd4': [ { san: 'd5', w: 25 }, { san: 'Nf6', w: 25 }, { san: 'g6', w: 8 }, { san: 'e6', w: 18 }, { san: 'c5', w: 6 }, { san: 'c6', w: 12 } ],
    'c4': [ { san: 'e5', w: 10 }, { san: 'Nf6', w: 25 }, { san: 'c5', w: 20 }, { san: 'e6', w: 20 }, { san: 'g6', w: 10 } ],
    'Nf3': [ { san: 'd5', w: 18 }, { san: 'Nf6', w: 28 }, { san: 'g6', w: 10 }, { san: 'c5', w: 10 }, { san: 'd6', w: 5 }, { san: 'e6', w: 15 } ],

    // Ruy Lopez / Italian / Scotch families
    'e4 e5': [ { san: 'Nf3', w: 60 }, { san: 'Bc4', w: 20 }, { san: 'Nc3', w: 5 }, { san: 'd4', w: 10 } ],
    'e4 e5 Nf3': [ { san: 'Nc6', w: 70 }, { san: 'Nf6', w: 15 }, { san: 'd6', w: 10 } ],
    'e4 e5 Nf3 Nc6': [ { san: 'Bb5', w: 55 }, { san: 'Bc4', w: 25 }, { san: 'd4', w: 10 }, { san: 'c3', w: 5 } ],
    'e4 e5 Nf3 Nc6 Bb5': [ { san: 'a6', w: 60 }, { san: 'Nf6', w: 25 } ],
    'e4 e5 Nf3 Nc6 Bc4': [ { san: 'Bc5', w: 55 }, { san: 'Nf6', w: 25 } ],
    'e4 e5 Bc4': [ { san: 'Nf6', w: 45 }, { san: 'Nc6', w: 45 } ],
    'e4 e5 d4': [ { san: 'exd4', w: 80 } ],

    // Sicilian Najdorf/Classical/Dragon ideas
    'e4 c5': [ { san: 'Nf3', w: 55 }, { san: 'c3', w: 10 }, { san: 'd4', w: 25 } ],
    'e4 c5 Nf3': [ { san: 'd6', w: 40 }, { san: 'Nc6', w: 35 }, { san: 'e6', w: 20 } ],
    'e4 c5 Nf3 d6': [ { san: 'd4', w: 65 }, { san: 'c3', w: 10 } ],
    'e4 c5 Nf3 Nc6': [ { san: 'd4', w: 60 }, { san: 'Bb5', w: 15 } ],
    'e4 c5 d4': [ { san: 'cxd4', w: 85 } ],
    'e4 c5 Nf3 d6 d4': [ { san: 'cxd4', w: 85 } ],

    // French
    'e4 e6': [ { san: 'd4', w: 60 }, { san: 'Nc3', w: 20 }, { san: 'Nd2', w: 15 } ],
    'e4 e6 d4': [ { san: 'd5', w: 85 } ],

    // Caro-Kann
    'e4 c6': [ { san: 'd4', w: 60 }, { san: 'Nc3', w: 20 }, { san: 'd3', w: 10 } ],
    'e4 c6 d4': [ { san: 'd5', w: 85 } ],

    // QGD / Slav / KID / Nimzo / Indian setups
    'd4 d5': [ { san: 'c4', w: 65 }, { san: 'Nf3', w: 20 } ],
    'd4 d5 c4': [ { san: 'e6', w: 45 }, { san: 'c6', w: 35 }, { san: 'dxc4', w: 8 } ],
    'd4 Nf6': [ { san: 'c4', w: 50 }, { san: 'Nf3', w: 30 }, { san: 'g3', w: 10 } ],
    'd4 Nf6 c4': [ { san: 'g6', w: 30 }, { san: 'e6', w: 35 }, { san: 'c5', w: 15 }, { san: 'd6', w: 10 } ],
    'd4 Nf6 c4 e6': [ { san: 'Nc3', w: 60 }, { san: 'Nf3', w: 25 } ],
    'd4 Nf6 c4 e6 Nc3': [ { san: 'Bb4', w: 45 }, { san: 'd5', w: 30 }, { san: 'b6', w: 10 } ],
    'd4 Nf6 c4 g6': [ { san: 'Nc3', w: 50 }, { san: 'e4', w: 20 }, { san: 'Nf3', w: 20 } ],
    'd4 d5 c4 e6 Nc3': [ { san: 'Nf6', w: 60 }, { san: 'Be7', w: 15 } ],
    'd4 d5 c4 c6': [ { san: 'Nf3', w: 50 }, { san: 'Nc3', w: 30 } ],

    // English / Reti
    'c4 e5': [ { san: 'Nc3', w: 45 }, { san: 'g3', w: 25 } ],
    'c4 Nf6': [ { san: 'Nc3', w: 45 }, { san: 'g3', w: 30 } ],
    'Nf3 d5': [ { san: 'g3', w: 45 }, { san: 'd4', w: 25 } ],
  };

  function pickWeighted(arr) {
    const total = arr.reduce((s, x) => s + (x.w || 1), 0);
    let r = Math.random() * total;
    for (const x of arr) { r -= (x.w || 1); if (r <= 0) return x; }
    return arr[arr.length - 1];
  }

  function getBookMove(chess) {
    const hist = chess.history(); // SAN
    // try longest prefix match
    for (let len = hist.length; len >= 0; len--) {
      const key = hist.slice(0, len).join(' ');
      if (Object.prototype.hasOwnProperty.call(BOOK, key)) {
        const candidates = BOOK[key];
        // map to legal moves with san
        const legal = chess.moves({ verbose: true });
        const bySan = new Map(legal.map(m => [m.san, m]));
        const valids = candidates.filter(c => bySan.has(c.san));
        if (valids.length === 0) continue;
        const pick = pickWeighted(valids);
        const mv = bySan.get(pick.san);
        return { from: mv.from, to: mv.to, promotion: mv.promotion || 'q' };
      }
    }
    return null;
  }

  // ---- Global Toasts ----
  function pushToast({ type = 'info', text = '', duration = 3500, buttons = [] } = {}) {
    if (!toastStack) return;
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.style.cssText = 'display:flex; align-items:center; gap:8px; padding:10px 12px; border-radius:8px; border:1px solid #334155; background:#0b1220; color:#e2e8f0; box-shadow:0 6px 16px rgba(0,0,0,0.35)';
    const icon = document.createElement('span');
    icon.textContent = type === 'success' ? '✔' : type === 'error' ? '⚠' : type === 'confirm' ? '❓' : 'ℹ';
    const msg = document.createElement('div');
    msg.textContent = text;
    const acts = document.createElement('div');
    acts.style.display = 'inline-flex';
    acts.style.gap = '6px';
    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.textContent = b.label;
      btn.onclick = () => { try { b.onClick?.(); } finally { t.remove(); } };
      acts.appendChild(btn);
    }
    t.appendChild(icon);
    t.appendChild(msg);
    if (buttons && buttons.length) t.appendChild(acts);
    toastStack.appendChild(t);
    if (!buttons || buttons.length === 0) setTimeout(() => t.remove(), duration);
  }

  function formatDelta(ms) {
    const s = Math.round(ms / 1000);
    const m = Math.floor(s / 60);
    const ss = String(s % 60).padStart(2, '0');
    return m > 0 ? `${m}:${ss}` : `${ss}`;
  }

  // ------- Overlay arrows for premove -------
  function drawOverlay() {
    const cvs = boardOverlay;
    const boardEl = document.getElementById('board');
    if (!cvs || !boardEl) return;
    const rect = boardEl.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.width); // square
    cvs.width = w; cvs.height = h;
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    if (!premove || !premove.from || !premove.to) return;
    const fromPt = squareToPoint(premove.from, w, h);
    const toPt = squareToPoint(premove.to, w, h);
    if (!fromPt || !toPt) return;
    ctx.strokeStyle = '#22d3ee';
    ctx.fillStyle = '#22d3ee';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    // line
    ctx.beginPath();
    ctx.moveTo(fromPt.x, fromPt.y);
    ctx.lineTo(toPt.x, toPt.y);
    ctx.stroke();
    // arrow head
    const angle = Math.atan2(toPt.y - fromPt.y, toPt.x - fromPt.x);
    const ah = 12;
    ctx.beginPath();
    ctx.moveTo(toPt.x, toPt.y);
    ctx.lineTo(toPt.x - ah * Math.cos(angle - Math.PI / 6), toPt.y - ah * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toPt.x - ah * Math.cos(angle + Math.PI / 6), toPt.y - ah * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    // from/to circles
    ctx.beginPath(); ctx.arc(fromPt.x, fromPt.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(toPt.x, toPt.y, 8, 0, Math.PI * 2); ctx.fill();
  }

  function squareToPoint(sq, w, h) {
    const file = sq.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(sq[1], 10) - 1;
    const viewBlack = (mode === 'cpu' ? humanColor : color) === 'b';
    const xIdx = viewBlack ? 7 - file : file;
    const yIdx = viewBlack ? rank : 7 - rank;
    const cell = w / 8;
    return { x: Math.round(xIdx * cell + cell / 2), y: Math.round(yIdx * cell + cell / 2) };
  }

  window.addEventListener('resize', drawOverlay);

  function updateStatus() {
    if (!chess) return;
    turnLabel.textContent = chess.turn() === 'w' ? 'White' : 'Black';

    let msg = '';
    if ((typeof chess.isCheckmate === 'function' && chess.isCheckmate()) ||
        (typeof chess.in_checkmate === 'function' && chess.in_checkmate())) {
      msg = 'Checkmate! ' + (chess.turn() === 'w' ? 'Black' : 'White') + ' wins';
    } else if ((typeof chess.isDraw === 'function' && chess.isDraw()) ||
               (typeof chess.in_draw === 'function' && chess.in_draw())) {
      msg = 'Draw';
    } else if ((typeof chess.isCheck === 'function' && chess.isCheck()) ||
               (typeof chess.in_check === 'function' && chess.in_check())) {
      msg = 'Check!';
    }

  // ---- Sounds ----
  let audioCtx;
  // Try playing natural clips from /sounds first; fallback to synth
  const soundCache = {};
  function isSoundEnabled(kind) {
    if (muteAll?.checked) return false;
    if (kind === 'capture') return !!sndCapture?.checked;
    if (kind === 'check') return !!sndCheck?.checked;
    if (kind === 'game') return !!sndGame?.checked;
    return !!sndMove?.checked;
  }

  function playMoveSound(kind = 'move') {
    if (!isSoundEnabled(kind)) return;
    try {
      const file = kind === 'capture' ? '/sounds/capture.mp3'
                 : kind === 'check' ? '/sounds/check.mp3'
                 : kind === 'game' ? '/sounds/game.mp3'
                 : '/sounds/move.mp3';
      if (soundCache[file]) {
        soundCache[file].currentTime = 0;
        soundCache[file].play().catch(() => {});
        return;
      }
      const audio = new Audio(file);
      soundCache[file] = audio;
      audio.play().catch(() => synth(kind));
    } catch (e) {
      synth(kind);
    }
    // clear premove overlay if any
    premove = null;
    drawOverlay();
  }

  function synth(kind) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      const freq = kind === 'capture' ? 520 : kind === 'check' ? 760 : kind === 'game' ? 420 : 660;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.09, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.16);
      o.connect(g); g.connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + 0.16);
    } catch {}
  }

  // ---- Click-to-move and highlights ----
  function bindClickToMove() {
    const boardEl = document.getElementById('board');
    if (!boardEl) return;
    boardEl.addEventListener('click', (e) => {
      const sq = findSquareFromEvent(e);
      if (!sq || !chess || ended) return;

      const mover = mode === 'cpu' ? humanColor : color;
      // If no selection yet, only allow selecting a square with our piece and on our turn
      if (!selectedSquare) {
        const piece = getPieceOnSquare(sq);
        const turn = chess.turn();
        if (!piece) return;
        if (mover === 'w' && piece.color !== 'w') return;
        if (mover === 'b' && piece.color !== 'b') return;
        if (mover !== turn) {
          // allow premove selection when it's not your turn
          selectedSquare = sq;
          drawSelectionAndDests(sq);
          return;
        }
        selectedSquare = sq;
        drawSelectionAndDests(sq);
        return;
      }

      // If clicking the same color piece again, change selection
      if (selectedSquare && sq !== selectedSquare) {
        const pieceAtTarget = getPieceOnSquare(sq);
        if (pieceAtTarget && pieceAtTarget.color === (mode === 'cpu' ? humanColor : color)) {
          selectedSquare = sq;
          drawSelectionAndDests(sq);
          return;
        }
      }

      // Try move from selected to clicked
      const from = selectedSquare;
      const to = sq;
      // If it's not our turn, queue a premove
      if ((mode === 'cpu' ? humanColor : color) !== chess.turn()) {
        premove = { from, to };
        refreshLastMoveHighlight();
        clearSelection();
        return;
      }
      const legal = chess.move({ from, to, promotion: 'q' });
      if (!legal) { drawSelectionAndDests(selectedSquare); return; }

      // Legal: update board and emit if online
      if (board) board.position(chess.fen());
      renderMoves();
      kickClock();
      setLastMoveHighlight({ from, to });
      // sound selection
      let soundKind = 'move';
      if (typeof chess.isCheck === 'function' && chess.isCheck()) soundKind = 'check';
      playMoveSound(soundKind);
      const payload = { from, to, promotion: 'q' };
      if (mode === 'online') {
        socket.emit('move', payload);
      } else if (mode === 'cpu') {
        // record human ply timing
        try {
          const now = Date.now();
          const delta = now - (lastPlyTsCpu || now);
          if (Array.isArray(cpuMoves)) cpuMoves.push({ san: legal?.san, delta_ms: delta, ts: now });
          lastPlyTsCpu = now;
        } catch {}
        setTimeout(() => maybeCpuMove(), 150);
      }
      clearSelection();
    });
  // Sound pref changes
  [muteAll, sndMove, sndCapture, sndCheck, sndGame].forEach(el => el?.addEventListener('change', savePrefs));

  difficultySelect?.addEventListener('change', () => {
    const val = parseInt(difficultySelect.value || '2', 10);
    cpuDepth = Math.min(4, Math.max(1, val));
    savePrefs();
  });

  // Settings popover events
  settingsBtn?.addEventListener('click', () => {
    if (!settingsPopover) return;
    const visible = settingsPopover.style.display !== 'none';
    settingsPopover.style.display = visible ? 'none' : 'block';
  });
  analysisQuickSel?.addEventListener('change', () => {
    analysisQuickDepth = Math.max(1, parseInt(analysisQuickSel.value||'2',10));
    savePrefs();
  });
  analysisDeepSel?.addEventListener('change', () => {
    analysisDeepDepth = Math.max(2, parseInt(analysisDeepSel.value||'4',10));
    savePrefs();
  });

  pgnBtn?.addEventListener('click', () => {
    if (!chess) return;
    const pgn = chess.pgn ? chess.pgn() : '';
    const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-${new Date().toISOString().replace(/[:.]/g,'-')}.pgn`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // Chat
  chatSendBtn?.addEventListener('click', () => {
    const txt = (chatInput?.value || '').trim();
    if (!txt || mode !== 'online') return;
    socket.emit('chat', txt);
    chatInput.value = '';
  });
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') chatSendBtn?.click();
  });
  }

  function findSquareFromEvent(e) {
    const target = e.target.closest('div[class*="square-"]');
    if (!target) return null;
    const classes = Array.from(target.classList);
    for (const cls of classes) {
      const m = cls.match(/^square-([a-h][1-8])$/);
      if (m) return m[1];
    }
    return null;
  }

  function getPieceOnSquare(sq) {
    const moves = chess.moves({ square: sq, verbose: true });
    // We can infer color from board representation
    const boardArr = chess.board();
    const file = sq.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(sq[1], 10) - 1;
    const piece = boardArr[rank] && boardArr[rank][file];
    return piece || null;
  }

  function drawSelectionAndDests(sq) {
    clearHighlights();
    highlightSquare(sq, 'square-highlight');
    const dests = chess.moves({ square: sq, verbose: true }) || [];
    for (const m of dests) highlightSquare(m.to, 'square-dest');
  }

  function clearSelection() {
    selectedSquare = null;
    clearHighlights();
  }

  function clearHighlights() {
    const boardEl = document.getElementById('board');
    if (!boardEl) return;
    boardEl.querySelectorAll('.square-highlight, .square-dest').forEach((el) => {
      el.classList.remove('square-highlight', 'square-dest');
    });
  }

  function highlightSquare(sq, cls) {
    const boardEl = document.getElementById('board');
    if (!boardEl) return;
    const el = boardEl.querySelector(`.square-${sq}`);
    if (el) el.classList.add(cls);
  }

  function setLastMoveHighlight(m) {
    lastMoveSquares = m;
    refreshLastMoveHighlight();
    drawOverlay();
  }

  function refreshLastMoveHighlight() {
    const boardEl = document.getElementById('board');
    if (!boardEl) return;
    // clear old
    boardEl.querySelectorAll('.square-lastmove').forEach((el) => el.classList.remove('square-lastmove'));
    boardEl.querySelectorAll('.square-premove').forEach((el) => el.classList.remove('square-premove'));
    if (lastMoveSquares && lastMoveSquares.from && lastMoveSquares.to) {
      const a = boardEl.querySelector(`.square-${lastMoveSquares.from}`);
      const b = boardEl.querySelector(`.square-${lastMoveSquares.to}`);
      if (a) a.classList.add('square-lastmove');
      if (b) b.classList.add('square-lastmove');
    }
    if (premove && premove.from && premove.to) {
      const a2 = boardEl.querySelector(`.square-${premove.from}`);
      const b2 = boardEl.querySelector(`.square-${premove.to}`);
      if (a2) a2.classList.add('square-premove');
      if (b2) b2.classList.add('square-premove');
    }
    drawOverlay();
  }
    if (ended && !msg) {
      msg = 'Game over';
    }
    notice.textContent = msg;
  }

  function onDragStart(source, piece) {
    if (!chess) return false;
    // disallow drag if game over
    const gameOver = (typeof chess.isGameOver === 'function' && chess.isGameOver()) ||
                     (typeof chess.game_over === 'function' && chess.game_over());
    if (gameOver || ended) return false;

    // only allow dragging own pieces, and only on your turn
    const turn = chess.turn();
    const mover = mode === 'cpu' ? humanColor : color;
    if (mover === 'w' && piece.startsWith('b')) return false;
    if (mover === 'b' && piece.startsWith('w')) return false;
    if ((mover === 'w' && turn !== 'w') || (mover === 'b' && turn !== 'b')) return false;

    return true;
  }

  function onDrop(source, target) {
    // attempt the move locally first to validate
    const mv = chess.move({ from: source, to: target, promotion: 'q' });
    if (!mv) return 'snapback';

    renderMoves();
    kickClock();
    setLastMoveHighlight({ from: source, to: target });
    clearSelection();
    // Drag-settle safety: briefly block pointer events to ensure drag state clears
    try {
      if (boardOverlay) {
        boardOverlay.style.pointerEvents = 'auto';
        setTimeout(() => { try { boardOverlay.style.pointerEvents = 'none'; } catch {} }, 120);
      }
    } catch {}
    let kind = mv.captured ? 'capture' : 'move';
    if (typeof chess.isCheck === 'function' && chess.isCheck()) kind = 'check';
    playMoveSound(kind);

    if (mode === 'online') {
      // emit to server
      socket.emit('move', { from: source, to: target, promotion: 'q' });
    } else if (mode === 'cpu') {
      // record human ply timing
      try {
        const now = Date.now();
        const delta = now - (lastPlyTsCpu || now);
        if (Array.isArray(cpuMoves)) cpuMoves.push({ san: mv?.san, delta_ms: delta, ts: now });
        lastPlyTsCpu = now;
      } catch {}
      // after human moves, trigger cpu if not game over
      setTimeout(() => maybeCpuMove(), 150);
    }
  }

  function onSnapEnd() {
    if (board) {
      board.position(chess.fen());
      if (typeof board.resize === 'function') {
        try { board.resize(); } catch {}
      }
    }
    updateStatus();
  }

  function initBoard(fen) {
    if (!chess) chess = new window.Chess();
    if (fen) chess.load(fen);

    const cfg = {
      draggable: true,
      position: chess.fen(),
      orientation: (mode === 'cpu' ? humanColor : color) === 'b' ? 'black' : 'white',
      pieceTheme: './img/chess/{piece}.png',
      moveSpeed: 150,
      snapSpeed: 30,
      snapbackSpeed: 50,
      onDragStart,
      onDrop,
      onSnapEnd,
    };
    if (board) {
      board.orientation((mode === 'cpu' ? humanColor : color) === 'b' ? 'black' : 'white');
      board.position(chess.fen());
    } else {
      board = window.Chessboard('board', cfg);
      bindClickToMove();
    }
    updateStatus();
    renderMoves();
    ensureClockRunning();
    refreshLastMoveHighlight();
  }

  joinBtn.addEventListener('click', () => {
    const val = (roomInput.value || '').trim();
    if (!val) {
      alert('Enter a room ID');
      return;
    }
    mode = 'online';
    roomId = val;
    roomLabel.textContent = roomId;

    // switch UI
    document.querySelector('.lobby').classList.add('hidden');
    gameEl.classList.remove('hidden');

    socket.emit('join', roomId);
    // show online-only controls
    copyLinkBtn.style.display = '';
    exitCpuBtn.style.display = 'none';
  });

  // URL auto-join: ?room=xyz
  (function autoJoinFromUrl() {
    const params = new URLSearchParams(location.search);
    const r = params.get('room');
    if (r) {
      mode = 'online';
      roomId = r.trim();
      roomLabel.textContent = roomId;
      document.querySelector('.lobby').classList.add('hidden');
      gameEl.classList.remove('hidden');
      socket.emit('join', roomId);
      copyLinkBtn.style.display = '';
      exitCpuBtn.style.display = 'none';
    }
    // Auto-start vs-computer via ?cpu=w or ?cpu=b
    const cpuParam = params.get('cpu');
    if (cpuParam === 'w' || cpuParam === 'b') {
      // Ensure chess.js is present, then start
      ensureChessJsRuntime(() => startVsCpu(cpuParam));
    }
  })();

  // Socket events
  socket.on('error_message', (msg) => {
    alert(msg);
  });

  socket.on('init', (data) => {
    if (mode !== 'online') return; // ignore when in cpu mode
    color = data.color || 'spectator';
    colorLabel.textContent = color === 'w' ? 'White' : color === 'b' ? 'Black' : 'Spectator';

    if (!chess) chess = new window.Chess();
    if (data.fen) chess.load(data.fen);
    ended = !!data.gameOver;

    initBoard(data.fen);
    updateStatus();
    if (Array.isArray(data.history)) {
      serverSAN = data.history.map(h => (h && h.move && h.move.san) ? h.move.san : null).filter(Boolean);
      serverMoves = data.history.map(h => (h && h.move && (h.move.san || h.move.ts)) ? { san: h.move.san, ts: h.move.ts, delta_ms: h.move.delta_ms } : null).filter(Boolean);
      if (data.history.length > 0) {
        const last = data.history[data.history.length - 1];
        if (last && last.move) setLastMoveHighlight({ from: last.move.from, to: last.move.to });
      }
      renderMoves();
    }
  });

  socket.on('players', ({ w, b }) => {
    if (mode !== 'online') return;
    const parts = [];
    parts.push(w ? 'White: joined' : 'White: waiting');
    parts.push(b ? 'Black: joined' : 'Black: waiting');
    playersLabel.textContent = parts.join(' | ');
  });

  socket.on('move', (state) => {
    if (mode !== 'online') return;
    if (!chess) chess = new window.Chess();
    if (state.fen) chess.load(state.fen);
    if (board) board.position(chess.fen());
    ended = !!(state.checkmate || state.draw || state.gameOver);
    updateStatus();
    renderMoves();
    kickClock();
    if (state.move && state.move.from && state.move.to) {
      setLastMoveHighlight({ from: state.move.from, to: state.move.to });
    }
    let kind = 'move';
    if (state.move && state.move.captured) kind = 'capture';
    if (state.checkmate) kind = 'game';
    else if (state.check) kind = 'check';
    playMoveSound(kind);
    // attempt to apply queued premove if it's now our turn
    tryApplyPremove();
    if (serverSAN && state.move && state.move.san) serverSAN.push(state.move.san);
    if (serverMoves && state.move && (state.move.san || state.move.ts)) serverMoves.push({ san: state.move.san, ts: state.move.ts, delta_ms: state.move.delta_ms });
    renderMoves();
  });

  socket.on('illegal_move', ({ from, to }) => {
    if (mode !== 'online') return;
    // reload current position to snap back
    if (board && chess) board.position(chess.fen());
  });

  socket.on('restart', (state) => {
    if (mode !== 'online') return;
    if (!chess) chess = new window.Chess();
    if (state && state.fen) chess.load(state.fen);
    ended = false;
    if (board) board.position(chess.fen());
    notice.textContent = '';
    updateStatus();
    resetClocks();
    renderMoves();
    clearSelection();
    lastMoveSquares = null;
    refreshLastMoveHighlight();
  });

  // Draw / Takeback UI and handlers
  offerDrawBtn?.addEventListener('click', () => { if (mode === 'online') socket.emit('offer_draw'); });
  offerTakebackBtn?.addEventListener('click', () => { if (mode === 'online') socket.emit('offer_takeback'); });

  function showBanner(key, text, buttons) {
    // Render banners via global toast stack
    pushToast({ type: (buttons && buttons.length) ? 'confirm' : 'info', text, buttons });
  }

  socket.on('draw_offered', () => {
    if (mode !== 'online') return;
    showBanner('draw', 'Opponent offers a draw.', [
      { label: 'Accept', onClick: () => socket.emit('respond_draw', true) },
      { label: 'Decline', onClick: () => socket.emit('respond_draw', false) },
    ]);
  });
  socket.on('draw_rejected', () => {
    if (mode !== 'online') return;
    showBanner('draw_info', 'Draw offer rejected', [ { label: 'Close', onClick: () => {} } ]);
  });

  socket.on('takeback_offered', () => {
    if (mode !== 'online') return;
    showBanner('takeback', 'Opponent requests a takeback.', [
      { label: 'Accept', onClick: () => socket.emit('respond_takeback', true) },
      { label: 'Decline', onClick: () => socket.emit('respond_takeback', false) },
    ]);
  });
  socket.on('takeback_rejected', () => {
    if (mode !== 'online') return;
    showBanner('takeback_info', 'Takeback rejected', [ { label: 'Close', onClick: () => {} } ]);
  });
  socket.on('takeback_failed', () => {
    if (mode !== 'online') return;
    showBanner('takeback_info', 'Takeback failed', [ { label: 'Close', onClick: () => {} } ]);
  });
  socket.on('takeback', (state) => {
    if (mode !== 'online') return;
    if (!chess) chess = new window.Chess();
    if (state && state.fen) chess.load(state.fen);
    ended = !!(state.checkmate || state.draw || state.gameOver);
    if (board) board.position(chess.fen());
    renderMoves();
    refreshLastMoveHighlight();
  });

  // Chat messages
  socket.on('chat', (msg) => {
    if (mode !== 'online' || !chatMessages) return;
    const who = msg.from === 'w' ? 'White' : msg.from === 'b' ? 'Black' : 'Spectator';
    const line = document.createElement('div');
    const time = new Date(msg.ts || Date.now()).toLocaleTimeString();
    line.textContent = `[${time}] ${who}: ${msg.text}`;
    chatMessages.appendChild(line);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  // Premove apply helper
  function tryApplyPremove() {
    if (!premove || !chess || ended) return;
    const mover = mode === 'cpu' ? humanColor : color;
    if (chess.turn() !== mover) return;
    const { from, to } = premove;
    const m = chess.move({ from, to, promotion: 'q' });
    if (!m) { premove = null; refreshLastMoveHighlight(); return; }
    if (board) board.position(chess.fen());
    renderMoves();
    kickClock();
    setLastMoveHighlight({ from, to });
    let k = m.captured ? 'capture' : 'move';
    if (typeof chess.isCheck === 'function' && chess.isCheck()) k = 'check';
    playMoveSound(k);
    if (mode === 'online') socket.emit('move', { from, to, promotion: 'q' });
    if (mode === 'cpu') {
      try {
        const now = Date.now();
        const delta = now - (lastPlyTsCpu || now);
        if (Array.isArray(cpuMoves)) cpuMoves.push({ san: m?.san, delta_ms: delta, ts: now });
        lastPlyTsCpu = now;
      } catch {}
      setTimeout(() => maybeCpuMove(), 150);
    }
    premove = null;
  }

  socket.on('game_over', ({ reason, winner }) => {
    if (mode !== 'online') return;
    ended = true;
    let who = winner === 'w' ? 'White' : winner === 'b' ? 'Black' : 'Unknown';
    if (reason === 'resign') {
      notice.textContent = `Game over: ${who} wins by resignation`;
    } else {
      notice.textContent = 'Game over';
    }
    updateStatus();
  });

  // ---- Analysis mode ----
  let analysisFens = [];
  function buildFensFromStart() {
    const tmp = new window.Chess();
    const hist = (serverSAN && mode === 'online') ? serverSAN.slice() : chess.history({ verbose: false });
    const fens = [tmp.fen()];
    for (const san of hist) {
      try { tmp.move(san); fens.push(tmp.fen()); } catch (e) { break; }
    }
    return fens;
  }

  function updateEvalBarForFen(fen) {
    const tmp = new window.Chess();
    try { tmp.load(fen); } catch (e) {}
    const score = evaluateBoard(tmp); // centipawns (quick static)
    const pct = Math.max(0, Math.min(100, Math.round(50 + (score / 800))));
    if (evalBar) evalBar.style.width = pct + '%';
    if (analysisInfo) analysisInfo.textContent = `Eval: ${score >= 0 ? '+' : ''}${(score/100).toFixed(2)}`;
  }

  function applyAnalysisIndex(idx) {
    if (!analysisFens[idx]) return;
    const fen = analysisFens[idx];
    if (board) board.position(fen);
    updateEvalBarForFen(fen);
    // highlight current move row (use even index of starting ply)
    highlightMoveForPly(idx);
    // kick off short engine eval for deeper insight
    engineEvalFenAsync(fen, analysisQuickDepth);
  }

  // Lightweight async engine evaluation for analysis positions
  let evalToken = 0;
  function engineEvalFenAsync(fen, depth) {
    const myToken = ++evalToken;
    setTimeout(() => {
      if (myToken !== evalToken) return; // canceled by a newer request
      const tmp = new window.Chess();
      try { tmp.load(fen); } catch (e) { return; }
      const result = negamaxWithPv(tmp, Math.max(1, depth|0), -Infinity, Infinity);
      const score = result.score;
      if (myToken !== evalToken) return;
      const pct = Math.max(0, Math.min(100, Math.round(50 + (score / 800))));
      if (evalBar) evalBar.style.width = pct + '%';
      if (analysisInfo) analysisInfo.textContent = `Engine: ${score >= 0 ? '+' : ''}${(score/100).toFixed(2)}  PV: ${result.pv.join(' ')}`;
    }, 0);
  }

  // Deeper Eval button (higher depth + PV)
  deeperEvalBtn?.addEventListener('click', () => {
    if (!inAnalysis) return;
    const idx = parseInt(analysisSlider.value, 10) || 0;
    const fen = analysisFens[idx];
    if (!fen) return;
    engineEvalFenAsync(fen, analysisDeepDepth);
  });

  enterAnalysisBtn?.addEventListener('click', () => {
    if (!chess) return;
    inAnalysis = true;
    analysisFens = buildFensFromStart();
    analysisSlider.max = String(analysisFens.length - 1);
    analysisSlider.value = String(analysisFens.length - 1);
    // build ticks every full move (2 plies)
    if (analysisTicks) {
      analysisTicks.innerHTML = '';
      const totalPlies = analysisFens.length - 1;
      for (let ply = 0; ply <= totalPlies; ply += 2) {
        const opt = document.createElement('option');
        opt.value = String(ply);
        opt.label = String(ply / 2 + 1);
        analysisTicks.appendChild(opt);
      }
    }
    exitAnalysisBtn.style.display = '';
    enterAnalysisBtn.style.display = 'none';
    applyAnalysisIndex(parseInt(analysisSlider.value, 10));
  });
  exitAnalysisBtn?.addEventListener('click', () => {
    inAnalysis = false;
    exitAnalysisBtn.style.display = 'none';
    enterAnalysisBtn.style.display = '';
    if (board && chess) board.position(chess.fen());
    if (analysisInfo) analysisInfo.textContent = '';
    updateEvalBarForFen(chess.fen());
  });
  analysisSlider?.addEventListener('input', () => {
    if (!inAnalysis) return;
    applyAnalysisIndex(parseInt(analysisSlider.value, 10));
  });

  function highlightMoveForPly(plyIdx) {
    const el = $(MOVES_EL);
    if (!el) return;
    el.querySelectorAll('.current').forEach(n => n.classList.remove('current'));
    const baseIdx = Math.max(0, Math.floor(plyIdx / 2) * 2);
    const row = el.querySelector(`[data-idx="${baseIdx}"]`);
    if (row) {
      row.classList.add('current');
      // ensure visibility
      const top = row.offsetTop;
      const bottom = top + row.offsetHeight;
      if (el.scrollTop > top || el.scrollTop + el.clientHeight < bottom) {
        row.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  // UI actions
  copyLinkBtn.addEventListener('click', async () => {
    if (!roomId) {
      alert('Join a room first');
      return;
    }
    const link = `${location.origin}/?room=${encodeURIComponent(roomId)}`;
    try {
      await navigator.clipboard.writeText(link);
      copyOk.style.display = 'inline';
      setTimeout(() => (copyOk.style.display = 'none'), 1200);
    } catch (e) {
      alert('Could not copy link');
    }
  });

  restartBtn.addEventListener('click', () => {
    if (mode === 'online') {
      socket.emit('restart');
    } else {
      // local restart
      chess = new window.Chess();
      ended = false;
      // reset local cpu timing data
      cpuMoves = [];
      lastPlyTsCpu = Date.now();
      lastCpuFen = null;
      initBoard(chess.fen());
      notice.textContent = '';
      if (humanColor === 'b') {
        // CPU (white) moves first
        setTimeout(() => maybeCpuMove(), 200);
      }
      resetClocks();
      renderMoves();
    }
  });

  resignBtn.addEventListener('click', () => {
    if (mode === 'online') {
      socket.emit('resign');
    } else {
      ended = true;
      const winner = humanColor === 'w' ? 'Black' : 'White';
      notice.textContent = `Game over: ${winner} wins by resignation`;
      updateStatus();
      stopClock();
    }
  });

  backBtn.addEventListener('click', () => {
    // Simple approach: reload to go back to lobby
    location.href = location.origin;
  });

  exitCpuBtn.addEventListener('click', () => {
    mode = 'online';
    roomId = null;
    humanColor = null;
    cpuColor = null;
    ended = false;
    // Back to lobby without reloading
    gameEl.classList.add('hidden');
    document.querySelector('.lobby').classList.remove('hidden');
    notice.textContent = '';
    playersLabel.textContent = '';
    roomLabel.textContent = '';
  });

  // ---- CPU mode helpers ----
  function ensureChessJsRuntime(then) {
    if (typeof window.Chess === 'function') { then?.(); return; }
    const urls = [
      'https://cdn.jsdelivr.net/npm/chess.js@0.13.4/chess.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.13.4/chess.min.js',
      '/vendor/chess.min.js',
    ];
    let i = 0;
    (function loadNext() {
      if (typeof window.Chess === 'function') { then?.(); return; }
      if (i >= urls.length) {
        alert('Failed to load chess.js from all sources. If you are offline or behind a firewall, please allow one of the CDNs or add /public/vendor/chess.min.js locally.');
        return;
      }
      const s = document.createElement('script');
      s.src = urls[i++];
      s.onload = () => setTimeout(loadNext, 0);
      s.onerror = () => setTimeout(loadNext, 0);
      document.head.appendChild(s);
    })();
  }

  function startVsCpu(asColor) {
    // Ensure chess.js is available before proceeding
    if (typeof window.Chess !== 'function') { ensureChessJsRuntime(() => startVsCpu(asColor)); return; }
    mode = 'cpu';
    humanColor = asColor; // 'w' or 'b'
    cpuColor = humanColor === 'w' ? 'b' : 'w';
    roomId = 'vs-computer';
    color = 'spectator';
    chess = new window.Chess();
    ended = false;
    // init cpu timing storage
    cpuMoves = [];
    lastPlyTsCpu = Date.now();
    lastCpuFen = null;

    // UI wiring
    roomLabel.textContent = roomId;
    colorLabel.textContent = humanColor === 'w' ? 'White' : 'Black';
    playersLabel.textContent = 'You vs Computer';
    copyLinkBtn.style.display = 'none';
    exitCpuBtn.style.display = '';

    document.querySelector('.lobby').classList.add('hidden');
    gameEl.classList.remove('hidden');

    initBoard(chess.fen());
    if (humanColor === 'b') {
      // CPU (white) plays first
      setTimeout(() => maybeCpuMove(), 250);
    }
    resetClocks();
    ensureClockRunning();
  }

  function maybeCpuMove() {
    if (mode !== 'cpu' || ended) return;
    const turn = chess.turn();
    if (turn !== cpuColor) return; // not CPU's turn yet

    // Broad weighted opening book
    let best = getBookMove(chess);
    if (!best) best = computeBestMove(chess, cpuDepth);
    if (!best) {
      ended = true;
      updateStatus();
      return;
    }
    const mv = chess.move(best);
    if (board) board.position(chess.fen());
    // record CPU ply timing
    try {
      const now = Date.now();
      const delta = now - (lastPlyTsCpu || now);
      if (Array.isArray(cpuMoves)) cpuMoves.push({ san: mv?.san, delta_ms: delta, ts: now });
      lastPlyTsCpu = now;
    } catch {}

    // Check if game ended
    const gameOver = (typeof chess.isGameOver === 'function' && chess.isGameOver()) ||
                     (typeof chess.game_over === 'function' && chess.game_over());
    const checkmate = (typeof chess.isCheckmate === 'function' && chess.isCheckmate()) ||
                      (typeof chess.in_checkmate === 'function' && chess.in_checkmate());
    const draw = (typeof chess.isDraw === 'function' && chess.isDraw()) ||
                 (typeof chess.in_draw === 'function' && chess.in_draw());
    ended = !!(gameOver || checkmate || draw);
    updateStatus();
    renderMoves();
    kickClock();
    // highlight CPU last move is not tracked here; we could if needed by storing best
    playMoveSound();
  }

  // Robust bindings for vs-computer buttons
  vsCpuWhite?.addEventListener('click', () => startVsCpu('w'));
  vsCpuBlack?.addEventListener('click', () => startVsCpu('b'));
  // Delegated fallback in case early binding missed due to load order
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.id === 'vsCpuWhite') startVsCpu('w');
    if (t.id === 'vsCpuBlack') startVsCpu('b');
  });

  // Theme and board size controls
  themeSelect?.addEventListener('change', () => {
    const val = themeSelect.value || 'classic';
    document.body.classList.remove('theme-classic', 'theme-green', 'theme-blue', 'theme-gray');
    document.body.classList.add(`theme-${val}`);
    savePrefs();
  });

  sizeSelect?.addEventListener('change', () => {
    const px = parseInt(sizeSelect.value || '560', 10);
    const brd = document.getElementById('board');
    const wrap = document.getElementById('boardWrap');
    if (wrap) wrap.style.width = `${px}px`;
    if (brd) brd.style.width = '100%';
    if (typeof board?.resize === 'function') board.resize();
    drawOverlay();
    savePrefs();
  });

  // Set initial board width from selector
  (function initBoardWidthFromSelector() {
    const px = parseInt(sizeSelect?.value || '560', 10);
    const brd = document.getElementById('board');
    const wrap = document.getElementById('boardWrap');
    if (wrap) wrap.style.width = `${px}px`;
    if (brd) brd.style.width = '100%';
  })();

  // ---- Move list rendering ----
  function renderMoves() {
    const el = $(MOVES_EL);
    if (!el || !chess) return;
    const hist = chess.history({ verbose: true });
    if (!hist || hist.length === 0) {
      el.innerHTML = '';
      return;
    }
    let html = '';
    for (let i = 0; i < hist.length; i += 2) {
      const moveNum = i / 2 + 1;
      const wSan = hist[i] ? hist[i].san : '';
      const bSan = hist[i + 1] ? hist[i + 1].san : '';
      const arr = mode === 'online' ? serverMoves : cpuMoves;
      const wDelta = arr && arr[i] && (arr[i].delta_ms != null) ? formatDelta(arr[i].delta_ms) : '';
      const bDelta = arr && arr[i + 1] && (arr[i + 1].delta_ms != null) ? formatDelta(arr[i + 1].delta_ms) : '';
      const tsSpanW = wDelta ? ` <span style="color:#94a3b8; font-size:12px;">(+${wDelta})</span>` : '';
      const tsSpanB = bDelta ? ` <span style="color:#94a3b8; font-size:12px;">(+${bDelta})</span>` : '';
      html += `<div data-idx="${i}">${moveNum}. ${wSan}${tsSpanW}${bSan ? '  ' + bSan : ''}${bSan ? tsSpanB : ''}</div>`;
    }
    el.innerHTML = html;
    // scroll to bottom
    el.scrollTop = el.scrollHeight;
    // If in analysis, keep highlight in sync; otherwise highlight last move
    if (inAnalysis && analysisSlider) {
      highlightMoveForPly(parseInt(analysisSlider.value, 10));
    } else {
      const lastPly = Math.max(0, chess.history().length - 1);
      highlightMoveForPly(lastPly);
    }
  }

  // ---- Clocks ----
  function ensureClockRunning() {
    if (clockTimer) return;
    lastTick = Date.now();
    clockTimer = setInterval(tickClock, 250);
    updateClockLabels();
  }

  function stopClock() {
    if (clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  }

  function resetClocks() {
    wTimeMs = START_TIME_MS;
    bTimeMs = START_TIME_MS;
    lastTick = Date.now();
    updateClockLabels();
  }

  function kickClock() {
    // realign lastTick to reduce drift after a move
    lastTick = Date.now();
    updateClockLabels();
  }

  function tickClock() {
    if (!chess || ended) return;
    const now = Date.now();
    const dt = now - (lastTick || now);
    lastTick = now;
    const turn = chess.turn();
    if (turn === 'w') {
      wTimeMs = Math.max(0, wTimeMs - dt);
    } else {
      bTimeMs = Math.max(0, bTimeMs - dt);
    }
    updateClockLabels();
    // Ensure CPU acts when it's its turn (once per new position)
    try {
      if (mode === 'cpu' && !ended && cpuColor && typeof chess.turn === 'function' && chess.turn() === cpuColor) {
        const f = typeof chess.fen === 'function' ? chess.fen() : '';
        if (f && f !== lastCpuFen) {
          lastCpuFen = f;
          setTimeout(() => maybeCpuMove(), 50);
        }
      }
    } catch {}
    if (wTimeMs === 0 || bTimeMs === 0) {
      ended = true;
      notice.textContent = `Game over: ${wTimeMs === 0 ? 'Black' : 'White'} wins on time`;
      stopClock();
    }
  }

  function msToClock(ms) {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const ss = String(s % 60).padStart(2, '0');
    return `${String(m).padStart(2, '0')}:${ss}`;
  }

  function updateClockLabels() {
    const wEl = $(CLOCK_W_EL);
    const bEl = $(CLOCK_B_EL);
    if (!wEl || !bEl) return;
    wEl.textContent = msToClock(wTimeMs);
    bEl.textContent = msToClock(bTimeMs);
  }

  // ---- Simple engine (minimax with alpha-beta) ----
  function evaluateBoard(chess) {
    // Material + simple PST + mobility (centipawns)
    const V = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
    const PST_P = [
      0,5,5,-5,-5,5,5,0,
      0,10,-5,0,0,-5,10,0,
      0,10,10,20,20,10,10,0,
      5,15,15,25,25,15,15,5,
      5,15,15,25,25,15,15,5,
      0,10,10,20,20,10,10,0,
      0,10,-5,0,0,-5,10,0,
      0,5,5,-5,-5,5,5,0,
    ];
    const PST_N = [
      -50,-40,-30,-30,-30,-30,-40,-50,
      -40,-20,0,5,5,0,-20,-40,
      -30,5,10,15,15,10,5,-30,
      -30,0,15,20,20,15,0,-30,
      -30,5,15,20,20,15,5,-30,
      -30,0,10,15,15,10,0,-30,
      -40,-20,0,0,0,0,-20,-40,
      -50,-40,-30,-30,-30,-30,-40,-50,
    ];
    const PST_B = [
      -20,-10,-10,-10,-10,-10,-10,-20,
      -10,5,0,0,0,0,5,-10,
      -10,10,10,10,10,10,10,-10,
      -10,0,10,10,10,10,0,-10,
      -10,5,5,10,10,5,5,-10,
      -10,0,5,10,10,5,0,-10,
      -10,0,0,0,0,0,0,-10,
      -20,-10,-10,-10,-10,-10,-10,-20,
    ];
    const PST_R = [
      0,0,5,10,10,5,0,0,
      0,0,5,10,10,5,0,0,
      0,0,5,10,10,5,0,0,
      5,5,10,15,15,10,5,5,
      5,5,10,15,15,10,5,5,
      0,0,5,10,10,5,0,0,
      0,0,5,10,10,5,0,0,
      0,0,5,10,10,5,0,0,
    ];
    const PST_Q = [
      -20,-10,-10,-5,-5,-10,-10,-20,
      -10,0,5,0,0,0,0,-10,
      -10,5,5,5,5,5,0,-10,
      -5,0,5,5,5,5,0,-5,
      -5,0,5,5,5,5,0,-5,
      -10,0,5,5,5,5,0,-10,
      -10,0,0,0,0,0,0,-10,
      -20,-10,-10,-5,-5,-10,-10,-20,
    ];
    const bd = chess.board();
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = bd[r][c];
        if (!p) continue;
        const idx = p.color === 'w' ? (7 - r) * 8 + c : r * 8 + (7 - c);
        let pst = 0;
        if (p.type === 'p') pst = PST_P[idx];
        else if (p.type === 'n') pst = PST_N[idx];
        else if (p.type === 'b') pst = PST_B[idx];
        else if (p.type === 'r') pst = PST_R[idx];
        else if (p.type === 'q') pst = PST_Q[idx];
        const val = (V[p.type] || 0) + pst;
        score += p.color === 'w' ? val : -val;
      }
    }
    // Mobility bonus
    const mob = chess.moves().length;
    score += (chess.turn() === 'w' ? 1 : -1) * mob;
    return score;
  }

  function computeBestMove(chess, depth) {
    const maximizingColor = chess.turn();
    let bestMove = null;
    let bestScore = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;
    const moves = chess.moves({ verbose: true });
    // basic move ordering: captures first
    moves.sort((a, b) => (a.flags.includes('c') ? -1 : 1) - (b.flags.includes('c') ? -1 : 1));
    for (const m of moves) {
      chess.move(m);
      const score = -negamax(chess, depth - 1, -beta, -alpha);
      chess.undo();
      if (score > bestScore) {
        bestScore = score;
        bestMove = { from: m.from, to: m.to, promotion: m.promotion || 'q' };
      }
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }
    return bestMove;
  }

  function negamax(chess, depth, alpha, beta) {
    if (depth === 0) return evaluateBoard(chess);
    if (chess.isGameOver && chess.isGameOver()) return evaluateTerminal(chess);
    if (chess.game_over && chess.game_over()) return evaluateTerminal(chess);
    let maxScore = -Infinity;
    const moves = chess.moves({ verbose: true });
    // ordering: captures first
    moves.sort((a, b) => (a.flags.includes('c') ? -1 : 1) - (b.flags.includes('c') ? -1 : 1));
    for (const m of moves) {
      chess.move(m);
      const score = -negamax(chess, depth - 1, -beta, -alpha);
      chess.undo();
      if (score > maxScore) maxScore = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }
    return maxScore === -Infinity ? evaluateTerminal(chess) : maxScore;
  }

  function negamaxWithPv(chess, depth, alpha, beta) {
    if (depth === 0) return { score: evaluateBoard(chess), pv: [] };
    if ((chess.isGameOver && chess.isGameOver()) || (chess.game_over && chess.game_over())) return { score: evaluateTerminal(chess), pv: [] };
    let best = { score: -Infinity, pv: [] };
    const moves = chess.moves({ verbose: true });
    moves.sort((a, b) => (a.flags.includes('c') ? -1 : 1) - (b.flags.includes('c') ? -1 : 1));
    for (const m of moves) {
      chess.move(m);
      const child = negamaxWithPv(chess, depth - 1, -beta, -alpha);
      chess.undo();
      const sc = -child.score;
      if (sc > best.score) {
        best.score = sc;
        best.pv = [m.san, ...child.pv];
      }
      if (sc > alpha) alpha = sc;
      if (alpha >= beta) break;
    }
    if (best.score === -Infinity) return { score: evaluateTerminal(chess), pv: [] };
    return best;
  }

  function evaluateTerminal(chess) {
    const isMate = (typeof chess.isCheckmate === 'function' && chess.isCheckmate()) ||
                   (typeof chess.in_checkmate === 'function' && chess.in_checkmate());
    if (isMate) {
      // If it's current side to move and in mate, bad for side to move
      return -100000;
    }
    return 0; // draw/stalemate
  }
})();
