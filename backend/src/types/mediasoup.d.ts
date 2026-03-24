declare module 'mediasoup/node/lib/types' {
  export interface IceParameters {
    [key: string]: unknown;
  }

  export interface IceCandidate {
    [key: string]: unknown;
  }

  export interface DtlsParameters {
    [key: string]: unknown;
  }

  export interface RtpParameters {
    [key: string]: unknown;
  }

  export interface Producer {
    id: string;
    kind: 'audio' | 'video';
    close(): Promise<void> | void;
    on(event: 'transportclose', listener: () => void): void;
  }

  export interface Consumer {
    id: string;
    kind: 'audio' | 'video';
    rtpParameters: RtpParameters;
    close(): Promise<void> | void;
    resume(): Promise<void>;
    pause(): Promise<void>;
    on(event: 'transportclose', listener: () => void): void;
  }

  export interface WebRtcTransport {
    id: string;
    iceParameters: IceParameters;
    iceCandidates: IceCandidate[];
    dtlsParameters: DtlsParameters;
    connect(options: { dtlsParameters: DtlsParameters }): Promise<void>;
    produce(options: {
      kind: 'audio' | 'video';
      rtpParameters: RtpParameters;
    }): Promise<Producer>;
    consume(options: {
      producerId: string;
      rtpCapabilities: RtpParameters;
      paused?: boolean;
    }): Promise<Consumer>;
    close(): Promise<void> | void;
    on(
      event: 'dtlsstatechange' | 'icestatechange',
      listener: (state: string) => void
    ): void;
  }

  export interface Router {
    rtpCapabilities: RtpParameters;
    createWebRtcTransport(options: Record<string, unknown>): Promise<WebRtcTransport>;
    canConsume(options: {
      producerId: string;
      rtpCapabilities: RtpParameters;
    }): boolean;
    close(): Promise<void> | void;
  }

  export interface Worker {
    createRouter(options: Record<string, unknown>): Promise<Router>;
    close(): Promise<void> | void;
    on(event: 'died', listener: () => void): void;
  }
}

declare module 'mediasoup' {
  import type { Worker } from 'mediasoup/node/lib/types';

  export function createWorker(options: Record<string, unknown>): Promise<Worker>;
}
