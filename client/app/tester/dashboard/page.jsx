"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowDownAZ,
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  UserRound,
  LayoutDashboard,
  ListChecks,
  ChartNoAxesCombined,
  CircleHelp,
  LogOut,
  Sun,
  Moon,
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
      className={`min-w-0 rounded-2xl border bg-white p-4 text-left transition-all duration-200 sm:p-5 ${
        active
          ? "border-violet-300 bg-violet-50/30 shadow-sm ring-1 ring-violet-100"
          : "border-slate-200/90 hover:border-slate-300 hover:shadow-sm"
      } ${onClick ? "cursor-pointer hover:shadow-sm" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-slate-950">
            {formatNumber(value)}
          </p>
        </div>

        {Icon && (
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.accent} ${style.icon}`}
          >
            <Icon size={18} strokeWidth={1.8} />
          </span>
        )}
      </div>

      {description && (
        <p className="mt-3 text-[12px] leading-5 text-slate-500">
          {description}
        </p>
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
        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
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
        className={`h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pr-8 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 ${
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
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20 sm:p-5">
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
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20 sm:p-5">
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
          <span className="text-[2rem] font-semibold tracking-[-0.04em] text-slate-950">
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

function ReportsTrendChart({ bugs }) {
  const trend = useMemo(() => {
    const today = new Date();
    const days = [];

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - offset);

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      days.push({
        key,
        label: date
          .toLocaleDateString("en-IN", { weekday: "short" })
          .slice(0, 1),
        count: 0,
      });
    }

    const counts = new Map(days.map((day) => [day.key, day]));
    bugs.forEach((bug) => {
      const date = safeDate(bug?.createdAt);
      if (!date) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const bucket = counts.get(key);
      if (bucket) bucket.count += 1;
    });

    return days;
  }, [bugs]);

  const maxCount = Math.max(1, ...trend.map((day) => day.count));
  const total = trend.reduce((sum, day) => sum + day.count, 0);
  const activeDays = trend.filter((day) => day.count > 0).length;

  return (
    <section className="h-full rounded-[22px] border border-white bg-white p-4 shadow-sm shadow-slate-200/40 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-slate-900">
            Reporting activity
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Reports submitted during the last 7 days
          </p>
        </div>
        <span className="rounded-full border border-violet-200 px-2.5 py-1 text-[11px] font-medium text-violet-700">
          Last 7 days
        </span>
      </div>

      <div
        className="mt-5 grid grid-cols-7 gap-2 sm:gap-3"
        role="img"
        aria-label={`Daily report counts for the last seven days. ${total} reports across ${activeDays} active days.`}
      >
        {trend.map((day) => {
          const height =
            day.count === 0 ? 10 : Math.max(34, (day.count / maxCount) * 100);

          return (
            <div key={day.key} className="flex min-w-0 flex-col items-center">
              <span className="mb-2 text-[11px] font-semibold tabular-nums text-slate-500">
                {day.count}
              </span>
              <div className="flex h-28 w-full max-w-10 items-end justify-center rounded-full bg-slate-50 p-1 sm:h-32 sm:p-1.5">
                <div
                  className={`relative w-full rounded-full transition-all duration-300 ${
                    day.count > 0
                      ? "bg-gradient-to-b from-violet-500 to-violet-700"
                      : "bg-slate-100"
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${day.label}: ${day.count} reports`}
                >
                  {day.count > 0 && (
                    <span className="absolute left-1/2 top-2 h-2 w-2 -translate-x-1/2 rounded-full bg-white/90 sm:top-2.5 sm:h-2.5 sm:w-2.5" />
                  )}
                </div>
              </div>
              <span className="mt-2 text-[11px] font-medium uppercase text-slate-400">
                {day.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <span className="text-slate-400">Daily reports</span>
        <span className="font-medium text-violet-700">
          {formatNumber(total)} total · {activeDays} active days
        </span>
      </div>
    </section>
  );
}

function CategoryBreakdown({ bugs }) {
  const categories = useMemo(() => {
    const counts = new Map();

    bugs.forEach((bug) => {
      const label = normalizeString(bug?.category) || "Uncategorized";
      counts.set(label, (counts.get(label) || 0) + 1);
    });

    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [bugs]);

  const total = bugs.length || 1;
  const palette = [
    "bg-violet-500",
    "bg-sky-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
  ];

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Top categories
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Where reported issues are concentrated
          </p>
        </div>
        <Layers3 size={18} className="text-slate-400" />
      </div>

      {categories.length ? (
        <div className="mt-5 space-y-4">
          {categories.map((category, index) => (
            <div key={category.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate font-medium text-slate-700">
                  {category.label}
                </span>
                <span className="shrink-0 tabular-nums text-slate-500">
                  {category.count} ·{" "}
                  {formatPercentage((category.count / total) * 100)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${palette[index]}`}
                  style={{ width: `${(category.count / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 flex min-h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-xs text-slate-500">
          Category analytics will appear when reports are available.
        </div>
      )}
    </section>
  );
}

function ReportSummaryPanel({ bugs }) {
  const statistics = useMemo(() => calculateStatistics(bugs), [bugs]);
  const averageReports = bugs.length
    ? bugs.reduce((sum, bug) => sum + getBugReports(bug), 0) / bugs.length
    : 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2 px-1">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">
            Report analytics
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            A snapshot of report health and activity
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-500">
          Live report data
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative min-h-[146px] overflow-hidden rounded-[20px] bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-500 p-4 text-white shadow-sm shadow-violet-600/20 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-white/95">
              Reports Submitted
            </span>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-violet-700">
              <ArrowUpRight size={15} />
            </span>
          </div>
          <p className="mt-3 text-[2rem] font-semibold leading-none tracking-[-0.04em] tabular-nums">
            {formatNumber(statistics.total)}
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-white/80">
            <span className="grid h-4 w-4 place-items-center rounded border border-white/40">
              <TrendingUp size={10} />
            </span>
            All submitted reports
          </p>
          <div className="pointer-events-none absolute -bottom-9 -right-6 h-24 w-24 rounded-full border border-white/10 bg-white/[0.06]" />
        </div>

        <div className="min-h-[146px] rounded-[20px] border border-white bg-white p-4 shadow-sm shadow-slate-200/40 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-slate-700">
              Open Bugs
            </span>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-slate-300 text-slate-500">
              <ArrowUpRight size={14} />
            </span>
          </div>
          <p className="mt-3 text-[2rem] font-semibold leading-none tracking-[-0.04em] text-slate-950 tabular-nums">
            {formatNumber(statistics.open)}
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-violet-700">
            <span className="grid h-4 w-4 place-items-center rounded border border-violet-200">
              <CircleDashed size={10} />
            </span>
            Awaiting resolution
          </p>
        </div>

        <div className="min-h-[146px] rounded-[20px] border border-white bg-white p-4 shadow-sm shadow-slate-200/40 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-slate-700">
              Resolved Bugs
            </span>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-slate-300 text-slate-500">
              <ArrowUpRight size={14} />
            </span>
          </div>
          <p className="mt-3 text-[2rem] font-semibold leading-none tracking-[-0.04em] text-slate-950 tabular-nums">
            {formatNumber(statistics.closed)}
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-violet-700">
            <span className="grid h-4 w-4 place-items-center rounded border border-violet-200">
              <CheckCircle2 size={10} />
            </span>
            {formatPercentage(statistics.resolutionRate)} resolution rate
          </p>
        </div>

        <div className="min-h-[146px] rounded-[20px] border border-white bg-white p-4 shadow-sm shadow-slate-200/40 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-slate-700">
              High Severity
            </span>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-slate-300 text-slate-500">
              <ArrowUpRight size={14} />
            </span>
          </div>
          <p className="mt-3 text-[2rem] font-semibold leading-none tracking-[-0.04em] text-slate-950 tabular-nums">
            {formatNumber(statistics.high)}
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-violet-700">
            <span className="grid h-4 w-4 place-items-center rounded border border-violet-200">
              <ShieldAlert size={10} />
            </span>
            {formatPercentage(statistics.highSeverityRate)} of all reports
          </p>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ReportsTrendChart bugs={bugs} />
        </div>
        <CategoryBreakdown bugs={bugs} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SeverityDistribution statistics={statistics} />
        <ResolutionOverview statistics={statistics} />
      </div>
    </section>
  );
}

function BugDetails({ bug, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!bug) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [bug, onClose]);

  if (!bug) return null;

  const severity = getBugSeverity(bug);
  const status = getBugStatus(bug);
  const tags = Array.isArray(bug.tags) ? bug.tags : [];
  const screenshotUrl = bug.screenshot ? `${API_URL}${bug.screenshot}` : "";

  const details = [
    {
      label: "Bug ID",
      value: getShortBugId(bug),
      icon: Hash,
    },
    {
      label: "Reported",
      value: formatDateTime(bug.createdAt),
      icon: CalendarDays,
    },
    {
      label: "Severity",
      value: severity,
      icon: ShieldAlert,
    },
    {
      label: "Report count",
      value: formatNumber(getBugReports(bug)),
      icon: Layers,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bug-details-title"
        className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-slate-200/80 bg-white shadow-[0_24px_80px_-24px_rgba(15,23,42,0.35)] outline-none sm:rounded-2xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
              <Bug size={20} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-500">
                  {getShortBugId(bug)}
                </span>
                <Badge value={status} />
                <Badge value={severity} type="severity" />
              </div>

              <h2
                id="bug-details-title"
                className="mt-2 break-words text-lg font-semibold tracking-tight text-slate-950 sm:text-xl"
              >
                {getBugTitle(bug)}
              </h2>
            </div>
          </div>

          <IconButton icon={X} label="Close bug details" onClick={onClose} />
        </header>

        <div className="space-y-7 p-5 sm:p-7">
          <div className="grid gap-3 sm:grid-cols-2">
            {details.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Icon size={15} />
                    {item.label}
                  </div>

                  <p className="mt-2 break-words text-sm font-medium text-slate-900">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>

          {bug.category && (
            <section>
              <h3 className="text-sm font-semibold text-slate-900">Category</h3>

              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <Tag size={14} />
                {bug.category}
              </p>
            </section>
          )}

          <section>
            <h3 className="text-sm font-semibold text-slate-900">Summary</h3>

            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
              {bug.summary || "No summary available."}
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-900">
              Description
            </h3>

            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                {bug.description || "No description provided."}
              </p>
            </div>
          </section>

          {tags.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-900">Tags</h3>

              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600"
                  >
                    <Tag size={12} />
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {bug.testUrl && (
            <section>
              <h3 className="text-sm font-semibold text-slate-900">
                Affected URL
              </h3>

              <a
                href={bug.testUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm text-violet-700 transition hover:border-violet-300 hover:bg-violet-50/40"
              >
                <ExternalLink size={16} className="shrink-0" />

                <span className="min-w-0 flex-1 break-all">{bug.testUrl}</span>

                <SquareArrowOutUpRight
                  size={14}
                  className="shrink-0 text-slate-400"
                />
              </a>
            </section>
          )}

          {screenshotUrl && (
            <section>
              <h3 className="text-sm font-semibold text-slate-900">
                Screenshot
              </h3>

              <a
                href={screenshotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2"
              >
                <img
                  src={screenshotUrl}
                  alt={`Screenshot for ${getBugTitle(bug)}`}
                  loading="lazy"
                  className="max-h-[420px] w-full rounded-md object-contain"
                />

                <span className="flex items-center justify-center gap-2 py-3 text-xs font-medium text-violet-700">
                  Open original screenshot
                  <ArrowUpRight size={14} />
                </span>
              </a>
            </section>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <p className="text-xs text-slate-500">
              Last updated {formatDateTime(bug.updatedAt || bug.createdAt)}
            </p>

            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(getBugId(bug)).catch(() => {});
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <Copy size={14} />
              Copy bug ID
            </button>
          </footer>
        </div>
      </section>
    </div>
  );
}

function ReportRow({ bug, compact, onView }) {
  const title = getBugTitle(bug);
  const description = getBugDescription(bug);
  const timestamp = bug.createdAt;

  return (
    <tr className="group border-b border-slate-100/90 last:border-b-0 transition-colors hover:bg-slate-50/70">
      <td className={`min-w-[280px] ${compact ? "px-4 py-3" : "px-5 py-4"}`}>
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
            <Bug size={16} />
          </div>

          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onView(bug)}
              className="max-w-full break-words text-left text-sm font-medium text-slate-900 hover:text-violet-700 focus:outline-none focus:underline"
            >
              {title}
            </button>

            <p className="mt-1 text-xs text-slate-400">
              {getShortBugId(bug)}
              {bug.category ? ` · ${bug.category}` : ""}
            </p>

            {!compact && (
              <p className="mt-2 line-clamp-2 max-w-lg text-xs leading-5 text-slate-500">
                {description}
              </p>
            )}

            {bug.testUrl && (
              <a
                href={bug.testUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={bug.testUrl}
                className="mt-1.5 inline-flex max-w-full items-center gap-1.5 text-xs text-slate-500 hover:text-violet-700"
              >
                <ExternalLink size={12} className="shrink-0" />
                <span className="truncate">{getHostname(bug.testUrl)}</span>
              </a>
            )}
          </div>
        </div>
      </td>

      <td className="whitespace-nowrap px-4 py-4">
        <Badge value={getBugSeverity(bug)} type="severity" />
      </td>

      <td className="whitespace-nowrap px-4 py-4">
        <Badge value={getBugStatus(bug)} />
      </td>

      <td className="whitespace-nowrap px-4 py-4">
        <p className="text-sm text-slate-700">{formatDate(timestamp)}</p>
        <p className="mt-1 text-xs text-slate-400">
          {formatRelativeDate(timestamp)}
        </p>
      </td>

      <td className="whitespace-nowrap px-4 py-4">
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
          <Layers size={14} className="text-slate-400" />
          {formatNumber(getBugReports(bug))}
        </span>
      </td>

      <td className="whitespace-nowrap px-4 py-4 text-right">
        <button
          type="button"
          onClick={() => onView(bug)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-violet-300 hover:text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          Details
          <ArrowUpRight size={14} />
        </button>
      </td>
    </tr>
  );
}

function MobileReportCard({ bug, onView }) {
  return (
    <article className="p-4 transition hover:bg-slate-50/70">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
          <Bug size={17} />
        </div>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onView(bug)}
            className="break-words text-left text-sm font-semibold leading-6 text-slate-900 hover:text-violet-700"
          >
            {getBugTitle(bug)}
          </button>

          <p className="mt-1 text-xs text-slate-400">
            {getShortBugId(bug)} · {formatRelativeDate(bug.createdAt)}
          </p>
        </div>

        <IconButton
          icon={ArrowUpRight}
          label={`View ${getBugTitle(bug)}`}
          onClick={() => onView(bug)}
          size="sm"
        />
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
        {getBugDescription(bug)}
      </p>

      {bug.testUrl && (
        <a
          href={bug.testUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex max-w-full items-center gap-1.5 text-xs text-slate-500 hover:text-violet-700"
        >
          <ExternalLink size={12} className="shrink-0" />
          <span className="truncate">{getHostname(bug.testUrl)}</span>
        </a>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge value={getBugStatus(bug)} />
        <Badge value={getBugSeverity(bug)} type="severity" />

        <span className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400">
          <Layers size={13} />
          {getBugReports(bug)} reports
        </span>
      </div>
    </article>
  );
}

function FilterToolbar({
  filters,
  setFilter,
  categories,
  sortBy,
  setSortBy,
  onClear,
  active,
  onExport,
  exportDisabled,
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_160px_160px_170px_160px_auto]">
        <SearchInput
          value={filters.search}
          onChange={(value) => setFilter("search", value)}
          placeholder="Search title, URL, tags..."
        />

        <SelectField
          label="Filter by status"
          value={filters.status}
          onChange={(value) => setFilter("status", value)}
          icon={ListFilter}
          options={[
            { value: "All", label: "All statuses" },
            { value: "Open", label: "Open" },
            { value: "Closed", label: "Resolved" },
          ]}
        />

        <SelectField
          label="Filter by severity"
          value={filters.severity}
          onChange={(value) => setFilter("severity", value)}
          icon={ShieldAlert}
          options={[
            { value: "All", label: "All severities" },
            { value: "High", label: "High severity" },
            { value: "Medium", label: "Medium severity" },
            { value: "Low", label: "Low severity" },
          ]}
        />

        <SelectField
          label="Filter by category"
          value={filters.category}
          onChange={(value) => setFilter("category", value)}
          icon={Tag}
          options={[
            { value: "All", label: "All categories" },
            ...categories.map((category) => ({
              value: category,
              label: category,
            })),
          ]}
        />

        <SelectField
          label="Filter by date"
          value={filters.dateRange}
          onChange={(value) => setFilter("dateRange", value)}
          icon={Calendar}
          options={[
            { value: "all", label: "Any date" },
            { value: "today", label: "Today" },
            { value: "week", label: "Last 7 days" },
            { value: "month", label: "Last 30 days" },
          ]}
        />

        <button
          type="button"
          onClick={onExport}
          disabled={exportDisabled}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download size={15} />
          Export
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Sort by</span>

          <SelectField
            label="Sort reports"
            value={sortBy}
            onChange={setSortBy}
            options={SORT_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />
        </div>

        {active && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <FilterX size={14} />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

function ActiveFilterList({ filters, setFilter }) {
  const activeItems = [];

  if (filters.search.trim()) {
    activeItems.push({
      key: "search",
      label: `Search: ${filters.search.trim()}`,
      reset: "",
    });
  }

  if (filters.status !== "All") {
    activeItems.push({
      key: "status",
      label: `Status: ${filters.status}`,
      reset: "All",
    });
  }

  if (filters.severity !== "All") {
    activeItems.push({
      key: "severity",
      label: `Severity: ${filters.severity}`,
      reset: "All",
    });
  }

  if (filters.category !== "All") {
    activeItems.push({
      key: "category",
      label: `Category: ${filters.category}`,
      reset: "All",
    });
  }

  if (filters.dateRange !== "all") {
    const labels = {
      today: "Today",
      week: "Last 7 days",
      month: "Last 30 days",
    };

    activeItems.push({
      key: "dateRange",
      label: `Date: ${labels[filters.dateRange] || filters.dateRange}`,
      reset: "all",
    });
  }

  if (!activeItems.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
      <span className="text-xs text-slate-500">Active:</span>

      {activeItems.map((item) => (
        <FilterChip
          key={item.key}
          onRemove={() => setFilter(item.key, item.reset)}
        >
          {item.label}
        </FilterChip>
      ))}
    </div>
  );
}

function ReportTable({
  bugs,
  compactRows,
  onView,
  loading,
  loadedEmail,
  hasSearched,
  filtersActive,
  onClearFilters,
  onReport,
}) {
  if (loading) return <LoadingState />;

  if (!hasSearched) {
    return (
      <EmptyState
        icon={Search}
        title="Find your submitted reports"
        description="Enter the email address you used when submitting a bug to view your report history."
      />
    );
  }

  if (bugs.length === 0) {
    return (
      <EmptyState
        icon={filtersActive ? FilterX : Bug}
        title={filtersActive ? "No matching reports" : "No reports found"}
        description={
          filtersActive
            ? "Try removing a filter or changing your search terms."
            : `No reports were returned for ${loadedEmail}. Check the email address or submit a new report.`
        }
        action={
          filtersActive ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear filters
            </button>
          ) : (
            <Link
              href="/tester/url"
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              <Bug size={15} />
              Report a bug
            </Link>
          )
        }
      />
    );
  }

  return (
    <>
      <div className="divide-y divide-slate-100 md:hidden">
        {bugs.map((bug) => (
          <MobileReportCard key={bug._id} bug={bug} onView={onView} />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[940px] border-collapse text-left">
          <thead className="border-b border-slate-200/80 bg-slate-50/70">
            <tr className="text-xs font-medium text-slate-500">
              <th scope="col" className="px-5 py-3.5">
                Bug report
              </th>
              <th scope="col" className="px-4 py-3.5">
                Severity
              </th>
              <th scope="col" className="px-4 py-3.5">
                Status
              </th>
              <th scope="col" className="px-4 py-3.5">
                Reported
              </th>
              <th scope="col" className="px-4 py-3.5">
                Reports
              </th>
              <th scope="col" className="px-4 py-3.5 text-right">
                Details
              </th>
            </tr>
          </thead>

          <tbody>
            {bugs.map((bug) => (
              <ReportRow
                key={bug._id}
                bug={bug}
                compact={compactRows}
                onView={onView}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DashboardHeader({ onRefresh, refreshing, onExport, canExport }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/70 bg-[#f7f8fa]/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[76px] w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="hidden shrink-0 items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold tracking-tight text-violet-700 sm:inline-flex"
          aria-label="Go to home"
        >
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-600 text-white shadow-sm shadow-violet-600/20">
            <Bug size={16} />
          </span>
          <span>
            bug<span className="text-slate-900">tracker</span>
          </span>
        </Link>

        <div className="relative min-w-0 flex-1 sm:max-w-[390px]">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            aria-label="Search dashboard"
            placeholder="Search reports, projects..."
            onKeyDown={(event) => {
              if (event.key === "/" && event.target.value === "") {
                event.preventDefault();
              }
            }}
            className="h-11 w-full rounded-xl border border-white bg-white px-10 text-sm text-slate-700 shadow-sm shadow-slate-900/[0.03] outline-none transition placeholder:text-slate-400 hover:border-slate-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-100/70"
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label={refreshing ? "Refreshing reports" : "Refresh reports"}
            title={refreshing ? "Refreshing…" : "Refresh reports"}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white bg-white text-slate-600 shadow-sm shadow-slate-900/[0.03] transition hover:border-slate-200 hover:bg-slate-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            aria-label="Notifications"
            title="Notifications"
            className="relative grid h-10 w-10 place-items-center rounded-xl border border-white bg-white text-slate-600 shadow-sm shadow-slate-900/[0.03] transition hover:border-slate-200 hover:bg-slate-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
          >
            <Bell size={17} />
            <span className="absolute right-2.5 top-2 h-1.5 w-1.5 rounded-full bg-violet-500 ring-2 ring-white" />
          </button>

          <div className="ml-1 hidden h-10 items-center gap-2.5 rounded-xl border border-white bg-white py-1 pl-1 pr-3 shadow-sm shadow-slate-900/[0.03] sm:flex">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-500 text-white">
              <UserRound size={16} />
            </span>
            <span className="max-w-[120px]">
              <span className="block truncate text-xs font-semibold text-slate-800">
                Tester workspace
              </span>
              <span className="block text-[10px] text-slate-400">
                Bug tracking
              </span>
            </span>
            <ChevronDown size={14} className="ml-1 text-slate-400" />
          </div>

          <button
            type="button"
            onClick={onExport}
            disabled={!canExport}
            className="hidden h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 lg:inline-flex"
          >
            <FileDown size={15} />
            Export
          </button>
        </div>
      </div>
    </header>
  );
}
export default function TesterDashboardPage() {
  const [email, setEmail] = useState("");
  const [loadedEmail, setLoadedEmail] = useState("");
  const [bugs, setBugs] = useState([]);
  const [filters, setFilters] = useState(createEmptyFilters);
  const [sortBy, setSortBy] = useState(DEFAULT_PREFERENCES.sortBy);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PREFERENCES.pageSize);
  const [compactRows, setCompactRows] = useState(
    DEFAULT_PREFERENCES.compactRows,
  );
  const [showInsights, setShowInsights] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedBug, setSelectedBug] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const requestController = useRef(null);
  const requestSequence = useRef(0);
  const emailInputRef = useRef(null);
  const searchFormRef = useRef(null);

  const statistics = useMemo(() => calculateStatistics(bugs), [bugs]);

  const categories = useMemo(() => getUniqueCategories(bugs), [bugs]);

  const filteredBugs = useMemo(
    () => filterBugs(bugs, filters),
    [bugs, filters],
  );

  const sortedBugs = useMemo(
    () => sortBugs(filteredBugs, sortBy),
    [filteredBugs, sortBy],
  );

  const totalPages = Math.max(1, Math.ceil(sortedBugs.length / pageSize));

  const currentPage = Math.min(page, totalPages);

  const paginatedBugs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;

    return sortedBugs.slice(start, start + pageSize);
  }, [sortedBugs, currentPage, pageSize]);

  const filtersActive = areFiltersActive(filters);

  const updateFilter = useCallback((key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));

    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(createEmptyFilters());
    setPage(1);
  }, []);

  const cancelPendingRequest = useCallback(() => {
    if (requestController.current) {
      requestController.current.abort();
      requestController.current = null;
    }
  }, []);

  const loadReports = useCallback(
    async (event, requestedEmail = email) => {
      event?.preventDefault();

      const normalizedEmail = normalizeEmail(requestedEmail);

      if (!isValidEmail(normalizedEmail)) {
        setError("Enter a valid email address to find your reports.");
        emailInputRef.current?.focus();
        return;
      }

      cancelPendingRequest();

      const controller = new AbortController();
      requestController.current = controller;

      const sequence = ++requestSequence.current;

      setLoading(true);
      setError("");
      setLoadedEmail(normalizedEmail);
      setHasSearched(true);
      setSelectedBug(null);
      setPage(1);

      try {
        const response = await fetch(
          `${API_URL}/api/bugs?email=${encodeURIComponent(normalizedEmail)}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.message ||
              `Unable to load reports. Server returned ${response.status}.`,
          );
        }

        if (sequence !== requestSequence.current) return;

        if (!Array.isArray(result.bugs)) {
          throw new Error(
            "The server response did not contain a valid reports list.",
          );
        }

        setBugs(result.bugs);
        setLastUpdated(new Date());
      } catch (requestError) {
        if (requestError.name === "AbortError") return;

        if (sequence !== requestSequence.current) return;

        setError(
          requestError.message ||
            "Unable to connect to the API. Check your connection and try again.",
        );
      } finally {
        if (sequence === requestSequence.current) {
          setLoading(false);
          requestController.current = null;
        }
      }
    },
    [email, cancelPendingRequest],
  );

  const refreshReports = useCallback(() => {
    if (loadedEmail) {
      setEmail(loadedEmail);
      loadReports(undefined, loadedEmail);
      return;
    }

    emailInputRef.current?.focus();
  }, [loadedEmail, loadReports]);

  const handleExport = useCallback(() => {
    if (!sortedBugs.length) {
      setError("There are no reports available to export.");
      return;
    }

    exportBugsCsv(sortedBugs);
    setError("");
  }, [sortedBugs]);

  const handlePageSizeChange = useCallback((value) => {
    setPageSize(value);
    setPage(1);
  }, []);

  const handleOpenBug = useCallback((bug) => {
    setSelectedBug(bug);
  }, []);

  const handleCloseBug = useCallback(() => {
    setSelectedBug(null);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      const target = event.target;

      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;

      if (
        !isTyping &&
        (event.key === "/" || (event.ctrlKey && event.key === "k"))
      ) {
        event.preventDefault();
        emailInputRef.current?.focus();
      }

      if (event.key === "Escape") {
        setShowSettings(false);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, []);

  useEffect(() => {
    return () => {
      requestController.current?.abort();
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#dcdbe1] p-0 text-slate-900 antialiased sm:p-4 lg:p-6">
      <div className="mx-auto flex min-h-screen max-w-[1680px] overflow-hidden bg-white shadow-2xl shadow-slate-900/5 sm:min-h-[calc(100vh-2rem)] sm:rounded-[28px] lg:min-h-[calc(100vh-3rem)] lg:rounded-[34px]">
        <aside className="hidden w-[194px] shrink-0 flex-col border-r border-slate-100 bg-[#f8f7fc] px-4 py-6 md:flex lg:w-[218px] lg:px-5">
          <Link
            href="/"
            className="mb-9 flex items-center gap-2 px-2 text-lg font-bold tracking-tight text-slate-950"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-white">
              <Bug size={18} />
            </span>
            <span>
              AI <span className="text-violet-600">Tracker</span>
            </span>
          </Link>

          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Workspace
          </p>
          <nav aria-label="Main navigation" className="space-y-1">
            <a
              href="#dashboard"
              className="flex items-center gap-3 rounded-full bg-violet-600 px-3 py-3 text-xs font-semibold text-white shadow-sm shadow-violet-600/20"
            >
              <LayoutDashboard size={16} />
              Dashboard
            </a>
            <a
              href="#reports"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-medium text-slate-500 transition hover:bg-white hover:text-slate-900"
            >
              <ListChecks size={16} />
              Bug reports
            </a>
            <a
              href="#analytics"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-medium text-slate-500 transition hover:bg-white hover:text-slate-900"
            >
              <ChartNoAxesCombined size={16} />
              Analytics
            </a>
          </nav>

          <p className="mb-3 mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            General
          </p>
          <nav aria-label="General navigation" className="space-y-1">
            <button
              type="button"
              onClick={() => setShowSettings((value) => !value)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-medium text-slate-500 transition hover:bg-white hover:text-slate-900"
            >
              <Settings2 size={16} />
              Settings
            </button>
            <a
              href="#help"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-medium text-slate-500 transition hover:bg-white hover:text-slate-900"
            >
              <CircleHelp size={16} />
              Help
            </a>
            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-medium text-slate-500 transition hover:bg-white hover:text-slate-900"
            >
              <LogOut size={16} />
              Exit dashboard
            </Link>
          </nav>

          <div className="mt-auto rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-3.5 text-white">
            <span className="mb-2 grid h-7 w-7 place-items-center rounded-lg bg-white/15">
              <Sparkles size={15} />
            </span>
            <p className="text-xs font-semibold">Ship better software</p>
            <p className="mt-1 text-[10px] leading-4 text-white/60">
              Keep track of bugs and resolve issues faster.
            </p>
            <Link
              href="/tester/url"
              className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-violet-500 px-2 py-2 text-[10px] font-semibold text-white transition hover:bg-violet-400"
            >
              Report a bug
            </Link>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-full border border-slate-200 bg-white p-1">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-600 text-white">
              <Sun size={15} />
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-full text-slate-500">
              <Moon size={15} />
            </span>
          </div>
        </aside>

        <div className="min-w-0 flex-1 bg-[#fbfbfd]">
          <DashboardHeader
            onRefresh={refreshReports}
            refreshing={loading}
            onExport={handleExport}
            canExport={sortedBugs.length > 0}
          />

          <div
            id="dashboard"
            className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-6 lg:px-7"
          >
            <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                  <span>WORKSPACE</span>
                  <ChevronRight size={13} />
                  <span className="text-violet-700">TESTER DASHBOARD</span>
                </div>

                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-[2.15rem]">
                  Dashboard
                </h1>

                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                  A quick view of your bug reports and team updates.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Link
                  href="/tester/url"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm shadow-violet-600/20 transition hover:-translate-y-px hover:bg-violet-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
                >
                  <Bug size={15} />
                  Report a bug
                </Link>
                {lastUpdated && (
                  <span className="mr-1">
                    Updated {formatRelativeDate(lastUpdated)}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setShowInsights((value) => !value)}
                  aria-pressed={showInsights}
                  className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 font-medium transition ${
                    showInsights
                      ? "border-violet-200 bg-violet-50 text-violet-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <BarChart3 size={15} />
                  Insights
                </button>

                <button
                  type="button"
                  onClick={() => setShowSettings((value) => !value)}
                  aria-expanded={showSettings}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  <Settings2 size={15} />
                  View settings
                </button>
              </div>
            </section>

            {showSettings && (
              <section className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Table preferences
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Adjust the number of reports displayed and the density of
                      the table.
                    </p>
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={compactRows}
                      onChange={(event) => setCompactRows(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    Compact table rows
                  </label>
                </div>
              </section>
            )}

            <section
              id="analytics"
              className="mt-7 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30 sm:p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                <form
                  ref={searchFormRef}
                  onSubmit={(event) => loadReports(event)}
                  className="min-w-0 flex-1"
                >
                  <label
                    htmlFor="reporter-email"
                    className="mb-2 block text-sm font-medium text-slate-800"
                  >
                    Find reports by email
                  </label>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative min-w-0 flex-1">
                      <Mail
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        ref={emailInputRef}
                        id="reporter-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm shadow-violet-600/15 transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <Search size={16} />
                      )}

                      {loading ? "Searching..." : "Find reports"}
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    Use the same email address you provided when submitting a
                    bug.
                  </p>
                </form>

                <div className="hidden shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500 lg:flex">
                  <Command size={14} />
                  <span>Press / to search</span>
                </div>
              </div>
            </section>

            <ErrorBanner
              message={error}
              onDismiss={() => setError("")}
              onRetry={
                hasSearched && !loading
                  ? () => loadReports(undefined, loadedEmail)
                  : null
              }
            />

            <section className="mt-6">
              <SectionHeading
                eyebrow="Overview"
                title="Report activity"
                description={
                  loadedEmail
                    ? `Showing statistics for ${loadedEmail}`
                    : "Search for your reports to see your current activity."
                }
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Total reports"
                  value={statistics.total}
                  description="All reports associated with this email"
                  icon={Layers3}
                  tone="neutral"
                />

                <StatCard
                  label="Open reports"
                  value={statistics.open}
                  description={getStatusDescription("Open", statistics.open)}
                  icon={Clock3}
                  tone="violet"
                  onClick={() => {
                    updateFilter(
                      "status",
                      filters.status === "Open" ? "All" : "Open",
                    );
                  }}
                  active={filters.status === "Open"}
                />

                <StatCard
                  label="Resolved reports"
                  value={statistics.closed}
                  description={getStatusDescription(
                    "Closed",
                    statistics.closed,
                  )}
                  icon={CheckCircle2}
                  tone="emerald"
                  onClick={() => {
                    updateFilter(
                      "status",
                      filters.status === "Closed" ? "All" : "Closed",
                    );
                  }}
                  active={filters.status === "Closed"}
                />

                <StatCard
                  label="High severity"
                  value={statistics.high}
                  description={getSeverityDescription("High", statistics.high)}
                  icon={ShieldAlert}
                  tone="rose"
                  onClick={() => {
                    updateFilter(
                      "severity",
                      filters.severity === "High" ? "All" : "High",
                    );
                  }}
                  active={filters.severity === "High"}
                />
              </div>
            </section>

            {hasSearched && bugs.length > 0 && (
              <section className="mt-6">
                <SectionHeading
                  eyebrow="Analytics"
                  title="Report health"
                  description="Track reporting activity, resolution performance, severity, and issue categories."
                  action={
                    <button
                      type="button"
                      onClick={() => setShowInsights((value) => !value)}
                      aria-pressed={showInsights}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                        showInsights
                          ? "border-violet-200 bg-violet-50 text-violet-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <BarChart3 size={14} />
                      {showInsights ? "Hide analytics" : "Show analytics"}
                    </button>
                  }
                />

                {showInsights && (
                  <div className="mt-4">
                    <ReportSummaryPanel bugs={bugs} />
                  </div>
                )}
              </section>
            )}

            <section className="mt-7 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 p-4 sm:p-5">
                <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold tracking-tight text-slate-900">
                        Submitted bugs
                      </h2>

                      {hasSearched && (
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {formatNumber(filteredBugs.length)}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {hasSearched
                        ? getResolutionLabel(filteredBugs)
                        : "Your bug reports will appear here after you search."}
                    </p>
                  </div>

                  {hasSearched && bugs.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExport}
                        disabled={sortedBugs.length === 0}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                      >
                        <FileSpreadsheet size={14} />
                        Export filtered
                      </button>

                      <button
                        type="button"
                        onClick={clearFilters}
                        disabled={!filtersActive}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <FilterX size={14} />
                        Reset filters
                      </button>
                    </div>
                  )}
                </div>

                {hasSearched && bugs.length > 0 && (
                  <div className="mt-5">
                    <FilterToolbar
                      filters={filters}
                      setFilter={updateFilter}
                      categories={categories}
                      sortBy={sortBy}
                      setSortBy={(value) => {
                        setSortBy(value);
                        setPage(1);
                      }}
                      onClear={clearFilters}
                      active={filtersActive}
                      onExport={handleExport}
                      exportDisabled={!sortedBugs.length}
                    />
                  </div>
                )}

                {hasSearched && bugs.length > 0 && (
                  <div className="mt-3">
                    <ActiveFilterList
                      filters={filters}
                      setFilter={updateFilter}
                    />
                  </div>
                )}
              </div>

              <ReportTable
                bugs={paginatedBugs}
                compactRows={compactRows}
                onView={handleOpenBug}
                loading={loading}
                loadedEmail={loadedEmail}
                hasSearched={hasSearched}
                filtersActive={filtersActive}
                onClearFilters={clearFilters}
                onReport={() => {
                  window.location.href = "/tester/url";
                }}
              />

              {hasSearched && !loading && sortedBugs.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={sortedBugs.length}
                  onPageChange={setPage}
                  onPageSizeChange={handlePageSizeChange}
                />
              )}
            </section>

            <footer className="mt-6 flex flex-col justify-between gap-3 pb-5 text-xs text-slate-400 sm:flex-row sm:items-center">
              <p>AI Bug Tracker · Tester workspace</p>

              <div className="flex flex-wrap items-center gap-4">
                {lastUpdated && (
                  <span>Last refreshed {formatDateTime(lastUpdated)}</span>
                )}

                <Link
                  href="/tester/url"
                  className="inline-flex items-center gap-1.5 font-medium text-violet-700 transition hover:text-violet-900"
                >
                  Submit another report
                  <ArrowUpRight size={13} />
                </Link>
              </div>
            </footer>
          </div>
        </div>
        <BugDetails bug={selectedBug} onClose={handleCloseBug} />
      </div>
    </main>
  );
}
