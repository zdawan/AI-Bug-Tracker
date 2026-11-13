"use client";

import { CheckCircle2, CircleAlert, Globe2, ListTodo } from "lucide-react";

export default function AssignedWorkloadOverview({ urls = [], bugs = [] }) {
  const resolvedCount = bugs.filter((bug) => bug.status === "Closed").length;
  const pendingCount = bugs.length - resolvedCount;
  const metrics = [
    {
      icon: Globe2,
      label: "Applications",
      value: urls.length,
      tone: "text-blue-700 bg-blue-50",
    },
    {
      icon: ListTodo,
      label: "Total reports",
      value: bugs.length,
      tone: "text-violet-700 bg-violet-50",
    },
    {
      icon: CircleAlert,
      label: "Needs review",
      value: pendingCount,
      tone: "text-amber-700 bg-amber-50",
    },
    {
      icon: CheckCircle2,
      label: "Resolved",
      value: resolvedCount,
      tone: "text-emerald-700 bg-emerald-50",
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5" aria-labelledby="assigned-workload-title">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="assigned-workload-title" className="text-sm font-semibold text-slate-800">
          Workload overview
        </h2>
        <p className="text-xs text-slate-500">
          Keep an eye on reports that still need action.
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map(({ icon: Icon, label, value, tone }) => (
          <div key={label} className="rounded-xl border border-white bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">{label}</span>
              <span className={`rounded-lg p-1.5 ${tone}`}><Icon size={15} aria-hidden="true" /></span>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
