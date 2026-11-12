"use client";

import { Inbox } from "lucide-react";

export default function TesterLoginEmailOwnershipNote() {
  return (
    <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500" role="note">
      <Inbox size={13} className="mt-0.5 shrink-0 text-blue-600" aria-hidden="true" />
      <span>
        Start only when you can access the inbox for this tester address.
      </span>
    </p>
  );
}
