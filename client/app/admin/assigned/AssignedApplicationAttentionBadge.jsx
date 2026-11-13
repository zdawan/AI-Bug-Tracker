"use client";

import { CheckCircle2, CircleAlert, Minus } from "lucide-react";

export default function AssignedApplicationAttentionBadge({ total, pending }) {
  const isEmpty = total === 0;
  const isClear = !isEmpty && pending === 0;
  const label = isEmpty ? "No reports" : isClear ? "All clear" : `${pending} pending`;
  const description = isEmpty
    ? "No submitted reports yet"
    : isClear
      ? "Every report is resolved"
      : "Review pending reports";
  const actionHint = isEmpty
    ? "This application is waiting for its first test report."
    : isClear
      ? "No additional action is required for this application."
      : `${pending} report${pending === 1 ? "" : "s"} still need${pending === 1 ? "s" : ""} attention.`;
  const tone = isEmpty
    ? "border-slate-200 bg-slate-50 text-slate-600"
    : isClear
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-amber-200 bg-amber-50 text-amber-800";
  const Icon = isEmpty ? Minus : isClear ? CheckCircle2 : CircleAlert;

  return (
    <div
      className={`mt-4 flex items-start gap-2 rounded-xl border px-3 py-2 ${tone}`}
      role="status"
      aria-label={`${label}: ${description}`}
    >
      <Icon size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-bold">{label}</p>
        <p className="text-[10px] leading-4 opacity-80">{description}</p>
        <p className="mt-1 text-[10px] leading-4 opacity-70">{actionHint}</p>
      </div>
    </div>
  );
}
