export interface NormalizedDeviceState {
  id: string;
  type: 'videohub' | 'atem';
  name: string;
  ip: string;
  status: 'connected' | 'connecting' | 'disconnected';
  inputs: Record<number, { label: string; group?: string }>;
  outputs: Record<number, { label: string; group?: string; locked?: boolean }>;
  routing: Record<number, number>;
  locks: Record<number, 'U' | 'L' | 'O'>;
}

export interface DeviceRecord {
  id: string;
  type: 'videohub' | 'atem';
  name: string;
  ip: string;
}

export interface PresetRecord {
  id: string;
  name: string;
  device_id: string;
  routing: Record<number, number>;
  created_at: string;
}

export interface GroupRecord {
  id: string;
  name: string;
  device_id: string;
  direction: 'input' | 'output';
  color: string;
  sort_order: number;
}

export interface GroupWithAssignments extends GroupRecord {
  assignments: number[];
}

export interface DeviceState {
  id: string;
  type: 'videohub' | 'atem';
  name: string;
  ip: string;
  status: 'connected' | 'connecting' | 'disconnected';
  inputs: Record<number, { label: string; group?: string; color?: string }>;
  outputs: Record<number, { label: string; group?: string; color?: string; locked?: boolean }>;
  routing: Record<number, number>;
  locks: Record<number, 'U' | 'L' | 'O'>;
}
