"use client";

import { Globe2, Info, ShieldCheck } from "lucide-react";

export default function AssignedApplicationsEmptyState() {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center" aria-labelledby="assigned-applications-empty-title">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <Globe2 size={26} aria-hidden="true" />
      </div>
      <h3 id="assigned-applications-empty-title" className="mt-4 text-base font-semibold text-slate-800">
        No applications assigned yet
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Applications will appear here after an administrator assigns a testing scope to your account.
      </p>
      <div className="mx-auto mt-5 grid max-w-md gap-2 text-left sm:grid-cols-2">
        <div className="flex items-start gap-2 rounded-xl bg-white p-3">
          <Info size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-blue-600" />
          <span className="text-[11px] leading-5 text-slate-500">Check back after your assignment is updated.</span>
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-white p-3">
          <ShieldCheck size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600" />
          <span className="text-[11px] leading-5 text-slate-500">Your workspace remains ready for secure report review.</span>
        </div>
      </div>
    </section>
  );
}
