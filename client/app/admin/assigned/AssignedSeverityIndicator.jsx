"use client";

import { AlertTriangle, ArrowDown, ArrowUp, Minus } from "lucide-react";

const severityConfig = {
  Critical: {
    label: "Critical",
    detail: "Immediate review recommended",
    classes: "bg-red-100 text-red-800 border-red-200",
    Icon: AlertTriangle,
  },
  High: {
    label: "High",
    detail: "Prioritize after critical issues",
    classes: "bg-orange-100 text-orange-800 border-orange-200",
    Icon: ArrowUp,
  },
  Medium: {
    label: "Medium",
    detail: "Review during normal triage",
    classes: "bg-amber-100 text-amber-800 border-amber-200",
    Icon: Minus,
  },
  Low: {
    label: "Low",
    detail: "Can be scheduled later",
    classes: "bg-slate-100 text-slate-700 border-slate-200",
    Icon: ArrowDown,
  },
};

export default function AssignedSeverityIndicator({ severity }) {
  const config = severityConfig[severity] || severityConfig.Medium;
  const Icon = config.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${config.classes}`}
      title={config.detail}
      aria-label={`${config.label} severity: ${config.detail}`}
    >
      <Icon size={12} aria-hidden="true" />
      {config.label}
    </span>
  );
}
