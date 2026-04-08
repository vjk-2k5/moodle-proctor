'use client';

import { useEffect, useRef } from 'react';
import { FiMic, FiMicOff, FiVideo, FiVideoOff } from 'react-icons/fi';

export interface VideoStreamProps {
  stream: MediaStream;
  studentName: string;
  peerId: string;
  isProducing: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected';
  videoEnabled: boolean;
  audioEnabled: boolean;
}

export function VideoStream({
  stream,
  studentName,
  peerId,
  isProducing,
  connectionState,
  videoEnabled,
  audioEnabled,
}: VideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.error('Failed to play video:', err);
      });
    }
  }, [stream]);

  const connectionLabel = {
    connecting: 'Connecting',
    connected: 'Live',
    disconnected: 'Disconnected',
  }[connectionState];

  return (
    <article className="relative h-full bg-slate-950">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className="h-full w-full object-cover"
      />

      <div className="absolute left-3 top-3 inline-flex items-center rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
        {connectionLabel}
      </div>

      <div className="absolute right-3 top-3 inline-flex items-center rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
        {peerId}
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 py-3 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{studentName}</p>
            <p className="mt-1 text-xs text-slate-200">Student camera</p>
          </div>
          <div className="flex items-center gap-2 text-white">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60">
              {videoEnabled ? <FiVideo size={14} /> : <FiVideoOff size={14} />}
            </span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60">
              {audioEnabled ? <FiMic size={14} /> : <FiMicOff size={14} />}
            </span>
          </div>
        </div>
      </div>

      {!isProducing ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-center text-white">
          <div>
            <p className="text-sm font-semibold">Camera paused</p>
            <p className="mt-1 text-xs text-slate-200">Waiting for video to resume.</p>
          </div>
        </div>
      ) : null}
    </article>
  );
}
