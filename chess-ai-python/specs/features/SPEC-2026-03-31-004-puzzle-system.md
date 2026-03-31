---
title: "Rated Puzzle Training System"
id: "SPEC-2026-03-31-004"
author: "Chess AI Development Team"
status: "Implemented"
created: "2026-03-31"
updated: "2026-03-31"
type: "feature"
---

## Overview

### Problem Statement
Players need tactical training with rated puzzles. The system must match puzzle difficulty to player rating, verify solutions, and update both ratings with FIDE-style Elo.

### Goals
- Serve rating-matched puzzles from DB per authenticated player
- Verify submitted solutions (exact UCI move sequence)
- Update player and puzzle ratings via Elo delta
- PuzzlePanel React component for interactive solving

### Scope
**In scope:** Puzzle CRUD, solution verification, Elo update, REST API, frontend component  
**Out of scope:** Bulk puzzle import from Lichess (future), puzzle generation

---

## Requirements

### Functional Requirements
- FR-001: `GET /api/puzzles/next` MUST require Bearer token
- FR-002: Puzzle selection MUST prefer puzzles within ±200 of player rating
- FR-003: Solution MUST match exact UCI move sequence
- FR-004: Both player and puzzle ratings update after submission
- FR-005: `GET /api/puzzles/stats` MUST return accuracy, streak, total solved

### Non-Functional Requirements
- NFR-001: Puzzle fetch < 50ms (single DB query)
- NFR-002: Rating update is atomic (no partial writes)

### Dependencies
- JWT auth (`get_current_player` dependency)
- `db/repositories.py` PuzzleRepo
- FIDE Elo calculator (`fide/rating.py`)

---

## Design

### Data Model
```
puzzles: id, fen, side_to_move, solution_moves (JSON), rating, themes (JSON),
         opening_eco, times_played, times_solved
```

### API Design
```
GET  /api/puzzles/next              → Puzzle (requires Bearer)
POST /api/puzzles/submit            → { correct, delta, player_rating_after, ... }
GET  /api/puzzles/stats             → { total, solved, accuracy, streak, rating }
```

### Frontend
`PuzzlePanel.tsx` — fetch puzzle → display board → handle drag moves → submit → show result + delta badge

---

## Acceptance Criteria

### Definition of Done
- [x] Unauthenticated `/next` returns 401
- [x] Correct solution returns `correct: true` and positive delta
- [x] Wrong solution returns `correct: false` and negative delta
- [x] Player rating persists across sessions (DB write)
- [x] Frontend displays solution moves and quality explanation

### Test Cases
- TC-001: `GET /api/puzzles/next` without token → 401
- TC-002: Submit correct solution → `correct: true`, `delta > 0`
- TC-003: Submit wrong solution → `correct: false`, `delta < 0`
- TC-004: Stats endpoint returns `accuracy` field between 0–100
