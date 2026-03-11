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

## Bitfocus Buttons Integration

If you are using Bitfocus Buttons, it is easiest to import the pre-built module package:
1. Download the `matrix-hub-0.1.0.tgz` file from the [Releases page](https://github.com/unclecal7/matrix-hub/releases/latest).
2. Open the Bitfocus Buttons Admin Web GUI.
3. Navigate to the **Modules** tab on the left sidebar.
4. Click the **Import module package** button at the top right.
5. Select the `matrix-hub-0.1.0.tgz` file (do not unzip it).
6. Go to the **Connections** tab, search for "Matrix Hub", and add it!
   - Set the Target IP to `127.0.0.1` (if running on the same machine).
   - Set the Port to `8080` (this is Matrix Hub's API port).

## Bitfocus Companion Integration

If you are using the full Bitfocus Companion software, you can use the Developer path:
1. Download the `Matrix-Hub-Companion-Module.zip` file from the [Releases page](https://github.com/unclecal7/matrix-hub/releases/latest).
2. **Unzip** the downloaded file. Inside, you will find a folder named `pkg`.
3. Open the Bitfocus Companion Admin Web GUI.
4. Click on the **Settings** (gear icon) in the launcher or go to the Settings tab in the web interface.
5. Scroll down to **Developer Modules path**.
6. Select the exact folder *that contains* the `pkg` folder (do not select the `pkg` folder itself, select its parent folder that you just unzipped).
7. Ensure **Enable Developer Modules** is turned ON.
8. Go to the **Connections** tab, search for "Matrix Hub", and add it!
   - Set the Target IP to `127.0.0.1` (if running on the same machine).
   - Set the Port to `8080` (this is Matrix Hub's API port).

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
