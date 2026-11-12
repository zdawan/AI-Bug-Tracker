"use client";

import { Type } from "lucide-react";

export default function TesterLoginEmailCaseNote() {
  return (
    <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500" role="note">
      <Type size={13} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
      <span>
        Uppercase letters are normalized in the preview so the request stays consistent.
      </span>
    </p>
  );
}
