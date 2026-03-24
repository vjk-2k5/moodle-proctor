// ============================================================================
// useWebRTC Hook
// Manages WebRTC connections, MediaSoup transport, and streaming
// ============================================================================

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

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

  const localStream = useRef<MediaStream | null>(null);
  const routerRtpCapabilities = useRef<Record<string, unknown> | null>(null);
  const transports = useRef<Map<string, any>>(new Map());

  /**
   * Initialize local media stream
   */
  const initializeLocalStream = useCallback(async () => {
    if (config.studentName === 'Teacher') {
      return null;
    }

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

      const { transport, routerRtpCapabilities: nextRouterRtpCapabilities } =
        await peerRes.json();

      transports.current.set(config.peerId, transport);
      routerRtpCapabilities.current = nextRouterRtpCapabilities || null;

      const connectRes = await fetch(
        `${config.backendUrl}/api/webrtc/rooms/${config.roomId}/peers/${config.peerId}/connect-transport`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dtlsParameters: transport.dtlsParameters,
          }),
          credentials: 'include',
        }
      );

      if (!connectRes.ok) {
        throw new Error('Failed to connect transport');
      }

      if (localStream.current) {
        for (const track of localStream.current.getTracks()) {
          const produceRes = await fetch(
            `${config.backendUrl}/api/webrtc/rooms/${config.roomId}/peers/${config.peerId}/produce`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                kind: track.kind,
                rtpParameters: routerRtpCapabilities.current || {},
              }),
              credentials: 'include',
            }
          );

          if (!produceRes.ok) {
            throw new Error(`Failed to create ${track.kind} producer`);
          }
        }
      }

      const consumersRes = await fetch(
        `${config.backendUrl}/api/webrtc/rooms/${config.roomId}/peers/${config.peerId}/consumers`,
        {
          credentials: 'include',
        }
      );

      const { consumers } = await consumersRes.json();

      for (const consumer of consumers) {
        try {
          const consumerRes = await fetch(
            `${config.backendUrl}/api/webrtc/rooms/${config.roomId}/peers/${config.peerId}/consume`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                producerId: consumer.producerId,
                rtpCapabilities: routerRtpCapabilities.current || {},
              }),
              credentials: 'include',
            }
          );

          if (consumerRes.ok) {
            await consumerRes.json();

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

            setStreams((prev) => {
              if (prev.has(consumer.producerId)) {
                return prev;
              }

              const updated = new Map(prev);
              updated.set(consumer.producerId, {
                producerId: consumer.producerId,
                peerId: consumer.peerId,
                studentName: consumer.studentName,
                stream: new MediaStream(),
                kind: consumer.kind,
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
  }, [config, initializeLocalStream]);

  /**
   * Leave room
   */
  const leaveRoom = useCallback(async () => {
    try {
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
