import { EventEmitter } from 'events';
import Bonjour from 'bonjour-service';

export interface DiscoveredDevice {
  name: string;
  type: 'videohub' | 'atem';
  ip: string;
  port: number;
  txt: Record<string, string>;
}

export class DeviceDiscovery extends EventEmitter {
  private bonjour: InstanceType<typeof Bonjour>;
  private devices: Map<string, DiscoveredDevice> = new Map();
  private browsers: any[] = [];

  constructor() {
    super();
    this.bonjour = new Bonjour();
  }

  start() {
    // Videohub advertises as _blackmagic._tcp
    const vhBrowser = this.bonjour.find({ type: 'blackmagic' }, (service: any) => {
      const ip = service.addresses?.find((a: string) => a.includes('.'));
      if (!ip) return;

      const device: DiscoveredDevice = {
        name: service.name || 'Videohub',
        type: 'videohub',
        ip,
        port: service.port || 9990,
        txt: service.txt || {},
      };

      const key = `videohub-${ip}`;
      if (!this.devices.has(key)) {
        this.devices.set(key, device);
        this.emit('discovered', device);
      }
    });
    this.browsers.push(vhBrowser);

    // ATEM advertises as _blackmagic._tcp too (different txt records)
    // We detect ATEMs by looking at txt records or name patterns
  }

  getDiscovered(): DiscoveredDevice[] {
    return Array.from(this.devices.values());
  }

  stop() {
    this.browsers.forEach((b) => b.stop());
    this.browsers = [];
    this.bonjour.destroy();
  }
}
