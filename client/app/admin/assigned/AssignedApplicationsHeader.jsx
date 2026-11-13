"use client";

import { ExternalLink, Globe2 } from "lucide-react";

export default function AssignedApplicationsHeader({ count }) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-700">
          <Globe2 size={15} aria-hidden="true" />
          Assigned scope
        </div>
        <h2 className="mt-2 text-xl font-bold text-slate-800">Assigned applications</h2>
        <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
          Review the websites connected to your account and follow their reports through resolution.
        </p>
      </div>
      <div className="flex items-center gap-2 self-start rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 sm:self-auto">
        <span className="rounded-full bg-white px-2 py-1 tabular-nums text-slate-800 shadow-sm">{count}</span>
        {count === 1 ? "application" : "applications"}
        <ExternalLink size={14} aria-hidden="true" className="text-slate-400" />
      </div>
    </div>
  );
}
