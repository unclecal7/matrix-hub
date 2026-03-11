import osc from 'osc';
import { StateManager } from '../state/StateManager';
import { AppDatabase } from '../db/database';

export class CompanionBridge {
  private stateManager: StateManager;
  private db: AppDatabase;
  private udpPort: any | null = null;
  private ready = false;
  private enabled = false;
  private targetIp = '127.0.0.1';
  private targetPort = 12321;

  constructor(stateManager: StateManager, db: AppDatabase) {
    this.stateManager = stateManager;
    this.db = db;
    this.loadConfig();
    this.bindEvents();

    if (this.enabled) {
      this.start();
    }
  }

  private loadConfig() {
    this.targetIp = this.db.getSetting('companion.ip') || '127.0.0.1';
    this.targetPort = parseInt(this.db.getSetting('companion.oscPort') || '12321', 10);
    this.enabled = this.db.getSetting('companion.enabled') === 'true';
  }

  private start() {
    if (this.udpPort) return;

    this.ready = false;
    this.udpPort = new osc.UDPPort({
      localAddress: '0.0.0.0',
      localPort: 0,
      remoteAddress: this.targetIp,
      remotePort: this.targetPort,
    });

    this.udpPort.on('ready', () => {
      this.ready = true;
      console.log(`[CompanionBridge] Ready — sending OSC to ${this.targetIp}:${this.targetPort}`);
    });

    this.udpPort.on('error', (err: Error) => {
      console.error('[CompanionBridge] OSC error:', err.message);
    });

    this.udpPort.open();
  }

  private stop() {
    if (this.udpPort) {
      try {
        this.udpPort.close();
      } catch {}
      this.udpPort = null;
      this.ready = false;
      console.log('[CompanionBridge] Stopped');
    }
  }

  private bindEvents() {
    this.stateManager.on('ROUTING_CHANGED', (payload: { deviceId: string; destination: number; source: number }) => {
      this.sendOsc(`/matrix/route/${payload.deviceId}/${payload.destination}`, [{ type: 'i', value: payload.source }]);
    });

    this.stateManager.on('DEVICE_STATUS_CHANGED', (payload: { deviceId: string; status: string }) => {
      this.sendOsc(`/matrix/device/${payload.deviceId}/status`, [{ type: 's', value: payload.status }]);
    });

    this.stateManager.on('FULL_STATE_UPDATE', (payload: { deviceId: string }) => {
      this.sendOsc(`/matrix/device/${payload.deviceId}/ready`, [{ type: 'i', value: 1 }]);
    });
  }

  private sendOsc(address: string, args: Array<{ type: string; value: string | number }>) {
    if (!this.enabled || !this.ready || !this.udpPort) return;
    try {
      this.udpPort.send({ address, args });
    } catch (err: any) {
      console.error('[CompanionBridge] Send error:', err.message);
    }
  }

  public notifyPresetExecuted(presetId: string, deviceId: string) {
    this.sendOsc('/matrix/preset/executed', [
      { type: 's', value: presetId },
      { type: 's', value: deviceId },
    ]);
  }

  public updateConfig(ip: string, port: number, enabled: boolean) {
    this.db.setSetting('companion.ip', ip);
    this.db.setSetting('companion.oscPort', String(port));
    this.db.setSetting('companion.enabled', String(enabled));

    this.stop();
    this.targetIp = ip;
    this.targetPort = port;
    this.enabled = enabled;

    if (enabled) {
      this.start();
    }
  }

  public getConfig() {
    return {
      ip: this.targetIp,
      oscPort: this.targetPort,
      enabled: this.enabled,
    };
  }

  public close(): void {
    this.stop();
  }

  public async sendTest(): Promise<boolean> {
    if (this.ready && this.udpPort) {
      try {
        this.udpPort.send({
          address: '/matrix/test',
          args: [{ type: 's', value: 'hello from Matrix Hub' }],
        });
        return true;
      } catch {
        return false;
      }
    }

    // Temporarily open a port for the test
    return new Promise((resolve) => {
      const tempPort = new osc.UDPPort({
        localAddress: '0.0.0.0',
        localPort: 0,
        remoteAddress: this.targetIp,
        remotePort: this.targetPort,
      });

      tempPort.on('error', () => {
        resolve(false);
      });

      tempPort.on('ready', () => {
        try {
          tempPort.send({
            address: '/matrix/test',
            args: [{ type: 's', value: 'hello from Matrix Hub' }],
          });
          setTimeout(() => {
            try {
              tempPort.close();
            } catch {}
          }, 200);
          resolve(true);
        } catch {
          resolve(false);
        }
      });

      tempPort.open();

      // Timeout if ready never fires
      setTimeout(() => {
        try {
          tempPort.close();
        } catch {}
        resolve(false);
      }, 3000);
    });
  }
}
