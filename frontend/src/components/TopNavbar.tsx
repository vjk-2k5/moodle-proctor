"use client";

import { usePathname } from "next/navigation";
import { FiActivity, FiBell, FiCheckCircle, FiUsers } from "react-icons/fi";

import { useTeacherStats } from "@/hooks/useTeacherData";

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Operations Dashboard",
    subtitle: "Track exam health, watch live rooms, and respond quickly to risk."
  },
  "/dashboard/monitoring": {
    title: "Live Monitoring",
    subtitle: "Observe participant feeds, connection quality, and active proctoring coverage."
  },
  "/dashboard/alerts": {
    title: "Alerts Review",
    subtitle: "Prioritize suspicious behavior and resolve AI flags with context."
  },
  "/dashboard/students": {
    title: "Participant Roster",
    subtitle: "Review attendance, monitoring status, and connectivity across the session."
  },
  "/dashboard/reports": {
    title: "Exam Reports",
    subtitle: "Access evidence packs, summaries, and post-exam follow-up items."
  },
  "/dashboard/settings": {
    title: "Workspace Settings",
    subtitle: "Tune your monitoring workspace and operations preferences."
  }
};

export const TopNavbar = () => {
  const pathname = usePathname();
  const meta = pageMeta[pathname] ?? pageMeta["/dashboard"];
  const { stats, isLoading, error } = useTeacherStats();

  const summaryCards = [
    {
      label: "Live Students",
      value: stats?.students.active ?? 0,
      icon: <FiUsers className="h-4 w-4" />
    },
    {
      label: "Active Alerts",
      value: stats?.violations.inLast24Hours ?? 0,
      icon: <FiBell className="h-4 w-4" />
    },
    {
      label: "Flagged Cases",
      value: stats?.violations.bySeverity.warning ?? 0,
      icon: <FiActivity className="h-4 w-4" />
    },
    {
      label: "Completed Attempts",
      value: stats?.overview.completedAttempts ?? 0,
      icon: <FiCheckCircle className="h-4 w-4" />
    }
  ];

  return (
    <header className="dashboard-panel rounded-[30px] px-5 py-5 md:px-7 md:py-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <p className="dashboard-kicker">Exam Control Center</p>
          <h1 className="dashboard-title mt-2">{meta.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 md:text-[15px]">
            {meta.subtitle}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row xl:items-center">
          <div className="relative flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-slate-600">
            <FiBell className="h-5 w-5" />
            <span className="ml-3 text-sm font-medium">Live queue</span>
            <span className="ml-3 inline-flex min-w-6 items-center justify-center rounded-full bg-red-500 px-2 py-1 text-xs font-semibold text-white">
              {stats?.violations.inLast24Hours ?? 0}
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-lg shadow-slate-900/10">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sm font-bold">
              PV
            </div>
            <div>
              <p className="text-sm font-semibold">Teacher Session</p>
              <p className="text-xs text-slate-300">
                {error ? error.message : isLoading ? "Loading dashboard..." : "Connected to backend"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200/80 bg-white/85 px-4 py-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{card.label}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                {card.icon}
              </span>
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <p className="text-2xl font-semibold tracking-tight text-slate-900">
                {isLoading ? "…" : card.value}
              </p>
              <p className="text-xs font-medium text-slate-400">Live snapshot</p>
            </div>
          </div>
        ))}
      </div>
    </header>
  );
};
