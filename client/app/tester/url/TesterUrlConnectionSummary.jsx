"use client";

import { Check, GlobeLock, RadioTower } from "lucide-react";

function inspectConnection(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}

export default function TesterUrlConnectionSummary({ value }) {
  const parsed = inspectConnection(value);
  if (!parsed) return null;

  const isSecure = parsed.protocol === "https:";
  const portLabel = parsed.port || (isSecure ? "443 (default)" : "80 (default)");
  const Icon = isSecure ? GlobeLock : RadioTower;

  return (
    <div className="mt-3 flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left">
      <Icon
        size={17}
        aria-hidden="true"
        className={isSecure ? "mt-0.5 shrink-0 text-emerald-600" : "mt-0.5 shrink-0 text-amber-600"}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold text-slate-700">Connection</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isSecure ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {isSecure ? "Secure HTTPS" : "HTTP"}
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">
          Port: <span className="font-medium text-slate-700">{portLabel}</span>. {isSecure ? "The destination uses encrypted transport." : "Consider HTTPS if the site supports it."}
        </p>
      </div>
      {isSecure && <Check size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600" />}
    </div>
  );
}
