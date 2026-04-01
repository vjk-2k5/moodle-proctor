"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiCopy,
  FiExternalLink,
  FiLoader,
  FiPlus,
  FiSearch,
  FiShield,
  FiUsers,
  FiX
} from "react-icons/fi";

import { backendAPI, type CreatedRoomDetails, type TeacherExam } from "@/lib/backend";

interface CreatedRoomResult extends CreatedRoomDetails {
  launchLink: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: (room: CreatedRoomResult) => void;
}

export const RoomCreationModal = ({ isOpen, onClose, onRoomCreated }: Props) => {
  const [exams, setExams] = useState<TeacherExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRoom, setCreatedRoom] = useState<CreatedRoomResult | null>(null);
  const [copiedValue, setCopiedValue] = useState<"invite" | "launch" | "code" | null>(null);

  const filteredExams = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return exams;
    }

    return exams.filter((exam) =>
      [exam.examName, exam.courseName].some((value) => value.toLowerCase().includes(query))
    );
  }, [exams, searchTerm]);

  const selectedExam = filteredExams.find((exam) => exam.id === selectedExamId)
    ?? exams.find((exam) => exam.id === selectedExamId)
    ?? null;

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
      setSearchTerm("");
      setError(null);
      setCreatedRoom(null);
      setCopiedValue(null);
      return;
    }

    const fetchExams = async () => {
      setIsLoadingExams(true);
      setError(null);

      try {
        const response = await backendAPI.getExams();
        if (response.success) {
          const nextExams = response.data.exams || [];
          setExams(nextExams);
          setSelectedExamId((current) => current ?? nextExams[0]?.id ?? null);
        }
      } catch (err) {
        console.error("[RoomCreation] Error fetching exams:", err);
        setError(err instanceof Error ? err.message : "Failed to load exams");
      } finally {
        setIsLoadingExams(false);
      }
    };

    fetchExams().catch(console.error);
  }, [isOpen]);

  useEffect(() => {
    if (!filteredExams.length) {
      return;
    }

    const selectionStillVisible = filteredExams.some((exam) => exam.id === selectedExamId);
    if (!selectionStillVisible) {
      setSelectedExamId(filteredExams[0].id);
    }
  }, [filteredExams, selectedExamId]);

  const handleCreateRoom = async () => {
    if (!selectedExamId) return;

    setIsCreating(true);
    setError(null);

    try {
      const createResponse = await backendAPI.createRoom(selectedExamId);
      const { roomId, roomCode, inviteLink, examName, courseName } = createResponse.data;

      await backendAPI.activateRoom(roomId);

      const launchLink =
        typeof window === "undefined"
          ? `/student-demo?code=${encodeURIComponent(roomCode)}`
          : new URL(
              `/student-demo?code=${encodeURIComponent(roomCode)}`,
              window.location.origin
            ).toString();

      const nextRoom = {
        roomId,
        roomCode,
        inviteLink,
        examName,
        courseName,
        launchLink,
      };

      setCreatedRoom(nextRoom);
      onRoomCreated(nextRoom);
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
      window.setTimeout(() => setCopiedValue(null), 2000);
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
      <div className="modal-shell max-w-[58rem] overflow-hidden rounded-[30px]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-6 py-5">
          <div>
            <span className="eyebrow-pill">Teacher room desk</span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
              {createdRoom ? "Room ready to launch" : "Create a room in one clean step"}
            </h2>
            <p className="section-copy mt-2 max-w-2xl">
              {createdRoom
                ? "Your room is active already. Share the student entry details below or move straight into the monitoring wall."
                : "Pick an exam, review the setup, and the room will be created and activated for you automatically."}
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

        <div className="max-h-[72vh] overflow-y-auto px-6 py-5 scroll-thin">
          {createdRoom ? (
            <div className="space-y-4">
              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900">
                      <FiCheckCircle className="h-4 w-4" />
                      Room activated successfully
                    </p>
                    <p className="mt-2 text-sm leading-6 text-emerald-800">
                      {createdRoom.examName} for {createdRoom.courseName} is live and ready for student entry.
                    </p>
                  </div>
                  <div className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800 shadow-sm">
                    {createdRoom.roomCode}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.9fr)]">
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
                      Best for browser-based entry. Students can open this first and then continue into the monitored flow.
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
                      Use this when the student machine already has the desktop proctoring app installed.
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

                <div className="space-y-4">
                  <div className="surface-card rounded-[24px] px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      What to do next
                    </p>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
                          1
                        </span>
                        <p>Send the student launch link or room code to your class.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
                          2
                        </span>
                        <p>Keep the monitoring wall open here to watch new feeds appear in real time.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
                          3
                        </span>
                        <p>Close the room from the dashboard when the session is over.</p>
                      </div>
                    </div>
                  </div>

                  <div className="surface-subtle rounded-[24px] px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Room details
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="info-chip">
                        <FiExternalLink className="h-3.5 w-3.5" />
                        Monitoring ready
                      </span>
                      <span className="info-chip">
                        <FiUsers className="h-3.5 w-3.5" />
                        Student entry enabled
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {error ? (
                <div className="rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {error}
                </div>
              ) : null}

              {isLoadingExams ? (
                <div className="empty-state flex items-center justify-center gap-3">
                  <FiLoader className="h-5 w-5 animate-spin text-emerald-700" />
                  <span>Loading exams...</span>
                </div>
              ) : exams.length === 0 ? (
                <div className="empty-state">No exams are available yet.</div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.85fr)]">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">Choose an exam</p>
                        <p className="mt-1 text-sm text-slate-500">
                          The selected exam becomes the active room context for student launch and monitoring.
                        </p>
                      </div>
                      <div className="info-chip">
                        {filteredExams.length} of {exams.length} exams
                      </div>
                    </div>

                    <label className="relative block">
                      <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search by exam or course"
                        className="input-field pl-11"
                      />
                    </label>

                    {filteredExams.length === 0 ? (
                      <div className="empty-state">No exams match that search yet.</div>
                    ) : (
                      <div className="max-h-[24rem] space-y-3 overflow-y-auto pr-1 scroll-thin">
                        {filteredExams.map((exam, index) => {
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
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate text-base font-semibold">{exam.examName}</p>
                                    {index === 0 ? (
                                      <span
                                        className={[
                                          "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                                          selected
                                            ? "border border-white/10 bg-white/10 text-white"
                                            : "bg-emerald-100 text-emerald-800"
                                        ].join(" ")}
                                      >
                                        Quick pick
                                      </span>
                                    ) : null}
                                  </div>
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
                    )}
                  </div>

                  <div className="space-y-4">
                    {selectedExam ? (
                      <>
                        <div className="surface-card rounded-[24px] px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Ready to launch
                          </p>
                          <p className="mt-3 text-xl font-semibold text-slate-950">
                            {selectedExam.examName}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">{selectedExam.courseName}</p>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[20px] bg-slate-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Duration
                              </p>
                              <p className="mt-2 inline-flex items-center gap-2 text-base font-semibold text-slate-950">
                                <FiClock className="h-4 w-4 text-emerald-700" />
                                {selectedExam.durationMinutes} minutes
                              </p>
                            </div>
                            <div className="rounded-[20px] bg-slate-50 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Proctoring
                              </p>
                              <p className="mt-2 inline-flex items-center gap-2 text-base font-semibold text-slate-950">
                                <FiShield className="h-4 w-4 text-emerald-700" />
                                {selectedExam.maxWarnings} warning limit
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="surface-subtle rounded-[24px] px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            What happens after create
                          </p>
                          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                            <p>The room is created and activated automatically.</p>
                            <p>The monitoring wall switches into that room immediately.</p>
                            <p>You get the browser link, desktop link, and room code in one place.</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="empty-state px-5 py-10">
                        Pick an exam from the list and the setup summary will appear here.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200/80 bg-slate-50/80 px-6 py-4">
          {createdRoom ? (
            <>
              <button
                onClick={() => {
                  setCreatedRoom(null);
                  setCopiedValue(null);
                }}
                className="btn-secondary"
              >
                <FiPlus className="h-4 w-4" />
                Create another room
              </button>
              <button onClick={onClose} className="btn-primary">
                Continue to monitoring
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="btn-secondary" disabled={isCreating}>
                Cancel
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={!selectedExamId || isCreating || isLoadingExams}
                className="btn-primary"
              >
                {isCreating ? (
                  <>
                    <FiLoader className="h-4 w-4 animate-spin" />
                    Creating room...
                  </>
                ) : (
                  <>
                    <FiPlus className="h-4 w-4" />
                    Create and activate room
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
