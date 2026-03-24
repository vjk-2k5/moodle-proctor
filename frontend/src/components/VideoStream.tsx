// ============================================================================
// VideoStream Component
// Displays a single video stream from a student
// ============================================================================

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

  const statusColor = {
    connecting: 'bg-yellow-500',
    connected: 'bg-green-500',
    disconnected: 'bg-red-500',
  }[connectionState];

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden shadow-lg group hover:shadow-xl transition-shadow">
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-cover"
      />

      {/* Status Indicator */}
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${statusColor}`} />
        <span className="text-xs font-semibold text-white bg-black bg-opacity-50 px-2 py-1 rounded">
          {connectionState}
        </span>
      </div>

      {/* Student Name */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
        <p className="text-white font-semibold text-sm truncate">
          {studentName}
        </p>
      </div>

      {/* Media Controls Overlay */}
      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {videoEnabled ? (
          <div className="bg-green-600 text-white p-1.5 rounded-full">
            <FiVideo size={14} />
          </div>
        ) : (
          <div className="bg-red-600 text-white p-1.5 rounded-full">
            <FiVideoOff size={14} />
          </div>
        )}

        {audioEnabled ? (
          <div className="bg-green-600 text-white p-1.5 rounded-full">
            <FiMic size={14} />
          </div>
        ) : (
          <div className="bg-red-600 text-white p-1.5 rounded-full">
            <FiMicOff size={14} />
          </div>
        )}
      </div>

      {/* Fullscreen Background when Not Producing */}
      {!isProducing && (
        <div className="absolute inset-0 bg-gray-700 bg-opacity-50 flex items-center justify-center">
          <div className="text-center">
            <FiVideoOff size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-300 text-xs">Camera Off</p>
          </div>
        </div>
      )}
    </div>
  );
}
