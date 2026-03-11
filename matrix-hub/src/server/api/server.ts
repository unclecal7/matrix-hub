import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { XMLParser } from 'fast-xml-parser';
import path from 'path';
import { StateManager } from '../state/StateManager';
import { AppDatabase } from '../db/database';
import { CompanionBridge } from '../companion/CompanionBridge';
import type { DeviceDiscovery } from '../discovery/DeviceDiscovery';

export async function buildServer(
  stateManager: StateManager,
  db: AppDatabase,
  companionBridge?: CompanionBridge,
  discovery?: DeviceDiscovery,
) {
  const fastify = Fastify({ logger: true });

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

  await fastify.register(fastifyCors, {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  await fastify.register(fastifyWebsocket);

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // STATIC_ROOT env var is set by Electron main (app.getAppPath()/dist/renderer).
    // Fallback: __dirname-relative path works when running via tsx from source root.
    const staticRoot = process.env.STATIC_ROOT
      || path.resolve(__dirname, '../../../dist/renderer');

    await fastify.register(fastifyStatic, {
      root: staticRoot,
      prefix: '/',
    });

    // SPA fallback: unmatched GETs return index.html
    fastify.setNotFoundHandler((_req, reply) => {
      return reply.sendFile('index.html');
    });
  }

  // Allow raw text/XML body for label import
  fastify.addContentTypeParser('text/xml', { parseAs: 'string' }, (_req, body, done) => {
    done(null, body);
  });
  fastify.addContentTypeParser('application/xml', { parseAs: 'string' }, (_req, body, done) => {
    done(null, body);
  });
  fastify.addContentTypeParser('text/plain', { parseAs: 'string' }, (_req, body, done) => {
    done(null, body);
  });

  // --- Broadcast helper ---
  const broadcast = (event: object) => {
    const message = JSON.stringify(event);
    fastify.websocketServer.clients.forEach((client) => {
      if (client.readyState === 1) {
        try {
          client.send(message);
        } catch (err) {
          fastify.log.error({ err }, 'WebSocket broadcast failed');
        }
      }
    });
  };

  // --- Device CRUD ---

  fastify.get('/api/devices', async () => {
    return stateManager.getAllDevices();
  });

  fastify.get('/api/devices/:id/state', async (request: any, reply) => {
    const state = stateManager.getDeviceState(request.params.id);
    if (!state) return reply.code(404).send({ error: 'Device not found' });
    return state;
  });

  fastify.post(
    '/api/devices',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'type', 'ip'],
          properties: {
            name: { type: 'string', minLength: 1 },
            type: { type: 'string', enum: ['videohub', 'atem'] },
            ip: { type: 'string', pattern: '^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$' },
          },
        },
      },
    },
    async (request: any, reply) => {
    const { name, type, ip } = request.body;

    const record = db.addDevice({ name, type, ip });

    if (type === 'videohub') {
      stateManager.registerVideohub(record.id, ip, name);
    } else {
      stateManager.registerAtem(record.id, ip, name);
    }

    broadcast({ type: 'DEVICE_ADDED', device: stateManager.getDeviceState(record.id) });
    return record;
    },
  );

  fastify.put('/api/devices/:id', async (request: any, reply) => {
    const { id } = request.params;
    const { name, ip } = request.body;
    const existing = db.getDevice(id);
    if (!existing) return reply.code(404).send({ error: 'Device not found' });

    const ipChanged = ip && ip !== existing.ip;
    db.updateDevice(id, { name, ip });

    if (ipChanged) {
      // Re-register with new IP
      await stateManager.unregisterDevice(id);
      const updated = db.getDevice(id)!;
      if (updated.type === 'videohub') {
        stateManager.registerVideohub(id, updated.ip, updated.name);
      } else {
        stateManager.registerAtem(id, updated.ip, updated.name);
      }
    }

    const updatedState = stateManager.getDeviceState(id);
    broadcast({ type: 'FULL_STATE_UPDATE', deviceId: id, state: updatedState });
    return { success: true };
  });

  fastify.delete('/api/devices/:id', async (request: any, reply) => {
    const { id } = request.params;
    if (!db.getDevice(id)) return reply.code(404).send({ error: 'Device not found' });

    await stateManager.unregisterDevice(id);
    db.deleteDevice(id);
    broadcast({ type: 'DEVICE_REMOVED', deviceId: id });
    return { success: true };
  });

  // --- Routing ---

  fastify.post(
    '/api/devices/:id/route',
    {
      schema: {
        body: {
          type: 'object',
          required: ['destination', 'source'],
          properties: {
            destination: { type: 'integer', minimum: 0 },
            source: { type: 'integer', minimum: 0 },
          },
        },
      },
    },
    async (request: any, reply) => {
      const { destination, source } = request.body;
      const deviceId = request.params.id;

      const state = stateManager.getDeviceState(deviceId);
      if (!state) return reply.code(404).send({ error: 'Device not found' });
      if (state.status !== 'connected') return reply.code(503).send({ error: 'Device is offline' });

      const outputCount = Object.keys(state.outputs).length;
      const inputCount = Object.keys(state.inputs).length;
      if (destination >= outputCount && !state.outputs[destination]) {
        return reply.code(400).send({ error: `destination ${destination} out of range` });
      }
      if (source >= inputCount && !state.inputs[source]) {
        return reply.code(400).send({ error: `source ${source} out of range` });
      }

      stateManager.route(deviceId, destination, source);
      return { success: true, pending: true };
    },
  );

  // --- Label Import ---

  fastify.post('/api/devices/:id/import-labels', async (request: any, reply) => {
    const { id } = request.params;
    const device = db.getDevice(id);
    if (!device) return reply.code(404).send({ error: 'Device not found' });
    if (device.type !== 'atem') return reply.code(400).send({ error: 'Label import only supported for ATEM devices' });

    const xml = request.body as string;
    if (!xml || typeof xml !== 'string') return reply.code(400).send({ error: 'Request body must be XML text' });

    try {
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
      const parsed = parser.parse(xml);

      // Navigate to the Outputs section — structure varies, search recursively
      const outputs: { index: number; label: string }[] = [];
      const findOutputs = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) {
          obj.forEach(findOutputs);
          return;
        }
        if (obj.Output) {
          const items = Array.isArray(obj.Output) ? obj.Output : [obj.Output];
          for (const item of items) {
            const rawId = parseInt(item['@_id']);
            if (rawId >= 8001 && rawId <= 8099 && item['@_longName']) {
              outputs.push({ index: rawId - 8001, label: item['@_longName'] });
            }
          }
        }
        for (const key of Object.keys(obj)) {
          if (key !== 'Output') findOutputs(obj[key]);
        }
      };
      findOutputs(parsed);

      if (outputs.length === 0) {
        return reply
          .code(400)
          .send({ error: 'No AUX output labels found in XML (expected Output elements with id 8001-8099)' });
      }

      db.setLabelOverrides(id, 'output', outputs);

      const overrides = db.getLabelOverrides(id);
      stateManager.applyLabelOverrides(id, overrides);

      return { success: true, count: outputs.length };
    } catch (err: any) {
      return reply.code(400).send({ error: 'Failed to parse XML: ' + err.message });
    }
  });

  // --- Presets ---

  fastify.get('/api/devices/:id/presets', async (request: any) => {
    return db.listPresets(request.params.id);
  });

  fastify.post('/api/devices/:id/presets', async (request: any, reply) => {
    const { name } = request.body;
    const deviceId = request.params.id;
    if (!name) return reply.code(400).send({ error: 'name required' });

    const state = stateManager.getDeviceState(deviceId);
    if (!state) return reply.code(404).send({ error: 'Device not found' });

    const preset = db.addPreset(deviceId, name, state.routing);
    return preset;
  });

  fastify.post('/api/devices/:id/presets/:sid/recall', async (request: any, reply) => {
    const { sid } = request.params;
    const preset = db.getPreset(sid);
    if (!preset) return reply.code(404).send({ error: 'Preset not found' });

    const state = stateManager.getDeviceState(preset.device_id);
    if (!state) return reply.code(404).send({ error: 'Device not found' });
    if (state.status !== 'connected') return reply.code(503).send({ error: 'Device is offline' });

    for (const [dest, src] of Object.entries(preset.routing)) {
      stateManager.route(preset.device_id, parseInt(dest), src as number);
    }
    companionBridge?.notifyPresetExecuted(sid, preset.device_id);
    return { success: true, routes: Object.keys(preset.routing).length };
  });

  fastify.delete('/api/presets/:id', async (request: any, reply) => {
    const ok = db.deletePreset(request.params.id);
    if (!ok) return reply.code(404).send({ error: 'Preset not found' });
    return { success: true };
  });

  // --- Groups ---

  fastify.get('/api/devices/:id/groups', async (request: any) => {
    return db.listGroups(request.params.id);
  });

  fastify.post('/api/devices/:id/groups', async (request: any, reply) => {
    const { name, direction, color } = request.body;
    if (!name || !direction) return reply.code(400).send({ error: 'name, direction required' });

    const group = db.addGroup(request.params.id, name, direction, color || '#888888');
    return group;
  });

  fastify.put('/api/groups/:id', async (request: any, reply) => {
    const { name, color } = request.body;
    const ok = db.updateGroup(request.params.id, { name, color });
    if (!ok) return reply.code(404).send({ error: 'Group not found' });
    return { success: true };
  });

  fastify.delete('/api/groups/:id', async (request: any, reply) => {
    const ok = db.deleteGroup(request.params.id);
    if (!ok) return reply.code(404).send({ error: 'Group not found' });
    return { success: true };
  });

  fastify.put(
    '/api/groups/:id/assignments',
    {
      schema: {
        body: {
          type: 'object',
          required: ['indices'],
          properties: {
            indices: { type: 'array', items: { type: 'integer', minimum: 0 } },
          },
        },
      },
    },
    async (request: any) => {
      const { indices } = request.body;
      db.setGroupAssignments(request.params.id, indices);
      return { success: true };
    },
  );

  // --- Companion Settings ---

  if (companionBridge) {
    fastify.get('/api/settings/companion', async () => {
      return companionBridge.getConfig();
    });

    fastify.put(
      '/api/settings/companion',
      {
        schema: {
          body: {
            type: 'object',
            properties: {
              ip: { type: 'string', pattern: '^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$' },
              oscPort: { type: 'integer', minimum: 1, maximum: 65535 },
              enabled: { type: 'boolean' },
            },
          },
        },
      },
      async (request: any) => {
        const { ip, oscPort, enabled } = request.body;
        companionBridge.updateConfig(ip || '127.0.0.1', oscPort || 12321, !!enabled);
        return companionBridge.getConfig();
      },
    );

    fastify.post('/api/settings/companion/test', async () => {
      const ok = await companionBridge.sendTest();
      return { success: ok };
    });
  }

  // --- Device Discovery ---

  if (discovery) {
    fastify.get('/api/discovery', async () => {
      return discovery.getDiscovered();
    });
  }

  // --- WebSocket ---

  fastify.get('/ws', { websocket: true }, (connection, req) => {
    // Validate WebSocket origin (skip in production — browser is same-origin)
    const origin = req.headers.origin;
    if (!isProduction && origin && !allowedOrigins.includes(origin)) {
      fastify.log.warn({ origin }, 'WebSocket connection rejected: invalid origin');
      connection.close(1008, 'Origin not allowed');
      return;
    }

    fastify.log.info('Client connected to WebSocket');

    const allDevices = stateManager.getAllDevices();
    connection.send(JSON.stringify({ type: 'FULL_STATE', devices: allDevices }));

    const pingInterval = setInterval(() => {
      connection.ping();
    }, 15000);

    connection.on('message', (raw) => {
      try {
        JSON.parse(raw.toString());
      } catch {
        connection.send(JSON.stringify({ type: 'ERROR', error: 'Invalid JSON' }));
      }
    });

    connection.on('close', () => {
      clearInterval(pingInterval);
      fastify.log.info('Client disconnected from WebSocket');
    });

    connection.on('error', (err) => {
      fastify.log.error({ err }, 'WebSocket error');
    });
  });

  // Wire StateManager events to WebSocket broadcast
  stateManager.on('ROUTING_CHANGED', (payload) => broadcast({ type: 'ROUTING_CHANGED', ...payload }));
  stateManager.on('DEVICE_STATUS_CHANGED', (payload) => broadcast({ type: 'DEVICE_STATUS_CHANGED', ...payload }));
  stateManager.on('LABELS_CHANGED', (payload) => broadcast({ type: 'LABELS_CHANGED', ...payload }));
  stateManager.on('FULL_STATE_UPDATE', (payload) => broadcast({ type: 'FULL_STATE_UPDATE', ...payload }));

  return fastify;
}
