---
title: "Tournament Management System — Swiss & Round Robin"
id: "SPEC-2026-03-31-007"
author: "Chess AI Development Team"
status: "Implemented"
created: "2026-03-31"
updated: "2026-03-31"
type: "feature"
---

## Overview

### Problem Statement
Clubs and online communities need structured tournament management with automatic pairing, standings, and tiebreaks — without manual bracket management.

### Goals
- Swiss system: score-based pairing, avoid rematches, Buchholz + Sonneborn-Berger tiebreaks
- Round Robin: everyone plays everyone
- FIDE-compliant Elo update after each rated game
- REST API + TournamentPanel React UI with full lifecycle management

### Scope
**In scope:** Swiss, Round Robin, Knockout formats; pairing; result recording; standings; crosstable; Buchholz/SB tiebreaks  
**Out of scope:** Persistent tournament storage (in-memory dict, future: DB), FIDE pairing rules edge cases

---

## Requirements

### Functional Requirements
- FR-001: `POST /api/tournaments/create` MUST return a UUID tournament_id
- FR-002: Swiss pairing MUST avoid rematches across all rounds
- FR-003: Standings MUST be sorted by score DESC, Buchholz DESC, SB DESC
- FR-004: `GET /{id}` MUST return HTTP 404 for unknown tournament IDs
- FR-005: Registration MUST be rejected when max_players is reached (HTTP 400)
- FR-006: `start-round` MUST generate bye for odd player counts
- FR-007: Result values MUST be one of: `1-0`, `0-1`, `1/2-1/2`, `W`, `L`, `BYE`

### Non-Functional Requirements
- NFR-001: Pairing algorithm O(n²) — acceptable for max 256 players
- NFR-002: All tournament state in-memory; requests are stateless

### Dependencies
- `fide/tournament.py` — SwissTournament, TournamentConfig, TournamentFormat
- `fide/rating.py` — FIDERatingCalculator, K-factor logic

---

## Design

### Architecture
```
TournamentPanel (React)
    ↕ REST
/api/tournaments/
├── POST create          → UUID
├── POST {id}/register   → registered
├── POST {id}/start-round → [{white, black}] pairings
├── POST {id}/result     → recorded
├── GET  {id}            → TournamentStatusResponse (standings)
├── GET  {id}/rounds/{n} → [{white, black, result}]
└── GET  {id}/crosstable → N×N dict
```

### Tiebreak Calculation
- **Buchholz**: sum of opponents' scores
- **Sonneborn-Berger**: sum of opponents' scores × own result vs that opponent

### Frontend UI (TournamentPanel)
| View | Description |
|------|-------------|
| Lobby | Create button, search by UUID |
| Create Form | name, format, time_control, rounds, max_players, rated |
| Tournament View → Standings | rank, name, ELO, score, GP, Buchholz, SB |
| Tournament View → Pairings | round nav, result picker, Start Next Round |
| Tournament View → Crosstable | N×N grid lazy-loaded |
| Tournament View → Register | pre-fills from logged-in user |

---

## Acceptance Criteria

### Definition of Done
- [x] Create Swiss tournament → register 4 players → start round → get pairings
- [x] Record results → standings update with correct scores
- [x] Registration to full tournament returns HTTP 400
- [x] Non-existent tournament returns HTTP 404
- [x] All 10 tournament tests in `test_routes.py` pass
- [x] Frontend TournamentPanel builds with 0 TypeScript errors

### Test Cases
- TC-001: Create tournament → 200 + `tournament_id` UUID
- TC-002: Register 4 players → start round → 2 pairings returned
- TC-003: Record `1-0` → standings show white player with 1.0 score
- TC-004: Register to full (2-player cap) → HTTP 400
- TC-005: GET unknown UUID → HTTP 404
- TC-006: Crosstable endpoint → 200 + `crosstable` dict key

### Rollback Plan
- Tournament data is in-memory only — restart clears all tournaments
- Future: persist to SQLAlchemy `tournaments` table
