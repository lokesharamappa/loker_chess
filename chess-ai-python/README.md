# Chess AI Pro — FIDE Level Professional Chess Web App

A complete, production-grade chess platform built with **Python AI agents**, **FastAPI**, and **React**. Implements FIDE-standard rules, ratings, and tournament management with a multi-agent AI system capable of playing from 800 to 3200+ ELO.

---

## Architecture Overview

```
chess-ai-python/
├── agents/                     # AI Agent System
│   ├── base_agent.py           # Abstract agent interface
│   ├── opening_agent.py        # Polyglot opening book agent
│   ├── search_agent.py         # Alpha-Beta PVS engine (800–3200 ELO)
│   ├── endgame_agent.py        # Syzygy tablebase agent (perfect ≤7 pieces)
│   └── orchestrator.py         # Multi-agent orchestrator (routes by phase)
│
├── core/                       # Chess Engine Core
│   ├── evaluator.py            # Tapered eval: material + PST + pawn + king safety
│   ├── search.py               # PVS + LMR + Null Move + Futility + Quiescence
│   └── transposition_table.py  # Zobrist hash + generational TT
│
├── fide/                       # FIDE Compliance Layer
│   ├── rating.py               # ELO: K-factors, performance rating, title norms
│   └── tournament.py           # Swiss/Round-Robin + Buchholz/SB tiebreaks
│
├── api/                        # FastAPI Backend
│   ├── main.py                 # App factory, CORS, lifespan
│   ├── routes/
│   │   ├── game.py             # REST: create, move, AI move, analysis
│   │   └── tournament.py       # REST: tournaments, pairings, standings
│   └── websocket/
│       └── handlers.py         # WS: live gameplay, AI moves, chat, clocks
│
├── models/                     # Pydantic v2 Schemas
│   ├── game.py                 # Game, Move, Analysis models
│   └── player.py               # Player, Rating, Stats models
│
├── frontend/                   # React + TypeScript + TailwindCSS
│   └── src/
│       └── App.tsx             # Full chess UI with eval bar, analysis panel
│
├── tests/                      # Pytest test suite
│   ├── test_agents.py          # Agent + search + evaluator tests
│   └── test_fide.py            # Rating + tournament tests
│
├── data/
│   ├── books/                  # Polyglot opening books (.bin) — add your own
│   └── syzygy/                 # Syzygy tablebases — add your own
│
├── run.py                      # Entry point (server + demos)
└── requirements.txt
```

---

## AI Agent System Design

### Multi-Agent Orchestration

The `ChessAIOrchestrator` automatically routes each position to the optimal agent:

```
Position  →  Phase Detection
               │
               ├── OPENING  (move ≤ 20, book available)
               │       └── OpeningAgent  →  Polyglot book (weighted random)
               │
               ├── ENDGAME  (≤ 7 pieces OR no queens)
               │       └── EndgameAgent  →  Syzygy tablebase (perfect play)
               │
               └── MIDDLEGAME  (everything else)
                       └── SearchAgent   →  Alpha-Beta PVS engine
```

### Search Agent Internals

The `AlphaBetaSearch` engine implements professional-grade techniques:

| Technique | Description |
|---|---|
| **PVS** | Principal Variation Search (zero-window re-search) |
| **Iterative Deepening** | Depth 1→N with time management |
| **Aspiration Windows** | ±50cp windows, widened on fail |
| **Transposition Table** | Zobrist hash, generational aging, depth-preferred |
| **Null Move Pruning** | R=3 reduction, disabled in zugzwang positions |
| **Late Move Reductions** | LMR after 4th move at depth ≥ 3 |
| **Futility Pruning** | Static eval + margin ≤ alpha at low depths |
| **Quiescence Search** | Captures only, with standing pat |
| **Killer Heuristic** | 2 killers per ply |
| **History Heuristic** | depth² bonus for beta-cutoff moves |
| **Move Ordering** | TT move > captures (MVV-LVA) > promos > killers > history |

### Evaluation Function

Tapered evaluation blending middlegame/endgame scores by phase:

- **Material**: Standard piece values (P=100, N=320, B=330, R=500, Q=900)
- **Piece-Square Tables**: Professional PSTs for all pieces in MG + EG
- **Pawn Structure**: Doubled (−50), Isolated (−30), Passed pawn bonus
- **Mobility**: 5cp per legal move delta vs opponent
- **King Safety**: Pawn shield (+15/pawn), attacker penalty (−10/attacker)

### Strength Levels

| Level | ELO | Depth | Time | Random% |
|---|---|---|---|---|
| Beginner | 800 | 2 | 100ms | 40% |
| Novice | 1200 | 4 | 300ms | 20% |
| Intermediate | 1600 | 6 | 1000ms | 8% |
| Advanced | 2000 | 10 | 2000ms | 3% |
| Expert | 2400 | 14 | 3000ms | 1% |
| Master | 2600 | 18 | 5000ms | 0.5% |
| Grandmaster | 2800 | 22 | 8000ms | 0.1% |
| Super GM | 3200 | 30 | 15000ms | 0% |

---

## FIDE Compliance

### Rating System (`fide/rating.py`)
- **K-factor rules**: K=40 (new/junior), K=20 (<2400), K=10 (≥2400 established)
- **Rapid/Blitz**: K=20 for all
- **Performance rating**: FIDE percentage→DP table interpolation
- **Title norm checking**: GM (2600 perf), IM (2450), FM (2300), etc.
- **Rating floor**: 1000 minimum

### Tournament System (`fide/tournament.py`)
- **Dutch Swiss** pairing algorithm
- **FIDE tiebreak order**: Score → Buchholz → Buchholz Cut-1 → Sonneborn-Berger → Rating
- **Color alternation**: FIDE B.3 rules
- **Bye assignment**: Lowest-rated player without previous bye
- **Round Robin**: Berger pairing tables
- **Time controls**: Bullet / Blitz / Rapid / Classical

---

## Quick Start

### 1. Install Python dependencies

```bash
cd chess-ai-python
pip install -r requirements.txt
```

### 2. Start the API server

```bash
python run.py                    # http://localhost:8000
python run.py --port 8080        # custom port
python run.py --reload           # development hot-reload
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

Open **http://localhost:5173** — API proxied to http://localhost:8000.

### 4. Run demos without a browser

```bash
python run.py --demo             # AI vs AI self-play (Master vs Grandmaster)
python run.py --rating-demo      # FIDE rating calculation demo
python run.py --tournament-demo  # 6-player Swiss tournament demo
```

### 5. Run tests

```bash
pytest                           # All tests
pytest tests/test_agents.py -v   # Agent tests only
pytest tests/test_fide.py -v     # FIDE tests only
pytest -k "checkmate" -v        # Specific test filter
```

---

## API Reference

### REST Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/games/create` | Create a new game |
| `POST` | `/api/games/{id}/move` | Submit a player move |
| `GET`  | `/api/games/{id}` | Get game state + legal moves |
| `POST` | `/api/games/{id}/resign` | Resign the game |
| `POST` | `/api/games/ai-move` | Get AI move for a FEN position |
| `POST` | `/api/games/analyze` | Deep multi-line analysis |
| `POST` | `/api/tournaments/create` | Create tournament |
| `POST` | `/api/tournaments/{id}/register` | Register player |
| `POST` | `/api/tournaments/{id}/start-round` | Generate round pairings |
| `POST` | `/api/tournaments/{id}/result` | Record game result |
| `GET`  | `/api/tournaments/{id}` | Standings + status |
| `GET`  | `/api/strengths` | Available AI strength levels |
| `GET`  | `/api/health` | Health check |

### WebSocket Endpoints

| Path | Description |
|---|---|
| `ws://host/ws/game/{game_id}/{player_id}` | Live gameplay (moves, clocks, chat) |
| `ws://host/ws/spectate/{game_id}` | Spectate a game in real-time |

#### WebSocket Message Types (client → server)

```json
{ "type": "move",     "move": "e2e4" }
{ "type": "ai_move",  "strength": "grandmaster", "time_ms": 5000 }
{ "type": "chat",     "text": "Good game!" }
{ "type": "resign" }
{ "type": "draw_offer", "accept": false }
{ "type": "ping" }
```

### AI Move API Example

```bash
curl -X POST http://localhost:8000/api/games/ai-move \
  -H "Content-Type: application/json" \
  -d '{
    "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
    "strength": "grandmaster",
    "time_limit_ms": 5000
  }'
```

Response:
```json
{
  "move_uci": "e7e5",
  "move_san": "e5",
  "score_str": "-0.10",
  "depth": 18,
  "nodes": 284736,
  "time_ms": 1243.5,
  "source": "opening_book",
  "pv": ["e7e5", "g1f3", "b8c6"],
  "annotation": "Book: 12 candidates, played 38% of the time",
  "fen_after": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2"
}
```

---

## Optional Data Files

### Opening Books (`.bin` Polyglot format)
Place in `data/books/`:
- [Performance.bin](https://www.chessprogramming.org/Polyglot) — General strong play
- [komodo.bin](https://komodochess.com) — Komodo's opening lines
- [gm2600.bin](https://www.chessprogramming.org/Polyglot) — GM-level repertoire

### Syzygy Tablebases (perfect endgame ≤7 pieces)
Place in `data/syzygy/`:
- Download 3-4-5 piece: ~1 GB — essential
- Download 6-piece: ~150 GB — optional but stronger
- Download 7-piece: ~18 TB — maximum strength
- Source: [lichess.ovh/syzygy](https://tablebase.lichess.ovh/syzygy)

---

## Frontend UI Features

- **Interactive board** (react-chessboard) with drag-and-drop
- **Evaluation bar** — real-time centipawn display
- **Analysis panel** — top 3 engine lines with PV and depth
- **Opening book moves** — frequency-weighted display
- **Tablebase WDL** — Win/Draw/Loss in endgame
- **Move list** — paired notation (1. e4 e5 2. Nf3 ...)
- **Chess clock** — real-time countdown, low-time pulse
- **Strength selector** — 8 levels from Beginner to Super GM
- **Color picker** — play as White or Black
- **Dark professional UI** — slate/amber theme

---

## Extending the System

### Add a New Agent

```python
from agents.base_agent import BaseAgent, AgentConfig, AgentDecision
import chess

class NeuralNetAgent(BaseAgent):
    def can_handle(self, board: chess.Board) -> bool:
        return not board.is_game_over()

    def select_move(self, board, time_limit_ms=None):
        # Your NNUE/neural evaluation here
        ...
```

Register in `orchestrator.py` by adding it to the chain before the search fallback.

### Add Neural Network Evaluation (NNUE)

```python
import torch
from core.evaluator import Evaluator

class NNUEEvaluator(Evaluator):
    def __init__(self, model_path: str):
        self.model = torch.load(model_path)

    def evaluate(self, board: chess.Board) -> int:
        features = self._board_to_halfka(board)   # HalfKA feature extraction
        return int(self.model(features).item() * 100)
```

Pass `NNUEEvaluator` to `AlphaBetaSearch` instead of the default `Evaluator`.

---

## Technology Stack

| Layer | Technology |
|---|---|
| AI Engine | Python + python-chess + NumPy |
| Web Framework | FastAPI 0.111 + Uvicorn |
| Real-time | WebSockets (native FastAPI) |
| Data Validation | Pydantic v2 |
| Frontend | React 18 + TypeScript + Vite |
| UI Components | react-chessboard + Lucide + TailwindCSS |
| Testing | pytest + pytest-asyncio |
| Optional DB | SQLAlchemy + aiosqlite |

---

## License

MIT
