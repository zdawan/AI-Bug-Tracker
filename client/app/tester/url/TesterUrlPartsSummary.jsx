"use client";

import { Boxes, Link2, Route } from "lucide-react";

function parseUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}

export default function TesterUrlPartsSummary({ value }) {
  const parsed = parseUrl(value);

  if (!parsed) return null;

  const parts = [
    { icon: Link2, label: "Protocol", value: parsed.protocol.replace(":", "") },
    { icon: Boxes, label: "Host", value: parsed.host },
    { icon: Route, label: "Path", value: parsed.pathname || "/" },
  ];

  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-left" aria-labelledby="url-parts-title">
      <h2 id="url-parts-title" className="text-xs font-semibold text-slate-700">
        Destination breakdown
      </h2>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {parts.map(({ icon: Icon, label, value: partValue }) => (
          <div key={label} className="min-w-0 rounded-lg bg-white px-2.5 py-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              <Icon size={13} aria-hidden="true" />
              {label}
            </div>
            <p className="mt-1 truncate text-xs text-slate-700" title={partValue}>
              {partValue}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
