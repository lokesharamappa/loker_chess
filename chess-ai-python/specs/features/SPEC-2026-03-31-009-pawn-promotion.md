---
title: "Pawn Promotion — Piece Selection Dialog"
id: "SPEC-2026-03-31-009"
author: "Chess AI Development Team"
status: "Implemented"
created: "2026-03-31"
updated: "2026-03-31"
type: "bug"
---

## Overview

### Problem Statement
When a pawn reached the opponent's back rank, the piece was silently auto-promoted to a queen without showing a selection dialog. The user had no way to choose rook, bishop, or knight (underpromotion is legal and strategically important in chess).

### Root Cause
`onDrop()` in `App.tsx` contained a ternary that hardcoded the promotion piece:
```typescript
const promotion = piece[1]?.toLowerCase() === 'p' &&
  (tgt[1] === '8' || tgt[1] === '1') ? 'q' : undefined
return makePlayerMove(src, tgt, promotion)
```
The `react-chessboard` props `promotionToSquare` and `onPromotionPieceSelect` were never set, so the library's built-in promotion dialog never appeared.

### Goals
- Show the native `react-chessboard` promotion dialog (Q/R/B/N) when a pawn reaches the back rank
- Execute the move with the user's actual choice
- Handle dialog cancellation gracefully (clear pending state)

### Scope
**In scope:** Player pawn promotion via drag-and-drop  
**Out of scope:** AI pawn promotion (already handled via UCI move string), promotion by click-to-move

---

## Requirements

### Functional Requirements
- FR-001: Dragging a pawn to the back rank MUST show a piece selection popup (Q, R, B, N)
- FR-002: Selecting a piece MUST execute the move with that promotion piece
- FR-003: Closing/cancelling the dialog MUST NOT leave the pawn on the back rank
- FR-004: White pawn to rank 8 AND Black pawn to rank 1 MUST both trigger the dialog
- FR-005: AI pawn promotion MUST remain unaffected (handled by UCI 5th char)

### Non-Functional Requirements
- NFR-001: No TypeScript errors introduced
- NFR-002: Promotion dialog uses the library's built-in UI (no custom modal needed)

---

## Design

### Fix Implementation

```typescript
// State
const [promotionSquare, setPromotionSquare] = useState<string | null>(null)
const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null)

// onDrop — detect promotion, store pending, open dialog
function onDrop(src: string, tgt: string, piece: string): boolean {
  const isPawn = piece[1]?.toUpperCase() === 'P'
  const isBackRank = tgt[1] === '8' || tgt[1] === '1'
  if (isPawn && isBackRank) {
    setPendingPromotion({ from: src, to: tgt })
    setPromotionSquare(tgt)
    return false   // ← suppress move; dialog will handle it
  }
  return makePlayerMove(src, tgt)
}

// onPromotionPieceSelect — execute with chosen piece
function onPromotionPieceSelect(piece?: string): boolean {
  if (!pendingPromotion) { setPromotionSquare(null); return false }
  const promoLetter = piece ? piece[1]?.toLowerCase() : 'q'   // 'q','r','b','n'
  const result = makePlayerMove(pendingPromotion.from, pendingPromotion.to, promoLetter)
  setPendingPromotion(null)
  setPromotionSquare(null)
  return result
}
```

### Chessboard Props Required
```tsx
<Chessboard
  onPieceDrop={onDrop}
  onPromotionPieceSelect={onPromotionPieceSelect}   // ← NEW
  promotionToSquare={promotionSquare as any}          // ← NEW
  ...
/>
```

### react-chessboard Promotion Contract
All three must be set together:
1. `promotionToSquare` — set to target square string → opens dialog; `null` → closes
2. `onPromotionPieceSelect(piece?)` — receives `"wQ"|"wR"|"wB"|"wN"|"bQ"...`
3. Return `false` from `onPieceDrop` — suppresses the default move execution

---

## Acceptance Criteria

### Definition of Done
- [x] White pawn dragged to rank 8 → promotion dialog appears
- [x] Black pawn dragged to rank 1 → promotion dialog appears
- [x] Selecting Queen → queen appears on target square, AI responds
- [x] Selecting Rook → rook appears (underpromotion works)
- [x] Selecting Bishop / Knight → each promotes correctly
- [x] `npm run build` exits 0 (0 TypeScript errors)

### Test Cases
- TC-001: `onDrop("e7", "e8", "wP")` → returns `false`, sets `promotionSquare="e8"`
- TC-002: `onPromotionPieceSelect("wR")` with pending `{from:"e7", to:"e8"}` → calls `makePlayerMove("e7","e8","r")`
- TC-003: `onPromotionPieceSelect(undefined)` → clears state, returns `false`
- TC-004: Non-pawn piece drop → `onDrop` calls `makePlayerMove` directly (no dialog)

### Lessons Learned
- Never silently auto-promote without a UI choice — it violates chess rules and UX expectations.
- When using a third-party board library, always read its promotion API before implementing custom logic.
- Write tests for special moves (promotion, castling, en passant) as part of the initial feature spec.
