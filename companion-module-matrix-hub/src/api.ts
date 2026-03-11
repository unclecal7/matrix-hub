import type { ModuleConfig } from './config.js'

/**
 * Simple HTTP client for Matrix Hub REST API.
 */
export class ApiClient {
	private baseUrl: string

	constructor(config: ModuleConfig) {
		this.baseUrl = `http://${config.host}:${config.port}`
	}

	updateConfig(config: ModuleConfig): void {
		this.baseUrl = `http://${config.host}:${config.port}`
	}

	async route(deviceId: string, destination: number, source: number): Promise<void> {
		const res = await fetch(`${this.baseUrl}/api/devices/${deviceId}/route`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ destination, source }),
		})
		if (!res.ok) {
			const text = await res.text()
			throw new Error(`Route failed (${res.status}): ${text}`)
		}
	}

	async recallPreset(deviceId: string, presetId: string): Promise<void> {
		const res = await fetch(`${this.baseUrl}/api/devices/${deviceId}/presets/${presetId}/recall`, {
			method: 'POST',
		})
		if (!res.ok) {
			const text = await res.text()
			throw new Error(`Preset recall failed (${res.status}): ${text}`)
		}
	}

	async listPresets(deviceId: string): Promise<unknown[]> {
		const res = await fetch(`${this.baseUrl}/api/devices/${deviceId}/presets`)
		if (!res.ok) return []
		return (await res.json()) as unknown[]
	}
}
