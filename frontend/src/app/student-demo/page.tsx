'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useWebRTCProducer } from '@/hooks/useWebRTCProducer';

const ROOM_SESSION_STORAGE_KEY = 'student-demo-room-session';

interface JoinedRoomSession {
  enrollmentId: number;
  roomId: number;
  roomCode: string;
  examName: string;
  courseName: string;
  status: string;
  enrollmentSignature: string;
  studentName: string;
  studentEmail: string;
}

interface StudentJoinResponse {
  success: boolean;
  data?: {
    enrollmentId: number;
    roomId: number;
    roomCode: string;
    examName: string;
    courseName: string;
    status: string;
    enrollmentSignature: string;
  };
  error?: string;
}

function LocalVideoPreview({ stream }: { stream: MediaStream | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Local Preview</p>
          <p className="text-xs text-slate-500">This is what the monitoring workspace should receive.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          muted locally
        </span>
      </div>
      <div className="aspect-video bg-slate-950">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Start the broadcast to preview your camera feed.
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentDemoPage() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  const stablePeerId = useRef(`student-${Date.now()}`);

  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [studentNameInput, setStudentNameInput] = useState('');
  const [studentEmailInput, setStudentEmailInput] = useState('');
  const [joinedRoom, setJoinedRoom] = useState<JoinedRoomSession | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [hasLoadedStoredRoom, setHasLoadedStoredRoom] = useState(false);

  const normalizedRoomCode = useMemo(() => roomCodeInput.trim().toUpperCase(), [roomCodeInput]);
  const normalizedStudentName = useMemo(
    () => studentNameInput.trim() || 'Student',
    [studentNameInput]
  );
  const normalizedStudentEmail = useMemo(
    () => studentEmailInput.trim().toLowerCase(),
    [studentEmailInput]
  );

  const requestHeaders = useMemo<HeadersInit | undefined>(() => {
    if (!joinedRoom) {
      return undefined;
    }

    return {
      'X-Room-Enrollment-Id': joinedRoom.enrollmentId.toString(),
      'X-Room-Id': joinedRoom.roomId.toString(),
      'X-Room-Code': joinedRoom.roomCode,
      'X-Student-Email': joinedRoom.studentEmail,
      'X-Room-Enrollment-Signature': joinedRoom.enrollmentSignature,
    };
  }, [joinedRoom]);

  const {
    localStream,
    isConnected,
    isProducing,
    error,
    startBroadcast,
    stopBroadcast,
  } = useWebRTCProducer({
    roomId: joinedRoom?.roomCode || 'pending-room',
    peerId: stablePeerId.current,
    studentName: joinedRoom?.studentName || normalizedStudentName,
    backendUrl,
    requestHeaders,
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const storedRoom = sessionStorage.getItem(ROOM_SESSION_STORAGE_KEY);
      if (!storedRoom) {
        setHasLoadedStoredRoom(true);
        return;
      }

      const parsedRoom = JSON.parse(storedRoom) as JoinedRoomSession;
      setJoinedRoom(parsedRoom);
      setRoomCodeInput(parsedRoom.roomCode);
      setStudentNameInput(parsedRoom.studentName);
      setStudentEmailInput(parsedRoom.studentEmail);
    } catch (storageError) {
      console.error('Failed to restore saved room session:', storageError);
      sessionStorage.removeItem(ROOM_SESSION_STORAGE_KEY);
    } finally {
      setHasLoadedStoredRoom(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasLoadedStoredRoom) {
      return;
    }

    if (joinedRoom) {
      sessionStorage.setItem(ROOM_SESSION_STORAGE_KEY, JSON.stringify(joinedRoom));
      return;
    }

    sessionStorage.removeItem(ROOM_SESSION_STORAGE_KEY);
  }, [hasLoadedStoredRoom, joinedRoom]);

  const handleJoinRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!normalizedRoomCode || !normalizedStudentEmail) {
      setJoinError('Enter the room code and student email before joining.');
      return;
    }

    try {
      setIsJoining(true);
      setJoinError(null);

      const response = await fetch(`${backendUrl}/api/room/${encodeURIComponent(normalizedRoomCode)}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentName: normalizedStudentName,
          studentEmail: normalizedStudentEmail,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as StudentJoinResponse;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || `Failed to join room (${response.status})`);
      }

      setJoinedRoom({
        ...payload.data,
        roomCode: payload.data.roomCode.toUpperCase(),
        studentName: normalizedStudentName,
        studentEmail: normalizedStudentEmail,
      });
      setRoomCodeInput(payload.data.roomCode.toUpperCase());
    } catch (joinRequestError) {
      setJoinError(
        joinRequestError instanceof Error ? joinRequestError.message : 'Failed to join room.'
      );
    } finally {
      setIsJoining(false);
    }
  };

  const handleStartBroadcast = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!joinedRoom) {
      setJoinError('Join the room first so the broadcast can be attached to your enrollment.');
      return;
    }

    await startBroadcast();
  };

  const handleResetSession = async () => {
    await stopBroadcast();
    setJoinedRoom(null);
    setJoinError(null);
  };

  const joinedStatus = joinedRoom ? `Joined ${joinedRoom.roomCode}` : 'Not joined';

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="dashboard-panel overflow-hidden rounded-[32px] px-6 py-6 sm:px-8 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-4">
              <span className="inline-flex rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                Student Room Client
              </span>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Join your proctoring room and publish camera + mic
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  Enter the invite code from the monitoring dashboard, save your enrollment in this
                  browser tab, and stream directly into the matching live room.
                </p>
              </div>

              <form
                onSubmit={handleJoinRoom}
                className="grid gap-4 rounded-[24px] border border-slate-200 bg-white p-5"
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-900">Room code</span>
                    <input
                      value={roomCodeInput}
                      onChange={event => setRoomCodeInput(event.target.value.toUpperCase())}
                      disabled={Boolean(joinedRoom)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm uppercase text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                      placeholder="AB12CD34"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-900">Student name</span>
                    <input
                      value={studentNameInput}
                      onChange={event => setStudentNameInput(event.target.value)}
                      disabled={Boolean(joinedRoom)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                      placeholder="Aarav Sharma"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-900">Student email</span>
                    <input
                      value={studentEmailInput}
                      onChange={event => setStudentEmailInput(event.target.value)}
                      disabled={Boolean(joinedRoom)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                      placeholder="student@example.com"
                      type="email"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={Boolean(joinedRoom) || isJoining}
                    className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                  >
                    {joinedRoom ? 'Joined' : isJoining ? 'Joining...' : 'Join room'}
                  </button>

                  {joinedRoom ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleResetSession().catch(console.error);
                      }}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                    >
                      Reset saved session
                    </button>
                  ) : null}

                  <div className="ml-auto flex flex-wrap gap-2 text-xs font-semibold">
                    <span
                      className={`rounded-full px-3 py-1 ${
                        joinedRoom ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      room: {joinedStatus}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 ${
                        isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      transport: {isConnected ? 'connected' : 'waiting'}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 ${
                        isProducing ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      media: {isProducing ? 'publishing' : 'idle'}
                    </span>
                  </div>
                </div>

                {joinedRoom ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <p className="font-semibold">{joinedRoom.examName}</p>
                    <p className="mt-1">
                      {joinedRoom.courseName} • Room {joinedRoom.roomCode} • Enrollment #{joinedRoom.enrollmentId}
                    </p>
                  </div>
                ) : null}

                {joinError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {joinError}
                  </div>
                ) : null}
              </form>

              <form
                onSubmit={handleStartBroadcast}
                className="grid gap-4 rounded-[24px] border border-slate-200 bg-white p-5"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">Broadcast controls</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Start after the room join succeeds. The teacher dashboard should be watching the
                    same room code.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={!joinedRoom}
                    className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                  >
                    {isProducing ? 'Restart broadcast' : 'Start broadcast'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopBroadcast().catch(console.error);
                    }}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    Stop broadcast
                  </button>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}
              </form>
            </div>

            <LocalVideoPreview stream={localStream} />
          </div>
        </section>
      </div>
    </main>
  );
}
