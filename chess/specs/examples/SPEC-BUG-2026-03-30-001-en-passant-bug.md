---
title: "En Passant Move Validation Bug"
id: "SPEC-BUG-2026-03-30-001"
author: "Chess Bug Fix Team"
status: "Draft"
created: "2026-03-30"
updated: "2026-03-30"
type: "chess-bug"
---

## Overview

### Bug Description
The chess engine incorrectly validates en passant moves, allowing illegal en passant captures and rejecting legal ones. This affects games where pawns advance two squares and creates incorrect game states.

### Impact
- Players cannot perform legal en passant captures
- Illegal en passant moves are incorrectly allowed
- Game analysis tools report incorrect positions
- Tournament games may be decided incorrectly

### Severity
High - Affects core chess rules and game integrity

### Affected Components
- Move validation engine
- Legal move generation
- Game state management
- Chess notation parser

## Root Cause Analysis

### Symptoms
- En passant moves rejected when they should be legal
- En passant moves accepted when they should be illegal
- En passant rights not properly tracked
- Inconsistent behavior across different positions

### Root Cause
The en passant validation logic has several issues:
1. En passant target square calculation is incorrect
2. En passant rights tracking doesn't reset properly
3. Move validation doesn't check pawn position correctly
4. Time window for en passant is not properly enforced

### Reproduction Steps
1. Start a new chess game
2. Move white pawn from e2 to e4
3. Move black pawn from d7 to d5
4. Attempt to play exd6 (en passant)
5. Observe that the move is incorrectly rejected

### Environment
- All chess engine versions
- All game modes (AI, multiplayer, analysis)
- All platforms (web, desktop, mobile)

## Fix Strategy

### Approach
1. Fix en passant target square calculation
2. Implement proper en passant rights tracking
3. Correct move validation logic for en passant
4. Add comprehensive en passant position tests
5. Update chess notation handling

### Alternative Approaches
- **Complete rewrite**: Rebuild en passant logic from scratch
  - *Rejected*: Too risky and time-consuming
- **Incremental fixes**: Fix individual issues one by one
  - *Selected*: Lower risk, allows thorough testing of each fix

### Risks
- **Regression risk**: Fixes might break other pawn move logic
- **Performance risk**: Additional validation might slow down move generation
- **Compatibility risk**: Existing games might be affected

## Implementation

### Code Changes
#### 1. En Passant Rights Tracking
```python
class EnPassantRights:
    target_square: Optional[str]  # e.g., "e6" or "d6"
    capturing_pawn_file: Optional[str]  # e.g., "e" or "d"
    is_available: bool
    move_number: int  # Track when en passant became available
```

#### 2. En Passant Validation Logic
```python
def is_en_passant_legal(board, from_square, to_square, en_passant_rights):
    # Check if en passant is available
    if not en_passant_rights.is_available:
        return False
    
    # Check if target square matches en passant target
    if to_square != en_passant_rights.target_square:
        return False
    
    # Check if capturing pawn is on correct file
    from_file = from_square[0]
    if from_file != en_passant_rights.capturing_pawn_file:
        return False
    
    # Check if pawn is on correct rank
    from_rank = int(from_square[1])
    if board.current_player == "white":
        if from_rank != 5:  # White pawn must be on rank 5
            return False
    else:
        if from_rank != 4:  # Black pawn must be on rank 4
            return False
    
    return True
```

#### 3. En Passant Rights Update
```python
def update_en_passant_rights(board, move):
    # Reset en passant rights
    en_passant_rights = EnPassantRights()
    
    # Check if move is a two-square pawn advance
    if is_pawn_move(move) and abs(int(move.to[1]) - int(move.from[1])) == 2:
        # Calculate en passant target square
        from_rank = int(move.from[1])
        to_rank = int(move.to[1])
        target_rank = (from_rank + to_rank) // 2
        target_square = f"{move.from[0]}{target_rank}"
        
        en_passant_rights.target_square = target_square
        en_passant_rights.capturing_pawn_file = move.from[0]
        en_passant_rights.is_available = True
        en_passant_rights.move_number = board.move_number
    
    return en_passant_rights
```

### Test Changes
#### 1. En Passant Position Tests
```python
def test_en_passant_legal_position():
    # Position: White pawn on e5, black pawn on d7, en passant available on d6
    board = setup_position("4k3/8/8/4Pp2/8/8/8/4K3 w - d6 0 1")
    moves = get_legal_moves(board, "white")
    assert "e5d6" in moves  # En passant should be legal

def test_en_passant_illegal_position():
    # Position: White pawn on e5, black pawn on d7, no en passant available
    board = setup_position("4k3/8/8/4Pp2/8/8/8/4K3 w - - 0 1")
    moves = get_legal_moves(board, "white")
    assert "e5d6" not in moves  # En passant should be illegal
```

#### 2. En Passant Rights Tests
```python
def test_en_passant_rights_after_pawn_advance():
    board = Board.starting_position()
    # White plays e2e4
    board.make_move("e2e4")
    # En passant should be available on e6
    assert board.en_passant_rights.target_square == "e6"
    assert board.en_passant_rights.capturing_pawn_file == "e"
    assert board.en_passant_rights.is_available == True

def test_en_passant_rights_reset_after_move():
    board = Board.starting_position()
    # White plays e2e4 (en passant available)
    board.make_move("e2e4")
    # Black plays d7d5
    board.make_move("d7d5")
    # En passant should still be available on e6
    assert board.en_passant_rights.target_square == "e6"
    # White plays different move
    board.make_move("g1f3")
    # En passant should no longer be available
    assert board.en_passant_rights.is_available == False
```

### Documentation Changes
- Update en passant rules documentation
- Add en passant examples to developer guide
- Update API documentation for en passant moves
- Add troubleshooting guide for en passant issues

## Verification

### Test Cases
**TC-001:** Legal en passant capture
- **Given:** Position with white pawn on e5, black pawn on d7, en passant available on d6
- **When:** White plays exd6 (en passant)
- **Then:** Move is accepted and black pawn on d5 is captured

**TC-002:** Illegal en passant (no en passant available)
- **Given:** Position with white pawn on e5, black pawn on d7, no en passant available
- **When:** White attempts exd6
- **Then:** Move is rejected as illegal

**TC-003:** En passant rights after two-square pawn advance
- **Given:** Starting position
- **When:** White plays e2e4
- **Then:** En passant rights are set for e6

**TC-004:** En passant rights reset after other move
- **Given:** Position with en passant available
- **When:** Player makes a non-en passant move
- **Then:** En passant rights are reset

**TC-005:** En passant with wrong pawn file
- **Given:** Position with white pawn on f5, en passant available on e6
- **When:** White attempts fxe6
- **Then:** Move is rejected (wrong pawn file)

**TC-006:** En passant with wrong pawn rank
- **Given:** Position with white pawn on e4, en passant available on e6
- **When:** White attempts exd6
- **Then:** Move is rejected (wrong pawn rank)

### Rollback Plan
1. Revert en passant validation changes
2. Restore previous en passant rights tracking
3. Remove new en passant tests
4. Update documentation to previous version
5. Monitor for en passant-related issues
6. Communicate rollback to chess community

## Deployment

### Deployment Strategy
1. Deploy to staging environment first
2. Run comprehensive en passant test suite
3. Monitor performance impact
4. Deploy to production with feature flag
5. Gradually enable for all users
6. Monitor for issues and rollback if needed

### Monitoring
- Track en passant move success/failure rates
- Monitor move validation performance
- Watch for en passant-related error reports
- Check game completion rates

### Communication
- Notify chess community about en passant fixes
- Update changelog with bug fix details
- Provide migration guide for affected games
- Document known limitations if any
