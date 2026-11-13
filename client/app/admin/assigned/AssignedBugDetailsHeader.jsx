"use client";

import { Bug, CheckCircle2, X } from "lucide-react";

export default function AssignedBugDetailsHeader({ bug, onClose }) {
  const isClosed = bug.status === "Closed";

  return (
    <header className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <Bug size={14} aria-hidden="true" className="text-violet-600" />
          Report details
        </div>
        <h2 className="mt-2 break-words text-xl font-bold text-slate-900">{bug.title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
            {bug.severity || "Unspecified severity"}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${isClosed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {isClosed && <CheckCircle2 size={12} aria-hidden="true" />}
            {isClosed ? "Resolved" : "Open"}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close report details"
        title="Close report details"
        className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
      >
        <X size={18} aria-hidden="true" />
      </button>
    </header>
  );
}
