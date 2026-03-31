---
title: "NNUE-Style Neural Position Evaluator"
id: "SPEC-2026-03-31-002"
author: "Chess AI Development Team"
status: "Implemented"
created: "2026-03-31"
updated: "2026-03-31"
type: "feature"
---

## Overview

### Problem Statement
Classical hand-tuned evaluators with PSTs cannot learn positional patterns from data. A neural network evaluator improves positional understanding without GPU requirements.

### Goals
- HalfKA feature set: 12 piece types × 64 squares = 768 binary input features
- 3-layer fully-connected network (768→256→32→1) with CReLU activations
- Blend NNUE (70%) + classical PST (30%) when weights are loaded
- Binary weight persistence with explicit little-endian byte order

### Scope
**In scope:** Feature extraction, forward pass, save/load, training data generation, blend with classical eval  
**Out of scope:** GPU training, NNUE self-play pipeline (future)

---

## Requirements

### Functional Requirements
- FR-001: `evaluate(board)` returns centipawns, side-to-move relative
- FR-002: Feature flip for Black-to-move MUST use `(i+6)%12` mirror formula
- FR-003: Save/load MUST use `struct.pack("<I", arr.nbytes)` for each tensor
- FR-004: `randomize(seed)` MUST initialize He-normal weights in float32
- FR-005: Falls back to classical evaluator when weights file absent

### Non-Functional Requirements
- NFR-001: Forward pass < 1ms on CPU (NumPy vectorised matmul)
- NFR-002: Weight files portable across platforms (explicit endianness)

### Known Bugs Fixed
| Bug | Root Cause | Fix |
|-----|-----------|-----|
| `_flip_features` wrong index | `i^6` wraps incorrectly for i≥8 | Changed to `(i+6)%12` |
| `randomize()` float64 promotion | `.astype(float32)` before scalar multiply | Moved after multiply |
| save/load size mismatch | Used `arr.size` (elements) not `arr.nbytes` | Use `arr.nbytes` + `<I` |

---

## Design

### Architecture
```python
FeatureExtractor → NNUENetwork (w1,b1,w2,b2,w3,b3) → NNUEEvaluator
```

### API
```python
ev = NNUEEvaluator()
score = ev.evaluate(board)           # centipawns, STM-relative
data = ev.generate_training_data(board, result_float)
```

---

## Acceptance Criteria

### Definition of Done
- [x] Start position evaluates to near-zero (±50cp)
- [x] Checkmate position evaluates to ±MATE_SCORE
- [x] Save → load roundtrip preserves weights exactly
- [x] All 11 NNUE tests in `test_extensions.py` pass

### Test Cases
- TC-001: Feature vector length == 768 for any legal position
- TC-002: Flip symmetry: flipped features differ from original
- TC-003: Save+load → forward pass produces identical output
- TC-004: Checkmate FEN evaluates to MATE_SCORE (100000)
