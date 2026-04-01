"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiCalendar,
  FiClock,
  FiLoader,
  FiRefreshCw,
  FiSearch,
  FiUsers,
  FiVideo,
  FiX
} from "react-icons/fi";

import { useActiveRooms } from "@/hooks/useTeacherData";
import type { ProctoringRoomSummary } from "@/lib/backend";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentRoomCode?: string;
  onRoomSelect: (room: ProctoringRoomSummary) => void;
}

function formatRoomTime(value: string | null) {
  if (!value) {
    return "Waiting for activation";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export const RoomSelector = ({
  isOpen,
  onClose,
  currentRoomCode,
  onRoomSelect
}: Props) => {
  const [isSwitching, setIsSwitching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { rooms, isLoading, error, refetch } = useActiveRooms();

  const filteredRooms = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return rooms;
    }

    return rooms.filter((room) =>
      [room.examName, room.courseName, room.roomCode].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [rooms, searchTerm]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSwitching) {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSwitching, onClose]);

  useEffect(() => {
    if (isOpen) {
      refetch();
    } else {
      setSearchTerm("");
    }
  }, [isOpen, refetch]);

  const handleRoomSelect = (room: ProctoringRoomSummary) => {
    if (room.roomCode === currentRoomCode) {
      onClose();
      return;
    }

    setIsSwitching(true);

    window.setTimeout(() => {
      onRoomSelect(room);
      setIsSwitching(false);
      onClose();
    }, 220);
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSwitching) {
          onClose();
        }
      }}
    >
      <div className="modal-shell max-h-[88vh] max-w-4xl overflow-hidden rounded-[30px]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-6 py-5">
          <div>
            <span className="eyebrow-pill">Room switcher</span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
              Move between live rooms quickly
            </h2>
            <p className="section-copy mt-2 max-w-2xl">
              Search by room code, exam, or course and switch the monitoring wall without leaving this workspace.
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost rounded-full p-2"
            disabled={isSwitching}
            aria-label="Close room selector"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[68vh] overflow-y-auto px-6 py-5 scroll-thin">
          <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block flex-1">
              <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search active rooms"
                className="input-field pl-11"
              />
            </label>

            <div className="flex items-center gap-2">
              <span className="info-chip">{filteredRooms.length} visible rooms</span>
              <button
                type="button"
                onClick={() => refetch()}
                className="btn-secondary px-3 py-3"
                disabled={isLoading}
              >
                <FiRefreshCw className={["h-4 w-4", isLoading ? "animate-spin" : ""].join(" ")} />
                Refresh
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="empty-state flex items-center justify-center gap-3">
              <FiLoader className="h-5 w-5 animate-spin text-emerald-700" />
              <span>Loading active rooms...</span>
            </div>
          ) : error ? (
            <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-4 text-sm font-medium text-red-700">
              {error.message}
            </div>
          ) : rooms.length === 0 ? (
            <div className="empty-state">No active rooms found yet. Create a room to get started.</div>
          ) : filteredRooms.length === 0 ? (
            <div className="empty-state">No active rooms match that search yet.</div>
          ) : (
            <div className="space-y-3">
              {filteredRooms.map((room) => {
                const isCurrentRoom = room.roomCode === currentRoomCode;

                return (
                  <button
                    key={room.id}
                    onClick={() => handleRoomSelect(room)}
                    disabled={isSwitching}
                    className={[
                      "w-full rounded-[24px] border p-4 text-left transition-all duration-200",
                      isCurrentRoom
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white/90 hover:border-slate-300 hover:bg-white",
                      isSwitching ? "cursor-wait opacity-70" : ""
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold">{room.examName}</h3>
                          {isCurrentRoom ? (
                            <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                              Current room
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800">
                              Active
                            </span>
                          )}
                        </div>

                        <p
                          className={[
                            "mt-1 text-sm",
                            isCurrentRoom ? "text-slate-300" : "text-slate-500"
                          ].join(" ")}
                        >
                          {room.courseName}
                        </p>

                        <div
                          className={[
                            "mt-3 flex flex-wrap items-center gap-3 text-sm",
                            isCurrentRoom ? "text-slate-300" : "text-slate-600"
                          ].join(" ")}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <FiUsers className="h-4 w-4" />
                            {room.studentCount} students
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <FiClock className="h-4 w-4" />
                            {room.durationMinutes} min
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <FiCalendar className="h-4 w-4" />
                            Live since {formatRoomTime(room.activatedAt ?? room.createdAt)}
                          </span>
                          <span className="font-mono uppercase tracking-[0.16em]">
                            {room.roomCode}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {!isCurrentRoom ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                            <FiVideo className="h-3.5 w-3.5" />
                            Switch
                          </span>
                        ) : null}
                        {isSwitching && !isCurrentRoom ? (
                          <FiLoader className="h-5 w-5 animate-spin text-emerald-600" />
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
