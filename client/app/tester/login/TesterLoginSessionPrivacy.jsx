"use client";

import { useState } from "react";
import { Check, ChevronDown, EyeOff, LogOut, Shield, Smartphone } from "lucide-react";

const privacySteps = [
  { id: "session", icon: Shield, title: "Session stays in this browser", text: "Your authenticated tester session is associated with this browser profile." },
  { id: "shared", icon: Smartphone, title: "Shared devices need extra care", text: "Use a private browser profile and close the tab when another person may use the device." },
  { id: "finish", icon: LogOut, title: "Sign out when finished", text: "End the tester session after your authorized checks are complete." },
];

export default function TesterLoginSessionPrivacy({ defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <aside className="mt-5 rounded-2xl border border-slate-200 bg-white/70 p-4" aria-labelledby="tester-session-privacy-title">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
          <EyeOff size={17} aria-hidden="true" />
        </div>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span id="tester-session-privacy-title" className="text-sm font-semibold text-slate-900">Session privacy</span>
            <ChevronDown size={17} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">A few reminders for keeping tester access private.</span>
        </span>
      </button>

      {open ? (
        <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          {privacySteps.map((item) => {
            const Icon = item.icon;

            return (
              <li key={item.id} className="flex items-start gap-3 rounded-xl bg-slate-50/80 p-3">
                <Icon size={15} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
                <p className="flex-1 text-[11px] leading-5 text-slate-600">
                  <span className="font-semibold text-slate-800">{item.title}: </span>
                  {item.text}
                </p>
                <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
              </li>
            );
          })}
        </ul>
      ) : null}
    </aside>
  );
}
