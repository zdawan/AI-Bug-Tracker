"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Download,
  Gauge,
  Layers3,
  Minus,
  ShieldAlert,
  Sparkles,
  UsersRound,
} from "lucide-react";

const DAY_MS = 86_400_000;
const DEFAULT_WINDOW = 30;
const PROJECTION_DAYS = [7, 14, 30, 60];
const WINDOW_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 60, label: "60 days" },
  { value: 90, label: "90 days" },
];
const CAPACITY_PRESETS = [
  { value: 0, label: "No capacity set" },
  { value: 1, label: "1 report/day" },
  { value: 3, label: "3 reports/day" },
  { value: 5, label: "5 reports/day" },
  { value: 10, label: "10 reports/day" },
];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CAPACITY = 50;

function isValidDate(date) {
  return date instanceof Date && Number.isFinite(date.getTime());
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return isValidDate(parsed) ? parsed : null;
}

function getReportDate(report) {
  return parseDate(report?.createdAt || report?.created_at);
}

function getReportId(report) {
  const value = report?._id ?? report?.id;
  return value === null || value === undefined ? "" : String(value).trim();
}

function getReportTitle(report) {
  const title =
    typeof report?.title === "string" ? report.title.trim() : "";
  const summary =
    typeof report?.summary === "string" ? report.summary.trim() : "";
  return title || summary || "Untitled report";
}

function getSeverity(report) {
  return typeof report?.severity === "string" && report.severity.trim()
    ? report.severity.trim()
    : "Unspecified";
}

function getCategory(report) {
  return typeof report?.category === "string" && report.category.trim()
    ? report.category.trim()
    : "Uncategorized";
}

function getAgeDays(report, now) {
  const date = getReportDate(report);
  if (!date) return null;
  return Math.max(0, Math.floor((now - date.getTime()) / DAY_MS));
}

function severityRank(report) {
  const severity = getSeverity(report).toLowerCase();
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  if (severity === "low") return 1;
  return 0;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, amount) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
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

function makeDailySeries(reports, days, now) {
  const today = startOfDay(now);
  const firstDay = addDays(today, -(days - 1));
  const result = Array.from({ length: days }, (_, index) => {
    const date = addDays(firstDay, index);
    return { date, key: dateKey(date), count: 0, reports: [] };
  });
  const byKey = new Map(result.map((entry) => [entry.key, entry]));

  reports.forEach((report) => {
    const date = getReportDate(report);
    if (!date) return;
    const day = byKey.get(dateKey(date));
    if (!day) return;
    day.count += 1;
    day.reports.push(report);
  });

  return result;
}

function averagePerCalendarDay(series) {
  if (!series.length) return 0;
  return series.reduce((sum, day) => sum + day.count, 0) / series.length;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function roundTo(value, digits = 1) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function formatNumber(value, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits,
    minimumFractionDigits:
      maximumFractionDigits && value % 1 !== 0 ? 1 : 0,
  }).format(value);
}

function formatDate(date, options = {}) {
  if (!isValidDate(date)) return "Date unavailable";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  });
}

function formatDay(date) {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function getConfidence(sampleDays, validReports) {
  if (validReports < 5 || sampleDays < 7) {
    return {
      label: "Limited",
      tone: "amber",
      detail: "A small sample makes this directional only.",
    };
  }
  if (validReports < 15 || sampleDays < 21) {
    return {
      label: "Moderate",
      tone: "sky",
      detail: "More history may shift the observed daily rate.",
    };
  }
  return {
    label: "Stronger sample",
    tone: "emerald",
    detail: "Based on a larger recent sample; still an estimate.",
  };
}

function estimateBacklog(openCount, intakeRate, capacity, days) {
  return Math.max(0, openCount + (intakeRate - capacity) * days);
}

function buildForecastRows({
  openCount,
  intakeRate,
  medianIntake,
  capacity,
}) {
  return PROJECTION_DAYS.map((days) => ({
    days,
    date: addDays(startOfDay(new Date()), days),
    expectedIntake: intakeRate * days,
    plannedReviews: capacity * days,
    baselineBacklog: estimateBacklog(openCount, intakeRate, 0, days),
    plannedBacklog: estimateBacklog(openCount, intakeRate, capacity, days),
    medianBacklog: estimateBacklog(openCount, medianIntake, capacity, days),
  }));
}

function downloadCsv(rows, metadata) {
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csvRows = [
    ["Report workload forecast"],
    ["Historical window (days)", metadata.window],
    ["Filtered reports", metadata.reportCount],
    ["Open reports", metadata.openCount],
    ["Observed intake per day", roundTo(metadata.intakeRate, 2)],
    ["Median daily intake", roundTo(metadata.medianIntake, 2)],
    ["Planning capacity per day", metadata.capacity],
    ["Scenario", metadata.scenario],
    [],
    [
      "Projection days",
      "Projection date",
      "Expected incoming reports",
      "Planned reviews",
      "Backlog at observed intake",
      "Backlog with planned capacity",
      "Backlog at median intake",
    ],
    ...rows.map((row) => [
      row.days,
      dateKey(row.date),
      roundTo(row.expectedIntake, 1),
      roundTo(row.plannedReviews, 1),
      Math.ceil(row.baselineBacklog),
      Math.ceil(row.plannedBacklog),
      Math.ceil(row.medianBacklog),
    ]),
  ];
  const content = `\uFEFF${csvRows
    .map((row) => row.map(escape).join(","))
    .join("\r\n")}`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `report-workload-forecast-${dateKey(new Date())}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SelectField({ label, value, options, onChange }) {
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
          size={13}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
      </span>
    </label>
  );
}

function MetricCard({ label, value, hint, icon: Icon, tone = "violet" }) {
  const tones = {
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    sky: "border-sky-100 bg-sky-50 text-sky-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
  };

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold leading-none tracking-tight text-slate-950 tabular-nums">
            {value}
          </p>
        </div>
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${tones[tone]}`}
        >
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-[10px] leading-4 text-slate-500">{hint}</p>
    </article>
  );
}

function IntakeChart({ series, average, medianValue }) {
  const width = 720;
  const height = 190;
  const pad = { top: 16, right: 12, bottom: 28, left: 32 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const maxValue = Math.max(
    1,
    ...series.map((entry) => entry.count),
    Math.ceil(average),
  );
  const points = series.map((entry, index) => {
    const x =
      pad.left +
      (series.length === 1 ? chartWidth / 2 : (index / (series.length - 1)) * chartWidth);
    const y =
      pad.top + chartHeight - (entry.count / maxValue) * chartHeight;
    return { ...entry, x, y };
  });
  const path = points
    .map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`)
    .join(" ");
  const averageY =
    pad.top + chartHeight - (average / maxValue) * chartHeight;
  const tickIndexes = Array.from(
    new Set([
      0,
      Math.floor((series.length - 1) / 3),
      Math.floor(((series.length - 1) * 2) / 3),
      series.length - 1,
    ]),
  );

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold text-slate-800">
            Daily report intake
          </h3>
          <p className="mt-1 text-[10px] text-slate-500">
            New reports per calendar day; zero-report days are included.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            Daily reports
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-3 border-t border-dashed border-sky-500" />
            Average {formatNumber(average, 1)}/day
          </span>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Daily intake chart. Average ${formatNumber(
            average,
            1,
          )} reports per day; median ${formatNumber(medianValue, 1)}.`}
          className="h-44 min-w-[560px] w-full"
        >
          {[0, 0.5, 1].map((fraction) => {
            const y = pad.top + chartHeight * fraction;
            const value = Math.round(maxValue * (1 - fraction));
            return (
              <g key={fraction}>
                <line
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray={fraction === 1 ? "0" : "3 5"}
                />
                <text
                  x={pad.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="9"
                >
                  {value}
                </text>
              </g>
            );
          })}
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={averageY}
            y2={averageY}
            stroke="#0ea5e9"
            strokeDasharray="5 5"
          />
          <path
            d={path}
            fill="none"
            stroke="#7c3aed"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((point) => (
            <circle
              key={point.key}
              cx={point.x}
              cy={point.y}
              r={point.count ? 3 : 1.5}
              fill={point.count ? "#7c3aed" : "#c4b5fd"}
            >
              <title>
                {formatDate(point.date)}: {point.count}{" "}
                {point.count === 1 ? "report" : "reports"}
              </title>
            </circle>
          ))}
          {tickIndexes.map((index) => {
            const point = points[index];
            if (!point) return null;
            return (
              <text
                key={point.key}
                x={point.x}
                y={height - 7}
                textAnchor={
                  index === 0
                    ? "start"
                    : index === points.length - 1
                      ? "end"
                      : "middle"
                }
                fill="#94a3b8"
                fontSize="9"
              >
                {formatDay(point.date)}
              </text>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
        <span>
          Peak:{" "}
          <strong className="text-slate-700">
            {formatNumber(Math.max(0, ...series.map((day) => day.count)))}
          </strong>{" "}
          reports in one day
        </span>
        <span>
          Median: <strong className="text-slate-700">{formatNumber(medianValue, 1)}</strong>{" "}
          per day
        </span>
      </div>
    </div>
  );
}

function ForecastChart({ rows, openCount }) {
  const width = 720;
  const height = 230;
  const pad = { top: 22, right: 16, bottom: 34, left: 42 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const values = rows.flatMap((row) => [
    row.baselineBacklog,
    row.plannedBacklog,
    row.medianBacklog,
  ]);
  const maxValue = Math.max(openCount, 1, ...values);
  const maximumDays = rows.at(-1)?.days || 1;
  const x = (days) => pad.left + (days / maximumDays) * chartWidth;
  const y = (value) =>
    pad.top + chartHeight - (value / maxValue) * chartHeight;
  const buildLine = (key, initial) => {
    const points = [
      { x: pad.left, y: y(initial) },
      ...rows.map((row) => ({
        x: x(row.days),
        y: y(row[key]),
      })),
    ];
    return points
      .map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`)
      .join(" ");
  };
  const baseline = buildLine("baselineBacklog", openCount);
  const planned = buildLine("plannedBacklog", openCount);
  const medianLine = buildLine("medianBacklog", openCount);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold text-slate-800">
            Scenario backlog projection
          </h3>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            Starts with {formatNumber(openCount)} currently open reports; assumes
            this intake rate and capacity continue.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-rose-500" />
            No reviews
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-emerald-500" />
            Planned capacity
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3 border-t border-dashed border-sky-500" />
            Median-intake scenario
          </span>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Estimated backlog under no-review, planned-capacity, and median-intake scenarios."
          className="h-52 min-w-[560px] w-full"
        >
          {[0, 0.5, 1].map((fraction) => {
            const value = maxValue * (1 - fraction);
            const gridY = pad.top + chartHeight * fraction;
            return (
              <g key={fraction}>
                <line
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={gridY}
                  y2={gridY}
                  stroke="#e2e8f0"
                  strokeDasharray={fraction ? "3 5" : "0"}
                />
                <text
                  x={pad.left - 8}
                  y={gridY + 3}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="9"
                >
                  {formatNumber(value)}
                </text>
              </g>
            );
          })}
          <path
            d={baseline}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d={medianLine}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="2"
            strokeDasharray="5 5"
          />
          <path
            d={planned}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx={pad.left} cy={y(openCount)} r="4" fill="#334155">
            <title>Current backlog: {formatNumber(openCount)}</title>
          </circle>
          {rows.map((row, index) => (
            <g key={row.days}>
              <circle
                cx={x(row.days)}
                cy={y(row.plannedBacklog)}
                r="3"
                fill="#10b981"
              >
                <title>
                  {row.days} days: {formatNumber(Math.ceil(row.plannedBacklog))}{" "}
                  planned backlog
                </title>
              </circle>
              <text
                x={x(row.days)}
                y={height - 9}
                textAnchor={
                  index === rows.length - 1 ? "end" : "middle"
                }
                fill="#94a3b8"
                fontSize="9"
              >
                +{row.days}d
              </text>
            </g>
          ))}
        </svg>
      </div>
      <p className="mt-1 text-[10px] leading-4 text-slate-500">
        This model counts review capacity as reports removed from the open
        backlog. It is a planning aid, not a prediction of actual resolution.
      </p>
    </div>
  );
}

function ProjectionTable({ rows, openCount, capacity }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4">
        <div>
          <h3 className="text-xs font-semibold text-slate-800">
            Planning checkpoints
          </h3>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            Baseline compares no daily review capacity against your scenario.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
          <Gauge size={12} aria-hidden="true" />
          {formatNumber(capacity)} reviews/day
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Horizon</th>
              <th className="px-4 py-3 font-semibold">Incoming estimate</th>
              <th className="px-4 py-3 font-semibold">No reviews</th>
              <th className="px-4 py-3 font-semibold">With capacity</th>
              <th className="px-4 py-3 font-semibold">Median intake</th>
              <th className="px-4 py-3 font-semibold">Scenario change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const difference = row.plannedBacklog - row.baselineBacklog;
              return (
                <tr
                  key={row.days}
                  className="border-t border-slate-100 text-[11px] text-slate-600"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">
                    {row.days} days
                    <span className="mt-0.5 block text-[9px] font-normal text-slate-400">
                      {formatDate(row.date)}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatNumber(row.expectedIntake, 1)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatNumber(Math.ceil(row.baselineBacklog))}
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-700 tabular-nums">
                    {formatNumber(Math.ceil(row.plannedBacklog))}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatNumber(Math.ceil(row.medianBacklog))}
                  </td>
                  <td className="px-4 py-3">
                    {difference < -0.5 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <ArrowDownRight size={12} aria-hidden="true" />
                        {formatNumber(Math.abs(Math.ceil(difference)))} fewer
                      </span>
                    ) : difference > 0.5 ? (
                      <span className="inline-flex items-center gap-1 text-rose-700">
                        <ArrowUpRight size={12} aria-hidden="true" />
                        {formatNumber(Math.ceil(difference))} more
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Minus size={12} aria-hidden="true" />
                        No difference
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <caption className="sr-only">
            Estimated report intake and open backlog at each forecast horizon,
            starting with {formatNumber(openCount)} currently open reports.
          </caption>
        </table>
      </div>
    </div>
  );
}

function WeekdayPattern({ reports }) {
  const counts = Array.from({ length: 7 }, () => 0);
  reports.forEach((report) => {
    const date = getReportDate(report);
    if (date) counts[date.getDay()] += 1;
  });
  const maxCount = Math.max(1, ...counts);
  const total = counts.reduce((sum, value) => sum + value, 0);
  const busiestIndex = counts.indexOf(Math.max(...counts));

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold text-slate-800">
            Intake by weekday
          </h3>
          <p className="mt-1 text-[10px] text-slate-500">
            Distribution within the selected history window.
          </p>
        </div>
        <CalendarDays size={15} className="text-violet-500" aria-hidden="true" />
      </div>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {counts.map((count, index) => (
          <div key={WEEKDAY_LABELS[index]} className="text-center">
            <p className="text-[9px] font-medium text-slate-400">
              {WEEKDAY_LABELS[index]}
            </p>
            <div className="mt-2 flex h-16 items-end justify-center">
              <div
                className={`w-full max-w-7 rounded-t-md transition-[height] ${
                  count && index === busiestIndex
                    ? "bg-violet-600"
                    : count
                      ? "bg-violet-300"
                      : "bg-slate-100"
                }`}
                style={{
                  height: `${Math.max(4, (count / maxCount) * 100)}%`,
                }}
                title={`${WEEKDAY_LABELS[index]}: ${count} reports`}
              />
            </div>
            <p className="mt-1.5 text-[10px] font-semibold text-slate-700 tabular-nums">
              {formatNumber(count)}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] leading-4 text-slate-500">
        {total
          ? `${WEEKDAY_LABELS[busiestIndex]} has the most submitted reports in this sample.`
          : "No dated reports fall within this history window."}
      </p>
    </div>
  );
}

function OpenQueue({ reports, now, onOpenReport }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...reports].sort((left, right) => {
    const severityDifference = severityRank(right) - severityRank(left);
    if (severityDifference) return severityDifference;
    return (getAgeDays(right, now) ?? -1) - (getAgeDays(left, now) ?? -1);
  });
  const visible = expanded ? sorted : sorted.slice(0, 5);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
        <div>
          <h3 className="text-xs font-semibold text-slate-800">
            Current open workload
          </h3>
          <p className="mt-1 text-[10px] text-slate-500">
            Highest severity first, then longest waiting.
          </p>
        </div>
        <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
          {formatNumber(reports.length)} open
        </span>
      </div>
      {visible.length ? (
        <div className="divide-y divide-slate-100">
          {visible.map((report) => {
            const id = getReportId(report);
            const age = getAgeDays(report, now);
            const severity = getSeverity(report);
            return (
              <div
                key={id || `${getReportTitle(report)}-${age}`}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-slate-800">
                    {getReportTitle(report)}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-slate-500">
                    <span>{getCategory(report)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{severity}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {age === null
                        ? "Date unavailable"
                        : age === 0
                          ? "Reported today"
                          : `${formatNumber(age)} days old`}
                    </span>
                  </p>
                </div>
                {onOpenReport && (
                  <button
                    type="button"
                    onClick={() => onOpenReport(report)}
                    className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[9px] font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                  >
                    Open report
                  </button>
                )}
              </div>
            );
          })}
          {reports.length > 5 && (
            <div className="px-4 py-3">
              <button
                type="button"
                onClick={() => setExpanded((current) => !current)}
                className="text-[10px] font-semibold text-violet-700 hover:text-violet-900"
              >
                {expanded ? "Show fewer reports" : `Show all ${reports.length} open reports`}
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="px-4 py-7 text-center text-[11px] text-slate-500">
          No open reports match the selected severity and category.
        </p>
      )}
    </div>
  );
}

export default function ReportWorkloadPlanner({
  reports = [],
  onOpenReport,
}) {
  const [windowDays, setWindowDays] = useState(DEFAULT_WINDOW);
  const [capacity, setCapacity] = useState(0);
  const [capacityDraft, setCapacityDraft] = useState("0");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [customRate, setCustomRate] = useState("");
  const [exportError, setExportError] = useState("");
  const [exportNotice, setExportNotice] = useState("");
  const now = useMemo(() => new Date(), []);

  const severityOptions = useMemo(() => {
    const values = Array.from(
      new Set(reports.map((report) => getSeverity(report))),
    ).sort((left, right) => left.localeCompare(right));
    return [
      { value: "all", label: "All severities" },
      ...values.map((value) => ({ value, label: value })),
    ];
  }, [reports]);

  const categoryOptions = useMemo(() => {
    const values = Array.from(
      new Set(reports.map((report) => getCategory(report))),
    ).sort((left, right) => left.localeCompare(right));
    return [
      { value: "all", label: "All categories" },
      ...values.map((value) => ({ value, label: value })),
    ];
  }, [reports]);

  const scopedReports = useMemo(
    () =>
      reports.filter((report) => {
        if (
          severityFilter !== "all" &&
          getSeverity(report) !== severityFilter
        ) {
          return false;
        }
        if (
          categoryFilter !== "all" &&
          getCategory(report) !== categoryFilter
        ) {
          return false;
        }
        return true;
      }),
    [categoryFilter, reports, severityFilter],
  );

  const periodStart = addDays(startOfDay(now), -(windowDays - 1));
  const historicalReports = useMemo(
    () =>
      scopedReports.filter((report) => {
        const date = getReportDate(report);
        return date && date >= periodStart && date <= now;
      }),
    [now, periodStart, scopedReports],
  );
  const datedReports = useMemo(
    () => scopedReports.filter((report) => getReportDate(report)),
    [scopedReports],
  );
  const openReports = useMemo(
    () => scopedReports.filter((report) => report?.status !== "Closed"),
    [scopedReports],
  );
  const series = useMemo(
    () => makeDailySeries(scopedReports, windowDays, now),
    [now, scopedReports, windowDays],
  );
  const dailyCounts = series.map((day) => day.count);
  const intakeRate = averagePerCalendarDay(series);
  const medianIntake = median(dailyCounts);
  const totalWindowIntake = historicalReports.length;
  const confidence = getConfidence(windowDays, totalWindowIntake);
  const rows = useMemo(
    () =>
      buildForecastRows({
        openCount: openReports.length,
        intakeRate,
        medianIntake,
        capacity,
      }),
    [capacity, intakeRate, medianIntake, openReports.length],
  );
  const parsedCustomRate = Number(customRate);
  const selectedCapacity =
    customRate.trim() !== "" &&
    Number.isFinite(parsedCustomRate) &&
    parsedCustomRate >= 0 &&
    parsedCustomRate <= MAX_CAPACITY
      ? parsedCustomRate
      : capacity;
  const netDailyChange = intakeRate - selectedCapacity;
  const backlogDaysToClear =
    netDailyChange < 0 && openReports.length
      ? Math.ceil(openReports.length / Math.abs(netDailyChange))
      : null;
  const oldestOpenAge = openReports.reduce(
    (oldest, report) => Math.max(oldest, getAgeDays(report, now) ?? 0),
    0,
  );
  const recentTrend = series.slice(-7);
  const recentRate = averagePerCalendarDay(recentTrend);
  const rateDifference = recentRate - intakeRate;
  const weekdayCounts = Array.from({ length: 7 }, () => 0);
  historicalReports.forEach((report) => {
    const date = getReportDate(report);
    if (date) weekdayCounts[date.getDay()] += 1;
  });
  const allDatedShare = reports.length
    ? Math.round(
        (reports.filter((report) => getReportDate(report)).length /
          reports.length) *
          100,
      )
    : 0;
  const scopedDatedShare = scopedReports.length
    ? Math.round((datedReports.length / scopedReports.length) * 100)
    : 0;
  const activeFilters =
    severityFilter !== "all" || categoryFilter !== "all";

  const handleCapacityChange = (value) => {
    setCapacityDraft(value);
    setCustomRate("");
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      setCapacity(Math.min(MAX_CAPACITY, Math.max(0, Math.round(parsed))));
    }
  };

  const handleCustomRateChange = (value) => {
    setCustomRate(value);
    const parsed = Number(value);
    if (
      value.trim() !== "" &&
      Number.isFinite(parsed) &&
      parsed >= 0 &&
      parsed <= MAX_CAPACITY
    ) {
      setCapacity(parsed);
      setCapacityDraft("");
    }
  };

  const handleExport = () => {
    setExportError("");
    setExportNotice("");
    try {
      downloadCsv(rows, {
        window: windowDays,
        reportCount: historicalReports.length,
        openCount: openReports.length,
        intakeRate,
        medianIntake,
        capacity: selectedCapacity,
        scenario:
          severityFilter === "all" && categoryFilter === "all"
            ? "All report categories and severities"
            : `${severityFilter}; ${categoryFilter}`,
      });
      setExportNotice(
        "Forecast CSV downloaded. It contains aggregate counts, not report details.",
      );
    } catch {
      setExportError(
        "Could not create the forecast file. Check browser download permissions and try again.",
      );
    }
  };

  const handleClearFilters = () => {
    setSeverityFilter("all");
    setCategoryFilter("all");
  };

  const trendIcon =
    rateDifference > 0.15
      ? ArrowUpRight
      : rateDifference < -0.15
        ? ArrowDownRight
        : Minus;
  const TrendIcon = trendIcon;
  const trendTone =
    rateDifference > 0.15
      ? "text-amber-700"
      : rateDifference < -0.15
        ? "text-emerald-700"
        : "text-slate-600";

  return (
    <section className="mt-5 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
      <div className="border-b border-slate-200/80 bg-gradient-to-r from-sky-50/70 via-white to-violet-50/60 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-sky-100 bg-white text-sky-700 shadow-sm">
                <Gauge size={19} aria-hidden="true" />
              </span>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold text-sky-700">
                Patch 11 · Workload forecast
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                  confidence.tone === "emerald"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : confidence.tone === "sky"
                      ? "border-sky-200 bg-sky-50 text-sky-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {confidence.label} · {totalWindowIntake} reports
              </span>
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">
              Report workload planner
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-slate-600">
              Explore how observed report intake and a planning capacity might
              affect your open queue. Adjust filters and daily review capacity
              to compare scenarios.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300"
          >
            <Download size={14} aria-hidden="true" />
            Export forecast CSV
          </button>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-3 text-[10px] leading-5 text-amber-900/80">
          <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            <strong>Planning estimate, not a prediction.</strong> Uses report
            creation dates and current open status only. Capacity is a
            user-entered scenario and does not resolve reports, change status,
            or account for future workload variation.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SelectField
            label="History window"
            value={String(windowDays)}
            onChange={(value) => setWindowDays(Number(value))}
            options={WINDOW_OPTIONS}
          />
          <SelectField
            label="Severity"
            value={severityFilter}
            onChange={setSeverityFilter}
            options={severityOptions}
          />
          <SelectField
            label="Category"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categoryOptions}
          />
          <SelectField
            label="Capacity preset"
            value={
              customRate === "" && CAPACITY_PRESETS.some(
                (preset) => Number(preset.value) === capacity,
              )
                ? String(capacity)
                : "custom"
            }
            onChange={(value) => {
              if (value !== "custom") handleCapacityChange(value);
            }}
            options={[
              ...CAPACITY_PRESETS,
              { value: "custom", label: "Custom rate below" },
            ]}
          />
        </div>
        {activeFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-100 bg-violet-50/50 px-3.5 py-2.5">
            <p className="text-[10px] text-violet-800">
              Scenario filtered to {severityFilter} severity and {categoryFilter} category.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-violet-700 hover:bg-white"
            >
              Clear report filters
            </button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Open workload"
            value={formatNumber(openReports.length)}
            hint="Current reports not marked closed"
            icon={Layers3}
            tone="amber"
          />
          <MetricCard
            label="Observed intake"
            value={`${formatNumber(intakeRate, 1)}/day`}
            hint={`${formatNumber(totalWindowIntake)} reports over ${windowDays} calendar days`}
            icon={Sparkles}
            tone="violet"
          />
          <MetricCard
            label="Planned net change"
            value={`${netDailyChange > 0 ? "+" : ""}${formatNumber(
              netDailyChange,
              1,
            )}/day`}
            hint="Observed intake minus your capacity scenario"
            icon={netDailyChange > 0 ? ArrowUpRight : ArrowDownRight}
            tone={netDailyChange > 0 ? "rose" : "emerald"}
          />
          <MetricCard
            label="Oldest open report"
            value={
              openReports.length
                ? `${formatNumber(oldestOpenAge)} days`
                : "None"
            }
            hint="Age measured from submitted date"
            icon={Clock3}
            tone="sky"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
          <IntakeChart
            series={series}
            average={intakeRate}
            medianValue={medianIntake}
          />
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <label
                    htmlFor="workload-capacity"
                    className="text-xs font-semibold text-slate-800"
                  >
                    Daily review capacity
                  </label>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500">
                    Scenario only; does not change report status.
                  </p>
                </div>
                <span className="rounded-xl border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 tabular-nums">
                  {formatNumber(selectedCapacity, 1)}/day
                </span>
              </div>
              <input
                id="workload-capacity"
                type="range"
                min="0"
                max={MAX_CAPACITY}
                step="1"
                value={Math.round(selectedCapacity)}
                onChange={(event) =>
                  handleCapacityChange(event.target.value)
                }
                className="mt-4 w-full accent-emerald-600"
              />
              <div className="flex justify-between text-[9px] text-slate-400">
                <span>0</span>
                <span>{MAX_CAPACITY} reports/day</span>
              </div>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-[10px] font-medium text-slate-600">
                  Enter a custom average per day
                </span>
                <input
                  type="number"
                  min="0"
                  max={MAX_CAPACITY}
                  step="0.5"
                  value={customRate === "" ? capacityDraft : customRate}
                  onChange={(event) =>
                    handleCustomRateChange(event.target.value)
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
              <p className="text-xs font-semibold text-slate-800">
                Recent intake movement
              </p>
              <div className={`mt-2 flex items-center gap-2 text-sm font-semibold ${trendTone}`}>
                <TrendIcon size={17} aria-hidden="true" />
                {rateDifference > 0.15
                  ? `${formatNumber(rateDifference, 1)} more reports/day`
                  : rateDifference < -0.15
                    ? `${formatNumber(Math.abs(rateDifference), 1)} fewer reports/day`
                    : "About the same"}
              </div>
              <p className="mt-1.5 text-[10px] leading-4 text-slate-500">
                Last 7 days: {formatNumber(recentRate, 1)}/day · full window:{" "}
                {formatNumber(intakeRate, 1)}/day. Short-term changes may be noise.
              </p>
            </div>

            <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
              <p className="inline-flex items-center gap-2 text-xs font-semibold text-sky-900">
                <UsersRound size={14} aria-hidden="true" />
                Data coverage
              </p>
              <p className="mt-1.5 text-[10px] leading-5 text-sky-900/75">
                {formatNumber(datedReports.length)} of {formatNumber(
                  scopedReports.length,
                )} filtered reports have valid submission dates (
                {scopedDatedShare}%; {allDatedShare}% of all loaded reports
                overall). The forecast excludes undated
                reports from intake history but includes open reports in the
                current workload.
              </p>
              <p className="mt-1 text-[10px] text-sky-800">{confidence.detail}</p>
            </div>
          </div>
        </div>

        <ForecastChart
          rows={rows}
          openCount={openReports.length}
        />
        <ProjectionTable
          rows={rows}
          openCount={openReports.length}
          capacity={selectedCapacity}
        />

        <div className="grid gap-4 xl:grid-cols-2">
          <WeekdayPattern reports={historicalReports} />
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
            <p className="text-xs font-semibold text-slate-800">
              How to read this estimate
            </p>
            <ul className="mt-3 space-y-2.5 text-[10px] leading-5 text-slate-600">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                Intake rate is calculated across every calendar day in the
                chosen window, including days with no reports.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                Planned capacity is subtracted from the backlog as a scenario;
                actual closures may differ.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                The median-intake line reduces the effect of unusually quiet
                or busy individual days.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                Historical trends are not guarantees; seasonality, staffing,
                and new report volume can change.
              </li>
            </ul>
          </div>
        </div>

        <OpenQueue
          reports={openReports}
          now={now.getTime()}
          onOpenReport={onOpenReport}
        />

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
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs text-emerald-800"
          >
            {exportNotice}
          </p>
        )}

        {!reports.length && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
            <ShieldAlert
              size={22}
              className="mx-auto text-slate-400"
              aria-hidden="true"
            />
            <p className="mt-3 text-xs font-semibold text-slate-700">
              No report data is available
            </p>
            <p className="mt-1 text-[10px] text-slate-500">
              Load your reports to build a workload scenario.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
