'use client';

import { useEffect, useRef } from 'react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoStream } from './VideoStream';
import { FiLoader } from 'react-icons/fi';

export const StudentsGrid = () => {
  const roomId = 'exam-monitoring-room';
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  // For demo, use teacher as viewer with peerId
  const teacherPeerId = useRef(`teacher-${Date.now()}`);

  const {
    peers,
    streams,
    isConnected,
    error,
    joinRoom,
    leaveRoom,
    getRemoteStreams,
  } = useWebRTC({
    roomId,
    peerId: teacherPeerId.current,
    userId: 0,
    studentName: 'Teacher',
    backendUrl,
  });

  const remoteStreams = getRemoteStreams();

  useEffect(() => {
    // Join room on mount
    joinRoom().catch(console.error);

    return () => {
      leaveRoom().catch(console.error);
    };
  }, [joinRoom, leaveRoom]);

  if (error) {
    return (
      <section className="flex flex-col gap-6 px-4">
        <div className="bg-red-50 text-red-800 p-4 rounded-lg">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-gray-900">
            Live Monitoring Dashboard
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Viewing {peers.length} students in real-time
            {!isConnected && ' (connecting...)'}
          </p>
        </div>

        {/* Status Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
              }`}
            />
            <span className="text-xs font-medium text-gray-700">
              {isConnected ? 'Connected' : 'Connecting'}
            </span>
          </div>

          {/* Connection Stats */}
          <span className="text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            {remoteStreams.length} active streams
          </span>
        </div>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex items-center gap-2">
          <FiLoader className="animate-spin" size={16} />
          <p className="text-sm">Establishing connection to monitoring server...</p>
        </div>
      )}

      {/* Empty State */}
      {isConnected && peers.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            Waiting for students to join the exam...
          </p>
        </div>
      )}

      {/* Video Grid - Supports up to 15 students in a 3x5 layout */}
      {remoteStreams.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 auto-rows-[200px]">
          {remoteStreams.map((streamInfo) => {
            const peer = peers.find((p) => p.peerId === streamInfo.peerId);

            return (
              <div key={`${streamInfo.peerId}-${streamInfo.producerId}`}>
                {peer && (
                  <VideoStream
                    stream={streamInfo.stream}
                    studentName={peer.studentName}
                    peerId={peer.peerId}
                    isProducing={peer.isProducing}
                    connectionState={peer.connectionState}
                    videoEnabled={peer.videoEnabled}
                    audioEnabled={peer.audioEnabled}
                  />
                )}
              </div>
            );
          })}

          {/* Placeholder Cards for Remaining Slots (up to 15) */}
          {remoteStreams.length < 15 &&
            Array.from({ length: 15 - remoteStreams.length }).map(
              (_, idx) => (
                <div
                  key={`placeholder-${idx}`}
                  className="bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 text-xs font-medium"
                >
                  <div className="text-center">
                    <p>Empty Slot</p>
                    <p className="text-xs">{remoteStreams.length + idx + 1}</p>
                  </div>
                </div>
              )
            )}
        </div>
      )}

      {/* Compact Peers List */}
      {peers.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Active Students ({peers.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {peers.map((peer) => (
              <div
                key={peer.peerId}
                className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
              >
                {peer.studentName}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
