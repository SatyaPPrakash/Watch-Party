declare module "@thaunknown/simple-peer" {
  export interface SimplePeerOptions {
    initiator?: boolean;
    stream?: MediaStream;
    trickle?: boolean;
    config?: RTCConfiguration;
  }

  export type SignalData = Record<string, unknown>;

  export interface Instance {
    signal(data: SignalData): void;
    destroy(): void;
    on(event: "signal", cb: (data: SignalData) => void): void;
    on(event: "stream", cb: (stream: MediaStream) => void): void;
    on(event: "error", cb: (err: Error) => void): void;
    on(event: "close", cb: () => void): void;
    on(event: "connect", cb: () => void): void;
    off(event: string, cb: (...args: unknown[]) => void): void;
  }

  export interface SimplePeerConstructor {
    new (opts?: SimplePeerOptions): Instance;
  }

  const SimplePeer: SimplePeerConstructor;
  export default SimplePeer;
}