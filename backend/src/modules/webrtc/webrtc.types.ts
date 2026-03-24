// ============================================================================
// WebRTC Types
// Type definitions for WebRTC and MediaSoup
// ============================================================================

import type * as mediasoup from 'mediasoup/node/lib/types';

export interface WebRTCPeer {
  peerId: string;
  userId: number;
  studentName: string;
  transport?: mediasoup.WebRtcTransport;
  producer?: mediasoup.Producer;
  consumers: Map<string, mediasoup.Consumer>;
  isProducing: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected';
  videoEnabled: boolean;
  audioEnabled: boolean;
  joinedAt: number;
}

export interface WebRTCRoom {
  roomId: string;
  examId: number;
  router?: mediasoup.Router;
  peers: Map<string, WebRTCPeer>;
  createdAt: number;
}

export interface RTCSignalingMessage {
  type:
    | 'offer'
    | 'answer'
    | 'ice-candidate'
    | 'join-room'
    | 'leave-room'
    | 'get-consumers'
    | 'connect-transport'
    | 'produce'
    | 'consume'
    | 'resume-consumer'
    | 'pause-consumer';
  data?: any;
  error?: string;
}

export interface ProducerTransportParams {
  id: string;
  iceParameters: mediasoup.IceParameters;
  iceCandidates: mediasoup.IceCandidate[];
  dtlsParameters: mediasoup.DtlsParameters;
}

export interface ConsumerParams {
  id: string;
  producerId: string;
  kind: 'audio' | 'video';
  rtpParameters: mediasoup.RtpParameters;
}
