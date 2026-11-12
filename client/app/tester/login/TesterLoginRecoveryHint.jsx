"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Inbox, Search, Send } from "lucide-react";

const recoveryHints = [
  { id: "wait", icon: Send, title: "Give delivery a moment", text: "Email delivery can take a short time. Keep this tab open while you wait." },
  { id: "folders", icon: Inbox, title: "Check filtered folders", text: "Review spam, promotions, updates, and any custom inbox filters." },
  { id: "newest", icon: Search, title: "Use the newest message", text: "If you requested multiple codes, use the most recent verification email." },
];

export default function TesterLoginRecoveryHint({ defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/50 p-4" aria-labelledby="tester-recovery-hint-title">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-700"><Search size={17} aria-hidden="true" /></div>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span id="tester-recovery-hint-title" className="text-sm font-semibold text-amber-950">If your code does not arrive</span>
            <ChevronDown size={17} className={`shrink-0 text-amber-700 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </span>
          <span className="mt-1 block text-xs leading-5 text-amber-900/75">A quick recovery checklist before requesting another code.</span>
        </span>
      </button>

      {open ? (
        <ul className="mt-4 space-y-2 border-t border-amber-100 pt-4">
          {recoveryHints.map((hint) => {
            const Icon = hint.icon;

            return (
              <li key={hint.id} className="flex items-start gap-3 rounded-xl bg-white/75 p-3">
                <Icon size={15} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
                <p className="flex-1 text-[11px] leading-5 text-amber-900/80"><span className="font-semibold text-amber-950">{hint.title}: </span>{hint.text}</p>
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
