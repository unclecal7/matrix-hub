/** Mirrors the NormalizedDeviceState from Matrix Hub */
export interface DeviceState {
	id: string
	type: 'videohub' | 'atem'
	name: string
	ip: string
	status: 'connected' | 'connecting' | 'disconnected'
	inputs: Record<number, { label: string; group?: string }>
	outputs: Record<number, { label: string; group?: string; locked?: boolean }>
	routing: Record<number, number>
	locks: Record<number, 'U' | 'L' | 'O'>
}

export interface PresetRecord {
	id: string
	name: string
	device_id: string
	routing: Record<number, number>
	created_at: string
}

/** WebSocket messages from Matrix Hub */
export type WSMessage =
	| { type: 'FULL_STATE'; devices: DeviceState[] }
	| { type: 'FULL_STATE_UPDATE'; deviceId: string; state: DeviceState }
	| { type: 'DEVICE_STATUS_CHANGED'; deviceId: string; status: DeviceState['status'] }
	| { type: 'ROUTING_CHANGED'; deviceId: string; destination: number; source: number }
	| { type: 'LABELS_CHANGED'; deviceId: string; direction: 'input' | 'output'; index: number; label: string }
	| { type: 'DEVICE_ADDED'; device: DeviceState }
	| { type: 'DEVICE_REMOVED'; deviceId: string }

export enum ActionId {
	Route = 'route',
	RecallPreset = 'recall_preset',
}

export enum FeedbackId {
	RouteActive = 'route_active',
	DeviceConnected = 'device_connected',
}
