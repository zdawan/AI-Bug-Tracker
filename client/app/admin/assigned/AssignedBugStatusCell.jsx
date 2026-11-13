"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";

export default function AssignedBugStatusCell({ bug, onResolve }) {
  const isClosed = bug.status === "Closed";

  if (isClosed) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
          <CheckCircle2 size={13} aria-hidden="true" />
          Resolved
        </span>
        <span className="text-[10px] text-slate-400">No action needed</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
        <CircleAlert size={13} aria-hidden="true" />
        Open
      </span>
      <button
        type="button"
        onClick={() => onResolve(bug)}
        className="rounded-md px-2 py-1 text-xs font-semibold text-blue-600 underline transition hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
      >
        Mark resolved
      </button>
    </div>
  );
}
