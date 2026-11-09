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
  CircleDashed,
  Clock3,
  Download,
  Flame,
  Gauge,
  Layers3,
  Minus,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

const RANGE_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

const METRIC_OPTIONS = [
  { value: "all", label: "All reports", color: "bg-violet-500" },
  { value: "open", label: "Open", color: "bg-amber-500" },
  { value: "resolved", label: "Resolved", color: "bg-emerald-500" },
  { value: "high", label: "High severity", color: "bg-rose-500" },
];

function isValidDate(value) {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function localDateKey(date) {
  if (!isValidDate(date)) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return localDateKey(parsed) === value ? parsed : null;
}

function addDays(date, amount) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + amount);
  return result;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getEntryDate(entry) {
  if (isValidDate(entry?.date)) return entry.date;
  return null;
}

function getEntryStatus(entry) {
  return entry?.report?.status === "Closed" ? "resolved" : "open";
}

function getEntrySeverity(entry) {
  return typeof entry?.report?.severity === "string"
    ? entry.report.severity.trim()
    : "Unspecified";
}

function getEntryTitle(entry) {
  const title = entry?.report?.title || entry?.report?.summary;
  return typeof title === "string" && title.trim()
    ? title.trim()
    : "Untitled report";
}

function getMetricValue(entry, metric) {
  if (metric === "open") return getEntryStatus(entry) === "open" ? 1 : 0;
  if (metric === "resolved") {
    return getEntryStatus(entry) === "resolved" ? 1 : 0;
  }
  if (metric === "high") return getEntrySeverity(entry) === "High" ? 1 : 0;
  return 1;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDayName(date) {
  return date.toLocaleDateString("en-IN", { weekday: "short" });
}

function formatCompactDate(date) {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function formatFullDate(date) {
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatRangeLabel(days) {
  if (!days.length) return "No dates";
  const first = days[0].date;
  const last = days[days.length - 1].date;

  if (
    first.getFullYear() === last.getFullYear() &&
    first.getMonth() === last.getMonth()
  ) {
    return `${first.getDate()}–${last.getDate()} ${last.toLocaleDateString(
      "en-IN",
      { month: "long", year: "numeric" },
    )}`;
  }

  return `${formatCompactDate(first)} – ${last.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

function buildDailySeries(entries, rangeDays, referenceDate = new Date()) {
  const lastDay = startOfDay(referenceDate);
  const firstDay = addDays(lastDay, -(rangeDays - 1));
  const days = Array.from({ length: rangeDays }, (_, index) => {
    const date = addDays(firstDay, index);
    return {
      date,
      key: localDateKey(date),
      total: 0,
      open: 0,
      resolved: 0,
      high: 0,
      reports: [],
    };
  });
  const dayByKey = new Map(days.map((day) => [day.key, day]));

  entries.forEach((entry) => {
    const date = getEntryDate(entry);
    if (!date) return;

    const bucket = dayByKey.get(localDateKey(date));
    if (!bucket) return;

    bucket.total += 1;
    bucket[getEntryStatus(entry)] += 1;
    if (getEntrySeverity(entry) === "High") bucket.high += 1;
    bucket.reports.push(entry);
  });

  days.forEach((day) => {
    day.reports.sort(
      (left, right) =>
        getEntryDate(right).getTime() - getEntryDate(left).getTime(),
    );
  });

  return days;
}

function buildPreviousSeries(entries, rangeDays, referenceDate = new Date()) {
  const previousReference = addDays(startOfDay(referenceDate), -rangeDays);
  return buildDailySeries(entries, rangeDays, previousReference);
}

function getDayMetric(day, metric) {
  if (!day) return 0;
  return metric === "all" ? day.total : day[metric] || 0;
}

function getSeriesTotal(days, metric) {
  return days.reduce((total, day) => total + getDayMetric(day, metric), 0);
}

function getSeriesPeak(days, metric) {
  return days.reduce(
    (peak, day) => Math.max(peak, getDayMetric(day, metric)),
    0,
  );
}

function getAveragePerActiveDay(days, metric) {
  const activeDays = days.filter((day) => getDayMetric(day, metric) > 0);
  if (!activeDays.length) return 0;

  return Number(
    (
      activeDays.reduce((sum, day) => sum + getDayMetric(day, metric), 0) /
      activeDays.length
    ).toFixed(1),
  );
}

function getPercentChange(current, previous) {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return Math.round(((current - previous) / previous) * 100);
}

function getMetricTheme(metric) {
  return (
    METRIC_OPTIONS.find((option) => option.value === metric) ||
    METRIC_OPTIONS[0]
  );
}

function getRelativePeriodLabel(rangeDays) {
  if (rangeDays === 7) return "past week";
  if (rangeDays === 14) return "past two weeks";
  if (rangeDays === 30) return "past month";
  return `past ${rangeDays} days`;
}

function escapeCsvCell(value) {
  const text = String(value ?? "").replace(/\r\n?/g, "\n");
  const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function downloadPulseCsv(days, metric, rangeDays) {
  const headers = [
    "Date",
    "Weekday",
    "Total reports",
    "Open",
    "Resolved",
    "High severity",
    `${getMetricTheme(metric).label} selected`,
  ];
  const rows = days.map((day) => [
    localDateKey(day.date),
    formatDayName(day.date),
    day.total,
    day.open,
    day.resolved,
    day.high,
    getDayMetric(day, metric),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8",
  });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `report-activity-pulse-${rangeDays}-days-${localDateKey(
    new Date(),
  )}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

function DayOfWeekSummary({ days, metric }) {
  const totals = Array.from({ length: 7 }, (_, index) => ({
    dayIndex: index,
    count: 0,
    activeDates: 0,
  }));

  days.forEach((day) => {
    const dayIndex = (day.date.getDay() + 6) % 7;
    const value = getDayMetric(day, metric);
    totals[dayIndex].count += value;
    if (value > 0) totals[dayIndex].activeDates += 1;
  });

  const maximum = Math.max(1, ...totals.map((day) => day.count));
  const busiest = totals.reduce(
    (best, day) => (day.count > best.count ? day : best),
    totals[0],
  );

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h4 className="text-[10px] font-semibold text-slate-700">
            Activity by weekday
          </h4>
          <p className="mt-0.5 text-[9px] text-slate-400">
            Totals grouped across the selected range
          </p>
        </div>
        <CalendarDays size={13} className="text-violet-600" aria-hidden="true" />
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {totals.map((day) => {
          const date = new Date(2024, 0, 1 + day.dayIndex);
          const isBusiest = day.count > 0 && day.count === busiest.count;

          return (
            <div
              key={day.dayIndex}
              className={`rounded-lg px-1 py-2 text-center ${
                isBusiest ? "bg-violet-50" : "bg-slate-50/70"
              }`}
              title={`${formatDayName(date)}: ${day.count} reports across ${day.activeDates} active dates`}
            >
              <span className="block text-[8px] font-semibold uppercase text-slate-400 sm:text-[9px]">
                {formatDayName(date)}
              </span>
              <span
                className={`mt-1 block text-xs font-semibold tabular-nums ${
                  isBusiest ? "text-violet-700" : "text-slate-700"
                }`}
              >
                {formatNumber(day.count)}
              </span>
              <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white">
                <span
                  className={`block h-full rounded-full ${
                    isBusiest ? "bg-violet-500" : "bg-violet-200"
                  }`}
                  style={{ width: `${(day.count / maximum) * 100}%` }}
                />
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function WeekendWeekdayComparison({ days, metric }) {
  const groups = [
    { id: "weekday", label: "Weekdays", color: "bg-violet-500", days: [] },
    { id: "weekend", label: "Weekend", color: "bg-amber-500", days: [] },
  ];

  days.forEach((day) => {
    const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
    groups[isWeekend ? 1 : 0].days.push(day);
  });

  const totals = groups.map((group) => {
    const total = group.days.reduce(
      (sum, day) => sum + getDayMetric(day, metric),
      0,
    );
    const activeDays = group.days.filter(
      (day) => getDayMetric(day, metric) > 0,
    ).length;

    return {
      ...group,
      total,
      activeDays,
      average: group.days.length ? total / group.days.length : 0,
    };
  });
  const maximumAverage = Math.max(1, ...totals.map((group) => group.average));
  const theme = getMetricTheme(metric);

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h4 className="text-[10px] font-semibold text-slate-700">
            Weekdays vs weekend
          </h4>
          <p className="mt-0.5 text-[8px] text-slate-400">
            Average {theme.label.toLowerCase()} per calendar day
          </p>
        </div>
        <CalendarDays size={13} className="text-violet-600" aria-hidden="true" />
      </div>
      <div className="space-y-3">
        {totals.map((group) => (
          <div key={group.id}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[9px] font-medium text-slate-600">
                {group.label}
              </span>
              <span className="text-[9px] tabular-nums text-slate-500">
                {formatNumber(group.total)} total · {group.activeDays} active
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${group.color}`}
                style={{
                  width: `${(group.average / maximumAverage) * 100}%`,
                }}
                role="progressbar"
                aria-label={`${group.label}: average ${group.average.toFixed(2)} ${theme.label.toLowerCase()} per day`}
                aria-valuenow={Number(group.average.toFixed(2))}
                aria-valuemin={0}
                aria-valuemax={Number(maximumAverage.toFixed(2))}
              />
            </div>
            <p className="mt-1 text-right text-[8px] text-slate-400">
              {group.average.toFixed(2)} per day
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ComparisonBadge({ current, previous }) {
  const difference = current - previous;
  const percentChange = getPercentChange(current, previous);
  const increase = difference > 0;
  const decrease = difference < 0;
  const tone = increase
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : decrease
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-slate-50 text-slate-600";
  const Icon = increase ? ArrowUpRight : decrease ? ArrowDownRight : Minus;
  const headline =
    percentChange === null
      ? current > 0
        ? "New activity"
        : "No change"
      : `${percentChange > 0 ? "+" : ""}${percentChange}%`;
  const detail =
    difference === 0
      ? "same as previous period"
      : `${difference > 0 ? "+" : ""}${formatNumber(difference)} ${
          Math.abs(difference) === 1 ? "report" : "reports"
        }`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold ${tone}`}
      title={`Previous period had ${formatNumber(previous)} reports`}
    >
      <Icon size={10} aria-hidden="true" />
      {headline}
      <span className="hidden font-medium sm:inline">· {detail}</span>
    </span>
  );
}

function PulseStat({ icon: Icon, label, value, detail, tone }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-2.5 sm:p-3">
      <div className="flex items-center gap-1.5">
        <span className={`grid h-6 w-6 place-items-center rounded-lg ${tone}`}>
          <Icon size={12} aria-hidden="true" />
        </span>
        <span className="truncate text-[9px] font-medium text-slate-500">
          {label}
        </span>
      </div>
      <p className="mt-2 text-base font-semibold leading-5 text-slate-900 tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[8px] text-slate-400 sm:text-[9px]">
        {detail}
      </p>
    </div>
  );
}

function RangeSelector({ value, onChange }) {
  return (
    <div
      role="group"
      aria-label="Activity pulse date range"
      className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-slate-200 bg-white p-0.5"
    >
      {RANGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`h-7 shrink-0 rounded-md px-2 text-[9px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            value === option.value
              ? "bg-violet-600 text-white shadow-sm"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function MetricSelector({ value, onChange }) {
  return (
    <label className="relative inline-flex">
      <span className="sr-only">Activity pulse metric</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 appearance-none rounded-lg border border-slate-200 bg-white pl-2.5 pr-7 text-[9px] font-semibold text-slate-600 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      >
        {METRIC_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={11}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
    </label>
  );
}

function MetricLegend({ metric }) {
  const theme = getMetricTheme(metric);

  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500">
      <span className={`h-2 w-2 rounded-sm ${theme.color}`} />
      {theme.label}
    </span>
  );
}

function DayBar({
  day,
  metric,
  maximum,
  selected,
  onSelectDate,
  isToday,
}) {
  const value = getDayMetric(day, metric);
  const height = value === 0 ? 3 : Math.max(8, (value / maximum) * 100);
  const theme = getMetricTheme(metric);
  const compactLabel = day.date.getDate();
  const showDayName = day.date.getDay() === 1 || day.date.getDate() === 1;

  return (
    <button
      type="button"
      data-pulse-day={day.key}
      onClick={() => onSelectDate?.(day.key)}
      aria-pressed={selected}
      aria-label={`${formatFullDate(day.date)}, ${formatNumber(value)} ${
        metric === "all" ? "reports" : theme.label.toLowerCase()
      }${isToday ? ", today" : ""}`}
      className={`group flex min-w-0 flex-1 flex-col items-center justify-end rounded-lg px-0.5 pb-1 pt-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:px-1 ${
        selected
          ? "bg-violet-50"
          : "hover:bg-slate-50"
      }`}
      title={`${formatFullDate(day.date)} · ${formatNumber(value)} ${theme.label.toLowerCase()}`}
    >
      <span
        className={`mb-1 text-[8px] font-semibold tabular-nums transition-opacity ${
          value > 0
            ? "text-slate-500 opacity-100"
            : "text-slate-400 opacity-0 group-hover:opacity-100"
        }`}
      >
        {formatNumber(value)}
      </span>
      <span className="flex h-24 w-full items-end justify-center sm:h-32">
        <span
          className={`block w-[65%] min-w-1.5 max-w-5 rounded-t-md transition-all duration-300 ${
            value > 0
              ? `${theme.color} group-hover:brightness-110`
              : "bg-slate-100 group-hover:bg-slate-200"
          } ${selected ? "ring-2 ring-violet-200 ring-offset-1" : ""}`}
          style={{ height: `${height}%` }}
        />
      </span>
      <span
        className={`mt-1 grid h-5 min-w-5 place-items-center rounded-md px-0.5 text-[8px] font-semibold tabular-nums sm:text-[9px] ${
          isToday
            ? "bg-violet-600 text-white"
            : selected
              ? "bg-violet-100 text-violet-700"
              : "text-slate-500"
        }`}
      >
        {compactLabel}
      </span>
      {showDayName && (
        <span className="mt-0.5 text-[7px] uppercase text-slate-400 sm:text-[8px]">
          {formatDayName(day.date)}
        </span>
      )}
    </button>
  );
}

function PulseChart({
  days,
  metric,
  selectedDateKey,
  onSelectDate,
}) {
  const maximum = Math.max(
    1,
    ...days.map((day) => getDayMetric(day, metric)),
  );
  const todayKey = localDateKey(new Date());

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 sm:p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold text-slate-700">
            Daily activity
          </p>
          <p className="mt-0.5 text-[8px] text-slate-400">
            Select any bar to open that date in the calendar.
          </p>
        </div>
        <MetricLegend metric={metric} />
      </div>
      {days.length ? (
        <div
          className="flex min-h-36 items-stretch gap-0.5 overflow-x-auto pb-1 sm:gap-1"
          role="group"
          aria-label="Daily report activity chart"
        >
          {days.map((day) => (
            <DayBar
              key={day.key}
              day={day}
              metric={metric}
              maximum={maximum}
              selected={selectedDateKey === day.key}
              onSelectDate={onSelectDate}
              isToday={todayKey === day.key}
            />
          ))}
        </div>
      ) : (
        <div className="grid min-h-36 place-items-center text-center text-[10px] text-slate-400">
          No activity data for this period.
        </div>
      )}
      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[8px] text-slate-400">
        <span>{days[0] ? formatCompactDate(days[0].date) : ""}</span>
        <span>{days.length} daily buckets</span>
        <span>{days.at(-1) ? formatCompactDate(days.at(-1).date) : ""}</span>
      </div>
    </div>
  );
}

function ActivityInsight({ days, total, peak, metric }) {
  const activeDays = days.filter((day) => getDayMetric(day, metric) > 0).length;
  const quietDays = days.length - activeDays;
  const average = activeDays ? (total / activeDays).toFixed(1) : "0";
  const peakDay = days.find((day) => getDayMetric(day, metric) === peak && peak);
  const theme = getMetricTheme(metric);

  const message = !total
    ? `No ${theme.label.toLowerCase()} activity in this range.`
    : peakDay
      ? `${formatNumber(peak)} ${
          metric === "all" ? "reports" : theme.label.toLowerCase()
        } on ${formatFullDate(peakDay.date)} was the highest daily count.`
      : "Daily activity is ready to explore.";

  return (
    <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/70 to-white p-3">
      <div className="flex items-start gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-violet-700 shadow-sm">
          <Sparkles size={13} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-slate-700">
            Activity insight
          </p>
          <p className="mt-1 text-[9px] leading-5 text-slate-500">{message}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-violet-100 pt-2.5">
        <div>
          <p className="text-[8px] font-medium text-slate-400">Active days</p>
          <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-800">
            {formatNumber(activeDays)}
          </p>
        </div>
        <div>
          <p className="text-[8px] font-medium text-slate-400">Quiet days</p>
          <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-800">
            {formatNumber(quietDays)}
          </p>
        </div>
        <div>
          <p className="text-[8px] font-medium text-slate-400">
            Avg. active day
          </p>
          <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-800">
            {average}
          </p>
        </div>
      </div>
    </div>
  );
}

function RangeComparison({
  currentDays,
  previousDays,
  metric,
  rangeDays,
}) {
  const currentTotal = getSeriesTotal(currentDays, metric);
  const previousTotal = getSeriesTotal(previousDays, metric);
  const difference = currentTotal - previousTotal;
  const percentChange = getPercentChange(currentTotal, previousTotal);
  const changeTone =
    difference > 0
      ? "text-emerald-700"
      : difference < 0
        ? "text-amber-700"
        : "text-slate-600";
  const ChangeIcon =
    difference > 0
      ? ArrowUpRight
      : difference < 0
        ? ArrowDownRight
        : Minus;
  const percentageLabel =
    percentChange === null
      ? currentTotal > 0
        ? "New activity"
        : "No change"
      : `${percentChange > 0 ? "+" : ""}${percentChange}%`;

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-[10px] font-semibold text-slate-700">
            Compared with previous {rangeDays} days
          </h4>
          <p className="mt-0.5 text-[8px] text-slate-400">
            Same-length period immediately before this one
          </p>
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${changeTone}`}>
          <ChangeIcon size={11} aria-hidden="true" />
          {percentageLabel}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-violet-50/70 px-2.5 py-2">
          <p className="text-[8px] font-medium text-slate-500">Current range</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
            {formatNumber(currentTotal)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-2.5 py-2">
          <p className="text-[8px] font-medium text-slate-500">Previous range</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
            {formatNumber(previousTotal)}
          </p>
        </div>
      </div>
      <p className="mt-2 text-[8px] leading-4 text-slate-400">
        {difference === 0
          ? "Activity count is unchanged from the previous period."
          : `${difference > 0 ? "Up" : "Down"} ${formatNumber(
              Math.abs(difference),
            )} ${
              Math.abs(difference) === 1 ? "report" : "reports"
            } compared with the previous period.`}
      </p>
    </section>
  );
}

function PulseHeader({ rangeDays, onRangeChange, metric, onMetricChange }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700">
          <BarChart3 size={13} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-[10px] font-semibold text-slate-800">
            Recent activity pulse
          </h3>
          <p className="mt-0.5 truncate text-[8px] text-slate-400">
            Daily report volume and movement
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <RangeSelector value={rangeDays} onChange={onRangeChange} />
        <MetricSelector value={metric} onChange={onMetricChange} />
      </div>
    </div>
  );
}

function PulseFooter({ rangeDays, firstDay, lastDay, total }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-1 pt-2">
      <p className="text-[8px] leading-4 text-slate-400">
        {firstDay && lastDay
          ? `${formatFullDate(firstDay)} – ${formatFullDate(lastDay)}`
          : "Date range unavailable"}
      </p>
      <span className="inline-flex items-center gap-1 text-[8px] font-medium text-slate-500">
        <Clock3 size={9} aria-hidden="true" />
        {formatNumber(total)} reports in {rangeDays} days
      </span>
    </div>
  );
}

function RangeEmptyState({ rangeDays, onShowAll, hasAnyEntries }) {
  return (
    <div className="grid min-h-44 place-items-center rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
      <div>
        <span className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-slate-50 text-slate-400">
          <CalendarDays size={15} aria-hidden="true" />
        </span>
        <p className="mt-2 text-[10px] font-semibold text-slate-700">
          No activity in the past {rangeDays} days
        </p>
        <p className="mt-1 text-[8px] leading-4 text-slate-400">
          {hasAnyEntries
            ? "There are older reports outside the selected date range."
            : "Reports will appear here after they are loaded into the dashboard."}
        </p>
        {hasAnyEntries && rangeDays !== 90 && (
          <button
            type="button"
            onClick={onShowAll}
            className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[9px] font-semibold text-violet-700 hover:bg-violet-50"
          >
            View last 90 days
            <ArrowRight size={10} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

function PulseHelp({ expanded, onToggle }) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
      >
        <span className="text-[8px] font-semibold text-slate-500">
          How this pulse is calculated
        </span>
        <ChevronDown
          size={11}
          className={`text-slate-400 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <p className="border-t border-slate-100 px-2.5 py-2 text-[8px] leading-4 text-slate-500">
          Daily buckets follow your local timezone and include only reports
          loaded into the dashboard with a valid timestamp. The comparison uses
          an immediately preceding period of equal length. These summaries are
          calculated in your browser and do not alter report data.
        </p>
      )}
    </div>
  );
}

function FocusSummary({
  days,
  metric,
  selectedKey,
  onSelectDate,
  onOpenReport,
}) {
  const selectedDay = days.find((day) => day.key === selectedKey);
  const metricValue = getDayMetric(selectedDay, metric);
  const reports = selectedDay?.reports || [];
  const theme = getMetricTheme(metric);

  if (!selectedDay) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-[8px] text-slate-500">
        <CalendarDays size={11} className="text-slate-400" aria-hidden="true" />
        Select a date to view its report count.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-100 bg-white px-2.5 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${theme.color} text-white`}>
          <CalendarDays size={11} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[8px] font-semibold text-slate-700">
            {formatFullDate(selectedDay.date)}
          </span>
          <span className="mt-0.5 block text-[8px] text-slate-400">
            {formatNumber(metricValue)} {theme.label.toLowerCase()}
          </span>
        </span>
      </div>
      {reports.length > 0 && (
        <button
          type="button"
          onClick={() => onSelectDate?.(selectedDay.key)}
          className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[8px] font-semibold text-violet-700 hover:bg-violet-50"
        >
          Open calendar date
          <ArrowRight size={10} aria-hidden="true" />
        </button>
      )}
      {reports.length > 0 && (
        <ul className="w-full space-y-1 border-t border-slate-100 pt-2">
          {reports.slice(0, 4).map((entry) => {
            const report = entry.report;
            const reportId = report?._id ?? report?.id;
            const title =
              typeof report?.title === "string" && report.title.trim()
                ? report.title.trim()
                : typeof report?.summary === "string" && report.summary.trim()
                  ? report.summary.trim()
                  : "Untitled report";
            const status = report?.status === "Closed" ? "Resolved" : "Open";

            return (
              <li key={String(reportId ?? `${entry.date.getTime()}-${title}`)}>
                <button
                  type="button"
                  onClick={() => onOpenReport?.(report)}
                  className="flex w-full min-w-0 items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <span className="truncate text-[9px] font-medium text-slate-700">
                    {title}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${
                      status === "Resolved"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-violet-50 text-violet-700"
                    }`}
                  >
                    {status}
                  </span>
                </button>
              </li>
            );
          })}
          {reports.length > 4 && (
            <li className="px-2 pt-0.5 text-[8px] text-slate-400">
              {formatNumber(reports.length - 4)} more reports on this date
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function PeakMarker({ days, metric, peak }) {
  const peakDays = days.filter(
    (day) => getDayMetric(day, metric) === peak && peak > 0,
  );

  if (!peakDays.length) return null;

  return (
    <span className="inline-flex items-center gap-1 text-[8px] text-slate-400">
      <Flame size={10} className="text-rose-500" aria-hidden="true" />
      Peak on{" "}
      {peakDays
        .slice(0, 2)
        .map((day) => formatCompactDate(day.date))
        .join(", ")}
      {peakDays.length > 2 && ` +${peakDays.length - 2}`}
    </span>
  );
}

function SummaryGrid({ days, previousDays }) {
  const total = getSeriesTotal(days, "all");
  const open = getSeriesTotal(days, "open");
  const resolved = getSeriesTotal(days, "resolved");
  const high = getSeriesTotal(days, "high");
  const previousTotal = getSeriesTotal(previousDays, "all");
  const resolvedPercent = total ? Math.round((resolved / total) * 100) : 0;
  const openPercent = total ? Math.round((open / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      <PulseStat
        icon={Layers3}
        label="Total reports"
        value={formatNumber(total)}
        detail={`Previous period: ${formatNumber(previousTotal)}`}
        tone="bg-violet-50 text-violet-700"
      />
      <PulseStat
        icon={CircleDashed}
        label="Still open"
        value={formatNumber(open)}
        detail={`${openPercent}% of reports in range`}
        tone="bg-amber-50 text-amber-700"
      />
      <PulseStat
        icon={CheckCircle2}
        label="Resolved"
        value={formatNumber(resolved)}
        detail={`${resolvedPercent}% of reports in range`}
        tone="bg-emerald-50 text-emerald-700"
      />
      <PulseStat
        icon={ShieldAlert}
        label="High severity"
        value={formatNumber(high)}
        detail={`${formatNumber(
          days.filter((day) => day.high > 0).length,
        )} days with high-severity reports`}
        tone="bg-rose-50 text-rose-700"
      />
    </div>
  );
}

export default function ReportActivityPulse({
  entries = [],
  selectedDateKey = "",
  onSelectDate,
  onOpenReport,
}) {
  const [rangeDays, setRangeDays] = useState(14);
  const [metric, setMetric] = useState("all");
  const [showHelp, setShowHelp] = useState(false);
  const today = new Date();
  const allEntries = useMemo(
    () => entries.filter((entry) => getEntryDate(entry)),
    [entries],
  );
  const dailySeries = useMemo(
    () => buildDailySeries(allEntries, rangeDays, today),
    [allEntries, rangeDays, today.toDateString()],
  );
  const previousSeries = useMemo(
    () => buildPreviousSeries(allEntries, rangeDays, today),
    [allEntries, rangeDays, today.toDateString()],
  );
  const total = getSeriesTotal(dailySeries, metric);
  const previousTotal = getSeriesTotal(previousSeries, metric);
  const peak = getSeriesPeak(dailySeries, metric);
  const average = getAveragePerActiveDay(dailySeries, metric);
  const metricTheme = getMetricTheme(metric);
  const selectedDay =
    dailySeries.find((day) => day.key === selectedDateKey) || null;
  const hasOlderEntries = allEntries.some(
    (entry) =>
      entry.date.getTime() <
      startOfDay(dailySeries[0]?.date || today).getTime(),
  );
  const rangeLabel = getRelativePeriodLabel(rangeDays);

  const handleRangeChange = (nextRange) => {
    setRangeDays(nextRange);
  };

  const handleSelectMetric = (nextMetric) => {
    setMetric(nextMetric);
  };

  const handleSelectDate = (dateKey) => {
    onSelectDate?.(dateKey);
  };

  return (
    <section
      aria-labelledby="report-activity-pulse-heading"
      className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 sm:p-3"
    >
      <PulseHeader
        rangeDays={rangeDays}
        onRangeChange={handleRangeChange}
        metric={metric}
        onMetricChange={handleSelectMetric}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3
            id="report-activity-pulse-heading"
            className="truncate text-[9px] font-semibold text-slate-700"
          >
            {formatRangeLabel(dailySeries)}
          </h3>
          <p className="mt-0.5 text-[8px] text-slate-400">
            Tracking {metricTheme.label.toLowerCase()} in the {rangeLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeakMarker days={dailySeries} metric={metric} peak={peak} />
          <span className="inline-flex items-center gap-1 text-[8px] font-semibold text-slate-500">
            <Gauge size={10} aria-hidden="true" />
            {average} per active day
          </span>
        </div>
      </div>

      <SummaryGrid days={dailySeries} previousDays={previousSeries} />
      <div className="grid gap-2 xl:grid-cols-[minmax(0,1.35fr)_minmax(220px,0.65fr)]">
        <div className="space-y-2">
          <PulseChart
            days={dailySeries}
            metric={metric}
            selectedDateKey={selectedDateKey}
            onSelectDate={handleSelectDate}
          />
          <FocusSummary
            days={dailySeries}
            metric={metric}
            selectedKey={selectedDay?.key}
            onSelectDate={handleSelectDate}
            onOpenReport={onOpenReport}
          />
        </div>
        <div className="space-y-2">
          <ActivityInsight
            days={dailySeries}
            total={total}
            peak={peak}
            metric={metric}
          />
          <RangeComparison
            currentDays={dailySeries}
            previousDays={previousSeries}
            metric={metric}
            rangeDays={rangeDays}
          />
          <DayOfWeekSummary days={dailySeries} metric={metric} />
          <WeekendWeekdayComparison days={dailySeries} metric={metric} />
        </div>
      </div>

      {total === 0 && (
        <RangeEmptyState
          rangeDays={rangeDays}
          hasAnyEntries={allEntries.length > 0 || hasOlderEntries}
          onShowAll={() => setRangeDays(90)}
        />
      )}

      <PulseFooter
        rangeDays={rangeDays}
        firstDay={dailySeries[0]?.date}
        lastDay={dailySeries.at(-1)?.date}
        total={total}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[8px] text-slate-400">
          <Clock3 size={9} aria-hidden="true" />
          Dates use local time
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => downloadPulseCsv(dailySeries, metric, rangeDays)}
            disabled={dailySeries.length === 0}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[8px] font-semibold text-slate-500 hover:bg-white hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={10} aria-hidden="true" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setShowHelp((current) => !current)}
            aria-expanded={showHelp}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[8px] font-semibold text-slate-500 hover:bg-white hover:text-violet-700"
          >
            How it works
            <ChevronDown
              size={10}
              className={`transition-transform ${showHelp ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
      {showHelp && <PulseHelp expanded onToggle={() => setShowHelp(false)} />}
    </section>
  );
}
