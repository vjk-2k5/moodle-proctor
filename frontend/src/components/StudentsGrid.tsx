'use client';

import { useEffect, useRef, useState } from 'react';
import { FiLoader, FiMonitor, FiUsers, FiWifi } from 'react-icons/fi';

import { useWebRTC } from '@/hooks/useWebRTC';
import type { RoomMonitoringStudent } from '@/lib/backend';
import { VideoStream } from './VideoStream';

const MAX_VISIBLE_SLOTS = 15;
const SNAPSHOT_POLL_INTERVAL_MS = 500;
const SNAPSHOT_STALE_THRESHOLD_MS = 3000;

interface SnapshotFeed {
  feedId: string;
  attemptId: number | null;
  userId: number;
  studentName: string;
  imageDataUrl: string;
  updatedAt: number;
}

export interface MonitoringStudentSelection {
  enrollmentId?: number | null;
  attemptId?: number | null;
  userId?: number | null;
  studentName: string;
  studentEmail?: string | null;
}

interface StudentsGridProps {
  roomId?: string;
  roomStudents?: RoomMonitoringStudent[];
  onStudentSelect?: (student: MonitoringStudentSelection) => void;
  selectedStudentName?: string | null;
}

export const StudentsGrid = ({
  roomId,
  roomStudents = [],
  onStudentSelect,
  selectedStudentName,
}: StudentsGridProps) => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  const hasAutoJoined = useRef(false);
  const previousRoomId = useRef<string | undefined>(undefined);
  const [snapshotFeeds, setSnapshotFeeds] = useState<SnapshotFeed[]>([]);
  const snapshotSinceRef = useRef(0);
  const snapshotFetchInFlightRef = useRef(false);

  const teacherPeerId = useRef(`teacher-${Date.now()}`);

  const { peers, isConnected, error, joinRoom, leaveRoom, getRemoteStreams } = useWebRTC({
    roomId: roomId ?? '',
    peerId: teacherPeerId.current,
    userId: 0,
    studentName: 'Teacher',
    backendUrl,
  });

  const remoteStreams = getRemoteStreams();
  const videoStreams = remoteStreams.filter((streamInfo) => streamInfo.kind === 'video');
  const hasWebRtcFeeds = videoStreams.length > 0;

  const findRoomStudent = (matcher: {
    attemptId?: number | null;
    userId?: number | null;
    studentName?: string | null;
  }) =>
    roomStudents.find(student => {
      if (matcher.attemptId && student.attemptId === matcher.attemptId) {
        return true;
      }

      if (matcher.userId && student.userId === matcher.userId) {
        return true;
      }

      if (
        matcher.studentName &&
        student.studentName.trim().toLowerCase() === matcher.studentName.trim().toLowerCase()
      ) {
        return true;
      }

      return false;
    }) ?? null;

  const activeVideoStudentKeys = new Set(
    videoStreams.map(streamInfo => {
      const peer = peers.find(participant => participant.peerId === streamInfo.peerId);
      const roomStudent = findRoomStudent({
        studentName: peer?.studentName,
      });

      return roomStudent
        ? `enrollment:${roomStudent.enrollmentId}`
        : `peer:${streamInfo.peerId}:${peer?.studentName || ''}`;
    })
  );

  const activeSnapshotStudentKeys = new Set(
    snapshotFeeds.map(feed => {
      const roomStudent = findRoomStudent({
        attemptId: feed.attemptId,
        userId: feed.userId,
        studentName: feed.studentName,
      });

      return roomStudent
        ? `enrollment:${roomStudent.enrollmentId}`
        : `snapshot:${feed.feedId}`;
    })
  );

  const statusOnlyStudents = roomStudents.filter(student => {
    const studentKey = `enrollment:${student.enrollmentId}`;
    return (
      (student.status === 'submitted' || student.status === 'terminated') &&
      !activeVideoStudentKeys.has(studentKey) &&
      !activeSnapshotStudentKeys.has(studentKey)
    );
  });

  const totalFeeds = hasWebRtcFeeds
    ? videoStreams.length + statusOnlyStudents.length
    : snapshotFeeds.length + statusOnlyStudents.length;

  useEffect(() => {
    if (!roomId) {
      setSnapshotFeeds([]);
      snapshotSinceRef.current = 0;
      snapshotFetchInFlightRef.current = false;
      return;
    }

    let isMounted = true;

    const loadSnapshots = async () => {
      if (snapshotFetchInFlightRef.current) {
        return;
      }

      snapshotFetchInFlightRef.current = true;

      try {
        const response = await fetch(
          `${backendUrl}/api/live-monitoring/rooms/${encodeURIComponent(roomId)}/frames?since=${snapshotSinceRef.current}`,
          {
            credentials: 'include',
          }
        );

        if (!response.ok) {
          return;
        }

        const result = await response.json().catch(() => null);
        const frames = Array.isArray(result?.data?.frames) ? result.data.frames : [];
        const activeFeedIds = Array.isArray(result?.data?.activeFeedIds)
          ? result.data.activeFeedIds
          : [];
        const roomUpdatedAt =
          typeof result?.data?.roomUpdatedAt === 'number' ? result.data.roomUpdatedAt : 0;

        if (isMounted) {
          setSnapshotFeeds((previousFeeds) => {
            const nextFeeds = new Map(previousFeeds.map((feed) => [feed.feedId, feed]));

            for (const frame of frames) {
              if (!frame?.feedId) {
                continue;
              }

              nextFeeds.set(frame.feedId, frame as SnapshotFeed);
            }

            for (const feedId of Array.from(nextFeeds.keys())) {
              if (!activeFeedIds.includes(feedId)) {
                nextFeeds.delete(feedId);
              }
            }

            return Array.from(nextFeeds.values())
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .slice(0, MAX_VISIBLE_SLOTS);
          });
        }

        if (roomUpdatedAt > snapshotSinceRef.current) {
          snapshotSinceRef.current = roomUpdatedAt;
        }
      } catch {
        // Keep the latest usable snapshot set during transient polling failures.
      } finally {
        snapshotFetchInFlightRef.current = false;
      }
    };

    snapshotSinceRef.current = 0;
    loadSnapshots().catch(console.error);
    const timerId = window.setInterval(() => {
      loadSnapshots().catch(console.error);
    }, SNAPSHOT_POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(timerId);
    };
  }, [backendUrl, roomId]);

  useEffect(() => {
    if (previousRoomId.current === undefined && roomId === undefined) {
      return;
    }

    if (previousRoomId.current !== roomId) {
      if (previousRoomId.current !== undefined && isConnected) {
        leaveRoom();
        hasAutoJoined.current = false;
      }

      if (roomId !== undefined && !hasAutoJoined.current) {
        setTimeout(() => {
          joinRoom().catch(console.error);
          hasAutoJoined.current = true;
        }, 100);
      }

      previousRoomId.current = roomId;
    }
  }, [roomId, isConnected, joinRoom, leaveRoom]);

  useEffect(() => {
    if (roomId && !hasAutoJoined.current) {
      hasAutoJoined.current = true;
      joinRoom().catch(console.error);
    }
  }, [joinRoom, roomId]);

  if (!roomId) {
    return (
      <section className="rounded-[20px] border border-slate-200 bg-white px-5 py-10 text-center">
        <FiMonitor className="mx-auto h-8 w-8 text-slate-400" />
        <h3 className="mt-3 text-lg font-semibold text-slate-900">No room selected</h3>
        <p className="mt-1 text-sm text-slate-500">
          Create a room or switch to an active room to start monitoring students.
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[20px] border border-red-200 bg-red-50 px-5 py-5 text-sm text-red-700">
        {error}
      </section>
    );
  }

  return (
    <section className="self-start rounded-[20px] border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Live monitoring</h2>
            <p className="mt-1 text-sm text-slate-600">
              Click a student tile to view warnings and attempt details.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700">
              <FiWifi className="h-4 w-4" />
              {isConnected ? 'Connected' : 'Connecting'}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700">
              <FiUsers className="h-4 w-4" />
              {totalFeeds} student{totalFeeds === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 py-5">
        {totalFeeds === 0 ? (
          <div className="flex min-h-[110px] items-center justify-center rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
            Waiting for students to join this room.
          </div>
        ) : null}

        {totalFeeds > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {hasWebRtcFeeds
              ? videoStreams.map((streamInfo) => {
                  const peer = peers.find((participant) => participant.peerId === streamInfo.peerId);
                  if (!peer) {
                    return null;
                  }

                  const isSelected = selectedStudentName === peer.studentName;

                  return (
                    <button
                      key={`${streamInfo.peerId}-${streamInfo.producerId}`}
                      type="button"
                      onClick={() =>
                        onStudentSelect?.({
                          userId: peer.userId || null,
                          studentName: peer.studentName,
                        })
                      }
                      className={`overflow-hidden rounded-[18px] border text-left ${
                        isSelected ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200'
                      }`}
                    >
                      <div className="aspect-video bg-slate-950">
                        <VideoStream
                          stream={streamInfo.stream}
                          studentName={peer.studentName}
                          peerId={peer.peerId}
                          isProducing={peer.isProducing}
                          connectionState={peer.connectionState}
                          videoEnabled={peer.videoEnabled}
                          audioEnabled={peer.audioEnabled}
                          statusLabel={findRoomStudent({ studentName: peer.studentName })?.status}
                        />
                      </div>
                    </button>
                  );
                })
              : snapshotFeeds.map((feed) => {
                  const isSelected = selectedStudentName === feed.studentName;
                  const roomStudent = findRoomStudent({
                    attemptId: feed.attemptId,
                    userId: feed.userId,
                    studentName: feed.studentName,
                  });
                  const isFinished =
                    roomStudent?.status === 'submitted' || roomStudent?.status === 'terminated';
                  const snapshotLabel =
                    roomStudent?.status === 'submitted'
                      ? 'Exam submitted'
                      : roomStudent?.status === 'terminated'
                      ? 'Exam ended'
                      : Date.now() - feed.updatedAt > SNAPSHOT_STALE_THRESHOLD_MS
                      ? 'Reconnecting'
                      : 'Live snapshot';

                  return (
                    <button
                      key={feed.feedId}
                      type="button"
                      onClick={() =>
                        onStudentSelect?.({
                          attemptId: feed.attemptId,
                          userId: feed.userId,
                          studentName: feed.studentName,
                        })
                      }
                      className={`overflow-hidden rounded-[18px] border text-left ${
                        isSelected ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200'
                      }`}
                    >
                      <div className="aspect-video bg-slate-950">
                        <img
                          src={feed.imageDataUrl}
                          alt={`${feed.studentName} monitoring snapshot`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{feed.studentName}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {snapshotLabel}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500">
                          {isFinished
                            ? roomStudent?.submittedAt
                              ? 'Done'
                              : 'Finished'
                            : `${Math.max(0, Math.round((Date.now() - feed.updatedAt) / 1000))}s`}
                        </span>
                      </div>
                    </button>
                  );
                })}

            {statusOnlyStudents.map(student => {
              const isSelected = selectedStudentName === student.studentName;
              const statusLabel =
                student.status === 'submitted' ? 'Exam submitted' : 'Exam ended';

              return (
                <button
                  key={`status-only-${student.enrollmentId}`}
                  type="button"
                  onClick={() =>
                    onStudentSelect?.({
                      enrollmentId: student.enrollmentId,
                      attemptId: student.attemptId,
                      userId: student.userId,
                      studentName: student.studentName,
                      studentEmail: student.studentEmail,
                    })
                  }
                  className={`overflow-hidden rounded-[18px] border text-left ${
                    isSelected ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200'
                  }`}
                >
                  <div className="flex aspect-video items-center justify-center bg-slate-100 px-5 text-center">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{student.studentName}</p>
                      <p className="mt-2 text-sm text-slate-600">{statusLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{student.studentName}</p>
                      <p className="mt-1 text-xs text-slate-500">{student.studentEmail}</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {student.status === 'submitted' ? 'Submitted' : 'Ended'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
};
