"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, Mail, ShieldCheck } from "lucide-react";

const securityNotes = [
  "Use only an email address approved for this tester workspace.",
  "Never share the verification code with another person or website.",
  "Close the session when testing is complete on a shared device.",
];

export default function TesterLoginEmailSecurity({ defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <aside className="mt-5 rounded-2xl border border-purple-100 bg-purple-50/50 p-4" aria-labelledby="tester-email-security-title">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-purple-200 bg-white text-purple-700"><ShieldCheck size={17} aria-hidden="true" /></div>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span id="tester-email-security-title" className="text-sm font-semibold text-purple-950">Email security reminder</span>
            <ChevronDown size={17} className={`shrink-0 text-purple-700 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </span>
          <span className="mt-1 block text-xs leading-5 text-purple-900/75">Keep the verification flow limited to your approved test activity.</span>
        </span>
      </button>

      {open ? (
        <div className="mt-4 space-y-3 border-t border-purple-100 pt-4">
          <div className="flex items-start gap-2 rounded-xl bg-white/75 p-3 text-xs leading-5 text-purple-900/80">
            <Mail size={15} className="mt-0.5 shrink-0 text-purple-700" aria-hidden="true" />
            <p>We use the address to deliver a one-time authentication code for the tester session.</p>
          </div>
          <ul className="space-y-2">
            {securityNotes.map((note) => (
              <li key={note} className="flex items-start gap-2 text-[11px] leading-5 text-purple-900/80">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-purple-700" aria-hidden="true" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
