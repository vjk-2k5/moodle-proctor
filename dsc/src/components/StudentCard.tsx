import type { Student } from "@app-types/index";
import { StatusBadge } from "./StatusBadge";

interface Props {
  student: Student;
}

export const StudentCard = ({ student }: Props) => {
  const connectionTone =
    student.connection === "Excellent"
      ? "text-emerald-400"
      : student.connection === "Good"
      ? "text-emerald-300"
      : student.connection === "Fair"
      ? "text-amber-300"
      : "text-red-400";

  return (
    <article className="glass-surface overflow-hidden rounded-2xl border border-slate-800/70 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="relative flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_36%),linear-gradient(135deg,rgba(15,23,42,1),rgba(2,6,23,1))]">
        <div className="absolute inset-3 rounded-xl border border-slate-800/80 border-dashed" />
        <div className="flex flex-col items-center gap-1 text-xs text-slate-500">
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Webcam Feed</span>
          <span className="h-1.5 w-16 rounded-full bg-slate-700/90" />
          <span className="h-1.5 w-10 rounded-full bg-slate-800/90" />
        </div>
        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900/85 px-2 py-0.5 text-[10px] text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-slate-900/85 px-2 py-0.5 text-[10px] text-slate-400">
          {student.exam}
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Focus Candidate</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{student.name}</p>
          </div>
          <button className="rounded-full border border-slate-700/80 bg-slate-950/85 px-3 py-1 text-[11px] text-slate-200 transition-colors hover:border-accent.blue/50 hover:text-accent.blue">
            Focus feed
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-400">Student</span>
            <span className="truncate text-sm font-medium text-slate-100">{student.name}</span>
          </div>
          <StatusBadge status={student.status} />
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="surface-muted rounded-xl px-3 py-2">
            <span className="text-slate-500">Student ID</span>
            <p className="mt-1 text-slate-100">{student.id}</p>
          </div>
          <div className="surface-muted rounded-xl px-3 py-2">
            <span className="text-slate-500">Connection</span>
            <p className={`mt-1 flex items-center gap-1 ${connectionTone}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {student.connection}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800/70 pt-2 text-[11px] text-slate-400">
          <span>Updated just now</span>
          <button className="text-sky-300 transition-colors hover:text-sky-200">View details</button>
        </div>
      </div>
    </article>
  );
};
