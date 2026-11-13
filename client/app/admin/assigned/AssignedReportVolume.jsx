"use client";

import { BarChart3, CircleHelp } from "lucide-react";

function normalizeCount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export default function AssignedReportVolume({ reports }) {
  const count = normalizeCount(reports);
  const hasRepeatedReports = count > 1;
  const label = count === 1 ? "1 report" : `${count} reports`;
  const detail = count === 0
    ? "No repeated submissions recorded"
    : hasRepeatedReports
      ? "Multiple testers reported this issue"
      : "Single tester submission";
  const priorityHint = hasRepeatedReports ? "Consider prioritizing" : "Review context";
  const tone = hasRepeatedReports
    ? "border-violet-200 bg-violet-50 text-violet-800"
    : "border-slate-200 bg-slate-50 text-slate-600";
  const Icon = count === 0 ? CircleHelp : BarChart3;

  return (
    <div
      className={`inline-flex min-w-[92px] items-start gap-2 rounded-xl border px-2.5 py-2 ${tone}`}
      title={detail}
      aria-label={`${label}. ${detail}`}
      aria-live="polite"
    >
      <Icon size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span>
        <span className="block text-xs font-bold">{label}</span>
        <span className="block text-[10px] leading-4 opacity-75">{detail}</span>
        <span className="block text-[10px] leading-4 opacity-65">{priorityHint}</span>
      </span>
    </div>
  );
}
