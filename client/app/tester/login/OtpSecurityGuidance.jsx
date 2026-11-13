"use client";

import { EyeOff, KeyRound, ShieldCheck } from "lucide-react";

const SECURITY_POINTS = [
  { icon: KeyRound, title: "Use the newest code", detail: "A new request may replace an earlier code." },
  { icon: EyeOff, title: "Codes hide automatically", detail: "Visible digits are hidden after a short privacy timer." },
  { icon: ShieldCheck, title: "Never share the code", detail: "Support should never need your one-time code." },
];

export default function OtpSecurityGuidance() {
  return (
    <aside
      className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-left"
      aria-labelledby="otp-security-guidance-title"
    >
      <h2 id="otp-security-guidance-title" className="text-xs font-semibold text-violet-950">
        Verification code safety
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {SECURITY_POINTS.map(({ icon: Icon, title, detail }) => (
          <div key={title} className="flex items-start gap-2">
            <Icon size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-violet-700" />
            <div>
              <p className="text-[11px] font-semibold text-slate-700">{title}</p>
              <p className="mt-1 text-[10px] leading-4 text-slate-500">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
