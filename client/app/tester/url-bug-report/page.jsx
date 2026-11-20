"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import BugForm from "../components/BugForm";
import ReportUrlContext from "./ReportUrlContext";
import UrlTestChecklist from "./UrlTestChecklist";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function UserPageContent() {
  const searchParams = useSearchParams();
  const fullUrl = searchParams.get("url") || "";

  const [finalUrl, setFinalUrl] = useState(fullUrl);
  const [shouldFocusReportForm, setShouldFocusReportForm] = useState(false);

  useEffect(() => {
    setFinalUrl(fullUrl);
  }, [fullUrl]);

  useEffect(() => {
    if (!shouldFocusReportForm) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const reportForm = document.getElementById("tester-bug-report-form");
      reportForm?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
      reportForm?.focus({ preventScroll: true });
      setShouldFocusReportForm(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [shouldFocusReportForm]);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="relative z-10 max-w-3xl mx-auto">
        <ReportUrlContext
          value={finalUrl}
          initialValue={fullUrl}
          onChange={setFinalUrl}
        />
        <UrlTestChecklist
          value={finalUrl}
          onSelect={setFinalUrl}
          onReportIssue={(url) => {
            setFinalUrl(url);
            setShouldFocusReportForm(true);
          }}
        />
        <div
          id="tester-bug-report-form"
          tabIndex={-1}
          role="region"
          aria-label="Bug report form"
          aria-describedby="tester-bug-report-form-help"
          className="scroll-mt-6 rounded-2xl outline-none focus-visible:ring-2
          focus-visible:ring-purple-600 focus-visible:ring-offset-4"
        >
          <p id="tester-bug-report-form-help" className="sr-only">
            Report an issue with the selected test URL.
          </p>
          <BugForm testUrl={finalUrl} />
        </div>
      </div>
    </>
  );
}

export default function UserPage() {
  return (
    <main
      className="relative min-h-screen py-12 px-4 font-sans
      bg-[radial-gradient(circle,_rgba(0,0,0,0.08)_1px,_transparent_1px)]
      [background-size:24px_24px]
      bg-gradient-to-br from-blue-50 to-purple-100 overflow-hidden"
    >
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2
        w-[160vw] h-[160vw]
        bg-[radial-gradient(circle_at_bottom,
          rgba(249,115,22,0.45) 0%,
          rgba(147,51,234,0.45) 35%,
          rgba(236,72,153,0.45) 60%,
          rgba(59,130,246,0.45) 85%,
          transparent 100%)]
        blur-3xl opacity-80"
      ></div>

      <Suspense
        fallback={
          <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="mt-20 flex items-center justify-center gap-3 text-center text-slate-600"
          >
            <span
              aria-hidden="true"
              className="h-5 w-5 animate-spin rounded-full border-2 border-purple-200 border-t-purple-700 motion-reduce:animate-none"
            />
            <span>Loading tester report tools…</span>
          </div>
        }
      >
        <UserPageContent />
      </Suspense>
    </main>
  );
}
