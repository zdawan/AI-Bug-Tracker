"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock3,
  FileSearch,
  Flame,
  Layers3,
  MoveRight,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

const DAYS_IN_WEEK = 7;
const MAX_VISIBLE_REPORTS = 6;

function isValidDate(value) {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function getLocalDateKey(date) {
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
  const date = new Date(year, month - 1, day);

  return getLocalDateKey(date) === value ? date : null;
}

function startOfWeek(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (result.getDay() + 6) % DAYS_IN_WEEK;
  result.setDate(result.getDate() - mondayOffset);
  return result;
}

function addDays(date, amount) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + amount);
  return result;
}

function getWeekDays(anchorDate) {
  const monday = startOfWeek(anchorDate);

  return Array.from({ length: DAYS_IN_WEEK }, (_, index) => {
    const date = addDays(monday, index);
    return {
      date,
      key: getLocalDateKey(date),
      isToday: getLocalDateKey(date) === getLocalDateKey(new Date()),
    };
  });
}

function formatWeekRange(days) {
  if (!days.length) return "";

  const first = days[0].date;
  const last = days[days.length - 1].date;
  const firstMonth = first.toLocaleDateString("en-IN", { month: "short" });
  const lastMonth = last.toLocaleDateString("en-IN", { month: "short" });
  const firstYear = first.getFullYear();
  const lastYear = last.getFullYear();

  if (firstYear !== lastYear) {
    return `${first.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })} – ${last.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  }

  if (firstMonth !== lastMonth) {
    return `${first.getDate()} ${firstMonth} – ${last.getDate()} ${lastMonth} ${lastYear}`;
  }

  return `${first.getDate()} – ${last.getDate()} ${lastMonth} ${lastYear}`;
}

function formatFullDate(date) {
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDayName(date) {
  return date.toLocaleDateString("en-IN", { weekday: "short" });
}

function formatMonthDay(date) {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function formatReportTime(date) {
  if (!isValidDate(date)) return "Time unavailable";

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function getReportTitle(report) {
  if (typeof report?.title === "string" && report.title.trim()) {
    return report.title.trim();
  }

  if (typeof report?.summary === "string" && report.summary.trim()) {
    return report.summary.trim();
  }

  return "Untitled report";
}

function getReportId(report) {
  return String(report?._id || report?.id || getReportTitle(report));
}

function getReportStatus(report) {
  return report?.status === "Closed" ? "Closed" : "Open";
}

function getReportSeverity(report) {
  return typeof report?.severity === "string" && report.severity.trim()
    ? report.severity.trim()
    : "Unspecified";
}

function getReportCategory(report) {
  return typeof report?.category === "string" && report.category.trim()
    ? report.category.trim()
    : "Uncategorized";
}

function getStatusStyle(report) {
  return getReportStatus(report) === "Closed"
    ? {
        label: "Resolved",
        surface: "bg-emerald-50",
        foreground: "text-emerald-700",
        border: "border-emerald-200",
        icon: CheckCircle2,
      }
    : {
        label: "Open",
        surface: "bg-violet-50",
        foreground: "text-violet-700",
        border: "border-violet-200",
        icon: CircleDashed,
      };
}

function getSeverityStyle(report) {
  const severity = getReportSeverity(report);

  if (severity === "High") {
    return {
      foreground: "text-rose-700",
      surface: "bg-rose-50",
      border: "border-rose-200",
      dot: "bg-rose-500",
    };
  }

  if (severity === "Medium") {
    return {
      foreground: "text-amber-700",
      surface: "bg-amber-50",
      border: "border-amber-200",
      dot: "bg-amber-500",
    };
  }

  if (severity === "Low") {
    return {
      foreground: "text-sky-700",
      surface: "bg-sky-50",
      border: "border-sky-200",
      dot: "bg-sky-500",
    };
  }

  return {
    foreground: "text-slate-600",
    surface: "bg-slate-50",
    border: "border-slate-200",
    dot: "bg-slate-400",
  };
}

function groupEntriesByDay(entries) {
  const grouped = new Map();

  entries.forEach((entry) => {
    if (!entry || !entry.dateKey || !isValidDate(entry.date)) return;
    const items = grouped.get(entry.dateKey) || [];
    items.push(entry);
    grouped.set(entry.dateKey, items);
  });

  grouped.forEach((items) => {
    items.sort((left, right) => right.date.getTime() - left.date.getTime());
  });

  return grouped;
}

function getWeekEntries(entries, days) {
  const keys = new Set(days.map((day) => day.key));

  return entries
    .filter((entry) => keys.has(entry.dateKey))
    .sort((left, right) => left.date.getTime() - right.date.getTime());
}

function getWeekStatistics(entries) {
  const byDay = new Map();
  let open = 0;
  let resolved = 0;
  let highSeverity = 0;
  let latest = null;

  entries.forEach((entry) => {
    const count = byDay.get(entry.dateKey) || 0;
    byDay.set(entry.dateKey, count + 1);

    if (getReportStatus(entry.report) === "Closed") {
      resolved += 1;
    } else {
      open += 1;
    }

    if (getReportSeverity(entry.report) === "High") {
      highSeverity += 1;
    }

    if (!latest || entry.date.getTime() > latest.getTime()) {
      latest = entry.date;
    }
  });

  let busiestCount = 0;
  let activeDays = 0;

  byDay.forEach((count) => {
    activeDays += 1;
    busiestCount = Math.max(busiestCount, count);
  });

  return {
    total: entries.length,
    open,
    resolved,
    highSeverity,
    activeDays,
    busiestCount,
    latest,
  };
}

function DaySummaryTile({ label, value, detail, icon: Icon, tone }) {
  return (
    <article className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm shadow-slate-200/20">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone}`}>
        <Icon size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-medium text-slate-500">
          {label}
        </span>
        <span className="mt-0.5 block text-base font-semibold leading-5 text-slate-900 tabular-nums">
          {value}
        </span>
        <span className="mt-0.5 block truncate text-[10px] text-slate-400">
          {detail}
        </span>
      </span>
    </article>
  );
}

function WeekNavigation({
  weekDays,
  selectedKey,
  onMoveWeek,
  onGoToToday,
  onJumpToDate,
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="inline-flex items-center gap-1 self-start rounded-xl border border-slate-200 bg-white p-1 shadow-sm shadow-slate-200/20">
        <button
          type="button"
          onClick={() => onMoveWeek(-1)}
          aria-label="Previous week"
          className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <ArrowLeft size={15} aria-hidden="true" />
        </button>
        <p
          aria-live="polite"
          className="min-w-36 px-2 text-center text-xs font-semibold text-slate-800 sm:min-w-48 sm:text-sm"
        >
          {formatWeekRange(weekDays)}
        </p>
        <button
          type="button"
          onClick={() => onMoveWeek(1)}
          aria-label="Next week"
          className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onGoToToday}
          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
        >
          This week
        </button>
        <label className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 transition hover:border-violet-200 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100">
          <CalendarDays
            size={13}
            className="shrink-0 text-slate-400"
            aria-hidden="true"
          />
          <span className="sr-only">Jump to a date in another week</span>
          <input
            type="date"
            value={selectedKey}
            onChange={(event) => onJumpToDate(event.target.value)}
            aria-label="Jump to a date in another week"
            className="w-[116px] bg-transparent text-xs font-medium text-slate-700 outline-none"
          />
        </label>
      </div>
    </div>
  );
}

function WeekSummary({ statistics }) {
  const resolutionRate = statistics.total
    ? Math.round((statistics.resolved / statistics.total) * 100)
    : 0;

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <DaySummaryTile
        label="Reports this week"
        value={formatNumber(statistics.total)}
        detail={`${statistics.activeDays} active ${
          statistics.activeDays === 1 ? "day" : "days"
        }`}
        icon={Layers3}
        tone="bg-violet-50 text-violet-700"
      />
      <DaySummaryTile
        label="Still open"
        value={formatNumber(statistics.open)}
        detail="Awaiting resolution"
        icon={CircleDashed}
        tone="bg-amber-50 text-amber-700"
      />
      <DaySummaryTile
        label="Resolved"
        value={formatNumber(statistics.resolved)}
        detail={`${resolutionRate}% of this week's reports`}
        icon={CheckCircle2}
        tone="bg-emerald-50 text-emerald-700"
      />
      <DaySummaryTile
        label="High severity"
        value={formatNumber(statistics.highSeverity)}
        detail={
          statistics.busiestCount
            ? `${statistics.busiestCount} on the busiest day`
            : "No report activity"
        }
        icon={Flame}
        tone="bg-rose-50 text-rose-700"
      />
    </div>
  );
}

function WeekDayCard({
  day,
  entries,
  selected,
  onSelect,
  busiestCount,
  onKeyDown,
  isLatestReportDay,
}) {
  const count = entries.length;
  const openCount = entries.filter(
    (entry) => getReportStatus(entry.report) === "Open",
  ).length;
  const resolvedCount = count - openCount;
  const highCount = entries.filter(
    (entry) => getReportSeverity(entry.report) === "High",
  ).length;
  const intensity =
    count === 0
      ? "bg-slate-100"
      : count === busiestCount
        ? "bg-violet-500"
        : count >= Math.ceil(busiestCount / 2)
          ? "bg-violet-300"
          : "bg-violet-200";

  return (
    <button
      type="button"
      data-week-day={day.key}
      onClick={() => onSelect(day)}
      onKeyDown={(event) => onKeyDown(event, day)}
      aria-pressed={selected}
      aria-label={`${formatFullDate(day.date)}, ${count} ${
        count === 1 ? "report" : "reports"
      }${isLatestReportDay ? ", latest report date" : ""}`}
      className={`group flex min-h-40 flex-col rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:min-h-44 sm:p-4 ${
        selected
          ? "border-violet-400 bg-violet-50 shadow-sm shadow-violet-900/[0.05]"
          : "border-slate-200/80 bg-white hover:border-violet-200 hover:bg-violet-50/40"
      }`}
    >
      <span className="flex w-full items-start justify-between gap-2">
        <span>
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {formatDayName(day.date)}
          </span>
          <span
            className={`mt-1 grid h-8 w-8 place-items-center rounded-xl text-sm font-bold tabular-nums ${
              selected
                ? "bg-violet-600 text-white"
                : day.isToday
                  ? "bg-white text-violet-700 ring-1 ring-violet-300"
                  : "bg-slate-100 text-slate-800 group-hover:bg-white"
            }`}
          >
            {day.date.getDate()}
          </span>
        </span>
        {(day.isToday || isLatestReportDay) && (
          <span className="flex flex-wrap justify-end gap-1">
            {day.isToday && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-700">
                Today
              </span>
            )}
            {isLatestReportDay && (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-700">
                Latest
              </span>
            )}
          </span>
        )}
      </span>

      <span className="mt-3 flex items-baseline gap-1.5">
        <span className="text-xl font-semibold leading-none text-slate-900 tabular-nums">
          {formatNumber(count)}
        </span>
        <span className="text-[10px] text-slate-500">
          {count === 1 ? "report" : "reports"}
        </span>
      </span>

      <span className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <span
          className={`h-full rounded-full transition-[width] ${intensity}`}
          style={{
            width: `${busiestCount ? (count / busiestCount) * 100 : 0}%`,
          }}
        />
      </span>

      <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-3 text-[9px] font-medium text-slate-500 sm:text-[10px]">
        <span className="inline-flex items-center gap-1">
          <CircleDashed size={10} className="text-violet-500" aria-hidden="true" />
          {formatNumber(openCount)} open
        </span>
        <span className="inline-flex items-center gap-1">
          <CheckCircle2
            size={10}
            className="text-emerald-500"
            aria-hidden="true"
          />
          {formatNumber(resolvedCount)} resolved
        </span>
        {highCount > 0 && (
          <span className="inline-flex items-center gap-1 text-rose-600">
            <ShieldAlert size={10} aria-hidden="true" />
            {formatNumber(highCount)} high
          </span>
        )}
      </span>
    </button>
  );
}

function WeekDayStrip({
  days,
  entriesByDay,
  selectedKey,
  onSelectDay,
  busiestCount,
  onDayKeyDown,
  latestReportKey,
}) {
  return (
    <div
      role="group"
      aria-label="Days in the selected week"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7"
    >
      {days.map((day) => (
        <WeekDayCard
          key={day.key}
          day={day}
          entries={entriesByDay.get(day.key) || []}
          selected={day.key === selectedKey}
          onSelect={onSelectDay}
          busiestCount={busiestCount}
          onKeyDown={onDayKeyDown}
          isLatestReportDay={day.key === latestReportKey}
        />
      ))}
    </div>
  );
}

function TimeBand({ entries }) {
  const buckets = [
    { id: "morning", label: "Morning", start: 5, end: 12 },
    { id: "afternoon", label: "Afternoon", start: 12, end: 17 },
    { id: "evening", label: "Evening", start: 17, end: 21 },
    { id: "night", label: "Night", start: 21, end: 29 },
  ];
  const counts = buckets.map((bucket) => ({
    ...bucket,
    count: entries.filter(({ date }) => {
      const hour = date.getHours();
      if (bucket.id === "night") return hour >= bucket.start || hour < 5;
      return hour >= bucket.start && hour < bucket.end % 24;
    }).length,
  }));
  const maximum = Math.max(1, ...counts.map((bucket) => bucket.count));

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold text-slate-800">
            Activity by time of day
          </h3>
          <p className="mt-1 text-[10px] text-slate-500">
            Based on the report timestamps in your local time zone.
          </p>
        </div>
        <Clock3 size={15} className="text-violet-600" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {counts.map((bucket) => (
          <div
            key={bucket.id}
            className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-medium text-slate-500">
                {bucket.label}
              </span>
              <span className="text-xs font-semibold tabular-nums text-slate-800">
                {formatNumber(bucket.count)}
              </span>
            </div>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-white"
              role="progressbar"
              aria-label={`${bucket.count} reports in the ${bucket.label.toLowerCase()}`}
              aria-valuenow={bucket.count}
              aria-valuemin={0}
              aria-valuemax={maximum}
            >
              <div
                className="h-full rounded-full bg-violet-400 transition-[width]"
                style={{ width: `${(bucket.count / maximum) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportListItem({ entry, onOpenReport }) {
  const status = getStatusStyle(entry.report);
  const StatusIcon = status.icon;
  const severity = getSeverityStyle(entry.report);

  return (
    <article className="group rounded-xl border border-slate-200/80 bg-white p-3 transition hover:border-violet-200 hover:shadow-sm sm:p-3.5">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${status.surface} ${status.foreground}`}
        >
          <StatusIcon size={16} aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-900 sm:text-sm">
              {getReportTitle(entry.report)}
            </h4>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${severity.border} ${severity.surface} ${severity.foreground}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${severity.dot}`}
                aria-hidden="true"
              />
              {getReportSeverity(entry.report)}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock3 size={11} aria-hidden="true" />
              {formatReportTime(entry.date)}
            </span>
            <span className="max-w-40 truncate">
              {getReportCategory(entry.report)}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${status.border} ${status.surface} ${status.foreground}`}
            >
              {status.label}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenReport?.(entry.report)}
          aria-label={`Open report: ${getReportTitle(entry.report)}`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <MoveRight size={15} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function QuietDay({ date, hasWeekActivity, onSelectToday }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-7 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-50 text-slate-400">
        {hasWeekActivity ? (
          <FileSearch size={19} aria-hidden="true" />
        ) : (
          <CalendarDays size={19} aria-hidden="true" />
        )}
      </span>
      <h3 className="mt-3 text-xs font-semibold text-slate-800">
        {hasWeekActivity ? "No reports on this day" : "No report activity this week"}
      </h3>
      <p className="mt-1 max-w-xs text-[10px] leading-5 text-slate-500">
        {hasWeekActivity
          ? `There are reports on other days between ${formatMonthDay(
              startOfWeek(date),
            )} and ${formatMonthDay(addDays(startOfWeek(date), 6))}.`
          : "Try another week or clear the calendar filters to see more activity."}
      </p>
      <button
        type="button"
        onClick={onSelectToday}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-50"
      >
        <CalendarDays size={12} aria-hidden="true" />
        Go to this week
      </button>
    </div>
  );
}

function SelectedDayPanel({
  date,
  entries,
  hasWeekActivity,
  onOpenReport,
  onGoToToday,
}) {
  const [showAll, setShowAll] = useState(false);
  const visibleEntries = showAll
    ? entries
    : entries.slice(0, MAX_VISIBLE_REPORTS);
  const openCount = entries.filter(
    ({ report }) => getReportStatus(report) === "Open",
  ).length;
  const resolvedCount = entries.length - openCount;
  const highCount = entries.filter(
    ({ report }) => getReportSeverity(report) === "High",
  ).length;

  return (
    <section
      aria-labelledby="week-selected-day-heading"
      className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 sm:p-4"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-violet-600">
            Selected day
          </p>
          <h3
            id="week-selected-day-heading"
            className="mt-1 truncate text-sm font-semibold text-slate-900"
          >
            {formatFullDate(date)}
          </h3>
          <p className="mt-1 text-[10px] text-slate-500">
            {formatNumber(entries.length)}{" "}
            {entries.length === 1 ? "report" : "reports"} on this day
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {entries.length > MAX_VISIBLE_REPORTS && (
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-100"
            >
              {showAll
                ? "Show fewer"
                : `Show all ${formatNumber(entries.length)}`}
            </button>
          )}
          {entries.length > 0 && (
            <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-500">
              {formatNumber(openCount)} open · {formatNumber(resolvedCount)}{" "}
              resolved · {formatNumber(highCount)} high
            </span>
          )}
        </div>
      </div>

      {visibleEntries.length ? (
        <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
          {visibleEntries.map((entry) => (
            <ReportListItem
              key={getReportId(entry.report)}
              entry={entry}
              onOpenReport={onOpenReport}
            />
          ))}
          {entries.length > MAX_VISIBLE_REPORTS && (
            <p className="px-1 pt-1 text-center text-[10px] text-slate-400">
              {formatNumber(entries.length - visibleEntries.length)} more{" "}
              {entries.length - visibleEntries.length === 1
                ? "report"
                : "reports"}{" "}
              {showAll ? "shown" : "available"}
            </p>
          )}
        </div>
      ) : (
        <QuietDay
          date={date}
          hasWeekActivity={hasWeekActivity}
          onSelectToday={onGoToToday}
        />
      )}
    </section>
  );
}

function WeekInsights({ statistics, weekEntries }) {
  const busiestEntries = useMemo(() => {
    if (!weekEntries.length || !statistics.busiestCount) return [];

    const counts = new Map();
    weekEntries.forEach(({ dateKey }) => {
      counts.set(dateKey, (counts.get(dateKey) || 0) + 1);
    });

    return [...counts.entries()]
      .filter(([, count]) => count === statistics.busiestCount)
      .map(([key]) => parseLocalDateKey(key))
      .filter(Boolean);
  }, [statistics.busiestCount, weekEntries]);

  if (!weekEntries.length) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-400">
          <Sparkles size={14} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[11px] font-semibold text-slate-700">
            Weekly insight
          </p>
          <p className="mt-1 text-[10px] leading-5 text-slate-500">
            No reports match this week and your current filters. Try another
            week or adjust the filters above.
          </p>
        </div>
      </div>
    );
  }

  const newest = statistics.latest;
  const busiestLabel = busiestEntries
    .map((date) => formatMonthDay(date))
    .join(", ");

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <article className="flex items-start gap-2.5 rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white p-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-violet-700 shadow-sm">
          <ArrowDownRight size={14} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-700">
            Busiest day
          </p>
          <p className="mt-1 truncate text-[10px] leading-5 text-slate-500">
            {formatNumber(statistics.busiestCount)}{" "}
            {statistics.busiestCount === 1 ? "report" : "reports"} on{" "}
            {busiestLabel}.
          </p>
        </div>
      </article>

      <article className="flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-500">
          <Clock3 size={14} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-700">
            Latest activity
          </p>
          <p className="mt-1 truncate text-[10px] leading-5 text-slate-500">
            {newest
              ? `${formatFullDate(newest)} at ${formatReportTime(newest)}`
              : "No activity recorded"}
          </p>
        </div>
      </article>
    </div>
  );
}

function WeekLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-medium text-slate-500">
      <span className="inline-flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
        Open
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Resolved
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        High severity
      </span>
    </div>
  );
}

function WeekViewHeader({ range, reportCount }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-50 text-violet-700">
            <CalendarDays size={15} aria-hidden="true" />
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-violet-700">
            Week at a glance
          </span>
        </div>
        <h3 className="mt-2 text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
          {range}
        </h3>
        <p className="mt-1 text-[10px] text-slate-500">
          {formatNumber(reportCount)} matching{" "}
          {reportCount === 1 ? "report" : "reports"} across these dates.
        </p>
      </div>
      <WeekLegend />
    </div>
  );
}

function WeekViewHelp({ expanded, onToggle }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <span className="text-[10px] font-semibold text-slate-600">
          How this view works
        </span>
        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <p className="border-t border-slate-100 px-3 py-2.5 text-[10px] leading-5 text-slate-500">
          The week starts on Monday and follows your local timezone. Counts
          respect the active status, severity, and search filters. Selecting a
          day shows its matching reports; use the arrow keys while focused on a
          day card to move between dates.
        </p>
      )}
    </div>
  );
}

function WeekEmptyState({ onGoToToday }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-400">
        <CalendarDays size={20} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-slate-800">
        Nothing to show for this week
      </h3>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
        No reports match these dates and filters. Browse to another week or
        return to the current week.
      </p>
      <button
        type="button"
        onClick={onGoToToday}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
      >
        <CalendarDays size={14} aria-hidden="true" />
        Go to this week
      </button>
    </div>
  );
}

export default function ReportCalendarWeekView({
  anchorDate,
  selectedKey,
  entries = [],
  latestReportKey,
  onSelectDate,
  onOpenReport,
  onGoToToday,
}) {
  const [showHelp, setShowHelp] = useState(false);
  const safeAnchorDate = isValidDate(anchorDate) ? anchorDate : new Date();
  const weekDays = useMemo(
    () => getWeekDays(safeAnchorDate),
    [
      safeAnchorDate.getFullYear(),
      safeAnchorDate.getMonth(),
      safeAnchorDate.getDate(),
    ],
  );
  const weekEntries = useMemo(
    () => getWeekEntries(entries, weekDays),
    [entries, weekDays],
  );
  const entriesByDay = useMemo(
    () => groupEntriesByDay(weekEntries),
    [weekEntries],
  );
  const statistics = useMemo(
    () => getWeekStatistics(weekEntries),
    [weekEntries],
  );
  const selectedDate =
    parseLocalDateKey(selectedKey) ||
    weekDays.find((day) => day.isToday)?.date ||
    weekDays[0].date;
  const activeKey = weekDays.some((day) => day.key === selectedKey)
    ? selectedKey
    : getLocalDateKey(selectedDate);
  const selectedEntries = entriesByDay.get(activeKey) || [];
  const weekHasActivity = weekEntries.length > 0;

  const selectDate = (date) => {
    onSelectDate?.(getLocalDateKey(date));
  };

  const moveWeek = (amount) => {
    const nextAnchor = addDays(weekDays[0].date, amount * DAYS_IN_WEEK);
    selectDate(nextAnchor);
  };

  const jumpToDate = (dateKey) => {
    const date = parseLocalDateKey(dateKey);
    if (date) selectDate(date);
  };

  const handleDayKeyDown = (event, day) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }

    const offsetByKey = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const offset = offsetByKey[event.key];
    if (!offset) return;

    event.preventDefault();
    const nextDate = addDays(day.date, offset);
    selectDate(nextDate);
    const nextKey = getLocalDateKey(nextDate);

    window.requestAnimationFrame(() => {
      const target = document.querySelector(
        `[data-week-day="${nextKey}"]`,
      );
      if (target instanceof HTMLElement) target.focus();
    });
  };

  const dayCards = weekDays.map((day) => ({
    ...day,
    entries: entriesByDay.get(day.key) || [],
  }));

  const busiestCount = Math.max(
    1,
    ...dayCards.map((day) => day.entries.length),
  );

  return (
    <section
      aria-labelledby="calendar-week-view-heading"
      className="space-y-4"
    >
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-violet-50/70 via-white to-indigo-50/50 p-3 sm:p-4">
        <WeekNavigation
          weekDays={weekDays}
          selectedKey={activeKey}
          onMoveWeek={moveWeek}
          onGoToToday={onGoToToday}
          onJumpToDate={jumpToDate}
        />
      </div>

      <WeekViewHeader
        range={formatWeekRange(weekDays)}
        reportCount={weekEntries.length}
      />

      {weekEntries.length > 0 ? (
        <>
          <WeekSummary statistics={statistics} />
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 px-1">
              <h3
                id="calendar-week-view-heading"
                className="text-xs font-semibold text-slate-800"
              >
                Daily activity
              </h3>
              <span className="text-[9px] text-slate-400">
                Select a day to inspect reports
              </span>
            </div>
            <WeekDayStrip
              days={weekDays}
              entriesByDay={entriesByDay}
              selectedKey={activeKey}
              onSelectDay={(day) => selectDate(day.date)}
              busiestCount={busiestCount}
              onDayKeyDown={handleDayKeyDown}
              latestReportKey={latestReportKey}
            />
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
            <SelectedDayPanel
              date={selectedDate}
              entries={selectedEntries}
              hasWeekActivity={weekHasActivity}
              onOpenReport={onOpenReport}
              onGoToToday={onGoToToday}
            />
            <div className="space-y-3">
              <TimeBand entries={weekEntries} />
              <WeekInsights
                statistics={statistics}
                weekEntries={weekEntries}
              />
            </div>
          </div>
        </>
      ) : (
        <WeekEmptyState onGoToToday={onGoToToday} />
      )}

      <WeekViewHelp
        expanded={showHelp}
        onToggle={() => setShowHelp((current) => !current)}
      />

      {weekEntries.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-2.5">
          <p className="text-[10px] leading-5 text-violet-800">
            Week totals update automatically when you change the filters above.
          </p>
          <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-violet-700">
            <Sparkles size={11} aria-hidden="true" />
            Local activity view
          </span>
        </div>
      )}

      <div className="sr-only" aria-live="polite">
        Showing {formatNumber(weekEntries.length)} reports for the week of{" "}
        {formatFullDate(weekDays[0].date)}.
      </div>

      {weekEntries.length > 0 && selectedEntries.length === 0 && (
        <p className="sr-only">
          This selected date has no matching reports. Choose another day in the
          week.
        </p>
      )}
    </section>
  );
}
