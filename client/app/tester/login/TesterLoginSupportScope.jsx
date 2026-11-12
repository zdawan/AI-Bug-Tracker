"use client";

import { ShieldCheck } from "lucide-react";

export default function TesterLoginSupportScope() {
  return (
    <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500" role="note">
      <ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
      <span>
        Login help stays on this page and does not read inbox content, browsing history, or unrelated accounts.
      </span>
    </p>
  );
}
