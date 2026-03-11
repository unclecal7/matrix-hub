import type { DropdownChoice } from '@companion-module/base'
import type { DeviceState, PresetRecord } from './types.js'

/**
 * Local state cache mirroring Matrix Hub devices.
 * Populated via WebSocket, used to build dropdown choices and evaluate feedbacks.
 */
export class StateCache {
	devices: Map<string, DeviceState> = new Map()
	presets: Map<string, PresetRecord[]> = new Map() // keyed by device_id

	// ── Mutators ──────────────────────────────────────────────

	setDevices(devices: DeviceState[]): void {
		this.devices.clear()
		for (const d of devices) this.devices.set(d.id, d)
	}

	setDevice(device: DeviceState): void {
		this.devices.set(device.id, device)
	}

	removeDevice(deviceId: string): void {
		this.devices.delete(deviceId)
		this.presets.delete(deviceId)
	}

	setDeviceStatus(deviceId: string, status: DeviceState['status']): void {
		const d = this.devices.get(deviceId)
		if (d) d.status = status
	}

	setRoute(deviceId: string, destination: number, source: number): void {
		const d = this.devices.get(deviceId)
		if (d) d.routing[destination] = source
	}

	setLabel(deviceId: string, direction: 'input' | 'output', index: number, label: string): void {
		const d = this.devices.get(deviceId)
		if (!d) return
		const collection = direction === 'input' ? d.inputs : d.outputs
		if (collection[index]) {
			collection[index].label = label
		} else {
			collection[index] = { label }
		}
	}

	setPresets(deviceId: string, presets: PresetRecord[]): void {
		this.presets.set(deviceId, presets)
	}

	// ── Dropdown choice builders ──────────────────────────────

	getDeviceChoices(): DropdownChoice[] {
		const choices: DropdownChoice[] = []
		for (const d of this.devices.values()) {
			choices.push({ id: d.id, label: `${d.name} (${d.type})` })
		}
		return choices
	}

	getInputChoices(deviceId: string): DropdownChoice[] {
		const d = this.devices.get(deviceId)
		if (!d) return []
		return Object.entries(d.inputs)
			.map(([idx, inp]) => ({
				id: Number(idx),
				label: `${idx}: ${inp.label}`,
			}))
			.sort((a, b) => (a.id as number) - (b.id as number))
	}

	getOutputChoices(deviceId: string): DropdownChoice[] {
		const d = this.devices.get(deviceId)
		if (!d) return []
		return Object.entries(d.outputs)
			.map(([idx, out]) => ({
				id: Number(idx),
				label: `${idx}: ${out.label}`,
			}))
			.sort((a, b) => (a.id as number) - (b.id as number))
	}

	getPresetChoices(): DropdownChoice[] {
		const choices: DropdownChoice[] = []
		for (const [deviceId, presets] of this.presets.entries()) {
			const device = this.devices.get(deviceId)
			const deviceName = device?.name ?? deviceId
			for (const s of presets) {
				choices.push({
					id: `${deviceId}:${s.id}`,
					label: `${deviceName}: ${s.name}`,
				})
			}
		}
		return choices
	}
}
