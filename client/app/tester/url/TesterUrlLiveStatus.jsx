"use client";

import { CheckCircle2, CircleDashed, TriangleAlert } from "lucide-react";

function getStatus(value) {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      icon: CircleDashed,
      label: "Waiting for a destination",
      detail: "Enter a domain or page URL to preview its test destination.",
      tone: "text-slate-500",
    };
  }

  try {
    const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    const hasUsableHost = parsed.hostname.includes(".") || parsed.hostname === "localhost";

    if (!hasUsableHost) throw new Error("Incomplete host");

    return {
      icon: CheckCircle2,
      label: "Destination looks ready",
      detail: `${parsed.hostname} will be carried into the bug report form.`,
      tone: "text-emerald-700",
    };
  } catch {
    return {
      icon: TriangleAlert,
      label: "Destination needs attention",
      detail: "Check the domain spelling before continuing.",
      tone: "text-amber-700",
    };
  }
}

export default function TesterUrlLiveStatus({ value }) {
  const status = getStatus(value);
  const Icon = status.icon;

  return (
    <div className={`mt-3 flex items-start gap-2 px-1 ${status.tone}`} role="status" aria-live="polite">
      <Icon size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-semibold">{status.label}</p>
        <p className="mt-0.5 text-[11px] leading-5 text-slate-500">{status.detail}</p>
      </div>
    </div>
  );
}
