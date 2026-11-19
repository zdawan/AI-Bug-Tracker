"use client";

import { CheckCircle2, CircleDot } from "lucide-react";

export default function AssignedResolutionHint({ status }) {
  const isClosed = status === "Closed";
  const label = isClosed ? "Resolved" : "Action needed";
  const detail = isClosed ? "This report is no longer pending" : "Review before marking resolved";
  const tone = isClosed ? "text-emerald-600" : "text-amber-600";
  const Icon = isClosed ? CheckCircle2 : CircleDot;

  return (
    <span
      className={`mt-1 inline-flex items-center gap-1 text-[10px] font-medium ${tone}`}
      title={detail}
      aria-label={`${label}: ${detail}`}
    >
      <Icon size={11} aria-hidden="true" />
      {label}
    </span>
  );
}
