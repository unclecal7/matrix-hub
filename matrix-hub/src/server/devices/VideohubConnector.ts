import * as net from 'net';
import { EventEmitter } from 'events';

interface DeviceState {
  id: string;
  type: 'videohub';
  name: string;
  ip: string;
  status: 'connected' | 'connecting' | 'disconnected';
  inputs: Record<number, { label: string }>;
  outputs: Record<number, { label: string }>;
  routing: Record<number, number>;
  locks: Record<number, 'U' | 'L' | 'O'>;
}

export class VideohubConnector extends EventEmitter {
  private socket: net.Socket;
  private state: DeviceState;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private currentBackoff = 1000;
  private readonly maxBackoff = 30000;
  private buffer: string = '';
  private initialHydrated = false;
  private seenBlocks = new Set<string>();

  constructor(
    public readonly id: string,
    public readonly ip: string,
    private port: number = 9990,
  ) {
    super();
    this.socket = new net.Socket();
    this.state = {
      id,
      type: 'videohub',
      name: `Videohub ${ip}`,
      ip,
      status: 'disconnected',
      inputs: {},
      outputs: {},
      routing: {},
      locks: {},
    };

    this.setupSocket();
  }

  private setupSocket() {
    this.socket.on('connect', () => {
      this.state.status = 'connected';
      this.currentBackoff = 1000; // Reset backoff
      this.initialHydrated = false;
      this.seenBlocks.clear();
      this.emit('connected', this.state);
      this.startPing();
    });

    this.socket.on('data', (data) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    this.socket.on('close', () => {
      this.handleDisconnect();
    });

    this.socket.on('error', (err) => {
      console.error(`Videohub ${this.id} error:`, err.message);
      this.handleDisconnect();
    });
  }

  public connect() {
    if (this.state.status === 'connected' || this.state.status === 'connecting') return;
    this.state.status = 'connecting';
    this.socket.connect(this.port, this.ip);
  }

  public disconnect() {
    this.stopPing();
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.socket.destroy();
    this.state.status = 'disconnected';
  }

  private handleDisconnect() {
    this.stopPing();
    if (this.state.status !== 'disconnected') {
      this.state.status = 'disconnected';
      this.emit('disconnected', this.id);
    }

    // Exponential backoff reconnect
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
      this.currentBackoff = Math.min(this.currentBackoff * 2, this.maxBackoff);
    }, this.currentBackoff);
  }

  private startPing() {
    this.pingInterval = setInterval(() => {
      if (this.state.status === 'connected') {
        try {
          this.socket.write('PING:\n\n');
        } catch (err) {
          console.error(`[VideohubConnector] ${this.id} ping write error:`, err);
        }
      }
    }, 5000); // 5s ping
  }

  private stopPing() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = null;
  }

  private processBuffer() {
    // Protocol blocks are separated by double newlines \n\n
    let splitIndex = this.buffer.indexOf('\n\n');
    while (splitIndex !== -1) {
      const block = this.buffer.slice(0, splitIndex);
      this.buffer = this.buffer.slice(splitIndex + 2);
      this.parseBlock(block);
      splitIndex = this.buffer.indexOf('\n\n');
    }
  }

  private parseBlock(block: string) {
    const lines = block.split('\n');
    if (lines.length === 0) return;

    const header = lines[0].trim();
    const dataLines = lines.slice(1);
    this.seenBlocks.add(header);

    switch (header) {
      case 'VIDEOHUB DEVICE:':
        dataLines.forEach((line) => {
          const match = line.match(/^([^:]+): (.+)$/);
          if (match) {
            if (match[1] === 'Model name') this.state.name = match[2];
          }
        });
        break;

      case 'INPUT LABELS:':
        dataLines.forEach((line) => {
          const match = line.match(/^(\d+) (.+)$/);
          if (match) {
            const idx = parseInt(match[1]);
            this.state.inputs[idx] = { label: match[2] };
            this.emit('labelsChanged', { id: this.id, direction: 'input', index: idx, label: match[2] });
          }
        });
        break;

      case 'OUTPUT LABELS:':
        dataLines.forEach((line) => {
          const match = line.match(/^(\d+) (.+)$/);
          if (match) {
            const idx = parseInt(match[1]);
            this.state.outputs[idx] = { label: match[2] };
            this.emit('labelsChanged', { id: this.id, direction: 'output', index: idx, label: match[2] });
          }
        });
        break;

      case 'VIDEO OUTPUT ROUTING:':
        dataLines.forEach((line) => {
          const match = line.match(/^(\d+) (\d+)$/);
          if (match) {
            const dest = parseInt(match[1]);
            const src = parseInt(match[2]);
            this.state.routing[dest] = src;
            this.emit('routingChanged', { id: this.id, destination: dest, source: src });
          }
        });
        break;

      case 'VIDEO OUTPUT LOCKS:':
        dataLines.forEach((line) => {
          const match = line.match(/^(\d+) ([ULO])$/);
          if (match) {
            const dest = parseInt(match[1]);
            const lock = match[2] as 'U' | 'L' | 'O';
            this.state.locks[dest] = lock;
            this.emit('locksChanged', { id: this.id, destination: dest, lock });
          }
        });
        break;

      case 'ACK':
      case 'NAK':
        // Handle command acknowledgment
        break;
    }

    // Emit stateHydrated once we've received the essential initial blocks
    if (
      !this.initialHydrated &&
      this.seenBlocks.has('INPUT LABELS:') &&
      this.seenBlocks.has('OUTPUT LABELS:') &&
      this.seenBlocks.has('VIDEO OUTPUT ROUTING:')
    ) {
      this.initialHydrated = true;
      this.emit('stateHydrated', this.state);
    }
  }

  public route(destination: number, source: number) {
    if (this.state.status !== 'connected') return;
    try {
      this.socket.write(`VIDEO OUTPUT ROUTING:\n${destination} ${source}\n\n`);
    } catch (err) {
      console.error(`[VideohubConnector] ${this.id} route write error:`, err);
    }
  }

  public setLock(destination: number, state: 'U' | 'L' | 'O' | 'F') {
    if (this.state.status !== 'connected') return;
    try {
      this.socket.write(`VIDEO OUTPUT LOCKS:\n${destination} ${state}\n\n`);
    } catch (err) {
      console.error(`[VideohubConnector] ${this.id} setLock write error:`, err);
    }
  }

  public getState() {
    return this.state;
  }
}
