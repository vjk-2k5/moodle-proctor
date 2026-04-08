"use client";

import { useMemo, useState } from "react";
import {
  FiEye,
  FiEyeOff,
  FiLoader,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUsers,
  FiWifi
} from "react-icons/fi";

import { StatusBadge } from "@components/StatusBadge";

import { useAttempts, useExams } from "@/hooks/useTeacherData";
import { backendAPI } from "@/lib/backend";
import {
  formatDateTime,
  getAttemptStatusLabel,
  getDisplayName,
  getRiskStatus
} from "@/lib/dashboard";

const attemptTone: Record<string, string> = {
  in_progress: "border-blue-200 bg-blue-50 text-blue-700",
  submitted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  not_started: "border-amber-200 bg-amber-50 text-amber-700",
  terminated: "border-red-200 bg-red-50 text-red-700"
};

type VisibilityFilter = "visible" | "hidden" | "all";
type AttemptStatusFilter = "all" | "in_progress" | "submitted" | "not_started" | "terminated";
type BusyAction = { type: "hide" | "unhide" | "delete"; id: number } | null;

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExamId, setSelectedExamId] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<AttemptStatusFilter>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("visible");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);

  const { exams } = useExams();
  const {
    attempts,
    total,
    isLoading,
    error,
    refetch
  } = useAttempts({
    examId: selectedExamId,
    status: statusFilter === "all" ? undefined : statusFilter,
    search: searchTerm.trim() || undefined,
    includeHidden: visibilityFilter !== "visible",
    limit: 100
  });

  const filteredAttempts = useMemo(() => {
    if (visibilityFilter === "all") {
      return attempts;
    }

    return attempts.filter((attempt) => visibilityFilter === "hidden" ? attempt.isHidden : !attempt.isHidden);
  }, [attempts, visibilityFilter]);

  const visibleCount = attempts.filter((attempt) => !attempt.isHidden).length;
  const hiddenCount = attempts.filter((attempt) => attempt.isHidden).length;
  const activeCount = filteredAttempts.filter((attempt) => attempt.status === "in_progress").length;
  const flaggedCount = filteredAttempts.filter((attempt) => attempt.violationCount > 0).length;

  const examSummary = exams.map((exam) => ({
    ...exam,
    roomReady: exam.activeAttempts && exam.activeAttempts > 0
  }));

  const summaryCards = [
    {
      label: "Visible attempts",
      value: visibleCount,
      icon: <FiUsers className="h-5 w-5" />
    },
    {
      label: "Hidden attempts",
      value: hiddenCount,
      icon: <FiEyeOff className="h-5 w-5" />
    },
    {
      label: "Active now",
      value: activeCount,
      icon: <FiWifi className="h-5 w-5" />
    },
    {
      label: "Flagged in view",
      value: flaggedCount,
      icon: <FiShield className="h-5 w-5" />
    }
  ];

  const runAttemptAction = async (
    action: BusyAction,
    operation: () => Promise<unknown>,
    successMessage: string
  ) => {
    setBusyAction(action);
    setFeedback(null);

    try {
      await operation();
      await refetch();
      setFeedback(successMessage);
    } catch (actionError) {
      setFeedback(actionError instanceof Error ? actionError.message : "Action failed");
    } finally {
      setBusyAction(null);
    }
  };

  const handleHide = async (attemptId: number, studentName: string) => {
    const confirmed = window.confirm(`Hide ${studentName}'s attempt from the main teacher views?`);

    if (!confirmed) {
      return;
    }

    await runAttemptAction(
      { type: "hide", id: attemptId },
      () => backendAPI.hideAttempt(attemptId),
      "Attempt hidden from the default roster."
    );
  };

  const handleUnhide = async (attemptId: number, studentName: string) => {
    await runAttemptAction(
      { type: "unhide", id: attemptId },
      () => backendAPI.unhideAttempt(attemptId),
      `${studentName}'s attempt is visible again.`
    );
  };

  const handleDelete = async (attemptId: number, studentName: string) => {
    const confirmed = window.confirm(
      `Delete ${studentName}'s attempt permanently? Violations and session records linked to this attempt will also be removed.`
    );

    if (!confirmed) {
      return;
    }

    await runAttemptAction(
      { type: "delete", id: attemptId },
      () => backendAPI.deleteAttempt(attemptId),
      "Attempt deleted."
    );
  };

  return (
    <section className="space-y-6">
      <article className="surface-panel section-card">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="eyebrow-pill">Student command desk</span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                Maintain attempts without cluttering the live roster
              </h2>
              <p className="section-copy mt-3">
                Review every exam, trim noisy records out of the day-to-day view, and only hard delete an attempt when you really want it gone.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <div key={card.label} className="metric-card min-w-[10rem]">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-500">{card.label}</p>
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      {card.icon}
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                    {isLoading ? "..." : card.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-subtle rounded-[24px] px-4 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">Exam lineup</p>
                <p className="mt-1 text-sm text-slate-500">
                  Every available exam stays visible here so room creation and roster review can branch naturally across multiple exams.
                </p>
              </div>
              <span className="info-chip">{exams.length} exams in workspace</span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {examSummary.map((exam) => (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => setSelectedExamId((current) => current === exam.id ? undefined : exam.id)}
                  className={[
                    "rounded-[22px] border px-4 py-4 text-left transition-all duration-200",
                    selectedExamId === exam.id
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white/90 hover:border-slate-300 hover:bg-white"
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold">{exam.examName}</p>
                      <p className={["mt-1 text-sm", selectedExamId === exam.id ? "text-slate-300" : "text-slate-500"].join(" ")}>
                        {exam.courseName}
                      </p>
                    </div>
                    <span
                      className={[
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                        selectedExamId === exam.id
                          ? "border border-white/10 bg-white/10 text-white"
                          : "bg-emerald-100 text-emerald-800"
                      ].join(" ")}
                    >
                      {selectedExamId === exam.id ? "Focused" : "Open"}
                    </span>
                  </div>

                  <div className={["mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em]", selectedExamId === exam.id ? "text-slate-300" : "text-slate-400"].join(" ")}>
                    <span>{exam.durationMinutes} min</span>
                    <span>{exam.totalAttempts ?? 0} attempts</span>
                    <span>{exam.activeAttempts ?? 0} active</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </article>

      <section className="surface-panel table-shell overflow-hidden">
        <div className="border-b border-slate-200/80 px-6 py-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,0.8fr))]">
            <label className="relative block">
              <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by student, email, exam, or course"
                className="input-field pl-11"
              />
            </label>

            <select
              value={selectedExamId ?? ""}
              onChange={(event) => setSelectedExamId(event.target.value ? Number(event.target.value) : undefined)}
              className="input-field"
            >
              <option value="">All exams</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.examName}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as AttemptStatusFilter)}
              className="input-field"
            >
              <option value="all">All states</option>
              <option value="in_progress">In progress</option>
              <option value="submitted">Submitted</option>
              <option value="not_started">Not started</option>
              <option value="terminated">Terminated</option>
            </select>

            <select
              value={visibilityFilter}
              onChange={(event) => setVisibilityFilter(event.target.value as VisibilityFilter)}
              className="input-field"
            >
              <option value="visible">Visible attempts</option>
              <option value="hidden">Hidden attempts</option>
              <option value="all">All attempts</option>
            </select>
          </div>

          {feedback ? (
            <div className="mt-4 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              {feedback}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error.message}
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto scroll-thin">
          <table className="min-w-full">
            <thead className="table-head">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Exam</th>
                <th className="px-6 py-4">Risk</th>
                <th className="px-6 py-4">Attempt state</th>
                <th className="px-6 py-4">Started</th>
                <th className="px-6 py-4">Visibility</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-6 py-10 text-sm text-slate-500" colSpan={7}>
                    Loading student attempts...
                  </td>
                </tr>
              ) : filteredAttempts.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-sm text-slate-500" colSpan={7}>
                    {total === 0
                      ? "No attempts have been recorded yet."
                      : "No attempts match the current management filters."}
                  </td>
                </tr>
              ) : (
                filteredAttempts.map((attempt) => {
                  const studentName = getDisplayName(attempt);
                  const isBusy = busyAction?.id === attempt.id;

                  return (
                    <tr key={attempt.id} className="table-row">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{studentName}</p>
                          <p className="mt-1 text-xs text-slate-400">{attempt.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div>
                          <p className="font-medium text-slate-700">{attempt.examName}</p>
                          <p className="mt-1 text-xs text-slate-400">{attempt.courseName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <StatusBadge status={getRiskStatus(attempt.violationCount)} />
                          <span className="text-xs text-slate-400">{attempt.violationCount} flags</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${
                            attemptTone[attempt.status] || "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        >
                          {getAttemptStatusLabel(attempt.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDateTime(attempt.startedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={[
                            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
                            attempt.isHidden
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          ].join(" ")}
                        >
                          {attempt.isHidden ? <FiEyeOff className="h-3.5 w-3.5" /> : <FiEye className="h-3.5 w-3.5" />}
                          {attempt.isHidden ? "Hidden" : "Visible"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          {attempt.isHidden ? (
                            <button
                              type="button"
                              onClick={() => void handleUnhide(attempt.id, studentName)}
                              disabled={Boolean(isBusy)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isBusy && busyAction?.type === "unhide" ? <FiLoader className="h-3.5 w-3.5 animate-spin" /> : <FiEye className="h-3.5 w-3.5" />}
                              Unhide
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleHide(attempt.id, studentName)}
                              disabled={Boolean(isBusy)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isBusy && busyAction?.type === "hide" ? <FiLoader className="h-3.5 w-3.5 animate-spin" /> : <FiEyeOff className="h-3.5 w-3.5" />}
                              Hide
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => void handleDelete(attempt.id, studentName)}
                            disabled={Boolean(isBusy)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isBusy && busyAction?.type === "delete" ? <FiLoader className="h-3.5 w-3.5 animate-spin" /> : <FiTrash2 className="h-3.5 w-3.5" />}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
