"use client";

import { ArrowLeftRight, Smartphone } from "lucide-react";

export default function AssignedTableScrollHint() {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5 text-left sm:hidden" role="note">
      <Smartphone size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-blue-600" />
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-900">
          <ArrowLeftRight size={13} aria-hidden="true" />
          Wide report table
        </p>
        <p className="mt-1 text-[11px] leading-5 text-blue-800/75">
          Swipe left or right to view every report column and action on mobile.
        </p>
      </div>
    </div>
  );
}
