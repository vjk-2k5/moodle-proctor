import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { MobileDashboardNav } from "@components/MobileDashboardNav";
import { TopNavbar } from "@components/TopNavbar";
import { Sidebar } from "@components/Sidebar";
import { BACKEND_TOKEN_COOKIE } from "@/lib/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const backendToken = cookies().get(BACKEND_TOKEN_COOKIE)?.value;

  if (!backendToken) {
    redirect("/login?next=/dashboard/monitoring");
  }

  return (
    <div className="dashboard-shell flex min-h-screen w-full">
      <Sidebar />
      <main className="min-h-screen flex-1 lg:pl-[17.5rem]">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-4 md:px-6 md:py-6">
          <MobileDashboardNav />
          <TopNavbar />
          <div>{children}</div>
        </div>
      </main>
    </div>
  );
}
