"use client";

import { Hash, Info } from "lucide-react";

function getFragment(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return parsed.hash.replace(/^#/, "");
  } catch {
    return null;
  }
}

export default function TesterUrlFragmentSummary({ value }) {
  const fragment = getFragment(value);
  if (fragment === null) return null;

  const hasFragment = Boolean(fragment);

  return (
    <div className="mt-3 flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left">
      {hasFragment ? (
        <Hash size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-violet-600" />
      ) : (
        <Info size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-slate-400" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-700">
          {hasFragment ? "Page fragment detected" : "No page fragment detected"}
        </p>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">
          {hasFragment
            ? "The hash route may select a tab, section, or client-side view after the page opens."
            : "Add a hash such as #settings when the issue only appears in a specific client-side view."}
        </p>
        {hasFragment && (
          <code className="mt-2 block truncate rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-600" title={`#${fragment}`}>
            #{fragment}
          </code>
        )}
      </div>
    </div>
  );
}
