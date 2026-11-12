"use client";

import { Keyboard, MousePointer2 } from "lucide-react";

export default function TesterUrlInputBehaviorNote() {
  return (
    <div className="mt-3 grid gap-2 text-left sm:grid-cols-2" aria-label="URL input tips">
      <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
        <MousePointer2
          size={14}
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-slate-500"
        />
        <p className="text-[11px] leading-5 text-slate-500">
          Paste a complete URL when you want to test a specific page.
        </p>
      </div>
      <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
        <Keyboard
          size={14}
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-slate-500"
        />
        <p className="text-[11px] leading-5 text-slate-500">
          Press Escape to clear the field and Enter to continue.
        </p>
      </div>
    </div>
  );
}
