"use client";

import { UserRoundCheck } from "lucide-react";

export default function TesterLoginEmailSafeUseNote() {
  return (
    <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500" role="note">
      <UserRoundCheck size={13} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
      <span>
        Use your assigned tester address rather than a shared or unrelated account.
      </span>
    </p>
  );
}
