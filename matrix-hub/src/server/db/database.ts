import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';
import type { DeviceRecord, PresetRecord, GroupRecord, GroupWithAssignments } from '../../shared/types';

export type { DeviceRecord, PresetRecord, GroupRecord, GroupWithAssignments };

export class AppDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath || path.join(process.cwd(), 'data', 'matrix-hub.db');
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    this.db = new Database(resolvedPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.migrate();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('videohub', 'atem')),
        name TEXT NOT NULL,
        ip TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS salvos (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        routing TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        direction TEXT NOT NULL CHECK (direction IN ('input', 'output')),
        color TEXT NOT NULL DEFAULT '#888888',
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS group_assignments (
        group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        io_index INTEGER NOT NULL,
        PRIMARY KEY (group_id, io_index)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS label_overrides (
        device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        direction TEXT NOT NULL CHECK (direction IN ('input', 'output')),
        io_index INTEGER NOT NULL,
        label TEXT NOT NULL,
        PRIMARY KEY (device_id, direction, io_index)
      );
    `);
  }

  // --- Devices ---

  listDevices(): DeviceRecord[] {
    return this.db.prepare('SELECT * FROM devices').all() as DeviceRecord[];
  }

  getDevice(id: string): DeviceRecord | undefined {
    return this.db.prepare('SELECT * FROM devices WHERE id = ?').get(id) as DeviceRecord | undefined;
  }

  addDevice(device: Omit<DeviceRecord, 'id'>): DeviceRecord {
    const id = randomUUID();
    this.db
      .prepare('INSERT INTO devices (id, type, name, ip) VALUES (?, ?, ?, ?)')
      .run(id, device.type, device.name, device.ip);
    return { id, ...device };
  }

  updateDevice(id: string, updates: Partial<Pick<DeviceRecord, 'name' | 'ip'>>): boolean {
    const fields: string[] = [];
    const values: any[] = [];
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.ip !== undefined) {
      fields.push('ip = ?');
      values.push(updates.ip);
    }
    if (fields.length === 0) return false;
    values.push(id);
    const result = this.db.prepare(`UPDATE devices SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return result.changes > 0;
  }

  deleteDevice(id: string): boolean {
    const result = this.db.prepare('DELETE FROM devices WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // --- Presets ---

  listPresets(deviceId: string): PresetRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM salvos WHERE device_id = ? ORDER BY created_at DESC')
      .all(deviceId) as any[];
    return rows.map((r) => ({ ...r, routing: JSON.parse(r.routing) }));
  }

  addPreset(deviceId: string, name: string, routing: Record<number, number>): PresetRecord {
    const id = randomUUID();
    this.db
      .prepare('INSERT INTO salvos (id, name, device_id, routing) VALUES (?, ?, ?, ?)')
      .run(id, name, deviceId, JSON.stringify(routing));
    return { id, name, device_id: deviceId, routing, created_at: new Date().toISOString() };
  }

  deletePreset(id: string): boolean {
    const result = this.db.prepare('DELETE FROM salvos WHERE id = ?').run(id);
    return result.changes > 0;
  }

  getPreset(id: string): PresetRecord | undefined {
    const row = this.db.prepare('SELECT * FROM salvos WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return { ...row, routing: JSON.parse(row.routing) };
  }

  // --- Groups ---

  listGroups(deviceId: string): GroupWithAssignments[] {
    const groups = this.db
      .prepare('SELECT * FROM groups WHERE device_id = ? ORDER BY sort_order, name')
      .all(deviceId) as GroupRecord[];
    const assignStmt = this.db.prepare('SELECT io_index FROM group_assignments WHERE group_id = ? ORDER BY io_index');
    return groups.map((g) => ({
      ...g,
      assignments: (assignStmt.all(g.id) as { io_index: number }[]).map((a) => a.io_index),
    }));
  }

  addGroup(deviceId: string, name: string, direction: 'input' | 'output', color: string): GroupWithAssignments {
    const id = randomUUID();
    const maxOrder = this.db
      .prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM groups WHERE device_id = ?')
      .get(deviceId) as { m: number };
    this.db
      .prepare('INSERT INTO groups (id, name, device_id, direction, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, name, deviceId, direction, color, maxOrder.m + 1);
    return { id, name, device_id: deviceId, direction, color, sort_order: maxOrder.m + 1, assignments: [] };
  }

  updateGroup(id: string, updates: Partial<Pick<GroupRecord, 'name' | 'color'>>): boolean {
    const fields: string[] = [];
    const values: any[] = [];
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (fields.length === 0) return false;
    values.push(id);
    const result = this.db.prepare(`UPDATE groups SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return result.changes > 0;
  }

  deleteGroup(id: string): boolean {
    const result = this.db.prepare('DELETE FROM groups WHERE id = ?').run(id);
    return result.changes > 0;
  }

  setGroupAssignments(groupId: string, indices: number[]) {
    const del = this.db.prepare('DELETE FROM group_assignments WHERE group_id = ?');
    const ins = this.db.prepare('INSERT INTO group_assignments (group_id, io_index) VALUES (?, ?)');
    this.db.transaction(() => {
      del.run(groupId);
      for (const idx of indices) {
        ins.run(groupId, idx);
      }
    })();
  }

  // --- Settings ---

  getSetting(key: string): string | undefined {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value;
  }

  setSetting(key: string, value: string): void {
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  }

  // --- Label Overrides ---

  setLabelOverrides(deviceId: string, direction: 'input' | 'output', overrides: { index: number; label: string }[]) {
    const del = this.db.prepare('DELETE FROM label_overrides WHERE device_id = ? AND direction = ?');
    const ins = this.db.prepare(
      'INSERT INTO label_overrides (device_id, direction, io_index, label) VALUES (?, ?, ?, ?)',
    );
    this.db.transaction(() => {
      del.run(deviceId, direction);
      for (const o of overrides) {
        ins.run(deviceId, direction, o.index, o.label);
      }
    })();
  }

  getLabelOverrides(deviceId: string): { direction: string; io_index: number; label: string }[] {
    return this.db
      .prepare('SELECT direction, io_index, label FROM label_overrides WHERE device_id = ?')
      .all(deviceId) as any[];
  }

  close() {
    this.db.close();
  }
}
