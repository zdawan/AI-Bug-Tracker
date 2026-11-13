"use client";

import { ClipboardCheck, Inbox, RefreshCw } from "lucide-react";

export default function AssignedReportsEmptyState({ onRefresh }) {
  return (
    <section className="mx-auto mt-10 max-w-md rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center" aria-labelledby="assigned-empty-title">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
        <Inbox size={24} aria-hidden="true" />
      </div>
      <h2 id="assigned-empty-title" className="mt-4 text-base font-semibold text-slate-800">
        No bug reports yet
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Reports assigned to your applications will appear here when testers submit them.
      </p>
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
        <ClipboardCheck size={14} aria-hidden="true" className="text-emerald-600" />
        Your assigned applications are ready for review.
      </div>
      {onRefresh && (
        <button type="button" onClick={onRefresh} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
          <RefreshCw size={14} aria-hidden="true" />
          Refresh reports
        </button>
      )}
    </section>
  );
}
