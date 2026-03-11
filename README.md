# Matrix Hub

Matrix Hub is a unified broadcast routing controller designed to interface seamlessly with Blackmagic Videohub and ATEM switchers. It provides a sleek, responsive interface for managing routing, creating custom groups, and saving/recalling presets.

## Architecture

- **Backend:** Fastify + WebSocket (Node.js) backed by SQLite for persistence.
- **Frontend:** React + Vite + Zustand.
- **Packaging:** Packaged as a standalone macOS desktop application using Electron.
- **Companion Integration:** Includes an official Bitfocus Companion module for external hardware control.

---

## Installation (macOS Apple Silicon)

You can download the latest pre-built `.dmg` installer from the [Releases page](https://github.com/unclecal7/matrix-hub/releases/latest).

1. Download the `Matrix Hub-1.0.0-arm64.dmg` file.
2. Double-click the `.dmg` and drag **Matrix Hub** into your `Applications` folder.
3. **First-time launch:** Right-click the application in your Applications folder and select **"Open"** to bypass the standard macOS unsigned developer warning.

### Troubleshooting: "App is damaged and can't be opened"

Because this app is not signed with a paid Apple Developer certificate, macOS Gatekeeper may flag the download as "damaged". It is not actually damaged! To fix this, open the **Terminal** app and run these two commands:

1. **Remove the quarantine flag:**
   ```bash
   sudo xattr -cr "/Applications/Matrix Hub.app"
   ```
2. **Force an ad-hoc signature:**
   ```bash
   sudo codesign --force --deep --sign - "/Applications/Matrix Hub.app"
   ```

After running these commands, the app will open normally.

---

## Local Development

If you'd like to build and run the project from source:

1. Clone the repository.
2. Navigate into the `matrix-hub` directory: `cd matrix-hub`
3. Install dependencies: `npm install`
4. Start the live hardware server and UI: `./dev.command`
   *(Alternatively, run the simulator mode: `./dev-sim.command`)*

### Packaging the App

To build your own `.dmg`:
```bash
npm run package:mac
```
