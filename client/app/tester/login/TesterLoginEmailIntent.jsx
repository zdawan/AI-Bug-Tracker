"use client";

import { Info } from "lucide-react";

export default function TesterLoginEmailIntent() {
  return (
    <p className="mt-2 flex items-start gap-2 text-[11px] leading-5 text-slate-500">
      <Info size={13} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
      <span>
        This address is used to deliver your one-time tester verification code.
      </span>
    </p>
  );
}
