"use client";

import { Info } from "lucide-react";

const ACCEPTED_FORMATS = [
  "github.com",
  "https://github.com/issues",
  "http://localhost:3000",
];

export default function TesterUrlValidationTip() {
  return (
    <div
      className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-left"
      role="note"
      aria-label="Accepted URL formats"
    >
      <Info
        size={16}
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-slate-500"
      />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-700">
          Accepted URL formats
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          A domain, full page URL, or local development address works. Missing
          protocols are added automatically for the preview.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ACCEPTED_FORMATS.map((format) => (
            <code
              key={format}
              className="rounded-md bg-slate-100 px-2 py-1 text-[10px] text-slate-600"
            >
              {format}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}
