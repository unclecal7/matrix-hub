#!/usr/bin/env bash
set -uo pipefail

cd "$(dirname "$0")/.."

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
RESET='\033[0m'

log()       { echo -e "${CYAN}[matrix-hub]${RESET} $1"; }
ok()        { echo -e "${GREEN}[matrix-hub]${RESET} $1"; }
fail()      { echo -e "${RED}[matrix-hub]${RESET} $1"; exit 1; }
fail_soft() { echo -e "${RED}[matrix-hub]${RESET} $1"; }

# Kill anything on our ports
for PORT in 8080 5173 9990; do
  PID=$(lsof -ti tcp:$PORT 2>/dev/null || true)
  if [ -n "$PID" ]; then
    log "Clearing port $PORT (PID $PID)"
    kill -9 $PID 2>/dev/null || true
  fi
done

SIM_PID=""
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  log "Shutting down..."
  kill $SIM_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  wait $SIM_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  log "Done."
  exit 0
}
trap cleanup SIGINT SIGTERM

# --- Start Videohub Simulator ---
log "Starting Videohub simulator (16x16)..."
MATRIX_SIZE=16 npm run simulate:videohub &
SIM_PID=$!

# Wait for simulator
log "Waiting for simulator on :9990..."
for i in $(seq 1 20); do
  if nc -z 127.0.0.1 9990 2>/dev/null; then
    ok "Simulator ready."
    break
  fi
  if ! kill -0 $SIM_PID 2>/dev/null; then
    fail "Simulator crashed."
  fi
  sleep 0.5
done

# --- Start Backend (pointed at simulator) ---
log "Starting backend..."
VIDEOHUB_IP=127.0.0.1 VIDEOHUB_NAME="Simulator" npm start &
BACKEND_PID=$!

log "Waiting for backend on :8080..."
for i in $(seq 1 40); do
  if curl -sf http://localhost:8080/api/devices > /dev/null 2>&1; then
    ok "Backend ready."
    break
  fi
  if ! kill -0 $BACKEND_PID 2>/dev/null; then
    fail "Backend crashed — check output above."
  fi
  sleep 0.5
done

# --- Start Frontend ---
log "Starting frontend..."
npm run dev &
FRONTEND_PID=$!

log "Waiting for frontend on :5173..."
for i in $(seq 1 40); do
  if curl -sf http://localhost:5173 > /dev/null 2>&1; then
    ok "Frontend ready."
    break
  fi
  sleep 0.5
done

echo ""
ok "=== Running E2E Verification ==="
log "Environment: MATRIX_SIZE=16 simulator"
log "Tests:       tests/e2e/"
echo ""

if npx playwright test --reporter=list; then
  ok "All E2E tests PASSED"
  PLAYWRIGHT_EXIT=0
else
  fail_soft "Some E2E tests FAILED — see output above"
  PLAYWRIGHT_EXIT=1
fi

echo ""
log "Shutting down test environment..."
kill $SIM_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
wait $SIM_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
log "Done."
exit $PLAYWRIGHT_EXIT
