# Matrix Hub — Post-Review Fixes

This document records all changes made following the progress report review. Every issue flagged as "Fix Now" or moderate has been addressed. Items requiring new feature work (database, device discovery) are deferred and documented below.

---

## Fixes Applied

### 1. Application Entry Point (`src/server/main.ts`) — **Critical**

**Problem:** No bootstrap file existed. The only way to start the server was a one-liner injected via `npx tsx -e "..."`, which is not repeatable or hand-off-ready.

**Fix:** Created `src/server/main.ts`. It reads device config from environment variables, instantiates `StateManager`, registers the Videohub, and starts the Fastify server.

**Config via env vars:**
| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Server port |
| `VIDEOHUB_ID` | `vh1` | Device ID |
| `VIDEOHUB_IP` | `127.0.0.1` | Videohub IP address |
| `VIDEOHUB_NAME` | `Simulator` | Display name |

**Updated `package.json`** to add a `start` script:
```bash
npm start
# or with overrides:
VIDEOHUB_IP=192.168.1.100 VIDEOHUB_NAME="Studio Router" npm start
```

**Full test stack (3 terminals):**
```bash
# Terminal 1 — simulator
MATRIX_SIZE=120 npm run simulate:videohub

# Terminal 2 — server
npm start

# Terminal 3 — frontend
npm run dev
```

---

### 2. Virtual Scrolling in `App.tsx` — **Critical**

**Problem:** `@tanstack/react-virtual` was listed as a dependency but never imported or used. The routing grid rendered all rows and columns as real DOM nodes. At 120×120, that's 14,400 cells + 120 row headers + 120 column headers = ~14,640 DOM nodes, causing severe UI lag.

**Fix:** Replaced the grid rendering with a virtualized layout using `useVirtualizer` for both axes.

- **Row virtualizer:** vertical, handles both 28px group-header rows and 36px output rows
- **Column virtualizer:** horizontal, all columns are 36px
- **Overscan:** 10 items on each axis to prevent visible pop-in during fast scrolling
- **Sticky headers preserved:** Column headers remain `position: sticky; top: 0`. Row headers remain `position: sticky; left: 0`. The corner block is `position: sticky; left: 0` within the sticky column headers bar, so it locks to the top-left corner during both scroll axes.

At any viewport size, only ~30–40 rows and ~30–40 columns render as DOM nodes regardless of matrix size.

Grid layout constants added to `App.tsx` (must stay in sync with CSS variables):
```ts
const CELL_SIZE = 36;   // --mh-cell
const HEADER_W = 200;   // --mh-header-w
const COL_HEADER_H = 160; // --mh-col-header-h
const GROUP_ROW_H = 28;
```

---

### 3. ATEM `registerAtem()` in `StateManager.ts`

**Problem:** `AtemConnector` was fully implemented but `StateManager` had no `registerAtem()` method. ATEM devices could not be registered, monitored, or routed.

**Fix:** Added `registerAtem(id, ip, name)` to `StateManager`. Handles ATEM-specific event shapes:
- `connected` — emits id only (no state dump unlike Videohub)
- `modelInfo` — updates device name from ATEM model string
- `routingChanged` — maps `{ destination, source }` to `ROUTING_CHANGED`
- `labelsChanged` — maps `{ index, longName }` to `LABELS_CHANGED` (direction: `'input'`)

Usage:
```ts
stateManager.registerAtem('atem1', '192.168.1.200', 'ATEM Constellation');
```

---

### 4. Error Handling in `VideohubConnector.ts`

**Problem:** `socket.write()` calls in `route()`, `setLock()`, and `startPing()` had no error handling. A write error would throw an unhandled exception and crash the server process.

**Fix:** Wrapped all three `socket.write()` calls in try/catch blocks with `console.error` logging. The error is caught and logged; the connector continues operating and will reconnect if the socket is broken.

---

### 5. Error Handling in `server.ts` — WebSocket Broadcast

**Problem:** `client.send()` in the broadcast function had no error handling. A single bad client socket would throw and abort the entire broadcast loop, dropping updates to all other connected clients.

**Fix:**
- Wrapped `client.send()` in try/catch, logging failures via `fastify.log.error`
- Pre-serialized the event to `JSON.stringify(event)` once outside the loop instead of once per client
- Changed the `broadcast` parameter type from `any` to `object`

---

### 6. `FULL_STATE_UPDATE` Merge Fix in `useWebSocket.ts` + `useDeviceStore.ts`

**Problem:** `FULL_STATE_UPDATE` called `setDevices([data.state])`, which replaced the entire device map with a single device. In a multi-device setup this would silently drop all other devices from the UI.

**Fix:**
- Added `updateDevice(device: DeviceState)` action to `useDeviceStore` — merges a single device into the existing map
- `useWebSocket` now calls `updateDevice(data.state)` for `FULL_STATE_UPDATE`, preserving all other devices

---

### 7. TypeScript `any` Types in `App.tsx`

**Problem:** `Object.entries(...).map(([id, data]: any)` at two locations suppressed type inference for input and output data objects.

**Fix:** Removed the `: any` annotations. TypeScript now correctly infers types from `DeviceState.inputs` and `DeviceState.outputs` (both typed in `useDeviceStore.ts`).

---

### 8. Unused Dependencies Removed from `package.json`

The following packages were installed but never imported anywhere in the codebase. Removing them reduces install size and eliminates false signals about available features.

| Package | Removed From | Planned Purpose |
|---|---|---|
| `better-sqlite3` | `dependencies` | Persistence (not yet started) |
| `bonjour-service` | `dependencies` | mDNS device discovery (not yet started) |
| `osc` | `dependencies` | OSC protocol (not yet started) |
| `pino` | `dependencies` | Structured logging (Fastify's built-in logger used instead) |
| `@types/better-sqlite3` | `devDependencies` | Types for removed package |

**Kept:** `electron`, `electron-builder`, `electron-rebuild` — these are the planned desktop packaging target and are in `devDependencies`.

---

## Deferred Items

These issues were identified in the review but require building new features, not just fixing gaps. They are deferred until the current architecture is more stable.

| Item | Reason for Deferral |
|---|---|
| **SQLite persistence** | Requires schema design, migrations, and integration decisions (what gets saved, when, how conflicts resolve). Build after routing workflow is finalized. |
| **mDNS device discovery** | Manual IP registration is sufficient while developing against a simulator. Build when the app needs to be handed to someone without network knowledge. |
| **Automated test suite** | The API contract is still evolving. Write tests once endpoints and event shapes are stable. |
| **CORS hardening** | `origin: '*'` is acceptable for local-only development. Tighten before any network-accessible deployment. |

---

## How to Start the Stack

```bash
# In matrix-hub/ directory

# Terminal 1 — Hardware simulator (120×120)
MATRIX_SIZE=120 npm run simulate:videohub

# Terminal 2 — Node.js + Fastify server
npm start

# Terminal 3 — Vite React frontend
npm run dev
```

Open `http://localhost:5173`. The grid will be fully virtualized and responsive even at 120×120.
