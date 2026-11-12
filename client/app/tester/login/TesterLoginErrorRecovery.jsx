"use client";

import { AlertCircle, RotateCcw } from "lucide-react";

export default function TesterLoginErrorRecovery({
  error = "",
  disabled = false,
  onReset,
}) {
  if (!error) return null;

  const handleReset = () => {
    if (disabled) return;
    onReset?.();
  };

  return (
    <div
      className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50/70 p-4"
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-700" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-rose-900">The request needs attention</p>
        <p className="mt-1 text-xs leading-5 text-rose-800/80">You can review the message above or clear the form and try again.</p>
        <button
          type="button"
          onClick={handleReset}
          disabled={disabled}
          className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[11px] font-semibold text-rose-800 shadow-sm transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw size={13} aria-hidden="true" />
          Reset email step
        </button>
      </div>
    </div>
  );
}
