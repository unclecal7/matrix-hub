import { describe, it, expect, beforeEach } from 'vitest';
import { useDeviceStore } from '../../src/renderer/stores/useDeviceStore';
import type { DeviceState } from '../../src/shared/types';

/** Helper: build a DeviceState with sensible defaults, overridable. */
function makeDevice(overrides: Partial<DeviceState> = {}): DeviceState {
  return {
    id: 'dev-1',
    type: 'videohub',
    name: 'Test Videohub',
    ip: '192.168.1.100',
    status: 'connected',
    inputs: {
      0: { label: 'Camera 1' },
      1: { label: 'Camera 2' },
    },
    outputs: {
      0: { label: 'Monitor 1' },
      1: { label: 'Monitor 2' },
    },
    routing: { 0: 0, 1: 1 },
    locks: { 0: 'U', 1: 'U' },
    ...overrides,
  };
}

describe('useDeviceStore', () => {
  beforeEach(() => {
    // Reset the store to a clean slate before every test.
    useDeviceStore.setState({ devices: {}, activeDeviceId: null });
  });

  // ---------------------------------------------------------------
  // 1. Initial state
  // ---------------------------------------------------------------
  it('has empty devices and null activeDeviceId by default', () => {
    const { devices, activeDeviceId } = useDeviceStore.getState();
    expect(devices).toEqual({});
    expect(activeDeviceId).toBeNull();
  });

  // ---------------------------------------------------------------
  // 2. setDevices — populates map, picks first device as active
  // ---------------------------------------------------------------
  it('setDevices populates the devices map and sets activeDeviceId to the first device', () => {
    const d1 = makeDevice({ id: 'a' });
    const d2 = makeDevice({ id: 'b', name: 'Second' });

    useDeviceStore.getState().setDevices([d1, d2]);

    const { devices, activeDeviceId } = useDeviceStore.getState();
    expect(Object.keys(devices)).toHaveLength(2);
    expect(devices['a']).toEqual(d1);
    expect(devices['b']).toEqual(d2);
    expect(activeDeviceId).toBe('a');
  });

  // ---------------------------------------------------------------
  // 3. setDevices — preserves existing activeDeviceId
  // ---------------------------------------------------------------
  it('setDevices preserves activeDeviceId when one is already set', () => {
    // Pre-set an active device id.
    useDeviceStore.setState({ activeDeviceId: 'existing-id' });

    const d1 = makeDevice({ id: 'x' });
    useDeviceStore.getState().setDevices([d1]);

    const { activeDeviceId } = useDeviceStore.getState();
    expect(activeDeviceId).toBe('existing-id');
  });

  // ---------------------------------------------------------------
  // 4. setActiveDevice
  // ---------------------------------------------------------------
  it('setActiveDevice updates activeDeviceId', () => {
    useDeviceStore.getState().setActiveDevice('some-id');
    expect(useDeviceStore.getState().activeDeviceId).toBe('some-id');
  });

  // ---------------------------------------------------------------
  // 5. updateDeviceStatus — happy path + unknown device
  // ---------------------------------------------------------------
  it('updateDeviceStatus updates the status immutably', () => {
    const device = makeDevice({ id: 'hub', status: 'connected' });
    useDeviceStore.setState({ devices: { hub: device } });

    useDeviceStore.getState().updateDeviceStatus('hub', 'disconnected');

    const updated = useDeviceStore.getState().devices['hub'];
    expect(updated.status).toBe('disconnected');
    // Original object must not have been mutated.
    expect(device.status).toBe('connected');
  });

  it('updateDeviceStatus returns same state for an unknown device id', () => {
    const before = useDeviceStore.getState();
    useDeviceStore.getState().updateDeviceStatus('nonexistent', 'connecting');
    const after = useDeviceStore.getState();
    expect(after.devices).toBe(before.devices);
  });

  // ---------------------------------------------------------------
  // 6. updateRouting — happy path + unknown device
  // ---------------------------------------------------------------
  it('updateRouting adds/updates a routing entry immutably', () => {
    const device = makeDevice({ id: 'r1', routing: { 0: 0 } });
    useDeviceStore.setState({ devices: { r1: device } });

    // Update existing destination.
    useDeviceStore.getState().updateRouting('r1', 0, 5);
    expect(useDeviceStore.getState().devices['r1'].routing[0]).toBe(5);

    // Add a new destination.
    useDeviceStore.getState().updateRouting('r1', 3, 7);
    expect(useDeviceStore.getState().devices['r1'].routing[3]).toBe(7);

    // Original object must not have been mutated.
    expect(device.routing[0]).toBe(0);
    expect(device.routing[3]).toBeUndefined();
  });

  it('updateRouting returns same state for an unknown device id', () => {
    const before = useDeviceStore.getState();
    useDeviceStore.getState().updateRouting('ghost', 0, 1);
    const after = useDeviceStore.getState();
    expect(after.devices).toBe(before.devices);
  });

  // ---------------------------------------------------------------
  // 7. updateLabel — input label
  // ---------------------------------------------------------------
  it('updateLabel updates an input label immutably', () => {
    const device = makeDevice({ id: 'lbl' });
    useDeviceStore.setState({ devices: { lbl: device } });

    useDeviceStore.getState().updateLabel('lbl', 'input', 0, 'Renamed Camera');

    const updated = useDeviceStore.getState().devices['lbl'];
    expect(updated.inputs[0].label).toBe('Renamed Camera');
    // Other input untouched.
    expect(updated.inputs[1].label).toBe('Camera 2');
    // Original not mutated.
    expect(device.inputs[0].label).toBe('Camera 1');
  });

  // ---------------------------------------------------------------
  // 8. updateLabel — output label
  // ---------------------------------------------------------------
  it('updateLabel updates an output label immutably', () => {
    const device = makeDevice({ id: 'lbl2' });
    useDeviceStore.setState({ devices: { lbl2: device } });

    useDeviceStore.getState().updateLabel('lbl2', 'output', 1, 'Projector');

    const updated = useDeviceStore.getState().devices['lbl2'];
    expect(updated.outputs[1].label).toBe('Projector');
    // Other output untouched.
    expect(updated.outputs[0].label).toBe('Monitor 1');
    // Original not mutated.
    expect(device.outputs[1].label).toBe('Monitor 2');
  });

  // ---------------------------------------------------------------
  // 9. updateDevice — replaces entire device
  // ---------------------------------------------------------------
  it('updateDevice replaces the entire device entry', () => {
    const original = makeDevice({ id: 'u1', name: 'Old' });
    useDeviceStore.setState({ devices: { u1: original } });

    const replacement = makeDevice({ id: 'u1', name: 'New', status: 'disconnected' });
    useDeviceStore.getState().updateDevice(replacement);

    expect(useDeviceStore.getState().devices['u1']).toEqual(replacement);
    expect(useDeviceStore.getState().devices['u1'].name).toBe('New');
  });

  // ---------------------------------------------------------------
  // 10. addDevice — adds alongside existing devices
  // ---------------------------------------------------------------
  it('addDevice adds a new device without removing existing ones', () => {
    const existing = makeDevice({ id: 'e1' });
    useDeviceStore.setState({ devices: { e1: existing } });

    const added = makeDevice({ id: 'e2', name: 'ATEM', type: 'atem' });
    useDeviceStore.getState().addDevice(added);

    const { devices } = useDeviceStore.getState();
    expect(Object.keys(devices)).toHaveLength(2);
    expect(devices['e1']).toEqual(existing);
    expect(devices['e2']).toEqual(added);
  });

  // ---------------------------------------------------------------
  // 11. removeDevice — removes device, reassigns activeDeviceId
  // ---------------------------------------------------------------
  it('removeDevice removes the device and selects a new activeDeviceId when the active one is removed', () => {
    const d1 = makeDevice({ id: 'keep' });
    const d2 = makeDevice({ id: 'remove' });
    useDeviceStore.setState({ devices: { keep: d1, remove: d2 }, activeDeviceId: 'remove' });

    useDeviceStore.getState().removeDevice('remove');

    const { devices, activeDeviceId } = useDeviceStore.getState();
    expect(devices['remove']).toBeUndefined();
    expect(Object.keys(devices)).toHaveLength(1);
    expect(activeDeviceId).toBe('keep');
  });

  it('removeDevice sets activeDeviceId to null when the last device is removed', () => {
    const only = makeDevice({ id: 'solo' });
    useDeviceStore.setState({ devices: { solo: only }, activeDeviceId: 'solo' });

    useDeviceStore.getState().removeDevice('solo');

    const { devices, activeDeviceId } = useDeviceStore.getState();
    expect(Object.keys(devices)).toHaveLength(0);
    expect(activeDeviceId).toBeNull();
  });

  // ---------------------------------------------------------------
  // 12. removeDevice — keeps activeDeviceId if removed was not active
  // ---------------------------------------------------------------
  it('removeDevice keeps activeDeviceId unchanged when a non-active device is removed', () => {
    const d1 = makeDevice({ id: 'active-one' });
    const d2 = makeDevice({ id: 'other' });
    useDeviceStore.setState({ devices: { 'active-one': d1, other: d2 }, activeDeviceId: 'active-one' });

    useDeviceStore.getState().removeDevice('other');

    const { devices, activeDeviceId } = useDeviceStore.getState();
    expect(devices['other']).toBeUndefined();
    expect(activeDeviceId).toBe('active-one');
  });

  // ---------------------------------------------------------------
  // 13. Immutability — devices reference changes on update
  // ---------------------------------------------------------------
  it('produces a new devices object reference on every mutation', () => {
    const device = makeDevice({ id: 'imm' });
    useDeviceStore.setState({ devices: { imm: device } });

    const ref1 = useDeviceStore.getState().devices;

    useDeviceStore.getState().updateDeviceStatus('imm', 'connecting');
    const ref2 = useDeviceStore.getState().devices;

    useDeviceStore.getState().updateRouting('imm', 0, 9);
    const ref3 = useDeviceStore.getState().devices;

    useDeviceStore.getState().updateLabel('imm', 'input', 0, 'X');
    const ref4 = useDeviceStore.getState().devices;

    // Each mutation must yield a new top-level devices object.
    expect(ref1).not.toBe(ref2);
    expect(ref2).not.toBe(ref3);
    expect(ref3).not.toBe(ref4);

    // And each individual device object should also be a new reference.
    expect(ref1['imm']).not.toBe(ref2['imm']);
    expect(ref2['imm']).not.toBe(ref3['imm']);
    expect(ref3['imm']).not.toBe(ref4['imm']);
  });
});
