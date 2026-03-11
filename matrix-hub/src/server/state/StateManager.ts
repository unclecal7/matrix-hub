import { EventEmitter } from 'events';
import { Enums } from 'atem-connection';
import { VideohubConnector } from '../devices/VideohubConnector';
import { AtemConnector } from '../devices/AtemConnector';
import type { AppDatabase } from '../db/database';
import type { NormalizedDeviceState } from '../../shared/types';

export type { NormalizedDeviceState };

export class StateManager extends EventEmitter {
  private devices: Map<string, NormalizedDeviceState> = new Map();
  private connectors: Map<string, VideohubConnector | AtemConnector> = new Map();
  private db?: AppDatabase;

  constructor() {
    super();
  }

  public setDatabase(db: AppDatabase) {
    this.db = db;
  }

  public registerVideohub(id: string, ip: string, name: string) {
    if (this.connectors.has(id)) return;

    const connector = new VideohubConnector(id, ip);
    this.connectors.set(id, connector);

    this.devices.set(id, {
      id,
      type: 'videohub',
      name,
      ip,
      status: 'disconnected',
      inputs: {},
      outputs: {},
      routing: {},
      locks: {},
    });

    // Wire up events
    connector.on('connected', () => {
      const device = this.devices.get(id);
      if (device) {
        device.status = 'connected';
        this.emit('DEVICE_STATUS_CHANGED', { deviceId: id, status: 'connected' });
      }
    });

    connector.on('stateHydrated', (state) => {
      const device = this.devices.get(id);
      if (device) {
        device.name = state.name || name;
        device.inputs = state.inputs;
        device.outputs = state.outputs;
        device.routing = state.routing;
        device.locks = state.locks;
        this.applyStoredOverrides(id);
        this.emit('FULL_STATE_UPDATE', { deviceId: id, state: device });
      }
    });

    connector.on('disconnected', () => {
      const device = this.devices.get(id);
      if (device) {
        device.status = 'disconnected';
        this.emit('DEVICE_STATUS_CHANGED', { deviceId: id, status: 'disconnected' });
      }
    });

    connector.on('routingChanged', ({ destination, source }) => {
      const device = this.devices.get(id);
      if (device) {
        device.routing[destination] = source;
        this.emit('ROUTING_CHANGED', { deviceId: id, destination, source });
      }
    });

    connector.on('labelsChanged', ({ direction, index, label }) => {
      const device = this.devices.get(id);
      if (device) {
        if (direction === 'input') {
          if (!device.inputs[index]) device.inputs[index] = { label };
          else device.inputs[index].label = label;
        } else {
          if (!device.outputs[index]) device.outputs[index] = { label };
          else device.outputs[index].label = label;
        }
        this.emit('LABELS_CHANGED', { deviceId: id, direction, index, label });
      }
    });

    connector.connect();
  }

  public registerAtem(id: string, ip: string, name: string) {
    if (this.connectors.has(id)) return;

    const connector = new AtemConnector(id, ip);
    this.connectors.set(id, connector);

    this.devices.set(id, {
      id,
      type: 'atem',
      name,
      ip,
      status: 'disconnected',
      inputs: {},
      outputs: {},
      routing: {},
      locks: {},
    });

    connector.on('connected', () => {
      const device = this.devices.get(id);
      if (device) {
        device.status = 'connected';
        this.emit('DEVICE_STATUS_CHANGED', { deviceId: id, status: 'connected' });
      }
    });

    connector.on('modelInfo', ({ model }: { model: number }) => {
      const device = this.devices.get(id);
      if (device) {
        // Convert numeric enum to readable name (e.g. 11 → "Constellation", 12 → "Constellation8K")
        const enumName = Enums.Model[model] || `ATEM (${model})`;
        // Insert spaces before capitals for display: "Constellation8K" → "Constellation 8K"
        device.name = 'ATEM ' + enumName.replace(/([a-z])([A-Z0-9])/g, '$1 $2');
      }
    });

    connector.on(
      'stateHydrated',
      ({
        inputs,
        outputs,
        routing,
      }: {
        inputs: Record<number, { label: string }>;
        outputs: Record<number, { label: string }>;
        routing: Record<number, number>;
      }) => {
        const device = this.devices.get(id);
        if (device) {
          device.inputs = inputs;
          device.outputs = outputs;
          device.routing = routing;
          this.applyStoredOverrides(id);
          this.emit('FULL_STATE_UPDATE', { deviceId: id, state: device });
        }
      },
    );

    connector.on('disconnected', () => {
      const device = this.devices.get(id);
      if (device) {
        device.status = 'disconnected';
        this.emit('DEVICE_STATUS_CHANGED', { deviceId: id, status: 'disconnected' });
      }
    });

    connector.on('routingChanged', ({ destination, source }: { destination: number; source: number }) => {
      const device = this.devices.get(id);
      if (device) {
        device.routing[destination] = source;
        this.emit('ROUTING_CHANGED', { deviceId: id, destination, source });
      }
    });

    connector.on('labelsChanged', ({ index, longName }: { index: number; longName: string }) => {
      const device = this.devices.get(id);
      if (device) {
        if (!device.inputs[index]) device.inputs[index] = { label: longName };
        else device.inputs[index].label = longName;
        this.emit('LABELS_CHANGED', { deviceId: id, direction: 'input', index, label: longName });
      }
    });

    connector.connect();
  }

  public applyLabelOverrides(deviceId: string, overrides: { direction: string; io_index: number; label: string }[]) {
    const device = this.devices.get(deviceId);
    if (!device) return;
    for (const o of overrides) {
      const map = o.direction === 'input' ? device.inputs : device.outputs;
      if (map[o.io_index]) {
        map[o.io_index].label = o.label;
      } else {
        map[o.io_index] = { label: o.label };
      }
    }
    this.emit('FULL_STATE_UPDATE', { deviceId, state: device });
  }

  private applyStoredOverrides(deviceId: string) {
    if (!this.db) return;
    const overrides = this.db.getLabelOverrides(deviceId);
    if (overrides.length > 0) {
      const device = this.devices.get(deviceId);
      if (!device) return;
      for (const o of overrides) {
        const map = o.direction === 'input' ? device.inputs : device.outputs;
        if (map[o.io_index]) {
          map[o.io_index].label = o.label;
        } else {
          map[o.io_index] = { label: o.label };
        }
      }
    }
  }

  public route(deviceId: string, destination: number, source: number) {
    const connector = this.connectors.get(deviceId);
    if (connector) {
      if (connector instanceof VideohubConnector) {
        connector.route(destination, source);
      } else if (connector instanceof AtemConnector) {
        // Assume Aux routing for now, will expand based on 'routeType' later
        connector.changeAuxInput(destination, source);
      }
    }
  }

  public async unregisterDevice(id: string) {
    const connector = this.connectors.get(id);
    if (connector) {
      if (connector instanceof VideohubConnector) {
        connector.disconnect();
      } else if (connector instanceof AtemConnector) {
        await connector.disconnect();
      }
      connector.removeAllListeners();
      this.connectors.delete(id);
    }
    this.devices.delete(id);
    this.emit('DEVICE_REMOVED', { deviceId: id });
  }

  public getDeviceState(deviceId: string): NormalizedDeviceState | undefined {
    return this.devices.get(deviceId);
  }

  public getAllDevices(): NormalizedDeviceState[] {
    return Array.from(this.devices.values());
  }
}
