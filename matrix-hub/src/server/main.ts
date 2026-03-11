import type { FastifyInstance } from 'fastify';
import * as path from 'path';
import { StateManager } from './state/StateManager';
import { buildServer } from './api/server';
import { AppDatabase } from './db/database';
import { CompanionBridge } from './companion/CompanionBridge';
import { DeviceDiscovery } from './discovery/DeviceDiscovery';

const DEFAULT_DB_PATH = path.join(process.cwd(), 'data', 'matrix-hub.db');
const DEFAULT_PORT = parseInt(process.env.PORT || '8080', 10);

export async function startServer(dbPath: string, port = DEFAULT_PORT): Promise<number> {
  let fastify: FastifyInstance | undefined;
  let discovery: DeviceDiscovery | undefined;
  let companionBridge: CompanionBridge | undefined;
  let stateManager: StateManager | undefined;
  let db: AppDatabase | undefined;
  let isShuttingDown = false;

  function logInfo(msg: string): void {
    if (fastify) { fastify.log.info(msg); } else { console.log(msg); }
  }

  function logError(msg: string, data?: unknown): void {
    if (fastify) { fastify.log.error(msg); } else { console.error(msg, data); }
  }

  async function shutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logInfo(`[main] Received ${signal} — shutting down gracefully`);

    discovery?.stop();
    companionBridge?.close();

    if (stateManager) {
      for (const device of stateManager.getAllDevices()) {
        await stateManager.unregisterDevice(device.id);
      }
    }

    await fastify?.close();
    logInfo('[main] Fastify closed');

    db?.close();
    process.exit(0);
  }

  process.on('SIGINT', () => { void shutdown('SIGINT'); });
  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('unhandledRejection', (reason) => {
    logError('[main] Unhandled rejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    logError('[main] Uncaught exception:', String(err));
    void shutdown('uncaughtException');
  });

  db = new AppDatabase(dbPath);
  stateManager = new StateManager();
  stateManager.setDatabase(db);

  // Seed default devices on first run if DB is empty
  let devices = db.listDevices();
  if (devices.length === 0) {
    const vhIp = process.env.VIDEOHUB_IP || '192.168.1.100';
    const atemIp = process.env.ATEM_IP || '192.168.1.101';
    db.addDevice({ type: 'videohub', name: 'Videohub', ip: vhIp });
    db.addDevice({ type: 'atem', name: 'ATEM', ip: atemIp });
    devices = db.listDevices();
  }

  // Env var overrides for IPs (useful for simulator mode)
  const vhIpOverride = process.env.VIDEOHUB_IP;
  const atemIpOverride = process.env.ATEM_IP;
  const disableAtem = process.env.DISABLE_ATEM === '1';

  // Register all persisted devices
  for (const device of devices) {
    let ip = device.ip;
    if (device.type === 'videohub' && vhIpOverride) ip = vhIpOverride;
    if (device.type === 'atem' && atemIpOverride) ip = atemIpOverride;

    if (device.type === 'videohub') {
      stateManager.registerVideohub(device.id, ip, device.name);
    } else if (device.type === 'atem' && !disableAtem) {
      stateManager.registerAtem(device.id, ip, device.name);
    }
  }

  companionBridge = new CompanionBridge(stateManager, db);
  discovery = new DeviceDiscovery();
  fastify = await buildServer(stateManager, db, companionBridge, discovery);

  discovery.on('discovered', (device) => {
    fastify!.log.info(`[Discovery] Found ${device.type}: ${device.name} at ${device.ip}`);
  });
  discovery.start();

  try {
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`Matrix Hub backend running on http://0.0.0.0:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  return port;
}

// Auto-start when executed directly (not imported as a module)
if (require.main === module) {
  startServer(process.env.DB_PATH ?? DEFAULT_DB_PATH)
    .catch(err => { console.error(err); process.exit(1); });
}
