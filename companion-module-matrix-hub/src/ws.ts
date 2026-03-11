import WebSocket from 'ws'
import type { ModuleConfig } from './config.js'
import type { WSMessage } from './types.js'

export type WSMessageHandler = (msg: WSMessage) => void

/**
 * WebSocket client with auto-reconnect for Matrix Hub /ws endpoint.
 */
export class MatrixHubWS {
	private ws: WebSocket | null = null
	private config: ModuleConfig
	private onMessage: WSMessageHandler
	private onConnected: () => void
	private onDisconnected: () => void
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null
	private destroyed = false

	constructor(
		config: ModuleConfig,
		onMessage: WSMessageHandler,
		onConnected: () => void,
		onDisconnected: () => void,
	) {
		this.config = config
		this.onMessage = onMessage
		this.onConnected = onConnected
		this.onDisconnected = onDisconnected
	}

	connect(): void {
		this.destroyed = false
		this.clearReconnect()
		this.close()

		const url = `ws://${this.config.host}:${this.config.port}/ws`
		this.ws = new WebSocket(url)

		this.ws.on('open', () => {
			this.onConnected()
		})

		this.ws.on('message', (data) => {
			try {
				const msg = JSON.parse(data.toString()) as WSMessage
				this.onMessage(msg)
			} catch {
				// ignore non-JSON (e.g. ping frames)
			}
		})

		this.ws.on('close', () => {
			this.onDisconnected()
			this.scheduleReconnect()
		})

		this.ws.on('error', () => {
			// error will trigger close, which schedules reconnect
		})
	}

	updateConfig(config: ModuleConfig): void {
		this.config = config
		this.connect()
	}

	destroy(): void {
		this.destroyed = true
		this.clearReconnect()
		this.close()
	}

	private close(): void {
		if (this.ws) {
			this.ws.removeAllListeners()
			if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
				this.ws.close()
			}
			this.ws = null
		}
	}

	private scheduleReconnect(): void {
		if (this.destroyed) return
		this.clearReconnect()
		this.reconnectTimer = setTimeout(() => {
			this.connect()
		}, 5000)
	}

	private clearReconnect(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = null
		}
	}
}
