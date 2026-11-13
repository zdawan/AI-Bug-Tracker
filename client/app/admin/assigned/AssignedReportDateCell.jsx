"use client";

function getAgeLabel(dateValue) {
  const timestamp = new Date(dateValue).getTime();
  if (Number.isNaN(timestamp)) return "Date unavailable";

  const elapsedDays = Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
  if (elapsedDays === 0) return "Today";
  if (elapsedDays === 1) return "Yesterday";
  return `${elapsedDays} days ago`;
}

export default function AssignedReportDateCell({ value }) {
  const timestamp = new Date(value).getTime();
  const isValid = !Number.isNaN(timestamp);
  const formattedDate = isValid
    ? new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Date unavailable";

  return (
    <div className="min-w-[100px]" title={isValid ? new Date(value).toLocaleString() : undefined}>
      <p className="text-sm font-medium text-slate-700">{formattedDate}</p>
      <p className="mt-0.5 text-[10px] text-slate-500">
        {isValid ? getAgeLabel(value) : "Check report metadata"}
      </p>
    </div>
  );
}
