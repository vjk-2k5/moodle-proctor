// ============================================================================
// WebRTC Types
// Type definitions for WebRTC and MediaSoup
// ============================================================================

import type {
  Consumer,
  DtlsParameters,
  IceCandidate,
  IceParameters,
  Producer,
  Router,
  RtpParameters,
  WebRtcTransport,
} from 'mediasoup/node/lib/types';

export interface WebRTCPeer {
  peerId: string;
  userId: number;
  studentName: string;
  transport?: WebRtcTransport;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
  isProducing: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected';
  videoEnabled: boolean;
  audioEnabled: boolean;
  joinedAt: number;
}

export interface WebRTCRoom {
  roomId: string;
  examId: number;
  router?: Router;
  peers: Map<string, WebRTCPeer>;
  createdAt: number;
}

export interface ProducerTransportParams {
  id: string;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: DtlsParameters;
}

export interface ConsumerParams {
  id: string;
  producerId: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters;
}
