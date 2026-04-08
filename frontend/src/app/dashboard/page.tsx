"use client";

import Link from "next/link";
import { FiAlertTriangle, FiFileText, FiMonitor, FiUsers } from "react-icons/fi";

import { StatusBadge } from "@components/StatusBadge";
import { useAttempts, useReports, useTeacherStats } from "@/hooks/useTeacherData";
import {
  formatDateTime,
  getAttemptStatusLabel,
  getDisplayName,
  getRiskStatus
} from "@/lib/dashboard";

export default function DashboardOverviewPage() {
  const { stats, isLoading: statsLoading } = useTeacherStats();
  const { attempts, isLoading: attemptsLoading } = useAttempts({ limit: 8 });
  const { reports, isLoading: reportsLoading } = useReports({ limit: 6 });

  const loading = statsLoading || attemptsLoading || reportsLoading;
  const flaggedAttempts = attempts.filter((attempt) => attempt.violationCount > 0);
  const watchlist = flaggedAttempts
    .slice()
    .sort((a, b) => b.violationCount - a.violationCount)
    .slice(0, 5);
  const recentActivity = attempts
    .slice()
    .sort((a, b) => {
      return new Date(b.startedAt || b.submittedAt || 0).getTime() - new Date(a.startedAt || a.submittedAt || 0).getTime();
    })
    .slice(0, 6);

  const summaryCards = [
    {
      label: "Live students",
      value: stats?.students.active ?? 0,
      hint: "Current active attempts",
      icon: <FiUsers className="h-4 w-4" />
    },
    {
      label: "Open alerts",
      value: stats?.violations.inLast24Hours ?? 0,
      hint: "Last 24 hours",
      icon: <FiAlertTriangle className="h-4 w-4" />
    },
    {
      label: "Completed reports",
      value: reports.filter((report) => report.status === "submitted").length,
      hint: "Ready to review",
      icon: <FiFileText className="h-4 w-4" />
    },
    {
      label: "Ongoing exams",
      value: stats?.exams.ongoing ?? 0,
      hint: "Rooms or live attempts",
      icon: <FiMonitor className="h-4 w-4" />
    }
  ];

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article key={card.label} className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-600">{card.label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                {card.icon}
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              {loading ? "..." : card.value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{card.hint}</p>
          </article>
        ))}
      </div>

      <article className="surface-panel rounded-[24px] px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Quick actions</h2>
            <p className="mt-1 text-sm text-slate-600">
              Use the monitoring page to create the exam room, then add the generated student URL in Moodle.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/monitoring" className="btn-primary">
              Open monitoring
            </Link>
            <Link href="/dashboard/students" className="btn-secondary">
              View students
            </Link>
            <Link href="/dashboard/reports" className="btn-secondary">
              View reports
            </Link>
          </div>
        </div>
      </article>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <article className="surface-panel rounded-[24px] px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Watchlist</h2>
              <p className="mt-1 text-sm text-slate-600">Students with the most violations appear here first.</p>
            </div>
            <Link href="/dashboard/alerts" className="text-sm font-semibold text-emerald-700">
              Open alerts
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {!loading && watchlist.length === 0 ? (
              <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                No flagged attempts right now.
              </div>
            ) : null}

            {watchlist.map((attempt) => (
              <div
                key={attempt.id}
                className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{getDisplayName(attempt)}</p>
                    <p className="mt-1 text-sm text-slate-600">{attempt.examName}</p>
                  </div>
                  <StatusBadge status={getRiskStatus(attempt.violationCount)} />
                </div>
                <p className="mt-2 text-xs text-slate-500">{attempt.violationCount} violations recorded</p>
              </div>
            ))}
          </div>
        </article>

        <article className="surface-panel rounded-[24px] overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-950">Recent attempt activity</h2>
            <p className="mt-1 text-sm text-slate-600">A simple recent list of student exam movement.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-5 py-4">Student</th>
                  <th className="px-5 py-4">Exam</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Time</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-5 py-8 text-sm text-slate-500" colSpan={4}>
                      Loading attempt activity...
                    </td>
                  </tr>
                ) : recentActivity.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-sm text-slate-500" colSpan={4}>
                      No attempts recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentActivity.map((attempt) => (
                    <tr key={attempt.id} className="table-row">
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-950">{getDisplayName(attempt)}</p>
                        <p className="mt-1 text-xs text-slate-400">{attempt.email}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        <p className="font-medium text-slate-800">{attempt.examName}</p>
                        <p className="mt-1 text-xs text-slate-400">{attempt.courseName}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                            {getAttemptStatusLabel(attempt.status)}
                          </span>
                          <StatusBadge status={getRiskStatus(attempt.violationCount)} />
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDateTime(attempt.startedAt || attempt.submittedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
