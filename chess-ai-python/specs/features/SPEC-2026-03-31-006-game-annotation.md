---
title: "Game Annotation Service"
id: "SPEC-2026-03-31-006"
author: "Chess AI Development Team"
status: "Implemented"
created: "2026-03-31"
updated: "2026-03-31"
type: "feature"
---

## Overview

### Problem Statement
Players need post-game analysis with move quality symbols (blunders, mistakes, brilliant moves) to understand where games were won or lost, matching standard chess notation used by FIDE and online platforms.

### Goals
- Annotate every move with engine evaluation delta and quality symbol
- Export annotated PGN with comments
- Expose REST endpoint for any PGN input
- Frontend replay with quality badges per move

### Scope
**In scope:** Move quality classification, PGN export, `/api/history/annotate` endpoint, GameHistoryPanel replay  
**Out of scope:** Opening annotation, endgame tablebase annotation

---

## Requirements

### Functional Requirements
- FR-001: `classify_quality(delta_cp)` MUST assign one of 7 quality labels
- FR-002: Annotated PGN MUST include `{quality: eval}` comments per move
- FR-003: `POST /api/history/annotate` MUST accept any valid PGN string
- FR-004: Summary MUST include accuracy percentage and per-quality counts
- FR-005: Frontend MUST reconstruct FENs via `chess.js` for annotated games (no `fen_after` from API)

### Quality Classification Table
| Symbol | Quality     | Delta CP   |
|--------|-------------|------------|
| `!!`   | Brilliant   | ≥ +200     |
| `!`    | Good        | ≥ +50      |
| (none) | Best        | ≥ 0        |
| `!?`   | Interesting | < 0        |
| `?!`   | Inaccuracy  | ≤ −50      |
| `?`    | Mistake     | ≤ −100     |
| `??`   | Blunder     | ≤ −300     |

---

## Design

### Architecture
```python
GameAnnotator(depth, time_per_move_ms)
├── annotate_game(pgn_text) → (annotations, annotated_pgn)
├── annotate_board_sequence(boards) → annotations
└── classify_moves(annotations) → {accuracy, counts, summary}
```

### API Design
```
POST /api/history/annotate
Body: { pgn, depth, time_per_move_ms }
Returns: { annotated_pgn, move_count, summary, moves: [{move_number, uci, san, eval_cp, quality}] }
```

### Frontend Bug Fixed
Annotated PGNs from `/annotate` have no `fen_after` field. Frontend reconstructs FENs by replaying UCI moves through `chess.js`:
```typescript
const chess = new Chess()
moves.map(m => { chess.move({from, to, promotion}); return {...m, fen_after: chess.fen()} })
```

---

## Acceptance Criteria

### Definition of Done
- [x] `??` assigned for moves losing ≥300cp
- [x] `!!` assigned for moves gaining ≥200cp
- [x] Annotated PGN roundtrip parses without error
- [x] All 12 quality + annotator tests in `test_extensions.py` pass
- [x] Frontend replays annotated games with correct FEN at each move

### Test Cases
- TC-001: delta=-350 → `??` (Blunder)
- TC-002: delta=-75 → `?!` (Inaccuracy)
- TC-003: delta=+250 → `!!` (Brilliant)
- TC-004: None delta → None quality (unknown)
- TC-005: `POST /api/history/annotate` with valid PGN → 200 + moves list
