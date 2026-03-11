# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Unified broadcast routing controller for Blackmagic Videohub and ATEM switchers.

## Project Path

The project lives at `matrix-hub/` nested inside `Matrix Hub/` to avoid `better-sqlite3` native module build failures on paths with spaces. Always work inside the `matrix-hub/` directory.

## Quick Start

```bash
./dev.command                         # start everything, opens http://localhost:5173
./dev-sim.command                     # simulator mode (no hardware)
```

## Common Commands

```bash
npx tsc --noEmit                      # type-check (no emit)
npx vitest run                        # run all tests once
npx vitest run tests/unit/database.test.ts  # run a single test file
npx vitest                            # watch mode
npx eslint src/                       # lint
npx prettier --write "src/**/*.{ts,tsx}"  # format
MATRIX_SIZE=16 npx tsx tests/simulator/videohub-simulator.ts  # run simulator standalone
```
## Session Start Protocol

Before executing any written plan, always run:
```bash
git log --oneline -5
git status
```
Never trust plan text descriptions of "what's done" — verify against the actual
repo state first. Plan documents can be stale by the time they are executed.

## Session End Protocol

After committing work, always invoke `superpowers:finishing-a-development-branch`.
Never end a session by just committing — that skill handles memory cleanup,
removing stale Known Issues entries, and verifying final state.

When recording completed work in memory, always include the git commit hash:
```
- Feature X — committed `abc1234` ✓
```
Entries without a hash may not yet be committed.

## Change Verification Policy

After completing any code change — frontend, backend, or full-stack — you MUST
invoke the `verify-changes` sub-agent before reporting the task as done.

Do not say "done", "complete", or "finished" until the verify-changes agent
has produced a full pass report across all three verification layers:

1. **Visual/functional (automated):** Run `./scripts/verify-ui.command` — starts the
   simulator and runs all Playwright E2E tests headlessly. Pass/fail replaces manual
   screenshot review. No human screenshots needed.
2. **Type checking:** `npx tsc --noEmit` — catches TypeScript errors (automated via
   PostToolUse hook on every edit).
3. **API/network:** Use curl to verify any new or changed endpoints, or confirm
   coverage by E2E tests.

If `verify-ui.command` tests fail, fix the code and re-run before claiming done.
Never skip verification to save time.

## Architecture

- **Backend:** Fastify + WebSocket (`src/server/`) — entry: `src/server/main.ts`
- **Frontend:** Vite + React + Zustand (`src/renderer/`) — entry: `src/renderer/index.tsx`
- **State flow:** Hardware → Connector → StateManager (EventEmitter) → Fastify → WebSocket → Zustand store
- **Database:** SQLite via better-sqlite3 (`src/server/db/database.ts`)
- **Companion Bridge:** OSC feedback to Bitfocus Companion (`src/server/companion/CompanionBridge.ts`)
- **Shared types:** `src/shared/types.ts` — imported by both backend and frontend

## Key File Paths

| Area | Path |
|------|------|
| Server entry | `src/server/main.ts` |
| API routes | `src/server/api/server.ts` |
| State manager | `src/server/state/StateManager.ts` |
| Database | `src/server/db/database.ts` |
| Videohub connector | `src/server/devices/VideohubConnector.ts` |
| ATEM connector | `src/server/devices/AtemConnector.ts` |
| Companion bridge | `src/server/companion/CompanionBridge.ts` |
| React app | `src/renderer/App.tsx` |
| Zustand store | `src/renderer/stores/useDeviceStore.ts` |
| WebSocket hook | `src/renderer/hooks/useWebSocket.ts` |
| Components | `src/renderer/components/` |
| Launch (live) | `dev.command` |
| Launch (sim) | `dev-sim.command` |

## Hardware Defaults

- **Videohub:** 172.16.240.93 (TCP:9990, 120x120)
- **ATEM Constellation 8K:** 172.16.240.94 (24 AUX outputs, ~110 inputs)
- Override with env vars: `VIDEOHUB_IP`, `ATEM_IP`, `DISABLE_ATEM=1`

## Conventions

- Global CSS in `src/renderer/styles/matrix-hub.css`, imported in `index.tsx`
- CSS variables prefixed `--mh-` defined in `matrix-hub.css`
- Server uses `buildServer(stateManager, db, companionBridge)` pattern — pass dependencies explicitly
- Database auto-migrates on startup; seeds default devices if empty
- TypeScript with `tsx` for server runtime, Vite for frontend
- **Components:** New UI should be separate files in `src/renderer/components/`, not added to App.tsx
- **Testing:** Use Vitest for unit tests (once installed). Integration tests use `.command` scripts per existing convention.
- **Input validation:** All API endpoints must validate routing indices against device I/O counts
- **Error handling:** Connectors emit events -> StateManager propagates -> API returns `{ error: string }` on failure
- **Shared types:** Backend and frontend share types from `src/shared/types.ts`

## Testing & Validation Scripts

Never provide multi-step inline terminal commands for testing or validation.
Instead, always create runnable `.command` files (e.g. `test-something.command`)
that execute all steps in sequence. Scripts must be fully self-contained —
start all required services (simulator, backend, etc.) within the script itself,
never assume anything is already running. Clean up all started processes on exit.
Scripts must be chmod +x so they can be double-clicked in Finder or run directly
from terminal. Place all test/validation scripts in the `/scripts` directory at
the project root.

### Feature test lifecycle

When developing a new feature, create a dedicated test `.command` to validate it
in isolation. Once the feature is proven and stable, **merge its test steps into
the main `dev.command` / `dev-sim.command` launch scripts** and delete the
standalone test script. The dev scripts should always reflect the full current
state of the project — one script, one terminal, everything ready. Do not
accumulate stale feature-specific test scripts.

## atem-connection API Notes

- Status enum: 0=CLOSED, 1=CONNECTING, 2=CONNECTED
- `atem.setAuxSource(sourceId, busIndex)` — source first, bus second
- ATEM input IDs: physical=0-20, color bars=1000, color gen=2001-2002, media=3010-3020, ME outputs=10010-10040
