"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Download,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

const DAY_MS = 86_400_000;
const COMPARISON_METRICS = [
  { value: "reports", label: "Report count" },
  { value: "open", label: "Open issues" },
  { value: "high", label: "High / critical open" },
  { value: "repeats", label: "Repeat reports" },
];

const SEVERITY_COLORS = {
  critical: "#e11d48",
  high: "#f43f5e",
  medium: "#f59e0b",
  low: "#0ea5e9",
  unspecified: "#94a3b8",
};

function isValidDate(date) {
  return date instanceof Date && Number.isFinite(date.getTime());
}

function normalizeText(value, fallback = "") {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function getCategory(report) {
  return normalizeText(report?.category, "Uncategorized");
}

function getSeverity(report) {
  return normalizeText(report?.severity, "Unspecified");
}

function isOpen(report) {
  return normalizeText(report?.status).toLowerCase() !== "closed";
}

function getDate(report) {
  const value =
    report?.createdAt ||
    report?.created_at ||
    report?.reportedAt ||
    report?.date;
  if (!value) return null;

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const localDate = new Date(year, month - 1, day);
    return localDate.getFullYear() === year &&
      localDate.getMonth() === month - 1 &&
      localDate.getDate() === day
      ? localDate
      : null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getRepeatCount(report) {
  const count = Number(report?.reports);
  return Number.isFinite(count) && count > 0 ? count : 1;
}

function getSearchText(report) {
  return [
    report?._id,
    report?.id,
    report?.title,
    report?.summary,
    report?.description,
    report?.category,
    report?.severity,
    report?.url,
    report?.pageUrl,
  ]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  const result = startOfDay(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function getPeriodWindows(range, today) {
  const length = Number(range);
  if (!Number.isFinite(length) || length <= 0) return null;

  const currentEnd = startOfDay(today);
  const currentStart = addDays(currentEnd, -(length - 1));
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(previousEnd, -(length - 1));
  return { currentStart, currentEnd, previousStart, previousEnd };
}

function isBetween(date, start, end) {
  if (!isValidDate(date)) return false;
  const day = startOfDay(date).getTime();
  return day >= start.getTime() && day <= end.getTime();
}

function matchesBaseFilters(report, status, severity, search) {
  if (status === "open" && !isOpen(report)) return false;
  if (status === "closed" && isOpen(report)) return false;
  if (severity !== "all" && getSeverity(report) !== severity) return false;
  const query = search.trim().toLowerCase();
  return !query || getSearchText(report).includes(query);
}

function getPeriodReports(reports, status, severity, search, start, end) {
  return reports.filter((report) => {
    if (!matchesBaseFilters(report, status, severity, search)) return false;
    return isBetween(getDate(report), start, end);
  });
}

function formatNumber(value, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits,
  }).format(value);
}

function formatDate(date, options = {}) {
  if (!isValidDate(date)) return "Date unavailable";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...options,
  });
}

function formatRange(start, end) {
  return `${formatDate(start)} – ${formatDate(end, { year: "numeric" })}`;
}

function getSeverityRank(value) {
  const severity = value.toLowerCase();
  if (severity === "critical") return 0;
  if (severity === "high") return 1;
  if (severity === "medium") return 2;
  if (severity === "low") return 3;
  return 4;
}

function sortSeverities(values) {
  return [...values].sort(
    (left, right) =>
      getSeverityRank(left) - getSeverityRank(right) ||
      left.localeCompare(right),
  );
}

function createBucket(name) {
  return {
    name,
    reports: 0,
    open: 0,
    closed: 0,
    high: 0,
    repeats: 0,
    submissions: 0,
  };
}

function getCellKey(category, severity) {
  return `${category}\u0000${severity}`;
}

function summarizePeriod(reports) {
  const summary = {
    reports: 0,
    open: 0,
    closed: 0,
    high: 0,
    repeats: 0,
    submissions: 0,
    categories: new Map(),
    severities: new Map(),
    cells: new Map(),
  };

  reports.forEach((report) => {
    const categoryName = getCategory(report);
    const severityName = getSeverity(report);
    const open = isOpen(report);
    const severity = severityName.toLowerCase();
    const repeated = getRepeatCount(report) > 1;

    summary.reports += 1;
    summary.submissions += getRepeatCount(report);
    if (repeated) summary.repeats += 1;
    if (open) summary.open += 1;
    else summary.closed += 1;
    if (open && (severity === "high" || severity === "critical")) {
      summary.high += 1;
    }

    if (!summary.categories.has(categoryName)) {
      summary.categories.set(categoryName, createBucket(categoryName));
    }
    if (!summary.severities.has(severityName)) {
      summary.severities.set(severityName, createBucket(severityName));
    }
    const key = getCellKey(categoryName, severityName);
    if (!summary.cells.has(key)) {
      summary.cells.set(key, {
        category: categoryName,
        severity: severityName,
        ...createBucket(""),
      });
    }

    const category = summary.categories.get(categoryName);
    const severityBucket = summary.severities.get(severityName);
    const cell = summary.cells.get(key);
    [category, severityBucket, cell].forEach((bucket) => {
      bucket.reports += 1;
      bucket.submissions += getRepeatCount(report);
      if (repeated) bucket.repeats += 1;
      if (open) bucket.open += 1;
      else bucket.closed += 1;
      if (open && (severity === "high" || severity === "critical")) {
        bucket.high += 1;
      }
    });
  });

  return summary;
}

function metricValue(bucket, metric) {
  return bucket?.[metric] || 0;
}

function getDelta(current, previous) {
  return current - previous;
}

function getChangeLabel(delta, metric) {
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  const value = formatNumber(Math.abs(delta));
  const unit = metric === "reports" ? "reports" : metric === "repeats" ? "repeat" : "issues";
  return `${sign}${value} ${unit}`;
}

function getDeltaTone(delta, lowerIsBetter = false) {
  if (!delta) return "text-slate-500";
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  return improved ? "text-emerald-700" : "text-rose-700";
}

function getDeltaIcon(delta, lowerIsBetter = false) {
  if (!delta) return Minus;
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  return improved ? ArrowDownRight : ArrowUpRight;
}

function getDeltaDescription(delta, metric) {
  if (!delta) return `${metric} held steady`;
  const direction = delta > 0 ? "increased" : "decreased";
  return `${metric} ${direction} by ${formatNumber(Math.abs(delta))}`;
}

function getPercentChange(current, previous) {
  if (!previous) return current ? null : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function safeCsvCell(value) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function exportComparisonCsv(current, previous, metric, windows) {
  const categories = new Set([
    ...current.categories.keys(),
    ...previous.categories.keys(),
  ]);
  const severities = sortSeverities(
    new Set([...current.severities.keys(), ...previous.severities.keys()]),
  );
  const headers = [
    "Category",
    "Metric",
    "Current period reports",
    "Previous period reports",
    "Report delta",
    "Current open",
    "Previous open",
    "Open delta",
    "Current high/critical open",
    "Previous high/critical open",
    "High/critical delta",
    ...severities.flatMap((severity) => [
      `${severity} current`,
      `${severity} previous`,
      `${severity} delta`,
    ]),
  ];
  const rows = [...categories].sort().map((categoryName) => {
    const currentCategory = current.categories.get(categoryName) || createBucket(categoryName);
    const previousCategory = previous.categories.get(categoryName) || createBucket(categoryName);
    const row = [
      categoryName,
      metric,
      currentCategory.reports,
      previousCategory.reports,
      currentCategory.reports - previousCategory.reports,
      currentCategory.open,
      previousCategory.open,
      currentCategory.open - previousCategory.open,
      currentCategory.high,
      previousCategory.high,
      currentCategory.high - previousCategory.high,
    ];
    severities.forEach((severity) => {
      const currentCell =
        current.cells.get(getCellKey(categoryName, severity)) || createBucket("");
      const previousCell =
        previous.cells.get(getCellKey(categoryName, severity)) || createBucket("");
      row.push(
        metricValue(currentCell, metric),
        metricValue(previousCell, metric),
        metricValue(currentCell, metric) - metricValue(previousCell, metric),
      );
    });
    return row;
  });
  const metadata = [
    ["Current period", formatRange(windows.currentStart, windows.currentEnd)],
    ["Previous period", formatRange(windows.previousStart, windows.previousEnd)],
  ];
  const csv = [...metadata, [], headers, ...rows]
    .map((row) => row.map(safeCsvCell).join(","))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `report-risk-period-comparison-${metric}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SelectMetric({ value, onChange }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Choose comparison metric</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 appearance-none rounded-lg border border-slate-200 bg-white py-1 pl-2.5 pr-7 text-[9px] font-semibold text-slate-600 outline-none hover:border-violet-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      >
        {COMPARISON_METRICS.map((metric) => (
          <option key={metric.value} value={metric.value}>
            {metric.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        aria-hidden="true"
        className="pointer-events-none absolute right-2 text-slate-400"
      />
    </label>
  );
}

function ComparisonStat({ label, current, previous, metric, lowerIsBetter = false }) {
  const delta = current - previous;
  const Icon = getDeltaIcon(delta, lowerIsBetter);
  const deltaLabel = getChangeLabel(delta, metric);
  const percent = getPercentChange(current, previous);

  return (
    <article className="rounded-xl border border-slate-200/80 bg-white p-3">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-xl font-bold tabular-nums text-slate-900">
          {formatNumber(current)}
        </p>
        <span
          className={`inline-flex items-center gap-0.5 text-[9px] font-semibold ${getDeltaTone(
            delta,
            lowerIsBetter,
          )}`}
          aria-label={getDeltaDescription(delta, label)}
        >
          <Icon size={12} aria-hidden="true" />
          {deltaLabel}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[9px] text-slate-400">
        <span>Previous {formatNumber(previous)}</span>
        <span>
          {percent === null
            ? "New this period"
            : `${percent > 0 ? "+" : ""}${formatNumber(percent, 0)}%`}
        </span>
      </div>
    </article>
  );
}

function PeriodHeader({ windows, current, previous }) {
  return (
    <div className="grid gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
      <div>
        <p className="text-[8px] font-bold uppercase tracking-wide text-violet-600">
          Current period
        </p>
        <p className="mt-1 text-[10px] font-semibold text-slate-700">
          {formatRange(windows.currentStart, windows.currentEnd)}
        </p>
        <p className="mt-0.5 text-[8px] text-slate-400">
          {formatNumber(current.reports)} matching reports
        </p>
      </div>
      <span className="hidden h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 sm:grid">
        <ArrowRight size={14} aria-hidden="true" />
      </span>
      <div className="sm:text-right">
        <p className="text-[8px] font-bold uppercase tracking-wide text-slate-500">
          Previous period
        </p>
        <p className="mt-1 text-[10px] font-semibold text-slate-600">
          {formatRange(windows.previousStart, windows.previousEnd)}
        </p>
        <p className="mt-0.5 text-[8px] text-slate-400">
          {formatNumber(previous.reports)} matching reports
        </p>
      </div>
    </div>
  );
}

function getMetricLabel(metric) {
  return (
    COMPARISON_METRICS.find((option) => option.value === metric)?.label ||
    "Report count"
  );
}

function getBiggestCategoryChange(current, previous, metric) {
  const categoryNames = new Set([
    ...current.categories.keys(),
    ...previous.categories.keys(),
  ]);
  return [...categoryNames]
    .map((name) => {
      const currentBucket = current.categories.get(name);
      const previousBucket = previous.categories.get(name);
      const currentValue = metricValue(currentBucket, metric);
      const previousValue = metricValue(previousBucket, metric);
      return {
        name,
        current: currentValue,
        previous: previousValue,
        delta: currentValue - previousValue,
        reports: currentBucket?.reports || 0,
      };
    })
    .sort(
      (left, right) =>
        Math.abs(right.delta) - Math.abs(left.delta) ||
        right.current - left.current ||
        left.name.localeCompare(right.name),
    )[0] || null;
}

function getTopCategoryRows(current, previous, metric) {
  const names = new Set([
    ...current.categories.keys(),
    ...previous.categories.keys(),
  ]);
  const rows = [...names]
    .map((name) => {
      const currentBucket = current.categories.get(name) || createBucket(name);
      const previousBucket = previous.categories.get(name) || createBucket(name);
      const currentValue = metricValue(currentBucket, metric);
      const previousValue = metricValue(previousBucket, metric);
      return {
        name,
        current: currentValue,
        previous: previousValue,
        delta: currentValue - previousValue,
        reports: currentBucket.reports,
        open: currentBucket.open,
        high: currentBucket.high,
        repeats: currentBucket.repeats,
        previousOpen: previousBucket.open,
        previousHigh: previousBucket.high,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  return rows.sort(
    (left, right) =>
      Math.abs(right.delta) - Math.abs(left.delta) ||
      right.current - left.current ||
      left.name.localeCompare(right.name),
  );
}

function CategoryChangeRow({
  row,
  maximum,
  metric,
  onSelectCategory,
  selected,
}) {
  const Icon = getDeltaIcon(row.delta, metric !== "reports");
  const previousWidth = maximum ? (row.previous / maximum) * 100 : 0;
  const currentWidth = maximum ? (row.current / maximum) * 100 : 0;

  return (
    <li
      className={`rounded-lg border px-3 py-2.5 ${
        selected
          ? "border-violet-200 bg-violet-50/50"
          : "border-slate-100 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onSelectCategory(row.name)}
          aria-pressed={selected}
          className="max-w-[65%] truncate text-left text-[10px] font-semibold text-slate-700 underline-offset-2 hover:text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          title={`Focus matrix on ${row.name}`}
        >
          {row.name}
        </button>
        <span className="inline-flex items-center gap-1 text-[9px] text-slate-400">
          {formatNumber(row.current)} current
          <Icon
            size={11}
            aria-hidden="true"
            className={getDeltaTone(row.delta, metric !== "reports")}
          />
          <strong
            className={`font-semibold ${getDeltaTone(
              row.delta,
              metric !== "reports",
            )}`}
          >
            {row.delta > 0 ? "+" : ""}
            {formatNumber(row.delta)}
          </strong>
        </span>
      </div>
      <div className="mt-2 space-y-1">
        <div
          className="h-1 overflow-hidden rounded-full bg-slate-100"
          aria-label={`Previous ${metric} ${formatNumber(row.previous)}`}
        >
          <div
            className="h-full rounded-full bg-slate-300 transition-all"
            style={{ width: `${previousWidth}%` }}
          />
        </div>
        <div
          className="h-1 overflow-hidden rounded-full bg-slate-100"
          aria-label={`Current ${metric} ${formatNumber(row.current)}`}
        >
          <div
            className="h-full rounded-full bg-violet-500 transition-all"
            style={{ width: `${currentWidth}%` }}
          />
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[8px] text-slate-400">
        <span>Previous {formatNumber(row.previous)}</span>
        <span className="inline-flex flex-wrap justify-end gap-x-2">
          <span>
            Open {formatNumber(row.previousOpen)} → {formatNumber(row.open)}
          </span>
          <span>
            High+ {formatNumber(row.previousHigh)} → {formatNumber(row.high)}
          </span>
          <span>Repeats {formatNumber(row.repeats)}</span>
        </span>
      </div>
    </li>
  );
}

function CategoryComparison({
  current,
  previous,
  metric,
  selectedCategory,
  onSelectCategory,
}) {
  const rows = useMemo(
    () => getTopCategoryRows(current, previous, metric),
    [current, metric, previous],
  );
  const [sortMode, setSortMode] = useState("change");
  const visibleRows = useMemo(() => {
    const sorted = [...rows];
    if (sortMode === "current") {
      sorted.sort(
        (left, right) =>
          right.current - left.current ||
          left.name.localeCompare(right.name),
      );
    } else if (sortMode === "open") {
      sorted.sort(
        (left, right) =>
          right.open - left.open ||
          right.high - left.high ||
          left.name.localeCompare(right.name),
      );
    } else if (sortMode === "increasing") {
      sorted.sort(
        (left, right) =>
          right.delta - left.delta ||
          left.name.localeCompare(right.name),
      );
    } else if (sortMode === "decreasing") {
      sorted.sort(
        (left, right) =>
          left.delta - right.delta ||
          left.name.localeCompare(right.name),
      );
    }

    return sorted;
  }, [rows, sortMode]);
  const maximum = Math.max(
    1,
    ...visibleRows.flatMap((row) => [row.current, row.previous]),
  );

  if (!rows.length) {
    return (
      <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-slate-200 px-4 text-center">
        <p className="text-[9px] leading-4 text-slate-500">
          Category changes appear when either period contains matching reports.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3 text-[8px] text-slate-400">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-3 rounded-full bg-slate-300" />
            Previous
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-3 rounded-full bg-violet-500" />
            Current
          </span>
          <span>{formatNumber(visibleRows.length)} categories</span>
        </div>
        <label className="relative inline-flex items-center">
          <span className="sr-only">Sort category comparison</span>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value)}
            className="h-7 appearance-none rounded-md border border-slate-200 bg-white py-1 pl-2 pr-6 text-[8px] font-medium text-slate-600 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          >
            <option value="change">Largest change</option>
            <option value="current">Most current</option>
            <option value="open">Most open</option>
            <option value="increasing">Biggest increase</option>
            <option value="decreasing">Biggest decrease</option>
          </select>
          <ChevronDown
            size={10}
            aria-hidden="true"
            className="pointer-events-none absolute right-1.5 text-slate-400"
          />
        </label>
      </div>
      <ol className="space-y-2">
        {visibleRows.map((row) => (
          <CategoryChangeRow
            key={row.name}
            row={row}
            maximum={maximum}
            metric={metric}
            onSelectCategory={onSelectCategory}
            selected={selectedCategory === row.name}
          />
        ))}
      </ol>
    </div>
  );
}

function SeverityMix({ current, previous }) {
  const severities = sortSeverities(
    new Set([...current.severities.keys(), ...previous.severities.keys()]),
  );

  if (!severities.length) {
    return (
      <div className="grid min-h-28 place-items-center rounded-xl border border-dashed border-slate-200 px-3 text-center text-[9px] text-slate-500">
        Severity mix will appear when reports are available.
      </div>
    );
  }

  const currentTotal = current.reports || 1;
  const previousTotal = previous.reports || 1;
  const hasSelection = Boolean(current.reports || previous.reports);
  const currentHigh =
    (current.severities.get("High")?.reports || 0) +
    (current.severities.get("Critical")?.reports || 0);
  const previousHigh =
    (previous.severities.get("High")?.reports || 0) +
    (previous.severities.get("Critical")?.reports || 0);
  const currentLow =
    current.severities.get("Low")?.reports || 0;
  const previousLow =
    previous.severities.get("Low")?.reports || 0;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-[minmax(70px,0.8fr)_2fr_48px_48px] items-center gap-2 text-[8px] font-semibold uppercase tracking-wide text-slate-400">
        <span>Severity</span>
        <span>Current share</span>
        <span className="text-right">Now</span>
        <span className="text-right">Prev</span>
      </div>
      {severities.map((severity) => {
        const now = current.severities.get(severity);
        const before = previous.severities.get(severity);
        const nowCount = now?.reports || 0;
        const beforeCount = before?.reports || 0;
        const percentage = (nowCount / currentTotal) * 100;
        const color =
          SEVERITY_COLORS[severity.toLowerCase()] || SEVERITY_COLORS.unspecified;

        return (
          <div
            key={severity}
            className="grid grid-cols-[minmax(70px,0.8fr)_2fr_48px_48px] items-center gap-2"
          >
            <span className="truncate text-[9px] font-medium text-slate-600">
              {severity}
            </span>
            <span
              className="h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label={`${severity} share of current period`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(percentage)}
            >
              <span
                className="block h-full rounded-full transition-all"
                style={{ width: `${percentage}%`, backgroundColor: color }}
              />
            </span>
            <span className="text-right text-[9px] font-semibold tabular-nums text-slate-700">
              {formatNumber(nowCount)}
            </span>
            <span className="text-right text-[9px] tabular-nums text-slate-400">
              {formatNumber(beforeCount)}
            </span>
          </div>
        );
      })}
      <p className="pt-1 text-[8px] text-slate-400">
        Previous period contained {formatNumber(previous.reports)} reports.
        Its severity counts are shown for context.
      </p>
      {hasSelection && (
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
          <div className="rounded-lg bg-rose-50/70 px-2 py-1.5">
            <p className="text-[8px] font-medium text-rose-700">
              High / critical
            </p>
            <p className="mt-0.5 text-[9px] font-semibold tabular-nums text-rose-800">
              {formatNumber(previousHigh)} → {formatNumber(currentHigh)}
            </p>
          </div>
          <div className="rounded-lg bg-sky-50/70 px-2 py-1.5">
            <p className="text-[8px] font-medium text-sky-700">Low severity</p>
            <p className="mt-0.5 text-[9px] font-semibold tabular-nums text-sky-800">
              {formatNumber(previousLow)} → {formatNumber(currentLow)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ChangeSummary({ current, previous, metric }) {
  const biggest = useMemo(
    () => getBiggestCategoryChange(current, previous, metric),
    [current, metric, previous],
  );
  const reportDelta = current.reports - previous.reports;
  const openDelta = current.open - previous.open;
  const highDelta = current.high - previous.high;
  const totalCompared = current.reports + previous.reports;

  if (!totalCompared) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-slate-700">
        <Sparkles size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
        <div>
          <p className="text-[10px] font-semibold">Waiting for report data</p>
          <p className="mt-1 text-[9px] leading-4 text-slate-500">
            Submit reports in either period to compare how issue concentration
            changes over time.
          </p>
        </div>
      </div>
    );
  }

  const title =
    reportDelta > 0
      ? "More reports arrived this period"
      : reportDelta < 0
        ? "Report volume is lower this period"
        : "Report volume is unchanged";
  const detail = biggest
    ? `${biggest.name} has the largest ${getMetricLabel(metric).toLowerCase()} movement: ${getChangeLabel(
        biggest.delta,
        metric,
      )}. ${formatNumber(biggest.reports)} matching reports remain in the current window.`
    : "There is not enough category data to identify the largest movement.";
  const Icon = reportDelta > 0 ? TrendingUp : reportDelta < 0 ? TrendingDown : CheckCircle2;

  return (
    <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white p-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-violet-700 shadow-sm">
          <Icon size={14} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-slate-800">{title}</p>
          <p className="mt-1 text-[9px] leading-4 text-slate-500">{detail}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={`rounded-full bg-white px-2 py-1 text-[8px] font-medium ${getDeltaTone(reportDelta, true)}`}>
              Reports {reportDelta > 0 ? "+" : ""}
              {formatNumber(reportDelta)}
            </span>
            <span className={`rounded-full bg-white px-2 py-1 text-[8px] font-medium ${getDeltaTone(openDelta, true)}`}>
              Open {openDelta > 0 ? "+" : ""}
              {formatNumber(openDelta)}
            </span>
            <span className={`rounded-full bg-white px-2 py-1 text-[8px] font-medium ${getDeltaTone(highDelta, true)}`}>
              High / critical {highDelta > 0 ? "+" : ""}
              {formatNumber(highDelta)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyComparison() {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
      <CalendarRange size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-slate-400" />
      <div>
        <p className="text-[10px] font-semibold text-slate-700">
          Period comparison needs a fixed time range
        </p>
        <p className="mt-1 text-[9px] leading-4 text-slate-500">
          Select 7, 30, or 90 days in the risk matrix. The comparison uses the
          same number of days immediately before that window.
        </p>
      </div>
    </div>
  );
}

export default function ReportRiskComparison({
  reports = [],
  range,
  status = "all",
  severity = "all",
  search = "",
  today = new Date(),
  selectedCategory = "",
  onSelectCategory,
}) {
  const [metric, setMetric] = useState("open");
  const validReports = useMemo(
    () =>
      Array.isArray(reports)
        ? reports.filter(
            (report) =>
              report && typeof report === "object" && !Array.isArray(report),
          )
        : [],
    [reports],
  );
  const windows = useMemo(
    () => getPeriodWindows(range, today),
    [range, today],
  );
  const currentReports = useMemo(
    () =>
      windows
        ? getPeriodReports(
            validReports,
            status,
            severity,
            search,
            windows.currentStart,
            windows.currentEnd,
          )
        : [],
    [search, severity, status, validReports, windows],
  );
  const previousReports = useMemo(
    () =>
      windows
        ? getPeriodReports(
            validReports,
            status,
            severity,
            search,
            windows.previousStart,
            windows.previousEnd,
          )
        : [],
    [search, severity, status, validReports, windows],
  );
  const current = useMemo(
    () => summarizePeriod(currentReports),
    [currentReports],
  );
  const previous = useMemo(
    () => summarizePeriod(previousReports),
    [previousReports],
  );
  const volumeDelta = current.reports - previous.reports;

  const exportCsv = () => {
    if (windows) exportComparisonCsv(current, previous, metric, windows);
  };

  if (!windows) {
    return (
      <section
        aria-labelledby="risk-comparison-heading"
        className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4"
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 text-violet-700">
            <CalendarRange size={15} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[8px] font-bold uppercase tracking-wide text-violet-600">
              Period over period
            </p>
            <h3 id="risk-comparison-heading" className="text-xs font-semibold text-slate-800">
              Risk movement
            </h3>
          </div>
        </div>
        <EmptyComparison />
      </section>
    );
  }

  const metricLabel = getMetricLabel(metric);
  const noData = current.reports === 0 && previous.reports === 0;

  return (
    <section
      aria-labelledby="risk-comparison-heading"
      className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-violet-50/60 to-white px-3.5 py-3 sm:px-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-violet-100 bg-white text-violet-700">
            <CalendarRange size={15} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[8px] font-bold uppercase tracking-wide text-violet-600">
              Period over period
            </p>
            <h3 id="risk-comparison-heading" className="text-xs font-semibold text-slate-800">
              Risk movement
            </h3>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SelectMetric value={metric} onChange={setMetric} />
          <button
            type="button"
            onClick={exportCsv}
            disabled={noData}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Download size={12} aria-hidden="true" />
            Export comparison
          </button>
        </div>
      </header>

      <div className="space-y-3 p-3.5 sm:p-4">
        <PeriodHeader windows={windows} current={current} previous={previous} />

        {noData ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-amber-900">
            <CircleAlert size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
            <p className="text-[9px] leading-4">
              No dated reports match the selected status and search filters in
              either period. The current matrix may include undated reports when
              its range is set to all time.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <ComparisonStat
                label="Reports"
                current={current.reports}
                previous={previous.reports}
                metric="reports"
                lowerIsBetter
              />
              <ComparisonStat
                label="Open"
                current={current.open}
                previous={previous.open}
                metric="issues"
                lowerIsBetter
              />
              <ComparisonStat
                label="High / critical open"
                current={current.high}
                previous={previous.high}
                metric="issues"
                lowerIsBetter
              />
              <ComparisonStat
                label="Repeat reports"
                current={current.repeats}
                previous={previous.repeats}
                metric="repeat"
                lowerIsBetter
              />
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
              <section className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-[10px] font-semibold text-slate-800">
                      Category movement
                    </h4>
                    <p className="mt-0.5 text-[8px] text-slate-400">
                      Compare matching category counts across equal windows.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[8px] text-slate-400">
                    <span className="h-1.5 w-3 rounded-full bg-slate-300" />
                    Previous
                    <span className="ml-1 h-1.5 w-3 rounded-full bg-violet-500" />
                    Current
                  </span>
                </div>
                {current.reports || previous.reports ? (
                  <CategoryComparison
                    current={current}
                    previous={previous}
                    metric={metric}
                    selectedCategory={selectedCategory}
                    onSelectCategory={onSelectCategory}
                  />
                ) : (
                  <div className="py-5 text-center text-[9px] text-slate-500">
                    No category movement to show.
                  </div>
                )}
              </section>

              <div className="space-y-3">
                <ChangeSummary
                  current={current}
                  previous={previous}
                  metric={metric}
                />
                <section className="rounded-xl border border-slate-200/80 bg-white p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-[10px] font-semibold text-slate-800">
                        Severity mix
                      </h4>
                      <p className="mt-0.5 text-[8px] text-slate-400">
                        Current share with previous counts for context.
                      </p>
                    </div>
                    <BarChart3
                      size={14}
                      aria-hidden="true"
                      className="text-slate-400"
                    />
                  </div>
                  <SeverityMix current={current} previous={previous} />
                </section>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
              <p className="text-[8px] leading-4 text-slate-400">
                Selected metric: {metricLabel}. Category links focus the matrix
                on that category. Changes reflect report counts, not unique
                issues unless the source data provides one report per issue.
              </p>
              <span
                className={`inline-flex items-center gap-1 text-[8px] font-medium ${getDeltaTone(
                  volumeDelta,
                  true,
                )}`}
              >
                {volumeDelta > 0 ? (
                  <ArrowUpRight size={11} aria-hidden="true" />
                ) : volumeDelta < 0 ? (
                  <ArrowDownRight size={11} aria-hidden="true" />
                ) : (
                  <Minus size={11} aria-hidden="true" />
                )}
                {getDeltaDescription(volumeDelta, "Report volume")}
              </span>
            </div>
          </>
        )}

        <span className="sr-only" aria-live="polite">
          Current period has {formatNumber(current.reports)} reports and{" "}
          {formatNumber(current.open)} open. Previous period had{" "}
          {formatNumber(previous.reports)} reports and{" "}
          {formatNumber(previous.open)} open.
        </span>
      </div>
    </section>
  );
}
