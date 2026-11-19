"use client";

import { FileQuestion, FileText } from "lucide-react";

export default function AssignedReportDetailHint({ description }) {
  const hasDescription = typeof description === "string" && description.trim().length > 0;
  const label = hasDescription ? "Description available" : "No description";
  const detail = hasDescription
    ? "Open details to review the tester context"
    : "Review the other report fields for context";
  const tone = hasDescription ? "text-blue-600" : "text-slate-400";
  const Icon = hasDescription ? FileText : FileQuestion;

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
