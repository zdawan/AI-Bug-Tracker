"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpRight,
  Bookmark,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Clipboard,
  Download,
  GitCompareArrows,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";

const MAX_COMPARISON_REPORTS = 4;
const MAX_SAVED_COMPARISONS = 8;
const STORAGE_PREFIX = "tester-report-comparisons-v1";

const COMPARISON_FIELDS = [
  {
    id: "title",
    label: "Title",
    group: "Overview",
    getValue: (report) => getText(report?.title || report?.summary, "Untitled"),
  },
  {
    id: "status",
    label: "Status",
    group: "Overview",
    getValue: (report) => getText(report?.status, "Unknown"),
  },
  {
    id: "severity",
    label: "Severity",
    group: "Overview",
    getValue: (report) => getText(report?.severity, "Unspecified"),
  },
  {
    id: "category",
    label: "Category",
    group: "Overview",
    getValue: (report) => getText(report?.category, "Uncategorized"),
  },
  {
    id: "submitted",
    label: "Submitted",
    group: "Overview",
    getValue: (report) => formatDate(report?.createdAt || report?.created_at),
  },
  {
    id: "reportCount",
    label: "Submission count",
    group: "Overview",
    getValue: (report) => String(getPositiveCount(report?.reports)),
  },
  {
    id: "tags",
    label: "Tags",
    group: "Overview",
    getValue: (report) =>
      Array.isArray(report?.tags) && report.tags.length
        ? report.tags.map((tag) => getText(tag)).filter(Boolean).join(", ")
        : "None",
  },
  {
    id: "description",
    label: "Description",
    group: "Report details",
    getValue: (report) => getText(report?.description, "No description"),
  },
  {
    id: "steps",
    label: "Reproduction steps",
    group: "Reproduction",
    getValue: (report) => formatList(getArray(report?.stepsToReproduce || report?.reproductionSteps || report?.steps)),
  },
  {
    id: "expected",
    label: "Expected result",
    group: "Reproduction",
    getValue: (report) =>
      getText(report?.expectedResult || report?.expected, "Not provided"),
  },
  {
    id: "actual",
    label: "Actual result",
    group: "Reproduction",
    getValue: (report) =>
      getText(report?.actualResult || report?.actual, "Not provided"),
  },
  {
    id: "environment",
    label: "Environment",
    group: "Environment",
    getValue: getEnvironmentValue,
  },
  {
    id: "pageUrl",
    label: "Affected page",
    group: "Environment",
    getValue: (report) =>
      getText(report?.testUrl || report?.url || report?.pageUrl || report?.page_url, "Not provided"),
  },
  {
    id: "browser",
    label: "Browser",
    group: "Environment",
    getValue: (report) => getText(report?.browser, "Not provided"),
  },
];

const GROUPS = ["Overview", "Report details", "Reproduction", "Environment"];
const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Resolved" },
];
const SEVERITY_FILTERS = [
  { value: "all", label: "All severities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function getText(value, fallback = "", limit = 3000) {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, limit) || fallback;
}

function getReportId(report) {
  const rawId = report?._id ?? report?.id;
  return rawId === null || rawId === undefined ? "" : String(rawId).trim();
}

function getPositiveCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 1;
}

function getArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => getText(item)).filter(Boolean);
  }
  if (typeof value !== "string") return [];
  return value
    .split(/\r?\n/)
    .map((item) => item.replace(/^\s*(?:\d+[.)]|[-*])\s*/, "").trim())
    .filter(Boolean);
}

function formatList(items) {
  return items.length ? items.map((item, index) => `${index + 1}. ${item}`).join("\n") : "Not provided";
}

function getEnvironmentValue(report) {
  const environment = report?.environment;
  if (typeof environment === "string") return getText(environment, "Not provided");
  if (environment && typeof environment === "object") {
    const values = Object.entries(environment)
      .filter(([, value]) => typeof value === "string" && value.trim())
      .map(([key, value]) => `${toLabel(key)}: ${value.trim()}`);
    return values.length ? values.join("\n") : "Not provided";
  }

  const values = [
    ["Platform", report?.platform || report?.os],
    ["Device", report?.device],
    ["Viewport", report?.viewport],
    ["Browser version", report?.browserVersion],
  ]
    .filter(([, value]) => typeof value === "string" && value.trim())
    .map(([label, value]) => `${label}: ${value.trim()}`);
  return values.length ? values.join("\n") : "Not provided";
}

function toLabel(value) {
  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function normalizeForComparison(value) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

function toCsvCell(value) {
  const raw = String(value ?? "").replace(/\r\n/g, "\n");
  const safe = /^[\t\r ]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function getComparisonStorageKey(email) {
  const normalizedEmail = getText(email).toLocaleLowerCase();
  return normalizedEmail
    ? `${STORAGE_PREFIX}:${encodeURIComponent(normalizedEmail)}`
    : "";
}

function normalizeSavedComparisons(value) {
  if (!Array.isArray(value)) {
    throw new Error("Saved comparisons have an unsupported format.");
  }

  return value.slice(0, MAX_SAVED_COMPARISONS).flatMap((entry) => {
    if (
      !entry ||
      typeof entry.id !== "string" ||
      typeof entry.name !== "string" ||
      !Array.isArray(entry.reportIds)
    ) {
      return [];
    }

    const reportIds = [...new Set(
      entry.reportIds.filter(
        (id) => typeof id === "string" && id.trim(),
      ),
    )].slice(0, MAX_COMPARISON_REPORTS);
    if (reportIds.length < 2) return [];

    return [
      {
        id: entry.id,
        name: entry.name.slice(0, 80),
        reportIds,
        updatedAt:
          typeof entry.updatedAt === "string" ? entry.updatedAt : "",
      },
    ];
  });
}

function getStatus(report) {
  return getText(report?.status).toLocaleLowerCase() === "closed"
    ? "closed"
    : "open";
}

function getSeverity(report) {
  return getText(report?.severity, "Unspecified").toLocaleLowerCase();
}

function getTitle(report) {
  return getText(report?.title || report?.summary, "Untitled report", 240);
}

function FieldValue({ value, compact = false }) {
  const isMissing = value === "Not provided" || value === "None";
  return (
    <p
      className={`whitespace-pre-wrap break-words ${
        compact ? "text-xs leading-5" : "text-sm leading-6"
      } ${isMissing ? "italic text-slate-400" : "text-slate-700"}`}
    >
      {value}
    </p>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-slate-600 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </label>
  );
}

function ComparisonMetric({ label, value, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-50 text-slate-900",
    violet: "bg-violet-50 text-violet-800",
    amber: "bg-amber-50 text-amber-800",
    emerald: "bg-emerald-50 text-emerald-800",
  };
  return (
    <div className={`rounded-xl px-3 py-2.5 ${tones[tone]}`}>
      <p className="text-[10px] font-medium opacity-70">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ReportChoiceCard({ report, selected, disabled, onToggle, onOpen }) {
  const id = getReportId(report);
  const severity = getSeverity(report);
  return (
    <article
      className={`rounded-xl border p-3 transition ${
        selected
          ? "border-violet-200 bg-violet-50/60"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={() => onToggle(id)}
          disabled={disabled || !id}
          aria-pressed={selected}
          aria-label={`${selected ? "Remove" : "Add"} ${getTitle(report)} ${
            selected ? "from" : "to"
          } comparison`}
          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-40 ${
            selected
              ? "border-violet-600 bg-violet-600 text-white"
              : "border-slate-300 bg-white text-transparent hover:border-violet-400"
          }`}
        >
          <Check size={12} aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="break-words text-xs font-semibold leading-5 text-slate-900">
              {getTitle(report)}
            </p>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${
                getStatus(report) === "closed"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-violet-50 text-violet-700"
              }`}
            >
              {getStatus(report) === "closed" ? "Resolved" : "Open"}
            </span>
          </div>
          <p className="mt-1 truncate text-[10px] text-slate-500">
            {id ? `#${id}` : "ID unavailable"} ·{" "}
            {getText(report?.category, "Uncategorized")} ·{" "}
            {getText(report?.severity, "Unspecified")}
          </p>
          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-400">
            {getText(report?.description, "No description")}
          </p>
        </div>
        <span
          title={`${severity} severity`}
          aria-label={`${severity} severity`}
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
            severity === "high" || severity === "critical"
              ? "bg-rose-500"
              : severity === "medium"
                ? "bg-amber-500"
                : severity === "low"
                  ? "bg-sky-500"
                  : "bg-slate-300"
          }`}
        />
        <button
          type="button"
          onClick={() => onOpen(report)}
          title={`Open details for ${getTitle(report)}`}
          aria-label={`Open details for ${getTitle(report)}`}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
        >
          <ArrowUpRight size={14} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function ComparisonColumn({ report, position, total, onOpen, onRemove }) {
  return (
    <section
      aria-label={`Compared report ${position}: ${getTitle(report)}`}
      className="min-w-0 border-l border-slate-100 first:border-l-0"
    >
      <div className="flex min-h-[88px] items-start gap-2 border-b border-slate-100 px-3 py-3 sm:px-4">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-violet-50 text-[10px] font-bold text-violet-700">
          {position}
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words text-xs font-semibold leading-5 text-slate-900">
            {getTitle(report)}
          </p>
          <p className="mt-1 truncate text-[10px] text-slate-400">
            {getReportId(report) ? `#${getReportId(report)}` : "ID unavailable"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onOpen(report)}
            aria-label={`Open ${getTitle(report)} details`}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
          >
            <ArrowUpRight size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(getReportId(report))}
            aria-label={`Remove ${getTitle(report)} from comparison`}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
        <span
          className={`h-2 w-2 rounded-full ${
            getStatus(report) === "closed" ? "bg-emerald-500" : "bg-violet-500"
          }`}
        />
        <span className="text-[10px] font-medium text-slate-600">
          {getStatus(report) === "closed" ? "Resolved" : "Open"}
        </span>
        <span className="ml-auto rounded-md bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
          {getText(report?.severity, "Unspecified")}
        </span>
      </div>
    </section>
  );
}

function ComparisonRow({
  field,
  reports,
  onlyDifferences,
  onOpenReport,
  lastRow,
}) {
  const values = reports.map((report) => field.getValue(report));
  const uniqueValues = new Set(values.map(normalizeForComparison));
  const isDifferent = uniqueValues.size > 1;
  if (onlyDifferences && !isDifferent) return null;

  return (
    <div
      className={`grid ${
        lastRow ? "" : "border-b border-slate-100"
      } ${isDifferent ? "bg-amber-50/40" : "bg-white"}`}
      style={{
        gridTemplateColumns: `minmax(116px, 0.75fr) repeat(${reports.length}, minmax(180px, 1fr))`,
      }}
    >
      <div className="flex items-start gap-2 border-r border-slate-100 px-3 py-3 sm:px-4">
        {isDifferent ? (
          <span
            aria-label="Values differ"
            title="Values differ"
            className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500"
          />
        ) : (
          <CheckCheck
            size={12}
            aria-label="Values match"
            className="mt-0.5 shrink-0 text-emerald-500"
          />
        )}
        <span className="text-[10px] font-semibold leading-5 text-slate-600">
          {field.label}
        </span>
      </div>
      {reports.map((report, index) => (
        <div
          key={`${field.id}-${getReportId(report) || index}`}
          className={`min-w-0 px-3 py-3 sm:px-4 ${
            index ? "border-l border-slate-100" : ""
          }`}
        >
          <FieldValue value={values[index]} compact={field.id === "description"} />
          {field.id === "title" && (
            <button
              type="button"
              onClick={() => onOpenReport(report)}
              className="mt-2 inline-flex items-center gap-1 text-[9px] font-medium text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
            >
              View report <ArrowUpRight size={11} aria-hidden="true" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function SavedComparisonCard({ comparison, availableIds, onLoad, onDelete }) {
  const missingCount = comparison.reportIds.filter(
    (id) => !availableIds.has(id),
  ).length;
  const canLoad = missingCount === 0;
  return (
    <article className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700">
        <Bookmark size={14} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-800">
          {comparison.name}
        </p>
        <p className="mt-1 text-[10px] text-slate-400">
          {comparison.reportIds.length} reports
          {comparison.updatedAt
            ? ` · Saved ${formatDate(comparison.updatedAt)}`
            : ""}
          {missingCount > 0
            ? ` · ${missingCount} unavailable in current results`
            : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onLoad(comparison)}
        disabled={!canLoad}
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[10px] font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Load
      </button>
      <button
        type="button"
        onClick={() => onDelete(comparison.id)}
        aria-label={`Delete saved comparison ${comparison.name}`}
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
      >
        <Trash2 size={13} aria-hidden="true" />
      </button>
    </article>
  );
}

export default function ReportComparisonWorkspace({
  reports,
  email,
  onOpenReport,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [sortMode, setSortMode] = useState("recent");
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState(GROUPS);
  const [showSavedComparisons, setShowSavedComparisons] = useState(false);
  const [savedComparisons, setSavedComparisons] = useState([]);
  const [savedEmail, setSavedEmail] = useState("");
  const [storageError, setStorageError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [comparisonName, setComparisonName] = useState("");

  const availableReports = useMemo(
    () =>
      reports.filter(
        (report) => report && typeof report === "object" && getReportId(report),
      ),
    [reports],
  );
  const reportById = useMemo(
    () => new Map(availableReports.map((report) => [getReportId(report), report])),
    [availableReports],
  );
  const selectedReports = useMemo(
    () => selectedIds.map((id) => reportById.get(id)).filter(Boolean),
    [reportById, selectedIds],
  );
  const availableIds = useMemo(
    () => new Set(availableReports.map(getReportId)),
    [availableReports],
  );

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => reportById.has(id)));
  }, [reportById]);

  useEffect(() => {
    const storageKey = getComparisonStorageKey(email);
    setStorageError("");
    setSavedComparisons([]);
    setSavedEmail("");
    setComparisonName("");
    if (!storageKey) return;

    try {
      const saved = window.localStorage.getItem(storageKey);
      setSavedComparisons(saved ? normalizeSavedComparisons(JSON.parse(saved)) : []);
      setSavedEmail(getText(email).toLocaleLowerCase());
    } catch {
      setStorageError("Saved comparisons could not be loaded from this browser.");
    }
  }, [email]);

  const filteredReports = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return availableReports
      .filter((report) => {
        if (selectedIds.includes(getReportId(report))) return false;
        if (statusFilter !== "all" && getStatus(report) !== statusFilter) {
          return false;
        }
        if (
          severityFilter !== "all" &&
          getSeverity(report) !== severityFilter
        ) {
          return false;
        }
        if (!needle) return true;

        return [
          getReportId(report),
          getTitle(report),
          report?.description,
          report?.category,
          report?.status,
          report?.severity,
        ]
          .filter((value) => typeof value === "string")
          .join(" ")
          .toLocaleLowerCase()
          .includes(needle);
      })
      .sort((left, right) => {
        if (sortMode === "title") {
          return getTitle(left).localeCompare(getTitle(right));
        }
        if (sortMode === "severity") {
          const severityRank = (report) =>
            ({ critical: 0, high: 1, medium: 2, low: 3 })[
              getSeverity(report)
            ] ?? 4;
          return (
            severityRank(left) - severityRank(right) ||
            getTitle(left).localeCompare(getTitle(right))
          );
        }
        const getTime = (report) => {
          const date = new Date(report?.createdAt || report?.created_at || 0);
          return Number.isFinite(date.getTime()) ? date.getTime() : 0;
        };
        return getTime(right) - getTime(left);
      });
  }, [availableReports, search, selectedIds, severityFilter, sortMode, statusFilter]);

  const comparisonFields = useMemo(
    () =>
      COMPARISON_FIELDS.filter((field) => selectedGroups.includes(field.group)),
    [selectedGroups],
  );
  const differences = useMemo(
    () =>
      selectedReports.length < 2
        ? []
        : comparisonFields.filter((field) => {
            const values = selectedReports.map((report) =>
              normalizeForComparison(field.getValue(report)),
            );
            return new Set(values).size > 1;
          }),
    [comparisonFields, selectedReports],
  );

  const persistSavedComparisons = (nextComparisons) => {
    const storageKey = getComparisonStorageKey(email);
    if (!storageKey || savedEmail !== getText(email).toLocaleLowerCase()) {
      setStorageError("Load a tester email before saving comparison sets.");
      return false;
    }

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(nextComparisons.slice(0, MAX_SAVED_COMPARISONS)),
      );
      setSavedComparisons(nextComparisons.slice(0, MAX_SAVED_COMPARISONS));
      setStorageError("");
      return true;
    } catch {
      setStorageError("Could not save comparison sets to browser storage.");
      return false;
    }
  };

  const toggleReport = (reportId) => {
    if (!reportId) return;
    if (selectedIds.includes(reportId)) {
      removeReport(reportId);
      return;
    }
    if (selectedIds.length >= MAX_COMPARISON_REPORTS) {
      setFeedback(`Compare up to ${MAX_COMPARISON_REPORTS} reports at once.`);
      return;
    }
    setSelectedIds((current) =>
      current.includes(reportId) ? current : [...current, reportId],
    );
    setFeedback("");
  };

  const removeReport = (reportId) => {
    setSelectedIds((current) => current.filter((id) => id !== reportId));
    setFeedback("");
  };

  const moveReport = (reportId, direction) => {
    setSelectedIds((current) => {
      const currentIndex = current.indexOf(reportId);
      const targetIndex = currentIndex + direction;
      if (
        currentIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= current.length
      ) {
        return current;
      }

      const next = [...current];
      [next[currentIndex], next[targetIndex]] = [
        next[targetIndex],
        next[currentIndex],
      ];
      return next;
    });
  };

  const clearComparison = () => {
    setSelectedIds([]);
    setFeedback("");
  };

  const addVisibleReports = (replace = false) => {
    if (!filteredReports.length) {
      setFeedback("No filtered reports are available to add.");
      return;
    }

    if (replace) {
      const nextIds = filteredReports
        .slice(0, MAX_COMPARISON_REPORTS)
        .map(getReportId);
      setSelectedIds(nextIds);
      setFeedback(
        `Comparison replaced with ${nextIds.length} visible ${
          nextIds.length === 1 ? "report" : "reports"
        }.`,
      );
      return;
    }

    const remainingSlots = MAX_COMPARISON_REPORTS - selectedIds.length;
    if (remainingSlots <= 0) {
      setFeedback("Remove a report before adding more to the comparison.");
      return;
    }

    const additions = filteredReports
      .slice(0, remainingSlots)
      .map(getReportId);
    setSelectedIds((current) => [
      ...current,
      ...additions.filter((id) => !current.includes(id)),
    ]);
    setFeedback(
      additions.length
        ? `Added ${additions.length} ${
            additions.length === 1 ? "report" : "reports"
          } to the comparison.`
        : "No additional reports could be added.",
    );
  };

  const toggleGroup = (group) => {
    setSelectedGroups((current) =>
      current.includes(group)
        ? current.filter((item) => item !== group)
        : [...current, group],
    );
  };

  const saveComparison = () => {
    if (selectedIds.length < 2) {
      setFeedback("Choose at least two reports before saving a comparison.");
      return;
    }

    const name = (
      getText(comparisonName, "", 80) ||
      selectedReports
        .slice(0, 2)
        .map((report) => getTitle(report))
        .join(" vs ")
    ).slice(0, 80);
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      reportIds: selectedIds,
      updatedAt: new Date().toISOString(),
    };
    const nextComparisons = [
      entry,
      ...savedComparisons.filter(
        (saved) =>
          saved.reportIds.join("|") !== selectedIds.join("|") ||
          saved.name !== name,
      ),
    ];
    if (persistSavedComparisons(nextComparisons)) {
      setComparisonName("");
      setFeedback("Comparison saved in this browser.");
    }
  };

  const loadComparison = (comparison) => {
    if (comparison.reportIds.some((id) => !reportById.has(id))) {
      setFeedback("Some saved reports are not in the current results.");
      return;
    }
    setSelectedIds(comparison.reportIds);
    setFeedback(`Loaded “${comparison.name}”.`);
  };

  const deleteComparison = (comparisonId) => {
    const nextComparisons = savedComparisons.filter(
      (comparison) => comparison.id !== comparisonId,
    );
    if (persistSavedComparisons(nextComparisons)) {
      setFeedback("Saved comparison deleted.");
    }
  };

  const exportComparison = () => {
    if (selectedReports.length < 2) {
      setFeedback("Choose at least two reports to export a comparison.");
      return;
    }

    const exportFields = onlyDifferences ? differences : comparisonFields;
    if (onlyDifferences && exportFields.length === 0) {
      setFeedback("No differing fields to export with “Differences only” enabled.");
      return;
    }

    const rows = [
      ["Field", ...selectedReports.map((report) => getTitle(report))],
      ...exportFields.map((field) => [
        field.label,
        ...selectedReports.map((report) => field.getValue(report)),
      ]),
    ];
    const csv = rows.map((row) => row.map(toCsvCell).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "report-comparison.csv";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback(
      onlyDifferences
        ? `Exported ${exportFields.length} differing fields as CSV.`
        : `Exported ${exportFields.length} comparison fields as CSV.`,
    );
  };

  const copySummary = async () => {
    if (selectedReports.length < 2) {
      setFeedback("Choose at least two reports before copying a summary.");
      return;
    }

    const lines = [
      `Report comparison: ${selectedReports
        .map((report) => getTitle(report))
        .join(" vs ")}`,
      `${differences.length} differing fields out of ${comparisonFields.length}.`,
      ...differences.map((field) => {
        const values = selectedReports
          .map(
            (report, index) =>
              `Report ${index + 1}: ${field.getValue(report).replace(/\s+/g, " ")}`,
          )
          .join(" | ");
        return `${field.label}: ${values}`;
      }),
    ];

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable.");
      }
      await navigator.clipboard.writeText(lines.join("\n"));
      setFeedback("Difference summary copied.");
    } catch {
      setFeedback("Could not copy the summary. Check clipboard permissions.");
    }
  };

  const reportGroupCount = useMemo(
    () =>
      selectedReports.reduce((count, report) => {
        const category = getText(report?.category, "Uncategorized");
        count.set(category, (count.get(category) || 0) + 1);
        return count;
      }, new Map()),
    [selectedReports],
  );
  const sharedCategories = [...reportGroupCount.entries()]
    .filter(([, count]) => count > 1)
    .map(([category]) => category);
  const triageSnapshot = useMemo(() => {
    const openReports = selectedReports.filter(
      (report) => getStatus(report) === "open",
    );
    const highSeverityOpen = openReports.filter((report) =>
      ["critical", "blocker", "urgent", "high"].includes(getSeverity(report)),
    );
    const totalSubmissions = selectedReports.reduce(
      (total, report) => total + getPositiveCount(report?.reports),
      0,
    );

    return {
      open: openReports.length,
      resolved: selectedReports.length - openReports.length,
      highSeverityOpen: highSeverityOpen.length,
      repeatedSubmissions: Math.max(0, totalSubmissions - selectedReports.length),
    };
  }, [selectedReports]);

  return (
    <section
      aria-labelledby="report-comparison-title"
      className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
            <GitCompareArrows size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3
              id="report-comparison-title"
              className="text-sm font-semibold tracking-tight text-slate-900"
            >
              Report comparison workspace
            </h3>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
              Compare report details side by side, focus on differences, and
              save reusable comparison sets in this browser.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-indigo-100 bg-indigo-50/70 px-2.5 py-1 text-[10px] font-medium text-indigo-700">
          Read-only
        </span>
      </header>

      <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(300px,0.82fr)_minmax(0,1.5fr)]">
        <aside className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-slate-800">
                Choose reports
              </h4>
              <p className="mt-1 text-[10px] text-slate-400">
                {selectedIds.length} of {MAX_COMPARISON_REPORTS} selected
              </p>
            </div>
            <button
              type="button"
              onClick={clearComparison}
              disabled={!selectedIds.length}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[10px] font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X size={12} aria-hidden="true" />
              Clear
            </button>
          </div>

          <label className="relative block">
            <span className="sr-only">Search reports to compare</span>
            <Search
              size={14}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reports..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <FilterSelect
              label="Filter reports by status"
              value={statusFilter}
              options={STATUS_FILTERS}
              onChange={setStatusFilter}
            />
            <FilterSelect
              label="Filter reports by severity"
              value={severityFilter}
              options={SEVERITY_FILTERS}
              onChange={setSeverityFilter}
            />
          </div>

          <label className="relative block">
            <span className="sr-only">Sort reports to compare</span>
            <ArrowDownAZ
              size={13}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <select
              aria-label="Sort reports to compare"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
              className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-xs font-medium text-slate-600 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            >
              <option value="recent">Newest first</option>
              <option value="severity">Highest severity first</option>
              <option value="title">Title A–Z</option>
            </select>
            <ChevronDown
              size={13}
              aria-hidden="true"
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => addVisibleReports(false)}
              disabled={
                !filteredReports.length ||
                selectedIds.length >= MAX_COMPARISON_REPORTS
              }
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus size={12} aria-hidden="true" />
              Add visible ({Math.min(
                filteredReports.length,
                MAX_COMPARISON_REPORTS - selectedIds.length,
              )})
            </button>
            <button
              type="button"
              onClick={() => addVisibleReports(true)}
              disabled={!filteredReports.length}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <GitCompareArrows size={12} aria-hidden="true" />
              Replace with visible
            </button>
          </div>

          <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
            {filteredReports.length ? (
              filteredReports.map((report) => {
                const atCapacity =
                  selectedIds.length >= MAX_COMPARISON_REPORTS;
                return (
                  <ReportChoiceCard
                    key={getReportId(report)}
                    report={report}
                    selected={false}
                    disabled={atCapacity}
                    onToggle={toggleReport}
                    onOpen={onOpenReport}
                  />
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center">
                <Search
                  size={16}
                  aria-hidden="true"
                  className="mx-auto text-slate-400"
                />
                <p className="mt-2 text-xs font-medium text-slate-600">
                  No available reports
                </p>
                <p className="mt-1 text-[10px] leading-4 text-slate-400">
                  Change the search or filters to find another report.
                </p>
              </div>
            )}
          </div>

          {selectedReports.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                In this comparison
              </p>
              {selectedReports.map((report, index) => (
                <div
                  key={getReportId(report)}
                  className="flex items-center gap-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <ReportChoiceCard
                      report={report}
                      selected
                      disabled={false}
                      onToggle={removeReport}
                      onOpen={onOpenReport}
                    />
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => moveReport(getReportId(report), -1)}
                      disabled={index === 0}
                      aria-label={`Move ${getTitle(report)} earlier in comparison`}
                      title="Move report left"
                      className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <ChevronUp size={13} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveReport(getReportId(report), 1)}
                      disabled={index === selectedReports.length - 1}
                      aria-label={`Move ${getTitle(report)} later in comparison`}
                      title="Move report right"
                      className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <ChevronDown size={13} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-start gap-2">
              <CircleHelp
                size={14}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-slate-400"
              />
              <p className="text-[10px] leading-4 text-slate-500">
                Selections and saved sets only reference report IDs in browser
                storage. This workspace never updates server reports.
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <GitCompareArrows
                size={15}
                aria-hidden="true"
                className="text-indigo-600"
              />
              <h4 className="text-xs font-semibold text-slate-800">
                Side-by-side view
              </h4>
              {selectedReports.length > 0 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold tabular-nums text-slate-600">
                  {selectedReports.length}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={copySummary}
                disabled={selectedReports.length < 2}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Clipboard size={12} aria-hidden="true" />
                Copy differences
              </button>
              <button
                type="button"
                onClick={exportComparison}
                disabled={selectedReports.length < 2}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download size={12} aria-hidden="true" />
                Export CSV
              </button>
            </div>
          </div>

          {selectedReports.length >= 2 ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ComparisonMetric
                  label="Reports"
                  value={selectedReports.length}
                  tone="violet"
                />
                <ComparisonMetric
                  label="Different fields"
                  value={differences.length}
                  tone={differences.length ? "amber" : "emerald"}
                />
                <ComparisonMetric
                  label="Matching fields"
                  value={comparisonFields.length - differences.length}
                  tone="emerald"
                />
                <ComparisonMetric
                  label="Shared categories"
                  value={sharedCategories.length}
                />
              </div>

              <section
                aria-label="Triage snapshot of selected reports"
                className="rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-700">
                      Triage snapshot
                    </p>
                    <p className="mt-0.5 text-[9px] text-slate-400">
                      Counts reflect only the selected reports
                    </p>
                  </div>
                  <span className="rounded-md bg-slate-50 px-2 py-1 text-[9px] font-medium text-slate-500">
                    Advisory
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-violet-50/70 px-2.5 py-2">
                    <p className="text-[9px] font-medium text-violet-700">
                      Open
                    </p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-violet-900">
                      {triageSnapshot.open}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-50/70 px-2.5 py-2">
                    <p className="text-[9px] font-medium text-emerald-700">
                      Resolved
                    </p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-900">
                      {triageSnapshot.resolved}
                    </p>
                  </div>
                  <div className="rounded-lg bg-rose-50/70 px-2.5 py-2">
                    <p className="text-[9px] font-medium text-rose-700">
                      High severity open
                    </p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-rose-900">
                      {triageSnapshot.highSeverityOpen}
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-50/70 px-2.5 py-2">
                    <p className="text-[9px] font-medium text-amber-700">
                      Repeat submissions
                    </p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-amber-900">
                      {triageSnapshot.repeatedSubmissions}
                    </p>
                  </div>
                </div>
              </section>

              {sharedCategories.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-2">
                  <span className="mr-1 text-[10px] font-semibold text-indigo-700">
                    Shared category
                  </span>
                  {sharedCategories.map((category) => (
                    <span
                      key={category}
                      className="rounded-md bg-white px-2 py-1 text-[10px] text-indigo-700"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3">
                <fieldset className="flex flex-wrap items-center gap-1.5">
                  <legend className="sr-only">Comparison detail groups</legend>
                  {GROUPS.map((group) => {
                    const checked = selectedGroups.includes(group);
                    return (
                      <label
                        key={group}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition ${
                          checked
                            ? "border-violet-200 bg-violet-50 text-violet-700"
                            : "border-slate-200 bg-white text-slate-500"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleGroup(group)}
                          className="accent-violet-600"
                        />
                        {group}
                      </label>
                    );
                  })}
                </fieldset>
                <label className="inline-flex cursor-pointer items-center gap-2 text-[10px] font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={onlyDifferences}
                    onChange={(event) =>
                      setOnlyDifferences(event.target.checked)
                    }
                    className="accent-violet-600"
                  />
                  Differences only
                </label>
              </div>

              {comparisonFields.length ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <div className="min-w-[700px]">
                    <div
                      className="grid bg-slate-50"
                      style={{
                        gridTemplateColumns: `minmax(116px, 0.75fr) repeat(${selectedReports.length}, minmax(180px, 1fr))`,
                      }}
                    >
                      <div className="flex items-center border-r border-slate-100 px-3 py-2.5 sm:px-4">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                          Field
                        </span>
                      </div>
                      {selectedReports.map((report, index) => (
                        <div
                          key={getReportId(report)}
                          className={`min-w-0 px-3 py-2.5 sm:px-4 ${
                            index ? "border-l border-slate-100" : ""
                          }`}
                        >
                          <p className="truncate text-[10px] font-semibold text-slate-700">
                            Report {index + 1}
                          </p>
                          <p className="mt-0.5 truncate text-[9px] text-slate-400">
                            {getTitle(report)}
                          </p>
                        </div>
                      ))}
                    </div>
                    {comparisonFields.map((field, index) => (
                      <ComparisonRow
                        key={field.id}
                        field={field}
                        reports={selectedReports}
                        onlyDifferences={onlyDifferences}
                        onOpenReport={onOpenReport}
                        lastRow={index === comparisonFields.length - 1}
                      />
                    ))}
                    {onlyDifferences && differences.length === 0 && (
                      <div className="border-t border-slate-100 px-4 py-8 text-center">
                        <CheckCheck
                          size={20}
                          aria-hidden="true"
                          className="mx-auto text-emerald-500"
                        />
                        <p className="mt-2 text-xs font-semibold text-slate-700">
                          No differences in the selected fields
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          Turn off “Differences only” to review every value.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                  <p className="text-xs font-semibold text-slate-700">
                    Select at least one detail group
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Choose Overview, Report details, Reproduction, or
                    Environment.
                  </p>
                </div>
              )}

              <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <label>
                  <span className="mb-1 block text-[10px] font-semibold text-slate-600">
                    Save this comparison set
                  </span>
                  <input
                    type="text"
                    value={comparisonName}
                    onChange={(event) =>
                      setComparisonName(event.target.value.slice(0, 80))
                    }
                    placeholder="Optional name (defaults to report titles)"
                    maxLength={80}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                  />
                </label>
                <button
                  type="button"
                  onClick={saveComparison}
                  disabled={savedComparisons.length >= MAX_SAVED_COMPARISONS}
                  className="inline-flex h-9 items-center justify-center gap-1.5 self-end rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Bookmark size={13} aria-hidden="true" />
                  Save set
                </button>
              </div>
            </>
          ) : (
            <div className="flex min-h-[290px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-8 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                <GitCompareArrows size={19} aria-hidden="true" />
              </span>
              <h5 className="mt-3 text-sm font-semibold text-slate-800">
                Select two or more reports
              </h5>
              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                Add reports from the list to compare titles, status, severity,
                descriptions, reproduction details, and environment.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-slate-500">
                <Plus size={11} aria-hidden="true" />
                Up to {MAX_COMPARISON_REPORTS} reports
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowSavedComparisons((shown) => !shown)}
              aria-expanded={showSavedComparisons}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
            >
              <Bookmark size={13} aria-hidden="true" />
              Saved sets ({savedComparisons.length})
              <ChevronDown
                size={12}
                aria-hidden="true"
                className={`transition-transform ${
                  showSavedComparisons ? "rotate-180" : ""
                }`}
              />
            </button>
            {feedback && (
              <p role="status" className="text-[10px] text-slate-500">
                {feedback}
              </p>
            )}
          </div>

          {storageError && (
            <p
              role="alert"
              className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[10px] text-rose-700"
            >
              {storageError}
            </p>
          )}

          {showSavedComparisons && (
            <div className="space-y-2">
              {savedComparisons.length ? (
                savedComparisons.map((comparison) => (
                  <SavedComparisonCard
                    key={comparison.id}
                    comparison={comparison}
                    availableIds={availableIds}
                    onLoad={loadComparison}
                    onDelete={deleteComparison}
                  />
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-[10px] text-slate-400">
                  No saved comparison sets yet.
                </p>
              )}
              {savedComparisons.length >= MAX_SAVED_COMPARISONS && (
                <p className="text-[10px] text-amber-700">
                  Limit reached. Delete a saved set before saving another.
                </p>
              )}
            </div>
          )}

          {feedback && !storageError && (
            <p className="sr-only" aria-live="polite">
              {feedback}
            </p>
          )}
          <div className="flex items-start gap-2 text-[9px] leading-4 text-slate-400">
            <ShieldAlert
              size={12}
              aria-hidden="true"
              className="mt-0.5 shrink-0"
            />
            <p>
              Export and clipboard actions include the selected report fields.
              Saved sets store report IDs and names only, scoped to this tester
              email in local browser storage.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
