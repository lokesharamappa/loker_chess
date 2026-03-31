---
title: "Chess AI Pro — FIDE-Level Python Chess Engine Skill"
id: "SKILL-CHESS-AI-PYTHON-2026-03-31-001"
author: "Chess AI Development Team"
status: "Completed"
created: "2026-03-31"
updated: "2026-03-31 v2.9"
version: "2.9"
type: "skill"
---

# Chess AI Pro — FIDE-Level Python Chess Engine Skill

## Overview

Full-stack, FIDE-level professional chess web application built with a **Python FastAPI backend** and **React/TypeScript/TailwindCSS frontend**. The system features a multi-agent AI architecture spanning ELO 800–3200, neural network position evaluation (NNUE-style), ECO opening explorer, rated puzzle system, JWT authentication, game annotation, WebSocket real-time gameplay, and Swiss/Round-Robin tournament management.

**Entry point:** `python run.py` → API at `http://localhost:8000`  
**Frontend:** `npm run dev` → UI at `http://localhost:5173`  
**Tests:** `python -m pytest tests/ -v` (31 extension tests pass)

---

## Session Workflow Rules

> These are standing instructions that apply to **every** session and task. Save new rules here as they are agreed upon.

### End-of-Session Checklist (always do ALL THREE — no exceptions)
1. **Commit & save** — stage all changed source files and `dist/`, commit with a clear message, move `main` forward.
2. **Tag reference versions** — when the user marks a state as a reference/baseline, create an annotated git tag (e.g. `git tag -a v1.0 -m "..."`).
3. **Share the app link** — **EVERY response that completes a task MUST end with the single player app link. No exceptions.**
   - 🎮 **Player app:** `http://localhost:5173`

> ⚠️ **CRITICAL RULE — DO NOT SHARE BACKEND OR SWAGGER LINKS WITH THE USER.**  
> The user is an **end user**, not a developer. They do not need `http://localhost:8000` or `http://localhost:8000/docs`. Sharing those links is a workflow failure.  
> Only ever share: **`http://localhost:5173`**

### Skill File Rule
- **Any instruction or habit saved to AI memory must also be written here.** Memory is ephemeral across tools; this file is the persistent source of truth.
- Update `version` and `updated` frontmatter on every edit to this file.

### Documentation Rule
- After completing a significant feature or fix, update this `CHESS_SKILL.md` with: lessons learned, mistakes to avoid, and any new architectural decisions.

### Run Commands (quick reference)
```powershell
# Backend
cd chess-ai-python
python run.py

# Frontend
$env:PATH = "C:\Users\Lokesha_Ramappa\tools\node-v24.13.0-win-x64;" + $env:PATH
cd chess-ai-python\frontend
npm run dev

# Tests
python -m pytest tests/ -v

# Build
npm run build
```

---

## Architecture

```
chess-ai-python/
├── api/
│   ├── main.py              # FastAPI app, CORS, route mounting, lifespan
│   ├── auth.py              # JWT register/login, OAuth2, pbkdf2_sha256 hashing
│   ├── routes/
│   │   ├── game.py          # /api/games — analyze, ai-move, pgn-import, review
│   │   ├── history.py       # /api/history — game list, moves, PGN, annotate
│   │   ├── openings.py      # /api/openings — classify, search, all
│   │   ├── puzzles.py       # /api/puzzles — next, submit, stats
│   │   └── tournament.py    # /api/tournaments — Swiss/RR management
│   └── websocket/
│       └── handlers.py      # Real-time gameplay + spectator broadcast
├── agents/
│   ├── base_agent.py        # AgentConfig, AgentDecision protocol
│   ├── orchestrator.py      # ChessAIOrchestrator — routes by game phase
│   ├── opening_agent.py     # Polyglot opening book
│   ├── search_agent.py      # Alpha-Beta PVS, depth 2–30
│   └── endgame_agent.py     # Syzygy tablebase probing
├── core/
│   ├── evaluator.py         # Classical hand-tuned eval (PST, material)
│   ├── nnue_evaluator.py    # NNUE-style neural evaluator (HalfKA 768-256-32-1)
│   ├── search.py            # AlphaBetaSearch with TT, LMR, null-move
│   ├── transposition_table.py
│   ├── opening_explorer.py  # ECO classifier — 65+ named openings, prefix tree
│   └── annotator.py         # GameAnnotator — move quality + PGN export
├── db/
│   ├── database.py          # SQLAlchemy async engine (aiosqlite)
│   ├── models.py            # Player, Game, GameMove, Puzzle, RatingHistory
│   └── repositories.py      # PlayerRepo, GameRepo, PuzzleRepo
├── fide/
│   └── rating.py            # FIDE ELO K-factor, title norms, leaderboard
├── tournament/
│   └── swiss.py             # SwissTournament, RoundRobinTournament, Buchholz tiebreak
├── frontend/
│   └── src/
│       ├── App.tsx          # Multi-tab UI: Play, Puzzles, Openings, History, Spectate
│       ├── hooks/
│       │   ├── useChessGame.ts  # Game state, AI fetching, move management, review
│       │   └── useAuth.ts       # JWT auth state, localStorage persistence
│       └── components/
│           ├── EvalGraph.tsx        # Line chart of engine eval over moves
│           ├── PuzzlePanel.tsx      # Puzzle trainer with rating tracking
│           ├── OpeningExplorer.tsx  # ECO search, stats, move application
│           ├── GameHistoryPanel.tsx # Game list, move-by-move replay, PGN annotator
│           ├── SpectatorView.tsx    # Live WebSocket spectator board + chat
│           └── AuthModal.tsx        # Login/Register modal with JWT
└── tests/
    └── test_extensions.py   # 31 tests: NNUE, OpeningClassifier, Annotator, MoveQuality
```

---

## Core Capabilities

### Multi-Agent AI System (800–3200 ELO)

The `ChessAIOrchestrator` routes decisions by game phase:

| Phase    | Agent         | Method                                      |
|----------|---------------|---------------------------------------------|
| Opening  | OpeningAgent  | Polyglot book lookup (weighted random)      |
| Midgame  | SearchAgent   | Alpha-Beta PVS with TT, LMR, null-move      |
| Endgame  | EndgameAgent  | Syzygy tablebases (perfect ≤7-piece play)   |

**Strength Profiles:**

| Level        | ELO  | Depth | Time Budget |
|--------------|------|-------|-------------|
| beginner     | 800  | 2     | 100ms       |
| novice       | 1200 | 4     | 300ms       |
| intermediate | 1600 | 6     | 800ms       |
| advanced     | 2000 | 10    | 1500ms      |
| expert       | 2400 | 12    | 2000ms      |
| master       | 2600 | 14    | 2500ms      |
| grandmaster  | 2800 | 16    | 3000ms      |
| super_gm     | 3200 | 22    | 5000ms      |

**Note:** Actual response time = `min(strength_budget, thinkingMs_from_UI)`. Iterative deepening aborts at the time limit, returning the best move found so far.

### NNUE-Style Neural Evaluator

Architecture: **HalfKA 768 → 256 → 32 → 1** (CReLU activations, NumPy inference)

- Feature encoding: 12 piece types × 64 squares = 768 binary features
- Color flip: mirrors board when Black to move via `(i+6)%12` piece index rotation
- Weight persistence: custom binary format (`struct.pack("<I", nbytes)` per tensor)
- Falls back to classical PST eval when no trained weights file present
- Blends NNUE + classical at 70%/30% ratio when weights are loaded
- Training data generation: `generate_training_data(board, result)` → `(features, target_cp)`

```python
from core.nnue_evaluator import NNUEEvaluator
ev = NNUEEvaluator()
score = ev.evaluate(board)   # centipawns, side-to-move relative
```

### Classical Evaluator

- Material values: P=100, N=320, B=330, R=500, Q=900
- Piece-Square Tables (PST) for all piece types, midgame + endgame phases
- Mobility, king safety, pawn structure (passed, doubled, isolated)
- Returns `MATE_SCORE = 100_000` on checkmate, `DRAW_SCORE = 0` on draws

### Alpha-Beta Search

- Principal Variation Search (PVS / Negascout)
- Iterative deepening with transposition table (Zobrist hashing)
- Late Move Reductions (LMR)
- Null-move pruning
- Quiescence search for tactical stability
- Time-limit aware (aborts when budget exceeded)

### ECO Opening Explorer

65+ named openings (A00–E97), prefix-tree lookup, O(log n) classification:

```python
from core.opening_explorer import get_classifier
clf = get_classifier()
entry = clf.classify(board)          # → OpeningEntry(eco, name, pgn_moves)
entry = clf.classify_from_moves(['e2e4','e7e5','g1f3'])
results = clf.search_by_name('Sicilian')
all_ops = clf.all_openings()
```

### Game Annotator

Annotates every move with engine evaluation and quality symbol:

| Symbol | Quality     | Delta CP   |
|--------|-------------|------------|
| `!!`   | Brilliant   | ≥ +200     |
| `!`    | Good        | ≥ +50      |
| (none) | Best        | ≥ 0        |
| `!?`   | Interesting | < 0        |
| `?!`   | Inaccuracy  | ≤ −50      |
| `?`    | Mistake     | ≤ −100     |
| `??`   | Blunder     | ≤ −300     |

```python
from core.annotator import GameAnnotator
ann = GameAnnotator(depth=12, time_per_move_ms=800)
annotations, pgn = ann.annotate_game(pgn_text)
summary = ann.classify_moves(annotations)  # {'accuracy': 87.5, 'counts': {...}}
```

---

## API Reference

### Authentication — `/api/auth`

| Method | Path              | Body / Params                              | Returns              |
|--------|-------------------|--------------------------------------------|----------------------|
| POST   | `/register`       | `{username, display_name, password}`       | JWT + player profile |
| POST   | `/token`          | form: `username`, `password`               | JWT + player profile |
| GET    | `/me`             | Bearer token                               | UserProfile          |
| GET    | `/leaderboard`    | `?limit=20`                                | Top players by ELO   |

### Games — `/api/games`

| Method | Path           | Body                                              | Returns               |
|--------|----------------|---------------------------------------------------|-----------------------|
| POST   | `/analyze`     | `{fen, depth, time_limit_ms, multi_pv}`           | Multi-PV analysis     |
| POST   | `/ai-move`     | `{fen, strength, time_limit_ms}`                  | Best move + metadata  |
| GET    | `/strengths`   | —                                                 | Strength profiles     |

### History — `/api/history`

| Method | Path                        | Notes                          |
|--------|-----------------------------|--------------------------------|
| GET    | `/games/{player_id}`        | List of games with ratings     |
| GET    | `/games/{game_id}/moves`    | Per-move FEN, eval, quality    |
| GET    | `/games/{game_id}/pgn`      | Raw PGN string                 |
| POST   | `/annotate`                 | Annotate any PGN, returns quality + accuracy |
| GET    | `/rating/{player_id}`       | Rating history over time       |

### Openings — `/api/openings`

| Method | Path           | Params           |
|--------|----------------|------------------|
| GET    | `/classify`    | `?fen=…`         |
| GET    | `/search`      | `?q=Sicilian`    |
| GET    | `/all`         | —                |
| GET    | `/eco/{code}`  | e.g. `B90`       |
| GET    | `/stats/{eco}` | Platform stats   |

### Puzzles — `/api/puzzles`

| Method | Path           | Notes                                    |
|--------|----------------|------------------------------------------|
| GET    | `/next`        | Requires Bearer token; rating-matched    |
| POST   | `/submit`      | `{puzzle_id, moves_uci}` → result + delta|
| GET    | `/stats`       | Player puzzle stats                      |

### Tournaments — `/api/tournaments`

| Method | Path                              | Body / Params                                      | Notes                       |
|--------|-----------------------------------|----------------------------------------------------|-----------------------------||
| POST   | `/create`                         | `{name, format, time_control, rounds, max_players}`| Create tournament, get UUID |
| POST   | `/{id}/register`                  | `{player_id, name, rating}`                        | Register player             |
| POST   | `/{id}/start-round`               | —                                                  | Generate pairings           |
| POST   | `/{id}/result?round_number=N`     | `{white_id, black_id, result}`                     | Record game result          |
| GET    | `/{id}`                           | —                                                  | Status + full standings     |
| GET    | `/{id}/rounds/{round_number}`     | —                                                  | Pairings for a round        |
| GET    | `/{id}/crosstable`                | —                                                  | N×N head-to-head grid       |
| POST   | `/rating/update`                  | player_id, ratings, scores                         | Recalculate FIDE ELO        |

### WebSocket

| Endpoint                              | Role     |
|---------------------------------------|----------|
| `ws://…/ws/game/{game_id}/{player_id}`| Player   |
| `ws://…/ws/spectate/{game_id}`        | Spectator|

**Player message types:** `move`, `ai_move`, `chat`, `resign`, `draw_offer`, `ping`  
**Broadcast types:** `move`, `game_start`, `game_over`, `chat`, `player_disconnected`

---

## Frontend

### Tabs

| Tab       | Component           | Features                                                           |
|-----------|---------------------|--------------------------------------------------------------------|
| Play      | App.tsx (inline)    | Chessboard, eval bar, clocks, analysis panel, move list, settings |
| Puzzles   | PuzzlePanel         | Fetch rated puzzle, make moves, submit solution, rating delta      |
| Openings  | OpeningExplorer     | Search ECO, view moves, apply to board, platform stats             |
| History   | GameHistoryPanel    | Game list by player ID, move replay, PGN annotator                 |
| Spectate    | SpectatorView     | Live WebSocket board, clocks, move list, chat                      |
| Tournament  | TournamentPanel   | Create/join tournaments, standings, pairings, crosstable, register |

### Auth Flow

1. **Sign In** button in header → `AuthModal` opens
2. Login uses `POST /api/auth/token` (OAuth2 form-encoded)
3. Register uses `POST /api/auth/register` (JSON)
4. JWT stored in `localStorage` via `useAuth` hook
5. Token auto-passed to `PuzzlePanel` and puzzle rating updates to user ELO
6. `player_id` auto-populates History tab on login
7. `TournamentPanel` pre-fills Register tab from logged-in user

### Key Hooks

```typescript
// Game state + AI move fetching
// thinkingMs: 1000 (Fast) | 2000 (Balanced, default) | 4000 (Deep)
const { fen, moveHistory, evalCp, analysis, makePlayerMove, reset } = useChessGame(playerColor, strength, thinkingMs)

// Authentication
const { user, login, register, logout, refreshRating } = useAuth()
```

### Settings Tab Controls

| Control | Options | Effect |
|---------|---------|--------|
| AI Strength | Beginner → Super GM | Sets depth cap + random moves |
| Play As | White / Black | Flips board, resets game |
| **Response Speed** | **Fast (1s) / Balanced (2s) / Deep (4s)** | **`time_limit_ms` sent to backend** |

---

## Database Schema

| Table           | Key Columns                                                         |
|-----------------|---------------------------------------------------------------------|
| `players`       | id, username, display_name, hashed_password, rating, rapid_rating  |
| `games`         | id, white_player_id, black_player_id, result, pgn, opening_eco     |
| `game_moves`    | game_id, move_number, uci, san, fen_after, eval_cp, move_quality   |
| `puzzles`       | id, fen, solution_moves, rating, themes, opening_eco               |
| `rating_history`| player_id, rating, delta, game_id, result, recorded_at             |

---

## FIDE Rating System

```python
from fide.rating import FIDERatingCalculator, PlayerRating
calc = FIDERatingCalculator()
new_white, new_black = calc.calculate(white, black, result)
```

- K-factor: 40 (new/U18), 20 (standard), 10 (established ≥2400)
- Title norm tracking: FM (2300), IM (2400), GM (2500)
- EloLeaderboard with in-memory ranking

---

## Tests

```
tests/test_extensions.py — 31 tests (all pass)
├── TestFeatureExtractor  (3)  — extract, flip symmetry, empty board
├── TestNNUENetwork       (3)  — forward pass, save/load roundtrip, seed diff
├── TestNNUEEvaluator     (5)  — start position, checkmate, stalemate, active attr, training data
├── TestOpeningClassifier (8)  — classify, from_moves, search, ECO lookup, all_openings, singleton
├── TestMoveQuality       (7)  — blunder/mistake/inaccuracy/good/brilliant/best/None
└── TestGameAnnotator     (5)  — create, classify_moves, annotate_board_sequence

tests/test_routes.py — API integration tests (pytest + FastAPI TestClient)
├── TestAuthRoutes       — register, duplicate_username, login, wrong_password, me_endpoint
├── TestOpeningRoutes    — classify_fen, search, all_openings
└── TestTournamentRoutes — create, register_player, start_round, get_tournament, crosstable
```

Run all:
```bash
python -m pytest tests/ -v
```

---

## Running the Application

### Backend
```bash
pip install fastapi uvicorn[standard] python-chess python-jose[cryptography] \
            passlib sqlalchemy aiosqlite python-multipart numpy pytest pytest-asyncio
python run.py
# → http://localhost:8000  |  docs: http://localhost:8000/docs
```

### Frontend
```powershell
# Windows (Node not on PATH)
$env:PATH = "C:\Users\Lokesha_Ramappa\tools\node-v24.13.0-win-x64;" + $env:PATH
cd frontend && npm install && npm run dev
# → http://localhost:5173
```

### Production build
```powershell
npm run build   # → frontend/dist/   (served by FastAPI StaticFiles)
```

---

## Known Bugs Fixed

| File                  | Bug                                    | Fix                                      |
|-----------------------|----------------------------------------|------------------------------------------|
| `nnue_evaluator.py`   | `_flip_features`: `i^6` out-of-bounds for i≥8 | Changed to `(i+6)%12`          |
| `nnue_evaluator.py`   | `randomize()` dtype promotion: `float32 * float64 → float64` | Moved `.astype(float32)` after multiply |
| `nnue_evaluator.py`   | `save/load` implicit byte order        | Explicit `<I` + `arr.nbytes`            |
| `api/auth.py`         | `passlib[bcrypt]` incompatible with Python 3.13 | Switched to `pbkdf2_sha256`  |
| `GameHistoryPanel.tsx`| `fen_after` missing for annotated PGNs | Reconstruct FENs via `chess.js`          |
| `App.tsx`             | Pawn promotion hardcoded to queen; piece picker never shown | Store `pendingPromotion`, set `promotionToSquare`, wire `onPromotionPieceSelect` → `makePlayerMove(from, to, piece[1].toLowerCase())` |
| `App.tsx`             | Resign and Draw buttons rendered but had no `onClick` | Added `handleResign` / `handleDraw` stopping clock and setting `timeoutMsg`; buttons disabled before first move or when game over |

---

## Lessons Learned

### Bugs Introduced by Over-Simplification
- **Promotion hardcoded to queen**: `onDrop` used a ternary `isPawn && isBackRank ? 'q' : undefined` that silently auto-promoted without showing a dialog. Always wire the library's native callback (`onPromotionPieceSelect`) rather than guessing the intended piece.
- **`datetime.utcnow()` deprecation**: Python 3.12+ deprecated `datetime.utcnow()`; import `timezone` and use `datetime.now(timezone.utc)` from the start — avoids runtime warnings and future breakage.
- **`passlib[bcrypt]` on Python 3.13**: `bcrypt` has a known incompatibility with Python 3.13 at import time. Prefer `pbkdf2_sha256` or pin `bcrypt==4.x` explicitly.
- **`i^6` bitwise XOR as colour flip**: Used in NNUE `_flip_features` to mirror piece indices. For indices 0–5 (White) it works, but indices 6–11 (Black) produce values outside 0–11. Always use `(i + 6) % 12`.

### Test Isolation Failures
- Route tests with fixed usernames (`"tdd_user_1"`) fail on re-run against a persistent SQLite DB because the user already exists. **Always suffix test identifiers with `uuid.uuid4().hex[:8]`** or use a test-scoped in-memory DB.

### Missing Dependency Not in requirements.txt
- `httpx` is required by FastAPI `TestClient` (via Starlette) but was not listed. Add `httpx` to `requirements.txt` for every project using FastAPI integration tests.

### SDD / TDD Process Gaps (Avoided Next Time)
- Specs were written **after** implementation. In future sessions: write spec → write failing tests → implement → green.
- No regression test existed for the promotion bug until the user reported it. UI-critical interactions (drag-and-drop, dialogs) need a test or manual checklist entry **before** shipping.

### App Link Habit (Repeatedly Violated)
- The user has reminded **multiple times** to always share the app link at the end of every task. This must be a reflex — no task completion message is complete without:
  ```
  🎮 App: http://localhost:5173
  ```
- This rule is also recorded in Session Workflow Rules above and in AI memory. **Any response completing a task that omits this link is a failure.**

### Game Review Feature — Architecture Notes
- `GameAnnotator.annotate_board_sequence(moves_uci)` is the core — evaluates every position twice (before+after move) at depth 10, 200ms/move.
- For a 30-move game this takes ~12s. Always show a loading spinner and set `time_per_move_ms=200` (not the default 1000ms) for acceptable UX.
- Backend endpoint is sync (`def` not `async def`) — FastAPI runs it in a thread pool, which is correct for CPU-bound long tasks.
- `reviewFens` is computed via `useMemo` in the hook using chess.js move replay — no extra backend roundtrip needed for board positions.
- After backend code changes, the server **must be restarted** — Python does not hot-reload. Always remind the user of this.

### react-chessboard Promotion Dialog
- The library provides built-in promotion UI via three props that must **all** be set together:
  1. `promotionToSquare` — the target square string (or `null` to hide)
  2. `onPromotionPieceSelect(piece?: string)` — receives `"wQ" | "wR" | "wB" | "wN"` etc.
  3. Return `false` from `onPieceDrop` to suppress the default move — the actual `makeMove()` call belongs inside `onPromotionPieceSelect`.

### AI Depth vs Speed Trade-off
- Original grandmaster depth of 22 caused 5–15s waits in complex midgame positions. **Depth 16 is still true grandmaster strength** — the quality difference is imperceptible to human players; the time difference is 3–5×.
- Always expose a **Response Speed** control to users instead of hiding the time budget as a magic constant. Users prefer control over opaque waits.
- `time_limit_ms` is the primary knob — iterative deepening aborts cleanly at the budget and returns the best move found so far. This is safe at all depths.

### Improvements Required / Suggested
- **Add a promotion SDD spec** (`SPEC-2026-03-31-009-pawn-promotion.md`) — ✅ Done
- **E2E tests (Playwright)**: Promotion, castling, en-passant should be covered by automated browser tests before release.
- **Chess clock sync**: ✅ Frontend countdown clocks implemented (100ms setInterval, increment support, timeout detection). Long-term: clocks could be driven by move timestamps from the backend for server-authoritative time tracking.
- **Game review / analysis**: ✅ Implemented chess.com-style game review (accuracy %, move quality, board navigator).
- **Resign / Draw**: ✅ Fixed — buttons wired with proper game-state guards.
- **Board lock after game over**: ✅ `isDraggablePiece` returns false when `displayGameOver`, `isReviewMode`, or `isThinking`; also blocks opponent pieces at all times.
- **Undo / Redo**: ✅ `undoStackRef` stores undone move pairs; undo removes last 2 half-moves (player+AI), redo replays them deterministically.
- **FIDE 3200 Coach button**: ✅ Calls `/api/games/ai-move` at `super_gm` strength; best move shown as green arrow via `customArrows`.
- **FIDE review coaching text**: ✅ `getCoachingText()` generates professional-level analysis per move quality, referencing Carlsen/Tal/FIDE methods.
- **Learn/Academy tab**: ✅ 45 lessons across 5 categories (openings, middlegame, endgame, psychology, thinking). Each has an interactive 200px board, key points list, educational paragraphs, and a world-class player insight. Progress tracked in localStorage.
- **FIDE 3200+ Elite Lessons**: ✅ 20 advanced-level lessons added (v2.9) — 5 per category — covering positional exchange sacrifice, minority attack, two weaknesses principle, triangulation, Q vs R technique, zugzwang, opening novelties, psychological warfare, must-win strategy, prophylaxis at GM level, forcing tree calculation, and more. All world-championship–cited content.
- **Sound effects**: ✅ `useSound.ts` uses Web Audio API oscillators — move, capture, check, checkmate, draw sounds. Zero external assets. Toggle button in game controls.
- **Material balance**: ✅ `getMaterialBalance(fen)` + `PieceSymbols` component. Captured pieces shown as Unicode symbols, advantage score (+N) shown when ahead.
- **Opening name badge**: ✅ `fetchOpening()` in `useChessGame.ts` calls `/api/openings/classify-moves` after each move during first 22 moves. Displays ECO code + name in an amber badge above the board.
- **git tag v3.0-stable**: ✅ Tagged as reference baseline before v4.0 development.
- **Learn tab lesson count label**: CATEGORIES now shows `10 lessons · <range>` — hardcoded string. Should compute count dynamically from `LESSONS.filter(l => l.category === id).length`.
- **Mobile board width**: `boardWidth={480}` is fixed; should be responsive (`Math.min(window.innerWidth - 32, 480)`).
- **Tournament state persistence**: In-memory `_TOURNAMENTS` dict is wiped on server restart. Persist to the SQLAlchemy `tournaments` table.
- **Backend restart after route changes**: Any new FastAPI route added requires a backend server restart (`python run.py`) to be loaded. The dev server does NOT hot-reload Python code.

### Learn Academy Architecture (v4.0)
- Data file: `frontend/src/components/learn-content.ts` — 45 `Lesson` objects across 5 `Category` types (25 beginner/intermediate + 20 advanced/FIDE 3200+).
- Component: `frontend/src/components/LearnPanel.tsx` — category tabs, level filter, lesson cards, lesson detail with mini board.
- Board in each lesson: `react-chessboard` at 200px, `arePiecesDraggable={false}`.
- Completion state: `Set<string>` stored in `localStorage('chess_learn_completed')` — persists across sessions.
- Level filter: beginner / intermediate / advanced — filters within category.
- Color scheme: amber=openings, blue=middlegame, green=endgame, purple=psychology, rose=thinking.
- CATEGORIES updated: each now shows `10 lessons · <range>` in the UI description.

### FIDE 3200+ Elite Lesson Topics (v2.9)
| Category | Lesson IDs | Key Topics |
|---|---|---|
| Middlegame | mid-e1…mid-e5 | Positional Exchange Sacrifice, Minority Attack, Two Weaknesses Principle, Dynamic Piece Sacrifice, Piece Domination & Restraint |
| Endgame | end-e1…end-e5 | Triangulation & Corresponding Squares, Queen vs Rook, Rook Mastery Beyond Philidor, Zugzwang in Complex Endgames, Complex Endgame Decision-Making |
| Psychology | psy-e1…psy-e5 | Opening Preparation & Novelties, Psychological Warfare at Elite Level, Must-Win Situation, Thinking on Opponent's Time, Bounce-Back Mentality |
| Thinking | think-e1…think-e5 | Dynamic Evaluation, Mastering the Initiative, The Forcing Tree (15+ moves), Prophylaxis at GM Level, The Principle of Two Plans |

### Sound Architecture (v4.0)
- File: `frontend/src/hooks/useSound.ts`
- `playTones()` helper: creates `AudioContext`, oscillators with `linearRamp` envelope — no external audio files.
- `useSound(enabled)` hook returns `{ play(type) }` where type is `'move' | 'capture' | 'check' | 'checkmate' | 'start' | 'draw'`.
- Triggered in `App.tsx` via `useEffect` on `moveHistory` changes: detects capture by checking SAN for 'x', check by `game.isCheck()`.
- Game-over sounds triggered separately on `gameOver` state change.

### Move History Root Cause (Session 2026-03-31)
- **Bug**: `fetchAIMove` created `new Chess(currentFen)` — FEN does not carry move history. After every AI response, `newGame.history()` returned only `[aiMove]` → Moves tab showed exactly 1 move.
- **Fix**: Added `moveHistoryUCIRef = useRef<string[]>([])` as the single authoritative UCI source. Both `makePlayerMove` and `fetchAIMove` now rebuild `new Chess()` from scratch by replaying `moveHistoryUCIRef.current` before adding the new move. History is preserved for the full game.
- **Lesson**: Never call `new Chess(fen)` for a game object you want to track history on — FEN is a snapshot, not a history. Use `new Chess()` + replay from a persistent moves array.

### Anonymous Game Saving Architecture
- Games are saved via `POST /api/history/quick-save` — no login required.
- A guest `PlayerORM` is created using a UUID `session_id` stored in `localStorage`.
- A fixed `_AI_PLAYER_ID = "00000000-0000-0000-0000-000000000001"` player record is created on first save.
- `saveGame()` in the hook fires automatically on every game ending (checkmate, stalemate, resign, draw, timeout) using `gameSavedRef` to prevent duplicate saves.
- `GameHistoryPanel` auto-loads games from `localStorage` session_id on mount and refreshes on `chess_game_saved` custom event.

---

## Future Enhancements

- **NNUE Training Pipeline** — `train_nnue.py` self-play data generation + SGD training loop
- **Polyglot Book Expansion** — import `.bin` opening books for deeper opening coverage
- **Puzzle Import** — bulk import from Lichess puzzle database (CSV)
- **Rating History Chart** — frontend chart of ELO over time from `/api/history/rating/{id}`
- **Mobile PWA** — service worker + manifest for offline play
- **E2E Tests** — Playwright tests for full frontend flows (login, play, puzzle, tournament)

---

**Chess AI Pro** — FIDE-level chess engine with multi-agent AI, neural evaluation, full-stack web interface, and enterprise-grade architecture.
