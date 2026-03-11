# Matrix Hub: architectural blueprint for a Blackmagic routing controller

**Matrix Hub should be built on Electron + Node.js/Fastify + React, using `atem-connection` for ATEM control and a custom TCP implementation for Videohub communication.** This stack mirrors the architecture of Bitfocus Companion — the most widely deployed open-source broadcast control platform — and is validated by production use at NRK (Norwegian Broadcasting Corporation). The combination delivers native Node.js TCP socket access, trivial LAN web server exposure for multi-device control, and the richest ecosystem of virtualized grid components for rendering matrices up to 120×120. Below is a complete technical blueprint covering libraries, framework choices, network discovery, real-time state management, and high-performance grid rendering.

---

## 1. The library landscape for Blackmagic hardware control

### ATEM switchers: `atem-connection` dominates

The open-source ecosystem for ATEM control has a single clear winner. **`atem-connection`** (GitHub: `nrkno/sofie-atem-connection`, ~135 stars, last commit November 2024) is a production-grade TypeScript library maintained by the Sofie TV Automation team, originally from NRK. It supports firmware v7.x and v8.x+, including **Constellation 8K with full auxiliary bus control** (the 40×24 aux bus Matrix Hub needs). The library maintains an auto-updating `AtemState` object and fires `stateChanged(state, pathToChange)` events with dot-notation paths like `video.auxilliaries.3`, making it straightforward to detect and propagate external changes. It handles auto-reconnect with 5-second timeout detection and has been verified against Blackmagic's own SDK via the LibAtem serialization test suite.

The alternatives fall short. **`applest-atem`** (92 stars, CoffeeScript) predates v8 firmware and lacks Constellation support — it is functionally abandoned. **`PyATEMMax`** (~96 stars, Python) covers firmware only through v7.5.0 and would require a separate Python runtime. **`Swift-Atem`** (63 stars) is an independent Swift implementation unrelated to MixEffect, with uncertain Constellation coverage. A Rust library (`atem-connection-rs`) does not exist despite being referenced in some community discussions. MixEffect, the popular iOS ATEM controller by Adam Tow, uses its own **proprietary closed-source Swift implementation** — not `applest-atem` or `Swift-Atem`.

Bitfocus Companion confirms `atem-connection` as the standard: its `companion-module-bmd-atem` (67 stars) depends on `atem-connection` v3.6.0 and explicitly supports Constellation models with firmware up to at least v20.2.

| Library | Language | Stars | Constellation 8K | Aux bus | Active |
|---|---|---|---|---|---|
| **atem-connection** | TypeScript | ~135 | ✅ Full v8.x | ✅ | ✅ Monthly updates |
| applest-atem | CoffeeScript | 92 | ❌ v6.x era | Basic | ❌ Dormant |
| PyATEMMax | Python | ~96 | ❌ v7.5.0 max | Yes | Slow |
| Swift-Atem | Swift | 63 | Uncertain | Basic | Low |

### Videohub routers: build a custom TCP client

No Videohub library has achieved the maturity of `atem-connection`. The npm packages `videohub-connection` and `blackmagic-videohub` referenced in community posts **do not exist** as published packages. The closest options are `bmd-videohub-client` (TypeScript, RxJS-based state subscription, handles unsolicited updates), `bmd-videohub` by Rocketbeans (TypeScript, sparse docs), and `io-videohub` (JavaScript, 8+ years old). The Python `sohonetlabs/bmd_videohub` supports protocol v2.8 but re-reads state on each call rather than maintaining a persistent cache.

Bitfocus Companion's Videohub module does **not** use any external library — it implements the TCP protocol directly using Companion's built-in socket helper. This is telling: the protocol is simple enough that a custom implementation is preferable to depending on unmaintained packages.

**The recommendation is to write a custom Videohub TCP client** in TypeScript. The Blackmagic Videohub Ethernet Protocol (documented in Blackmagic's official PDF, current version v2.3) is a text-based protocol on **port 9990** with these characteristics:

- On connection, the device dumps complete state as labeled text blocks (`VIDEOHUB DEVICE:`, `VIDEO OUTPUT ROUTING:`, `INPUT LABELS:`, `OUTPUT LABELS:`, `VIDEO OUTPUT LOCKS:`, etc.), each terminated by a blank line
- After the initial dump, the device **pushes partial updates automatically** whenever any state changes — only modified items within their respective block headers
- Clients send commands in the same block format and receive `ACK`/`NAK` responses
- Lock states use `U` (unlocked), `O` (owned by this client), `L` (locked by another), `F` (force-unlock)
- A `PING` keepalive should be sent periodically to prevent 30-second timeouts (a known issue documented in Companion's issue tracker)

A well-typed custom implementation of ~300–400 lines can cover routing, labeling, locking, and monitoring outputs with full unsolicited update handling — and will be more maintainable than depending on a 6-star npm package.

---

## 2. Electron + Node.js/Fastify + React is the optimal stack

### Electron wins decisively over Tauri

For a hybrid desktop app that must bundle a persistent Node.js backend and expose a LAN-accessible web server, **Electron is the only practical choice**. It runs Node.js natively in its main process — no sidecar needed. Starting a Fastify server on `0.0.0.0:8080` is a single function call. Tauri would require compiling the Node.js backend into a 50MB+ standalone binary via `@yao-pkg/pkg`, managing sidecar lifecycle (orphaned processes, crash recovery), and communicating between Rust and Node.js through IPC — significant complexity for zero practical benefit in a broadcast control workstation context.

| Criterion | Electron | Tauri |
|---|---|---|
| Node.js integration | Native (main process) | Sidecar required (+50MB) |
| LAN web server | Trivial | Complex (sidecar binding) |
| Bundle size | ~120MB | ~8MB + 50MB sidecar |
| RAM (idle) | 200–400MB | 30–50MB + sidecar |
| Chromium consistency | ✅ Same engine everywhere | ❌ WebKit (mac) vs WebView2 (win) |
| Production precedent | VS Code, Companion, Slack | Growing but fewer broadcast tools |

Tauri's advantages — small bundle, low RAM — are irrelevant for a professional broadcast tool running on a dedicated workstation with 16–64GB RAM. Electron's 120MB installer is a non-issue. **Bitfocus Companion validates this architecture**: it is an Electron + Express app that exposes a web UI on the LAN for controlling Blackmagic hardware, has 1.8k GitHub stars, and is deployed worldwide in broadcast facilities.

### Node.js/TypeScript is the only viable backend

The `atem-connection` library alone would take months to replicate in another language. Node.js's event-driven, non-blocking I/O model is ideal for managing 10+ simultaneous persistent TCP connections to Videohubs while serving WebSocket updates to UI clients. **Fastify** is recommended over Express: it delivers **2–3× higher throughput** (48K vs 20K req/s), has native TypeScript support, built-in JSON schema validation for routing commands, and the `@fastify/websocket` plugin integrates cleanly. Full-stack TypeScript enables sharing type definitions between backend protocol handlers and frontend state management.

### React provides the richest grid ecosystem

For rendering a 120×120 interactive matrix with real-time updates, React offers the deepest ecosystem of virtualized grid components, drag-and-drop libraries, and state management tools. **@tanstack/react-virtual** (6.5k stars, actively maintained, proven at 1,000×1,000 scale) provides headless virtualization with full control over the grid markup. **@dnd-kit** (10KB core) delivers modern, accessible drag-and-drop. **Zustand** handles client-side state with minimal boilerplate and excellent performance for WebSocket-driven updates. Vue and Svelte are viable but have significantly smaller ecosystems for specialized grid components and fewer potential open-source contributors.

---

## 3. Auto-discovery via mDNS on `_blackmagic._tcp`

### Both device types advertise via Bonjour

Blackmagic Videohubs and ATEM switchers both register themselves on the local network using **mDNS/DNS-SD (Bonjour)** under the service type **`_blackmagic._tcp`**. This shared service type means a single mDNS browser can discover all Blackmagic devices on the subnet. TXT records in the advertisement contain device metadata including model name, unique ID, and hostname. The advertised port corresponds to each device's control protocol: **TCP 9990** for Videohubs and **UDP 9910** for ATEMs.

ATEMs also respond on TCP 9990 with a Videohub-compatible protocol preamble that exposes basic model information and unique ID, which can be used for device identification even before establishing the full UDP control connection.

### Implementation with `bonjour-service`

The recommended Node.js library for cross-platform mDNS discovery is **`bonjour-service`** (~1.1M weekly npm downloads, 643 stars, TypeScript, pure JavaScript with zero native dependencies). It wraps the `multicast-dns` package and provides a high-level API for browsing and publishing services. No native build tools are required on macOS or Windows.

The discovery flow for Matrix Hub:

1. On application startup, create a Bonjour browser for `{ type: 'blackmagic' }`
2. For each discovered service, extract the IP address, port, and TXT record metadata
3. Differentiate device types by attempting a TCP connection on port 9990 — Videohubs respond with a `VIDEOHUB DEVICE:` block containing model and I/O count; ATEMs respond with a simpler preamble
4. For ATEMs, additionally verify by attempting the UDP 9910 handshake (SYN → SYN-ACK → ACK, TCP-like 3-way handshake over UDP)
5. Present discovered devices in the UI with model name, IP, and I/O count for one-click addition
6. Continue browsing to detect devices that come online after startup (`browser.on('up', ...)` and `browser.on('down', ...)`)

An alternative library is **`@julusian/dnssd`** (v1.4.2, pure JavaScript), which is the fork used internally by Bitfocus Companion's core developer. Both are reliable; `bonjour-service` has broader community adoption.

The Python project `nocarryr/vidhub-control` demonstrates the same discovery pattern using Python's `zeroconf` library, confirming that `_blackmagic._tcp` is the correct service type. The `peschuster/VideoHub-Simulator` (C++/Qt) implements Bonjour advertisement for testing, providing a useful development tool.

---

## 4. Backend-authoritative state with real-time bi-directional sync

### The core architecture pattern

Matrix Hub's backend must serve as the **single source of truth** for all device state. The pattern is straightforward: persistent hardware connections feed an in-memory state store, which propagates changes to UI clients via WebSocket delta events. This same pattern powers Bitfocus Companion, which uses Node.js EventEmitters for state change propagation and `fast-json-patch` for computing minimal diffs.

The critical data flow for detecting external changes:

1. An operator changes a route via a physical Smart Control panel or ATEM Software Control
2. The hardware pushes this change over its persistent connection — Videohub sends a partial `VIDEO OUTPUT ROUTING:` block over TCP; ATEM sends a binary field update that `atem-connection` translates into a `stateChanged` event with path `video.auxilliaries.5`
3. The backend's device connector parses the update and calls `stateManager.updateRouting(deviceId, destination, source)`
4. The StateManager updates its in-memory normalized state object and emits a domain-specific event
5. The WebSocket server broadcasts the delta to all connected browser clients
6. Each client applies the delta to its local Zustand store, triggering a React re-render of only the affected cell

Both protocols guarantee this works. The Videohub protocol documentation explicitly states: *"The asynchronous nature of the responses means that a client should never rely on the desired update actually occurring and must simply watch for status updates from the Videohub Server."* The `atem-connection` library's `stateChanged` event fires for ALL changes regardless of origin.

### Normalized in-memory state structure

```typescript
interface DeviceState {
  id: string;
  type: 'videohub' | 'atem';
  name: string;
  ip: string;
  status: 'connected' | 'connecting' | 'disconnected';
  inputs: Record<number, { label: string }>;
  outputs: Record<number, { label: string }>;
  routing: Record<number, number>;  // destination → source
  locks: Record<number, 'U' | 'L' | 'O'>;
  // ATEM-specific:
  auxOutputs?: Record<number, number>;
  mixEffects?: Record<number, { programInput: number; previewInput: number }>;
}
```

### Domain-specific WebSocket events over JSON Patch

For Matrix Hub, **domain-specific events** are preferable to generic JSON Patch (RFC 6902). Routing changes are well-structured domain objects — sending `{ type: 'ROUTING_CHANGED', deviceId: 'vh-1', destination: 7, source: 2 }` is more actionable in the UI than `{ op: 'replace', path: '/devices/vh-1/routing/7', value: 2 }`. Domain events enable the frontend to animate crosspoint transitions, flash changed cells, and update tally states with semantic understanding of what changed.

The **`ws`** library (not Socket.IO) is recommended for the WebSocket server. Matrix Hub will have 1–10 concurrent UI clients, not thousands — `ws` provides raw performance with standard WebSocket API compatibility, meaning any browser connects natively without a client library. On initial connection, the server sends a full state snapshot; thereafter, only incremental delta events stream to clients. On reconnection, the client requests a fresh snapshot and resumes the delta stream, avoiding complex missed-message reconciliation.

### REST API and partial salvos

A RESTful API enables external automation (scripts, Stream Deck plugins, companion integrations). Key endpoints:

- `GET /api/devices/:id/routing` — full routing matrix
- `POST /api/devices/:id/routing` — set routes: `{ routes: [{ destination: 7, source: 2 }] }`
- `GET/POST /api/salvos` — CRUD for saved presets
- `POST /api/salvos/:id/execute` — fire a salvo

**Partial salvos** are the killer feature for live production. A partial salvo stores only the specific cross-points to change, leaving all other routing untouched. The data model is an array of `{ deviceId, destination, source, routeType }` objects stored as JSON in SQLite. On execution, the backend groups routes by device, checks lock states, sends commands to hardware, and reports per-route success/failure. This mirrors how the Videohub's own RS-422 salvo protocol works (`@ P:` to queue changes, `@ B:E` to execute atomically).

### Persistent storage with `better-sqlite3`

**`better-sqlite3`** is the recommended SQLite binding for Electron — synchronous API (no callback complexity), fastest Node.js SQLite implementation, works in Electron's main process after `electron-rebuild`. Store device configurations, salvos, output groups, input/output tags and colors, port customizations, layout preferences, and software lock states. The database file goes in `app.getPath('userData')` for proper OS-specific storage.

### Software lock implementation

Matrix Hub needs two lock layers. **Hardware locks** (Videohub only) use the native protocol — sending `O` claims ownership, preventing other controllers from changing that output. **Software locks** (application-level, stored in SQLite) prevent Matrix Hub's own UI and API from sending route changes to protected outputs, even when the hardware allows it. The UI should distinguish four states with color coding: unlocked (no indicator), software-locked (yellow padlock), hardware-locked by us (blue), hardware-locked by another controller (red, non-overridable without force-unlock).

---

## 5. Rendering a 120×120 grid at 60fps

### TanStack Virtual is the right foundation

For a 120×120 routing matrix (14,400 total cells), **DOM-based virtualization renders only the ~900 visible cells** (approximately 30×30 viewport plus overscan buffer), making performance a non-issue. **@tanstack/react-virtual** (v3.13.x, 6.5k stars, MIT, 10–15KB bundle, actively maintained) is the recommended virtualizer. It has been tested at 1,000×1,000 scale (1 million cells) and outperforms react-window in rapid scroll benchmarks on low-end hardware.

The implementation uses **two virtualizer instances** — one vertical for rows, one horizontal for columns — nested to create a 2D virtualized grid:

```typescript
const rowVirtualizer = useVirtualizer({ count: 120, getScrollElement, estimateSize: () => 32 });
const colVirtualizer = useVirtualizer({ count: 120, horizontal: true, getScrollElement, estimateSize: () => 48 });
```

Only cells within the intersection of visible rows and visible columns are rendered as DOM elements. Sticky headers for input labels (top) and output labels (left) use `position: sticky` on header elements within the virtualized container — TanStack Virtual has built-in sticky item support.

**react-window** (17.1k stars) is a viable alternative with built-in `FixedSizeGrid` and `VariableSizeGrid` components, but it is no longer actively developed (v2 has been planned for years without shipping) and lacks native sticky header support. **AG Grid** and **react-data-grid** are designed for tabular data, not NxN routing matrices — their column-definition models are a poor fit. **Glide Data Grid** (Canvas-based, 3.8k stars) offers extreme performance for million-cell grids but is **incompatible with React 19** and requires all visual rendering through Canvas 2D draw calls rather than JSX.

### Dante-style crosshair highlighting without re-renders

Dante Controller's signature UX pattern — highlighting the entire row and column when hovering a cell — must be implemented without triggering React re-renders on every mouse move. The recommended approach uses **two absolutely-positioned overlay divs** (one for the row highlight stripe, one for the column stripe) updated via `useRef` and direct DOM manipulation:

1. Attach a single `onMouseMove` handler to the grid container (event delegation)
2. Calculate the hovered cell from mouse coordinates: `row = Math.floor((e.clientY - gridTop + scrollTop) / cellHeight)`
3. Update overlay div positions via `ref.current.style.transform` — no React state, no re-renders
4. Apply `pointer-events: none` on overlays so hover events pass through to cells beneath
5. Optionally throttle with `requestAnimationFrame` to coalesce rapid mouse movements

This approach keeps highlight updates at sub-millisecond latency with zero framework overhead. The hovered cell itself gets a distinct accent color, while the row and column stripes use a semi-transparent wash (e.g., `rgba(255, 200, 0, 0.08)`).

### Grouping, collapsing, and filtering

Dante Controller's collapsible device groups translate naturally to the virtualized grid. Maintain a **flat list of visible items** derived from hierarchical group state: when a group is collapsed, its children are excluded from the list; when expanded, they are included. Pass `visibleItems.length` as the `count` to each virtualizer. TanStack Virtual handles dynamic count changes gracefully — the virtualizer recalculates total scroll size and visible items automatically.

Both axes need independent group state trees. Row groups organize destinations (e.g., "Studio A Outputs" containing outputs 1–16); column groups organize sources (e.g., "Cameras" containing inputs 1–8). Group headers render as distinct row/column elements with expand/collapse toggles and aggregate status indicators. Filtering works identically: apply the filter to produce a subset, update the count, and optionally reset scroll position.

### Canvas as a future optimization path

If Matrix Hub eventually needs to support devices larger than 120×120, or if scroll performance on low-end tablets proves insufficient, a **hybrid approach** is the upgrade path: render the cell matrix area on a single HTML5 Canvas element (custom `drawCell` for checkmarks, color fills, status indicators) while keeping headers, tooltips, and overlays as DOM elements. This eliminates DOM overhead entirely — Canvas can paint 100,000 data points in ~15ms. However, for the 120×120 target, DOM virtualization is more than adequate and dramatically simpler to develop.

---

## Concrete architecture diagram

```
┌────────────────────────────────────────────────────────────────┐
│                      Electron Main Process                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Fastify Server (0.0.0.0:8080)                │  │
│  │  REST API (/api/devices, /api/salvos, /api/routing)       │  │
│  │  WebSocket (/ws) — delta events to all UI clients         │  │
│  │  Static file server — serves React SPA to LAN browsers    │  │
│  └──────────────────────┬───────────────────────────────────┘  │
│                          │                                       │
│  ┌──────────────────────▼───────────────────────────────────┐  │
│  │                  State Manager (EventEmitter)              │  │
│  │     Normalized in-memory state per device                  │  │
│  │     Emits domain events: ROUTING_CHANGED, LOCK_CHANGED    │  │
│  └────┬──────────┬──────────┬───────────────────────────────┘  │
│       │          │          │                                    │
│  ┌────▼────┐ ┌──▼─────┐ ┌─▼────────┐  ┌───────────────────┐  │
│  │Videohub │ │Videohub│ │  ATEM     │  │  mDNS Discovery   │  │
│  │Client #1│ │Client#2│ │Connector  │  │  (bonjour-service) │  │
│  │TCP:9990 │ │TCP:9990│ │atem-conn. │  │  _blackmagic._tcp  │  │
│  └────┬────┘ └──┬─────┘ └─┬────────┘  └───────────────────┘  │
│       │         │          │                                    │
│  ┌────▼─────────▼──────────▼────────────────────────────────┐  │
│  │              SQLite (better-sqlite3)                       │  │
│  │   devices | salvos | groups | tags | locks | audit_log    │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
         │ WS/HTTP :8080                    │ TCP/UDP
         ▼                                   ▼
┌─────────────────────┐            ┌──────────────────┐
│ React UI (Electron  │            │ Videohub (9990)  │
│ renderer + LAN      │            │ ATEM (9910)      │
│ browsers on iPads)  │            │ More devices...  │
│                     │            └──────────────────┘
│ @tanstack/react-    │
│ virtual grid        │
│ Zustand state store │
│ @dnd-kit drag/drop  │
│ Overlay crosshairs  │
└─────────────────────┘
```

## Conclusion

The research points to a clear architectural path. **`atem-connection` is the only production-grade ATEM library** — no other option supports Constellation 8K with the reliability needed for live broadcast. For Videohub, the protocol's simplicity (text over TCP, ~300 lines to implement) makes a custom client preferable to depending on unmaintained packages. The Electron + Fastify + React stack is validated by Bitfocus Companion's real-world success in the same problem domain, and its LAN web server capability — the feature that lets operators control routing from iPads and phones — works natively without architectural gymnastics.

Two insights emerged that were not obvious at the outset. First, both Videohubs and ATEMs share the **same `_blackmagic._tcp` mDNS service type**, meaning a single Bonjour browser discovers the entire Blackmagic ecosystem on a subnet. Second, the Videohub protocol's design makes external change detection trivially reliable — the device pushes partial state updates to all connected clients automatically, and the protocol specification explicitly instructs clients to treat these push updates as the sole authoritative state. Combined with `atem-connection`'s `stateChanged` events, Matrix Hub can guarantee that every routing change — regardless of origin — reaches all UI clients within milliseconds. The **TanStack Virtual + overlay crosshair** approach for the grid delivers Dante Controller-caliber UX without canvas complexity, with a clear upgrade path to canvas rendering if future devices exceed 120×120.