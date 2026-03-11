# Matrix Hub — Unified Project Plan for Claude Code

## Part 1: Research Comparison — What Each Report Got Right

### Where Gemini's Research Excels

Gemini's report surfaces several **mission-critical architectural insights** that my research either underweighted or missed entirely:

**1. The ATEM Connection Pool Crisis (Critical)**
Gemini documents the most dangerous production vulnerability: ATEM switchers cap concurrent network connections at 5–7 clients on 1M/E and 2M/E models. Worse, Wi-Fi dropout creates "zombie connections" that consume slots until a hardware reboot. This single issue justifies the entire Node.js proxy architecture. My research mentioned `atem-connection`'s persistent connection but didn't frame it as solving a *hardware limitation* — Gemini correctly identifies this as the foundational architectural driver.

**2. The Proxy Design Pattern as Core Architecture**
Gemini explicitly names the Proxy Design Pattern: the Node.js server must be the *sole* UDP client connecting to the ATEM. All web UIs, Stream Decks, and tablets connect to Node.js, never to the hardware. This means the ATEM only ever sees 1 connection regardless of how many operators are controlling it. My research implied this but Gemini makes it a first-class architectural requirement.

**3. Bitfocus Companion Integration Strategies (4 Options)**
Gemini provides an exceptional breakdown of four distinct Companion bridge strategies:
- **Option A**: REST/HTTP (reliable trigger, poor feedback)
- **Option B**: OSC (low-latency, bidirectional, UDP-unreliable)
- **Option C**: Custom Companion Module (best UX, highest maintenance)
- **Option D**: Native ATEM Macro Injection (zero-latency execution, XML complexity)

The **recommended hybrid** (REST for triggers + OSC for feedback) is the correct production answer. My research only covered the REST API side.

**4. The Zero-Length Macro Bug**
A documented ATEM firmware flaw where macros execute faster than the network polling cycle can detect, breaking Companion's feedback loop. The workaround — injecting `<Op id="MacroSleep" frames="1"/>` at the end of generated XML macros — is critical tribal knowledge for anyone building ATEM automation.

**5. Raspberry Pi 5 Deployment Target**
Gemini correctly identifies single-board computers as the broadcast industry standard for always-on middleware, with the Pi 5 providing the necessary 2–2.5x CPU improvement over Pi 4 for handling high-frequency UDP state parsing.

**6. The "Destination-First" Problem Statement**
Gemini articulates the UX problem better: ATEM Software Control uses a dropdown paradigm (select output → select source) that introduces unacceptable cognitive load during live production. The XY grid matrix eliminates this by making every possible route visible and one-click executable.

---

### Where My (Claude's) Research Excels

**1. Videohub Coverage**
Gemini covers ATEM *only*. My research covers both Videohub and ATEM, which is the actual scope of Matrix Hub. The Videohub TCP protocol analysis (port 9990, text-based, push-based partial updates, PING keepalive) and the recommendation to build a custom ~300-line TypeScript client are essential for the project.

**2. Library Landscape Evaluation**
My research evaluates every available library across languages: `atem-connection`, `applest-atem`, `PyATEMMax`, `Swift-Atem`, `bmd-videohub-client`, `io-videohub`, `sohonetlabs/bmd_videohub`. The comparative table with stars, last commit, Constellation support, and maintenance status gives a clear decision matrix. Gemini only covers `atem-connection`.

**3. mDNS Auto-Discovery**
My research identifies `_blackmagic._tcp` as the shared mDNS service type for *both* Videohubs and ATEMs, with `bonjour-service` as the implementation library. Gemini doesn't cover device discovery at all.

**4. Electron as Desktop Wrapper (The Hybrid Requirement)**
My research provides the Electron vs. Tauri comparison and justifies Electron for native Node.js integration, trivial LAN web server exposure, and Chromium rendering consistency. Gemini mentions Electron only in passing during the deployment phase.

**5. Fastify over Express**
My research recommends Fastify (2–3x throughput, native TypeScript, built-in JSON schema validation) over Express. Gemini defaults to Express.

**6. Grid Rendering Architecture**
My research goes deep on TanStack Virtual implementation (dual virtualizer instances, sticky headers, crosshair overlays via refs, canvas upgrade path). Gemini mentions TanStack Virtual but provides less implementation detail.

**7. Frontend State Management**
My research recommends Zustand + domain-specific WebSocket events. Gemini mentions Redux/Zustand/Vuex without a specific recommendation.

**8. Development Tooling**
My research identifies `peschuster/VideoHub-Simulator` for development without hardware and `@bitfocusas/mockup-bmd-videohub` for testing, plus `better-sqlite3` as the specific SQLite binding for Electron.

---

### Where Both Reports Agree (High-Confidence Decisions)

| Decision | Verdict |
|---|---|
| ATEM control library | `atem-connection` (NRK/Sofie) — no viable alternative |
| Backend language | Node.js/TypeScript — library ecosystem demands it |
| Real-time sync | WebSockets, not polling |
| State architecture | Backend as single source of truth, event-driven propagation |
| Grid rendering | TanStack Virtual (headless virtualization) |
| Database | SQLite for presets, groups, tags, locks |
| Frontend framework | React (largest ecosystem for grids and state management) |
| Protocol nature | ATEM = proprietary UDP on 9910; Videohub = text TCP on 9990 |

---

## Part 2: Merged Architecture Decisions

Based on the best of both reports, here are the final architectural decisions:

### Stack
- **Desktop wrapper**: Electron (native Node.js, LAN web server, Chromium consistency)
- **Backend framework**: Fastify (over Express — 2-3x throughput, native TS, JSON schema)
- **Frontend**: React 18+ with TypeScript
- **State management**: Zustand (client-side) + EventEmitter (server-side)
- **Grid virtualization**: @tanstack/react-virtual v3
- **Database**: SQLite via better-sqlite3
- **WebSocket**: ws (raw, no Socket.IO overhead)
- **ATEM control**: atem-connection v3.x (NRK/Sofie)
- **Videohub control**: Custom TypeScript TCP client
- **Device discovery**: bonjour-service (mDNS, _blackmagic._tcp)
- **Companion bridge**: REST API (triggers) + OSC (feedback) — Gemini's hybrid approach

### Architecture Pattern
Node.js Proxy Singleton — the server maintains exactly ONE persistent connection to each Blackmagic device. All UI clients and external tools connect to Node.js, never directly to hardware. This solves the ATEM connection pool exhaustion problem.

---

## Part 3: Project Plan for Claude Code

### Repository Structure

```
matrix-hub/
├── package.json
├── tsconfig.json
├── electron.config.ts
├── README.md
│
├── src/
│   ├── main/                          # Electron main process
│   │   ├── index.ts                   # App entry, window creation
│   │   ├── server.ts                  # Fastify server bootstrap
│   │   └── ipc.ts                     # Electron IPC handlers
│   │
│   ├── server/                        # Backend (runs in main process)
│   │   ├── devices/
│   │   │   ├── DeviceManager.ts       # Registry of all connected devices
│   │   │   ├── AtemConnector.ts       # atem-connection wrapper + state sync
│   │   │   ├── VideohubConnector.ts   # Custom TCP client for Videohub protocol
│   │   │   └── types.ts              # Shared device state interfaces
│   │   │
│   │   ├── discovery/
│   │   │   └── BonjourDiscovery.ts    # mDNS browser for _blackmagic._tcp
│   │   │
│   │   ├── state/
│   │   │   ├── StateManager.ts        # In-memory source of truth + EventEmitter
│   │   │   └── StateTypes.ts          # Normalized state interfaces
│   │   │
│   │   ├── api/
│   │   │   ├── routes.ts             # Fastify REST routes
│   │   │   ├── websocket.ts          # WS server, delta broadcasting
│   │   │   └── osc.ts               # OSC feedback transmitter for Companion
│   │   │
│   │   ├── db/
│   │   │   ├── database.ts           # better-sqlite3 initialization
│   │   │   ├── migrations.ts         # Schema versioning
│   │   │   └── models/
│   │   │       ├── presets.ts         # Salvos/presets CRUD
│   │   │       ├── groups.ts         # I/O groups, tags, colors
│   │   │       └── locks.ts          # Software lock states
│   │   │
│   │   └── companion/
│   │       └── CompanionBridge.ts     # REST trigger + OSC feedback logic
│   │
│   ├── renderer/                      # React frontend (Electron renderer)
│   │   ├── index.html
│   │   ├── App.tsx
│   │   │
│   │   ├── stores/
│   │   │   ├── useDeviceStore.ts      # Zustand store for device state
│   │   │   ├── useUIStore.ts          # UI state (hover, search, tab, groups)
│   │   │   └── useWebSocket.ts        # WS connection + delta handler
│   │   │
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── TitleBar.tsx
│   │   │   │   ├── Toolbar.tsx
│   │   │   │   ├── StatusBar.tsx
│   │   │   │   └── Sidebar.tsx        # Group navigation panel
│   │   │   │
│   │   │   ├── grid/
│   │   │   │   ├── RoutingGrid.tsx    # Main virtualized NxN matrix
│   │   │   │   ├── GridCell.tsx       # Individual intersection cell
│   │   │   │   ├── ColumnHeaders.tsx  # Rotated input labels (sticky)
│   │   │   │   ├── RowHeaders.tsx     # Output labels (sticky)
│   │   │   │   ├── CrosshairOverlay.tsx # Ref-based row/col highlight
│   │   │   │   └── GroupRow.tsx       # Collapsible group header
│   │   │   │
│   │   │   ├── panels/
│   │   │   │   ├── DeviceSelector.tsx # Auto-discovered device list
│   │   │   │   ├── SalvoManager.tsx   # Preset save/recall/edit
│   │   │   │   └── LockManager.tsx    # Output lock controls
│   │   │   │
│   │   │   └── overlays/
│   │   │       ├── OfflineOverlay.tsx # Full-screen OFFLINE blocker
│   │   │       └── Tooltip.tsx        # Route info tooltip
│   │   │
│   │   ├── hooks/
│   │   │   ├── useGridVirtualizer.ts  # TanStack Virtual config
│   │   │   ├── useCrosshair.ts        # Ref-based hover tracking
│   │   │   └── useKeyboard.ts         # Keyboard shortcuts
│   │   │
│   │   └── styles/
│   │       ├── theme.ts              # CSS variables, color tokens
│   │       └── global.css
│   │
│   └── shared/                        # Types shared between main + renderer
│       ├── protocol.ts               # WebSocket event type definitions
│       ├── deviceTypes.ts            # Device model enums, I/O limits
│       └── constants.ts              # Ports, timeouts, defaults
│
├── scripts/
│   ├── dev.ts                        # Dev server with hot reload
│   └── build.ts                      # Electron packaging
│
└── tests/
    ├── server/
    │   ├── videohub-protocol.test.ts  # Protocol parser unit tests
    │   ├── atem-connector.test.ts     # State sync tests
    │   └── state-manager.test.ts
    └── simulator/
        └── videohub-simulator.ts      # Mock TCP server for dev
```

---

### Development Phases

Each phase is a self-contained milestone with clear validation criteria. Do NOT proceed to the next phase until the current phase passes all validation tests.

---

#### PHASE 1: Protocol Foundation
**Goal**: Establish reliable, persistent connections to both Blackmagic device types.
**Estimated effort**: 3–5 days

**Tasks**:

1. Initialize the Node.js/TypeScript project with `tsconfig.json` (strict mode, ES2022 target)
2. Install core dependencies: `atem-connection`, `ws`, `fastify`, `better-sqlite3`, `bonjour-service`
3. **Build `VideohubConnector.ts`** — custom TCP client implementing the Blackmagic Videohub Ethernet Protocol v2.3:
   - Connect to port 9990 via `net.Socket`
   - Parse the initial state dump (block-based text protocol: `VIDEOHUB DEVICE:`, `INPUT LABELS:`, `OUTPUT LABELS:`, `VIDEO OUTPUT ROUTING:`, `VIDEO OUTPUT LOCKS:`)
   - Handle unsolicited partial updates (device pushes only changed items within their block headers)
   - Implement `PING` keepalive every 5 seconds to prevent 30-second timeout disconnection
   - Implement auto-reconnect with exponential backoff (1s → 2s → 4s → 8s → max 30s)
   - Expose methods: `route(destination, source)`, `setLock(destination, state)`, `getState()`
   - Emit events: `connected`, `disconnected`, `routingChanged`, `labelsChanged`, `locksChanged`

4. **Build `AtemConnector.ts`** — wrapper around `atem-connection`:
   - Connect via `atem.connect(ip)`
   - Listen for `stateChanged(state, pathToChange)` events
   - Filter for routing-relevant paths: `video.auxilliaries.*`, `video.mixEffects.*.programInput`, `video.mixEffects.*.previewInput`
   - Implement the Proxy Singleton pattern: this is the ONLY connection to the ATEM
   - Implement auto-reconnect with exponential backoff on `disconnected` event
   - Expose methods: `changeAuxInput(auxIndex, sourceId)`, `changeProgramInput(meIndex, sourceId)`, `getAuxState()`, `getInputLabels()`
   - On connection, interrogate the ATEM model to determine I/O matrix dimensions (e.g., 4×1 for Mini, 40×24 for Constellation 8K)

5. **Build `videohub-simulator.ts`** — a mock TCP server on port 9990 that emulates a 40×40 Videohub for development without hardware. Reference `peschuster/VideoHub-Simulator` for protocol fidelity. The simulator should:
   - Serve an initial state dump on connection
   - Accept routing commands and echo back updated state
   - Periodically generate random route changes to simulate external panel changes

**Validation**:
- Run the Videohub connector against the simulator. Verify bidirectional routing and unsolicited update detection.
- Run the ATEM connector against a real ATEM (or use `atem-connection`'s built-in mock). Verify that routing AUX 1 in code reflects in ATEM Software Control, and vice versa.
- Disconnect the network cable. Verify auto-reconnect fires without crashing.
- Verify the ATEM connector is the sole connection (check ATEM connection count via official tools).

---

#### PHASE 2: State Manager + Database + API
**Goal**: Build the backend brain — the central state store, persistence layer, and HTTP/WS API.
**Estimated effort**: 3–5 days

**Tasks**:

1. **Build `StateManager.ts`** — the backend's single source of truth:
   ```typescript
   interface DeviceState {
     id: string;
     type: 'videohub' | 'atem';
     name: string;
     ip: string;
     status: 'connected' | 'connecting' | 'disconnected';
     inputs: Record<number, { label: string; group?: string }>;
     outputs: Record<number, { label: string; group?: string }>;
     routing: Record<number, number>;  // destination → source
     locks: Record<number, 'U' | 'L' | 'O'>;  // Unlocked / Locked / Owned
   }
   ```
   - Maintains a `Map<string, DeviceState>` in memory
   - Extends `EventEmitter` — emits domain-specific events:
     - `{ type: 'ROUTING_CHANGED', deviceId, destination, source, previousSource }`
     - `{ type: 'DEVICE_STATUS_CHANGED', deviceId, status }`
     - `{ type: 'LABELS_CHANGED', deviceId, direction, index, label }`
     - `{ type: 'LOCK_CHANGED', deviceId, destination, lockState }`
   - Connector classes call StateManager methods; StateManager emits events; WS server broadcasts events to clients

2. **Build `database.ts`** — SQLite schema via `better-sqlite3`:
   ```sql
   -- Device configurations (persisted between sessions)
   CREATE TABLE devices (
     id TEXT PRIMARY KEY,
     type TEXT NOT NULL,        -- 'videohub' | 'atem'
     name TEXT NOT NULL,
     ip TEXT NOT NULL,
     port INTEGER NOT NULL,
     auto_connect BOOLEAN DEFAULT 1
   );
   
   -- Salvos (partial presets)
   CREATE TABLE salvos (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     description TEXT,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   
   -- Individual routes within a salvo
   CREATE TABLE salvo_routes (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     salvo_id INTEGER NOT NULL REFERENCES salvos(id) ON DELETE CASCADE,
     device_id TEXT NOT NULL,
     destination INTEGER NOT NULL,
     source INTEGER NOT NULL,
     route_type TEXT DEFAULT 'aux'  -- 'aux' | 'pgm' | 'pvw' | 'videohub'
   );
   
   -- User-defined I/O groups
   CREATE TABLE io_groups (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     device_id TEXT NOT NULL,
     name TEXT NOT NULL,
     color TEXT NOT NULL,          -- hex color
     direction TEXT NOT NULL,      -- 'input' | 'output'
     sort_order INTEGER DEFAULT 0,
     collapsed BOOLEAN DEFAULT 0
   );
   
   -- Group membership
   CREATE TABLE io_group_members (
     group_id INTEGER NOT NULL REFERENCES io_groups(id) ON DELETE CASCADE,
     io_index INTEGER NOT NULL,
     sort_order INTEGER DEFAULT 0,
     PRIMARY KEY (group_id, io_index)
   );
   
   -- Software locks (separate from hardware locks)
   CREATE TABLE software_locks (
     device_id TEXT NOT NULL,
     output_index INTEGER NOT NULL,
     locked BOOLEAN DEFAULT 0,
     PRIMARY KEY (device_id, output_index)
   );
   
   -- Custom labels (override hardware labels)
   CREATE TABLE custom_labels (
     device_id TEXT NOT NULL,
     direction TEXT NOT NULL,      -- 'input' | 'output'
     io_index INTEGER NOT NULL,
     label TEXT NOT NULL,
     PRIMARY KEY (device_id, direction, io_index)
   );
   ```

3. **Build Fastify server** (`server.ts` + `routes.ts`):
   - `GET /api/devices` — list all configured devices with current status
   - `GET /api/devices/:id/state` — full routing matrix for a device
   - `POST /api/devices/:id/route` — body: `{ destination, source }` — execute a single route change
   - `POST /api/devices/:id/route/batch` — body: `{ routes: [{ destination, source }] }` — batch routing
   - `GET /api/salvos` — list all saved salvos
   - `POST /api/salvos` — create salvo from current state or explicit routes
   - `POST /api/salvos/:id/execute` — recall a salvo (partial — only changes specified routes)
   - `DELETE /api/salvos/:id` — delete a salvo
   - `GET/POST /api/groups` — CRUD for I/O groups
   - `POST /api/locks/:deviceId/:outputIndex` — toggle software lock
   - All mutation endpoints must check software lock state before executing
   - Return HTTP 503 if the target device is disconnected (Gemini's recommendation)

4. **Build WebSocket server** (`websocket.ts`):
   - Listen on `/ws` via `@fastify/websocket`
   - On new client connection: send full state snapshot of all devices
   - Subscribe to StateManager events; broadcast domain-specific delta events to all connected clients
   - Heartbeat ping every 15 seconds; close stale connections after 45 seconds

5. **Build `BonjourDiscovery.ts`**:
   - Browse for `{ type: 'blackmagic' }` using `bonjour-service`
   - On device found: extract IP, port, TXT records (model name, device ID)
   - Differentiate Videohub vs ATEM by probing TCP 9990 (Videohub responds with `VIDEOHUB DEVICE:` block)
   - Emit discovered devices to UI for one-click addition

**Validation**:
- Use Postman/curl to: add a device, query its routing state, execute a route change, save a salvo, recall the salvo.
- Verify that route changes via the API are reflected on the hardware.
- Verify that external route changes (from hardware panel or ATEM Software Control) arrive as WebSocket events within <100ms.
- Verify salvos execute as partial presets — unchanged routes must not be affected.
- Verify API returns 503 when device is disconnected.

---

#### PHASE 3: Electron Shell + React Frontend Foundation
**Goal**: Build the desktop application shell and core React UI with tab navigation, but WITHOUT the grid yet.
**Estimated effort**: 2–3 days

**Tasks**:

1. **Set up Electron** with electron-forge or electron-builder:
   - Main process starts Fastify on `0.0.0.0:8080` (LAN-accessible)
   - Renderer loads React SPA from `http://localhost:8080`
   - External devices (iPads, other browsers) can also access `http://<host-ip>:8080`

2. **Build React app scaffold**:
   - `App.tsx` with tab router (Videohub Routing / ATEM Aux Bus)
   - `TitleBar.tsx` — logo, tabs, device status badge (name, IP, online/offline dot)
   - `Toolbar.tsx` — search input, lock toggle, salvo button
   - `StatusBar.tsx` — input count, output count, active routes, locked count
   - `Sidebar.tsx` — collapsible output/input group list

3. **Build Zustand stores**:
   - `useDeviceStore.ts` — mirrors backend DeviceState, updated via WebSocket deltas
   - `useUIStore.ts` — activeTab, searchQuery, hoveredCell, collapsedGroups, showLocks

4. **Build WebSocket hook** (`useWebSocket.ts`):
   - Connect to `ws://localhost:8080/ws` on mount
   - On `FULL_STATE` message: hydrate the Zustand device store
   - On delta events (`ROUTING_CHANGED`, `LOCK_CHANGED`, etc.): apply granular updates
   - Auto-reconnect with exponential backoff if connection drops
   - Expose `sendCommand(type, payload)` for UI → backend communication

5. **Build `OfflineOverlay.tsx`**:
   - When device status is `disconnected`, render a full-screen semi-transparent overlay with blur
   - Display "OFFLINE" in large monospace text with a scanning animation
   - Intercept all pointer events to prevent grid interaction

**Validation**:
- Launch the Electron app. Verify the Fastify server starts and is accessible at `http://localhost:8080`.
- Open the same URL on a second device (phone/tablet). Verify the React UI loads.
- Verify WebSocket connection establishes and device state hydrates on load.
- Disconnect the Blackmagic device. Verify the offline overlay appears within 5 seconds.

---

#### PHASE 4: The Routing Grid (Core Feature)
**Goal**: Build the interactive, virtualized NxN routing matrix with Dante Controller-style UX.
**Estimated effort**: 5–7 days

**Tasks**:

1. **Build `RoutingGrid.tsx`** using `@tanstack/react-virtual`:
   - Two virtualizer instances: `rowVirtualizer` (vertical) + `colVirtualizer` (horizontal)
   - Only render cells within the visible viewport + overscan buffer
   - Grid must handle 120×120 (14,400 cells) without lag
   - Scroll container with standard scrollbars (spreadsheet-style)

2. **Build `ColumnHeaders.tsx`** (sticky, rotated):
   - `position: sticky; top: 0; z-index: 20`
   - Text rotated -55° via CSS transform (matches Dante Controller angle)
   - Color-coded group bar above each label
   - Highlight label text in accent color when column is hovered

3. **Build `RowHeaders.tsx`** (sticky, left-aligned):
   - `position: sticky; left: 0; z-index: 10`
   - Group color pip + label + lock icon
   - Highlight row when hovered

4. **Build `GridCell.tsx`**:
   - Active route: render a checkmark badge with accent color + box-shadow glow
   - Locked output cells: show diagonal hatch pattern, disable pointer
   - On click: dispatch route command via WebSocket; flash animation on success
   - Hover: update hovered cell coordinates in UI store

5. **Build `CrosshairOverlay.tsx`** (Dante-style):
   - Two absolutely-positioned `<div>` elements (row stripe + column stripe)
   - Updated via `useRef` + direct DOM manipulation (NO React state on mousemove)
   - Single `onMouseMove` on grid container (event delegation)
   - Calculate hovered cell from: `row = Math.floor((mouseY - gridTop + scrollTop) / cellHeight)`
   - Apply `pointer-events: none` so hover events pass through
   - Throttle with `requestAnimationFrame`

6. **Build `GroupRow.tsx`** (collapsible group headers):
   - Rendered inline within the row list
   - Click to collapse/expand — children removed from virtualizer item count
   - Show group name, color pip, item count, chevron icon
   - Persisted collapsed state in Zustand (and optionally SQLite for cross-session)

7. **Build `Tooltip.tsx`**:
   - Follows cursor via `position: fixed`
   - Shows: `OUTPUT_LABEL ← INPUT_LABEL`
   - Shows: "✓ Active route" or "Click to route"
   - If locked: "🔒 Output locked"

8. **Implement search/filter**:
   - Filter both inputs and outputs by label, group name, or tag
   - Filtered items produce a new flat list passed to the virtualizers
   - Grid dynamically resizes; scroll position resets on filter change

**Validation**:
- Load a 120×120 simulated Videohub. Scroll rapidly in all directions. Verify 60fps with no visible jank.
- Click a cell. Verify the route executes on the backend within 100ms and the checkmark appears.
- Change a route externally (via simulator or hardware). Verify the grid updates in real-time.
- Hover across cells. Verify crosshair overlays track smoothly with no re-renders.
- Collapse a group. Verify the grid compacts and scroll range adjusts.
- Type a search query. Verify the grid filters instantly.
- Lock an output. Verify its cells show the hatch pattern and clicks are blocked.

---

#### PHASE 5: Salvos, Groups, and Customization Persistence
**Goal**: Build the preset and customization management features.
**Estimated effort**: 3–4 days

**Tasks**:

1. **Build `SalvoManager.tsx`**:
   - "Save Salvo" button captures the current routing state (or a user-selected subset of routes)
   - Salvo naming dialog
   - Salvo list with recall, edit, delete actions
   - Recall executes a PARTIAL salvo — only the routes defined in the salvo are changed; all other outputs remain untouched
   - Visual indication when a salvo is "active" (current state matches all salvo routes)

2. **Build group management UI**:
   - Create/edit/delete I/O groups with name, color
   - Drag-and-drop to reorder inputs/outputs within groups
   - Groups are saved to SQLite and restored on app launch

3. **Build lock management**:
   - Four lock states with distinct visual treatment:
     - Unlocked (no indicator)
     - Software-locked by Matrix Hub (yellow padlock — stored in SQLite)
     - Hardware-locked by us (blue — sent via Videohub protocol `O` command)
     - Hardware-locked by another controller (red — detected via protocol `L` state)
   - Lock toggle in row header context menu or dedicated panel

4. **Custom labels**:
   - Right-click row/column header to override the hardware label
   - Custom labels stored in SQLite; hardware label shown as subtitle if different

**Validation**:
- Save a salvo with 5 specific routes. Scramble the matrix. Recall the salvo. Verify only those 5 routes change.
- Create groups, assign I/Os, collapse, reorder. Close and reopen the app. Verify persistence.
- Software-lock an output. Attempt to route via UI and API. Verify both are blocked.

---

#### PHASE 6: Bitfocus Companion Bridge (Gemini's Hybrid Approach)
**Goal**: Enable Stream Deck control via Companion using REST triggers + OSC feedback.
**Estimated effort**: 2–3 days

**Tasks**:

1. **REST trigger endpoints** (already built in Phase 2):
   - Ensure `POST /api/salvos/:id/execute` returns proper HTTP status codes:
     - 200: salvo executed successfully
     - 404: salvo not found
     - 503: device offline (Companion can parse this to flash a warning color)
   - Ensure `POST /api/devices/:id/route` works for individual route changes

2. **Build `osc.ts`** — OSC feedback transmitter:
   - Install `osc` or `node-osc` npm package
   - On salvo execution: send `/matrix/salvo/active <salvoId>` to Companion's IP
   - On route change: send `/matrix/route/<deviceId>/<destination> <source>`
   - On device status change: send `/matrix/device/<deviceId>/status <online|offline>`
   - Configurable Companion host IP and OSC port in settings

3. **Configuration UI**:
   - Settings panel for Companion integration
   - Fields: Companion IP, OSC send port, OSC listen port
   - Test button to verify bidirectional OSC communication

**Companion Setup Instructions** (include in README):
- Map Stream Deck button → Generic HTTP module → `POST http://<matrix-hub-ip>:8080/api/salvos/4/execute`
- Map OSC listener → Generic OSC module → listen for `/matrix/salvo/active` → change button color

**Validation**:
- Press a Stream Deck button configured in Companion. Verify the salvo executes on the ATEM/Videohub.
- Verify the Stream Deck button color changes via OSC feedback.
- Disconnect the device. Press the button. Verify Companion receives 503 and flashes a warning.

---

#### PHASE 7: Polish, Packaging, and Deployment
**Goal**: Production-ready packaging for macOS and Windows.
**Estimated effort**: 3–4 days

**Tasks**:

1. **Error handling hardening**:
   - Catch all unhandled Promise rejections in the main process
   - Implement graceful shutdown: close device connections, flush SQLite WAL, close WS connections
   - Add structured logging (pino — Fastify's native logger)

2. **Electron packaging**:
   - Use electron-builder for macOS (.dmg) and Windows (.exe/.msi) builds
   - Code sign for macOS (Developer ID) and Windows (optional)
   - Auto-updater via electron-updater (point to GitHub Releases)

3. **Performance optimization**:
   - Profile grid rendering on a low-end tablet (e.g., iPad 7th gen accessing via browser)
   - Ensure <16ms frame times during rapid scrolling
   - If needed: implement Canvas rendering fallback for the cell area

4. **Raspberry Pi deployment option** (Gemini's recommendation):
   - Docker container or systemd service for headless deployment
   - Accessible via browser on LAN — no Electron needed on the Pi
   - Auto-start on boot, auto-reconnect to devices

5. **Documentation**:
   - README with architecture overview, setup instructions, Companion integration guide
   - API documentation for REST endpoints
   - Contributing guide for open-source contributors

**Validation**:
- Install the packaged app on a fresh macOS and Windows machine. Verify it launches and connects to devices.
- Access the web UI from an iPad on the same LAN. Verify full functionality.
- Pull the power on the host machine. Restore power. Verify the app auto-starts and reconnects.

---

## Part 4: Key Dependencies (package.json)

```json
{
  "dependencies": {
    "atem-connection": "^3.6.0",
    "better-sqlite3": "^11.0.0",
    "bonjour-service": "^1.2.0",
    "fastify": "^5.0.0",
    "@fastify/websocket": "^10.0.0",
    "@fastify/static": "^8.0.0",
    "@fastify/cors": "^10.0.0",
    "ws": "^8.18.0",
    "osc": "^2.4.0",
    "pino": "^9.0.0",
    "electron": "^33.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/better-sqlite3": "^7.6.0",
    "@types/ws": "^8.5.0",
    "electron-builder": "^25.0.0",
    "electron-rebuild": "^3.2.0",
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.0"
  },
  "frontend": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@tanstack/react-virtual": "^3.13.0",
    "zustand": "^5.0.0",
    "@dnd-kit/core": "^6.0.0",
    "@dnd-kit/sortable": "^8.0.0"
  }
}
```

---

## Part 5: Critical Implementation Notes for Claude Code

1. **The Proxy Singleton is non-negotiable.** The Node.js server must maintain exactly ONE connection to each ATEM. Never allow browser clients or external tools to connect directly to ATEM hardware. This prevents the connection pool exhaustion bug that plagues every multi-client ATEM setup.

2. **The Videohub client must handle unsolicited updates.** After the initial state dump, the Videohub pushes partial updates over the persistent TCP connection. The parser must handle interleaved block headers (e.g., receiving a `VIDEO OUTPUT ROUTING:` block with only 2 changed lines, not all 120).

3. **Crosshair rendering must NOT use React state.** Every `onMouseMove` that triggers `setState` causes a full React reconciliation pass. Use `useRef` + direct DOM manipulation for the crosshair overlay divs. This is the #1 performance pitfall in grid UIs.

4. **Salvos are PARTIAL.** A salvo contains a specific subset of routes. On execution, only those routes are sent to the hardware. Every other output remains untouched. This is fundamentally different from a "full snapshot" that overwrites the entire matrix.

5. **Software locks are separate from hardware locks.** Software locks (stored in SQLite) prevent Matrix Hub from sending route commands. Hardware locks (Videohub protocol `O`/`L`/`F` states) are enforced by the device firmware. Both must be checked before executing any route change.

6. **WebSocket events should be domain-specific**, not generic JSON Patch. Send `{ type: 'ROUTING_CHANGED', deviceId: 'vh-1', destination: 7, source: 2 }` rather than `{ op: 'replace', path: '/devices/vh-1/routing/7', value: 2 }`. This enables semantic handling in the UI (flash animations, tally updates).

7. **The Videohub protocol requires PING keepalive.** Send `PING:\n\n` every 5 seconds. Without this, the Videohub will silently drop the TCP connection after ~30 seconds of inactivity.

8. **ATEM model interrogation on connect.** On connection, read `atem.state.info.model` to determine the exact hardware model. Use this to dynamically set the grid dimensions (e.g., 4 inputs × 1 aux for Mini, 40 inputs × 24 aux for Constellation 8K). Never hardcode matrix sizes.

9. **The Zero-Length Macro Bug.** If implementing native ATEM macro generation (future feature), always append `<Op id="MacroSleep" frames="1"/>` to the end of the XML macro to prevent Companion's feedback loop from silently failing.

10. **HTTP 503 for offline devices.** When a device is disconnected, all REST API endpoints targeting that device must return HTTP 503 (Service Unavailable), not 500. This allows Companion to distinguish between "device offline" and "server error" and display appropriate feedback.
