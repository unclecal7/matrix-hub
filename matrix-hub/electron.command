#!/usr/bin/env bash
set -uo pipefail

cd "$(dirname "$0")"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
RESET='\033[0m'

log()  { echo -e "${CYAN}[matrix-hub]${RESET} $1"; }
ok()   { echo -e "${GREEN}[matrix-hub]${RESET} $1"; }
fail() { echo -e "${RED}[matrix-hub]${RESET} $1"; exit 1; }

log "Killing any stale processes on port 8080..."
STALE=$(lsof -ti:8080 2>/dev/null)
if [ -n "$STALE" ]; then
  kill -9 $STALE 2>/dev/null && ok "Cleared stale processes: $STALE" || true
else
  ok "Port 8080 is free."
fi

log "Building app..."
npm run build:all || fail "Build failed."

log "Rebuilding native modules for Electron..."
npm run electron:rebuild || fail "electron-rebuild failed."

log "Re-signing native module (ad-hoc) after rebuild..."
codesign --sign - --force \
  "./node_modules/better-sqlite3/build/Release/better_sqlite3.node"

log "Re-signing Electron.app (ad-hoc)..."
codesign --sign - --force \
  "./node_modules/electron/dist/Electron.app"

ok "Launching Electron..."
exec ./node_modules/.bin/electron dist/main/main/main.js
