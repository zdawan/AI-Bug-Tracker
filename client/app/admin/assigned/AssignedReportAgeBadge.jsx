"use client";

import { Clock3, History } from "lucide-react";

function getAgeInDays(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
}

export default function AssignedReportAgeBadge({ createdAt }) {
  const ageInDays = getAgeInDays(createdAt);
  const isUnknown = ageInDays === null;
  const isFresh = !isUnknown && ageInDays < 2;
  const isAging = !isUnknown && ageInDays >= 7;
  const label = isUnknown ? "Date unavailable" : ageInDays === 0 ? "Today" : `${ageInDays}d old`;
  const detail = isUnknown
    ? "The report creation date could not be read"
    : isFresh
      ? "Recently submitted"
      : isAging
        ? "Review for stale context"
        : "Submitted this week";
  const tone = isUnknown
    ? "border-slate-200 bg-slate-50 text-slate-500"
    : isAging
      ? "border-orange-200 bg-orange-50 text-orange-800"
      : "border-blue-200 bg-blue-50 text-blue-700";
  const Icon = isAging ? History : Clock3;

  return (
    <span
      className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone}`}
      title={detail}
      aria-label={`${label}: ${detail}`}
    >
      <Icon size={11} aria-hidden="true" />
      {label}
    </span>
  );
}
