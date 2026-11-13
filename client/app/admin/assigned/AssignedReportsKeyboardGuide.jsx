"use client";

import { Command, Search, SlidersHorizontal } from "lucide-react";

const guideItems = [
  {
    key: "Search",
    label: "Search titles, categories, or URLs",
    icon: Search,
  },
  {
    key: "Filter",
    label: "Switch between open, resolved, and all reports",
    icon: SlidersHorizontal,
  },
  {
    key: "Review",
    label: "Open a report detail to inspect its metadata",
    icon: Command,
  },
];

export default function AssignedReportsKeyboardGuide({ isFiltered, resultCount }) {
  const resultLabel = resultCount === 1 ? "result" : "results";
  const intro = isFiltered
    ? `Your current view contains ${resultCount} ${resultLabel}.`
    : "Use the controls below to narrow the assigned report list.";

  return (
    <aside
      className="mb-4 rounded-2xl border border-violet-100 bg-violet-50/70 p-4"
      aria-label="Assigned reports usage guide"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-wide text-violet-800">
            Review faster
          </p>
          <p className="mt-1 text-xs leading-5 text-violet-900">{intro}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-violet-700 shadow-sm">
          Admin triage guide
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {guideItems.map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            className="flex items-start gap-2 rounded-xl border border-violet-100 bg-white/80 p-2"
          >
            <Icon size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-violet-600" />
            <div>
              <p className="text-[10px] font-bold text-slate-700">{key}</p>
              <p className="text-[10px] leading-4 text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
