---
title: "ECO Opening Explorer"
id: "SPEC-2026-03-31-003"
author: "Chess AI Development Team"
status: "Implemented"
created: "2026-03-31"
updated: "2026-03-31"
type: "feature"
---

## Overview

### Problem Statement
Players need to identify chess openings by position and explore theory. A hardcoded ECO table with prefix-tree lookup enables O(log n) classification without external databases.

### Goals
- Classify any board position against 65+ named ECO openings
- Support name-based search (e.g. "Sicilian")
- Expose via REST API and frontend `OpeningExplorer` component
- Singleton pattern — classifier loaded once per process

### Scope
**In scope:** ECO A00–E97 coverage (65+ entries), FEN classify, UCI-move classify, name search, stats  
**Out of scope:** Full ECO database (500+ openings), transposition handling

---

## Requirements

### Functional Requirements
- FR-001: `classify(board)` MUST return ECO code + name for known positions
- FR-002: `classify_from_moves(uci_list)` MUST replay moves and classify
- FR-003: `search_by_name(query)` MUST return case-insensitive partial matches
- FR-004: `GET /api/openings/classify?fen=…` MUST return 400 for invalid FEN
- FR-005: `GET /api/openings/all` MUST return ≥ 60 openings

### Non-Functional Requirements
- NFR-001: Classification < 5ms (prefix-tree lookup)
- NFR-002: Singleton via `get_classifier()` — no repeated construction

---

## Design

### Architecture
```
_ECO_TABLE (list of OpeningEntry)
    → OpeningClassifier._prefix_map (dict: tuple[uci] → OpeningEntry)
    → classify(board) / classify_from_moves(moves) / search_by_name(q)
```

### API Design
```
GET /api/openings/classify?fen={fen}   → {eco, name, pgn_moves}
GET /api/openings/search?q={query}     → [{eco, name, pgn_moves}]
GET /api/openings/all                  → [{eco, name, pgn_moves}]
GET /api/openings/eco/{code}           → OpeningEntry
GET /api/openings/stats/{eco}          → {eco, games_played, win_rate}
```

---

## Acceptance Criteria

### Definition of Done
- [x] Start position classifies without error
- [x] e4/e5/Nf3 chain classifies as King's Knight (C44)
- [x] "Sicilian" search returns multiple results
- [x] All 8 classifier tests in `test_extensions.py` pass
- [x] All 7 opening route tests in `test_routes.py` pass

### Test Cases
- TC-001: `classify(start_board)` → eco="A00" or similar
- TC-002: `classify_from_moves(["e2e4","e7e5","g1f3"])` → name contains "King"
- TC-003: `search_by_name("sicilian")` → list len > 0
- TC-004: `GET /api/openings/classify?fen=invalid` → 400
