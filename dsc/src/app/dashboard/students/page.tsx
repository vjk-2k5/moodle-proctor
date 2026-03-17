import { StatusBadge } from "@components/StatusBadge";
import { students } from "@mock/data";

export default function StudentsPage() {
  return (
    <section className="glass-surface overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3">
        <div className="flex flex-col">
          <h2 className="section-title">Students</h2>
          <p className="section-copy">All students registered for the current examination session.</p>
        </div>
        <span className="text-[11px] text-slate-400">
          Total: <span className="font-semibold text-slate-100">{students.length}</span>
        </span>
      </div>

      <div className="scroll-thin overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="border-b border-slate-800/80 bg-slate-950/90">
            <tr className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
              <th className="px-4 py-2 text-left font-normal">Student Name</th>
              <th className="px-4 py-2 text-left font-normal">Student ID</th>
              <th className="px-4 py-2 text-left font-normal">Exam</th>
              <th className="px-4 py-2 text-left font-normal">Status</th>
              <th className="px-4 py-2 text-left font-normal">Connection</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => (
              <tr
                key={student.id}
                className={[
                  "border-b border-slate-900/60 transition-colors hover:bg-slate-900/50",
                  idx % 2 === 0 ? "bg-slate-950/30" : ""
                ].join(" ")}
              >
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-100">{student.name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[11px] text-slate-300">{student.id}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[11px] text-slate-300">{student.exam}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={student.status} />
                </td>
                <td className="px-4 py-3 text-[11px] text-slate-300">{student.connection}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
