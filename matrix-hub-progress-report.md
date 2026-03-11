# Matrix Hub — Development Progress Report

This document summarizes the development work completed to bootstrap the **Matrix Hub** architecture based on the provided project plan, architectural blueprint, and UI prototype. 

We have successfully completed **Phase 1 (Protocol Foundation)**, **Phase 2 (State Manager + API)**, and integrated the foundation of **Phase 3 (React Frontend)**.

## Project Structure & Setup
We created a new nested `matrix-hub` directory to bypass an issue with `better-sqlite3`'s native build tools failing on paths containing spaces. We set up a modern Node.js/TypeScript environment using `ES2022` modules.

### Core Dependencies Installed:
- **Backend:** `fastify`, `@fastify/websocket`, `@fastify/cors`, `ws`, `atem-connection`, `better-sqlite3`, `bonjour-service`
- **Frontend:** `react`, `react-dom`, `zustand`, `@tanstack/react-virtual`, `vite`

---

## Phase 1: Protocol Foundation
**Goal:** Establish reliable, persistent connections to both Blackmagic device types.

1. **`VideohubConnector.ts` (`src/server/devices/`)**
   - Implemented a custom TCP client that connects to port 9990.
   - Built a robust parser to handle the Blackmagic Videohub text block protocol (`VIDEOHUB DEVICE:`, `INPUT LABELS:`, `VIDEO OUTPUT ROUTING:`, etc.).
   - Implemented a 5-second `PING` interval to prevent the 30-second hardware timeout.
   - Wired up an exponential backoff auto-reconnect system.
   - Emits domain-specific events (`routingChanged`, `labelsChanged`, `connected`).

2. **`AtemConnector.ts` (`src/server/devices/`)**
   - Implemented a wrapper around `atem-connection` to enforce the **Proxy Singleton** architecture (Node.js is the sole UDP client to the ATEM).
   - Maps the complex `AtemState` dot-notation paths (e.g., `video.auxilliaries.3`) to flat, domain-specific routing events.

3. **`videohub-simulator.ts` (`tests/simulator/`)**
   - Built a configurable mock TCP server that mimics a physical Blackmagic Videohub.
   - Dynamically scales based on the `MATRIX_SIZE` environment variable (tested at 40x40 and 120x120).
   - Generates the initial state dump and broadcasts real-time updates to all connected clients.

---

## Phase 2: State Manager + Database + API
**Goal:** Build the backend brain — the central state store, and HTTP/WS API.

1. **`StateManager.ts` (`src/server/state/`)**
   - Acts as the central, normalized, in-memory source of truth.
   - Maintains a map of `NormalizedDeviceState` objects.
   - Listens to hardware events from the connectors and updates the state.
   - Emits unified events (`ROUTING_CHANGED`, `FULL_STATE_UPDATE`) for the WebSocket layer.

2. **`server.ts` (`src/server/api/`)**
   - Set up a highly performant **Fastify** web server on `0.0.0.0:8080`.
   - **REST Endpoints:** `GET /api/devices`, `GET /api/devices/:id/state`, `POST /api/devices/:id/route`.
   - **WebSocket Server:** Uses `@fastify/websocket` to push initial `FULL_STATE` on connection and broadcast delta events (e.g., `ROUTING_CHANGED`) instantly to all connected UI clients.

---

## Phase 3: Frontend Foundation & Integration
**Goal:** Hook the React UI prototype into the real data stream.

1. **Vite Setup (`vite.config.ts`, `index.html`, `index.tsx`)**
   - Scaffolded a standard Vite React application mapped to the `src/renderer` directory.

2. **`useDeviceStore.ts` (`src/renderer/stores/`)**
   - Built a lightweight **Zustand** store mapping directly to the `NormalizedDeviceState` interface from the backend.
   - Exposes actions like `setDevices` and `updateRouting` to handle incoming data.

3. **`useWebSocket.ts` (`src/renderer/hooks/`)**
   - Implemented the client-side WebSocket connection to `ws://127.0.0.1:8080/ws`.
   - Parses incoming delta events and immediately triggers the corresponding Zustand state updates.
   - Provides a `sendCommand` method that fires REST API `POST` requests back to the server to request hardware routing changes.

4. **`App.tsx` (`src/renderer/`)**
   - Ported the provided high-fidelity UX prototype into the active Vite environment.
   - **Removed all static mock arrays.** The grid is now fully dynamic and renders inputs/outputs directly from the Zustand store.
   - `handleRoute` now issues optimistic UI updates and triggers the real backend `sendCommand`.
   - The device badge dynamically displays the name and connection status of the simulator.

---

## How to Test the Full Stack

You can run the entire vertical stack locally using three separate terminal windows in the `/Users/kyle.hogan/Documents/Matrix Hub/matrix-hub` directory:

1. **Start the Hardware Simulator (120x120 matrix):**
   ```bash
   MATRIX_SIZE=120 npm run simulate:videohub
   ```

2. **Start the Node.js Fastify + Proxy Server:**
   ```bash
   npx tsx src/server/api/server.ts
   ```
   *(Note: For testing right now, you can use the wrapper script `npx tsx -e "import { StateManager } from './src/server/state/StateManager'; import { buildServer } from './src/server/api/server'; async function start() { const sm = new StateManager(); sm.registerVideohub('vh1', '127.0.0.1', 'Simulator'); const app = await buildServer(sm); await app.listen({port: 8080}); } start();"` to inject the simulator into the state manager)*

3. **Start the Vite React Frontend:**
   ```bash
   npm run dev
   ```

Open `http://localhost:5173` in your browser. You will see the full 120x120 virtualized Dante-style routing grid populated with live data from the simulator. Click an intersection to route a signal, and watch the simulator terminal acknowledge the TCP packet instantly.