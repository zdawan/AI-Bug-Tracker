"use client";

import { Clock3, Mail, ShieldCheck } from "lucide-react";

const metadata = [
  {
    id: "delivery",
    icon: Mail,
    title: "Email delivery",
    detail: "A one-time code is sent only after you submit a valid tester email.",
  },
  {
    id: "timing",
    icon: Clock3,
    title: "Short-lived access",
    detail: "Use the newest code promptly; older requests may no longer be valid.",
  },
  {
    id: "privacy",
    icon: ShieldCheck,
    title: "Limited data use",
    detail: "The login flow uses your email to authenticate the tester session.",
  },
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function TesterLoginFormMeta({ compact = false }) {
  return (
    <aside
      className={cx(
        "mt-5 rounded-2xl border border-slate-200 bg-slate-50/70",
        compact ? "p-3" : "p-4",
      )}
      aria-labelledby="tester-login-form-meta-title"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
          <ShieldCheck size={16} aria-hidden="true" />
        </div>
        <div>
          <h2 id="tester-login-form-meta-title" className="text-xs font-semibold text-slate-900">Before you request a code</h2>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">A quick overview of what this form does.</p>
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {metadata.map((item) => {
          const Icon = item.icon;

          return (
            <li key={item.id} className="flex items-start gap-2.5 rounded-xl bg-white/80 px-3 py-2.5">
              <Icon size={14} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
              <p className="text-[11px] leading-5 text-slate-600">
                <span className="font-semibold text-slate-800">{item.title}: </span>
                {item.detail}
              </p>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
