"use client";

import { useState } from "react";
import { Check, ChevronDown, Mail, Send } from "lucide-react";

export default function TesterLoginRequestPreview({ email = "", isSending = false }) {
  const [open, setOpen] = useState(false);
  const hasEmail = email.trim().length > 0;

  return (
    <aside className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/50 p-4" aria-labelledby="tester-request-preview-title">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-white text-violet-700"><Send size={17} aria-hidden="true" /></div>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span id="tester-request-preview-title" className="text-sm font-semibold text-violet-950">Request preview</span>
            <ChevronDown size={17} className={`shrink-0 text-violet-700 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </span>
          <span className="mt-1 block text-xs leading-5 text-violet-900/75">See what happens when you request the verification code.</span>
        </span>
      </button>

      {open ? (
        <div className="mt-4 space-y-3 border-t border-violet-100 pt-4" role="status" aria-live="polite">
          <div className="flex items-start gap-3 rounded-xl bg-white/75 p-3">
            <Mail size={15} className="mt-0.5 shrink-0 text-violet-700" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-violet-950">Delivery address</p>
              <p className="mt-1 truncate text-[11px] text-violet-900/75">{hasEmail ? email : "Waiting for an email address"}</p>
            </div>
            {hasEmail ? <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" /> : null}
          </div>
          <p className="text-[11px] leading-5 text-violet-900/75">
            {isSending ? "The request is being sent now." : hasEmail ? "Submitting will request a single-use verification code." : "Enter an email address to preview the request."}
          </p>
        </div>
      ) : null}
    </aside>
  );
}
