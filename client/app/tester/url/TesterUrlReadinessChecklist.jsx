"use client";

import { CheckCircle2, Circle, ListChecks } from "lucide-react";

function buildItems(value) {
  const trimmed = value.trim();
  let parsed = null;

  try {
    parsed = trimmed
      ? new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
      : null;
  } catch {
    parsed = null;
  }

  return [
    { label: "A destination is entered", complete: Boolean(trimmed) },
    { label: "The address is readable", complete: Boolean(parsed) },
    { label: "The target has been reviewed", complete: Boolean(parsed) },
  ];
}

export default function TesterUrlReadinessChecklist({ value }) {
  const items = buildItems(value);
  const readyCount = items.filter(({ complete }) => complete).length;

  return (
    <section
      className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-left"
      aria-labelledby="tester-url-readiness-title"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListChecks size={16} aria-hidden="true" className="text-violet-600" />
          <h2 id="tester-url-readiness-title" className="text-xs font-semibold text-slate-700">
            Readiness check
          </h2>
        </div>
        <span className="text-[10px] font-medium text-slate-400">
          {readyCount}/{items.length} complete
        </span>
      </div>

      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {items.map(({ label, complete }) => (
          <li key={label} className="flex items-start gap-2 text-[11px] leading-5 text-slate-600">
            {complete ? (
              <CheckCircle2 size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600" />
            ) : (
              <Circle size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-slate-300" />
            )}
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
