"use client";

import { CornerUpLeft } from "lucide-react";

export default function TesterLoginEmailRecoveryNote() {
  return (
    <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500" role="note">
      <CornerUpLeft size={13} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
      <span>
        If the address is wrong, use the back action on the verification step to correct it.
      </span>
    </p>
  );
}
