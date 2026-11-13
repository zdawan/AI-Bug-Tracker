"use client";

import { FileQuestion, RotateCcw, SearchX } from "lucide-react";

export default function AssignedFilteredEmptyState({ hasSearch, onClearSearch, onShowAll }) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center" aria-labelledby="filtered-empty-title">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        {hasSearch ? <SearchX size={24} aria-hidden="true" /> : <FileQuestion size={24} aria-hidden="true" />}
      </div>
      <h2 id="filtered-empty-title" className="mt-4 text-base font-semibold text-slate-800">
        No matching reports
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {hasSearch ? "Try a different title, category, or URL search." : "There are no reports in this status view."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {hasSearch && <button type="button" onClick={onClearSearch} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"><RotateCcw size={14} aria-hidden="true" />Clear search</button>}
        <button type="button" onClick={onShowAll} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">Show all reports</button>
      </div>
    </section>
  );
}
