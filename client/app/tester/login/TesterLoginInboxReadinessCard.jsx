"use client";

import { useState } from "react";
import { Check, ChevronDown, Inbox, MailSearch } from "lucide-react";

const inboxChecks = [
  "You can open the inbox connected to the email address above.",
  "You know where spam, promotions, or filtered messages appear.",
  "You will use the newest verification message if more than one arrives.",
];

export default function TesterLoginInboxReadinessCard({ defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <aside
      className="mt-5 rounded-2xl border border-teal-100 bg-teal-50/50 p-4"
      aria-labelledby="tester-inbox-readiness-title"
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-200 bg-white text-teal-700">
          <Inbox size={17} aria-hidden="true" />
        </div>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span id="tester-inbox-readiness-title" className="text-sm font-semibold text-teal-950">Inbox readiness</span>
            <ChevronDown size={17} className={`shrink-0 text-teal-700 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </span>
          <span className="mt-1 block text-xs leading-5 text-teal-900/75">Prepare for the verification message before requesting it.</span>
        </span>
      </button>

      {open ? (
        <div className="mt-4 border-t border-teal-100 pt-4" role="region" aria-live="polite">
          <div className="flex items-start gap-2 rounded-xl bg-white/75 p-3 text-[11px] leading-5 text-teal-900/80">
            <MailSearch size={15} className="mt-0.5 shrink-0 text-teal-700" aria-hidden="true" />
            <p>Keeping the inbox nearby makes it easier to complete the code step without losing your place.</p>
          </div>
          <ul className="mt-3 space-y-2">
            {inboxChecks.map((check) => (
              <li key={check} className="flex items-start gap-2 text-[11px] leading-5 text-teal-900/80">
                <Check size={14} className="mt-0.5 shrink-0 text-teal-700" aria-hidden="true" />
                <span>{check}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
