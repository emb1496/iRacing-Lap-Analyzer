#!/usr/bin/env bash
# Measure test coverage for every layer and for all of them together.
#
#   backend unit         pytest tests                    (in-process)
#   backend integration  pytest tests_integration        (uvicorn in a subprocess, run under coverage)
#   backend e2e          playwright test                 (same server, driven by a browser)
#   frontend unit        jest                            (in-process)
#   frontend e2e         playwright test                 (Istanbul-instrumented bundle in Chromium)
#
# Backend: each layer is reported on its own, then merged; the merged result must be 100%.
# Frontend: jest (unit) must be 100%; the browser (e2e) layer is reported separately.
# Set PYTHON / CHROMIUM_PATH as for the e2e suite.
# HTML reports: backend/htmlcov, frontend/coverage/lcov-report, frontend/coverage-e2e.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
python="${PYTHON:-python}"
export PYTHON="$python"
cd "$root"

banner() { printf '\n\033[1m== %s ==\033[0m\n' "$*"; }

rm -rf backend/.coverage* backend/htmlcov frontend/coverage frontend/coverage-e2e e2e/.tmp/coverage

# ---- backend -------------------------------------------------------------------------------
cd "$root/backend"

banner "backend unit tests"
COVERAGE_FILE=.coverage.unit "$python" -m pytest tests -q --cov --cov-report= --cov-fail-under=0

banner "backend integration tests (real server over HTTP)"
(cd "$root/frontend" && npm exec -- vite build >/dev/null)   # so the static-serving tests run
LAP_SERVER_COVERAGE=1 COVERAGE_FILE=.coverage.integration "$python" -m pytest tests_integration -q

banner "e2e tests (browser -> real server, instrumented frontend)"
(cd "$root/e2e" && E2E_COVERAGE=1 CI="${CI:-}" npx playwright test)

# The server writes one data file per process; fold each layer into a single file.
for layer in integration e2e; do
  COVERAGE_FILE=.coverage.$layer "$python" -m coverage combine -q
done

banner "backend coverage per layer"
for layer in unit integration e2e; do
  printf '%-12s' "$layer"
  "$python" -m coverage report --data-file=.coverage."$layer" --fail-under=0 | tail -1
done

banner "backend coverage, all layers merged (must be 100%)"
"$python" -m coverage combine -q --keep --data-file=.coverage .coverage.unit .coverage.integration .coverage.e2e
"$python" -m coverage html -q
"$python" -m coverage report --skip-covered

# ---- frontend ------------------------------------------------------------------------------
cd "$root/frontend"

banner "frontend unit tests (must be 100%)"
npx jest --coverage --coverageReporters=text-summary --coverageReporters=lcov

# Jest instruments the TypeScript source; the e2e bundle is instrumented after Vite transpiles it
# and mapped back through source maps. The two statement maps differ, so Istanbul cannot merge
# them: the e2e layer is reported on its own, as a measure of what a real browser exercises.
banner "frontend e2e coverage (informational)"
"$root/e2e/node_modules/.bin/nyc" report --temp-dir "$root/e2e/.tmp/coverage" --cwd "$root/frontend" \
  --include 'src/**' --exclude 'src/**/__tests__/**' --exclude 'src/test/**' \
  --reporter=text-summary --reporter=html --report-dir "$root/frontend/coverage-e2e"

# The e2e run left an instrumented bundle in frontend/dist; put back a plain one.
(cd "$root/frontend" && npm exec -- vite build >/dev/null)
