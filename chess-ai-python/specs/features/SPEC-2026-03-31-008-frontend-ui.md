---
title: "Frontend Multi-Tab Chess UI (React/TypeScript/TailwindCSS)"
id: "SPEC-2026-03-31-008"
author: "Chess AI Development Team"
status: "Implemented"
created: "2026-03-31"
updated: "2026-03-31"
type: "feature"
---

## Overview

### Problem Statement
A professional chess application needs a unified, responsive UI exposing all backend capabilities — gameplay, puzzles, openings, history replay, live spectating, and tournaments — without page reloads.

### Goals
- Single-page app with 6 tabs: Play, Puzzles, Openings, History, Spectate, Tournament
- JWT auth in header — sign in/out without leaving current tab
- React + TypeScript (zero type errors), TailwindCSS dark theme, lucide-react icons
- Production bundle < 400 kB gzipped

### Scope
**In scope:** All 6 tabs, AuthModal, EvalGraph, useChessGame, useAuth, 374kB prod build  
**Out of scope:** PWA/service worker, E2E Playwright tests (future), mobile native app

---

## Requirements

### Functional Requirements
- FR-001: Tab navigation MUST NOT reload the page or reset game state
- FR-002: Auth state MUST persist across page reloads (localStorage)
- FR-003: `PuzzlePanel` MUST pass Bearer token when user is logged in
- FR-004: `GameHistoryPanel` MUST auto-fetch games when `initialPlayerId` is set (logged-in user)
- FR-005: `SpectatorView` MUST connect to WebSocket on "Watch" click and display live board
- FR-006: `TournamentPanel` MUST pre-fill Register tab from logged-in user profile
- FR-007: TypeScript build MUST produce 0 errors (`tsc && vite build`)

### Non-Functional Requirements
- NFR-001: Production JS bundle ≤ 400 kB gzip
- NFR-002: Chessboard renders within 100ms of tab switch
- NFR-003: TailwindCSS dark theme only (`bg-slate-900` base)

---

## Design

### Component Tree
```
App.tsx
├── Header (logo + tab nav + auth widget)
├── AuthModal (portal, conditional)
├── [Play]       → Chessboard + EvalBar + MoveList + RightPanel (analysis/moves/settings)
├── [Puzzles]    → PuzzlePanel
├── [Openings]   → OpeningExplorer
├── [History]    → GameHistoryPanel (initialPlayerId from useAuth)
├── [Spectate]   → SpectatorView
└── [Tournament] → TournamentPanel (user from useAuth)
```

### Hooks
```typescript
useChessGame(playerColor, strength) → { fen, moveHistory, evalCp, analysis, makePlayerMove, reset, ... }
useAuth() → { user, login, register, logout, refreshRating }
```

### Auth Widget (Header)
- Guest: `Sign In` button → opens `AuthModal`
- Logged in: avatar + display_name + ELO + logout button

### EvalGraph
- Line chart of `evalCp` over move history
- Rendered via `<canvas>` or SVG, scales ±500 cp range

---

## Implementation Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root, tab routing, auth state wiring |
| `src/hooks/useChessGame.ts` | Game state, AI fetch, highlight squares |
| `src/hooks/useAuth.ts` | JWT, localStorage, login/register/logout |
| `src/components/AuthModal.tsx` | Modal with Login/Register tabs |
| `src/components/EvalGraph.tsx` | Evaluation line chart |
| `src/components/PuzzlePanel.tsx` | Rated puzzle trainer |
| `src/components/OpeningExplorer.tsx` | ECO search + stats |
| `src/components/GameHistoryPanel.tsx` | Game list + replay + PGN annotator |
| `src/components/SpectatorView.tsx` | Live WebSocket spectator board |
| `src/components/TournamentPanel.tsx` | Create/join/manage tournaments |

---

## Acceptance Criteria

### Definition of Done
- [x] `npm run build` exits 0 with 0 TypeScript errors
- [x] All 6 tabs render without console errors
- [x] Auth modal registers and logs in against live backend
- [x] Puzzle tab submits moves and shows rating delta
- [x] History tab auto-loads games for logged-in user
- [x] Spectator tab connects to WebSocket and shows live board
- [x] Tournament tab creates a tournament and displays standings

### Test Cases
- TC-001: `tsc` exits 0 — verified in CI via `npm run build`
- TC-002: Bundle size: `dist/assets/index-*.js` ≤ 400 kB gzip
- TC-003: `AuthModal` renders login/register tabs without error
- TC-004: `useAuth` login stores token in `localStorage`
- TC-005: `SpectatorView` WebSocket connect/disconnect state transitions

### Performance Criteria
- Initial load: < 2s on localhost
- Tab switch: < 100ms (conditional rendering, no fetch on switch)
- Puzzle solve round-trip: < 500ms (backend solve + rating update)

### Rollback Plan
- Frontend is statically built; revert by deploying previous `dist/` folder
- Auth tokens expire after 24h — no invalidation endpoint needed for rollback
