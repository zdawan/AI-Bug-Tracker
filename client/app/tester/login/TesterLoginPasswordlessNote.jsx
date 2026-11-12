"use client";

import { KeyRound } from "lucide-react";

export default function TesterLoginPasswordlessNote() {
  return (
    <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500" role="note">
      <KeyRound size={13} className="mt-0.5 shrink-0 text-purple-600" aria-hidden="true" />
      <span>
        This tester route is passwordless: access is confirmed with a single-use email code.
      </span>
    </p>
  );
}
