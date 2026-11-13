"use client";

import { ExternalLink } from "lucide-react";

export default function AssignedReportTextCell({ value, label, href = "" }) {
  const text = value || "Not provided";
  const content = (
    <span
      className="block max-w-[220px] truncate"
      title={text}
      aria-label={label ? `${label}: ${text}` : text}
    >
      {text}
    </span>
  );

  if (!href) {
    return <div className="text-sm text-slate-700">{content}</div>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
    >
      {content}
      <ExternalLink
        size={13}
        aria-hidden="true"
        className="shrink-0 text-blue-400 transition group-hover:text-blue-700"
      />
    </a>
  );
}
