"use client";

import { useReports } from "@/hooks/useTeacherData";
import { formatDateTime } from "@/lib/dashboard";

const reportStatusTone: Record<string, string> = {
  submitted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700",
  not_started: "border-amber-200 bg-amber-50 text-amber-700",
  terminated: "border-red-200 bg-red-50 text-red-700"
};

const reportStatusLabel: Record<string, string> = {
  submitted: "Submitted",
  in_progress: "In progress",
  not_started: "Not started",
  terminated: "Terminated"
};

export const ReportTable = () => {
  const { reports, total, isLoading, error } = useReports({
    limit: 25
  });

  const completedCount = reports.filter((report) => report.status === "submitted").length;

  return (
    <section className="dashboard-panel overflow-hidden rounded-[28px]">
      <div className="border-b border-slate-200/80 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="dashboard-kicker">Evidence Library</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              Exam reports
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Review real attempt outcomes, violation counts, and follow-up priority from one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[300px]">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Total reports
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {isLoading ? "…" : total}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Submitted
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {isLoading ? "…" : completedCount}
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
              <th className="px-6 py-4 text-center">Alerts</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-6 py-10 text-sm text-slate-500" colSpan={5}>
                  Loading reports…
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td className="px-6 py-10 text-sm text-slate-500" colSpan={5}>
                  No attempt reports are available yet.
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr
                  key={report.attemptId}
                  className="border-t border-slate-200/80 bg-white transition-colors hover:bg-slate-50/80"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{report.studentName}</p>
                      <p className="mt-1 text-xs text-slate-400">{report.studentEmail}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">
                    <div>
                      <p>{report.examName}</p>
                      <p className="mt-1 text-xs text-slate-400">{report.courseName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                      {report.violationCount}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        reportStatusTone[report.status] || "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {reportStatusLabel[report.status] || report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDateTime(report.submittedAt || report.startedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
