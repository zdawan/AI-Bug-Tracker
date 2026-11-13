"use client";

import { LoaderCircle, ShieldCheck } from "lucide-react";

export default function AssignedPageLoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100 px-4 py-10 font-sans">
      <section className="w-full max-w-sm rounded-3xl border border-white/80 bg-white/90 p-8 text-center shadow-xl backdrop-blur-md" role="status" aria-live="polite">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-700">
          <ShieldCheck size={27} aria-hidden="true" />
        </div>
        <div className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-slate-800">
          <LoaderCircle size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none text-violet-600" />
          Restoring your workspace
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          We are checking your admin session before loading assigned reports.
        </p>
        <div className="mt-5 space-y-2" aria-hidden="true">
          <div className="h-2 animate-pulse rounded-full bg-slate-100 motion-reduce:animate-none" />
          <div className="mx-auto h-2 w-4/5 animate-pulse rounded-full bg-slate-100 motion-reduce:animate-none" />
        </div>
      </section>
    </main>
  );
}
