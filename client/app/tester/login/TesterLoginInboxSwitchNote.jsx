"use client";

import { ArrowLeftRight } from "lucide-react";

export default function TesterLoginInboxSwitchNote() {
  return (
    <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500" role="note">
      <ArrowLeftRight size={13} className="mt-0.5 shrink-0 text-blue-600" aria-hidden="true" />
      <span>
        If you switch to your inbox, keep this tab open so you can finish verification here.
      </span>
    </p>
  );
}
