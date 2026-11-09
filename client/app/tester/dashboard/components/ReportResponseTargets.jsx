"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownWideNarrow,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Copy,
  Clock3,
  Download,
  Flame,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Target,
  TimerReset,
  X,
} from "lucide-react";

const DAY_MS = 86_400_000;
const INITIAL_VISIBLE = 8;
const TARGET_OPTIONS = [1, 2, 3, 5, 7, 10, 14, 21, 30];

const DEFAULT_TARGETS = {
  Critical: 1,
  High: 3,
  Medium: 7,
  Low: 14,
  Unspecified: 7,
};

const POLICY_PRESETS = [
  {
    id: "fast",
    label: "Fast response",
    targets: { Critical: 1, High: 2, Medium: 5, Low: 10, Unspecified: 5 },
  },
  {
    id: "balanced",
    label: "Balanced",
    targets: { Critical: 1, High: 3, Medium: 7, Low: 14, Unspecified: 7 },
  },
  {
    id: "extended",
    label: "Extended",
    targets: { Critical: 2, High: 5, Medium: 10, Low: 21, Unspecified: 10 },
  },
];

const TARGET_STATES = [
  { id: "breached", label: "Past target", tone: "rose" },
  { id: "due-today", label: "Due today", tone: "orange" },
  { id: "due-soon", label: "Due soon", tone: "amber" },
  { id: "on-track", label: "On track", tone: "emerald" },
  { id: "unknown", label: "Date unavailable", tone: "slate" },
];

const STATE_STYLES = {
  breached: {
    text: "text-rose-700",
    surface: "bg-rose-50",
    border: "border-rose-200",
    bar: "bg-rose-500",
    icon: AlertCircle,
  },
  "due-today": {
    text: "text-orange-700",
    surface: "bg-orange-50",
    border: "border-orange-200",
    bar: "bg-orange-500",
    icon: Clock3,
  },
  "due-soon": {
    text: "text-amber-700",
    surface: "bg-amber-50",
    border: "border-amber-200",
    bar: "bg-amber-500",
    icon: CalendarClock,
  },
  "on-track": {
    text: "text-emerald-700",
    surface: "bg-emerald-50",
    border: "border-emerald-200",
    bar: "bg-emerald-500",
    icon: CheckCircle2,
  },
  unknown: {
    text: "text-slate-600",
    surface: "bg-slate-100",
    border: "border-slate-200",
    bar: "bg-slate-400",
    icon: TimerReset,
  },
};

const QUEUE_FILTERS = [
  { id: "all", label: "All open" },
  { id: "breached", label: "Past target" },
  { id: "due-today", label: "Due today" },
  { id: "due-soon", label: "Due soon" },
  { id: "on-track", label: "On track" },
  { id: "unknown", label: "Date unavailable" },
];

const SORT_OPTIONS = [
  { value: "urgency", label: "Most urgent" },
  { value: "overdue", label: "Most overdue" },
  { value: "age", label: "Oldest first" },
  { value: "severity", label: "Severity first" },
  { value: "target", label: "Shortest target" },
  { value: "title", label: "Title A–Z" },
];

function normalizeText(value, fallback = "") {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function getTitle(report) {
  return normalizeText(report?.title || report?.summary, "Untitled report");
}

function getId(report) {
  return normalizeText(report?._id || report?.id);
}

function getCategory(report) {
  return normalizeText(report?.category, "Uncategorized");
}

function getSeverity(report) {
  const raw = normalizeText(report?.severity, "Unspecified");
  const match = Object.keys(DEFAULT_TARGETS).find(
    (severity) => severity.toLowerCase() === raw.toLowerCase(),
  );
  return match || "Unspecified";
}

function getStatus(report) {
  return normalizeText(report?.status).toLowerCase() === "closed"
    ? "closed"
    : "open";
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
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
      ? date
      : null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function calendarDayNumber(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS;
}

function getAgeInDays(date, today) {
  if (!date) return null;
  const age = calendarDayNumber(today) - calendarDayNumber(date);
  return age < 0 ? null : age;
}

function getRepeatCount(report) {
  const value = Number(report?.reports);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function getSearchText(report) {
  return [
    getId(report),
    getTitle(report),
    report?.description,
    report?.url,
    report?.pageUrl,
    getCategory(report),
    getSeverity(report),
  ]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDate(date) {
  if (!date || Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatAge(age) {
  if (age === null) return "Date unavailable";
  if (age === 0) return "Today";
  return `${formatNumber(age)} ${age === 1 ? "day" : "days"}`;
}

function getTargetState(age, target) {
  if (age === null) return "unknown";
  if (age > target) return "breached";
  if (age === target) return "due-today";
  if (target - age <= 2) return "due-soon";
  return "on-track";
}

function getEntries(reports, targets, today) {
  if (!Array.isArray(reports)) return [];

  return reports
    .filter(
      (report) => report && typeof report === "object" && !Array.isArray(report),
    )
    .filter((report) => getStatus(report) === "open")
    .map((report, index) => {
      const date = getDate(report);
      const severity = getSeverity(report);
      const target = targets[severity] || targets.Unspecified;
      const age = getAgeInDays(date, today);
      return {
        key: getId(report) || `${getTitle(report)}:${index}`,
        id: getId(report),
        title: getTitle(report),
        severity,
        category: getCategory(report),
        date,
        age,
        target,
        state: getTargetState(age, target),
        repeatCount: getRepeatCount(report),
        report,
      };
    });
}

function getPriority(entry) {
  const severityOrder = {
    Critical: 4,
    High: 3,
    Medium: 2,
    Low: 1,
    Unspecified: 0,
  };
  const severityWeight = (severityOrder[entry.severity] || 0) * 100;
  const overdueWeight =
    entry.state === "breached" ? Math.max(0, entry.age - entry.target) * 8 : 0;
  const stateWeight =
    entry.state === "breached"
      ? 500
      : entry.state === "due-today"
        ? 350
        : entry.state === "due-soon"
          ? 200
          : entry.state === "unknown"
            ? 25
            : 0;
  return (
    severityWeight +
    stateWeight +
    overdueWeight +
    Math.min(entry.repeatCount - 1, 20) * 5
  );
}

function getRemainingDays(entry) {
  if (entry.age === null) return null;
  return entry.target - entry.age;
}

function getRemainingLabel(entry) {
  const remaining = getRemainingDays(entry);
  if (remaining === null) return "Needs a usable report date";
  if (remaining < 0) {
    const overdue = Math.abs(remaining);
    return `${formatNumber(overdue)} ${overdue === 1 ? "day" : "days"} past target`;
  }
  if (remaining === 0) return "Target is today";
  if (remaining === 1) return "1 day to target";
  return `${formatNumber(remaining)} days to target`;
}

function getTargetProgress(entry) {
  if (entry.age === null || entry.target <= 0) return 0;
  return Math.min(100, Math.round((entry.age / entry.target) * 100));
}

function filterEntries(entries, filters) {
  const query = filters.search.trim().toLowerCase();
  return entries.filter((entry) => {
    if (filters.queue !== "all" && entry.state !== filters.queue) return false;
    if (filters.severity !== "all" && entry.severity !== filters.severity) {
      return false;
    }
    if (filters.category !== "all" && entry.category !== filters.category) {
      return false;
    }
    return !query || getSearchText(entry.report).includes(query);
  });
}

function sortEntries(entries, sortBy) {
  const sorted = [...entries];
  sorted.sort((left, right) => {
    if (sortBy === "overdue") {
      const leftOverdue = left.state === "breached" ? left.age - left.target : 0;
      const rightOverdue = right.state === "breached" ? right.age - right.target : 0;
      return rightOverdue - leftOverdue ||
        getPriority(right) - getPriority(left) ||
        left.title.localeCompare(right.title);
    }
    if (sortBy === "age") {
      return (
        (right.age ?? -1) - (left.age ?? -1) ||
        getPriority(right) - getPriority(left)
      );
    }
    if (sortBy === "severity") {
      return (
        getPriority(right) - getPriority(left) ||
        left.title.localeCompare(right.title)
      );
    }
    if (sortBy === "target") {
      return (
        left.target - right.target ||
        getPriority(right) - getPriority(left)
      );
    }
    if (sortBy === "title") return left.title.localeCompare(right.title);
    return (
      getPriority(right) - getPriority(left) ||
      (right.age ?? -1) - (left.age ?? -1) ||
      left.title.localeCompare(right.title)
    );
  });
  return sorted;
}

function summarizeEntries(entries) {
  const summary = {
    open: entries.length,
    breached: 0,
    dueToday: 0,
    dueSoon: 0,
    onTrack: 0,
    unknown: 0,
    highCritical: 0,
    repeated: 0,
    bySeverity: new Map(),
    byCategory: new Map(),
    oldestAge: 0,
    dated: 0,
  };

  entries.forEach((entry) => {
    if (entry.state === "breached") summary.breached += 1;
    if (entry.state === "due-today") summary.dueToday += 1;
    if (entry.state === "due-soon") summary.dueSoon += 1;
    if (entry.state === "on-track") summary.onTrack += 1;
    if (entry.state === "unknown") summary.unknown += 1;
    if (entry.severity === "High" || entry.severity === "Critical") {
      summary.highCritical += 1;
    }
    if (entry.repeatCount > 1) summary.repeated += 1;
    if (entry.age !== null) {
      summary.dated += 1;
      summary.oldestAge = Math.max(summary.oldestAge, entry.age);
    }
    summary.bySeverity.set(
      entry.severity,
      (summary.bySeverity.get(entry.severity) || 0) + 1,
    );
    summary.byCategory.set(
      entry.category,
      (summary.byCategory.get(entry.category) || 0) + 1,
    );
  });

  return summary;
}

function escapeCsv(value) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function exportTargetsCsv(entries, targets, filters, today) {
  const headers = [
    "Report ID",
    "Title",
    "Severity",
    "Category",
    "Reported date",
    "Age in days",
    "Advisory target days",
    "Target state",
    "Days to/past target",
    "Repeat submissions",
  ];
  const rows = entries.map((entry) => [
    entry.id,
    entry.title,
    entry.severity,
    entry.category,
    entry.date ? formatDate(entry.date) : "",
    entry.age ?? "",
    entry.target,
    TARGET_STATES.find((state) => state.id === entry.state)?.label ||
      entry.state,
    entry.age === null ? "" : entry.target - entry.age,
    entry.repeatCount,
  ]);
  const metadata = [
    ["Open report response-target review"],
    ["Generated", new Date().toLocaleString("en-IN")],
    ["Advisory targets", "Not formal SLAs; adjust locally for your workflow"],
    ["Critical target days", targets.Critical],
    ["High target days", targets.High],
    ["Medium target days", targets.Medium],
    ["Low target days", targets.Low],
    ["Unspecified target days", targets.Unspecified],
    ["Queue filter", filters.queue],
    ["Severity filter", filters.severity],
    ["Category filter", filters.category],
    ["Search", filters.search || "None"],
    ["Exported open reports", entries.length],
    ["As of", formatDate(today)],
  ];
  const contents = [...metadata, [], headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${contents}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "open-report-response-targets.csv";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildEscalationBrief(entries, summary, targets, today) {
  const topEntries = entries
    .filter((entry) => entry.state === "breached" || entry.state === "due-today")
    .slice(0, 5);
  const lines = [
    `Response-target review · ${formatDate(today)}`,
    `${formatNumber(entries.length)} open reports in the current filtered queue.`,
    `${formatNumber(summary.breached)} past target · ${formatNumber(
      summary.dueToday,
    )} due today · ${formatNumber(summary.dueSoon)} due soon.`,
    `Configured targets: High ${targets.High}d, Medium ${targets.Medium}d, Low ${targets.Low}d.`,
  ];

  if (topEntries.length) {
    lines.push("", "Priority follow-up:");
    topEntries.forEach((entry, index) => {
      lines.push(
        `${index + 1}. ${entry.title} [${entry.severity}] · ${
          entry.state === "breached"
            ? `${entry.age - entry.target}d past target`
            : "due today"
        }`,
      );
    });
  }

  return lines.join("\n");
}

function SelectControl({ label, value, options, onChange }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-[10px] font-semibold text-slate-600 outline-none transition hover:border-violet-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 text-slate-400"
      />
    </label>
  );
}

function TargetMetric({ label, value, detail, tone, icon: Icon }) {
  const tones = {
    rose: "bg-rose-50 text-rose-700",
    orange: "bg-orange-50 text-orange-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };
  return (
    <article className="rounded-xl border border-slate-200/80 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <span className={`grid h-7 w-7 place-items-center rounded-lg ${tones[tone]}`}>
          <Icon size={14} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">
        {formatNumber(value)}
      </p>
      <p className="mt-1 text-[8px] leading-4 text-slate-400">{detail}</p>
    </article>
  );
}

function TargetStateTag({ state }) {
  const config = STATE_STYLES[state] || STATE_STYLES.unknown;
  const Icon = config.icon;
  const label = TARGET_STATES.find((item) => item.id === state)?.label || state;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[8px] font-semibold ${config.surface} ${config.text}`}
    >
      <Icon size={10} aria-hidden="true" />
      {label}
    </span>
  );
}

function TargetProgress({ entry }) {
  const config = STATE_STYLES[entry.state] || STATE_STYLES.unknown;
  const progress = getTargetProgress(entry);
  return (
    <div className="min-w-[110px]">
      <div className="mb-1 flex items-center justify-between gap-2 text-[8px]">
        <span className={`font-semibold ${config.text}`}>
          {getRemainingLabel(entry)}
        </span>
        <span className="tabular-nums text-slate-400">
          {entry.age === null ? "—" : `${formatNumber(progress)}%`}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={`Age against the ${entry.severity} advisory target`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        {entry.age !== null && (
          <span
            className={`block h-full rounded-full transition-all ${config.bar}`}
            style={{ width: `${progress}%` }}
          />
        )}
      </div>
    </div>
  );
}

function TargetReportRow({ entry, onOpenReport }) {
  const severityTone =
    entry.severity === "Critical" || entry.severity === "High"
      ? "bg-rose-50 text-rose-700"
      : entry.severity === "Medium"
        ? "bg-amber-50 text-amber-700"
        : entry.severity === "Low"
          ? "bg-sky-50 text-sky-700"
          : "bg-slate-100 text-slate-600";

  return (
    <li className="border-b border-slate-100 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
            entry.state === "breached"
              ? "bg-rose-50 text-rose-700"
              : entry.state === "due-today"
                ? "bg-orange-50 text-orange-700"
                : entry.state === "due-soon"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-slate-100 text-slate-600"
          }`}
          aria-hidden="true"
        >
          {entry.state === "breached" ? (
            <Flame size={14} />
          ) : (
            <Clock3 size={14} />
          )}
        </span>
        <div className="min-w-[160px] flex-1">
          <p className="truncate text-[10px] font-semibold text-slate-800">
            {entry.title}
          </p>
          <p className="mt-0.5 truncate text-[8px] text-slate-400">
            {entry.id ? `#${entry.id.slice(-10)} · ` : ""}
            {entry.category} · Reported {formatDate(entry.date)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${severityTone}`}>
            {entry.severity}
          </span>
          {entry.repeatCount > 1 && (
            <span className="rounded-full bg-violet-50 px-2 py-1 text-[8px] font-medium text-violet-700">
              {formatNumber(entry.repeatCount)} reports
            </span>
          )}
        </div>
        <div className="w-full sm:ml-auto sm:w-[min(34%,230px)]">
          <TargetProgress entry={entry} />
        </div>
        <TargetStateTag state={entry.state} />
        {onOpenReport && (
          <button
            type="button"
            onClick={() => onOpenReport(entry.report)}
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[8px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            View
            <ArrowUpRight size={10} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  );
}

function TargetDistribution({ entries, targets }) {
  const groups = useMemo(() => {
    const bySeverity = new Map(
      Object.keys(DEFAULT_TARGETS).map((severity) => [
        severity,
        {
          severity,
          target: targets[severity],
          count: 0,
          breached: 0,
          dueToday: 0,
          dueSoon: 0,
          onTrack: 0,
          unknown: 0,
        },
      ]),
    );
    entries.forEach((entry) => {
      const group = bySeverity.get(entry.severity);
      if (!group) return;
      group.count += 1;
      if (entry.state === "breached") group.breached += 1;
      if (entry.state === "due-today") group.dueToday += 1;
      if (entry.state === "due-soon") group.dueSoon += 1;
      if (entry.state === "on-track") group.onTrack += 1;
      if (entry.state === "unknown") group.unknown += 1;
    });
    return [...bySeverity.values()].sort(
      (left, right) =>
        Object.keys(DEFAULT_TARGETS).indexOf(left.severity) -
        Object.keys(DEFAULT_TARGETS).indexOf(right.severity),
    );
  }, [entries, targets]);

  if (!entries.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-[8px] text-slate-500">
        Severity target distribution will appear when open reports are available.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {groups.map((group) => {
        const total = group.count || 1;
        const segments = [
          { id: "breached", count: group.breached, color: "bg-rose-500" },
          { id: "due-today", count: group.dueToday, color: "bg-orange-500" },
          { id: "due-soon", count: group.dueSoon, color: "bg-amber-400" },
          { id: "on-track", count: group.onTrack, color: "bg-emerald-500" },
          { id: "unknown", count: group.unknown, color: "bg-slate-300" },
        ];
        return (
          <div key={group.severity}>
            <div className="mb-1 flex items-center justify-between gap-2 text-[8px]">
              <span className="font-semibold text-slate-700">
                {group.severity}
              </span>
              <span className="text-slate-400">
                {formatNumber(group.count)} open · {formatNumber(group.target)} day target
              </span>
            </div>
            <div
              className="flex h-2 overflow-hidden rounded-full bg-slate-100"
              role="img"
              aria-label={`${group.severity}: ${group.breached} past target, ${group.dueToday} due today, ${group.dueSoon} due soon, ${group.onTrack} on track, ${group.unknown} date unavailable`}
            >
              {segments.map((segment) => (
                <span
                  key={segment.id}
                  className={`${segment.color} transition-all`}
                  style={{ width: `${(segment.count / total) * 100}%` }}
                />
              ))}
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
        {TARGET_STATES.map((state) => {
          const config = STATE_STYLES[state.id];
          return (
            <span
              key={state.id}
              className="inline-flex items-center gap-1 text-[7px] text-slate-500"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${config.bar}`} />
              {state.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function TargetEditor({ targets, onChange }) {
  return (
    <div className="space-y-2">
      {Object.keys(DEFAULT_TARGETS).map((severity) => (
        <label
          key={severity}
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-2.5 py-2"
        >
          <span className="text-[9px] font-medium text-slate-700">
            {severity}
          </span>
          <span className="flex items-center gap-1.5">
            <select
              value={targets[severity]}
              onChange={(event) =>
                onChange(severity, Number(event.target.value))
              }
              aria-label={`${severity} response target in days`}
              className="h-7 rounded-md border border-slate-200 bg-slate-50 px-2 text-[9px] font-semibold text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            >
              {TARGET_OPTIONS.map((days) => (
                <option key={days} value={days}>
                  {days} {days === 1 ? "day" : "days"}
                </option>
              ))}
            </select>
          </span>
        </label>
      ))}
      <p className="text-[7px] leading-4 text-slate-400">
        Changes update this dashboard view only. Targets are not sent to your
        workspace or saved as formal service agreements.
      </p>
    </div>
  );
}

function EmptyQueue({ hasReports, onReset }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center">
      <div>
        <span className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-400 shadow-sm">
          <Target size={16} aria-hidden="true" />
        </span>
        <p className="mt-2 text-[10px] font-semibold text-slate-700">
          {hasReports ? "No open reports match this view" : "No open reports to track"}
        </p>
        <p className="mt-1 text-[8px] leading-4 text-slate-500">
          {hasReports
            ? "Try another target state, severity, category, or search term."
            : "Open reports will appear here when the dashboard has loaded them."}
        </p>
        {hasReports && (
          <button
            type="button"
            onClick={onReset}
            className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[8px] font-semibold text-slate-600 hover:border-violet-200 hover:text-violet-700"
          >
            Reset filters
          </button>
        )}
      </div>
    </div>
  );
}

function AdvisoryNote() {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5">
      <ShieldAlert
        size={12}
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-sky-700"
      />
      <p className="text-[8px] leading-4 text-sky-800">
        These targets are configurable planning aids based on report age. They
        are not contractual SLAs, due dates, notifications, or status changes.
        Reports without a valid creation date are marked unavailable, not
        automatically considered breached.
      </p>
    </div>
  );
}

export default function ReportResponseTargets({
  reports = [],
  onOpenReport,
}) {
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [queue, setQueue] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("urgency");
  const [showTargets, setShowTargets] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [copyFeedback, setCopyFeedback] = useState("");

  const today = useMemo(() => startOfDay(new Date()), []);
  const openEntries = useMemo(
    () => getEntries(reports, targets, today),
    [reports, targets, today],
  );
  const summary = useMemo(() => summarizeEntries(openEntries), [openEntries]);
  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...[...new Set(openEntries.map((entry) => entry.category))]
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ value, label: value })),
    ],
    [openEntries],
  );
  const severityOptions = useMemo(
    () => [
      { value: "all", label: "All severities" },
      ...[...new Set(openEntries.map((entry) => entry.severity))]
        .sort(
          (left, right) =>
            Object.keys(DEFAULT_TARGETS).indexOf(left) -
            Object.keys(DEFAULT_TARGETS).indexOf(right),
        )
        .map((value) => ({ value, label: value })),
    ],
    [openEntries],
  );
  const filteredEntries = useMemo(
    () =>
      sortEntries(
        filterEntries(openEntries, {
          queue,
          severity: severityFilter,
          category: categoryFilter,
          search,
        }),
        sortBy,
      ),
    [categoryFilter, openEntries, queue, search, severityFilter, sortBy],
  );
  const visibleEntries = filteredEntries.slice(0, visibleCount);
  const queueCounts = useMemo(
    () => ({
      all: openEntries.length,
      breached: summary.breached,
      "due-today": summary.dueToday,
      "due-soon": summary.dueSoon,
      "on-track": summary.onTrack,
      unknown: summary.unknown,
    }),
    [openEntries.length, summary],
  );
  const hasFilters =
    queue !== "all" ||
    severityFilter !== "all" ||
    categoryFilter !== "all" ||
    Boolean(search.trim()) ||
    sortBy !== "urgency";
  const hasReports = Array.isArray(reports) && reports.length > 0;

  const resetFilters = () => {
    setQueue("all");
    setSeverityFilter("all");
    setCategoryFilter("all");
    setSearch("");
    setSortBy("urgency");
    setVisibleCount(INITIAL_VISIBLE);
  };

  const applyQueueFilter = (value) => {
    setQueue(value);
    setVisibleCount(INITIAL_VISIBLE);
  };

  const updateTarget = (severity, value) => {
    setTargets((current) => ({ ...current, [severity]: value }));
    setVisibleCount(INITIAL_VISIBLE);
  };

  const applyPreset = (preset) => {
    setTargets(preset.targets);
    setVisibleCount(INITIAL_VISIBLE);
  };

  const exportCsv = () =>
    exportTargetsCsv(
      filteredEntries,
      targets,
      {
        queue,
        severity: severityFilter,
        category: categoryFilter,
        search: search.trim(),
      },
      today,
    );

  const copyEscalationBrief = async () => {
    try {
      await navigator.clipboard.writeText(
        buildEscalationBrief(filteredEntries, summary, targets, today),
      );
      setCopyFeedback("Escalation brief copied.");
    } catch {
      setCopyFeedback("Could not copy the brief in this browser.");
    }
  };

  const targetPreset = POLICY_PRESETS.find((preset) =>
    Object.keys(DEFAULT_TARGETS).every(
      (severity) => targets[severity] === preset.targets[severity],
    ),
  );

  return (
    <section
      aria-labelledby="response-targets-heading"
      className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30"
    >
      <header className="border-b border-slate-100 bg-gradient-to-br from-orange-50/60 via-white to-violet-50/40 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-orange-100 bg-orange-50 text-orange-700">
              <Target size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-orange-700">
                Patch 8 · Follow-through planning
              </p>
              <h2
                id="response-targets-heading"
                className="mt-1 text-base font-semibold tracking-tight text-slate-950"
              >
                Open report response targets
              </h2>
              <p className="mt-1 max-w-2xl text-[10px] leading-4 text-slate-500">
                Compare open report age with adjustable severity-based planning
                targets, then focus on overdue and near-target work.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowTargets((current) => !current)}
              aria-expanded={showTargets}
              aria-controls="response-target-controls"
              className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[9px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                showTargets
                  ? "border-violet-200 bg-violet-50 text-violet-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700"
              }`}
            >
              <SlidersHorizontal size={12} aria-hidden="true" />
              Adjust targets
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!filteredEntries.length}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Download size={12} aria-hidden="true" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={copyEscalationBrief}
              disabled={!filteredEntries.length}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Copy size={12} aria-hidden="true" />
              Copy brief
            </button>
          </div>
        </div>
        {copyFeedback && (
          <p role="status" className="mt-2 text-[9px] font-medium text-emerald-700">
            {copyFeedback}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="relative min-w-[170px] flex-1 sm:max-w-xs">
            <span className="sr-only">Search open reports</span>
            <Search
              size={12}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setVisibleCount(INITIAL_VISIBLE);
              }}
              placeholder="Search title, category, or report ID"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </label>
          <SelectControl
            label="Filter response targets by severity"
            value={severityFilter}
            options={severityOptions}
            onChange={(value) => {
              setSeverityFilter(value);
              setVisibleCount(INITIAL_VISIBLE);
            }}
          />
          <SelectControl
            label="Filter response targets by category"
            value={categoryFilter}
            options={categoryOptions}
            onChange={(value) => {
              setCategoryFilter(value);
              setVisibleCount(INITIAL_VISIBLE);
            }}
          />
          <SelectControl
            label="Sort response target queue"
            value={sortBy}
            options={SORT_OPTIONS}
            onChange={(value) => {
              setSortBy(value);
              setVisibleCount(INITIAL_VISIBLE);
            }}
          />
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[9px] font-semibold text-slate-500 transition hover:bg-white hover:text-violet-700"
            >
              <X size={11} aria-hidden="true" />
              Reset filters
            </button>
          )}
        </div>
      </header>

      <div className="space-y-3 p-3 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <TargetMetric
            label="Past target"
            value={summary.breached}
            detail="Older than the configured target"
            tone="rose"
            icon={AlertCircle}
          />
          <TargetMetric
            label="Due today"
            value={summary.dueToday}
            detail="At the target age"
            tone="orange"
            icon={Clock3}
          />
          <TargetMetric
            label="Due soon"
            value={summary.dueSoon}
            detail="Within two days of target"
            tone="amber"
            icon={CalendarClock}
          />
          <TargetMetric
            label="On track"
            value={summary.onTrack}
            detail={`${formatNumber(summary.unknown)} without a usable date`}
            tone="emerald"
            icon={CheckCircle2}
          />
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
          <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-[10px] font-semibold text-slate-800">
                  Open report target queue
                </h3>
                <p className="mt-0.5 text-[8px] text-slate-400">
                  {formatNumber(filteredEntries.length)} matching reports ·{" "}
                  {formatNumber(summary.highCritical)} high / critical open
                </p>
              </div>
              <span className="text-[8px] text-slate-400">
                As of {formatDate(today)}
              </span>
            </div>

            <div
              role="group"
              aria-label="Filter open reports by response target state"
              className="mb-3 flex flex-wrap gap-1.5"
            >
              {QUEUE_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={queue === filter.id}
                  onClick={() => applyQueueFilter(filter.id)}
                  className={`inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[8px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                    queue === filter.id
                      ? "border-violet-200 bg-violet-50 text-violet-800"
                      : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200 hover:text-slate-700"
                  }`}
                >
                  {filter.label}
                  <span className="rounded bg-white/80 px-1 py-0.5 tabular-nums">
                    {formatNumber(queueCounts[filter.id] || 0)}
                  </span>
                </button>
              ))}
            </div>

            {visibleEntries.length ? (
              <>
                <ul className="divide-y divide-slate-100">
                  {visibleEntries.map((entry) => (
                    <TargetReportRow
                      key={entry.key}
                      entry={entry}
                      onOpenReport={onOpenReport}
                    />
                  ))}
                </ul>
                {visibleEntries.length < filteredEntries.length && (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount((count) =>
                        Math.min(count + INITIAL_VISIBLE, filteredEntries.length),
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                  >
                    Show{" "}
                    {formatNumber(
                      Math.min(
                        INITIAL_VISIBLE,
                        filteredEntries.length - visibleEntries.length,
                      ),
                    )}{" "}
                    more reports
                  </button>
                )}
              </>
            ) : (
              <EmptyQueue hasReports={hasReports} onReset={resetFilters} />
            )}
          </section>

          <aside className="space-y-3">
            <section className="rounded-xl border border-slate-200/80 bg-white p-3">
              <div className="mb-3 flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-50 text-violet-700">
                  <Target size={13} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-[9px] font-semibold text-slate-800">
                    Target status by severity
                  </h3>
                  <p className="text-[8px] text-slate-400">
                    Current open-report distribution
                  </p>
                </div>
              </div>
              <TargetDistribution entries={openEntries} targets={targets} />
            </section>

            {showTargets && (
              <section
                id="response-target-controls"
                className="rounded-xl border border-violet-100 bg-violet-50/40 p-3"
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-[9px] font-semibold text-slate-800">
                      Configure advisory targets
                    </h3>
                    <p className="mt-0.5 text-[8px] leading-4 text-slate-500">
                      Choose a policy preset or set a target per severity.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-[7px] font-medium text-violet-700">
                    {targetPreset?.label || "Custom"}
                  </span>
                </div>
                <div
                  role="group"
                  aria-label="Apply a response target preset"
                  className="mb-3 flex flex-wrap gap-1"
                >
                  {POLICY_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={targetPreset?.id === preset.id}
                      onClick={() => applyPreset(preset)}
                      className={`rounded-lg border px-2 py-1.5 text-[7px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                        targetPreset?.id === preset.id
                          ? "border-violet-200 bg-violet-100 text-violet-800"
                          : "border-slate-200 bg-white text-slate-500 hover:text-violet-700"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <TargetEditor targets={targets} onChange={updateTarget} />
              </section>
            )}

            <AdvisoryNote />
          </aside>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
          <p className="text-[8px] leading-4 text-slate-400">
            Age is counted in local calendar days from report creation. Due soon
            means within two days of the configured target. Closed reports are
            excluded from this planning queue.
          </p>
          <span className="inline-flex items-center gap-1 text-[8px] text-slate-500">
            <ArrowDownWideNarrow size={11} aria-hidden="true" />
            Sorted by {SORT_OPTIONS.find((option) => option.value === sortBy)?.label}
          </span>
        </div>

        <span className="sr-only" aria-live="polite">
          {summary.open} open reports: {summary.breached} past target,{" "}
          {summary.dueToday} due today, {summary.dueSoon} due soon,{" "}
          {summary.onTrack} on track, and {summary.unknown} without usable dates.
        </span>
      </div>
    </section>
  );
}
