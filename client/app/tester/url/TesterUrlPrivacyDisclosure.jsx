"use client";

import { EyeOff, LockKeyhole } from "lucide-react";

export default function TesterUrlPrivacyDisclosure() {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-left">
      <div className="flex shrink-0 items-center gap-1.5 text-amber-700" aria-hidden="true">
        <LockKeyhole size={15} />
        <EyeOff size={14} />
      </div>
      <div>
        <p className="text-xs font-semibold text-amber-950">Keep secrets out of URLs</p>
        <p className="mt-1 text-[11px] leading-5 text-amber-900/75">
          The on-page review flags common credentials and personal values before
          you continue. Remove sensitive values yourself before submitting.
        </p>
      </div>
    </div>
  );
}
