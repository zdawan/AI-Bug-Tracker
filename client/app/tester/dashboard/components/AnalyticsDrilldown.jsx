"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Filter,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";

const SEVERITY_OPTIONS = [
  {
    value: "All",
    label: "All severities",
    color: "bg-slate-100 text-slate-700",
    bar: "bg-slate-400",
  },
  {
    value: "High",
    label: "High",
    color: "bg-rose-50 text-rose-700 ring-rose-200",
    bar: "bg-rose-500",
  },
  {
    value: "Medium",
    label: "Medium",
    color: "bg-amber-50 text-amber-700 ring-amber-200",
    bar: "bg-amber-500",
  },
  {
    value: "Low",
    label: "Low",
    color: "bg-sky-50 text-sky-700 ring-sky-200",
    bar: "bg-sky-500",
  },
];

const STATUS_OPTIONS = [
  {
    value: "All",
    label: "All statuses",
    description: "Every report",
    accent: "text-slate-700",
  },
  {
    value: "Open",
    label: "Open",
    description: "Needs attention",
    accent: "text-violet-700",
  },
  {
    value: "Closed",
    label: "Resolved",
    description: "Marked complete",
    accent: "text-emerald-700",
  },
];

const DATE_RANGE_OPTIONS = [
  { value: "all", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
];

const formatCount = (value) => new Intl.NumberFormat("en-IN").format(value);

function getCategoryName(report) {
  return typeof report?.category === "string" && report.category.trim()
    ? report.category.trim()
    : "Uncategorized";
}

function getReportName(report) {
  if (typeof report?.title === "string" && report.title.trim()) {
    return report.title.trim();
  }

  if (typeof report?.summary === "string" && report.summary.trim()) {
    return report.summary.trim();
  }

  return "Untitled report";
}

function getReportDate(report) {
  const date = new Date(report?.createdAt || report?.created_at || "");

  return Number.isNaN(date.getTime()) ? null : date;
}

function getRelativeReportDate(report) {
  const date = getReportDate(report);

  if (!date) return "Date unavailable";

  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);

  if (days < 0) return "Future date";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function getReportCount(report) {
  const count = Number(report?.reports);

  return Number.isFinite(count) && count > 0 ? count : 1;
}

function summarizeReports(reports) {
  const summary = reports.reduce(
    (result, report) => {
      result.total += 1;
      result.submissions += getReportCount(report);
      result.open += report?.status === "Closed" ? 0 : 1;
      result.resolved += report?.status === "Closed" ? 1 : 0;
      result.high += report?.severity === "High" ? 1 : 0;
      result.medium += report?.severity === "Medium" ? 1 : 0;
      result.low += report?.severity === "Low" ? 1 : 0;
      return result;
    },
    {
      total: 0,
      submissions: 0,
      open: 0,
      resolved: 0,
      high: 0,
      medium: 0,
      low: 0,
    },
  );

  summary.repeats = Math.max(0, summary.submissions - summary.total);
  summary.resolutionRate = summary.total
    ? Math.round((summary.resolved / summary.total) * 100)
    : 0;
  summary.highRate = summary.total
    ? Math.round((summary.high / summary.total) * 100)
    : 0;

  return summary;
}

function isWithinDateRange(report, dateRange, now = Date.now()) {
  if (dateRange === "all") return true;

  const date = getReportDate(report);
  if (!date) return false;

  if (dateRange === "today") {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return date.getTime() >= startOfToday.getTime();
  }

  const rangeInDays = dateRange === "week" ? 7 : 30;
  return date.getTime() >= now - rangeInDays * 86_400_000;
}

function buildCategorySummary(reports) {
  const totals = new Map();

  reports.forEach((report) => {
    const category =
      typeof report?.category === "string" ? report.category.trim() : "";
    if (!category) return;
    totals.set(category, (totals.get(category) || 0) + 1);
  });

  return [...totals.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

function SummaryTile({ label, value, note, tone }) {
  const tones = {
    violet: "bg-violet-50 text-violet-700",
    rose: "bg-rose-50 text-rose-700",
    emerald: "bg-emerald-50 text-emerald-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p
        className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-xl font-semibold tabular-nums ${
          tones[tone] || tones.slate
        }`}
      >
        {formatCount(value)}
      </p>
      <p className="mt-2 text-[10px] leading-4 text-slate-500">{note}</p>
    </article>
  );
}

function SeverityFilterButton({ option, count, selected, onSelect, total }) {
  const percent = total ? (count / total) * 100 : 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      aria-pressed={selected}
      className={`rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 ${
        selected
          ? "border-violet-300 bg-violet-50/70"
          : "border-slate-200 bg-white hover:border-violet-200"
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-700">
          {option.label}
        </span>
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${option.color}`}
        >
          {formatCount(count)}
        </span>
      </span>
      <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-slate-100">
        <span
          className={`block h-full rounded-full transition-all ${option.bar}`}
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className="mt-1.5 block text-right text-[10px] tabular-nums text-slate-400">
        {Math.round(percent)}% of issues
      </span>
    </button>
  );
}

function StatusFilterButton({ option, count, selected, onSelect, total }) {
  const percentage = total ? Math.round((count / total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      aria-pressed={selected}
      className={`flex min-h-[92px] flex-col justify-between rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 ${
        selected
          ? "border-violet-300 bg-violet-50/70"
          : "border-slate-200 bg-white hover:border-violet-200"
      }`}
    >
      <span className={`text-xs font-semibold ${option.accent}`}>
        {option.label}
      </span>
      <span className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-2xl font-semibold tabular-nums text-slate-900">
          {formatCount(count)}
        </span>
        <span className="text-[10px] tabular-nums text-slate-400">
          {percentage}%
        </span>
      </span>
      <span className="mt-1 text-[10px] text-slate-500">
        {option.description}
      </span>
    </button>
  );
}

function CategoryFilterList({
  categories,
  activeCategory,
  onSelect,
  search,
  onSearchChange,
}) {
  const query = search.trim().toLowerCase();
  const visibleCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(query),
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold text-slate-800">
            Browse by category
          </h4>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            Choose a category to include it in the report-list filters.
          </p>
        </div>
        <label className="relative w-full sm:max-w-[220px]">
          <span className="sr-only">Search report categories</span>
          <Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Find a category"
            className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2 text-[11px] outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelect("All")}
          aria-pressed={activeCategory === "All"}
          className={`rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
            activeCategory === "All"
              ? "bg-violet-700 text-white"
              : "border border-slate-200 text-slate-600 hover:border-violet-200 hover:text-violet-700"
          }`}
        >
          All categories
        </button>
        {visibleCategories.map((category) => (
          <button
            key={category.name}
            type="button"
            onClick={() => onSelect(category.name)}
            aria-pressed={activeCategory === category.name}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
              activeCategory === category.name
                ? "bg-violet-700 text-white"
                : "border border-slate-200 text-slate-600 hover:border-violet-200 hover:text-violet-700"
            }`}
          >
            <span className="max-w-[180px] truncate">{category.name}</span>
            <span
              className={`tabular-nums ${
                activeCategory === category.name
                  ? "text-violet-100"
                  : "text-slate-400"
              }`}
            >
              {formatCount(category.count)}
            </span>
          </button>
        ))}
        {!visibleCategories.length && (
          <p className="w-full py-3 text-center text-xs text-slate-500">
            No categories match this search.
          </p>
        )}
      </div>
    </section>
  );
}

function FilterSummary({ filters, onClear }) {
  const activeItems = [
    filters.status !== "All" && `Status: ${filters.status}`,
    filters.severity !== "All" && `Severity: ${filters.severity}`,
    filters.category !== "All" && `Category: ${filters.category}`,
    filters.dateRange !== "all" &&
      `Date: ${
        DATE_RANGE_OPTIONS.find((option) => option.value === filters.dateRange)
          ?.label || filters.dateRange
      }`,
  ].filter(Boolean);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-violet-50 px-3 py-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Filter size={13} className="shrink-0 text-violet-700" />
        {activeItems.length ? (
          activeItems.map((item) => (
            <span
              key={item}
              className="max-w-full truncate rounded-md bg-white px-2 py-1 text-[10px] font-medium text-violet-800"
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-[11px] text-violet-800">
            No report filters selected
          </span>
        )}
      </div>
      {activeItems.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-violet-700 hover:text-violet-900"
        >
          <X size={12} />
          Clear selection
        </button>
      )}
    </div>
  );
}

function DrilldownReportRow({ report, onOpenReport }) {
  const status = report?.status === "Closed" ? "Resolved" : "Open";
  const severity = report?.severity || "Unknown";
  const statusStyle =
    status === "Resolved"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-violet-50 text-violet-700";

  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
          severity === "High"
            ? "bg-rose-50 text-rose-600"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {severity === "High" ? (
          <ShieldAlert size={15} />
        ) : (
          <ArrowDownRight size={15} />
        )}
      </span>
      <button
        type="button"
        onClick={() => onOpenReport(report)}
        className="min-w-[140px] flex-1 text-left"
      >
        <span className="block truncate text-xs font-semibold text-slate-800 hover:text-violet-700">
          {getReportName(report)}
        </span>
        <span className="mt-1 block truncate text-[10px] text-slate-500">
          {getCategoryName(report)} · {getRelativeReportDate(report)}
        </span>
      </button>
      <span className="text-[10px] font-medium text-slate-500">
        {severity}
      </span>
      <span
        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusStyle}`}
      >
        {status}
      </span>
      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
        <ArrowUpRight size={11} />
        {formatCount(getReportCount(report))}
      </span>
    </li>
  );
}

export default function AnalyticsDrilldown({
  reports = [],
  filters,
  onApplyFilters,
  onOpenReport,
}) {
  const [draftStatus, setDraftStatus] = useState(filters.status || "All");
  const [draftSeverity, setDraftSeverity] = useState(
    filters.severity || "All",
  );
  const [draftCategory, setDraftCategory] = useState(
    filters.category || "All",
  );
  const [draftDateRange, setDraftDateRange] = useState(
    filters.dateRange || "all",
  );
  const [categorySearch, setCategorySearch] = useState("");

  useEffect(() => {
    setDraftStatus(filters.status || "All");
    setDraftSeverity(filters.severity || "All");
    setDraftCategory(filters.category || "All");
    setDraftDateRange(filters.dateRange || "all");
  }, [filters.category, filters.dateRange, filters.severity, filters.status]);

  const metrics = useMemo(() => summarizeReports(reports), [reports]);
  const categories = useMemo(() => buildCategorySummary(reports), [reports]);
  const categoryCount = useMemo(
    () => new Map(categories.map((item) => [item.name, item.count])),
    [categories],
  );

  const selectedReports = useMemo(
    () =>
      reports.filter((report) => {
        const status = report?.status === "Closed" ? "Closed" : "Open";
        const severity = report?.severity || "Low";

        return (
          (draftStatus === "All" || status === draftStatus) &&
          (draftSeverity === "All" || severity === draftSeverity) &&
          (draftCategory === "All" ||
            getCategoryName(report) === draftCategory) &&
          isWithinDateRange(report, draftDateRange)
        );
      }),
    [draftCategory, draftDateRange, draftSeverity, draftStatus, reports],
  );

  const recentMatches = useMemo(
    () =>
      [...selectedReports]
        .sort((left, right) => {
          const leftTime = getReportDate(left)?.getTime() || 0;
          const rightTime = getReportDate(right)?.getTime() || 0;
          return rightTime - leftTime;
        })
        .slice(0, 5),
    [selectedReports],
  );

  const currentFilters = {
    status: draftStatus,
    severity: draftSeverity,
    category: draftCategory,
    dateRange: draftDateRange,
  };
  const hasDraftChanges =
    draftStatus !== (filters.status || "All") ||
    draftSeverity !== (filters.severity || "All") ||
    draftCategory !== (filters.category || "All") ||
    draftDateRange !== (filters.dateRange || "all");

  const clearDraftFilters = () => {
    setDraftStatus("All");
    setDraftSeverity("All");
    setDraftCategory("All");
    setDraftDateRange("all");
  };

  const applyDraftFilters = () => {
    onApplyFilters(currentFilters);
  };

  return (
    <section
      className="rounded-[22px] border border-violet-100 bg-gradient-to-br from-violet-50/70 via-white to-slate-50 p-4 shadow-sm shadow-violet-900/[0.03] sm:p-5"
      aria-labelledby="analytics-drilldown-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600">
            Explore your data
          </p>
          <h3
            id="analytics-drilldown-heading"
            className="mt-1 text-base font-semibold text-slate-900"
          >
            Interactive report drilldown
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Combine status, severity, and category to preview matching reports,
            then apply the same filters to your report list.
          </p>
        </div>
        <span className="rounded-full border border-white bg-white/80 px-3 py-1.5 text-[10px] font-semibold text-slate-500">
          {formatCount(reports.length)} source reports
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          label="Unique issues"
          value={metrics.total}
          note={`${formatCount(metrics.submissions)} total submissions`}
          tone="violet"
        />
        <SummaryTile
          label="Open"
          value={metrics.open}
          note="Issues awaiting resolution"
          tone="rose"
        />
        <SummaryTile
          label="Resolved"
          value={metrics.resolved}
          note={`${metrics.resolutionRate}% resolution rate`}
          tone="emerald"
        />
        <SummaryTile
          label="Repeat submissions"
          value={metrics.repeats}
          note={`${metrics.highRate}% of issues are high severity`}
          tone="slate"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h4 className="text-xs font-semibold text-slate-800">
                Filter by severity
              </h4>
              <p className="mt-1 text-[10px] text-slate-500">
                Select a severity to narrow the preview.
              </p>
            </div>
            <span className="text-[10px] text-slate-400">
              {formatCount(metrics.total)} issues
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {SEVERITY_OPTIONS.filter((option) => option.value !== "All").map(
              (option) => (
                <SeverityFilterButton
                  key={option.value}
                  option={option}
                  count={metrics[option.value.toLowerCase()]}
                  selected={draftSeverity === option.value}
                  onSelect={(value) =>
                    setDraftSeverity((current) =>
                      current === value ? "All" : value,
                    )
                  }
                  total={metrics.total}
                />
              ),
            )}
          </div>
          <button
            type="button"
            onClick={() => setDraftSeverity("All")}
            aria-pressed={draftSeverity === "All"}
            className={`mt-2 w-full rounded-lg px-3 py-2 text-[10px] font-semibold transition ${
              draftSeverity === "All"
                ? "bg-violet-50 text-violet-800"
                : "border border-slate-200 text-slate-500 hover:text-violet-700"
            }`}
          >
            Include all severities
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div>
            <h4 className="text-xs font-semibold text-slate-800">
              Filter by status
            </h4>
            <p className="mt-1 text-[10px] text-slate-500">
              Compare open work with completed issues.
            </p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {STATUS_OPTIONS.map((option) => (
              <StatusFilterButton
                key={option.value}
                option={option}
                count={
                  option.value === "All"
                    ? metrics.total
                    : option.value === "Open"
                      ? metrics.open
                      : metrics.resolved
                }
                selected={draftStatus === option.value}
                onSelect={(value) =>
                  setDraftStatus((current) =>
                    current === value ? "All" : value,
                  )
                }
                total={metrics.total}
              />
            ))}
          </div>
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-500">
            The dashboard treats a report as resolved when its stored status is
            Closed. Other values appear as open in this summary.
          </p>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-xs font-semibold text-slate-800">
              Filter by report date
            </h4>
            <p className="mt-1 text-[10px] text-slate-500">
              Compare a recent reporting window with your other filters.
            </p>
          </div>
          <div
            className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1"
            role="group"
            aria-label="Filter reports by date range"
          >
            {DATE_RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDraftDateRange(option.value)}
                aria-pressed={draftDateRange === option.value}
                className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                  draftDateRange === option.value
                    ? "bg-white text-violet-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-4">
        <CategoryFilterList
          categories={categories}
          activeCategory={draftCategory}
          onSelect={setDraftCategory}
          search={categorySearch}
          onSearchChange={setCategorySearch}
        />
      </div>

      <div className="mt-4">
        <FilterSummary filters={currentFilters} onClear={clearDraftFilters} />
      </div>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h4 className="text-xs font-semibold text-slate-800">
              Matching report preview
            </h4>
            <p className="mt-1 text-[10px] text-slate-500">
              {formatCount(selectedReports.length)} matching{" "}
              {selectedReports.length === 1 ? "issue" : "issues"} · newest
              first
            </p>
          </div>
          {selectedReports.length > recentMatches.length && (
            <span className="text-[10px] text-slate-400">
              Showing {recentMatches.length} of{" "}
              {formatCount(selectedReports.length)}
            </span>
          )}
        </div>

        {recentMatches.length ? (
          <ul className="mt-2">
            {recentMatches.map((report, index) => (
              <DrilldownReportRow
                key={report?._id || report?.id || `${getReportName(report)}-${index}`}
                report={report}
                onOpenReport={onOpenReport}
              />
            ))}
          </ul>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
            <p className="text-xs font-semibold text-slate-700">
              No reports match this combination
            </p>
            <p className="mt-1 text-[10px] text-slate-500">
              Remove a filter or choose another category to see matching issues.
            </p>
            <button
              type="button"
              onClick={clearDraftFilters}
              className="mt-3 rounded-lg bg-white px-3 py-2 text-[10px] font-semibold text-violet-700 ring-1 ring-slate-200 hover:ring-violet-200"
            >
              Clear drilldown filters
            </button>
          </div>
        )}
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] leading-4 text-slate-500">
          Preview filters remain separate until you apply them to the report
          list.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearDraftFilters}
            disabled={
              draftStatus === "All" &&
              draftSeverity === "All" &&
              draftCategory === "All"
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={applyDraftFilters}
            disabled={!hasDraftChanges}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2 text-[11px] font-semibold text-white transition hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Check size={13} />
            Apply to report list
          </button>
        </div>
      </div>
    </section>
  );
}
