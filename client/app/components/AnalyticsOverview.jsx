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

function getActivityDays(reports, numberOfDays) {
  const today = new Date();
  const days = [];

  for (let offset = numberOfDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);

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
  loading = false,
  days = 7,
  onRangeChange,
  previousTotal = 0,
}) {
  const maxCount = Math.max(1, ...data.map((day) => day.count || 0));

  const total = data.reduce((sum, day) => sum + (day.count || 0), 0);
  const activeDays = data.filter((day) => day.count > 0).length;
  const averagePerDay = data.length ? total / data.length : 0;
  const periodChange =
    previousTotal > 0
      ? ((total - previousTotal) / previousTotal) * 100
      : null;
  const [exportError, setExportError] = useState("");

  const exportActivity = () => {
    let downloadUrl = "";

    try {
      const csvRows = [
        ["Date", "New reports"],
        ...data.map((day) => [day.key || day.day, day.count || 0]),
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
                onClick={() => onRangeChange(range)}
                aria-pressed={days === range}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
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
        role="img"
        aria-label={`${formatCount(total)} reports across ${activeDays} active days in the last ${days} days.`}
      >
        {data.map((day, index) => {
          const count = day.count || 0;

          const height = count > 0 ? Math.max(26, (count / maxCount) * 100) : 8;

          return (
            <div
              key={`${day.key || day.day}-${index}`}
              className="flex min-w-0 flex-col items-center"
            >
              <span className="mb-2 text-[11px] font-semibold tabular-nums text-slate-500">
                {count}
              </span>

              <div className="flex h-32 w-full max-w-12 items-end justify-center rounded-full bg-[#f6f5fa] p-1.5">
                <div
                  className={`relative w-full rounded-full transition-all duration-300 ${
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

              <span className="mt-2 truncate text-[11px] font-medium text-slate-400">
                {day.day}
              </span>
            </div>
          );
        })}
      </div>
      ) : (
        <div className="mt-6 flex h-36 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
          Activity data will appear when reports are available.
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

const QUALITY_PAGE_SIZE = 6;

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

function MetricQualityPanel({ reports = [] }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [showDefinitions, setShowDefinitions] = useState(false);
  const [visibleCount, setVisibleCount] = useState(QUALITY_PAGE_SIZE);
  const quality = useMemo(() => analyzeReportQuality(reports), [reports]);
  const normalizedQuery = query.trim().toLowerCase();

  const visibleFindings = useMemo(
    () =>
      quality.findings
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
    [activeFilter, normalizedQuery, quality.findings],
  );

  const pageFindings = visibleFindings.slice(0, visibleCount);
  const totalFindings = quality.findings.length;
  const hasFindings = totalFindings > 0;

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
        <button
          type="button"
          onClick={() => setShowDefinitions((visible) => !visible)}
          aria-expanded={showDefinitions}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-violet-200 hover:text-violet-700"
        >
          {showDefinitions ? "Hide metric rules" : "View metric rules"}
        </button>
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
        </div>

        <div
          className="mt-4 flex gap-2 overflow-x-auto pb-2"
          aria-label="Filter findings by metric"
        >
          {QUALITY_FILTERS.map((filter) => {
            const count =
              filter.value === "all"
                ? totalFindings
                : quality.counts[filter.value] || 0;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setActiveFilter(filter.value);
                  setVisibleCount(QUALITY_PAGE_SIZE);
                }}
                aria-pressed={activeFilter === filter.value}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  activeFilter === filter.value
                    ? "bg-violet-700 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700"
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
                ? "Try another metric category or clear the search."
                : "The current report records pass the checks in this panel."}
            </p>
            {(activeFilter !== "all" || query) && (
              <button
                type="button"
                onClick={() => {
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
  const activity = useMemo(
    () =>
      activityDays === 7 && weeklyActivity.length
        ? weeklyActivity
        : getActivityDays(reports, activityDays),
    [activityDays, reports, weeklyActivity],
  );
  const previousPeriodTotal = useMemo(() => {
    const periodStart = new Date();
    periodStart.setHours(0, 0, 0, 0);
    periodStart.setDate(periodStart.getDate() - activityDays);
    const previousStart = new Date(periodStart);
    previousStart.setDate(previousStart.getDate() - activityDays);

    return reports.filter((report) => {
      const date = getDate(report.createdAt || report.created_at);
      return date && date >= previousStart && date < periodStart;
    }).length;
  }, [activityDays, reports]);

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
      <div className="flex items-end justify-between gap-2">
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

        <span className="text-xs text-slate-400">
          {loading ? "Refreshing..." : "Live dashboard data"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      <MetricQualityPanel reports={reports} />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <WeeklyActivityChart
            data={activity}
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

export { MetricQualityPanel };