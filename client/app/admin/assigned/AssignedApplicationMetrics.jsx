"use client";

const METRICS = [
  { key: "total", label: "Total", tone: "text-slate-800 bg-slate-100" },
  { key: "resolved", label: "Resolved", tone: "text-emerald-700 bg-emerald-50" },
  { key: "pending", label: "Pending", tone: "text-amber-700 bg-amber-50" },
];

export default function AssignedApplicationMetrics({ total, resolved, pending }) {
  const values = { total, resolved, pending };

  return (
    <div className="mt-3 grid grid-cols-3 gap-2" aria-label="Application bug metrics">
      {METRICS.map(({ key, label, tone }) => (
        <div key={key} className="rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-center">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
            {label}
          </span>
          <p className="mt-1 text-lg font-bold tabular-nums text-slate-800">{values[key]}</p>
        </div>
      ))}
    </div>
  );
}
