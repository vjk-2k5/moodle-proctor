import type { Student } from "@app-types/index";
import { StatusBadge } from "./StatusBadge";

interface Props {
  student: Student;
}

const connectionTone: Record<Student["connection"], string> = {
  Excellent: "text-emerald-700 bg-emerald-50 border-emerald-200",
  Good: "text-teal-700 bg-teal-50 border-teal-200",
  Fair: "text-amber-700 bg-amber-50 border-amber-200",
  Poor: "text-red-700 bg-red-50 border-red-200"
};

export const StudentCard = ({ student }: Props) => {
  return (
    <article className="dashboard-panel-strong overflow-hidden rounded-[24px] transition-transform duration-200 hover:-translate-y-0.5">
      <div className="relative aspect-video bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.22),_transparent_30%),linear-gradient(180deg,_rgba(15,23,42,0.2),_rgba(15,23,42,0.8))]" />
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-emerald-500/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
          <span className="h-2 w-2 rounded-full bg-white" />
          Live
        </div>
        <div className="absolute right-4 top-4 rounded-full bg-slate-950/60 px-3 py-1 text-[11px] font-medium text-slate-100 backdrop-blur-sm">
          {student.exam}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
            Student Feed
          </p>
          <p className="mt-1 text-lg font-semibold text-white">{student.name}</p>
        </div>
      </div>

      <div className="space-y-4 px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Student ID
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{student.id}</p>
          </div>
          <StatusBadge status={student.status} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Exam
            </p>
            <p className="mt-2 font-medium text-slate-700">{student.exam}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Connection
            </p>
            <span
              className={`mt-2 inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${connectionTone[student.connection]}`}
            >
              {student.connection}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};
