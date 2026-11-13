"use client";

import { ArrowDownToLine, Code2, Globe2 } from "lucide-react";

const QUICK_EXAMPLES = [
  {
    icon: Globe2,
    label: "Public website",
    value: "github.com",
    detail: "Start with a domain",
  },
  {
    icon: Code2,
    label: "Specific page",
    value: "https://github.com/issues",
    detail: "Test a page path",
  },
  {
    icon: ArrowDownToLine,
    label: "Local project",
    value: "http://localhost:3000",
    detail: "Use a local preview",
  },
];

export default function TesterUrlQuickExamples({ onSelect }) {
  return (
    <section className="mt-4 text-left" aria-labelledby="quick-example-title">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 id="quick-example-title" className="text-xs font-semibold text-slate-700">
          Try a quick example
        </h2>
        <span className="text-[10px] text-slate-400">Fills the field</span>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {QUICK_EXAMPLES.map(({ icon: Icon, label, value, detail }) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className="group rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-violet-300 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 group-hover:text-violet-800">
              <Icon size={14} aria-hidden="true" />
              {label}
            </span>
            <span className="mt-1 block truncate text-[10px] text-slate-500">{detail}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
