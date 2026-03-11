import type { CompanionVariableDefinition, CompanionVariableValues } from '@companion-module/base'
import type { StateCache } from './state.js'

/**
 * Build variable definitions from current state.
 * Creates per-device variables for name, status, counts, and per-output labels/sources.
 */
export function GetVariableDefinitions(state: StateCache): CompanionVariableDefinition[] {
	const defs: CompanionVariableDefinition[] = []

	for (const device of state.devices.values()) {
		const prefix = sanitizeName(device.name)

		defs.push(
			{ variableId: `${prefix}_name`, name: `${device.name} — Name` },
			{ variableId: `${prefix}_status`, name: `${device.name} — Status` },
			{ variableId: `${prefix}_input_count`, name: `${device.name} — Input Count` },
			{ variableId: `${prefix}_output_count`, name: `${device.name} — Output Count` },
		)

		for (const [idx] of Object.entries(device.outputs)) {
			defs.push(
				{ variableId: `${prefix}_out_${idx}_label`, name: `${device.name} — Output ${idx} Label` },
				{ variableId: `${prefix}_out_${idx}_source`, name: `${device.name} — Output ${idx} Source Index` },
				{ variableId: `${prefix}_out_${idx}_source_label`, name: `${device.name} — Output ${idx} Source Label` },
			)
		}
	}

	return defs
}

/**
 * Build current variable values from state.
 */
export function GetVariableValues(state: StateCache): CompanionVariableValues {
	const values: CompanionVariableValues = {}

	for (const device of state.devices.values()) {
		const prefix = sanitizeName(device.name)

		values[`${prefix}_name`] = device.name
		values[`${prefix}_status`] = device.status
		values[`${prefix}_input_count`] = Object.keys(device.inputs).length
		values[`${prefix}_output_count`] = Object.keys(device.outputs).length

		for (const [idx, out] of Object.entries(device.outputs)) {
			const sourceIdx = device.routing[Number(idx)]
			const sourceLabel = sourceIdx !== undefined ? device.inputs[sourceIdx]?.label ?? `Input ${sourceIdx}` : 'None'

			values[`${prefix}_out_${idx}_label`] = out.label
			values[`${prefix}_out_${idx}_source`] = sourceIdx ?? -1
			values[`${prefix}_out_${idx}_source_label`] = sourceLabel
		}
	}

	return values
}

/** Convert device name to a clean variable prefix: "Smart Videohub 12x12" → "smart_videohub_12x12" */
function sanitizeName(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}
