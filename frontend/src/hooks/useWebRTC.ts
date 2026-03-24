// ============================================================================
// useWebRTC Hook
// Manages WebRTC connections, MediaSoup transport, and streaming
// ============================================================================

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import logger from '../config/logger';

export interface WebRTCPeerInfo {
  peerId: string;
  studentName: string;
  userId: number;
  isProducing: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected';
  videoEnabled: boolean;
  audioEnabled: boolean;
}

export interface StreamInfo {
  producerId: string;
  peerId: string;
  studentName: string;
  stream: MediaStream;
  kind: 'audio' | 'video';
}

interface WebRTCConfig {
  roomId: string;
  peerId: string;
  userId: number;
  studentName: string;
  backendUrl: string;
  signalingUrl?: string;
}

export function useWebRTC(config: WebRTCConfig) {
  const [peers, setPeers] = useState<Map<string, WebRTCPeerInfo>>(new Map());
  const [streams, setStreams] = useState<Map<string, StreamInfo>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStream = useRef<MediaStream | null>(null);
  const transports = useRef<Map<string, any>>(new Map());

  /**
   * Initialize local media stream
   */
  const initializeLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      localStream.current = stream;
      return stream;
    } catch (err) {
      const message = `Failed to get user media: ${err}`;
      setError(message);
      console.error(message);
      throw err;
    }
  }, []);

  /**
   * Create WebRTC peer connection
   */
  const createPeerConnection = useCallback(
    (peerId: string): RTCPeerConnection => {
      const iceServers = [
        { urls: ['stun:stun.l.google.com:19302'] },
        { urls: ['stun:stun1.l.google.com:19302'] },
      ];

      const peerConnection = new RTCPeerConnection({
        iceServers,
      });

      // Add local tracks as producer
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => {
          if (localStream.current) {
            peerConnection.addTrack(track, localStream.current);
          }
        });
      }

      // Handle remote tracks
      peerConnection.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind, peerId);

        const stream = new MediaStream();
        stream.addTrack(event.track);

        setStreams((prev) => {
          const updated = new Map(prev);
          updated.set(`${peerId}-${event.track.id}`, {
            producerId: `${peerId}-${event.track.id}`,
            peerId,
            studentName: peerId,
            stream,
            kind: event.track.kind as 'audio' | 'video',
          });
          return updated;
        });
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(
          `Connection state with ${peerId}: ${peerConnection.connectionState}`
        );

        if (peerConnection.connectionState === 'disconnected') {
          peerConnections.current.delete(peerId);
          setPeers((prev) => {
            const updated = new Map(prev);
            updated.delete(peerId);
            return updated;
          });
        }
      };

      peerConnections.current.set(peerId, peerConnection);
      return peerConnection;
    },
    []
  );

  /**
   * Create offer
   */
  const createOffer = useCallback(
    async (peerConnection: RTCPeerConnection): Promise<RTCSessionDescriptionInit> => {
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await peerConnection.setLocalDescription(offer);

      return offer;
    },
    []
  );

  /**
   * Join room
   */
  const joinRoom = useCallback(async () => {
    try {
      setError(null);

      // Initialize local stream
      await initializeLocalStream();

      // Create room on backend
      const roomRes = await fetch(
        `${config.backendUrl}/api/webrtc/rooms/${config.roomId}`,
        {
          credentials: 'include',
        }
      );

      if (!roomRes.ok) {
        // Room doesn't exist, create it
        await fetch(`${config.backendUrl}/api/webrtc/rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: config.roomId,
            examId: 0,
          }),
          credentials: 'include',
        });
      }

      // Add peer to room and get transport
      const peerRes = await fetch(
        `${config.backendUrl}/api/webrtc/rooms/${config.roomId}/peers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            peerId: config.peerId,
            userId: config.userId,
            studentName: config.studentName,
          }),
          credentials: 'include',
        }
      );

      if (!peerRes.ok) {
        throw new Error('Failed to join room');
      }

      const { transport } = await peerRes.json();

      // Store transport
      transports.current.set(config.peerId, transport);

      // Create peer connection
      const peerConnection = createPeerConnection(config.peerId);

      // Create and set local description
      const offer = await createOffer(peerConnection);

      // Send offer to backend (connect transport)
      const connectRes = await fetch(
        `${config.backendUrl}/api/webrtc/rooms/${config.roomId}/peers/${config.peerId}/connect-transport`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dtlsParameters: peerConnection.getConfiguration(),
          }),
          credentials: 'include',
        }
      );

      if (!connectRes.ok) {
        throw new Error('Failed to connect transport');
      }

      // Get available consumers
      const consumersRes = await fetch(
        `${config.backendUrl}/api/webrtc/rooms/${config.roomId}/peers/${config.peerId}/consumers`,
        {
          credentials: 'include',
        }
      );

      const { consumers } = await consumersRes.json();

      // Subscribe to consumer streams
      for (const consumer of consumers) {
        try {
          const consumerRes = await fetch(
            `${config.backendUrl}/api/webrtc/rooms/${config.roomId}/peers/${config.peerId}/consume`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                producerId: consumer.producerId,
                rtpCapabilities: peerConnection.getConfiguration(),
              }),
              credentials: 'include',
            }
          );

          if (consumerRes.ok) {
            const consumerData = await consumerRes.json();

            // Resume consumer
            await fetch(
              `${config.backendUrl}/api/webrtc/rooms/${config.roomId}/peers/${config.peerId}/consumers/${consumer.producerId}/resume`,
              {
                method: 'POST',
                credentials: 'include',
              }
            );

            setPeers((prev) => {
              const updated = new Map(prev);
              updated.set(consumer.peerId, {
                peerId: consumer.peerId,
                studentName: consumer.studentName,
                userId: 0,
                isProducing: true,
                connectionState: 'connected',
                videoEnabled: true,
                audioEnabled: true,
              });
              return updated;
            });
          }
        } catch (err) {
          console.error(`Failed to consume ${consumer.peerId}:`, err);
        }
      }

      setIsConnected(true);
    } catch (err) {
      const message = `Failed to join room: ${err}`;
      setError(message);
      console.error(message);
    }
  }, [config, initializeLocalStream, createPeerConnection, createOffer]);

  /**
   * Leave room
   */
  const leaveRoom = useCallback(async () => {
    try {
      // Close all peer connections
      for (const pc of peerConnections.current.values()) {
        pc.close();
      }
      peerConnections.current.clear();

      // Stop local tracks
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => track.stop());
        localStream.current = null;
      }

      // Notify backend
      await fetch(
        `${config.backendUrl}/api/webrtc/rooms/${config.roomId}/peers/${config.peerId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      ).catch(() => {}); // Ignore errors

      setIsConnected(false);
      setPeers(new Map());
      setStreams(new Map());
    } catch (err) {
      console.error('Error leaving room:', err);
    }
  }, [config]);

  /**
   * Get local stream
   */
  const getLocalStream = useCallback(() => localStream.current, []);

  /**
   * Get remote streams
   */
  const getRemoteStreams = useCallback(() => {
    return Array.from(streams.values());
  }, [streams]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      leaveRoom().catch(console.error);
    };
  }, [leaveRoom]);

  return {
    peers: Array.from(peers.values()),
    streams: Array.from(streams.values()),
    isConnected,
    error,
    joinRoom,
    leaveRoom,
    getLocalStream,
    getRemoteStreams,
  };
}
