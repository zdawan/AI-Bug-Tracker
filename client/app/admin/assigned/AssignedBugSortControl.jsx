"use client";

import { ArrowDownAZ, ArrowUpDown } from "lucide-react";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest reports" },
  { value: "oldest", label: "Oldest reports" },
  { value: "severity", label: "Highest severity" },
];

export default function AssignedBugSortControl({ value, onChange }) {
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
        <ArrowDownAZ size={15} aria-hidden="true" className="text-violet-600" />
        Sort visible reports
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-500">
        <span className="sr-only">Sort assigned bug reports</span>
        <ArrowUpDown size={14} aria-hidden="true" className="text-slate-400" />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
        >
          {SORT_OPTIONS.map(({ value: optionValue, label }) => (
            <option key={optionValue} value={optionValue}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
