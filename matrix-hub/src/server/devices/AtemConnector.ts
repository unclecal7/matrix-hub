import { Atem } from 'atem-connection';
import { EventEmitter } from 'events';

// atem-connection InternalPortType enum values
const InternalPortType = {
  External: 0,
  Black: 1,
  ColorBars: 2,
  ColorGenerator: 3,
  MediaPlayerFill: 4,
  MediaPlayerKey: 5,
  SuperSource: 6,
  ExternalDirect: 7,
  MEOutput: 128,
  Auxiliary: 129,
  Mask: 130,
  MultiViewer: 131,
  AudioMonitor: 132,
} as const;

// SourceAvailability bitmask
const SourceAvailability = { Auxiliary: 1 } as const;

function atemSourceGroup(internalPortType: number): string {
  switch (internalPortType) {
    case InternalPortType.External:
    case InternalPortType.ExternalDirect:
      return 'Physical Inputs';
    case InternalPortType.Black:
    case InternalPortType.ColorBars:
    case InternalPortType.ColorGenerator:
      return 'Utility';
    case InternalPortType.MediaPlayerFill:
    case InternalPortType.MediaPlayerKey:
      return 'Media Players';
    case InternalPortType.SuperSource:
      return 'SuperSource';
    case InternalPortType.MEOutput:
      return 'ME Outputs';
    default:
      return 'Other';
  }
}

export class AtemConnector extends EventEmitter {
  private atem: Atem;
  public readonly id: string;
  private currentBackoff = 1000;
  private readonly maxBackoff = 30000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connecting = false;

  constructor(
    id: string,
    public readonly ip: string,
  ) {
    super();
    this.id = id;
    this.atem = new Atem();

    this.setupAtem();
  }

  private emitFullState() {
    const state = this.atem.state;
    if (!state) return;

    const inputs: Record<number, { label: string; group?: string }> = {};
    for (const [idStr, input] of Object.entries(state.inputs ?? {})) {
      if (!input) continue;
      // Only include sources that can be routed to AUX buses
      if (!(input.sourceAvailability & SourceAvailability.Auxiliary)) continue;
      const id = parseInt(idStr);
      inputs[id] = { label: input.longName || `Source ${id}`, group: atemSourceGroup(input.internalPortType) };
    }

    const outputs: Record<number, { label: string }> = {};
    const routing: Record<number, number> = {};
    const auxes = state.video?.auxilliaries ?? [];
    auxes.forEach((sourceId: number | undefined, idx: number) => {
      outputs[idx] = { label: `AUX ${idx + 1}` };
      routing[idx] = sourceId ?? 0;
    });

    this.emit('stateHydrated', { id: this.id, inputs, outputs, routing });
  }

  private setupAtem() {
    this.atem.on('connected', () => {
      this.connecting = false;
      this.currentBackoff = 1000;
      this.emit('connected', this.id);

      const model = this.atem.state?.info.model;
      if (model) {
        this.emit('modelInfo', { id: this.id, model });
      }

      this.emitFullState();
    });

    this.atem.on('disconnected', () => {
      this.connecting = false;
      this.emit('disconnected', this.id);
      this.handleReconnect();
    });

    this.atem.on('error', (err) => {
      console.error(`[AtemConnector] ${this.id} error:`, err);
    });

    this.atem.on('stateChanged', (state, paths) => {
      paths.forEach((path) => {
        // Handle Aux routing changes
        if (path.startsWith('video.auxilliaries')) {
          const match = path.match(/video\.auxilliaries\.(\d+)/);
          if (match) {
            const auxIndex = parseInt(match[1]);
            const sourceId = state.video.auxilliaries[auxIndex];
            if (sourceId !== undefined) {
              this.emit('routingChanged', {
                id: this.id,
                routeType: 'aux',
                destination: auxIndex,
                source: sourceId,
              });
            }
          }
        }

        // Handle Program routing changes
        if (path.match(/video\.mixEffects\.\d+\.programInput/)) {
          const match = path.match(/video\.mixEffects\.(\d+)\.programInput/);
          if (match) {
            const meIndex = parseInt(match[1]);
            const sourceId = state.video.mixEffects[meIndex]?.programInput;
            if (sourceId !== undefined) {
              this.emit('routingChanged', {
                id: this.id,
                routeType: 'pgm',
                destination: meIndex,
                source: sourceId,
              });
            }
          }
        }

        // Handle Input Label changes
        if (path.match(/inputs\.\d+/)) {
          const match = path.match(/inputs\.(\d+)/);
          if (match) {
            const inputId = parseInt(match[1]);
            const inputConfig = state.inputs[inputId];
            if (inputConfig) {
              this.emit('labelsChanged', {
                id: this.id,
                index: inputId,
                longName: inputConfig.longName,
                shortName: inputConfig.shortName,
              });
            }
          }
        }
      });
    });
  }

  public async connect() {
    if (this.connecting || this.atem.status === 2) return; // 2 = connected in atem-connection
    this.connecting = true;
    try {
      await this.atem.connect(this.ip);
    } catch (err) {
      this.connecting = false;
      console.error(`[AtemConnector] ${this.id} connect failed:`, err);
      this.handleReconnect();
    }
  }

  public async disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    try {
      await this.atem.disconnect();
    } catch (err) {
      console.error(`[AtemConnector] ${this.id} disconnect error:`, err);
    }
  }

  private handleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
      this.currentBackoff = Math.min(this.currentBackoff * 2, this.maxBackoff);
    }, this.currentBackoff);
  }

  public async changeAuxInput(auxIndex: number, sourceId: number) {
    if (this.atem.status !== 2) return;
    try {
      await this.atem.setAuxSource(sourceId, auxIndex);
    } catch (err) {
      console.error(`[AtemConnector] ${this.id} failed to change aux ${auxIndex}:`, err);
    }
  }

  public async changeProgramInput(meIndex: number, sourceId: number) {
    if (this.atem.status !== 2) return;
    try {
      await this.atem.changeProgramInput(sourceId, meIndex);
    } catch (err) {
      console.error(`[AtemConnector] ${this.id} failed to change PGM ${meIndex}:`, err);
    }
  }

  public getState() {
    return this.atem.state;
  }
}
