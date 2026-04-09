// ============================================================================
// MediaSoup Configuration
// Configures MediaSoup router for WebRTC streaming
// ============================================================================

export const mediasoupConfig = {
  // Worker settings
  worker: {
    rtcMinPort: 10000,
    rtcMaxPort: 20000,
    logLevel: 'warn' as const,
    logTags: ['rtp', 'rtcp', 'rrtx'],
    dtlsCertificateFile: process.env.MEDIASOUP_DTLS_CERT_FILE || '',
    dtlsPrivateKeyFile: process.env.MEDIASOUP_DTLS_KEY_FILE || '',
  },

  // Router RTP codecs (audio & video)
  router: {
    mediaCodecs: [
      // Video codecs
      {
        kind: 'video',
        mimeType: 'video/vp8',
        clockRate: 90000,
        rtcpFeedback: [
          { type: 'transport-cc' },
          { type: 'ccm', parameter: 'fir' },
          { type: 'goog-remb' },
        ],
      },
      {
        kind: 'video',
        mimeType: 'video/vp9',
        clockRate: 90000,
        rtcpFeedback: [
          { type: 'transport-cc' },
          { type: 'ccm', parameter: 'fir' },
          { type: 'goog-remb' },
        ],
      },
      {
        kind: 'video',
        mimeType: 'video/h264',
        clockRate: 90000,
        rtcpFeedback: [
          { type: 'transport-cc' },
          { type: 'ccm', parameter: 'fir' },
          { type: 'goog-remb' },
        ],
      },
      // Audio codec
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
        rtcpFeedback: [{ type: 'transport-cc' }],
      },
    ],
  },

  // WebRTC Transport settings
  webRtcTransport: {
    listenIps: [
      {
        ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
        announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1',
      },
    ],
    initialAvailableOutgoingBitrate: 1500000, // 1.5 Mbps
    maxIncomingBitrate: 1500000, // 1.5 Mbps
    maxSctpMessageSize: 262144,
    enableSctp: true,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  },

  // Producer settings (for streaming from students)
  producer: {
    videoConstraints: {
      width: {
        ideal: 1280,
        max: 1920,
      },
      height: {
        ideal: 720,
        max: 1080,
      },
      frameRate: 30,
    },
    audioConstraints: {
      echoCancellation: true,
      noiseSuppression: true,
      typingNoiseDetection: true,
    },
  },

  // Consumer settings (for viewing students)
  consumer: {
    spatialLayers: 3,
    temporalLayers: 3,
    maxIncomingBitrate: 1500000,
  },
};

export default mediasoupConfig;
