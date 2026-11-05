"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  Clipboard,
  Download,
  FileText,
  Filter,
  ListChecks,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

const RANGE_OPTIONS = [
  { value: "all", label: "Any time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Resolved" },
];

const SORT_OPTIONS = [
  { value: "priority", label: "Priority first" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "severity", label: "Severity first" },
  { value: "title", label: "Title A–Z" },
];

const SEVERITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  unspecified: 4,
};

const MAX_SELECTED_REPORTS = 100;

function normalizeText(value, fallback = "") {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function getReportTitle(report) {
  return normalizeText(report?.title || report?.summary, "Untitled report");
}

function getReportId(report) {
  return normalizeText(report?._id || report?.id);
}

function getStatus(report) {
  return normalizeText(report?.status).toLowerCase() === "closed"
    ? "closed"
    : "open";
}

function getSeverity(report) {
  return normalizeText(report?.severity, "Unspecified");
}

function getCategory(report) {
  return normalizeText(report?.category, "Uncategorized");
}

function getReportDate(report) {
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

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayDifference(later, earlier) {
  return Math.max(
    0,
    Math.floor(
      (startOfDay(later).getTime() - startOfDay(earlier).getTime()) /
        86_400_000,
    ),
  );
}

function getAgeInDays(entry, today) {
  const date = entry.date;
  if (!date) return null;
  return dayDifference(today, date);
}

function getSeverityRank(value) {
  return SEVERITY_ORDER[value.toLowerCase()] ?? SEVERITY_ORDER.unspecified;
}

function getRepeatCount(report) {
  const count = Number(report?.reports);
  return Number.isFinite(count) && count > 0 ? count : 1;
}

function getPriorityScore(entry, today) {
  const severityScore = Math.max(0, 4 - getSeverityRank(entry.severity)) * 30;
  const ageScore = entry.status === "open" ? Math.min(getAgeInDays(entry, today) || 0, 45) : 0;
  const repeatScore = Math.min(getRepeatCount(entry.report) - 1, 10) * 5;
  const openScore = entry.status === "open" ? 15 : 0;
  return severityScore + ageScore + repeatScore + openScore;
}

function getSearchText(entry) {
  return [
    entry.id,
    entry.title,
    entry.status,
    entry.severity,
    entry.category,
    entry.description,
    entry.url,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatAge(age) {
  if (age === null) return "Date unavailable";
  if (age === 0) return "Today";
  if (age === 1) return "1 day old";
  return `${formatNumber(age)} days old`;
}

function getSafeHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function getEntries(reports) {
  if (!Array.isArray(reports)) return [];

  return reports
    .filter(
      (report) => report && typeof report === "object" && !Array.isArray(report),
    )
    .map((report, index) => {
      const date = getReportDate(report);
      const id = getReportId(report);
      const title = getReportTitle(report);
      const rawDescription = normalizeText(report.description);
      const url = getSafeHttpUrl(report.url || report.pageUrl);
      return {
        key: id || `${title}:${date?.toISOString() || "undated"}:${index}`,
        id,
        title,
        status: getStatus(report),
        severity: getSeverity(report),
        category: getCategory(report),
        date,
        description: rawDescription,
        url,
        repeatCount: getRepeatCount(report),
        report,
      };
    });
}

function filterEntries(entries, filters, today) {
  const query = filters.search.trim().toLowerCase();
  const days = Number(filters.range);
  const start = Number.isFinite(days) && days > 0 ? new Date(today) : null;
  if (start) start.setDate(start.getDate() - days + 1);

  return entries.filter((entry) => {
    if (filters.status !== "all" && entry.status !== filters.status) {
      return false;
    }
    if (filters.severity !== "all" && entry.severity !== filters.severity) {
      return false;
    }
    if (filters.category !== "all" && entry.category !== filters.category) {
      return false;
    }
    if (start) {
      if (!entry.date) return false;
      const reportDay = startOfDay(entry.date);
      if (reportDay < start || reportDay > today) return false;
    }
    return !query || getSearchText(entry).includes(query);
  });
}

function sortEntries(entries, sortBy, today) {
  const sorted = [...entries];
  sorted.sort((left, right) => {
    if (sortBy === "newest") {
      return (right.date?.getTime() || 0) - (left.date?.getTime() || 0);
    }
    if (sortBy === "oldest") {
      return (left.date?.getTime() || 0) - (right.date?.getTime() || 0);
    }
    if (sortBy === "severity") {
      return (
        getSeverityRank(left.severity) - getSeverityRank(right.severity) ||
        (right.date?.getTime() || 0) - (left.date?.getTime() || 0)
      );
    }
    if (sortBy === "title") return left.title.localeCompare(right.title);
    return (
      getPriorityScore(right, today) - getPriorityScore(left, today) ||
      getSeverityRank(left.severity) - getSeverityRank(right.severity) ||
      left.title.localeCompare(right.title)
    );
  });
  return sorted;
}

function summarizeEntries(entries, today) {
  const summary = {
    count: entries.length,
    open: 0,
    closed: 0,
    high: 0,
    critical: 0,
    repeats: 0,
    categories: new Map(),
    severities: new Map(),
    oldestOpenAge: 0,
    totalSubmissions: 0,
  };

  entries.forEach((entry) => {
    if (entry.status === "closed") summary.closed += 1;
    else {
      summary.open += 1;
      summary.oldestOpenAge = Math.max(
        summary.oldestOpenAge,
        getAgeInDays(entry, today) || 0,
      );
      if (entry.severity.toLowerCase() === "high") summary.high += 1;
      if (entry.severity.toLowerCase() === "critical") summary.critical += 1;
    }
    if (entry.repeatCount > 1) summary.repeats += 1;
    summary.totalSubmissions += entry.repeatCount;
    summary.categories.set(
      entry.category,
      (summary.categories.get(entry.category) || 0) + 1,
    );
    summary.severities.set(
      entry.severity,
      (summary.severities.get(entry.severity) || 0) + 1,
    );
  });

  return summary;
}

function escapeMarkdown(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replace(/\r\n?|\n/g, "  \n> ");
}

function escapeCsv(value) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function createMarkdownBrief(entries, summary, title, today) {
  const generated = new Date().toLocaleString("en-IN");
  const lines = [
    `# ${escapeMarkdown(title.trim() || "Bug report triage brief")}`,
    "",
    `Generated ${generated}`,
    "",
    "## Overview",
    "",
    `- Selected reports: ${summary.count}`,
    `- Open: ${summary.open}`,
    `- Resolved: ${summary.closed}`,
    `- High severity open: ${summary.high}`,
    `- Critical severity open: ${summary.critical}`,
    `- Repeat reports: ${summary.repeats}`,
    `- Total submission volume: ${summary.totalSubmissions}`,
    "",
    "## Selected reports",
    "",
  ];

  entries.forEach((entry, index) => {
    const age = getAgeInDays(entry, today);
    lines.push(
      `### ${index + 1}. ${escapeMarkdown(entry.title)}`,
      "",
      `- Status: ${entry.status === "closed" ? "Resolved" : "Open"}`,
      `- Severity: ${escapeMarkdown(entry.severity)}`,
      `- Category: ${escapeMarkdown(entry.category)}`,
      `- Reported: ${formatDate(entry.date)}`,
      `- Age: ${formatAge(age)}`,
      `- Repeat submissions: ${entry.repeatCount}`,
      `- Report ID: ${escapeMarkdown(entry.id || "Not available")}`,
    );
    if (entry.url) lines.push(`- Affected page: ${entry.url}`);
    lines.push("");
    if (entry.description) {
      lines.push("Description:", "", escapeMarkdown(entry.description), "");
    }
  });

  lines.push(
    "---",
    "",
    "This brief was generated from the reports selected in the tester dashboard. Screenshots and private browser-only notes are not included.",
    "",
  );
  return lines.join("\n");
}

function createCsvBrief(entries, today) {
  const header = [
    "Report ID",
    "Title",
    "Status",
    "Severity",
    "Category",
    "Reported date",
    "Age in days",
    "Repeat submissions",
    "Affected page",
    "Description",
  ];
  const rows = entries.map((entry) => [
    entry.id,
    entry.title,
    entry.status === "closed" ? "Resolved" : "Open",
    entry.severity,
    entry.category,
    entry.date ? formatDate(entry.date) : "",
    getAgeInDays(entry, today) ?? "",
    entry.repeatCount,
    entry.url,
    entry.description,
  ]);
  return [header, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");
}

function downloadFile(contents, mimeType, fileName) {
  const blob = new Blob([`\uFEFF${contents}`], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
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

function SummaryCard({ label, value, detail, tone }) {
  const tones = {
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };
  return (
    <article className="rounded-xl border border-slate-200/80 bg-white p-3">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">
        {formatNumber(value)}
      </p>
      <p className="mt-1 text-[9px] text-slate-400">{detail}</p>
      <span className={`mt-2 inline-flex h-1 w-8 rounded-full ${tones[tone]}`} />
    </article>
  );
}

function SeverityTag({ severity }) {
  const normalized = severity.toLowerCase();
  const tone =
    normalized === "critical" || normalized === "high"
      ? "bg-rose-50 text-rose-700"
      : normalized === "medium"
        ? "bg-amber-50 text-amber-700"
        : normalized === "low"
          ? "bg-sky-50 text-sky-700"
          : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${tone}`}>
      {severity}
    </span>
  );
}

function StatusTag({ status }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[8px] font-semibold ${
        status === "closed"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {status === "closed" ? "Resolved" : "Open"}
    </span>
  );
}

function ReportBriefRow({
  entry,
  selected,
  today,
  onToggle,
  onOpenReport,
  priority,
}) {
  const age = getAgeInDays(entry, today);
  const idLabel = entry.id ? `#${entry.id.slice(-10)}` : "No report ID";
  return (
    <article
      className={`rounded-xl border p-3 transition ${
        selected
          ? "border-violet-200 bg-violet-50/50"
          : "border-slate-200/80 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`${selected ? "Remove" : "Add"} ${entry.title} ${
            selected ? "from" : "to"
          } the brief`}
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-violet-600 accent-violet-600 focus:ring-violet-500"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-slate-800">
                {entry.title}
              </p>
              <p className="mt-1 text-[8px] text-slate-400">
                {idLabel} · {entry.category} · {formatDate(entry.date)}
              </p>
            </div>
            <span
              className="shrink-0 rounded-md bg-violet-50 px-1.5 py-1 text-[8px] font-semibold tabular-nums text-violet-700"
              title="Advisory triage priority, not an SLA or product severity"
            >
              Priority {formatNumber(priority)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusTag status={entry.status} />
            <SeverityTag severity={entry.severity} />
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[8px] text-slate-600">
              {formatAge(age)}
            </span>
            {entry.repeatCount > 1 && (
              <span className="rounded-full bg-violet-50 px-2 py-1 text-[8px] text-violet-700">
                {formatNumber(entry.repeatCount)} submissions
              </span>
            )}
          </div>
          {entry.description && (
            <p className="mt-2 line-clamp-2 text-[9px] leading-4 text-slate-500">
              {entry.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            {entry.url ? (
              <a
                href={entry.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-[75%] items-center gap-1 truncate text-[8px] text-violet-700 underline-offset-2 hover:underline"
              >
                <span className="truncate">{entry.url}</span>
                <ArrowUpRight size={10} aria-hidden="true" />
              </a>
            ) : (
              <span className="text-[8px] text-slate-400">
                No shareable page URL
              </span>
            )}
            {onOpenReport && (
              <button
                type="button"
                onClick={() => onOpenReport(entry.report)}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[8px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                View report
                <ArrowUpRight size={10} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function DistributionList({ label, values }) {
  const rows = [...values.entries()].sort(
    (left, right) =>
      right[1] - left[1] || left[0].localeCompare(right[0]),
  );
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-[8px] text-slate-400">
        No {label.toLowerCase()} to summarize yet.
      </div>
    );
  }

  const maximum = Math.max(1, ...rows.map(([, count]) => count));
  return (
    <div className="space-y-2">
      {rows.slice(0, 5).map(([name, count]) => (
        <div key={name}>
          <div className="mb-1 flex items-center justify-between gap-2 text-[8px]">
            <span className="truncate font-medium text-slate-600">{name}</span>
            <span className="shrink-0 tabular-nums text-slate-400">
              {formatNumber(count)}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-violet-400 transition-all"
              style={{ width: `${(count / maximum) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function BriefPreview({ title, entries, summary, today }) {
  const preview = entries.slice(0, 4);
  return (
    <section
      aria-label="Brief preview"
      className="overflow-hidden rounded-xl border border-slate-200/80 bg-white"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-violet-700 shadow-sm">
            <FileText size={13} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[9px] font-semibold text-slate-700">
              Brief preview
            </p>
            <p className="text-[8px] text-slate-400">
              {formatNumber(entries.length)} selected
            </p>
          </div>
        </div>
        <span className="rounded-full bg-violet-50 px-2 py-1 text-[8px] font-medium text-violet-700">
          Draft
        </span>
      </div>
      <div className="space-y-3 p-3">
        <div>
          <h3 className="text-xs font-semibold text-slate-900">
            {title.trim() || "Bug report triage brief"}
          </h3>
          <p className="mt-1 text-[8px] text-slate-400">
            Created {formatDate(new Date())}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            ["Open", summary.open],
            ["Resolved", summary.closed],
            ["High", summary.high],
            ["Critical", summary.critical],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-slate-50 px-2 py-1.5">
              <p className="text-[7px] font-medium uppercase tracking-wide text-slate-400">
                {label}
              </p>
              <p className="mt-0.5 text-[10px] font-bold tabular-nums text-slate-700">
                {formatNumber(value)}
              </p>
            </div>
          ))}
        </div>
        <div>
          <p className="mb-1.5 text-[8px] font-semibold text-slate-600">
            Included reports
          </p>
          {preview.length ? (
            <ul className="space-y-1.5">
              {preview.map((entry) => (
                <li
                  key={entry.key}
                  className="flex items-start gap-1.5 text-[8px] leading-4 text-slate-500"
                >
                  <span
                    className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                      entry.severity.toLowerCase() === "critical" ||
                      entry.severity.toLowerCase() === "high"
                        ? "bg-rose-500"
                        : "bg-violet-400"
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                  <span className="shrink-0 text-slate-400">
                    {entry.status === "closed" ? "Resolved" : "Open"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-[8px] text-slate-400">
              Select reports to build your brief.
            </p>
          )}
          {entries.length > preview.length && (
            <p className="mt-1.5 text-[8px] text-slate-400">
              + {formatNumber(entries.length - preview.length)} more selected
            </p>
          )}
        </div>
        {entries.length > 0 && (
          <div className="border-t border-slate-100 pt-2">
            <p className="text-[7px] leading-4 text-slate-400">
              Oldest selected open report:{" "}
              {summary.open ? `${formatNumber(summary.oldestOpenAge)} days` : "None"}
              {summary.open ? ` · as of ${formatDate(today)}` : ""}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyResults({ hasReports, onReset }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center">
      <div>
        <span className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-400 shadow-sm">
          <Search size={16} aria-hidden="true" />
        </span>
        <p className="mt-2 text-[10px] font-semibold text-slate-700">
          {hasReports ? "No reports match these filters" : "No reports to brief yet"}
        </p>
        <p className="mt-1 text-[8px] leading-4 text-slate-500">
          {hasReports
            ? "Try a different search or reset one of the active filters."
            : "Reports will appear here when the dashboard has loaded them."}
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

function PrivacyNote() {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5">
      <ShieldCheck
        size={13}
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-sky-700"
      />
      <p className="text-[8px] leading-4 text-sky-800">
        Exports include only selected report details and safe HTTP(S) page URLs.
        Screenshots, authentication data, and browser-only triage notes are
        excluded. Review the file before sharing it.
      </p>
    </div>
  );
}

export default function ReportBriefBuilder({ reports = [], onOpenReport }) {
  const [range, setRange] = useState("all");
  const [status, setStatus] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [notice, setNotice] = useState("");

  const entries = useMemo(() => getEntries(reports), [reports]);
  const today = useMemo(() => startOfDay(new Date()), []);
  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...[...new Set(entries.map((entry) => entry.category))]
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ value, label: value })),
    ],
    [entries],
  );
  const severityOptions = useMemo(
    () => [
      { value: "all", label: "All severities" },
      ...[...new Set(entries.map((entry) => entry.severity))]
        .sort(
          (left, right) =>
            getSeverityRank(left) - getSeverityRank(right) ||
            left.localeCompare(right),
        )
        .map((value) => ({ value, label: value })),
    ],
    [entries],
  );
  const filteredEntries = useMemo(
    () =>
      sortEntries(
        filterEntries(
          entries,
          { range, status, severity, category, search },
          today,
        ),
        sortBy,
        today,
      ),
    [category, entries, range, search, severity, sortBy, status, today],
  );
  const filteredKeys = useMemo(
    () => new Set(filteredEntries.map((entry) => entry.key)),
    [filteredEntries],
  );
  const selectedEntries = useMemo(
    () => entries.filter((entry) => selectedIds.has(entry.key)),
    [entries, selectedIds],
  );
  const selectedSummary = useMemo(
    () => summarizeEntries(selectedEntries, today),
    [selectedEntries, today],
  );
  const hasActiveFilters =
    range !== "all" ||
    status !== "all" ||
    severity !== "all" ||
    category !== "all" ||
    Boolean(search.trim());
  const allVisibleSelected =
    filteredEntries.length > 0 &&
    filteredEntries.every((entry) => selectedIds.has(entry.key));
  const selectedLimitReached = selectedIds.size >= MAX_SELECTED_REPORTS;

  const resetFilters = () => {
    setRange("all");
    setStatus("all");
    setSeverity("all");
    setCategory("all");
    setSearch("");
  };

  const toggleEntry = (key) => {
    const next = new Set(selectedIds);
    if (next.has(key)) {
      next.delete(key);
      setNotice("");
    } else if (next.size < MAX_SELECTED_REPORTS) {
      next.add(key);
      setNotice("");
    } else {
      setNotice(
        `A brief can include up to ${formatNumber(MAX_SELECTED_REPORTS)} reports.`,
      );
    }
    setSelectedIds(next);
  };

  const toggleVisible = () => {
    const next = new Set(selectedIds);
    if (allVisibleSelected) {
      filteredKeys.forEach((key) => next.delete(key));
      setNotice("");
      setSelectedIds(next);
      return;
    }

    const newKeys = filteredEntries
      .map((entry) => entry.key)
      .filter((key) => !next.has(key));
    const capacity = MAX_SELECTED_REPORTS - next.size;
    newKeys.slice(0, capacity).forEach((key) => next.add(key));
    if (newKeys.length > capacity) {
      setNotice(
        `Added ${formatNumber(capacity)} reports. The ${formatNumber(
          MAX_SELECTED_REPORTS,
        )}-report selection limit is reached.`,
      );
    } else {
      setNotice("");
    }
    setSelectedIds(next);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setNotice("");
  };

  const orderedSelectedEntries = useMemo(
    () => sortEntries(selectedEntries, sortBy, today),
    [selectedEntries, sortBy, today],
  );

  const exportMarkdown = () => {
    if (!orderedSelectedEntries.length) {
      setNotice("Select at least one report before exporting a brief.");
      return;
    }
    const contents = createMarkdownBrief(
      orderedSelectedEntries,
      selectedSummary,
      title,
      today,
    );
    downloadFile(
      contents,
      "text/markdown;charset=utf-8",
      "bug-report-triage-brief.md",
    );
    setNotice(
      `Markdown brief created with ${formatNumber(
        orderedSelectedEntries.length,
      )} reports.`,
    );
  };

  const exportCsv = () => {
    if (!orderedSelectedEntries.length) {
      setNotice("Select at least one report before exporting a brief.");
      return;
    }
    const contents = createCsvBrief(orderedSelectedEntries, today);
    downloadFile(
      contents,
      "text/csv;charset=utf-8",
      "bug-report-triage-brief.csv",
    );
    setNotice(
      `CSV brief created with ${formatNumber(
        orderedSelectedEntries.length,
      )} reports.`,
    );
  };

  const copyMarkdown = async () => {
    if (!orderedSelectedEntries.length) {
      setNotice("Select at least one report before copying a brief.");
      return;
    }
    if (!navigator.clipboard?.writeText) {
      setNotice("Clipboard access is unavailable in this browser.");
      return;
    }
    try {
      await navigator.clipboard.writeText(
        createMarkdownBrief(
          orderedSelectedEntries,
          selectedSummary,
          title,
          today,
        ),
      );
      setNotice("Brief copied to the clipboard.");
    } catch (error) {
      console.error("Could not copy the report brief:", error);
      setNotice("Could not copy the brief. Check clipboard permissions and retry.");
    }
  };

  const searchId = "report-brief-search";
  const titleId = "report-brief-title";

  return (
    <section
      aria-labelledby="report-brief-builder-heading"
      className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30"
    >
      <header className="border-b border-slate-100 bg-gradient-to-br from-sky-50/60 via-white to-violet-50/40 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-sky-100 bg-sky-50 text-sky-700">
              <FileText size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-sky-700">
                Patch 7 · Shareable triage
              </p>
              <h2
                id="report-brief-builder-heading"
                className="mt-1 text-base font-semibold tracking-tight text-slate-950"
              >
                Report brief builder
              </h2>
              <p className="mt-1 max-w-2xl text-[10px] leading-4 text-slate-500">
                Select a focused set of reports and create a review-ready
                Markdown or CSV brief. Nothing is sent to a server.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={copyMarkdown}
              disabled={!selectedIds.size}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Clipboard size={12} aria-hidden="true" />
              Copy brief
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!selectedIds.size}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Download size={12} aria-hidden="true" />
              CSV
            </button>
            <button
              type="button"
              onClick={exportMarkdown}
              disabled={!selectedIds.size}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-700 px-2.5 text-[9px] font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Download size={12} aria-hidden="true" />
              Markdown
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SelectControl
            label="Filter reports by date range"
            value={range}
            options={RANGE_OPTIONS}
            onChange={setRange}
          />
          <SelectControl
            label="Filter reports by status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={setStatus}
          />
          <SelectControl
            label="Filter reports by severity"
            value={severity}
            options={severityOptions}
            onChange={setSeverity}
          />
          <SelectControl
            label="Filter reports by category"
            value={category}
            options={categoryOptions}
            onChange={setCategory}
          />
          <SelectControl
            label="Sort reports"
            value={sortBy}
            options={SORT_OPTIONS}
            onChange={setSortBy}
          />
          <label htmlFor={searchId} className="relative min-w-[170px] flex-1 sm:max-w-xs">
            <Search
              size={12}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reports"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </label>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[9px] font-semibold text-slate-500 transition hover:bg-white hover:text-violet-700"
            >
              <X size={11} aria-hidden="true" />
              Reset
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[9px] text-slate-500">
            <Filter size={11} aria-hidden="true" />
            {formatNumber(filteredEntries.length)} matching reports
          </span>
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-violet-700">
            <ListChecks size={12} aria-hidden="true" />
            {formatNumber(selectedIds.size)} / {formatNumber(MAX_SELECTED_REPORTS)} selected
          </span>
        </div>
      </header>

      <div className="space-y-3 p-3 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Selected reports"
            value={selectedSummary.count}
            detail={`${formatNumber(selectedSummary.totalSubmissions)} total submissions`}
            tone="violet"
          />
          <SummaryCard
            label="Open"
            value={selectedSummary.open}
            detail={`${formatNumber(selectedSummary.closed)} resolved`}
            tone="amber"
          />
          <SummaryCard
            label="High / critical"
            value={selectedSummary.high + selectedSummary.critical}
            detail={`${formatNumber(selectedSummary.critical)} critical · ${formatNumber(selectedSummary.high)} high`}
            tone="rose"
          />
          <SummaryCard
            label="Repeat reports"
            value={selectedSummary.repeats}
            detail="More than one submission"
            tone="emerald"
          />
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
          <section className="min-w-0 rounded-xl border border-slate-200/80 bg-slate-50/40 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-[10px] font-semibold text-slate-800">
                  Choose reports
                </h3>
                <p className="mt-0.5 text-[8px] text-slate-400">
                  Priority is advisory and combines severity, age, status, and repeats.
                </p>
              </div>
              <div className="flex items-center gap-1">
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[8px] font-semibold text-slate-500 hover:bg-white hover:text-slate-700"
                  >
                    <X size={10} aria-hidden="true" />
                    Clear selection
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleVisible}
                  disabled={
                    !filteredEntries.length ||
                    (selectedLimitReached && !allVisibleSelected)
                  }
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[8px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {allVisibleSelected ? (
                    <Check size={10} aria-hidden="true" />
                  ) : (
                    <CheckCheck size={10} aria-hidden="true" />
                  )}
                  {allVisibleSelected ? "Unselect visible" : "Select visible"}
                </button>
              </div>
            </div>

            {filteredEntries.length ? (
              <ul className="max-h-[660px] space-y-2 overflow-y-auto pr-1">
                {filteredEntries.map((entry) => (
                  <li key={entry.key}>
                    <ReportBriefRow
                      entry={entry}
                      selected={selectedIds.has(entry.key)}
                      today={today}
                      priority={getPriorityScore(entry, today)}
                      onToggle={() => toggleEntry(entry.key)}
                      onOpenReport={onOpenReport}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyResults
                hasReports={entries.length > 0}
                onReset={resetFilters}
              />
            )}
          </section>

          <aside className="space-y-3">
            <section className="rounded-xl border border-slate-200/80 bg-white p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-50 text-violet-700">
                  <Sparkles size={13} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-[9px] font-semibold text-slate-800">
                    Brief details
                  </h3>
                  <p className="text-[8px] text-slate-400">
                    Customize the exported title.
                  </p>
                </div>
              </div>
              <label htmlFor={titleId} className="sr-only">
                Brief title
              </label>
              <input
                id={titleId}
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value.slice(0, 120))}
                maxLength={120}
                placeholder="Bug report triage brief"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              <p className="mt-1 text-right text-[8px] tabular-nums text-slate-400">
                {title.length} / 120
              </p>
            </section>

            <BriefPreview
              title={title}
              entries={orderedSelectedEntries}
              summary={summary}
              today={today}
            />

            <section className="rounded-xl border border-slate-200/80 bg-white p-3">
              <h3 className="mb-2 text-[9px] font-semibold text-slate-800">
                Selected categories
              </h3>
              <DistributionList
                label="Categories"
                values={selectedSummary.categories}
              />
            </section>

            <section className="rounded-xl border border-slate-200/80 bg-white p-3">
              <h3 className="mb-2 text-[9px] font-semibold text-slate-800">
                Selected severities
              </h3>
              <DistributionList
                label="Severities"
                values={selectedSummary.severities}
              />
            </section>

            <PrivacyNote />
          </aside>
        </div>

        {notice && (
          <p
            role="status"
            aria-live="polite"
            className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-[9px] text-violet-800"
          >
            {notice}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
          <p className="max-w-3xl text-[8px] leading-4 text-slate-400">
            The brief is generated locally in this browser from the reports you
            select. Priority is a convenience sort, not a severity change or
            service-level commitment. Verify the selected content before sharing.
          </p>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[8px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            >
              <X size={10} aria-hidden="true" />
              Clear {formatNumber(selectedIds.size)} selected
            </button>
          )}
        </div>

        <span className="sr-only" aria-live="polite">
          {formatNumber(selectedIds.size)} reports selected for the brief.
          {selectedSummary.open} are open, {selectedSummary.closed} are resolved, and{" "}
          {selectedSummary.high + selectedSummary.critical} are high or critical severity.
        </span>
      </div>
    </section>
  );
}
