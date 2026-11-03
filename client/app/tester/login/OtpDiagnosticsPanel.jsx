"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Clock3,
  Download,
  Eye,
  EyeOff,
  FileCheck2,
  Globe,
  Info,
  KeyRound,
  LifeBuoy,
  LoaderCircle,
  LockKeyhole,
  MailCheck,
  Network,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

const REPORT_FORMAT_VERSION = 1;
const REPORT_FILENAME_PREFIX = "tester-sign-in-diagnostics";

const CHECK_CATEGORIES = [
  { id: "connection", label: "Connection" },
  { id: "browser", label: "Browser" },
  { id: "verification", label: "Verification" },
  { id: "delivery", label: "Code delivery" },
  { id: "privacy", label: "Privacy" },
];

const CHECK_DETAILS = {
  connection: {
    title: "Network connection",
    description:
      "The browser connection state determines whether verification requests can be sent.",
    online: "The browser reports an active network connection.",
    offline:
      "The browser reports no network connection. Verification and resend remain paused.",
    action: "Reconnect to the internet, then rerun the checks.",
  },
  secureContext: {
    title: "Secure page context",
    description:
      "Secure contexts are required by some browser features, including clipboard access.",
    secure: "This page is running in a secure browser context.",
    insecure:
      "This page is not in a secure context. Some browser features may be unavailable.",
    action:
      "Open the site using its HTTPS address, or use localhost during development.",
  },
  clipboard: {
    title: "Clipboard support",
    description:
      "Clipboard capability is checked without reading or requesting access to clipboard contents.",
    available: "The browser exposes the clipboard read capability.",
    unavailable:
      "The browser does not expose clipboard read capability to this page.",
    action:
      "You can still paste directly into a code box using the keyboard shortcut.",
  },
  codeEntry: {
    title: "Code entry progress",
    description:
      "Only the number of filled code boxes is inspected. The digits are never read by this panel.",
    ready: "All six code boxes contain a digit.",
    partial: "Some code boxes are filled, but the entry is not complete.",
    empty: "No code digits are currently entered.",
    action:
      "Enter all six digits from the newest verification email before submitting.",
  },
  verification: {
    title: "Verification form",
    description:
      "The form must be idle before a new verification request can start.",
    busy: "A request is in progress. Wait for it to finish before retrying.",
    ready: "The form is ready to submit a verification request.",
    action:
      "Wait for the current request to finish; avoid submitting the same code repeatedly.",
  },
  resend: {
    title: "Code resend",
    description:
      "The resend countdown and network state determine whether another code can be requested.",
    offline: "A new code cannot be requested while the browser is offline.",
    cooling: "The resend cooldown is still active.",
    ready: "The resend cooldown has ended and the browser is online.",
    action:
      "Wait for the countdown to finish. A new code may invalidate earlier codes.",
  },
  visibility: {
    title: "Page visibility",
    description:
      "The verification page can be hidden when switching tabs or minimizing the browser.",
    visible: "The verification page is currently visible.",
    hidden: "The verification page is currently in a background tab.",
    action:
      "Return to this tab before entering or submitting a verification code.",
  },
  autoVerify: {
    title: "Automatic verification",
    description:
      "This setting controls whether a complete six-digit code is submitted automatically.",
    enabled: "Automatic verification is enabled for this browser.",
    disabled: "Automatic verification is disabled.",
    action:
      "Use the checkbox on the form to choose whether complete codes submit automatically.",
  },
};

function getCheckState(condition, failure = "attention") {
  return condition ? "ready" : failure;
}

function formatLocalTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Time unavailable";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatShortTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getCategoryLabel(category) {
  return (
    CHECK_CATEGORIES.find((item) => item.id === category)?.label || "Other"
  );
}

function getStatusLabel(status) {
  if (status === "ready") return "Ready";
  if (status === "busy") return "In progress";
  if (status === "blocked") return "Unavailable";
  return "Needs attention";
}

function getStatusClasses(status) {
  if (status === "ready") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (status === "busy") {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }
  if (status === "blocked") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function getStatusIcon(status) {
  if (status === "ready") return CheckCircle2;
  if (status === "busy") return LoaderCircle;
  if (status === "blocked") return Info;
  return AlertCircle;
}

function getCheckIcon(checkId) {
  const icons = {
    connection: Network,
    secureContext: LockKeyhole,
    clipboard: Clipboard,
    codeEntry: KeyRound,
    verification: ShieldCheck,
    resend: MailCheck,
    visibility: Eye,
    autoVerify: Activity,
  };
  return icons[checkId] || Info;
}

function buildChecks({
  isOnline,
  isSecureContext,
  hasClipboardRead,
  enteredDigits,
  isBusy,
  resendCooldown,
  pageVisible,
  autoVerify,
}) {
  const safeEnteredDigits = Math.max(0, Math.min(6, enteredDigits));
  const codeReady = safeEnteredDigits === 6;

  return [
    {
      id: "connection",
      category: "connection",
      status: getCheckState(isOnline),
      message: isOnline
        ? CHECK_DETAILS.connection.online
        : CHECK_DETAILS.connection.offline,
      action: isOnline ? "" : CHECK_DETAILS.connection.action,
    },
    {
      id: "secureContext",
      category: "browser",
      status: getCheckState(isSecureContext),
      message: isSecureContext
        ? CHECK_DETAILS.secureContext.secure
        : CHECK_DETAILS.secureContext.insecure,
      action: isSecureContext ? "" : CHECK_DETAILS.secureContext.action,
    },
    {
      id: "clipboard",
      category: "browser",
      status: hasClipboardRead ? "ready" : "attention",
      message: hasClipboardRead
        ? CHECK_DETAILS.clipboard.available
        : CHECK_DETAILS.clipboard.unavailable,
      action: hasClipboardRead ? "" : CHECK_DETAILS.clipboard.action,
    },
    {
      id: "codeEntry",
      category: "verification",
      status: codeReady
        ? "ready"
        : safeEnteredDigits > 0
          ? "busy"
          : "blocked",
      message: codeReady
        ? CHECK_DETAILS.codeEntry.ready
        : safeEnteredDigits > 0
          ? `${safeEnteredDigits} of 6 digits are entered.`
          : CHECK_DETAILS.codeEntry.empty,
      action: codeReady ? "" : CHECK_DETAILS.codeEntry.action,
      progress: safeEnteredDigits,
    },
    {
      id: "verification",
      category: "verification",
      status: isBusy ? "busy" : "ready",
      message: isBusy
        ? CHECK_DETAILS.verification.busy
        : CHECK_DETAILS.verification.ready,
      action: isBusy ? CHECK_DETAILS.verification.action : "",
    },
    {
      id: "resend",
      category: "delivery",
      status: !isOnline
        ? "blocked"
        : resendCooldown > 0
          ? "busy"
          : "ready",
      message: !isOnline
        ? CHECK_DETAILS.resend.offline
        : resendCooldown > 0
          ? `${CHECK_DETAILS.resend.cooling} ${resendCooldown} seconds remain.`
          : CHECK_DETAILS.resend.ready,
      action:
        !isOnline || resendCooldown > 0 ? CHECK_DETAILS.resend.action : "",
      secondsRemaining: Math.max(0, resendCooldown),
    },
    {
      id: "visibility",
      category: "privacy",
      status: pageVisible ? "ready" : "attention",
      message: pageVisible
        ? CHECK_DETAILS.visibility.visible
        : CHECK_DETAILS.visibility.hidden,
      action: pageVisible ? "" : CHECK_DETAILS.visibility.action,
    },
    {
      id: "autoVerify",
      category: "privacy",
      status: "ready",
      message: autoVerify
        ? CHECK_DETAILS.autoVerify.enabled
        : CHECK_DETAILS.autoVerify.disabled,
      action: "",
    },
  ];
}

function StatusBadge({ status }) {
  const Icon = getStatusIcon(status);

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold ${getStatusClasses(status)}`}
    >
      <Icon
        size={11}
        aria-hidden="true"
        className={status === "busy" ? "animate-spin" : ""}
      />
      {getStatusLabel(status)}
    </span>
  );
}

function CategorySummary({ category, checks }) {
  const readyCount = checks.filter((check) => check.status === "ready").length;
  const attentionCount = checks.filter(
    (check) => check.status === "attention",
  ).length;
  const blockedCount = checks.filter(
    (check) => check.status === "blocked",
  ).length;
  const busyCount = checks.filter((check) => check.status === "busy").length;
  const Icon =
    category.id === "connection"
      ? Wifi
      : category.id === "browser"
        ? Globe
        : category.id === "verification"
          ? KeyRound
          : category.id === "delivery"
            ? MailCheck
            : ShieldCheck;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-50 text-violet-700">
          <Icon size={14} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 text-[10px] font-semibold text-slate-700">
          {category.label}
        </span>
      </div>
      <div
        className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[9px] text-slate-500"
        aria-label={`${readyCount} ready, ${busyCount} in progress, ${attentionCount} need attention, ${blockedCount} unavailable`}
      >
        <span className="inline-flex items-center gap-0.5 text-emerald-700">
          <Check size={10} aria-hidden="true" />
          {readyCount} ready
        </span>
        {busyCount > 0 && <span className="text-sky-700">{busyCount} active</span>}
        {attentionCount > 0 && (
          <span className="text-amber-800">{attentionCount} attention</span>
        )}
        {blockedCount > 0 && (
          <span className="text-slate-600">{blockedCount} unavailable</span>
        )}
      </div>
    </div>
  );
}

function CheckCard({ check }) {
  const details = CHECK_DETAILS[check.id];
  const Icon = getCheckIcon(check.id);

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
          <Icon size={14} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[11px] font-semibold text-slate-800">
              {details.title}
            </h4>
            <StatusBadge status={check.status} />
          </div>
          <p className="mt-1 text-[9px] leading-4 text-slate-500">
            {details.description}
          </p>
          <p className="mt-2 text-[10px] leading-4 text-slate-700">
            {check.message}
          </p>
          {check.id === "codeEntry" && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[9px] text-slate-500">
                <span>Entry progress</span>
                <span>{check.progress} of 6</span>
              </div>
              <div
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-label="Code entry progress"
                aria-valuemin={0}
                aria-valuemax={6}
                aria-valuenow={check.progress}
                aria-valuetext={`${check.progress} of 6 digits entered`}
              >
                <div
                  className="h-full rounded-full bg-violet-600 transition-[width]"
                  style={{ width: `${(check.progress / 6) * 100}%` }}
                />
              </div>
            </div>
          )}
          {check.id === "resend" && check.secondsRemaining > 0 && (
            <p className="mt-1 text-[9px] font-medium tabular-nums text-sky-800">
              Countdown: {check.secondsRemaining} seconds
            </p>
          )}
          {check.action && (
            <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[9px] leading-4 text-amber-900">
              {check.action}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function ReportNotice({ message, type }) {
  if (!message) return null;

  const isError = type === "error";
  return (
    <p
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={`rounded-lg border px-3 py-2 text-[10px] leading-4 ${
        isError
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {message}
    </p>
  );
}

function makeReport(checks, runAt, durationMs) {
  const readyCount = checks.filter((check) => check.status === "ready").length;
  const issueCount = checks.filter((check) =>
    ["attention", "blocked"].includes(check.status),
  ).length;
  const reportLines = [
    "Tester sign-in diagnostics",
    `Format version: ${REPORT_FORMAT_VERSION}`,
    `Generated: ${formatLocalTime(runAt)}`,
    `Check duration: ${Math.max(0, Math.round(durationMs))} ms`,
    `Summary: ${readyCount} ready, ${issueCount} need attention or are unavailable, ${checks.length} total`,
    "",
    "Checks:",
  ];

  checks.forEach((check) => {
    const title = CHECK_DETAILS[check.id]?.title || check.id;
    reportLines.push(
      `- ${title} [${getStatusLabel(check.status)}]: ${check.message}`,
    );
    if (check.action) reportLines.push(`  Suggested action: ${check.action}`);
  });

  reportLines.push(
    "",
    "Privacy: this report excludes the email address, verification digits, and page URL.",
    "Diagnostics are evaluated locally in the browser and are not sent automatically.",
  );

  return reportLines.join("\n");
}

function getTimestampForFilename(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "unknown-time";

  const iso = date.toISOString().replace(/[:.]/g, "-");
  return iso.slice(0, 19);
}

export default function OtpDiagnosticsPanel({
  isOnline,
  enteredDigits,
  isBusy,
  resendCooldown,
  autoVerify,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [checkRunAt, setCheckRunAt] = useState(0);
  const [checkDurationMs, setCheckDurationMs] = useState(0);
  const [reportMessage, setReportMessage] = useState("");
  const [reportMessageType, setReportMessageType] = useState("");
  const [reportText, setReportText] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const runLocalChecks = () => {
    const startedAt =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const completedAt =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    setCheckDurationMs(Math.max(0, completedAt - startedAt));
    setCheckRunAt(Date.now());
    setIsRefreshing(false);
    setAnnouncement("Local sign-in checks refreshed.");
    setReportMessage("");
    setReportText("");
  };

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const syncVisibility = () => {
      setPageVisible(document.visibilityState === "visible");
    };
    const syncVisibilityOnFocus = () => setPageVisible(true);
    const syncVisibilityOnBlur = () => {
      setPageVisible(document.visibilityState === "visible");
    };

    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    window.addEventListener("focus", syncVisibilityOnFocus);
    window.addEventListener("blur", syncVisibilityOnBlur);

    return () => {
      document.removeEventListener("visibilitychange", syncVisibility);
      window.removeEventListener("focus", syncVisibilityOnFocus);
      window.removeEventListener("blur", syncVisibilityOnBlur);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || checkRunAt > 0) return;
    runLocalChecks();
  }, [checkRunAt, isOpen]);

  const isSecureContext =
    typeof window !== "undefined" && window.isSecureContext === true;
  const hasClipboardRead =
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.readText === "function";

  const checks = useMemo(
    () =>
      buildChecks({
        isOnline,
        isSecureContext,
        hasClipboardRead,
        enteredDigits,
        isBusy,
        resendCooldown,
        pageVisible,
        autoVerify,
      }),
    [
      autoVerify,
      enteredDigits,
      hasClipboardRead,
      isBusy,
      isOnline,
      isSecureContext,
      pageVisible,
      resendCooldown,
    ],
  );

  const summary = useMemo(() => {
    const ready = checks.filter((check) => check.status === "ready").length;
    const needsAttention = checks.filter((check) =>
      ["attention", "blocked"].includes(check.status),
    ).length;
    const active = checks.filter((check) => check.status === "busy").length;

    return { ready, needsAttention, active, total: checks.length };
  }, [checks]);

  const getCategoryChecks = (categoryId) =>
    checks.filter((check) => check.category === categoryId);

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    window.setTimeout(runLocalChecks, 80);
  };

  const handleCopyReport = async () => {
    const generatedReport = makeReport(checks, checkRunAt || Date.now(), checkDurationMs);
    setReportText(generatedReport);

    try {
      if (!navigator.clipboard?.writeText) {
        setReportMessage(
          "Clipboard access is unavailable. Use Download report or select the report text below.",
        );
        setReportMessageType("error");
        return;
      }

      await navigator.clipboard.writeText(generatedReport);
      setReportMessage(
        "Privacy-safe report copied. It does not contain your email address, code, or page URL.",
      );
      setReportMessageType("success");
    } catch {
      setReportMessage(
        "Clipboard access was blocked. Use Download report or select the report text below.",
      );
      setReportMessageType("error");
    }
  };

  const handleDownloadReport = () => {
    const generatedReport = makeReport(checks, checkRunAt || Date.now(), checkDurationMs);
    setReportText(generatedReport);
    setReportMessage("");
    setReportMessageType("");

    try {
      const reportBlob = new Blob([generatedReport], {
        type: "text/plain;charset=utf-8",
      });
      const reportUrl = URL.createObjectURL(reportBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = reportUrl;
      downloadLink.download = `${REPORT_FILENAME_PREFIX}-${getTimestampForFilename(
        checkRunAt || Date.now(),
      )}.txt`;
      downloadLink.style.display = "none";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(reportUrl);
      setReportMessage(
        "Privacy-safe report downloaded. Review it before sharing.",
      );
      setReportMessageType("success");
    } catch (error) {
      console.error("Could not download sign-in diagnostics report:", error);
      setReportMessage(
        "The report could not be downloaded. Select and copy the report text instead.",
      );
      setReportMessageType("error");
    }
  };

  const handlePanelToggle = () => {
    setIsOpen((current) => !current);
    setAnnouncement("");
  };

  const reportPreview = reportText || makeReport(
    checks,
    checkRunAt || Date.now(),
    checkDurationMs,
  );
  const quickIcon = isOnline ? Wifi : WifiOff;
  const QuickIcon = quickIcon;

  return (
    <section
      className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
      aria-labelledby="otp-diagnostics-title"
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="otp-diagnostics-content"
        onClick={handlePanelToggle}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500"
      >
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
            summary.needsAttention > 0
              ? "bg-amber-100 text-amber-800"
              : "bg-violet-100 text-violet-800"
          }`}
        >
          <LifeBuoy size={17} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            id="otp-diagnostics-title"
            className="block text-xs font-semibold text-slate-800"
          >
            Sign-in diagnostics
          </span>
          <span className="mt-0.5 block text-[10px] leading-4 text-slate-500">
            Local browser checks and a privacy-safe support report
          </span>
        </span>
        <span className="hidden items-center gap-1.5 sm:inline-flex">
          <QuickIcon size={13} className="text-slate-500" aria-hidden="true" />
          <span className="text-[9px] tabular-nums text-slate-500">
            {summary.ready}/{summary.total} ready
          </span>
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 text-slate-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          id="otp-diagnostics-content"
          className="space-y-4 border-t border-slate-200 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-slate-800">
                Browser and form readiness
              </h3>
              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                These checks run in this page only. No diagnostic request is
                sent to a server.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw
                size={12}
                aria-hidden="true"
                className={isRefreshing ? "animate-spin" : ""}
              />
              {isRefreshing ? "Checking..." : "Run checks again"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CHECK_CATEGORIES.map((category) => (
              <CategorySummary
                key={category.id}
                category={category}
                checks={getCategoryChecks(category.id)}
              />
            ))}
          </div>

          <div
            className="grid grid-cols-3 gap-2 rounded-xl border border-violet-100 bg-violet-50/60 p-3 text-center"
            aria-live="polite"
            aria-atomic="true"
          >
            <div>
              <p className="text-lg font-semibold tabular-nums text-emerald-800">
                {summary.ready}
              </p>
              <p className="text-[9px] text-slate-600">Ready</p>
            </div>
            <div className="border-x border-violet-100">
              <p className="text-lg font-semibold tabular-nums text-sky-800">
                {summary.active}
              </p>
              <p className="text-[9px] text-slate-600">In progress</p>
            </div>
            <div>
              <p className="text-lg font-semibold tabular-nums text-amber-800">
                {summary.needsAttention}
              </p>
              <p className="text-[9px] text-slate-600">Review</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 text-[9px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={11} aria-hidden="true" />
              Last local check: {checkRunAt ? formatShortTime(checkRunAt) : "—"}
            </span>
            <span>Check duration: {Math.round(checkDurationMs)} ms</span>
          </div>

          <ul className="space-y-2" aria-label="Sign-in diagnostic checks">
            {checks.map((check) => (
              <CheckCard key={check.id} check={check} />
            ))}
          </ul>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <ShieldCheck size={14} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h4 className="text-[10px] font-semibold text-slate-800">
                  What this diagnostic checks
                </h4>
                <p className="mt-1 text-[9px] leading-4 text-slate-600">
                  Network availability, secure-context and clipboard
                  capabilities, the count of filled code fields, request state,
                  resend cooldown, page visibility, and the auto-verify
                  preference.
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5">
                <EyeOff
                  size={13}
                  className="mt-0.5 shrink-0 text-slate-500"
                  aria-hidden="true"
                />
                <p className="text-[9px] leading-4 text-slate-600">
                  It never reads the email address, the digits in the code
                  fields, or clipboard contents.
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5">
                <Smartphone
                  size={13}
                  className="mt-0.5 shrink-0 text-slate-500"
                  aria-hidden="true"
                />
                <p className="text-[9px] leading-4 text-slate-600">
                  No browser fingerprint, device identifier, or page URL is
                  added to the report.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700">
                <FileCheck2 size={14} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="text-[10px] font-semibold text-slate-800">
                  Create a support report
                </h4>
                <p className="mt-1 text-[9px] leading-4 text-slate-500">
                  Review the contents before sharing. Creating or downloading
                  the report does not send it anywhere.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyReport}
                className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
              >
                <Clipboard size={12} aria-hidden="true" />
                Copy report
              </button>
              <button
                type="button"
                onClick={handleDownloadReport}
                className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
              >
                <Download size={12} aria-hidden="true" />
                Download report
              </button>
              {reportText && (
                <button
                  type="button"
                  onClick={() => {
                    setReportText("");
                    setReportMessage("");
                    setReportMessageType("");
                  }}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                >
                  <X size={12} aria-hidden="true" />
                  Hide preview
                </button>
              )}
            </div>

            <ReportNotice
              message={reportMessage}
              type={reportMessageType}
            />

            {reportText && (
              <label className="block">
                <span className="mb-1 block text-[9px] font-semibold text-slate-600">
                  Report preview
                </span>
                <textarea
                  readOnly
                  value={reportPreview}
                  rows={Math.min(16, 7 + checks.length * 2)}
                  onFocus={(event) => event.target.select()}
                  aria-label="Privacy-safe diagnostic report preview"
                  className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-mono text-[9px] leading-4 text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
                <span className="mt-1 block text-[9px] text-slate-500">
                  Select the text to copy it manually if clipboard access is
                  unavailable.
                </span>
              </label>
            )}
          </div>

          <div
            className="flex items-start gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2.5"
            role="note"
          >
            <Info
              size={13}
              className="mt-0.5 shrink-0 text-sky-800"
              aria-hidden="true"
            />
            <p className="text-[9px] leading-4 text-sky-900">
              A ready browser check cannot confirm that an email was delivered
              or that a code is still valid. Check the newest message in your
              inbox if verification is not accepted.
            </p>
          </div>

          <p
            className="sr-only"
            aria-live="polite"
            aria-atomic="true"
          >
            {announcement}
          </p>
        </div>
      )}
    </section>
  );
}
