import { alerts, examReports, students } from "@mock/data";
import { FiActivity, FiAlertTriangle, FiCheckCircle, FiUsers } from "react-icons/fi";

const stats = [
  {
    label: "Students Live",
    value: students.length,
    detail: "Connected to the current exam session",
    icon: FiUsers,
    accent: "text-sky-300",
    tone: "from-sky-500/16 to-transparent"
  },
  {
    label: "Active Alerts",
    value: alerts.length,
    detail: "Requiring review from the proctor",
    icon: FiAlertTriangle,
    accent: "text-amber-300",
    tone: "from-amber-500/16 to-transparent"
  },
  {
    label: "Reports Ready",
    value: examReports.filter((report) => report.uploadStatus === "Completed").length,
    detail: "Evidence bundles available to export",
    icon: FiCheckCircle,
    accent: "text-emerald-300",
    tone: "from-emerald-500/16 to-transparent"
  },
  {
    label: "AI Scan Rate",
    value: "98.4%",
    detail: "Monitoring pipeline operating normally",
    icon: FiActivity,
    accent: "text-rose-300",
    tone: "from-rose-500/16 to-transparent"
  }
];

export const DashboardStats = () => {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <article key={stat.label} className="glass-surface relative overflow-hidden rounded-2xl px-4 py-4">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.tone}`} />
            <div className="relative flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{stat.label}</p>
                <p className="text-2xl font-semibold text-slate-50">{stat.value}</p>
                <p className="max-w-[22ch] text-xs text-slate-400">{stat.detail}</p>
              </div>
              <div className="surface-muted rounded-xl p-2.5">
                <Icon className={`h-5 w-5 ${stat.accent}`} />
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
};
