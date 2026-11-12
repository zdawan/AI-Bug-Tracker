"use client";

import { ArrowUpRight, FileText } from "lucide-react";

export default function TesterUrlSubmitContext({ isSubmitting }) {
  return (
    <p
      className="flex items-center justify-center gap-2 px-2 text-center text-[11px] leading-5 text-slate-500"
      aria-live="polite"
    >
      <FileText size={14} aria-hidden="true" className="shrink-0 text-slate-400" />
      <span>
        {isSubmitting
          ? "Preparing your bug report form..."
          : "Continue opens a report form with this URL attached."}
      </span>
      {!isSubmitting && (
        <ArrowUpRight size={13} aria-hidden="true" className="shrink-0 text-slate-400" />
      )}
    </p>
  );
}
