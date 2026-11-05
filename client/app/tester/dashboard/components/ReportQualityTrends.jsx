"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Download,
  FileCheck2,
  Gauge,
  Layers3,
  Minus,
  Sparkles,
  Target,
} from "lucide-react";
import { assessReport, CRITERIA } from "./ReportReadinessBoard";

const RANGE_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

const METRIC_OPTIONS = [
  { value: "average", label: "Average score" },
  { value: "ready-rate", label: "Ready report rate" },
  { value: "volume", label: "Report volume" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Resolved" },
];

const CHART_WIDTH = 720;
const CHART_HEIGHT = 250;
const CHART_PADDING = { top: 24, right: 18, bottom: 42, left: 44 };

function isValidDate(value) {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  const result = startOfDay(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function dateKey(date) {
  if (!isValidDate(date)) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(key) {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return null;
  }

  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return dateKey(date) === key ? date : null;
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

function formatFullDate(date) {
  if (!isValidDate(date)) return "Date unavailable";
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function safeCsvCell(value) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function getReportStatus(item) {
  return item.status === "Closed" ? "closed" : "open";
}

function getPeriodBounds(today, days) {
  const currentStart = addDays(today, -(days - 1));
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(previousEnd, -(days - 1));
  return {
    currentStart,
    currentEnd: today,
    previousStart,
    previousEnd,
  };
}

function isInRange(date, start, end) {
  if (!isValidDate(date)) return false;
  const timestamp = startOfDay(date).getTime();
  return timestamp >= start.getTime() && timestamp <= end.getTime();
}

function getEmptyDailyPoint(date) {
  return {
    date,
    key: dateKey(date),
    count: 0,
    totalScore: 0,
    averageScore: 0,
    readyCount: 0,
    readyRate: 0,
    openCount: 0,
    closedCount: 0,
    criterionPasses: Object.fromEntries(
      CRITERIA.map((criterion) => [criterion.id, 0]),
    ),
  };
}

function createDailySeries(start, end, items) {
  const byDate = new Map();
  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    byDate.set(dateKey(cursor), getEmptyDailyPoint(cursor));
  }

  items.forEach((item) => {
    if (!isValidDate(item.date)) return;
    const point = byDate.get(dateKey(item.date));
    if (!point) return;

    point.count += 1;
    point.totalScore += item.score;
    if (item.score >= 80) point.readyCount += 1;
    if (getReportStatus(item) === "closed") point.closedCount += 1;
    else point.openCount += 1;

    CRITERIA.forEach((criterion) => {
      if (item.checks[criterion.id]) {
        point.criterionPasses[criterion.id] += 1;
      }
    });
  });

  return [...byDate.values()].map((point) => ({
    ...point,
    averageScore: point.count ? point.totalScore / point.count : 0,
    readyRate: point.count ? (point.readyCount / point.count) * 100 : 0,
  }));
}

function summarizeItems(items) {
  const summary = {
    count: items.length,
    totalScore: 0,
    averageScore: 0,
    readyCount: 0,
    readyRate: 0,
    openCount: 0,
    closedCount: 0,
    criterionPasses: Object.fromEntries(
      CRITERIA.map((criterion) => [criterion.id, 0]),
    ),
    categories: new Map(),
  };

  items.forEach((item) => {
    summary.totalScore += item.score;
    if (item.score >= 80) summary.readyCount += 1;
    if (getReportStatus(item) === "closed") summary.closedCount += 1;
    else summary.openCount += 1;

    CRITERIA.forEach((criterion) => {
      if (item.checks[criterion.id]) {
        summary.criterionPasses[criterion.id] += 1;
      }
    });

    const category = item.category || "Uncategorized";
    const bucket = summary.categories.get(category) || {
      category,
      count: 0,
      totalScore: 0,
      readyCount: 0,
      criterionPasses: Object.fromEntries(
        CRITERIA.map((criterion) => [criterion.id, 0]),
      ),
    };
    bucket.count += 1;
    bucket.totalScore += item.score;
    if (item.score >= 80) bucket.readyCount += 1;
    CRITERIA.forEach((criterion) => {
      if (item.checks[criterion.id]) {
        bucket.criterionPasses[criterion.id] += 1;
      }
    });
    summary.categories.set(category, bucket);
  });

  if (summary.count) {
    summary.averageScore = summary.totalScore / summary.count;
    summary.readyRate = (summary.readyCount / summary.count) * 100;
  }

  return summary;
}

function getDailyValue(point, metric) {
  if (metric === "ready-rate") return point.readyRate;
  if (metric === "volume") return point.count;
  return point.averageScore;
}

function getSummaryValue(summary, metric) {
  if (metric === "ready-rate") return summary.readyRate;
  if (metric === "volume") return summary.count;
  return summary.averageScore;
}

function getMetricLabel(metric) {
  return METRIC_OPTIONS.find((option) => option.value === metric)?.label || "";
}

function getDelta(current, previous) {
  const difference = current - previous;
  const percent =
    previous === 0
      ? current > 0
        ? null
        : 0
      : (difference / Math.abs(previous)) * 100;
  return { difference, percent };
}

function formatMetric(value, metric) {
  if (metric === "ready-rate" || metric === "average") {
    return `${formatNumber(value, 1)}%`;
  }
  return formatNumber(value);
}

function getTrendTone(delta) {
  if (delta > 0) return "text-emerald-700";
  if (delta < 0) return "text-rose-700";
  return "text-slate-500";
}

function getTrendIcon(delta) {
  if (delta > 0) return ArrowUpRight;
  if (delta < 0) return ArrowDownRight;
  return Minus;
}

function getInsight(current, previous, metric, weakestCriterion, strongestCategory) {
  if (!current.count) {
    return {
      title: "No reports in this window",
      detail: "Try a longer date range or adjust the status, severity, or category filters.",
      tone: "neutral",
    };
  }

  if (!previous.count) {
    return {
      title: "This is your first measurable window",
      detail: `There are ${formatNumber(current.count)} matching reports in the selected period. A comparison will appear when the previous period has data.`,
      tone: "neutral",
    };
  }

  const delta = getDelta(
    getSummaryValue(current, metric),
    getSummaryValue(previous, metric),
  );
  const direction = delta.difference > 0 ? "increased" : delta.difference < 0 ? "decreased" : "held steady";
  const metricText =
    metric === "volume"
      ? `${formatNumber(Math.abs(delta.difference))} reports`
      : `${formatNumber(Math.abs(delta.difference), 1)} percentage points`;
  const detail = `${getMetricLabel(metric)} ${direction} by ${metricText} compared with the previous period. ${
    weakestCriterion
      ? `${weakestCriterion.label} is the most common improvement opportunity.`
      : "Keep using the report checklist to maintain clear submissions."
  }`;

  return {
    title:
      delta.difference > 0
        ? "The selected metric is moving up"
        : delta.difference < 0
          ? "There is room to improve"
          : "The selected metric is holding steady",
    detail:
      strongestCategory && current.categories.size > 1
        ? `${detail} ${strongestCategory.category} currently has the strongest average score.`
        : detail,
    tone: delta.difference > 0 ? "positive" : delta.difference < 0 ? "caution" : "neutral",
  };
}

function exportDailyCsv(daily, metric) {
  const columns = [
    "Date",
    "Reports",
    "Open",
    "Resolved",
    "Average readiness score",
    "Ready reports",
    "Ready report rate",
    ...CRITERIA.map((criterion) => `${criterion.label} pass rate`),
  ];
  const rows = daily.map((point) => [
    point.key,
    point.count,
    point.openCount,
    point.closedCount,
    point.count ? point.averageScore.toFixed(1) : "",
    point.readyCount,
    point.count ? `${point.readyRate.toFixed(1)}%` : "",
    ...CRITERIA.map((criterion) =>
      point.count
        ? `${((point.criterionPasses[criterion.id] / point.count) * 100).toFixed(1)}%`
        : "",
    ),
  ]);
  const csv = [columns, ...rows]
    .map((row) => row.map(safeCsvCell).join(","))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `report-quality-${metric}-${daily[0]?.key || "period"}-${daily.at(-1)?.key || "period"}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SelectControl({ label, value, options, onChange }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-[11px] font-semibold text-slate-600 outline-none transition hover:border-violet-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 text-slate-400"
      />
    </label>
  );
}

function PanelHeading({ icon: Icon, eyebrow, title, detail, action }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-100 bg-violet-50 text-violet-700">
          <Icon size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-violet-600">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            {detail}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}

function DeltaLabel({ current, previous, metric }) {
  if (!previous) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
        <Minus size={11} aria-hidden="true" />
        No earlier comparison
      </span>
    );
  }

  const delta = getDelta(current, previous);
  const Icon = getTrendIcon(delta.difference);
  const amount =
    metric === "volume"
      ? formatNumber(Math.abs(delta.difference))
      : `${formatNumber(Math.abs(delta.difference), 1)} pp`;
  const sign = delta.difference > 0 ? "+" : delta.difference < 0 ? "−" : "";

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold ${getTrendTone(
        delta.difference,
      )}`}
    >
      <Icon size={12} aria-hidden="true" />
      {sign}
      {amount} vs previous
    </span>
  );
}

function StatCard({ icon: Icon, label, value, hint, current, previous, metric }) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm shadow-slate-100/70 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-50 text-slate-500">
          <Icon size={14} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold leading-none tracking-tight text-slate-950 tabular-nums">
        {value}
      </p>
      <div className="mt-3 flex min-h-4 flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <p className="text-[10px] text-slate-400">{hint}</p>
        {current !== undefined && (
          <DeltaLabel current={current} previous={previous} metric={metric} />
        )}
      </div>
    </article>
  );
}

function ChartEmptyState() {
  return (
    <div className="grid min-h-[250px] place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 text-center">
      <div>
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-400 shadow-sm">
          <BarChart3 size={19} aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-semibold text-slate-700">
          No reports match this period
        </p>
        <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
          Choose a wider date range or change one of the active report filters.
        </p>
      </div>
    </div>
  );
}

function TrendChart({ daily, metric, hasReports }) {
  if (!hasReports) return <ChartEmptyState />;

  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const values = daily.map((point) => getDailyValue(point, metric));
  const maximum = metric === "volume" ? Math.max(...values, 1) : 100;
  const minimum = 0;
  const points = daily.map((point, index) => {
    const x =
      CHART_PADDING.left +
      (daily.length < 2 ? plotWidth / 2 : (index / (daily.length - 1)) * plotWidth);
    const value = getDailyValue(point, metric);
    const y =
      CHART_PADDING.top +
      plotHeight -
      ((value - minimum) / (maximum - minimum || 1)) * plotHeight;
    return { x, y, value, point };
  });
  const linePath = points
    .map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`)
    .join(" ");
  const firstPoint = points[0];
  const lastPoint = points.at(-1);
  const areaPath = `${linePath} L ${lastPoint.x} ${
    CHART_PADDING.top + plotHeight
  } L ${firstPoint.x} ${CHART_PADDING.top + plotHeight} Z`;
  const gridValues =
    metric === "volume"
      ? [0, Math.ceil(maximum / 2), maximum]
      : [0, 50, 100];
  const labelIndexes = new Set([
    0,
    Math.floor((daily.length - 1) / 2),
    daily.length - 1,
  ]);
  const unit = metric === "volume" ? "" : "%";

  return (
    <div className="relative">
      <div className="mb-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-violet-500" />
          {getMetricLabel(metric)}
        </span>
        {metric === "average" && (
          <span className="text-slate-400">
            Score is shown on a 0–100 scale
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label={`${getMetricLabel(metric)} trend over ${daily.length} days`}
          className="h-auto min-w-[560px] w-full"
        >
          <defs>
            <linearGradient id="quality-trend-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {gridValues.map((value) => {
            const y =
              CHART_PADDING.top + plotHeight - (value / maximum) * plotHeight;
            return (
              <g key={value}>
                <line
                  x1={CHART_PADDING.left}
                  x2={CHART_WIDTH - CHART_PADDING.right}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray={value === 0 ? "0" : "3 5"}
                />
                <text
                  x={CHART_PADDING.left - 9}
                  y={y + 3}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="9"
                >
                  {formatNumber(value)}
                  {unit}
                </text>
              </g>
            );
          })}
          <path d={areaPath} fill="url(#quality-trend-fill)" />
          <path
            d={linePath}
            fill="none"
            stroke="#8b5cf6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
          {points.map((point, index) => (
            <g key={point.point.key}>
              <circle
                cx={point.x}
                cy={point.y}
                r={daily.length <= 14 || index === points.length - 1 ? 3.5 : 2}
                fill="#8b5cf6"
                stroke="white"
                strokeWidth="1.5"
              >
                <title>
                  {formatFullDate(point.point.date)}:{" "}
                  {formatMetric(point.value, metric)}
                  {metric === "volume" ? ` from ${point.point.count} reports` : ""}
                </title>
              </circle>
              {labelIndexes.has(index) && (
                <text
                  x={point.x}
                  y={CHART_HEIGHT - 12}
                  textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
                  fill="#64748b"
                  fontSize="9"
                >
                  {formatDate(point.point.date)}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function PeriodComparison({ current, previous, metric }) {
  const currentValue = getSummaryValue(current, metric);
  const previousValue = getSummaryValue(previous, metric);
  const delta = getDelta(currentValue, previousValue);
  const Icon = getTrendIcon(delta.difference);
  const positive = delta.difference > 0;
  const negative = delta.difference < 0;

  return (
    <div className="grid gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
          Current period
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-800 tabular-nums">
          {formatMetric(currentValue, metric)}
          <span className="ml-1.5 text-[10px] font-normal text-slate-400">
            {formatNumber(current.count)} reports
          </span>
        </p>
      </div>
      <div
        className={`flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-2 text-[10px] font-semibold ${
          positive
            ? "border-emerald-100 text-emerald-700"
            : negative
              ? "border-rose-100 text-rose-700"
              : "border-slate-200 text-slate-500"
        }`}
      >
        <Icon size={13} aria-hidden="true" />
        {metric === "volume"
          ? `${delta.difference > 0 ? "+" : ""}${formatNumber(delta.difference)}`
          : `${delta.difference > 0 ? "+" : ""}${formatNumber(delta.difference, 1)} pp`}
      </div>
      <div className="sm:text-right">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
          Previous period
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-600 tabular-nums">
          {formatMetric(previousValue, metric)}
          <span className="ml-1.5 text-[10px] font-normal text-slate-400">
            {formatNumber(previous.count)} reports
          </span>
        </p>
      </div>
    </div>
  );
}

function CriterionBreakdown({ current, previous, selectedCriterion, onSelect }) {
  if (!current.count) {
    return (
      <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-xs text-slate-500">
        Criterion coverage will appear when matching reports have dates in this period.
      </div>
    );
  }

  const rows = CRITERIA.map((criterion) => {
    const count = current.criterionPasses[criterion.id];
    const rate = (count / current.count) * 100;
    const previousRate = previous.count
      ? (previous.criterionPasses[criterion.id] / previous.count) * 100
      : null;
    return { ...criterion, count, rate, previousRate };
  }).sort((left, right) => left.rate - right.rate);

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const selected = row.id === selectedCriterion;
        const difference =
          row.previousRate === null ? null : row.rate - row.previousRate;
        return (
          <button
            key={row.id}
            type="button"
            onClick={() => onSelect(row.id)}
            aria-pressed={selected}
            className={`block w-full rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
              selected
                ? "border-violet-200 bg-violet-50/70"
                : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/60"
            }`}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-semibold text-slate-700">
                  {row.label}
                </span>
                <span className="mt-0.5 block text-[9px] text-slate-400">
                  {formatNumber(row.count)} of {formatNumber(current.count)} reports
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-xs font-bold tabular-nums text-slate-800">
                  {formatNumber(row.rate, 0)}%
                </span>
                {difference !== null ? (
                  <span
                    className={`mt-0.5 block text-[9px] font-medium tabular-nums ${
                      difference > 0
                        ? "text-emerald-700"
                        : difference < 0
                          ? "text-rose-700"
                          : "text-slate-400"
                    }`}
                  >
                    {difference > 0 ? "+" : ""}
                    {formatNumber(difference, 1)} pp
                  </span>
                ) : (
                  <span className="mt-0.5 block text-[9px] text-slate-400">
                    No prior data
                  </span>
                )}
              </span>
            </span>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-100">
              <span
                className={`block h-full rounded-full transition-all ${
                  row.rate >= 80
                    ? "bg-emerald-500"
                    : row.rate >= 50
                      ? "bg-amber-500"
                      : "bg-rose-500"
                }`}
                style={{ width: `${row.rate}%` }}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CategoryBreakdown({ current, selectedCategory, onSelect }) {
  const categories = [...current.categories.values()]
    .map((entry) => ({
      ...entry,
      averageScore: entry.count ? entry.totalScore / entry.count : 0,
      readyRate: entry.count ? (entry.readyCount / entry.count) * 100 : 0,
    }))
    .sort(
      (left, right) =>
        right.averageScore - left.averageScore ||
        right.count - left.count ||
        left.category.localeCompare(right.category),
    )
    .slice(0, 6);

  if (!categories.length) {
    return (
      <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-xs text-slate-500">
        Category scores appear when reports are available for this period.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {categories.map((category, index) => {
        const selected = selectedCategory === category.category;
        return (
          <button
            key={category.category}
            type="button"
            onClick={() =>
              onSelect(selected ? "all" : category.category)
            }
            aria-pressed={selected}
            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
              selected
                ? "border-violet-200 bg-violet-50/70"
                : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/60"
            }`}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-50 text-[10px] font-bold text-slate-500">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-semibold text-slate-700">
                {category.category}
              </span>
              <span className="mt-0.5 block text-[9px] text-slate-400">
                {formatNumber(category.count)} reports ·{" "}
                {formatNumber(category.readyRate, 0)}% ready
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-xs font-bold tabular-nums text-slate-800">
                {formatNumber(category.averageScore, 0)}
              </span>
              <span className="block text-[8px] uppercase tracking-wide text-slate-400">
                avg score
              </span>
            </span>
          </button>
        );
      })}
      <p className="px-1 pt-1 text-[9px] leading-4 text-slate-400">
        Select a category to focus the trend and criterion results. Only the six
        strongest categories are shown here.
      </p>
    </div>
  );
}

function QualityInsight({ insight, weakestCriterion, selectedMetric }) {
  const tone =
    insight.tone === "positive"
      ? "border-emerald-100 bg-emerald-50/70 text-emerald-800"
      : insight.tone === "caution"
        ? "border-amber-100 bg-amber-50/70 text-amber-900"
        : "border-slate-200 bg-slate-50/80 text-slate-700";

  return (
    <aside className={`rounded-xl border p-3.5 ${tone}`}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0">
          {insight.tone === "positive" ? (
            <CheckCircle2 size={16} aria-hidden="true" />
          ) : insight.tone === "caution" ? (
            <CircleAlert size={16} aria-hidden="true" />
          ) : (
            <Sparkles size={16} aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold">{insight.title}</p>
          <p className="mt-1 text-[10px] leading-5 opacity-80">{insight.detail}</p>
          {weakestCriterion && (
            <p className="mt-2 text-[10px] font-semibold">
              Coaching focus: {weakestCriterion.label}
              {selectedMetric === "average" ? " can improve the readiness score." : "."}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

function FilterSummary({ filters }) {
  const active = filters.filter((filter) => filter.value !== "all");

  if (!active.length) {
    return (
      <span className="text-[10px] text-slate-400">
        All report statuses, severities, and categories
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {active.map((filter) => (
        <span
          key={filter.label}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-violet-100 bg-violet-50 px-2 py-1 text-[9px] font-medium text-violet-700"
        >
          <span className="truncate">{filter.label}</span>
        </span>
      ))}
    </div>
  );
}

function EmptyPanel({ hasReports }) {
  return (
    <section className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
      <PanelHeading
        icon={Gauge}
        eyebrow="Patch 5 · Intake quality"
        title="Report quality trends"
        detail="Compare report readiness across time and find the details that most often need improvement."
      />
      <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
        <FileCheck2 size={22} aria-hidden="true" className="mx-auto text-slate-400" />
        <p className="mt-2 text-sm font-semibold text-slate-700">
          {hasReports
            ? "Reports need a usable date for a trend"
            : "Quality trends will appear when reports are available"}
        </p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
          {hasReports
            ? "The available reports do not include a valid submission date, so they cannot be placed in a time window. Add a valid report date to include them in trend comparisons."
            : "The readiness trend uses the same optional report-quality checklist as the readiness board. It does not change report status or require a screenshot."}
        </p>
      </div>
    </section>
  );
}

export default function ReportQualityTrends({ reports = [] }) {
  const [range, setRange] = useState(30);
  const [metric, setMetric] = useState("average");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedCriterion, setSelectedCriterion] = useState("");

  const assessments = useMemo(
    () =>
      (Array.isArray(reports) ? reports : [])
        .map(assessReport)
        .filter((item) => isValidDate(item.date)),
    [reports],
  );
  const today = useMemo(() => startOfDay(new Date()), [reports, range]);
  const bounds = useMemo(() => getPeriodBounds(today, range), [today, range]);

  const severityOptions = useMemo(
    () => [
      { value: "all", label: "All severities" },
      ...Array.from(
        new Set(
          assessments
            .map((item) => item.severity)
            .filter(Boolean),
        ),
      )
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ value, label: value })),
    ],
    [assessments],
  );

  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...Array.from(new Set(assessments.map((item) => item.category)))
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ value, label: value })),
    ],
    [assessments],
  );

  const matchingAssessments = useMemo(
    () =>
      assessments.filter((item) => {
        if (
          statusFilter !== "all" &&
          getReportStatus(item) !== statusFilter
        ) {
          return false;
        }
        if (severityFilter !== "all" && item.severity !== severityFilter) {
          return false;
        }
        if (categoryFilter !== "all" && item.category !== categoryFilter) {
          return false;
        }
        return true;
      }),
    [assessments, categoryFilter, severityFilter, statusFilter],
  );

  const currentItems = useMemo(
    () =>
      matchingAssessments.filter((item) =>
        isInRange(item.date, bounds.currentStart, bounds.currentEnd),
      ),
    [bounds, matchingAssessments],
  );
  const previousItems = useMemo(
    () =>
      matchingAssessments.filter((item) =>
        isInRange(item.date, bounds.previousStart, bounds.previousEnd),
      ),
    [bounds, matchingAssessments],
  );
  const currentSummary = useMemo(() => summarizeItems(currentItems), [currentItems]);
  const previousSummary = useMemo(
    () => summarizeItems(previousItems),
    [previousItems],
  );
  const dailySeries = useMemo(
    () =>
      createDailySeries(
        bounds.currentStart,
        bounds.currentEnd,
        currentItems,
      ),
    [bounds, currentItems],
  );

  const weakestCriterion = useMemo(() => {
    if (!currentSummary.count) return null;
    return CRITERIA.map((criterion) => ({
      ...criterion,
      passRate:
        (currentSummary.criterionPasses[criterion.id] /
          currentSummary.count) *
        100,
    })).sort((left, right) => left.passRate - right.passRate)[0];
  }, [currentSummary]);

  const strongestCategory = useMemo(
    () =>
      [...currentSummary.categories.values()]
        .map((category) => ({
          ...category,
          averageScore: category.totalScore / category.count,
        }))
        .sort(
          (left, right) =>
            right.averageScore - left.averageScore ||
            right.count - left.count,
        )[0] || null,
    [currentSummary],
  );

  const insight = useMemo(
    () =>
      getInsight(
        currentSummary,
        previousSummary,
        metric,
        weakestCriterion,
        strongestCategory,
      ),
    [currentSummary, metric, previousSummary, strongestCategory, weakestCriterion],
  );

  const filterSummary = [
    { label: `Status: ${statusFilter}`, value: statusFilter },
    { label: `Severity: ${severityFilter}`, value: severityFilter },
    { label: `Category: ${categoryFilter}`, value: categoryFilter },
  ];

  const handleExport = () => exportDailyCsv(dailySeries, metric);
  const handleResetFilters = () => {
    setStatusFilter("all");
    setSeverityFilter("all");
    setCategoryFilter("all");
    setSelectedCriterion("");
  };

  if (!assessments.length) {
    return <EmptyPanel hasReports={Array.isArray(reports) && reports.length > 0} />;
  }

  const dateLabel = `${formatDate(bounds.currentStart)} – ${formatDate(
    bounds.currentEnd,
    { year: "numeric" },
  )}`;
  const readyRate = currentSummary.readyRate;
  const hasActiveFilters =
    statusFilter !== "all" ||
    severityFilter !== "all" ||
    categoryFilter !== "all";

  return (
    <section
      aria-labelledby="report-quality-trends-heading"
      className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30"
    >
      <div className="border-b border-slate-100 bg-gradient-to-br from-violet-50/70 via-white to-sky-50/40 p-4 sm:p-5 lg:p-6">
        <PanelHeading
          icon={Gauge}
          eyebrow="Patch 5 · Intake quality"
          title="Report quality trends"
          detail="Compare report readiness over time, see which details are missing most often, and identify categories that are improving."
          action={
            <button
              type="button"
              onClick={handleExport}
              disabled={!dailySeries.some((point) => point.count)}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Download size={13} aria-hidden="true" />
              Export CSV
            </button>
          }
        />
        <h2 id="report-quality-trends-heading" className="sr-only">
          Report quality trends
        </h2>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <SelectControl
            label="Select trend date range"
            value={range}
            options={RANGE_OPTIONS}
            onChange={(value) => setRange(Number(value))}
          />
          <SelectControl
            label="Select chart metric"
            value={metric}
            options={METRIC_OPTIONS}
            onChange={setMetric}
          />
          <SelectControl
            label="Filter trends by status"
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={setStatusFilter}
          />
          <SelectControl
            label="Filter trends by severity"
            value={severityFilter}
            options={severityOptions}
            onChange={setSeverityFilter}
          />
          <SelectControl
            label="Filter trends by category"
            value={categoryFilter}
            options={categoryOptions}
            onChange={setCategoryFilter}
          />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-[10px] font-semibold text-slate-500 transition hover:bg-white hover:text-violet-700"
            >
              Reset filters
            </button>
          )}
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
            <CalendarDays size={13} aria-hidden="true" />
            {dateLabel}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <FilterSummary filters={filterSummary} />
          <span className="text-[10px] text-slate-400">
            {formatNumber(currentSummary.count)} matching reports ·{" "}
            {formatNumber(previousSummary.count)} in previous window
          </span>
        </div>
      </div>

      <div className="space-y-4 p-3 sm:p-5 lg:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={FileCheck2}
            label="Reports"
            value={formatNumber(currentSummary.count)}
            hint="In selected period"
            current={currentSummary.count}
            previous={previousSummary.count}
            metric="volume"
          />
          <StatCard
            icon={Gauge}
            label="Average score"
            value={`${formatNumber(currentSummary.averageScore, 1)}%`}
            hint="Weighted readiness score"
            current={currentSummary.averageScore}
            previous={previousSummary.averageScore}
            metric="average"
          />
          <StatCard
            icon={Target}
            label="Ready reports"
            value={`${formatNumber(readyRate, 1)}%`}
            hint={`${formatNumber(currentSummary.readyCount)} scored 80 or higher`}
            current={readyRate}
            previous={previousSummary.readyRate}
            metric="ready-rate"
          />
          <StatCard
            icon={Layers3}
            label="Open reports"
            value={formatNumber(currentSummary.openCount)}
            hint={`${formatNumber(currentSummary.closedCount)} resolved in period`}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.8fr)]">
          <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-slate-800">
                  Daily readiness trend
                </h3>
                <p className="mt-1 text-[10px] leading-4 text-slate-500">
                  {metric === "volume"
                    ? "Number of matching reports submitted each day."
                    : metric === "ready-rate"
                      ? "Share of reports scoring 80 or above each day."
                      : "Average weighted readiness score for reports submitted each day."}
                </p>
              </div>
              <span className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[9px] font-medium text-slate-500">
                {range}-day view
              </span>
            </div>
            <TrendChart
              daily={dailySeries}
              metric={metric}
              hasReports={currentSummary.count > 0}
            />
            {currentSummary.count > 0 && (
              <div className="mt-3">
                <PeriodComparison
                  current={currentSummary}
                  previous={previousSummary}
                  metric={metric}
                />
              </div>
            )}
          </section>

          <div className="space-y-4">
            <QualityInsight
              insight={insight}
              weakestCriterion={weakestCriterion}
              selectedMetric={metric}
            />
            <section className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold text-slate-800">
                    Detail completion
                  </h3>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Select a row to focus coaching on that detail.
                  </p>
                </div>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-50 text-slate-500">
                  <CheckCircle2 size={14} aria-hidden="true" />
                </span>
              </div>
              <CriterionBreakdown
                current={currentSummary}
                previous={previousSummary}
                selectedCriterion={selectedCriterion}
                onSelect={(criterion) =>
                  setSelectedCriterion((current) =>
                    current === criterion ? "" : criterion,
                  )
                }
              />
              {selectedCriterion && (
                <p className="mt-2 rounded-lg bg-violet-50 px-2.5 py-2 text-[9px] leading-4 text-violet-700">
                  Focus: reports missing{" "}
                  {CRITERIA.find((criterion) => criterion.id === selectedCriterion)?.label.toLowerCase()}.
                  Use the readiness board to review individual submissions.
                </p>
              )}
            </section>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-slate-800">
                Readiness by category
              </h3>
              <p className="mt-1 text-[10px] text-slate-500">
                Compare average scores and focus the panel on a category.
              </p>
            </div>
            <span className="text-[9px] text-slate-400">
              {categoryFilter === "all"
                ? "Top six by average score"
                : `Focused on ${categoryFilter}`}
            </span>
          </div>
          {currentSummary.count ? (
            <CategoryBreakdown
              current={currentSummary}
              selectedCategory={categoryFilter}
              onSelect={setCategoryFilter}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-500">
              No category data matches the selected period and filters.
            </div>
          )}
        </section>

        {!currentSummary.count && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-amber-900"
          >
            <CircleAlert size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
            <p className="text-[10px] leading-5">
              No reports match the current window and filters. Adjust the date
              range or reset the filters to see quality trends.
            </p>
          </div>
        )}

        <p className="px-1 text-[9px] leading-4 text-slate-400">
          Readiness is an advisory checklist, not a judgment of issue validity.
          Dates use local time. Reports without a usable submission date are
          excluded from period comparisons. Screenshot presence is intentionally
          not included in the score.
        </p>
        <span className="sr-only" aria-live="polite">
          Showing {formatNumber(currentSummary.count)} reports with an average
          readiness score of {formatNumber(currentSummary.averageScore, 1)}%.
        </span>
      </div>
    </section>
  );
}
