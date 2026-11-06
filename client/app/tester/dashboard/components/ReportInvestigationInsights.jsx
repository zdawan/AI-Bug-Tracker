"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownWideNarrow,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock3,
  Download,
  FileSearch,
  FilterX,
  Info,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

const STORAGE_PREFIX = "tester-report-investigation-v1";
const WINDOW_OPTIONS = [
  { value: "all", label: "Any session date" },
  { value: "7", label: "Updated in last 7 days" },
  { value: "30", label: "Updated in last 30 days" },
  { value: "90", label: "Updated in last 90 days" },
];

const STATE_OPTIONS = [
  { value: "all", label: "All investigation states" },
  { value: "pending", label: "Not started" },
  { value: "in-progress", label: "In progress" },
  { value: "reproduced", label: "Issue reproduced" },
  { value: "not-reproduced", label: "Not reproduced" },
  { value: "blocked", label: "Blocked" },
];

const SORT_OPTIONS = [
  { value: "recent", label: "Recently updated" },
  { value: "severity", label: "Highest severity" },
  { value: "failed", label: "Most failed steps" },
  { value: "completion", label: "Most complete" },
  { value: "title", label: "Title A–Z" },
];
const QUICK_STATE_OPTIONS = [
  { value: "all", label: "All sessions" },
  { value: "reproduced", label: "Reproduced" },
  { value: "blocked", label: "Blocked" },
  { value: "in-progress", label: "In progress" },
  { value: "pending", label: "Not started" },
  { value: "not-reproduced", label: "Not reproduced" },
];

function getText(value, limit = 320) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function getId(report) {
  const value = report?._id ?? report?.id;
  return value === null || value === undefined ? "" : String(value).trim();
}

function getTitle(report) {
  return (
    getText(report?.title, 240) ||
    getText(report?.summary, 240) ||
    "Untitled report"
  );
}

function getSeverity(report) {
  return getText(report?.severity, 80) || "Unspecified";
}

function getCategory(report) {
  return getText(report?.category, 120) || "Uncategorized";
}

function getSeverityRank(report) {
  const severity = getSeverity(report).toLowerCase();
  if (["critical", "blocker", "urgent"].includes(severity)) return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  if (severity === "low") return 1;
  return 0;
}

function parseTimestamp(value) {
  if (typeof value !== "string" || !value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getStorageKey(email) {
  return `${STORAGE_PREFIX}:${email}`;
}

function normalizeSession(raw) {
  const rawSteps = Array.isArray(raw?.steps) ? raw.steps : [];
  const steps = rawSteps
    .filter((step) => step && typeof step === "object")
    .slice(0, 30)
    .map((step) => ({
      id: getText(step.id, 180),
      state: ["pending", "passed", "failed", "blocked"].includes(step.state)
        ? step.state
        : "pending",
    }));

  return {
    steps,
    startedAt: parseTimestamp(raw?.startedAt),
    updatedAt: parseTimestamp(raw?.updatedAt),
  };
}

function loadSessionMap(email) {
  if (!email) return {};
  const saved = window.localStorage.getItem(getStorageKey(email));
  if (!saved) return {};

  let parsed;
  try {
    parsed = JSON.parse(saved);
  } catch {
    throw new Error("Saved investigation data is not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Saved investigation data has an unexpected format.");
  }

  return Object.entries(parsed).reduce((result, [id, session]) => {
    if (!id || !session || typeof session !== "object") return result;
    result[id] = normalizeSession(session);
    return result;
  }, {});
}

function getState(session) {
  const steps = session?.steps || [];
  if (!steps.some((step) => step.state !== "pending")) return "pending";
  if (steps.some((step) => step.state === "failed")) return "reproduced";
  if (steps.some((step) => step.state === "blocked")) return "blocked";
  if (steps.length && steps.every((step) => step.state === "passed")) {
    return "not-reproduced";
  }
  return "in-progress";
}

function getStateLabel(state) {
  return (
    STATE_OPTIONS.find((option) => option.value === state)?.label ||
    "Not started"
  );
}

function summarizeSteps(session) {
  const steps = session?.steps || [];
  const counts = steps.reduce(
    (result, step) => {
      result.total += 1;
      if (step.state === "passed") result.passed += 1;
      if (step.state === "failed") result.failed += 1;
      if (step.state === "blocked") result.blocked += 1;
      if (step.state !== "pending") result.recorded += 1;
      return result;
    },
    { total: 0, passed: 0, failed: 0, blocked: 0, recorded: 0 },
  );
  counts.percent = counts.total
    ? Math.round((counts.recorded / counts.total) * 100)
    : 0;
  return counts;
}

function formatNumber(value, fractionDigits = 0) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits:
      fractionDigits && Number.isFinite(value) && value % 1 ? 1 : 0,
  }).format(value);
}

function formatDate(timestamp, options = {}) {
  if (!Number.isFinite(timestamp)) return "Not recorded";
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  });
}

function matchesSearch(entry, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    entry.id,
    entry.title,
    entry.category,
    entry.severity,
    entry.state,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function buildEntries(reports, sessions) {
  return reports
    .filter((report) => report?.status !== "Closed" && getId(report))
    .map((report) => {
      const id = getId(report);
      const session = sessions[id] || normalizeSession({});
      const steps = summarizeSteps(session);
      return {
        id,
        report,
        title: getTitle(report),
        severity: getSeverity(report),
        severityRank: getSeverityRank(report),
        category: getCategory(report),
        state: getState(session),
        startedAt: session.startedAt,
        updatedAt: session.updatedAt,
        steps,
      };
    });
}

function buildDailyActivity(entries, days, now = Date.now()) {
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  const first = new Date(end);
  first.setDate(first.getDate() - days + 1);
  const series = Array.from({ length: days }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    return {
      date,
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      updated: 0,
      reproduced: 0,
      completed: 0,
    };
  });
  const byKey = new Map(series.map((day) => [day.key, day]));

  entries.forEach((entry) => {
    if (!Number.isFinite(entry.updatedAt)) return;
    const date = new Date(entry.updatedAt);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const day = byKey.get(key);
    if (!day) return;
    day.updated += 1;
    if (entry.state === "reproduced") day.reproduced += 1;
    if (
      entry.steps.total > 0 &&
      entry.steps.recorded === entry.steps.total
    ) {
      day.completed += 1;
    }
  });
  return series;
}

function downloadCsv(entries, days) {
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = [
    [
      "Report ID",
      "Report title",
      "Category",
      "Severity",
      "Investigation state",
      "Steps recorded",
      "Total steps",
      "Passed steps",
      "Failed steps",
      "Blocked steps",
      "Last updated",
    ],
    ...entries.map((entry) => [
      entry.id,
      entry.title,
      entry.category,
      entry.severity,
      getStateLabel(entry.state),
      entry.steps.recorded,
      entry.steps.total,
      entry.steps.passed,
      entry.steps.failed,
      entry.steps.blocked,
      Number.isFinite(entry.updatedAt)
        ? new Date(entry.updatedAt).toISOString()
        : "",
    ]),
  ];
  const csv = `\uFEFF${rows
    .map((row) => row.map(escape).join(","))
    .join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `investigation-insights-${days === "all" ? "all" : `${days}-days`}-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-2.5 pr-8 text-[10px] font-medium text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={12}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
      </span>
    </label>
  );
}

function MetricCard({ label, value, caption, icon: Icon, tone }) {
  const tones = {
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    sky: "border-sky-100 bg-sky-50 text-sky-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
  };
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold leading-none text-slate-950 tabular-nums">
            {formatNumber(value)}
          </p>
        </div>
        <span
          className={`grid h-9 w-9 place-items-center rounded-xl border ${tones[tone]}`}
        >
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-[9px] leading-4 text-slate-500">{caption}</p>
    </article>
  );
}

function ActivityChart({ series }) {
  const width = 720;
  const height = 180;
  const padding = { top: 14, right: 12, bottom: 26, left: 30 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(1, ...series.map((day) => day.updated));
  const points = series.map((day, index) => ({
    ...day,
    x:
      padding.left +
      (series.length === 1
        ? chartWidth / 2
        : (index / (series.length - 1)) * chartWidth),
    y:
      padding.top +
      chartHeight -
      (day.updated / maxValue) * chartHeight,
  }));
  const line = points
    .map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`)
    .join(" ");
  const ticks = Array.from(
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
            Investigation activity
          </h3>
          <p className="mt-1 text-[9px] text-slate-500">
            Count of reports with a local session updated per day.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[9px] font-semibold text-violet-700">
          <Activity size={11} aria-hidden="true" />
          {formatNumber(series.reduce((sum, day) => sum + day.updated, 0))} updates
        </span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Daily investigation updates"
          className="h-40 min-w-[520px] w-full"
        >
          {[0, 0.5, 1].map((fraction) => {
            const y = padding.top + chartHeight * fraction;
            return (
              <g key={fraction}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray={fraction === 1 ? "0" : "3 5"}
                />
                <text
                  x={padding.left - 7}
                  y={y + 3}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="9"
                >
                  {Math.round(maxValue * (1 - fraction))}
                </text>
              </g>
            );
          })}
          <path
            d={line}
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
              r={point.updated ? 3 : 1.5}
              fill={point.updated ? "#7c3aed" : "#c4b5fd"}
            >
              <title>{`${point.updated} session updates`}</title>
            </circle>
          ))}
          {ticks.map((index) => {
            const point = points[index];
            if (!point) return null;
            return (
              <text
                key={point.key}
                x={point.x}
                y={height - 6}
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
                {point.date.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function CategoryBreakdown({ entries }) {
  const rows = useMemo(() => {
    const grouped = entries.reduce((result, entry) => {
      const current = result.get(entry.category) || {
        category: entry.category,
        sessions: 0,
        reproduced: 0,
        blocked: 0,
        failedSteps: 0,
        totalSteps: 0,
      };
      current.sessions += 1;
      if (entry.state === "reproduced") current.reproduced += 1;
      if (entry.state === "blocked") current.blocked += 1;
      current.failedSteps += entry.steps.failed;
      current.totalSteps += entry.steps.total;
      result.set(entry.category, current);
      return result;
    }, new Map());
    return [...grouped.values()]
      .sort(
        (left, right) =>
          right.reproduced - left.reproduced ||
          right.failedSteps - left.failedSteps ||
          right.sessions - left.sessions,
      )
      .slice(0, 7);
  }, [entries]);
  const maxSessions = Math.max(1, ...rows.map((row) => row.sessions));

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
      <div>
        <h3 className="text-xs font-semibold text-slate-800">
          Outcomes by category
        </h3>
        <p className="mt-1 text-[9px] text-slate-500">
          Local investigation sessions in the filtered window.
        </p>
      </div>
      {rows.length ? (
        <div className="mt-3 space-y-3">
          {rows.map((row) => (
            <div key={row.category}>
              <div className="mb-1 flex items-center justify-between gap-2 text-[9px]">
                <span className="min-w-0 truncate font-medium text-slate-700">
                  {row.category}
                </span>
                <span className="shrink-0 text-slate-500 tabular-nums">
                  {row.reproduced} reproduced · {row.sessions} sessions
                </span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
                <span
                  className="bg-rose-500"
                  style={{
                    width: `${(row.reproduced / maxSessions) * 100}%`,
                  }}
                  title={`${row.reproduced} reproduced`}
                />
                <span
                  className="bg-amber-400"
                  style={{
                    width: `${(row.blocked / maxSessions) * 100}%`,
                  }}
                  title={`${row.blocked} blocked`}
                />
                <span
                  className="bg-violet-300"
                  style={{
                    width: `${Math.max(
                      0,
                      ((row.sessions - row.reproduced - row.blocked) /
                        maxSessions) *
                        100,
                    )}%`,
                  }}
                  title="Other sessions"
                />
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-3 pt-1 text-[9px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <i className="h-2 w-2 rounded-full bg-rose-500" />
              Reproduced
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="h-2 w-2 rounded-full bg-amber-400" />
              Blocked
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="h-2 w-2 rounded-full bg-violet-300" />
              Other states
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-slate-50 px-3 py-5 text-center text-[10px] text-slate-500">
          No investigation sessions match the selected filters.
        </p>
      )}
    </div>
  );
}

function SeverityBreakdown({ entries }) {
  const rows = useMemo(() => {
    const grouped = entries.reduce((result, entry) => {
      const current = result.get(entry.severity) || {
        severity: entry.severity,
        rank: entry.severityRank,
        total: 0,
        reproduced: 0,
        failedSteps: 0,
      };
      current.total += 1;
      if (entry.state === "reproduced") current.reproduced += 1;
      current.failedSteps += entry.steps.failed;
      result.set(entry.severity, current);
      return result;
    }, new Map());
    return [...grouped.values()].sort(
      (left, right) =>
        right.rank - left.rank ||
        right.reproduced - left.reproduced ||
        left.severity.localeCompare(right.severity),
    );
  }, [entries]);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
      <div>
        <h3 className="text-xs font-semibold text-slate-800">
          Severity outcome matrix
        </h3>
        <p className="mt-1 text-[9px] text-slate-500">
          Compare recorded reproduction and step failures by severity.
        </p>
      </div>
      {rows.length ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[350px] text-left">
            <thead>
              <tr className="text-[8px] uppercase tracking-wide text-slate-400">
                <th className="pb-2 font-semibold">Severity</th>
                <th className="pb-2 text-right font-semibold">Sessions</th>
                <th className="pb-2 text-right font-semibold">Reproduced</th>
                <th className="pb-2 text-right font-semibold">Failed steps</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.severity}
                  className="border-t border-slate-100 text-[10px] text-slate-600"
                >
                  <td className="py-2 font-medium text-slate-700">
                    {row.severity}
                  </td>
                  <td className="py-2 text-right tabular-nums">{row.total}</td>
                  <td className="py-2 text-right font-semibold text-rose-700 tabular-nums">
                    {row.reproduced}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {row.failedSteps}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-slate-50 px-3 py-5 text-center text-[10px] text-slate-500">
          No severity results to display.
        </p>
      )}
    </div>
  );
}

function SessionRow({ entry, onOpenReport }) {
  const stateClasses = {
    pending: "border-slate-200 bg-slate-50 text-slate-600",
    "in-progress": "border-sky-200 bg-sky-50 text-sky-700",
    reproduced: "border-rose-200 bg-rose-50 text-rose-700",
    "not-reproduced": "border-emerald-200 bg-emerald-50 text-emerald-700",
    blocked: "border-amber-200 bg-amber-50 text-amber-700",
  };
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[9px] font-semibold text-slate-400">
            {entry.id ? `#${entry.id.slice(-8)}` : "Report"}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[8px] font-semibold ${stateClasses[entry.state]}`}
          >
            {getStateLabel(entry.state)}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[8px] text-slate-500">
            {entry.severity}
          </span>
        </div>
        <h4 className="mt-1.5 truncate text-[11px] font-semibold text-slate-800">
          {entry.title}
        </h4>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-slate-500">
          <span>{entry.category}</span>
          <span aria-hidden="true">·</span>
          <span>
            {entry.steps.recorded}/{entry.steps.total} steps recorded
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {Number.isFinite(entry.updatedAt)
              ? `Updated ${formatDate(entry.updatedAt)}`
              : "Not started"}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="min-w-20 text-right">
          <p className="text-[9px] text-slate-500">Step completion</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-800 tabular-nums">
            {entry.steps.percent}%
          </p>
        </div>
        {onOpenReport && (
          <button
            type="button"
            onClick={() => onOpenReport(entry.report)}
            className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[9px] font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
          >
            Open
            <ArrowUpRight size={11} aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}

function EmptyState({ hasData, hasFilters, onReset }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-9 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-white text-slate-400 shadow-sm">
        <FileSearch size={18} aria-hidden="true" />
      </span>
      <h3 className="mt-3 text-xs font-semibold text-slate-800">
        {hasData
          ? "No investigation sessions match these filters"
          : "No local investigation sessions yet"}
      </h3>
      <p className="mx-auto mt-1 max-w-md text-[10px] leading-5 text-slate-500">
        {hasData
          ? "Adjust the date, severity, state, category, or search filters."
          : "Record step outcomes in the investigation workspace to see activity summaries here."}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          <FilterX size={11} aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );
}

export default function ReportInvestigationInsights({
  reports = [],
  email,
  onOpenReport,
}) {
  const [sessions, setSessions] = useState({});
  const [loadError, setLoadError] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [windowFilter, setWindowFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [visibleCount, setVisibleCount] = useState(8);
  const [exportMessage, setExportMessage] = useState("");
  const normalizedEmail = getText(email, 320).toLowerCase();

  useEffect(() => {
    if (!normalizedEmail) {
      setSessions({});
      setLoadError("");
      return undefined;
    }

    const reload = () => {
      try {
        setSessions(loadSessionMap(normalizedEmail));
        setLoadError("");
      } catch {
        setLoadError(
          "Could not read saved investigation data. The local storage entry may be unavailable or invalid.",
        );
      }
    };
    const handleInvestigationUpdate = (event) => {
      if (event.detail?.email === normalizedEmail) reload();
    };
    const handleStorage = (event) => {
      if (event.key === getStorageKey(normalizedEmail)) reload();
    };

    reload();
    window.addEventListener(
      "report-investigation-updated",
      handleInvestigationUpdate,
    );
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(
        "report-investigation-updated",
        handleInvestigationUpdate,
      );
      window.removeEventListener("storage", handleStorage);
    };
  }, [normalizedEmail]);

  const allEntries = useMemo(
    () => buildEntries(reports, sessions),
    [reports, sessions],
  );
  const categoryOptions = useMemo(() => {
    const categories = Array.from(
      new Set(allEntries.map((entry) => entry.category)),
    ).sort((left, right) => left.localeCompare(right));
    return [
      { value: "all", label: "All categories" },
      ...categories.map((category) => ({ value: category, label: category })),
    ];
  }, [allEntries]);
  const severityOptions = useMemo(() => {
    const severities = Array.from(
      new Set(allEntries.map((entry) => entry.severity)),
    ).sort((left, right) => left.localeCompare(right));
    return [
      { value: "all", label: "All severities" },
      ...severities.map((severity) => ({ value: severity, label: severity })),
    ];
  }, [allEntries]);

  const filteredEntries = useMemo(() => {
    const cutoff =
      windowFilter === "all"
        ? null
        : Date.now() - Number(windowFilter) * 86_400_000;
    return allEntries
      .filter((entry) => {
        if (stateFilter !== "all" && entry.state !== stateFilter) return false;
        if (
          severityFilter !== "all" &&
          entry.severity !== severityFilter
        ) {
          return false;
        }
        if (
          categoryFilter !== "all" &&
          entry.category !== categoryFilter
        ) {
          return false;
        }
        if (
          cutoff !== null &&
          (!Number.isFinite(entry.updatedAt) || entry.updatedAt < cutoff)
        ) {
          return false;
        }
        return matchesSearch(entry, query);
      })
      .sort((left, right) => {
        if (sortBy === "severity") {
          return right.severityRank - left.severityRank;
        }
        if (sortBy === "failed") {
          return (
            right.steps.failed - left.steps.failed ||
            right.severityRank - left.severityRank
          );
        }
        if (sortBy === "completion") {
          return (
            right.steps.percent - left.steps.percent ||
            right.steps.recorded - left.steps.recorded
          );
        }
        if (sortBy === "title") return left.title.localeCompare(right.title);
        return (
          (right.updatedAt ?? 0) - (left.updatedAt ?? 0) ||
          right.severityRank - left.severityRank
        );
      });
  }, [
    allEntries,
    categoryFilter,
    query,
    severityFilter,
    sortBy,
    stateFilter,
    windowFilter,
  ]);
  const recentEntries = filteredEntries.filter(
    (entry) => entry.state !== "pending",
  );
  const reproducedCount = filteredEntries.filter(
    (entry) => entry.state === "reproduced",
  ).length;
  const blockedCount = filteredEntries.filter(
    (entry) => entry.state === "blocked",
  ).length;
  const stateCounts = useMemo(
    () =>
      allEntries.reduce(
        (counts, entry) => {
          counts.all += 1;
          counts[entry.state] = (counts[entry.state] || 0) + 1;
          return counts;
        },
        {
          all: 0,
          pending: 0,
          "in-progress": 0,
          reproduced: 0,
          "not-reproduced": 0,
          blocked: 0,
        },
      ),
    [allEntries],
  );
  const sessionsStarted = filteredEntries.filter(
    (entry) => entry.state !== "pending",
  ).length;
  const overallSteps = filteredEntries.reduce(
    (result, entry) => {
      result.recorded += entry.steps.recorded;
      result.total += entry.steps.total;
      result.failed += entry.steps.failed;
      result.blocked += entry.steps.blocked;
      return result;
    },
    { recorded: 0, total: 0, failed: 0, blocked: 0 },
  );
  const completionRate = overallSteps.total
    ? Math.round((overallSteps.recorded / overallSteps.total) * 100)
    : 0;
  const activitySeries = useMemo(() => {
    const windowDays = windowFilter === "all" ? 30 : Number(windowFilter);
    return buildDailyActivity(recentEntries, windowDays);
  }, [recentEntries, windowFilter]);
  const visibleEntries = filteredEntries.slice(0, visibleCount);
  const hasFilters =
    stateFilter !== "all" ||
    severityFilter !== "all" ||
    categoryFilter !== "all" ||
    windowFilter !== "all" ||
    Boolean(query.trim());
  const hasSavedSessions = allEntries.some(
    (entry) => entry.state !== "pending",
  );

  const setFilter = (setter, value) => {
    setter(value);
    setVisibleCount(8);
    setExportMessage("");
  };

  const resetFilters = () => {
    setStateFilter("all");
    setSeverityFilter("all");
    setCategoryFilter("all");
    setWindowFilter("all");
    setQuery("");
    setVisibleCount(8);
  };

  const handleExport = () => {
    setExportMessage("");
    try {
      downloadCsv(filteredEntries, windowFilter);
      setExportMessage(
        `Exported ${formatNumber(filteredEntries.length)} filtered investigation rows. Notes and step text were excluded.`,
      );
    } catch {
      setExportMessage(
        "Could not create the CSV. Check browser download permissions and try again.",
      );
    }
  };

  const hasMore = visibleCount < filteredEntries.length;

  return (
    <section className="mt-5 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
      <div className="border-b border-slate-200/80 bg-gradient-to-r from-violet-50/70 via-white to-rose-50/50 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-violet-100 bg-white text-violet-700 shadow-sm">
                <BarChart3 size={19} aria-hidden="true" />
              </span>
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
                Patch 14 · Investigation analytics
              </span>
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">
              Investigation outcomes
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-slate-600">
              Explore locally saved step outcomes across open reports. The panel
              refreshes as investigation sessions change and keeps private
              notes out of charts and exports.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={!filteredEntries.length}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={14} aria-hidden="true" />
            Export filtered CSV
          </button>
        </div>
        <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-3 text-[10px] leading-5 text-amber-900/80">
          Analytics describe personal browser-local investigation results only.
          They are not shared with admins and do not modify issue status. CSV
          includes report identifiers and aggregate step counts; it excludes
          private notes and reproduction-step text.
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {loadError && (
          <p
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-800"
          >
            {loadError}
          </p>
        )}
        {!normalizedEmail && (
          <p
            role="status"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs leading-5 text-slate-600"
          >
            Search for your reports using your tester email to load
            email-scoped investigation analytics.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Sessions in view"
            value={sessionsStarted}
            caption={`${filteredEntries.length} open reports match filters`}
            icon={FileSearch}
            tone="violet"
          />
          <MetricCard
            label="Issue reproduced"
            value={reproducedCount}
            caption="At least one step marked failed"
            icon={ShieldAlert}
            tone="rose"
          />
          <MetricCard
            label="Blocked sessions"
            value={blockedCount}
            caption="At least one step marked blocked"
            icon={AlertTriangle}
            tone="amber"
          />
          <MetricCard
            label="Step completion"
            value={`${completionRate}%`}
            caption={`${overallSteps.recorded} of ${overallSteps.total} steps recorded`}
            icon={CheckCircle2}
            tone="emerald"
          />
          <MetricCard
            label="Failed steps"
            value={overallSteps.failed}
            caption={`${overallSteps.blocked} blocked steps in view`}
            icon={Activity}
            tone="sky"
          />
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-slate-800">
                Filter investigation analytics
              </h3>
              <p className="mt-1 text-[9px] text-slate-500">
                All charts, counts, rows, and CSV export use these filters.
              </p>
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[9px] font-semibold text-violet-700 hover:bg-violet-50"
              >
                <FilterX size={11} aria-hidden="true" />
                Clear filters
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SelectField
              label="Session state"
              value={stateFilter}
              onChange={(value) => setFilter(setStateFilter, value)}
              options={STATE_OPTIONS}
            />
            <SelectField
              label="Severity"
              value={severityFilter}
              onChange={(value) => setFilter(setSeverityFilter, value)}
              options={severityOptions}
            />
            <SelectField
              label="Category"
              value={categoryFilter}
              onChange={(value) => setFilter(setCategoryFilter, value)}
              options={categoryOptions}
            />
            <SelectField
              label="Updated"
              value={windowFilter}
              onChange={(value) => setFilter(setWindowFilter, value)}
              options={WINDOW_OPTIONS}
            />
            <label className="grid gap-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Sort sessions
              </span>
              <span className="relative">
                <select
                  value={sortBy}
                  onChange={(event) => setFilter(setSortBy, event.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-2.5 pr-8 text-[10px] font-medium text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ArrowDownWideNarrow
                  size={12}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
              </span>
            </label>
          </div>
          <div
            className="mt-3 flex flex-wrap gap-2"
            aria-label="Quick investigation state filters"
          >
            {QUICK_STATE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={stateFilter === option.value}
                onClick={() => setFilter(setStateFilter, option.value)}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[9px] font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 ${
                  stateFilter === option.value
                    ? "border-violet-300 bg-violet-100 text-violet-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700"
                }`}
              >
                {option.label}
                <span className="rounded-full bg-white/80 px-1.5 py-0.5 tabular-nums">
                  {formatNumber(stateCounts[option.value])}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="relative min-w-48 flex-1">
              <Search
                size={12}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setFilter(setQuery, event.target.value)}
                placeholder="Search title, ID, category…"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              />
            </label>
            <span className="text-[9px] text-slate-500" aria-live="polite">
              {formatNumber(filteredEntries.length)} reports match filters
            </span>
          </div>
        </div>

        {exportMessage && (
          <p
            role={exportMessage.startsWith("Could not") ? "alert" : "status"}
            className={`rounded-xl border px-3.5 py-3 text-[10px] ${
              exportMessage.startsWith("Could not")
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {exportMessage}
          </p>
        )}

        {recentEntries.length ? (
          <ActivityChart series={activitySeries} />
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/60 px-3.5 py-3 text-[9px] leading-5 text-sky-900/75">
            <Info size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              The activity chart appears after at least one investigation
              session has a recorded step outcome.
            </p>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          <CategoryBreakdown entries={filteredEntries} />
          <SeverityBreakdown entries={filteredEntries} />
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-800">
                Session outcome details
              </h3>
              <p className="mt-1 text-[9px] text-slate-500">
                Ordered by{" "}
                {SORT_OPTIONS.find((option) => option.value === sortBy)?.label.toLowerCase()}.
                Failed and blocked step totals are shown without private notes.
              </p>
            </div>
            <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[9px] font-semibold text-violet-700">
              {formatNumber(filteredEntries.length)} reports
            </span>
          </div>
          <div className="space-y-2.5 p-3.5 sm:p-4">
            {filteredEntries.length ? (
              <>
                {visibleEntries.map((entry) => (
                  <SessionRow
                    key={entry.id}
                    entry={entry}
                    onOpenReport={onOpenReport}
                  />
                ))}
                {hasMore && (
                  <div className="flex justify-center border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleCount((current) =>
                          Math.min(current + 8, filteredEntries.length),
                        )
                      }
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-[9px] font-semibold text-violet-700 hover:bg-violet-100"
                    >
                      Show more sessions
                      <ChevronDown size={11} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                hasData={hasSavedSessions}
                hasFilters={hasFilters}
                onReset={resetFilters}
              />
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-violet-900">
              <Sparkles size={13} aria-hidden="true" />
              Interpretation
            </p>
            <p className="mt-1.5 text-[9px] leading-5 text-violet-900/75">
              A reproduced session contains at least one step marked failed.
              A not-reproduced session has every step marked passed. Blocked
              steps remain separate from pass and failure counts.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800">
              <CalendarDays size={13} aria-hidden="true" />
              Date scope
            </p>
            <p className="mt-1.5 text-[9px] leading-5 text-slate-600">
              Date filters use the last local session update. Reports without a
              saved session timestamp are included only when “Any session
              date” is selected.
            </p>
          </div>
        </div>

        {normalizedEmail && !hasSavedSessions && !loadError && (
          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[9px] leading-4 text-slate-500">
            <CircleDashed
              size={12}
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <p>
              No investigation sessions are saved for this email yet. Record
              step outcomes in the investigation workspace to populate these
              summaries.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
