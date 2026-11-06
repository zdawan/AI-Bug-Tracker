"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownWideNarrow,
  ArrowUpRight,
  BadgeCheck,
  CalendarX,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Download,
  FileWarning,
  FilterX,
  Info,
  Search,
  ShieldAlert,
  Tags,
  X,
} from "lucide-react";

const INITIAL_VISIBLE = 10;
const MAX_ISSUES_PER_REPORT = 20;
const FUTURE_CLOCK_TOLERANCE_MS = 5 * 60 * 1000;
const MIN_DESCRIPTION_LENGTH = 40;
const KNOWN_STATUSES = new Set(["open", "closed"]);
const KNOWN_SEVERITIES = new Set([
  "critical",
  "blocker",
  "urgent",
  "high",
  "medium",
  "low",
]);

const SEVERITY_OPTIONS = [
  { value: "all", label: "All audit levels" },
  { value: "error", label: "Errors" },
  { value: "warning", label: "Warnings" },
  { value: "info", label: "Info" },
];
const QUICK_LEVELS = [
  { value: "all", label: "All levels" },
  { value: "error", label: "Errors" },
  { value: "warning", label: "Warnings" },
  { value: "info", label: "Info" },
];

const SORT_OPTIONS = [
  { value: "risk", label: "Most issues first" },
  { value: "severity", label: "Highest severity first" },
  { value: "title", label: "Title A–Z" },
  { value: "category", label: "Category A–Z" },
];

const CHECK_LABELS = {
  duplicate_id: "Duplicate report ID",
  missing_id: "Missing report ID",
  missing_title: "Missing title",
  short_title: "Very short title",
  missing_description: "Missing description",
  short_description: "Short description",
  invalid_status: "Unknown status",
  missing_severity: "Missing severity",
  unknown_severity: "Unknown severity",
  missing_category: "Missing category",
  missing_date: "Missing submission date",
  invalid_date: "Invalid submission date",
  future_date: "Future submission date",
  invalid_url: "Invalid report URL",
  invalid_repeat_count: "Invalid repeat count",
};

function getText(value, limit = 4000) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function getId(report) {
  const raw = report?._id ?? report?.id;
  return raw === null || raw === undefined ? "" : String(raw).trim();
}

function getTitle(report) {
  return getText(report?.title, 240) || getText(report?.summary, 240);
}

function getCategory(report) {
  return getText(report?.category, 120);
}

function getStatus(report) {
  return getText(report?.status, 80);
}

function getSeverity(report) {
  return getText(report?.severity, 80);
}

function getDateValue(report) {
  return report?.createdAt ?? report?.created_at ?? report?.reportedAt;
}

function getUrlValue(report) {
  return getText(report?.url || report?.pageUrl || report?.page_url, 1000);
}

function addIssue(issues, code, level, message) {
  if (issues.length >= MAX_ISSUES_PER_REPORT) return;
  issues.push({
    code,
    level,
    label: CHECK_LABELS[code] || "Data issue",
    message,
  });
}

function buildDuplicateIdCounts(reports) {
  const counts = new Map();
  reports.forEach((report) => {
    const id = getId(report);
    if (id) counts.set(id, (counts.get(id) || 0) + 1);
  });
  return counts;
}

function auditReport(report, idCounts, now) {
  const issues = [];
  const id = getId(report);
  const title = getTitle(report);
  const description =
    typeof report?.description === "string" ? report.description.trim() : "";
  const status = getStatus(report);
  const severity = getSeverity(report);
  const category = getCategory(report);

  if (!id) {
    addIssue(
      issues,
      "missing_id",
      "error",
      "The report has no usable identifier for reliable referencing.",
    );
  } else if ((idCounts.get(id) || 0) > 1) {
    addIssue(
      issues,
      "duplicate_id",
      "error",
      `This identifier appears ${idCounts.get(id)} times in the loaded report set.`,
    );
  }

  if (!title) {
    addIssue(
      issues,
      "missing_title",
      "warning",
      "Neither a title nor a summary is present.",
    );
  } else if (title.length < 5) {
    addIssue(
      issues,
      "short_title",
      "info",
      "The title is very short and may be difficult to identify in queues.",
    );
  }

  if (!description) {
    addIssue(
      issues,
      "missing_description",
      "warning",
      "No description text is available for this report.",
    );
  } else if (description.length < MIN_DESCRIPTION_LENGTH) {
    addIssue(
      issues,
      "short_description",
      "info",
      `The description has ${description.length} characters; the dashboard's guidance uses ${MIN_DESCRIPTION_LENGTH} as a context threshold.`,
    );
  }

  if (!status || !KNOWN_STATUSES.has(status.toLowerCase())) {
    addIssue(
      issues,
      "invalid_status",
      "error",
      status
        ? `Status "${status}" is outside the expected Open/Closed values.`
        : "Status is missing from this report.",
    );
  }

  if (!severity) {
    addIssue(
      issues,
      "missing_severity",
      "warning",
      "Severity is not set.",
    );
  } else if (!KNOWN_SEVERITIES.has(severity.toLowerCase())) {
    addIssue(
      issues,
      "unknown_severity",
      "warning",
      `Severity "${severity}" is not one of the familiar severity labels.`,
    );
  }

  if (!category) {
    addIssue(
      issues,
      "missing_category",
      "info",
      "Category is blank; analytics may group this report as uncategorized.",
    );
  }

  const rawDate = getDateValue(report);
  if (rawDate === null || rawDate === undefined || rawDate === "") {
    addIssue(
      issues,
      "missing_date",
      "warning",
      "No submission timestamp is available.",
    );
  } else {
    const timestamp = new Date(rawDate).getTime();
    if (!Number.isFinite(timestamp)) {
      addIssue(
        issues,
        "invalid_date",
        "warning",
        "The submission timestamp cannot be parsed as a date.",
      );
    } else if (timestamp > now + FUTURE_CLOCK_TOLERANCE_MS) {
      addIssue(
        issues,
        "future_date",
        "warning",
        "The submission timestamp is noticeably in the future.",
      );
    }
  }

  const url = getUrlValue(report);
  if (url) {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        addIssue(
          issues,
          "invalid_url",
          "warning",
          "The supplied report URL does not use HTTP or HTTPS.",
        );
      }
    } catch {
      addIssue(
        issues,
        "invalid_url",
        "warning",
        "The supplied report URL is not a valid absolute URL.",
      );
    }
  }

  const rawRepeatCount = report?.reports;
  if (
    rawRepeatCount !== null &&
    rawRepeatCount !== undefined &&
    rawRepeatCount !== ""
  ) {
    const count = Number(rawRepeatCount);
    if (!Number.isFinite(count) || count < 1) {
      addIssue(
        issues,
        "invalid_repeat_count",
        "warning",
        "The repeat/submission count is present but is not a positive number.",
      );
    }
  }

  return {
    report,
    id,
    title: title || "Untitled report",
    category: category || "Uncategorized",
    status: status || "Missing",
    severity: severity || "Unspecified",
    issues,
    errorCount: issues.filter((issue) => issue.level === "error").length,
    warningCount: issues.filter((issue) => issue.level === "warning").length,
    infoCount: issues.filter((issue) => issue.level === "info").length,
  };
}

function getIssueWeight(entry) {
  const issues = entry.visibleIssues || entry.issues;
  return (
    issues.filter((issue) => issue.level === "error").length * 100 +
    issues.filter((issue) => issue.level === "warning").length * 10 +
    issues.filter((issue) => issue.level === "info").length
  );
}

function summarizeAudit(entries) {
  return entries.reduce(
    (result, entry) => {
      result.reports += 1;
      const issues = entry.visibleIssues || entry.issues;
      if (issues.length) result.affected += 1;
      result.errors += issues.filter((issue) => issue.level === "error").length;
      result.warnings += issues.filter(
        (issue) => issue.level === "warning",
      ).length;
      result.info += issues.filter((issue) => issue.level === "info").length;
      issues.forEach((issue) => {
        result.byCheck[issue.code] = (result.byCheck[issue.code] || 0) + 1;
      });
      return result;
    },
    {
      reports: 0,
      affected: 0,
      errors: 0,
      warnings: 0,
      info: 0,
      byCheck: {},
    },
  );
}

function buildCsv(entries) {
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = [
    [
      "Report ID",
      "Title",
      "Category",
      "Status",
      "Severity",
      "Audit level",
      "Finding",
      "Finding details",
    ],
  ];

  entries.forEach((entry) => {
    if (!entry.issues.length) {
      rows.push([
        entry.id,
        entry.title,
        entry.category,
        entry.status,
        entry.severity,
        "Clean",
        "No findings",
        "",
      ]);
      return;
    }
    entry.issues.forEach((issue) => {
      rows.push([
        entry.id,
        entry.title,
        entry.category,
        entry.status,
        entry.severity,
        issue.level,
        issue.label,
        issue.message,
      ]);
    });
  });

  return `\uFEFF${rows.map((row) => row.map(escape).join(",")).join("\r\n")}`;
}

function downloadCsv(entries) {
  const blob = new Blob([buildCsv(entries)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `report-data-audit-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
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
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    sky: "border-sky-100 bg-sky-50 text-sky-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
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

function LevelBadge({ level }) {
  const styles = {
    error: "border-rose-200 bg-rose-50 text-rose-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    info: "border-sky-200 bg-sky-50 text-sky-700",
  };
  const Icon =
    level === "error" ? AlertCircle : level === "warning" ? AlertTriangle : Info;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8px] font-semibold uppercase ${styles[level]}`}
    >
      <Icon size={10} aria-hidden="true" />
      {level}
    </span>
  );
}

function AuditIssueRow({ issue }) {
  return (
    <li className="flex flex-col gap-1.5 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-700">{issue.label}</p>
        <p className="mt-0.5 text-[9px] leading-4 text-slate-500">
          {issue.message}
        </p>
      </div>
      <LevelBadge level={issue.level} />
    </li>
  );
}

function AuditReportCard({ entry, onOpenReport }) {
  const [expanded, setExpanded] = useState(false);
  const tone =
    entry.errorCount > 0
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : entry.warningCount > 0
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : entry.infoCount > 0
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/20">
      <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-start sm:justify-between sm:p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[9px] font-semibold text-slate-400">
              {entry.id ? `#${entry.id.slice(-8)}` : "Missing ID"}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[8px] font-semibold ${tone}`}
            >
              {entry.issues.length
                ? `${entry.issues.length} finding${entry.issues.length === 1 ? "" : "s"}`
                : "No findings"}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[8px] text-slate-500">
              {entry.status}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[8px] text-slate-500">
              {entry.severity}
            </span>
          </div>
          <h3 className="mt-1.5 truncate text-xs font-semibold text-slate-900">
            {entry.title}
          </h3>
          <p className="mt-1 text-[9px] text-slate-500">{entry.category}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {entry.errorCount > 0 && (
              <span className="text-[8px] font-medium text-rose-700">
                {entry.errorCount} errors
              </span>
            )}
            {entry.warningCount > 0 && (
              <span className="text-[8px] font-medium text-amber-700">
                {entry.warningCount} warnings
              </span>
            )}
            {entry.infoCount > 0 && (
              <span className="text-[8px] font-medium text-sky-700">
                {entry.infoCount} info
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onOpenReport && (
            <button
              type="button"
              onClick={() => onOpenReport(entry.report)}
              className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
            >
              Open report
              <ArrowUpRight size={11} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            {expanded ? "Hide" : "Details"}
            <ChevronDown
              size={11}
              className={expanded ? "rotate-180" : ""}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-slate-100 p-3.5 sm:p-4">
          {entry.issues.length ? (
            <ul className="space-y-2">
              {entry.issues.map((issue, index) => (
                <AuditIssueRow key={`${issue.code}-${index}`} issue={issue} />
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-3 text-[10px] text-emerald-800">
              <BadgeCheck size={14} aria-hidden="true" />
              No findings from the current audit checks.
            </p>
          )}
          <p className="mt-3 flex items-start gap-1.5 text-[8px] leading-4 text-slate-400">
            <Info size={10} className="mt-0.5 shrink-0" aria-hidden="true" />
            Findings are advisory and depend on fields included in the loaded
            report snapshot. No report content is changed.
          </p>
        </div>
      )}
    </article>
  );
}

function CheckBreakdown({ summary }) {
  const rows = Object.entries(summary.byCheck)
    .map(([code, count]) => ({
      code,
      count,
      label: CHECK_LABELS[code] || "Other",
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, 8);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold text-slate-800">
            Findings by check
          </h3>
          <p className="mt-1 text-[9px] text-slate-500">
            Most common field-integrity observations.
          </p>
        </div>
        <Tags size={14} className="text-violet-500" aria-hidden="true" />
      </div>
      {rows.length ? (
        <div className="mt-3 space-y-2.5">
          {rows.map((row) => (
            <div key={row.code}>
              <div className="mb-1 flex items-center justify-between gap-2 text-[9px]">
                <span className="truncate font-medium text-slate-700">
                  {row.label}
                </span>
                <span className="shrink-0 text-slate-500 tabular-nums">
                  {formatNumber(row.count)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-400"
                  style={{
                    width: `${
                      summary.reports
                        ? Math.max(3, (row.count / summary.reports) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-slate-50 px-3 py-5 text-center text-[9px] text-slate-500">
          No findings in the selected report scope.
        </p>
      )}
    </div>
  );
}

function EmptyState({ hasReports, hasFilters, onReset }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-9 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-white text-slate-400 shadow-sm">
        {hasReports ? (
          <Search size={18} aria-hidden="true" />
        ) : (
          <FileWarning size={18} aria-hidden="true" />
        )}
      </span>
      <h3 className="mt-3 text-xs font-semibold text-slate-800">
        {hasReports
          ? "No reports match these audit filters"
          : "No report data to audit"}
      </h3>
      <p className="mx-auto mt-1 max-w-md text-[9px] leading-5 text-slate-500">
        {hasReports
          ? "Try a different finding level, category, or search term."
          : "Load report data to inspect consistency and completeness of the available fields."}
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

export default function ReportDataIntegrityAudit({
  reports = [],
  onOpenReport,
}) {
  const [levelFilter, setLevelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [checkFilter, setCheckFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortDirection, setSortDirection] = useState("desc");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("risk");
  const [onlyFindings, setOnlyFindings] = useState(true);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [exportMessage, setExportMessage] = useState("");

  const idCounts = useMemo(() => buildDuplicateIdCounts(reports), [reports]);
  const auditedEntries = useMemo(() => {
    const now = Date.now();
    return reports.map((report) => auditReport(report, idCounts, now));
  }, [idCounts, reports]);

  const categoryOptions = useMemo(() => {
    const categories = Array.from(
      new Set(auditedEntries.map((entry) => entry.category)),
    ).sort((left, right) => left.localeCompare(right));
    return [
      { value: "all", label: "All categories" },
      ...categories.map((category) => ({ value: category, label: category })),
    ];
  }, [auditedEntries]);

  const checkOptions = useMemo(() => {
    const available = new Set();
    auditedEntries.forEach((entry) =>
      entry.issues.forEach((issue) => available.add(issue.code)),
    );
    return [
      { value: "all", label: "All checks" },
      ...Array.from(available)
        .sort((left, right) =>
          (CHECK_LABELS[left] || left).localeCompare(CHECK_LABELS[right] || right),
        )
        .map((code) => ({
          value: code,
          label: CHECK_LABELS[code] || code,
        })),
    ];
  }, [auditedEntries]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return auditedEntries
      .map((entry) => ({
        ...entry,
        visibleIssues: entry.issues.filter(
          (issue) =>
            (levelFilter === "all" || issue.level === levelFilter) &&
            (checkFilter === "all" || issue.code === checkFilter),
        ),
      }))
      .filter((entry) => {
        if (categoryFilter !== "all" && entry.category !== categoryFilter) {
          return false;
        }
        if (
          statusFilter === "open" &&
          entry.status.toLowerCase() !== "open"
        ) {
          return false;
        }
        if (
          statusFilter === "closed" &&
          entry.status.toLowerCase() !== "closed"
        ) {
          return false;
        }
        if (onlyFindings && !entry.visibleIssues.length) return false;
        if (
          normalizedQuery &&
          ![
            entry.id,
            entry.title,
            entry.category,
            entry.status,
            entry.severity,
            ...entry.visibleIssues.map(
              (issue) => `${issue.label} ${issue.message}`,
            ),
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
        ) {
          return false;
        }
        return true;
      })
      .sort((left, right) => {
        let comparison = 0;
        if (sortBy === "severity") {
          const leftIssues = left.visibleIssues;
          const rightIssues = right.visibleIssues;
          const countLevel = (issues, level) =>
            issues.filter((issue) => issue.level === level).length;
          comparison =
            countLevel(rightIssues, "error") - countLevel(leftIssues, "error") ||
            countLevel(rightIssues, "warning") -
              countLevel(leftIssues, "warning") ||
            countLevel(rightIssues, "info") - countLevel(leftIssues, "info");
        } else if (sortBy === "title") {
          comparison = left.title.localeCompare(right.title);
        } else if (sortBy === "category") {
          comparison =
            left.category.localeCompare(right.category) ||
            left.title.localeCompare(right.title);
        } else {
          comparison = getIssueWeight(right) - getIssueWeight(left);
        }
        return sortDirection === "asc" ? -comparison : comparison;
      });
  }, [
    auditedEntries,
    categoryFilter,
    checkFilter,
    levelFilter,
    onlyFindings,
    query,
    sortBy,
    sortDirection,
    statusFilter,
  ]);

  const summary = useMemo(
    () => summarizeAudit(filteredEntries),
    [filteredEntries],
  );
  const allSummary = useMemo(
    () => summarizeAudit(auditedEntries),
    [auditedEntries],
  );
  const levelCounts = useMemo(
    () =>
      auditedEntries.reduce(
        (result, entry) => {
          const levels = new Set(entry.issues.map((issue) => issue.level));
          levels.forEach((level) => {
            result[level] += 1;
          });
          return result;
        },
        { error: 0, warning: 0, info: 0 },
      ),
    [auditedEntries],
  );
  const visibleEntries = filteredEntries.slice(0, visibleCount);
  const hasFilters =
    levelFilter !== "all" ||
    categoryFilter !== "all" ||
    statusFilter !== "all" ||
    checkFilter !== "all" ||
    Boolean(query.trim()) ||
    !onlyFindings;
  const cleanCount = allSummary.reports - allSummary.affected;
  const integrityRate = allSummary.reports
    ? Math.round((cleanCount / allSummary.reports) * 100)
    : 0;
  const hasMore = visibleCount < filteredEntries.length;

  const setFilter = (setter, value) => {
    setter(value);
    setVisibleCount(INITIAL_VISIBLE);
    setExportMessage("");
  };

  const toggleSortDirection = () => {
    setSortDirection((current) => (current === "desc" ? "asc" : "desc"));
    setVisibleCount(INITIAL_VISIBLE);
  };

  const resetFilters = () => {
    setLevelFilter("all");
    setCategoryFilter("all");
    setCheckFilter("all");
    setStatusFilter("all");
    setQuery("");
    setOnlyFindings(true);
    setVisibleCount(INITIAL_VISIBLE);
  };

  const handleExport = () => {
    setExportMessage("");
    try {
      const exportEntries = filteredEntries.map((entry) => ({
        ...entry,
        issues: entry.visibleIssues,
      }));
      downloadCsv(exportEntries);
      setExportMessage(
        `Exported ${formatNumber(filteredEntries.length)} filtered audit reports. Descriptions and URLs were excluded.`,
      );
    } catch {
      setExportMessage(
        "Could not create the audit CSV. Check browser download permissions and try again.",
      );
    }
  };

  return (
    <section className="mt-5 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
      <div className="border-b border-slate-200/80 bg-gradient-to-r from-amber-50/70 via-white to-sky-50/60 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-amber-100 bg-white text-amber-700 shadow-sm">
                <ClipboardCheck size={19} aria-hidden="true" />
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                Patch 15 · Read-only field audit
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                {integrityRate}% with no findings
              </span>
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">
              Report data integrity audit
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-slate-600">
              Find field inconsistencies in the loaded report snapshot:
              duplicate identifiers, unexpected statuses, invalid dates or
              URLs, and incomplete context. This panel is diagnostic only.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={!filteredEntries.length}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={14} aria-hidden="true" />
            Export filtered audit
          </button>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-sky-200/80 bg-sky-50/80 px-3.5 py-3 text-[9px] leading-5 text-sky-900/80">
          <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            Findings use conservative client-side checks against fields
            returned by the dashboard. They are advisory, do not modify any
            report, and may reflect incomplete data in the current response.
            CSV omits descriptions and URL values.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Reports audited"
            value={allSummary.reports}
            caption="All reports in the current dashboard data"
            icon={ClipboardCheck}
            tone="violet"
          />
          <MetricCard
            label="No findings"
            value={cleanCount}
            caption={`${integrityRate}% of loaded reports`}
            icon={CheckCircle2}
            tone="emerald"
          />
          <MetricCard
            label="Reports with findings"
            value={allSummary.affected}
            caption="At least one audit observation"
            icon={FileWarning}
            tone="amber"
          />
          <MetricCard
            label="Errors"
            value={allSummary.errors}
            caption="Duplicate IDs or unexpected status data"
            icon={ShieldAlert}
            tone="rose"
          />
          <MetricCard
            label="Warnings"
            value={allSummary.warnings}
            caption="Potentially incomplete or malformed values"
            icon={AlertTriangle}
            tone="sky"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
          <CheckBreakdown summary={allSummary} />
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold text-slate-800">
                  Audit coverage
                </h3>
                <p className="mt-1 text-[9px] leading-4 text-slate-500">
                  Read-only checks performed on each loaded report.
                </p>
              </div>
              <CircleHelp size={15} className="text-slate-400" aria-hidden="true" />
            </div>
            <ul className="mt-3 space-y-2">
              {[
                {
                  icon: FileWarning,
                  label: "Identity and title",
                  detail: "Missing IDs, duplicate IDs, blank or very short titles.",
                },
                {
                  icon: AlertCircle,
                  label: "Classification",
                  detail: "Status, severity, and category consistency.",
                },
                {
                  icon: CalendarX,
                  label: "Dates and context",
                  detail: "Submission timestamps, description length, and URL syntax.",
                },
                {
                  icon: Tags,
                  label: "Counts",
                  detail: "Positive numeric repeat/submission counts when present.",
                },
              ].map((check) => {
                const Icon = check.icon;
                return (
                  <li
                    key={check.label}
                    className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-violet-600">
                      <Icon size={13} aria-hidden="true" />
                    </span>
                    <span>
                      <strong className="block text-[9px] text-slate-700">
                        {check.label}
                      </strong>
                      <span className="mt-0.5 block text-[8px] leading-4 text-slate-500">
                        {check.detail}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-slate-800">
                Filter audit findings
              </h3>
              <p className="mt-1 text-[9px] text-slate-500">
                Filters apply to report rows and CSV export.
              </p>
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[9px] font-semibold text-violet-700 hover:bg-violet-50"
              >
                <X size={11} aria-hidden="true" />
                Clear filters
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SelectField
              label="Finding level"
              value={levelFilter}
              onChange={(value) => setFilter(setLevelFilter, value)}
              options={SEVERITY_OPTIONS}
            />
            <SelectField
              label="Check"
              value={checkFilter}
              onChange={(value) => setFilter(setCheckFilter, value)}
              options={checkOptions}
            />
            <SelectField
              label="Category"
              value={categoryFilter}
              onChange={(value) => setFilter(setCategoryFilter, value)}
              options={categoryOptions}
            />
            <SelectField
              label="Report status"
              value={statusFilter}
              onChange={(value) => setFilter(setStatusFilter, value)}
              options={[
                { value: "all", label: "Any status" },
                { value: "open", label: "Open reports" },
                { value: "closed", label: "Closed reports" },
              ]}
            />
            <SelectField
              label="Sort by"
              value={sortBy}
              onChange={(value) => setFilter(setSortBy, value)}
              options={SORT_OPTIONS}
            />
            <label className="grid gap-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Search
              </span>
              <span className="relative">
                <Search
                  size={12}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setFilter(setQuery, event.target.value)}
                  placeholder="ID, title, finding…"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                />
              </span>
            </label>
          </div>
          <div
            className="mt-3 flex flex-wrap gap-2"
            aria-label="Quick audit level filters"
          >
            {QUICK_LEVELS.map((level) => {
              const count =
                level.value === "all"
                  ? allSummary.affected
                  : levelCounts[level.value];
              return (
                <button
                  key={level.value}
                  type="button"
                  aria-pressed={levelFilter === level.value}
                  onClick={() => setFilter(setLevelFilter, level.value)}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[9px] font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 ${
                    levelFilter === level.value
                      ? "border-violet-300 bg-violet-100 text-violet-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700"
                  }`}
                >
                  {level.label}
                  <span className="rounded-full bg-white/80 px-1.5 py-0.5 tabular-nums">
                    {formatNumber(count)}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[9px] text-slate-500">
              Sorted by {SORT_OPTIONS.find((option) => option.value === sortBy)?.label.toLowerCase()}
            </p>
            <button
              type="button"
              onClick={toggleSortDirection}
              aria-label={`Sort ${
                sortDirection === "desc" ? "ascending" : "descending"
              }`}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
            >
              <ArrowDownWideNarrow
                size={11}
                className={sortDirection === "asc" ? "rotate-180" : ""}
                aria-hidden="true"
              />
              {sortDirection === "desc" ? "Descending" : "Ascending"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex min-h-8 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-medium text-slate-600">
              <input
                type="checkbox"
                checked={onlyFindings}
                onChange={(event) =>
                  setFilter(setOnlyFindings, event.target.checked)
                }
                className="h-3.5 w-3.5 rounded border-slate-300 accent-violet-600 focus:ring-violet-200"
              />
              Only show reports with matching findings
            </label>
            <span className="text-[9px] text-slate-500" aria-live="polite">
              {formatNumber(filteredEntries.length)} reports ·{" "}
              {formatNumber(summary.errors)} errors ·{" "}
              {formatNumber(summary.warnings)} warnings ·{" "}
              {formatNumber(summary.info)} info
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

        {filteredEntries.length ? (
          <div className="space-y-2.5">
            {visibleEntries.map((entry) => (
              <AuditReportCard
                key={`${entry.id || "missing"}-${entry.title}`}
                entry={{ ...entry, issues: entry.visibleIssues }}
                onOpenReport={onOpenReport}
              />
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <p className="text-[9px] text-slate-500" aria-live="polite">
                Showing {formatNumber(visibleEntries.length)} of{" "}
                {formatNumber(filteredEntries.length)} reports
              </p>
              <div className="flex items-center gap-2">
                {visibleCount > INITIAL_VISIBLE && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount(INITIAL_VISIBLE)}
                    className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <ChevronDown
                      size={11}
                      className="rotate-180"
                      aria-hidden="true"
                    />
                    Show fewer
                  </button>
                )}
                {hasMore && (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount((current) =>
                        Math.min(current + INITIAL_VISIBLE, filteredEntries.length),
                      )
                    }
                    className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[9px] font-semibold text-violet-700 hover:bg-violet-100"
                  >
                    Show more
                    <ChevronDown size={11} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            hasReports={auditedEntries.length > 0}
            hasFilters={hasFilters}
            onReset={resetFilters}
          />
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-amber-950">
              <AlertTriangle size={13} aria-hidden="true" />
              Interpreting levels
            </p>
            <p className="mt-1.5 text-[9px] leading-5 text-amber-900/75">
              Errors identify likely structural conflicts such as duplicate IDs
              or an unexpected status. Warnings indicate missing or malformed
              values. Informational findings highlight opportunities to improve
              searchability and context.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800">
              <Info size={13} aria-hidden="true" />
              No automatic fixes
            </p>
            <p className="mt-1.5 text-[9px] leading-5 text-slate-600">
              This view is a client-side audit of the available response. It
              cannot determine whether a missing field is intentional and will
              never overwrite or silently normalize server data.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
