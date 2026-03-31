---
description: Standard development workflow for the Trading Journal project
---

## Development Workflow

When making changes to the Trading Journal app, follow these steps:

// turbo
1. Run Python tests or diagnostic scripts:
```
python -c "<test_code>"
```

// turbo
2. Restart the Streamlit app after code changes:
```
Get-Process -Name python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
```

// turbo
3. Start the Streamlit dev server:
```
streamlit run app.py --server.port 8501 --server.headless true
```

// turbo
4. Check for Python syntax errors before running:
```
python -m py_compile app.py
```

// turbo
5. Check running processes:
```
Get-Process -Name python -ErrorAction SilentlyContinue
```

// turbo
6. Install Python packages:
```
pip install <package_name>
```

// turbo
7. List installed packages:
```
pip list
```

// turbo
8. Run any read-only git command:
```
git status
git log -n 10
git diff
```

## Test-Driven Development (TDD)

All code changes MUST follow TDD. Tests live in `trading_journal/tests/`.

// turbo
9. Run the full test suite (do this BEFORE and AFTER every code change):
```
python -m pytest tests/ -v --tb=short
```

// turbo
10. Run tests with coverage report:
```
python -m pytest tests/ --cov=utils --cov=brokers --cov=config --cov-report=term-missing
```

// turbo
11. Run a single test file:
```
python -m pytest tests/test_calculations.py -v --tb=short
```

// turbo
12. Run tests matching a keyword:
```
python -m pytest tests/ -k "test_fifo" -v --tb=short
```

### TDD Rules for New Features
1. **Write Specification FIRST** using `/sdd` workflow
2. **Write the test FIRST** in the appropriate `tests/test_*.py` file
3. Run tests — confirm the new test FAILS (red)
4. Implement the feature in the source module
5. Run tests — confirm the new test PASSES (green)
6. Refactor if needed, re-run tests to confirm no regressions
7. **Update Specification** if implementation differs from original design

### Test File Map
| Source Module | Test File |
|---|---|
| `utils/calculations.py` | `tests/test_calculations.py` |
| `utils/trade_store.py` | `tests/test_trade_store.py` |
| `utils/behavioral.py` | `tests/test_behavioral.py` |
| `utils/risk.py` | `tests/test_risk.py` |
| `utils/tax_report.py` | `tests/test_tax_report.py` |
| `brokers/zerodha_console.py` | `tests/test_zerodha_console.py` |
| `brokers/dhan.py` | `tests/test_dhan.py` |
| `brokers/zerodha.py` | `tests/test_zerodha.py` |
| `config.py` | `tests/test_config.py` |

### Coverage Target
- Minimum: 50% (enforced by `.coveragerc`)
- Goal: 80%+ for `utils/` modules

## Specification Driven Development (SDD)

All new features MUST follow SDD before TDD. Use `/sdd` workflow for specifications.

// turbo
13. Create new specification:
```
node .windsurf/tools/create-spec.js create --type feature --title "Feature Title"
```

// turbo
14. Validate specification:
```
node .windsurf/tools/validate-spec.js --spec specs/features/SPEC-YYYY-MM-DD-NNN.md
```

// turbo
15. Generate tests from specification:
```
node .windsurf/tools/generate-tests.js --spec specs/features/SPEC-YYYY-MM-DD-NNN.md
```

// turbo
16. List all specifications:
```
node .windsurf/tools/create-spec.js list
```

### SDD Rules
1. **No Code Without Specification**: No implementation without approved specification
2. **Specification is Truth**: Specification is single source of truth for requirements
3. **Test Against Spec**: Tests verify implementation meets specification
4. **Keep Spec Updated**: Update specification when implementation changes

### Integration with TDD
1. Create specification (SDD)
2. Generate tests from specification
3. Run TDD cycle with generated tests
4. Implement feature based on specification
5. Update specification if needed
