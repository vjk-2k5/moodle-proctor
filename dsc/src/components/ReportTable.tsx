import { examReports } from "@mock/data";

export const ReportTable = () => {
  return (
    <section className="glass-surface overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3">
        <div className="flex flex-col">
          <h2 className="section-title">Exam Reports</h2>
          <p className="section-copy">Post-exam evidence packages and AI summaries.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-slate-800/70 bg-slate-950/70 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-400 md:inline-flex">
            export queue
          </span>
          <span className="text-[11px] text-slate-400">
            Total: <span className="font-semibold text-slate-100">{examReports.length}</span>
          </span>
        </div>
      </div>

      <div className="scroll-thin overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="border-b border-slate-800/80 bg-slate-950/90">
            <tr className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
              <th className="px-4 py-2 text-left font-normal">Student</th>
              <th className="px-4 py-2 text-left font-normal">Exam</th>
              <th className="px-4 py-2 text-left font-normal">Alerts</th>
              <th className="px-4 py-2 text-left font-normal">Upload Status</th>
              <th className="px-4 py-2 text-right font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {examReports.map((report, idx) => (
              <tr
                key={report.id}
                className={[
                  "border-b border-slate-900/60 transition-colors hover:bg-slate-900/50",
                  idx % 2 === 0 ? "bg-slate-950/30" : ""
                ].join(" ")}
              >
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-100">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-100">{report.studentName}</span>
                    <span className="text-[10px] text-slate-500">{report.id}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[11px] text-slate-300">{report.exam}</td>
                <td className="px-4 py-3 text-[11px] text-slate-200">
                  <span className="inline-flex rounded-full border border-slate-800/70 bg-slate-950/70 px-2 py-0.5">
                    {report.alertsCount} alerts
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={[
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      report.uploadStatus === "Completed"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                        : report.uploadStatus === "Processing"
                        ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
                        : report.uploadStatus === "Pending"
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                        : "border-red-500/40 bg-red-500/10 text-red-400"
                    ].join(" ")}
                  >
                    {report.uploadStatus}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button className="mr-3 rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[11px] text-sky-300 hover:text-sky-200">
                    View
                  </button>
                  <button className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2.5 py-1 text-[11px] text-slate-300 hover:text-slate-100">
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
