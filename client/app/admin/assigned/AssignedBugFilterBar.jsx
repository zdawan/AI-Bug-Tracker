"use client";

import { CheckCircle2, ListFilter, ListTodo } from "lucide-react";

const FILTERS = [
  { value: "all", label: "All reports", icon: ListFilter },
  { value: "open", label: "Needs review", icon: ListTodo },
  { value: "closed", label: "Resolved", icon: CheckCircle2 },
];

export default function AssignedBugFilterBar({ bugs = [], value, onChange }) {
  const getCount = (filter) => {
    if (filter === "open") return bugs.filter((bug) => bug.status !== "Closed").length;
    if (filter === "closed") return bugs.filter((bug) => bug.status === "Closed").length;
    return bugs.length;
  };

  return (
    <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-3" aria-label="Filter assigned bug reports">
      <div className="flex items-center gap-2 px-1 text-xs font-semibold text-slate-700">
        <ListFilter size={15} aria-hidden="true" className="text-violet-600" />
        Review filters
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {FILTERS.map(({ value: filter, label, icon: Icon }) => {
          const selected = value === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => onChange(filter)}
              aria-pressed={selected}
              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${selected ? "border-violet-300 bg-violet-50 text-violet-800" : "border-slate-200 text-slate-600 hover:border-violet-200 hover:bg-slate-50"}`}
            >
              <span className="flex items-center gap-2"><Icon size={14} aria-hidden="true" />{label}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] tabular-nums text-slate-500">{getCount(filter)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
