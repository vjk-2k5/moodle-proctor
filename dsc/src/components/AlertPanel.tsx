import { alerts, students } from "@mock/data";
import type { Alert } from "@app-types/index";
import { FiAlertTriangle, FiMic, FiMonitor, FiSmartphone } from "react-icons/fi";

const alertIcon = (type: Alert["type"]) => {
  switch (type) {
    case "multiple_faces":
      return <FiAlertTriangle className="h-3.5 w-3.5 text-red-400" />;
    case "phone_detected":
      return <FiSmartphone className="h-3.5 w-3.5 text-amber-300" />;
    case "left_screen":
      return <FiMonitor className="h-3.5 w-3.5 text-rose-300" />;
    case "background_voice":
      return <FiMic className="h-3.5 w-3.5 text-sky-300" />;
  }
};

const severityPill = (severity: Alert["severity"]) => {
  if (severity === "high") {
    return "bg-red-500/15 text-red-400 border-red-500/40";
  }
  if (severity === "medium") {
    return "bg-amber-500/15 text-amber-300 border-amber-500/40";
  }
  return "bg-sky-500/15 text-sky-300 border-sky-500/40";
};

export const AlertPanel = () => {
  return (
    <aside className="glass-surface rounded-xl flex flex-col h-full max-h-[520px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <FiAlertTriangle className="h-4 w-4 text-amber-300" />
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-slate-100 tracking-tight">
              AI Alerts
            </h2>
            <p className="text-[11px] text-slate-500">
              Real-time anomalies detected during the exam.
            </p>
          </div>
        </div>
        <span className="text-[11px] text-slate-400">
          Total: <span className="font-semibold text-slate-100">{alerts.length}</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin px-3 py-2 space-y-2">
        {alerts.map((alert) => {
          const student = students.find((s) => s.id === alert.studentId);
          return (
            <div
              key={alert.id}
              className="flex items-start gap-3 rounded-lg bg-slate-900/80 border border-slate-800/80 px-3 py-2.5"
            >
              <div className="mt-0.5">{alertIcon(alert.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-100 truncate">
                    {alert.message}
                  </p>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                    {alert.timestamp}
                  </span>
                </div>
                {student && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {student.name} · <span className="text-slate-400">{student.id}</span> ·{" "}
                    <span className="text-slate-400">{student.exam}</span>
                  </p>
                )}
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${severityPill(
                      alert.severity
                    )}`}
                  >
                    {alert.severity === "high"
                      ? "High Priority"
                      : alert.severity === "medium"
                      ? "Medium"
                      : "Low"}
                  </span>
                  <button className="text-[10px] text-sky-300 hover:text-sky-200">
                    Focus feed
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {alerts.length === 0 && (
          <div className="text-center text-xs text-slate-500 py-6">
            No AI alerts at the moment.
          </div>
        )}
      </div>
    </aside>
  );
};

