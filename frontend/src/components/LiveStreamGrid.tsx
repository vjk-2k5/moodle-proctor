// ============================================================================
// LiveStreamGrid Component
// Displays live video streams from multiple students in a responsive grid
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoStream } from './VideoStream';
import { FiLoader, FiWifiOff } from 'react-icons/fi';

export interface LiveStreamGridProps {
  maxPeers?: number;
  roomId?: string;
  backendUrl?: string;
}

export function LiveStreamGrid({
  maxPeers = 15,
  roomId = 'exam-monitoring-room',
  backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000',
}: LiveStreamGridProps) {
  const teacherPeerId = `teacher-${Date.now()}`;

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
    peerId: teacherPeerId,
    userId: 0,
    studentName: 'Teacher Monitor',
    backendUrl,
  });

  const [autoJoin, setAutoJoin] = useState(true);
  const remoteStreams = getRemoteStreams();

  useEffect(() => {
    if (autoJoin) {
      joinRoom().catch(console.error);
    }

    return () => {
      if (autoJoin) {
        leaveRoom().catch(console.error);
      }
    };
  }, [autoJoin, joinRoom, leaveRoom]);

  const handleToggleAutoJoin = () => {
    if (!autoJoin) {
      joinRoom().catch(console.error);
    } else {
      leaveRoom().catch(console.error);
    }
    setAutoJoin(!autoJoin);
  };

  // Calculate grid columns based on peer count
  const getGridColumns = () => {
    if (remoteStreams.length <= 1) return 'grid-cols-1';
    if (remoteStreams.length <= 2) return 'sm:grid-cols-2';
    if (remoteStreams.length <= 4) return 'sm:grid-cols-2 lg:grid-cols-4';
    if (remoteStreams.length <= 6) return 'sm:grid-cols-2 lg:grid-cols-3';
    if (remoteStreams.length <= 9) return 'sm:grid-cols-3 lg:grid-cols-3';
    return 'sm:grid-cols-3 lg:grid-cols-5';
  };

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="bg-red-50 text-red-800 p-6 rounded-lg max-w-md">
          <div className="flex items-start gap-3">
            <FiWifiOff size={24} className="flex-shrink-0 mt-1" />
            <div>
              <p className="font-semibold">Connection Error</p>
              <p className="text-sm mt-1">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold">Live Monitoring</h2>
            <p className="text-xs text-gray-400">
              {remoteStreams.length} active streams • {peers.length} students connected
            </p>
          </div>

          {/* Status and Controls */}
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full animate-pulse ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-xs font-medium">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>

            {/* Auto-join Toggle */}
            <button
              onClick={handleToggleAutoJoin}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                autoJoin
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {autoJoin ? 'Connected' : 'Disconnected'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        {!isConnected && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FiLoader className="animate-spin text-4xl mx-auto mb-4" />
              <p className="text-gray-400">Connecting to monitoring server...</p>
            </div>
          </div>
        )}

        {isConnected && remoteStreams.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-400 mb-2">Waiting for students to join...</p>
              <p className="text-xs text-gray-500">Streams will appear here when available</p>
            </div>
          </div>
        )}

        {/* Video Grid */}
        {isConnected && remoteStreams.length > 0 && (
          <div
            className={`grid ${getGridColumns()} gap-4 auto-rows-[280px] md:auto-rows-[320px]`}
          >
            {remoteStreams.map((streamInfo) => {
              const peer = peers.find((p) => p.peerId === streamInfo.peerId);

              return (
                <div
                  key={`${streamInfo.peerId}-${streamInfo.producerId}`}
                  className="rounded-lg overflow-hidden shadow-lg"
                >
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

            {/* Placeholder Cards for Visual Balance */}
            {remoteStreams.length < maxPeers &&
              Array.from({ length: Math.min(3, maxPeers - remoteStreams.length) }).map(
                (_, idx) => (
                  <div
                    key={`placeholder-${idx}`}
                    className="bg-gray-700 rounded-lg flex items-center justify-center"
                  >
                    <div className="text-center">
                      <p className="text-gray-400 text-sm font-medium">
                        Empty Slot
                      </p>
                    </div>
                  </div>
                )
              )}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {isConnected && remoteStreams.length > 0 && (
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <div className="flex flex-wrap gap-4 text-xs text-gray-400">
            <div>Bitrate: 1.5 Mbps</div>
            <div>Resolution: 1280x720</div>
            <div>Framerate: 30 FPS</div>
            <div>Latency: &lt;100ms</div>
          </div>

          {/* Active Students List */}
          {peers.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-xs font-semibold mb-2 text-gray-300">
                Active Students ({peers.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {peers.map((peer) => (
                  <span
                    key={peer.peerId}
                    className="text-xs bg-blue-900 text-blue-100 px-2 py-1 rounded"
                  >
                    {peer.studentName}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
