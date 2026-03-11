import { combineRgb, type CompanionFeedbackDefinitions } from '@companion-module/base'
import type { ModuleInstance } from './main.js'
import { FeedbackId } from './types.js'

export function GetFeedbacks(self: ModuleInstance): CompanionFeedbackDefinitions {
	return {
		[FeedbackId.RouteActive]: {
			type: 'boolean',
			name: 'Route Active',
			description: 'True when a destination is routed to the specified source',
			defaultStyle: {
				bgcolor: combineRgb(0, 204, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					id: 'device',
					type: 'dropdown',
					label: 'Device',
					choices: self.state.getDeviceChoices(),
					default: self.state.getDeviceChoices()[0]?.id ?? '',
				},
				{
					id: 'destination',
					type: 'dropdown',
					label: 'Destination',
					choices: self.state.getOutputChoices(String(self.state.getDeviceChoices()[0]?.id ?? '')),
					default: 0,
				},
				{
					id: 'source',
					type: 'dropdown',
					label: 'Source',
					choices: self.state.getInputChoices(String(self.state.getDeviceChoices()[0]?.id ?? '')),
					default: 0,
				},
			],
			callback: (feedback) => {
				const deviceId = String(feedback.options.device)
				const destination = Number(feedback.options.destination)
				const source = Number(feedback.options.source)
				const device = self.state.devices.get(deviceId)
				if (!device) return false
				return device.routing[destination] === source
			},
		},

		[FeedbackId.DeviceConnected]: {
			type: 'boolean',
			name: 'Device Connected',
			description: 'True when a device is connected',
			defaultStyle: {
				bgcolor: combineRgb(0, 204, 0),
				color: combineRgb(0, 0, 0),
			},
			options: [
				{
					id: 'device',
					type: 'dropdown',
					label: 'Device',
					choices: self.state.getDeviceChoices(),
					default: self.state.getDeviceChoices()[0]?.id ?? '',
				},
			],
			callback: (feedback) => {
				const deviceId = String(feedback.options.device)
				const device = self.state.devices.get(deviceId)
				return device?.status === 'connected'
			},
		},
	}
}
