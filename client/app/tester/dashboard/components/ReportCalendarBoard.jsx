"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock3,
  Download,
  FileSearch,
  Filter,
  Layers3,
  List,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import ReportCalendarWeekView from "./ReportCalendarWeekView";

const MAX_DAY_REPORTS = 8;
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STATUS_OPTIONS = ["All statuses", "Open", "Closed"];
const SEVERITY_OPTIONS = ["All severity", "High", "Medium", "Low"];

function isValidDate(date) {
  return date instanceof Date && Number.isFinite(date.getTime());
}

function getLocalDateKey(date) {
  if (!isValidDate(date)) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseReportDate(report) {
  const value = report?.createdAt || report?.created_at;
  if (!value) return null;

  const date = new Date(value);
  return isValidDate(date) ? date : null;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayOffset);
  return result;
}

function addDays(date, amount) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + amount);
  return result;
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatMonth(date) {
  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
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

function formatTime(date) {
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function getTitle(report) {
  if (typeof report?.title === "string" && report.title.trim()) {
    return report.title.trim();
  }

  if (typeof report?.summary === "string" && report.summary.trim()) {
    return report.summary.trim();
  }

  return "Untitled report";
}

function getIdentifier(report) {
  return String(report?._id || report?.id || getTitle(report));
}

function getSeverity(report) {
  const severity = typeof report?.severity === "string"
    ? report.severity.trim()
    : "";
  return severity || "Unspecified";
}

function getStatus(report) {
  return report?.status === "Closed" ? "Closed" : "Open";
}

function escapeCsvCell(value) {
  const normalized = String(value ?? "").replace(/\r\n?/g, "\n");
  const safeValue = /^[\s]*[=+\-@]/.test(normalized)
    ? `'${normalized}`
    : normalized;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

function downloadMonthCsv(entries, month) {
  const headers = [
    "Report ID",
    "Title",
    "Category",
    "Severity",
    "Status",
    "Reported at",
  ];
  const rows = entries.map(({ report, date }) => [
    getIdentifier(report),
    getTitle(report),
    report?.category || "Uncategorized",
    getSeverity(report),
    getStatus(report),
    date.toISOString(),
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
  link.download = `report-activity-${month.getFullYear()}-${String(
    month.getMonth() + 1,
  ).padStart(2, "0")}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

function getSeverityTone(severity) {
  if (severity === "High") {
    return {
      label: "High",
      badge: "border-rose-200 bg-rose-50 text-rose-700",
      dot: "bg-rose-500",
      icon: ShieldAlert,
    };
  }

  if (severity === "Medium") {
    return {
      label: "Medium",
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      dot: "bg-amber-500",
      icon: ShieldAlert,
    };
  }

  if (severity === "Low") {
    return {
      label: "Low",
      badge: "border-sky-200 bg-sky-50 text-sky-700",
      dot: "bg-sky-500",
      icon: CircleDashed,
    };
  }

  return {
    label: severity,
    badge: "border-slate-200 bg-slate-50 text-slate-600",
    dot: "bg-slate-400",
    icon: CircleDashed,
  };
}

function getStatusTone(status) {
  return status === "Closed"
    ? {
        label: "Resolved",
        badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
        icon: CheckCircle2,
      }
    : {
        label: "Open",
        badge: "border-violet-200 bg-violet-50 text-violet-700",
        icon: CircleDashed,
      };
}

function matchesFilters(report, statusFilter, severityFilter, query) {
  if (statusFilter !== "All statuses" && getStatus(report) !== statusFilter) {
    return false;
  }

  if (
    severityFilter !== "All severity" &&
    getSeverity(report) !== severityFilter
  ) {
    return false;
  }

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [
    getTitle(report),
    report?.category,
    report?.description,
    report?.severity,
    report?.status,
    report?._id,
    report?.id,
  ]
    .filter((value) => typeof value === "string" || typeof value === "number")
    .some((value) => String(value).toLowerCase().includes(normalizedQuery));
}

function buildCalendarDays(month) {
  const firstDay = startOfWeek(startOfMonth(month));

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(firstDay, index);
    return {
      date,
      key: getLocalDateKey(date),
      inMonth: date.getMonth() === month.getMonth(),
      isToday: getLocalDateKey(date) === getLocalDateKey(new Date()),
    };
  });
}

function buildInitialSelection() {
  return getLocalDateKey(new Date());
}

function getDayIntensity(count, maximum) {
  if (!count) return "border-slate-100 bg-white";

  const ratio = count / Math.max(maximum, 1);
  if (ratio >= 0.75) return "border-violet-200 bg-violet-100";
  if (ratio >= 0.45) return "border-violet-100 bg-violet-50";
  return "border-slate-100 bg-slate-50";
}

function StatTile({ label, value, detail, icon: Icon, tone }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-3.5 py-3 shadow-sm shadow-slate-200/20 sm:px-4">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}
      >
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-medium text-slate-500">
          {label}
        </span>
        <span className="mt-0.5 block text-lg font-semibold leading-5 text-slate-900 tabular-nums">
          {value}
        </span>
        <span className="mt-0.5 block truncate text-[10px] text-slate-400">
          {detail}
        </span>
      </span>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="relative inline-flex min-w-0 items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 max-w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-9 text-xs font-medium text-slate-700 outline-none transition hover:border-violet-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 text-slate-400"
        aria-hidden="true"
      />
    </label>
  );
}

function ReportCard({ report, onOpenReport, compact = false }) {
  const reportDate = parseReportDate(report);
  const severity = getSeverityTone(getSeverity(report));
  const status = getStatusTone(getStatus(report));
  const SeverityIcon = severity.icon;
  const StatusIcon = status.icon;
  const category =
    typeof report?.category === "string" && report.category.trim()
      ? report.category.trim()
      : "Uncategorized";

  return (
    <article
      className={`group rounded-2xl border border-slate-200/80 bg-white transition hover:border-violet-200 hover:shadow-md hover:shadow-violet-900/[0.04] ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
            getStatus(report) === "Closed"
              ? "bg-emerald-50 text-emerald-600"
              : "bg-violet-50 text-violet-600"
          }`}
        >
          <StatusIcon size={16} aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
              {getTitle(report)}
            </h4>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${severity.badge}`}
            >
              <SeverityIcon size={11} aria-hidden="true" />
              {severity.label}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Layers3 size={12} aria-hidden="true" />
              <span className="max-w-40 truncate">{category}</span>
            </span>
            {reportDate && (
              <span className="inline-flex items-center gap-1">
                <Clock3 size={12} aria-hidden="true" />
                {formatTime(reportDate)}
              </span>
            )}
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.badge}`}
            >
              {status.label}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenReport?.(report)}
          aria-label={`Open report: ${getTitle(report)}`}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function EmptyDay({ hasReportsInMonth, onClearFilters }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-8 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <FileSearch size={20} aria-hidden="true" />
      </span>
      <h4 className="mt-4 text-sm font-semibold text-slate-800">
        {hasReportsInMonth ? "No reports match this day" : "No report activity yet"}
      </h4>
      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
        {hasReportsInMonth
          ? "Choose another date or clear the current filters to see more reports."
          : "Use the month controls to explore a different period of report activity."}
      </p>
      {hasReportsInMonth && (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
        >
          <X size={13} aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );
}

function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-medium text-slate-500">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-violet-500" />
        Report activity
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-rose-500" />
        High severity
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Resolved
      </span>
    </div>
  );
}

function CalendarDayButton({
  day,
  reports,
  selected,
  onSelect,
  maximumCount,
  latestReportKey,
}) {
  const dayReports = reports.get(day.key) || [];
  const count = dayReports.length;
  const highCount = dayReports.filter(
    (report) => getSeverity(report) === "High",
  ).length;
  const closedCount = dayReports.filter(
    (report) => getStatus(report) === "Closed",
  ).length;
  const isLatestReportDay = day.key === latestReportKey;
  const hasActivity = count > 0;
  const intensity = getDayIntensity(count, maximumCount);

  return (
    <button
      type="button"
      data-calendar-day
      onClick={() => onSelect(day)}
      aria-pressed={selected}
      aria-label={`${formatFullDate(day.date)}${count ? `, ${count} reports` : ", no reports"}${isLatestReportDay ? ", latest report date" : ""}`}
      className={`relative flex min-h-[72px] flex-col items-center justify-start rounded-xl border px-1.5 py-2 text-center transition focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:min-h-[86px] sm:items-start sm:px-2.5 ${
        day.inMonth ? intensity : "border-slate-100 bg-slate-50/40 text-slate-300"
      } ${
        selected
          ? "z-[1] border-violet-500 bg-violet-50 ring-2 ring-violet-200"
          : "hover:border-violet-200 hover:bg-violet-50/60"
      }`}
    >
      {isLatestReportDay && (
        <span
          title="Latest report date"
          className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-violet-600 text-white shadow-sm sm:right-2 sm:top-2"
        >
          <Sparkles size={11} aria-hidden="true" />
          <span className="sr-only">Latest report date</span>
        </span>
      )}
      <span
        className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-semibold tabular-nums ${
          selected
            ? "bg-violet-600 text-white"
            : day.isToday
              ? "bg-white text-violet-700 ring-1 ring-violet-300"
              : day.inMonth
                ? "text-slate-700"
                : "text-slate-300"
        }`}
      >
        {day.date.getDate()}
      </span>

      <span className="mt-1.5 hidden w-full items-center gap-1 sm:flex">
        {hasActivity ? (
          <>
            <span className="h-1.5 flex-1 rounded-full bg-violet-400" />
            {highCount > 0 && (
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            )}
            {closedCount > 0 && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
          </>
        ) : (
          <span className="h-1.5 w-full rounded-full bg-transparent" />
        )}
      </span>

      <span
        className={`mt-1 text-[9px] font-semibold tabular-nums sm:mt-1.5 sm:text-[10px] ${
          count ? "text-violet-700" : "text-transparent"
        }`}
      >
        {count ? `${formatNumber(count)} ${count === 1 ? "report" : "reports"}` : "No reports"}
      </span>
    </button>
  );
}

function CalendarGrid({
  days,
  reportsByDate,
  selectedKey,
  onSelectDay,
  maximumCount,
  latestReportKey,
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-2.5 sm:p-4">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAY_LABELS.map((weekday) => (
          <div
            key={weekday}
            className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:pb-2 sm:text-[11px]"
          >
            <span className="sm:hidden">{weekday.slice(0, 1)}</span>
            <span className="hidden sm:inline">{weekday}</span>
          </div>
        ))}

        {days.map((day) => (
          <CalendarDayButton
            key={day.key}
            day={day}
            reports={reportsByDate}
            selected={selectedKey === day.key}
            onSelect={onSelectDay}
            maximumCount={maximumCount}
            latestReportKey={latestReportKey}
          />
        ))}
      </div>
    </div>
  );
}

function AgendaList({
  days,
  reportsByDate,
  onSelectDay,
  selectedKey,
  onOpenReport,
}) {
  const activeDays = days
    .map((day) => ({
      ...day,
      reports: reportsByDate.get(day.key) || [],
    }))
    .filter((day) => day.inMonth && day.reports.length > 0)
    .sort((left, right) => right.date.getTime() - left.date.getTime());

  if (activeDays.length === 0) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-8 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm">
          <CalendarDays size={20} aria-hidden="true" />
        </span>
        <p className="mt-4 text-sm font-semibold text-slate-800">
          No reports in this month
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Try another month or adjust the filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activeDays.map((day) => (
        <section
          key={day.key}
          aria-label={formatFullDate(day.date)}
          className={`rounded-2xl border p-3 transition sm:p-4 ${
            selectedKey === day.key
              ? "border-violet-200 bg-violet-50/30"
              : "border-slate-200/80 bg-white"
          }`}
        >
          <button
            type="button"
            onClick={() => onSelectDay(day)}
            className="mb-3 flex w-full items-center justify-between gap-3 text-left"
          >
            <span>
              <span className="block text-xs font-semibold text-slate-900">
                {formatFullDate(day.date)}
              </span>
              <span className="mt-0.5 block text-[10px] text-slate-500">
                {formatNumber(day.reports.length)}{" "}
                {day.reports.length === 1 ? "report" : "reports"}
              </span>
            </span>
            <ArrowRight
              size={15}
              className="shrink-0 text-slate-400"
              aria-hidden="true"
            />
          </button>
          <div className="space-y-2">
            {day.reports.slice(0, MAX_DAY_REPORTS).map((report) => (
              <ReportCard
                key={getIdentifier(report)}
                report={report}
                onOpenReport={onOpenReport}
                compact
              />
            ))}
            {day.reports.length > MAX_DAY_REPORTS && (
              <p className="px-1 pt-1 text-[11px] font-medium text-slate-500">
                {formatNumber(day.reports.length - MAX_DAY_REPORTS)} more
                {day.reports.length - MAX_DAY_REPORTS === 1
                  ? " report"
                  : " reports"}{" "}
                — choose this day to browse them.
              </p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function SelectedDayPanel({
  date,
  reports,
  allMonthReports,
  onOpenReport,
  onClearFilters,
  showAll,
  onToggleShowAll,
}) {
  const visibleReports = showAll
    ? reports
    : reports.slice(0, MAX_DAY_REPORTS);
  const hasMonthReports = allMonthReports.length > 0;
  const openCount = reports.filter(
    (report) => getStatus(report) === "Open",
  ).length;
  const resolvedCount = reports.length - openCount;
  const highSeverityCount = reports.filter(
    (report) => getSeverity(report) === "High",
  ).length;

  return (
    <section
      aria-labelledby="report-calendar-day-heading"
      className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 sm:p-4"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-600">
            Selected day
          </p>
          <h3
            id="report-calendar-day-heading"
            className="mt-1 truncate text-sm font-semibold text-slate-900"
          >
            {formatFullDate(date)}
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">
            {formatNumber(reports.length)} matching{" "}
            {reports.length === 1 ? "report" : "reports"}
          </p>
        </div>
        {reports.length > MAX_DAY_REPORTS && (
          <button
            type="button"
            onClick={onToggleShowAll}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100"
          >
            {showAll ? "Show fewer" : `Show all ${formatNumber(reports.length)}`}
          </button>
        )}
      </div>

      {reports.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-violet-100 bg-white px-2.5 py-2">
            <p className="text-[10px] font-medium text-slate-500">Open</p>
            <p className="mt-1 text-sm font-semibold text-violet-700 tabular-nums">
              {formatNumber(openCount)}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white px-2.5 py-2">
            <p className="text-[10px] font-medium text-slate-500">Resolved</p>
            <p className="mt-1 text-sm font-semibold text-emerald-700 tabular-nums">
              {formatNumber(resolvedCount)}
            </p>
          </div>
          <div className="rounded-xl border border-rose-100 bg-white px-2.5 py-2">
            <p className="text-[10px] font-medium text-slate-500">
              High severity
            </p>
            <p className="mt-1 text-sm font-semibold text-rose-700 tabular-nums">
              {formatNumber(highSeverityCount)}
            </p>
          </div>
        </div>
      )}

      {visibleReports.length ? (
        <div className="max-h-[540px] space-y-2 overflow-y-auto pr-1">
          {visibleReports.map((report) => (
            <ReportCard
              key={getIdentifier(report)}
              report={report}
              onOpenReport={onOpenReport}
            />
          ))}
        </div>
      ) : (
        <EmptyDay
          hasReportsInMonth={hasMonthReports}
          onClearFilters={onClearFilters}
        />
      )}
    </section>
  );
}

function MonthControls({
  month,
  selectedKey,
  canExport,
  onExport,
  onChangeMonth,
  onSelectDate,
  onGoToToday,
  onGoToLatest,
  hasLatestReport,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm shadow-slate-200/20">
        <button
          type="button"
          onClick={() => onChangeMonth(-1)}
          aria-label="Previous month"
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <ArrowLeft size={15} aria-hidden="true" />
        </button>
        <span
          aria-live="polite"
          className="min-w-32 px-2 text-center text-xs font-semibold text-slate-800 sm:min-w-36 sm:text-sm"
        >
          {formatMonth(month)}
        </span>
        <button
          type="button"
          onClick={() => onChangeMonth(1)}
          aria-label="Next month"
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        onClick={onGoToToday}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
      >
        Today
      </button>

      <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-violet-200 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100">
        <CalendarDays size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
        <span className="sr-only">Jump to date</span>
        <input
          type="date"
          value={selectedKey}
          onChange={(event) => onSelectDate(event.target.value)}
          aria-label="Jump to date"
          className="w-[116px] bg-transparent text-xs font-medium text-slate-700 outline-none"
        />
      </label>

      {hasLatestReport && (
        <button
          type="button"
          onClick={onGoToLatest}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
        >
          Latest activity
        </button>
      )}
      <button
        type="button"
        onClick={onExport}
        disabled={!canExport}
        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Download size={14} aria-hidden="true" />
        Export month
      </button>
    </div>
  );
}

function ViewToggle({ view, onChange }) {
  return (
    <div
      role="group"
      aria-label="Calendar display"
      className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1"
    >
      <button
        type="button"
        aria-pressed={view === "calendar"}
        onClick={() => onChange("calendar")}
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition ${
          view === "calendar"
            ? "bg-violet-600 text-white shadow-sm"
            : "text-slate-500 hover:bg-slate-100"
        }`}
      >
        <CalendarDays size={13} aria-hidden="true" />
        Calendar
      </button>
      <button
        type="button"
        aria-pressed={view === "agenda"}
        onClick={() => onChange("agenda")}
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition ${
          view === "agenda"
            ? "bg-violet-600 text-white shadow-sm"
            : "text-slate-500 hover:bg-slate-100"
        }`}
      >
        <List size={13} aria-hidden="true" />
        Agenda
      </button>
      <button
        type="button"
        aria-pressed={view === "week"}
        onClick={() => onChange("week")}
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition ${
          view === "week"
            ? "bg-violet-600 text-white shadow-sm"
            : "text-slate-500 hover:bg-slate-100"
        }`}
      >
        <CalendarRange size={13} aria-hidden="true" />
        Week
      </button>
    </div>
  );
}

function SearchBox({ value, onChange }) {
  return (
    <label className="relative min-w-0 flex-1">
      <span className="sr-only">Search reports</span>
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
        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear report search"
          className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={13} aria-hidden="true" />
        </button>
      )}
    </label>
  );
}

function CalendarToolbar({
  statusFilter,
  onStatusChange,
  severityFilter,
  onSeverityChange,
  query,
  onQueryChange,
  onClearFilters,
  hasFilters,
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-2.5 sm:flex-row sm:flex-wrap sm:items-center">
      <span className="inline-flex items-center gap-1.5 px-1 text-[11px] font-semibold text-slate-500">
        <Filter size={13} aria-hidden="true" />
        Filter activity
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Filter by report status"
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={onStatusChange}
        />
        <FilterSelect
          label="Filter by report severity"
          value={severityFilter}
          options={SEVERITY_OPTIONS}
          onChange={onSeverityChange}
        />
      </div>
      <SearchBox value={query} onChange={onQueryChange} />
      {hasFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold text-slate-500 transition hover:bg-white hover:text-violet-700"
        >
          <X size={13} aria-hidden="true" />
          Reset
        </button>
      )}
    </div>
  );
}

export default function ReportCalendarBoard({
  reports = [],
  onOpenReport,
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedKey, setSelectedKey] = useState(buildInitialSelection);
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [severityFilter, setSeverityFilter] = useState("All severity");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("calendar");
  const [showAllSelectedDay, setShowAllSelectedDay] = useState(false);

  const normalizedReports = useMemo(() => {
    if (!Array.isArray(reports)) return [];

    return reports
      .map((report) => ({
        report,
        date: parseReportDate(report),
      }))
      .filter(({ date }) => date !== null)
      .map(({ report, date }) => ({
        report,
        date,
        dateKey: getLocalDateKey(date),
      }));
  }, [reports]);

  const filteredReports = useMemo(
    () =>
      normalizedReports.filter(({ report }) =>
        matchesFilters(report, statusFilter, severityFilter, query),
      ),
    [normalizedReports, statusFilter, severityFilter, query],
  );

  const monthStartKey = getLocalDateKey(startOfMonth(month));
  const monthEndKey = getLocalDateKey(
    new Date(month.getFullYear(), month.getMonth() + 1, 0),
  );
  const monthEntries = useMemo(
    () =>
      filteredReports
        .filter(({ dateKey }) => dateKey >= monthStartKey && dateKey <= monthEndKey)
        .sort((left, right) => left.date.getTime() - right.date.getTime()),
    [filteredReports, monthStartKey, monthEndKey],
  );
  const reportsByDate = useMemo(() => {
    const map = new Map();

    monthEntries.forEach(({ report, dateKey }) => {
      const current = map.get(dateKey) || [];
      current.push(report);
      map.set(dateKey, current);
    });

    map.forEach((items) => {
      items.sort((left, right) => {
        const leftDate = parseReportDate(left)?.getTime() || 0;
        const rightDate = parseReportDate(right)?.getTime() || 0;
        return rightDate - leftDate;
      });
    });

    return map;
  }, [monthEntries]);
  const calendarDays = useMemo(() => buildCalendarDays(month), [month]);
  const maximumCount = useMemo(
    () =>
      Math.max(
        1,
        ...Array.from(reportsByDate.values(), (dayReports) => dayReports.length),
      ),
    [reportsByDate],
  );

  const selectedDate = useMemo(() => {
    const [year, monthNumber, day] = selectedKey.split("-").map(Number);
    const date = new Date(year, monthNumber - 1, day);
    return isValidDate(date) ? date : new Date();
  }, [selectedKey]);
  const selectedReports = reportsByDate.get(selectedKey) || [];
  const selectedDayEntries = monthEntries.filter(
    ({ dateKey }) => dateKey === selectedKey,
  );
  const busiestDay = useMemo(() => {
    let busiest = null;

    reportsByDate.forEach((dayReports, key) => {
      if (!busiest || dayReports.length > busiest.count) {
        const [year, monthNumber, day] = key.split("-").map(Number);
        busiest = {
          date: new Date(year, monthNumber - 1, day),
          count: dayReports.length,
        };
      }
    });

    return busiest;
  }, [reportsByDate]);
  const latestReportDate = useMemo(
    () =>
      normalizedReports.reduce((latest, entry) => {
        return !latest || entry.date.getTime() > latest.date.getTime()
          ? entry
          : latest;
      }, null),
    [normalizedReports],
  );
  const latestReportKey = latestReportDate?.dateKey || "";
  const hasFilters =
    statusFilter !== "All statuses" ||
    severityFilter !== "All severity" ||
    Boolean(query.trim());

  const changeMonth = (amount) => {
    const nextMonth = addMonths(month, amount);
    setMonth(nextMonth);
    setSelectedKey(
      getLocalDateKey(
        new Date(
          nextMonth.getFullYear(),
          nextMonth.getMonth(),
          Math.min(
            selectedDate.getDate(),
            new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate(),
          ),
        ),
      ),
    );
    setShowAllSelectedDay(false);
  };

  const selectDay = (day) => {
    setSelectedKey(day.key);

    if (!day.inMonth) {
      setMonth(startOfMonth(day.date));
    }

    setShowAllSelectedDay(false);
  };

  const goToToday = () => {
    const today = new Date();
    setMonth(startOfMonth(today));
    setSelectedKey(getLocalDateKey(today));
    setShowAllSelectedDay(false);
  };

  const goToDate = (dateKey) => {
    const [year, monthNumber, day] = dateKey.split("-").map(Number);
    const date = new Date(year, monthNumber - 1, day);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(dateKey) ||
      !isValidDate(date) ||
      getLocalDateKey(date) !== dateKey
    ) {
      return;
    }

    setMonth(startOfMonth(date));
    setSelectedKey(dateKey);
    setShowAllSelectedDay(false);
  };

  const goToLatest = () => {
    if (!latestReportDate) return;

    setMonth(startOfMonth(latestReportDate.date));
    setSelectedKey(latestReportDate.dateKey);
    setShowAllSelectedDay(false);
  };

  const exportMonth = () => {
    if (monthEntries.length > 0) {
      downloadMonthCsv(monthEntries, month);
    }
  };

  const clearFilters = () => {
    setStatusFilter("All statuses");
    setSeverityFilter("All severity");
    setQuery("");
  };

  const handleOpenReport = (report) => {
    onOpenReport?.(report);
  };

  const handleKeyboardNavigation = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (
      !(event.target instanceof Element) ||
      !event.target.closest("[data-calendar-day]")
    ) {
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
    const nextDate = addDays(selectedDate, offset);
    setSelectedKey(getLocalDateKey(nextDate));

    if (nextDate.getMonth() !== month.getMonth()) {
      setMonth(startOfMonth(nextDate));
    }

    setShowAllSelectedDay(false);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Escape" && query) {
      setQuery("");
      event.stopPropagation();
    }
  };

  const activeMonthCount = monthEntries.length;
  const selectedDateStatus = selectedDayEntries.length
    ? `${selectedDayEntries.length} reports recorded`
    : "No reports recorded";

  return (
    <section
      aria-labelledby="report-calendar-heading"
      onKeyDown={handleKeyboardNavigation}
      className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30"
    >
      <div className="border-b border-slate-100 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/50 p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-violet-700">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-sm shadow-violet-900/[0.04]">
                <CalendarDays size={17} aria-hidden="true" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em]">
                Activity explorer
              </span>
            </div>
            <h2
              id="report-calendar-heading"
              className="mt-3 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl"
            >
              Report calendar
            </h2>
            <p className="mt-1 max-w-lg text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
              Browse report activity by date, spot busy days, and jump straight
              into the issue you want to review.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <MonthControls
              month={month}
              selectedKey={selectedKey}
              canExport={monthEntries.length > 0}
              onExport={exportMonth}
              onChangeMonth={changeMonth}
              onSelectDate={goToDate}
              onGoToToday={goToToday}
              onGoToLatest={goToLatest}
              hasLatestReport={Boolean(latestReportDate)}
            />
            <ViewToggle view={view} onChange={setView} />
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <StatTile
            label="Reports this month"
            value={formatNumber(activeMonthCount)}
            detail={formatMonth(month)}
            icon={Layers3}
            tone="bg-violet-100 text-violet-700"
          />
          <StatTile
            label="Open this month"
            value={formatNumber(
              monthEntries.filter(({ report }) => getStatus(report) === "Open")
                .length,
            )}
            detail="Awaiting resolution"
            icon={CircleDashed}
            tone="bg-amber-100 text-amber-700"
          />
          <StatTile
            label="Highest activity"
            value={busiestDay ? formatNumber(busiestDay.count) : "—"}
            detail={
              busiestDay
                ? formatFullDate(busiestDay.date)
                : "No reports in this month"
            }
            icon={ArrowDownWideNarrow}
            tone="bg-rose-100 text-rose-700"
          />
        </div>
      </div>

      <div className="space-y-4 p-3 sm:p-5 lg:p-6">
        <CalendarToolbar
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          severityFilter={severityFilter}
          onSeverityChange={setSeverityFilter}
          query={query}
          onQueryChange={setQuery}
          onClearFilters={clearFilters}
          hasFilters={hasFilters}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800">
              {formatMonth(month)}
              <span className="ml-2 font-normal text-slate-500">
                {selectedDateStatus}
              </span>
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              Use the arrow keys to move between dates.
            </p>
          </div>
          <CalendarLegend />
        </div>

        {view === "week" && (
          <ReportCalendarWeekView
            anchorDate={selectedDate}
            selectedKey={selectedKey}
            entries={filteredReports}
            latestReportKey={latestReportKey}
            onSelectDate={goToDate}
            onOpenReport={handleOpenReport}
            onGoToToday={goToToday}
          />
        )}
        <div className={view === "week" ? "hidden" : "contents"}>
        {view === "calendar" ? (
          <>
            <CalendarGrid
              days={calendarDays}
              reportsByDate={reportsByDate}
              selectedKey={selectedKey}
              onSelectDay={selectDay}
              maximumCount={maximumCount}
              latestReportKey={latestReportKey}
            />
            <SelectedDayPanel
              date={selectedDate}
              reports={selectedReports}
              allMonthReports={monthEntries}
              onOpenReport={handleOpenReport}
              onClearFilters={clearFilters}
              showAll={showAllSelectedDay}
              onToggleShowAll={() =>
                setShowAllSelectedDay((current) => !current)
              }
            />
          </>
        ) : (
          <AgendaList
            days={calendarDays}
            reportsByDate={reportsByDate}
            onSelectDay={(day) => {
              selectDay(day);
              setView("calendar");
            }}
            selectedKey={selectedKey}
            onOpenReport={handleOpenReport}
          />
        )}
        </div>

        <div className={view === "week" ? "hidden" : "contents"}>
        {monthEntries.length === 0 && hasFilters && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">
            No reports in {formatMonth(month)} match these filters. Clear the
            filters or browse another month.
          </p>
        )}
        </div>
      </div>
    </section>
  );
}
