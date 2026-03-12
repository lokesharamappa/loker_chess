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
1. **Write the test FIRST** in the appropriate `tests/test_*.py` file
2. Run tests — confirm the new test FAILS (red)
3. Implement the feature in the source module
4. Run tests — confirm the new test PASSES (green)
5. Refactor if needed, re-run tests to confirm no regressions

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
