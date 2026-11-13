"use client";

import { AlertTriangle, CheckCircle2, Mail, ShieldAlert } from "lucide-react";

export default function AssignedResolveChecklist({ bug, sendMail }) {
  const checks = [
    { icon: ShieldAlert, label: "Confirm the report is fixed", detail: "Resolving closes this report for the assigned workflow.", tone: "text-amber-700" },
    { icon: Mail, label: sendMail ? "Tester notification enabled" : "No tester notification", detail: sendMail ? "The tester will receive a resolution email." : "The status changes without sending an email.", tone: sendMail ? "text-blue-700" : "text-slate-500" },
    { icon: CheckCircle2, label: bug?.title ? `Ready to resolve: ${bug.title}` : "Ready to resolve this report", detail: "Review the warning above before confirming.", tone: "text-emerald-700" },
  ];

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left" aria-label="Resolve confirmation checklist">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
        <AlertTriangle size={15} aria-hidden="true" className="text-amber-600" />
        Before confirming
      </div>
      <ul className="mt-3 space-y-2">
        {checks.map(({ icon: Icon, label, detail, tone }) => (
          <li key={label} className="flex items-start gap-2">
            <Icon size={14} aria-hidden="true" className={`mt-0.5 shrink-0 ${tone}`} />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-slate-700" title={label}>{label}</p>
              <p className="text-[10px] leading-4 text-slate-500">{detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
