"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clipboard,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Filter,
  FolderKanban,
  ListChecks,
  MessageSquareText,
  PackageCheck,
  Search,
  ShieldAlert,
  Sparkles,
  Tag,
  UsersRound,
  X,
} from "lucide-react";

const STORAGE_PREFIX = "tester-report-handoff-builder-v1";
const MAX_PACKAGES = 30;
const MAX_REPORTS = 100;
const MAX_TEXT = 1200;
const INITIAL_VISIBLE = 8;

const HANDOFF_STEPS = [
  { id: "scope", label: "Scope is clear", description: "The handoff explains what is included and why." },
  { id: "impact", label: "Impact is summarized", description: "User or release impact is stated." },
  { id: "evidence", label: "Evidence is attached", description: "Selected reports have supporting context." },
  { id: "owners", label: "Owners are named", description: "A receiving team or owner is identified." },
  { id: "next", label: "Next steps are listed", description: "The recipient knows what happens next." },
];

const STATUS_FILTERS = [
  { value: "all", label: "All reports" },
  { value: "open", label: "Open reports" },
  { value: "closed", label: "Resolved reports" },
];

const SEVERITY_FILTERS = [
  { value: "all", label: "All severities" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

const SORT_OPTIONS = [
  { value: "severity", label: "Highest severity" },
  { value: "newest", label: "Newest first" },
  { value: "title", label: "Title A–Z" },
  { value: "category", label: "Category A–Z" },
];

function text(value, fallback = "", limit = 2000) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, limit)
    : fallback;
}

function reportId(report) {
  const value = report?._id ?? report?.id;
  return value === null || value === undefined ? "" : String(value).trim();
}

function reportTitle(report) {
  return text(report?.title || report?.summary, "Untitled report", 240);
}

function reportSeverity(report) {
  return text(report?.severity, "Unspecified", 80);
}

function reportCategory(report) {
  return text(report?.category, "Uncategorized", 120);
}

function reportStatus(report) {
  return report?.status === "Closed" ? "closed" : "open";
}

function reportDate(report) {
  const value = report?.createdAt || report?.created_at || report?.reportedAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function severityRank(value) {
  if (value === "High") return 3;
  if (value === "Medium") return 2;
  if (value === "Low") return 1;
  return 0;
}

function packageKey(email) {
  const normalized = text(email).toLocaleLowerCase();
  return normalized
    ? `${STORAGE_PREFIX}:${encodeURIComponent(normalized)}`
    : "";
}

function newId(prefix = "handoff") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptySteps() {
  return Object.fromEntries(HANDOFF_STEPS.map((step) => [step.id, false]));
}

function normalizePackage(value) {
  if (!value || typeof value !== "object") return null;
  const id = text(value.id, "", 120);
  const title = text(value.title, "", 160);
  if (!id || !title) return null;
  const reportIds = Array.isArray(value.reportIds)
    ? [...new Set(value.reportIds.filter((item) => typeof item === "string" && item.trim()))].slice(0, MAX_REPORTS)
    : [];
  const rawSteps = value.steps && typeof value.steps === "object" ? value.steps : {};
  return {
    id,
    title,
    audience: text(value.audience, "", 120),
    owner: text(value.owner, "", 120),
    summary: text(value.summary, "", MAX_TEXT),
    nextSteps: text(value.nextSteps, "", MAX_TEXT),
    reportIds,
    steps: Object.fromEntries(HANDOFF_STEPS.map((step) => [step.id, rawSteps[step.id] === true])),
    updatedAt: text(value.updatedAt, "", 60),
  };
}

function normalizePackages(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizePackage).filter(Boolean).slice(0, MAX_PACKAGES);
}

function getStepProgress(packageRecord) {
  const complete = HANDOFF_STEPS.filter((step) => packageRecord.steps[step.id]).length;
  return {
    complete,
    total: HANDOFF_STEPS.length,
    percentage: Math.round((complete / HANDOFF_STEPS.length) * 100),
  };
}

function getPackageState(packageRecord) {
  const progress = getStepProgress(packageRecord);
  if (progress.percentage === 100) return "ready";
  if (progress.complete > 0) return "draft";
  return "new";
}

function stateLabel(state) {
  if (state === "ready") return "Ready to share";
  if (state === "draft") return "In progress";
  return "Not started";
}

function stateTone(state) {
  if (state === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (state === "draft") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function reportSearchText(report) {
  return [
    reportId(report),
    reportTitle(report),
    reportCategory(report),
    reportSeverity(report),
    text(report?.description, "", 800),
  ].join(" ").toLowerCase();
}

function buildExportRows(packageRecord, reports) {
  const reportMap = new Map(reports.map((report) => [reportId(report), report]));
  const rows = [
    ["Handoff package", packageRecord.title],
    ["Audience", packageRecord.audience],
    ["Owner", packageRecord.owner],
    ["Summary", packageRecord.summary],
    ["Next steps", packageRecord.nextSteps],
    ["Package readiness", `${getStepProgress(packageRecord).percentage}%`],
    [],
    ["Readiness step", "Complete"],
    ...HANDOFF_STEPS.map((step) => [step.label, packageRecord.steps[step.id] ? "Yes" : "No"]),
    [],
    ["Report ID", "Title", "Status", "Severity", "Category", "Reported"],
    ...packageRecord.reportIds.map((id) => {
      const report = reportMap.get(id);
      return [
        id,
        reportTitle(report),
        report?.status || "Unknown",
        reportSeverity(report),
        reportCategory(report),
        formatDate(reportDate(report)),
      ];
    }),
  ];
  return rows;
}

function exportPackage(packageRecord, reports) {
  const escape = (value) => {
    const raw = String(value ?? "");
    const safe = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const content = buildExportRows(packageRecord, reports)
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `report-handoff-${packageRecord.id.slice(-12)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function StatusBadge({ state }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold ${stateTone(state)}`}>
      {state === "ready" ? <BadgeCheck size={11} /> : state === "draft" ? <CircleDashed size={11} /> : <Clipboard size={11} />}
      {stateLabel(state)}
    </span>
  );
}

function ProgressBar({ percentage }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage} aria-label={`Handoff readiness ${percentage}%`}>
      <div className={`h-full rounded-full transition-[width] ${percentage === 100 ? "bg-emerald-500" : "bg-violet-500"}`} style={{ width: `${percentage}%` }} />
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{label}</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-2.5 pr-7 text-[10px] font-semibold text-slate-600 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown size={12} aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

function MetricCard({ label, value, detail, tone, icon: Icon }) {
  return (
    <article className={`rounded-xl border p-3 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-wide opacity-75">{label}</p>
        <Icon size={14} aria-hidden="true" />
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-[9px] opacity-70">{detail}</p>
    </article>
  );
}

function StepRow({ step, checked, onToggle, disabled }) {
  return (
    <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition ${checked ? "border-emerald-200 bg-emerald-50/60" : "border-slate-100 bg-slate-50/60 hover:border-violet-200"} ${disabled ? "cursor-default opacity-60" : ""}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onToggle} className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 accent-emerald-600" />
      {checked ? <CheckCircle2 size={13} className="mt-0.5 text-emerald-600" aria-hidden="true" /> : <CircleDashed size={13} className="mt-0.5 text-slate-400" aria-hidden="true" />}
      <span className="min-w-0">
        <span className={`block text-[9px] font-semibold ${checked ? "text-emerald-700" : "text-slate-700"}`}>{step.label}</span>
        <span className="mt-0.5 block text-[8px] leading-3 text-slate-400">{step.description}</span>
      </span>
    </label>
  );
}

function PackageCard({ packageRecord, active, onSelect, reports, onExport, onDelete }) {
  const progress = getStepProgress(packageRecord);
  const reportMap = new Map(reports.map((report) => [reportId(report), report]));
  const selectedReports = packageRecord.reportIds.map((id) => reportMap.get(id)).filter(Boolean);
  return (
    <button type="button" onClick={onSelect} aria-pressed={active} className={`w-full rounded-xl border p-3 text-left transition ${active ? "border-violet-300 bg-violet-50/60 ring-2 ring-violet-100" : "border-slate-200 bg-white hover:border-violet-200"}`}>
      <div className="flex items-start gap-2">
        <FolderKanban size={15} className="mt-0.5 shrink-0 text-violet-600" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-slate-800">{packageRecord.title}</span>
          <span className="mt-1 block truncate text-[9px] text-slate-400">{selectedReports.length} reports · {packageRecord.audience || "No audience"}</span>
        </span>
        <StatusBadge state={getPackageState(packageRecord)} />
      </div>
      <div className="mt-2 flex items-center gap-2"><ProgressBar percentage={progress.percentage} /><span className="text-[9px] tabular-nums text-slate-500">{progress.percentage}%</span></div>
      <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[9px] text-slate-400">{progress.complete}/{progress.total} steps</span><span className="text-[9px] text-slate-400">{formatDate(packageRecord.updatedAt)}</span></div>
      <div className="mt-2 flex justify-end gap-1">
        <span role="presentation" onClick={(event) => { event.stopPropagation(); onExport(); }} className="rounded px-1.5 py-1 text-[9px] font-semibold text-slate-400 hover:bg-white hover:text-violet-700">Export</span>
        <span role="presentation" onClick={(event) => { event.stopPropagation(); onDelete(); }} className="rounded px-1.5 py-1 text-[9px] font-semibold text-slate-400 hover:bg-rose-50 hover:text-rose-600">Delete</span>
      </div>
    </button>
  );
}

function ReportPickerRow({ report, selected, onToggle }) {
  return (
    <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition ${selected ? "border-violet-300 bg-violet-50/60" : "border-slate-100 bg-white hover:border-violet-200"}`}>
      <input type="checkbox" checked={selected} onChange={onToggle} className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-violet-600" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[10px] font-semibold text-slate-800">{reportTitle(report)}</span>
        <span className="mt-1 block truncate text-[9px] text-slate-400">#{reportId(report)} · {reportSeverity(report)} · {reportCategory(report)}</span>
      </span>
      <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${reportStatus(report) === "closed" ? "bg-emerald-50 text-emerald-700" : "bg-violet-50 text-violet-700"}`}>{reportStatus(report) === "closed" ? "Resolved" : "Open"}</span>
    </label>
  );
}

function EmptyState({ hasReports, onCreate }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-10 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-white text-violet-500 shadow-sm"><PackageCheck size={19} aria-hidden="true" /></span>
      <h3 className="mt-3 text-sm font-semibold text-slate-800">{hasReports ? "No handoff packages yet" : "No reports are loaded"}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-slate-500">{hasReports ? "Create a package to organize a focused handoff." : "Reports will appear here when the dashboard receives data."}</p>
      {hasReports && <button type="button" onClick={onCreate} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[10px] font-semibold text-white hover:bg-violet-700"><FolderKanban size={12} /> Create package</button>}
    </div>
  );
}

export default function ReportHandoffBuilder({ reports = [], email, onOpenReport }) {
  const [packages, setPackages] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [loadedEmail, setLoadedEmail] = useState("");
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [reportSeverityFilter, setReportSeverityFilter] = useState("all");
  const [reportSort, setReportSort] = useState("severity");
  const [reportVisibleCount, setReportVisibleCount] = useState(INITIAL_VISIBLE);
  const [packageSearch, setPackageSearch] = useState("");
  const [packageFilter, setPackageFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAudience, setNewAudience] = useState("");
  const [newOwner, setNewOwner] = useState("");

  const normalizedEmail = text(email).toLocaleLowerCase();
  const storageKey = packageKey(normalizedEmail);
  const validReports = useMemo(() => reports.filter((report) => report && typeof report === "object" && reportId(report)), [reports]);
  const reportMap = useMemo(() => new Map(validReports.map((report) => [reportId(report), report])), [validReports]);

  useEffect(() => {
    setPackages([]);
    setActiveId("");
    setLoadedEmail("");
    setStorageLoaded(false);
    setStorageError("");
    if (!normalizedEmail) { setStorageLoaded(true); return; }
    try {
      const raw = window.localStorage.getItem(storageKey);
      const loaded = raw ? normalizePackages(JSON.parse(raw)) : [];
      setPackages(loaded);
      setLoadedEmail(normalizedEmail);
      setStorageLoaded(true);
      if (loaded[0]) setActiveId(loaded[0].id);
    } catch {
      setStorageError("Saved handoff packages could not be loaded. New changes remain in memory.");
      setLoadedEmail(normalizedEmail);
      setStorageLoaded(true);
    }
  }, [normalizedEmail, storageKey]);

  useEffect(() => {
    if (!storageLoaded || loadedEmail !== normalizedEmail || !storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(packages.slice(0, MAX_PACKAGES)));
      setStorageError("");
    } catch {
      setStorageError("Handoff changes are only in memory because this browser could not save them.");
    }
  }, [loadedEmail, normalizedEmail, packages, storageKey, storageLoaded]);

  const activePackage = packages.find((item) => item.id === activeId) || null;
  const visiblePackages = useMemo(() => packages.filter((item) => {
    const needle = packageSearch.trim().toLowerCase();
    if (packageFilter !== "all" && getPackageState(item) !== packageFilter) return false;
    return !needle || `${item.title} ${item.audience} ${item.owner}`.toLowerCase().includes(needle);
  }), [packageFilter, packageSearch, packages]);

  const pickerReports = useMemo(() => validReports.filter((report) => {
    const needle = reportSearch.trim().toLowerCase();
    if (reportStatusFilter !== "all" && reportStatus(report) !== reportStatusFilter) return false;
    if (reportSeverityFilter !== "all" && reportSeverity(report) !== reportSeverityFilter) return false;
    if (needle && !reportSearchText(report).includes(needle)) return false;
    return true;
  }).sort((left, right) => {
    if (reportSort === "severity") return severityRank(reportSeverity(right)) - severityRank(reportSeverity(left)) || reportTitle(left).localeCompare(reportTitle(right));
    if (reportSort === "newest") return (reportDate(right)?.getTime() || 0) - (reportDate(left)?.getTime() || 0);
    if (reportSort === "category") return reportCategory(left).localeCompare(reportCategory(right));
    return reportTitle(left).localeCompare(reportTitle(right));
  }), [reportSearch, reportSeverityFilter, reportSort, reportStatusFilter, validReports]);
  const visiblePickerReports = pickerReports.slice(0, reportVisibleCount);

  const metrics = useMemo(() => {
    const result = { total: packages.length, ready: 0, draft: 0, reports: 0, average: 0 };
    let total = 0;
    packages.forEach((item) => {
      const progress = getStepProgress(item);
      if (getPackageState(item) === "ready") result.ready += 1;
      else result.draft += 1;
      result.reports += item.reportIds.length;
      total += progress.percentage;
    });
    result.average = packages.length ? Math.round(total / packages.length) : 0;
    return result;
  }, [packages]);

  const updatePackage = (id, patch) => {
    setPackages((current) => current.map((item) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item));
    setFeedback("");
  };

  const createPackage = () => {
    const title = text(newTitle, "", 160);
    if (!title) { setFeedback("Enter a package title first."); return; }
    if (packages.length >= MAX_PACKAGES) { setFeedback(`A maximum of ${MAX_PACKAGES} packages is supported.`); return; }
    const item = { id: newId(), title, audience: text(newAudience, "", 120), owner: text(newOwner, "", 120), summary: "", nextSteps: "", reportIds: [], steps: emptySteps(), updatedAt: new Date().toISOString() };
    setPackages((current) => [item, ...current]);
    setActiveId(item.id);
    setNewTitle("");
    setNewAudience("");
    setNewOwner("");
    setShowCreate(false);
    setFeedback("Handoff package created.");
  };

  const deletePackage = (id) => {
    setPackages((current) => current.filter((item) => item.id !== id));
    if (activeId === id) setActiveId("");
    setFeedback("Handoff package deleted locally.");
  };

  const toggleStep = (stepId) => {
    if (!activePackage) return;
    updatePackage(activePackage.id, { steps: { ...activePackage.steps, [stepId]: !activePackage.steps[stepId] } });
  };

  const toggleReport = (id) => {
    if (!activePackage) return;
    const reportIds = activePackage.reportIds.includes(id) ? activePackage.reportIds.filter((item) => item !== id) : [...activePackage.reportIds, id].slice(0, MAX_REPORTS);
    updatePackage(activePackage.id, { reportIds });
  };

  const selectAllVisible = () => {
    if (!activePackage) return;
    const ids = visiblePickerReports.map(reportId);
    const everySelected = ids.length > 0 && ids.every((id) => activePackage.reportIds.includes(id));
    const reportIds = everySelected ? activePackage.reportIds.filter((id) => !ids.includes(id)) : [...new Set([...activePackage.reportIds, ...ids])].slice(0, MAX_REPORTS);
    updatePackage(activePackage.id, { reportIds });
  };

  const copySummary = async () => {
    if (!activePackage) return;
    const progress = getStepProgress(activePackage);
    const summary = `${activePackage.title} · ${progress.percentage}% ready · ${activePackage.reportIds.length} reports · Audience: ${activePackage.audience || "Not set"}`;
    try { await navigator.clipboard.writeText(summary); setFeedback("Package summary copied."); } catch { setFeedback("Could not copy the summary in this browser."); }
  };

  const resetPackage = () => {
    if (!activePackage) return;
    updatePackage(activePackage.id, { steps: emptySteps(), summary: "", nextSteps: "", reportIds: [] });
    setFeedback("Package preparation fields reset.");
  };

  const selectedVisibleCount = activePackage ? visiblePickerReports.filter((report) => activePackage.reportIds.includes(reportId(report))).length : 0;
  const allVisibleSelected = visiblePickerReports.length > 0 && selectedVisibleCount === visiblePickerReports.length;

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
      <header className="border-b border-slate-200/80 bg-gradient-to-r from-violet-50/80 via-white to-sky-50/60 p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-violet-100 bg-white text-violet-700 shadow-sm"><PackageCheck size={19} aria-hidden="true" /></span>
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">Handoff builder</span>
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">Report handoff packages</h2>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">Bundle a focused set of reports with audience context, ownership, and next steps. Packages are private to this browser account and do not change report data.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={copySummary} disabled={!activePackage} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-600 hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"><Copy size={12} />Copy summary</button>
            <button type="button" onClick={() => activePackage && exportPackage(activePackage, validReports)} disabled={!activePackage} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-600 hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"><Download size={12} />Export package</button>
            <button type="button" onClick={() => setShowCreate((current) => !current)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[10px] font-semibold text-white hover:bg-violet-700"><FolderKanban size={12} />New package</button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <MetricCard label="Packages" value={metrics.total} detail="Saved locally" tone="border-slate-200 bg-white text-slate-800" icon={FolderKanban} />
          <MetricCard label="Ready" value={metrics.ready} detail="All handoff steps complete" tone="border-emerald-200 bg-emerald-50 text-emerald-800" icon={BadgeCheck} />
          <MetricCard label="In progress" value={metrics.draft} detail="Still being prepared" tone="border-amber-200 bg-amber-50 text-amber-800" icon={CircleDashed} />
          <MetricCard label="Reports linked" value={metrics.reports} detail="Across all packages" tone="border-violet-200 bg-violet-50 text-violet-800" icon={ListChecks} />
          <MetricCard label="Average ready" value={`${metrics.average}%`} detail="Package completion" tone="border-sky-200 bg-sky-50 text-sky-800" icon={Sparkles} />
        </div>
      </header>

      {showCreate && (
        <div className="border-b border-violet-100 bg-violet-50/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold text-slate-800">Create a handoff package</p><p className="mt-1 text-[10px] text-slate-500">Add the receiving audience and owner now; you can edit the details later.</p></div><button type="button" onClick={() => setShowCreate(false)} aria-label="Close package form" className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700"><X size={14} /></button></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && createPackage()} placeholder="Package title" className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100" />
            <input value={newAudience} onChange={(event) => setNewAudience(event.target.value)} placeholder="Audience or team" className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100" />
            <div className="flex gap-2"><input value={newOwner} onChange={(event) => setNewOwner(event.target.value)} placeholder="Owner" className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100" /><button type="button" onClick={createPackage} className="inline-flex h-9 items-center gap-1 rounded-lg bg-violet-600 px-3 text-[10px] font-semibold text-white hover:bg-violet-700"><Check size={12} />Create</button></div>
          </div>
        </div>
      )}

      <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(240px,0.65fr)_minmax(0,1.35fr)]">
        <aside className="space-y-3">
          {storageError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] text-amber-800">{storageError}</p>}
          {feedback && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[10px] text-emerald-800">{feedback}</p>}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3">
            <div className="flex items-center justify-between gap-2"><div><p className="text-xs font-semibold text-slate-800">Saved packages</p><p className="mt-1 text-[9px] text-slate-500">{visiblePackages.length} matching packages</p></div><FolderKanban size={14} className="text-violet-600" /></div>
            <div className="mt-3 grid gap-2">
              <label className="relative block"><span className="sr-only">Search packages</span><Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={packageSearch} onChange={(event) => setPackageSearch(event.target.value)} placeholder="Search packages…" className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-7 pr-2 text-[10px] outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100" /></label>
              <SelectField label="Package state" value={packageFilter} options={[{ value: "all", label: "All package states" }, { value: "new", label: "Not started" }, { value: "draft", label: "In progress" }, { value: "ready", label: "Ready to share" }]} onChange={setPackageFilter} />
            </div>
          </div>
          {visiblePackages.length ? <div className="max-h-[650px] space-y-2 overflow-y-auto pr-1">{visiblePackages.map((item) => <PackageCard key={item.id} packageRecord={item} reports={validReports} active={item.id === activeId} onSelect={() => setActiveId(item.id)} onExport={() => exportPackage(item, validReports)} onDelete={() => deletePackage(item.id)} />)}</div> : <EmptyState hasReports={validReports.length > 0} onCreate={() => setShowCreate(true)} />}
        </aside>

        <main className="min-w-0 space-y-3">
          {activePackage ? (
            <>
              <section className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words text-sm font-semibold text-slate-900">{activePackage.title}</h3><StatusBadge state={getPackageState(activePackage)} /></div><p className="mt-1 text-[10px] text-slate-500">{activePackage.reportIds.length} linked reports · {activePackage.audience || "Audience not set"} · {activePackage.owner || "Owner not set"}</p></div>
                  <button type="button" onClick={resetPackage} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[9px] font-semibold text-slate-400 hover:bg-rose-50 hover:text-rose-600">Reset package</button>
                </div>
                <div className="mt-3 flex items-center gap-2"><ProgressBar percentage={getStepProgress(activePackage).percentage} /><span className="text-[10px] font-semibold tabular-nums text-slate-600">{getStepProgress(activePackage).percentage}% ready</span></div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2"><label><span className="mb-1 block text-[9px] font-semibold text-slate-500">Audience</span><input value={activePackage.audience} onChange={(event) => updatePackage(activePackage.id, { audience: event.target.value.slice(0, 120) })} placeholder="Receiving team or stakeholder" className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-[10px] outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100" /></label><label><span className="mb-1 block text-[9px] font-semibold text-slate-500">Owner</span><input value={activePackage.owner} onChange={(event) => updatePackage(activePackage.id, { owner: event.target.value.slice(0, 120) })} placeholder="Handoff owner" className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-[10px] outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100" /></label></div>
                <label className="mt-3 block"><span className="mb-1 block text-[9px] font-semibold text-slate-500">Executive summary</span><textarea value={activePackage.summary} onChange={(event) => updatePackage(activePackage.id, { summary: event.target.value.slice(0, MAX_TEXT) })} rows={3} maxLength={MAX_TEXT} placeholder="What should the recipient understand first?" className="w-full resize-y rounded-lg border border-slate-200 px-2.5 py-2 text-[10px] leading-4 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100" /></label>
                <label className="mt-3 block"><span className="mb-1 block text-[9px] font-semibold text-slate-500">Next steps</span><textarea value={activePackage.nextSteps} onChange={(event) => updatePackage(activePackage.id, { nextSteps: event.target.value.slice(0, MAX_TEXT) })} rows={3} maxLength={MAX_TEXT} placeholder="List actions, owners, or decisions needed next…" className="w-full resize-y rounded-lg border border-slate-200 px-2.5 py-2 text-[10px] leading-4 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100" /></label>
              </section>
              <section className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 sm:p-4"><div className="flex items-start justify-between gap-2"><div><h4 className="text-xs font-semibold text-slate-800">Handoff readiness</h4><p className="mt-1 text-[9px] text-slate-500">Complete each step before sharing the package.</p></div><span className="text-[9px] text-slate-400">{getStepProgress(activePackage).complete}/{getStepProgress(activePackage).total} complete</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{HANDOFF_STEPS.map((step) => <StepRow key={step.id} step={step} checked={activePackage.steps[step.id]} onToggle={() => toggleStep(step.id)} />)}</div></section>
              <section className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="text-xs font-semibold text-slate-800">Attach reports</h4><p className="mt-1 text-[9px] text-slate-500">Select the reports that belong in this handoff.</p></div><span className="text-[9px] font-semibold text-violet-700">{activePackage.reportIds.length} linked</span></div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><label className="relative block sm:col-span-2 lg:col-span-1"><span className="sr-only">Search reports to attach</span><Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={reportSearch} onChange={(event) => { setReportSearch(event.target.value); setReportVisibleCount(INITIAL_VISIBLE); }} placeholder="Search reports…" className="h-9 w-full rounded-lg border border-slate-200 pl-7 pr-2 text-[10px] outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100" /></label><SelectField label="Report status" value={reportStatusFilter} options={STATUS_FILTERS} onChange={(value) => { setReportStatusFilter(value); setReportVisibleCount(INITIAL_VISIBLE); }} /><SelectField label="Report severity" value={reportSeverityFilter} options={SEVERITY_FILTERS} onChange={(value) => { setReportSeverityFilter(value); setReportVisibleCount(INITIAL_VISIBLE); }} /><SelectField label="Sort reports" value={reportSort} options={SORT_OPTIONS} onChange={setReportSort} /></div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[9px] text-slate-500"><span>{visiblePickerReports.length} visible of {pickerReports.length} matching reports</span><button type="button" onClick={selectAllVisible} disabled={!visiblePickerReports.length} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-40">{allVisibleSelected ? "Remove visible" : "Attach visible"}</button></div>
                <div className="mt-3 space-y-1.5">{visiblePickerReports.map((report) => <ReportPickerRow key={reportId(report)} report={report} selected={activePackage.reportIds.includes(reportId(report))} onToggle={() => toggleReport(reportId(report))} />)}</div>
                {reportVisibleCount < pickerReports.length && <button type="button" onClick={() => setReportVisibleCount((count) => Math.min(count + INITIAL_VISIBLE, pickerReports.length))} className="mt-3 w-full rounded-lg border border-slate-200 bg-white py-2 text-[9px] font-semibold text-slate-600 hover:border-violet-200 hover:text-violet-700">Show more reports</button>}
              </section>
            </>
          ) : <EmptyState hasReports={validReports.length > 0} onCreate={() => setShowCreate(true)} />}
        </main>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-[9px] text-slate-400 sm:px-5"><span className="inline-flex items-center gap-1"><UsersRound size={11} />Private to {normalizedEmail || "this browser"}</span><span className="inline-flex items-center gap-1"><ShieldAlert size={11} />Advisory only · no server changes</span></footer>
    </section>
  );
}
