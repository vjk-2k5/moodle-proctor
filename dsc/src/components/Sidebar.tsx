"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiLogOut,
  FiMonitor,
  FiSettings,
  FiUsers
} from "react-icons/fi";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <FiActivity className="h-4 w-4" /> },
  { label: "Live Monitoring", href: "/dashboard/monitoring", icon: <FiMonitor className="h-4 w-4" /> },
  { label: "AI Alerts", href: "/dashboard/alerts", icon: <FiAlertTriangle className="h-4 w-4" /> },
  { label: "Students", href: "/dashboard/students", icon: <FiUsers className="h-4 w-4" /> },
  { label: "Reports", href: "/dashboard/reports", icon: <FiBarChart2 className="h-4 w-4" /> },
  { label: "Settings", href: "/dashboard/settings", icon: <FiSettings className="h-4 w-4" /> }
];

export const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    router.push("/login");
  };

  return (
    <>
      <div className="glass-surface flex items-center gap-2 overflow-x-auto rounded-2xl px-3 py-3 lg:hidden">
        {navItems.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs transition-colors",
                active
                  ? "border-accent.blue/40 bg-accent.blue/15 text-accent.blue"
                  : "border-slate-800/70 bg-slate-950/60 text-slate-300"
              ].join(" ")}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <aside className="glass-surface hidden w-64 shrink-0 rounded-[28px] px-4 py-6 lg:flex lg:flex-col gap-6">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-accent.blue/40 bg-accent.blue/20">
            <span className="text-lg font-semibold text-accent.blue">PV</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-wide">ProctorVision</span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              Teacher Console
            </span>
          </div>
        </div>

        <div className="surface-muted rounded-2xl px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Session</p>
          <p className="mt-2 text-sm font-medium text-slate-100">Physics Midterm - Group A</p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Live monitoring active
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-sm transition-colors",
                  active
                    ? "border-accent.blue/40 bg-accent.blue/15 text-accent.blue"
                    : "border-transparent text-slate-300 hover:border-slate-800/70 hover:bg-slate-800/60 hover:text-white"
                ].join(" ")}
              >
                <span className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </span>
                {active && <span className="h-2 w-2 rounded-full bg-accent.blue" />}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <FiLogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </aside>
    </>
  );
};
