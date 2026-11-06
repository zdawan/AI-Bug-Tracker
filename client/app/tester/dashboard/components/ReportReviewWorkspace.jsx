"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownAZ,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Download,
  FileCheck2,
  Filter,
  LockKeyhole,
  MessageSquareText,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

const STORAGE_PREFIX = "tester-report-review-workspace-v1";
const MAX_REVIEWS = 100;
const MAX_CHECKS_PER_REVIEW = 60;
const MAX_AUDIT_EVENTS = 30;
const MAX_NOTE_LENGTH = 1000;
const MAX_SUMMARY_LENGTH = 1200;

const REVIEW_TEMPLATES = [
  {
    id: "report-quality",
    label: "Report quality",
    description: "Confirm the report is clear and actionable.",
    checks: [
      { id: "clear-title", label: "Title clearly describes the issue" },
      { id: "expected-actual", label: "Expected and actual results are clear" },
      { id: "steps-repeatable", label: "Reproduction steps are repeatable" },
      { id: "evidence-relevant", label: "Supporting evidence is relevant" },
      { id: "category-severity", label: "Category and severity are appropriate" },
      { id: "no-duplicates", label: "Potential duplicates were considered" },
    ],
  },
  {
    id: "retest",
    label: "Retest and regression",
    description: "Verify resolution and check nearby behavior.",
    checks: [
      { id: "target-build", label: "Target build or environment is recorded" },
      { id: "original-reproduced", label: "Original behavior was reproduced" },
      { id: "fix-verified", label: "Fix was verified against expected behavior" },
      { id: "regression-checked", label: "Related regression paths were checked" },
      { id: "evidence-recorded", label: "Verification evidence is recorded" },
      { id: "status-current", label: "Report status reflects the verification" },
    ],
  },
  {
    id: "environment",
    label: "Environment review",
    description: "Assess platform detail and reproduction coverage.",
    checks: [
      { id: "browser-known", label: "Browser and version are identified" },
      { id: "platform-known", label: "Platform or device is identified" },
      { id: "viewport-known", label: "Viewport or screen size is recorded" },
      { id: "network-known", label: "Network conditions are considered" },
      { id: "cross-environment", label: "Relevant environment coverage was checked" },
      { id: "scope-clear", label: "Environment scope and limitations are clear" },
    ],
  },
  {
    id: "release-impact",
    label: "Release impact",
    description: "Review severity, user impact, and release disposition.",
    checks: [
      { id: "impact-scoped", label: "Affected users and flows are identified" },
      { id: "severity-justified", label: "Severity is supported by observed impact" },
      { id: "workaround-reviewed", label: "Available workaround was considered" },
      { id: "release-owner", label: "Release decision owner is identified" },
      { id: "mitigation-recorded", label: "Mitigation or follow-up is documented" },
      { id: "decision-recorded", label: "Release disposition is documented" },
    ],
  },
  {
    id: "custom",
    label: "Custom review",
    description: "Start with a small checklist and add your own checks.",
    checks: [
      { id: "scope-defined", label: "Review scope is defined" },
      { id: "evidence-reviewed", label: "Available evidence was reviewed" },
      { id: "follow-up-defined", label: "Follow-up actions are recorded" },
    ],
  },
];

const CHECK_STATUSES = [
  { value: "pending", label: "Not reviewed" },
  { value: "pass", label: "Pass" },
  { value: "needs-work", label: "Needs work" },
  { value: "not-applicable", label: "N/A" },
];

const REVIEW_FILTERS = [
  { value: "all", label: "All reviews" },
  { value: "draft", label: "In progress" },
  { value: "blocked", label: "Needs work" },
  { value: "ready", label: "Ready to sign off" },
  { value: "signed", label: "Signed off" },
];

function getText(value, fallback = "", limit = 3000) {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, limit) || fallback;
}

function getReportId(report) {
  const rawId = report?._id ?? report?.id;
  return rawId === null || rawId === undefined ? "" : String(rawId).trim();
}

function getReportTitle(report) {
  return getText(report?.title || report?.summary, "Untitled report", 240);
}

function getStatus(report) {
  return getText(report?.status, "Unknown");
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getStorageKey(email) {
  const normalized = getText(email).toLocaleLowerCase();
  return normalized
    ? `${STORAGE_PREFIX}:${encodeURIComponent(normalized)}`
    : "";
}

function normalizeAuditEvents(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (event) =>
        event &&
        typeof event.action === "string" &&
        typeof event.at === "string",
    )
    .slice(-MAX_AUDIT_EVENTS)
    .map((event) => ({
      action: event.action.slice(0, 100),
      at: event.at,
      actor: getText(event.actor, "Reviewer", 80),
    }));
}

function normalizeReviewRecord(record) {
  if (
    !record ||
    typeof record.id !== "string" ||
    typeof record.reportId !== "string" ||
    !Array.isArray(record.checks)
  ) {
    return null;
  }

  const checks = record.checks
    .filter(
      (check) =>
        check &&
        typeof check.id === "string" &&
        typeof check.label === "string",
    )
    .slice(0, MAX_CHECKS_PER_REVIEW)
    .map((check) => ({
      id: check.id.slice(0, 100),
      label: check.label.slice(0, 240),
      status: CHECK_STATUSES.some((option) => option.value === check.status)
        ? check.status
        : "pending",
      note: getText(check.note, "", MAX_NOTE_LENGTH),
      updatedAt: typeof check.updatedAt === "string" ? check.updatedAt : "",
    }));

  return {
    id: record.id,
    reportId: record.reportId,
    templateId: REVIEW_TEMPLATES.some(
      (template) => template.id === record.templateId,
    )
      ? record.templateId
      : "custom",
    templateLabel: getText(record.templateLabel, "Custom review", 80),
    reportTitle: getText(record.reportTitle, "Untitled report", 240),
    reportStatus: getText(record.reportStatus, "Unknown", 80),
    reportSeverity: getText(record.reportSeverity, "Unspecified", 80),
    reportCategory: getText(record.reportCategory, "Uncategorized", 120),
    reviewer: getText(record.reviewer, "", 80),
    dueDate: getText(record.dueDate, "", 20),
    summary: getText(record.summary, "", MAX_SUMMARY_LENGTH),
    checks,
    audit: normalizeAuditEvents(record.audit),
    createdAt: typeof record.createdAt === "string" ? record.createdAt : "",
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
    signedOff: record.signedOff === true,
    signedOffBy: getText(record.signedOffBy, "", 80),
    signedOffAt: typeof record.signedOffAt === "string" ? record.signedOffAt : "",
  };
}

function normalizeReviewList(value) {
  if (!Array.isArray(value)) {
    throw new Error("Saved review data has an unsupported format.");
  }
  const byId = new Map();
  value.slice(0, MAX_REVIEWS).forEach((item) => {
    const record = normalizeReviewRecord(item);
    if (record) byId.set(record.id, record);
  });
  return [...byId.values()];
}

function createReviewRecord(report, templateId, reviewer) {
  const template = REVIEW_TEMPLATES.find((item) => item.id === templateId);
  const now = new Date().toISOString();
  return {
    id: createId(),
    reportId: getReportId(report),
    templateId: template?.id || "custom",
    templateLabel: template?.label || "Custom review",
    reportTitle: getReportTitle(report),
    reportStatus: getStatus(report),
    reportSeverity: getText(report?.severity, "Unspecified"),
    reportCategory: getText(report?.category, "Uncategorized"),
    reviewer: getText(reviewer, "", 80),
    dueDate: "",
    summary: "",
    checks: (template?.checks || REVIEW_TEMPLATES.at(-1).checks).map(
      (check) => ({
        ...check,
        status: "pending",
        note: "",
        updatedAt: now,
      }),
    ),
    audit: [
      {
        action: `Review created from ${template?.label || "Custom review"} checklist`,
        at: now,
        actor: getText(reviewer, "Reviewer", 80),
      },
    ],
    createdAt: now,
    updatedAt: now,
    signedOff: false,
    signedOffBy: "",
    signedOffAt: "",
  };
}

function getReviewState(review) {
  if (review.signedOff) return "signed";
  if (review.checks.some((check) => check.status === "needs-work")) {
    return "blocked";
  }
  if (
    review.checks.length > 0 &&
    review.checks.every(
      (check) =>
        check.status === "pass" || check.status === "not-applicable",
    )
  ) {
    return "ready";
  }
  return "draft";
}

function getReviewProgress(review) {
  const resolved = review.checks.filter(
    (check) => check.status !== "pending",
  ).length;
  return {
    resolved,
    total: review.checks.length,
    percentage: review.checks.length
      ? Math.round((resolved / review.checks.length) * 100)
      : 0,
  };
}

function formatDate(value, options = {}) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  }).format(date);
}

function formatDateTime(value) {
  return formatDate(value, { hour: "numeric", minute: "2-digit" });
}

function formatRelativeDate(value) {
  if (!value) return "Not updated";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  const days = Math.floor(
    (Date.now() - date.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (days <= 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  if (days < 30) return `Updated ${days} days ago`;
  return `Updated ${formatDate(value)}`;
}

function toCsvCell(value) {
  const raw = String(value ?? "").replace(/\r\n/g, "\n");
  const safe = /^[\t\r ]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function buildAuditEvent(action, actor) {
  return {
    action: getText(action, "Review updated", 100),
    at: new Date().toISOString(),
    actor: getText(actor, "Reviewer", 80),
  };
}

function stateConfig(state) {
  const configs = {
    draft: {
      label: "In progress",
      className: "border-slate-200 bg-slate-50 text-slate-600",
      icon: ClipboardCheck,
    },
    blocked: {
      label: "Needs work",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      icon: AlertCircle,
    },
    ready: {
      label: "Ready to sign off",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: CheckCheck,
    },
    signed: {
      label: "Signed off locally",
      className: "border-violet-200 bg-violet-50 text-violet-700",
      icon: BadgeCheck,
    },
  };
  return configs[state] || configs.draft;
}

function StateBadge({ state }) {
  const config = stateConfig(state);
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold ${config.className}`}
    >
      <Icon size={11} aria-hidden="true" />
      {config.label}
    </span>
  );
}

function StatusSelect({ value, label, onChange, disabled = false }) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        aria-label={label}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-2.5 pr-7 text-[10px] font-medium text-slate-600 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {CHECK_STATUSES.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </label>
  );
}

function ReviewMetric({ label, value, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-50 text-slate-900",
    violet: "bg-violet-50 text-violet-900",
    amber: "bg-amber-50 text-amber-900",
    emerald: "bg-emerald-50 text-emerald-900",
  };
  return (
    <div className={`rounded-xl px-3 py-2.5 ${tones[tone]}`}>
      <p className="text-[9px] font-medium opacity-70">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ReviewListCard({ review, active, onSelect, reportAvailable }) {
  const state = getReviewState(review);
  const progress = getReviewProgress(review);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`w-full rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 ${
        active
          ? "border-violet-200 bg-violet-50/60"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-xs font-semibold leading-5 text-slate-800">
            {review.reportTitle}
          </p>
          <p className="mt-1 truncate text-[9px] text-slate-400">
            {review.templateLabel} · #{review.reportId}
          </p>
        </div>
        <StateBadge state={state} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[9px] text-slate-500">
          {progress.resolved}/{progress.total} checks
          {!reportAvailable ? " · report not in current results" : ""}
        </span>
        <span className="text-[9px] text-slate-400">
          {formatRelativeDate(review.updatedAt)}
        </span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-violet-500 transition-[width]"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
    </button>
  );
}

function ChecklistItem({
  check,
  index,
  locked,
  onChange,
  onDelete,
}) {
  const hasNote = check.note.trim().length > 0;
  return (
    <article
      className={`rounded-xl border p-3 ${
        check.status === "needs-work"
          ? "border-amber-200 bg-amber-50/40"
          : check.status === "pass"
            ? "border-emerald-100 bg-emerald-50/20"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-start">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-slate-100 text-[9px] font-semibold tabular-nums text-slate-500">
            {index + 1}
          </span>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Checklist item</span>
            <input
              type="text"
              maxLength={240}
              value={check.label}
              disabled={locked}
              onChange={(event) =>
                onChange({ ...check, label: event.target.value })
              }
              className="min-h-7 w-full rounded-md border border-transparent bg-transparent px-1 text-xs font-medium text-slate-800 outline-none transition hover:border-slate-200 focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100 disabled:cursor-default disabled:hover:border-transparent"
            />
          </label>
        </div>
        <StatusSelect
          value={check.status}
          label={`Result for ${check.label}`}
          disabled={locked}
          onChange={(status) => onChange({ ...check, status })}
        />
        {!locked ? (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Remove checklist item: ${check.label}`}
            title="Remove checklist item"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
          >
            <Trash2 size={13} aria-hidden="true" />
          </button>
        ) : (
          <span className="h-8 w-8" aria-hidden="true" />
        )}
      </div>
      <label className="mt-2 block">
        <span className="mb-1 inline-flex items-center gap-1 text-[9px] font-medium text-slate-400">
          <MessageSquareText size={11} aria-hidden="true" />
          Reviewer note{hasNote ? " · saved locally" : " · optional"}
        </span>
        <textarea
          rows={2}
          maxLength={MAX_NOTE_LENGTH}
          value={check.note}
          disabled={locked}
          onChange={(event) =>
            onChange({ ...check, note: event.target.value })
          }
          placeholder="Record context or a follow-up..."
          className="w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] leading-4 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50 disabled:text-slate-500"
        />
        <span className="mt-0.5 block text-right text-[9px] tabular-nums text-slate-300">
          {check.note.length}/{MAX_NOTE_LENGTH}
        </span>
      </label>
    </article>
  );
}

function AuditTimeline({ events }) {
  const [expanded, setExpanded] = useState(false);
  const visibleEvents = expanded ? events : events.slice(-5).reverse();
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays size={13} aria-hidden="true" className="text-slate-400" />
          <h4 className="text-[10px] font-semibold text-slate-700">
            Local activity
          </h4>
          <span className="rounded bg-slate-50 px-1.5 py-0.5 text-[9px] tabular-nums text-slate-400">
            {events.length}
          </span>
        </div>
        {events.length > 5 && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-[9px] font-medium text-violet-700 hover:underline"
          >
            {expanded ? "Show recent" : "Show all"}
          </button>
        )}
      </div>
      {visibleEvents.length ? (
        <ol className="mt-2 space-y-2">
          {visibleEvents.map((event, index) => (
            <li
              key={`${event.at}-${index}`}
              className="flex items-start gap-2"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-300" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] leading-4 text-slate-600">
                  {event.action}
                </p>
                <p className="mt-0.5 text-[9px] text-slate-400">
                  {event.actor} · {formatDateTime(event.at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-[10px] text-slate-400">
          Activity will appear as the review is updated.
        </p>
      )}
    </section>
  );
}

function ReviewSummaryCard({ review }) {
  const state = getReviewState(review);
  const progress = getReviewProgress(review);
  const needsWork = review.checks.filter(
    (check) => check.status === "needs-work",
  ).length;
  const pending = review.checks.filter(
    (check) => check.status === "pending",
  ).length;
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-xs font-semibold text-slate-800">
            {review.reportTitle}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">
            {review.templateLabel} · #{review.reportId}
          </p>
        </div>
        <StateBadge state={state} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ReviewMetric
          label="Checks"
          value={`${progress.resolved}/${progress.total}`}
          tone="violet"
        />
        <ReviewMetric
          label="Needs work"
          value={needsWork}
          tone={needsWork ? "amber" : "emerald"}
        />
        <ReviewMetric
          label="Not reviewed"
          value={pending}
          tone={pending ? "amber" : "emerald"}
        />
        <ReviewMetric
          label="Reviewer"
          value={review.reviewer || "—"}
        />
      </div>
      {review.summary && (
        <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-600">
          {review.summary}
        </p>
      )}
      {review.signedOff && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1.5 text-[10px] font-medium text-violet-700">
          <BadgeCheck size={12} aria-hidden="true" />
          Signed off locally by {review.signedOffBy || "Reviewer"} on{" "}
          {formatDateTime(review.signedOffAt)}
        </p>
      )}
    </article>
  );
}

export default function ReportReviewWorkspace({
  reports,
  email,
  onOpenReport,
}) {
  const [reviewRecords, setReviewRecords] = useState([]);
  const [activeReviewId, setActiveReviewId] = useState("");
  const [savedEmail, setSavedEmail] = useState("");
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [templateId, setTemplateId] = useState(REVIEW_TEMPLATES[0].id);
  const [reportId, setReportId] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [search, setSearch] = useState("");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [sortMode, setSortMode] = useState("updated");
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [newCheckLabel, setNewCheckLabel] = useState("");
  const [auditExpanded, setAuditExpanded] = useState(false);

  const availableReports = useMemo(
    () =>
      reports.filter(
        (report) => report && typeof report === "object" && getReportId(report),
      ),
    [reports],
  );
  const reportById = useMemo(
    () =>
      new Map(
        availableReports.map((report) => [getReportId(report), report]),
      ),
    [availableReports],
  );
  const normalizedEmail = getText(email).toLocaleLowerCase();

  useEffect(() => {
    setReviewRecords([]);
    setActiveReviewId("");
    setSavedEmail("");
    setStorageError("");
    setStorageLoaded(false);
    setFeedback("");

    const storageKey = getStorageKey(email);
    if (!storageKey) {
      setStorageLoaded(true);
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      const records = raw ? normalizeReviewList(JSON.parse(raw)) : [];
      setReviewRecords(records);
      setSavedEmail(normalizedEmail);
      setStorageLoaded(true);
    } catch {
      setStorageError("Could not load review data from browser storage.");
      setReviewRecords([]);
      setStorageLoaded(false);
    }
  }, [email, normalizedEmail]);

  const activeReview = useMemo(
    () => reviewRecords.find((review) => review.id === activeReviewId) || null,
    [activeReviewId, reviewRecords],
  );
  const activeReport = activeReview
    ? reportById.get(activeReview.reportId) || null
    : null;
  const activeState = activeReview ? getReviewState(activeReview) : "draft";
  const activeProgress = activeReview
    ? getReviewProgress(activeReview)
    : { resolved: 0, total: 0, percentage: 0 };
  const activeTemplate = REVIEW_TEMPLATES.find(
    (template) => template.id === activeReview?.templateId,
  );

  const filteredReviews = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return reviewRecords
      .filter((review) => {
        const state = getReviewState(review);
        if (reviewFilter !== "all" && state !== reviewFilter) return false;
        if (!needle) return true;
        return [
          review.reportTitle,
          review.reportId,
          review.templateLabel,
          review.reviewer,
          review.reportCategory,
          review.reportSeverity,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase()
          .includes(needle);
      })
      .sort((left, right) => {
        if (sortMode === "title") {
          return left.reportTitle.localeCompare(right.reportTitle);
        }
        if (sortMode === "state") {
          return getReviewState(left).localeCompare(getReviewState(right));
        }
        return (
          new Date(right.updatedAt || 0).getTime() -
          new Date(left.updatedAt || 0).getTime()
        );
      });
  }, [reviewFilter, reviewRecords, search, sortMode]);

  const reviewMetrics = useMemo(() => {
    const counts = {
      total: reviewRecords.length,
      draft: 0,
      blocked: 0,
      ready: 0,
      signed: 0,
    };
    reviewRecords.forEach((review) => {
      counts[getReviewState(review)] += 1;
    });
    return counts;
  }, [reviewRecords]);

  const visibleReviews = showAllReviews
    ? filteredReviews
    : filteredReviews.slice(0, 6);

  const persistReviews = (nextRecords) => {
    const storageKey = getStorageKey(email);
    if (
      !storageKey ||
      !storageLoaded ||
      savedEmail !== normalizedEmail
    ) {
      setStorageError("Load a tester email before changing local reviews.");
      return false;
    }
    if (nextRecords.length > MAX_REVIEWS) {
      setStorageError(
        `This browser can store up to ${MAX_REVIEWS} reviews for this email.`,
      );
      return false;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextRecords));
      setReviewRecords(nextRecords);
      setStorageError("");
      return true;
    } catch {
      setStorageError("Could not save review data to browser storage.");
      return false;
    }
  };

  const updateReview = (reviewId, updater, auditAction = "") => {
    const review = reviewRecords.find((item) => item.id === reviewId);
    if (!review) {
      setFeedback("This review is no longer available.");
      return false;
    }
    const actor = reviewerName || review.reviewer || "Reviewer";
    const updated = updater(review);
    const changed = {
      ...updated,
      updatedAt: new Date().toISOString(),
      signedOff: auditAction ? false : updated.signedOff,
      signedOffBy: auditAction ? "" : updated.signedOffBy,
      signedOffAt: auditAction ? "" : updated.signedOffAt,
      audit: auditAction
        ? [
            ...updated.audit,
            buildAuditEvent(auditAction, actor),
          ].slice(-MAX_AUDIT_EVENTS)
        : updated.audit,
    };
    const nextRecords = reviewRecords.map((item) =>
      item.id === reviewId ? changed : item,
    );
    if (persistReviews(nextRecords)) {
      setFeedback(auditAction || "Review saved locally.");
      return true;
    }
    return false;
  };

  const createReview = () => {
    const report = reportById.get(reportId);
    if (!report) {
      setFeedback("Choose a report before starting a review.");
      return;
    }
    if (
      reviewRecords.some(
        (review) =>
          review.reportId === reportId &&
          review.templateId === templateId &&
          getReviewState(review) !== "signed",
      )
    ) {
      setFeedback(
        "An active review already exists for this report and template. Open it or choose another template.",
      );
      return;
    }
    if (reviewRecords.length >= MAX_REVIEWS) {
      setFeedback(`Review limit reached (${MAX_REVIEWS}). Delete an old review first.`);
      return;
    }

    const review = createReviewRecord(report, templateId, reviewerName);
    if (persistReviews([review, ...reviewRecords])) {
      setActiveReviewId(review.id);
      setReportId("");
      setFeedback(`Started ${review.templateLabel} review.`);
    }
  };

  const changeCheck = (checkId, nextCheck) => {
    if (!activeReview) return;
    const currentCheck = activeReview.checks.find(
      (check) => check.id === checkId,
    );
    const action =
      currentCheck && currentCheck.status !== nextCheck.status
        ? `Checklist result changed: ${nextCheck.label} → ${
            CHECK_STATUSES.find((item) => item.value === nextCheck.status)?.label
          }`
        : "";
    updateReview(
      activeReview.id,
      (review) => ({
        ...review,
        checks: review.checks.map((check) =>
          check.id === checkId
            ? { ...nextCheck, updatedAt: new Date().toISOString() }
            : check,
        ),
      }),
      action,
    );
  };

  const addCheck = () => {
    if (!activeReview) return;
    const label = getText(newCheckLabel, "", 240);
    if (!label) {
      setFeedback("Enter a checklist item before adding it.");
      return;
    }
    if (activeReview.checks.length >= MAX_CHECKS_PER_REVIEW) {
      setFeedback(
        `A review can have up to ${MAX_CHECKS_PER_REVIEW} checklist items.`,
      );
      return;
    }
    const duplicate = activeReview.checks.some(
      (check) => check.label.toLocaleLowerCase() === label.toLocaleLowerCase(),
    );
    if (duplicate) {
      setFeedback("That checklist item already exists in this review.");
      return;
    }

    const check = {
      id: createId(),
      label,
      status: "pending",
      note: "",
      updatedAt: new Date().toISOString(),
    };
    if (
      updateReview(
        activeReview.id,
        (review) => ({ ...review, checks: [...review.checks, check] }),
        `Checklist item added: ${label}`,
      )
    ) {
      setNewCheckLabel("");
    }
  };

  const removeCheck = (checkId) => {
    if (!activeReview) return;
    const check = activeReview.checks.find((item) => item.id === checkId);
    if (!check) return;
    updateReview(
      activeReview.id,
      (review) => ({
        ...review,
        checks: review.checks.filter((item) => item.id !== checkId),
      }),
      `Checklist item removed: ${check.label}`,
    );
  };

  const signOff = () => {
    if (!activeReview) return;
    const state = getReviewState({ ...activeReview, signedOff: false });
    if (state !== "ready") {
      setFeedback(
        "Resolve every checklist item as Pass or N/A, and clear all Needs work items before sign-off.",
      );
      return;
    }
    const actor =
      getText(reviewerName, "", 80) ||
      getText(activeReview.reviewer, "", 80);
    if (!actor) {
      setFeedback("Enter a reviewer name before signing off.");
      return;
    }

    const now = new Date().toISOString();
    const nextRecord = {
      ...activeReview,
      reviewer: actor,
      signedOff: true,
      signedOffBy: actor,
      signedOffAt: now,
      updatedAt: now,
      audit: [
        ...activeReview.audit,
        buildAuditEvent("Review signed off locally", actor),
      ].slice(-MAX_AUDIT_EVENTS),
    };
    const nextRecords = reviewRecords.map((review) =>
      review.id === activeReview.id ? nextRecord : review,
    );
    if (persistReviews(nextRecords)) {
      setFeedback("Review signed off locally. This does not update server status.");
    }
  };

  const reopenReview = () => {
    if (!activeReview) return;
    updateReview(
      activeReview.id,
      (review) => ({
        ...review,
        signedOff: false,
        signedOffBy: "",
        signedOffAt: "",
      }),
      "Local sign-off reopened",
    );
  };

  const deleteReview = (reviewId) => {
    const review = reviewRecords.find((item) => item.id === reviewId);
    if (!review) return;
    const nextRecords = reviewRecords.filter((item) => item.id !== reviewId);
    if (persistReviews(nextRecords)) {
      if (activeReviewId === reviewId) setActiveReviewId("");
      setFeedback(`Deleted review for ${review.reportTitle}.`);
    }
  };

  const deleteAllReviews = () => {
    if (!reviewRecords.length) return;
    if (persistReviews([])) {
      setActiveReviewId("");
      setFeedback("All locally saved reviews were deleted.");
    }
  };

  const exportReview = (review) => {
    const rows = [
      ["Report", review.reportTitle],
      ["Report ID", review.reportId],
      ["Report status at review start", review.reportStatus],
      ["Severity", review.reportSeverity],
      ["Category", review.reportCategory],
      ["Review template", review.templateLabel],
      ["Reviewer", review.reviewer],
      ["Review state", stateConfig(getReviewState(review)).label],
      ["Review summary", review.summary],
      ["Signed off by", review.signedOffBy],
      ["Signed off at", review.signedOffAt],
      [],
      ["Checklist item", "Result", "Last updated"],
      ...review.checks.map((check) => [
        check.label,
        CHECK_STATUSES.find((status) => status.value === check.status)?.label,
        check.updatedAt,
      ]),
      [],
      ["Activity", "Actor", "Time"],
      ...review.audit.map((event) => [
        event.action,
        event.actor,
        event.at,
      ]),
    ];
    const csv = rows
      .map((row) => row.map(toCsvCell).join(","))
      .join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `review-${review.reportId.slice(-12) || "report"}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback("Review exported. Private reviewer notes were excluded.");
  };

  const updateReviewMetadata = (field, value, auditAction = "") => {
    if (!activeReview) return;
    updateReview(
      activeReview.id,
      (review) => ({ ...review, [field]: value }),
      auditAction,
    );
  };

  const updateReviewer = (value) => {
    setReviewerName(value.slice(0, 80));
    if (activeReview) {
      updateReview(
        activeReview.id,
        (review) => ({ ...review, reviewer: value.slice(0, 80) }),
        value !== activeReview.reviewer ? "Reviewer changed" : "",
      );
    }
  };

  const updateSummary = (value) => {
    updateReviewMetadata("summary", value.slice(0, MAX_SUMMARY_LENGTH));
  };

  const updateDueDate = (value) => {
    updateReviewMetadata("dueDate", value, "Review due date changed");
  };

  const activeReportCanOpen = Boolean(
    activeReview && reportById.has(activeReview.reportId),
  );
  const canSignOff = activeReview && activeState === "ready";
  const filterCounts = useMemo(() => {
    const counts = {
      all: reviewRecords.length,
      draft: 0,
      blocked: 0,
      ready: 0,
      signed: 0,
    };
    reviewRecords.forEach((review) => {
      counts[getReviewState(review)] += 1;
    });
    return counts;
  }, [reviewRecords]);

  return (
    <section
      aria-labelledby="report-review-workspace-title"
      className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <FileCheck2 size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3
              id="report-review-workspace-title"
              className="text-sm font-semibold tracking-tight text-slate-900"
            >
              Report review and sign-off
            </h3>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
              Run a structured local checklist, record reviewer notes, and
              track an advisory sign-off without changing report status.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/70 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
          <LockKeyhole size={11} aria-hidden="true" />
          Private to this browser
        </span>
      </header>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <ReviewMetric label="Total reviews" value={reviewMetrics.total} />
          <ReviewMetric
            label="In progress"
            value={reviewMetrics.draft}
            tone="violet"
          />
          <ReviewMetric
            label="Needs work"
            value={reviewMetrics.blocked}
            tone="amber"
          />
          <ReviewMetric
            label="Ready"
            value={reviewMetrics.ready}
            tone="emerald"
          />
          <ReviewMetric
            label="Signed off"
            value={reviewMetrics.signed}
            tone="emerald"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.5fr)]">
          <aside className="space-y-3">
            <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
              <div className="flex items-start gap-2">
                <Plus
                  size={14}
                  aria-hidden="true"
                  className="mt-0.5 text-violet-600"
                />
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">
                    Start a review
                  </h4>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500">
                    Choose a report and a checklist template to begin.
                  </p>
                </div>
              </div>
              <label className="mt-3 block">
                <span className="mb-1 block text-[9px] font-semibold text-slate-500">
                  Report
                </span>
                <select
                  aria-label="Choose report to review"
                  value={reportId}
                  onChange={(event) => setReportId(event.target.value)}
                  disabled={!availableReports.length || !storageLoaded}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-100"
                >
                  <option value="">Select a report</option>
                  {availableReports.map((report) => (
                    <option key={getReportId(report)} value={getReportId(report)}>
                      {getReportTitle(report)} · {getStatus(report)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-2 block">
                <span className="mb-1 block text-[9px] font-semibold text-slate-500">
                  Review template
                </span>
                <select
                  aria-label="Choose review checklist template"
                  value={templateId}
                  onChange={(event) => setTemplateId(event.target.value)}
                  disabled={!storageLoaded}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-100"
                >
                  {REVIEW_TEMPLATES.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.label}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[9px] leading-4 text-slate-400">
                  {
                    REVIEW_TEMPLATES.find((item) => item.id === templateId)
                      ?.description
                  }
                </span>
              </label>
              <label className="mt-2 block">
                <span className="mb-1 block text-[9px] font-semibold text-slate-500">
                  Reviewer name
                </span>
                <span className="relative block">
                  <UserRound
                    size={13}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(event) =>
                      setReviewerName(event.target.value.slice(0, 80))
                    }
                    maxLength={80}
                    placeholder="Optional until sign-off"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-[10px] text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                  />
                </span>
              </label>
              <button
                type="button"
                onClick={createReview}
                disabled={!reportId || !storageLoaded || !savedEmail}
                className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={13} aria-hidden="true" />
                Start checklist review
              </button>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">
                    Review queue
                  </h4>
                  <p className="mt-1 text-[9px] text-slate-400">
                    {filteredReviews.length} matching reviews
                  </p>
                </div>
                {reviewRecords.length > 0 && (
                  <button
                    type="button"
                    onClick={deleteAllReviews}
                    className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-[9px] font-medium text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
                    title="Delete every saved local review"
                  >
                    <Trash2 size={11} aria-hidden="true" />
                    Clear all
                  </button>
                )}
              </div>
              <label className="relative block">
                <span className="sr-only">Search review queue</span>
                <Search
                  size={13}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search reviews..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="relative block">
                  <span className="sr-only">Filter reviews by state</span>
                  <Filter
                    size={12}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    aria-label="Filter reviews by state"
                    value={reviewFilter}
                    onChange={(event) => setReviewFilter(event.target.value)}
                    className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-7 pr-6 text-[9px] text-slate-600 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                  >
                    {REVIEW_FILTERS.map((filter) => (
                      <option key={filter.value} value={filter.value}>
                        {filter.label} ({filterCounts[filter.value]})
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={11}
                    aria-hidden="true"
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </label>
                <label className="relative block">
                  <span className="sr-only">Sort reviews</span>
                  <ArrowDownAZ
                    size={12}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    aria-label="Sort reviews"
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value)}
                    className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-7 pr-6 text-[9px] text-slate-600 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                  >
                    <option value="updated">Recently updated</option>
                    <option value="title">Report title A–Z</option>
                    <option value="state">Review state</option>
                  </select>
                  <ChevronDown
                    size={11}
                    aria-hidden="true"
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </label>
              </div>

              {visibleReviews.length ? (
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {visibleReviews.map((review) => (
                    <ReviewListCard
                      key={review.id}
                      review={review}
                      active={activeReviewId === review.id}
                      reportAvailable={reportById.has(review.reportId)}
                      onSelect={() => setActiveReviewId(review.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center">
                  <ClipboardCheck
                    size={17}
                    aria-hidden="true"
                    className="mx-auto text-slate-400"
                  />
                  <p className="mt-2 text-[10px] font-medium text-slate-600">
                    {reviewRecords.length
                      ? "No reviews match these filters"
                      : "No local reviews yet"}
                  </p>
                  <p className="mt-1 text-[9px] leading-4 text-slate-400">
                    Start a checklist review to build a private review queue.
                  </p>
                </div>
              )}
              {filteredReviews.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllReviews((show) => !show)}
                  className="w-full rounded-lg py-2 text-[10px] font-medium text-violet-700 transition hover:bg-violet-50"
                >
                  {showAllReviews
                    ? "Show fewer reviews"
                    : `Show all ${filteredReviews.length} reviews`}
                </button>
              )}
            </section>
          </aside>

          <div className="min-w-0 space-y-3">
            {activeReview ? (
              <>
                <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700">
                        <ClipboardCheck size={16} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="break-words text-sm font-semibold text-slate-900">
                            {activeReview.reportTitle}
                          </h4>
                          <StateBadge state={activeState} />
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500">
                          {activeReview.templateLabel} ·{" "}
                          {activeReview.reportCategory} ·{" "}
                          {activeReview.reportSeverity} severity
                        </p>
                        <p className="mt-1 text-[9px] text-slate-400">
                          Report status at review creation:{" "}
                          {activeReview.reportStatus}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {activeReportCanOpen && (
                        <button
                          type="button"
                          onClick={() => onOpenReport(activeReport)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[10px] font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
                        >
                          Open report <ArrowUpRight size={11} aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => exportReview(activeReview)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[10px] font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
                      >
                        <Download size={11} aria-hidden="true" />
                        Export
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteReview(activeReview.id)}
                        aria-label="Delete this review"
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {!activeReportCanOpen && (
                    <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[10px] text-amber-700">
                      The original report is not in the currently loaded results.
                      Your local review data is still available.
                    </p>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <ReviewMetric
                      label="Checklist progress"
                      value={`${activeProgress.resolved}/${activeProgress.total}`}
                      tone="violet"
                    />
                    <ReviewMetric
                      label="Completion"
                      value={`${activeProgress.percentage}%`}
                      tone={activeState === "ready" ? "emerald" : "amber"}
                    />
                    <ReviewMetric
                      label="Created"
                      value={formatDate(activeReview.createdAt)}
                    />
                    <ReviewMetric
                      label="Last updated"
                      value={formatDate(activeReview.updatedAt)}
                    />
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-[width]"
                      style={{ width: `${activeProgress.percentage}%` }}
                    />
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800">
                        Review ownership
                      </h4>
                      <p className="mt-1 text-[9px] text-slate-400">
                        Local planning fields; no assignment is sent to the server.
                      </p>
                    </div>
                    {activeReview.signedOff && (
                      <span className="text-[9px] text-violet-700">
                        Signed by {activeReview.signedOffBy}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label>
                      <span className="mb-1 block text-[9px] font-semibold text-slate-500">
                        Reviewer
                      </span>
                      <input
                        type="text"
                        maxLength={80}
                        value={activeReview.reviewer}
                        disabled={activeReview.signedOff}
                        onChange={(event) => updateReviewer(event.target.value)}
                        placeholder="Reviewer name"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-[9px] font-semibold text-slate-500">
                        Target review date
                      </span>
                      <input
                        type="date"
                        value={activeReview.dueDate}
                        disabled={activeReview.signedOff}
                        onChange={(event) => updateDueDate(event.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50"
                      />
                    </label>
                  </div>
                  <label className="mt-3 block">
                    <span className="mb-1 block text-[9px] font-semibold text-slate-500">
                      Review summary
                    </span>
                    <textarea
                      rows={3}
                      maxLength={MAX_SUMMARY_LENGTH}
                      value={activeReview.summary}
                      disabled={activeReview.signedOff}
                      onChange={(event) => updateSummary(event.target.value)}
                      placeholder="Capture the decision context or key follow-up..."
                      className="w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] leading-4 text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50"
                    />
                    <span className="mt-0.5 block text-right text-[9px] tabular-nums text-slate-300">
                      {activeReview.summary.length}/{MAX_SUMMARY_LENGTH}
                    </span>
                  </label>
                </section>

                <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800">
                        Checklist
                      </h4>
                      <p className="mt-1 text-[9px] text-slate-400">
                        Each result and note saves to this browser as you edit.
                      </p>
                    </div>
                    <span className="rounded-md bg-white px-2 py-1 text-[9px] font-medium text-slate-500">
                      {activeReview.checks.length}/{MAX_CHECKS_PER_REVIEW} items
                    </span>
                  </div>

                  {activeReview.checks.length ? (
                    <div className="space-y-2">
                      {activeReview.checks.map((check, index) => (
                        <ChecklistItem
                          key={check.id}
                          check={check}
                          index={index}
                          locked={activeReview.signedOff}
                          onChange={(nextCheck) =>
                            changeCheck(check.id, nextCheck)
                          }
                          onDelete={() => removeCheck(check.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
                      <ClipboardCheck
                        size={17}
                        aria-hidden="true"
                        className="mx-auto text-slate-400"
                      />
                      <p className="mt-2 text-[10px] font-medium text-slate-600">
                        No checklist items
                      </p>
                      <p className="mt-1 text-[9px] text-slate-400">
                        Add a check to make this review actionable.
                      </p>
                    </div>
                  )}

                  {!activeReview.signedOff && (
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <label>
                        <span className="sr-only">New checklist item</span>
                        <input
                          type="text"
                          value={newCheckLabel}
                          maxLength={240}
                          onChange={(event) =>
                            setNewCheckLabel(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addCheck();
                            }
                          }}
                          placeholder="Add a review-specific check..."
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={addCheck}
                        disabled={activeReview.checks.length >= MAX_CHECKS_PER_REVIEW}
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus size={12} aria-hidden="true" />
                        Add check
                      </button>
                    </div>
                  )}
                </section>

                <section
                  aria-label="Review sign-off"
                  className={`rounded-xl border p-3 sm:p-4 ${
                    activeState === "ready" || activeState === "signed"
                      ? "border-emerald-200 bg-emerald-50/40"
                      : activeState === "blocked"
                        ? "border-amber-200 bg-amber-50/40"
                        : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      {activeState === "blocked" ? (
                        <AlertCircle
                          size={15}
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-amber-600"
                        />
                      ) : (
                        <BadgeCheck
                          size={15}
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-emerald-600"
                        />
                      )}
                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          {activeState === "signed"
                            ? "Review signed off locally"
                            : activeState === "ready"
                              ? "Checklist is ready for local sign-off"
                              : activeState === "blocked"
                                ? "Resolve needs-work items before sign-off"
                                : "Complete the checklist to prepare sign-off"}
                        </p>
                        <p className="mt-1 text-[9px] leading-4 text-slate-500">
                          This is a local review record only. It is not a
                          deployment approval and does not change server report
                          status.
                        </p>
                        {activeReview.signedOff && (
                          <p className="mt-1 text-[9px] text-violet-700">
                            Signed by {activeReview.signedOffBy} ·{" "}
                            {formatDateTime(activeReview.signedOffAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    {activeReview.signedOff ? (
                      <button
                        type="button"
                        onClick={reopenReview}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
                      >
                        <RotateCcw size={12} aria-hidden="true" />
                        Reopen review
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={signOff}
                        disabled={
                          !canSignOff ||
                          !(reviewerName.trim() || activeReview.reviewer.trim())
                        }
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[10px] font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Check size={13} aria-hidden="true" />
                        Sign off locally
                      </button>
                    )}
                  </div>
                  {activeState === "draft" && activeProgress.total > 0 && (
                    <p className="mt-2 inline-flex items-center gap-1 text-[9px] text-slate-500">
                      <CircleHelp size={11} aria-hidden="true" />
                      {activeProgress.total - activeProgress.resolved} checklist
                      item(s) still need a result.
                    </p>
                  )}
                </section>

                <AuditTimeline events={activeReview.audit} />
              </>
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-8 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <ClipboardCheck size={19} aria-hidden="true" />
                </span>
                <h4 className="mt-3 text-sm font-semibold text-slate-800">
                  Select a review to get started
                </h4>
                <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                  Choose an existing review from the queue, or start a new one
                  with a checklist template.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {REVIEW_TEMPLATES.slice(0, 3).map((template) => (
                    <span
                      key={template.id}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-medium text-slate-500"
                    >
                      {template.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {reviewRecords.length > 0 && (
          <section className="space-y-2 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h4 className="text-xs font-semibold text-slate-800">
                  Review summary list
                </h4>
                <p className="mt-1 text-[9px] text-slate-400">
                  Quick scan of state, progress, and local sign-off across the
                  queue.
                </p>
              </div>
              <span className="text-[9px] tabular-nums text-slate-400">
                Showing {visibleReviews.length} of {filteredReviews.length}
              </span>
            </div>
            <div className="grid gap-2 lg:grid-cols-2">
              {visibleReviews.slice(0, 4).map((review) => (
                <ReviewSummaryCard key={review.id} review={review} />
              ))}
            </div>
          </section>
        )}

        <footer className="flex flex-wrap items-start justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="flex max-w-3xl items-start gap-2">
            <ShieldAlert
              size={13}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-slate-400"
            />
            <p className="text-[9px] leading-4 text-slate-400">
              Reviews, checklist notes, reviewer names, summaries, and audit
              events are stored only in this browser, scoped to the loaded
              tester email. The CSV export excludes private checklist notes.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[9px] text-slate-400">
            <LockKeyhole size={10} aria-hidden="true" />
            Browser-local
          </span>
        </footer>

        {storageError && (
          <p
            role="alert"
            className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[10px] text-rose-700"
          >
            {storageError}
          </p>
        )}
        {feedback && (
          <p
            role="status"
            aria-live="polite"
            className="text-[10px] text-slate-500"
          >
            {feedback}
          </p>
        )}
      </div>
    </section>
  );
}
