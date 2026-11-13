"use client";

import { BarChart3, Filter } from "lucide-react";

export default function AssignedReportsTableCaption({ visibleCount, totalCount, filter, search }) {
  const filterLabel = filter === "open" ? "needs review" : filter === "closed" ? "resolved" : "all reports";
  const hasSearch = Boolean(search.trim());
  const resultLabel = visibleCount === 1 ? "report" : "reports";
  const scopeLabel = hasSearch ? `matching “${search.trim()}”` : "in the current view";
  const summaryText = `${visibleCount} ${resultLabel} ${scopeLabel}`;
  const filterAriaLabel = `Current report filter: ${filterLabel}`;
  const searchAriaLabel = hasSearch ? `Search is active for ${search.trim()}` : "No report search is active";

  return (
    <div
      className="mb-3 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Assigned reports table summary"
    >
      <div className="flex items-center gap-2">
        <BarChart3 size={16} aria-hidden="true" className="text-violet-600" />
        <div>
          <p className="text-xs font-semibold text-slate-700">Visible reports</p>
          <p className="text-[10px] text-slate-500">{summaryText}</p>
          <p className="text-[10px] text-slate-400">Showing {visibleCount} of {totalCount} loaded reports</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium text-slate-500">
        <span
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1"
          aria-label={filterAriaLabel}
        >
          <Filter size={12} aria-hidden="true" />
          {filterLabel}
        </span>
        <span className="sr-only" aria-live="polite">
          {searchAriaLabel}
        </span>
        {hasSearch && (
          <span className="rounded-full bg-violet-50 px-2 py-1 text-violet-700" title={`Matching: ${search.trim()}`}>
            Search active
          </span>
        )}
      </div>
    </div>
  );
}
