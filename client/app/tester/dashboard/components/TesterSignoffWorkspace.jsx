"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Copy,
  Download,
  FileCheck2,
  Filter,
  Flag,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";

const STORAGE_PREFIX = "tester-signoff-workspace-v1";
const MAX_PACKAGES = 30;
const MAX_REPORTS = 100;
const INITIAL_VISIBLE = 8;

const DECISIONS = [
  { value: "draft", label: "Draft" },
  { value: "review", label: "In review" },
  { value: "go", label: "Go" },
  { value: "conditional", label: "Conditional go" },
  { value: "hold", label: "Hold" },
];

const DECISION_FILTERS = [
  { value: "all", label: "All decisions" },
  ...DECISIONS,
];

const STATUS_OPTIONS = [
  { value: "all", label: "All reports" },
  { value: "open", label: "Open reports" },
  { value: "closed", label: "Resolved reports" },
];

const SEVERITY_OPTIONS = [
  { value: "all", label: "All severities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const CHECKS = [
  { id: "scope", label: "Release scope is confirmed", detail: "The tested area and included reports are understood." },
  { id: "critical", label: "Critical risks are reviewed", detail: "No unreviewed critical or blocker concerns remain." },
  { id: "evidence", label: "Evidence is attached", detail: "The decision has supporting test notes or report context." },
  { id: "regression", label: "Regression coverage is checked", detail: "Nearby flows were considered for unintended impact." },
  { id: "owners", label: "Decision owners are named", detail: "A tester and receiving team are identified." },
  { id: "rollback", label: "Fallback is understood", detail: "A mitigation or rollback path is documented." },
];

const SORT_OPTIONS = [
  { value: "updated", label: "Recently updated" },
  { value: "decision", label: "Decision A–Z" },
  { value: "name", label: "Name A–Z" },
];

function clean(value, fallback = "", limit = 1400) {
  if (typeof value !== "string") return fallback;
  const result = value.trim();
  return result ? result.slice(0, limit) : fallback;
}

function reportId(report) {
  const value = report?._id ?? report?.id;
  return value === null || value === undefined ? "" : String(value).trim();
}

function reportTitle(report) {
  return clean(report?.title || report?.summary, "Untitled report", 240);
}

function reportCategory(report) {
  return clean(report?.category, "Uncategorized", 100);
}

function reportSeverity(report) {
  return clean(report?.severity, "Unspecified", 40).toLowerCase();
}

function reportStatus(report) {
  return clean(report?.status).toLowerCase() === "closed" ? "closed" : "open";
}

function reportDate(report) {
  const value = report?.createdAt || report?.created_at || report?.reportedAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "Date unavailable";
  return value.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "Not recorded";
  return value.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function severityRank(value) {
  return { critical: 0, high: 1, medium: 2, low: 3, unspecified: 4 }[value] ?? 5;
}

function makePackage() {
  const now = new Date().toISOString();
  return {
    id: `signoff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "Untitled release decision",
    release: "",
    owner: "",
    recipient: "",
    decision: "draft",
    summary: "",
    conditions: "",
    followup: "",
    reportIds: [],
    checks: Object.fromEntries(CHECKS.map((check) => [check.id, false])),
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

function normalizePackage(value) {
  if (!value || typeof value !== "object") return null;
  return {
    ...makePackage(),
    ...value,
    id: clean(value.id, `signoff-${Date.now()}`, 180),
    name: clean(value.name, "Untitled release decision", 140),
    release: clean(value.release, "", 120),
    owner: clean(value.owner, "", 120),
    recipient: clean(value.recipient, "", 120),
    decision: DECISIONS.some((item) => item.value === value.decision) ? value.decision : "draft",
    summary: clean(value.summary, "", 1400),
    conditions: clean(value.conditions, "", 1400),
    followup: clean(value.followup, "", 1400),
    notes: clean(value.notes, "", 1400),
    reportIds: Array.isArray(value.reportIds) ? value.reportIds.filter((item) => typeof item === "string").slice(0, MAX_REPORTS) : [],
    checks: value.checks && typeof value.checks === "object"
      ? Object.fromEntries(CHECKS.map((check) => [check.id, value.checks[check.id] === true]))
      : Object.fromEntries(CHECKS.map((check) => [check.id, false])),
    createdAt: clean(value.createdAt, new Date().toISOString(), 60),
    updatedAt: clean(value.updatedAt, new Date().toISOString(), 60),
  };
}

function loadPackages(email) {
  if (typeof window === "undefined" || !email) return [];
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${email}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizePackage).filter(Boolean).slice(0, MAX_PACKAGES) : [];
  } catch {
    return [];
  }
}

function savePackages(email, packages) {
  if (typeof window === "undefined" || !email) return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}:${email}`, JSON.stringify(packages.slice(0, MAX_PACKAGES)));
  } catch {
    // Sign-off notes remain available for the current view.
  }
}

function packageProgress(value) {
  const complete = CHECKS.filter((check) => value.checks[check.id]).length;
  return Math.round((complete / CHECKS.length) * 100);
}

function csvCell(value) {
  const raw = String(value ?? "").replace(/\r\n?/g, "\n");
  const safe = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

function downloadFile(value, name, type) {
  const blob = new Blob(["\uFEFF", value], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function copyText(value) {
  if (!navigator.clipboard?.writeText) return Promise.reject(new Error("Unavailable"));
  return navigator.clipboard.writeText(value);
}

function buildSummary(packageValue, reports) {
  const attached = reports.filter((report) => packageValue.reportIds.includes(report.id));
  return [
    `Release decision: ${packageValue.name}`,
    `Release: ${packageValue.release || "Not specified"}`,
    `Decision: ${DECISIONS.find((item) => item.value === packageValue.decision)?.label || packageValue.decision}`,
    `Owner: ${packageValue.owner || "Unassigned"}`,
    `Recipient: ${packageValue.recipient || "Unassigned"}`,
    `Readiness: ${packageProgress(packageValue)}%`,
    `Reports attached: ${attached.length}`,
    "",
    `Summary: ${packageValue.summary || "Not documented"}`,
    `Conditions: ${packageValue.conditions || "None documented"}`,
    `Follow-up: ${packageValue.followup || "Not documented"}`,
    "",
    "Checks:",
    ...CHECKS.map((check) => `- ${packageValue.checks[check.id] ? "[x]" : "[ ]"} ${check.label}`),
    "",
    "Reports:",
    ...attached.map((report) => `- ${report.title} (${report.severity}, ${report.status})`),
    "",
    `Notes: ${packageValue.notes || "No notes recorded"}`,
  ].join("\n");
}

function buildCsv(packages) {
  const header = ["Decision package", "Release", "Decision", "Owner", "Recipient", "Readiness", "Reports", "Updated"];
  const rows = packages.map((item) => [item.name, item.release, item.decision, item.owner, item.recipient, `${packageProgress(item)}%`, item.reportIds.length, item.updatedAt]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function SelectControl({ label, value, options, onChange }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-[10px] font-semibold text-slate-600 outline-none hover:border-cyan-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown size={12} aria-hidden="true" className="pointer-events-none absolute right-2.5 text-slate-400" />
    </label>
  );
}

function Metric({ label, value, detail, tone }) {
  return (
    <article className="rounded-xl border border-slate-200/80 bg-white p-3">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-[9px] text-slate-400">{detail}</p>
      <span className={`mt-2 inline-flex h-1 w-8 rounded-full ${tone}`} />
    </article>
  );
}

function DecisionBadge({ decision }) {
  const tones = {
    draft: "bg-slate-100 text-slate-600",
    review: "bg-amber-50 text-amber-700",
    go: "bg-emerald-50 text-emerald-700",
    conditional: "bg-cyan-50 text-cyan-700",
    hold: "bg-rose-50 text-rose-700",
  };
  const label = DECISIONS.find((item) => item.value === decision)?.label || "Draft";
  return <span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${tones[decision] || tones.draft}`}>{label}</span>;
}

function SeverityBadge({ severity }) {
  const tones = { critical: "bg-rose-100 text-rose-700", high: "bg-orange-50 text-orange-700", medium: "bg-amber-50 text-amber-700", low: "bg-sky-50 text-sky-700", unspecified: "bg-slate-100 text-slate-600" };
  return <span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${tones[severity] || tones.unspecified}`}>{severity}</span>;
}

function TextField({ label, value, onChange, placeholder, multiline = false }) {
  const className = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";
  return (
    <label className="block">
      <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {multiline ? <textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${className} resize-y leading-4`} /> : <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={className} />}
    </label>
  );
}

function PackageCard({ item, selected, reportCount, onSelect, onDelete }) {
  return (
    <article className={`rounded-2xl border p-3 transition ${selected ? "border-cyan-200 bg-cyan-50/60" : "border-slate-200/80 bg-white hover:border-slate-300"}`}>
      <button type="button" onClick={onSelect} className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-slate-800">{item.name}</p><p className="mt-1 truncate text-[9px] text-slate-400">{item.release || "No release"} · {item.owner || "Unassigned"}</p></div><DecisionBadge decision={item.decision} /></div>
        <div className="mt-3 flex items-center justify-between text-[9px] text-slate-500"><span>{formatNumber(reportCount)} reports</span><span className="font-semibold text-cyan-700">{packageProgress(item)}% ready</span></div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${packageProgress(item)}%` }} /></div>
      </button>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2"><span className="text-[8px] text-slate-400">Updated {formatDateTime(new Date(item.updatedAt))}</span><button type="button" onClick={onDelete} aria-label={`Delete ${item.name}`} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={12} aria-hidden="true" /></button></div>
    </article>
  );
}

function ReportRow({ report, selected, onToggle, onOpenReport }) {
  return (
    <article className={`rounded-xl border p-3 transition ${selected ? "border-cyan-200 bg-cyan-50/50" : "border-slate-200/80 bg-white hover:border-slate-300"}`}>
      <div className="flex items-start gap-2.5"><input type="checkbox" checked={selected} onChange={onToggle} aria-label={`${selected ? "Remove" : "Add"} ${report.title}`} className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 accent-cyan-600 focus:ring-cyan-500" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-slate-800">{report.title}</p><p className="mt-1 text-[8px] text-slate-400">{report.category} · {formatDate(report.date)}</p></div><div className="flex items-center gap-1"><SeverityBadge severity={report.severity} /><span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${report.status === "closed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{report.status === "closed" ? "Resolved" : "Open"}</span></div></div><div className="mt-2 flex items-center justify-between gap-2"><span className="truncate text-[8px] text-slate-400">{report.id ? `#${report.id.slice(-10)}` : "No report ID"}</span>{onOpenReport && <button type="button" onClick={() => onOpenReport(report.report)} className="rounded-lg px-2 py-1 text-[9px] font-semibold text-cyan-700 hover:bg-cyan-100">Open report</button>}</div></div></div>
    </article>
  );
}

function CheckRow({ check, checked, onChange }) {
  return <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 hover:border-cyan-200"><input type="checkbox" checked={checked} onChange={onChange} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 accent-cyan-600 focus:ring-cyan-500" /><span><span className="block text-[10px] font-semibold text-slate-700">{check.label}</span><span className="mt-0.5 block text-[9px] leading-4 text-slate-400">{check.detail}</span></span></label>;
}

function GuidancePanel({ packageValue, reportCount }) {
  const missingChecks = CHECKS.filter((check) => !packageValue.checks[check.id]);
  const guidance = [];

  if (!packageValue.release) {
    guidance.push({
      tone: "amber",
      title: "Name the release target",
      detail: "Add a version, build, or release window so the decision has a clear boundary.",
    });
  }
  if (!packageValue.owner || !packageValue.recipient) {
    guidance.push({
      tone: "violet",
      title: "Identify the decision path",
      detail: "Name both the decision owner and the team receiving the recommendation.",
    });
  }
  if (!reportCount) {
    guidance.push({
      tone: "rose",
      title: "Attach supporting evidence",
      detail: "Select at least one report so the recommendation can be traced to observed behavior.",
    });
  }
  if (!packageValue.summary) {
    guidance.push({
      tone: "sky",
      title: "Write the recommendation",
      detail: "Explain why the selected decision is appropriate for the current evidence.",
    });
  }
  if (missingChecks.length) {
    guidance.push({
      tone: "slate",
      title: `${missingChecks.length} sign-off checks remain`,
      detail: `Next suggested check: ${missingChecks[0].label}.`,
    });
  }
  if (!guidance.length) {
    guidance.push({
      tone: "emerald",
      title: "Decision context is complete",
      detail: "The package has the core context needed for a clear review.",
    });
  }

  const tones = {
    amber: "border-amber-100 bg-amber-50/70 text-amber-800",
    violet: "border-violet-100 bg-violet-50/70 text-violet-800",
    rose: "border-rose-100 bg-rose-50/70 text-rose-800",
    sky: "border-sky-100 bg-sky-50/70 text-sky-800",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    emerald: "border-emerald-100 bg-emerald-50/70 text-emerald-800",
  };

  return (
    <aside className="rounded-2xl border border-cyan-100 bg-cyan-50/40 p-3.5">
      <div className="flex items-start gap-2">
        <Sparkles size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-cyan-600" />
        <div>
          <h3 className="text-[10px] font-semibold text-cyan-900">Decision guidance</h3>
          <p className="mt-1 text-[9px] leading-4 text-cyan-800/75">
            These prompts are private suggestions based on the current package.
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {guidance.map((item) => (
          <div key={item.title} className={`rounded-xl border px-3 py-2.5 ${tones[item.tone]}`}>
            <p className="text-[9px] font-semibold">{item.title}</p>
            <p className="mt-1 text-[9px] leading-4 opacity-80">{item.detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-cyan-100 pt-3">
        <p className="text-[8px] leading-4 text-cyan-800/70">
          A local readiness score does not approve a release or change any
          report status. Use it as a conversation aid with the responsible
          release owner.
        </p>
      </div>
    </aside>
  );
}

export default function TesterSignoffWorkspace({ reports = [], email = "", onOpenReport }) {
  const [packages, setPackages] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [decisionFilter, setDecisionFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("updated");
  const [showAllReports, setShowAllReports] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  const reportEntries = useMemo(() => {
    const seen = new Set();
    return (Array.isArray(reports) ? reports : []).filter((report) => report && typeof report === "object").map((report, index) => ({ id: reportId(report) || `${reportTitle(report)}-${index}`, report, title: reportTitle(report), category: reportCategory(report), severity: reportSeverity(report), status: reportStatus(report), date: reportDate(report) })).filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
  }, [reports]);

  useEffect(() => {
    const loaded = loadPackages(clean(email).toLowerCase());
    setPackages(loaded);
    setSelectedId(loaded[0]?.id || "");
    setStorageLoaded(true);
  }, [email]);

  useEffect(() => {
    if (storageLoaded) savePackages(clean(email).toLowerCase(), packages);
  }, [email, packages, storageLoaded]);

  const selectedPackage = useMemo(() => packages.find((item) => item.id === selectedId) || null, [packages, selectedId]);
  const categoryOptions = useMemo(() => [{ value: "all", label: "All categories" }, ...[...new Set(reportEntries.map((report) => report.category))].sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: value }))], [reportEntries]);
  const filteredPackages = useMemo(() => {
    const query = search.trim().toLowerCase();
    return packages.filter((item) => decisionFilter === "all" || item.decision === decisionFilter).filter((item) => !query || [item.name, item.release, item.owner, item.recipient, item.summary].join(" ").toLowerCase().includes(query)).sort((left, right) => {
      if (sortBy === "name") return left.name.localeCompare(right.name);
      if (sortBy === "decision") return left.decision.localeCompare(right.decision);
      return right.updatedAt.localeCompare(left.updatedAt);
    });
  }, [decisionFilter, packages, search, sortBy]);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reportEntries.filter((report) => reportStatusFilter === "all" || report.status === reportStatusFilter).filter((report) => severityFilter === "all" || report.severity === severityFilter).filter((report) => categoryFilter === "all" || report.category === categoryFilter).filter((report) => !query || [report.id, report.title, report.category, report.severity].join(" ").toLowerCase().includes(query)).sort((left, right) => {
      if (sortBy === "name") return left.title.localeCompare(right.title);
      if (sortBy === "decision") return left.category.localeCompare(right.category);
      return severityRank(left.severity) - severityRank(right.severity);
    });
  }, [categoryFilter, reportEntries, reportStatusFilter, search, severityFilter, sortBy]);

  const selectedReports = selectedPackage ? reportEntries.filter((report) => selectedPackage.reportIds.includes(report.id)) : [];
  const draftCount = packages.filter((item) => item.decision === "draft").length;
  const goCount = packages.filter((item) => item.decision === "go").length;
  const holdCount = packages.filter((item) => item.decision === "hold").length;
  const hasFilters = decisionFilter !== "all" || reportStatusFilter !== "all" || severityFilter !== "all" || categoryFilter !== "all" || Boolean(search.trim());

  const updatePackage = (changes) => {
    if (!selectedId) return;
    setPackages((current) => current.map((item) => item.id === selectedId ? { ...item, ...changes, updatedAt: new Date().toISOString() } : item));
  };

  const createPackage = () => {
    if (packages.length >= MAX_PACKAGES) return;
    const item = makePackage();
    setPackages((current) => [item, ...current]);
    setSelectedId(item.id);
  };

  const deletePackage = (id) => {
    const next = packages.filter((item) => item.id !== id);
    setPackages(next);
    if (selectedId === id) setSelectedId(next[0]?.id || "");
  };

  const toggleReport = (id) => {
    if (!selectedPackage) return;
    const ids = new Set(selectedPackage.reportIds);
    if (ids.has(id)) ids.delete(id);
    else if (ids.size < MAX_REPORTS) ids.add(id);
    updatePackage({ reportIds: Array.from(ids) });
  };

  const resetFilters = () => {
    setDecisionFilter("all");
    setReportStatusFilter("all");
    setSeverityFilter("all");
    setCategoryFilter("all");
    setSearch("");
    setSortBy("updated");
  };

  const copySummary = () => {
    if (!selectedPackage) return;
    copyText(buildSummary(selectedPackage, reportEntries)).then(() => {
      setCopyMessage("Copied");
      window.setTimeout(() => setCopyMessage(""), 1600);
    }).catch(() => setCopyMessage("Unavailable"));
  };

  const exportPackages = () => {
    if (packages.length) downloadFile(buildCsv(packages), "tester-signoff-packages.csv", "text/csv;charset=utf-8");
  };

  const visibleReports = showAllReports ? filteredReports : filteredReports.slice(0, INITIAL_VISIBLE);

  return (
    <section aria-labelledby="tester-signoff-workspace-heading" className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
      <header className="border-b border-slate-100 bg-gradient-to-br from-cyan-50/70 via-white to-blue-50/50 p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><ClipboardCheck size={18} aria-hidden="true" /></span><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[0.17em] text-cyan-700">Private release workspace</p><h2 id="tester-signoff-workspace-heading" className="mt-1 text-base font-semibold tracking-tight text-slate-950">Release sign-off workspace</h2><p className="mt-1 max-w-2xl text-[10px] leading-4 text-slate-500">Prepare private release decisions with evidence, conditions, owners, and a clear next step.</p></div></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={exportPackages} disabled={!packages.length} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[9px] font-semibold text-slate-600 hover:border-cyan-200 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-45"><Download size={13} aria-hidden="true" /> Export decisions</button><button type="button" onClick={createPackage} disabled={packages.length >= MAX_PACKAGES} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-cyan-600 px-3 text-[9px] font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-45"><Plus size={13} aria-hidden="true" /> New decision</button></div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3"><Metric label="Draft decisions" value={formatNumber(draftCount)} detail="Still being prepared" tone="bg-slate-500" /><Metric label="Go decisions" value={formatNumber(goCount)} detail="Ready to proceed" tone="bg-emerald-500" /><Metric label="Hold decisions" value={formatNumber(holdCount)} detail="Requires follow-up" tone="bg-rose-500" /></div>
      </header>

      <div className="space-y-4 p-3 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-2.5 sm:flex-row sm:flex-wrap sm:items-center"><span className="inline-flex items-center gap-1.5 px-1 text-[11px] font-semibold text-slate-500"><Filter size={13} aria-hidden="true" /> Filter decisions</span><SelectControl label="Filter decisions" value={decisionFilter} options={DECISION_FILTERS} onChange={setDecisionFilter} /><SelectControl label="Filter reports by status" value={reportStatusFilter} options={STATUS_OPTIONS} onChange={setReportStatusFilter} /><SelectControl label="Filter reports by severity" value={severityFilter} options={SEVERITY_OPTIONS} onChange={setSeverityFilter} /><SelectControl label="Filter reports by category" value={categoryFilter} options={categoryOptions} onChange={setCategoryFilter} /><SelectControl label="Sort sign-off content" value={sortBy} options={SORT_OPTIONS} onChange={setSortBy} /><label className="relative min-w-[190px] flex-1 sm:max-w-xs"><span className="sr-only">Search sign-off decisions and reports</span><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search decisions or reports" className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />{search && <button type="button" onClick={() => setSearch("")} aria-label="Clear sign-off search" className="absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={12} aria-hidden="true" /></button>}</label>{hasFilters && <button type="button" onClick={resetFilters} className="inline-flex h-9 items-center justify-center gap-1 rounded-lg px-2 text-[10px] font-semibold text-slate-500 hover:bg-white hover:text-cyan-700"><X size={13} aria-hidden="true" /> Reset</button>}</div>

        <div className="grid gap-4 xl:grid-cols-[minmax(230px,0.75fr)_minmax(0,1.8fr)]">
          <div className="space-y-3"><div className="flex items-center justify-between px-1"><div><p className="text-xs font-semibold text-slate-800">Decision packages</p><p className="mt-1 text-[9px] text-slate-400">{formatNumber(filteredPackages.length)} matching decisions</p></div><button type="button" onClick={createPackage} aria-label="Create release decision" className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-100"><Plus size={14} aria-hidden="true" /></button></div>{filteredPackages.length ? <div className="space-y-2">{filteredPackages.map((item) => <PackageCard key={item.id} item={item} reportCount={item.reportIds.length} selected={item.id === selectedId} onSelect={() => setSelectedId(item.id)} onDelete={() => deletePackage(item.id)} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center"><ClipboardCheck size={20} aria-hidden="true" className="mx-auto text-slate-300" /><p className="mt-2 text-[10px] font-semibold text-slate-600">No decision packages yet</p><button type="button" onClick={createPackage} className="mt-3 rounded-lg bg-cyan-600 px-3 py-2 text-[9px] font-semibold text-white hover:bg-cyan-700">Create a decision</button></div>}</div>

          {selectedPackage ? <div className="min-w-0 space-y-4"><div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3 sm:p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-700">Selected decision</p><p className="mt-1 truncate text-sm font-semibold text-slate-900">{selectedPackage.name}</p></div><div className="flex items-center gap-2"><DecisionBadge decision={selectedPackage.decision} /><button type="button" onClick={copySummary} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-semibold text-slate-600 hover:border-cyan-200 hover:text-cyan-700">{copyMessage === "Copied" ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}{copyMessage || "Copy decision"}</button></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><TextField label="Decision name" value={selectedPackage.name} onChange={(value) => updatePackage({ name: value })} placeholder="Release 2.4 acceptance" /><TextField label="Release or build" value={selectedPackage.release} onChange={(value) => updatePackage({ release: value })} placeholder="Version or build number" /><label className="block"><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">Decision</span><SelectControl label="Release decision" value={selectedPackage.decision} options={DECISIONS} onChange={(value) => updatePackage({ decision: value })} /></label><TextField label="Decision owner" value={selectedPackage.owner} onChange={(value) => updatePackage({ owner: value })} placeholder="Tester or release owner" /><TextField label="Receiving team" value={selectedPackage.recipient} onChange={(value) => updatePackage({ recipient: value })} placeholder="Team receiving this decision" /><div className="sm:col-span-2"><TextField label="Decision summary" value={selectedPackage.summary} onChange={(value) => updatePackage({ summary: value })} placeholder="Explain the recommendation and confidence." multiline /></div><TextField label="Conditions" value={selectedPackage.conditions} onChange={(value) => updatePackage({ conditions: value })} placeholder="What must remain true?" multiline /><TextField label="Follow-up" value={selectedPackage.followup} onChange={(value) => updatePackage({ followup: value })} placeholder="What happens next?" multiline /><div className="sm:col-span-2"><TextField label="Private notes" value={selectedPackage.notes} onChange={(value) => updatePackage({ notes: value })} placeholder="Capture context that should remain private." multiline /></div></div><div className="mt-4 flex items-center justify-between"><div><p className="text-[10px] font-semibold text-slate-700">Decision readiness</p><p className="mt-1 text-[9px] text-slate-400">{packageProgress(selectedPackage)}% of sign-off checks complete</p></div><span className="text-sm font-bold text-cyan-700">{packageProgress(selectedPackage)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${packageProgress(selectedPackage)}%` }} /></div></div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.75fr)]"><div className="space-y-3"><div className="flex items-center justify-between px-1"><div><p className="text-xs font-semibold text-slate-800">Sign-off checks</p><p className="mt-1 text-[9px] text-slate-400">Make the decision evidence-based.</p></div><BadgeCheck size={17} aria-hidden="true" className="text-cyan-500" /></div><div className="space-y-2">{CHECKS.map((check) => <CheckRow key={check.id} check={check} checked={Boolean(selectedPackage.checks[check.id])} onChange={(event) => updatePackage({ checks: { ...selectedPackage.checks, [check.id]: event.target.checked } })} />)}</div><GuidancePanel packageValue={selectedPackage} reportCount={selectedReports.length} /></div><div className="space-y-3"><div className="flex items-center justify-between px-1"><div><p className="text-xs font-semibold text-slate-800">Evidence set</p><p className="mt-1 text-[9px] text-slate-400">{formatNumber(selectedReports.length)} reports attached</p></div><FileCheck2 size={17} aria-hidden="true" className="text-emerald-500" /></div>{selectedReports.length ? <div className="space-y-2">{selectedReports.slice(0, 6).map((report) => <div key={report.id} className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5"><CheckCircle2 size={14} aria-hidden="true" className="shrink-0 text-emerald-500" /><span className="min-w-0 flex-1 truncate text-[9px] font-semibold text-slate-700">{report.title}</span><SeverityBadge severity={report.severity} /></div>)}</div> : <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center"><FileCheck2 size={18} aria-hidden="true" className="mx-auto text-slate-300" /><p className="mt-2 text-[9px] text-slate-500">Attach reports below as evidence.</p></div>}<div className="rounded-xl border border-cyan-100 bg-cyan-50/60 p-3"><p className="flex items-center gap-1.5 text-[9px] font-semibold text-cyan-800"><Sparkles size={12} aria-hidden="true" /> Browser-local only</p><p className="mt-1 text-[9px] leading-4 text-cyan-700/80">This decision workspace does not modify server-side report status or release data.</p></div></div></div>

            <div className="space-y-3 border-t border-slate-100 pt-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold text-slate-800">Attach evidence reports</p><p className="mt-1 text-[9px] text-slate-400">Choose reports that support this release decision.</p></div><span className="text-[9px] font-semibold text-slate-500">{formatNumber(filteredReports.length)} matching reports</span></div>{visibleReports.length ? <div className="grid gap-2 md:grid-cols-2">{visibleReports.map((report) => <ReportRow key={report.id} report={report} selected={selectedPackage.reportIds.includes(report.id)} onToggle={() => toggleReport(report.id)} onOpenReport={onOpenReport} />)}</div> : <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-[10px] text-slate-500">No reports match the current filters.</p>}{!showAllReports && filteredReports.length > INITIAL_VISIBLE && <button type="button" onClick={() => setShowAllReports(true)} className="mx-auto flex items-center gap-1 rounded-lg px-3 py-2 text-[10px] font-semibold text-cyan-700 hover:bg-cyan-50">Show all {formatNumber(filteredReports.length)} reports <ArrowDownAZ size={12} aria-hidden="true" /></button>}{showAllReports && filteredReports.length > INITIAL_VISIBLE && <button type="button" onClick={() => setShowAllReports(false)} className="mx-auto flex items-center gap-1 rounded-lg px-3 py-2 text-[10px] font-semibold text-slate-500 hover:bg-slate-50">Show fewer reports <ArrowUpAZ size={12} aria-hidden="true" /></button>}</div>
          </div> : <div className="grid min-h-[420px] place-items-center rounded-2xl border border-dashed border-slate-200 p-8 text-center"><div><ClipboardCheck size={28} aria-hidden="true" className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">Prepare a release decision</p><p className="mx-auto mt-1 max-w-sm text-[10px] leading-4 text-slate-500">Create a private decision package, complete its checks, and attach evidence reports.</p><button type="button" onClick={createPackage} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-[9px] font-semibold text-white hover:bg-cyan-700"><Plus size={13} aria-hidden="true" /> Start sign-off</button></div></div>}
        </div>
      </div>
    </section>
  );
}
