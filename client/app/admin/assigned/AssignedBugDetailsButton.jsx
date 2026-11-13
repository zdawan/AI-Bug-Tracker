"use client";

import { FileSearch } from "lucide-react";

export default function AssignedBugDetailsButton({ bug, onSelect }) {
  const description = bug.detail || bug.description || "No detail provided";

  return (
    <button
      type="button"
      onClick={() => onSelect(bug)}
      aria-label={`View details for ${bug.title || "this report"}`}
      className="group inline-flex max-w-[160px] items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-blue-600 underline decoration-blue-200 underline-offset-2 transition hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
      title={description}
    >
      <FileSearch size={14} aria-hidden="true" className="shrink-0 text-blue-400 group-hover:text-blue-700" />
      <span className="truncate">View details</span>
    </button>
  );
}
