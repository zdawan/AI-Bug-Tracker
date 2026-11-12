"use client";

import { CheckCircle2 } from "lucide-react";

export default function TesterLoginConsentNote() {
  return (
    <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500" role="note">
      <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
      <span>
        Continue only if this tester access and the target website are within your approved scope.
      </span>
    </p>
  );
}
