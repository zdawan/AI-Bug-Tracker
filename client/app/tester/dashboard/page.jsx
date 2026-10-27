"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowDownAZ,
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bug,
  Calendar,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Clock,
  Clock3,
  Command,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileDown,
  FileSearch,
  FileSpreadsheet,
  Filter,
  FilterX,
  Flame,
  Gauge,
  GitBranch,
  Hash,
  Info,
  Layers,
  Layers3,
  ListFilter,
  LoaderCircle,
  Mail,
  MoreHorizontal,
  PanelTop,
  RefreshCw,
  Search,
  Settings2,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  SquareArrowOutUpRight,
  Tag,
  Timer,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const SEVERITY_ORDER = {
  High: 3,
  Medium: 2,
  Low: 1,
};

const STATUS_ORDER = {
  Open: 1,
  Closed: 2,
};

const SEVERITY_CONFIG = {
  High: {
    label: "High",
    dot: "bg-rose-500",
    text: "text-rose-700",
    background: "bg-rose-50",
    border: "border-rose-200",
    soft: "bg-rose-100",
    icon: ShieldAlert,
  },
  Medium: {
    label: "Medium",
    dot: "bg-amber-500",
    text: "text-amber-700",
    background: "bg-amber-50",
    border: "border-amber-200",
    soft: "bg-amber-100",
    icon: CircleAlert,
  },
  Low: {
    label: "Low",
    dot: "bg-sky-500",
    text: "text-sky-700",
    background: "bg-sky-50",
    border: "border-sky-200",
    soft: "bg-sky-100",
    icon: CircleCheck,
  },
};

const STATUS_CONFIG = {
  Open: {
    label: "Open",
    dot: "bg-violet-500",
    text: "text-violet-700",
    background: "bg-violet-50",
    border: "border-violet-200",
    icon: CircleDashed,
  },
  Closed: {
    label: "Resolved",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    background: "bg-emerald-50",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
};

const SORT_OPTIONS = [
  {
    value: "newest",
    label: "Newest first",
  },
  {
    value: "oldest",
    label: "Oldest first",
  },
  {
    value: "severity",
    label: "Highest severity",
  },
  {
    value: "title",
    label: "Title A–Z",
  },
  {
    value: "reports",
    label: "Most reported",
  },
  {
    value: "status",
    label: "Status",
  },
];

const DEFAULT_PREFERENCES = {
  pageSize: 10,
  sortBy: "newest",
  compactRows: false,
  showSummary: true,
};

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value) {
  return normalizeString(value).toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function safeDate(value) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = safeDate(value);

  if (!date) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  const date = safeDate(value);

  if (!date) return "Date unavailable";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeDate(value) {
  const date = safeDate(value);

  if (!date) return "Date unavailable";

  const difference = Date.now() - date.getTime();
  const absoluteDifference = Math.abs(difference);
  const minutes = Math.floor(absoluteDifference / 60_000);
  const hours = Math.floor(absoluteDifference / 3_600_000);
  const days = Math.floor(absoluteDifference / 86_400_000);

  if (difference < 0) {
    if (days === 0) return "Later today";
    if (days === 1) return "Tomorrow";
    if (days < 7) return `In ${days} days`;

    return formatDate(value);
  }

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return formatDate(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(Number(value) || 0);
}

function formatPercentage(value, digits = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "0%";

  return `${number.toFixed(digits)}%`;
}

function getBugTitle(bug) {
  return normalizeString(bug?.title) || "Untitled report";
}

function getBugDescription(bug) {
  return (
    normalizeString(bug?.summary) ||
    normalizeString(bug?.description) ||
    "No description provided."
  );
}

function getBugStatus(bug) {
  return STATUS_CONFIG[bug?.status] ? bug.status : "Open";
}

function getBugSeverity(bug) {
  return SEVERITY_CONFIG[bug?.severity] ? bug.severity : "Low";
}

function getBugReports(bug) {
  const reports = Number(bug?.reports);

  return Number.isFinite(reports) && reports > 0 ? reports : 1;
}

function getBugTimestamp(bug) {
  return safeDate(bug?.createdAt)?.getTime() || 0;
}

function getBugSearchText(bug) {
  const fields = [
    bug?._id,
    bug?.title,
    bug?.description,
    bug?.summary,
    bug?.category,
    bug?.testUrl,
    bug?.status,
    bug?.severity,
    ...(Array.isArray(bug?.tags) ? bug.tags : []),
  ];

  return fields
    .filter((field) => typeof field === "string")
    .join(" ")
    .toLowerCase();
}

function getBugId(bug) {
  return normalizeString(bug?._id) || "ID unavailable";
}

function getShortBugId(bug) {
  const id = getBugId(bug);

  if (id === "ID unavailable") return id;

  return `BUG-${id.slice(-6).toUpperCase()}`;
}

function getHostname(value) {
  if (!value) return "";

  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

function getSeverityRank(value) {
  return SEVERITY_ORDER[value] || 0;
}

function getStatusRank(value) {
  return STATUS_ORDER[value] || 0;
}

function compareDates(left, right) {
  return getBugTimestamp(left) - getBugTimestamp(right);
}

function compareTitles(left, right) {
  return getBugTitle(left).localeCompare(getBugTitle(right), undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

function sortBugs(bugs, sortBy) {
  const sorted = [...bugs];

  switch (sortBy) {
    case "oldest":
      return sorted.sort(compareDates);

    case "severity":
      return sorted.sort((left, right) => {
        const severityDifference =
          getSeverityRank(right.severity) - getSeverityRank(left.severity);

        return severityDifference || compareDates(right, left);
      });

    case "title":
      return sorted.sort(compareTitles);

    case "reports":
      return sorted.sort((left, right) => {
        const reportDifference = getBugReports(right) - getBugReports(left);

        return reportDifference || compareDates(right, left);
      });

    case "status":
      return sorted.sort((left, right) => {
        const statusDifference =
          getStatusRank(left.status) - getStatusRank(right.status);

        return statusDifference || compareDates(right, left);
      });

    case "newest":
    default:
      return sorted.sort((left, right) => compareDates(right, left));
  }
}

function filterBugs(bugs, filters) {
  const query = normalizeString(filters.search).toLowerCase();
  const selectedStatus = filters.status;
  const selectedSeverity = filters.severity;
  const selectedCategory = filters.category;
  const selectedDateRange = filters.dateRange;
  const now = Date.now();

  return bugs.filter((bug) => {
    if (query && !getBugSearchText(bug).includes(query)) {
      return false;
    }

    if (selectedStatus !== "All" && bug.status !== selectedStatus) {
      return false;
    }

    if (selectedSeverity !== "All" && bug.severity !== selectedSeverity) {
      return false;
    }

    if (
      selectedCategory !== "All" &&
      normalizeString(bug.category) !== selectedCategory
    ) {
      return false;
    }

    const timestamp = getBugTimestamp(bug);

    if (selectedDateRange === "today") {
      const start = new Date();

      start.setHours(0, 0, 0, 0);

      if (timestamp < start.getTime()) return false;
    }

    if (selectedDateRange === "week") {
      if (timestamp < now - 7 * 86_400_000) return false;
    }

    if (selectedDateRange === "month") {
      if (timestamp < now - 30 * 86_400_000) return false;
    }

    return true;
  });
}

function getUniqueCategories(bugs) {
  return [
    ...new Set(
      bugs.map((bug) => normalizeString(bug.category)).filter(Boolean),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

function calculateStatistics(bugs) {
  const total = bugs.length;
  const open = bugs.filter((bug) => bug.status === "Open").length;
  const closed = bugs.filter((bug) => bug.status === "Closed").length;
  const high = bugs.filter((bug) => bug.severity === "High").length;
  const medium = bugs.filter((bug) => bug.severity === "Medium").length;
  const low = bugs.filter((bug) => bug.severity === "Low").length;
  const reports = bugs.reduce(
    (totalReports, bug) => totalReports + getBugReports(bug),
    0,
  );
  const resolutionRate = total ? (closed / total) * 100 : 0;
  const highSeverityRate = total ? (high / total) * 100 : 0;

  return {
    total,
    open,
    closed,
    high,
    medium,
    low,
    reports,
    resolutionRate,
    highSeverityRate,
  };
}

function buildCsvValue(value) {
  const text = value == null ? "" : String(value);

  return `"${text.replace(/"/g, '""')}"`;
}

function buildBugsCsv(bugs) {
  const headers = [
    "Bug ID",
    "Title",
    "Description",
    "Summary",
    "Status",
    "Severity",
    "Category",
    "Affected URL",
    "Reported Date",
    "Report Count",
  ];

  const rows = bugs.map((bug) => [
    getBugId(bug),
    getBugTitle(bug),
    bug.description || "",
    bug.summary || "",
    bug.status || "Open",
    bug.severity || "Low",
    bug.category || "",
    bug.testUrl || "",
    bug.createdAt || "",
    getBugReports(bug),
  ]);

  return [headers, ...rows]
    .map((row) => row.map(buildCsvValue).join(","))
    .join("\r\n");
}

function downloadTextFile(
  content,
  filename,
  type = "text/plain;charset=utf-8",
) {
  if (typeof window === "undefined") return;

  const blob = new Blob(["\uFEFF", content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportBugsCsv(bugs) {
  const date = new Date().toISOString().slice(0, 10);
  const csv = buildBugsCsv(bugs);

  downloadTextFile(csv, `bug-reports-${date}.csv`, "text/csv;charset=utf-8");
}

function mergeBugLists(currentBugs, incomingBugs) {
  const merged = new Map();

  for (const bug of currentBugs) {
    if (bug?._id) merged.set(String(bug._id), bug);
  }

  for (const bug of incomingBugs) {
    if (bug?._id) {
      merged.set(String(bug._id), {
        ...merged.get(String(bug._id)),
        ...bug,
      });
    }
  }

  return [...merged.values()];
}

function getReportDateLabel(bug) {
  const date = safeDate(bug?.createdAt);

  if (!date) return "Date unavailable";

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function getResolutionLabel(bugs) {
  if (!bugs.length) return "No reports yet";

  const stats = calculateStatistics(bugs);

  if (stats.closed === stats.total) return "All reports resolved";
  if (stats.closed === 0) return "Awaiting resolution";

  return `${stats.closed} of ${stats.total} resolved`;
}

function getSeverityDescription(severity, count) {
  if (count === 0) {
    return `No ${severity.toLowerCase()} severity reports`;
  }

  if (severity === "High") {
    return `${count} high-priority ${count === 1 ? "issue" : "issues"}`;
  }

  return `${count} ${severity.toLowerCase()} severity ${
    count === 1 ? "report" : "reports"
  }`;
}

function getStatusDescription(status, count) {
  if (status === "Open") {
    return count
      ? `${count} ${count === 1 ? "report needs" : "reports need"} attention`
      : "Nothing awaiting attention";
  }

  return count
    ? `${count} resolved ${count === 1 ? "report" : "reports"}`
    : "No resolved reports";
}

function createEmptyFilters() {
  return {
    search: "",
    status: "All",
    severity: "All",
    category: "All",
    dateRange: "all",
  };
}

function areFiltersActive(filters) {
  return (
    normalizeString(filters.search) !== "" ||
    filters.status !== "All" ||
    filters.severity !== "All" ||
    filters.category !== "All" ||
    filters.dateRange !== "all"
  );
}

function buildPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-end",
    totalPages,
  ];
}

function Badge({ value, type = "status" }) {
  const config =
    type === "severity"
      ? SEVERITY_CONFIG[value] || SEVERITY_CONFIG.Low
      : STATUS_CONFIG[value] || STATUS_CONFIG.Open;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${config.background} ${config.text} ${config.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  active = false,
  size = "md",
}) {
  const dimensions =
    size === "sm" ? "h-8 w-8" : size === "lg" ? "h-11 w-11" : "h-9 w-9";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex ${dimensions} items-center justify-center rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon size={size === "sm" ? 15 : 17} strokeWidth={1.8} />
    </button>
  );
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {eyebrow}
          </p>
        )}

        <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-900">
          {title}
        </h2>

        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "neutral",
  onClick,
  active = false,
}) {
  const tones = {
    neutral: {
      icon: "text-slate-500",
      accent: "bg-slate-100",
    },
    violet: {
      icon: "text-violet-700",
      accent: "bg-violet-100",
    },
    amber: {
      icon: "text-amber-700",
      accent: "bg-amber-100",
    },
    emerald: {
      icon: "text-emerald-700",
      accent: "bg-emerald-100",
    },
    rose: {
      icon: "text-rose-700",
      accent: "bg-rose-100",
    },
  };

  const style = tones[tone] || tones.neutral;
  const Component = onClick ? "button" : "article";

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`min-w-0 rounded-xl border bg-white p-4 text-left transition sm:p-5 ${
        active
          ? "border-violet-300 ring-2 ring-violet-100"
          : "border-slate-200 hover:border-slate-300"
      } ${onClick ? "cursor-pointer hover:shadow-sm" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {formatNumber(value)}
          </p>
        </div>

        {Icon && (
          <span
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${style.accent} ${style.icon}`}
          >
            <Icon size={18} strokeWidth={1.8} />
          </span>
        )}
      </div>

      {description && (
        <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
      )}
    </Component>
  );
}

function ProgressBar({
  value,
  color = "bg-violet-600",
  label,
  showValue = true,
}) {
  const percentage = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-600">{label}</span>
          {showValue && (
            <span className="font-semibold tabular-nums text-slate-800">
              {formatPercentage(percentage)}
            </span>
          )}
        </div>
      )}

      <div
        className="h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || "Progress"}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon = FileSearch,
  title,
  description,
  action,
  compact = false,
}) {
  return (
    <div
      className={`flex flex-col items-center px-5 text-center ${
        compact ? "py-10" : "py-16 sm:py-20"
      }`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
        <Icon size={22} strokeWidth={1.7} />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <LoaderCircle size={26} className="animate-spin text-violet-600" />

      <p className="mt-4 text-sm font-medium text-slate-800">Loading reports</p>

      <p className="mt-1 text-xs text-slate-500">
        Retrieving your latest submissions
      </p>
    </div>
  );
}

function ErrorBanner({ message, onDismiss, onRetry }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4"
    >
      <ShieldAlert size={19} className="mt-0.5 shrink-0 text-rose-600" />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-rose-900">
          Unable to load reports
        </p>

        <p className="mt-1 break-words text-sm leading-6 text-rose-800">
          {message}
        </p>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-800 underline underline-offset-4 hover:text-rose-950"
          >
            <RefreshCw size={13} />
            Try again
          </button>
        )}
      </div>

      {onDismiss && (
        <IconButton
          icon={X}
          label="Dismiss error"
          onClick={onDismiss}
          size="sm"
        />
      )}
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder = "Search reports...",
  onClear,
  autoFocus = false,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <div className="relative min-w-0">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />

      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
      />

      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onChange("");
            onClear?.();
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function SelectField({ value, onChange, options, label, icon: Icon }) {
  return (
    <label className="relative block min-w-0">
      {label && <span className="sr-only">{label}</span>}

      {Icon && (
        <Icon
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      )}

      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pr-8 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 ${
          Icon ? "pl-9" : "pl-3"
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </label>
  );
}

function FilterChip({ children, onRemove }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600">
      <span className="truncate">{children}</span>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${children} filter`}
        className="shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
      >
        <X size={12} />
      </button>
    </span>
  );
}

function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}) {
  const pages = buildPageNumbers(currentPage, totalPages);
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-800">
            {formatNumber(start)}–{formatNumber(end)}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-800">
            {formatNumber(totalItems)}
          </span>
        </p>

        <label className="flex items-center gap-2 text-xs text-slate-500">
          Rows
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-violet-500"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <nav aria-label="Report pages" className="flex items-center gap-1">
        <IconButton
          icon={ChevronFirst}
          label="First page"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
        />

        <IconButton
          icon={ChevronLeft}
          label="Previous page"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        />

        {pages.map((page, index) => {
          if (typeof page !== "number") {
            return (
              <span
                key={`${page}-${index}`}
                className="flex h-8 w-7 items-center justify-center text-xs text-slate-400"
              >
                …
              </span>
            );
          }

          return (
            <button
              key={page}
              type="button"
              aria-current={page === currentPage ? "page" : undefined}
              onClick={() => onPageChange(page)}
              className={`h-8 min-w-8 rounded-md px-2 text-xs font-medium transition ${
                page === currentPage
                  ? "bg-violet-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {page}
            </button>
          );
        })}

        <IconButton
          icon={ChevronRight}
          label="Next page"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        />

        <IconButton
          icon={ChevronLast}
          label="Last page"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
        />
      </nav>
    </div>
  );
}

function SeverityDistribution({ statistics }) {
  const total = statistics.total || 1;

  const items = [
    {
      label: "High",
      count: statistics.high,
      color: "bg-rose-500",
      text: "text-rose-700",
    },
    {
      label: "Medium",
      count: statistics.medium,
      color: "bg-amber-500",
      text: "text-amber-700",
    },
    {
      label: "Low",
      count: statistics.low,
      color: "bg-sky-500",
      text: "text-sky-700",
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Severity distribution
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Breakdown of your submitted reports
          </p>
        </div>

        <BarChart3 size={18} className="text-slate-400" />
      </div>

      <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-slate-100">
        {items.map((item) => (
          <div
            key={item.label}
            className={`${item.color} transition-all`}
            style={{
              width: `${(item.count / total) * 100}%`,
            }}
            title={`${item.label}: ${item.count}`}
          />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${item.color}`} />
              <span className="text-xs text-slate-500">{item.label}</span>
            </div>

            <p className={`mt-2 text-xl font-semibold ${item.text}`}>
              {formatNumber(item.count)}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {formatPercentage((item.count / total) * 100)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResolutionOverview({ statistics }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Resolution overview
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Current status of your reports
          </p>
        </div>

        <Gauge size={18} className="text-slate-400" />
      </div>

      <div className="mt-5">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight text-slate-950">
            {formatPercentage(statistics.resolutionRate)}
          </span>

          <span className="text-xs text-slate-500">resolved</span>
        </div>

        <div className="mt-4">
          <ProgressBar
            value={statistics.resolutionRate}
            color="bg-emerald-500"
            label="Resolution rate"
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
        <div>
          <p className="text-xs text-slate-500">Open</p>
          <p className="mt-1 text-lg font-semibold text-violet-700">
            {formatNumber(statistics.open)}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Resolved</p>
          <p className="mt-1 text-lg font-semibold text-emerald-700">
            {formatNumber(statistics.closed)}
          </p>
        </div>
      </div>
    </div>
  );
}

function ReportSummaryPanel({ bugs }) {
  const statistics = useMemo(() => calculateStatistics(bugs), [bugs]);

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <SeverityDistribution statistics={statistics} />
      <ResolutionOverview statistics={statistics} />
    </section>
  );
}
