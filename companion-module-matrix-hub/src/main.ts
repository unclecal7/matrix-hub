import { InstanceBase, InstanceStatus, runEntrypoint, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { StateCache } from './state.js'
import { ApiClient } from './api.js'
import { MatrixHubWS } from './ws.js'
import { GetActions } from './actions.js'
import { GetFeedbacks } from './feedbacks.js'
import { GetPresets } from './presets.js'
import { GetVariableDefinitions, GetVariableValues } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { FeedbackId, type PresetRecord, type WSMessage } from './types.js'

export class ModuleInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig
	state: StateCache = new StateCache()
	api!: ApiClient
	private ws!: MatrixHubWS

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config
		this.api = new ApiClient(config)

		this.updateStatus(InstanceStatus.Connecting)

		this.ws = new MatrixHubWS(
			config,
			(msg) => this.handleWSMessage(msg),
			() => {
				this.log('info', 'Connected to Matrix Hub')
				this.updateStatus(InstanceStatus.Ok)
				this.fetchPresets()
			},
			() => {
				this.log('warn', 'Disconnected from Matrix Hub')
				this.updateStatus(InstanceStatus.ConnectionFailure)
			},
		)

		this.ws.connect()
	}

	async destroy(): Promise<void> {
		this.ws?.destroy()
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		this.api.updateConfig(config)
		this.ws.updateConfig(config)
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	// ── WebSocket message handler ─────────────────────────────

	private handleWSMessage(msg: WSMessage): void {
		switch (msg.type) {
			case 'FULL_STATE':
				this.state.setDevices(msg.devices)
				this.refreshAll()
				this.fetchPresets()
				break

			case 'FULL_STATE_UPDATE':
				this.state.setDevice(msg.state)
				this.refreshAll()
				break

			case 'DEVICE_STATUS_CHANGED':
				this.state.setDeviceStatus(msg.deviceId, msg.status)
				this.checkFeedbacks(FeedbackId.DeviceConnected)
				this.updateVariables()
				break

			case 'ROUTING_CHANGED':
				this.state.setRoute(msg.deviceId, msg.destination, msg.source)
				this.checkFeedbacks(FeedbackId.RouteActive)
				this.updateVariables()
				break

			case 'LABELS_CHANGED':
				this.state.setLabel(msg.deviceId, msg.direction, msg.index, msg.label)
				this.refreshAll()
				break

			case 'DEVICE_ADDED':
				this.state.setDevice(msg.device)
				this.refreshAll()
				this.fetchPresetsForDevice(msg.device.id)
				break

			case 'DEVICE_REMOVED':
				this.state.removeDevice(msg.deviceId)
				this.refreshAll()
				break
		}
	}

	// ── Refresh helpers ───────────────────────────────────────

	private refreshAll(): void {
		this.setActionDefinitions(GetActions(this))
		this.setFeedbackDefinitions(GetFeedbacks(this))
		this.setPresetDefinitions(GetPresets(this.state))
		this.setVariableDefinitions(GetVariableDefinitions(this.state))
		this.setVariableValues(GetVariableValues(this.state))
	}

	private updateVariables(): void {
		this.setVariableValues(GetVariableValues(this.state))
	}

	// ── Preset fetching ──────────────────────────────────────

	private async fetchPresets(): Promise<void> {
		for (const device of this.state.devices.values()) {
			await this.fetchPresetsForDevice(device.id)
		}
		// Re-export actions/presets now that presets are loaded
		this.setActionDefinitions(GetActions(this))
		this.setPresetDefinitions(GetPresets(this.state))
	}

	private async fetchPresetsForDevice(deviceId: string): Promise<void> {
		try {
			const presets = (await this.api.listPresets(deviceId)) as PresetRecord[]
			this.state.setPresets(deviceId, presets)
		} catch (e) {
			this.log('warn', `Failed to fetch presets for ${deviceId}: ${e}`)
		}
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
