import type { CompanionActionDefinitions } from '@companion-module/base'
import type { ModuleInstance } from './main.js'
import { ActionId } from './types.js'

export function GetActions(self: ModuleInstance): CompanionActionDefinitions {
	return {
		[ActionId.Route]: {
			name: 'Route Source to Destination',
			options: [
				{
					id: 'device',
					type: 'dropdown',
					label: 'Device',
					choices: self.state.getDeviceChoices(),
					default: self.state.getDeviceChoices()[0]?.id ?? '',
				},
				{
					id: 'source',
					type: 'dropdown',
					label: 'Source',
					choices: self.state.getInputChoices(String(self.state.getDeviceChoices()[0]?.id ?? '')),
					default: 0,
				},
				{
					id: 'destination',
					type: 'dropdown',
					label: 'Destination',
					choices: self.state.getOutputChoices(String(self.state.getDeviceChoices()[0]?.id ?? '')),
					default: 0,
				},
			],
			callback: async (action) => {
				const deviceId = String(action.options.device)
				const source = Number(action.options.source)
				const destination = Number(action.options.destination)
				try {
					await self.api.route(deviceId, destination, source)
				} catch (e) {
					self.log('error', `Route failed: ${e}`)
				}
			},
		},

		[ActionId.RecallPreset]: {
			name: 'Recall Preset',
			options: [
				{
					id: 'preset',
					type: 'dropdown',
					label: 'Preset',
					choices: self.state.getPresetChoices(),
					default: self.state.getPresetChoices()[0]?.id ?? '',
				},
			],
			callback: async (action) => {
				const presetKey = String(action.options.preset)
				const [deviceId, presetId] = presetKey.split(':')
				if (!deviceId || !presetId) {
					self.log('error', `Invalid preset key: ${presetKey}`)
					return
				}
				try {
					await self.api.recallPreset(deviceId, presetId)
				} catch (e) {
					self.log('error', `Preset recall failed: ${e}`)
				}
			},
		},
	}
}
