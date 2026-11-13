"use client";

const CATEGORY_STYLES = {
  "UI Bug": "bg-blue-100 text-blue-800",
  "Backend Bug": "bg-indigo-100 text-indigo-800",
  "Security Bug": "bg-red-100 text-red-800",
  "Performance Bug": "bg-amber-100 text-amber-800",
  "Database Bug": "bg-teal-100 text-teal-800",
  "Developer Error": "bg-slate-200 text-slate-700",
};

export default function AssignedBugCategoryBadge({ category }) {
  const label = category || "General Bug";
  const style = CATEGORY_STYLES[label] || "bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${style}`}
      title={`Category: ${label}`}
    >
      {label}
    </span>
  );
}
