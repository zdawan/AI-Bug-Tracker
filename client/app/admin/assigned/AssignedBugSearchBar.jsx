"use client";

import { Search, X } from "lucide-react";

export default function AssignedBugSearchBar({ value, onChange, resultCount }) {
  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3" role="search" aria-label="Search assigned bug reports">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100">
        <Search size={17} aria-hidden="true" className="shrink-0 text-slate-400" />
        <label htmlFor="assigned-bug-search" className="sr-only">Search assigned bug reports</label>
        <input
          id="assigned-bug-search"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search title, category, or URL"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear report search"
            title="Clear report search"
            className="rounded-md p-1 text-slate-400 transition hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="mt-2 px-1 text-[11px] text-slate-500" aria-live="polite">
        {value ? `${resultCount} matching report${resultCount === 1 ? "" : "s"}` : "Search is applied to the reports already loaded on this page."}
      </p>
    </div>
  );
}
