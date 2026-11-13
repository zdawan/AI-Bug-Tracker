"use client";

import { ListFilter, ShieldAlert } from "lucide-react";

function getQueryState(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    const names = [...new Set([...parsed.searchParams.keys()])];
    const containsSensitiveName = names.some((name) =>
      /(token|secret|password|auth|key|credential|session)/i.test(name),
    );

    return { count: names.length, containsSensitiveName };
  } catch {
    return null;
  }
}

export default function TesterUrlQuerySummary({ value }) {
  const state = getQueryState(value);
  if (!state) return null;

  const hasQuery = state.count > 0;

  return (
    <div className="mt-3 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left">
      {state.containsSensitiveName ? (
        <ShieldAlert size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-amber-600" />
      ) : (
        <ListFilter size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-slate-500" />
      )}
      <div>
        <p className="text-xs font-semibold text-slate-700">
          {hasQuery ? `${state.count} query parameter${state.count === 1 ? "" : "s"} detected` : "No query parameters detected"}
        </p>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">
          {state.containsSensitiveName
            ? "Review parameter names carefully and remove any credentials before continuing. Values are not shown here."
            : hasQuery
              ? "Parameter values stay hidden in this summary so you can review the URL more safely."
              : "The destination does not currently include extra query data."}
        </p>
      </div>
    </div>
  );
}
