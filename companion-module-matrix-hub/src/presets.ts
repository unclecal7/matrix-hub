import { combineRgb, type CompanionPresetDefinitions } from '@companion-module/base'
import type { StateCache } from './state.js'
import { ActionId, FeedbackId } from './types.js'

/**
 * Build preset button definitions from current state.
 * Creates route buttons for the first 32 outputs per device, plus preset buttons.
 */
export function GetPresets(state: StateCache): CompanionPresetDefinitions {
	const presets: CompanionPresetDefinitions = {}

	for (const device of state.devices.values()) {
		// Route presets — first 32 outputs, each routed from source with same index
		const outputIndices = Object.keys(device.outputs)
			.map(Number)
			.sort((a, b) => a - b)
			.slice(0, 32)

		for (const outIdx of outputIndices) {
			const outLabel = device.outputs[outIdx]?.label ?? `Output ${outIdx}`
			// For each output, create a button that routes source[outIdx] → destination[outIdx]
			// User can change the source after dragging the preset
			const sourceIdx = outIdx < Object.keys(device.inputs).length ? outIdx : 0
			const srcLabel = device.inputs[sourceIdx]?.label ?? `Input ${sourceIdx}`

			presets[`${device.id}_route_${outIdx}`] = {
				type: 'button',
				category: `${device.name} — Routes`,
				name: `${outLabel} ← ${srcLabel}`,
				style: {
					text: `${outLabel}\\n← ${srcLabel}`,
					size: 'auto',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				steps: [
					{
						down: [
							{
								actionId: ActionId.Route,
								options: {
									device: device.id,
									source: sourceIdx,
									destination: outIdx,
								},
							},
						],
						up: [],
					},
				],
				feedbacks: [
					{
						feedbackId: FeedbackId.RouteActive,
						options: {
							device: device.id,
							source: sourceIdx,
							destination: outIdx,
						},
						style: {
							bgcolor: combineRgb(0, 204, 0),
							color: combineRgb(0, 0, 0),
						},
					},
				],
			}
		}

		// Preset buttons
		const devicePresets = state.presets.get(device.id)
		if (devicePresets) {
			for (const preset of devicePresets) {
				presets[`preset_${preset.id}`] = {
					type: 'button',
					category: `${device.name} — Presets`,
					name: preset.name,
					style: {
						text: `${preset.name}`,
						size: 'auto',
						color: combineRgb(255, 255, 255),
						bgcolor: combineRgb(0, 51, 153),
					},
					steps: [
						{
							down: [
								{
									actionId: ActionId.RecallPreset,
									options: {
										preset: `${device.id}:${preset.id}`,
									},
								},
							],
							up: [],
						},
					],
					feedbacks: [],
				}
			}
		}
	}

	return presets
}
