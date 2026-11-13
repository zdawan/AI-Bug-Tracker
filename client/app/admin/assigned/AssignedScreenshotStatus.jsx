"use client";

import { Camera, ImageOff } from "lucide-react";

export default function AssignedScreenshotStatus({ screenshots }) {
  const items = Array.isArray(screenshots) ? screenshots.filter(Boolean) : [];
  const hasScreenshots = items.length > 0;
  const label = hasScreenshots ? `${items.length} available` : "Not included";
  const description = hasScreenshots
    ? "Open the attached evidence to compare the reported behavior."
    : "The tester did not attach visual evidence to this report.";
  const attachmentHint = hasScreenshots
    ? `Review ${items.length === 1 ? "the attached image" : "the attached images"} before resolving.`
    : "Request a screenshot if visual confirmation is needed.";
  const countLabel = hasScreenshots
    ? `${items.length} attachment${items.length === 1 ? "" : "s"}`
    : "Attachment check";
  const Icon = hasScreenshots ? Camera : ImageOff;
  const tone = hasScreenshots
    ? "border-blue-200 bg-blue-50 text-blue-700"
    : "border-slate-200 bg-slate-50 text-slate-500";

  return (
    <div
      className={`inline-flex max-w-[170px] items-start gap-2 rounded-xl border px-2.5 py-2 ${tone}`}
      title={description}
      aria-label={`Screenshots: ${label}. ${description}`}
    >
      <Icon size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span className="min-w-0">
        <span className="block text-[10px] font-bold">{label}</span>
        <span className="sr-only">{countLabel}</span>
        <span className="mt-0.5 block text-[10px] leading-4 opacity-80">
          {hasScreenshots ? "Visual evidence attached" : "No visual evidence"}
        </span>
        <span className="mt-0.5 block text-[10px] leading-4 opacity-70">
          {attachmentHint}
        </span>
      </span>
    </div>
  );
}
