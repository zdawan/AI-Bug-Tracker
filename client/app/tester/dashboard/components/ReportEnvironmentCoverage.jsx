"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Compass,
  Download,
  Globe2,
  Monitor,
  Search,
  ShieldCheck,
  Smartphone,
  Tablet,
  X,
} from "lucide-react";

const DIMENSIONS = [
  { id: "browser", label: "Browser", icon: Globe2 },
  { id: "platform", label: "Platform", icon: Monitor },
  { id: "viewport", label: "Viewport", icon: Smartphone },
  { id: "language", label: "Language", icon: Compass },
  { id: "timeZone", label: "Time zone", icon: Globe2 },
  { id: "network", label: "Network", icon: BarChart3 },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open only" },
  { value: "closed", label: "Resolved only" },
];

const DIMENSION_OPTIONS = [
  { value: "browser", label: "Browser family" },
  { value: "platform", label: "Platform" },
  { value: "viewport", label: "Viewport class" },
  { value: "language", label: "Language" },
  { value: "timeZone", label: "Time zone" },
  { value: "network", label: "Network state" },
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

function getId(report) {
  return normalizeText(report?._id || report?.id);
}

function getTitle(report) {
  return normalizeText(report?.title || report?.summary, "Untitled report");
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

function getDate(report) {
  const value =
    report?.createdAt ||
    report?.created_at ||
    report?.reportedAt ||
    report?.date;
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDescription(report) {
  return typeof report?.description === "string" ? report.description : "";
}

function cleanValue(value) {
  return normalizeText(value)
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .slice(0, 240);
}

function extractSnapshot(description) {
  if (typeof description !== "string" || !description.trim()) return null;
  const start = description.search(/^Browser environment\s*$/im);
  if (start < 0) return null;

  const following = description.slice(start).split(/\r?\n/);
  if (!/^Browser environment\s*$/i.test(following[0]?.trim() || "")) {
    return null;
  }

  const values = new Map();
  for (const rawLine of following.slice(1)) {
    const line = rawLine.trim();
    if (!line) {
      if (values.size) break;
      continue;
    }

    const match = line.match(/^([^:]{2,60}):\s*(.+)$/);
    if (!match) {
      if (values.size) break;
      continue;
    }

    const label = match[1].trim().toLowerCase();
    const value = cleanValue(match[2]);
    if (/^privacy$/i.test(label)) break;
    if (!value || /not available|unknown/i.test(value)) continue;
    values.set(label, value);
  }
  if (!values.size) return null;

  return {
    browserUserAgent: values.get("browser user agent") || "",
    platform: values.get("platform") || "",
    viewport: values.get("viewport") || "",
    screen: values.get("screen") || "",
    language: values.get("language") || "",
    timeZone: values.get("time zone") || "",
    colorScheme: values.get("color scheme") || "",
    reducedMotion: values.get("reduced motion") || "",
    network: values.get("network") || "",
    captured: values.has("captured"),
  };
}

function classifyBrowser(userAgent) {
  const value = userAgent.toLowerCase();
  if (!value) return "Unknown browser";
  if (/edg(e|a|ios)?\//.test(value)) return "Microsoft Edge";
  if (/opr\/|opera/.test(value)) return "Opera";
  if (/firefox|fxios/.test(value)) return "Mozilla Firefox";
  if (/crios\//.test(value)) return "Google Chrome";
  if (/chrome\//.test(value) && !/chromium/.test(value)) {
    return "Google Chrome";
  }
  if (/safari\//.test(value) && !/chrome|chromium|crios|android/.test(value)) {
    return "Apple Safari";
  }
  if (/chromium/.test(value)) return "Chromium";
  if (/android/.test(value)) return "Android browser";
  return "Other browser";
}

function classifyPlatform(platform, userAgent) {
  const value = `${platform} ${userAgent}`.toLowerCase();
  if (!value.trim()) return "Unknown platform";
  if (/iphone|ipad|ipod/.test(value)) return "iOS / iPadOS";
  if (/android/.test(value)) return "Android";
  if (/windows/.test(value)) return "Windows";
  if (/macintosh|mac os|macintel/.test(value)) return "macOS";
  if (/cros/.test(value)) return "ChromeOS";
  if (/linux|x11/.test(value)) return "Linux";
  return "Other platform";
}

function classifyViewport(viewport, screen) {
  const match = viewport.match(/(\d{2,5})\s*[×x]\s*(\d{2,5})/i) ||
    screen.match(/(\d{2,5})\s*[×x]\s*(\d{2,5})/i);
  if (!match) return "Unknown viewport";

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return "Unknown viewport";
  }
  const shortestSide = Math.min(width, height);
  const longestSide = Math.max(width, height);
  if (shortestSide < 600) return "Phone-sized";
  if (shortestSide < 900 || longestSide < 1100) return "Tablet-sized";
  return "Desktop-sized";
}

function normalizeNetwork(value) {
  const normalized = value.toLowerCase();
  if (!value) return "Unknown network";
  if (normalized.includes("offline")) return "Offline";
  if (normalized.includes("2g")) return "2G";
  if (normalized.includes("3g")) return "3G";
  if (normalized.includes("4g")) return "4G";
  if (normalized.includes("5g")) return "5G";
  if (normalized.includes("wifi")) return "Wi-Fi";
  if (normalized.includes("online")) return "Online";
  return "Other network";
}

function parseEntry(report, index) {
  const snapshot = extractSnapshot(getDescription(report));
  if (!snapshot) return null;

  const id = getId(report);
  const title = getTitle(report);
  const date = getDate(report);
  return {
    key: id || `${title}:${date?.toISOString() || "undated"}:${index}`,
    id,
    title,
    date,
    status: getStatus(report),
    severity: getSeverity(report),
    category: getCategory(report),
    browser: classifyBrowser(snapshot.browserUserAgent),
    platform: classifyPlatform(snapshot.platform, snapshot.browserUserAgent),
    viewport: classifyViewport(snapshot.viewport, snapshot.screen),
    language: snapshot.language || "Unknown language",
    timeZone: snapshot.timeZone || "Unknown time zone",
    network: normalizeNetwork(snapshot.network),
    colorScheme: snapshot.colorScheme || "Unknown color scheme",
    reducedMotion: snapshot.reducedMotion || "Unknown motion preference",
    captured: snapshot.captured,
    report,
  };
}

function getDimensionValue(entry, dimension) {
  return entry?.[dimension] || "Not recorded";
}

function getSeverityRank(value) {
  return SEVERITY_RANK[value.toLowerCase()] ?? SEVERITY_RANK.unspecified;
}

function compareEntries(left, right) {
  return (
    getSeverityRank(left.severity) - getSeverityRank(right.severity) ||
    (right.date?.getTime() || 0) - (left.date?.getTime() || 0) ||
    left.title.localeCompare(right.title)
  );
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDate(date) {
  if (!date) return "Date unavailable";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getSearchText(entry) {
  return [
    entry.id,
    entry.title,
    entry.category,
    entry.severity,
    entry.browser,
    entry.platform,
    entry.viewport,
    entry.language,
    entry.timeZone,
    entry.network,
    entry.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function filterEntries(entries, filters) {
  const query = filters.search.trim().toLowerCase();
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
    if (filters.dimensionValue !== "all") {
      const selectedValue = getDimensionValue(entry, filters.dimension);
      if (selectedValue !== filters.dimensionValue) return false;
    }
    return !query || getSearchText(entry).includes(query);
  });
}

function buildDistribution(entries, dimension) {
  const buckets = new Map();
  entries.forEach((entry) => {
    const value = getDimensionValue(entry, dimension);
    const bucket = buckets.get(value) || {
      value,
      count: 0,
      open: 0,
      closed: 0,
      high: 0,
      critical: 0,
      categories: new Map(),
    };
    bucket.count += 1;
    if (entry.status === "closed") bucket.closed += 1;
    else bucket.open += 1;
    if (entry.severity.toLowerCase() === "high") bucket.high += 1;
    if (entry.severity.toLowerCase() === "critical") bucket.critical += 1;
    bucket.categories.set(
      entry.category,
      (bucket.categories.get(entry.category) || 0) + 1,
    );
    buckets.set(value, bucket);
  });

  return [...buckets.values()].sort(
    (left, right) =>
      right.count - left.count || left.value.localeCompare(right.value),
  );
}

function getEntrySummary(entries, allReportCount) {
  const summary = {
    captured: entries.length,
    total: allReportCount,
    open: 0,
    closed: 0,
    high: 0,
    critical: 0,
    categories: new Set(),
    browserFamilies: new Set(),
    platforms: new Set(),
    missingBrowser: 0,
    missingPlatform: 0,
  };

  entries.forEach((entry) => {
    if (entry.status === "closed") summary.closed += 1;
    else summary.open += 1;
    if (entry.severity.toLowerCase() === "high") summary.high += 1;
    if (entry.severity.toLowerCase() === "critical") summary.critical += 1;
    summary.categories.add(entry.category);
    if (entry.browser === "Unknown browser") summary.missingBrowser += 1;
    else summary.browserFamilies.add(entry.browser);
    if (entry.platform === "Unknown platform") summary.missingPlatform += 1;
    else summary.platforms.add(entry.platform);
  });

  return summary;
}

function escapeCsv(value) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function exportCoverageCsv(entries, dimension, filters) {
  const headers = [
    "Report ID",
    "Title",
    "Status",
    "Severity",
    "Category",
    "Reported date",
    "Browser family",
    "Platform",
    "Viewport class",
    "Language",
    "Time zone",
    "Network",
    "Color scheme",
    "Reduced motion",
  ];
  const metadata = [
    ["Environment coverage export"],
    ["Generated", new Date().toLocaleString("en-IN")],
    ["Group by", DIMENSION_OPTIONS.find((option) => option.value === dimension)?.label || dimension],
    ["Status filter", filters.status],
    ["Severity filter", filters.severity],
    ["Category filter", filters.category],
    ["Search", filters.search || "None"],
    ["Matching environment-tagged reports", entries.length],
    ["Privacy", "Raw user agents, screen dimensions, screenshots, and report descriptions are not exported."],
  ];
  const rows = entries.map((entry) => [
    entry.id,
    entry.title,
    entry.status === "closed" ? "Resolved" : "Open",
    entry.severity,
    entry.category,
    formatDate(entry.date),
    entry.browser,
    entry.platform,
    entry.viewport,
    entry.language,
    entry.timeZone,
    entry.network,
    entry.colorScheme,
    entry.reducedMotion,
  ]);
  const csv = [...metadata, [], headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `report-environment-coverage-${dimension}.csv`;
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
        className="h-9 appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-[9px] font-semibold text-slate-600 outline-none transition hover:border-violet-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
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

function MetricCard({ label, value, detail, icon: Icon, tone }) {
  const tones = {
    violet: "bg-violet-50 text-violet-700",
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <article className="rounded-xl border border-slate-200/80 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <span className={`grid h-7 w-7 place-items-center rounded-lg ${tones[tone]}`}>
          <Icon size={13} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">
        {formatNumber(value)}
      </p>
      <p className="mt-1 text-[8px] text-slate-400">{detail}</p>
    </article>
  );
}

function CoverageBar({ bucket, total, selected, onSelect }) {
  const percentage = total ? (bucket.count / total) * 100 : 0;
  return (
    <button
      type="button"
      onClick={() => onSelect(selected ? "all" : bucket.value)}
      aria-pressed={selected}
      className={`w-full rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
        selected
          ? "border-violet-200 bg-violet-50/60"
          : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/60"
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[9px] font-semibold text-slate-700">
          {bucket.value}
        </span>
        <span className="shrink-0 text-[9px] font-bold tabular-nums text-slate-800">
          {formatNumber(bucket.count)}
        </span>
      </span>
      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-100">
        <span
          className="block h-full rounded-full bg-violet-500 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </span>
      <span className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[7px] text-slate-400">
        <span>{formatNumber(percentage, 0)}% of captured reports</span>
        <span>
          {formatNumber(bucket.open)} open · {formatNumber(bucket.closed)} resolved
        </span>
      </span>
      {(bucket.high > 0 || bucket.critical > 0) && (
        <span className="mt-1 block text-[7px] font-medium text-rose-700">
          {formatNumber(bucket.high)} high · {formatNumber(bucket.critical)} critical
        </span>
      )}
    </button>
  );
}

function DistributionPanel({
  dimension,
  entries,
  selectedValue,
  onSelectValue,
}) {
  const distribution = useMemo(
    () => buildDistribution(entries, dimension),
    [dimension, entries],
  );
  const DimensionIcon =
    DIMENSIONS.find((item) => item.id === dimension)?.icon || Globe2;

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-3">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-50 text-violet-700">
            <DimensionIcon size={13} aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-[9px] font-semibold text-slate-800">
              {DIMENSIONS.find((item) => item.id === dimension)?.label} coverage
            </h3>
            <p className="text-[7px] text-slate-400">
              Select a value to focus the report list.
            </p>
          </div>
        </div>
        {selectedValue !== "all" && (
          <button
            type="button"
            onClick={() => onSelectValue("all")}
            className="rounded-md px-1.5 py-1 text-[7px] font-semibold text-violet-700 hover:bg-violet-50"
          >
            Clear
          </button>
        )}
      </div>
      {distribution.length ? (
        <div className="max-h-[390px] space-y-1.5 overflow-y-auto pr-1">
          {distribution.map((bucket) => (
            <CoverageBar
              key={bucket.value}
              bucket={bucket}
              total={entries.length}
              selected={selectedValue === bucket.value}
              onSelect={onSelectValue}
            />
          ))}
        </div>
      ) : (
        <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-[8px] text-slate-500">
          No environment information was recorded in the matching reports.
        </div>
      )}
    </section>
  );
}

function ReportEnvironmentRow({ entry, onOpenReport }) {
  const severityTone =
    entry.severity.toLowerCase() === "critical" ||
    entry.severity.toLowerCase() === "high"
      ? "bg-rose-50 text-rose-700"
      : entry.severity.toLowerCase() === "medium"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";
  return (
    <li className="border-b border-slate-100 py-2.5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500">
          {entry.viewport === "Phone-sized" ? (
            <Smartphone size={13} aria-hidden="true" />
          ) : entry.viewport === "Tablet-sized" ? (
            <Tablet size={13} aria-hidden="true" />
          ) : (
            <Monitor size={13} aria-hidden="true" />
          )}
        </span>
        <div className="min-w-[150px] flex-1">
          <p className="truncate text-[9px] font-semibold text-slate-800">
            {entry.title}
          </p>
          <p className="mt-0.5 truncate text-[7px] text-slate-400">
            {entry.id ? `#${entry.id.slice(-10)} · ` : ""}
            {entry.category} · {formatDate(entry.date)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className={`rounded-full px-1.5 py-1 text-[7px] font-semibold ${severityTone}`}>
            {entry.severity}
          </span>
          <span
            className={`rounded-full px-1.5 py-1 text-[7px] font-semibold ${
              entry.status === "closed"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {entry.status === "closed" ? "Resolved" : "Open"}
          </span>
        </div>
        <div className="w-full pl-9 text-[7px] text-slate-500 sm:w-auto sm:pl-0">
          <span className="font-medium text-slate-600">{entry.browser}</span>
          <span className="mx-1 text-slate-300">·</span>
          {entry.platform}
          <span className="mx-1 text-slate-300">·</span>
          {entry.viewport}
        </div>
        {onOpenReport && (
          <button
            type="button"
            onClick={() => onOpenReport(entry.report)}
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[7px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            View
            <ArrowUpRight size={9} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  );
}

function SummaryInsight({ summary, environmentTaggedCount, filteredCount }) {
  const coverage =
    summary.total === 0
      ? 0
      : Math.round((environmentTaggedCount / summary.total) * 100);
  const mostCommonBrowser = summary.browserFamilies.size
    ? [...summary.browserFamilies].sort()[0]
    : "";
  const title = environmentTaggedCount
    ? `${formatNumber(coverage)}% of matching reports include environment context`
    : "No captured environment sections in these reports";
  const detail = environmentTaggedCount
    ? `${formatNumber(environmentTaggedCount)} of ${formatNumber(
        summary.total,
      )} reports contain an explicitly captured browser snapshot. ${
        mostCommonBrowser
          ? `${mostCommonBrowser} is one of the recorded browser families.`
          : ""
      }`
    : "Environment details are optional and only appear when a tester captures and includes them with a report.";

  return (
    <aside className="rounded-xl border border-sky-100 bg-sky-50/60 p-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-sky-700 shadow-sm">
          <ShieldCheck size={13} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[9px] font-semibold text-slate-800">{title}</p>
          <p className="mt-1 text-[8px] leading-4 text-slate-500">{detail}</p>
          <p className="mt-1.5 text-[7px] text-slate-400">
            {formatNumber(filteredCount)} reports currently in the focused list.
          </p>
        </div>
      </div>
    </aside>
  );
}

function EmptyCoverage({ reportsExist, onReset }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center">
      <div>
        <span className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-400 shadow-sm">
          <CircleHelp size={16} aria-hidden="true" />
        </span>
        <p className="mt-2 text-[10px] font-semibold text-slate-700">
          {reportsExist
            ? "No environment-tagged reports match these filters"
            : "No reports are available yet"}
        </p>
        <p className="mx-auto mt-1 max-w-sm text-[8px] leading-4 text-slate-500">
          {reportsExist
            ? "Reset filters or select reports with an optional Browser environment section in their description."
            : "Environment coverage appears here when reports explicitly include a captured browser snapshot."}
        </p>
        {reportsExist && (
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

export default function ReportEnvironmentCoverage({
  reports = [],
  onOpenReport,
}) {
  const [dimension, setDimension] = useState("browser");
  const [status, setStatus] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [category, setCategory] = useState("all");
  const [dimensionValue, setDimensionValue] = useState("all");
  const [search, setSearch] = useState("");

  const allReports = useMemo(
    () =>
      Array.isArray(reports)
        ? reports.filter(
            (report) =>
              report && typeof report === "object" && !Array.isArray(report),
          )
        : [],
    [reports],
  );
  const allEntries = useMemo(
    () => allReports.map(parseEntry).filter(Boolean).sort(compareEntries),
    [allReports],
  );

  const baseEntries = useMemo(
    () =>
      allEntries.filter((entry) => {
        if (status !== "all" && entry.status !== status) return false;
        if (severity !== "all" && entry.severity !== severity) return false;
        if (category !== "all" && entry.category !== category) return false;
        const query = search.trim().toLowerCase();
        return !query || getSearchText(entry).includes(query);
      }),
    [allEntries, category, search, severity, status],
  );
  const distribution = useMemo(
    () => buildDistribution(baseEntries, dimension),
    [baseEntries, dimension],
  );
  const distributionValues = useMemo(
    () => [
      { value: "all", label: `All values (${formatNumber(baseEntries.length)})` },
      ...distribution.map((item) => ({
        value: item.value,
        label: `${item.value} (${formatNumber(item.count)})`,
      })),
    ],
    [baseEntries.length, distribution],
  );
  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...[...new Set(allEntries.map((entry) => entry.category))]
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ value, label: value })),
    ],
    [allEntries],
  );
  const severityOptions = useMemo(
    () => [
      { value: "all", label: "All severities" },
      ...[...new Set(allEntries.map((entry) => entry.severity))]
        .sort(
          (left, right) =>
            getSeverityRank(left) - getSeverityRank(right) ||
            left.localeCompare(right),
        )
        .map((value) => ({ value, label: value })),
    ],
    [allEntries],
  );
  const filteredEntries = useMemo(
    () =>
      filterEntries(baseEntries, {
        status: "all",
        severity: "all",
        category: "all",
        dimension,
        dimensionValue,
        search: "",
      }).sort(compareEntries),
    [baseEntries, dimension, dimensionValue],
  );
  const summary = useMemo(
    () => getEntrySummary(allEntries, allReports.length),
    [allEntries, allReports.length],
  );
  const coveragePercent = allReports.length
    ? Math.round((allEntries.length / allReports.length) * 100)
    : 0;
  const filterActive =
    status !== "all" ||
    severity !== "all" ||
    category !== "all" ||
    dimensionValue !== "all" ||
    Boolean(search.trim());

  const setDimensionAndReset = (value) => {
    setDimension(value);
    setDimensionValue("all");
  };

  const resetFilters = () => {
    setStatus("all");
    setSeverity("all");
    setCategory("all");
    setDimensionValue("all");
    setSearch("");
  };

  const exportCsv = () =>
    exportCoverageCsv(filteredEntries, dimension, {
      status,
      severity,
      category,
      search: search.trim(),
    });

  return (
    <section
      aria-labelledby="environment-coverage-heading"
      className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30"
    >
      <header className="border-b border-slate-100 bg-gradient-to-br from-sky-50/60 via-white to-violet-50/40 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-sky-100 bg-sky-50 text-sky-700">
              <Compass size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-sky-700">
                Patch 9 · Shared environment coverage
              </p>
              <h2
                id="environment-coverage-heading"
                className="mt-1 text-base font-semibold tracking-tight text-slate-950"
              >
                Browser and device coverage
              </h2>
              <p className="mt-1 max-w-2xl text-[10px] leading-4 text-slate-500">
                Find report clusters across browser families, platforms, and
                viewport classes using only environment details explicitly
                included by testers.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!filteredEntries.length}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Download size={12} aria-hidden="true" />
            Export coverage
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SelectControl
            label="Group environment reports by"
            value={dimension}
            options={DIMENSION_OPTIONS}
            onChange={setDimensionAndReset}
          />
          <SelectControl
            label="Filter environment reports by status"
            value={status}
            options={FILTER_OPTIONS}
            onChange={(value) => {
              setStatus(value);
              setDimensionValue("all");
            }}
          />
          <SelectControl
            label="Filter environment reports by severity"
            value={severity}
            options={severityOptions}
            onChange={(value) => {
              setSeverity(value);
              setDimensionValue("all");
            }}
          />
          <SelectControl
            label="Filter environment reports by category"
            value={category}
            options={categoryOptions}
            onChange={(value) => {
              setCategory(value);
              setDimensionValue("all");
            }}
          />
          <SelectControl
            label="Filter environment reports by dimension value"
            value={dimensionValue}
            options={distributionValues}
            onChange={setDimensionValue}
          />
          <label className="relative min-w-[160px] flex-1 sm:max-w-xs">
            <span className="sr-only">Search environment reports</span>
            <Search
              size={12}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setDimensionValue("all");
              }}
              placeholder="Search reports or environment"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[9px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </label>
          {filterActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[8px] font-semibold text-slate-500 hover:bg-white hover:text-violet-700"
            >
              <X size={10} aria-hidden="true" />
              Reset
            </button>
          )}
        </div>
      </header>

      <div className="space-y-3 p-3 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Captured snapshots"
            value={summary.captured}
            detail={`${formatNumber(coveragePercent)}% of ${formatNumber(summary.total)} reports`}
            icon={ShieldCheck}
            tone="sky"
          />
          <MetricCard
            label="Browser families"
            value={summary.browserFamilies.size}
            detail={`${formatNumber(summary.missingBrowser)} unknown or unavailable`}
            icon={Globe2}
            tone="violet"
          />
          <MetricCard
            label="Platforms"
            value={summary.platforms.size}
            detail={`${formatNumber(summary.missingPlatform)} unknown or unavailable`}
            icon={Monitor}
            tone="emerald"
          />
          <MetricCard
            label="Tagged open reports"
            value={summary.open}
            detail={`${formatNumber(summary.closed)} resolved`}
            icon={CheckCircle2}
            tone="amber"
          />
        </div>

        {!allEntries.length || !baseEntries.length ? (
          <EmptyCoverage
            reportsExist={allReports.length > 0}
            onReset={resetFilters}
          />
        ) : (
          <div className="grid gap-3 xl:grid-cols-[minmax(240px,0.65fr)_minmax(0,1.35fr)]">
            <div className="space-y-3">
              <SummaryInsight
                summary={summary}
                environmentTaggedCount={allEntries.length}
                filteredCount={filteredEntries.length}
              />
              <DistributionPanel
                dimension={dimension}
                entries={baseEntries}
                selectedValue={dimensionValue}
                onSelectValue={setDimensionValue}
              />
            </div>

            <section className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-[9px] font-semibold text-slate-800">
                    Matching reports
                  </h3>
                  <p className="mt-0.5 text-[7px] text-slate-400">
                    {formatNumber(filteredEntries.length)} reports ·{" "}
                    {DIMENSIONS.find((item) => item.id === dimension)?.label}{" "}
                    grouped
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[7px] text-slate-500">
                  <BarChart3 size={10} aria-hidden="true" />
                  {formatNumber(distribution.length)} groups
                </span>
              </div>
              {filteredEntries.length ? (
                <ul className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto pr-1">
                  {filteredEntries.map((entry) => (
                    <ReportEnvironmentRow
                      key={entry.key}
                      entry={entry}
                      onOpenReport={onOpenReport}
                    />
                  ))}
                </ul>
              ) : (
                <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-slate-200 p-4 text-center text-[8px] text-slate-500">
                  No reports match the selected environment value.
                </div>
              )}
            </section>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
          <ShieldCheck
            size={12}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-slate-500"
          />
          <p className="text-[7px] leading-4 text-slate-500">
            This panel reads only the optional “Browser environment” section
            already present in a report description. Browser and platform are
            reduced to broad families. Raw user agents and screen dimensions
            are neither displayed nor exported. No new environment data is
            collected by the dashboard.
          </p>
        </div>

        <span className="sr-only" aria-live="polite">
          {formatNumber(filteredEntries.length)} reports match the selected
          environment coverage filters from {formatNumber(allEntries.length)}{" "}
          reports with captured environment sections.
        </span>
      </div>
    </section>
  );
}
