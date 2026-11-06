"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownWideNarrow,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Download,
  FileCheck2,
  FilterX,
  Info,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  X,
} from "lucide-react";
import { assessReport } from "./ReportReadinessBoard";

const INITIAL_VISIBLE = 8;
const MAX_LIMIT = 25;
const AGING_REVIEW_DAYS = 30;

const PROFILES = [
  {
    id: "strict",
    label: "Strict",
    description: "No critical or high-severity open issues.",
    criticalLimit: 0,
    highLimit: 0,
    incompleteLimit: 0,
    qualityFloor: 80,
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "Allow a small, explicitly reviewed open queue.",
    criticalLimit: 0,
    highLimit: 2,
    incompleteLimit: 2,
    qualityFloor: 50,
  },
  {
    id: "exploratory",
    label: "Exploratory",
    description: "Surface risks without enforcing a zero-blocker gate.",
    criticalLimit: 1,
    highLimit: 5,
    incompleteLimit: 5,
    qualityFloor: 50,
  },
];

const SORT_OPTIONS = [
  { value: "risk", label: "Highest risk first" },
  { value: "severity", label: "Severity first" },
  { value: "readiness", label: "Lowest readiness first" },
  { value: "oldest", label: "Oldest open first" },
  { value: "title", label: "Title A–Z" },
];

function getId(report) {
  const raw = report?._id ?? report?.id;
  return raw === null || raw === undefined ? "" : String(raw).trim();
}

function getTitle(report) {
  const title =
    typeof report?.title === "string" ? report.title.trim() : "";
  const summary =
    typeof report?.summary === "string" ? report.summary.trim() : "";
  return title || summary || "Untitled report";
}

function getCategory(report) {
  return typeof report?.category === "string" && report.category.trim()
    ? report.category.trim()
    : "Uncategorized";
}

function getSeverity(report) {
  return typeof report?.severity === "string" && report.severity.trim()
    ? report.severity.trim()
    : "Unspecified";
}

function getSeverityRank(report) {
  const severity = getSeverity(report).toLowerCase();
  if (["critical", "blocker", "urgent"].includes(severity)) return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  if (severity === "low") return 1;
  return 0;
}

function getStatus(report) {
  return report?.status === "Closed" ? "Closed" : "Open";
}

function getCreatedAt(report) {
  const value = report?.createdAt || report?.created_at || report?.reportedAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function getOpenAge(report, now) {
  const createdAt = getCreatedAt(report);
  if (!createdAt || createdAt.getTime() > now) return null;
  return Math.floor((now - createdAt.getTime()) / 86_400_000);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDate(value) {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    return "Date unavailable";
  }
  return value.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getSeverityLabel(report) {
  const rank = getSeverityRank(report);
  if (rank === 4) return "Critical";
  if (rank === 3) return "High";
  return getSeverity(report);
}

function buildReportAssessment(report) {
  const readiness = assessReport(report);
  const severityRank = getSeverityRank(report);
  const reasons = [];

  if (getStatus(report) !== "Closed" && severityRank === 4) {
    reasons.push("critical");
  } else if (getStatus(report) !== "Closed" && severityRank === 3) {
    reasons.push("high");
  }

  return {
    report,
    id: getId(report),
    title: getTitle(report),
    category: getCategory(report),
    severity: getSeverity(report),
    severityRank,
    status: getStatus(report),
    createdAt: getCreatedAt(report),
    age: getOpenAge(report, Date.now()),
    readinessScore: readiness.score,
    missing: readiness.missing,
    hasScreenshot: readiness.hasScreenshot,
    reasons,
  };
}

function getAssessmentReasons(entry, config) {
  const reasons = [];
  if (entry.status !== "Open") return reasons;

  if (entry.severityRank === 4) reasons.push("critical");
  else if (entry.severityRank === 3) reasons.push("high");
  if (entry.readinessScore < config.qualityFloor) reasons.push("quality");
  if (entry.age !== null && entry.age >= AGING_REVIEW_DAYS) {
    reasons.push("aging");
  }

  return reasons;
}

function getRiskScore(entry) {
  const severityPoints = entry.severityRank * 100;
  const qualityPoints = (100 - entry.readinessScore) * 1.5;
  const agePoints = Math.min(entry.age ?? 0, 180) * 0.75;
  return severityPoints + qualityPoints + agePoints;
}

function makeCheck({ id, label, actual, limit, description }) {
  const passed = actual <= limit;
  return {
    id,
    label,
    actual,
    limit,
    passed,
    description,
    delta: Math.max(0, actual - limit),
  };
}

function evaluateGate(entries, config) {
  const open = entries.filter((entry) => entry.status === "Open");
  const critical = open.filter((entry) => entry.severityRank === 4).length;
  const high = open.filter((entry) => entry.severityRank === 3).length;
  const belowQuality = open.filter(
    (entry) => entry.readinessScore < config.qualityFloor,
  ).length;
  const checks = [
    makeCheck({
      id: "critical",
      label: "Open critical issues",
      actual: critical,
      limit: config.criticalLimit,
      description: "Critical, blocker, and urgent severity reports still open.",
    }),
    makeCheck({
      id: "high",
      label: "Open high-severity issues",
      actual: high,
      limit: config.highLimit,
      description: "High-severity reports still open in the release scope.",
    }),
    makeCheck({
      id: "quality",
      label: "Reports below readiness floor",
      actual: belowQuality,
      limit: config.incompleteLimit,
      description: `Open reports scoring below ${config.qualityFloor}% on the shared readiness rubric.`,
    }),
  ];

  return {
    open,
    critical,
    high,
    belowQuality,
    aging: open.filter(
      (entry) => entry.age !== null && entry.age >= AGING_REVIEW_DAYS,
    ).length,
    checks,
    passed: checks.every((check) => check.passed),
    failedChecks: checks.filter((check) => !check.passed),
    blockers: open
      .map((entry) => ({
        ...entry,
        reasons: getAssessmentReasons(entry, config),
        riskScore: getRiskScore(entry),
      }))
      .filter((entry) => entry.reasons.length > 0),
  };
}

function buildCsv(scope, checks, config, profileLabel) {
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = [
    ["Advisory release readiness check"],
    ["Profile", profileLabel],
    ["Quality floor", `${config.qualityFloor}%`],
    ["Maximum open critical issues", config.criticalLimit],
    ["Maximum open high-severity issues", config.highLimit],
    ["Maximum reports below floor", config.incompleteLimit],
    [],
    ["Gate check", "Current count", "Allowed", "Result", "Description"],
    ...checks.map((check) => [
      check.label,
      check.actual,
      check.limit,
      check.passed ? "Pass" : "Review",
      check.description,
    ]),
    [],
    [
      "Report ID",
      "Title",
      "Category",
      "Severity",
      "Status",
      "Readiness score",
      "Open age (days)",
      "Review flags",
      "Missing readiness details",
    ],
    ...scope.map((entry) => [
      entry.id,
      entry.title,
      entry.category,
      entry.severity,
      entry.status,
      `${entry.readinessScore}%`,
      entry.age ?? "",
      entry.reasons.join("; "),
      entry.missing.map((item) => item.label).join("; "),
    ]),
  ];

  return `\uFEFF${rows
    .map((row) => row.map(escape).join(","))
    .join("\r\n")}`;
}

function downloadCsv(scope, checks, config, profileLabel) {
  const blob = new Blob(
    [buildCsv(scope, checks, config, profileLabel)],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `release-readiness-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-xs font-medium text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={13}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
      </span>
    </label>
  );
}

function MetricCard({ label, value, detail, icon: Icon, tone }) {
  const tones = {
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    sky: "border-sky-100 bg-sky-50 text-sky-700",
  };
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold leading-none text-slate-950 tabular-nums">
            {value}
          </p>
        </div>
        <span
          className={`grid h-9 w-9 place-items-center rounded-xl border ${tones[tone]}`}
        >
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-[10px] leading-4 text-slate-500">{detail}</p>
    </article>
  );
}

function GateStatus({ result, failedChecks }) {
  if (!result.openCount) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-slate-500 shadow-sm">
          <Info size={19} aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            No open reports in this scope
          </h3>
          <p className="mt-1 text-[11px] leading-5 text-slate-600">
            The advisory checks have no open issues to evaluate. Closed reports
            remain available in the scope summary below.
          </p>
        </div>
      </div>
    );
  }

  if (result.passed) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm">
          <ShieldCheck size={19} aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-emerald-950">
            Advisory thresholds met
          </h3>
          <p className="mt-1 text-[11px] leading-5 text-emerald-900/75">
            No configured check exceeds its allowed count. This is a snapshot
            of report data, not a deployment approval or guarantee.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-rose-700 shadow-sm">
        <ShieldAlert size={19} aria-hidden="true" />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-rose-950">
          Review {formatNumber(failedChecks)} threshold{" "}
          {failedChecks === 1 ? "exception" : "exceptions"}
        </h3>
        <p className="mt-1 text-[11px] leading-5 text-rose-900/75">
          Open reports exceed one or more local advisory limits. Review the
          failed checks and their report details before making a release
          decision.
        </p>
      </div>
    </div>
  );
}

function GateCheckCard({ check }) {
  return (
    <article
      className={`rounded-2xl border p-4 ${
        check.passed
          ? "border-emerald-100 bg-emerald-50/50"
          : "border-rose-100 bg-rose-50/50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xs font-semibold text-slate-800">{check.label}</h3>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            {check.description}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold ${
            check.passed
              ? "border-emerald-200 bg-white text-emerald-700"
              : "border-rose-200 bg-white text-rose-700"
          }`}
        >
          {check.passed ? (
            <CheckCircle2 size={11} aria-hidden="true" />
          ) : (
            <AlertTriangle size={11} aria-hidden="true" />
          )}
          {check.passed ? "Within limit" : `${check.delta} over limit`}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold text-slate-950 tabular-nums">
          {formatNumber(check.actual)}
        </span>
        <span className="text-[10px] text-slate-500">
          of {formatNumber(check.limit)} allowed
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
        <div
          className={`h-full rounded-full ${
            check.passed ? "bg-emerald-500" : "bg-rose-500"
          }`}
          style={{
            width: `${
              check.limit === 0
                ? check.actual > 0
                  ? 100
                  : 0
                : Math.min(100, (check.actual / check.limit) * 100)
            }%`,
          }}
        />
      </div>
    </article>
  );
}

function ReasonBadge({ reason }) {
  const config = {
    critical: {
      label: "Critical open",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    },
    high: {
      label: "High severity",
      className: "border-orange-200 bg-orange-50 text-orange-700",
    },
    quality: {
      label: "Below readiness floor",
      className: "border-violet-200 bg-violet-50 text-violet-700",
    },
    aging: {
      label: `${AGING_REVIEW_DAYS}+ days open`,
      className: "border-sky-200 bg-sky-50 text-sky-700",
    },
  }[reason];
  if (!config) return null;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function BlockerRow({ entry, onOpenReport }) {
  const ageLabel =
    entry.age === null
      ? "Date unavailable"
      : entry.age === 0
        ? "Reported today"
        : `${formatNumber(entry.age)} days open`;
  const severityTone =
    entry.severityRank >= 4
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : entry.severityRank === 3
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <article className="rounded-xl border border-slate-200/80 bg-white p-3.5 transition hover:border-violet-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[9px] font-semibold text-slate-400">
              {entry.id ? `#${entry.id.slice(-8)}` : "Report"}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${severityTone}`}
            >
              {getSeverityLabel(entry.report)}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] text-slate-500">
              {entry.readinessScore}% ready
            </span>
          </div>
          <h4 className="mt-1.5 break-words text-xs font-semibold text-slate-900">
            {entry.title}
          </h4>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-slate-500">
            <span>{entry.category}</span>
            <span aria-hidden="true">·</span>
            <span>{ageLabel}</span>
            <span aria-hidden="true">·</span>
            <span>Submitted {formatDate(entry.createdAt)}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {entry.reasons.map((reason) => (
              <ReasonBadge key={reason} reason={reason} />
            ))}
          </div>
          {entry.missing.length > 0 && (
            <p className="mt-2 text-[9px] leading-4 text-slate-500">
              Missing: {entry.missing.map((item) => item.label).join(", ")}
            </p>
          )}
        </div>
        {onOpenReport && (
          <button
            type="button"
            onClick={() => onOpenReport(entry.report)}
            className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
          >
            Open report
            <ArrowUpRight size={12} aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}

function EmptyBlockers({ filtered, onReset }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-8 text-center">
      <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-white text-emerald-600 shadow-sm">
        <BadgeCheck size={18} aria-hidden="true" />
      </span>
      <h3 className="mt-3 text-xs font-semibold text-slate-800">
        {filtered ? "No reports match these filters" : "No reports flagged for review"}
      </h3>
      <p className="mx-auto mt-1 max-w-md text-[10px] leading-5 text-slate-500">
        {filtered
          ? "Try a different search or review filter."
          : "Open reports in this scope are within the configured severity and readiness checks."}
      </p>
      {filtered && (
        <button
          type="button"
          onClick={onReset}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          <FilterX size={12} aria-hidden="true" />
          Clear report filters
        </button>
      )}
    </div>
  );
}

export default function ReportReleaseReadinessGate({
  reports = [],
  onOpenReport,
}) {
  const [profileId, setProfileId] = useState("strict");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [customLimits, setCustomLimits] = useState(null);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [showAllOpen, setShowAllOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [sortBy, setSortBy] = useState("risk");
  const [exportError, setExportError] = useState("");
  const [exportNotice, setExportNotice] = useState("");

  const selectedProfile =
    PROFILES.find((profile) => profile.id === profileId) || PROFILES[0];
  const config = customLimits || selectedProfile;
  const categoryOptions = useMemo(() => {
    const categories = Array.from(
      new Set(reports.map((report) => getCategory(report))),
    ).sort((left, right) => left.localeCompare(right));
    return [
      { value: "all", label: "All categories" },
      ...categories.map((category) => ({
        value: category,
        label: category,
      })),
    ];
  }, [reports]);

  const allAssessments = useMemo(
    () => reports.map((report) => buildReportAssessment(report)),
    [reports],
  );
  const scopedAssessments = useMemo(
    () =>
      allAssessments.filter(
        (entry) => categoryFilter === "all" || entry.category === categoryFilter,
      ),
    [allAssessments, categoryFilter],
  );
  const gate = useMemo(
    () => evaluateGate(scopedAssessments, config),
    [config, scopedAssessments],
  );
  const averageReadiness = useMemo(() => {
    if (!gate.open.length) return 0;
    return Math.round(
      gate.open.reduce((sum, entry) => sum + entry.readinessScore, 0) /
        gate.open.length,
    );
  }, [gate.open]);
  const screenshotMissing = gate.open.filter(
    (entry) => !entry.hasScreenshot,
  ).length;
  const checksPassed = gate.checks.filter((check) => check.passed).length;
  const checkCompletion = gate.checks.length
    ? Math.round((checksPassed / gate.checks.length) * 100)
    : 100;
  const scopedClosedCount = scopedAssessments.filter(
    (entry) => entry.status === "Closed",
  ).length;
  const filteredBlockers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return gate.blockers
      .filter((entry) => {
        if (
          severityFilter === "critical" &&
          entry.severityRank !== 4
        ) {
          return false;
        }
        if (severityFilter === "high" && entry.severityRank !== 3) {
          return false;
        }
        if (
          severityFilter === "aging" &&
          !entry.reasons.includes("aging")
        ) {
          return false;
        }
        if (
          severityFilter === "quality" &&
          !entry.reasons.includes("quality")
        ) {
          return false;
        }
        if (severityFilter === "severity" && entry.severityRank < 3) {
          return false;
        }
        if (!normalizedSearch) return true;
        return [
          entry.id,
          entry.title,
          entry.category,
          entry.severity,
          ...entry.missing.map((item) => item.label),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((left, right) => {
        if (sortBy === "severity") {
          return (
            right.severityRank - left.severityRank ||
            right.riskScore - left.riskScore
          );
        }
        if (sortBy === "readiness") {
          return (
            left.readinessScore - right.readinessScore ||
            right.riskScore - left.riskScore
          );
        }
        if (sortBy === "oldest") {
          return (
            (right.age ?? -1) - (left.age ?? -1) ||
            right.riskScore - left.riskScore
          );
        }
        if (sortBy === "title") return left.title.localeCompare(right.title);
        return right.riskScore - left.riskScore;
      });
  }, [gate.blockers, search, severityFilter, sortBy]);

  const visibleBlockers = filteredBlockers.slice(0, visibleCount);
  const failedChecks = gate.failedChecks.length;
  const isCustom = customLimits !== null;
  const hasFilters =
    categoryFilter !== "all" ||
    severityFilter !== "all" ||
    Boolean(search.trim());

  const applyProfile = (profile) => {
    setProfileId(profile.id);
    setCustomLimits(null);
  };

  const updateLimit = (key, value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return;
    const boundedValue = Math.min(MAX_LIMIT, Math.max(0, Math.round(numericValue)));
    setCustomLimits((current) => ({
      ...(current || selectedProfile),
      [key]: boundedValue,
    }));
  };

  const setReviewFilter = (value) => {
    setSeverityFilter(value);
    setVisibleCount(INITIAL_VISIBLE);
  };

  const resetFilters = () => {
    setSeverityFilter("all");
    setSearch("");
    setVisibleCount(INITIAL_VISIBLE);
  };

  const handleExport = () => {
    setExportError("");
    setExportNotice("");
    try {
      downloadCsv(
        scopedAssessments.map((entry) => ({
          ...entry,
          reasons: getAssessmentReasons(entry, config),
        })),
        gate.checks,
        config,
        isCustom ? "Custom" : selectedProfile.label,
      );
      setExportNotice(
        `Exported the ${formatNumber(scopedAssessments.length)} report release-scope snapshot.`,
      );
    } catch {
      setExportError(
        "Could not create the release check CSV. Check browser download permissions and try again.",
      );
    }
  };

  const loadProfileIntoCustom = () => {
    setCustomLimits({ ...config });
  };

  return (
    <section className="mt-5 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
      <div className="border-b border-slate-200/80 bg-gradient-to-r from-rose-50/70 via-white to-violet-50/60 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-rose-100 bg-white text-rose-700 shadow-sm">
                <Target size={19} aria-hidden="true" />
              </span>
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-700">
                Patch 12 · Advisory release check
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                  gate.passed
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {gate.open.length
                  ? gate.passed
                    ? "Thresholds met"
                    : `${failedChecks} checks need review`
                  : "No open reports"}
              </span>
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">
              Release readiness gate
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-slate-600">
              Evaluate open report severity and report completeness against
              configurable, local advisory thresholds. This checklist supports
              review; it does not approve deployments or change report status.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300"
          >
            <Download size={14} aria-hidden="true" />
            Export release check
          </button>
        </div>
        <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-3 text-[10px] leading-5 text-amber-900/80">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <Info size={13} aria-hidden="true" />
            Advisory only
          </span>
          <p className="mt-1">
            Gate results are based on the currently loaded report snapshot and
            the shared report-readiness rubric. Confirm product, operational,
            and deployment requirements separately.
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Reports in scope"
            value={formatNumber(scopedAssessments.length)}
            detail={`${formatNumber(gate.open.length)} open · ${formatNumber(
              scopedClosedCount,
            )} closed`}
            icon={FileCheck2}
            tone="violet"
          />
          <MetricCard
            label="Open critical / blocker"
            value={formatNumber(gate.critical)}
            detail={`Allowed by profile: ${formatNumber(config.criticalLimit)}`}
            icon={ShieldAlert}
            tone={gate.critical > config.criticalLimit ? "rose" : "emerald"}
          />
          <MetricCard
            label="Open high severity"
            value={formatNumber(gate.high)}
            detail={`Allowed by profile: ${formatNumber(config.highLimit)}`}
            icon={AlertTriangle}
            tone={gate.high > config.highLimit ? "rose" : "amber"}
          />
          <MetricCard
            label={`Open ${AGING_REVIEW_DAYS}+ days`}
            value={formatNumber(gate.aging)}
            detail="Age is a review signal, not a gate failure by itself"
            icon={AlertTriangle}
            tone={gate.aging ? "sky" : "emerald"}
          />
          <MetricCard
            label="Average open readiness"
            value={`${averageReadiness}%`}
            detail={`${formatNumber(screenshotMissing)} open reports without a screenshot`}
            icon={ClipboardCheck}
            tone={averageReadiness >= config.qualityFloor ? "emerald" : "amber"}
          />
        </div>

        <GateStatus
          result={{ ...gate, openCount: gate.open.length }}
          failedChecks={failedChecks}
        />

        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800">
                <SlidersHorizontal size={14} aria-hidden="true" />
                Gate profile and limits
              </p>
              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                Limits are browser-session settings for this view; they do not
                update project policy.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600">
              {isCustom ? "Custom profile" : `${selectedProfile.label} profile`}
            </span>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {PROFILES.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => applyProfile(profile)}
                aria-pressed={!isCustom && profileId === profile.id}
                className={`rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 ${
                  !isCustom && profileId === profile.id
                    ? "border-violet-300 bg-white ring-2 ring-violet-100"
                    : "border-slate-200 bg-white/70 hover:border-violet-200"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-800">
                    {profile.label}
                  </span>
                  {!isCustom && profileId === profile.id && (
                    <CheckCircle2
                      size={14}
                      className="text-violet-600"
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span className="mt-1 block text-[9px] leading-4 text-slate-500">
                  {profile.description}
                </span>
                <span className="mt-2 block text-[9px] text-slate-500">
                  Critical ≤ {profile.criticalLimit} · High ≤ {profile.highLimit} ·
                  Below floor ≤ {profile.incompleteLimit}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <label className="grid min-w-32 flex-1 gap-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Critical allowed
              </span>
              <input
                type="number"
                min="0"
                max={MAX_LIMIT}
                value={config.criticalLimit}
                onChange={(event) =>
                  updateLimit("criticalLimit", event.target.value)
                }
                onFocus={loadProfileIntoCustom}
                className="h-9 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              />
            </label>
            <label className="grid min-w-32 flex-1 gap-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                High allowed
              </span>
              <input
                type="number"
                min="0"
                max={MAX_LIMIT}
                value={config.highLimit}
                onChange={(event) =>
                  updateLimit("highLimit", event.target.value)
                }
                onFocus={loadProfileIntoCustom}
                className="h-9 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              />
            </label>
            <label className="grid min-w-36 flex-1 gap-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Below-floor allowed
              </span>
              <input
                type="number"
                min="0"
                max={MAX_LIMIT}
                value={config.incompleteLimit}
                onChange={(event) =>
                  updateLimit("incompleteLimit", event.target.value)
                }
                onFocus={loadProfileIntoCustom}
                className="h-9 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              />
            </label>
            <label className="grid min-w-36 flex-1 gap-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Readiness floor
              </span>
              <select
                value={config.qualityFloor}
                onChange={(event) =>
                  updateLimit("qualityFloor", event.target.value)
                }
                onFocus={loadProfileIntoCustom}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              >
                {[0, 50, 60, 70, 80, 90, 100].map((score) => (
                  <option key={score} value={score}>
                    {score}% minimum
                  </option>
                ))}
              </select>
            </label>
            {isCustom && (
              <button
                type="button"
                onClick={() => setCustomLimits(null)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-50"
              >
                <X size={12} aria-hidden="true" />
                Reset to {selectedProfile.label}
              </button>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-slate-800">
                Release-scope checks
              </h3>
              <p className="mt-1 text-[10px] text-slate-500">
                Open reports only · thresholds update as you adjust the profile.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span
                className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-label="Passed release checks"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={checkCompletion}
              >
                <span
                  className={`block h-full rounded-full ${
                    gate.passed ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                  style={{ width: `${checkCompletion}%` }}
                />
              </span>
              {checksPassed}/{gate.checks.length} checks pass
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {gate.checks.map((check) => (
              <GateCheckCard key={check.id} check={check} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white">
          <div className="border-b border-slate-100 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-800">
                  Reports for review
                </h3>
                <p className="mt-1 text-[10px] text-slate-500">
                  {formatNumber(gate.blockers.length)} reports match current
                  gate rules · {formatNumber(scopedAssessments.length)} reports
                  in scope
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <SelectField
                  label="Release category"
                  value={categoryFilter}
                  onChange={(value) => {
                    setCategoryFilter(value);
                    setVisibleCount(INITIAL_VISIBLE);
                  }}
                  options={categoryOptions}
                />
                <SelectField
                  label="Review filter"
                  value={severityFilter}
                  onChange={setReviewFilter}
                  options={[
                    { value: "all", label: "All flagged reports" },
                    { value: "critical", label: "Critical only" },
                    { value: "high", label: "High only" },
                    { value: "severity", label: "Critical and high" },
                    { value: "quality", label: "Readiness below floor" },
                    {
                      value: "aging",
                      label: `${AGING_REVIEW_DAYS}+ days open`,
                    },
                  ]}
                />
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Sort reports
                  </span>
                  <span className="relative">
                    <select
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value)}
                      className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-xs font-medium text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ArrowDownWideNarrow
                      size={13}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                  </span>
                </label>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="relative min-w-48 flex-1">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setVisibleCount(INITIAL_VISIBLE);
                  }}
                  placeholder="Search reports, IDs, missing details…"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                />
              </label>
              {hasFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-50"
                >
                  <FilterX size={12} aria-hidden="true" />
                  Clear filters
                </button>
              )}
              <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2.5 text-[10px] font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={showAllOpen}
                  onChange={(event) => setShowAllOpen(event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-violet-600 focus:ring-violet-200"
                />
                Include open reports without flags
              </label>
            </div>
          </div>

          <div className="space-y-2.5 p-3.5 sm:p-4">
            {(() => {
              const rows = showAllOpen
                ? scopedAssessments
                    .filter((entry) => entry.status === "Open")
                    .map((entry) => ({
                      ...entry,
                      reasons: getAssessmentReasons(entry, config),
                      riskScore: getRiskScore(entry),
                    }))
                    .filter((entry) => {
                      const normalizedSearch = search.trim().toLowerCase();
                      if (
                        severityFilter === "critical" &&
                        entry.severityRank !== 4
                      ) {
                        return false;
                      }
                      if (
                        severityFilter === "high" &&
                        entry.severityRank !== 3
                      ) {
                        return false;
                      }
                      if (
                        severityFilter === "aging" &&
                        !entry.reasons.includes("aging")
                      ) {
                        return false;
                      }
                      if (
                        severityFilter === "severity" &&
                        entry.severityRank < 3
                      ) {
                        return false;
                      }
                      if (
                        severityFilter === "quality" &&
                        !entry.reasons.includes("quality")
                      ) {
                        return false;
                      }
                      if (!normalizedSearch) return true;
                      return [
                        entry.id,
                        entry.title,
                        entry.category,
                        entry.severity,
                        ...entry.missing.map((item) => item.label),
                      ]
                        .join(" ")
                        .toLowerCase()
                        .includes(normalizedSearch);
                    })
                    .sort((left, right) => {
                      if (sortBy === "severity") {
                        return right.severityRank - left.severityRank;
                      }
                      if (sortBy === "readiness") {
                        return left.readinessScore - right.readinessScore;
                      }
                      if (sortBy === "oldest") {
                        return (right.age ?? -1) - (left.age ?? -1);
                      }
                      if (sortBy === "title") {
                        return left.title.localeCompare(right.title);
                      }
                      return getRiskScore(right) - getRiskScore(left);
                    })
                : filteredBlockers;
              const rowsToShow = rows.slice(0, visibleCount);
              if (!rows.length) {
                return (
                  <EmptyBlockers filtered={hasFilters} onReset={resetFilters} />
                );
              }
              return (
                <>
                  {rowsToShow.map((entry) => (
                    <BlockerRow
                      key={entry.id || entry.title}
                      entry={entry}
                      onOpenReport={onOpenReport}
                    />
                  ))}
                  {rows.length > INITIAL_VISIBLE && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <p className="text-[10px] text-slate-500" aria-live="polite">
                        Showing {formatNumber(rowsToShow.length)} of{" "}
                        {formatNumber(rows.length)}
                      </p>
                      {visibleCount < rows.length ? (
                        <button
                          type="button"
                          onClick={() =>
                            setVisibleCount((current) =>
                              Math.min(current + INITIAL_VISIBLE, rows.length),
                            )
                          }
                          className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-semibold text-violet-700 hover:bg-violet-100"
                        >
                          Show more reports
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setVisibleCount(INITIAL_VISIBLE)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Show fewer
                        </button>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-violet-900">
              <ClipboardCheck size={14} aria-hidden="true" />
              Readiness scoring
            </p>
            <p className="mt-1.5 text-[10px] leading-5 text-violet-900/75">
              Quality checks use the dashboard&apos;s shared readiness
              assessment for title, description, reproduction steps, expected
              and actual behavior, and affected page. Missing screenshots are
              shown as context, not a release-gate failure. Open reports
              older than {AGING_REVIEW_DAYS} days are also surfaced for review,
              but age alone does not fail a threshold check.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800">
              <Info size={14} aria-hidden="true" />
              Snapshot scope
            </p>
            <p className="mt-1.5 text-[10px] leading-5 text-slate-600">
              The selected category filter applies to metrics, threshold checks,
              review signals, and export. Closed reports appear in the report
              scope count but do not count as open gate violations.
            </p>
          </div>
        </div>

        {(exportError || exportNotice) && (
          <p
            role={exportError ? "alert" : "status"}
            className={`rounded-xl border px-3.5 py-3 text-xs ${
              exportError
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {exportError || exportNotice}
          </p>
        )}

        {!reports.length && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
            <FileCheck2
              size={22}
              className="mx-auto text-slate-400"
              aria-hidden="true"
            />
            <p className="mt-3 text-xs font-semibold text-slate-700">
              No report data is available
            </p>
            <p className="mt-1 text-[10px] text-slate-500">
              Load reports to evaluate the advisory release checks.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
