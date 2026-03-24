# WebRTC + MediaSoup Implementation Guide

## Overview

This document describes the WebRTC and MediaSoup integration for live student monitoring in the teacher's dashboard. The system supports up to **15 concurrent video streams** with real-time bidirectional communication.

---

## Architecture

### System Components

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐
│  Teacher        │         │  Fastify         │         │  MediaSoup   │
│  Dashboard      │◄───────►│  Backend         │◄───────►│  Router      │
│  (Next.js)      │   HTTP  │  (WebRTC API)    │   SDP   │  (Worker)    │
└─────────────────┘         └──────────────────┘         └──────────────┘
        │                            │
        │                            │
    WebRTC Peer                  RTC Transport
    Connection                   Management
        │                            │
        └────────────────┬───────────┘
                         │
              MediaSoup Router
              (Audio/Video Codec
              Negotiation)
```

### Data Flow

1. **Teacher joins monitoring room** → Backend creates teacher peer
2. **Students join exam** → Backend adds student peers to room
3. **Student enables camera/mic** → Streams published via WebRTC transport
4. **MediaSoup routes streams** → Audio/video negotiation & adaptation
5. **Teacher receives streams** → Video displayed in 3x5 grid (max 15)

---

## Backend Implementation

### Installation

```bash
cd backend
npm install
```

This installs `mediasoup@3.13.0` and other dependencies.

### Configuration

The WebRTC service is configured in `src/config/mediasoup.ts`:

```typescript
export const mediasoupConfig = {
  worker: {
    rtcMinPort: 10000,
    rtcMaxPort: 20000,
    logLevel: 'warn',
  },
  router: {
    mediaCodecs: [
      // VP8, VP9, H.264 video
      // Opus audio
    ],
  },
  webRtcTransport: {
    listenIps: [{ ip: '0.0.0.0', announcedIp: 'localhost' }],
    initialAvailableOutgoingBitrate: 1500000,
    maxIncomingBitrate: 1500000,
  },
};
```

### API Endpoints

#### Room Management

- **POST /api/webrtc/rooms** - Create room
  ```json
  {
    "roomId": "exam-monitoring-room",
    "examId": 1
  }
  ```

- **GET /api/webrtc/rooms/:roomId** - Get room info
  ```json
  {
    "roomId": "exam-monitoring-room",
    "peerCount": 15,
    "peers": [
      {
        "peerId": "student-123",
        "studentName": "John Doe",
        "isProducing": true,
        "connectionState": "connected"
      }
    ]
  }
  ```

#### Peer Management

- **POST /api/webrtc/rooms/:roomId/peers** - Join peer to room
  ```json
  {
    "peerId": "student-123",
    "userId": 1,
    "studentName": "John Doe"
  }
  ```
  
  Response:
  ```json
  {
    "peerId": "student-123",
    "transport": {
      "transportId": "transport-id",
      "iceParameters": {...},
      "iceCandidates": [...],
      "dtlsParameters": {...}
    }
  }
  ```

- **DELETE /api/webrtc/rooms/:roomId/peers/:peerId** - Leave room

#### Producer (Student Streaming)

- **POST /api/webrtc/rooms/:roomId/peers/:peerId/produce** - Start producing
  ```json
  {
    "kind": "video",
    "rtpParameters": {...}
  }
  ```

#### Consumer (Receive Streams)

- **GET /api/webrtc/rooms/:roomId/peers/:peerId/consumers** - Get available consumers
  ```json
  {
    "consumers": [
      {
        "producerId": "producer-id",
        "peerId": "student-123",
        "studentName": "John Doe",
        "kind": "video"
      }
    ]
  }
  ```

- **POST /api/webrtc/rooms/:roomId/peers/:peerId/consume** - Create consumer
  ```json
  {
    "producerId": "producer-id",
    "rtpCapabilities": {...}
  }
  ```

- **POST /api/webrtc/rooms/:roomId/peers/:peerId/consumers/:producerId/resume** - Start receiving

### WebRTC Service Methods

The `WebRTCService` class (`src/modules/webrtc/webrtc.service.ts`) provides:

```typescript
// Initialization
await webrtcService.initialize();

// Room management
const room = await webrtcService.createRoom(roomId, examId);
const peer = await webrtcService.addPeer(roomId, peerId, userId, studentName);
await webrtcService.removePeer(roomId, peerId);

// Transport
const transportParams = await webrtcService.createTransport(roomId, peerId);
await webrtcService.connectTransport(roomId, peerId, dtlsParameters);

// Streaming
const producer = await webrtcService.createProducer(
  roomId, peerId, kind, rtpParameters
);
const consumers = await webrtcService.getConsumers(roomId, peerId);
const consumer = await webrtcService.createConsumer(
  roomId, peerId, producerId, rtpCapabilities
);
await webrtcService.resumeConsumer(roomId, peerId, producerId);

// Info
const roomInfo = webrtcService.getRoomInfo(roomId);
```

---

## Frontend Implementation

### Installation

```bash
cd frontend
npm install
```

This installs `simple-peer` for WebRTC peer connections and other dependencies.

### useWebRTC Hook

The `useWebRTC` hook (`src/hooks/useWebRTC.ts`) manages WebRTC connections:

```typescript
const {
  peers,           // Array<WebRTCPeerInfo>
  streams,         // Array<StreamInfo>
  isConnected,     // boolean
  error,          // string | null
  joinRoom,       // () => Promise<void>
  leaveRoom,      // () => Promise<void>
  getLocalStream, // () => MediaStream | null
  getRemoteStreams, // () => StreamInfo[]
} = useWebRTC({
  roomId: 'exam-monitoring-room',
  peerId: 'teacher-123',
  userId: 0,
  studentName: 'Teacher',
  backendUrl: 'http://localhost:5000',
});
```

### VideoStream Component

The `VideoStream` component (`src/components/VideoStream.tsx`) displays a single video stream:

```typescript
<VideoStream
  stream={mediaStream}
  studentName="John Doe"
  peerId="student-123"
  isProducing={true}
  connectionState="connected"
  videoEnabled={true}
  audioEnabled={true}
/>
```

Features:
- Auto-play video
- Status indicator (connecting/connected/disconnected)
- Media controls (video/audio enable/disable)
- Fallback UI when camera is off

### StudentsGrid Component

The updated `StudentsGrid` component (`src/components/StudentsGrid.tsx`) displays the 3x5 video grid:

```typescript
export const StudentsGrid = () => {
  const { peers, streams, isConnected, error, joinRoom, leaveRoom } = useWebRTC({
    roomId: 'exam-monitoring-room',
    peerId: `teacher-${Date.now()}`,
    userId: 0,
    studentName: 'Teacher',
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL,
  });

  // ... renders grid with up to 15 video streams
};
```

---

## Setup Instructions

### 1. Backend Setup

```bash
# Install dependencies
cd backend
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Run migrations (if not already done)
npm run migrate

# Start backend
npm run dev
```

The backend will start on `http://localhost:5000`.

### 2. Frontend Setup

```bash
# Install dependencies
cd frontend
npm install

# Create .env.local file
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:5000" > .env.local

# Start frontend
npm run dev
```

The frontend will start on `http://localhost:3000`.

### 3. Verify Installation

```bash
# Check MediaSoup worker initialization
# Backend logs should show:
# ✓ MediaSoup worker initialized

# Test WebRTC endpoints
curl http://localhost:5000/api/webrtc/rooms/test-room -X POST \
  -H "Content-Type: application/json" \
  -d '{"roomId":"test-room","examId":1}'
```

---

## Testing

### Manual Testing

1. **Open teacher dashboard**
   ```
   http://localhost:3000/dashboard
   ```

2. **Open another browser window for student**
   ```
   http://localhost:3000/exam
   ```

3. **Enable camera/mic on student side**
   - Student's video should appear on teacher's dashboard

4. **Monitor connection status**
   - Status indicator should show "connected"
   - Streams should appear in real-time

### Test API Directly

```bash
# Create room
curl -X POST http://localhost:5000/api/webrtc/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"roomId":"test-exam","examId":1}'

# Get room info
curl http://localhost:5000/api/webrtc/rooms/test-exam \
  -H "Authorization: Bearer YOUR_TOKEN"

# Add peer
curl -X POST http://localhost:5000/api/webrtc/rooms/test-exam/peers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"peerId":"student-1","userId":1,"studentName":"Alice"}'
```

---

## Configuration & Tuning

### Bandwidth Management

Edit `src/config/mediasoup.ts`:

```typescript
webRtcTransport: {
  initialAvailableOutgoingBitrate: 1500000, // 1.5 Mbps per stream
  maxIncomingBitrate: 1500000,
  maxSctpMessageSize: 262144,
},
```

Lower values for worse network conditions:
- 500kbps: Low quality, high stability
- 1.5Mbps: Balanced
- 3Mbps: High quality

### RTC Ports

MediaSoup uses UDP ports `10000-20000` by default. Adjust in `.env`:

```
MEDIASOUP_RTC_MIN_PORT=10000
MEDIASOUP_RTC_MAX_PORT=20000
```

### Network Configuration

For production deployment, set announced IP:

```env
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=your-server-ip.com
```

---

## Troubleshooting

### Issue: "MediaSoup worker not initialized"

**Solution:**
```bash
# Check Node.js version (needs 14+)
node --version

# Rebuild native modules
npm rebuild
```

### Issue: No video appearing in streams

**Solution:**
1. Check browser permissions for camera/mic
2. Verify WebRTC endpoints are accessible
3. Check console for errors
4. Ensure CORS is configured correctly

### Issue: Expensive CPU usage

**Solution:**
1. Reduce video resolution/framerate
2. Lower bitrate in config
3. Limit max concurrent peers

### Issue: Poor network performance

**Solution:**
1. Enable audio-only mode
2. Reduce video quality
3. Use VP8 codec instead of H.264
4. Check firewall/NAT configuration

---

## Production Deployment

### Security Considerations

1. **Enable DTLS Certificates**
   ```bash
   # Generate self-signed DTLS certificates
   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365
   
   # Set in .env
   MEDIASOUP_DTLS_CERT_FILE=/path/to/cert.pem
   MEDIASOUP_DTLS_KEY_FILE=/path/to/key.pem
   ```

2. **Firewall Rules**
   - Allow ports: 5000 (HTTP), 10000-20000 (RTC)
   - Restrict to authenticated users

3. **Rate Limiting**
   - Implement per-IP rate limits
   - Monitor for abuse

### Performance Optimization

1. **Horizontal Scaling**
   - Deploy multiple MediaSoup workers
   - Use load balancer for distribution

2. **Monitoring**
   - Track active rooms/peers
   - Monitor CPU/memory usage
   - Alert on high latency

3. **Scaling Limits**
   - Max 15 concurrent streams per viewer (3x5 grid)
   - Max 50 concurrent peers per router
   - Recommended: 1 worker per core

---

## Additional Resources

- [MediaSoup Documentation](https://mediasoup.org/)
- [WebRTC Specification](https://www.w3.org/TR/webrtc/)
- [Simple-Peer Documentation](https://github.com/feross/simple-peer)
- [Fastify Documentation](https://www.fastify.io/)

---

## Next Steps

1. ✅ Implement basic WebRTC streaming
2. Add screen sharing capability
3. Implement audio recording
4. Add violation detection from video streams
5. Implement adaptive bitrate streaming
6. Add cloud-based recording

---
