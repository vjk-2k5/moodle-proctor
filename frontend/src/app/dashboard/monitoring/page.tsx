"use client";

import { useCallback, useState } from "react";
import { FiActivity, FiPlus, FiShield, FiUsers, FiVideo } from "react-icons/fi";

import { AlertPanel } from "@components/AlertPanel";
import { RoomCreationModal } from "@components/RoomCreationModal";
import { RoomSelector, type ProctoringRoomSummary } from "@components/RoomSelector";
import { StudentsGrid } from "@components/StudentsGrid";
import { useAttempts } from "@/hooks/useTeacherData";

export default function LiveMonitoringPage() {
  const { attempts } = useAttempts({
    status: "in_progress",
    limit: 25
  });

  const [currentRoomCode, setCurrentRoomCode] = useState<string | undefined>(undefined);
  const [currentRoomLabel, setCurrentRoomLabel] = useState<string>("exam-monitoring-room");
  const [isRoomSelectorOpen, setIsRoomSelectorOpen] = useState(false);
  const [isRoomCreationOpen, setIsRoomCreationOpen] = useState(false);

  const suspiciousCount = attempts.filter((attempt) => attempt.violationCount >= 5).length;

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
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <div className="dashboard-panel rounded-[28px] p-5 md:p-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="dashboard-kicker">Monitoring Workspace</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                    Live proctoring board for the active exam room
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    The monitoring workspace is now driven by real attempts and lets you switch to
                    an activated room instead of relying on static demo data.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRoomCreationOpen(true)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    <FiPlus className="h-4 w-4" />
                    Create room
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRoomSelectorOpen(true)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <FiVideo className="h-4 w-4" />
                    Switch room
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Active room
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-900">
                  {currentRoomCode || "exam-monitoring-room"}
                </span>
                <span className="text-sm text-slate-500">{currentRoomLabel}</span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {workspaceStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                  >
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-sm font-medium">{stat.label}</span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        {stat.icon}
                      </span>
                    </div>
                    <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <StudentsGrid roomId={currentRoomCode || "exam-monitoring-room"} />
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
