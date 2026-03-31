---
description: Chess Master Pro development workflow with SDD integration
---

## Chess Master Pro Development Workflow

When making changes to Chess Master Pro, follow these chess-specific steps that integrate SDD with TDD.

### Chess Development Workflow

// turbo
1. Create chess specification first:
```
node .windsurf/tools/create-chess-spec.js create --type chess-feature --title "Castling Implementation"
```

// turbo
2. Validate chess specification:
```
node .windsurf/tools/validate-chess-spec.js --spec chess/specs/SPEC-CHESS-2026-03-30-001.md
```

// turbo
3. Generate chess tests from specification:
```
node .windsurf/tools/generate-chess-tests.js --spec chess/specs/SPEC-CHESS-2026-03-30-001.md
```

// turbo
4. Run chess tests (should fail initially):
```
pytest chess/tests/test_castling.py -v --tb=short
```

// turbo
5. Implement chess feature based on specification:
```
# Implement castling logic in chess/engine/castling.py
```

// turbo
6. Run chess tests again (should pass):
```
pytest chess/tests/test_castling.py -v --tb=short
```

// turbo
7. Run chess performance benchmarks:
```
python -m chess.benchmarks --feature castling
```

// turbo
8. Run full chess test suite:
```
pytest chess/tests/ -v --tb=short
```

// turbo
9. Run chess tests with coverage:
```
pytest chess/tests/ --cov=chess --cov-report=term-missing
```

### Chess SDD Rules

1. **Chess Specification First**: No chess code without approved specification
2. **FIDE Compliance Required**: All chess features must comply with FIDE rules
3. **Performance Benchmarks**: AI and engine features must meet performance targets
4. **Position Testing**: All chess features tested with critical positions
5. **Chess Notation**: Support for FEN, SAN, and PGN formats required

### Chess Test Types

#### Unit Tests
```bash
# Chess engine unit tests
pytest chess/tests/unit/engine/ -v

# Chess AI unit tests
pytest chess/tests/unit/ai/ -v

# Chess API unit tests
pytest chess/tests/unit/api/ -v
```

#### Integration Tests
```bash
# Chess engine integration tests
pytest chess/tests/integration/engine/ -v

# Chess multiplayer integration tests
pytest chess/tests/integration/multiplayer/ -v
```

#### Position Tests
```bash
# Critical chess position tests
pytest chess/tests/positions/ -v

# Endgame position tests
pytest chess/tests/positions/endgames/ -v

# Tactical position tests
pytest chess/tests/positions/tactics/ -v
```

#### Performance Tests
```bash
# AI performance tests
pytest chess/tests/performance/ai/ -v

# Engine performance tests
pytest chess/tests/performance/engine/ -v

# Multiplayer performance tests
pytest chess/tests/performance/multiplayer/ -v
```

### Chess Quality Metrics

#### Code Coverage
- **Minimum**: 90% (enforced by pytest-cov)
- **Goal**: 100% for chess engine core
- **AI Engine**: 95% coverage required
- **Multiplayer**: 90% coverage required

#### Performance Benchmarks
- **Move Generation**: >1M positions/second
- **AI Evaluation**: >100K positions/second
- **Network Latency**: <50ms for multiplayer
- **Memory Usage**: <100MB per game session

#### Chess Rules Compliance
- **FIDE Rules**: 100% compliance verified
- **Special Moves**: All special moves tested
- **Game States**: All end conditions tested
- **Notation**: All formats supported

### Chess File Structure

```
chess/
├── specs/                    # Chess specifications
│   ├── game-engine/         # Game engine specs
│   ├── ai-engine/          # AI engine specs
│   ├── multiplayer/         # Multiplayer specs
│   ├── ui-ux/              # UI/UX specs
│   ├── templates/          # Chess spec templates
│   └── examples/           # Chess spec examples
├── src/                    # Chess source code
│   ├── engine/             # Game engine
│   ├── ai/                 # AI implementations
│   ├── api/                # REST API
│   ├── multiplayer/        # Multiplayer logic
│   ├── ui/                 # User interface
│   └── utils/              # Utilities
├── tests/                  # Chess tests
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   ├── positions/          # Position tests
│   └── performance/        # Performance tests
├── benchmarks/             # Performance benchmarks
│   ├── ai/                 # AI benchmarks
│   ├── engine/             # Engine benchmarks
│   └── multiplayer/        # Multiplayer benchmarks
└── docs/                   # Documentation
```

### Chess Development Commands

// turbo
10. Create chess specification:
```
node .windsurf/tools/create-chess-spec.js create --type <type> --title "Title" --author "Author"
```

// turbo
11. Validate chess specification:
```
node .windsurf/tools/validate-chess-spec.js --spec <path-to-spec>
```

// turbo
12. Generate chess tests:
```
node .windsurf/tools/generate-chess-tests.js --spec <path-to-spec>
```

// turbo
13. Run chess position tests:
```
python -m chess.tests.positions --all
```

// turbo
14. Run chess performance benchmarks:
```
python -m chess.benchmarks --all
```

// turbo
15. Validate chess rules compliance:
```
python -m chess.validation.rules --check-all
```

// turbo
16. Test chess notation support:
```
python -m chess.tests.notation --all-formats
```

### Chess Integration with Main SDD

The chess SDD workflow integrates with the main project SDD workflow:

1. **Main SDD**: Use `/sdd` for general project specifications
2. **Chess SDD**: Use `/sdd-chess` for chess-specific specifications
3. **Shared Tools**: Both workflows use the same validation and generation tools
4. **Unified Testing**: All tests run through the same pytest framework
5. **Common Standards**: Both follow the same quality standards

### Chess Best Practices

#### Chess Engine Development
- **Bitboard Representation**: Use bitboards for performance
- **Move Generation**: Optimize for speed and correctness
- **Position Validation**: Verify all chess positions
- **Rules Compliance**: Test against FIDE rules

#### Chess AI Development
- **Algorithm Selection**: Choose appropriate AI algorithms
- **Performance Optimization**: Optimize evaluation functions
- **Difficulty Tuning**: Balance difficulty levels
- **Opening Books**: Integrate professional openings

#### Chess Multiplayer Development
- **Real-time Sync**: Ensure smooth gameplay
- **Network Optimization**: Minimize latency
- **Tournament Support**: Implement tournament systems
- **Rating Systems**: Use standard ELO calculations

#### Chess Testing
- **Position Testing**: Use critical chess positions
- **Performance Testing**: Benchmark all components
- **Integration Testing**: Test component interactions
- **User Testing**: Verify chess player experience

### Chess Troubleshooting

#### Common Issues
- **Move Validation**: Check chess rules compliance
- **Performance**: Profile move generation and AI evaluation
- **Multiplayer**: Verify network synchronization
- **UI Issues**: Test chess board interactions

#### Debug Commands
// turbo
17. Debug chess position:
```
python -m chess.debug.position --fen "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
```

// turbo
18. Debug chess move:
```
python -m chess.debug.move --from "e2" --to "e4"
```

// turbo
19. Debug chess AI:
```
python -m chess.debug.ai --position "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
```

### Chess Documentation

- **API Docs**: OpenAPI specifications for chess endpoints
- **Engine Docs**: Chess engine architecture and algorithms
- **AI Docs**: AI algorithms and performance characteristics
- **Player Guide**: Chess player documentation and tutorials
