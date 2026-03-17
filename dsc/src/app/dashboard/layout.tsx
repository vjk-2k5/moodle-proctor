import { Sidebar } from "@components/Sidebar";
import { TopNavbar } from "@components/TopNavbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 flex gap-4">
      <Sidebar />
      <div className="flex-1 flex flex-col gap-4">
        <TopNavbar />
        <main className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-4">{children}</div>
        </main>
      </div>
    </div>
  );
}

