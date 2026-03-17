import type { StudentStatus } from "@app-types/index";

interface Props {
  status: StudentStatus;
}

const statusConfig: Record<StudentStatus, { label: string; className: string }> = {
  normal: {
    label: "Normal",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
  },
  warning: {
    label: "Warning",
    className: "bg-amber-500/15 text-amber-300 border-amber-500/40"
  },
  suspicious: {
    label: "Suspicious",
    className: "bg-red-500/15 text-red-400 border-red-500/40"
  }
};

export const StatusBadge = ({ status }: Props) => {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase ${config.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
};

