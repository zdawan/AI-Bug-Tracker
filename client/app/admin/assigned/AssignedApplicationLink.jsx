"use client";

import { ExternalLink, Globe2 } from "lucide-react";

export default function AssignedApplicationLink({ url }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open assigned application ${url}`}
      className="group flex min-w-0 items-start gap-2 rounded-lg p-1 text-blue-600 transition hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
    >
      <Globe2 size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-blue-400" />
      <span className="min-w-0 flex-1">
        <span className="block break-all text-sm font-semibold leading-5">{url}</span>
        <span className="mt-1 flex items-center gap-1 text-[10px] font-medium text-blue-500 group-hover:underline">
          Open application
          <ExternalLink size={11} aria-hidden="true" />
        </span>
      </span>
    </a>
  );
}
