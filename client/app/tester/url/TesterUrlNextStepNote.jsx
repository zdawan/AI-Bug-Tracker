"use client";

import { ArrowRight, ClipboardCheck, ShieldCheck } from "lucide-react";

const NEXT_STEP_ITEMS = [
  {
    icon: ClipboardCheck,
    title: "Review the destination",
    detail: "Confirm the preview matches the page you want to test.",
  },
  {
    icon: ShieldCheck,
    title: "Keep private data out",
    detail: "Remove passwords, tokens, or personal values from the URL.",
  },
];

export default function TesterUrlNextStepNote() {
  return (
    <aside
      className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-left"
      aria-labelledby="tester-url-next-step-title"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-violet-950">
        <ArrowRight size={16} aria-hidden="true" />
        <h2 id="tester-url-next-step-title">Before you continue</h2>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {NEXT_STEP_ITEMS.map(({ icon: Icon, title, detail }) => (
          <div key={title} className="flex items-start gap-2.5">
            <Icon
              size={16}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-violet-700"
            />
            <div>
              <p className="text-xs font-semibold text-slate-800">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
