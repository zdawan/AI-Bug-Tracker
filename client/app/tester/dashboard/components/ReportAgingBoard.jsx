"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Flame,
  Search,
  ShieldAlert,
} from "lucide-react";

const DAY_MS = 86_400_000;
const INITIAL_VISIBLE_REPORTS = 6;

const AGE_BUCKETS = [
  {
    id: "fresh",
    label: "0–2 days",
    description: "Recently reported",
    minDays: 0,
    maxDays: 2,
    color: "bg-sky-500",
    tone: "text-sky-700",
    surface: "bg-sky-50",
  },
  {
    id: "watch",
    label: "3–7 days",
    description: "Keep an eye on progress",
    minDays: 3,
    maxDays: 7,
    color: "bg-amber-500",
    tone: "text-amber-700",
    surface: "bg-amber-50",
  },
  {
    id: "aging",
    label: "8–30 days",
    description: "May need a follow-up",
    minDays: 8,
    maxDays: 30,
    color: "bg-orange-500",
    tone: "text-orange-700",
    surface: "bg-orange-50",
  },
  {
    id: "stale",
    label: "31+ days",
    description: "Long-running open issue",
    minDays: 31,
    maxDays: Infinity,
    color: "bg-rose-500",
    tone: "text-rose-700",
    surface: "bg-rose-50",
  },
];

const AGE_FILTERS = [
  { id: "all", label: "All open issues" },
  ...AGE_BUCKETS.map(({ id, label }) => ({ id, label })),
];

function getTimestamp(report) {
  const timestamp = new Date(report?.createdAt || report?.created_at || "").getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
}

function getAgeInDays(report, now = Date.now()) {
  const timestamp = getTimestamp(report);

  if (timestamp === null || timestamp > now + 60_000) return null;

  return Math.max(0, Math.floor((now - timestamp) / DAY_MS));
}

function getAgeBucketId(report, now = Date.now()) {
  const age = getAgeInDays(report, now);

  if (age === null) return "unknown";

  return (
    AGE_BUCKETS.find(
      (bucket) => age >= bucket.minDays && age <= bucket.maxDays,
    )?.id || "fresh"
  );
}

function getSeverityRank(report) {
  if (report?.severity === "High") return 3;
  if (report?.severity === "Medium") return 2;
  return 1;
}

function getSubmissionCount(report) {
  const count = Number(report?.reports);

  return Number.isFinite(count) && count > 0 ? count : 1;
}

function getIssueTitle(report) {
  if (typeof report?.title === "string" && report.title.trim()) {
    return report.title.trim();
  }

  if (typeof report?.summary === "string" && report.summary.trim()) {
    return report.summary.trim();
  }

  return "Untitled issue";
}

function getCategoryLabel(report) {
  return typeof report?.category === "string" && report.category.trim()
    ? report.category.trim()
    : "Uncategorized";
}

function formatCount(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatAge(report, now = Date.now()) {
  const age = getAgeInDays(report, now);

  if (age === null) return "Date unavailable";
  if (age === 0) return "Reported today";
  if (age === 1) return "Open 1 day";
  return `Open ${formatCount(age)} days`;
}

function formatReportDate(report) {
  const timestamp = getTimestamp(report);

  if (timestamp === null) return "Date unavailable";

  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getAgeInsight(reports, now = Date.now()) {
  const openReports = reports.filter((report) => report?.status !== "Closed");
  const bucketCounts = Object.fromEntries(
    AGE_BUCKETS.map((bucket) => [bucket.id, 0]),
  );
  let unknownDates = 0;
  let highSeverityOpen = 0;
  let repeatOpen = 0;
  let oldestAge = 0;

  openReports.forEach((report) => {
    const bucketId = getAgeBucketId(report, now);
    if (bucketId === "unknown") {
      unknownDates += 1;
    } else {
      bucketCounts[bucketId] += 1;
      oldestAge = Math.max(oldestAge, getAgeInDays(report, now) || 0);
    }

    if (report?.severity === "High") highSeverityOpen += 1;
    if (getSubmissionCount(report) > 1) repeatOpen += 1;
  });

  return {
    totalOpen: openReports.length,
    bucketCounts,
    unknownDates,
    highSeverityOpen,
    repeatOpen,
    oldestAge,
    aging:
      bucketCounts.aging + bucketCounts.stale,
    stale: bucketCounts.stale,
  };
}

function getTriagePriority(report, now = Date.now()) {
  const age = getAgeInDays(report, now) ?? 0;
  const severityWeight = getSeverityRank(report) * 100;
  const repeatWeight = Math.min(getSubmissionCount(report) - 1, 25) * 4;
  const ageWeight = Math.min(age, 365) * 2;

  return severityWeight + repeatWeight + ageWeight;
}

function filterOpenIssues(reports, ageFilter, severityFilter, query, now) {
  const normalizedQuery = query.trim().toLowerCase();

  return reports
    .filter((report) => report?.status !== "Closed")
    .filter((report) => {
      if (ageFilter !== "all" && getAgeBucketId(report, now) !== ageFilter) {
        return false;
      }

      if (
        severityFilter !== "All" &&
        report?.severity !== severityFilter
      ) {
        return false;
      }

      if (!normalizedQuery) return true;

      return [
        report?._id,
        report?.title,
        report?.summary,
        report?.description,
        report?.category,
        report?.severity,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    })
    .sort((left, right) => {
      const priorityDifference =
        getTriagePriority(right, now) - getTriagePriority(left, now);

      return (
        priorityDifference ||
        (getTimestamp(left) ?? 0) - (getTimestamp(right) ?? 0)
      );
    });
}

function AgeMetricCard({ label, value, note, icon: Icon, tone }) {
  const tones = {
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
        <span
          className={`grid h-7 w-7 place-items-center rounded-lg ${
            tones[tone] || tones.slate
          }`}
        >
          <Icon size={14} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
        {formatCount(value)}
      </p>
      <p className="mt-1 text-[10px] leading-4 text-slate-500">{note}</p>
    </article>
  );
}

function AgeBucketCard({ bucket, count, total, selected, onSelect }) {
  const percentage = total ? (count / total) * 100 : 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(selected ? "all" : bucket.id)}
      aria-pressed={selected}
      className={`rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 ${
        selected
          ? "border-violet-300 bg-violet-50/80"
          : "border-slate-200 bg-white hover:border-violet-200"
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className={`text-xs font-semibold ${bucket.tone}`}>
          {bucket.label}
        </span>
        <span className="text-sm font-bold tabular-nums text-slate-800">
          {formatCount(count)}
        </span>
      </span>
      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-100">
        <span
          className={`block h-full rounded-full transition-all ${bucket.color}`}
          style={{ width: `${percentage}%` }}
        />
      </span>
      <span className="mt-1.5 block text-[10px] leading-4 text-slate-500">
        {bucket.description}
      </span>
    </button>
  );
}

function AgeIssueRow({ report, now, onOpenReport }) {
  const severity = report?.severity || "Low";
  const ageBucket = AGE_BUCKETS.find(
    (bucket) => bucket.id === getAgeBucketId(report, now),
  );
  const isHigh = severity === "High";
  const isRepeated = getSubmissionCount(report) > 1;

  return (
    <li className="border-b border-slate-100 last:border-b-0">
      <div className="flex flex-wrap items-center gap-3 py-3">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
            isHigh
              ? "bg-rose-50 text-rose-600"
              : severity === "Medium"
                ? "bg-amber-50 text-amber-600"
                : "bg-sky-50 text-sky-600"
          }`}
          aria-hidden="true"
        >
          {isHigh ? (
            <Flame size={16} />
          ) : ageBucket?.id === "stale" ? (
            <AlertTriangle size={16} />
          ) : (
            <Clock3 size={16} />
          )}
        </span>
        <button
          type="button"
          onClick={() => onOpenReport(report)}
          className="min-w-[150px] flex-1 text-left"
        >
          <span className="block truncate text-xs font-semibold text-slate-800 hover:text-violet-700">
            {getIssueTitle(report)}
          </span>
          <span className="mt-1 block truncate text-[10px] text-slate-500">
            {getCategoryLabel(report)} · first reported{" "}
            {formatReportDate(report)}
          </span>
        </button>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
              isHigh
                ? "bg-rose-50 text-rose-700"
                : severity === "Medium"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-sky-50 text-sky-700"
            }`}
          >
            {severity}
          </span>
          {ageBucket ? (
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-semibold ${ageBucket.surface} ${ageBucket.tone}`}
            >
              {ageBucket.label}
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
              Date unavailable
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          {isRepeated && (
            <span className="rounded-md bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">
              {formatCount(getSubmissionCount(report))} submissions
            </span>
          )}
          <span className="hidden min-w-[84px] text-right text-[10px] font-medium tabular-nums text-slate-500 sm:block">
            {formatAge(report, now)}
          </span>
          <button
            type="button"
            onClick={() => onOpenReport(report)}
            aria-label={`Open report: ${getIssueTitle(report)}`}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-violet-50 hover:text-violet-700"
          >
            <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
    </li>
  );
}

function AgeEmptyState({ filtered, onReset }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
      <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-white text-slate-400">
        <CheckCircle2 size={18} />
      </span>
      <p className="mt-3 text-xs font-semibold text-slate-700">
        {filtered ? "No issues match these filters" : "No open issues"}
      </p>
      <p className="mt-1 text-[10px] leading-4 text-slate-500">
        {filtered
          ? "Try another age range, severity, or search term."
          : "New unresolved reports will appear in this view."}
      </p>
      {filtered && (
        <button
          type="button"
          onClick={onReset}
          className="mt-3 rounded-lg bg-white px-3 py-2 text-[10px] font-semibold text-violet-700 ring-1 ring-slate-200 hover:ring-violet-200"
        >
          Clear view filters
        </button>
      )}
    </div>
  );
}

export default function ReportAgingBoard({
  reports = [],
  onOpenReport,
  onViewAllOpen,
}) {
  const [ageFilter, setAgeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_REPORTS);
  const now = Date.now();
  const insight = useMemo(() => getAgeInsight(reports, now), [reports, now]);
  const openReports = useMemo(
    () => filterOpenIssues(reports, ageFilter, severityFilter, search, now),
    [reports, ageFilter, severityFilter, search, now],
  );
  const visibleReports = openReports.slice(0, visibleCount);
  const filtersActive =
    ageFilter !== "all" || severityFilter !== "All" || Boolean(search.trim());

  const resetFilters = () => {
    setAgeFilter("all");
    setSeverityFilter("All");
    setSearch("");
    setVisibleCount(INITIAL_VISIBLE_REPORTS);
  };

  const handleAgeFilterChange = (nextFilter) => {
    setAgeFilter(nextFilter);
    setVisibleCount(INITIAL_VISIBLE_REPORTS);
  };

  const handleSeverityFilterChange = (event) => {
    setSeverityFilter(event.target.value);
    setVisibleCount(INITIAL_VISIBLE_REPORTS);
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setVisibleCount(INITIAL_VISIBLE_REPORTS);
  };

  return (
    <section
      className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30"
      aria-labelledby="report-aging-heading"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <CalendarClock size={18} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-700">
              Aging and follow-up
            </p>
            <h3
              id="report-aging-heading"
              className="mt-0.5 text-base font-semibold text-slate-900"
            >
              Open issue age monitor
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Prioritize unresolved reports by severity, age, and repeat volume.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onViewAllOpen}
          disabled={!insight.totalOpen}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          View all open
          <ArrowUpRight size={13} />
        </button>
      </header>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <AgeMetricCard
            label="Open issues"
            value={insight.totalOpen}
            note="Currently unresolved"
            icon={Clock3}
            tone="violet"
          />
          <AgeMetricCard
            label="Aging 8+ days"
            value={insight.aging}
            note="Consider a status check"
            icon={AlertTriangle}
            tone="amber"
          />
          <AgeMetricCard
            label="High severity open"
            value={insight.highSeverityOpen}
            note="Review alongside age"
            icon={ShieldAlert}
            tone="rose"
          />
          <AgeMetricCard
            label="Repeat reports open"
            value={insight.repeatOpen}
            note="Multiple submissions"
            icon={Flame}
            tone="slate"
          />
        </div>

        <section aria-label="Open issue age ranges">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-slate-800">
              Age distribution
            </h4>
            <span className="text-[10px] text-slate-400">
              Based on report creation date
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {AGE_BUCKETS.map((bucket) => (
              <AgeBucketCard
                key={bucket.id}
                bucket={bucket}
                count={insight.bucketCounts[bucket.id]}
                total={insight.totalOpen}
                selected={ageFilter === bucket.id}
                onSelect={handleAgeFilterChange}
              />
            ))}
          </div>
          {insight.unknownDates > 0 && (
            <p className="mt-2 text-[10px] leading-4 text-slate-500">
              {formatCount(insight.unknownDates)} open{" "}
              {insight.unknownDates === 1 ? "issue has" : "issues have"} no
              usable creation date and are omitted from age ranges.
            </p>
          )}
        </section>

        <section aria-label="Prioritized open issues">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-slate-800">
                Follow-up queue
              </h4>
              <p className="mt-1 text-[10px] text-slate-500">
                High severity, older reports, and repeat submissions rank first.
              </p>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <label className="relative min-w-[180px] flex-1 sm:flex-none">
                <span className="sr-only">Search open issues</span>
                <Search
                  size={13}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Search open issues"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-[11px] outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                />
              </label>
              <label className="sr-only" htmlFor="aging-severity-filter">
                Filter open issues by severity
              </label>
              <select
                id="aging-severity-filter"
                value={severityFilter}
                onChange={handleSeverityFilterChange}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
              >
                <option value="All">All severities</option>
                <option value="High">High severity</option>
                <option value="Medium">Medium severity</option>
                <option value="Low">Low severity</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              {AGE_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => handleAgeFilterChange(filter.id)}
                  aria-pressed={ageFilter === filter.id}
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition ${
                    ageFilter === filter.id
                      ? "bg-violet-700 text-white"
                      : "text-slate-500 hover:bg-white hover:text-violet-700"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            {filtersActive && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[10px] font-semibold text-violet-700 hover:text-violet-900"
              >
                Reset
              </button>
            )}
          </div>

          <p className="mt-2 text-[10px] text-slate-500" aria-live="polite">
            {formatCount(openReports.length)} matching open{" "}
            {openReports.length === 1 ? "issue" : "issues"}
          </p>

          {visibleReports.length ? (
            <ul className="mt-1">
              {visibleReports.map((report, index) => (
                <AgeIssueRow
                  key={
                    report?._id ||
                    report?.id ||
                    `${getIssueTitle(report)}-${index}`
                  }
                  report={report}
                  now={now}
                  onOpenReport={onOpenReport}
                />
              ))}
            </ul>
          ) : (
            <div className="mt-3">
              <AgeEmptyState
                filtered={filtersActive}
                onReset={resetFilters}
              />
            </div>
          )}

          {openReports.length > visibleReports.length && (
            <button
              type="button"
              onClick={() =>
                setVisibleCount((count) => count + INITIAL_VISIBLE_REPORTS)
              }
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700"
            >
              Show more (
              {formatCount(openReports.length - visibleReports.length)}{" "}
              remaining)
            </button>
          )}
        </section>
      </div>
    </section>
  );
}
