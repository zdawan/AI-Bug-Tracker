"use client";

const SEVERITY_ITEMS = [
  { label: "Critical", tone: "bg-red-100 text-red-800", detail: "Immediate attention" },
  { label: "High", tone: "bg-orange-100 text-orange-800", detail: "Prioritize soon" },
  { label: "Medium", tone: "bg-yellow-100 text-yellow-800", detail: "Review in normal flow" },
  { label: "Low", tone: "bg-slate-100 text-slate-700", detail: "Track when available" },
];

export default function AssignedSeverityLegend() {
  return (
    <section className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3" aria-labelledby="severity-legend-title">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="severity-legend-title" className="text-xs font-semibold text-slate-700">
          Severity guide
        </h2>
        <p className="text-[11px] text-slate-500">Use severity to prioritize triage.</p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {SEVERITY_ITEMS.map(({ label, tone, detail }) => (
          <div key={label} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
              {label}
            </span>
            <span className="text-[10px] text-slate-500">{detail}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
