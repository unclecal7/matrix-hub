#!/usr/bin/env bash
set -uo pipefail

cd "$(dirname "$0")"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

log()  { echo -e "${CYAN}[start]${RESET} $1"; }
ok()   { echo -e "${GREEN}[start]${RESET} $1"; }
warn() { echo -e "${YELLOW}[start]${RESET} $1"; }
fail() { echo -e "${RED}[start]${RESET} $1"; exit 1; }

# Build frontend if dist is missing
if [ ! -f dist/renderer/index.html ]; then
  warn "dist/renderer/index.html not found — building frontend..."
  npm run build || fail "Build failed — check output above."
  ok "Build complete."
fi

# Kill anything on port 8080
PID=$(lsof -ti tcp:8080 2>/dev/null || true)
if [ -n "$PID" ]; then
  log "Clearing port 8080 (PID $PID)"
  kill -9 $PID 2>/dev/null || true
fi

SERVER_PID=""

cleanup() {
  echo ""
  log "Shutting down..."
  if [ -n "$SERVER_PID" ]; then
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
  fi
  log "Done."
  exit 0
}

trap cleanup SIGINT SIGTERM

# Start production server
log "Starting production server..."
npm run start:prod &
SERVER_PID=$!

# Health-check loop
log "Waiting for server on :8080..."
for i in $(seq 1 40); do
  if curl -sf http://localhost:8080/api/devices > /dev/null 2>&1; then
    ok "Server ready."
    break
  fi
  if ! kill -0 $SERVER_PID 2>/dev/null; then
    fail "Server crashed — check output above."
  fi
  sleep 0.5
done

# Open browser
ok "Opening http://localhost:8080"
open http://localhost:8080

echo ""
ok "=== Matrix Hub running (production) ==="
ok "  URL: http://localhost:8080"
echo ""
ok "Press Ctrl+C to stop."
wait $SERVER_PID
