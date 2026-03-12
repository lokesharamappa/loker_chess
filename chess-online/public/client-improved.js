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
  const joinBtn = $('joinRoomBtn'); // Updated ID
  const vsCpuWhite = $('cpuWhiteBtn'); // Updated ID
  const vsCpuBlack = $('cpuBlackBtn'); // Updated ID
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
      };
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    } catch {}
  }

  function loadPrefs() {
    try {
      const prefs = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
      if (prefs.theme && document.body) {
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(prefs.theme);
        if (themeSelect) themeSelect.value = prefs.theme.replace('theme-', '');
      }
      if (prefs.size && sizeSelect) sizeSelect.value = prefs.size;
      if (prefs.difficulty && difficultySelect) difficultySelect.value = prefs.difficulty;
      if (prefs.sound) {
        if (muteAll) muteAll.checked = !!prefs.sound.mute;
        if (sndMove) sndMove.checked = !!prefs.sound.move;
        if (sndCapture) sndCapture.checked = !!prefs.sound.capture;
        if (sndCheck) sndCheck.checked = !!prefs.sound.check;
        if (sndGame) sndGame.checked = !!prefs.sound.game;
      }
    } catch {}
  }

  // ---- Sound ----
  function playMoveSound(kind) {
    if (muteAll?.checked) return;
    const audio = new Audio();
    switch (kind) {
      case 'move': audio.src = 'https://www.chess.com/sound/moves/standard/Move.mp3'; break;
      case 'capture': audio.src = 'https://www.chess.com/sound/moves/standard/Capture.mp3'; break;
      case 'check': audio.src = 'https://www.chess.com/sound/moves/standard/Check.mp3'; break;
      case 'game': audio.src = 'https://www.chess.com/sound/moves/standard/GameEnd.mp3'; break;
    }
    audio.volume = 0.3;
    audio.play().catch(() => {});
  }

  // ---- Clock ----
  function startClock() {
    if (clockTimer || ended) return;
    lastTick = performance.now();
    clockTimer = requestAnimationFrame(tickClock);
  }

  function stopClock() {
    if (clockTimer) { cancelAnimationFrame(clockTimer); clockTimer = null; }
  }

  function tickClock() {
    if (ended) { stopClock(); return; }
    const now = performance.now();
    const dt = now - lastTick;
    lastTick = now;
    const turn = chess.turn();
    if (turn === 'w') wTimeMs -= dt;
    else bTimeMs -= dt;
    renderClocks();
    if (wTimeMs <= 0 || bTimeMs <= 0) {
      ended = true;
      stopClock();
      notice.textContent = wTimeMs <= 0 ? 'White loses on time' : 'Black loses on time';
      playMoveSound('game');
    } else {
      clockTimer = requestAnimationFrame(tickClock);
    }
  }

  function renderClocks() {
    const wEl = document.getElementById('whiteTime');
    const bEl = document.getElementById('blackTime');
    if (wEl) wEl.textContent = msToClock(wTimeMs);
    if (bEl) bEl.textContent = msToClock(bTimeMs);
  }

  function msToClock(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const min = Math.floor(total / 60);
    const sec = total % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  function resetClocks() {
    wTimeMs = START_TIME_MS;
    bTimeMs = START_TIME_MS;
    lastTick = null;
    stopClock();
    renderClocks();
  }

  function kickClock() {
    if (!clockTimer && !ended) startClock();
  }

  function ensureClockRunning() {
    if (!clockTimer && !ended && chess && !chess.is_game_over && !chess.game_over()) startClock();
  }

  // ---- Board ----
  function initBoard(fen) {
    if (!window.ChessBoard) {
      console.error('ChessBoard not available');
      return;
    }
    
    const cfg = {
      draggable: true,
      position: fen,
      pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
      onDragStart: onDragStart,
      onDrop: onDrop,
      onSnapEnd: onSnapEnd,
      onMouseoutSquare: onMouseoutSquare,
      onMouseoverSquare: onMouseoverSquare,
      onChange: onChange,
    };
    
    if (board) board.destroy();
    
    const boardEl = document.getElementById('board');
    if (!boardEl) {
      console.error('Board element not found');
      return;
    }
    
    board = ChessBoard(boardEl, cfg);
    
    // Set board size
    const size = parseInt(sizeSelect?.value || '560', 10);
    boardEl.style.width = size + 'px';
    boardEl.style.height = size + 'px';
    
    // Apply chess.com styling
    boardEl.style.borderRadius = '4px';
    boardEl.style.overflow = 'hidden';
    boardEl.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    
    if (window.ChessBoard && window.ChessBoard.resize) {
      window.ChessBoard.resize();
    }
    
    drawSelectionAndDests(null);
    console.log('Board initialized successfully');
  }

  function onDragStart(source, piece, position, orientation) {
    if (ended) return false;
    if (mode === 'cpu' && humanColor && piece[0] !== humanColor) return false;
    if (mode === 'online' && color && color !== 'spectator' && piece[0] !== color) return false;
    if (mode === 'online' && color === 'spectator') return false;
    return chess.moves({ square: source, verbose: true }).length > 0;
  }

  function onDrop(source, target) {
    // Remove any dragged piece immediately to prevent sticking
    removeDraggedPiece();
    
    if (mode === 'cpu' && humanColor && chess.turn() !== humanColor) return 'snapback';
    if (mode === 'online' && color && color !== 'spectator' && chess.turn() !== color) return 'snapback';
    if (mode === 'online' && color === 'spectator') return 'snapback';

    const move = chess.move({
      from: source,
      to: target,
      promotion: 'q' // TODO: let user choose
    });

    if (move === null) return 'snapback';

    updateGameAfterMove(move, source, target);
  }

  function onSnapEnd() {
    // Ensure board position is updated and piece is removed
    if (board) board.position(chess.fen());
    removeDraggedPiece();
  }

  function onMouseoutSquare(square, piece) {
    removeDraggedPiece();
  }

  function onMouseoverSquare(square, piece) {
    // No highlighting needed for drag and drop
  }

  function onChange() {
    // Handle position changes
  }

  // Fix for pieces sticking to mouse pointer
  function removeDraggedPiece() {
    // Remove any dragged piece elements
    const draggedPieces = document.querySelectorAll('.piece-417db');
    draggedPieces.forEach(piece => {
      if (piece.style.position === 'fixed' || piece.style.position === 'absolute') {
        piece.remove();
      }
    });
    
    // Also remove any ghost images
    const ghostImages = document.querySelectorAll('[style*="position: fixed"], [style*="position: absolute"]');
    ghostImages.forEach(img => {
      if (img.tagName === 'IMG' && img.src.includes('chesspieces')) {
        img.remove();
      }
    });
  }

  function updateGameAfterMove(move, from, to) {
    if (board) board.position(chess.fen());
    renderMoves();
    kickClock();
    setLastMoveHighlight({ from, to });
    
    // Sound selection
    let soundKind = 'move';
    if (typeof chess.isCheck === 'function' && chess.isCheck()) soundKind = 'check';
    else if (move.flags.includes('c')) soundKind = 'capture';
    playMoveSound(soundKind);
    
    const payload = { from, to, promotion: 'q' };
    if (mode === 'online') {
      socket.emit('move', payload);
    } else if (mode === 'cpu') {
      console.log('Human move completed, triggering CPU move...');
      console.log('After human move - turn:', chess.turn(), 'cpuColor:', cpuColor);
      
      try {
        const now = Date.now();
        const delta = now - (lastPlyTsCpu || now);
        if (Array.isArray(cpuMoves)) cpuMoves.push({ san: move?.san, delta_ms: delta, ts: now });
        lastPlyTsCpu = now;
      } catch {}
      
      // Trigger CPU move after human move - multiple attempts
      setTimeout(() => {
        console.log('Triggering CPU move after human (attempt 1)...');
        maybeCpuMove();
      }, 150);
      
      // Backup trigger
      setTimeout(() => {
        console.log('Triggering CPU move after human (attempt 2)...');
        maybeCpuMove();
      }, 1000);
      
      // Final backup trigger
      setTimeout(() => {
        console.log('Triggering CPU move after human (attempt 3)...');
        maybeCpuMove();
      }, 2000);
      
      // Check for game over after human move too
      setTimeout(() => {
        checkGameOver();
      }, 200);
    }
  }

  // ---- Move list ----
  function renderMoves() {
    if (!chess) return;
    const hist = chess.history({ verbose: true });
    const container = document.getElementById(MOVES_EL);
    if (!container) return;
    container.innerHTML = '';
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
      html += `<div>${moveNum}. ${wSan}${tsSpanW} ${bSan}${tsSpanB}</div>`;
    }
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
  }

  function formatDelta(ms) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms/1000).toFixed(1)}s`;
  }

  // ---- Selection and highlights ----
  function drawSelectionAndDests(square) {
    if (!board) return;
    board.clearHighlights();
    if (square) {
      board.highlight(square, 'selection');
      const moves = chess.moves({ square, verbose: true });
      moves.forEach(m => board.highlight(m.to, 'dest'));
    }
    if (lastMoveSquares) {
      board.highlight(lastMoveSquares.from, 'lastMove');
      board.highlight(lastMoveSquares.to, 'lastMove');
    }
  }

  function clearSelection() {
    selectedSquare = null;
    drawSelectionAndDests(null);
  }

  function setLastMoveHighlight(squares) {
    lastMoveSquares = squares;
    drawSelectionAndDests(selectedSquare);
  }

  function refreshLastMoveHighlight() {
    drawSelectionAndDests(selectedSquare);
  }

  // ---- CPU Engine (Improved) ----
  function evaluateBoard(chess) {
    // Enhanced evaluation with better piece-square tables and positional factors
    const V = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
    
    // Improved piece-square tables
    const PST_P = [
      0, 5, 5, 10, 10, 5, 5, 0,
      0, 10, 15, 20, 20, 15, 10, 0,
      5, 15, 20, 30, 30, 20, 15, 5,
      10, 20, 30, 40, 40, 30, 20, 10,
      10, 20, 30, 40, 40, 30, 20, 10,
      5, 15, 20, 30, 30, 20, 15, 5,
      0, 10, 15, 20, 20, 15, 10, 0,
      0, 5, 5, 10, 10, 5, 5, 0,
    ];
    
    const PST_N = [
      -50, -40, -30, -30, -30, -30, -40, -50,
      -40, -20, 0, 5, 5, 0, -20, -40,
      -30, 5, 10, 15, 15, 10, 5, -30,
      -30, 0, 15, 20, 20, 15, 0, -30,
      -30, 5, 15, 20, 20, 15, 5, -30,
      -30, 0, 10, 15, 15, 10, 0, -30,
      -40, -20, 0, 5, 5, 0, -20, -40,
      -50, -40, -30, -30, -30, -30, -40, -50,
    ];
    
    const PST_B = [
      -20, -10, -10, -10, -10, -10, -10, -20,
      -10, 5, 0, 0, 0, 0, 5, -10,
      -10, 10, 10, 10, 10, 10, 10, -10,
      -10, 0, 10, 15, 15, 10, 0, -10,
      -10, 5, 5, 10, 10, 5, 5, -10,
      -10, 0, 5, 10, 10, 5, 0, -10,
      -10, 0, 0, 0, 0, 0, 0, -10,
      -20, -10, -10, -10, -10, -10, -10, -20,
    ];
    
    const PST_R = [
      0, 0, 5, 10, 10, 5, 0, 0,
      0, 0, 5, 10, 10, 5, 0, 0,
      0, 0, 5, 10, 10, 5, 0, 0,
      5, 5, 10, 15, 15, 10, 5, 5,
      5, 5, 10, 15, 15, 10, 5, 5,
      0, 0, 5, 10, 10, 5, 0, 0,
      0, 0, 5, 10, 10, 5, 0, 0,
      0, 0, 5, 10, 10, 5, 0, 0,
    ];
    
    const PST_Q = [
      -20, -10, -10, -5, -5, -10, -10, -20,
      -10, 0, 0, 0, 0, 0, 0, -10,
      -10, 0, 5, 5, 5, 5, 0, -10,
      -5, 0, 5, 5, 5, 5, 0, -5,
      0, 0, 5, 5, 5, 5, 0, -5,
      -10, 5, 5, 5, 5, 5, 0, -10,
      -10, 0, 5, 0, 0, 0, 0, -10,
      -20, -10, -10, -5, -5, -10, -10, -20,
    ];
    
    const PST_K = [
      -50, -40, -30, -20, -20, -30, -40, -50,
      -30, -20, -10, 0, 0, -10, -20, -30,
      -30, -10, 20, 30, 30, 20, -10, -30,
      -30, -10, 30, 40, 40, 30, -10, -30,
      -30, -10, 30, 40, 40, 30, -10, -30,
      -30, -10, 20, 30, 30, 20, -10, -30,
      -30, -30, 0, 0, 0, 0, -30, -30,
      -50, -40, -30, -20, -20, -30, -40, -50,
    ];

    const PST = { p: PST_P, n: PST_N, b: PST_B, r: PST_R, q: PST_Q, k: PST_K };
    const board = chess.board();
    let score = 0;
    let mobility = 0;
    const turn = chess.turn();
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;
        const v = V[piece.type];
        const pst = PST[piece.type];
        const idx = piece.color === 'w' ? r * 8 + c : 63 - (r * 8 + c);
        const pstVal = pst ? pst[idx] : 0;
        const sign = piece.color === turn ? 1 : -1;
        score += sign * (v + pstVal);
        
        // Mobility bonus
        if (piece.type !== 'p') {
          const moves = chess.moves({ square: piece.color + (String.fromCharCode(97 + c) + (8 - r)), verbose: true });
          mobility += sign * moves.length * 2;
        }
      }
    }
    
    // Add mobility score
    score += mobility;
    
    // King safety bonus
    const kingPos = findKing(chess, turn);
    if (kingPos) {
      const kingSafety = evaluateKingSafety(chess, kingPos, turn);
      score += kingSafety * 10;
    }
    
    // Pawn structure bonus
    const pawnStructure = evaluatePawnStructure(chess, turn);
    score += pawnStructure * 5;
    
    return score;
  }

  function findKing(chess, color) {
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === color) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  function evaluateKingSafety(chess, kingPos, color) {
    let safety = 0;
    const enemyColor = color === 'w' ? 'b' : 'w';
    
    // Check if king is exposed
    const squaresAroundKing = [
      { r: kingPos.row - 1, c: kingPos.col - 1 },
      { r: kingPos.row - 1, c: kingPos.col },
      { r: kingPos.row - 1, c: kingPos.col + 1 },
      { r: kingPos.row, c: kingPos.col - 1 },
      { r: kingPos.row, c: kingPos.col + 1 },
      { r: kingPos.row + 1, c: kingPos.col - 1 },
      { r: kingPos.row + 1, c: kingPos.col },
      { r: kingPos.row + 1, c: kingPos.col + 1 },
    ];
    
    squaresAroundKing.forEach(square => {
      if (square.r >= 0 && square.r < 8 && square.c >= 0 && square.c < 8) {
        const piece = chess.board()[square.r][square.c];
        if (piece && piece.color === color) {
          safety += 1; // Friendly piece nearby
        } else if (piece && piece.color === enemyColor) {
          safety -= 2; // Enemy piece nearby
        }
      }
    });
    
    return safety;
  }

  function evaluatePawnStructure(chess, color) {
    let structure = 0;
    const board = chess.board();
    const pawns = [];
    
    // Find all pawns
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'p' && piece.color === color) {
          pawns.push({ row: r, col: c });
        }
      }
    }
    
    // Check for doubled pawns
    const files = {};
    pawns.forEach(pawn => {
      if (!files[pawn.col]) files[pawn.col] = [];
      files[pawn.col].push(pawn);
    });
    
    Object.values(files).forEach(filePawns => {
      if (filePawns.length > 1) {
        structure -= (filePawns.length - 1) * 10; // Penalty for doubled pawns
      }
    });
    
    // Check for passed pawns
    pawns.forEach(pawn => {
      let isPassed = true;
      const direction = color === 'w' ? 1 : -1;
      
      for (let r = pawn.row + direction; r >= 0 && r < 8; r += direction) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.type === 'p' && piece.color !== color && Math.abs(c - pawn.col) <= 1) {
            isPassed = false;
            break;
          }
        }
        if (!isPassed) break;
      }
      
      if (isPassed) {
        structure += 20; // Bonus for passed pawn
      }
    });
    
    return structure;
  }

  function evaluateTerminal(chess) {
    const isMate = (typeof chess.isCheckmate === 'function' && chess.isCheckmate()) ||
                   (typeof chess.in_checkmate === 'function' && chess.in_checkmate());
    if (isMate) {
      const turn = chess.turn();
      return turn === 'w' ? -100000 : 100000;
    }
    const isDraw = (typeof chess.isDraw === 'function' && chess.isDraw()) ||
                   (typeof chess.in_draw === 'function' && chess.in_draw());
    if (isDraw) return 0;
    return 0;
  }

  function negamax(chess, depth, alpha, beta) {
    if (depth === 0) return evaluateBoard(chess);
    if (chess.isGameOver && chess.isGameOver()) return evaluateTerminal(chess);
    if (chess.game_over && chess.game_over()) return evaluateTerminal(chess);
    
    let maxScore = -Infinity;
    const moves = chess.moves({ verbose: true });
    
    // Move ordering: captures first, then checks, then others
    moves.sort((a, b) => {
      if (a.flags.includes('c') && !b.flags.includes('c')) return -1;
      if (!a.flags.includes('c') && b.flags.includes('c')) return 1;
      if (a.flags.includes('k') && !b.flags.includes('k')) return -1;
      if (!a.flags.includes('k') && b.flags.includes('k')) return 1;
      return 0;
    });
    
    for (const move of moves) {
      chess.move(move);
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
    
    moves.sort((a, b) => {
      if (a.flags.includes('c') && !b.flags.includes('c')) return -1;
      if (!a.flags.includes('c') && b.flags.includes('c')) return 1;
      return 0;
    });
    
    for (const move of moves) {
      chess.move(move);
      const result = negamaxWithPv(chess, depth - 1, -beta, -alpha);
      chess.undo();
      const sc = -result.score;
      if (sc > best.score) {
        best = { score: sc, pv: [move.san, ...result.pv] };
      }
      if (sc > alpha) alpha = sc;
      if (alpha >= beta) break;
    }
    if (best.score === -Infinity) return { score: evaluateTerminal(chess), pv: [] };
    return best;
  }

  function maybeCpuMove() {
    console.log('maybeCpuMove called:', { mode, ended, cpuColor, chessTurn: chess?.turn(), fen: chess?.fen() });
    
    if (mode !== 'cpu' || ended) {
      console.log('CPU move blocked - mode:', mode, 'ended:', ended);
      return;
    }
    
    if (!chess) {
      console.log('No chess object');
      return;
    }
    
    const turn = chess.turn();
    console.log('Turn check:', { currentTurn: turn, cpuColor, shouldMove: turn === cpuColor });
    
    if (turn !== cpuColor) {
      console.log('Not CPU turn - turn:', turn, 'cpuColor:', cpuColor);
      return;
    }
    
    const moves = chess.moves({ verbose: true });
    console.log('Available moves:', moves.length, 'first few:', moves.slice(0, 3));
    if (moves.length === 0) {
      console.log('No moves available');
      return;
    }
    
    // Use higher depth for harder levels
    const actualDepth = cpuDepth === 1 ? 1 : cpuDepth === 2 ? 2 : cpuDepth === 3 ? 3 : cpuDepth === 4 ? 4 : cpuDepth === 5 ? 5 : 2;
    console.log('Using depth:', actualDepth, 'from cpuDepth:', cpuDepth);
    
    let bestMove = moves[0];
    let bestScore = -Infinity;
    
    // Use iterative deepening for better play
    for (let depth = 1; depth <= actualDepth; depth++) {
      let currentBest = moves[0];
      let currentBestScore = -Infinity;
      
      for (const move of moves) {
        chess.move(move);
        const score = -negamax(chess, depth - 1, -Infinity, Infinity);
        chess.undo();
        
        if (score > currentBestScore) {
          currentBestScore = score;
          currentBest = move;
        }
      }
      
      bestMove = currentBest;
      bestScore = currentBestScore;
    }
    
    const mv = chess.move(bestMove);
    console.log('CPU move executed:', { move: bestMove, result: mv });
    
    if (mv) {
      if (board) board.position(chess.fen());
      renderMoves();
      kickClock();
      setLastMoveHighlight({ from: bestMove.from, to: bestMove.to });
      
      let soundKind = 'move';
      if (typeof chess.isCheck === 'function' && chess.isCheck()) soundKind = 'check';
      else if (mv.flags.includes('c')) soundKind = 'capture';
      playMoveSound(soundKind);
      
      try {
        const now = Date.now();
        const delta = now - (lastPlyTsCpu || now);
        if (Array.isArray(cpuMoves)) cpuMoves.push({ san: mv?.san, delta_ms: delta, ts: now });
        lastPlyTsCpu = now;
      } catch {}
      
      // Check for game over after CPU move
      checkGameOver();
    } else {
      console.error('CPU move failed:', bestMove);
    }
  }

  function checkGameOver() {
    if (!chess) return;
    
    console.log('Checking game over...');
    
    // Check for checkmate
    if (chess.in_checkmate()) {
      console.log('Checkmate detected!');
      ended = true;
      stopClock();
      const winner = chess.turn() === 'w' ? 'Black' : 'White';
      const winnerColor = chess.turn() === 'w' ? 'black' : 'white';
      
      // Determine if user won or lost
      const userWon = (winner === 'White' && humanColor === 'w') || (winner === 'Black' && humanColor === 'b');
      const message = userWon ? 'Checkmate, You Won!' : `Checkmate, ${winner} Won!`;
      
      // Update game status
      const statusEl = document.getElementById('gameStatus');
      if (statusEl) {
        statusEl.textContent = message;
        statusEl.style.color = userWon ? 'var(--success-green)' : 'var(--danger-red)';
        statusEl.style.fontWeight = '700';
      }
      
      // Show beautiful board overlay
      showBoardOverlay(message, userWon);
      
      // Update notice if it exists
      if (notice) {
        notice.textContent = message;
        notice.style.color = userWon ? 'var(--success-green)' : 'var(--danger-red)';
      }
      
      playMoveSound('game');
      updateGameStatus();
      return;
    }
    
    // Check for draw
    if (chess.in_draw()) {
      console.log('Draw detected!');
      ended = true;
      stopClock();
      
      const statusEl = document.getElementById('gameStatus');
      if (statusEl) {
        statusEl.textContent = 'Draw!';
        statusEl.style.color = 'var(--warning-yellow)';
        statusEl.style.fontWeight = '700';
      }
      
      showBoardOverlay('Draw!', false);
      
      if (notice) {
        notice.textContent = 'Draw!';
        notice.style.color = 'var(--warning-yellow)';
      }
      
      playMoveSound('game');
      updateGameStatus();
      return;
    }
    
    // Check for stalemate
    if (chess.in_stalemate()) {
      console.log('Stalemate detected!');
      ended = true;
      stopClock();
      
      const statusEl = document.getElementById('gameStatus');
      if (statusEl) {
        statusEl.textContent = 'Stalemate!';
        statusEl.style.color = 'var(--warning-yellow)';
        statusEl.style.fontWeight = '700';
      }
      
      showBoardOverlay('Stalemate!', false);
      
      if (notice) {
        notice.textContent = 'Stalemate!';
        notice.style.color = 'var(--warning-yellow)';
      }
      
      playMoveSound('game');
      updateGameStatus();
      return;
    }
    
    console.log('Game continues...');
  }

  function showBoardOverlay(message, isVictory) {
    const boardEl = document.getElementById('board');
    if (!boardEl) return;
    
    // Remove any existing overlay
    const existingOverlay = document.getElementById('gameOverlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // Create overlay element
    const overlay = document.createElement('div');
    overlay.id = 'gameOverlay';
    overlay.innerHTML = `
      <div class="overlay-content">
        <div class="overlay-icon">${isVictory ? '👑' : '🤝'}</div>
        <div class="overlay-message">${message}</div>
        <div class="overlay-subtitle">${isVictory ? 'Congratulations!' : 'Well played!'}</div>
        <button class="overlay-button" onclick="closeOverlay()">New Game</button>
      </div>
    `;
    
    // Add styles
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: ${isVictory 
        ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.95), rgba(56, 142, 60, 0.95))' 
        : 'linear-gradient(135deg, rgba(255, 152, 0, 0.95), rgba(255, 193, 7, 0.95))'};
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      border-radius: 4px;
      animation: overlayFadeIn 0.5s ease-out;
    `;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes overlayFadeIn {
        from {
          opacity: 0;
          transform: scale(0.8);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      
      @keyframes bounceIn {
        0% {
          transform: scale(0.3) rotate(-15deg);
          opacity: 0;
        }
        50% {
          transform: scale(1.05) rotate(5deg);
        }
        70% {
          transform: scale(0.9) rotate(-2deg);
        }
        100% {
          transform: scale(1) rotate(0deg);
          opacity: 1;
        }
      }
      
      @keyframes glow {
        0%, 100% {
          text-shadow: 0 0 20px rgba(255, 255, 255, 0.8),
                      0 0 40px rgba(255, 255, 255, 0.6),
                      0 0 60px rgba(255, 255, 255, 0.4);
        }
        50% {
          text-shadow: 0 0 30px rgba(255, 255, 255, 1),
                      0 0 50px rgba(255, 255, 255, 0.8),
                      0 0 70px rgba(255, 255, 255, 0.6);
        }
      }
      
      .overlay-content {
        text-align: center;
        color: white;
        animation: bounceIn 0.6s ease-out;
      }
      
      .overlay-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
        animation: bounceIn 0.8s ease-out 0.2s both;
      }
      
      .overlay-message {
        font-size: 2.5rem;
        font-weight: 900;
        margin-bottom: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 2px;
        animation: glow 2s ease-in-out infinite;
      }
      
      .overlay-subtitle {
        font-size: 1.2rem;
        font-weight: 600;
        margin-bottom: 2rem;
        opacity: 0.9;
      }
      
      .overlay-button {
        background: rgba(255, 255, 255, 0.2);
        border: 2px solid white;
        color: white;
        padding: 1rem 2rem;
        font-size: 1.1rem;
        font-weight: 700;
        border-radius: 50px;
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .overlay-button:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
      }
    `;
    
    document.head.appendChild(style);
    boardEl.appendChild(overlay);
    
    // Auto-close after 10 seconds
    setTimeout(() => {
      closeOverlay();
    }, 10000);
  }

  function closeOverlay() {
    const overlay = document.getElementById('gameOverlay');
    if (overlay) {
      overlay.style.animation = 'overlayFadeIn 0.3s ease-out reverse';
      setTimeout(() => {
        overlay.remove();
      }, 300);
    }
    
    // Start new game
    if (mode === 'cpu') {
      startCpuGame();
    } else {
      showLobby();
    }
  }

  // Make closeOverlay globally available
  window.closeOverlay = closeOverlay;

  // ---- Analysis ----
  function updateEvalBarForFen(fen) {
    const tmp = new window.Chess();
    try { tmp.load(fen); } catch (e) {}
    const score = evaluateBoard(tmp);
    const pct = Math.max(0, Math.min(100, Math.round(50 + (score / 800))));
    if (evalBar) evalBar.style.width = pct + '%';
    if (analysisInfo) analysisInfo.textContent = `Eval: ${score >= 0 ? '+' : ''}${(score/100).toFixed(2)}`;
  }

  // ---- UI Events ----
  // Add event listeners with better error handling
  function addEventListeners() {
    console.log('Setting up event listeners...');
    console.log('Elements found:', {
      joinBtn: !!joinBtn,
      vsCpuWhite: !!vsCpuWhite,
      vsCpuBlack: !!vsCpuBlack,
      difficultySelect: !!difficultySelect
    });
    
    if (joinBtn) {
      joinBtn.addEventListener('click', () => {
        const id = (roomInput?.value || '').trim();
        if (!id) { 
          showToast('Enter a room ID', 'warning');
          return; 
        }
        roomId = id;
        socket.emit('join', roomId);
        showGame();
      });
    }

    if (vsCpuWhite) {
      vsCpuWhite.addEventListener('click', () => {
        console.log('White vs CPU button clicked');
        mode = 'cpu';
        humanColor = 'w';
        cpuColor = 'b';
        startCpuGame();
      });
    } else {
      console.error('vsCpuWhite button not found');
    }

    if (vsCpuBlack) {
      vsCpuBlack.addEventListener('click', () => {
        console.log('Black vs CPU button clicked');
        mode = 'cpu';
        humanColor = 'b';
        cpuColor = 'w';
        startCpuGame();
      });
    } else {
      console.error('vsCpuBlack button not found');
    }

    if (exitCpuBtn) {
      exitCpuBtn.addEventListener('click', () => {
        mode = 'online';
        cpuColor = null;
        humanColor = null;
        showLobby();
      });
    }

    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        if (mode === 'cpu') {
          startCpuGame();
        } else {
          socket.emit('restart');
        }
      });
    }

    if (resignBtn) {
      resignBtn.addEventListener('click', () => {
        if (mode === 'cpu') {
          ended = true;
          stopClock();
          notice.textContent = `${humanColor === 'w' ? 'Black' : 'White'} wins (resignation)`;
          playMoveSound('game');
        } else {
          socket.emit('resign');
        }
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        mode = 'online';
        cpuColor = null;
        humanColor = null;
        showLobby();
      });
    }

    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', () => {
        if (!roomId) return;
        const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
        navigator.clipboard.writeText(url).then(() => {
          if (copyOk) {
            copyOk.style.display = 'inline';
            setTimeout(() => { copyOk.style.display = 'none'; }, 2000);
          }
        });
      });
    }

    if (themeSelect) {
      themeSelect.addEventListener('change', () => {
        const theme = themeSelect.value;
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${theme}`);
        if (board) board.position(chess.fen());
        savePrefs();
      });
    }

    if (sizeSelect) {
      sizeSelect.addEventListener('change', () => {
        if (board && chess) {
          const size = parseInt(sizeSelect.value, 10);
          const boardEl = document.getElementById('board');
          if (boardEl) {
            boardEl.style.width = size + 'px';
            boardEl.style.height = size + 'px';
          }
          if (window.ChessBoard && window.ChessBoard.resize) window.ChessBoard.resize();
        }
        savePrefs();
      });
    }

    if (difficultySelect) {
      difficultySelect.addEventListener('change', () => {
        const val = parseInt(difficultySelect.value || '2', 10);
        cpuDepth = Math.min(5, Math.max(1, val)); // Updated to allow depth 5
        console.log('CPU depth updated to:', cpuDepth);
        savePrefs();
      });
    }

    // Sound pref changes
    [muteAll, sndMove, sndCapture, sndCheck, sndGame].forEach(el => {
      if (el) el.addEventListener('change', savePrefs);
    });

    console.log('Event listeners setup complete');
  }

  // Call the event listener setup function with delay to ensure DOM is ready
  setTimeout(() => {
    addEventListeners();
  }, 500);

  // Simple toast notification function
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    const toastStack = document.getElementById('toastStack');
    if (toastStack) {
      toastStack.appendChild(toast);
      setTimeout(() => {
        toast.remove();
      }, 3000);
    } else {
      console.log('Toast:', message);
    }
  }

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

  // Sound pref changes
  [muteAll, sndMove, sndCapture, sndCheck, sndGame].forEach(el => el?.addEventListener('change', savePrefs));

  // ---- Socket events ----
  socket.on('init', (data) => {
    roomId = data.roomId || roomId;
    color = data.color;
    chess = new window.Chess(data.fen);
    ended = data.gameOver;
    mode = 'online';
    cpuColor = null;
    humanColor = null;
    initBoard(data.fen);
    showGame();
    updateLabels();
    renderMoves();
    resetClocks();
    if (data.history) {
      serverMoves = data.history;
      renderMoves();
    }
    if (!ended && !inAnalysis) ensureClockRunning();
  });

  socket.on('move', (data) => {
    if (!chess) return;
    chess.load(data.fen);
    if (board) board.position(data.fen);
    renderMoves();
    updateLabels();
    setLastMoveHighlight({ from: data.move.from, to: data.move.to });
    let soundKind = 'move';
    if (data.check) soundKind = 'check';
    else if (data.move.flags && data.move.flags.includes('c')) soundKind = 'capture';
    playMoveSound(soundKind);
    if (data.gameOver) {
      ended = true;
      stopClock();
      if (data.checkmate) notice.textContent = `Checkmate! ${data.turn === 'w' ? 'Black' : 'White'} wins!`;
      else if (data.draw) notice.textContent = 'Draw!';
      else notice.textContent = 'Game over!';
      playMoveSound('game');
    } else {
      ensureClockRunning();
    }
  });

  socket.on('players', (data) => {
    if (playersLabel) {
      playersLabel.textContent = `White: ${data.w ? '✓' : '✗'}  Black: ${data.b ? '✓' : '✗'}`;
    }
  });

  socket.on('chat', (data) => {
    if (chatMessages) {
      const div = document.createElement('div');
      div.textContent = `${data.from}: ${data.text}`;
      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  });

  socket.on('game_over', (data) => {
    ended = true;
    stopClock();
    if (notice) {
      if (data.reason === 'resign') {
        notice.textContent = `${data.winner === 'w' ? 'White' : 'Black'} wins (resignation)`;
      } else if (data.reason === 'draw_agreed') {
        notice.textContent = 'Draw agreed';
      } else {
        notice.textContent = 'Game over!';
      }
    }
    playMoveSound('game');
  });

  socket.on('restart', (data) => {
    if (!chess) return;
    chess.load(data.fen);
    if (board) board.position(data.fen);
    ended = false;
    notice.textContent = '';
    renderMoves();
    updateLabels();
    resetClocks();
    ensureClockRunning();
  });

  socket.on('disconnect', () => {
    if (notice) notice.textContent = 'Disconnected from server';
  });

  // ---- UI helpers ----
  function showGame() {
    const lobbyContainer = document.getElementById('lobbyContainer');
    const mainContainer = document.querySelector('.main-container');
    
    if (lobbyContainer) lobbyContainer.style.display = 'none';
    if (mainContainer) mainContainer.style.display = 'grid';
  }

  function showLobby() {
    const lobbyContainer = document.getElementById('lobbyContainer');
    const mainContainer = document.querySelector('.main-container');
    
    if (lobbyContainer) lobbyContainer.style.display = 'block';
    if (mainContainer) mainContainer.style.display = 'none';
  }

  function updateLabels() {
    if (roomLabel && roomId) roomLabel.textContent = roomId;
    if (colorLabel) colorLabel.textContent = mode === 'cpu' ? (humanColor === 'w' ? 'White' : 'Black') : (color === 'w' ? 'White' : color === 'b' ? 'Black' : 'Spectator');
    if (turnLabel && chess) turnLabel.textContent = chess.turn() === 'w' ? 'White' : 'Black';
  }

  function updatePlayerInfo() {
    if (mode === 'cpu') {
      const whitePlayer = document.getElementById('whitePlayer');
      const blackPlayer = document.getElementById('blackPlayer');
      
      if (whitePlayer && blackPlayer) {
        if (humanColor === 'w') {
          whitePlayer.querySelector('.player-name').textContent = 'You';
          blackPlayer.querySelector('.player-name').textContent = 'Computer';
          blackPlayer.querySelector('.player-rating').textContent = getDifficultyText();
        } else {
          whitePlayer.querySelector('.player-name').textContent = 'Computer';
          whitePlayer.querySelector('.player-rating').textContent = getDifficultyText();
          blackPlayer.querySelector('.player-name').textContent = 'You';
        }
      }
    } else if (color) {
      const whitePlayer = document.getElementById('whitePlayer');
      const blackPlayer = document.getElementById('blackPlayer');
      
      if (whitePlayer && blackPlayer) {
        if (color === 'w') {
          whitePlayer.querySelector('.player-name').textContent = 'You';
          blackPlayer.querySelector('.player-name').textContent = 'Opponent';
        } else {
          whitePlayer.querySelector('.player-name').textContent = 'Opponent';
          blackPlayer.querySelector('.player-name').textContent = 'You';
        }
      }
    }
  }

  function getDifficultyText() {
    const difficulty = difficultySelect?.value || '2';
    const difficulties = {
      '1': '800',
      '2': '1200',
      '3': '1600',
      '4': '2000',
      '5': '2500'
    };
    return difficulties[difficulty] || '1200';
  }

  function updateActivePlayer() {
    if (chess) {
      const turn = chess.turn();
      const whitePlayer = document.getElementById('whitePlayer');
      const blackPlayer = document.getElementById('blackPlayer');
      
      if (whitePlayer && blackPlayer) {
        if (turn === 'w') {
          whitePlayer.classList.add('active-player');
          blackPlayer.classList.remove('active-player');
        } else {
          blackPlayer.classList.add('active-player');
          whitePlayer.classList.remove('active-player');
        }
      }
    }
  }

  function updateGameStatus() {
    const statusEl = document.getElementById('gameStatus');
    const roomInfoEl = document.getElementById('roomInfo');
    
    if (statusEl) {
      if (mode === 'cpu') {
        statusEl.textContent = 'Playing vs Computer';
      } else if (roomId) {
        statusEl.textContent = 'Playing Online';
      } else {
        statusEl.textContent = 'Waiting for opponent...';
      }
      
      if (ended) {
        if (chess && chess.in_checkmate()) {
          const winner = chess.turn() === 'w' ? 'Black' : 'White';
          statusEl.textContent = `Checkmate! ${winner} wins!`;
        } else if (chess && chess.in_draw()) {
          statusEl.textContent = 'Draw!';
        } else {
          statusEl.textContent = 'Game Over';
        }
      }
    }
    
    if (roomInfoEl && roomId) {
      roomInfoEl.textContent = `Room: ${roomId}`;
    }
  }

  function updateMoveCount() {
    if (chess) {
      const moves = chess.history();
      const moveCountEl = document.getElementById('moveCount');
      if (moveCountEl) {
        moveCountEl.textContent = `${moves.length} moves`;
      }
    }
  }

  function renderMoves() {
    if (!chess) return;
    const hist = chess.history({ verbose: true });
    const container = document.getElementById(MOVES_EL);
    if (!container) return;
    
    container.innerHTML = '';
    let html = '';
    
    for (let i = 0; i < hist.length; i += 2) {
      const moveNum = i / 2 + 1;
      const wSan = hist[i] ? hist[i].san : '';
      const bSan = hist[i + 1] ? hist[i + 1].san : '';
      const arr = mode === 'online' ? serverMoves : cpuMoves;
      const wDelta = arr && arr[i] && (arr[i].delta_ms != null) ? formatDelta(arr[i].delta_ms) : '';
      const bDelta = arr && arr[i + 1] && (arr[i + 1].delta_ms != null) ? formatDelta(arr[i + 1].delta_ms) : '';
      
      html += `
        <div class="move-pair">
          <div class="move-number">${moveNum}.</div>
          <div class="white-move">${wSan}${wDelta ? ` <span class="move-time">+${wDelta}</span>` : ''}</div>
          <div class="black-move">${bSan}${bDelta ? ` <span class="move-time">+${bDelta}</span>` : ''}</div>
        </div>
      `;
    }
    
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
  }

  function startCpuGame() {
    console.log('Starting CPU game...');
    chess = new window.Chess();
    ended = false;
    cpuMoves = [];
    lastPlyTsCpu = Date.now();
    lastCpuFen = null;
    
    console.log('CPU game setup:', { humanColor, cpuColor, cpuDepth });
    
    initBoard(chess.fen());
    notice.textContent = '';
    
    if (humanColor === 'b') {
      console.log('CPU (white) will move first');
      setTimeout(() => maybeCpuMove(), 200);
    }
    
    resetClocks();
    renderMoves();
    showGame();
    updateLabels();
    updatePlayerInfo();
    updateActivePlayer();
    updateGameStatus();
    updateMoveCount();
    ensureClockRunning();
    
    // Start monitoring updates
    startMonitoring();
    
    console.log('CPU game started successfully');
  }

  function startMonitoring() {
    // Update UI every second
    setInterval(() => {
      updateActivePlayer();
      updateGameStatus();
      updateMoveCount();
      updatePlayerInfo();
    }, 1000);
  }

  // ---- Init ----
  loadPrefs();
  showLobby();

  // Debug function to check dependencies
  function checkDependencies() {
    console.log('Checking dependencies...');
    console.log('Chess.js available:', typeof window.Chess !== 'undefined');
    console.log('ChessBoard available:', typeof window.ChessBoard !== 'undefined');
    console.log('jQuery available:', typeof $ !== 'undefined');
    console.log('Board element:', document.getElementById('board'));
    console.log('Lobby element:', document.getElementById('lobbyContainer'));
  }

  // Check dependencies after page load
  setTimeout(checkDependencies, 1000);

  // Fallback: Initialize board if chess.js loads but board doesn't
  setTimeout(() => {
    if (window.Chess && window.ChessBoard && !board && document.getElementById('board')) {
      console.log('Fallback board initialization');
      chess = new window.Chess();
      initBoard(chess.fen());
    }
  }, 2000);

  // Additional fallback: Force board initialization on click
  document.addEventListener('click', function(e) {
    if (e.target.id === 'cpuWhiteBtn' || e.target.id === 'cpuBlackBtn') {
      console.log('CPU button clicked, ensuring board is ready...');
      setTimeout(() => {
        if (!board && window.Chess && window.ChessBoard) {
          chess = new window.Chess();
          initBoard(chess.fen());
        }
      }, 100);
    }
  });

  // Add a manual CPU move trigger for debugging
  document.addEventListener('keydown', function(e) {
    if (e.key === 'c' && e.ctrlKey && e.shiftKey) {
      console.log('Manual CPU move trigger');
      maybeCpuMove();
    }
    if (e.key === 'g' && e.ctrlKey && e.shiftKey) {
      console.log('Manual game over check');
      checkGameOver();
    }
  });

  // Add periodic CPU move check (debugging)
  setInterval(() => {
    if (mode === 'cpu' && !ended && chess && cpuColor) {
      const turn = chess.turn();
      if (turn === cpuColor) {
        console.log('Periodic check: CPU should move, triggering...');
        maybeCpuMove();
      }
    }
    
    // Also check for game over periodically
    if (!ended && chess) {
      checkGameOver();
    }
  }, 2000);

  // Handle URL params for room
  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get('room');
  if (roomParam) {
    roomInput.value = roomParam;
    roomId = roomParam;
    socket.emit('join', roomId);
  }

  // Global board click handler for click-to-move
  document.addEventListener('click', (e) => {
    const sq = findSquareFromEvent(e);
    if (!sq || !chess || ended) return;
    
    if (selectedSquare && sq !== selectedSquare) {
      const pieceAtTarget = getPieceOnSquare(sq);
      if (pieceAtTarget && pieceAtTarget.color === (mode === 'cpu' ? humanColor : color)) {
        selectedSquare = sq;
        drawSelectionAndDests(sq);
        return;
      }
    }

    const from = selectedSquare;
    const to = sq;
    if ((mode === 'cpu' ? humanColor : color) !== chess.turn()) {
      premove = { from, to };
      refreshLastMoveHighlight();
      clearSelection();
      return;
    }
    
    const legal = chess.move({ from, to, promotion: 'q' });
    if (!legal) { 
      drawSelectionAndDests(selectedSquare); 
      return; 
    }

    updateGameAfterMove(legal, from, to);
    clearSelection();
  });

  function findSquareFromEvent(e) {
    const target = e.target.closest('div[class*="square-"]');
    if (!target) return null;
    const classes = Array.from(target.classList);
    const squareClass = classes.find(c => c.startsWith('square-'));
    return squareClass ? squareClass.replace('square-', '') : null;
  }

  function getPieceOnSquare(square) {
    if (!chess) return null;
    const piece = chess.get(square);
    return piece;
  }

  // Remove dragged pieces when mouse is released anywhere
  document.addEventListener('mouseup', removeDraggedPiece);
  document.addEventListener('touchend', removeDraggedPiece);

})();
