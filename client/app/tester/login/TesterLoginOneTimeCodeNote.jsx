"use client";

import { TimerReset } from "lucide-react";

export default function TesterLoginOneTimeCodeNote() {
  return (
    <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500" role="note">
      <TimerReset size={13} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
      <span>
        Verification codes are short-lived and intended for one sign-in attempt only.
      </span>
    </p>
  );
}
