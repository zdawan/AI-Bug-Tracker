"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  Flame,
  Layers3,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import ReportRiskComparison from "./ReportRiskComparison";

const DAY_MS = 86_400_000;
const INITIAL_VISIBLE = 8;

const RANGE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open only" },
  { value: "closed", label: "Resolved only" },
];

const SEVERITY_FILTER_ALL = "all";

const SORT_OPTIONS = [
  { value: "open", label: "Most open issues" },
  { value: "count", label: "Most reports" },
  { value: "age", label: "Oldest open issue" },
  { value: "repeats", label: "Most repeat reports" },
  { value: "name", label: "Category A–Z" },
];

const MATRIX_VIEWS = [
  {
    id: "all",
    label: "All",
    description: "Every matching category and severity",
  },
  {
    id: "urgent",
    label: "Urgent",
    description: "High and critical open issues",
  },
  {
    id: "repeat",
    label: "Repeats",
    description: "Cells with repeat submissions",
  },
  {
    id: "aging",
    label: "Aging",
    description: "Open issues older than 7 days",
  },
  {
    id: "rising",
    label: "Rising risk",
    description: "Largest increases versus prior period",
  },
];

const SEVERITY_RANK = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  unspecified: 4,
};

function normalizeText(value, fallback = "") {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function getReportId(report) {
  return normalizeText(report?._id || report?.id);
}

function getReportTitle(report) {
  return normalizeText(report?.title || report?.summary, "Untitled report");
}

function getCategory(report) {
  return normalizeText(report?.category, "Uncategorized");
}

function getSeverity(report) {
  return normalizeText(report?.severity, "Unspecified");
}

function getStatus(report) {
  return normalizeText(report?.status).toLowerCase() === "closed"
    ? "closed"
    : "open";
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
    if (
      localDate.getFullYear() === year &&
      localDate.getMonth() === month - 1 &&
      localDate.getDate() === day
    ) {
      return localDate;
    }
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getAgeInDays(report, today) {
  const date = getReportDate(report);
  if (!date) return null;

  const reportDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const day = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return Math.max(0, Math.floor((day - reportDay) / DAY_MS));
}

function getRepeatCount(report) {
  const count = Number(report?.reports);
  return Number.isFinite(count) && count > 0 ? count : 1;
}

function getSearchText(report) {
  return [
    getReportId(report),
    getReportTitle(report),
    report?.description,
    getCategory(report),
    getSeverity(report),
    report?.url,
    report?.pageUrl,
  ]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function formatNumber(value, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits,
  }).format(value);
}

function formatDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "Date unavailable";
  }
  return value.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatAge(age) {
  if (age === null || age === undefined) return "Date unavailable";
  if (age === 0) return "Today";
  if (age === 1) return "1 day";
  return `${formatNumber(age)} days`;
}

function getSeverityOrder(value) {
  return SEVERITY_RANK[value.toLowerCase()] ?? 5;
}

function compareSeverity(left, right) {
  return (
    getSeverityOrder(left) - getSeverityOrder(right) ||
    left.localeCompare(right)
  );
}

function getCellValue(cell, metric) {
  if (metric === "open") return cell.openCount;
  if (metric === "age") return cell.oldestOpenAge || 0;
  if (metric === "repeats") return cell.repeatReports;
  return cell.count;
}

function getCellMetricCaption(cell, metric) {
  if (metric === "open") {
    return `${formatNumber(cell.openCount)} open`;
  }
  if (metric === "age") {
    return cell.oldestOpenAge === null
      ? "No dated open issues"
      : `Oldest ${formatAge(cell.oldestOpenAge)}`;
  }
  if (metric === "repeats") {
    return `${formatNumber(cell.repeatReports)} repeated`;
  }
  return `${formatNumber(cell.count)} ${cell.count === 1 ? "report" : "reports"}`;
}

function getCellTone(cell, metric, maximum) {
  if (!cell.count) {
    return "border-slate-100 bg-slate-50/60 text-slate-300";
  }

  const value = getCellValue(cell, metric);
  const ratio = maximum ? value / maximum : 0;
  if (ratio >= 0.75) {
    return "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100";
  }
  if (ratio >= 0.4) {
    return "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100";
  }
  return "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100";
}

function createEmptyCell(category, severity) {
  return {
    category,
    severity,
    reports: [],
    count: 0,
    openCount: 0,
    closedCount: 0,
    repeatReports: 0,
    submissionVolume: 0,
    oldestOpenAge: null,
    highSeverityOpen: 0,
  };
}

function aggregateReports(reports, today) {
  const categories = new Map();
  const severities = new Set();
  const cells = new Map();

  reports.forEach((report) => {
    const category = getCategory(report);
    const severity = getSeverity(report);
    const status = getStatus(report);
    const age = getAgeInDays(report, today);
    severities.add(severity);

    if (!categories.has(category)) {
      categories.set(category, {
        category,
        reports: [],
        count: 0,
        openCount: 0,
        closedCount: 0,
        repeatReports: 0,
        submissionVolume: 0,
        oldestOpenAge: null,
      });
    }

    const categoryBucket = categories.get(category);
    categoryBucket.reports.push(report);
    categoryBucket.count += 1;
    categoryBucket.submissionVolume += getRepeatCount(report);
    if (getRepeatCount(report) > 1) categoryBucket.repeatReports += 1;
    if (status === "closed") categoryBucket.closedCount += 1;
    else {
      categoryBucket.openCount += 1;
      if (age !== null) {
        categoryBucket.oldestOpenAge =
          categoryBucket.oldestOpenAge === null
            ? age
            : Math.max(categoryBucket.oldestOpenAge, age);
      }
    }

    const key = `${category}\u0000${severity}`;
    if (!cells.has(key)) cells.set(key, createEmptyCell(category, severity));
    const cell = cells.get(key);
    cell.reports.push(report);
    cell.count += 1;
    cell.submissionVolume += getRepeatCount(report);
    if (getRepeatCount(report) > 1) cell.repeatReports += 1;
    if (status === "closed") {
      cell.closedCount += 1;
    } else {
      cell.openCount += 1;
      if (severity.toLowerCase() === "high" || severity.toLowerCase() === "critical") {
        cell.highSeverityOpen += 1;
      }
      if (age !== null) {
        cell.oldestOpenAge =
          cell.oldestOpenAge === null ? age : Math.max(cell.oldestOpenAge, age);
      }
    }
  });

  return {
    categories: [...categories.values()],
    severities: [...severities].sort(compareSeverity),
    cells,
  };
}

function normalizeReports(reports) {
  if (!Array.isArray(reports)) return [];
  return reports.filter(
    (report) => report && typeof report === "object" && !Array.isArray(report),
  );
}

function filterReports(
  reports,
  { range, status, severity, search },
  today,
) {
  const normalizedSearch = search.trim().toLowerCase();
  const rangeStart = range === "all" ? null : new Date(today);
  if (rangeStart) rangeStart.setDate(rangeStart.getDate() - Number(range) + 1);

  return reports.filter((report) => {
    if (status !== "all" && getStatus(report) !== status) return false;
    if (severity !== SEVERITY_FILTER_ALL && getSeverity(report) !== severity) {
      return false;
    }
    if (rangeStart) {
      const reportDate = getReportDate(report);
      if (!reportDate) return false;
      const reportDay = new Date(
        reportDate.getFullYear(),
        reportDate.getMonth(),
        reportDate.getDate(),
      );
      if (reportDay < rangeStart || reportDay > today) return false;
    }
    return !normalizedSearch || getSearchText(report).includes(normalizedSearch);
  });
}

function sortCategories(categories, sortBy) {
  return [...categories].sort((left, right) => {
    if (sortBy === "count") {
      return right.count - left.count || left.category.localeCompare(right.category);
    }
    if (sortBy === "age") {
      return (
        (right.oldestOpenAge ?? -1) - (left.oldestOpenAge ?? -1) ||
        left.category.localeCompare(right.category)
      );
    }
    if (sortBy === "repeats") {
      return (
        right.repeatReports - left.repeatReports ||
        left.category.localeCompare(right.category)
      );
    }
    if (sortBy === "name") return left.category.localeCompare(right.category);
    return (
      right.openCount - left.openCount ||
      right.count - left.count ||
      left.category.localeCompare(right.category)
    );
  });
}

function getVisibleMatrixData(
  categories,
  severities,
  cells,
  view,
  comparisonDeltas,
) {
  if (view === "all") {
    return { categories, severities, cells };
  }

  const isCellVisible = (cell) => {
    if (view === "urgent") {
      return (
        cell.openCount > 0 &&
        ["high", "critical"].includes(cell.severity.toLowerCase())
      );
    }
    if (view === "repeat") return cell.repeatReports > 0;
    if (view === "aging") return cell.oldestOpenAge > 7;
    return (comparisonDeltas.get(cell.category)?.get(cell.severity) || 0) > 0;
  };

  const visibleCells = new Map(
    [...cells.entries()].filter(([, cell]) => isCellVisible(cell)),
  );
  const visibleSeverities = severities.filter((severity) =>
    [...visibleCells.values()].some((cell) => cell.severity === severity),
  );
  const visibleCategories = categories.filter((category) =>
    [...visibleCells.values()].some(
      (cell) => cell.category === category.category,
    ),
  );

  return {
    categories: visibleCategories,
    severities: visibleSeverities,
    cells: visibleCells,
  };
}

function getComparisonDeltas(reports, range, status, severity, search, today) {
  const days = Number(range);
  if (!Number.isFinite(days) || days <= 0) return new Map();

  const currentEnd = new Date(today);
  const currentStart = new Date(today);
  currentStart.setDate(currentStart.getDate() - days + 1);
  const previousEnd = new Date(currentStart);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - days + 1);

  const matches = (report, start, end) => {
    if (status === "open" && getStatus(report) !== "open") return false;
    if (status === "closed" && getStatus(report) !== "closed") return false;
    if (severity !== SEVERITY_FILTER_ALL && getSeverity(report) !== severity) {
      return false;
    }
    if (search && !getSearchText(report).includes(search.trim().toLowerCase())) {
      return false;
    }
    const date = getReportDate(report);
    if (!date) return false;
    const reportDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    return reportDay >= start && reportDay <= end;
  };

  const countsByPeriod = [new Map(), new Map()];
  reports.forEach((report) => {
    const periods = [
      [previousStart, previousEnd],
      [currentStart, currentEnd],
    ];
    periods.forEach(([start, end], index) => {
      if (!matches(report, start, end)) return;
      const key = `${getCategory(report)}\u0000${getSeverity(report)}`;
      const counts = countsByPeriod[index];
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });

  const result = new Map();
  countsByPeriod[1].forEach((currentCount, key) => {
    const [category, severityValue] = key.split("\u0000");
    const previousCount = countsByPeriod[0].get(key) || 0;
    if (!result.has(category)) result.set(category, new Map());
    result.get(category).set(severityValue, currentCount - previousCount);
  });
  return result;
}

function getSummary(reports, today) {
  return reports.reduce(
    (summary, report) => {
      const status = getStatus(report);
      const age = getAgeInDays(report, today);
      summary.count += 1;
      summary.submissions += getRepeatCount(report);
      if (status === "closed") summary.closed += 1;
      else {
        summary.open += 1;
        if (
          getSeverity(report).toLowerCase() === "high" ||
          getSeverity(report).toLowerCase() === "critical"
        ) {
          summary.highOpen += 1;
        }
        if (age !== null) summary.oldestAge = Math.max(summary.oldestAge, age);
      }
      if (getRepeatCount(report) > 1) summary.repeated += 1;
      return summary;
    },
    {
      count: 0,
      open: 0,
      closed: 0,
      highOpen: 0,
      repeated: 0,
      submissions: 0,
      oldestAge: 0,
    },
  );
}

function escapeCsv(value) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function exportMatrixCsv(
  categories,
  severities,
  cells,
  {
    rangeLabel,
    statusLabel,
    severityLabel,
    search,
    viewLabel,
    metricLabel,
    sortLabel,
  },
) {
  const headers = [
    "Category",
    ...severities.flatMap((severity) => [
      `${severity} reports`,
      `${severity} open`,
      `${severity} oldest open age days`,
    ]),
    "Total reports",
    "Open reports",
    "Resolved reports",
    "Repeat reports",
    "Oldest open age days",
  ];
  const rows = categories.map((category) => {
    const row = [category.category];
    severities.forEach((severity) => {
      const cell = cells.get(`${category.category}\u0000${severity}`);
      row.push(
        cell?.count || 0,
        cell?.openCount || 0,
        cell?.oldestOpenAge ?? "",
      );
    });
    row.push(
      category.count,
      category.openCount,
      category.closedCount,
      category.repeatReports,
      category.oldestOpenAge ?? "",
    );
    return row;
  });
  const metadata = [
    ["Risk matrix export"],
    ["Generated", new Date().toLocaleString("en-IN")],
    ["Date range", rangeLabel],
    ["Status filter", statusLabel],
    ["Severity filter", severityLabel],
    ["Search", search || "None"],
    ["Matrix focus", viewLabel],
    ["Heat metric", metricLabel],
    ["Category sort", sortLabel],
    ["Categories exported", categories.length],
    ["Severity levels exported", severities.length],
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
  anchor.download = `report-risk-matrix-${viewLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "all"}.csv`;
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
        size={13}
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 text-slate-400"
      />
    </label>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone }) {
  const tones = {
    violet: "bg-violet-50 text-violet-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
    sky: "bg-sky-50 text-sky-700",
  };

  return (
    <article className="rounded-xl border border-slate-200/80 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
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
      <p className="mt-1 text-[9px] text-slate-400">{detail}</p>
    </article>
  );
}

function getPriorityCell(cells) {
  return [...cells.values()]
    .filter((cell) => cell.openCount > 0)
    .sort(
      (left, right) =>
        right.highSeverityOpen - left.highSeverityOpen ||
        right.openCount - left.openCount ||
        right.repeatReports - left.repeatReports ||
        (right.oldestOpenAge ?? -1) - (left.oldestOpenAge ?? -1) ||
        left.category.localeCompare(right.category),
    )[0] || null;
}

function PriorityCluster({ cell, onSelect }) {
  if (!cell) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2.5">
        <span className="inline-flex items-center gap-2 text-[10px] font-medium text-emerald-800">
          <CheckCircle2 size={14} aria-hidden="true" />
          No open issue clusters match these filters.
        </span>
      </div>
    );
  }

  const concentration =
    cell.highSeverityOpen > 0
      ? `${formatNumber(cell.highSeverityOpen)} high / critical open`
      : `${formatNumber(cell.openCount)} open`;
  const age =
    cell.oldestOpenAge === null
      ? "No dated open issues"
      : `Oldest ${formatAge(cell.oldestOpenAge)}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-100 bg-gradient-to-r from-rose-50/80 to-white px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-rose-700 shadow-sm">
          <Flame size={15} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[8px] font-bold uppercase tracking-wide text-rose-700">
            Priority cluster
          </p>
          <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-800">
            {cell.category} · {cell.severity}
          </p>
          <p className="mt-0.5 text-[8px] text-slate-500">
            {concentration} · {formatNumber(cell.repeatReports)} repeat · {age}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onSelect(cell.category, cell.severity)}
        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-rose-100 bg-white px-2.5 text-[9px] font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        Inspect cluster
        <ArrowUpRight size={11} aria-hidden="true" />
      </button>
    </div>
  );
}

function MatrixCell({
  cell,
  metric,
  maximum,
  selected,
  onSelect,
}) {
  const value = getCellValue(cell, metric);
  const tone = getCellTone(cell, metric, maximum);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!cell.count}
      aria-pressed={selected}
      aria-label={`${cell.category}, ${cell.severity}: ${getCellMetricCaption(
        cell,
        metric,
      )}, ${formatNumber(cell.openCount)} open`}
      title={`${cell.category} · ${cell.severity}: ${getCellMetricCaption(
        cell,
        metric,
      )}`}
      className={`min-h-[64px] w-full rounded-lg border px-2 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-default ${tone} ${
        selected ? "ring-2 ring-violet-500 ring-offset-1" : ""
      }`}
    >
      {cell.count ? (
        <>
          <span className="flex items-baseline justify-between gap-1">
            <span className="text-sm font-bold tabular-nums">
              {metric === "age"
                ? cell.oldestOpenAge === null
                  ? "—"
                  : formatAge(cell.oldestOpenAge)
                : formatNumber(value)}
            </span>
            {metric !== "count" && (
              <span className="text-[8px] font-medium opacity-70">
                {formatNumber(cell.count)} total
              </span>
            )}
          </span>
          <span className="mt-1 block truncate text-[8px] opacity-75">
            {formatNumber(cell.openCount)} open ·{" "}
            {formatNumber(cell.repeatReports)} repeat
          </span>
        </>
      ) : (
        <span className="block text-center text-[10px]">—</span>
      )}
    </button>
  );
}

function MatrixTable({
  categories,
  severities,
  cells,
  metric,
  selectedCategory,
  selectedSeverity,
  onSelectCell,
  onSelectCategory,
  activeView,
}) {
  const maximum = Math.max(
    1,
    ...[...cells.values()].map((cell) => getCellValue(cell, metric)),
  );

  if (!categories.length || !severities.length) {
    return (
      <div className="grid min-h-44 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 text-center">
        <div>
          <Layers3 size={20} aria-hidden="true" className="mx-auto text-slate-400" />
          <p className="mt-2 text-xs font-semibold text-slate-700">
            No category and severity combinations found
          </p>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            Try changing the time range, status, or search query.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200/80">
      <table className="w-full min-w-[700px] border-separate border-spacing-0 text-left">
        <caption className="sr-only">
          Report counts by category and severity. Select a populated cell to
          inspect matching reports.
        </caption>
        <thead>
          <tr className="bg-slate-50/90">
            <th
              scope="col"
              className="sticky left-0 z-10 min-w-40 border-b border-slate-200 bg-slate-50 px-3 py-3 text-[9px] font-bold uppercase tracking-wide text-slate-500"
            >
              Category
            </th>
            {severities.map((severity) => (
              <th
                key={severity}
                scope="col"
                className={`min-w-[118px] border-b border-slate-200 px-2 py-3 text-center text-[9px] font-bold uppercase tracking-wide ${
                  activeView === "all" ||
                  (activeView === "urgent" &&
                    ["high", "critical"].includes(severity.toLowerCase()))
                    ? "text-slate-600"
                    : "text-violet-700"
                }`}
              >
                {severity}
              </th>
            ))}
            <th
              scope="col"
              className="min-w-[100px] border-b border-slate-200 px-3 py-3 text-right text-[9px] font-bold uppercase tracking-wide text-slate-500"
            >
              Total / Open
            </th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category, index) => (
            <tr
              key={category.category}
              className={index % 2 ? "bg-white" : "bg-slate-50/30"}
            >
              <th
                scope="row"
                className={`sticky left-0 z-[1] border-b border-slate-100 px-3 py-2 ${
                  index % 2 ? "bg-white" : "bg-slate-50/80"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectCategory(category.category)}
                  aria-pressed={
                    selectedCategory === category.category &&
                    selectedSeverity === "all"
                  }
                  className="max-w-40 text-left text-[10px] font-semibold text-slate-700 underline-offset-2 hover:text-violet-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  title={`Show all severities for ${category.category}`}
                >
                  <span className="block truncate">{category.category}</span>
                  <span className="mt-0.5 block text-[8px] font-normal text-slate-400">
                    {formatNumber(category.count)} reports ·{" "}
                    {formatNumber(category.openCount)} open
                  </span>
                </button>
              </th>
              {severities.map((severity) => {
                const cell =
                  cells.get(`${category.category}\u0000${severity}`) ||
                  createEmptyCell(category.category, severity);
                const selected =
                  selectedCategory === category.category &&
                  selectedSeverity === severity;
                return (
                  <td
                    key={severity}
                    className="border-b border-slate-100 px-1.5 py-2 align-middle"
                  >
                    <MatrixCell
                      cell={cell}
                      metric={metric}
                      maximum={maximum}
                      selected={selected}
                      onSelect={() => onSelectCell(category.category, severity)}
                    />
                  </td>
                );
              })}
              <td className="border-b border-slate-100 px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => onSelectCategory(category.category)}
                  className="rounded-lg px-2 py-1 text-right hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  aria-label={`Show all severities in ${category.category}: ${category.count} reports, ${category.openCount} open`}
                >
                  <span className="block text-xs font-bold tabular-nums text-slate-800">
                    {formatNumber(category.count)}
                  </span>
                  <span className="block text-[8px] tabular-nums text-slate-400">
                    {formatNumber(category.openCount)} open
                  </span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportRow({ report, today, onOpenReport }) {
  const age = getAgeInDays(report, today);
  const severity = getSeverity(report);
  const status = getStatus(report);
  const high = ["high", "critical"].includes(severity.toLowerCase());
  const id = getReportId(report);

  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
          high
            ? "bg-rose-50 text-rose-700"
            : status === "closed"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-600"
        }`}
        aria-hidden="true"
      >
        {high ? <Flame size={14} /> : status === "closed" ? <CheckCircle2 size={14} /> : <Layers3 size={14} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold text-slate-800">
          {getReportTitle(report)}
        </p>
        <p className="mt-0.5 truncate text-[9px] text-slate-400">
          {id ? `#${id.slice(-10)} · ` : ""}
          {getCategory(report)} · {formatDate(getReportDate(report))}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span
          className={`rounded-full px-2 py-1 text-[8px] font-semibold ${
            high
              ? "bg-rose-50 text-rose-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {severity}
        </span>
        <span
          className={`rounded-full px-2 py-1 text-[8px] font-semibold ${
            status === "closed"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {status === "closed" ? "Resolved" : "Open"}
        </span>
      </div>
      <span className="w-16 shrink-0 text-right text-[9px] tabular-nums text-slate-500">
        {formatAge(age)}
      </span>
      {onOpenReport && (
        <button
          type="button"
          onClick={() => onOpenReport(report)}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          Open
          <ArrowUpRight size={11} aria-hidden="true" />
        </button>
      )}
    </li>
  );
}

function DrilldownPanel({
  reports,
  category,
  severity,
  today,
  visibleCount,
  onShowMore,
  onClose,
  onOpenReport,
}) {
  const heading =
    category === "all"
      ? "All matching reports"
      : severity === "all"
        ? category
        : `${category} · ${severity}`;

  return (
    <section
      aria-label={`Report details: ${heading}`}
      className="rounded-xl border border-violet-100 bg-violet-50/40 p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wide text-violet-600">
            Cell drill-down
          </p>
          <h4 className="mt-1 text-xs font-semibold text-slate-800">
            {heading}
          </h4>
          <p className="mt-1 text-[9px] text-slate-500">
            {formatNumber(reports.length)} matching{" "}
            {reports.length === 1 ? "report" : "reports"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close report details"
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
      {reports.length ? (
        <>
          <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white px-3">
            {reports.slice(0, visibleCount).map((report, index) => (
              <ReportRow
                key={getReportId(report) || `${getReportTitle(report)}-${index}`}
                report={report}
                today={today}
                onOpenReport={onOpenReport}
              />
            ))}
          </ul>
          {visibleCount < reports.length && (
            <button
              type="button"
              onClick={onShowMore}
              className="mt-2 w-full rounded-lg border border-violet-100 bg-white px-3 py-2 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              Show {formatNumber(Math.min(8, reports.length - visibleCount))}{" "}
              more reports
            </button>
          )}
        </>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-violet-100 bg-white p-4 text-center text-[10px] text-slate-500">
          No reports match this matrix cell and the active filters.
        </p>
      )}
    </section>
  );
}

function HeatLegend({ metric }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[8px] text-slate-400">
      <span>Higher {metric === "age" ? "age" : metric === "open" ? "open count" : metric === "repeats" ? "repeat count" : "count"}</span>
      <span className="h-2.5 w-3 rounded-sm border border-sky-200 bg-sky-50" />
      <span className="h-2.5 w-3 rounded-sm border border-amber-200 bg-amber-50" />
      <span className="h-2.5 w-3 rounded-sm border border-rose-200 bg-rose-50" />
      <span>Higher concentration</span>
    </div>
  );
}

function EmptyRiskMatrix({ hasReports, onReset }) {
  return (
    <div className="grid min-h-52 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-center">
      <div>
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-400 shadow-sm">
          <BarChart3 size={18} aria-hidden="true" />
        </span>
        <p className="mt-3 text-xs font-semibold text-slate-700">
          {hasReports
            ? "No reports match these filters"
            : "Category and severity patterns will appear here"}
        </p>
        <p className="mx-auto mt-1 max-w-sm text-[10px] leading-4 text-slate-500">
          {hasReports
            ? "Try another status, time range, or search term to find a report cluster."
            : "The matrix groups reports by category and severity so recurring high-impact areas are easier to spot."}
        </p>
        {hasReports && (
          <button
            type="button"
            onClick={onReset}
            className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-semibold text-slate-600 hover:border-violet-200 hover:text-violet-700"
          >
            Reset filters
          </button>
        )}
      </div>
    </div>
  );
}

export default function ReportRiskMatrix({
  reports = [],
  onOpenReport,
}) {
  const [range, setRange] = useState("all");
  const [status, setStatus] = useState("all");
  const [severityFilter, setSeverityFilter] = useState(SEVERITY_FILTER_ALL);
  const [metric, setMetric] = useState("count");
  const [activeView, setActiveView] = useState("all");
  const [sortBy, setSortBy] = useState("open");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const allReports = useMemo(() => normalizeReports(reports), [reports]);
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const severityOptions = useMemo(() => {
    const values = [
      ...new Set(allReports.map((report) => getSeverity(report))),
    ].sort(compareSeverity);
    return [
      { value: SEVERITY_FILTER_ALL, label: "All severities" },
      ...values.map((value) => ({ value, label: value })),
    ];
  }, [allReports]);

  const filteredReports = useMemo(
    () =>
      filterReports(
        allReports,
        { range, status, severity: severityFilter, search },
        today,
      ),
    [allReports, range, search, severityFilter, status, today],
  );
  const aggregate = useMemo(
    () => aggregateReports(filteredReports, today),
    [filteredReports, today],
  );
  const categories = useMemo(
    () => sortCategories(aggregate.categories, sortBy),
    [aggregate.categories, sortBy],
  );
  const summary = useMemo(
    () => getSummary(filteredReports, today),
    [filteredReports, today],
  );
  const priorityCell = useMemo(
    () => getPriorityCell(aggregate.cells),
    [aggregate.cells],
  );
  const comparisonDeltas = useMemo(
    () =>
      getComparisonDeltas(
        allReports,
        range,
        status,
        severityFilter,
        search,
        today,
      ),
    [allReports, range, search, severityFilter, status, today],
  );
  const visibleMatrix = useMemo(
    () =>
      getVisibleMatrixData(
        categories,
        aggregate.severities,
        aggregate.cells,
        activeView,
        comparisonDeltas,
      ),
    [
      activeView,
      aggregate.cells,
      aggregate.severities,
      categories,
      comparisonDeltas,
    ],
  );

  const selectedReports = useMemo(
    () =>
      filteredReports
        .filter((report) => {
          if (selectedCategory && getCategory(report) !== selectedCategory) {
            return false;
          }
          if (
            selectedSeverity &&
            getSeverity(report) !== selectedSeverity
          ) {
            return false;
          }
          return true;
        })
        .sort((left, right) => {
          const ageDifference =
            (getAgeInDays(right, today) ?? -1) -
            (getAgeInDays(left, today) ?? -1);
          const severityDifference =
            compareSeverity(getSeverity(left), getSeverity(right));
          return severityDifference || ageDifference;
        }),
    [filteredReports, selectedCategory, selectedSeverity, today],
  );

  const hasSelection = Boolean(selectedCategory || selectedSeverity);
  const hasFilters =
    range !== "all" ||
    status !== "all" ||
    severityFilter !== SEVERITY_FILTER_ALL ||
    activeView !== "all" ||
    Boolean(search.trim());
  const activeViewDefinition =
    MATRIX_VIEWS.find((view) => view.id === activeView) || MATRIX_VIEWS[0];
  const viewCounts = useMemo(
    () =>
      Object.fromEntries(
        MATRIX_VIEWS.map((view) => [
          view.id,
          getVisibleMatrixData(
            categories,
            aggregate.severities,
            aggregate.cells,
            view.id,
            comparisonDeltas,
          ).categories.length,
        ]),
      ),
    [
      aggregate.cells,
      aggregate.severities,
      categories,
      comparisonDeltas,
    ],
  );
  const isEmptyFilterResult =
    allReports.length > 0 && filteredReports.length === 0;
  const periodLabel =
    RANGE_OPTIONS.find((option) => option.value === range)?.label || "All time";

  const resetFilters = () => {
    setRange("all");
    setStatus("all");
    setSeverityFilter(SEVERITY_FILTER_ALL);
    setActiveView("all");
    setSearch("");
    setSelectedCategory("");
    setSelectedSeverity("");
    setVisibleCount(INITIAL_VISIBLE);
  };

  const updateRange = (value) => {
    setRange(value);
    setSelectedCategory("");
    setSelectedSeverity("");
    setVisibleCount(INITIAL_VISIBLE);
  };

  const updateStatus = (value) => {
    setStatus(value);
    setSelectedCategory("");
    setSelectedSeverity("");
    setVisibleCount(INITIAL_VISIBLE);
  };

  const updateSeverity = (value) => {
    setSeverityFilter(value);
    setSelectedCategory("");
    setSelectedSeverity("");
    setVisibleCount(INITIAL_VISIBLE);
  };

  const updateSearch = (event) => {
    setSearch(event.target.value);
    setSelectedCategory("");
    setSelectedSeverity("");
    setVisibleCount(INITIAL_VISIBLE);
  };

  const updateView = (value) => {
    setActiveView(value);
    setSelectedCategory("");
    setSelectedSeverity("");
    setVisibleCount(INITIAL_VISIBLE);
  };

  const selectCell = (category, severity) => {
    if (
      selectedCategory === category &&
      selectedSeverity === severity
    ) {
      setSelectedCategory("");
      setSelectedSeverity("");
    } else {
      setSelectedCategory(category);
      setSelectedSeverity(severity);
    }
    setVisibleCount(INITIAL_VISIBLE);
  };

  const selectCategory = (category) => {
    if (selectedCategory === category && selectedSeverity === "all") {
      setSelectedCategory("");
      setSelectedSeverity("");
    } else {
      setSelectedCategory(category);
      setSelectedSeverity("all");
    }
    setVisibleCount(INITIAL_VISIBLE);
  };

  const exportCsv = () =>
    exportMatrixCsv(
      visibleMatrix.categories,
      visibleMatrix.severities,
      visibleMatrix.cells,
      {
        rangeLabel: periodLabel,
        statusLabel:
          STATUS_OPTIONS.find((option) => option.value === status)?.label ||
          status,
        severityLabel:
          severityOptions.find((option) => option.value === severityFilter)
            ?.label || severityFilter,
        search: search.trim(),
        viewLabel: activeViewDefinition.label,
        metricLabel:
          heatMetricOptions.find((option) => option.value === metric)?.label ||
          metric,
        sortLabel:
          SORT_OPTIONS.find((option) => option.value === sortBy)?.label ||
          sortBy,
      },
    );

  const heatMetricOptions = [
    { value: "count", label: "Report count" },
    { value: "open", label: "Open issue count" },
    { value: "age", label: "Oldest open age" },
    { value: "repeats", label: "Repeat report count" },
  ];

  const searchId = "report-risk-matrix-search";

  return (
    <section
      aria-labelledby="report-risk-matrix-heading"
      className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30"
    >
      <header className="border-b border-slate-100 bg-gradient-to-br from-rose-50/60 via-white to-violet-50/40 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-rose-100 bg-rose-50 text-rose-700">
              <ShieldAlert size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-rose-700">
                Patch 6 · Issue concentration
              </p>
              <h2
                id="report-risk-matrix-heading"
                className="mt-1 text-base font-semibold tracking-tight text-slate-950"
              >
                Category × severity risk matrix
              </h2>
              <p className="mt-1 max-w-2xl text-[10px] leading-4 text-slate-500">
                Find clusters of unresolved and high-severity reports. Select a
                cell to inspect the underlying reports.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!filteredReports.length}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[9px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Download size={13} aria-hidden="true" />
            Export matrix
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SelectControl
            label="Filter risk matrix by time range"
            value={range}
            options={RANGE_OPTIONS}
            onChange={updateRange}
          />
          <SelectControl
            label="Filter risk matrix by status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={updateStatus}
          />
          <SelectControl
            label="Filter risk matrix by severity"
            value={severityFilter}
            options={severityOptions}
            onChange={updateSeverity}
          />
          <SelectControl
            label="Choose risk matrix heat value"
            value={metric}
            options={heatMetricOptions}
            onChange={setMetric}
          />
          <SelectControl
            label="Sort matrix categories"
            value={sortBy}
            options={SORT_OPTIONS}
            onChange={setSortBy}
          />
          <label
            htmlFor={searchId}
            className="relative min-w-[190px] flex-1 sm:max-w-xs"
          >
            <Search
              size={13}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={updateSearch}
              placeholder="Search reports or categories"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </label>
          {(hasFilters || hasSelection) && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[9px] font-semibold text-slate-500 transition hover:bg-white hover:text-violet-700"
            >
              <X size={12} aria-hidden="true" />
              Reset
            </button>
          )}
          <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-medium text-slate-500">
            <CalendarDays size={12} aria-hidden="true" />
            {periodLabel}
          </span>
        </div>
      </header>

      <div className="space-y-4 p-3 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Layers3}
            label="Matching reports"
            value={summary.count}
            detail={`${formatNumber(summary.submissions)} total submissions`}
            tone="violet"
          />
          <MetricCard
            icon={Clock3}
            label="Open"
            value={summary.open}
            detail={`${formatNumber(summary.closed)} resolved`}
            tone="amber"
          />
          <MetricCard
            icon={Flame}
            label="High / critical open"
            value={summary.highOpen}
            detail="Prioritize alongside age"
            tone="rose"
          />
          <MetricCard
            icon={ArrowDownWideNarrow}
            label="Repeated issues"
            value={summary.repeated}
            detail="More than one submission"
            tone="sky"
          />
        </div>

        {filteredReports.length > 0 && (
          <PriorityCluster
            cell={priorityCell}
            onSelect={(category, severity) => {
              setSelectedCategory(category);
              setSelectedSeverity(severity);
              setVisibleCount(INITIAL_VISIBLE);
            }}
          />
        )}

        {isEmptyFilterResult || !allReports.length ? (
          <EmptyRiskMatrix
            hasReports={allReports.length > 0}
            onReset={resetFilters}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-slate-800">
                  Report clusters
                </h3>
                <p className="mt-1 text-[9px] text-slate-500">
                  {formatNumber(categories.length)} categories ·{" "}
                  {formatNumber(aggregate.severities.length)} severity levels ·{" "}
                  {formatNumber(filteredReports.length)} matching reports
                </p>
              </div>
              <HeatLegend metric={metric} />
            </div>

            <div
              role="group"
              aria-label="Filter matrix by risk pattern"
              className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/60 p-2"
            >
              <span className="mr-1 text-[8px] font-semibold uppercase tracking-wide text-slate-400">
                Focus
              </span>
              {MATRIX_VIEWS.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  aria-pressed={activeView === view.id}
                  aria-label={`${view.label}: ${view.description}`}
                  onClick={() => updateView(view.id)}
                  className={`inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[9px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                    activeView === view.id
                      ? "border-violet-200 bg-violet-50 text-violet-800"
                      : "border-transparent bg-white text-slate-500 hover:border-slate-200 hover:text-slate-700"
                  }`}
                >
                  {view.label}
                  <span className="rounded-md bg-white/80 px-1 py-0.5 tabular-nums">
                    {formatNumber(viewCounts[view.id] || 0)}
                  </span>
                </button>
              ))}
              <span className="ml-auto hidden text-[8px] text-slate-400 sm:inline">
                {activeViewDefinition.description}
              </span>
            </div>

            <MatrixTable
              categories={visibleMatrix.categories}
              severities={visibleMatrix.severities}
              cells={visibleMatrix.cells}
              metric={metric}
              selectedCategory={selectedCategory}
              selectedSeverity={selectedSeverity}
              onSelectCell={selectCell}
              onSelectCategory={selectCategory}
              activeView={activeView}
            />

            <ReportRiskComparison
              reports={allReports}
              range={range}
              status={status}
              severity={severityFilter}
              search={search}
              today={today}
              selectedCategory={selectedCategory}
              onSelectCategory={selectCategory}
            />

            {hasSelection && (
              <DrilldownPanel
                reports={selectedReports}
                category={selectedCategory || "all"}
                severity={selectedSeverity || "all"}
                today={today}
                visibleCount={visibleCount}
                onShowMore={() =>
                  setVisibleCount((current) =>
                    Math.min(current + 8, selectedReports.length),
                  )
                }
                onClose={() => {
                  setSelectedCategory("");
                  setSelectedSeverity("");
                  setVisibleCount(INITIAL_VISIBLE);
                }}
                onOpenReport={onOpenReport}
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <p className="text-[9px] leading-4 text-slate-400">
                Matrix heat is relative to the selected metric and current
                filters. Reports without a usable date remain included in
                “All time” and search results.
              </p>
              {filteredReports.some((report) => !getReportDate(report)) &&
                range !== "all" && (
                  <p className="text-[9px] text-amber-700">
                    Undated reports are excluded from this time window.
                  </p>
                )}
            </div>
          </>
        )}

        <span className="sr-only" aria-live="polite">
          {formatNumber(filteredReports.length)} reports match the risk matrix
          filters. {formatNumber(summary.open)} are open and{" "}
          {formatNumber(summary.highOpen)} are high or critical severity.
        </span>
      </div>
    </section>
  );
}
