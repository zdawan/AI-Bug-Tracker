"use client";

import { Delete, Eraser, Keyboard } from "lucide-react";

export default function TesterLoginEmailActions({ value = "", disabled = false, onClear }) {
  const canClear = Boolean(value) && !disabled;

  const handleClear = () => {
    if (!canClear) return;
    onClear?.();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      handleClear();
    }
  };

  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      <p className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
        <Keyboard size={13} aria-hidden="true" />
        Press <kbd className="rounded border border-slate-300 bg-white px-1 py-0.5 font-semibold text-slate-600">Esc</kbd> to clear
      </p>
      {value ? (
        <button
          type="button"
          onClick={handleClear}
          onKeyDown={handleKeyDown}
          disabled={!canClear}
          aria-label="Clear tester email address"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Eraser size={13} aria-hidden="true" />
          Clear email
        </button>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
          <Delete size={13} aria-hidden="true" />
          Optional field action
        </span>
      )}
    </div>
  );
}
