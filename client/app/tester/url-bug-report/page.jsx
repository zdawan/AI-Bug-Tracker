"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import BugForm from "../components/BugForm";
import ReportUrlContext from "./ReportUrlContext";
import UrlTestChecklist from "./UrlTestChecklist";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const REPORT_FORM_ID = "tester-bug-report-form";
const REPORT_FORM_HASH = `#${REPORT_FORM_ID}`;
const PAGE_TITLE_ID = "tester-url-report-title";
const NAVIGATION_STATUS_ID = "navigation-status-notice";
const URL_CHECKLIST_ID = "tester-url-checklist";
const URL_CHECKLIST_HASH = `#${URL_CHECKLIST_ID}`;
const URL_CHECKLIST_HELP_ID = "tester-url-checklist-help";
const URL_CONTEXT_ID = "tester-url-context";
const URL_CONTEXT_HASH = `#${URL_CONTEXT_ID}`;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const NAVIGATION_NOTICE_SECONDS = 5;
const EMPTY_NAVIGATION_STATUS = Object.freeze({
  message: "",
  isError: false,
  sequence: 0,
});
const SKIP_LINK_CLASS =
  "sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 " +
  "focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 " +
  "focus:text-sm focus:font-semibold focus:text-purple-800 " +
  "focus:shadow-lg focus:outline-2 focus:outline-offset-2 " +
  "focus:ring-2 focus:ring-purple-600";
const SECTION_LINK_CLASS =
  "inline-flex min-h-10 items-center rounded-lg border " +
  "border-purple-200 bg-white px-3 py-2 text-sm font-medium " +
  "text-purple-800 transition hover:bg-purple-50 " +
  "focus:outline focus:outline-2 focus:outline-offset-2 " +
  "focus:outline-purple-700 focus:ring-2 focus:ring-purple-600";

function getSectionLinkClass(isCurrent) {
  return isCurrent
    ? `${SECTION_LINK_CLASS} border-purple-500 bg-purple-50 text-purple-900`
    : SECTION_LINK_CLASS;
}

function formatRemainingTime(seconds) {
  const unit = seconds === 1 ? "second" : "seconds";
  return `${seconds} ${unit} remaining`;
}

function getScrollProgressLabel(progress, isScrollable) {
  if (!isScrollable) return "Page fits in viewport";
  if (progress <= 0) return "At page start; 0% scrolled";
  if (progress >= 100) return "At page end; 100% scrolled";

  return `${Math.round(progress)}% of page scrolled`;
}

function getScrollProgress(scrollTop, maxScroll) {
  if (maxScroll <= 0) return 0;

  const progress = (scrollTop / maxScroll) * 100;
  return Math.round(Math.min(100, Math.max(0, progress)));
}

const NAVIGATION_TARGETS = [
  {
    id: REPORT_FORM_ID,
    hash: REPORT_FORM_HASH,
    error: "Could not find the bug report form. Reload and try again.",
    complete: "Bug report form focused for the selected test URL.",
  },
  {
    id: URL_CHECKLIST_ID,
    hash: URL_CHECKLIST_HASH,
    error: "Could not find the URL checklist. Reload and try again.",
    complete: "URL testing checklist focused.",
  },
  {
    id: URL_CONTEXT_ID,
    hash: URL_CONTEXT_HASH,
    error: "Could not find the test URL context. Reload and try again.",
    complete: "Test URL context focused.",
  },
];

function getScrollBehavior() {
  if (typeof window.matchMedia !== "function") return "auto";

  const prefersReducedMotion = window.matchMedia(
    REDUCED_MOTION_QUERY,
  ).matches;
  return prefersReducedMotion ? "auto" : "smooth";
}

function replacePageHash(hash) {
  const nextUrl = new URL(window.location.href);
  nextUrl.hash = hash;
  window.history.replaceState(window.history.state, "", nextUrl.href);
}

function UserPageContent() {
  const searchParams = useSearchParams();
  const fullUrl = searchParams.get("url") || "";

  const [finalUrl, setFinalUrl] = useState(fullUrl);
  const [navigationTarget, setNavigationTarget] = useState(null);
  const [currentSectionHash, setCurrentSectionHash] = useState("");
  const [pageScrollProgress, setPageScrollProgress] = useState(0);
  const [isPageScrollable, setIsPageScrollable] = useState(false);
  const [isSectionMenuOpen, setIsSectionMenuOpen] = useState(false);
  const sectionMenuRef = useRef(null);
  const sectionMenuToggleRef = useRef(null);
  const [navigationStatus, setNavigationStatus] = useState(
    EMPTY_NAVIGATION_STATUS,
  );
  const [navigationStatusSeconds, setNavigationStatusSeconds] = useState(0);
  const [isDocumentHidden, setIsDocumentHidden] = useState(false);
  const [isCountdownManuallyPaused, setIsCountdownManuallyPaused] =
    useState(false);
  const isNavigationNoticePaused =
    isDocumentHidden || isCountdownManuallyPaused;
  const hasReachedPageEnd = isPageScrollable && pageScrollProgress >= 100;
  const navigationPauseReason = isDocumentHidden
    ? isCountdownManuallyPaused
      ? "Paused · tab hidden and by you"
      : "Paused · tab hidden"
    : isCountdownManuallyPaused
      ? "Paused · by you"
      : "";
  const currentSectionLabel =
    currentSectionHash === URL_CONTEXT_HASH
      ? "test URL context"
      : currentSectionHash === URL_CHECKLIST_HASH
        ? "URL testing checklist"
        : currentSectionHash === REPORT_FORM_HASH
          ? "bug report form"
          : "page overview";
  const navigationStatusSequence = useRef(0);
  const navigationStatusRemainingSeconds = useRef(NAVIGATION_NOTICE_SECONDS);
  const navigationCountdownId = useRef(null);
  const navigationTimeoutId = useRef(null);

  useEffect(
    () => () => {
      if (navigationCountdownId.current !== null) {
        window.clearInterval(navigationCountdownId.current);
      }
      if (navigationTimeoutId.current !== null) {
        window.clearTimeout(navigationTimeoutId.current);
      }
    },
    [],
  );

  useEffect(() => {
    const syncNoticeVisibility = () => {
      setIsDocumentHidden(document.visibilityState === "hidden");
    };

    syncNoticeVisibility();
    document.addEventListener("visibilitychange", syncNoticeVisibility);
    return () =>
      document.removeEventListener("visibilitychange", syncNoticeVisibility);
  }, []);

  useEffect(() => {
    if (!isSectionMenuOpen) return undefined;

    const closeOnOutsidePointer = (event) => {
      if (!sectionMenuRef.current?.contains(event.target)) {
        setIsSectionMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [isSectionMenuOpen]);

  useEffect(() => {
    if (!isSectionMenuOpen) return;

    const menu = sectionMenuRef.current;
    if (!menu) return;

    const activeLink =
      menu.querySelector('[aria-current="location"]') ||
      menu.querySelector("nav a");
    activeLink?.focus({ preventScroll: true });
  }, [isSectionMenuOpen]);

  useEffect(() => {
    let frameId = null;
    const updateScrollProgress = () => {
      if (frameId !== null) return;

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        const scrollElement =
          document.scrollingElement || document.documentElement;
        const pageHeight = scrollElement.scrollHeight;
        const maxScroll = pageHeight - window.innerHeight;
        setIsPageScrollable(maxScroll > 0);
        const progress = getScrollProgress(scrollElement.scrollTop, maxScroll);
        setPageScrollProgress((currentProgress) =>
          currentProgress === progress ? currentProgress : progress,
        );
      });
    };

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateScrollProgress);
    resizeObserver?.observe(document.documentElement);
    resizeObserver?.observe(document.body);

    updateScrollProgress();
    window.addEventListener("scroll", updateScrollProgress, { passive: true });
    window.addEventListener("resize", updateScrollProgress);
    window.addEventListener("load", updateScrollProgress);
    return () => {
      window.removeEventListener("scroll", updateScrollProgress);
      window.removeEventListener("resize", updateScrollProgress);
      window.removeEventListener("load", updateScrollProgress);
      resizeObserver?.disconnect();
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    const sectionIds = [URL_CONTEXT_ID, URL_CHECKLIST_ID, REPORT_FORM_ID];
    if (typeof IntersectionObserver === "undefined") {
      let frameId = null;
      const updateActiveSection = () => {
        if (frameId !== null) return;

        frameId = window.requestAnimationFrame(() => {
          frameId = null;
          const markerY = window.innerHeight * 0.3;
          const activeSection = sectionIds
            .map((id) => document.getElementById(id))
            .find((section) => {
              const bounds = section?.getBoundingClientRect();
              return bounds && bounds.top <= markerY && bounds.bottom > markerY;
            });
          if (activeSection) {
            setCurrentSectionHash(`#${activeSection.id}`);
          }
        });
      };

      updateActiveSection();
      window.addEventListener("scroll", updateActiveSection, {
        passive: true,
      });
      window.addEventListener("resize", updateActiveSection);
      return () => {
        window.removeEventListener("scroll", updateActiveSection);
        window.removeEventListener("resize", updateActiveSection);
        if (frameId !== null) window.cancelAnimationFrame(frameId);
      };
    }

    const visibleSections = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleSections.set(entry.target, entry.intersectionRatio);
          } else {
            visibleSections.delete(entry.target);
          }
        });

        const [activeSection] = [...visibleSections.entries()].sort(
          (left, right) => right[1] - left[1],
        );
        const markerY = window.innerHeight * 0.3;
        const nearestSection = sectionIds
          .map((id) => document.getElementById(id))
          .filter(Boolean)
          .sort((left, right) => {
            const leftBounds = left.getBoundingClientRect();
            const rightBounds = right.getBoundingClientRect();
            const leftDistance = Math.min(
              Math.abs(leftBounds.top - markerY),
              Math.abs(leftBounds.bottom - markerY),
            );
            const rightDistance = Math.min(
              Math.abs(rightBounds.top - markerY),
              Math.abs(rightBounds.bottom - markerY),
            );
            return leftDistance - rightDistance;
          })[0];
        const currentSection = activeSection?.[0] || nearestSection;
        if (currentSection) {
          setCurrentSectionHash(`#${currentSection.id}`);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.1, 0.25] },
    );

    sectionIds.forEach((id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  const showNavigationStatus = (message, isError = false) => {
    navigationStatusSequence.current += 1;
    navigationStatusRemainingSeconds.current = NAVIGATION_NOTICE_SECONDS;
    setIsCountdownManuallyPaused(false);
    setNavigationStatusSeconds(
      isError ? 0 : NAVIGATION_NOTICE_SECONDS,
    );
    setNavigationStatus({
      message,
      isError,
      sequence: navigationStatusSequence.current,
    });
  };

  const resetNavigationStatus = useCallback(() => {
    navigationStatusSequence.current += 1;
    setNavigationStatus(EMPTY_NAVIGATION_STATUS);
    navigationStatusRemainingSeconds.current = NAVIGATION_NOTICE_SECONDS;
    setNavigationStatusSeconds(0);
    setIsCountdownManuallyPaused(false);
  }, []);

  const updateFinalUrl = (url) => {
    setFinalUrl(url);
    resetNavigationStatus();
    setNavigationTarget(null);
  };

  const focusReportFormForUrl = (url) => {
    updateFinalUrl(url);
    replacePageHash(REPORT_FORM_HASH);
    setCurrentSectionHash(REPORT_FORM_HASH);
    setNavigationTarget(REPORT_FORM_ID);
  };

  const returnToPageStart = () => {
    const pageTitle = document.getElementById(PAGE_TITLE_ID);
    pageTitle?.scrollIntoView({
      behavior: getScrollBehavior(),
      block: "start",
    });
    pageTitle?.focus({ preventScroll: true });
  };

  const dismissNavigationStatus = () => {
    resetNavigationStatus();
    window.requestAnimationFrame(() => {
      document
        .getElementById(PAGE_TITLE_ID)
        ?.focus({ preventScroll: true });
    });
  };

  const handleNavigationStatusKeyDown = (event) => {
    if (event.key !== "Escape") return;

    event.preventDefault();
    event.stopPropagation();
    dismissNavigationStatus();
  };

  useEffect(() => {
    setFinalUrl(fullUrl);
    resetNavigationStatus();
    setNavigationTarget(null);
  }, [fullUrl, resetNavigationStatus]);

  useEffect(() => {
    const syncNavigationFromLocation = () => {
      const currentHash = window.location.hash;
      const target = NAVIGATION_TARGETS.find(
        ({ hash }) => hash === currentHash,
      );
      setCurrentSectionHash(target ? target.hash : "");
      setNavigationTarget(target ? target.id : null);
      resetNavigationStatus();
    };

    syncNavigationFromLocation();
    window.addEventListener("hashchange", syncNavigationFromLocation);
    window.addEventListener("popstate", syncNavigationFromLocation);
    return () => {
      window.removeEventListener("hashchange", syncNavigationFromLocation);
      window.removeEventListener("popstate", syncNavigationFromLocation);
    };
  }, [resetNavigationStatus]);

  useEffect(() => {
    if (!navigationTarget) {
      return undefined;
    }

    const targetConfig = NAVIGATION_TARGETS.find(
      ({ id }) => id === navigationTarget,
    );
    if (!targetConfig) {
      showNavigationStatus(
        "Could not identify the requested page section.",
        true,
      );
      setNavigationTarget(null);
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(navigationTarget);
      if (!target) {
        showNavigationStatus(targetConfig.error, true);
        setNavigationTarget(null);
        return;
      }

      target.scrollIntoView({
        behavior: getScrollBehavior(),
        block: "start",
      });
      target.focus({ preventScroll: true });
      showNavigationStatus(targetConfig.complete);
      setNavigationTarget(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [navigationTarget]);

  useEffect(() => {
    if (!navigationStatus.message || navigationStatus.isError) {
      setNavigationStatusSeconds(0);
      navigationStatusRemainingSeconds.current = NAVIGATION_NOTICE_SECONDS;
      return undefined;
    }

    const statusSequence = navigationStatus.sequence;
    const remainingAtStart = navigationStatusRemainingSeconds.current;
    setNavigationStatusSeconds(remainingAtStart);
    if (isNavigationNoticePaused) {
      setNavigationStatusSeconds(remainingAtStart);
      return undefined;
    }
    let remainingSeconds = remainingAtStart;
    const countdownId = window.setInterval(() => {
      remainingSeconds = Math.max(0, remainingSeconds - 1);
      navigationStatusRemainingSeconds.current = remainingSeconds;
      setNavigationStatusSeconds(remainingSeconds);
      if (remainingSeconds === 0) window.clearInterval(countdownId);
    }, 1000);
    navigationCountdownId.current = countdownId;
    const timeoutId = window.setTimeout(() => {
      if (navigationStatusSequence.current !== statusSequence) return;

      const notice = document.getElementById(NAVIGATION_STATUS_ID);
      if (notice?.contains(document.activeElement)) {
        document
          .getElementById(PAGE_TITLE_ID)
          ?.focus({ preventScroll: true });
      }
      setNavigationStatus((current) =>
        current.sequence === statusSequence
          ? EMPTY_NAVIGATION_STATUS
          : current,
      );
    }, remainingSeconds * 1000);
    navigationTimeoutId.current = timeoutId;
    return () => {
      window.clearInterval(countdownId);
      window.clearTimeout(timeoutId);
      if (navigationCountdownId.current === countdownId) {
        navigationCountdownId.current = null;
      }
      if (navigationTimeoutId.current === timeoutId) {
        navigationTimeoutId.current = null;
      }
    };
  }, [isNavigationNoticePaused, navigationStatus]);

  return (
    <>
      <div
        role="progressbar"
        aria-label="Page scroll progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pageScrollProgress}
        aria-valuetext={getScrollProgressLabel(
          pageScrollProgress,
          isPageScrollable,
        )}
        aria-live="off"
        className={`pointer-events-none fixed inset-x-0 top-0 z-50 h-1 ${
          isPageScrollable ? "bg-purple-100" : "bg-slate-100"
        }`}
      >
        <div
          aria-hidden="true"
          className={`h-full transition-[width] duration-75 ease-out
          motion-reduce:transition-none ${
            !isPageScrollable
              ? "bg-slate-300"
              : hasReachedPageEnd
                ? "bg-emerald-600"
                : "bg-purple-700"
          }`}
          style={{ width: `${pageScrollProgress}%` }}
        />
      </div>
      <div
        ref={sectionMenuRef}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsSectionMenuOpen(false);
          }
        }}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || !isSectionMenuOpen) return;
          event.preventDefault();
          event.stopPropagation();
          setIsSectionMenuOpen(false);
          sectionMenuToggleRef.current?.focus();
        }}
        className="fixed right-4 top-1/2 z-40 -translate-y-1/2"
      >
        <nav
          id="tester-section-menu"
          aria-label="Page section navigation"
          hidden={!isSectionMenuOpen}
          className="mb-2 w-56 rounded-xl border border-purple-200
          bg-white p-2 shadow-lg"
        >
          {[
            [URL_CONTEXT_HASH, "Test URL context"],
            [URL_CHECKLIST_HASH, "URL testing checklist"],
            [REPORT_FORM_HASH, "Bug report form"],
          ].map(([hash, label]) => (
            <a
              key={hash}
              href={hash}
              aria-current={currentSectionHash === hash ? "location" : undefined}
              onClick={() => setIsSectionMenuOpen(false)}
              className={`block rounded-lg px-3 py-2 text-sm ${
                currentSectionHash === hash
                  ? "bg-purple-50 font-semibold text-purple-950"
                  : "text-purple-900"
              } hover:bg-purple-50 focus:outline focus:outline-2
              focus:outline-offset-2 focus:outline-purple-700`}
            >
              {label}
              {currentSectionHash === hash && (
                <span
                  aria-hidden="true"
                  className="float-right ml-2 text-xs font-medium
                  text-purple-700"
                >
                  Current
                </span>
              )}
            </a>
          ))}
        </nav>
        <button
          type="button"
          ref={sectionMenuToggleRef}
          aria-expanded={isSectionMenuOpen}
          aria-controls="tester-section-menu"
          aria-label={`${isSectionMenuOpen ? "Close" : "Open"} section navigation. Current section: ${currentSectionLabel}`}
          title={`Current section: ${currentSectionLabel}`}
          aria-describedby="tester-section-menu-help"
          aria-keyshortcuts="Escape"
          onClick={() => setIsSectionMenuOpen((open) => !open)}
          className="inline-flex min-h-10 items-center gap-2 rounded-full
          bg-purple-700 px-4 py-2 text-sm font-semibold text-white shadow-lg
          hover:bg-purple-800
          focus:outline focus:outline-2 focus:outline-offset-2
          focus:outline-purple-800"
        >
          {isSectionMenuOpen ? "Close sections" : "Sections"}
          {!isSectionMenuOpen && (
            <span
              aria-hidden="true"
              className="hidden min-w-0 max-w-36 truncate rounded-full
              bg-purple-800 px-2 py-0.5 text-left text-[10px]
              font-medium leading-4 sm:inline"
            >
              Current: {currentSectionLabel}
            </span>
          )}
          {isPageScrollable && (
            <span
              aria-hidden="true"
              className={`inline-flex min-w-10 justify-center rounded-full
              px-1.5 py-0.5 text-center text-[10px]
              leading-none whitespace-nowrap tabular-nums
              transition-colors duration-150 motion-reduce:transition-none
              ${hasReachedPageEnd ? "bg-emerald-800" : "bg-purple-900"}`}
            >
              {pageScrollProgress}%
            </span>
          )}
        </button>
      </div>
      <span id="tester-section-menu-help" className="sr-only">
        When open, use Tab to move through sections, Enter to navigate, and
        Escape to close the menu.
      </span>
      {isPageScrollable && pageScrollProgress > 5 && (
        <button
          type="button"
          aria-controls={PAGE_TITLE_ID}
          onClick={returnToPageStart}
          className="fixed bottom-4 right-4 z-40 min-h-10 rounded-full
          bg-purple-700 px-4 py-2 text-sm font-semibold text-white shadow-lg
          hover:bg-purple-800 focus:outline focus:outline-2
          focus:outline-offset-2 focus:outline-purple-800
          sm:bottom-6 sm:right-6"
        >
          Back to top
        </button>
      )}
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="relative z-10 max-w-3xl mx-auto">
        <header className="mb-8 text-center">
          <h1
            id={PAGE_TITLE_ID}
            tabIndex={-1}
            className="rounded-sm text-3xl font-semibold tracking-tight
            text-slate-950 outline-none sm:text-4xl focus:outline
            focus:outline-2 focus:outline-offset-4 focus:outline-purple-700"
          >
            Test a URL and report bugs
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Work through the URL checklist, then submit a report for any issue
            you find.
            <span className="block">
              The selected URL is shared with the report form.
            </span>
            <span className="block">
              Selecting an issue updates the address with a link to the report
              form.
            </span>
          </p>
        </header>
        <nav
          aria-label={`Page section shortcuts. Current section: ${currentSectionLabel}`}
        >
          <a
            href={URL_CONTEXT_HASH}
            aria-controls={URL_CONTEXT_ID}
            aria-current={
              currentSectionHash === URL_CONTEXT_HASH ? "location" : undefined
            }
            className={`${SKIP_LINK_CLASS} ${
              currentSectionHash === URL_CONTEXT_HASH
                ? "underline decoration-2 underline-offset-4"
                : ""
            }`}
          >
            Skip to test URL context
          </a>
          <a
            href={URL_CHECKLIST_HASH}
            aria-controls={URL_CHECKLIST_ID}
            aria-current={
              currentSectionHash === URL_CHECKLIST_HASH ? "location" : undefined
            }
            className={`${SKIP_LINK_CLASS} ${
              currentSectionHash === URL_CHECKLIST_HASH
                ? "underline decoration-2 underline-offset-4"
                : ""
            }`}
          >
            Skip to URL testing checklist
          </a>
          <a
            href={REPORT_FORM_HASH}
            aria-controls={REPORT_FORM_ID}
            aria-current={
              currentSectionHash === REPORT_FORM_HASH ? "location" : undefined
            }
            className={`${SKIP_LINK_CLASS} ${
              currentSectionHash === REPORT_FORM_HASH
                ? "underline decoration-2 underline-offset-4"
                : ""
            }`}
          >
            Skip to bug report form
          </a>
        </nav>
        <div
          id={URL_CONTEXT_ID}
          tabIndex={-1}
          role="region"
          aria-busy={navigationTarget === URL_CONTEXT_ID}
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
          aria-busy={navigationTarget === URL_CHECKLIST_ID}
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
            onReportIssue={focusReportFormForUrl}
          />
        </section>
        <nav
          aria-label="Checklist and URL context navigation"
          className="mt-4 flex flex-wrap justify-end gap-2"
        >
          <a
            href={URL_CHECKLIST_HASH}
            aria-controls={URL_CHECKLIST_ID}
            aria-current={
              currentSectionHash === URL_CHECKLIST_HASH ? "location" : undefined
            }
            className={getSectionLinkClass(
              currentSectionHash === URL_CHECKLIST_HASH,
            )}
          >
            Back to URL checklist
          </a>
          <a
            href={URL_CONTEXT_HASH}
            aria-controls={URL_CONTEXT_ID}
            aria-current={
              currentSectionHash === URL_CONTEXT_HASH ? "location" : undefined
            }
            className={getSectionLinkClass(
              currentSectionHash === URL_CONTEXT_HASH,
            )}
          >
            Back to test URL context
          </a>
        </nav>
        {navigationStatus.message && (
          <div
            id={NAVIGATION_STATUS_ID}
            onKeyDown={handleNavigationStatusKeyDown}
            className={
              navigationStatus.isError
                ? "mb-3 flex items-start justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 sm:items-center sm:gap-3"
                : "mb-3 flex items-start justify-between gap-2 text-emerald-700 sm:items-center sm:gap-3"
            }
          >
            <div
              role={navigationStatus.isError ? "alert" : "status"}
              aria-live={navigationStatus.isError ? "assertive" : "polite"}
              aria-atomic="true"
              aria-describedby={
                navigationStatus.isError ? "navigation-error-help" : undefined
              }
              className={`flex min-w-0 flex-1 items-center gap-2 text-sm ${
                navigationStatus.isError ? "text-amber-800" : "text-emerald-700"
              }`}
            >
              {navigationStatus.isError ? (
                <AlertCircle size={16} aria-hidden="true" />
              ) : (
                <CheckCircle2 size={16} aria-hidden="true" />
              )}
              {!navigationStatus.isError && (
                <span
                  className="shrink-0 rounded bg-emerald-100 px-2 py-0.5
                  text-[10px] font-bold uppercase tracking-wide
                  leading-none whitespace-nowrap
                  text-emerald-900"
                >
                  Success
                </span>
              )}
              {navigationStatus.isError && (
                <span
                  className="shrink-0 rounded bg-amber-100 px-2 py-0.5
                  text-[10px] font-bold uppercase tracking-wide
                  leading-none whitespace-nowrap
                  text-amber-900"
                >
                  Error
                </span>
              )}
              <div className="min-w-0 flex-1">
                <span className="block break-words">
                  {navigationStatus.message}
                </span>
                {navigationStatus.isError && (
                  <span className="mt-1 block text-xs text-amber-900">
                    This error remains visible until dismissed.
                  </span>
                )}
              </div>
              {!navigationStatus.isError && (
                <span
                  aria-hidden="true"
                  className={`shrink-0 rounded px-1.5 py-0.5
                  text-[10px] tabular-nums leading-none whitespace-nowrap ${
                    !isNavigationNoticePaused && navigationStatusSeconds <= 2
                      ? "bg-amber-50 font-semibold text-amber-900"
                      : ""
                  }`}
                >
                  {isNavigationNoticePaused
                    ? navigationPauseReason
                    : `${navigationStatusSeconds}s left`}
                </span>
              )}
              {!navigationStatus.isError &&
                !isNavigationNoticePaused &&
                navigationStatusSeconds > 0 &&
                navigationStatusSeconds <= 2 && (
                  <span
                    aria-hidden="true"
                    className="shrink-0 rounded bg-amber-100 px-2 py-0.5
                    text-[10px] font-semibold text-amber-900"
                  >
                    Closing soon
                  </span>
                )}
            </div>
            <div
              role="group"
              aria-label={`Navigation ${
                navigationStatus.isError ? "error" : "success"
              } notice controls`}
              className="flex shrink-0 items-center gap-1"
            >
              {navigationStatus.isError && (
                <button
                  type="button"
                  aria-controls={PAGE_TITLE_ID}
                  onClick={returnToPageStart}
                  className="min-h-10 rounded px-2 text-xs font-semibold
                  text-amber-800 hover:bg-amber-100 focus:outline
                  focus:outline-2 focus:outline-offset-2
                  focus:outline-amber-800"
                >
                  Back to page start
                </button>
              )}
              <button
                type="button"
                onClick={dismissNavigationStatus}
                aria-controls={NAVIGATION_STATUS_ID}
                aria-describedby={
                  navigationStatus.isError
                    ? "navigation-error-help"
                    : "navigation-notice-timer-help"
                }
                aria-label={`Dismiss navigation ${navigationStatus.isError ? "error" : "success"}`}
                title={`Dismiss navigation ${navigationStatus.isError ? "error" : "success"}`}
                aria-keyshortcuts="Escape"
                className={`inline-flex min-h-10 items-center justify-center
                rounded focus:outline focus:outline-2 focus:outline-offset-2 ${
                  navigationStatus.isError
                    ? "min-w-24 gap-1 px-2 text-amber-800 hover:bg-amber-100 focus:outline-amber-800"
                    : "min-w-10 p-1 text-emerald-800 hover:bg-emerald-100 focus:outline-emerald-800"
                }`}
              >
                <X size={16} aria-hidden="true" />
                {navigationStatus.isError && (
                  <span
                    aria-hidden="true"
                    className="text-xs font-semibold"
                  >
                    Dismiss
                  </span>
                )}
              </button>
              {!navigationStatus.isError && (
                <button
                  type="button"
                  onClick={() =>
                    setIsCountdownManuallyPaused((paused) => !paused)
                  }
                  aria-pressed={isCountdownManuallyPaused}
                  aria-controls={NAVIGATION_STATUS_ID}
                  aria-describedby="navigation-notice-timer-help"
                  aria-label={
                    isCountdownManuallyPaused
                      ? "Resume navigation notice countdown"
                      : "Pause navigation notice countdown"
                  }
                  title={
                    isCountdownManuallyPaused
                      ? "Resume the success notice countdown"
                      : "Pause the success notice countdown"
                  }
                  className={`min-h-10 min-w-24 rounded border border-emerald-200 px-2 py-1
                  text-[10px] font-semibold text-emerald-800
                  ${
                    isNavigationNoticePaused ? "bg-emerald-100" : "bg-white"
                  } hover:bg-emerald-50 focus:outline focus:outline-2
                  focus:outline-offset-2 focus:outline-emerald-700`}
                >
                  {isCountdownManuallyPaused ? "Resume timer" : "Pause timer"}
                </button>
              )}
            </div>
          </div>
        )}
        {navigationStatus.message && navigationStatus.isError && (
          <span id="navigation-error-help" className="sr-only">
            Press Escape while a notice control is focused to dismiss this
            error.
          </span>
        )}
        {navigationStatus.message && !navigationStatus.isError && (
          <span id="navigation-notice-timer-help" className="sr-only">
            This success notice closes after {NAVIGATION_NOTICE_SECONDS} seconds.
            Pause keeps it open;
            resume continues the remaining time. The countdown also pauses
            while this tab is hidden. The progress bar shows elapsed time. Press
            Escape while a notice control is focused to dismiss the notice.
          </span>
        )}
        {navigationStatus.message && !navigationStatus.isError && (
          <div
            role="progressbar"
            aria-label="Navigation notice countdown progress"
            aria-describedby="navigation-notice-timer-help"
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={NAVIGATION_NOTICE_SECONDS}
            aria-valuenow={
              NAVIGATION_NOTICE_SECONDS - navigationStatusSeconds
            }
            aria-valuetext={`${formatRemainingTime(navigationStatusSeconds)}${
              isNavigationNoticePaused ? `; ${navigationPauseReason}` : ""
            }`}
            aria-live="off"
            className={`mb-3 h-1 overflow-hidden rounded-full ${
              isNavigationNoticePaused
                ? "bg-slate-100"
                : navigationStatusSeconds <= 2
                  ? "bg-amber-100"
                  : "bg-emerald-100"
            }`}
          >
            <div
              aria-hidden="true"
              className={`h-full ${
                isNavigationNoticePaused
                  ? "bg-slate-500"
                  : navigationStatusSeconds <= 2
                    ? "bg-amber-600"
                    : "bg-emerald-600"
              } transition-[width] duration-300 motion-reduce:transition-none`}
              style={{
                width: `${
                  ((NAVIGATION_NOTICE_SECONDS - navigationStatusSeconds) /
                    NAVIGATION_NOTICE_SECONDS) *
                  100
                }%`,
              }}
            />
          </div>
        )}
        {navigationStatus.message &&
          !navigationStatus.isError &&
          navigationStatusSeconds > 0 &&
          navigationStatusSeconds <= 2 && (
            <span className="sr-only" aria-live="polite" aria-atomic="true">
              {isNavigationNoticePaused
                ? `Navigation notice paused with ${formatRemainingTime(
                    navigationStatusSeconds,
                  )}.`
                : `Navigation notice closes in ${navigationStatusSeconds} ${
                    navigationStatusSeconds === 1 ? "second" : "seconds"
                  }.`}
            </span>
          )}
        <div
          id={REPORT_FORM_ID}
          tabIndex={-1}
          role="region"
          aria-busy={navigationTarget === REPORT_FORM_ID}
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
        <nav
          aria-label="Return to URL testing sections"
          className="mt-6 flex flex-wrap justify-end gap-2"
        >
          <a
            href={URL_CHECKLIST_HASH}
            aria-controls={URL_CHECKLIST_ID}
            aria-current={currentSectionHash === URL_CHECKLIST_HASH ? "location" : undefined}
            className={getSectionLinkClass(
              currentSectionHash === URL_CHECKLIST_HASH,
            )}
          >
            Return to checklist
          </a>
          <a
            href={URL_CONTEXT_HASH}
            aria-controls={URL_CONTEXT_ID}
            aria-current={currentSectionHash === URL_CONTEXT_HASH ? "location" : undefined}
            className={getSectionLinkClass(
              currentSectionHash === URL_CONTEXT_HASH,
            )}
          >
            Return to test URL
          </a>
        </nav>
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
