"use client";

import { BarChart3, Filter } from "lucide-react";

export default function AssignedReportsTableCaption({ visibleCount, totalCount, filter, search }) {
  const filterLabel = filter === "open" ? "needs review" : filter === "closed" ? "resolved" : "all reports";
  const hasSearch = Boolean(search.trim());

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <BarChart3 size={16} aria-hidden="true" className="text-violet-600" />
        <div>
          <p className="text-xs font-semibold text-slate-700">Visible reports</p>
          <p className="text-[10px] text-slate-500">
            Showing {visibleCount} of {totalCount} loaded reports
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium text-slate-500">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
          <Filter size={12} aria-hidden="true" />
          {filterLabel}
        </span>
        {hasSearch && <span className="rounded-full bg-violet-50 px-2 py-1 text-violet-700">Search active</span>}
      </div>
    </div>
  );
}
