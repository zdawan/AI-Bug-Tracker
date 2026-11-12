"use client";

import { Check, KeyRound, Mail } from "lucide-react";

const stages = [
  { id: "email", label: "Email", description: "Enter address", icon: Mail },
  { id: "otp", label: "Verify", description: "Enter code", icon: KeyRound },
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function TesterLoginProgressHeader({ step = "email" }) {
  const activeIndex = step === "otp" ? 1 : 0;

  return (
    <nav
      className="mb-7"
      aria-label="Tester sign-in progress"
      aria-describedby="tester-login-progress-description"
    >
      <p id="tester-login-progress-description" className="sr-only">
        Step {activeIndex + 1} of {stages.length}: {stages[activeIndex].description}.
      </p>
      <ol className="flex items-center">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const complete = index < activeIndex;
          const active = index === activeIndex;

          return (
            <li key={stage.id} className="flex min-w-0 flex-1 items-center">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cx(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm transition",
                    complete && "border-emerald-600 bg-emerald-600 text-white",
                    active && "border-purple-700 bg-purple-700 text-white shadow-[0_0_0_4px_rgba(124,92,170,0.12)]",
                    !complete && !active && "border-slate-200 bg-slate-50 text-slate-400",
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {complete ? <Check size={17} aria-hidden="true" /> : <Icon size={17} aria-hidden="true" />}
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className={cx("block truncate text-xs font-semibold", active ? "text-slate-900" : "text-slate-500")}>{stage.label}</span>
                  <span className="block truncate text-[10px] text-slate-400">{stage.description}</span>
                </span>
              </div>
              {index < stages.length - 1 ? (
                <span className={cx("mx-3 h-px min-w-5 flex-1", complete ? "bg-emerald-300" : "bg-slate-200")} aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
