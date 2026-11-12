"use client";

import { Globe2 } from "lucide-react";

export default function TesterLoginEmailDomainBadge({ email = "" }) {
  const domain = email.trim().split("@")[1] || "";

  if (!domain) return null;

  return (
    <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-slate-500" role="status" aria-live="polite">
      <Globe2 size={13} className="text-slate-400" aria-hidden="true" />
      Detected email domain: <span className="font-semibold text-slate-700">{domain.toLowerCase()}</span>
    </p>
  );
}
