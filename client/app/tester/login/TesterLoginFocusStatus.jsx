"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Focus, Info } from "lucide-react";

const knownControls = {
  "tester-email": "Email address field",
  "tester-email-submit": "Send verification code button",
};

export default function TesterLoginFocusStatus({ defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [activeLabel, setActiveLabel] = useState("No login control selected");

  useEffect(() => {
    const updateFocus = (event) => {
      const id = event.target?.id;
      setActiveLabel(knownControls[id] || "Login guidance control");
    };

    document.addEventListener("focusin", updateFocus);
    return () => document.removeEventListener("focusin", updateFocus);
  }, []);

  return (
    <aside className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4" aria-labelledby="tester-focus-status-title">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-white text-indigo-700"><Focus size={17} aria-hidden="true" /></div>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span id="tester-focus-status-title" className="text-sm font-semibold text-indigo-950">Focus assistance</span>
            <ChevronDown size={17} className={`shrink-0 text-indigo-700 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </span>
          <span className="mt-1 block text-xs leading-5 text-indigo-900/75">Optional feedback for keyboard navigation.</span>
        </span>
      </button>

      {open ? (
        <div className="mt-4 space-y-3 border-t border-indigo-100 pt-4" role="status" aria-live="polite">
          <p className="flex items-start gap-2 rounded-xl bg-white/75 p-3 text-[11px] leading-5 text-indigo-900/80"><Info size={14} className="mt-0.5 shrink-0 text-indigo-700" aria-hidden="true" />Currently focused: <span className="font-semibold">{activeLabel}</span></p>
          <p className="flex items-start gap-2 text-[11px] leading-5 text-indigo-900/75"><Check size={14} className="mt-0.5 shrink-0 text-indigo-700" aria-hidden="true" />Use Tab to move forward and Shift+Tab to move backward through controls.</p>
        </div>
      ) : null}
    </aside>
  );
}
