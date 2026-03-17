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
    <aside className="glass-surface flex h-full max-h-[620px] flex-col rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <FiAlertTriangle className="h-4 w-4 text-amber-300" />
          <div className="flex flex-col">
            <h2 className="section-title">AI Alerts</h2>
            <p className="section-copy">Real-time anomalies detected during the exam.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-slate-800/70 bg-slate-950/70 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-400 md:inline-flex">
            newest first
          </span>
          <span className="text-[11px] text-slate-400">
            Total: <span className="font-semibold text-slate-100">{alerts.length}</span>
          </span>
        </div>
      </div>

      <div className="border-b border-slate-800/70 px-4 py-2">
        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em]">
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-red-300">
            High risk
          </span>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-300">
            Medium
          </span>
          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-sky-300">
            Low
          </span>
        </div>
      </div>

      <div className="scroll-thin flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {alerts.map((alert) => {
          const student = students.find((s) => s.id === alert.studentId);

          return (
            <div
              key={alert.id}
              className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-slate-950/75 px-3 py-3"
            >
              <div className="surface-muted mt-0.5 rounded-xl p-2">{alertIcon(alert.type)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-slate-100">{alert.message}</p>
                  <span className="whitespace-nowrap text-[10px] text-slate-500">{alert.timestamp}</span>
                </div>
                {student && (
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {student.name} - <span className="text-slate-400">{student.id}</span> -{" "}
                    <span className="text-slate-400">{student.exam}</span>
                  </p>
                )}
                <div className="mt-2 flex items-center gap-1.5">
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
                  <button className="text-[10px] text-sky-300 hover:text-sky-200">Focus feed</button>
                  <button className="text-[10px] text-slate-400 hover:text-slate-200">Mark reviewed</button>
                </div>
              </div>
            </div>
          );
        })}

        {alerts.length === 0 && <div className="py-6 text-center text-xs text-slate-500">No AI alerts at the moment.</div>}
      </div>
    </aside>
  );
};
