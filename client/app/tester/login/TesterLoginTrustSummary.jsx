"use client";

import { useState } from "react";
import { ChevronDown, Check, LockKeyhole, ShieldCheck, UserCheck } from "lucide-react";

const trustItems = [
  {
    id: "code",
    title: "Your code stays private",
    detail: "The verification code should only be entered into the verification form in this tester workspace.",
    icon: LockKeyhole,
  },
  {
    id: "scope",
    title: "Testing stays authorized",
    detail: "Use this access only for websites, accounts, and test activities that you are allowed to review.",
    icon: ShieldCheck,
  },
  {
    id: "session",
    title: "Your session is personal",
    detail: "Sign out when testing is complete, especially when using a shared computer or browser profile.",
    icon: UserCheck,
  },
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function TesterLoginTrustSummary({ defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [activeItem, setActiveItem] = useState("");

  const toggleItem = (id) => {
    setActiveItem((current) => (current === id ? "" : id));
  };

  return (
    <section
      className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4"
      aria-labelledby="tester-login-trust-title"
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700">
          <ShieldCheck size={18} aria-hidden="true" />
        </div>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span id="tester-login-trust-title" className="text-sm font-semibold text-emerald-950">A safer sign-in, by design</span>
            <ChevronDown size={17} className={cx("shrink-0 text-emerald-700 transition-transform", open && "rotate-180")} aria-hidden="true" />
          </span>
          <span className="mt-1 block text-xs leading-5 text-emerald-900/75">Review the small habits that keep tester access protected.</span>
        </span>
      </button>

      {open ? (
        <ul className="mt-4 space-y-2 border-t border-emerald-100 pt-4">
          {trustItems.map((item) => {
            const Icon = item.icon;
            const expanded = activeItem === item.id;

            return (
              <li key={item.id} className="rounded-xl border border-emerald-100/80 bg-white/70">
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  aria-expanded={expanded}
                  className="flex w-full cursor-pointer items-center gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                >
                  <Icon size={16} className="shrink-0 text-emerald-700" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-xs font-semibold text-emerald-950">{item.title}</span>
                  {expanded ? <Check size={15} className="shrink-0 text-emerald-600" aria-hidden="true" /> : null}
                </button>
                {expanded ? <p className="px-3 pb-3 pl-10 text-xs leading-5 text-emerald-900/75">{item.detail}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
