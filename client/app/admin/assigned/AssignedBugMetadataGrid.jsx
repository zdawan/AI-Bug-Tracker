"use client";

const METADATA_FIELDS = [
  { key: "category", label: "Category", fallback: "General Bug" },
  { key: "reports", label: "Reports", fallback: "0" },
  { key: "status", label: "Status", fallback: "Open" },
  { key: "testUrl", label: "Test URL", fallback: "Not provided" },
];

export default function AssignedBugMetadataGrid({ bug }) {
  return (
    <dl className="mb-5 grid gap-2 sm:grid-cols-2">
      {METADATA_FIELDS.map(({ key, label, fallback }) => {
        const value = bug[key] ?? fallback;
        return (
          <div key={key} className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {label}
            </dt>
            <dd
              className="mt-1 truncate text-xs font-medium text-slate-700"
              title={String(value)}
            >
              {value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
