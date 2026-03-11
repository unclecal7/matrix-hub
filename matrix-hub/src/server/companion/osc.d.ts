declare module 'osc' {
  interface UDPPortOptions {
    localAddress?: string;
    localPort?: number;
    remoteAddress?: string;
    remotePort?: number;
  }

  interface OscMessage {
    address: string;
    args?: Array<{ type: string; value: string | number }>;
  }

  class UDPPort {
    constructor(options: UDPPortOptions);
    open(): void;
    close(): void;
    send(msg: OscMessage): void;
    on(event: string, callback: (...args: any[]) => void): void;
  }

  const _default: { UDPPort: typeof UDPPort };
  export default _default;
}
