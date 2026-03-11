#!/usr/bin/env bash
set -uo pipefail

cd "$(dirname "$0")"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

log()  { echo -e "${CYAN}[dev]${RESET} $1"; }
ok()   { echo -e "${GREEN}[dev]${RESET} $1"; }
fail() { echo -e "${RED}[dev]${RESET} $1"; exit 1; }

# Kill anything on our ports
for PORT in 8080 5173; do
  PID=$(lsof -ti tcp:$PORT 2>/dev/null || true)
  if [ -n "$PID" ]; then
    log "Clearing port $PORT (PID $PID)"
    kill -9 $PID 2>/dev/null || true
  fi
done

cleanup() {
  echo ""
  log "Shutting down..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  log "Done."
  exit 0
}

# Start backend
log "Starting backend..."
npm start &
BACKEND_PID=$!

trap cleanup SIGINT SIGTERM

# Wait for backend
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

# Start frontend
log "Starting frontend..."
npm run dev &
FRONTEND_PID=$!

# Wait for frontend then open browser
log "Waiting for frontend on :5173..."
for i in $(seq 1 40); do
  if curl -sf http://localhost:5173 > /dev/null 2>&1; then
    ok "Opening http://localhost:5173"
    open http://localhost:5173
    break
  fi
  sleep 0.5
done

# --- Enable Companion Bridge ---
API="http://127.0.0.1:8080"
OSC_PORT=12321

log "Enabling Companion OSC bridge..."
curl -sf -X PUT "$API/api/settings/companion" \
  -H "Content-Type: application/json" \
  -d "{\"ip\":\"127.0.0.1\",\"oscPort\":$OSC_PORT,\"enabled\":true}" > /dev/null
ok "Companion bridge enabled (OSC → 127.0.0.1:$OSC_PORT)"

# --- Build Companion Module (if present) ---
COMPANION_DIR="$(dirname "$(pwd)")/companion-module-matrix-hub"
if [ -d "$COMPANION_DIR" ]; then
  log "Building Companion module..."
  (cd "$COMPANION_DIR" && yarn build > /dev/null 2>&1) && ok "Companion module built" || log "Companion module build failed (non-fatal)"
fi

DEVICE_ID=$(curl -sf "$API/api/devices" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo ""
ok "=== Matrix Hub running (live hardware) ==="
ok "  Backend:    http://localhost:8080"
ok "  Frontend:   http://localhost:5173"
ok "  Companion:  OSC → 127.0.0.1:$OSC_PORT"
ok "  Device ID:  $DEVICE_ID"
if [ -d "$COMPANION_DIR" ]; then
  echo ""
  ok "Companion module ready. In Companion:"
  ok "  Settings → Developer Modules → path: $(dirname "$COMPANION_DIR")"
  ok "  Connections → Add 'Matrix Hub' → Host: 127.0.0.1, Port: 8080"
fi
echo ""
ok "Press Ctrl+C to stop."
wait $BACKEND_PID $FRONTEND_PID
