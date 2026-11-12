"use client";

import { useState } from "react";
import { ChevronDown, Check, Contact } from "lucide-react";

const contactRules = [
  "Use the email account assigned to your approved tester access.",
  "Make sure you can open that inbox before requesting the code.",
  "Do not use another person’s address or forward the code elsewhere.",
];

export default function TesterLoginContactHint({ defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <aside className="mt-5 rounded-2xl border border-orange-100 bg-orange-50/50 p-4" aria-labelledby="tester-contact-hint-title">
      <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} className="flex w-full cursor-pointer items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-200 bg-white text-orange-700"><Contact size={17} aria-hidden="true" /></div>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3"><span id="tester-contact-hint-title" className="text-sm font-semibold text-orange-950">Choose the right contact</span><ChevronDown size={17} className={`shrink-0 text-orange-700 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" /></span>
          <span className="mt-1 block text-xs leading-5 text-orange-900/75">Use an inbox you can access immediately.</span>
        </span>
      </button>
      {open ? (
        <ul className="mt-4 space-y-2 border-t border-orange-100 pt-4" role="list">
          {contactRules.map((rule) => (
            <li key={rule} className="flex items-start gap-2 text-[11px] leading-5 text-orange-900/80"><Check size={14} className="mt-0.5 shrink-0 text-orange-700" aria-hidden="true" /><span>{rule}</span></li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}
