"use client";

import { Send } from "lucide-react";

export default function TesterLoginEmailContactNote() {
  return (
    <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500" role="note">
      <Send size={13} className="mt-0.5 shrink-0 text-blue-600" aria-hidden="true" />
      <span>
        The verification message is sent to the exact address entered above.
      </span>
    </p>
  );
}
