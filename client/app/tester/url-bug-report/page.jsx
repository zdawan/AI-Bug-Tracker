"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import BugForm from "../components/BugForm";
import ReportUrlContext from "./ReportUrlContext";
import UrlTestChecklist from "./UrlTestChecklist";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const REPORT_FORM_ID = "tester-bug-report-form";
const REPORT_FORM_HASH = `#${REPORT_FORM_ID}`;
const URL_CHECKLIST_ID = "tester-url-checklist";
const URL_CHECKLIST_HASH = `#${URL_CHECKLIST_ID}`;
const URL_CHECKLIST_HELP_ID = "tester-url-checklist-help";
const URL_CONTEXT_ID = "tester-url-context";
const URL_CONTEXT_HASH = `#${URL_CONTEXT_ID}`;
const EMPTY_REPORT_FOCUS_STATUS = Object.freeze({
  message: "",
  isError: false,
});

function getScrollBehavior() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

function UserPageContent() {
  const searchParams = useSearchParams();
  const fullUrl = searchParams.get("url") || "";

  const [finalUrl, setFinalUrl] = useState(fullUrl);
  const [shouldFocusReportForm, setShouldFocusReportForm] = useState(false);
  const [shouldFocusChecklist, setShouldFocusChecklist] = useState(false);
  const [shouldFocusUrlContext, setShouldFocusUrlContext] = useState(false);
  const [reportFocusStatus, setReportFocusStatus] = useState(
    EMPTY_REPORT_FOCUS_STATUS,
  );

  const updateFinalUrl = (url) => {
    setFinalUrl(url);
    setReportFocusStatus(EMPTY_REPORT_FOCUS_STATUS);
    setShouldFocusReportForm(false);
    setShouldFocusChecklist(false);
    setShouldFocusUrlContext(false);
  };

  useEffect(() => {
    setFinalUrl(fullUrl);
    setReportFocusStatus(EMPTY_REPORT_FOCUS_STATUS);
    setShouldFocusReportForm(false);
    setShouldFocusChecklist(false);
    setShouldFocusUrlContext(false);
  }, [fullUrl]);

  useEffect(() => {
    const focusReportFormFromHash = () => {
      setShouldFocusReportForm(window.location.hash === REPORT_FORM_HASH);
      setShouldFocusChecklist(window.location.hash === URL_CHECKLIST_HASH);
      setShouldFocusUrlContext(window.location.hash === URL_CONTEXT_HASH);
      setReportFocusStatus(EMPTY_REPORT_FOCUS_STATUS);
    };

    focusReportFormFromHash();
    window.addEventListener("hashchange", focusReportFormFromHash);
    return () => window.removeEventListener("hashchange", focusReportFormFromHash);
  }, []);

  useEffect(() => {
    if (!shouldFocusReportForm) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const reportForm = document.getElementById(REPORT_FORM_ID);
      if (!reportForm) {
        setReportFocusStatus({
          message: "Could not find the bug report form. Reload and try again.",
          isError: true,
        });
        setShouldFocusReportForm(false);
        return;
      }

      reportForm.scrollIntoView({
        behavior: getScrollBehavior(),
        block: "start",
      });
      reportForm.focus({ preventScroll: true });
      setReportFocusStatus({
        message: "Bug report form focused for the selected test URL.",
        isError: false,
      });
      setShouldFocusReportForm(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [shouldFocusReportForm]);

  useEffect(() => {
    if (!shouldFocusChecklist) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const checklist = document.getElementById(URL_CHECKLIST_ID);
      if (!checklist) {
        setReportFocusStatus({
          message: "Could not find the URL checklist. Reload and try again.",
          isError: true,
        });
        setShouldFocusChecklist(false);
        return;
      }

      checklist.scrollIntoView({
        behavior: getScrollBehavior(),
        block: "start",
      });
      checklist.focus({ preventScroll: true });
      setReportFocusStatus({
        message: "URL testing checklist focused.",
        isError: false,
      });
      setShouldFocusChecklist(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [shouldFocusChecklist]);

  useEffect(() => {
    if (!shouldFocusUrlContext) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const urlContext = document.getElementById(URL_CONTEXT_ID);
      if (!urlContext) {
        setReportFocusStatus({
          message: "Could not find the test URL context. Reload and try again.",
          isError: true,
        });
        setShouldFocusUrlContext(false);
        return;
      }

      urlContext.scrollIntoView({
        behavior: getScrollBehavior(),
        block: "start",
      });
      urlContext.focus({ preventScroll: true });
      setReportFocusStatus({
        message: "Test URL context focused.",
        isError: false,
      });
      setShouldFocusUrlContext(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [shouldFocusUrlContext]);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="relative z-10 max-w-3xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Test a URL and report bugs
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Work through the URL checklist, then submit a report for any issue
            you find.
            <span className="block">
              The selected URL is shared with the report form.
            </span>
          </p>
        </header>
        <a
          href={URL_CHECKLIST_HASH}
          aria-controls={URL_CHECKLIST_ID}
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4
          focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3
          focus:text-sm focus:font-semibold focus:text-purple-800
          focus:shadow-lg focus:outline-2 focus:outline-offset-2
          focus:ring-2 focus:ring-purple-600"
        >
          Skip to URL testing checklist
        </a>
        <a
          href={REPORT_FORM_HASH}
          aria-controls={REPORT_FORM_ID}
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4
          focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3
          focus:text-sm focus:font-semibold focus:text-purple-800
          focus:shadow-lg focus:outline-2 focus:outline-offset-2
          focus:ring-2 focus:ring-purple-600"
        >
          Skip to bug report form
        </a>
        <div
          id={URL_CONTEXT_ID}
          tabIndex={-1}
          role="region"
          aria-busy={shouldFocusUrlContext}
          aria-label="Test URL context"
          className="mb-6 rounded-2xl outline-none focus:outline
          focus:outline-2 focus:outline-offset-4 focus:outline-purple-700
          focus:ring-2 focus:ring-purple-600 focus:ring-offset-4"
        >
          <ReportUrlContext
            value={finalUrl}
            initialValue={fullUrl}
            onChange={updateFinalUrl}
          />
        </div>
        <section
          id={URL_CHECKLIST_ID}
          tabIndex={-1}
          aria-busy={shouldFocusChecklist}
          aria-label="URL testing checklist"
          aria-describedby={URL_CHECKLIST_HELP_ID}
          className="scroll-mt-6 rounded-2xl outline-none
          focus:outline focus:outline-2 focus:outline-offset-4
          focus:outline-purple-700 focus:ring-2 focus:ring-purple-600
          focus:ring-offset-4"
        >
          <p id={URL_CHECKLIST_HELP_ID} className="sr-only">
            Track test results and notes for the selected URL. Choose an issue
            to continue to the report form.
          </p>
          <UrlTestChecklist
            value={finalUrl}
            onSelect={updateFinalUrl}
            onReportIssue={(url) => {
              setFinalUrl(url);
              setReportFocusStatus(EMPTY_REPORT_FOCUS_STATUS);
              setShouldFocusChecklist(false);
              setShouldFocusReportForm(true);
            }}
          />
        </section>
        <div className="mt-4 flex justify-end">
          <a
            href={URL_CONTEXT_HASH}
            aria-controls={URL_CONTEXT_ID}
            className="inline-flex min-h-10 items-center rounded-lg border
            border-purple-200 bg-white px-3 py-2 text-sm font-medium
            text-purple-800 transition hover:bg-purple-50
            focus:outline focus:outline-2 focus:outline-offset-2
            focus:outline-purple-700 focus:ring-2 focus:ring-purple-600"
          >
            Back to test URL context
          </a>
        </div>
        {reportFocusStatus.message && (
          <p
            role={reportFocusStatus.isError ? "alert" : "status"}
            aria-live={reportFocusStatus.isError ? "assertive" : "polite"}
            aria-atomic="true"
            className={
              reportFocusStatus.isError
                ? "mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"
                : "sr-only"
            }
          >
            {reportFocusStatus.message}
          </p>
        )}
        <div
          id={REPORT_FORM_ID}
          tabIndex={-1}
          role="region"
          aria-busy={shouldFocusReportForm}
          aria-label="Bug report form"
          aria-describedby="tester-bug-report-form-help"
          className="scroll-mt-6 rounded-2xl outline-none
          focus:outline focus:outline-2 focus:outline-offset-4
          focus:outline-purple-700 focus:ring-2 focus:ring-purple-600
          focus:ring-offset-4"
        >
          <p id="tester-bug-report-form-help" className="sr-only">
            Report an issue with the selected test URL. Choosing to report an
            issue moves focus to this form. Changing the test URL cancels
            pending focus.
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
        aria-hidden="true"
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
            aria-atomic="true"
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
