"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  ClipboardCheck,
  Download,
  FileCheck2,
  FilterX,
  Info,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";

const STORAGE_PREFIX = "tester-report-verification-v1";
const INITIAL_VISIBLE_REPORTS = 8;
const MAX_NOTE_LENGTH = 600;

const OUTCOMES = [
  {
    id: "pending",
    label: "Not retested",
    shortLabel: "Pending",
    description: "This closed report has not been checked again.",
    icon: CircleDashed,
    tone: "slate",
    badge:
      "border-slate-200 bg-slate-50 text-slate-600",
    button:
      "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
    metric:
      "border-slate-200 bg-slate-50 text-slate-700",
  },
  {
    id: "verified",
    label: "No longer reproduces",
    shortLabel: "Verified",
    description: "A retest did not reproduce the reported behavior.",
    icon: CheckCircle2,
    tone: "emerald",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    button:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    metric:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    id: "reproduces",
    label: "Still reproduces",
    shortLabel: "Still reproduces",
    description: "The issue still appears during a follow-up retest.",
    icon: ShieldAlert,
    tone: "rose",
    badge:
      "border-rose-200 bg-rose-50 text-rose-700",
    button:
      "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
    metric:
      "border-rose-200 bg-rose-50 text-rose-700",
  },
  {
    id: "blocked",
    label: "Retest blocked",
    shortLabel: "Blocked",
    description: "A blocker prevented a useful follow-up retest.",
    icon: Info,
    tone: "amber",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700",
    button:
      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
    metric:
      "border-amber-200 bg-amber-50 text-amber-700",
  },
];

const OUTCOME_FILTERS = [
  { value: "all", label: "All retest states" },
  { value: "pending", label: "Not retested" },
  { value: "verified", label: "No longer reproduces" },
  { value: "reproduces", label: "Still reproduces" },
  { value: "blocked", label: "Retest blocked" },
];

const SORT_OPTIONS = [
  { value: "priority", label: "Severity, then oldest" },
  { value: "oldest", label: "Oldest report first" },
  { value: "newest", label: "Newest report first" },
  { value: "outcome", label: "Retest state first" },
];

function getText(value, limit = 320) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function getReportId(report) {
  const id = report?._id ?? report?.id;
  return id === null || id === undefined ? "" : String(id).trim();
}

function getReportTitle(report) {
  return (
    getText(report?.title, 240) ||
    getText(report?.summary, 240) ||
    "Untitled report"
  );
}

function getReportSeverity(report) {
  return getText(report?.severity, 80) || "Unspecified";
}

function getReportCategory(report) {
  return getText(report?.category, 120) || "Uncategorized";
}

function getReportDate(report) {
  const value = report?.createdAt || report?.created_at;
  if (!value) return null;

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

function getReviewTimestamp(value) {
  if (typeof value !== "string" || !value) return "";
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : "";
}

function getOutcome(outcomeId) {
  return OUTCOMES.find((outcome) => outcome.id === outcomeId) || OUTCOMES[0];
}

function getStorageKey(email) {
  return `${STORAGE_PREFIX}:${email}`;
}

function normalizeReviews(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.entries(value).reduce((reviews, [reportId, item]) => {
    if (
      !reportId ||
      !item ||
      typeof item !== "object" ||
      Array.isArray(item)
    ) {
      return reviews;
    }

    const outcome = OUTCOMES.some(
      (candidate) => candidate.id === item.outcome,
    )
      ? item.outcome
      : "pending";
    const note =
      typeof item.note === "string" ? item.note.slice(0, MAX_NOTE_LENGTH) : "";

    reviews[reportId] = {
      outcome,
      note,
      reviewedAt: getReviewTimestamp(item.reviewedAt),
      updatedAt: getReviewTimestamp(item.updatedAt),
    };
    return reviews;
  }, {});
}

function getReview(reviews, reportId) {
  return (
    reviews[reportId] || {
      outcome: "pending",
      note: "",
      reviewedAt: "",
      updatedAt: "",
    }
  );
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDate(value, options = {}) {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    return "Date unavailable";
  }

  return value.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  });
}

function formatDateTime(value) {
  const timestamp = Date.parse(value || "");
  if (!Number.isFinite(timestamp)) return "Not recorded";

  return new Date(timestamp).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function severityRank(report) {
  const severity = getReportSeverity(report).toLowerCase();
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  if (severity === "low") return 1;
  return 0;
}

function matchesSearch(report, query) {
  if (!query) return true;

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [
    getReportId(report),
    getReportTitle(report),
    getText(report?.description, 3000),
    getReportSeverity(report),
    getReportCategory(report),
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function buildCsv(reports, reviews) {
  const escapeCell = (value) => {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replaceAll('"', '""')}"`;
  };
  const rows = [
    [
      "Report ID",
      "Title",
      "Severity",
      "Category",
      "Report status",
      "Retest outcome",
      "Report submitted",
      "Retest recorded",
    ],
  ];

  reports.forEach((report) => {
    const review = getReview(reviews, getReportId(report));
    const reportDate = getReportDate(report);
    rows.push([
      getReportId(report),
      getReportTitle(report),
      getReportSeverity(report),
      getReportCategory(report),
      getText(report?.status, 80) || "Closed",
      getOutcome(review.outcome).label,
      reportDate ? reportDate.toISOString() : "",
      review.reviewedAt,
    ]);
  });

  return rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

function downloadCsv(reports, reviews) {
  const contents = `\uFEFF${buildCsv(reports, reviews)}`;
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `report-retest-review-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function MetricCard({ label, value, caption, icon: Icon, tone }) {
  const styles = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
  };

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold leading-none tracking-tight text-slate-950 tabular-nums">
            {formatNumber(value)}
          </p>
        </div>
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${styles[tone]}`}
        >
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-[11px] leading-4 text-slate-500">{caption}</p>
    </article>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-xs font-medium text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
      </span>
    </label>
  );
}

function OutcomeBadge({ outcome }) {
  const Icon = outcome.icon;

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${outcome.badge}`}
    >
      <Icon size={12} aria-hidden="true" />
      <span className="truncate">{outcome.label}</span>
    </span>
  );
}

function OutcomeButton({ outcome, active, onClick }) {
  const Icon = outcome.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={outcome.description}
      className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 ${
        active
          ? `${outcome.button} ring-2 ring-violet-200`
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
      }`}
    >
      <Icon size={13} aria-hidden="true" />
      <span>{outcome.shortLabel}</span>
    </button>
  );
}

function VerificationReportCard({
  report,
  review,
  onSetOutcome,
  onSetNote,
  onReset,
  onOpenReport,
}) {
  const id = getReportId(report);
  const outcome = getOutcome(review.outcome);
  const reportDate = getReportDate(report);
  const severityTone =
    severityRank(report) >= 3
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : severityRank(report) === 2
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/20 transition hover:border-violet-200">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] font-semibold text-slate-400">
                {id ? `#${id.slice(-8)}` : "Report"}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${severityTone}`}
              >
                {getReportSeverity(report)}
              </span>
              <span className="max-w-full truncate rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500">
                {getReportCategory(report)}
              </span>
            </div>
            <h3 className="mt-2 break-words text-sm font-semibold leading-5 text-slate-900">
              {getReportTitle(report)}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={12} aria-hidden="true" />
                Submitted {formatDate(reportDate)}
              </span>
              <span className="inline-flex items-center gap-1">
                <ClipboardCheck size={12} aria-hidden="true" />
                Retest {formatDateTime(review.reviewedAt)}
              </span>
            </div>
          </div>
          <OutcomeBadge outcome={outcome} />
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Record a local retest outcome
          </p>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {OUTCOMES.filter((item) => item.id !== "pending").map((item) => (
              <OutcomeButton
                key={item.id}
                outcome={item}
                active={review.outcome === item.id}
                onClick={() => onSetOutcome(id, item.id)}
              />
            ))}
            <OutcomeButton
              outcome={OUTCOMES[0]}
              active={review.outcome === "pending"}
              onClick={() => onSetOutcome(id, "pending")}
            />
          </div>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <span>Private browser note</span>
            <span className="font-normal normal-case tracking-normal">
              {review.note.length}/{MAX_NOTE_LENGTH} · excluded from export
            </span>
          </span>
          <textarea
            value={review.note}
            maxLength={MAX_NOTE_LENGTH}
            rows={2}
            onChange={(event) => onSetNote(id, event.target.value)}
            placeholder="Optional reminder for your own follow-up; saved only in this browser."
            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-xs leading-5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
          />
        </label>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="max-w-xl text-[10px] leading-4 text-slate-500">
            {outcome.description} This note and outcome do not change the
            server-side report or its status.
          </p>
          <div className="flex items-center gap-2">
            {onOpenReport && (
              <button
                type="button"
                onClick={() => onOpenReport(report)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
              >
                Open report
                <ArrowUpRight size={13} aria-hidden="true" />
              </button>
            )}
            {(review.outcome !== "pending" || review.note) && (
              <button
                type="button"
                onClick={() => onReset(id)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
              >
                <RotateCcw size={12} aria-hidden="true" />
                Clear review
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function CoverageSummary({ counts, total }) {
  const reviewed = counts.verified + counts.reproduces + counts.blocked;
  const percent = total ? Math.round((reviewed / total) * 100) : 0;

  return (
    <section
      aria-label="Retest coverage"
      className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-sky-50/60 p-4 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold text-violet-800">
            <Sparkles size={14} aria-hidden="true" />
            Closed-report retest coverage
          </p>
          <p className="mt-1 text-[11px] leading-5 text-slate-600">
            Coverage counts reports with a recorded outcome, including blocked
            retests. It is a personal follow-up aid, not a change to report
            status or an official verification record.
          </p>
        </div>
        <div className="flex shrink-0 items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight text-slate-950 tabular-nums">
            {percent}%
          </span>
          <span className="text-[10px] text-slate-500">
            {formatNumber(reviewed)} of {formatNumber(total)} recorded
          </span>
        </div>
      </div>
      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-violet-100"
        role="progressbar"
        aria-label="Retest coverage percentage"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-sky-500 transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </section>
  );
}

function EmptyState({ hasReports, hasFilters, onResetFilters }) {
  if (!hasReports) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-10 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm">
          <FileCheck2 size={21} aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-sm font-semibold text-slate-800">
          No closed reports to retest yet
        </h3>
        <p className="mx-auto mt-1.5 max-w-lg text-xs leading-5 text-slate-500">
          Closed reports will appear here when available. This workspace keeps
          retest notes and outcomes in your browser and does not reopen reports.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-10 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-violet-500 shadow-sm">
        <Search size={20} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-slate-800">
        No reports match these filters
      </h3>
      <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-slate-500">
        Try a different retest outcome, severity, category, or search term.
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
        >
          <FilterX size={14} aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );
}

export default function ReportVerificationWorkspace({
  reports = [],
  email,
  onOpenReport,
}) {
  const [reviews, setReviews] = useState({});
  const [loadedForEmail, setLoadedForEmail] = useState("");
  const [canPersist, setCanPersist] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [exportError, setExportError] = useState("");
  const [exportNotice, setExportNotice] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("priority");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_REPORTS);
  const normalizedEmail = getText(email, 320).toLowerCase();
  const storageKey = normalizedEmail ? getStorageKey(normalizedEmail) : "";

  const closedReports = useMemo(
    () =>
      reports.filter(
        (report) => report?.status === "Closed" && getReportId(report),
      ),
    [reports],
  );

  const severityOptions = useMemo(() => {
    const values = Array.from(
      new Set(closedReports.map((report) => getReportSeverity(report))),
    ).sort((left, right) => left.localeCompare(right));

    return [
      { value: "all", label: "All severities" },
      ...values.map((value) => ({ value, label: value })),
    ];
  }, [closedReports]);

  const categoryOptions = useMemo(() => {
    const values = Array.from(
      new Set(closedReports.map((report) => getReportCategory(report))),
    ).sort((left, right) => left.localeCompare(right));

    return [
      { value: "all", label: "All categories" },
      ...values.map((value) => ({ value, label: value })),
    ];
  }, [closedReports]);

  useEffect(() => {
    setReviews({});
    setLoadedForEmail("");
    setCanPersist(false);
    setStorageError("");
    setOutcomeFilter("all");
    setSeverityFilter("all");
    setCategoryFilter("all");
    setQuery("");
    setSortBy("priority");
    setVisibleCount(INITIAL_VISIBLE_REPORTS);

    if (!normalizedEmail) return;

    try {
      const saved = window.localStorage.getItem(getStorageKey(normalizedEmail));
      setReviews(saved ? normalizeReviews(JSON.parse(saved)) : {});
      setCanPersist(true);
    } catch {
      setStorageError(
        "Could not read retest notes from this browser. New changes remain available in memory.",
      );
      setReviews({});
    } finally {
      setLoadedForEmail(normalizedEmail);
    }
  }, [normalizedEmail]);

  useEffect(() => {
    if (!canPersist || !storageKey || loadedForEmail !== normalizedEmail) {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(reviews));
      setStorageError("");
    } catch {
      setStorageError(
        "Retest changes are only in memory because this browser could not save them.",
      );
    }
  }, [canPersist, loadedForEmail, normalizedEmail, reviews, storageKey]);

  const counts = useMemo(
    () =>
      closedReports.reduce(
        (result, report) => {
          const outcome = getReview(reviews, getReportId(report)).outcome;
          result.total += 1;
          result[outcome] = (result[outcome] || 0) + 1;
          return result;
        },
        { total: 0, pending: 0, verified: 0, reproduces: 0, blocked: 0 },
      ),
    [closedReports, reviews],
  );

  const filteredReports = useMemo(() => {
    const outcomeRanks = {
      reproduces: 0,
      blocked: 1,
      pending: 2,
      verified: 3,
    };

    return closedReports
      .filter((report) => {
        const review = getReview(reviews, getReportId(report));
        if (outcomeFilter !== "all" && review.outcome !== outcomeFilter) {
          return false;
        }
        if (
          severityFilter !== "all" &&
          getReportSeverity(report) !== severityFilter
        ) {
          return false;
        }
        if (
          categoryFilter !== "all" &&
          getReportCategory(report) !== categoryFilter
        ) {
          return false;
        }
        return matchesSearch(report, query);
      })
      .sort((left, right) => {
        const leftDate = getReportDate(left)?.getTime() ?? 0;
        const rightDate = getReportDate(right)?.getTime() ?? 0;

        if (sortBy === "oldest") return leftDate - rightDate;
        if (sortBy === "newest") return rightDate - leftDate;
        if (sortBy === "outcome") {
          const leftRank =
            outcomeRanks[getReview(reviews, getReportId(left)).outcome] ?? 4;
          const rightRank =
            outcomeRanks[getReview(reviews, getReportId(right)).outcome] ?? 4;
          if (leftRank !== rightRank) return leftRank - rightRank;
        }

        const outcomeRankDifference =
          (outcomeRanks[getReview(reviews, getReportId(left)).outcome] ?? 4) -
          (outcomeRanks[getReview(reviews, getReportId(right)).outcome] ?? 4);
        if (outcomeRankDifference) return outcomeRankDifference;

        const severityDifference = severityRank(right) - severityRank(left);
        if (severityDifference) return severityDifference;
        return leftDate - rightDate;
      });
  }, [
    categoryFilter,
    closedReports,
    outcomeFilter,
    query,
    reviews,
    severityFilter,
    sortBy,
  ]);

  const visibleReports = filteredReports.slice(0, visibleCount);
  const hasActiveFilters =
    outcomeFilter !== "all" ||
    severityFilter !== "all" ||
    categoryFilter !== "all" ||
    Boolean(query.trim());
  const reviewedCount = counts.verified + counts.reproduces + counts.blocked;
  const coveragePercent = counts.total
    ? Math.round((reviewedCount / counts.total) * 100)
    : 0;

  const updateReview = (reportId, updater) => {
    if (!reportId) return;
    setReviews((current) => {
      const existing = getReview(current, reportId);
      const next = updater(existing);
      return { ...current, [reportId]: next };
    });
    setExportError("");
    setExportNotice("");
  };

  const handleSetOutcome = (reportId, outcome) => {
    if (!OUTCOMES.some((candidate) => candidate.id === outcome)) return;
    const timestamp = new Date().toISOString();
    updateReview(reportId, (current) => ({
      ...current,
      outcome,
      reviewedAt: outcome === "pending" ? "" : timestamp,
      updatedAt: timestamp,
    }));
  };

  const handleSetNote = (reportId, note) => {
    const timestamp = new Date().toISOString();
    updateReview(reportId, (current) => ({
      ...current,
      note: typeof note === "string" ? note.slice(0, MAX_NOTE_LENGTH) : "",
      updatedAt: timestamp,
    }));
  };

  const handleResetReview = (reportId) => {
    updateReview(reportId, () => ({
      outcome: "pending",
      note: "",
      reviewedAt: "",
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleExport = () => {
    setExportError("");
    setExportNotice("");

    try {
      downloadCsv(filteredReports, reviews);
      setExportNotice(
        `Exported ${formatNumber(filteredReports.length)} filtered ${
          filteredReports.length === 1 ? "report" : "reports"
        }. Private notes were excluded.`,
      );
    } catch {
      setExportError(
        "The CSV could not be created. Check browser download permissions and try again.",
      );
    }
  };

  const resetFilters = () => {
    setOutcomeFilter("all");
    setSeverityFilter("all");
    setCategoryFilter("all");
    setQuery("");
    setVisibleCount(INITIAL_VISIBLE_REPORTS);
  };

  const setFilter = (setter, value) => {
    setter(value);
    setVisibleCount(INITIAL_VISIBLE_REPORTS);
    setExportError("");
    setExportNotice("");
  };

  const showMore = () => {
    setVisibleCount((current) =>
      Math.min(current + INITIAL_VISIBLE_REPORTS, filteredReports.length),
    );
  };

  const showLess = () => {
    setVisibleCount(INITIAL_VISIBLE_REPORTS);
  };

  const hasMore = visibleCount < filteredReports.length;

  return (
    <section className="mt-5 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
      <div className="border-b border-slate-200/80 bg-gradient-to-r from-emerald-50/70 via-white to-violet-50/60 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-emerald-100 bg-white text-emerald-700 shadow-sm">
                <ClipboardCheck size={19} aria-hidden="true" />
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                Patch 10 · Local retest log
              </span>
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">
              Closed-report retest workspace
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-slate-600">
              Keep a personal verification queue for closed reports. Outcomes
              and notes are stored in this browser under the current tester
              email; they do not reopen reports or change server data.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-[10px] font-medium text-slate-500">
              <Info size={12} aria-hidden="true" />
              Local-only records
            </span>
            <button
              type="button"
              onClick={handleExport}
              disabled={!filteredReports.length}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download size={14} aria-hidden="true" />
              Export filtered CSV
            </button>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-violet-100 bg-white/80 px-3.5 py-3 text-[10px] leading-5 text-slate-600">
          CSV exports contain report ID, title, severity, category, report
          status, outcome, and dates. Personal notes and report descriptions are
          intentionally omitted.
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {storageError && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-800"
          >
            <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{storageError}</span>
          </div>
        )}
        {!normalizedEmail && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs leading-5 text-slate-600"
          >
            <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              Search for your reports using your tester email to enable
              email-scoped local retest storage.
            </span>
          </div>
        )}

        <CoverageSummary counts={counts} total={counts.total} />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Closed reports"
            value={counts.total}
            caption="Available for personal retest follow-up"
            icon={FileCheck2}
            tone="violet"
          />
          <MetricCard
            label="Not retested"
            value={counts.pending}
            caption="No outcome recorded yet"
            icon={CircleDashed}
            tone="slate"
          />
          <MetricCard
            label="No longer reproduces"
            value={counts.verified}
            caption="Personal retest indicates clear"
            icon={CheckCircle2}
            tone="emerald"
          />
          <MetricCard
            label="Still reproduces"
            value={counts.reproduces}
            caption="Consider following up with the owner"
            icon={ShieldAlert}
            tone="rose"
          />
          <MetricCard
            label="Retest blocked"
            value={counts.blocked}
            caption="A blocker prevented verification"
            icon={Info}
            tone="amber"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Personal retest completion
                </p>
                <p className="mt-1 text-[10px] leading-4 text-slate-500">
                  Counts any saved outcome, including blocked retests.
                </p>
              </div>
              <span className="text-xl font-semibold text-slate-900 tabular-nums">
                {coveragePercent}%
              </span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="Personal retest completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={coveragePercent}
            >
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width]"
                style={{ width: `${coveragePercent}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] text-slate-500">
              {formatNumber(reviewedCount)} recorded ·{" "}
              {formatNumber(counts.pending)} not retested
            </p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-rose-800">
              <ShieldAlert size={14} aria-hidden="true" />
              Follow-up signal
            </p>
            <p className="mt-1.5 text-[11px] leading-5 text-rose-800/80">
              {counts.reproduces
                ? `${formatNumber(counts.reproduces)} closed ${
                    counts.reproduces === 1 ? "report still" : "reports still"
                  } reproduce in your retest log. This is a reminder for your own follow-up, not a server-side reopen action.`
                : "No still-reproducing outcomes are recorded for the currently loaded closed reports."}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-800">
                Filter the retest queue
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                Filters apply to the list and CSV export.
              </p>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-50"
              >
                <X size={12} aria-hidden="true" />
                Clear filters
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <FilterSelect
              label="Retest outcome"
              value={outcomeFilter}
              onChange={(value) => setFilter(setOutcomeFilter, value)}
              options={OUTCOME_FILTERS}
            />
            <FilterSelect
              label="Severity"
              value={severityFilter}
              onChange={(value) => setFilter(setSeverityFilter, value)}
              options={severityOptions}
            />
            <FilterSelect
              label="Category"
              value={categoryFilter}
              onChange={(value) => setFilter(setCategoryFilter, value)}
              options={categoryOptions}
            />
            <FilterSelect
              label="Sort by"
              value={sortBy}
              onChange={(value) => setFilter(setSortBy, value)}
              options={SORT_OPTIONS}
            />
            <label className="grid gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Search reports
              </span>
              <span className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setFilter(setQuery, event.target.value)}
                  placeholder="Title, ID, category…"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                />
              </span>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
            <span aria-live="polite">
              Showing {formatNumber(filteredReports.length)} of{" "}
              {formatNumber(counts.total)} closed reports
            </span>
            <span className="inline-flex items-center gap-1">
              <ArrowDownWideNarrow size={12} aria-hidden="true" />
              {SORT_OPTIONS.find((option) => option.value === sortBy)?.label}
            </span>
          </div>
        </div>

        {exportError && (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-700"
          >
            {exportError}
          </p>
        )}
        {exportNotice && (
          <p
            role="status"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs text-emerald-800"
          >
            <Check size={14} aria-hidden="true" />
            {exportNotice}
          </p>
        )}

        {filteredReports.length ? (
          <div className="space-y-3">
            {visibleReports.map((report) => {
              const id = getReportId(report);
              return (
                <VerificationReportCard
                  key={id}
                  report={report}
                  review={getReview(reviews, id)}
                  onSetOutcome={handleSetOutcome}
                  onSetNote={handleSetNote}
                  onReset={handleResetReview}
                  onOpenReport={onOpenReport}
                />
              );
            })}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-[10px] text-slate-500">
                {hasMore
                  ? `Showing ${formatNumber(visibleReports.length)} of ${formatNumber(
                      filteredReports.length,
                    )}`
                  : `All ${formatNumber(filteredReports.length)} matching reports are shown`}
              </p>
              <div className="flex items-center gap-2">
                {visibleCount > INITIAL_VISIBLE_REPORTS && (
                  <button
                    type="button"
                    onClick={showLess}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    <ChevronDown size={12} className="rotate-180" aria-hidden="true" />
                    Show fewer
                  </button>
                )}
                {hasMore && (
                  <button
                    type="button"
                    onClick={showMore}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-100"
                  >
                    Show {Math.min(
                      INITIAL_VISIBLE_REPORTS,
                      filteredReports.length - visibleCount,
                    )}{" "}
                    more
                    <ChevronDown size={12} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            hasReports={closedReports.length > 0}
            hasFilters={hasActiveFilters}
            onResetFilters={resetFilters}
          />
        )}

        {!closedReports.length && (
          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[10px] leading-5 text-slate-500">
            <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              Only reports whose server status is <strong>Closed</strong> are
              listed here. Retest outcomes are a separate local annotation and
              never modify that status.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
