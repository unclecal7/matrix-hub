import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

// ---------------------------------------------------------------------------
// Mock connectors — must be classes so instanceof checks work in StateManager
// ---------------------------------------------------------------------------

const { latestMocks } = vi.hoisted(() => {
  const latestMocks = { videohub: null as any, atem: null as any };
  return { latestMocks };
});

vi.mock('../../src/server/devices/VideohubConnector', async () => {
  const { EventEmitter } = await import('events');
  class MockVideohubConnector extends EventEmitter {
    connect = vi.fn();
    disconnect = vi.fn();
    route = vi.fn();
    setLock = vi.fn();
    id: string;
    ip: string;
    constructor(id: string, ip: string) {
      super();
      this.id = id;
      this.ip = ip;
      latestMocks.videohub = this;
    }
  }
  return { VideohubConnector: MockVideohubConnector };
});

vi.mock('../../src/server/devices/AtemConnector', async () => {
  const { EventEmitter } = await import('events');
  class MockAtemConnector extends EventEmitter {
    connect = vi.fn();
    disconnect = vi.fn().mockResolvedValue(undefined);
    changeAuxInput = vi.fn().mockResolvedValue(undefined);
    changeProgramInput = vi.fn().mockResolvedValue(undefined);
    id: string;
    ip: string;
    constructor(id: string, ip: string) {
      super();
      this.id = id;
      this.ip = ip;
      latestMocks.atem = this;
    }
  }
  return { AtemConnector: MockAtemConnector };
});

vi.mock('atem-connection', () => ({
  Enums: {
    Model: {
      11: 'Constellation',
      12: 'Constellation8K',
    },
  },
}));

import { StateManager } from '../../src/server/state/StateManager';
import { VideohubConnector } from '../../src/server/devices/VideohubConnector';
import { AtemConnector } from '../../src/server/devices/AtemConnector';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StateManager', () => {
  let sm: StateManager;

  beforeEach(() => {
    vi.clearAllMocks();
    sm = new StateManager();
  });

  // -------------------------------------------------------------------------
  // 1. registerVideohub creates device state with correct initial values
  // -------------------------------------------------------------------------
  describe('registerVideohub', () => {
    it('creates device state with correct initial values', () => {
      sm.registerVideohub('vh1', '192.168.1.10', 'Test Videohub');

      const device = sm.getDeviceState('vh1');
      expect(device).toBeDefined();
      expect(device!.id).toBe('vh1');
      expect(device!.type).toBe('videohub');
      expect(device!.name).toBe('Test Videohub');
      expect(device!.ip).toBe('192.168.1.10');
      expect(device!.status).toBe('disconnected');
      expect(device!.inputs).toEqual({});
      expect(device!.outputs).toEqual({});
      expect(device!.routing).toEqual({});
      expect(device!.locks).toEqual({});
    });

    it('calls connector.connect()', () => {
      sm.registerVideohub('vh1', '192.168.1.10', 'Test Videohub');
      expect(latestMocks.videohub.connect).toHaveBeenCalledOnce();
    });

    it('does not register a second time if id already exists', () => {
      sm.registerVideohub('vh1', '192.168.1.10', 'First');
      sm.registerVideohub('vh1', '10.0.0.1', 'Second');

      // Should still have the first registration
      const device = sm.getDeviceState('vh1');
      expect(device!.name).toBe('First');
      expect(device!.ip).toBe('192.168.1.10');
      // VideohubConnector constructor should have been called only once
      // Only one connector was created (name stayed "First", not "Second")
    });
  });

  // -------------------------------------------------------------------------
  // 2. getDeviceState returns the registered device
  // -------------------------------------------------------------------------
  describe('getDeviceState', () => {
    it('returns the registered device', () => {
      sm.registerVideohub('vh1', '192.168.1.10', 'My Hub');
      const state = sm.getDeviceState('vh1');
      expect(state).toBeDefined();
      expect(state!.id).toBe('vh1');
    });

    it('returns undefined for an unregistered device', () => {
      expect(sm.getDeviceState('nonexistent')).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 3. getAllDevices returns all registered devices
  // -------------------------------------------------------------------------
  describe('getAllDevices', () => {
    it('returns empty array when no devices registered', () => {
      expect(sm.getAllDevices()).toEqual([]);
    });

    it('returns all registered devices', () => {
      sm.registerVideohub('vh1', '192.168.1.10', 'Hub A');
      sm.registerVideohub('vh2', '192.168.1.20', 'Hub B');

      const devices = sm.getAllDevices();
      expect(devices).toHaveLength(2);
      const ids = devices.map(d => d.id);
      expect(ids).toContain('vh1');
      expect(ids).toContain('vh2');
    });
  });

  // -------------------------------------------------------------------------
  // 4. route() calls the correct connector method
  // -------------------------------------------------------------------------
  describe('route', () => {
    it('calls videohub connector.route() for a videohub device', () => {
      sm.registerVideohub('vh1', '192.168.1.10', 'Hub');
      sm.route('vh1', 3, 7);
      expect(latestMocks.videohub.route).toHaveBeenCalledWith(3, 7);
    });

    it('calls atem connector.changeAuxInput() for an atem device', () => {
      sm.registerAtem('atem1', '192.168.1.20', 'ATEM');
      sm.route('atem1', 2, 5);
      expect(latestMocks.atem.changeAuxInput).toHaveBeenCalledWith(2, 5);
    });

    it('does nothing for an unknown device id', () => {
      // Should not throw
      expect(() => sm.route('unknown', 0, 0)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // 5. applyLabelOverrides updates labels and emits FULL_STATE_UPDATE
  // -------------------------------------------------------------------------
  describe('applyLabelOverrides', () => {
    it('updates existing input labels', () => {
      sm.registerVideohub('vh1', '192.168.1.10', 'Hub');
      // Simulate hydrated state with some inputs
      const device = sm.getDeviceState('vh1')!;
      device.inputs[0] = { label: 'Camera 1' };
      device.inputs[1] = { label: 'Camera 2' };

      sm.applyLabelOverrides('vh1', [
        { direction: 'input', io_index: 0, label: 'CAM-A' },
      ]);

      expect(device.inputs[0].label).toBe('CAM-A');
      expect(device.inputs[1].label).toBe('Camera 2'); // unchanged
    });

    it('creates new label entries if io_index does not yet exist', () => {
      sm.registerVideohub('vh1', '192.168.1.10', 'Hub');
      sm.applyLabelOverrides('vh1', [
        { direction: 'output', io_index: 99, label: 'NEW OUTPUT' },
      ]);

      const device = sm.getDeviceState('vh1')!;
      expect(device.outputs[99]).toEqual({ label: 'NEW OUTPUT' });
    });

    it('emits FULL_STATE_UPDATE with deviceId and state', () => {
      sm.registerVideohub('vh1', '192.168.1.10', 'Hub');
      const handler = vi.fn();
      sm.on('FULL_STATE_UPDATE', handler);

      sm.applyLabelOverrides('vh1', [
        { direction: 'input', io_index: 0, label: 'X' },
      ]);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: 'vh1' })
      );
      const emittedState = handler.mock.calls[0][0].state;
      expect(emittedState.id).toBe('vh1');
    });

    it('does nothing if the device does not exist', () => {
      const handler = vi.fn();
      sm.on('FULL_STATE_UPDATE', handler);

      sm.applyLabelOverrides('nope', [
        { direction: 'input', io_index: 0, label: 'X' },
      ]);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 6. unregisterDevice removes the device and emits DEVICE_REMOVED
  // -------------------------------------------------------------------------
  describe('unregisterDevice', () => {
    it('removes the device from state and emits DEVICE_REMOVED', async () => {
      sm.registerVideohub('vh1', '192.168.1.10', 'Hub');
      expect(sm.getDeviceState('vh1')).toBeDefined();

      const handler = vi.fn();
      sm.on('DEVICE_REMOVED', handler);

      await sm.unregisterDevice('vh1');

      expect(sm.getDeviceState('vh1')).toBeUndefined();
      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ deviceId: 'vh1' });
    });

    it('calls connector.disconnect() for videohub', async () => {
      sm.registerVideohub('vh1', '192.168.1.10', 'Hub');
      const mock = latestMocks.videohub;

      await sm.unregisterDevice('vh1');
      expect(mock.disconnect).toHaveBeenCalledOnce();
    });

    it('calls connector.disconnect() for atem', async () => {
      sm.registerAtem('atem1', '192.168.1.20', 'ATEM');
      const mock = latestMocks.atem;

      await sm.unregisterDevice('atem1');
      expect(mock.disconnect).toHaveBeenCalledOnce();
    });

    it('emits DEVICE_REMOVED even if no connector exists (already removed)', async () => {
      // Manually put a device in state without a connector
      sm.registerVideohub('vh1', '192.168.1.10', 'Hub');
      // First unregister removes both
      await sm.unregisterDevice('vh1');

      const handler = vi.fn();
      sm.on('DEVICE_REMOVED', handler);
      // Second unregister — no connector, but should still emit
      await sm.unregisterDevice('vh1');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('removes device from getAllDevices list', async () => {
      sm.registerVideohub('vh1', '192.168.1.10', 'Hub A');
      sm.registerVideohub('vh2', '192.168.1.20', 'Hub B');
      expect(sm.getAllDevices()).toHaveLength(2);

      await sm.unregisterDevice('vh1');
      const remaining = sm.getAllDevices();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('vh2');
    });
  });

  // -------------------------------------------------------------------------
  // 7. Event propagation: connector 'connected' -> DEVICE_STATUS_CHANGED
  // -------------------------------------------------------------------------
  describe('event propagation: connected / disconnected', () => {
    it('emits DEVICE_STATUS_CHANGED with status connected when connector fires connected', () => {
      sm.registerVideohub('vh1', '192.168.1.10', 'Hub');
      const handler = vi.fn();
      sm.on('DEVICE_STATUS_CHANGED', handler);

      // Simulate the connector emitting 'connected'
      latestMocks.videohub.emit('connected');

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ deviceId: 'vh1', status: 'connected' });

      const device = sm.getDeviceState('vh1')!;
      expect(device.status).toBe('connected');
    });

    it('emits DEVICE_STATUS_CHANGED with status disconnected when connector fires disconnected', () => {
      sm.registerVideohub('vh1', '192.168.1.10', 'Hub');
      const handler = vi.fn();
      sm.on('DEVICE_STATUS_CHANGED', handler);

      latestMocks.videohub.emit('disconnected');

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ deviceId: 'vh1', status: 'disconnected' });
    });

    it('works for ATEM connector as well', () => {
      sm.registerAtem('atem1', '192.168.1.20', 'ATEM');
      const handler = vi.fn();
      sm.on('DEVICE_STATUS_CHANGED', handler);

      latestMocks.atem.emit('connected');

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ deviceId: 'atem1', status: 'connected' });
    });
  });

  // -------------------------------------------------------------------------
  // 8. Event propagation: connector 'routingChanged' -> ROUTING_CHANGED
  // -------------------------------------------------------------------------
  describe('event propagation: routingChanged', () => {
    it('emits ROUTING_CHANGED and updates device routing for videohub', () => {
      sm.registerVideohub('vh1', '192.168.1.10', 'Hub');
      const handler = vi.fn();
      sm.on('ROUTING_CHANGED', handler);

      latestMocks.videohub.emit('routingChanged', { destination: 5, source: 12 });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ deviceId: 'vh1', destination: 5, source: 12 });

      const device = sm.getDeviceState('vh1')!;
      expect(device.routing[5]).toBe(12);
    });

    it('emits ROUTING_CHANGED and updates device routing for atem', () => {
      sm.registerAtem('atem1', '192.168.1.20', 'ATEM');
      const handler = vi.fn();
      sm.on('ROUTING_CHANGED', handler);

      latestMocks.atem.emit('routingChanged', { destination: 2, source: 1000 });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ deviceId: 'atem1', destination: 2, source: 1000 });

      const device = sm.getDeviceState('atem1')!;
      expect(device.routing[2]).toBe(1000);
    });
  });

  // -------------------------------------------------------------------------
  // Additional: stateHydrated propagation
  // -------------------------------------------------------------------------
  describe('event propagation: stateHydrated', () => {
    it('updates device state and emits FULL_STATE_UPDATE for videohub', () => {
      sm.registerVideohub('vh1', '192.168.1.10', 'Hub');
      const handler = vi.fn();
      sm.on('FULL_STATE_UPDATE', handler);

      latestMocks.videohub.emit('stateHydrated', {
        name: 'Real Videohub Name',
        inputs: { 0: { label: 'Cam 1' }, 1: { label: 'Cam 2' } },
        outputs: { 0: { label: 'Out 1' } },
        routing: { 0: 1 },
        locks: { 0: 'U' as const },
      });

      expect(handler).toHaveBeenCalledOnce();
      const device = sm.getDeviceState('vh1')!;
      expect(device.name).toBe('Real Videohub Name');
      expect(device.inputs[0].label).toBe('Cam 1');
      expect(device.outputs[0].label).toBe('Out 1');
      expect(device.routing[0]).toBe(1);
      expect(device.locks[0]).toBe('U');
    });

    it('updates device state and emits FULL_STATE_UPDATE for atem', () => {
      sm.registerAtem('atem1', '192.168.1.20', 'ATEM');
      const handler = vi.fn();
      sm.on('FULL_STATE_UPDATE', handler);

      latestMocks.atem.emit('stateHydrated', {
        inputs: { 1: { label: 'Input 1' } },
        outputs: { 0: { label: 'AUX 1' } },
        routing: { 0: 1 },
      });

      expect(handler).toHaveBeenCalledOnce();
      const device = sm.getDeviceState('atem1')!;
      expect(device.inputs[1].label).toBe('Input 1');
      expect(device.outputs[0].label).toBe('AUX 1');
      expect(device.routing[0]).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Additional: labelsChanged propagation
  // -------------------------------------------------------------------------
  describe('event propagation: labelsChanged', () => {
    it('updates input label and emits LABELS_CHANGED for videohub', () => {
      sm.registerVideohub('vh1', '192.168.1.10', 'Hub');
      const handler = vi.fn();
      sm.on('LABELS_CHANGED', handler);

      latestMocks.videohub.emit('labelsChanged', { direction: 'input', index: 3, label: 'New Label' });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ deviceId: 'vh1', direction: 'input', index: 3, label: 'New Label' });

      const device = sm.getDeviceState('vh1')!;
      expect(device.inputs[3]).toEqual({ label: 'New Label' });
    });

    it('updates output label and emits LABELS_CHANGED for videohub', () => {
      sm.registerVideohub('vh1', '192.168.1.10', 'Hub');
      const handler = vi.fn();
      sm.on('LABELS_CHANGED', handler);

      latestMocks.videohub.emit('labelsChanged', { direction: 'output', index: 0, label: 'Monitor A' });

      expect(handler).toHaveBeenCalledOnce();
      const device = sm.getDeviceState('vh1')!;
      expect(device.outputs[0]).toEqual({ label: 'Monitor A' });
    });

    it('updates existing label entry rather than replacing it for videohub', () => {
      sm.registerVideohub('vh1', '192.168.1.10', 'Hub');
      const device = sm.getDeviceState('vh1')!;
      device.inputs[5] = { label: 'Old' };

      latestMocks.videohub.emit('labelsChanged', { direction: 'input', index: 5, label: 'Updated' });

      expect(device.inputs[5].label).toBe('Updated');
    });

    it('updates input label via longName for atem labelsChanged', () => {
      sm.registerAtem('atem1', '192.168.1.20', 'ATEM');
      const handler = vi.fn();
      sm.on('LABELS_CHANGED', handler);

      latestMocks.atem.emit('labelsChanged', { index: 1, longName: 'Camera One' });

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ deviceId: 'atem1', direction: 'input', index: 1, label: 'Camera One' });

      const device = sm.getDeviceState('atem1')!;
      expect(device.inputs[1]).toEqual({ label: 'Camera One' });
    });
  });

  // -------------------------------------------------------------------------
  // Additional: registerAtem
  // -------------------------------------------------------------------------
  describe('registerAtem', () => {
    it('creates device state with type atem', () => {
      sm.registerAtem('atem1', '192.168.1.20', 'Test ATEM');

      const device = sm.getDeviceState('atem1');
      expect(device).toBeDefined();
      expect(device!.type).toBe('atem');
      expect(device!.name).toBe('Test ATEM');
      expect(device!.status).toBe('disconnected');
    });

    it('calls connector.connect()', () => {
      sm.registerAtem('atem1', '192.168.1.20', 'ATEM');
      expect(latestMocks.atem.connect).toHaveBeenCalledOnce();
    });

    it('does not register a second time if id already exists', () => {
      sm.registerAtem('atem1', '192.168.1.20', 'First');
      sm.registerAtem('atem1', '10.0.0.1', 'Second');

      const device = sm.getDeviceState('atem1');
      expect(device!.name).toBe('First');
      // Only one connector was created (name stayed "First", not "Second")
    });

    it('updates device name on modelInfo event', () => {
      sm.registerAtem('atem1', '192.168.1.20', 'ATEM');

      latestMocks.atem.emit('modelInfo', { model: 12 });

      const device = sm.getDeviceState('atem1')!;
      expect(device.name).toBe('ATEM Constellation 8K');
    });
  });

  // -------------------------------------------------------------------------
  // Additional: setDatabase and applyStoredOverrides
  // -------------------------------------------------------------------------
  describe('setDatabase / applyStoredOverrides', () => {
    it('applies stored label overrides from DB on stateHydrated', () => {
      const mockDb = {
        getLabelOverrides: vi.fn().mockReturnValue([
          { direction: 'input', io_index: 0, label: 'DB Override' },
        ]),
      };
      sm.setDatabase(mockDb as any);
      sm.registerVideohub('vh1', '192.168.1.10', 'Hub');

      // Simulate hydration
      latestMocks.videohub.emit('stateHydrated', {
        name: 'Hub',
        inputs: { 0: { label: 'Original' } },
        outputs: {},
        routing: {},
        locks: {},
      });

      const device = sm.getDeviceState('vh1')!;
      expect(device.inputs[0].label).toBe('DB Override');
      expect(mockDb.getLabelOverrides).toHaveBeenCalledWith('vh1');
    });

    it('does nothing if no database is set', () => {
      sm.registerVideohub('vh1', '192.168.1.10', 'Hub');

      // Should not throw — applyStoredOverrides returns early if no db
      expect(() => {
        latestMocks.videohub.emit('stateHydrated', {
          name: 'Hub',
          inputs: { 0: { label: 'X' } },
          outputs: {},
          routing: {},
          locks: {},
        });
      }).not.toThrow();
    });

    it('does nothing if DB returns no overrides', () => {
      const mockDb = {
        getLabelOverrides: vi.fn().mockReturnValue([]),
      };
      sm.setDatabase(mockDb as any);
      sm.registerVideohub('vh1', '192.168.1.10', 'Hub');

      latestMocks.videohub.emit('stateHydrated', {
        name: 'Hub',
        inputs: { 0: { label: 'Stays' } },
        outputs: {},
        routing: {},
        locks: {},
      });

      const device = sm.getDeviceState('vh1')!;
      expect(device.inputs[0].label).toBe('Stays');
    });
  });
});
