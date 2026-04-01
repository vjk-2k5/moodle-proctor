"use client";

import { useEffect, useState } from "react";
import { FiCheck, FiCopy, FiLoader, FiPlus, FiX } from "react-icons/fi";

import type { TeacherExam } from "@/lib/backend";
import { BACKEND_URL } from "@/lib/config";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: (room: { roomId: number; roomCode: string; inviteLink: string }) => void;
  apiUrl?: string;
}

export const RoomCreationModal = ({
  isOpen,
  onClose,
  onRoomCreated,
  apiUrl = BACKEND_URL
}: Props) => {
  const [exams, setExams] = useState<TeacherExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRoom, setCreatedRoom] = useState<{
    roomCode: string;
    inviteLink: string;
    launchLink: string;
  } | null>(null);
  const [copiedValue, setCopiedValue] = useState<"invite" | "launch" | "code" | null>(null);

  const selectedExam = exams.find((exam) => exam.id === selectedExamId) ?? null;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isCreating) {
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
  }, [isCreating, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedExamId(null);
      setError(null);
      setCreatedRoom(null);
      setCopiedValue(null);
      return;
    }

    const fetchExams = async () => {
      setIsLoadingExams(true);
      setError(null);

      try {
        const response = await fetch(`${apiUrl}/api/teacher/exams`, {
          credentials: "include"
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to load exams");
        }

        setExams(result.data.exams || []);
      } catch (err) {
        console.error("[RoomCreation] Error fetching exams:", err);
        setError(err instanceof Error ? err.message : "Failed to load exams");
      } finally {
        setIsLoadingExams(false);
      }
    };

    fetchExams();
  }, [apiUrl, isOpen]);

  const handleCreateRoom = async () => {
    if (!selectedExamId) return;

    setIsCreating(true);
    setError(null);

    try {
      const createResponse = await fetch(`${apiUrl}/api/room/create`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ examId: selectedExamId })
      });

      const createResult = await createResponse.json().catch(() => ({}));

      if (!createResponse.ok || !createResult.success) {
        throw new Error(createResult.error || "Failed to create room");
      }

      const { roomId, roomCode, inviteLink } = createResult.data;

      await fetch(`${apiUrl}/api/room/${roomId}/activate`, {
        method: "POST",
        credentials: "include"
      }).then(async (response) => {
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || "Failed to activate room");
        }
      });

      const launchLink = new URL(
        `/student-demo?code=${encodeURIComponent(roomCode)}`,
        window.location.origin
      ).toString();

      setCreatedRoom({ roomCode, inviteLink, launchLink });
      onRoomCreated({ roomId, roomCode, inviteLink });
    } catch (err) {
      console.error("[RoomCreation] Error creating room:", err);
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async (value: string, kind: "invite" | "launch" | "code") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(kind);
      setTimeout(() => setCopiedValue(null), 2000);
    } catch (err) {
      console.error("[RoomCreation] Failed to copy:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isCreating) {
          onClose();
        }
      }}
    >
      <div className="modal-shell max-w-[42rem] overflow-hidden rounded-[30px]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-6 py-5">
          <div>
            <span className="eyebrow-pill">Room creation</span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
              {createdRoom ? "Room ready to launch" : "Create a new proctoring room"}
            </h2>
            <p className="section-copy mt-2">
              {createdRoom
                ? "Share the launch details with students or move straight into monitoring."
                : "Choose the exam you want to monitor and the workspace will activate the room for you."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost rounded-full p-2"
            disabled={isCreating}
            aria-label="Close room creation"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[68vh] overflow-y-auto px-6 py-5 scroll-thin">
          {createdRoom ? (
            <div className="space-y-4">
              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4">
                <p className="text-sm font-semibold text-emerald-900">Room activated successfully</p>
                <p className="mt-2 text-sm leading-6 text-emerald-800">
                  The student browser handoff and the direct desktop link are both ready below.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="surface-card rounded-[24px] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Student launch link
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      readOnly
                      value={createdRoom.launchLink}
                      className="input-field flex-1 font-mono text-xs"
                    />
                    <button
                      onClick={() => handleCopy(createdRoom.launchLink, "launch")}
                      className="btn-primary sm:min-w-[7.5rem]"
                    >
                      {copiedValue === "launch" ? <FiCheck className="h-4 w-4" /> : <FiCopy className="h-4 w-4" />}
                      {copiedValue === "launch" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Students open this page in the browser before the desktop app takes over.
                  </p>
                </div>

                <div className="surface-card rounded-[24px] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Desktop deep link
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      readOnly
                      value={createdRoom.inviteLink}
                      className="input-field flex-1 font-mono text-xs"
                    />
                    <button
                      onClick={() => handleCopy(createdRoom.inviteLink, "invite")}
                      className="btn-secondary sm:min-w-[7.5rem]"
                    >
                      {copiedValue === "invite" ? <FiCheck className="h-4 w-4" /> : <FiCopy className="h-4 w-4" />}
                      {copiedValue === "invite" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Use this when the Electron app is already installed and ready on the student machine.
                  </p>
                </div>

                <div className="surface-card rounded-[24px] px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Room code
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      readOnly
                      value={createdRoom.roomCode}
                      className="input-field flex-1 text-center font-mono text-lg font-semibold uppercase tracking-[0.18em]"
                    />
                    <button
                      onClick={() => handleCopy(createdRoom.roomCode, "code")}
                      className="btn-secondary sm:min-w-[7.5rem]"
                    >
                      {copiedValue === "code" ? <FiCheck className="h-4 w-4" /> : <FiCopy className="h-4 w-4" />}
                      {copiedValue === "code" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isLoadingExams ? (
                <div className="empty-state flex items-center justify-center gap-3">
                  <FiLoader className="h-5 w-5 animate-spin text-emerald-700" />
                  <span>Loading exams...</span>
                </div>
              ) : error ? (
                <div className="rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {error}
                </div>
              ) : exams.length === 0 ? (
                <div className="empty-state">No exams are available yet.</div>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Choose an exam</p>
                    <p className="mt-1 text-sm text-slate-500">
                      The selected exam becomes the active room context for monitoring and student launch.
                    </p>
                  </div>

                  <div className="max-h-[22rem] space-y-3 overflow-y-auto scroll-thin">
                    {exams.map((exam) => {
                      const selected = selectedExamId === exam.id;

                      return (
                        <button
                          key={exam.id}
                          onClick={() => setSelectedExamId(exam.id)}
                          className={[
                            "w-full rounded-[24px] border p-4 text-left transition-all duration-200",
                            selected
                              ? "border-slate-950 bg-slate-950 text-white"
                              : "border-slate-200 bg-white/90 hover:border-slate-300 hover:bg-white"
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-base font-semibold">{exam.examName}</p>
                              <p
                                className={[
                                  "mt-1 text-sm",
                                  selected ? "text-slate-300" : "text-slate-500"
                                ].join(" ")}
                              >
                                {exam.courseName}
                              </p>
                            </div>
                            {selected ? (
                              <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                                Selected
                              </span>
                            ) : null}
                          </div>

                          <div
                            className={[
                              "mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em]",
                              selected ? "text-slate-300" : "text-slate-400"
                            ].join(" ")}
                          >
                            <span>{exam.durationMinutes} min</span>
                            <span>Max warnings {exam.maxWarnings}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedExam ? (
                    <div className="surface-card rounded-[24px] px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Selected exam
                      </p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">{selectedExam.examName}</p>
                      <p className="mt-1 text-sm text-slate-500">{selectedExam.courseName}</p>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}
        </div>

        {!createdRoom ? (
          <div className="flex justify-end gap-3 border-t border-slate-200/80 bg-slate-50/80 px-6 py-4">
            <button onClick={onClose} className="btn-secondary" disabled={isCreating}>
              Cancel
            </button>
            <button
              onClick={handleCreateRoom}
              disabled={!selectedExamId || isCreating}
              className="btn-primary"
            >
              {isCreating ? (
                <>
                  <FiLoader className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FiPlus className="h-4 w-4" />
                  Create room
                </>
              )}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
