"use client";

import { useState } from "react";
import { ArrowDown, Check, ChevronDown, Keyboard } from "lucide-react";

const keyboardSteps = [
  "Focus the email field with Tab or use the automatic focus when the page opens.",
  "Type the approved tester email address and press Enter to request a code.",
  "Use Escape to clear the email field if you need to start over.",
  "On the verification step, move through the code inputs with Tab or arrow keys.",
];

export default function TesterLoginKeyboardGuide({ defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <aside className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4" aria-labelledby="tester-keyboard-guide-title">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-200 bg-white text-cyan-700"><Keyboard size={17} aria-hidden="true" /></div>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span id="tester-keyboard-guide-title" className="text-sm font-semibold text-cyan-950">Keyboard-friendly login</span>
            <ChevronDown size={17} className={`shrink-0 text-cyan-700 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </span>
          <span className="mt-1 block text-xs leading-5 text-cyan-900/75">Complete the sign-in flow without leaving the keyboard.</span>
        </span>
      </button>

      {open ? (
        <div className="mt-4 border-t border-cyan-100 pt-4" aria-live="polite">
          <p className="mb-3 text-[11px] leading-5 text-cyan-900/75">The controls follow the same order visually and when reached with Tab.</p>
          <ol className="space-y-2">
          {keyboardSteps.map((description, index) => (
            <li key={description} className="flex items-start gap-3 rounded-xl bg-white/75 p-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-700 text-[10px] font-bold text-white">{index + 1}</span>
              <p className="flex-1 text-[11px] leading-5 text-cyan-900/80">{description}</p>
              {index === keyboardSteps.length - 1 ? <Check size={14} className="mt-0.5 shrink-0 text-cyan-700" aria-hidden="true" /> : <ArrowDown size={14} className="mt-0.5 shrink-0 text-cyan-600" aria-hidden="true" />}
            </li>
          ))}
          </ol>
        </div>
      ) : null}
    </aside>
  );
}
