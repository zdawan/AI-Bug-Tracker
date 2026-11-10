"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Globe2, MonitorCheck, TriangleAlert } from "lucide-react";

export default function TesterLoginBrowserNotice({ defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [storageReady, setStorageReady] = useState(null);
  const [viewportReady, setViewportReady] = useState(null);

  useEffect(() => {
    try {
      const key = "tester-browser-check";
      window.sessionStorage.setItem(key, "ready");
      window.sessionStorage.removeItem(key);
      setStorageReady(true);
    } catch {
      setStorageReady(false);
    }

    const updateViewport = () => setViewportReady(window.innerWidth >= 320);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const checks = [
    { id: "javascript", label: "JavaScript is active", value: true },
    { id: "storage", label: "Session storage is available", value: storageReady },
    { id: "viewport", label: "Screen width is supported", value: viewportReady },
  ];
  const readyCount = checks.filter((check) => check.value === true).length;

  return (
    <aside className="mt-5 rounded-2xl border border-slate-200 bg-white/70 p-4" aria-labelledby="tester-browser-notice-title">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
          <MonitorCheck size={17} aria-hidden="true" />
        </div>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span id="tester-browser-notice-title" className="text-sm font-semibold text-slate-900">Browser readiness</span>
            <ChevronDown size={17} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">Optional local checks for a smoother sign-in.</span>
        </span>
      </button>

      {open ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <ul className="space-y-2">
            {checks.map((check) => (
              <li key={check.id} className="flex items-center gap-3 rounded-xl bg-slate-50/80 px-3 py-2.5">
                {check.value === true ? <Check size={15} className="shrink-0 text-emerald-600" aria-hidden="true" /> : check.value === false ? <TriangleAlert size={15} className="shrink-0 text-amber-600" aria-hidden="true" /> : <Globe2 size={15} className="shrink-0 text-slate-400" aria-hidden="true" />}
                <span className="flex-1 text-[11px] font-medium text-slate-700">{check.label}</span>
                <span className="text-[10px] font-semibold text-slate-500">{check.value === null ? "Checking" : check.value ? "Ready" : "Review"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-5 text-slate-500" role="status" aria-live="polite">{readyCount}/3 browser checks ready. These checks do not inspect your inbox or browsing history.</p>
        </div>
      ) : null}
    </aside>
  );
}
