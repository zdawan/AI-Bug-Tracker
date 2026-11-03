"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleAlert,
  ClipboardCheck,
  ExternalLink,
  FileCheck2,
  FileSearch,
  Filter,
  Gauge,
  Info,
  ListChecks,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from "lucide-react";

const CRITERIA = [
  {
    id: "title",
    label: "Clear title",
    description: "A concise title that identifies the affected area.",
    weight: 15,
  },
  {
    id: "description",
    label: "Useful description",
    description: "Enough context to understand what went wrong.",
    weight: 20,
  },
  {
    id: "steps",
    label: "Reproduction steps",
    description: "Numbered steps or a clear steps section.",
    weight: 25,
  },
  {
    id: "outcomes",
    label: "Expected and actual result",
    description: "Both the intended and observed behavior.",
    weight: 25,
  },
  {
    id: "target",
    label: "Affected page",
    description: "A valid web address that helps locate the issue.",
    weight: 15,
  },
];

const COMPLETENESS_FILTERS = [
  { value: "all", label: "All reports" },
  { value: "needs-details", label: "Needs details" },
  { value: "mostly-ready", label: "Mostly ready" },
  { value: "ready", label: "Ready" },
];

const SORT_OPTIONS = [
  { value: "lowest", label: "Lowest readiness" },
  { value: "highest", label: "Highest readiness" },
  { value: "newest", label: "Newest first" },
  { value: "title", label: "Title A–Z" },
];

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getReportId(report) {
  return normalizeText(report?._id || report?.id) || normalizeText(report?.title);
}

function getTitle(report) {
  return normalizeText(report?.title || report?.summary) || "Untitled report";
}

function getDescription(report) {
  return normalizeText(report?.description);
}

function getCategory(report) {
  return normalizeText(report?.category) || "Uncategorized";
}

function getStatus(report) {
  return report?.status === "Closed" ? "Closed" : "Open";
}

function getSeverity(report) {
  return normalizeText(report?.severity) || "Unspecified";
}

function hasUsefulTitle(title) {
  return title.length >= 8 && !/^(bug|issue|problem|error|help|test)[.! ]*$/i.test(title);
}

function hasEnoughDescription(description) {
  const plainText = description.replace(/\s+/g, " ").trim();
  return plainText.length >= 40;
}

function hasReproductionSteps(description) {
  return (
    /^steps to reproduce\s*:?\s*$/im.test(description) ||
    /^\s*\d+[.)]\s+\S+/m.test(description)
  );
}

function hasExpectedBehavior(description) {
  return /^expected behavior\s*:/im.test(description);
}

function hasActualBehavior(description) {
  return /^actual behavior\s*:/im.test(description);
}

function hasValidTarget(report) {
  const candidate = normalizeText(report?.url || report?.pageUrl);
  if (!candidate) return false;

  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function hasScreenshot(report) {
  return Boolean(normalizeText(report?.screenshot || report?.screenshotUrl));
}

function getReportDate(report) {
  const value = report?.createdAt || report?.created_at || report?.reportedAt;
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
  if (!date) return "Date unavailable";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function assessReport(report) {
  const description = getDescription(report);
  const expected = hasExpectedBehavior(description);
  const actual = hasActualBehavior(description);
  const checks = {
    title: hasUsefulTitle(getTitle(report)),
    description: hasEnoughDescription(description),
    steps: hasReproductionSteps(description),
    outcomes: expected && actual,
    target: hasValidTarget(report),
  };
  const score = CRITERIA.reduce(
    (total, criterion) => total + (checks[criterion.id] ? criterion.weight : 0),
    0,
  );
  const missing = CRITERIA.filter((criterion) => !checks[criterion.id]).map(
    (criterion) => ({
      ...criterion,
      hint:
        criterion.id === "outcomes"
          ? [
              expected ? "" : "Add an Expected behavior section.",
              actual ? "" : "Add an Actual behavior section.",
            ]
              .filter(Boolean)
              .join(" ")
          : criterion.id === "steps"
            ? "Add a Steps to reproduce heading or numbered steps."
            : criterion.id === "description"
              ? "Add a little more context to the description."
              : criterion.id === "title"
                ? "Make the title specific to the affected area or behavior."
                : "Add the affected page URL if it is safe to share.",
    }),
  );

  return {
    report,
    score,
    checks,
    missing,
    hasScreenshot: hasScreenshot(report),
    date: getReportDate(report),
    status: getStatus(report),
    severity: getSeverity(report),
    title: getTitle(report),
    category: getCategory(report),
  };
}

function getScoreGroup(score) {
  if (score >= 80) return "ready";
  if (score >= 50) return "mostly-ready";
  return "needs-details";
}

function getScoreTone(score) {
  if (score >= 80) {
    return {
      label: "Ready to review",
      foreground: "text-emerald-700",
      background: "bg-emerald-50",
      border: "border-emerald-200",
      bar: "bg-emerald-500",
      ring: "stroke-emerald-500",
      icon: BadgeCheck,
    };
  }

  if (score >= 50) {
    return {
      label: "Almost there",
      foreground: "text-amber-700",
      background: "bg-amber-50",
      border: "border-amber-200",
      bar: "bg-amber-500",
      ring: "stroke-amber-500",
      icon: CircleAlert,
    };
  }

  return {
    label: "Needs more detail",
    foreground: "text-rose-700",
    background: "bg-rose-50",
    border: "border-rose-200",
    bar: "bg-rose-500",
    ring: "stroke-rose-500",
    icon: CircleAlert,
  };
}

function matchesSearch(item, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [
    item.title,
    item.category,
    item.status,
    item.severity,
    item.report?._id,
    item.report?.id,
    item.report?.description,
  ]
    .filter((value) => typeof value === "string" || typeof value === "number")
    .some((value) => String(value).toLowerCase().includes(normalizedQuery));
}

function matchesCompleteness(item, filter) {
  return filter === "all" || getScoreGroup(item.score) === filter;
}

function sortAssessments(items, sortBy) {
  const sorted = [...items];

  sorted.sort((left, right) => {
    if (sortBy === "highest") {
      return right.score - left.score || left.title.localeCompare(right.title);
    }

    if (sortBy === "newest") {
      return (right.date?.getTime() || 0) - (left.date?.getTime() || 0);
    }

    if (sortBy === "title") {
      return left.title.localeCompare(right.title);
    }

    return left.score - right.score || left.title.localeCompare(right.title);
  });

  return sorted;
}

function calculateOverview(items) {
  if (!items.length) {
    return {
      average: 0,
      ready: 0,
      needsDetails: 0,
      openNeedsDetails: 0,
      screenshotCount: 0,
      passingByCriterion: Object.fromEntries(
        CRITERIA.map((criterion) => [criterion.id, 0]),
      ),
    };
  }

  const passingByCriterion = Object.fromEntries(
    CRITERIA.map((criterion) => [criterion.id, 0]),
  );
  let scoreTotal = 0;
  let ready = 0;
  let needsDetails = 0;
  let openNeedsDetails = 0;
  let screenshotCount = 0;

  items.forEach((item) => {
    scoreTotal += item.score;
    if (item.score >= 80) ready += 1;
    if (item.score < 80) {
      needsDetails += 1;
      if (item.status === "Open") openNeedsDetails += 1;
    }
    if (item.hasScreenshot) screenshotCount += 1;

    Object.entries(item.checks).forEach(([criterion, passed]) => {
      if (passed) passingByCriterion[criterion] += 1;
    });
  });

  return {
    average: Math.round(scoreTotal / items.length),
    ready,
    needsDetails,
    openNeedsDetails,
    screenshotCount,
    passingByCriterion,
  };
}

function ScoreRing({ score, size = 58 }) {
  const tone = getScoreTone(score);
  const circumference = 2 * Math.PI * 22;
  const offset = circumference - (score / 100) * circumference;

  return (
    <span
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      aria-label={`Readiness score ${score}%`}
    >
      <svg
        viewBox="0 0 52 52"
        className="absolute inset-0 h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="26"
          cy="26"
          r="22"
          fill="none"
          strokeWidth="4"
          className="stroke-slate-100"
        />
        <circle
          cx="26"
          cy="26"
          r="22"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${tone.ring} transition-[stroke-dashoffset] duration-500`}
        />
      </svg>
      <span className={`text-xs font-bold tabular-nums ${tone.foreground}`}>
        {score}
      </span>
    </span>
  );
}

function ReadinessProgress({ score }) {
  const tone = getScoreTone(score);

  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-label="Report readiness"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${tone.bar}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

function MetricTile({ label, value, detail, icon: Icon, tone }) {
  return (
    <article className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm shadow-slate-200/20 sm:p-4">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}
      >
        <Icon size={18} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium text-slate-500 sm:text-[11px]">
          {label}
        </p>
        <p className="mt-0.5 text-lg font-semibold leading-5 text-slate-900 tabular-nums">
          {value}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-slate-400">{detail}</p>
      </div>
    </article>
  );
}

function FilterPill({ active, children, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
        active
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : "border-slate-200 bg-white text-slate-500 hover:border-violet-200 hover:text-violet-700"
      }`}
    >
      {children}
      <span
        className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${
          active ? "bg-white/80" : "bg-slate-100"
        }`}
      >
        {formatNumber(count)}
      </span>
    </button>
  );
}

function SelectControl({ label, value, options, onChange }) {
  return (
    <label className="relative inline-flex">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-medium text-slate-600 outline-none transition hover:border-violet-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
    </label>
  );
}

function SearchControl({ value, onChange }) {
  return (
    <label className="relative min-w-0 flex-1 sm:max-w-xs">
      <span className="sr-only">Search report readiness</span>
      <Search
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search reports"
        className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={13} aria-hidden="true" />
        </button>
      )}
    </label>
  );
}

function CheckItem({ criterion, passed, expanded = false }) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${
          passed
            ? "bg-emerald-100 text-emerald-700"
            : "bg-amber-100 text-amber-700"
        }`}
      >
        {passed ? (
          <Check size={10} strokeWidth={3} aria-hidden="true" />
        ) : (
          <Circle size={6} fill="currentColor" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0">
        <span
          className={`block text-xs font-medium ${
            passed ? "text-slate-700" : "text-slate-800"
          }`}
        >
          {criterion.label}
        </span>
        {expanded && (
          <span className="mt-0.5 block text-[11px] leading-5 text-slate-500">
            {passed ? criterion.description : criterion.hint}
          </span>
        )}
      </span>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const classes =
    severity === "High"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : severity === "Medium"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : severity === "Low"
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${classes}`}
    >
      {severity}
    </span>
  );
}

function StatusBadge({ status }) {
  const classes =
    status === "Closed"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-violet-200 bg-violet-50 text-violet-700";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${classes}`}
    >
      {status === "Closed" ? (
        <CheckCircle2 size={10} aria-hidden="true" />
      ) : (
        <Circle size={7} fill="currentColor" aria-hidden="true" />
      )}
      {status === "Closed" ? "Resolved" : "Open"}
    </span>
  );
}

function ReportReadinessCard({
  item,
  expanded,
  onToggle,
  onOpenReport,
}) {
  const tone = getScoreTone(item.score);
  const ToneIcon = tone.icon;

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white transition ${
        expanded
          ? "border-violet-200 shadow-md shadow-violet-900/[0.04]"
          : "border-slate-200/80 hover:border-slate-300"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 p-3 text-left sm:items-center sm:p-4"
      >
        <ScoreRing score={item.score} size={52} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="max-w-full truncate text-sm font-semibold text-slate-900">
              {item.title}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone.background} ${tone.foreground}`}
            >
              <ToneIcon size={10} aria-hidden="true" />
              {tone.label}
            </span>
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="max-w-40 truncate text-[11px] text-slate-500">
              {item.category}
            </span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <StatusBadge status={item.status} />
            <SeverityBadge severity={item.severity} />
          </span>
          <span className="mt-2 block max-w-sm">
            <ReadinessProgress score={item.score} />
          </span>
        </span>
        <span className="hidden shrink-0 text-right sm:block">
          <span className="block text-[10px] font-medium text-slate-400">
            {formatDate(item.date)}
          </span>
          <span className="mt-1 block text-[10px] text-slate-500">
            {item.missing.length
              ? `${item.missing.length} ${item.missing.length === 1 ? "gap" : "gaps"}`
              : "All core details"}
          </span>
        </span>
        <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 sm:mt-0">
          {expanded ? (
            <ChevronDown size={16} className="rotate-180" aria-hidden="true" />
          ) : (
            <ChevronDown size={16} aria-hidden="true" />
          )}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-4 sm:px-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="text-xs font-semibold text-slate-800">
                  Readiness checklist
                </h4>
                <span className="text-[10px] text-slate-500">
                  {item.missing.length
                    ? `${item.missing.length} improvement${item.missing.length === 1 ? "" : "s"}`
                    : "Nothing missing"}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {CRITERIA.map((criterion) => (
                  <CheckItem
                    key={criterion.id}
                    criterion={{
                      ...criterion,
                      hint:
                        item.missing.find(
                          (missing) => missing.id === criterion.id,
                        )?.hint || criterion.description,
                    }}
                    passed={item.checks[criterion.id]}
                    expanded
                  />
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium ${
                    item.hasScreenshot
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {item.hasScreenshot ? (
                    <CheckCircle2 size={12} aria-hidden="true" />
                  ) : (
                    <Info size={12} aria-hidden="true" />
                  )}
                  {item.hasScreenshot
                    ? "Screenshot attached"
                    : "Screenshot optional"}
                </span>
                <span className="text-[10px] text-slate-400">
                  The score is a local guide, not a pass/fail decision.
                </span>
              </div>
            </div>
            <div className="flex items-start lg:justify-end">
              <button
                type="button"
                onClick={() => onOpenReport?.(item.report)}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-semibold text-white shadow-sm shadow-violet-600/20 transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 lg:w-auto"
              >
                Open report
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function CriteriaPerformance({ items, overview }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold text-slate-800">
            Common report gaps
          </h3>
          <p className="mt-1 text-[10px] text-slate-500">
            Which details are most often missing?
          </p>
        </div>
        <ListChecks size={16} className="text-violet-600" aria-hidden="true" />
      </div>

      <div className="space-y-3">
        {CRITERIA.map((criterion) => {
          const present = overview.passingByCriterion[criterion.id] || 0;
          const percentage = items.length
            ? Math.round((present / items.length) * 100)
            : 0;
          const missing = items.length - present;

          return (
            <div key={criterion.id}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="truncate text-[11px] font-medium text-slate-700">
                  {criterion.label}
                </span>
                <span className="shrink-0 text-[10px] tabular-nums text-slate-500">
                  {formatNumber(missing)} missing
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${
                    percentage >= 80
                      ? "bg-emerald-500"
                      : percentage >= 50
                        ? "bg-amber-500"
                        : "bg-rose-500"
                  }`}
                  style={{ width: `${percentage}%` }}
                  role="progressbar"
                  aria-label={`${criterion.label} present in ${percentage}% of reports`}
                  aria-valuenow={percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyResults({ hasFilters, onReset }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-8 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <FileSearch size={20} aria-hidden="true" />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-slate-800">
        {hasFilters ? "No reports match these filters" : "No report data to review"}
      </h3>
      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
        {hasFilters
          ? "Reset the filters to see reports in another readiness group."
          : "Search for reports in your dashboard to see their readiness checklist."}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50"
        >
          <X size={13} aria-hidden="true" />
          Reset filters
        </button>
      )}
    </div>
  );
}

function MethodNote({ expanded, onToggle }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          <Info size={13} className="text-violet-600" aria-hidden="true" />
          How readiness is estimated
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <div className="border-t border-slate-200/70 px-3 py-3 text-[11px] leading-5 text-slate-500">
          <p>
            This browser view checks for a specific title, a description with
            enough context, reproduction steps, expected and actual behavior,
            and an HTTP(S) affected-page URL. It does not change or submit
            reports.
          </p>
          <p className="mt-2">
            Scores are guidance only. A screenshot is shown as optional
            supporting evidence and does not reduce a report&apos;s score when
            absent. Your team may use different reporting standards.
          </p>
        </div>
      )}
    </div>
  );
}

function ReadinessHeader({ reportCount, overview, expanded, onToggle }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-2xl">
        <div className="flex items-center gap-2 text-violet-700">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50">
            <ClipboardCheck size={17} aria-hidden="true" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
            Report quality
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h2
            id="report-readiness-heading"
            className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl"
          >
            Report readiness
          </h2>
          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
            {formatNumber(reportCount)} reports
          </span>
        </div>
        <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
          Find reports that could use a little more detail before they are
          investigated. Scores are advisory and stay in this view.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {!expanded && reportCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2">
            <span className="text-[10px] font-medium text-slate-500">
              Avg. readiness
            </span>
            <span className="text-xs font-bold tabular-nums text-violet-700">
              {overview.average}%
            </span>
            <span className="h-4 w-px bg-slate-200" aria-hidden="true" />
            <span className="text-[10px] font-semibold tabular-nums text-amber-700">
              {formatNumber(overview.needsDetails)} need details
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          {expanded ? "Collapse" : "Review reports"}
          <ChevronDown
            size={14}
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}

function ReadinessOverview({ overview, count }) {
  const averageLabel =
    overview.average >= 80
      ? "Strong report details"
      : overview.average >= 50
        ? "Some details could help"
        : "More context may help";

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <MetricTile
        label="Average readiness"
        value={`${overview.average}%`}
        detail={averageLabel}
        icon={Gauge}
        tone="bg-violet-50 text-violet-700"
      />
      <MetricTile
        label="Ready to review"
        value={formatNumber(overview.ready)}
        detail={`Of ${formatNumber(count)} reports`}
        icon={BadgeCheck}
        tone="bg-emerald-50 text-emerald-700"
      />
      <MetricTile
        label="Open reports with gaps"
        value={formatNumber(overview.openNeedsDetails)}
        detail="Could use follow-up details"
        icon={CircleAlert}
        tone="bg-amber-50 text-amber-700"
      />
      <MetricTile
        label="Screenshots attached"
        value={formatNumber(overview.screenshotCount)}
        detail="Optional visual evidence"
        icon={FileCheck2}
        tone="bg-sky-50 text-sky-700"
      />
    </div>
  );
}

export default function ReportReadinessBoard({
  reports = [],
  onOpenReport,
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [completenessFilter, setCompletenessFilter] = useState("needs-details");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [missingCriterion, setMissingCriterion] = useState("any");
  const [sortBy, setSortBy] = useState("lowest");
  const [showMethod, setShowMethod] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);

  const assessments = useMemo(() => {
    if (!Array.isArray(reports)) return [];

    const seen = new Set();
    return reports
      .map(assessReport)
      .filter((item) => {
        const id = getReportId(item.report);
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
  }, [reports]);

  const overview = useMemo(
    () => calculateOverview(assessments),
    [assessments],
  );

  const filteredAssessments = useMemo(() => {
    const filtered = assessments.filter((item) => {
      if (!matchesCompleteness(item, completenessFilter)) return false;
      if (statusFilter !== "all" && item.status.toLowerCase() !== statusFilter) {
        return false;
      }
      if (
        severityFilter !== "all" &&
        item.severity.toLowerCase() !== severityFilter
      ) {
        return false;
      }
      if (
        missingCriterion !== "any" &&
        item.checks[missingCriterion] !== false
      ) {
        return false;
      }
      return matchesSearch(item, search);
    });

    return sortAssessments(filtered, sortBy);
  }, [
    assessments,
    completenessFilter,
    missingCriterion,
    search,
    severityFilter,
    sortBy,
    statusFilter,
  ]);

  const countByFilter = useMemo(
    () => ({
      all: assessments.length,
      "needs-details": assessments.filter((item) => item.score < 50).length,
      "mostly-ready": assessments.filter(
        (item) => item.score >= 50 && item.score < 80,
      ).length,
      ready: assessments.filter((item) => item.score >= 80).length,
    }),
    [assessments],
  );

  const visibleAssessments = filteredAssessments.slice(0, visibleCount);
  const hasFilters =
    completenessFilter !== "needs-details" ||
    statusFilter !== "all" ||
    severityFilter !== "all" ||
    missingCriterion !== "any" ||
    Boolean(search.trim());

  const resetFilters = () => {
    setCompletenessFilter("needs-details");
    setStatusFilter("all");
    setSeverityFilter("all");
    setMissingCriterion("any");
    setSearch("");
    setSortBy("lowest");
    setVisibleCount(8);
  };

  const selectCompletenessFilter = (value) => {
    setCompletenessFilter(value);
    setVisibleCount(8);
  };

  const applyStatusFilter = (value) => {
    setStatusFilter(value);
    setVisibleCount(8);
  };

  const applySeverityFilter = (value) => {
    setSeverityFilter(value);
    setVisibleCount(8);
  };

  const applySearch = (value) => {
    setSearch(value);
    setVisibleCount(8);
  };

  return (
    <section
      aria-labelledby="report-readiness-heading"
      className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30"
    >
      <div className="border-b border-slate-100 bg-gradient-to-br from-violet-50/70 via-white to-emerald-50/40 p-4 sm:p-5 lg:p-6">
        <ReadinessHeader
          reportCount={assessments.length}
          overview={overview}
          expanded={expanded}
          onToggle={() => setExpanded((current) => !current)}
        />
        {expanded && assessments.length > 0 && (
          <div className="mt-5">
            <ReadinessOverview overview={overview} count={assessments.length} />
          </div>
        )}
      </div>

      {expanded && (
        <div className="space-y-4 p-3 sm:p-5 lg:p-6">
          {assessments.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2">
                {COMPLETENESS_FILTERS.map((filter) => (
                  <FilterPill
                    key={filter.value}
                    active={completenessFilter === filter.value}
                    count={countByFilter[filter.value]}
                    onClick={() => selectCompletenessFilter(filter.value)}
                  >
                    {filter.label}
                  </FilterPill>
                ))}
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.8fr)]">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-2.5 sm:flex-row sm:flex-wrap sm:items-center">
                    <span className="inline-flex items-center gap-1.5 px-1 text-[11px] font-semibold text-slate-500">
                      <Filter size={13} aria-hidden="true" />
                      Refine list
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <SelectControl
                        label="Filter by status"
                        value={statusFilter}
                        options={[
                          { value: "all", label: "All statuses" },
                          { value: "open", label: "Open" },
                          { value: "closed", label: "Resolved" },
                        ]}
                        onChange={applyStatusFilter}
                      />
                      <SelectControl
                        label="Filter by severity"
                        value={severityFilter}
                        options={[
                          { value: "all", label: "All severity" },
                          { value: "high", label: "High" },
                          { value: "medium", label: "Medium" },
                          { value: "low", label: "Low" },
                        ]}
                        onChange={applySeverityFilter}
                      />
                      <SelectControl
                        label="Sort reports"
                        value={sortBy}
                        options={SORT_OPTIONS}
                        onChange={setSortBy}
                      />
                      <SelectControl
                        label="Filter by missing detail"
                        value={missingCriterion}
                        options={[
                          { value: "any", label: "Any missing detail" },
                          ...CRITERIA.map((criterion) => ({
                            value: criterion.id,
                            label: `Missing ${criterion.label.toLowerCase()}`,
                          })),
                        ]}
                        onChange={(value) => {
                          setMissingCriterion(value);
                          setVisibleCount(8);
                        }}
                      />
                    </div>
                    <SearchControl value={search} onChange={applySearch} />
                    {hasFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-slate-500 hover:bg-white hover:text-violet-700"
                      >
                        <X size={13} aria-hidden="true" />
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 px-1">
                    <p className="text-[11px] text-slate-500" aria-live="polite">
                      Showing {formatNumber(visibleAssessments.length)} of{" "}
                      {formatNumber(filteredAssessments.length)} matching reports
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setSortBy((current) =>
                          current === "lowest" ? "highest" : "lowest",
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    >
                      {sortBy === "highest" ? (
                        <ArrowDown size={12} aria-hidden="true" />
                      ) : (
                        <ArrowUp size={12} aria-hidden="true" />
                      )}
                      Score
                    </button>
                  </div>

                  {visibleAssessments.length ? (
                    <div className="space-y-2.5">
                      {visibleAssessments.map((item) => {
                        const reportId = getReportId(item.report);

                        return (
                          <ReportReadinessCard
                            key={reportId}
                            item={item}
                            expanded={selectedId === reportId}
                            onToggle={() =>
                              setSelectedId((current) =>
                                current === reportId ? "" : reportId,
                              )
                            }
                            onOpenReport={onOpenReport}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyResults
                      hasFilters={hasFilters}
                      onReset={resetFilters}
                    />
                  )}

                  {visibleAssessments.length < filteredAssessments.length && (
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleCount((current) =>
                          Math.min(current + 8, filteredAssessments.length),
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                    >
                      Show {formatNumber(
                        Math.min(
                          8,
                          filteredAssessments.length - visibleAssessments.length,
                        ),
                      )}{" "}
                      more reports
                    </button>
                  )}

                  <MethodNote
                    expanded={showMethod}
                    onToggle={() => setShowMethod((current) => !current)}
                  />
                </div>

                <aside className="space-y-3">
                  <CriteriaPerformance
                    items={assessments}
                    overview={overview}
                  />
                  <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white p-4">
                    <div className="flex items-start gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-violet-700 shadow-sm">
                        <Sparkles size={15} aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="text-xs font-semibold text-slate-800">
                          Small details, faster reviews
                        </h3>
                        <p className="mt-1 text-[11px] leading-5 text-slate-500">
                          Prioritize the reports with the most missing context.
                          A clear expected and actual result can help teams
                          reproduce an issue faster.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 border-t border-violet-100 pt-3 text-[10px] font-medium text-violet-700">
                      <ShieldCheck size={13} aria-hidden="true" />
                      Local guidance only; report data is not changed.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
                    <div className="flex items-center gap-2">
                      <Target
                        size={15}
                        className="text-emerald-600"
                        aria-hidden="true"
                      />
                      <h3 className="text-xs font-semibold text-slate-800">
                        Quick focus
                      </h3>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-slate-500">
                      {overview.openNeedsDetails > 0
                        ? `${formatNumber(overview.openNeedsDetails)} open ${
                            overview.openNeedsDetails === 1 ? "report" : "reports"
                          } may benefit from more context.`
                        : "No open reports currently need extra core details."}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCompletenessFilter("needs-details");
                        setStatusFilter("open");
                        setSortBy("lowest");
                        setVisibleCount(8);
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-50"
                    >
                      Review open gaps
                      <ExternalLink size={11} aria-hidden="true" />
                    </button>
                  </div>
                </aside>
              </div>
            </>
          ) : (
            <EmptyResults hasFilters={false} onReset={resetFilters} />
          )}
        </div>
      )}
    </section>
  );
}
