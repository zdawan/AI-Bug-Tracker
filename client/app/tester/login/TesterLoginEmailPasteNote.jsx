"use client";

import { ClipboardCheck } from "lucide-react";

export default function TesterLoginEmailPasteNote() {
  return (
    <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500" role="note">
      <ClipboardCheck size={13} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
      <span>
        When pasting an email, check the beginning and end for accidental spaces before submitting.
      </span>
    </p>
  );
}
