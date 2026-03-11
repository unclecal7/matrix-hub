import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { startServer } from '../server/main';

// Always run in production mode when packaged as Electron app
process.env.NODE_ENV = 'production';

let mainWindow: BrowserWindow | null = null;

async function bootstrap() {
  const dbPath = path.join(app.getPath('userData'), 'matrix-hub.db');
  // Tell the server where to find the built frontend assets.
  // __dirname here is dist/main/main — go up two levels to reach dist/renderer.
  process.env.STATIC_ROOT = path.join(__dirname, '../../renderer');
  const port = await startServer(dbPath);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    title: 'Matrix Hub',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://localhost:${port}/`);
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  bootstrap().catch(err => { console.error('[electron] Bootstrap failed:', err); app.quit(); });
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    bootstrap().catch(err => { console.error('[electron] Re-bootstrap failed:', err); });
  }
});
