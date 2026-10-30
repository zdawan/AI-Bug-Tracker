"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock3,
  Layers3,
  ShieldAlert,
  TrendingUp,
  X,
  ChartNoAxesCombined,
  CircleAlert,
  Activity,
  TrendingDown,
  Download,
  ArrowLeftRight,
  CalendarDays,
  Minus,
  Printer,
} from "lucide-react";

const isResolved = (status = "") =>
  ["resolved", "closed", "fixed", "completed"].includes(
    String(status).toLowerCase(),
  );

const isOpen = (status = "") =>
  ![
    "resolved",
    "closed",
    "fixed",
    "completed",
    "rejected",
    "duplicate",
    "cancelled",
    "canceled",
  ].includes(String(status).toLowerCase());

const isHighSeverity = (severity = "") =>
  ["high", "critical", "urgent", "blocker"].includes(
    String(severity).toLowerCase(),
  );

const getDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatCount = (value) => new Intl.NumberFormat("en-IN").format(value);

function getActivityDays(reports, numberOfDays, offsetFromToday = 0) {
  const today = new Date();
  const days = [];

  for (let offset = numberOfDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset - offsetFromToday);

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    days.push({
      key,
      day:
        numberOfDays === 7
          ? date.toLocaleDateString("en-IN", { weekday: "short" })
          : date.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            }),
      count: 0,
    });
  }

  const byDate = new Map(days.map((day) => [day.key, day]));

  reports.forEach((report) => {
    const date = getDate(report.createdAt || report.created_at);
    if (!date) return;

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const day = byDate.get(key);
    if (day) day.count += 1;
  });

  return days;
}

function getPeriodSummary(reports, numberOfDays, offsetFromToday = 0) {
  const days = getActivityDays(reports, numberOfDays, offsetFromToday).map(
    (day) => ({
      ...day,
      submissions: 0,
      highSeverity: 0,
      repeats: 0,
      categories: new Map(),
    }),
  );
  const byDate = new Map(days.map((day) => [day.key, day]));

  reports.forEach((report) => {
    const date = getDate(report.createdAt || report.created_at);
    if (!date) return;

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const day = byDate.get(key);
    if (!day) return;

    const reportCount = Number(report.reports);
    const submissions =
      Number.isFinite(reportCount) && reportCount > 0 ? reportCount : 1;
    day.submissions += submissions;
    day.highSeverity += isHighSeverity(report.severity) ? 1 : 0;
    day.repeats += Math.max(0, submissions - 1);

    const category =
      typeof report.category === "string" && report.category.trim()
        ? report.category.trim()
        : "Uncategorized";
    day.categories.set(category, (day.categories.get(category) || 0) + 1);
  });

  return days.reduce(
    (summary, day) => {
      summary.total += day.count;
      summary.submissions += day.submissions;
      summary.highSeverity += day.highSeverity;
      summary.repeats += day.repeats;
      day.categories.forEach((count, category) => {
        summary.categories.set(
          category,
          (summary.categories.get(category) || 0) + count,
        );
      });
      return summary;
    },
    {
      days,
      total: 0,
      submissions: 0,
      highSeverity: 0,
      repeats: 0,
      categories: new Map(),
    },
  );
}

function getComparisonChange(current, previous) {
  if (current === previous) return { value: 0, percent: 0, direction: "same" };
  if (previous === 0) {
    return {
      value: current,
      percent: null,
      direction: current > 0 ? "up" : "same",
    };
  }

  const value = current - previous;

  return {
    value,
    percent: (value / previous) * 100,
    direction: value > 0 ? "up" : "down",
  };
}

function formatComparisonChange(change) {
  if (change.direction === "same") return "No change";
  if (change.percent === null) return "New this period";

  const sign = change.value > 0 ? "+" : "−";
  return `${sign}${Math.abs(change.value)} (${Math.abs(change.percent).toFixed(0)}%)`;
}

function getCategoryComparison(current, previous) {
  const categoryNames = new Set([
    ...current.categories.keys(),
    ...previous.categories.keys(),
  ]);

  return [...categoryNames]
    .map((name) => {
      const currentCount = current.categories.get(name) || 0;
      const previousCount = previous.categories.get(name) || 0;

      return {
        name,
        current: currentCount,
        previous: previousCount,
        change: getComparisonChange(currentCount, previousCount),
      };
    })
    .sort(
      (left, right) =>
        right.current - left.current ||
        Math.abs(right.change.value) - Math.abs(left.change.value) ||
        left.name.localeCompare(right.name),
    )
    .slice(0, 6);
}

const metricStyles = {
  slate: "bg-slate-100 text-slate-600",
  violet: "bg-violet-100 text-violet-700",
  green: "bg-emerald-100 text-emerald-700",
  rose: "bg-rose-100 text-rose-700",
};

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  tone = "slate",
  featured = false,
}) {
  return (
    <article
      className={`relative min-h-[150px] overflow-hidden rounded-[22px] p-5 transition hover:-translate-y-0.5 ${
        featured
          ? "bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-600/20"
          : "border border-white bg-white text-slate-900 shadow-sm shadow-slate-200/50 hover:shadow-md"
      }`}
    >
      {featured && (
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full border border-white/15 bg-white/[0.06]" />
      )}

      <div className="relative flex items-center justify-between gap-3">
        <h3
          className={`text-xs font-medium ${
            featured ? "text-white/90" : "text-slate-600"
          }`}
        >
          {label}
        </h3>

        <span
          className={`grid h-8 w-8 place-items-center rounded-full ${
            featured
              ? "bg-white text-violet-700"
              : "border border-slate-200 bg-white text-slate-500"
          }`}
        >
          <ArrowUpRight size={16} />
        </span>
      </div>

      <p className="relative mt-4 text-4xl font-semibold tracking-tight tabular-nums">
        {formatCount(value)}
      </p>

      <div className="relative mt-4 flex items-center gap-2">
        <span
          className={`grid h-5 w-5 place-items-center rounded-md ${
            featured ? "border border-white/30 text-white" : metricStyles[tone]
          }`}
        >
          <Icon size={12} />
        </span>

        <p
          className={`text-[11px] ${
            featured ? "text-white/80" : "text-slate-500"
          }`}
        >
          {note}
        </p>
      </div>
    </article>
  );
}

function WeeklyActivityChart({
  data = [],
  previousData = [],
  loading = false,
  days = 7,
  onRangeChange,
  previousTotal = 0,
}) {
  const [comparePrevious, setComparePrevious] = useState(false);
  const comparisonAvailable = previousData.length === data.length;
  const maxCount = Math.max(
    1,
    ...data.map((day, index) =>
      comparePrevious
        ? Math.max(day.count || 0, previousData[index]?.count || 0)
        : day.count || 0,
    ),
  );

  const total = data.reduce((sum, day) => sum + (day.count || 0), 0);
  const activeDays = data.filter((day) => day.count > 0).length;
  const averagePerDay = data.length ? total / data.length : 0;
  const dailyPattern = data.reduce(
    (pattern, day) => {
      const count = day.count || 0;
      if (count > 0) {
        pattern.currentStreak += 1;
        pattern.longestStreak = Math.max(
          pattern.longestStreak,
          pattern.currentStreak,
        );
        if (!pattern.busiestDay || count > pattern.busiestDay.count) {
          pattern.busiestDay = day;
        }
      } else {
        pattern.quietDays += 1;
        pattern.currentStreak = 0;
      }
      return pattern;
    },
    { busiestDay: null, quietDays: 0, currentStreak: 0, longestStreak: 0 },
  );
  const periodChange =
    previousTotal > 0
      ? ((total - previousTotal) / previousTotal) * 100
      : null;
  const [exportError, setExportError] = useState("");
  const [selectedDayKey, setSelectedDayKey] = useState("");
  const selectedDay = data.find(
    (day) => (day.key || day.day) === selectedDayKey,
  );

  const exportActivity = () => {
    let downloadUrl = "";

    try {
      const csvRows = [
        comparisonAvailable && comparePrevious
          ? ["Date", "New reports", "Previous period reports"]
          : ["Date", "New reports"],
        ...data.map((day, index) =>
          comparisonAvailable && comparePrevious
            ? [
                day.key || day.day,
                day.count || 0,
                previousData[index]?.count || 0,
              ]
            : [day.key || day.day, day.count || 0],
        ),
      ];
      const csv = csvRows
        .map((row) =>
          row
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\r\n");
      const blob = new Blob(["\uFEFF", csv], {
        type: "text/csv;charset=utf-8",
      });
      downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `report-activity-${days}d-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      downloadUrl = "";
      setExportError("");
    } catch {
      setExportError("Could not export activity data. Please try again.");
    } finally {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    }
  };

  return (
    <section className="rounded-[22px] border border-white bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Report activity
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            New reports from the last {days} days
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="inline-flex rounded-xl bg-slate-100 p-1"
            role="group"
            aria-label="Activity chart date range"
          >
            {[7, 30].map((range) => (
              <button
                key={range}
                type="button"
                aria-label={`Show activity for the last ${range} days`}
                onClick={() => {
                  setSelectedDayKey("");
                  onRangeChange(range);
                }}
                aria-pressed={days === range}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                  days === range
                    ? "bg-white text-violet-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {range}D
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setComparePrevious((enabled) => !enabled)}
            disabled={!comparisonAvailable || !data.length || loading}
            aria-pressed={comparePrevious}
            aria-label={
              comparePrevious
                ? "Hide previous period comparison"
                : `Compare with the previous ${days}-day period`
            }
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
              comparePrevious
                ? "border-violet-200 bg-violet-50 text-violet-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700"
            }`}
          >
            <Activity size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Compare</span>
          </button>
          <button
            type="button"
            onClick={exportActivity}
            disabled={!data.length || loading}
            aria-label={`Download ${days}-day report activity as CSV`}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={14} aria-hidden="true" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {exportError && (
        <p role="alert" className="mt-3 text-xs text-rose-700">
          {exportError}
        </p>
      )}

      {data.length ? (
      <div
        className={`mt-6 grid gap-2 sm:gap-4 ${
          days === 7 ? "grid-cols-7" : "grid-cols-6 sm:grid-cols-10"
        }`}
        role="group"
        aria-label={`${formatCount(total)} reports across ${activeDays} active days in the last ${days} days.`}
      >
        {data.map((day, index) => {
          const count = day.count || 0;
          const previousCount = previousData[index]?.count || 0;
          const height =
            count > 0 ? Math.max(26, (count / maxCount) * 100) : 8;
          const previousHeight =
            previousCount > 0
              ? Math.max(26, (previousCount / maxCount) * 100)
              : 8;
          const dayKey = day.key || day.day;
          const isSelected = selectedDayKey === dayKey;

          return (
            <button
              key={`${day.key || day.day}-${index}`}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${day.day}: ${count} ${count === 1 ? "report" : "reports"}${comparePrevious ? `, previous period ${previousCount} ${previousCount === 1 ? "report" : "reports"}` : ""}. Select for details.`}
              onClick={() =>
                setSelectedDayKey((current) =>
                  current === dayKey ? "" : dayKey,
                )
              }
              className={`flex min-w-0 flex-col items-center rounded-xl px-1 pb-1 pt-2 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                isSelected ? "bg-violet-50 ring-1 ring-violet-200" : ""
              }`}
            >
              <span className="mb-2 text-[11px] font-semibold tabular-nums text-slate-500">
                {count}
              </span>

              <div className="flex h-32 w-full max-w-12 items-end justify-center rounded-full bg-[#f6f5fa] p-1.5">
                <div className="flex h-full w-full items-end justify-center gap-1">
                  {comparePrevious && (
                    <div
                      className="w-1/2 rounded-full bg-slate-300 transition-all duration-300"
                      style={{ height: `${previousHeight}%` }}
                      title={`Previous period: ${previousCount} reports`}
                    />
                  )}
                  <div
                    className={`relative rounded-full transition-all duration-300 ${
                      comparePrevious ? "w-1/2" : "w-full"
                    } ${
                      count > 0
                        ? "bg-gradient-to-b from-violet-400 to-violet-700"
                        : "bg-slate-200"
                    }`}
                    style={{ height: `${height}%` }}
                    title={`${day.day}: ${count} reports`}
                  >
                    {count > 0 && (
                      <span className="absolute left-1/2 top-2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white" />
                    )}
                  </div>
                </div>
              </div>

              <span className="mt-2 truncate text-[11px] font-medium text-slate-400">
                {day.day}
              </span>
            </button>
          );
        })}
      </div>
      ) : (
        <div className="mt-6 flex h-36 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
          Activity data will appear when reports are available.
        </div>
      )}

      {comparePrevious && data.length > 0 && (
        <div
          className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-600"
          aria-label="Activity chart legend"
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-violet-600" />
            Selected period
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-300" />
            Previous {days} days
          </span>
        </div>
      )}

      {selectedDay && (
        <div
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2.5"
          role="status"
          aria-live="polite"
        >
          <span className="min-w-0 flex-1 text-xs font-medium text-slate-600">
            {selectedDay.key
              ? new Date(`${selectedDay.key}T12:00:00`).toLocaleDateString(
                  "en-IN",
                  { weekday: "long", day: "numeric", month: "long", year: "numeric" },
                )
              : selectedDay.day}
          </span>
          <span className="text-xs font-semibold text-violet-800">
            {formatCount(selectedDay.count || 0)}{" "}
            {(selectedDay.count || 0) === 1 ? "report" : "reports"}
          </span>
          {comparePrevious && (
            <span className="w-full text-right text-[11px] text-slate-500">
              Previous period:{" "}
              {formatCount(
                previousData[data.indexOf(selectedDay)]?.count || 0,
              )}{" "}
              reports
            </span>
          )}
          <button
            type="button"
            onClick={() => setSelectedDayKey("")}
            aria-label="Clear selected activity day"
            className="ml-auto inline-flex h-7 items-center rounded-lg border border-violet-200 bg-white px-2 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            Clear
          </button>
        </div>
      )}

      {data.length > 0 && (
        <div
          className="mt-4 grid gap-2 sm:grid-cols-3"
          aria-label="Activity pattern highlights"
        >
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
            <p className="text-[10px] font-medium text-slate-500">
              Busiest day
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-800">
              {dailyPattern.busiestDay
                ? `${dailyPattern.busiestDay.day} · ${formatCount(
                    dailyPattern.busiestDay.count,
                  )} ${dailyPattern.busiestDay.count === 1 ? "report" : "reports"}`
                : "No reports yet"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
            <p className="text-[10px] font-medium text-slate-500">
              Quiet days
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-800">
              {formatCount(dailyPattern.quietDays)} of {formatCount(data.length)}{" "}
              days with no new reports
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
            <p className="text-[10px] font-medium text-slate-500">
              Longest active streak
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-800">
              {formatCount(dailyPattern.longestStreak)}{" "}
              {dailyPattern.longestStreak === 1 ? "day" : "consecutive days"}
            </p>
          </div>
        </div>
      )}

      {data.length > 0 && (
        <ul className="sr-only" aria-label="Daily report counts">
          {data.map((day, index) => (
            <li key={`${day.key || day.day}-summary-${index}`}>
              {day.day}: {formatCount(day.count || 0)} reports
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <span className="text-slate-400">Daily reports</span>

        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-right">
          <span className="font-medium text-violet-700">
            {loading
              ? "Updating..."
              : `${formatCount(total)} reports · ${activeDays} active days`}
          </span>
          {!loading && (
            <span
              className="text-slate-500"
              aria-label={`${averagePerDay.toFixed(1)} average reports per day`}
            >
              Avg. {averagePerDay.toFixed(1)}/day
            </span>
          )}
        </div>
      </div>
      {periodChange !== null && (
        <p
          className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${
            periodChange > 0
              ? "text-rose-600"
              : periodChange < 0
                ? "text-emerald-600"
                : "text-slate-500"
          }`}
        >
          {periodChange > 0 ? (
            <TrendingUp size={13} />
          ) : periodChange < 0 ? (
            <TrendingDown size={13} />
          ) : null}
          {Math.abs(periodChange).toFixed(0)}% vs previous {days} days
        </p>
      )}
    </section>
  );
}

function formatPeriodRange(days, offsetFromToday = 0) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() - offsetFromToday);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);

  const formatDate = (date) =>
    date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });

  return `${formatDate(start)} – ${formatDate(end)}`;
}

function ComparisonMetricCard({ label, current, previous, note }) {
  const change = getComparisonChange(current, previous);
  const changeStyle =
    change.direction === "up"
      ? "text-violet-700"
      : change.direction === "down"
        ? "text-sky-700"
        : "text-slate-500";
  const ChangeIcon =
    change.direction === "up"
      ? TrendingUp
      : change.direction === "down"
        ? TrendingDown
        : Minus;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-2xl font-semibold tabular-nums text-slate-900">
          {formatCount(current)}
        </span>
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-semibold tabular-nums ${changeStyle}`}
          aria-label={`Change: ${formatComparisonChange(change)}`}
        >
          <ChangeIcon size={12} aria-hidden="true" />
          {formatComparisonChange(change)}
        </span>
      </div>
      <p className="mt-1 text-[10px] text-slate-400">
        Previous period: {formatCount(previous)}
      </p>
      {note && (
        <p className="mt-2 border-t border-slate-100 pt-2 text-[10px] leading-4 text-slate-500">
          {note}
        </p>
      )}
    </article>
  );
}

function DailyComparisonRow({ currentDay, previousDay, maximum }) {
  const currentCount = currentDay?.count || 0;
  const previousCount = previousDay?.count || 0;
  const currentWidth = maximum ? (currentCount / maximum) * 100 : 0;
  const previousWidth = maximum ? (previousCount / maximum) * 100 : 0;

  return (
    <div className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 py-2">
      <span className="text-[10px] font-medium text-slate-500">
        {currentDay?.day || "—"}
      </span>
      <div className="space-y-1.5" aria-hidden="true">
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-violet-600 transition-all"
            style={{ width: `${currentWidth}%` }}
          />
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-300 transition-all"
            style={{ width: `${previousWidth}%` }}
          />
        </div>
      </div>
      <span className="min-w-[58px] text-right text-[10px] tabular-nums text-slate-600">
        {formatCount(currentCount)} / {formatCount(previousCount)}
      </span>
    </div>
  );
}

function PeriodComparisonPanel({ reports, days, loading }) {
  const [exportError, setExportError] = useState("");
  const current = useMemo(
    () => getPeriodSummary(reports, days),
    [reports, days],
  );
  const previous = useMemo(
    () => getPeriodSummary(reports, days, days),
    [reports, days],
  );
  const categories = useMemo(
    () => getCategoryComparison(current, previous),
    [current, previous],
  );
  const dailyMaximum = Math.max(
    1,
    ...current.days.map((day, index) =>
      Math.max(day.count, previous.days[index]?.count || 0),
    ),
  );
  const periodLabel = `${days}-day period`;

  const exportComparison = () => {
    let downloadUrl = "";

    try {
      const rows = [
        ["Metric", "Current period", "Previous period", "Change"],
        [
          "New issues",
          current.total,
          previous.total,
          formatComparisonChange(
            getComparisonChange(current.total, previous.total),
          ),
        ],
        [
          "Total submissions",
          current.submissions,
          previous.submissions,
          formatComparisonChange(
            getComparisonChange(current.submissions, previous.submissions),
          ),
        ],
        [
          "High severity issues",
          current.highSeverity,
          previous.highSeverity,
          formatComparisonChange(
            getComparisonChange(current.highSeverity, previous.highSeverity),
          ),
        ],
        [
          "Repeat submissions",
          current.repeats,
          previous.repeats,
          formatComparisonChange(
            getComparisonChange(current.repeats, previous.repeats),
          ),
        ],
        [],
        ["Category", "Current period", "Previous period", "Change"],
        ...categories.map((category) => [
          category.name,
          category.current,
          category.previous,
          formatComparisonChange(category.change),
        ]),
        [],
        ["Date", "Current period issues", "Previous period issues"],
        ...current.days.map((day, index) => [
          day.key,
          day.count,
          previous.days[index]?.count || 0,
        ]),
      ];
      const csv = rows
        .map((row) =>
          row
            .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\r\n");
      const blob = new Blob(["\uFEFF", csv], {
        type: "text/csv;charset=utf-8",
      });
      downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `analytics-comparison-${days}d-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      downloadUrl = "";
      setExportError("");
    } catch {
      setExportError("Could not export period comparison. Please try again.");
    } finally {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    }
  };

  return (
    <section
      className="mt-4 rounded-[22px] border border-violet-100 bg-gradient-to-br from-violet-50/60 via-white to-slate-50 p-4 shadow-sm shadow-violet-900/[0.03] sm:p-5"
      aria-labelledby="period-comparison-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-100 text-violet-700">
              <ArrowLeftRight size={15} aria-hidden="true" />
            </span>
            <h3
              id="period-comparison-heading"
              className="text-sm font-semibold text-slate-900"
            >
              Period comparison
            </h3>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            Compare newly created reports in the current {periodLabel} with the
            immediately preceding period. Severity and categories reflect their
            current report values.
          </p>
          <p className="mt-1 text-[10px] leading-4 text-slate-400">
            A higher count is not always better; review the metric context.
          </p>
        </div>
        <button
          type="button"
          onClick={exportComparison}
          disabled={loading}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download size={14} aria-hidden="true" />
          Export comparison
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={12} aria-hidden="true" />
          Current: {formatPeriodRange(days)}
        </span>
        <span>Previous: {formatPeriodRange(days, days)}</span>
        {loading && <span className="font-medium text-violet-700">Updating…</span>}
      </div>

      {exportError && (
        <p role="alert" className="mt-3 text-xs text-rose-700">
          {exportError}
        </p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <ComparisonMetricCard
          label="New issues"
          current={current.total}
          previous={previous.total}
          note="Unique reports created in each period"
        />
        <ComparisonMetricCard
          label="Total submissions"
          current={current.submissions}
          previous={previous.submissions}
          note="Includes repeat submissions recorded on each issue"
        />
        <ComparisonMetricCard
          label="High severity"
          current={current.highSeverity}
          previous={previous.highSeverity}
          note="Current severity for issues created in each period"
        />
        <ComparisonMetricCard
          label="Repeat submissions"
          current={current.repeats}
          previous={previous.repeats}
          note="Submissions beyond the first report per issue"
        />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="text-xs font-semibold text-slate-800">
                Daily issue volume
              </h4>
              <p className="mt-1 text-[10px] text-slate-500">
                Current and previous period, aligned by day
              </p>
            </div>
            <span className="text-[10px] tabular-nums text-slate-500">
              Current / previous
            </span>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {current.days.map((day, index) => (
              <DailyComparisonRow
                key={day.key}
                currentDay={day}
                previousDay={previous.days[index]}
                maximum={dailyMaximum}
              />
            ))}
          </div>
          <div
            className="mt-3 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-[10px] text-slate-500"
            aria-label="Daily comparison legend"
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-violet-600" />
              Current
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-300" />
              Previous
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <div>
            <h4 className="text-xs font-semibold text-slate-800">
              Category movement
            </h4>
            <p className="mt-1 text-[10px] text-slate-500">
              Categories with the most issues across either period
            </p>
          </div>
          {categories.length ? (
            <div className="mt-3">
              <div className="grid grid-cols-[minmax(0,1fr)_54px_54px_90px] gap-2 border-b border-slate-100 pb-2 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                <span>Category</span>
                <span className="text-right">Current</span>
                <span className="text-right">Previous</span>
                <span className="text-right">Change</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {categories.map((category) => (
                  <li
                    key={category.name}
                    className="grid grid-cols-[minmax(0,1fr)_54px_54px_90px] items-center gap-2 py-2"
                  >
                    <span
                      className="truncate text-[10px] font-medium text-slate-700"
                      title={category.name}
                    >
                      {category.name}
                    </span>
                    <span className="text-right text-[10px] tabular-nums text-slate-700">
                      {formatCount(category.current)}
                    </span>
                    <span className="text-right text-[10px] tabular-nums text-slate-500">
                      {formatCount(category.previous)}
                    </span>
                    <span
                      className={`truncate text-right text-[9px] font-semibold ${
                        category.change.direction === "up"
                          ? "text-violet-700"
                          : category.change.direction === "down"
                            ? "text-sky-700"
                            : "text-slate-400"
                      }`}
                    >
                      {formatComparisonChange(category.change)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-[10px] text-slate-500">
              Category comparisons appear when reports have category data.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}

function LegacyMetricCard({
  title,
  value,
  note,
  icon: Icon,
  tone = "slate",
  featured = false,
}) {
  return (
    <article
      className={`relative min-h-[150px] overflow-hidden rounded-[22px] p-5 transition hover:-translate-y-0.5 ${
        featured
          ? "bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-600/20"
          : "border border-white bg-white text-slate-900 shadow-sm shadow-slate-200/50 hover:shadow-md"
      }`}
    >
      {featured && (
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border border-white/15 bg-white/[0.06]" />
      )}

      <div className="relative flex items-center justify-between gap-3">
        <h3
          className={`text-xs font-medium ${
            featured ? "text-white/90" : "text-slate-600"
          }`}
        >
          {title}
        </h3>

        <span
          className={`grid h-8 w-8 place-items-center rounded-full ${
            featured
              ? "bg-white text-violet-700"
              : "border border-slate-200 bg-white text-slate-500"
          }`}
        >
          <ArrowUpRight size={16} />
        </span>
      </div>

      <p className="relative mt-4 text-4xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>

      <div className="relative mt-4 flex items-center gap-2">
        <span
          className={`grid h-5 w-5 place-items-center rounded-md ${
            featured ? "border border-white/30 text-white" : metricStyles[tone]
          }`}
        >
          <Icon size={12} />
        </span>

        <p
          className={`text-[11px] ${
            featured ? "text-white/80" : "text-slate-500"
          }`}
        >
          {note}
        </p>
      </div>
    </article>
  );
}

function LegacyWeeklyActivityChart({ data = [] }) {
  const maxCount = Math.max(1, ...data.map((day) => day.count));

  return (
    <section className="rounded-[22px] border border-white bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">
          Report activity
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Reports submitted during the last seven days
        </p>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-2 sm:gap-4">
        {data.map((day, index) => {
          const height =
            day.count > 0 ? Math.max(26, (day.count / maxCount) * 100) : 8;

          return (
            <div
              key={`${day.day}-${index}`}
              className="flex min-w-0 flex-col items-center"
            >
              <span className="mb-2 text-[11px] font-semibold text-slate-500">
                {day.count}
              </span>

              <div className="flex h-32 w-full max-w-12 items-end justify-center rounded-full bg-violet-50/60 p-1.5">
                <div
                  className={`relative w-full rounded-full ${
                    day.count > 0
                      ? "bg-gradient-to-b from-violet-400 to-violet-700"
                      : "bg-slate-200"
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${day.day}: ${day.count} reports`}
                >
                  {day.count > 0 && (
                    <span className="absolute left-1/2 top-2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white" />
                  )}
                </div>
              </div>

              <span className="mt-2 text-[11px] font-medium text-slate-400">
                {day.day}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ResolutionChart({ total, resolved }) {
  const rate = total ? Math.round((resolved / total) * 100) : 0;

  return (
    <section className="rounded-[22px] border border-white bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Resolution overview
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Progress across submitted reports
          </p>
        </div>

        <ChartNoAxesCombined size={17} className="text-slate-400" />
      </div>

      <div className="mt-6 flex justify-center">
        <div
          className="grid h-40 w-40 place-items-center rounded-full"
          role="img"
          aria-label={`Resolution overview: ${rate}% resolved, ${resolved} of ${total} reports.`}
          style={{
            background: `conic-gradient(#7c3aed ${rate * 3.6}deg, #ede9fe 0deg)`,
          }}
        >
          <div className="grid h-28 w-28 content-center justify-items-center rounded-full bg-white">
            <span className="text-3xl font-semibold tabular-nums text-slate-900">
              {rate}%
            </span>

            <span className="mt-1 text-[10px] text-slate-500">Resolved</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-4 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-violet-600" />
          Resolved ({resolved})
        </span>

        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-violet-100" />
          Remaining ({Math.max(0, total - resolved)})
        </span>
      </div>
    </section>
  );
}
function NotificationWidget({
  notifications = [],
  onDismiss,
  onViewAll,
  onViewReport,
}) {
  const [expanded, setExpanded] = useState(false);

  const visibleNotifications = expanded
    ? notifications
    : notifications.slice(0, 3);

  return (
    <section className="rounded-[22px] border border-white bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Notifications
          </h2>
          <p className="mt-1 text-xs text-slate-500">Recent report updates</p>
        </div>

        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
          {notifications.length} updates
        </span>
      </div>

      <div className="mt-4 divide-y divide-slate-100">
        {visibleNotifications.length ? (
          visibleNotifications.map((item) => (
            <div key={item.id} className="flex gap-3 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600">
                {item.type === "resolved" ? (
                  <CheckCircle2 size={16} />
                ) : item.type === "priority" ? (
                  <ShieldAlert size={16} />
                ) : (
                  <Bell size={16} />
                )}
              </span>

              <button
                type="button"
                onClick={() => item.report && onViewReport?.(item.report)}
                disabled={!item.report || !onViewReport}
                className="min-w-0 flex-1 text-left disabled:cursor-default"
              >
                <p className="text-xs font-semibold text-slate-800">
                  {item.title}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  {item.message}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">{item.time}</p>
              </button>

              {onDismiss && (
                <button
                  type="button"
                  onClick={() => onDismiss(item.id)}
                  aria-label={`Dismiss ${item.title}`}
                  className="h-7 rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-xs text-slate-500">
            You're all caught up.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setExpanded((value) => !value);
          onViewAll?.();
        }}
        className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
      >
        {expanded ? "Show less" : "View all notifications"}
      </button>
    </section>
  );
}

const METRIC_DEFINITIONS = [
  {
    key: "unique",
    label: "Unique issues",
    formula: "One row in the report collection equals one unique issue.",
    source: "_id",
    check: "A missing or repeated ID can make unique-issue totals unreliable.",
  },
  {
    key: "submissions",
    label: "Total submissions",
    formula:
      "Sum each issue's positive reports count; use 1 when missing or invalid.",
    source: "reports",
    check: "Counts must be finite positive numbers to contribute as stored.",
  },
  {
    key: "open",
    label: "Open reports",
    formula: "Count reports whose status is not a resolved status.",
    source: "status",
    check: "The server currently stores Open and Closed.",
  },
  {
    key: "resolved",
    label: "Resolved reports",
    formula: "Count reports with a resolved status.",
    source: "status",
    check: "Unknown statuses are included in open by the current fallback.",
  },
  {
    key: "high",
    label: "High severity",
    formula: "Count reports whose severity is a recognized high-severity value.",
    source: "severity",
    check: "The server currently stores Low, Medium, and High.",
  },
  {
    key: "activity",
    label: "Report activity",
    formula: "Group reports by their valid creation date.",
    source: "createdAt",
    check: "Missing, invalid, or future dates cannot be placed reliably.",
  },
];

const QUALITY_FILTERS = [
  { value: "all", label: "All findings" },
  { value: "status", label: "Status" },
  { value: "severity", label: "Severity" },
  { value: "submissions", label: "Submissions" },
  { value: "activity", label: "Activity" },
  { value: "identity", label: "Identity" },
  { value: "details", label: "Details" },
];

const QUALITY_WORKFLOWS = [
  { value: "all", label: "All workflows" },
  {
    value: "metrics",
    label: "Metric reliability",
    categories: ["status", "severity", "submissions", "activity"],
  },
  {
    value: "records",
    label: "Record integrity",
    categories: ["identity", "details"],
  },
];

const QUALITY_PAGE_SIZE = 6;
const FOLLOW_UP_STORAGE_PREFIX = "tester-report-follow-ups-v1";
const FOLLOW_UP_PAGE_SIZE = 5;

function getQualityText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getQualityReportId(report, index) {
  const id = getQualityText(report?._id || report?.id);

  return id || `row-${index + 1}`;
}

function getQualityLabel(report, index) {
  return (
    getQualityText(report?.title) ||
    getQualityText(report?.summary) ||
    `Untitled report ${index + 1}`
  );
}

function createQualityFinding({
  report,
  index,
  field,
  category,
  title,
  detail,
  recommendation,
}) {
  return {
    key: `${getQualityReportId(report, index)}-${field}-${category}`,
    reportId: getQualityReportId(report, index),
    reportIndex: index,
    reportTitle: getQualityLabel(report, index),
    field,
    category,
    title,
    detail,
    recommendation,
  };
}

function analyzeReportQuality(reports) {
  const findings = [];
  const seenIds = new Map();
  const now = Date.now();

  reports.forEach((report, index) => {
    if (!report || typeof report !== "object" || Array.isArray(report)) {
      findings.push(
        createQualityFinding({
          report: {},
          index,
          field: "record",
          category: "details",
          title: "Report record is not an object",
          detail: "This row cannot be read as a report record.",
          recommendation: "Inspect the API response for this report row.",
        }),
      );
      return;
    }

    const reportId = getQualityText(report._id || report.id);
    if (!reportId) {
      findings.push(
        createQualityFinding({
          report,
          index,
          field: "id",
          category: "identity",
          title: "Report ID is missing",
          detail: "This record has no _id or id value.",
          recommendation: "Confirm the report API returns a stable identifier.",
        }),
      );
    } else if (seenIds.has(reportId)) {
      findings.push(
        createQualityFinding({
          report,
          index,
          field: "id",
          category: "identity",
          title: "Duplicate report ID",
          detail: `The same ID also appears in row ${seenIds.get(reportId) + 1}.`,
          recommendation: "Check for duplicate records in the API response.",
        }),
      );
    } else {
      seenIds.set(reportId, index);
    }

    const status = getQualityText(report.status);
    if (!status) {
      findings.push(
        createQualityFinding({
          report,
          index,
          field: "status",
          category: "status",
          title: "Status is missing",
          detail: "The dashboard treats statuses other than resolved as open.",
          recommendation: "Set a valid status, normally Open or Closed.",
        }),
      );
    } else if (!["open", "closed"].includes(status.toLowerCase())) {
      findings.push(
        createQualityFinding({
          report,
          index,
          field: "status",
          category: "status",
          title: "Status is outside the server model",
          detail: `"${status}" is not one of the model values Open or Closed.`,
          recommendation:
            "Verify the status source; this value may be counted as open.",
        }),
      );
    }

    const severity = getQualityText(report.severity);
    if (!severity) {
      findings.push(
        createQualityFinding({
          report,
          index,
          field: "severity",
          category: "severity",
          title: "Severity is missing",
          detail: "The report cannot be assigned to a severity group.",
          recommendation: "Set Low, Medium, or High before using severity metrics.",
        }),
      );
    } else if (
      !["low", "medium", "high"].includes(severity.toLowerCase())
    ) {
      findings.push(
        createQualityFinding({
          report,
          index,
          field: "severity",
          category: "severity",
          title: "Severity is outside the server model",
          detail: `"${severity}" is not one of the model values Low, Medium, or High.`,
          recommendation:
            "Confirm this severity is intentional; it may not contribute to the High metric.",
        }),
      );
    }

    const rawSubmissionCount = report.reports;
    if (
      rawSubmissionCount !== undefined &&
      rawSubmissionCount !== null &&
      rawSubmissionCount !== "" &&
      (!Number.isFinite(Number(rawSubmissionCount)) ||
        Number(rawSubmissionCount) <= 0)
    ) {
      findings.push(
        createQualityFinding({
          report,
          index,
          field: "reports",
          category: "submissions",
          title: "Submission count is not positive",
          detail: `Stored value: "${String(rawSubmissionCount)}".`,
          recommendation:
            "Use a finite positive count; the dashboard falls back to one.",
        }),
      );
    } else if (
      rawSubmissionCount !== undefined &&
      rawSubmissionCount !== null &&
      rawSubmissionCount !== "" &&
      !Number.isInteger(Number(rawSubmissionCount))
    ) {
      findings.push(
        createQualityFinding({
          report,
          index,
          field: "reports",
          category: "submissions",
          title: "Submission count is fractional",
          detail: `Stored value: "${String(rawSubmissionCount)}".`,
          recommendation:
            "Use a whole number so repeated submissions remain interpretable.",
        }),
      );
    }

    const rawDate = report.createdAt || report.created_at;
    if (!rawDate) {
      findings.push(
        createQualityFinding({
          report,
          index,
          field: "createdAt",
          category: "activity",
          title: "Creation date is missing",
          detail: "This report cannot be assigned to an activity day.",
          recommendation: "Return a creation timestamp from the report API.",
        }),
      );
    } else {
      const timestamp = new Date(rawDate).getTime();
      if (Number.isNaN(timestamp)) {
        findings.push(
          createQualityFinding({
            report,
            index,
            field: "createdAt",
            category: "activity",
            title: "Creation date is invalid",
            detail: `Stored value: "${String(rawDate)}".`,
            recommendation:
              "Return a parseable ISO date or a valid timestamp.",
          }),
        );
      } else if (timestamp > now + 60_000) {
        findings.push(
          createQualityFinding({
            report,
            index,
            field: "createdAt",
            category: "activity",
            title: "Creation date is in the future",
            detail: "Future-dated reports are excluded from recent activity.",
            recommendation: "Check timestamp generation and timezone handling.",
          }),
        );
      }
    }

    if (!getQualityText(report.title)) {
      findings.push(
        createQualityFinding({
          report,
          index,
          field: "title",
          category: "details",
          title: "Report title is missing",
          detail: "The dashboard must use a fallback label for this record.",
          recommendation: "Add a concise title to improve report identification.",
        }),
      );
    }
  });

  const counts = QUALITY_FILTERS.reduce((result, filter) => {
    if (filter.value !== "all") {
      result[filter.value] = findings.filter(
        (finding) => finding.category === filter.value,
      ).length;
    }
    return result;
  }, {});
  const rowsWithFindings = new Set(
    findings.map((finding) => finding.reportIndex),
  );

  return {
    findings,
    counts,
    checked: reports.length,
    clean: reports.length - rowsWithFindings.size,
  };
}

function MetricDefinitionCard({ definition }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-800">
          {definition.label}
        </h4>
        <span className="rounded-lg bg-violet-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
          {definition.source}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-600">
        {definition.formula}
      </p>
      <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] leading-5 text-slate-500">
        {definition.check}
      </p>
    </article>
  );
}

function QualitySummaryCard({ label, value, note, tone }) {
  const toneStyles = {
    violet: "bg-violet-50 text-violet-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p
        className={`mt-2 inline-flex rounded-xl px-3 py-1 text-2xl font-semibold tabular-nums ${
          toneStyles[tone] || toneStyles.violet
        }`}
      >
        {formatCount(value)}
      </p>
      <p className="mt-2 text-[11px] leading-4 text-slate-500">{note}</p>
    </article>
  );
}

function QualityFindingRow({ finding }) {
  return (
    <article className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-slate-800">
            {finding.title}
          </h4>
          <p className="mt-1 break-words text-xs leading-5 text-slate-600">
            {finding.detail}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
          {finding.category}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-amber-200/70 pt-3">
        <p className="max-w-2xl text-[11px] leading-4 text-slate-600">
          <span className="font-semibold text-slate-700">Suggested check: </span>
          {finding.recommendation}
        </p>
        <span className="max-w-full truncate text-[10px] font-medium text-slate-500">
          {finding.reportTitle} · {finding.reportId}
        </span>
      </div>
    </article>
  );
}

function getFollowUpActivity(reports) {
  const now = Date.now();

  return reports
    .map((report, index) => {
      if (!report || typeof report !== "object" || Array.isArray(report)) {
        return null;
      }

      const createdAt = getDate(report.createdAt || report.created_at);
      const updatedAt = getDate(report.updatedAt || report.updated_at);
      const date = updatedAt || createdAt;
      if (!date || date.getTime() > now + 60_000) return null;

      const isUpdated =
        Boolean(createdAt && updatedAt) &&
        updatedAt.getTime() - createdAt.getTime() > 60_000;

      return {
        id: getQualityReportId(report, index),
        report,
        title: getQualityLabel(report, index),
        category: getQualityText(report.category) || "Uncategorized",
        status: getQualityText(report.status) || "Unknown status",
        date,
        type: isUpdated ? "updated" : "reported",
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.date.getTime() - left.date.getTime());
}

function getFollowUpStorageKey(email) {
  return `${FOLLOW_UP_STORAGE_PREFIX}:${encodeURIComponent(email)}`;
}

function ActivityFollowUpPanel({ reports = [], email, onOpenReport }) {
  const [followUpIds, setFollowUpIds] = useState([]);
  const [loadedForEmail, setLoadedForEmail] = useState("");
  const [canPersist, setCanPersist] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const normalizedEmail = getQualityText(email).toLowerCase();
  const storageKey = normalizedEmail
    ? getFollowUpStorageKey(normalizedEmail)
    : "";
  const activity = useMemo(() => getFollowUpActivity(reports), [reports]);
  const followUpSet = useMemo(() => new Set(followUpIds), [followUpIds]);

  useEffect(() => {
    setFollowUpIds([]);
    setLoadedForEmail("");
    setCanPersist(false);
    setStorageError("");
    setFilter("all");
    setQuery("");
    setShowAll(false);

    if (!normalizedEmail) return;

    try {
      const stored = window.localStorage.getItem(
        getFollowUpStorageKey(normalizedEmail),
      );
      const parsed = stored ? JSON.parse(stored) : [];
      if (
        !Array.isArray(parsed) ||
        parsed.some((id) => typeof id !== "string")
      ) {
        throw new Error("Saved follow-up data has an invalid format.");
      }
      setFollowUpIds([...new Set(parsed)].slice(0, 500));
      setCanPersist(true);
    } catch {
      setStorageError(
        "Could not read personal follow-up selections from this browser.",
      );
    } finally {
      setLoadedForEmail(normalizedEmail);
    }
  }, [normalizedEmail]);

  useEffect(() => {
    if (!canPersist || !storageKey || loadedForEmail !== normalizedEmail) {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(followUpIds));
      setStorageError("");
    } catch {
      setStorageError(
        "Follow-up selections are only in memory because browser storage could not save them.",
      );
    }
  }, [canPersist, followUpIds, loadedForEmail, normalizedEmail, storageKey]);

  const filteredActivity = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return activity.filter((item) => {
      if (filter === "follow-up" && !followUpSet.has(item.id)) return false;
      if (filter === "reported" && item.type !== "reported") return false;
      if (filter === "updated" && item.type !== "updated") return false;
      if (!normalizedQuery) return true;

      return `${item.id} ${item.title} ${item.category} ${item.status}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [activity, filter, followUpSet, query]);

  const visibleActivity = showAll
    ? filteredActivity
    : filteredActivity.slice(0, FOLLOW_UP_PAGE_SIZE);

  const toggleFollowUp = (id) => {
    setFollowUpIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id].slice(-500),
    );
  };

  if (!reports.length) return null;

  return (
    <section
      className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20 sm:p-5"
      aria-labelledby="activity-follow-up-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600">
            Patch 10 · Activity and follow-up
          </p>
          <h2
            id="activity-follow-up-heading"
            className="mt-1 flex items-center gap-2 text-base font-semibold text-slate-900"
          >
            <Activity size={17} className="text-violet-600" />
            Report activity and follow-up
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Recent report timestamps with a private follow-up list saved for
            this reporter in this browser.
          </p>
        </div>
        <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
          {followUpIds.length} marked for follow-up
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Filter report activity"
        >
          {[
            { value: "all", label: "All activity" },
            { value: "follow-up", label: "Follow-up" },
            { value: "reported", label: "New reports" },
            { value: "updated", label: "Updated reports" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setFilter(option.value);
                setShowAll(false);
              }}
              aria-pressed={filter === option.value}
              className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
                filter === option.value
                  ? "bg-violet-700 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700"
              }`}
            >
              {option.label}
              {option.value === "follow-up" && (
                <span className="ml-1 tabular-nums">{followUpIds.length}</span>
              )}
            </button>
          ))}
        </div>
        <label className="relative min-w-0 sm:w-64">
          <span className="sr-only">Search report activity</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setShowAll(false);
            }}
            placeholder="Search reports"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </label>
      </div>

      {storageError && (
        <p role="alert" className="mt-3 text-xs text-amber-800">
          {storageError}
        </p>
      )}
      <p className="mt-2 text-[10px] text-slate-500" aria-live="polite">
        Showing {visibleActivity.length} of {filteredActivity.length} matching
        activity entries. Activity is inferred from report creation and update
        timestamps; older versions are not available.
      </p>

      {visibleActivity.length ? (
        <ul className="mt-2 divide-y divide-slate-100">
          {visibleActivity.map((item) => {
            const isFollowUp = followUpSet.has(item.id);

            return (
              <li
                key={`${item.id}-${item.type}`}
                className="flex flex-wrap items-center gap-3 py-3"
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                    item.type === "updated"
                      ? "bg-sky-50 text-sky-700"
                      : "bg-violet-50 text-violet-700"
                  }`}
                  aria-hidden="true"
                >
                  {item.type === "updated" ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <CalendarDays size={16} />
                  )}
                </span>
                <div className="min-w-[150px] flex-1">
                  <button
                    type="button"
                    onClick={() => onOpenReport?.(item.report)}
                    className="block max-w-full truncate text-left text-xs font-semibold text-slate-800 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  >
                    {item.title}
                  </button>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500">
                    <span>
                      {item.type === "updated"
                        ? "Record last updated"
                        : "Report submitted"}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{item.date.toLocaleString("en-IN")}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.status}</span>
                  </p>
                </div>
                <span className="max-w-[150px] truncate rounded-md bg-slate-100 px-2 py-1 text-[10px] text-slate-600">
                  {item.category}
                </span>
                <button
                  type="button"
                  onClick={() => toggleFollowUp(item.id)}
                  aria-pressed={isFollowUp}
                  aria-label={`${isFollowUp ? "Remove from" : "Add to"} follow-up: ${item.title}`}
                  className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                    isFollowUp
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:text-amber-800"
                  }`}
                >
                  <Bell size={12} aria-hidden="true" />
                  {isFollowUp ? "Follow-up saved" : "Follow up"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-slate-700">
            {filter === "follow-up"
              ? "Nothing marked for follow-up."
              : "No activity matches these filters."}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {filter === "follow-up"
              ? "Mark a report from All activity to keep it in your personal queue."
              : "Try another search or activity filter."}
          </p>
        </div>
      )}
      {filteredActivity.length > visibleActivity.length && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700"
        >
          Show all {filteredActivity.length} activity entries
        </button>
      )}
    </section>
  );
}

function MetricQualityPanel({ reports = [] }) {
  const [activeWorkflow, setActiveWorkflow] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [showDefinitions, setShowDefinitions] = useState(false);
  const [visibleCount, setVisibleCount] = useState(QUALITY_PAGE_SIZE);
  const [exportError, setExportError] = useState("");
  const quality = useMemo(() => analyzeReportQuality(reports), [reports]);
  const normalizedQuery = query.trim().toLowerCase();
  const workflowFindings = useMemo(() => {
    const workflow = QUALITY_WORKFLOWS.find(
      (item) => item.value === activeWorkflow,
    );
    return workflow?.categories
      ? quality.findings.filter((finding) =>
          workflow.categories.includes(finding.category),
        )
      : quality.findings;
  }, [activeWorkflow, quality.findings]);
  const workflowCounts = useMemo(
    () =>
      QUALITY_WORKFLOWS.reduce((counts, workflow) => {
        counts[workflow.value] =
          workflow.value === "all"
            ? quality.findings.length
            : quality.findings.filter((finding) =>
                workflow.categories.includes(finding.category),
              ).length;
        return counts;
      }, {}),
    [quality.findings],
  );
  const categoryCounts = useMemo(
    () =>
      workflowFindings.reduce(
        (counts, finding) => {
          counts[finding.category] = (counts[finding.category] || 0) + 1;
          return counts;
        },
        { all: workflowFindings.length },
      ),
    [workflowFindings],
  );

  const visibleFindings = useMemo(
    () =>
      workflowFindings
        .filter(
          (finding) =>
            activeFilter === "all" || finding.category === activeFilter,
        )
        .filter((finding) => {
          if (!normalizedQuery) return true;

          return [
            finding.reportId,
            finding.reportTitle,
            finding.title,
            finding.detail,
            finding.recommendation,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        }),
    [activeFilter, normalizedQuery, workflowFindings],
  );

  const pageFindings = visibleFindings.slice(0, visibleCount);
  const totalFindings = quality.findings.length;
  const hasFindings = totalFindings > 0;
  const printSnapshot = useMemo(() => {
    const validReports = reports.filter(
      (report) =>
        report && typeof report === "object" && !Array.isArray(report),
    );
    const resolved = validReports.filter((report) =>
      isResolved(report.status),
    ).length;
    const open = validReports.filter((report) => isOpen(report.status)).length;
    const high = validReports.filter((report) =>
      isHighSeverity(report.severity),
    ).length;
    const submissions = validReports.reduce((sum, report) => {
      const count = Number(report.reports);
      return sum + (Number.isFinite(count) && count > 0 ? count : 1);
    }, 0);
    const activity = getActivityDays(validReports, 30);
    const previousActivity = getActivityDays(validReports, 30, 30);
    const categoryCounts = new Map();

    validReports.forEach((report) => {
      const category =
        typeof report.category === "string" && report.category.trim()
          ? report.category.trim()
          : "Uncategorized";
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    });

    return {
      total: validReports.length,
      submissions,
      repeats: Math.max(0, submissions - validReports.length),
      open,
      resolved,
      high,
      resolutionRate: validReports.length
        ? Math.round((resolved / validReports.length) * 100)
        : 0,
      activityTotal: activity.reduce((sum, day) => sum + day.count, 0),
      activeDays: activity.filter((day) => day.count > 0).length,
      previousActivityTotal: previousActivity.reduce(
        (sum, day) => sum + day.count,
        0,
      ),
      categories: [...categoryCounts.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort(
          (left, right) =>
            right.count - left.count ||
            left.category.localeCompare(right.category),
        ),
    };
  }, [reports]);
  const printDate = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const exportFindings = () => {
    let downloadUrl = "";

    try {
      const csvRows = [
        [
          "Report ID",
          "Report title",
          "Category",
          "Field",
          "Finding",
          "Details",
          "Suggested check",
        ],
        ...visibleFindings.map((finding) => [
          finding.reportId,
          finding.reportTitle,
          finding.category,
          finding.field,
          finding.title,
          finding.detail,
          finding.recommendation,
        ]),
      ];
      const csv = csvRows
        .map((row) =>
          row
            .map((value) => {
              const text = String(value ?? "");
              const safeText = /^[\t\r ]*[=+\-@]/.test(text)
                ? `'${text}`
                : text;
              return `"${safeText.replace(/"/g, '""')}"`;
            })
            .join(","),
        )
        .join("\r\n");
      const blob = new Blob(["\uFEFF", csv], {
        type: "text/csv;charset=utf-8",
      });
      downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `data-quality-findings-${activeFilter}-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      downloadUrl = "";
      setExportError("");
    } catch {
      setExportError("Could not export quality findings. Please try again.");
    } finally {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    }
  };

  return (
    <section
      className="rounded-[22px] border border-white bg-slate-50/80 p-5 shadow-sm shadow-slate-200/50 sm:p-6"
      aria-labelledby="metric-quality-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600">
            Data confidence
          </p>
          <h2
            id="metric-quality-heading"
            className="mt-1 text-base font-semibold text-slate-900"
          >
            Metric definitions and data quality
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Review the rules behind dashboard totals and find report records
            that may make activity or status metrics less reliable. Findings
            are advisory; this panel does not modify reports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            aria-label="Print analytics summary"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <Printer size={14} aria-hidden="true" />
            Print summary
          </button>
          <button
            type="button"
            onClick={() => setShowDefinitions((visible) => !visible)}
            aria-expanded={showDefinitions}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-violet-200 hover:text-violet-700"
          >
            {showDefinitions ? "Hide metric rules" : "View metric rules"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <QualitySummaryCard
          label="Reports checked"
          value={quality.checked}
          note="Records included in this quality review."
          tone="violet"
        />
        <QualitySummaryCard
          label="Reports without findings"
          value={quality.clean}
          note="No listed data-quality checks were triggered."
          tone="green"
        />
        <QualitySummaryCard
          label="Findings to review"
          value={totalFindings}
          note="A report may have more than one finding."
          tone={hasFindings ? "amber" : "green"}
        />
      </div>

      {showDefinitions && (
        <div className="mt-5">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-800">
              How dashboard metrics are calculated
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              These definitions reflect the fields and fallbacks used by the
              tester dashboard and analytics component.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {METRIC_DEFINITIONS.map((definition) => (
              <MetricDefinitionCard
                key={definition.key}
                definition={definition}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-slate-200 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Data-quality findings
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Each item explains the affected field and its possible metric
              impact.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
            <label className="w-full sm:max-w-xs">
              <span className="sr-only">Search quality findings</span>
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleCount(QUALITY_PAGE_SIZE);
                }}
                placeholder="Search reports or finding text"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </label>
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setVisibleCount(QUALITY_PAGE_SIZE);
                }}
                aria-label="Clear quality findings search"
                className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
              >
                Clear search
              </button>
            )}
            <button
              type="button"
              onClick={exportFindings}
              disabled={!visibleFindings.length}
              aria-label={`Export ${visibleFindings.length} matching data-quality findings as CSV`}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download size={14} aria-hidden="true" />
              Export CSV ({visibleFindings.length})
            </button>
          </div>
        </div>
        {exportError && (
          <p role="alert" className="mt-2 text-xs text-rose-700">
            {exportError}
          </p>
        )}

        <div
          className="mt-4 flex gap-2 overflow-x-auto pb-2"
          role="group"
          aria-label="Filter findings by workflow"
        >
          {QUALITY_WORKFLOWS.map((workflow) => (
            <button
              key={workflow.value}
              type="button"
              onClick={() => {
                setActiveWorkflow(workflow.value);
                setActiveFilter("all");
                setVisibleCount(QUALITY_PAGE_SIZE);
              }}
              aria-pressed={activeWorkflow === workflow.value}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                activeWorkflow === workflow.value
                  ? "bg-indigo-700 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700"
              }`}
            >
              {workflow.label}
              <span className="ml-1.5 tabular-nums">
                {formatCount(workflowCounts[workflow.value] || 0)}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-1 text-[10px] text-slate-500">
          Select a workflow first, then narrow the results by metric category.
          Counts reflect the selected workflow.
        </p>

        <div
          className="mt-4 flex gap-2 overflow-x-auto pb-2"
          aria-label="Further filter findings by metric"
        >
          {QUALITY_FILTERS.map((filter) => {
            const count = categoryCounts[filter.value] || 0;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setActiveFilter(filter.value);
                  setVisibleCount(QUALITY_PAGE_SIZE);
                }}
                aria-pressed={activeFilter === filter.value}
                disabled={count === 0 && activeFilter !== filter.value}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  activeFilter === filter.value
                    ? "bg-violet-700 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                }`}
              >
                {filter.label} <span className="ml-1 tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>

        {pageFindings.length ? (
          <div className="mt-3 space-y-3">
            {pageFindings.map((finding) => (
              <QualityFindingRow key={finding.key} finding={finding} />
            ))}
            {visibleFindings.length > pageFindings.length && (
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((count) => count + QUALITY_PAGE_SIZE)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700"
              >
                Show more findings (
                {visibleFindings.length - pageFindings.length} remaining)
              </button>
            )}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
            <p className="text-sm font-semibold text-slate-700">
              {hasFindings
                ? "No findings match this filter."
                : "No data-quality findings."}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {hasFindings
                ? "Try another workflow or metric category, or clear the search."
                : "The current report records pass the checks in this panel."}
            </p>
            {(activeWorkflow !== "all" ||
              activeFilter !== "all" ||
              query) && (
              <button
                type="button"
                onClick={() => {
                  setActiveWorkflow("all");
                  setActiveFilter("all");
                  setQuery("");
                  setVisibleCount(QUALITY_PAGE_SIZE);
                }}
                className="mt-3 rounded-lg px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
      <style>{`
        @page {
          size: auto;
          margin: 14mm;
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          #analytics-quality-print-report,
          #analytics-quality-print-report * {
            visibility: visible !important;
          }
          #analytics-quality-print-report {
            display: block !important;
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            color: #0f172a !important;
            background: #fff !important;
            font-family: Arial, sans-serif !important;
          }
          #analytics-quality-print-report table {
            width: 100%;
            border-collapse: collapse;
          }
          #analytics-quality-print-report th,
          #analytics-quality-print-report td {
            border: 1px solid #cbd5e1;
            padding: 7px 9px;
            text-align: left;
          }
          #analytics-quality-print-report th {
            background: #f1f5f9 !important;
          }
          #analytics-quality-print-report tr {
            break-inside: avoid;
          }
        }
      `}</style>
      <section
        id="analytics-quality-print-report"
        className="hidden"
        aria-label="Printable analytics summary"
      >
        <header style={{ marginBottom: 20 }}>
          <p
            style={{
              color: "#6d28d9",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            AI Bug Tracker
          </p>
          <h1 style={{ margin: "5px 0", fontSize: 24 }}>
            Report analytics summary
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: 11 }}>
            Generated {printDate} · Current report snapshot
          </p>
        </header>
        <h2 style={{ margin: "18px 0 8px", fontSize: 15 }}>
          Overall metrics
        </h2>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
              <th>Context</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Unique issues</td>
              <td>{formatCount(printSnapshot.total)}</td>
              <td>{formatCount(printSnapshot.submissions)} total submissions</td>
            </tr>
            <tr>
              <td>Open reports</td>
              <td>{formatCount(printSnapshot.open)}</td>
              <td>Awaiting attention</td>
            </tr>
            <tr>
              <td>Resolved reports</td>
              <td>{formatCount(printSnapshot.resolved)}</td>
              <td>{printSnapshot.resolutionRate}% resolution rate</td>
            </tr>
            <tr>
              <td>High severity</td>
              <td>{formatCount(printSnapshot.high)}</td>
              <td>{formatCount(printSnapshot.repeats)} repeat submissions</td>
            </tr>
          </tbody>
        </table>
        <h2 style={{ margin: "18px 0 8px", fontSize: 15 }}>
          Recent activity · last 30 days
        </h2>
        <table>
          <thead>
            <tr>
              <th>New issues</th>
              <th>Active days</th>
              <th>Average per day</th>
              <th>Previous 30 days</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{formatCount(printSnapshot.activityTotal)}</td>
              <td>{formatCount(printSnapshot.activeDays)}</td>
              <td>{(printSnapshot.activityTotal / 30).toFixed(1)}</td>
              <td>{formatCount(printSnapshot.previousActivityTotal)}</td>
            </tr>
          </tbody>
        </table>
        <h2 style={{ margin: "18px 0 8px", fontSize: 15 }}>
          Reports by category
        </h2>
        {printSnapshot.categories.length ? (
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Issues</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {printSnapshot.categories.map(({ category, count }) => (
                <tr key={category}>
                  <td>{category}</td>
                  <td>{formatCount(count)}</td>
                  <td>
                    {printSnapshot.total
                      ? `${((count / printSnapshot.total) * 100).toFixed(1)}%`
                      : "0.0%"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "#64748b", fontSize: 12 }}>
            No report categories are available.
          </p>
        )}
        <h2 style={{ margin: "18px 0 8px", fontSize: 15 }}>
          Data-quality review
        </h2>
        <p style={{ fontSize: 12 }}>
          {formatCount(quality.checked)} reports checked ·{" "}
          {formatCount(quality.clean)} without findings ·{" "}
          {formatCount(totalFindings)} findings to review
        </p>
        <p style={{ marginTop: 20, color: "#64748b", fontSize: 10 }}>
          Generated from the current dashboard data. Trends and categories are
          descriptive and do not imply issue priority or resolution quality.
        </p>
      </section>
    </section>
  );
}

export default function AnalyticsOverview({
  reports = [],
  weeklyActivity = [],
  notifications = [],
  loading = false,
  onDismissNotification,
  onViewAllNotifications,
  onViewReport,
}) {
  const [activityDays, setActivityDays] = useState(7);
  const [showPeriodComparison, setShowPeriodComparison] = useState(false);
  const activity = useMemo(
    () =>
      activityDays === 7 && weeklyActivity.length
        ? weeklyActivity
        : getActivityDays(reports, activityDays),
    [activityDays, reports, weeklyActivity],
  );
  const previousActivity = useMemo(
    () => getActivityDays(reports, activityDays, activityDays),
    [activityDays, reports],
  );
  const previousPeriodTotal = useMemo(() => {
    return previousActivity.reduce((sum, day) => sum + day.count, 0);
  }, [previousActivity]);

  const stats = useMemo(() => {
    const resolved = reports.filter((report) => isResolved(report.status)).length;
    const open = reports.filter((report) => isOpen(report.status)).length;
    const high = reports.filter((report) =>
      isHighSeverity(report.severity),
    ).length;
    const submissions = reports.reduce((sum, report) => {
      const count = Number(report.reports);
      return sum + (Number.isFinite(count) && count > 0 ? count : 1);
    }, 0);

    return {
      total: reports.length,
      submissions,
      repeats: Math.max(0, submissions - reports.length),
      open,
      resolved,
      high,
      resolutionRate: reports.length
        ? Math.round((resolved / reports.length) * 100)
        : 0,
    };
  }, [reports]);

  const printCategories = useMemo(() => {
    const categoryCounts = new Map();

    reports.forEach((report) => {
      const category =
        typeof report.category === "string" && report.category.trim()
          ? report.category.trim()
          : "Uncategorized";
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    });

    return [...categoryCounts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort(
        (left, right) =>
          right.count - left.count || left.category.localeCompare(right.category),
      )
      .slice(0, 8);
  }, [reports]);
  const printDate = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const cards = [
    {
      label: "Unique issues",
      value: stats.total,
      note: `${formatCount(stats.submissions)} total submissions`,
      icon: Layers3,
      tone: "slate",
      featured: true,
    },
    {
      label: "Open reports",
      value: stats.open,
      note: "Awaiting attention",
      icon: Clock3,
      tone: "violet",
    },
    {
      label: "Resolved reports",
      value: stats.resolved,
      note: `${stats.resolutionRate}% resolution rate`,
      icon: CheckCircle2,
      tone: "green",
    },
    {
      label: "High severity",
      value: stats.high,
      note: `${formatCount(stats.repeats)} repeat submissions`,
      icon: ShieldAlert,
      tone: "rose",
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600">
            Overview
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Report analytics
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Metrics, activity, and notifications for your bug reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {loading ? "Refreshing..." : "Live dashboard data"}
          </span>
          <button
            type="button"
            onClick={() =>
              setShowPeriodComparison((visible) => !visible)
            }
            aria-expanded={showPeriodComparison}
            aria-controls="analytics-period-comparison"
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
              showPeriodComparison
                ? "border-violet-200 bg-violet-50 text-violet-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700"
            }`}
          >
            <ArrowLeftRight size={14} aria-hidden="true" />
            {showPeriodComparison
              ? `Hide ${activityDays}D comparison`
              : `Compare ${activityDays}D periods`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      {showPeriodComparison && (
        <div id="analytics-period-comparison">
          <PeriodComparisonPanel
            reports={reports}
            days={activityDays}
            loading={loading}
          />
        </div>
      )}

      <MetricQualityPanel reports={reports} />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <WeeklyActivityChart
            data={activity}
            previousData={previousActivity}
            days={activityDays}
            loading={loading}
            onRangeChange={setActivityDays}
            previousTotal={previousPeriodTotal}
          />
        </div>
        <ResolutionChart total={stats.total} resolved={stats.resolved} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[22px] border border-white bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Severity overview</h2>

          {[
            { label: "High severity", value: stats.high, color: "bg-rose-500" },
            {
              label: "Open reports",
              value: stats.open,
              color: "bg-violet-500",
            },
            {
              label: "Resolved reports",
              value: stats.resolved,
              color: "bg-emerald-500",
            },
          ].map((item) => (
            <div key={item.label} className="mt-5">
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-slate-600">{item.label}</span>
                <span className="text-slate-500">{item.value}</span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{
                    width: `${stats.total ? (item.value / stats.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </section>

        <NotificationWidget
          notifications={notifications}
          onDismiss={onDismissNotification}
          onViewAll={onViewAllNotifications}
          onViewReport={onViewReport}
        />
      </div>

      <style media="not all">{`
        @page {
          size: auto;
          margin: 14mm;
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          #analytics-print-report,
          #analytics-print-report * {
            visibility: visible !important;
          }
          #analytics-print-report {
            display: block !important;
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            color: #0f172a !important;
            background: #fff !important;
            font-family: Arial, sans-serif !important;
          }
          #analytics-print-report table {
            width: 100%;
            border-collapse: collapse;
          }
          #analytics-print-report th,
          #analytics-print-report td {
            border: 1px solid #cbd5e1;
            padding: 7px 9px;
            text-align: left;
          }
          #analytics-print-report th {
            background: #f1f5f9 !important;
          }
          #analytics-print-report tr {
            break-inside: avoid;
          }
        }
      `}</style>
      <section
        id="analytics-print-report"
        className="hidden"
        aria-label="Printable analytics summary"
      >
        <header style={{ marginBottom: 20 }}>
          <p
            style={{
              color: "#6d28d9",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            AI Bug Tracker
          </p>
          <h1 style={{ margin: "5px 0", fontSize: 24 }}>
            Report analytics summary
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: 11 }}>
            Generated {printDate} · Current report snapshot
          </p>
        </header>

        <h2 style={{ margin: "18px 0 8px", fontSize: 15 }}>
          Overall metrics
        </h2>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
              <th>Context</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Unique issues</td>
              <td>{formatCount(stats.total)}</td>
              <td>{formatCount(stats.submissions)} total submissions</td>
            </tr>
            <tr>
              <td>Open reports</td>
              <td>{formatCount(stats.open)}</td>
              <td>Awaiting attention</td>
            </tr>
            <tr>
              <td>Resolved reports</td>
              <td>{formatCount(stats.resolved)}</td>
              <td>{stats.resolutionRate}% resolution rate</td>
            </tr>
            <tr>
              <td>High severity</td>
              <td>{formatCount(stats.high)}</td>
              <td>{formatCount(stats.repeats)} repeat submissions</td>
            </tr>
          </tbody>
        </table>

        <h2 style={{ margin: "18px 0 8px", fontSize: 15 }}>
          Recent activity · last {activityDays} days
        </h2>
        <table>
          <thead>
            <tr>
              <th>Period</th>
              <th>New issues</th>
              <th>Active days</th>
              <th>Average per day</th>
              <th>Previous period</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Most recent {activityDays} days</td>
              <td>
                {formatCount(
                  activity.reduce((sum, day) => sum + (day.count || 0), 0),
                )}
              </td>
              <td>{formatCount(activity.filter((day) => day.count > 0).length)}</td>
              <td>
                {activity.length
                  ? (
                      activity.reduce(
                        (sum, day) => sum + (day.count || 0),
                        0,
                      ) / activity.length
                    ).toFixed(1)
                  : "0.0"}
              </td>
              <td>{formatCount(previousPeriodTotal)} issues</td>
            </tr>
          </tbody>
        </table>

        <h2 style={{ margin: "18px 0 8px", fontSize: 15 }}>
          Reports by category
        </h2>
        {printCategories.length ? (
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Issues</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {printCategories.map(({ category, count }) => (
                <tr key={category}>
                  <td>{category}</td>
                  <td>{formatCount(count)}</td>
                  <td>
                    {stats.total
                      ? `${((count / stats.total) * 100).toFixed(1)}%`
                      : "0.0%"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "#64748b", fontSize: 12 }}>
            No report categories are available.
          </p>
        )}
        {printCategories.length < new Set(
          reports.map((report) =>
            typeof report.category === "string" && report.category.trim()
              ? report.category.trim()
              : "Uncategorized",
          ),
        ).size && (
          <p style={{ color: "#64748b", fontSize: 10 }}>
            Showing the top {printCategories.length} categories.
          </p>
        )}
        <p style={{ marginTop: 20, color: "#64748b", fontSize: 10 }}>
          Generated from the current dashboard data. Trends and categories are
          descriptive and do not imply issue priority or resolution quality.
        </p>
      </section>
    </section>
  );
}

function LegacyAnalyticsOverviewPreview({
  bugs,
  loading,
  notifications,
  dismissNotification,
  openNotifications,
  handleViewReport,
}) {
<AnalyticsOverview
  reports={bugs}
  loading={loading}
  notifications={notifications}
  onDismissNotification={dismissNotification}
  onViewAllNotifications={openNotifications}
  onViewReport={handleViewReport}
/>;
}

export { ActivityFollowUpPanel, MetricQualityPanel };