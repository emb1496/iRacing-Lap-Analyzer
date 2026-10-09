#!/usr/bin/env bash
# Measure test coverage, one separate report per kind of test. Nothing is merged.
#
#   1. backend unit         pytest tests                 in-process                       must be 100%
#   2. backend integration  pytest tests_integration     uvicorn / desktop launcher in    near 100%, floor below
#                                                        subprocesses run under coverage
#   3. frontend unit        jest                         in-process                       must be 100%
#   4. frontend e2e         playwright test              Istanbul-instrumented bundle     near 100%, floor below
#                                                        in Chromium, real server
#
# The floors on 2 and 4 are regression guards just under what those suites reach today; raise
# them when you add tests. What is left uncovered there is code the layer cannot reach (error
# paths only a unit test can trigger, a 512 MB upload limit, dead code).
#
# Set PYTHON / CHROMIUM_PATH as for the e2e suite.
# HTML reports: backend/htmlcov/{unit,integration}, frontend/coverage/lcov-report,
# frontend/coverage-e2e.
set -euo pipefail

BACKEND_INTEGRATION_FLOOR=97
FRONTEND_E2E_FLOOR_STATEMENTS=98
FRONTEND_E2E_FLOOR_BRANCHES=96
FRONTEND_E2E_FLOOR_FUNCTIONS=98
FRONTEND_E2E_FLOOR_LINES=99

root="$(cd "$(dirname "$0")/.." && pwd)"
python="${PYTHON:-python}"
export PYTHON="$python"
cd "$root"

banner() { printf '\n\033[1m== %s ==\033[0m\n' "$*"; }

rm -rf backend/.coverage* backend/htmlcov frontend/coverage frontend/coverage-e2e e2e/.tmp/coverage

# ---- 1. backend unit -----------------------------------------------------------------------
cd "$root/backend"

banner "1. backend unit tests (must be 100%)"
COVERAGE_FILE=.coverage.unit "$python" -m pytest tests -q --cov --cov-report=term-missing:skip-covered \
  --cov-report=html:htmlcov/unit

# ---- 2. backend integration ----------------------------------------------------------------
banner "2. backend integration tests (floor ${BACKEND_INTEGRATION_FLOOR}%)"
(cd "$root/frontend" && npm exec -- vite build >/dev/null)   # so the static-serving tests run
LAP_SERVER_COVERAGE=1 COVERAGE_FILE=.coverage.integration "$python" -m pytest tests_integration -q
# Each server process wrote its own data file; fold them into one and report.
COVERAGE_FILE=.coverage.integration "$python" -m coverage combine -q
COVERAGE_FILE=.coverage.integration "$python" -m coverage html -q --directory=htmlcov/integration \
  --fail-under="$BACKEND_INTEGRATION_FLOOR"
COVERAGE_FILE=.coverage.integration "$python" -m coverage report --skip-covered \
  --fail-under="$BACKEND_INTEGRATION_FLOOR"

# ---- 3. frontend unit ----------------------------------------------------------------------
cd "$root/frontend"

banner "3. frontend unit tests (must be 100%)"
npx jest --coverage --coverageReporters=text-summary --coverageReporters=lcov

# ---- 4. frontend e2e -----------------------------------------------------------------------
banner "4. frontend e2e tests, browser coverage (floors ${FRONTEND_E2E_FLOOR_STATEMENTS}% statements," \
       "${FRONTEND_E2E_FLOOR_BRANCHES}% branches)"
(cd "$root/e2e" && E2E_COVERAGE=1 npx playwright test)

"$root/e2e/node_modules/.bin/nyc" report --temp-dir "$root/e2e/.tmp/coverage" --cwd "$root/frontend" \
  --include 'src/**' --exclude 'src/**/__tests__/**' --exclude 'src/test/**' \
  --reporter=text --reporter=html --report-dir "$root/frontend/coverage-e2e" \
  --check-coverage --statements "$FRONTEND_E2E_FLOOR_STATEMENTS" \
  --branches "$FRONTEND_E2E_FLOOR_BRANCHES" --functions "$FRONTEND_E2E_FLOOR_FUNCTIONS" \
  --lines "$FRONTEND_E2E_FLOOR_LINES" | grep -v "100 |\s*100 |\s*100 |\s*100 |"

# The e2e run left an instrumented bundle in frontend/dist; put back a plain one.
(cd "$root/frontend" && npm exec -- vite build >/dev/null)

banner "summary"
cd "$root/backend"
for layer in unit integration; do
  printf 'backend %-12s ' "$layer"
  COVERAGE_FILE=.coverage.$layer "$python" -m coverage report --fail-under=0 | tail -1
done
