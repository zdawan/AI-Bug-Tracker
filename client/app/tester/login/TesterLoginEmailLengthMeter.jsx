"use client";

import { Ruler } from "lucide-react";

export default function TesterLoginEmailLengthMeter({ value = "", max = 254 }) {
  const length = value.length;
  const percentage = Math.min(100, Math.round((length / max) * 100));
  const warning = percentage >= 90;

  if (!value) return null;

  return (
    <div className="mt-2 flex items-center gap-2" aria-live="polite">
      <Ruler size={13} className={warning ? "text-amber-600" : "text-slate-400"} aria-hidden="true" />
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div className={`h-full rounded-full transition-[width] ${warning ? "bg-amber-500" : "bg-purple-500"}`} style={{ width: `${percentage}%` }} />
      </div>
      <span className={`text-[10px] font-semibold ${warning ? "text-amber-700" : "text-slate-500"}`}>{length}/{max}</span>
    </div>
  );
}
