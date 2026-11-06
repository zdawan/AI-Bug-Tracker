"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  CircleDashed,
  Clock3,
  FileSearch,
  Filter,
  Flame,
  Layers3,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import ReportActivityPulse from "./ReportActivityPulse";

const INITIAL_VISIBLE_COUNT = 5;
const LOAD_MORE_COUNT = 5;
const MAX_VISIBLE_COUNT = 30;
const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "Open", label: "Open" },
  { value: "Closed", label: "Resolved" },
];
const SEVERITY_FILTERS = [
  { value: "all", label: "All severity" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

function isValidDate(value) {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function normalizeText(value, fallback = "") {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;
}

function getTitle(report) {
  return normalizeText(
    report?.title || report?.summary,
    "Untitled report",
  );
}

function getId(report) {
  return normalizeText(report?._id || report?.id, getTitle(report));
}

function getStatus(report) {
  return report?.status === "Closed" ? "Closed" : "Open";
}

function getSeverity(report) {
  return normalizeText(report?.severity, "Unspecified");
}

function getCategory(report) {
  return normalizeText(report?.category, "Uncategorized");
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatFullDate(date) {
  if (!isValidDate(date)) return "Date unavailable";

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(date) {
  if (!isValidDate(date)) return "Date unavailable";

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(date) {
  if (!isValidDate(date)) return "Time unavailable";

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getRelativeTime(date, now = Date.now()) {
  if (!isValidDate(date)) return "Date unavailable";

  const difference = Math.max(0, now - date.getTime());
  const minutes = Math.floor(difference / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${formatNumber(minutes)}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${formatNumber(hours)}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${formatNumber(days)}d ago`;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function getDateLabel(date, today = new Date()) {
  if (!isValidDate(date)) return "Date unavailable";

  const dateKey = getLocalDateKey(date);
  const todayKey = getLocalDateKey(today);
  const yesterdayKey = getLocalDateKey(addCalendarDays(today, -1));

  if (dateKey === todayKey) return "Today";
  if (dateKey === yesterdayKey) return "Yesterday";

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getLocalDateKey(date) {
  if (!isValidDate(date)) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addCalendarDays(date, amount) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + amount);
  return result;
}

function getSeverityTheme(severity) {
  if (severity === "High") {
    return {
      label: "High",
      foreground: "text-rose-700",
      background: "bg-rose-50",
      border: "border-rose-200",
      dot: "bg-rose-500",
      icon: ShieldAlert,
    };
  }

  if (severity === "Medium") {
    return {
      label: "Medium",
      foreground: "text-amber-700",
      background: "bg-amber-50",
      border: "border-amber-200",
      dot: "bg-amber-500",
      icon: ShieldAlert,
    };
  }

  if (severity === "Low") {
    return {
      label: "Low",
      foreground: "text-sky-700",
      background: "bg-sky-50",
      border: "border-sky-200",
      dot: "bg-sky-500",
      icon: CircleDashed,
    };
  }

  return {
    label: severity,
    foreground: "text-slate-600",
    background: "bg-slate-50",
    border: "border-slate-200",
    dot: "bg-slate-400",
    icon: CircleDashed,
  };
}

function getStatusTheme(status) {
  return status === "Closed"
    ? {
        label: "Resolved",
        foreground: "text-emerald-700",
        background: "bg-emerald-50",
        border: "border-emerald-200",
        icon: CheckCircle2,
      }
    : {
        label: "Open",
        foreground: "text-violet-700",
        background: "bg-violet-50",
        border: "border-violet-200",
        icon: CircleDashed,
      };
}

function normalizeEntries(entries) {
  if (!Array.isArray(entries)) return [];

  const unique = new Map();
  entries.forEach((entry) => {
    if (!entry?.report || !isValidDate(entry.date)) return;
    const id = getId(entry.report);
    const current = unique.get(id);

    if (!current || current.date.getTime() < entry.date.getTime()) {
      unique.set(id, {
        ...entry,
        id,
        title: getTitle(entry.report),
        status: getStatus(entry.report),
        severity: getSeverity(entry.report),
        category: getCategory(entry.report),
        dateKey: entry.dateKey || getLocalDateKey(entry.date),
      });
    }
  });

  return [...unique.values()].sort(
    (left, right) => right.date.getTime() - left.date.getTime(),
  );
}

function filterEntries(entries, filters) {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return entries.filter((entry) => {
    if (filters.status !== "all" && entry.status !== filters.status) {
      return false;
    }

    if (
      filters.severity !== "all" &&
      entry.severity !== filters.severity
    ) {
      return false;
    }

    if (filters.category !== "all" && entry.category !== filters.category) {
      return false;
    }

    if (!normalizedQuery) return true;

    return [
      entry.title,
      entry.category,
      entry.status,
      entry.severity,
      entry.id,
      entry.report?.description,
    ]
      .filter((value) => typeof value === "string" || typeof value === "number")
      .some((value) => String(value).toLowerCase().includes(normalizedQuery));
  });
}

function getActivitySummary(entries) {
  const summary = {
    total: entries.length,
    open: 0,
    resolved: 0,
    high: 0,
    byDate: new Map(),
  };

  entries.forEach((entry) => {
    summary[entry.status === "Closed" ? "resolved" : "open"] += 1;
    if (entry.severity === "High") summary.high += 1;
    summary.byDate.set(
      entry.dateKey,
      (summary.byDate.get(entry.dateKey) || 0) + 1,
    );
  });

  return summary;
}

function getDayGroups(entries) {
  const groups = new Map();

  entries.forEach((entry) => {
    const group = groups.get(entry.dateKey) || {
      key: entry.dateKey,
      date: entry.date,
      entries: [],
    };
    group.entries.push(entry);
    groups.set(entry.dateKey, group);
  });

  return [...groups.values()];
}

function SelectFilter({ label, value, options, onChange }) {
  return (
    <label className="relative inline-flex">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-[11px] font-medium text-slate-600 outline-none transition hover:border-violet-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
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

function SearchFilter({ value, onChange }) {
  return (
    <label className="relative min-w-0 flex-1 sm:max-w-xs">
      <span className="sr-only">Search recent reports</span>
      <Search
        size={13}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search recent activity"
        className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-[11px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear recent activity search"
          className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={12} aria-hidden="true" />
        </button>
      )}
    </label>
  );
}

function CountBadge({ value, label, tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold ${tone}`}
    >
      <span className="tabular-nums">{formatNumber(value)}</span>
      {label}
    </span>
  );
}

function SpotlightMetric({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/80 bg-white/80 px-2.5 py-2">
      <span className={`grid h-7 w-7 place-items-center rounded-lg ${tone}`}>
        <Icon size={13} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[9px] font-medium text-slate-500">
          {label}
        </span>
        <span className="block text-xs font-semibold text-slate-800 tabular-nums">
          {formatNumber(value)}
        </span>
      </span>
    </div>
  );
}

function LatestReportSpotlight({ entry, summary, onOpenReport, onSelectDate }) {
  const [copyStatus, setCopyStatus] = useState("idle");

  if (!entry) {
    return (
      <div className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-violet-200 bg-white/70 px-4 py-5 text-center">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-500">
          <BellRing size={17} aria-hidden="true" />
        </span>
        <p className="mt-2 text-xs font-semibold text-slate-800">
          No recent report activity
        </p>
        <p className="mt-1 max-w-xs text-[10px] leading-5 text-slate-500">
          Reports with valid dates will appear here as soon as they are loaded.
        </p>
      </div>
    );
  }

  const severity = getSeverityTheme(entry.severity);
  const status = getStatusTheme(entry.status);
  const SeverityIcon = severity.icon;
  const StatusIcon = status.icon;
  const reportId = getId(entry.report);

  const copyReportId = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable in this browser.");
      }

      await navigator.clipboard.writeText(reportId);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  };

  return (
    <article className="relative overflow-hidden rounded-2xl border border-violet-100 bg-white p-3 shadow-sm shadow-violet-900/[0.03] sm:p-4">
      <span className="pointer-events-none absolute -right-7 -top-9 h-24 w-24 rounded-full border border-violet-100 bg-violet-50/60" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 text-white shadow-sm shadow-violet-600/20">
          <Sparkles size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-violet-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500" />
              Latest report
            </span>
            <span className="text-[9px] text-slate-400">
              {getRelativeTime(entry.date)}
            </span>
          </div>
          <h3 className="mt-1.5 break-words text-sm font-semibold leading-5 text-slate-900 sm:text-base">
            {entry.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold ${status.border} ${status.background} ${status.foreground}`}
            >
              <StatusIcon size={10} aria-hidden="true" />
              {status.label}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold ${severity.border} ${severity.background} ${severity.foreground}`}
            >
              <SeverityIcon size={10} aria-hidden="true" />
              {severity.label}
            </span>
            <span className="max-w-40 truncate rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-medium text-slate-600">
              {entry.category}
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] text-slate-500">
              <Clock3 size={10} aria-hidden="true" />
              {formatDateTime(entry.date)}
            </span>
            <button
              type="button"
              onClick={copyReportId}
              aria-label={`Copy report ID ${reportId}`}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              {copyStatus === "copied" ? (
                <Check size={10} aria-hidden="true" />
              ) : (
                <Copy size={10} aria-hidden="true" />
              )}
              {copyStatus === "copied" ? "ID copied" : "Copy ID"}
            </button>
          </div>
          {copyStatus === "error" && (
            <p role="status" className="mt-1 text-[9px] text-rose-600">
              Could not copy the report ID. Check clipboard permissions and try
              again.
            </p>
          )}
        </div>
        <div className="relative flex shrink-0 flex-wrap gap-2 sm:flex-col">
          <button
            type="button"
            onClick={() => onOpenReport?.(entry.report)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 text-[10px] font-semibold text-white shadow-sm transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
          >
            Open report
            <ArrowUpRight size={12} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onSelectDate?.(entry.dateKey)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
          >
            <CalendarDays size={12} aria-hidden="true" />
            View date
          </button>
        </div>
      </div>

      <div className="relative mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
        <SpotlightMetric
          icon={Layers3}
          label="Reports loaded"
          value={summary.total}
          tone="bg-violet-50 text-violet-700"
        />
        <SpotlightMetric
          icon={CircleDashed}
          label="Open"
          value={summary.open}
          tone="bg-amber-50 text-amber-700"
        />
        <SpotlightMetric
          icon={Flame}
          label="High severity"
          value={summary.high}
          tone="bg-rose-50 text-rose-700"
        />
      </div>
    </article>
  );
}

function RecentActivityControls({
  status,
  severity,
  category,
  categories,
  query,
  onStatusChange,
  onSeverityChange,
  onCategoryChange,
  onQueryChange,
  onReset,
  hasFilters,
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-2 sm:flex-row sm:flex-wrap sm:items-center">
      <span className="inline-flex items-center gap-1 px-1 text-[10px] font-semibold text-slate-500">
        <Filter size={12} aria-hidden="true" />
        Recent reports
      </span>
      <div className="flex flex-wrap gap-2">
        <SelectFilter
          label="Filter recent reports by status"
          value={status}
          options={STATUS_FILTERS}
          onChange={onStatusChange}
        />
        <SelectFilter
          label="Filter recent reports by severity"
          value={severity}
          options={SEVERITY_FILTERS}
          onChange={onSeverityChange}
        />
        <SelectFilter
          label="Filter recent reports by category"
          value={category}
          options={[
            { value: "all", label: "All categories" },
            ...categories,
          ]}
          onChange={onCategoryChange}
        />
      </div>
      <SearchFilter value={query} onChange={onQueryChange} />
      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg px-2 text-[10px] font-semibold text-slate-500 transition hover:bg-white hover:text-violet-700"
        >
          <X size={11} aria-hidden="true" />
          Reset
        </button>
      )}
    </div>
  );
}

function ActivityReportCard({ entry, latest, onOpenReport, onSelectDate }) {
  const severity = getSeverityTheme(entry.severity);
  const status = getStatusTheme(entry.status);
  const StatusIcon = status.icon;

  return (
    <article
      className={`group relative rounded-xl border bg-white p-3 transition hover:shadow-sm ${
        latest
          ? "border-violet-200 shadow-sm shadow-violet-900/[0.03]"
          : "border-slate-200/80 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${status.background} ${status.foreground}`}
        >
          <StatusIcon size={14} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-900">
              {entry.title}
            </h4>
            {latest && (
              <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-violet-700">
                Newest
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock3 size={10} aria-hidden="true" />
              {formatTime(entry.date)}
            </span>
            <span className="max-w-32 truncate">{entry.category}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-semibold ${severity.border} ${severity.background} ${severity.foreground}`}
            >
              <span
                className={`h-1 w-1 rounded-full ${severity.dot}`}
                aria-hidden="true"
              />
              {severity.label}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onSelectDate?.(entry.dateKey)}
            aria-label={`View calendar date for ${entry.title}`}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <CalendarDays size={12} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onOpenReport?.(entry.report)}
            aria-label={`Open report: ${entry.title}`}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <ArrowRight size={13} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

function DayGroup({ group, latestId, onOpenReport, onSelectDate }) {
  const openCount = group.entries.filter(
    (entry) => entry.status === "Open",
  ).length;
  const closedCount = group.entries.length - openCount;

  return (
    <section aria-label={`Activity on ${formatFullDate(group.date)}`}>
      <div className="sticky top-0 z-[1] mb-2 flex items-center justify-between gap-2 rounded-lg bg-slate-50/95 px-2 py-1.5 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white text-violet-600 shadow-sm">
            <CalendarDays size={11} aria-hidden="true" />
          </span>
          <h4 className="truncate text-[10px] font-semibold text-slate-700">
            {getDateLabel(group.date)}
          </h4>
          <span className="truncate text-[9px] text-slate-400">
            {formatDateTime(group.date).split(",").slice(1).join(",")}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <CountBadge
            value={openCount}
            label="open"
            tone="border-violet-100 bg-violet-50 text-violet-700"
          />
          <CountBadge
            value={closedCount}
            label="resolved"
            tone="border-emerald-100 bg-emerald-50 text-emerald-700"
          />
        </div>
      </div>

      <div className="space-y-2 pl-2 sm:pl-3">
        {group.entries.map((entry) => (
          <ActivityReportCard
            key={entry.id}
            entry={entry}
            latest={entry.id === latestId}
            onOpenReport={onOpenReport}
            onSelectDate={onSelectDate}
          />
        ))}
      </div>
    </section>
  );
}

function EmptyActivity({ hasFilters, onReset }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-5 py-7 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-50 text-slate-400">
        <FileSearch size={16} aria-hidden="true" />
      </span>
      <h3 className="mt-2 text-xs font-semibold text-slate-800">
        {hasFilters
          ? "No recent reports match"
          : "No report history available"}
      </h3>
      <p className="mt-1 max-w-xs text-[10px] leading-5 text-slate-500">
        {hasFilters
          ? "Try changing the status, severity, or search term."
          : "Reports with valid timestamps will appear in this activity list."}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="mt-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-50"
        >
          <X size={11} aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );
}

function ActivityLoadingPlaceholder() {
  return (
    <div className="space-y-2" aria-label="Loading report activity">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-3 rounded-xl border border-slate-100 bg-white p-3"
        >
          <span className="h-8 w-8 rounded-lg bg-slate-100" />
          <span className="min-w-0 flex-1">
            <span className="block h-3 w-2/3 rounded bg-slate-100" />
            <span className="mt-2 block h-2 w-1/2 rounded bg-slate-100" />
          </span>
          <span className="h-6 w-6 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function ActivityList({
  entries,
  latestId,
  onOpenReport,
  onSelectDate,
  hasFilters,
  onReset,
  visibleCount,
  onShowMore,
  loading,
}) {
  const visibleEntries = entries.slice(0, visibleCount);
  const groups = getDayGroups(visibleEntries);

  if (loading) return <ActivityLoadingPlaceholder />;
  if (!entries.length) {
    return <EmptyActivity hasFilters={hasFilters} onReset={onReset} />;
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <DayGroup
          key={group.key}
          group={group}
          latestId={latestId}
          onOpenReport={onOpenReport}
          onSelectDate={onSelectDate}
        />
      ))}
      {visibleEntries.length < entries.length && (
        <button
          type="button"
          onClick={onShowMore}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
        >
          Show {formatNumber(
            Math.min(LOAD_MORE_COUNT, entries.length - visibleEntries.length),
          )}{" "}
          more recent reports
        </button>
      )}
    </div>
  );
}

function RecentActivityPanel({
  entries,
  latestEntry,
  onOpenReport,
  onSelectDate,
}) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const categories = useMemo(() => {
    const counts = new Map();
    entries.forEach((entry) => {
      counts.set(entry.category, (counts.get(entry.category) || 0) + 1);
    });
    return [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([value, count]) => ({ value, label: `${value} (${formatNumber(count)})` }));
  }, [entries]);

  const filtered = useMemo(
    () => filterEntries(entries, { status, severity, category, query }),
    [entries, status, severity, category, query],
  );
  const hasFilters =
    status !== "all" || severity !== "all" || category !== "all" || Boolean(query.trim());
  const resetFilters = () => {
    setStatus("all");
    setSeverity("all");
    setCategory("all");
    setQuery("");
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };
  const updateStatus = (value) => {
    setStatus(value);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };
  const updateSeverity = (value) => {
    setSeverity(value);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };
  const updateCategory = (value) => {
    setCategory(value);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };
  const updateQuery = (value) => {
    setQuery(value);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-slate-50/70 sm:px-4"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700">
            <Clock3 size={15} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-800">
                Recent report timeline
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                {formatNumber(entries.length)}
              </span>
            </span>
            <span className="mt-0.5 block truncate text-[10px] text-slate-500">
              {latestEntry
                ? `Latest: ${getTitle(latestEntry.report)}`
                : "Browse loaded report activity"}
            </span>
          </span>
        </span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white">
          <ChevronDown
            size={15}
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </span>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/40 p-3 sm:p-4">
          <RecentActivityControls
            status={status}
            severity={severity}
            category={category}
            categories={categories}
            query={query}
            onStatusChange={updateStatus}
            onSeverityChange={updateSeverity}
            onCategoryChange={updateCategory}
            onQueryChange={updateQuery}
            onReset={resetFilters}
            hasFilters={hasFilters}
          />
          <p className="px-1 text-[10px] text-slate-500" aria-live="polite">
            Showing {formatNumber(Math.min(visibleCount, filtered.length))} of {formatNumber(filtered.length)} matching reports, newest first.
          </p>
          <ActivityList
            entries={filtered}
            latestId={latestEntry?.id}
            onOpenReport={onOpenReport}
            onSelectDate={onSelectDate}
            hasFilters={hasFilters}
            onReset={resetFilters}
            visibleCount={visibleCount}
            onShowMore={() =>
              setVisibleCount((current) =>
                Math.min(
                  current + LOAD_MORE_COUNT,
                  MAX_VISIBLE_COUNT,
                  filtered.length,
                ),
              )
            }
          />
        </div>
      )}
    </section>
  );
}

function LatestActivityHeader({
  expanded,
  latestEntry,
  onToggle,
  onOpenLatest,
  onSelectLatestDate,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-violet-700 shadow-sm">
          <BellRing size={15} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-xs font-semibold text-slate-900">
            Latest activity spotlight
          </h2>
          <p className="mt-0.5 truncate text-[10px] text-slate-500">
            {latestEntry
              ? `Most recent report · ${formatFullDate(latestEntry.date)}`
              : "A quick view of your most recent reports"}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
        {latestEntry && (
          <>
            <button
              type="button"
              onClick={() => onOpenLatest?.(latestEntry.report)}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-2.5 text-[10px] font-semibold text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              Open latest
              <ArrowUpRight size={11} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onSelectLatestDate?.(latestEntry.dateKey)}
              aria-label="View latest report date in calendar"
              className="grid h-8 w-8 place-items-center rounded-lg border border-violet-100 bg-white text-violet-700 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <CalendarDays size={13} aria-hidden="true" />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-100 bg-white px-2.5 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          {expanded ? "Hide details" : "Browse activity"}
          <ChevronDown
            size={12}
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}

function ActivitySummary({ summary, latestEntry, onSelectDate }) {
  const activeDates = summary.byDate.size;
  const resolvedPercentage = summary.total
    ? Math.round((summary.resolved / summary.total) * 100)
    : 0;
  const busiestDay = [...summary.byDate.entries()].reduce(
    (current, [key, count]) =>
      count > (current?.count || 0) ? { key, count } : current,
    null,
  );

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl border border-white/80 bg-white/90 p-3">
        <div className="flex items-center gap-2 text-violet-700">
          <Layers3 size={13} aria-hidden="true" />
          <span className="text-[9px] font-semibold">Loaded reports</span>
        </div>
        <p className="mt-2 text-lg font-semibold leading-none text-slate-900 tabular-nums">
          {formatNumber(summary.total)}
        </p>
        <p className="mt-1 text-[9px] text-slate-500">
          Across {formatNumber(activeDates)} active{" "}
          {activeDates === 1 ? "date" : "dates"}
        </p>
      </div>

      <div className="rounded-xl border border-white/80 bg-white/90 p-3">
        <div className="flex items-center gap-2 text-emerald-700">
          <CheckCircle2 size={13} aria-hidden="true" />
          <span className="text-[9px] font-semibold">Resolved reports</span>
        </div>
        <p className="mt-2 text-lg font-semibold leading-none text-slate-900 tabular-nums">
          {formatNumber(summary.resolved)}
        </p>
        <p className="mt-1 text-[9px] text-slate-500">
          {resolvedPercentage}% of loaded activity
        </p>
      </div>

      <button
        type="button"
        disabled={!busiestDay}
        onClick={() => busiestDay && onSelectDate?.(busiestDay.key)}
        className="rounded-xl border border-white/80 bg-white/90 p-3 text-left transition hover:border-violet-100 hover:bg-white disabled:cursor-default"
      >
        <div className="flex items-center gap-2 text-rose-700">
          <Flame size={13} aria-hidden="true" />
          <span className="text-[9px] font-semibold">Busiest recent date</span>
        </div>
        <p className="mt-2 text-lg font-semibold leading-none text-slate-900 tabular-nums">
          {formatNumber(busiestDay?.count || 0)}
        </p>
        <p className="mt-1 truncate text-[9px] text-slate-500">
          {busiestDay
            ? formatFullDate(
                parseDateKey(busiestDay.key) || new Date(),
              )
            : "No activity"}
        </p>
      </button>

      <button
        type="button"
        disabled={!latestEntry}
        onClick={() => latestEntry && onSelectDate?.(latestEntry.dateKey)}
        className="rounded-xl border border-white/80 bg-white/90 p-3 text-left transition hover:border-violet-100 hover:bg-white disabled:cursor-default"
      >
        <div className="flex items-center gap-2 text-violet-700">
          <Clock3 size={13} aria-hidden="true" />
          <span className="text-[9px] font-semibold">Latest report time</span>
        </div>
        <p className="mt-2 truncate text-sm font-semibold leading-none text-slate-900">
          {latestEntry ? formatTime(latestEntry.date) : "—"}
        </p>
        <p className="mt-1 truncate text-[9px] text-slate-500">
          {latestEntry
            ? `${getRelativeTime(latestEntry.date)} · open its date`
            : "No activity"}
        </p>
      </button>
    </div>
  );
}

function parseDateKey(key) {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return null;
  }

  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return getLocalDateKey(date) === key ? date : null;
}

function SpotlightHelp({ expanded, onToggle }) {
  return (
    <div className="rounded-xl border border-violet-100 bg-white/70">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="text-[9px] font-semibold text-slate-600">
          About this activity
        </span>
        <ChevronDown
          size={12}
          className={`text-slate-400 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <p className="border-t border-violet-100 px-3 py-2 text-[9px] leading-5 text-slate-500">
          This spotlight uses the report timestamps already loaded in the
          dashboard and your local timezone. The newest report is selected by
          timestamp; older or undated reports are not included in the timeline.
          Nothing is saved or changed by using these controls.
        </p>
      )}
    </div>
  );
}

function SpotlightEmpty({ onClearFilters, hasFilters }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-violet-200 bg-white/70 px-4 py-5 text-center">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-500">
        <FileSearch size={15} aria-hidden="true" />
      </span>
      <p className="mt-2 text-[10px] font-semibold text-slate-800">
        {hasFilters ? "No reports match the current filters" : "No recent reports"}
      </p>
      <p className="mt-1 max-w-xs text-[9px] leading-4 text-slate-500">
        {hasFilters
          ? "Clear the filters to see the full recent activity timeline."
          : "Try refreshing the dashboard after loading reports."}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[9px] font-semibold text-violet-700 hover:bg-violet-50"
        >
          <X size={10} aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );
}

export default function ReportLatestActivitySpotlight({
  entries = [],
  onOpenReport,
  onSelectDate,
}) {
  const [expanded, setExpanded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const normalizedEntries = useMemo(
    () => normalizeEntries(entries),
    [entries],
  );
  const latestEntry = normalizedEntries[0] || null;
  const summary = useMemo(
    () => getActivitySummary(normalizedEntries),
    [normalizedEntries],
  );

  return (
    <section
      aria-labelledby="latest-activity-spotlight-heading"
      className="overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/50 p-3 sm:p-4"
    >
      <div className="space-y-3">
        <LatestActivityHeader
          expanded={expanded}
          latestEntry={latestEntry}
          onOpenLatest={onOpenReport}
          onSelectLatestDate={onSelectDate}
          onToggle={() => setExpanded((current) => !current)}
        />
        <h2 id="latest-activity-spotlight-heading" className="sr-only">
          Latest activity spotlight
        </h2>
        {expanded && (
          <>
            <LatestReportSpotlight
              entry={latestEntry}
              summary={summary}
              onOpenReport={onOpenReport}
              onSelectDate={onSelectDate}
            />
            <ActivitySummary
              summary={summary}
              latestEntry={latestEntry}
              onSelectDate={onSelectDate}
            />
            <ReportActivityPulse
              entries={normalizedEntries}
              selectedDateKey={latestEntry?.dateKey || ""}
              onSelectDate={onSelectDate}
            />
            {normalizedEntries.length > 0 ? (
              <RecentActivityPanel
                entries={normalizedEntries}
                latestEntry={latestEntry}
                onOpenReport={onOpenReport}
                onSelectDate={onSelectDate}
              />
            ) : (
              <SpotlightEmpty hasFilters={false} />
            )}
            <SpotlightHelp
              expanded={showHelp}
              onToggle={() => setShowHelp((current) => !current)}
            />
            {normalizedEntries.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <p className="text-[9px] leading-4 text-slate-500">
                  The calendar marker and this spotlight refer to the newest
                  available report.
                </p>
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-violet-700">
                  <Check size={10} aria-hidden="true" />
                  Read-only activity
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
