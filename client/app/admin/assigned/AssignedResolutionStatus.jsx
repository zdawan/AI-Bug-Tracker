"use client";

import { CheckCircle2, CircleDashed, TriangleAlert } from "lucide-react";

export default function AssignedResolutionStatus({ total, pending }) {
  if (total === 0) {
    return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500"><CircleDashed size={14} aria-hidden="true" />No bugs reported</span>;
  }

  if (pending === 0) {
    return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14} aria-hidden="true" />All bugs resolved</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
      <TriangleAlert size={14} aria-hidden="true" />
      {pending} {pending === 1 ? "bug" : "bugs"} need{pending === 1 ? "s" : ""} action
    </span>
  );
}
