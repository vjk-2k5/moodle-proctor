import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProctorVision - Exam Operations Dashboard",
  description: "Teacher dashboard for running exams, monitoring students, and reviewing submissions."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
