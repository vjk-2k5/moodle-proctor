import type { Student } from "@app-types/index";
import { StatusBadge } from "./StatusBadge";

interface Props {
  student: Student;
}

export const StudentCard = ({ student }: Props) => {
  return (
    <div className="glass-surface rounded-xl overflow-hidden flex flex-col border border-slate-800/80">
      <div className="relative aspect-video bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center">
        <div className="absolute inset-2 rounded-lg border border-slate-800/80 border-dashed" />
        <div className="flex flex-col items-center gap-1 text-xs text-slate-500">
          <span className="uppercase tracking-[0.18em] text-[10px] text-slate-500">
            Webcam Feed
          </span>
          <span className="h-1.5 w-16 rounded-full bg-slate-800/90" />
          <span className="h-1.5 w-10 rounded-full bg-slate-900/90" />
        </div>
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700/80 text-[10px] text-slate-300 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </div>
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/80 text-[10px] text-slate-400">
          {student.exam}
        </div>
      </div>

      <div className="px-3.5 py-3 flex flex-col gap-1.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-400">Student</span>
            <span className="text-sm font-medium text-slate-100 truncate">{student.name}</span>
          </div>
          <StatusBadge status={student.status} />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
          <span>ID: <span className="text-slate-200">{student.id}</span></span>
          <span
            className={[
              "flex items-center gap-1",
              student.connection === "Excellent"
                ? "text-emerald-400"
                : student.connection === "Good"
                ? "text-emerald-300"
                : student.connection === "Fair"
                ? "text-amber-300"
                : "text-red-400"
            ].join(" ")}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {student.connection}
          </span>
        </div>
      </div>
    </div>
  );
};

