# Matrix Hub - GEMINI.md

This file provides context, architectural guidelines, and standard operating procedures for the Gemini CLI agent when working on the **Matrix Hub** project. It is intended to ensure consistent development, testing, and validation practices.

## Project Overview

**Matrix Hub** is a unified broadcast routing controller designed to interface with Blackmagic Videohub and ATEM switchers. The project is primarily composed of two main components:

1. **`matrix-hub/`**: The core application, consisting of a full-stack Node.js + React architecture.
   - **Backend:** Fastify + WebSocket (`src/server/`) powered by `better-sqlite3` for persistence.
   - **Frontend:** React + Vite + Zustand (`src/renderer/`) packaged as a potential Electron app.
   - **State Flow:** Hardware → Connector → StateManager (EventEmitter) → Fastify → WebSocket → Zustand store.
   - **Database:** Auto-migrates on startup and seeds default devices if empty.

2. **`companion-module-matrix-hub/`**: A module for Bitfocus Companion (`@companion-module/base`) to integrate and interact with the Matrix Hub system.

## Building and Running

*Always work inside the relevant directory (e.g., `cd matrix-hub/`) when running commands.*

### `matrix-hub`
- **Start Services (Live Hardware):** `./dev.command` or `./dev.sh`
- **Start Simulator (No Hardware):** `./dev-sim.command`
- **Standalone Simulator:** `MATRIX_SIZE=16 npx tsx tests/simulator/videohub-simulator.ts`
- **Type-Check:** `npx tsc --noEmit`
- **Linting:** `npx eslint src/`
- **Formatting:** `npx prettier --write "src/**/*.{ts,tsx}"`
- **Tests (Unit):** `npx vitest run` or `npx vitest` (watch mode)
- **Tests (E2E):** `npx playwright test`

### `companion-module-matrix-hub`
- **Build:** `npm run build`
- **Watch/Dev:** `npm run dev`

## Development Conventions

- **Component Structure:** New UI elements should be authored as separate files within `src/renderer/components/`, rather than being appended to `App.tsx`.
- **Styling:** Global CSS resides in `src/renderer/styles/matrix-hub.css`. Custom CSS variables must be prefixed with `--mh-`.
- **Server Architecture:** Use the explicit dependency injection pattern `buildServer(stateManager, db, companionBridge)` rather than global singletons.
- **Input Validation:** All API endpoints must strictly validate routing indices against device I/O counts.
- **Error Handling:** Connectors emit events which the `StateManager` propagates, and the API returns `{ error: string }` on failure.
- **Shared Types:** Backend and frontend share types from `src/shared/types.ts`.
- **Testing Scripts:** Never provide multi-step inline terminal commands for testing or validation. Instead, use standalone, self-contained `.command` scripts (e.g., `test-something.command`) located in the `/scripts` directory. Merge feature test scripts into the main `dev.command` scripts once stable.

## Change Verification Policy

Before reporting any development task as complete, you **MUST** ensure the following verification layers pass successfully:

1. **Visual & Functional (Automated):** Execute `./scripts/verify-ui.command`. This script starts the simulator and runs all Playwright E2E tests headlessly. You must fix any failing tests.
2. **Type Checking:** Execute `npx tsc --noEmit` to ensure zero TypeScript errors.
3. **API / Network:** Verify any new or changed API endpoints via curl or ensure comprehensive coverage within E2E tests.

## Session Protocols

1. **Session Start:** Never trust plan text descriptions of "what's done". Verify against the actual repository state first by running `git status` and `git log --oneline -5`.
2. **Session End:** Ensure all completed work is fully verified, and when recording progress in memory, always include the Git commit hash (e.g., `- Feature X — committed abc1234 ✓`).
3. **Important Hardware Defaults:**
   - **Videohub:** `172.16.240.93` (TCP: 9990)
   - **ATEM Constellation 8K:** `172.16.240.94`
   - *These can be overridden via `VIDEOHUB_IP`, `ATEM_IP`, or `DISABLE_ATEM=1` environment variables.*
