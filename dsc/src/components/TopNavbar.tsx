import { alerts } from "@mock/data";
import { FiBell, FiClock, FiFilter, FiSearch, FiUser } from "react-icons/fi";

export const TopNavbar = () => {
  const activeAlerts = alerts.length;

  return (
    <header className="glass-surface sticky top-4 z-20 rounded-2xl px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Active Session</span>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <span className="font-semibold text-slate-100">Physics Midterm - Group A</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-400">Live</span>
            </div>
          </div>

          <button className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700/70 bg-slate-900/80 transition-colors hover:border-accent.blue/60 lg:hidden">
            <FiBell className="h-4 w-4 text-slate-300" />
            {activeAlerts > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-semibold">
                {activeAlerts}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-800/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-400">
            <FiClock className="h-3.5 w-3.5" />
            <span>Remaining Time:</span>
            <span className="font-semibold text-slate-100">01:23:18</span>
          </div>

          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-slate-800/70 bg-slate-950/70 px-3 py-2">
            <FiSearch className="h-3.5 w-3.5 text-slate-500" />
            <input
              placeholder="Search student, ID, alert type..."
              className="w-full border-none bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500"
            />
          </div>

          <button className="hidden items-center gap-2 rounded-full border border-slate-800/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-300 transition-colors hover:border-slate-700 md:inline-flex">
            <FiFilter className="h-3.5 w-3.5" />
            Alert filters
          </button>

          <button className="relative hidden h-9 w-9 items-center justify-center rounded-full border border-slate-700/70 bg-slate-900/80 transition-colors hover:border-accent.blue/60 lg:flex">
            <FiBell className="h-4 w-4 text-slate-300" />
            {activeAlerts > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-semibold">
                {activeAlerts}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 pl-1 sm:border-l sm:border-slate-800/90 sm:pl-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-emerald-400 text-xs font-semibold">
              T
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-medium text-slate-100">Dr. Alice Nguyen</span>
              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                <FiUser className="h-3 w-3" />
                Lead Proctor
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
