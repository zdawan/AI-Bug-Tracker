"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clipboard,
  Clock3,
  Download,
  FileCheck2,
  Filter,
  Info,
  ListChecks,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

const DEBRIEF_FILTERS = [
  { id: "all", label: "All pages" },
  { id: "issues", label: "Issues" },
  { id: "untested", label: "Not tested" },
  { id: "notes", label: "Has notes" },
  { id: "missing-notes", label: "Needs notes" },
];

const DEBRIEF_SORTS = [
  { id: "priority", label: "Action priority" },
  { id: "name", label: "Page name" },
  { id: "recent", label: "Recently checked" },
  { id: "oldest", label: "Least recently checked" },
];

const PAGE_LIMIT = 8;

function parseHttpUrl(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

function getSafeUrl(value, includePath) {
  const parsedUrl = parseHttpUrl(value);
  if (!parsedUrl) return "Invalid URL omitted";

  const safeUrl = new URL(parsedUrl.origin);
  if (includePath) {
    safeUrl.pathname = parsedUrl.pathname || "/";
    for (const key of parsedUrl.searchParams.keys()) {
      safeUrl.searchParams.append(key, "[redacted]");
    }
  }
  return safeUrl.href;
}

function getStatusName(status) {
  if (status === "passed") return "Passed";
  if (status === "issue-found") return "Issue found";
  return "Not tested";
}

function getStatusStyles(status) {
  if (status === "passed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (status === "issue-found") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function formatDate(value) {
  if (!value) return "Not checked";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getPathGroup(value) {
  const url = parseHttpUrl(value);
  if (!url) return "Invalid URL";
  const firstSegment = url.pathname.split("/").filter(Boolean)[0];
  if (!firstSegment) return "Home";
  try {
    return decodeURIComponent(firstSegment);
  } catch {
    return firstSegment;
  }
}

function buildCoverage(scenarios) {
  const byGroup = new Map();
  scenarios.forEach((scenario) => {
    const group = getPathGroup(scenario.url);
    const current = byGroup.get(group) || {
      name: group,
      pages: 0,
      passed: 0,
      issues: 0,
      untested: 0,
      notes: 0,
    };
    current.pages += 1;
    if (scenario.status === "passed") current.passed += 1;
    else if (scenario.status === "issue-found") current.issues += 1;
    else current.untested += 1;
    if (scenario.notes.trim()) current.notes += 1;
    byGroup.set(group, current);
  });

  return [...byGroup.values()].sort(
    (left, right) =>
      right.issues - left.issues ||
      right.untested - left.untested ||
      left.name.localeCompare(right.name),
  );
}

function buildInsights(scenarios) {
  const total = scenarios.length;
  const passed = scenarios.filter(
    (scenario) => scenario.status === "passed",
  ).length;
  const issues = scenarios.filter(
    (scenario) => scenario.status === "issue-found",
  ).length;
  const untested = scenarios.filter(
    (scenario) => scenario.status === "not-tested",
  ).length;
  const documented = scenarios.filter(
    (scenario) => scenario.notes.trim().length > 0,
  ).length;
  const issueWithoutNotes = scenarios.filter(
    (scenario) => scenario.status === "issue-found" && !scenario.notes.trim(),
  ).length;
  const passedWithoutNotes = scenarios.filter(
    (scenario) => scenario.status === "passed" && !scenario.notes.trim(),
  ).length;
  const checkedAtValues = scenarios
    .filter((scenario) => scenario.status !== "not-tested")
    .map((scenario) => Date.parse(scenario.checkedAt || ""))
    .filter((timestamp) => Number.isFinite(timestamp));
  const latestCheck = checkedAtValues.length
    ? new Date(Math.max(...checkedAtValues)).toISOString()
    : null;
  const oldestCheck = checkedAtValues.length
    ? new Date(Math.min(...checkedAtValues)).toISOString()
    : null;
  const completionRate = total
    ? Math.round(((passed + issues) / total) * 100)
    : 0;
  const documentationRate = total
    ? Math.round((documented / total) * 100)
    : 0;

  let headline = "Start with a small checklist";
  let recommendation =
    "Add pages that cover the main tasks on the website, then record a result for each one.";
  let tone = "neutral";

  if (!total) {
    headline = "No pages to review yet";
    recommendation =
      "Add a page to the checklist to begin tracking testing coverage.";
  } else if (untested > 0 && issues > 0) {
    headline = "Issues and untested pages remain";
    recommendation =
      "Capture notes for the reported issues, then continue with the pages that have no result.";
    tone = "warning";
  } else if (untested > 0) {
    headline = "Testing is still in progress";
    recommendation =
      "Use “Test next page” to continue. Add notes for important behavior and outcomes.";
    tone = "warning";
  } else if (issues > 0 && issueWithoutNotes > 0) {
    headline = "Add evidence to reported issues";
    recommendation =
      "Describe the observed behavior for issue pages so the report is easier to reproduce.";
    tone = "warning";
  } else if (issues > 0) {
    headline = "Review the issue pages";
    recommendation =
      "Issue pages have notes. Review the report text and remove sensitive details before sharing.";
    tone = "issue";
  } else if (passedWithoutNotes > 0) {
    headline = "All pages have a result";
    recommendation =
      "Add brief notes to high-impact passed pages if the result depends on a specific setup.";
    tone = "success";
  } else {
    headline = "Checklist is fully reviewed";
    recommendation =
      "All pages have a recorded result and notes. Review paths and notes before exporting.";
    tone = "success";
  }

  return {
    total,
    passed,
    issues,
    untested,
    documented,
    issueWithoutNotes,
    passedWithoutNotes,
    completionRate,
    documentationRate,
    latestCheck,
    oldestCheck,
    headline,
    recommendation,
    tone,
  };
}

function getPriorityScore(scenario) {
  if (scenario.status === "issue-found" && !scenario.notes.trim()) return 0;
  if (scenario.status === "issue-found") return 1;
  if (scenario.status === "not-tested") return 2;
  if (scenario.status === "passed" && !scenario.notes.trim()) return 3;
  return 4;
}

function compareChecks(left, right, sortBy) {
  if (sortBy === "name") {
    return left.title.localeCompare(right.title, undefined, {
      sensitivity: "base",
      numeric: true,
    });
  }

  if (sortBy === "recent" || sortBy === "oldest") {
    const leftTime = Date.parse(left.checkedAt || "");
    const rightTime = Date.parse(right.checkedAt || "");
    const leftValid = Number.isFinite(leftTime);
    const rightValid = Number.isFinite(rightTime);

    if (!leftValid && !rightValid) return left.title.localeCompare(right.title);
    if (!leftValid) return 1;
    if (!rightValid) return -1;
    return sortBy === "recent"
      ? rightTime - leftTime
      : leftTime - rightTime;
  }

  return (
    getPriorityScore(left) - getPriorityScore(right) ||
    left.title.localeCompare(right.title)
  );
}

function createDebriefReport(
  scenarios,
  origin,
  options,
  generatedAt = new Date().toISOString(),
) {
  const insights = buildInsights(scenarios);
  const reportLines = [
    "URL test checklist debrief",
    `Website: ${origin || "Not available"}`,
    `Generated: ${formatDate(generatedAt)}`,
    `Coverage: ${insights.passed + insights.issues} of ${insights.total} pages checked (${insights.completionRate}%)`,
    `Results: ${insights.passed} passed, ${insights.issues} issues found, ${insights.untested} not tested`,
    `Notes: ${insights.documented} of ${insights.total} pages documented (${insights.documentationRate}%)`,
    `Recommendation: ${insights.recommendation}`,
    "",
    "Pages:",
  ];

  scenarios.forEach((scenario, index) => {
    reportLines.push(
      `${index + 1}. ${scenario.title || "Untitled page"} — ${getStatusName(scenario.status)}`,
    );
    if (options.includePath) {
      reportLines.push(`   Page: ${getSafeUrl(scenario.url, true)}`);
    } else {
      const safeHost = getSafeUrl(scenario.url, false);
      reportLines.push(`   Website: ${safeHost}`);
    }
    if (scenario.checkedAt && scenario.status !== "not-tested") {
      reportLines.push(`   Last checked: ${formatDate(scenario.checkedAt)}`);
    }
    if (options.includeNotes && scenario.notes.trim()) {
      reportLines.push(
        `   Notes: ${scenario.notes.trim().replace(/\s+/g, " ")}`,
      );
    }
    reportLines.push("");
  });

  const coverage = buildCoverage(scenarios);
  if (coverage.length) {
    reportLines.push("Coverage by top-level path:");
    coverage.forEach((group) => {
      reportLines.push(
        `- ${group.name}: ${group.pages} page${group.pages === 1 ? "" : "s"}, ${group.passed} passed, ${group.issues} issues, ${group.untested} not tested`,
      );
    });
    reportLines.push("");
  }

  reportLines.push(
    "Privacy: query parameter values, URL fragments, and URL credentials are omitted. Review page paths and notes before sharing.",
    "This summary is generated locally and is not submitted automatically.",
  );
  return reportLines.join("\n");
}

function saveTextFile(content, filename) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function MetricCard({ label, value, helper, tone = "slate", icon: Icon }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-800",
    emerald: "border-emerald-100 bg-emerald-50/60 text-emerald-900",
    rose: "border-rose-100 bg-rose-50/60 text-rose-900",
    amber: "border-amber-100 bg-amber-50/60 text-amber-900",
    violet: "border-violet-100 bg-violet-50/60 text-violet-900",
  };

  return (
    <div className={`rounded-xl border p-3 ${tones[tone] || tones.slate}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-wide opacity-70">
          {label}
        </p>
        {Icon && <Icon size={13} className="shrink-0 opacity-70" aria-hidden="true" />}
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      {helper && <p className="mt-0.5 text-[9px] leading-4 opacity-70">{helper}</p>}
    </div>
  );
}

function ProgressBar({ label, value, total, tone = "violet" }) {
  const percentage = total ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
  const fill =
    tone === "emerald"
      ? "bg-emerald-600"
      : tone === "rose"
        ? "bg-rose-600"
        : "bg-violet-600";

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[9px]">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="tabular-nums text-slate-500">
          {value}/{total} · {Math.round(percentage)}%
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={value}
        aria-valuetext={`${value} of ${total} pages, ${Math.round(percentage)} percent`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${fill}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function InsightBanner({ insight }) {
  const tone =
    insight.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : insight.tone === "warning" || insight.tone === "issue"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-sky-200 bg-sky-50 text-sky-950";
  const Icon =
    insight.tone === "success"
      ? CheckCircle2
      : insight.tone === "issue"
        ? AlertCircle
        : insight.tone === "warning"
          ? ShieldAlert
          : Sparkles;

  return (
    <div className={`flex items-start gap-2.5 rounded-xl border p-3 ${tone}`}>
      <Icon size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <h4 className="text-[10px] font-semibold">{insight.headline}</h4>
        <p className="mt-1 text-[9px] leading-4 opacity-80">
          {insight.recommendation}
        </p>
      </div>
    </div>
  );
}

function CoverageGroup({ group, totalPages }) {
  const checked = group.passed + group.issues;
  const percentage = group.pages
    ? Math.round((checked / group.pages) * 100)
    : 0;
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="flex items-center justify-between gap-2">
        <h5 className="min-w-0 truncate text-[10px] font-semibold text-slate-800">
          {group.name}
        </h5>
        <span className="shrink-0 text-[9px] tabular-nums text-slate-500">
          {group.pages} page{group.pages === 1 ? "" : "s"}
        </span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={`${group.name} checked coverage`}
        aria-valuemin={0}
        aria-valuemax={group.pages}
        aria-valuenow={checked}
      >
        <div
          className="h-full rounded-full bg-violet-600"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-[8px] text-slate-500">
        <span className="text-emerald-700">{group.passed} passed</span>
        {group.issues > 0 && (
          <span className="text-rose-700">{group.issues} issues</span>
        )}
        {group.untested > 0 && (
          <span>{group.untested} untested</span>
        )}
        {group.notes > 0 && (
          <span>{group.notes} documented</span>
        )}
        {totalPages > group.pages && (
          <span className="ml-auto">{percentage}% checked</span>
        )}
      </div>
    </li>
  );
}

function StatusPill({ status }) {
  const Icon =
    status === "passed"
      ? CheckCircle2
      : status === "issue-found"
        ? AlertCircle
        : ListChecks;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold ${getStatusStyles(status)}`}
    >
      <Icon size={10} aria-hidden="true" />
      {getStatusName(status)}
    </span>
  );
}

function ReviewPageCard({ scenario, onSelect, onReportIssue, isActive }) {
  const hasNotes = Boolean(scenario.notes.trim());
  const safeUrl = getSafeUrl(scenario.url, true);

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="break-words text-[11px] font-semibold text-slate-800">
              {scenario.title || "Untitled page"}
            </h5>
            <StatusPill status={scenario.status} />
            {isActive && (
              <span className="rounded-full bg-violet-100 px-2 py-1 text-[8px] font-semibold text-violet-800">
                Active
              </span>
            )}
          </div>
          <p className="mt-1 break-all text-[9px] leading-4 text-slate-500">
            {safeUrl}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[8px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Clock3 size={9} aria-hidden="true" />
              {scenario.status === "not-tested"
                ? "No result recorded"
                : formatDate(scenario.checkedAt)}
            </span>
            <span className={hasNotes ? "text-emerald-700" : "text-amber-700"}>
              {hasNotes ? "Notes recorded" : "No notes"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={() => onSelect(scenario)}
            disabled={isActive}
            className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[9px] font-semibold text-violet-800 transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-default disabled:opacity-50"
          >
            <ArrowRight size={10} aria-hidden="true" />
            {isActive ? "Active" : "Test page"}
          </button>
          {scenario.status === "issue-found" && (
            <button
              type="button"
              onClick={() => onReportIssue(scenario)}
              className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[9px] font-semibold text-rose-800 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <ArrowDown size={10} aria-hidden="true" />
              Report
            </button>
          )}
        </div>
      </div>
      {hasNotes && (
        <details className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
          <summary className="cursor-pointer text-[9px] font-semibold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
            Preview notes
          </summary>
          <p className="mt-2 whitespace-pre-wrap break-words text-[9px] leading-4 text-slate-600">
            {scenario.notes}
          </p>
        </details>
      )}
    </li>
  );
}

function DebriefReportOptions({
  includePath,
  includeNotes,
  onIncludePathChange,
  onIncludeNotesChange,
}) {
  return (
    <fieldset className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
      <legend className="px-1 text-[10px] font-semibold text-slate-700">
        Choose what to include in the report
      </legend>
      <label className="flex cursor-pointer items-start gap-2 rounded-lg bg-slate-50 p-2.5">
        <input
          type="checkbox"
          checked={includePath}
          onChange={(event) => onIncludePathChange(event.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 accent-violet-700"
        />
        <span>
          <span className="block text-[9px] font-semibold text-slate-700">
            Include page paths
          </span>
          <span className="mt-0.5 block text-[8px] leading-4 text-slate-500">
            Off by default. Query values, credentials, and fragments are always
            removed; review paths for private identifiers.
          </span>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-2 rounded-lg bg-slate-50 p-2.5">
        <input
          type="checkbox"
          checked={includeNotes}
          onChange={(event) => onIncludeNotesChange(event.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 accent-violet-700"
        />
        <span>
          <span className="block text-[9px] font-semibold text-slate-700">
            Include tester notes
          </span>
          <span className="mt-0.5 block text-[8px] leading-4 text-slate-500">
            Off by default. Notes may contain sensitive details; inspect them
            before sharing.
          </span>
        </span>
      </label>
    </fieldset>
  );
}

export default function UrlChecklistDebrief({
  scenarios,
  activeUrl,
  onSelect,
  onReportIssue,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("priority");
  const [includePath, setIncludePath] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);

  const safeScenarios = Array.isArray(scenarios) ? scenarios : [];
  const insights = useMemo(
    () => buildInsights(safeScenarios),
    [safeScenarios],
  );
  const coverage = useMemo(
    () => buildCoverage(safeScenarios),
    [safeScenarios],
  );

  const reviewedScenarios = useMemo(() => {
    const query = search.trim().toLowerCase();
    return safeScenarios
      .filter((scenario) => {
        const hasNotes = Boolean(scenario.notes.trim());
        const matchesFilter =
          filter === "all" ||
          (filter === "issues" && scenario.status === "issue-found") ||
          (filter === "untested" && scenario.status === "not-tested") ||
          (filter === "notes" && hasNotes) ||
          (filter === "missing-notes" && !hasNotes);
        const matchesSearch =
          !query ||
          [scenario.title, scenario.url, scenario.notes]
            .join(" ")
            .toLowerCase()
            .includes(query);
        return matchesFilter && matchesSearch;
      })
      .sort((left, right) => compareChecks(left, right, sortBy));
  }, [filter, safeScenarios, search, sortBy]);

  const reportText = useMemo(
    () =>
      createDebriefReport(
        safeScenarios,
        parseHttpUrl(activeUrl)?.origin || "",
        { includePath, includeNotes },
      ),
    [activeUrl, includeNotes, includePath, safeScenarios],
  );

  const handleCopyReport = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable.");
      }
      await navigator.clipboard.writeText(reportText);
      toast.success("Checklist debrief copied. Review it before sharing.");
    } catch {
      toast.error("Could not copy the debrief. Open the preview to copy it manually.");
      setShowReportPreview(true);
    }
  };

  const handleDownloadReport = () => {
    try {
      saveTextFile(
        reportText,
        `url-checklist-debrief-${new Date().toISOString().slice(0, 10)}.txt`,
      );
      toast.success("Checklist debrief downloaded. Review it before sharing.");
    } catch (error) {
      console.error("Could not download URL checklist debrief:", error);
      toast.error("Could not download the checklist debrief.");
    }
  };

  const clearReviewFilters = () => {
    setFilter("all");
    setSearch("");
    setSortBy("priority");
  };

  return (
    <section
      className="overflow-hidden rounded-2xl border border-sky-200 bg-white"
      aria-labelledby="url-checklist-debrief-title"
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-controls="url-checklist-debrief-content"
        className="flex w-full cursor-pointer items-center gap-3 bg-sky-50/70 px-4 py-3 text-left transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 sm:px-5"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-sky-700 shadow-sm">
          <BarChart3 size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            id="url-checklist-debrief-title"
            className="block text-xs font-semibold text-slate-900"
          >
            Test session debrief
          </span>
          <span className="mt-0.5 block text-[9px] leading-4 text-slate-600">
            Coverage insights, pages needing follow-up, and a reviewable summary
          </span>
        </span>
        {safeScenarios.length > 0 && (
          <span className="hidden rounded-full bg-white px-2 py-1 text-[9px] font-semibold text-slate-600 sm:inline">
            {insights.completionRate}% checked
          </span>
        )}
        <span aria-hidden="true" className="text-slate-500">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen && (
        <div
          id="url-checklist-debrief-content"
          className="space-y-4 border-t border-sky-100 p-3 sm:p-5"
        >
          <InsightBanner insight={insights} />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricCard
              label="Coverage"
              value={`${insights.completionRate}%`}
              helper={`${insights.passed + insights.issues} of ${insights.total} pages checked`}
              tone="violet"
              icon={BarChart3}
            />
            <MetricCard
              label="Passed"
              value={insights.passed}
              helper="Pages marked passed"
              tone="emerald"
              icon={CheckCircle2}
            />
            <MetricCard
              label="Issues"
              value={insights.issues}
              helper={
                insights.issueWithoutNotes
                  ? `${insights.issueWithoutNotes} missing notes`
                  : "All issue pages documented"
              }
              tone={insights.issues ? "rose" : "slate"}
              icon={AlertCircle}
            />
            <MetricCard
              label="Notes"
              value={`${insights.documentationRate}%`}
              helper={`${insights.documented} of ${insights.total} pages`}
              tone={insights.documentationRate === 100 ? "emerald" : "amber"}
              icon={FileCheck2}
            />
          </div>

          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-2">
            <ProgressBar
              label="Pages with a result"
              value={insights.passed + insights.issues}
              total={insights.total}
            />
            <ProgressBar
              label="Pages with notes"
              value={insights.documented}
              total={insights.total}
              tone="emerald"
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-[10px] font-semibold text-slate-800">
                    Coverage by page group
                  </h4>
                  <p className="mt-1 text-[8px] leading-4 text-slate-500">
                    Pages are grouped by their first path segment. Paths remain
                    on this page unless you opt in to include them in a report.
                  </p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-[8px] text-slate-500">
                  {coverage.length} group{coverage.length === 1 ? "" : "s"}
                </span>
              </div>
              {coverage.length ? (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {coverage.map((group) => (
                    <CoverageGroup
                      key={group.name}
                      group={group}
                      totalPages={insights.total}
                    />
                  ))}
                </ul>
              ) : (
                <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-[9px] text-slate-500">
                  Add pages to see route coverage.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-800">
                  <ShieldAlert size={13} aria-hidden="true" />
                </span>
                <div>
                  <h4 className="text-[10px] font-semibold text-slate-800">
                    Follow-up signals
                  </h4>
                  <p className="mt-1 text-[8px] leading-4 text-slate-500">
                    Suggestions are based on checklist statuses and whether
                    notes are present.
                  </p>
                </div>
              </div>
              <ul className="mt-3 space-y-2">
                <li className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5">
                  <ListChecks
                    size={11}
                    className="mt-0.5 shrink-0 text-slate-500"
                    aria-hidden="true"
                  />
                  <p className="text-[9px] leading-4 text-slate-700">
                    <span className="font-semibold">{insights.untested}</span>{" "}
                    page{insights.untested === 1 ? "" : "s"} still need a result.
                  </p>
                </li>
                <li className="flex items-start gap-2 rounded-lg bg-rose-50/70 p-2.5">
                  <AlertCircle
                    size={11}
                    className="mt-0.5 shrink-0 text-rose-700"
                    aria-hidden="true"
                  />
                  <p className="text-[9px] leading-4 text-slate-700">
                    <span className="font-semibold">
                      {insights.issueWithoutNotes}
                    </span>{" "}
                    issue page{insights.issueWithoutNotes === 1 ? "" : "s"}{" "}
                    need notes to help reproduce the problem.
                  </p>
                </li>
                <li className="flex items-start gap-2 rounded-lg bg-emerald-50/70 p-2.5">
                  <ShieldCheck
                    size={11}
                    className="mt-0.5 shrink-0 text-emerald-700"
                    aria-hidden="true"
                  />
                  <p className="text-[9px] leading-4 text-slate-700">
                    <span className="font-semibold">
                      {insights.passedWithoutNotes}
                    </span>{" "}
                    passed page{insights.passedWithoutNotes === 1 ? "" : "s"}{" "}
                    have no notes. Add context if setup affects the result.
                  </p>
                </li>
              </ul>
              <div className="mt-3 border-t border-slate-100 pt-2 text-[8px] leading-4 text-slate-500">
                <p>
                  Latest check:{" "}
                  <span className="font-medium text-slate-700">
                    {insights.latestCheck
                      ? formatDate(insights.latestCheck)
                      : "None"}
                  </span>
                </p>
                <p className="mt-0.5">
                  Earliest check:{" "}
                  <span className="font-medium text-slate-700">
                    {insights.oldestCheck
                      ? formatDate(insights.oldestCheck)
                      : "None"}
                  </span>
                </p>
              </div>
            </section>
          </div>

          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="text-[10px] font-semibold text-slate-800">
                  Review pages needing action
                </h4>
                <p className="mt-1 text-[8px] leading-4 text-slate-500">
                  Issues without notes and untested pages appear first by
                  default. Use actions to select a page or open its report form.
                </p>
              </div>
              <label className="flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2">
                <span className="sr-only">Sort debrief pages</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  aria-label="Sort debrief pages"
                  className="bg-white text-[9px] text-slate-700 outline-none"
                >
                  {DEBRIEF_SORTS.map((sort) => (
                    <option key={sort.id} value={sort.id}>
                      {sort.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter debrief pages">
              {DEBRIEF_FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  aria-pressed={filter === item.id}
                  className={`min-h-7 rounded-lg border px-2.5 py-1 text-[8px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                    filter === item.id
                      ? "border-violet-700 bg-violet-700 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                  {item.id === "issues" && ` (${insights.issues})`}
                  {item.id === "untested" && ` (${insights.untested})`}
                  {item.id === "notes" && ` (${insights.documented})`}
                  {item.id === "missing-notes" &&
                    ` (${safeScenarios.length - insights.documented})`}
                </button>
              ))}
            </div>

            <label className="relative block">
              <Search
                size={12}
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <span className="sr-only">Search debrief pages</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search page names, paths, or notes"
                className="min-h-8 w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-[9px] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </label>

            <p className="text-[8px] text-slate-500" aria-live="polite">
              Showing {reviewedScenarios.length} of {safeScenarios.length} pages
            </p>

            {reviewedScenarios.length ? (
              <ul className="space-y-2" aria-label="Pages in the debrief">
                {reviewedScenarios.slice(0, PAGE_LIMIT).map((scenario) => (
                  <ReviewPageCard
                    key={scenario.id}
                    scenario={scenario}
                    onSelect={onSelect}
                    onReportIssue={onReportIssue}
                    isActive={scenario.url === activeUrl}
                  />
                ))}
              </ul>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                <Filter
                  size={15}
                  className="mx-auto text-slate-400"
                  aria-hidden="true"
                />
                <p className="mt-2 text-[9px] font-semibold text-slate-700">
                  No pages match this review
                </p>
                <button
                  type="button"
                  onClick={clearReviewFilters}
                  className="mt-2 text-[8px] font-semibold text-violet-700 underline underline-offset-2"
                >
                  Clear review filters
                </button>
              </div>
            )}
            {reviewedScenarios.length > PAGE_LIMIT && (
              <p className="text-center text-[8px] text-slate-500">
                Showing the first {PAGE_LIMIT} pages in the review list. Narrow
                results with search or filters to find another page.
              </p>
            )}
          </section>

          <section className="space-y-3 rounded-xl border border-sky-100 bg-sky-50/40 p-3">
            <div className="flex items-start gap-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-sky-700">
                <FileCheck2 size={13} aria-hidden="true" />
              </span>
              <div>
                <h4 className="text-[10px] font-semibold text-slate-800">
                  Create a debrief summary
                </h4>
                <p className="mt-1 text-[8px] leading-4 text-slate-600">
                  Choose whether to include paths or notes. The report stays
                  local until you copy or download it.
                </p>
              </div>
            </div>

            <DebriefReportOptions
              includePath={includePath}
              includeNotes={includeNotes}
              onIncludePathChange={setIncludePath}
              onIncludeNotesChange={setIncludeNotes}
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyReport}
                disabled={!safeScenarios.length}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-2 text-[9px] font-semibold text-white transition hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Clipboard size={11} aria-hidden="true" />
                Copy summary
              </button>
              <button
                type="button"
                onClick={handleDownloadReport}
                disabled={!safeScenarios.length}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download size={11} aria-hidden="true" />
                Download summary
              </button>
              <button
                type="button"
                onClick={() => setShowReportPreview((current) => !current)}
                disabled={!safeScenarios.length}
                aria-expanded={showReportPreview}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {showReportPreview ? (
                  <X size={11} aria-hidden="true" />
                ) : (
                  <ArrowRight size={11} aria-hidden="true" />
                )}
                {showReportPreview ? "Hide preview" : "Preview summary"}
              </button>
            </div>

            {showReportPreview && (
              <label className="block">
                <span className="mb-1 block text-[8px] font-semibold text-slate-600">
                  Reviewable report preview
                </span>
                <textarea
                  readOnly
                  value={reportText}
                  rows={Math.min(18, 8 + safeScenarios.length * 2)}
                  onFocus={(event) => event.target.select()}
                  aria-label="Checklist debrief report preview"
                  className="w-full resize-y rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-[8px] leading-4 text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
                <span className="mt-1 block text-[8px] leading-4 text-slate-500">
                  Review included paths and notes before sharing. Sensitive URL
                  values are omitted automatically.
                </span>
              </label>
            )}

            <p className="flex items-start gap-1.5 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-2 text-[8px] leading-4 text-amber-900">
              <Info
                size={11}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              Exporting is optional. Paths and tester notes can reveal sensitive
              information, so they are excluded by default.
            </p>
          </section>

          <p className="sr-only" aria-live="polite">
            {insights.headline}. {insights.recommendation}
          </p>
        </div>
      )}
    </section>
  );
}
