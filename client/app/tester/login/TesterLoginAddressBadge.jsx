"use client";

import { MailCheck } from "lucide-react";

export default function TesterLoginAddressBadge({ email = "" }) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) return null;

  return (
    <div
      className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
      role="status"
      aria-live="polite"
    >
      <MailCheck size={15} className="shrink-0 text-emerald-600" aria-hidden="true" />
      <span className="min-w-0 truncate text-[11px] text-slate-600">
        Code destination: <strong className="font-semibold text-slate-800">{normalizedEmail}</strong>
      </span>
    </div>
  );
}
