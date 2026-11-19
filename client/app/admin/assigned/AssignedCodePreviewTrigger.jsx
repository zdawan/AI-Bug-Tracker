"use client";

import { Code2, ExternalLink } from "lucide-react";

export default function AssignedCodePreviewTrigger({ onOpen, hasCode = false }) {
  const label = hasCode ? "Open code" : "Preview fallback";
  const detail = hasCode
    ? "View the captured source linked to this report"
    : "The captured source is not available yet";
  const tone = hasCode
    ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100";
  const statusLabel = hasCode ? "Source available" : "Source unavailable";
  const reviewHint = hasCode
    ? "Inspect before reproducing"
    : "Use report details instead";

  return (
    <div className="flex max-w-[150px] flex-col items-start gap-1">
      <button
        type="button"
        onClick={onOpen}
        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${tone}`}
        title={detail}
        aria-label={`${label}: ${detail}`}
      >
        <Code2 size={13} aria-hidden="true" />
        {label}
        <ExternalLink size={11} aria-hidden="true" />
      </button>
      <span className="text-[10px] leading-4 text-slate-400">
        {hasCode ? "Captured snippet" : "Fallback response"}
      </span>
      <span className="text-[10px] leading-4 text-slate-400" role="status" aria-live="polite">
        {statusLabel} · {reviewHint}
      </span>
      <span className="text-[9px] text-slate-400">Review state is current</span>
    </div>
  );
}
