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
  const flaggedCount = reports.filter((report) => report.violationCount > 0).length;

  return (
    <section className="surface-panel table-shell">
      <div className="border-b border-slate-200/80 px-6 py-5 md:px-6 md:py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <span className="eyebrow-pill">Evidence library</span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
              Exam reports
            </h2>
            <p className="section-copy mt-3 max-w-3xl">
              Review attempt outcomes, violation counts, and evidence workflow status from one
              cleaner queue.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="metric-card min-w-[10rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Total reports
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                {isLoading ? "..." : total}
              </p>
            </div>
            <div className="metric-card min-w-[10rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Submitted
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                {isLoading ? "..." : completedCount}
              </p>
            </div>
            <div className="metric-card min-w-[10rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                Flagged
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                {isLoading ? "..." : flaggedCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="px-6 py-6">
          <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-4 text-sm font-medium text-red-700">
            {error.message}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto scroll-thin">
        <table className="min-w-full">
          <thead className="table-head">
            <tr>
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
                  Loading reports...
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
                <tr key={report.attemptId} className="table-row">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{report.studentName}</p>
                      <p className="mt-1 text-xs text-slate-400">{report.studentEmail}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700">
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
