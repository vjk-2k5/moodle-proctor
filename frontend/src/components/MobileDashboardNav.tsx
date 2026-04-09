"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNavItems } from "./Sidebar";

export const MobileDashboardNav = () => {
  const pathname = usePathname();

  return (
    <nav className="surface-panel mb-1 overflow-x-auto rounded-[24px] px-3 py-3 scroll-thin lg:hidden">
      <div className="flex min-w-max gap-2">
        {dashboardNavItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-950 text-white shadow-lg shadow-slate-900/10"
                  : "bg-white/70 text-slate-600"
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-xl",
                  active ? "bg-white/10" : "bg-black/5"
                ].join(" ")}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
