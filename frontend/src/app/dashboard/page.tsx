"use client";

import { FiActivity, FiAlertTriangle, FiCheckCircle, FiFileText, FiUsers } from "react-icons/fi";

import { StudentsGrid } from "@components/StudentsGrid";
import { StatusBadge } from "@components/StatusBadge";
import { useAttempts, useReports, useTeacherStats } from "@/hooks/useTeacherData";
import { getDisplayName, getRiskStatus, getAttemptTimestamp } from "@/lib/dashboard";

export default function DashboardOverviewPage() {
  const { stats, isLoading: statsLoading } = useTeacherStats();
  const { attempts, isLoading: attemptsLoading } = useAttempts({
    limit: 12
  });
  const { reports, isLoading: reportsLoading } = useReports({
    limit: 12
  });

  const summaryCards = [
    {
      label: "Students Monitored",
      value: stats?.students.active ?? 0,
      note: "Students currently in progress",
      icon: <FiUsers className="h-5 w-5" />
    },
    {
      label: "Open Alerts",
      value: stats?.violations.inLast24Hours ?? 0,
      note: "Violations captured in the last 24 hours",
      icon: <FiAlertTriangle className="h-5 w-5" />
    },
    {
      label: "Reports Ready",
      value: reports.filter((report) => report.status === "submitted").length,
      note: "Attempts that have already been submitted",
      icon: <FiFileText className="h-5 w-5" />
    },
    {
      label: "Completed Attempts",
      value: stats?.overview.completedAttempts ?? 0,
      note: "Finished exam sessions tracked by the backend",
      icon: <FiCheckCircle className="h-5 w-5" />
    }
  ];

  const watchlistStudents = attempts
    .filter((attempt) => attempt.violationCount > 0)
    .sort((a, b) => b.violationCount - a.violationCount)
    .slice(0, 5);

  const recentAlerts = attempts
    .filter((attempt) => attempt.violationCount > 0)
    .sort((a, b) => {
      return new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime();
    })
    .slice(0, 4);

  const reportSummary = {
    completed: reports.filter((report) => report.status === "submitted").length,
    processing: reports.filter((report) => report.status === "in_progress").length,
    pending: reports.filter((report) => report.status === "not_started").length,
    failed: reports.filter((report) => report.status === "terminated").length
  };

  const loading = statsLoading || attemptsLoading || reportsLoading;

  return (
    <section className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article key={card.label} className="dashboard-panel rounded-[28px] px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="dashboard-kicker">{card.label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                  {loading ? "…" : card.value}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                {card.icon}
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500">{card.note}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
        <article className="dashboard-panel rounded-[28px] px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="dashboard-kicker">Operational Snapshot</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                Session health overview
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                The cards below now reflect live attempt and violation data from the Fastify backend.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              <FiCheckCircle className="h-4 w-4" />
              Backend-connected dashboard
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Latest Alerts
                </h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {loading ? "…" : recentAlerts.length}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {recentAlerts.length === 0 && !loading ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    No violations have been recorded yet.
                  </div>
                ) : null}

                {recentAlerts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold leading-6 text-slate-900">
                          {attempt.violationCount === 1
                            ? "1 violation recorded for this attempt."
                            : `${attempt.violationCount} violations recorded for this attempt.`}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          <span className="font-semibold text-slate-700">
                            {getDisplayName(attempt)}
                          </span>
                          {" · "}
                          {attempt.examName}
                        </p>
                      </div>
                      <span className="whitespace-nowrap text-xs font-medium text-slate-400">
                        {getAttemptTimestamp(attempt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Watchlist
                </h3>
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <FiActivity className="h-4 w-4" />
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {watchlistStudents.length === 0 && !loading ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    No students currently need watchlist attention.
                  </div>
                ) : null}

                {watchlistStudents.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {getDisplayName(attempt)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {attempt.examName} · {attempt.violationCount} recorded violations
                        </p>
                      </div>
                      <StatusBadge status={getRiskStatus(attempt.violationCount)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>

        <article className="dashboard-panel rounded-[28px] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="dashboard-kicker">Reporting Pulse</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                Evidence progress
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Submitted, in-progress, and terminated attempts now roll up from the backend report feed.
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <FiFileText className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Submitted
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-900">
                {loading ? "…" : reportSummary.completed}
              </p>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                In Progress
              </p>
              <p className="mt-2 text-2xl font-semibold text-blue-900">
                {loading ? "…" : reportSummary.processing}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                Not Started
              </p>
              <p className="mt-2 text-2xl font-semibold text-amber-900">
                {loading ? "…" : reportSummary.pending}
              </p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
                Terminated
              </p>
              <p className="mt-2 text-2xl font-semibold text-red-900">
                {loading ? "…" : reportSummary.failed}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-slate-200 bg-white px-4 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Highest Alert Reports
            </h3>
            <div className="mt-4 space-y-3">
              {reports
                .slice()
                .sort((a, b) => b.violationCount - a.violationCount)
                .slice(0, 4)
                .map((report) => (
                  <div
                    key={report.attemptId}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{report.studentName}</p>
                      <p className="mt-1 text-sm text-slate-500">{report.examName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-slate-900">{report.violationCount}</p>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                        Alerts
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </article>
      </div>

      <StudentsGrid />
    </section>
  );
}
