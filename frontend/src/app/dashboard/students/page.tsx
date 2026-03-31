"use client";

import { StatusBadge } from "@components/StatusBadge";

import { useAttempts } from "@/hooks/useTeacherData";
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

export default function StudentsPage() {
  const { attempts, total, isLoading, error } = useAttempts({
    limit: 50
  });

  const normalCount = attempts.filter((attempt) => attempt.violationCount === 0).length;

  return (
    <section className="dashboard-panel overflow-hidden rounded-[28px]">
      <div className="border-b border-slate-200/80 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="dashboard-kicker">Roster Management</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              Students
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              This view now lists real exam attempts so you can see each participant, exam state,
              and violation risk in one table.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[300px]">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Total attempts
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {isLoading ? "…" : total}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Clean attempts
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {isLoading ? "…" : normalCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="px-6 py-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-medium text-red-700">
            {error.message}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto scroll-thin">
        <table className="min-w-full">
          <thead className="bg-slate-50/80">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <th className="px-6 py-4">Student</th>
              <th className="px-6 py-4">Exam</th>
              <th className="px-6 py-4">Risk</th>
              <th className="px-6 py-4">Attempt State</th>
              <th className="px-6 py-4">Started</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-6 py-10 text-sm text-slate-500" colSpan={5}>
                  Loading student attempts…
                </td>
              </tr>
            ) : attempts.length === 0 ? (
              <tr>
                <td className="px-6 py-10 text-sm text-slate-500" colSpan={5}>
                  No attempts have been recorded yet.
                </td>
              </tr>
            ) : (
              attempts.map((attempt) => (
                <tr
                  key={attempt.id}
                  className="border-t border-slate-200/80 bg-white transition-colors hover:bg-slate-50/80"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {getDisplayName(attempt)}
                      </p>
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
                    <StatusBadge status={getRiskStatus(attempt.violationCount)} />
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
