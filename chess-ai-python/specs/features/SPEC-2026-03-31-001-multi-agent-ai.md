---
title: "Multi-Agent Chess AI System"
id: "SPEC-2026-03-31-001"
author: "Chess AI Development Team"
status: "Implemented"
created: "2026-03-31"
updated: "2026-03-31"
type: "feature"
---

## Overview

### Problem Statement
A single chess AI algorithm cannot play optimally across all game phases. Opening play requires book knowledge, midgame requires deep tactical search, and endgame requires tablebase accuracy.

### Goals
- Route AI decisions by game phase to the most appropriate specialist agent
- Support ELO 800–3200 via configurable strength profiles
- Return move decisions within configurable time budget

### Scope
**In scope:** OpeningAgent (Polyglot), SearchAgent (Alpha-Beta PVS), EndgameAgent (Syzygy), orchestrator routing  
**Out of scope:** Self-play training, online learning during play

### Stakeholders
Frontend game UI, `/api/games/ai-move` endpoint, WebSocket game handler

---

## Requirements

### Functional Requirements
- FR-001: Orchestrator MUST route to OpeningAgent when book moves exist
- FR-002: Orchestrator MUST route to EndgameAgent when ≤7 pieces and tablebase available
- FR-003: SearchAgent MUST respect `time_limit_ms` budget with iterative deepening abort
- FR-004: Eight strength levels MUST be supported: beginner(800) → super_gm(3200)
- FR-005: AI MUST return a legal move in all non-terminal positions

### Non-Functional Requirements
- NFR-001: Response time ≤ `time_limit_ms` + 100ms margin
- NFR-002: Search depth scales linearly with strength level (depth 2–30)

### Constraints
- No GPU inference; NumPy/Python only
- Must be importable without Syzygy files (graceful fallback)

### Dependencies
- `python-chess` for board representation and legal move generation
- `core/evaluator.py` for static position evaluation

---

## Design

### Architecture
```
ChessAIOrchestrator
├── OpeningAgent  → Polyglot book lookup (weighted random)
├── SearchAgent   → AlphaBetaSearch (PVS, TT, LMR, null-move, QSearch)
└── EndgameAgent  → Syzygy tablebase probing (perfect ≤7-piece play)
```

### Strength Profiles
| Level        | ELO  | Depth |
|-------------|------|-------|
| beginner    | 800  | 2     |
| novice      | 1200 | 4     |
| intermediate| 1600 | 6     |
| advanced    | 2000 | 10    |
| expert      | 2400 | 14    |
| master      | 2600 | 18    |
| grandmaster | 2800 | 22    |
| super_gm    | 3200 | 30    |

### API Design
```
POST /api/games/ai-move
Body: { fen, strength, time_limit_ms }
Returns: { move_uci, move_san, score_str, depth, nodes, time_ms, source, pv }
```

---

## Implementation Plan

### Tasks
- [x] `agents/base_agent.py` — AgentConfig, AgentDecision dataclasses
- [x] `agents/opening_agent.py` — Polyglot book lookup
- [x] `agents/search_agent.py` — Alpha-Beta PVS with STRENGTH_PROFILES
- [x] `agents/endgame_agent.py` — Syzygy tablebase wrapper
- [x] `agents/orchestrator.py` — Phase detection + routing

### Testing Strategy
- Unit: each agent produces legal moves from test positions
- Integration: orchestrator routes correctly by piece count and phase

---

## Acceptance Criteria

### Definition of Done
- [x] All 8 strength levels return legal moves
- [x] Opening positions use book source when available
- [x] `time_limit_ms` is respected (±100ms)
- [x] `tests/test_agents.py` passes

### Test Cases
- TC-001: `beginner` vs starting position returns legal UCI move
- TC-002: Endgame (2 kings + queen) routes to EndgameAgent
- TC-003: Search aborts within time budget at all depths
