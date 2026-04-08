"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiActivity,
  FiClock,
  FiCopy,
  FiExternalLink,
  FiLoader,
  FiMonitor,
  FiPlus,
  FiSave,
  FiShield,
  FiSlash,
  FiTrash2,
  FiUsers,
  FiVideo,
  FiX
} from "react-icons/fi";

import { AlertPanel } from "@components/AlertPanel";
import { RoomCreationModal } from "@components/RoomCreationModal";
import { RoomSelector } from "@components/RoomSelector";
import { StudentsGrid } from "@components/StudentsGrid";
import { useActiveRooms, useAttempts, useExams } from "@/hooks/useTeacherData";
import { backendAPI, type ProctoringRoomSummary } from "@/lib/backend";

const LAST_ROOM_STORAGE_KEY = "teacher-monitoring:last-room-code";

function formatRoomTimestamp(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function getDesktopInviteLink(roomCode: string) {
  return `proctor://room/${roomCode}`;
}

function getStudentLaunchLink(roomCode: string) {
  if (typeof window === "undefined") {
    return `/student-demo?code=${encodeURIComponent(roomCode)}`;
  }

  return new URL(`/student-demo?code=${encodeURIComponent(roomCode)}`, window.location.origin).toString();
}

export default function LiveMonitoringPage() {
  const { attempts } = useAttempts({
    status: "in_progress",
    limit: 25
  });
  const { exams } = useExams();
  const { rooms, isLoading: roomsLoading, refetch: refetchRooms } = useActiveRooms();

  const [currentRoomCode, setCurrentRoomCode] = useState<string | undefined>(undefined);
  const [currentRoomLabelFallback, setCurrentRoomLabelFallback] = useState("No room selected");
  const [isRoomSelectorOpen, setIsRoomSelectorOpen] = useState(false);
  const [isRoomCreationOpen, setIsRoomCreationOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<"code" | "launch" | "invite" | null>(null);
  const [isClosingRoom, setIsClosingRoom] = useState(false);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [roomActionError, setRoomActionError] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [editingCapacity, setEditingCapacity] = useState<number>(15);
  const [isUpdatingCapacity, setIsUpdatingCapacity] = useState(false);
  const hasHydratedRoom = useRef(false);

  const suspiciousCount = attempts.filter((attempt) => attempt.violationCount >= 5).length;
  const currentRoom = useMemo(
    () => rooms.find((room) => room.roomCode === currentRoomCode) ?? null,
    [rooms, currentRoomCode]
  );
  const activeRoomCode = currentRoomCode;
  const currentRoomLabel = currentRoom?.examName ?? currentRoomLabelFallback;
  const currentRoomLaunchLink = currentRoom ? getStudentLaunchLink(currentRoom.roomCode) : "";
  const currentRoomInviteLink = currentRoom ? getDesktopInviteLink(currentRoom.roomCode) : "";

  useEffect(() => {
    if (typeof window === "undefined" || hasHydratedRoom.current || roomsLoading) {
      return;
    }

    hasHydratedRoom.current = true;

    const storedRoomCode = window.localStorage.getItem(LAST_ROOM_STORAGE_KEY);
    const matchedRoom = rooms.find((room) => room.roomCode === storedRoomCode) || rooms[0];

    if (matchedRoom) {
      setCurrentRoomCode(matchedRoom.roomCode);
      setCurrentRoomLabelFallback(matchedRoom.examName);
    }
  }, [rooms, roomsLoading]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (currentRoomCode) {
      window.localStorage.setItem(LAST_ROOM_STORAGE_KEY, currentRoomCode);
    } else {
      window.localStorage.removeItem(LAST_ROOM_STORAGE_KEY);
    }
  }, [currentRoomCode]);

  useEffect(() => {
    if (roomsLoading) {
      return;
    }

    if (currentRoom) {
      setCurrentRoomLabelFallback(currentRoom.examName);
      return;
    }

    if (rooms.length > 0 && !currentRoomCode) {
      setCurrentRoomCode(rooms[0].roomCode);
      setCurrentRoomLabelFallback(rooms[0].examName);
      return;
    }

    if (currentRoomCode && rooms.length > 0) {
      setCurrentRoomCode(rooms[0].roomCode);
      setCurrentRoomLabelFallback(rooms[0].examName);
      return;
    }

    if (rooms.length === 0) {
      setCurrentRoomLabelFallback("No room selected");
    }
  }, [currentRoom, currentRoomCode, rooms, roomsLoading]);

  const workspaceStats = [
    {
      label: "Students in session",
      value: attempts.length,
      icon: <FiUsers className="h-4 w-4" />
    },
    {
      label: "Open alerts",
      value: attempts.filter((attempt) => attempt.violationCount > 0).length,
      icon: <FiActivity className="h-4 w-4" />
    },
    {
      label: "Priority cases",
      value: suspiciousCount,
      icon: <FiShield className="h-4 w-4" />
    }
  ];

  const handleRoomSelect = useCallback((room: ProctoringRoomSummary) => {
    setCurrentRoomCode(room.roomCode);
    setCurrentRoomLabelFallback(room.examName);
    setRoomActionError(null);
  }, []);

  const handleRoomCreated = useCallback(
    (room: {
      roomId: number;
      roomCode: string;
      inviteLink: string;
      examName: string;
      courseName: string;
      launchLink: string;
    }) => {
      setCurrentRoomCode(room.roomCode);
      setCurrentRoomLabelFallback(room.examName);
      setRoomActionError(null);
      refetchRooms().catch(console.error);
    },
    [refetchRooms]
  );

  const handleCopy = useCallback(async (value: string, kind: "code" | "launch" | "invite") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(kind);
      window.setTimeout(() => setCopiedField(null), 1800);
    } catch (error) {
      console.error("[Monitoring] Failed to copy room value:", error);
      setRoomActionError("Unable to copy that value right now.");
    }
  }, []);

  const handleCloseCurrentRoom = useCallback(async () => {
    if (!currentRoom) {
      return;
    }

    const confirmed = window.confirm(
      `Close room ${currentRoom.roomCode} for ${currentRoom.examName}? Students will no longer be able to join it.`
    );

    if (!confirmed) {
      return;
    }

    setIsClosingRoom(true);
    setRoomActionError(null);

    try {
      await backendAPI.closeRoom(currentRoom.id);
      const refreshedResponse = await backendAPI.getActiveRooms();
      const remainingRooms = refreshedResponse.data;

      setCurrentRoomCode(remainingRooms[0]?.roomCode);
      setCurrentRoomLabelFallback(remainingRooms[0]?.examName ?? "No room selected");
      await refetchRooms();
    } catch (error) {
      console.error("[Monitoring] Failed to close room:", error);
      setRoomActionError(error instanceof Error ? error.message : "Failed to close room");
    } finally {
      setIsClosingRoom(false);
    }
  }, [currentRoom, refetchRooms]);

  const handleDeleteRoom = useCallback(async (room: ProctoringRoomSummary) => {
    const confirmed = window.confirm(
      `Delete room ${room.roomCode} for ${room.examName}? This removes the room from the dashboard and students will not be able to rejoin it.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeletingRoom(true);
    setRoomActionError(null);

    try {
      await backendAPI.deleteRoom(room.id);
      const refreshedResponse = await backendAPI.getActiveRooms();
      const remainingRooms = refreshedResponse.data;

      if (currentRoomCode === room.roomCode) {
        setCurrentRoomCode(remainingRooms[0]?.roomCode);
        setCurrentRoomLabelFallback(remainingRooms[0]?.examName ?? "No room selected");
      }

      await refetchRooms();
    } catch (error) {
      console.error("[Monitoring] Failed to delete room:", error);
      setRoomActionError(error instanceof Error ? error.message : "Failed to delete room");
    } finally {
      setIsDeletingRoom(false);
    }
  }, [currentRoomCode, refetchRooms]);

  return (
    <section className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <article className="surface-panel section-card">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <span className="eyebrow-pill">Monitoring workspace</span>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                    Run teacher rooms from one calmer control desk
                  </h2>
                  <p className="section-copy mt-3 max-w-2xl">
                    Create rooms, switch active sessions, share launch details, and keep the student wall open without bouncing between separate tools.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRoomCreationOpen(true)}
                    className="btn-primary"
                  >
                    <FiPlus className="h-4 w-4" />
                    Create room
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRoomSelectorOpen(true)}
                    className="btn-secondary"
                  >
                    <FiVideo className="h-4 w-4" />
                    Switch room
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {activeRoomCode ? (
                  <span className="info-chip font-mono uppercase tracking-[0.16em]">
                    Room {activeRoomCode}
                  </span>
                ) : null}
                <span className="info-chip">{currentRoomLabel}</span>
                <span className="info-chip">
                  <FiShield className="h-3.5 w-3.5" />
                  Live proctoring session
                </span>
                <span className="info-chip">
                  <FiMonitor className="h-3.5 w-3.5" />
                  {rooms.length} active room{rooms.length === 1 ? "" : "s"}
                </span>
              </div>

              {roomActionError ? (
                <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-4 text-sm font-medium text-red-700">
                  {roomActionError}
                </div>
              ) : null}

              {!activeRoomCode && (
                <div className="surface-subtle flex items-center gap-3 rounded-[24px] px-4 py-4 text-slate-700">
                  {roomsLoading ? (
                    <FiLoader className="h-4 w-4 animate-spin text-emerald-700" />
                  ) : (
                    <FiVideo className="h-4 w-4 text-emerald-700" />
                  )}
                  <p className="text-sm font-medium">
                    {roomsLoading
                      ? "Checking for active rooms and restoring your last monitoring session."
                      : "No active room is selected yet. Create one or switch to an active room to start monitoring."}
                  </p>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                {workspaceStats.map((stat) => (
                  <div key={stat.label} className="metric-card">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-sm font-medium">{stat.label}</span>
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                        {stat.icon}
                      </span>
                    </div>
                    <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="surface-subtle rounded-[24px] px-4 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Exam launch lineup</p>
                    <p className="mt-1 text-sm text-slate-500">
                      All available exams stay visible here so creating the next room does not feel like a one-exam workflow.
                    </p>
                  </div>
                  <span className="info-chip">{exams.length} exams available</span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {exams.slice(0, 6).map((exam) => (
                    <div key={exam.id} className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
                      <p className="text-sm font-semibold text-slate-950">{exam.examName}</p>
                      <p className="mt-1 text-sm text-slate-500">{exam.courseName}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        <span>{exam.durationMinutes} min</span>
                        <span>{exam.totalAttempts ?? 0} attempts</span>
                        <span>{exam.activeAttempts ?? 0} active</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.95fr)]">
            <article className="surface-panel section-card">
              {currentRoom ? (
                <div className="space-y-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <span className="eyebrow-pill">Current room</span>
                      <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                        {currentRoom.examName}
                      </h3>
                      <p className="mt-2 text-sm text-slate-500">{currentRoom.courseName}</p>
                    </div>

                    <div className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-white">
                      {currentRoom.roomCode}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="surface-card rounded-[22px] px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Students
                      </p>
                      <p className="mt-3 inline-flex items-center gap-2 text-xl font-semibold text-slate-950">
                        <FiUsers className="h-5 w-5 text-emerald-700" />
                        {currentRoom.studentCount}
                      </p>
                    </div>
                    <div className="surface-card rounded-[22px] px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Duration
                      </p>
                      <p className="mt-3 inline-flex items-center gap-2 text-xl font-semibold text-slate-950">
                        <FiClock className="h-5 w-5 text-emerald-700" />
                        {currentRoom.durationMinutes} min
                      </p>
                    </div>
                    <div className="surface-card rounded-[22px] px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Live since
                      </p>
                      <p className="mt-3 text-base font-semibold text-slate-950">
                        {formatRoomTimestamp(currentRoom.activatedAt ?? currentRoom.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="surface-subtle rounded-[24px] px-4 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">Quick room actions</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Share student entry details or close this room when the session is done.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(currentRoom.roomCode, "code")}
                          className="btn-secondary px-3 py-3"
                        >
                          <FiCopy className="h-4 w-4" />
                          {copiedField === "code" ? "Code copied" : "Copy code"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(currentRoomLaunchLink, "launch")}
                          className="btn-secondary px-3 py-3"
                        >
                          <FiExternalLink className="h-4 w-4" />
                          {copiedField === "launch" ? "Link copied" : "Copy launch link"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(currentRoomInviteLink, "invite")}
                          className="btn-secondary px-3 py-3"
                        >
                          <FiCopy className="h-4 w-4" />
                          {copiedField === "invite" ? "Invite copied" : "Copy desktop link"}
                        </button>
                        <button
                          type="button"
                          onClick={handleCloseCurrentRoom}
                          disabled={isClosingRoom}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isClosingRoom ? (
                            <>
                              <FiLoader className="h-4 w-4 animate-spin" />
                              Closing...
                            </>
                          ) : (
                            <>
                              <FiSlash className="h-4 w-4" />
                              End room
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteRoom(currentRoom)}
                          disabled={isDeletingRoom}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDeletingRoom ? (
                            <>
                              <FiLoader className="h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <FiTrash2 className="h-4 w-4" />
                              Delete room
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state px-6 py-14">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                    <FiVideo className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">
                    No room live on your desk yet
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Create a room to get the student launch details and open the camera wall automatically.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsRoomCreationOpen(true)}
                    className="btn-primary mt-5"
                  >
                    <FiPlus className="h-4 w-4" />
                    Create first room
                  </button>
                </div>
              )}
            </article>

            <article className="surface-panel section-card">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="eyebrow-pill">Active rooms</span>
                    <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
                      Switch rooms without losing context
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Your open rooms stay here so you can jump to another live exam fast.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => refetchRooms()}
                    className="btn-secondary px-3 py-3"
                    disabled={roomsLoading}
                  >
                    {roomsLoading ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiActivity className="h-4 w-4" />}
                    Refresh
                  </button>
                </div>

                {roomsLoading ? (
                  <div className="empty-state flex items-center justify-center gap-3">
                    <FiLoader className="h-5 w-5 animate-spin text-emerald-700" />
                    <span>Loading rooms...</span>
                  </div>
                ) : rooms.length === 0 ? (
                  <div className="empty-state">
                    There are no active rooms yet. Create one and it will appear here for quick switching.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rooms.slice(0, 5).map((room) => {
                      const isCurrent = room.roomCode === currentRoomCode;

                      return (
                        <div
                          key={room.id}
                          className={[
                            "rounded-[22px] border px-4 py-4 transition-all duration-200",
                            isCurrent
                              ? "border-slate-950 bg-slate-950 text-white"
                              : "border-slate-200 bg-white/90"
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => handleRoomSelect(room)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <p className="truncate text-base font-semibold">{room.examName}</p>
                              <p className={["mt-1 text-sm", isCurrent ? "text-slate-300" : "text-slate-500"].join(" ")}>
                                {room.courseName}
                              </p>
                              <div
                                className={[
                                  "mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]",
                                  isCurrent ? "text-slate-300" : "text-slate-400"
                                ].join(" ")}
                              >
                                <span>{room.studentCount} students</span>
                                {editingRoomId === room.id ? (
                                  <span className="inline-flex items-center gap-1">
                                    <span>/</span>
                                    <input
                                      type="number"
                                      min="1"
                                      max="100"
                                      value={editingCapacity}
                                      onChange={(e) => setEditingCapacity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                                      className={[
                                        "w-16 rounded border px-1.5 py-0.5 text-center font-semibold",
                                        isCurrent
                                          ? "border-white/30 bg-white/10 text-white focus:border-white/50 focus:outline-none"
                                          : "border-slate-300 bg-white text-slate-950 focus:border-emerald-600 focus:outline-none"
                                      ].join(" ")}
                                      disabled={isUpdatingCapacity}
                                    />
                                    <button
                                      type="button"
                                      onClick={handleSaveCapacity}
                                      disabled={isUpdatingCapacity || editingCapacity < room.studentCount}
                                      className={[
                                        "inline-flex items-center gap-1 rounded px-2 py-0.5 transition-colors",
                                        isCurrent
                                          ? "bg-white/20 text-white hover:bg-white/30 disabled:opacity-50"
                                          : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                                      ].join(" ")}
                                    >
                                      <FiSave className="h-3 w-3" />
                                      {isUpdatingCapacity ? "Saving..." : "Save"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditingCapacity}
                                      disabled={isUpdatingCapacity}
                                      className={[
                                        "inline-flex items-center gap-1 rounded px-2 py-0.5 transition-colors",
                                        isCurrent
                                          ? "bg-white/20 text-white hover:bg-white/30 disabled:opacity-50"
                                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                                      ].join(" ")}
                                    >
                                      <FiX className="h-3 w-3" />
                                    </button>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1">
                                    <span>/ {room.capacity} max</span>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditingCapacity(room)}
                                      className={[
                                        "ml-1 inline-flex items-center gap-1 rounded px-2 py-0.5 transition-colors",
                                        isCurrent
                                          ? "bg-white/20 text-white hover:bg-white/30"
                                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                      ].join(" ")}
                                    >
                                      Edit
                                    </button>
                                  </span>
                                )}
                                <span>{room.durationMinutes} min</span>
                                <span>{room.roomCode}</span>
                              </div>
                            </button>

                            <div className="flex flex-col items-end gap-2">
                              <span
                                className={[
                                  "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                                  isCurrent
                                    ? "border border-white/10 bg-white/10 text-white"
                                    : "bg-emerald-100 text-emerald-800"
                                ].join(" ")}
                              >
                                {isCurrent ? "Current" : "Open"}
                              </span>
                              <button
                                type="button"
                                onClick={() => void handleDeleteRoom(room)}
                                className={[
                                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                                  isCurrent
                                    ? "border border-white/10 bg-white/10 text-white"
                                    : "border border-slate-200 bg-slate-50 text-slate-600"
                                ].join(" ")}
                              >
                                <FiTrash2 className="h-3 w-3" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {rooms.length > 5 ? (
                      <button
                        type="button"
                        onClick={() => setIsRoomSelectorOpen(true)}
                        className="btn-secondary w-full"
                      >
                        <FiVideo className="h-4 w-4" />
                        View all active rooms
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </article>
          </div>

          <StudentsGrid roomId={activeRoomCode} />
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <AlertPanel />
        </div>
      </div>

      <RoomSelector
        isOpen={isRoomSelectorOpen}
        onClose={() => setIsRoomSelectorOpen(false)}
        currentRoomCode={currentRoomCode}
        onRoomSelect={handleRoomSelect}
      />

      <RoomCreationModal
        isOpen={isRoomCreationOpen}
        onClose={() => setIsRoomCreationOpen(false)}
        onRoomCreated={handleRoomCreated}
      />
    </section>
  );
}
