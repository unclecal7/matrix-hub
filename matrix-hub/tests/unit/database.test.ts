import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AppDatabase } from '../../src/server/db/database.js';

describe('AppDatabase', () => {
  let db: AppDatabase;

  beforeEach(() => {
    db = new AppDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  // -------------------------------------------------------------------------
  // Devices CRUD
  // -------------------------------------------------------------------------
  describe('Devices', () => {
    it('addDevice returns a record with a generated id', () => {
      const device = db.addDevice({ type: 'videohub', name: 'Test Hub', ip: '192.168.1.10' });
      expect(device).toMatchObject({ type: 'videohub', name: 'Test Hub', ip: '192.168.1.10' });
      expect(device.id).toBeDefined();
      expect(typeof device.id).toBe('string');
      expect(device.id.length).toBeGreaterThan(0);
    });

    it('listDevices returns all added devices', () => {
      expect(db.listDevices()).toEqual([]);

      db.addDevice({ type: 'videohub', name: 'Hub A', ip: '10.0.0.1' });
      db.addDevice({ type: 'atem', name: 'ATEM B', ip: '10.0.0.2' });

      const devices = db.listDevices();
      expect(devices).toHaveLength(2);
      expect(devices.map(d => d.name).sort()).toEqual(['ATEM B', 'Hub A']);
    });

    it('getDevice returns a device by id', () => {
      const added = db.addDevice({ type: 'atem', name: 'My ATEM', ip: '10.0.0.5' });
      const found = db.getDevice(added.id);
      expect(found).toEqual(added);
    });

    it('getDevice returns undefined for a nonexistent id', () => {
      expect(db.getDevice('nonexistent-id')).toBeUndefined();
    });

    it('updateDevice changes the name', () => {
      const device = db.addDevice({ type: 'videohub', name: 'Old Name', ip: '10.0.0.1' });
      const result = db.updateDevice(device.id, { name: 'New Name' });
      expect(result).toBe(true);

      const updated = db.getDevice(device.id);
      expect(updated!.name).toBe('New Name');
      expect(updated!.ip).toBe('10.0.0.1'); // unchanged
    });

    it('updateDevice changes the ip', () => {
      const device = db.addDevice({ type: 'videohub', name: 'Hub', ip: '10.0.0.1' });
      const result = db.updateDevice(device.id, { ip: '10.0.0.99' });
      expect(result).toBe(true);

      const updated = db.getDevice(device.id);
      expect(updated!.ip).toBe('10.0.0.99');
      expect(updated!.name).toBe('Hub'); // unchanged
    });

    it('updateDevice changes both name and ip', () => {
      const device = db.addDevice({ type: 'atem', name: 'Old', ip: '1.1.1.1' });
      db.updateDevice(device.id, { name: 'New', ip: '2.2.2.2' });

      const updated = db.getDevice(device.id);
      expect(updated!.name).toBe('New');
      expect(updated!.ip).toBe('2.2.2.2');
    });

    it('updateDevice returns false for empty updates', () => {
      const device = db.addDevice({ type: 'videohub', name: 'Hub', ip: '10.0.0.1' });
      expect(db.updateDevice(device.id, {})).toBe(false);
    });

    it('updateDevice returns false for nonexistent id', () => {
      expect(db.updateDevice('no-such-id', { name: 'X' })).toBe(false);
    });

    it('deleteDevice removes the device', () => {
      const device = db.addDevice({ type: 'videohub', name: 'Hub', ip: '10.0.0.1' });
      expect(db.deleteDevice(device.id)).toBe(true);
      expect(db.getDevice(device.id)).toBeUndefined();
      expect(db.listDevices()).toHaveLength(0);
    });

    it('deleteDevice returns false for nonexistent id', () => {
      expect(db.deleteDevice('nonexistent')).toBe(false);
    });

    it('addDevice generates unique ids', () => {
      const a = db.addDevice({ type: 'videohub', name: 'A', ip: '1.1.1.1' });
      const b = db.addDevice({ type: 'videohub', name: 'B', ip: '2.2.2.2' });
      expect(a.id).not.toBe(b.id);
    });
  });

  // -------------------------------------------------------------------------
  // Presets
  // -------------------------------------------------------------------------
  describe('Presets', () => {
    let deviceId: string;

    beforeEach(() => {
      const device = db.addDevice({ type: 'videohub', name: 'Hub', ip: '10.0.0.1' });
      deviceId = device.id;
    });

    it('addPreset stores and returns a preset with parsed routing', () => {
      const routing = { 0: 5, 1: 3, 2: 7 };
      const preset = db.addPreset(deviceId, 'Show A', routing);

      expect(preset.id).toBeDefined();
      expect(preset.name).toBe('Show A');
      expect(preset.device_id).toBe(deviceId);
      expect(preset.routing).toEqual(routing);
      expect(preset.created_at).toBeDefined();
    });

    it('listPresets returns all presets for a device with parsed routing', () => {
      db.addPreset(deviceId, 'Preset 1', { 0: 1 });
      db.addPreset(deviceId, 'Preset 2', { 0: 2, 1: 3 });

      const presets = db.listPresets(deviceId);
      expect(presets).toHaveLength(2);
      // listPresets orders by created_at DESC, so the second added should be first
      // (though with in-memory speed they may have the same timestamp)
      const names = presets.map(p => p.name);
      expect(names).toContain('Preset 1');
      expect(names).toContain('Preset 2');

      // Verify routing is parsed (object, not string)
      for (const p of presets) {
        expect(typeof p.routing).toBe('object');
        expect(typeof p.routing).not.toBe('string');
      }
    });

    it('listPresets returns empty for a device with no presets', () => {
      expect(db.listPresets(deviceId)).toEqual([]);
    });

    it('listPresets does not return presets belonging to another device', () => {
      const otherDevice = db.addDevice({ type: 'atem', name: 'Other', ip: '10.0.0.2' });
      db.addPreset(deviceId, 'Mine', { 0: 1 });
      db.addPreset(otherDevice.id, 'Theirs', { 0: 2 });

      expect(db.listPresets(deviceId)).toHaveLength(1);
      expect(db.listPresets(otherDevice.id)).toHaveLength(1);
    });

    it('getPreset returns a preset by id with parsed routing', () => {
      const routing = { 10: 20, 11: 21 };
      const added = db.addPreset(deviceId, 'Get Test', routing);
      const found = db.getPreset(added.id);

      expect(found).toBeDefined();
      expect(found!.name).toBe('Get Test');
      expect(found!.routing).toEqual(routing);
    });

    it('getPreset returns undefined for nonexistent id', () => {
      expect(db.getPreset('nonexistent')).toBeUndefined();
    });

    it('deletePreset removes the preset', () => {
      const preset = db.addPreset(deviceId, 'To Delete', { 0: 0 });
      expect(db.deletePreset(preset.id)).toBe(true);
      expect(db.getPreset(preset.id)).toBeUndefined();
      expect(db.listPresets(deviceId)).toHaveLength(0);
    });

    it('deletePreset returns false for nonexistent id', () => {
      expect(db.deletePreset('nonexistent')).toBe(false);
    });

    it('presets cascade-delete when parent device is deleted', () => {
      const p1 = db.addPreset(deviceId, 'Preset 1', { 0: 1 });
      const p2 = db.addPreset(deviceId, 'Preset 2', { 1: 2 });

      db.deleteDevice(deviceId);

      expect(db.getPreset(p1.id)).toBeUndefined();
      expect(db.getPreset(p2.id)).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Groups
  // -------------------------------------------------------------------------
  describe('Groups', () => {
    let deviceId: string;

    beforeEach(() => {
      const device = db.addDevice({ type: 'videohub', name: 'Hub', ip: '10.0.0.1' });
      deviceId = device.id;
    });

    it('addGroup returns a group with auto-incremented sort_order', () => {
      const g1 = db.addGroup(deviceId, 'Group A', 'output', '#ff0000');
      expect(g1.id).toBeDefined();
      expect(g1.name).toBe('Group A');
      expect(g1.device_id).toBe(deviceId);
      expect(g1.direction).toBe('output');
      expect(g1.color).toBe('#ff0000');
      expect(g1.sort_order).toBe(1);
      expect(g1.assignments).toEqual([]);

      const g2 = db.addGroup(deviceId, 'Group B', 'input', '#00ff00');
      expect(g2.sort_order).toBe(2);

      const g3 = db.addGroup(deviceId, 'Group C', 'output', '#0000ff');
      expect(g3.sort_order).toBe(3);
    });

    it('addGroup sort_order is scoped per device', () => {
      const otherDevice = db.addDevice({ type: 'atem', name: 'Other', ip: '10.0.0.2' });

      db.addGroup(deviceId, 'G1', 'output', '#111');
      db.addGroup(deviceId, 'G2', 'output', '#222');

      // Other device starts its own sort_order sequence
      const otherGroup = db.addGroup(otherDevice.id, 'OG1', 'input', '#333');
      expect(otherGroup.sort_order).toBe(1);
    });

    it('listGroups returns groups with empty assignments', () => {
      db.addGroup(deviceId, 'Cameras', 'input', '#ff0000');
      db.addGroup(deviceId, 'Monitors', 'output', '#00ff00');

      const groups = db.listGroups(deviceId);
      expect(groups).toHaveLength(2);
      for (const g of groups) {
        expect(g.assignments).toEqual([]);
      }
    });

    it('listGroups returns empty for a device with no groups', () => {
      expect(db.listGroups(deviceId)).toEqual([]);
    });

    it('listGroups orders by sort_order then name', () => {
      db.addGroup(deviceId, 'B Group', 'output', '#111');
      db.addGroup(deviceId, 'A Group', 'output', '#222');

      const groups = db.listGroups(deviceId);
      // sort_order 1 then 2, so B Group first, A Group second
      expect(groups[0].name).toBe('B Group');
      expect(groups[1].name).toBe('A Group');
    });

    it('setGroupAssignments stores indices retrievable via listGroups', () => {
      const group = db.addGroup(deviceId, 'Cameras', 'input', '#ff0000');
      db.setGroupAssignments(group.id, [0, 3, 7, 15]);

      const groups = db.listGroups(deviceId);
      expect(groups).toHaveLength(1);
      expect(groups[0].assignments).toEqual([0, 3, 7, 15]);
    });

    it('setGroupAssignments replaces previous assignments', () => {
      const group = db.addGroup(deviceId, 'Cameras', 'input', '#ff0000');
      db.setGroupAssignments(group.id, [0, 1, 2]);

      // Replace with different set
      db.setGroupAssignments(group.id, [10, 20]);

      const groups = db.listGroups(deviceId);
      expect(groups[0].assignments).toEqual([10, 20]);
    });

    it('setGroupAssignments with empty array clears assignments', () => {
      const group = db.addGroup(deviceId, 'Cameras', 'input', '#ff0000');
      db.setGroupAssignments(group.id, [1, 2, 3]);
      db.setGroupAssignments(group.id, []);

      const groups = db.listGroups(deviceId);
      expect(groups[0].assignments).toEqual([]);
    });

    it('setGroupAssignments returns indices sorted by io_index', () => {
      const group = db.addGroup(deviceId, 'Mixed', 'output', '#aabbcc');
      db.setGroupAssignments(group.id, [99, 2, 50, 10]);

      const groups = db.listGroups(deviceId);
      expect(groups[0].assignments).toEqual([2, 10, 50, 99]);
    });

    it('updateGroup changes the name', () => {
      const group = db.addGroup(deviceId, 'Old', 'input', '#111');
      expect(db.updateGroup(group.id, { name: 'New' })).toBe(true);

      const groups = db.listGroups(deviceId);
      expect(groups[0].name).toBe('New');
      expect(groups[0].color).toBe('#111'); // unchanged
    });

    it('updateGroup changes the color', () => {
      const group = db.addGroup(deviceId, 'Cameras', 'input', '#111');
      expect(db.updateGroup(group.id, { color: '#999' })).toBe(true);

      const groups = db.listGroups(deviceId);
      expect(groups[0].color).toBe('#999');
      expect(groups[0].name).toBe('Cameras'); // unchanged
    });

    it('updateGroup changes both name and color', () => {
      const group = db.addGroup(deviceId, 'Old', 'input', '#111');
      db.updateGroup(group.id, { name: 'New', color: '#fff' });

      const groups = db.listGroups(deviceId);
      expect(groups[0].name).toBe('New');
      expect(groups[0].color).toBe('#fff');
    });

    it('updateGroup returns false for empty updates', () => {
      const group = db.addGroup(deviceId, 'G', 'input', '#111');
      expect(db.updateGroup(group.id, {})).toBe(false);
    });

    it('updateGroup returns false for nonexistent id', () => {
      expect(db.updateGroup('nonexistent', { name: 'X' })).toBe(false);
    });

    it('deleteGroup removes the group', () => {
      const group = db.addGroup(deviceId, 'To Delete', 'output', '#f00');
      expect(db.deleteGroup(group.id)).toBe(true);
      expect(db.listGroups(deviceId)).toHaveLength(0);
    });

    it('deleteGroup returns false for nonexistent id', () => {
      expect(db.deleteGroup('nonexistent')).toBe(false);
    });

    it('deleteGroup cascades to assignments', () => {
      const group = db.addGroup(deviceId, 'Cameras', 'input', '#ff0000');
      db.setGroupAssignments(group.id, [0, 1, 2]);
      db.deleteGroup(group.id);

      // Group is gone
      expect(db.listGroups(deviceId)).toHaveLength(0);

      // If we re-add a group, it should have no stale assignments
      const newGroup = db.addGroup(deviceId, 'New', 'input', '#00ff00');
      const groups = db.listGroups(deviceId);
      expect(groups[0].assignments).toEqual([]);
    });

    it('groups cascade-delete when parent device is deleted', () => {
      const g1 = db.addGroup(deviceId, 'G1', 'input', '#111');
      const g2 = db.addGroup(deviceId, 'G2', 'output', '#222');
      db.setGroupAssignments(g1.id, [0, 1]);
      db.setGroupAssignments(g2.id, [5, 6]);

      db.deleteDevice(deviceId);

      // Re-add device to query (original deviceId groups should be gone)
      // We can't listGroups on deleted device, but we can verify by attempting
      // to get them — the list should be empty since the device is gone
      expect(db.listGroups(deviceId)).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------
  describe('Settings', () => {
    it('getSetting returns undefined for a missing key', () => {
      expect(db.getSetting('nonexistent')).toBeUndefined();
    });

    it('setSetting + getSetting roundtrip', () => {
      db.setSetting('theme', 'dark');
      expect(db.getSetting('theme')).toBe('dark');
    });

    it('setSetting overwrites an existing value', () => {
      db.setSetting('port', '8080');
      db.setSetting('port', '9090');
      expect(db.getSetting('port')).toBe('9090');
    });

    it('setSetting handles multiple independent keys', () => {
      db.setSetting('key1', 'value1');
      db.setSetting('key2', 'value2');

      expect(db.getSetting('key1')).toBe('value1');
      expect(db.getSetting('key2')).toBe('value2');
    });

    it('setSetting stores complex string values', () => {
      const jsonValue = JSON.stringify({ nested: { data: [1, 2, 3] } });
      db.setSetting('config', jsonValue);
      expect(db.getSetting('config')).toBe(jsonValue);
    });
  });

  // -------------------------------------------------------------------------
  // Label Overrides
  // -------------------------------------------------------------------------
  describe('Label Overrides', () => {
    let deviceId: string;

    beforeEach(() => {
      const device = db.addDevice({ type: 'atem', name: 'ATEM', ip: '10.0.0.5' });
      deviceId = device.id;
    });

    it('setLabelOverrides stores overrides retrievable via getLabelOverrides', () => {
      db.setLabelOverrides(deviceId, 'output', [
        { index: 0, label: 'AUX 1' },
        { index: 1, label: 'AUX 2' },
        { index: 2, label: 'AUX 3' },
      ]);

      const overrides = db.getLabelOverrides(deviceId);
      expect(overrides).toHaveLength(3);
      expect(overrides).toEqual(
        expect.arrayContaining([
          { direction: 'output', io_index: 0, label: 'AUX 1' },
          { direction: 'output', io_index: 1, label: 'AUX 2' },
          { direction: 'output', io_index: 2, label: 'AUX 3' },
        ])
      );
    });

    it('getLabelOverrides returns empty for a device with no overrides', () => {
      expect(db.getLabelOverrides(deviceId)).toEqual([]);
    });

    it('setLabelOverrides replaces previous overrides for the same device+direction', () => {
      db.setLabelOverrides(deviceId, 'output', [
        { index: 0, label: 'Old Label 0' },
        { index: 1, label: 'Old Label 1' },
      ]);

      db.setLabelOverrides(deviceId, 'output', [
        { index: 0, label: 'New Label 0' },
        { index: 5, label: 'New Label 5' },
      ]);

      const overrides = db.getLabelOverrides(deviceId);
      // Only the new set for 'output' should exist
      const outputOverrides = overrides.filter(o => o.direction === 'output');
      expect(outputOverrides).toHaveLength(2);
      expect(outputOverrides).toEqual(
        expect.arrayContaining([
          { direction: 'output', io_index: 0, label: 'New Label 0' },
          { direction: 'output', io_index: 5, label: 'New Label 5' },
        ])
      );
    });

    it('setLabelOverrides does not affect a different direction', () => {
      db.setLabelOverrides(deviceId, 'input', [
        { index: 0, label: 'Input 0' },
      ]);
      db.setLabelOverrides(deviceId, 'output', [
        { index: 0, label: 'Output 0' },
      ]);

      const overrides = db.getLabelOverrides(deviceId);
      expect(overrides).toHaveLength(2);
      expect(overrides).toEqual(
        expect.arrayContaining([
          { direction: 'input', io_index: 0, label: 'Input 0' },
          { direction: 'output', io_index: 0, label: 'Output 0' },
        ])
      );

      // Now replace only input overrides
      db.setLabelOverrides(deviceId, 'input', [
        { index: 10, label: 'Input 10' },
      ]);

      const updated = db.getLabelOverrides(deviceId);
      expect(updated).toHaveLength(2);
      expect(updated).toEqual(
        expect.arrayContaining([
          { direction: 'input', io_index: 10, label: 'Input 10' },
          { direction: 'output', io_index: 0, label: 'Output 0' },
        ])
      );
    });

    it('setLabelOverrides with empty array clears overrides for that direction', () => {
      db.setLabelOverrides(deviceId, 'output', [
        { index: 0, label: 'AUX 1' },
      ]);
      db.setLabelOverrides(deviceId, 'output', []);

      const overrides = db.getLabelOverrides(deviceId);
      expect(overrides).toHaveLength(0);
    });

    it('label overrides cascade-delete when parent device is deleted', () => {
      db.setLabelOverrides(deviceId, 'input', [
        { index: 0, label: 'Camera 1' },
        { index: 1, label: 'Camera 2' },
      ]);
      db.setLabelOverrides(deviceId, 'output', [
        { index: 0, label: 'AUX 1' },
      ]);

      db.deleteDevice(deviceId);

      expect(db.getLabelOverrides(deviceId)).toEqual([]);
    });

    it('getLabelOverrides does not return overrides from another device', () => {
      const otherDevice = db.addDevice({ type: 'videohub', name: 'Other', ip: '10.0.0.99' });

      db.setLabelOverrides(deviceId, 'output', [
        { index: 0, label: 'ATEM AUX 1' },
      ]);
      db.setLabelOverrides(otherDevice.id, 'output', [
        { index: 0, label: 'Hub Out 1' },
      ]);

      const atemOverrides = db.getLabelOverrides(deviceId);
      expect(atemOverrides).toHaveLength(1);
      expect(atemOverrides[0].label).toBe('ATEM AUX 1');

      const hubOverrides = db.getLabelOverrides(otherDevice.id);
      expect(hubOverrides).toHaveLength(1);
      expect(hubOverrides[0].label).toBe('Hub Out 1');
    });
  });

  // -------------------------------------------------------------------------
  // close
  // -------------------------------------------------------------------------
  describe('close', () => {
    it('close does not throw', () => {
      // The afterEach already calls close, but verify explicit double-close does not throw
      // (better-sqlite3 throws on operations after close, but close itself is idempotent-ish)
      const tempDb = new AppDatabase(':memory:');
      expect(() => tempDb.close()).not.toThrow();
    });
  });
});
