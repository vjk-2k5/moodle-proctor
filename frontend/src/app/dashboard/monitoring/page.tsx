"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FiActivity, FiLoader, FiPlus, FiShield, FiUsers, FiVideo } from "react-icons/fi";

import { AlertPanel } from "@components/AlertPanel";
import { RoomCreationModal } from "@components/RoomCreationModal";
import { StudentsGrid } from "@components/StudentsGrid";
import { RoomSelector } from "@components/RoomSelector";
import { useActiveRooms, useAttempts } from "@/hooks/useTeacherData";
import type { ProctoringRoomSummary } from "@/lib/backend";

const LAST_ROOM_STORAGE_KEY = "teacher-monitoring:last-room-code";

export default function LiveMonitoringPage() {
  const { attempts } = useAttempts({
    status: "in_progress",
    limit: 25
  });
  const { rooms, isLoading: roomsLoading } = useActiveRooms();

  const [currentRoomCode, setCurrentRoomCode] = useState<string | undefined>(undefined);
  const [currentRoomLabel, setCurrentRoomLabel] = useState<string>("No room selected");
  const [isRoomSelectorOpen, setIsRoomSelectorOpen] = useState(false);
  const [isRoomCreationOpen, setIsRoomCreationOpen] = useState(false);
  const hasHydratedRoom = useRef(false);

  const suspiciousCount = attempts.filter((attempt) => attempt.violationCount >= 5).length;
  const activeRoomCode = currentRoomCode;

  useEffect(() => {
    if (typeof window === "undefined" || hasHydratedRoom.current || roomsLoading) {
      return;
    }

    hasHydratedRoom.current = true;

    const storedRoomCode = window.localStorage.getItem(LAST_ROOM_STORAGE_KEY);
    const matchedRoom =
      rooms.find((room) => room.roomCode === storedRoomCode) ||
      rooms[0];

    if (matchedRoom) {
      setCurrentRoomCode(matchedRoom.roomCode);
      setCurrentRoomLabel(matchedRoom.examName);
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
    setCurrentRoomLabel(room.examName);
  }, []);

  const handleRoomCreated = useCallback((room: { roomId: number; roomCode: string; inviteLink: string }) => {
    setCurrentRoomCode(room.roomCode);
    setCurrentRoomLabel(`Room ${room.roomCode}`);
    console.log("[Monitoring] Room created:", room);
  }, []);

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
                    Stay with the room that needs your eyes
                  </h2>
                  <p className="section-copy mt-3 max-w-2xl">
                    The live monitoring page keeps the room controls, camera wall, and active alert
                    queue together without repeating dashboard clutter.
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
              </div>

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
            </div>
          </article>

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
