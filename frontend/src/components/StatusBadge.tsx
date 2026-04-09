import type { StudentStatus } from "@app-types/index";

interface Props {
  status: StudentStatus;
}

const statusConfig: Record<StudentStatus, { label: string; className: string; dotColor: string }> = {
  normal: {
    label: "Normal",
    className: "border-emerald-200/80 bg-emerald-50/90 text-emerald-700",
    dotColor: "bg-emerald-500"
  },
  warning: {
    label: "Warning",
    className: "border-amber-200/80 bg-amber-50/90 text-amber-700",
    dotColor: "bg-amber-500"
  },
  suspicious: {
    label: "Suspicious",
    className: "border-red-200/80 bg-red-50/90 text-red-700",
    dotColor: "bg-red-500"
  }
};

export const StatusBadge = ({ status }: Props) => {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm shadow-slate-200/40 ${config.className}`}
    >
      <span className={`h-2 w-2 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
};
