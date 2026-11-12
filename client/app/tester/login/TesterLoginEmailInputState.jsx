"use client";

import { Check, Edit3 } from "lucide-react";

export default function TesterLoginEmailInputState({ email = "", hasError = false }) {
  const hasEmail = email.trim().length > 0;

  if (!hasEmail && !hasError) return null;

  return (
    <span
      className={`mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium ${hasError ? "text-rose-700" : "text-slate-500"}`}
      role="status"
      aria-live="polite"
    >
      {hasError ? <Edit3 size={13} aria-hidden="true" /> : <Check size={13} className="text-emerald-600" aria-hidden="true" />}
      {hasError ? "Review the email address above" : "Email address is being edited"}
    </span>
  );
}
