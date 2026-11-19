"use client";

import { Check, Tag } from "lucide-react";

export default function AssignedReportCategoryHint({ category }) {
  const value = typeof category === "string" ? category.trim() : "";
  const isKnown = value.length > 0;
  const label = isKnown ? "Categorized" : "Needs category";
  const detail = isKnown ? "Ready for category-based triage" : "Assign a category during review";
  const tone = isKnown ? "text-emerald-600" : "text-amber-600";
  const Icon = isKnown ? Check : Tag;

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
