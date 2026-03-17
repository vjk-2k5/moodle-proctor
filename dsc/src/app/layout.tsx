import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProctorVision - Teacher Dashboard",
  description: "Modern teacher monitoring console for online proctoring exams."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-slate-100">
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.08),transparent_22%),linear-gradient(180deg,#020617_0%,#050816_52%,#0f172a_100%)]">
          <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 lg:px-6">{children}</div>
        </div>
      </body>
    </html>
  );
}
