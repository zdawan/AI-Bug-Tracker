"use client";

import { CheckCircle2, CircleAlert, Target } from "lucide-react";

function getCompletionRate(total, resolved) {
  if (!total) return 0;
  return Math.round((resolved / total) * 100);
}

export default function AssignedReportHealthPanel({ bugs }) {
  const total = bugs.length;
  const resolved = bugs.filter((bug) => bug.status === "Closed").length;
  const open = total - resolved;
  const completionRate = getCompletionRate(total, resolved);
  const healthLabel = completionRate >= 80 ? "On track" : open > 0 ? "Needs attention" : "Clear";
  const healthTone = completionRate >= 80
    ? "border-emerald-100 bg-emerald-50 text-emerald-800"
    : "border-amber-100 bg-amber-50 text-amber-800";

  return (
    <section
      className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      aria-label="Assigned report health"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-violet-100 p-2 text-violet-700">
            <Target size={17} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Report health</h2>
            <p className="text-xs text-slate-500">A quick view of your assigned workload.</p>
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-bold ${healthTone}`}>
          {healthLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-1 text-xl font-bold text-slate-800">{total}</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            <CircleAlert size={12} aria-hidden="true" /> Open
          </div>
          <p className="mt-1 text-xl font-bold text-amber-900">{open}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            <CheckCircle2 size={12} aria-hidden="true" /> Resolved
          </div>
          <p className="mt-1 text-xl font-bold text-emerald-900">{resolved}</p>
        </div>
      </div>

      <div className="mt-4" aria-label={`${completionRate}% of assigned reports resolved`}>
        <div className="mb-1 flex justify-between text-[10px] font-medium text-slate-500">
          <span>Resolution coverage</span>
          <span>{completionRate}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>
    </section>
  );
}
