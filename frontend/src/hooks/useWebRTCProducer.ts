'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Device } from 'mediasoup-client';
import type {
  DtlsParameters,
  Producer,
  RtpCapabilities,
  Transport,
} from 'mediasoup-client/types';

interface WebRTCProducerConfig {
  roomId: string;
  peerId: string;
  studentName: string;
  backendUrl: string;
  requestHeaders?: HeadersInit;
}

interface BackendTransportParams {
  transportId: string;
  iceParameters: Record<string, unknown>;
  iceCandidates: Array<Record<string, unknown>>;
  dtlsParameters: DtlsParameters;
}

interface JoinPeerResponse {
  peerId: string;
  userId: number;
  studentName: string;
  transport: BackendTransportParams;
  routerRtpCapabilities: RtpCapabilities;
}

export function useWebRTCProducer(config: WebRTCProducerConfig) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isProducing, setIsProducing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<Transport | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const producersRef = useRef<Map<string, Producer>>(new Map());
  const hasJoinedRef = useRef(false);

  const fetchJson = useCallback(
    async <T,>(input: string, init?: RequestInit): Promise<T> => {
      const headers = new Headers(init?.headers);
      const requestHeaders = new Headers(config.requestHeaders);

      requestHeaders.forEach((value, key) => {
        if (!headers.has(key)) {
          headers.set(key, value);
        }
      });

      if (init?.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(input, {
        credentials: 'include',
        ...init,
        headers,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || `Request failed: ${response.status}`);
      }

      return response.json() as Promise<T>;
    },
    [config.requestHeaders]
  );

  const ensureRoom = useCallback(async () => {
    const roomUrl = `${config.backendUrl}/api/webrtc/rooms/${config.roomId}`;
    const roomResponse = await fetch(roomUrl, {
      credentials: 'include',
      headers: config.requestHeaders,
    });

    if (roomResponse.ok) {
      return;
    }

    if (roomResponse.status !== 404) {
      const errorBody = await roomResponse.json().catch(() => ({}));
      throw new Error(errorBody.error || 'Failed to inspect room');
    }

    await fetchJson(`${config.backendUrl}/api/webrtc/rooms`, {
      method: 'POST',
      body: JSON.stringify({
        roomId: config.roomId,
        examId: 0,
      }),
    });
  }, [config.backendUrl, config.roomId, fetchJson]);

  const stopBroadcast = useCallback(async () => {
    for (const producer of producersRef.current.values()) {
      producer.close();
    }
    producersRef.current.clear();

    sendTransportRef.current?.close();
    sendTransportRef.current = null;
    deviceRef.current = null;

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        track.stop();
      }
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setIsConnected(false);
    setIsProducing(false);

    if (hasJoinedRef.current) {
      await fetch(
        `${config.backendUrl}/api/webrtc/rooms/${config.roomId}/peers/${config.peerId}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: config.requestHeaders,
        }
      ).catch(() => {});
      hasJoinedRef.current = false;
    }
  }, [config.backendUrl, config.peerId, config.requestHeaders, config.roomId]);

  const startBroadcast = useCallback(async () => {
    try {
      setError(null);

      if (hasJoinedRef.current) {
        await stopBroadcast();
      }

      await ensureRoom();

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = mediaStream;
      setLocalStream(mediaStream);

      const joinResponse = await fetchJson<JoinPeerResponse>(
        `${config.backendUrl}/api/webrtc/rooms/${config.roomId}/peers`,
        {
          method: 'POST',
          body: JSON.stringify({
            peerId: config.peerId,
            studentName: config.studentName,
          }),
        }
      );

      hasJoinedRef.current = true;

      const device = await Device.factory();
      await device.load({
        routerRtpCapabilities: joinResponse.routerRtpCapabilities,
      });
      deviceRef.current = device;

      const sendTransport = device.createSendTransport({
        id: joinResponse.transport.transportId,
        iceParameters: joinResponse.transport.iceParameters as any,
        iceCandidates: joinResponse.transport.iceCandidates as any,
        dtlsParameters: joinResponse.transport.dtlsParameters,
      });

      sendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
        fetchJson(
          `${config.backendUrl}/api/webrtc/rooms/${config.roomId}/peers/${config.peerId}/connect-transport`,
          {
            method: 'POST',
            body: JSON.stringify({
              dtlsParameters,
            }),
          }
        )
          .then(() => callback())
          .catch(error => errback(error instanceof Error ? error : new Error(String(error))));
      });

      sendTransport.on('produce', ({ kind, rtpParameters }, callback, errback) => {
        fetchJson<{ producerId: string }>(
          `${config.backendUrl}/api/webrtc/rooms/${config.roomId}/peers/${config.peerId}/produce`,
          {
            method: 'POST',
            body: JSON.stringify({
              kind,
              rtpParameters,
            }),
          }
        )
          .then(({ producerId }) => callback({ id: producerId }))
          .catch(error => errback(error instanceof Error ? error : new Error(String(error))));
      });

      sendTransport.on('connectionstatechange', state => {
        if (state === 'connected') {
          setIsConnected(true);
          return;
        }

        if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          setIsConnected(false);
        }
      });

      sendTransportRef.current = sendTransport;

      const mediaTracks = mediaStream.getTracks();

      for (const track of mediaTracks) {
        const producer = await sendTransport.produce({
          track,
        });

        producersRef.current.set(producer.id, producer);

        producer.on('transportclose', () => {
          producersRef.current.delete(producer.id);
        });

        producer.on('trackended', () => {
          producersRef.current.delete(producer.id);
        });
      }

      setIsProducing(mediaTracks.length > 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start broadcast';
      setError(message);
      await stopBroadcast();
    }
  }, [
    config.backendUrl,
    config.peerId,
    config.roomId,
    config.studentName,
    ensureRoom,
    fetchJson,
    stopBroadcast,
  ]);

  useEffect(() => {
    return () => {
      stopBroadcast().catch(console.error);
    };
  }, [stopBroadcast]);

  return {
    localStream,
    isConnected,
    isProducing,
    error,
    startBroadcast,
    stopBroadcast,
  };
}
