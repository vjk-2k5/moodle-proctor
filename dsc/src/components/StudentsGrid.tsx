import { monitoringStudents } from "@mock/data";
import { StudentCard } from "./StudentCard";

export const StudentsGrid = () => {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col">
          <h2 className="section-title">Live Monitoring</h2>
          <p className="text-xs text-slate-400">
            Viewing {monitoringStudents.length} of {monitoringStudents.length} students
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="surface-muted rounded-full px-3 py-1 text-slate-300">Grid View</span>
          <span className="surface-muted rounded-full px-3 py-1 text-slate-300">Auto-refresh every 5s</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Normal
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-300" /> Warning
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-red-300">
            <span className="h-2 w-2 rounded-full bg-red-400" /> Suspicious
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {monitoringStudents.map((student) => (
          <StudentCard key={student.id} student={student} />
        ))}
      </div>
    </section>
  );
};
