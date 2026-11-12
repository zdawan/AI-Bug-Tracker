"use client";

import { useState } from "react";
import { ChevronDown, Check, Smartphone } from "lucide-react";

const mobileTips = [
  "The form remains usable in portrait and landscape orientation.",
  "Keep this tab open when switching to your inbox app.",
  "Buttons and fields use touch-friendly spacing on small screens.",
];

export default function TesterLoginMobileHint({ defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <aside className="mt-5 rounded-2xl border border-rose-100 bg-rose-50/50 p-4" aria-labelledby="tester-mobile-hint-title">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-700"><Smartphone size={17} aria-hidden="true" /></div>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span id="tester-mobile-hint-title" className="text-sm font-semibold text-rose-950">Using a phone?</span>
            <ChevronDown size={17} className={`shrink-0 text-rose-700 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </span>
          <span className="mt-1 block text-xs leading-5 text-rose-900/75">A few tips for completing verification on a smaller screen.</span>
        </span>
      </button>

      {open ? (
        <div className="mt-4 border-t border-rose-100 pt-4" aria-live="polite">
          <p className="mb-3 text-[11px] leading-5 text-rose-900/75">
            The mobile layout keeps the same validation and security behavior as desktop.
          </p>
          <ul className="space-y-2">
          {mobileTips.map((tip) => (
            <li key={tip} className="flex items-start gap-2 rounded-xl bg-white/75 p-3 text-[11px] leading-5 text-rose-900/80">
              <Check size={14} className="mt-0.5 shrink-0 text-rose-700" aria-hidden="true" />
              <span>{tip}</span>
            </li>
          ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
