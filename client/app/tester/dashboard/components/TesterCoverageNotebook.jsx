"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Copy,
  Download,
  Filter,
  Layers3,
  ListChecks,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

const STORAGE_PREFIX = "tester-coverage-notebook-v1";
const MAX_PLANS = 30;
const MAX_REPORTS = 100;
const INITIAL_VISIBLE = 8;

const PLAN_STATES = [
  { value: "draft", label: "Draft" },
  { value: "running", label: "Running" },
  { value: "review", label: "Needs review" },
  { value: "complete", label: "Complete" },
  { value: "paused", label: "Paused" },
];

const STATE_FILTERS = [
  { value: "all", label: "All plans" },
  ...PLAN_STATES,
];

const CASE_STATES = [
  { value: "all", label: "All reports" },
  { value: "open", label: "Open reports" },
  { value: "closed", label: "Resolved reports" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All severities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const CHECKS = [
  { id: "scope", label: "Coverage scope is defined", detail: "The target area and intended behavior are known." },
  { id: "happy", label: "Happy path covered", detail: "The expected successful flow was exercised." },
  { id: "negative", label: "Negative path covered", detail: "Invalid or blocked input was considered." },
  { id: "boundary", label: "Boundary cases covered", detail: "Limits, empty states, and transitions were checked." },
  { id: "evidence", label: "Evidence captured", detail: "Relevant screenshots, logs, or notes are available." },
  { id: "followup", label: "Follow-up recorded", detail: "Open risks and next actions are documented." },
];

const SORT_OPTIONS = [
  { value: "updated", label: "Recently updated" },
  { value: "progress", label: "Lowest coverage" },
  { value: "name", label: "Name A–Z" },
];

function clean(value, fallback = "", limit = 1200) {
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

function priorityRank(value) {
  return { critical: 0, high: 1, medium: 2, low: 3, unspecified: 4 }[value] ?? 5;
}

function createPlan() {
  const now = new Date().toISOString();
  return {
    id: `coverage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "Untitled coverage plan",
    owner: "",
    environment: "",
    purpose: "",
    state: "draft",
    reportIds: [],
    checks: Object.fromEntries(CHECKS.map((check) => [check.id, false])),
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

function normalizePlan(value) {
  if (!value || typeof value !== "object") return null;
  return {
    ...createPlan(),
    ...value,
    id: clean(value.id, `coverage-${Date.now()}`, 180),
    name: clean(value.name, "Untitled coverage plan", 120),
    owner: clean(value.owner, "", 120),
    environment: clean(value.environment, "", 160),
    purpose: clean(value.purpose, "", 1200),
    notes: clean(value.notes, "", 1600),
    state: PLAN_STATES.some((item) => item.value === value.state) ? value.state : "draft",
    reportIds: Array.isArray(value.reportIds)
      ? value.reportIds.filter((item) => typeof item === "string").slice(0, MAX_REPORTS)
      : [],
    checks:
      value.checks && typeof value.checks === "object"
        ? Object.fromEntries(CHECKS.map((check) => [check.id, value.checks[check.id] === true]))
        : Object.fromEntries(CHECKS.map((check) => [check.id, false])),
    createdAt: clean(value.createdAt, new Date().toISOString(), 60),
    updatedAt: clean(value.updatedAt, new Date().toISOString(), 60),
  };
}

function loadPlans(email) {
  if (typeof window === "undefined" || !email) return [];
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${email}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map(normalizePlan).filter(Boolean).slice(0, MAX_PLANS)
      : [];
  } catch {
    return [];
  }
}

function savePlans(email, plans) {
  if (typeof window === "undefined" || !email) return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}:${email}`, JSON.stringify(plans.slice(0, MAX_PLANS)));
  } catch {
    // Coverage notes remain usable if browser storage is unavailable.
  }
}

function progressFor(plan) {
  const complete = CHECKS.filter((check) => plan.checks[check.id]).length;
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

function buildSummary(plan, reports) {
  const attached = reports.filter((report) => plan.reportIds.includes(report.id));
  return [
    `Coverage plan: ${plan.name}`,
    `State: ${PLAN_STATES.find((state) => state.value === plan.state)?.label || plan.state}`,
    `Owner: ${plan.owner || "Unassigned"}`,
    `Environment: ${plan.environment || "Not specified"}`,
    `Coverage: ${progressFor(plan)}%`,
    `Reports attached: ${attached.length}`,
    "",
    `Purpose: ${plan.purpose || "Not documented"}`,
    "",
    "Checks:",
    ...CHECKS.map((check) => `- ${plan.checks[check.id] ? "[x]" : "[ ]"} ${check.label}`),
    "",
    "Reports:",
    ...attached.map((report) => `- ${report.title} (${report.category}, ${report.status})`),
    "",
    `Notes: ${plan.notes || "No notes recorded"}`,
  ].join("\n");
}

function buildCsv(plans) {
  const header = ["Plan", "State", "Owner", "Environment", "Coverage", "Reports", "Created", "Updated"];
  const rows = plans.map((plan) => [
    plan.name,
    plan.state,
    plan.owner,
    plan.environment,
    `${progressFor(plan)}%`,
    plan.reportIds.length,
    plan.createdAt,
    plan.updatedAt,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function SelectControl({ label, value, options, onChange }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-[10px] font-semibold text-slate-600 outline-none hover:border-emerald-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100">
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

function StateBadge({ state }) {
  const tones = {
    draft: "bg-slate-100 text-slate-600",
    running: "bg-sky-50 text-sky-700",
    review: "bg-amber-50 text-amber-700",
    complete: "bg-emerald-50 text-emerald-700",
    paused: "bg-violet-50 text-violet-700",
  };
  const label = PLAN_STATES.find((item) => item.value === state)?.label || "Draft";
  return <span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${tones[state] || tones.draft}`}>{label}</span>;
}

function SeverityBadge({ severity }) {
  const tones = {
    critical: "bg-rose-100 text-rose-700",
    high: "bg-orange-50 text-orange-700",
    medium: "bg-amber-50 text-amber-700",
    low: "bg-sky-50 text-sky-700",
    unspecified: "bg-slate-100 text-slate-600",
  };
  return <span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${tones[severity] || tones.unspecified}`}>{severity}</span>;
}

function TextField({ label, value, onChange, placeholder, multiline = false }) {
  const className = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100";
  return (
    <label className="block">
      <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {multiline ? (
        <textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${className} resize-y leading-4`} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={className} />
      )}
    </label>
  );
}

function PlanCard({ plan, selected, reportCount, onSelect, onDelete }) {
  return (
    <article className={`rounded-2xl border p-3 transition ${selected ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200/80 bg-white hover:border-slate-300"}`}>
      <button type="button" onClick={onSelect} className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-slate-800">{plan.name}</p>
            <p className="mt-1 truncate text-[9px] text-slate-400">{plan.owner || "Unassigned"} · {plan.environment || "No environment"}</p>
          </div>
          <StateBadge state={plan.state} />
        </div>
        <div className="mt-3 flex items-center justify-between text-[9px] text-slate-500">
          <span>{formatNumber(reportCount)} reports</span>
          <span className="font-semibold text-emerald-700">{progressFor(plan)}% covered</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progressFor(plan)}%` }} /></div>
      </button>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
        <span className="text-[8px] text-slate-400">Updated {formatDateTime(new Date(plan.updatedAt))}</span>
        <button type="button" onClick={onDelete} aria-label={`Delete ${plan.name}`} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={12} aria-hidden="true" /></button>
      </div>
    </article>
  );
}

function ReportRow({ report, selected, onToggle, onOpenReport }) {
  return (
    <article className={`rounded-xl border p-3 transition ${selected ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200/80 bg-white hover:border-slate-300"}`}>
      <div className="flex items-start gap-2.5">
        <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`${selected ? "Remove" : "Add"} ${report.title}`} className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-slate-800">{report.title}</p>
              <p className="mt-1 text-[8px] text-slate-400">{report.category} · {formatDate(report.date)}</p>
            </div>
            <div className="flex items-center gap-1"><SeverityBadge severity={report.severity} /><span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${report.status === "closed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{report.status === "closed" ? "Resolved" : "Open"}</span></div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="truncate text-[8px] text-slate-400">{report.id ? `#${report.id.slice(-10)}` : "No report ID"}</span>
            {onOpenReport && <button type="button" onClick={() => onOpenReport(report.report)} className="rounded-lg px-2 py-1 text-[9px] font-semibold text-emerald-700 hover:bg-emerald-100">Open report</button>}
          </div>
        </div>
      </div>
    </article>
  );
}

function CheckRow({ check, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 hover:border-emerald-200">
      <input type="checkbox" checked={checked} onChange={onChange} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 accent-emerald-600 focus:ring-emerald-500" />
      <span><span className="block text-[10px] font-semibold text-slate-700">{check.label}</span><span className="mt-0.5 block text-[9px] leading-4 text-slate-400">{check.detail}</span></span>
    </label>
  );
}

export default function TesterCoverageNotebook({ reports = [], email = "", onOpenReport }) {
  const [plans, setPlans] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [planFilter, setPlanFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("updated");
  const [showAllReports, setShowAllReports] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  const reportEntries = useMemo(() => {
    const seen = new Set();
    return (Array.isArray(reports) ? reports : [])
      .filter((report) => report && typeof report === "object")
      .map((report, index) => ({ id: reportId(report) || `${reportTitle(report)}-${index}`, report, title: reportTitle(report), category: reportCategory(report), severity: reportSeverity(report), status: reportStatus(report), date: reportDate(report) }))
      .filter((entry) => {
        if (seen.has(entry.id)) return false;
        seen.add(entry.id);
        return true;
      });
  }, [reports]);

  useEffect(() => {
    const normalizedEmail = clean(email).toLowerCase();
    const loaded = loadPlans(normalizedEmail);
    setPlans(loaded);
    setSelectedId(loaded[0]?.id || "");
    setStorageLoaded(true);
  }, [email]);

  useEffect(() => {
    if (storageLoaded) savePlans(clean(email).toLowerCase(), plans);
  }, [email, plans, storageLoaded]);

  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedId) || null, [plans, selectedId]);
  const categoryOptions = useMemo(() => [{ value: "all", label: "All categories" }, ...[...new Set(reportEntries.map((report) => report.category))].sort((a, b) => a.localeCompare(b)).map((value) => ({ value, label: value }))], [reportEntries]);
  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();
    return plans
      .filter((plan) => planFilter === "all" || plan.state === planFilter)
      .filter((plan) => !query || [plan.name, plan.owner, plan.environment, plan.purpose].join(" ").toLowerCase().includes(query))
      .sort((left, right) => {
        if (sortBy === "name") return left.name.localeCompare(right.name);
        if (sortBy === "updated") return right.updatedAt.localeCompare(left.updatedAt);
        return progressFor(left) - progressFor(right);
      });
  }, [plans, planFilter, search, sortBy]);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reportEntries
      .filter((report) => reportStatusFilter === "all" || report.status === reportStatusFilter)
      .filter((report) => severityFilter === "all" || report.severity === severityFilter)
      .filter((report) => categoryFilter === "all" || report.category === categoryFilter)
      .filter((report) => !query || [report.id, report.title, report.category, report.severity].join(" ").toLowerCase().includes(query))
      .sort((left, right) => {
        if (sortBy === "name") return left.title.localeCompare(right.title);
        if (sortBy === "updated") return (right.date?.getTime() || 0) - (left.date?.getTime() || 0);
        return priorityRank(left.severity) - priorityRank(right.severity);
      });
  }, [categoryFilter, reportEntries, reportStatusFilter, search, severityFilter, sortBy]);

  const selectedReportEntries = selectedPlan ? reportEntries.filter((report) => selectedPlan.reportIds.includes(report.id)) : [];
  const activePlans = plans.filter((plan) => ["draft", "running", "review"].includes(plan.state)).length;
  const completePlans = plans.filter((plan) => plan.state === "complete").length;
  const attachedCount = selectedPlan?.reportIds.length || 0;
  const hasFilters = planFilter !== "all" || reportStatusFilter !== "all" || severityFilter !== "all" || categoryFilter !== "all" || Boolean(search.trim());

  const updatePlan = (changes) => {
    if (!selectedId) return;
    setPlans((current) => current.map((plan) => plan.id === selectedId ? { ...plan, ...changes, updatedAt: new Date().toISOString() } : plan));
  };

  const createPlanNow = () => {
    if (plans.length >= MAX_PLANS) return;
    const plan = createPlan();
    setPlans((current) => [plan, ...current]);
    setSelectedId(plan.id);
  };

  const deletePlan = (id) => {
    const next = plans.filter((plan) => plan.id !== id);
    setPlans(next);
    if (selectedId === id) setSelectedId(next[0]?.id || "");
  };

  const toggleReport = (id) => {
    if (!selectedPlan) return;
    const ids = new Set(selectedPlan.reportIds);
    if (ids.has(id)) ids.delete(id);
    else if (ids.size < MAX_REPORTS) ids.add(id);
    updatePlan({ reportIds: Array.from(ids) });
  };

  const toggleCheck = (id, checked) => {
    if (!selectedPlan) return;
    updatePlan({ checks: { ...selectedPlan.checks, [id]: checked } });
  };

  const copySummary = () => {
    if (!selectedPlan) return;
    copyText(buildSummary(selectedPlan, reportEntries)).then(() => {
      setCopyMessage("Copied");
      window.setTimeout(() => setCopyMessage(""), 1600);
    }).catch(() => setCopyMessage("Unavailable"));
  };

  const exportPlans = () => {
    if (plans.length) downloadFile(buildCsv(plans), "tester-coverage-plans.csv", "text/csv;charset=utf-8");
  };

  const resetFilters = () => {
    setPlanFilter("all");
    setReportStatusFilter("all");
    setSeverityFilter("all");
    setCategoryFilter("all");
    setSearch("");
    setSortBy("updated");
  };

  const visibleReports = showAllReports ? filteredReports : filteredReports.slice(0, INITIAL_VISIBLE);

  return (
    <section aria-labelledby="tester-coverage-notebook-heading" className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
      <header className="border-b border-slate-100 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Layers3 size={18} aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-emerald-700">Private coverage workspace</p>
              <h2 id="tester-coverage-notebook-heading" className="mt-1 text-base font-semibold tracking-tight text-slate-950">Coverage notebook</h2>
              <p className="mt-1 max-w-2xl text-[10px] leading-4 text-slate-500">Build focused coverage plans, attach reports, and keep private readiness notes for each test area.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportPlans} disabled={!plans.length} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[9px] font-semibold text-slate-600 hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"><Download size={13} aria-hidden="true" /> Export plans</button>
            <button type="button" onClick={createPlanNow} disabled={plans.length >= MAX_PLANS} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[9px] font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"><Plus size={13} aria-hidden="true" /> New plan</button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Metric label="Active plans" value={formatNumber(activePlans)} detail="Draft, running, or review" tone="bg-emerald-500" />
          <Metric label="Complete plans" value={formatNumber(completePlans)} detail="Coverage recorded" tone="bg-teal-500" />
          <Metric label="Attached reports" value={formatNumber(attachedCount)} detail="In selected plan" tone="bg-sky-500" />
        </div>
      </header>

      <div className="space-y-4 p-3 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="inline-flex items-center gap-1.5 px-1 text-[11px] font-semibold text-slate-500"><Filter size={13} aria-hidden="true" /> Filter coverage</span>
          <SelectControl label="Filter plans by state" value={planFilter} options={STATE_FILTERS} onChange={setPlanFilter} />
          <SelectControl label="Filter reports by status" value={reportStatusFilter} options={CASE_STATES} onChange={setReportStatusFilter} />
          <SelectControl label="Filter reports by severity" value={severityFilter} options={PRIORITY_OPTIONS} onChange={setSeverityFilter} />
          <SelectControl label="Filter reports by category" value={categoryFilter} options={categoryOptions} onChange={setCategoryFilter} />
          <SelectControl label="Sort coverage content" value={sortBy} options={SORT_OPTIONS} onChange={setSortBy} />
          <label className="relative min-w-[190px] flex-1 sm:max-w-xs">
            <span className="sr-only">Search coverage plans and reports</span>
            <Search size={13} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search plans or reports" className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
            {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear coverage search" className="absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={12} aria-hidden="true" /></button>}
          </label>
          {hasFilters && <button type="button" onClick={resetFilters} className="inline-flex h-9 items-center justify-center gap-1 rounded-lg px-2 text-[10px] font-semibold text-slate-500 hover:bg-white hover:text-emerald-700"><X size={13} aria-hidden="true" /> Reset</button>}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(230px,0.75fr)_minmax(0,1.8fr)]">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1"><div><p className="text-xs font-semibold text-slate-800">Coverage plans</p><p className="mt-1 text-[9px] text-slate-400">{formatNumber(filteredPlans.length)} matching plans</p></div><button type="button" onClick={createPlanNow} aria-label="Create coverage plan" className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"><Plus size={14} aria-hidden="true" /></button></div>
            {filteredPlans.length ? <div className="space-y-2">{filteredPlans.map((plan) => <PlanCard key={plan.id} plan={plan} reportCount={plan.reportIds.length} selected={plan.id === selectedId} onSelect={() => setSelectedId(plan.id)} onDelete={() => deletePlan(plan.id)} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center"><Layers3 size={20} aria-hidden="true" className="mx-auto text-slate-300" /><p className="mt-2 text-[10px] font-semibold text-slate-600">No coverage plans yet</p><button type="button" onClick={createPlanNow} className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-[9px] font-semibold text-white hover:bg-emerald-700">Create a plan</button></div>}
          </div>

          {selectedPlan ? (
            <div className="min-w-0 space-y-4">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-700">Selected plan</p><p className="mt-1 truncate text-sm font-semibold text-slate-900">{selectedPlan.name}</p></div>
                  <div className="flex items-center gap-2"><StateBadge state={selectedPlan.state} /><button type="button" onClick={copySummary} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-semibold text-slate-600 hover:border-emerald-200 hover:text-emerald-700">{copyMessage === "Copied" ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}{copyMessage || "Copy summary"}</button></div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <TextField label="Plan name" value={selectedPlan.name} onChange={(value) => updatePlan({ name: value })} placeholder="Checkout coverage" />
                  <label className="block"><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">Plan state</span><SelectControl label="Plan state" value={selectedPlan.state} options={PLAN_STATES} onChange={(value) => updatePlan({ state: value })} /></label>
                  <TextField label="Owner" value={selectedPlan.owner} onChange={(value) => updatePlan({ owner: value })} placeholder="Tester or team" />
                  <TextField label="Environment" value={selectedPlan.environment} onChange={(value) => updatePlan({ environment: value })} placeholder="Staging · Chrome · Windows" />
                  <div className="sm:col-span-2"><TextField label="Purpose" value={selectedPlan.purpose} onChange={(value) => updatePlan({ purpose: value })} placeholder="What coverage question should this plan answer?" multiline /></div>
                </div>
                <div className="mt-4 flex items-center justify-between"><div><p className="text-[10px] font-semibold text-slate-700">Coverage progress</p><p className="mt-1 text-[9px] text-slate-400">{progressFor(selectedPlan)}% of the private checklist is complete</p></div><span className="text-sm font-bold text-emerald-700">{progressFor(selectedPlan)}%</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progressFor(selectedPlan)}%` }} /></div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.75fr)]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1"><div><p className="text-xs font-semibold text-slate-800">Coverage checklist</p><p className="mt-1 text-[9px] text-slate-400">Record what this plan has verified.</p></div><ListChecks size={17} aria-hidden="true" className="text-emerald-500" /></div>
                  <div className="space-y-2">{CHECKS.map((check) => <CheckRow key={check.id} check={check} checked={Boolean(selectedPlan.checks[check.id])} onChange={(event) => updatePlan({ checks: { ...selectedPlan.checks, [check.id]: event.target.checked } })} />)}</div>
                  <TextField label="Private plan notes" value={selectedPlan.notes} onChange={(value) => updatePlan({ notes: value })} placeholder="Record risks, assumptions, or follow-up." multiline />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1"><div><p className="text-xs font-semibold text-slate-800">Attached reports</p><p className="mt-1 text-[9px] text-slate-400">{formatNumber(selectedReportEntries.length)} selected</p></div><BadgeCheck size={17} aria-hidden="true" className="text-emerald-500" /></div>
                  {selectedReportEntries.length ? <div className="space-y-2">{selectedReportEntries.slice(0, 6).map((report) => <div key={report.id} className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5"><CheckCircle2 size={14} aria-hidden="true" className="shrink-0 text-emerald-500" /><span className="min-w-0 flex-1 truncate text-[9px] font-semibold text-slate-700">{report.title}</span><SeverityBadge severity={report.severity} /></div>)}</div> : <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center"><Clipboard size={18} aria-hidden="true" className="mx-auto text-slate-300" /><p className="mt-2 text-[9px] text-slate-500">Attach reports below to define this plan.</p></div>}
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3"><p className="flex items-center gap-1.5 text-[9px] font-semibold text-emerald-800"><Sparkles size={12} aria-hidden="true" /> Browser-local only</p><p className="mt-1 text-[9px] leading-4 text-emerald-700/80">Coverage plans are private to this tester browser and do not update report records.</p></div>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold text-slate-800">Attach reports</p><p className="mt-1 text-[9px] text-slate-400">Select up to {formatNumber(MAX_REPORTS)} reports relevant to this coverage plan.</p></div><span className="text-[9px] font-semibold text-slate-500">{formatNumber(filteredReports.length)} matching reports</span></div>
                {visibleReports.length ? <div className="grid gap-2 md:grid-cols-2">{visibleReports.map((report) => <ReportRow key={report.id} report={report} selected={selectedPlan.reportIds.includes(report.id)} onToggle={() => toggleReport(report.id)} onOpenReport={onOpenReport} />)}</div> : <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-[10px] text-slate-500">No reports match the current filters.</p>}
                {!showAllReports && filteredReports.length > INITIAL_VISIBLE && <button type="button" onClick={() => setShowAllReports(true)} className="mx-auto flex items-center gap-1 rounded-lg px-3 py-2 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50">Show all {formatNumber(filteredReports.length)} reports <ArrowDownAZ size={12} aria-hidden="true" /></button>}
                {showAllReports && filteredReports.length > INITIAL_VISIBLE && <button type="button" onClick={() => setShowAllReports(false)} className="mx-auto flex items-center gap-1 rounded-lg px-3 py-2 text-[10px] font-semibold text-slate-500 hover:bg-slate-50">Show fewer reports <ArrowUpAZ size={12} aria-hidden="true" /></button>}
              </div>
            </div>
          ) : (
            <div className="grid min-h-[420px] place-items-center rounded-2xl border border-dashed border-slate-200 p-8 text-center"><div><Layers3 size={28} aria-hidden="true" className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">Start a coverage plan</p><p className="mx-auto mt-1 max-w-sm text-[10px] leading-4 text-slate-500">Define a private test area, track checklist coverage, and attach supporting reports.</p><button type="button" onClick={createPlanNow} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[9px] font-semibold text-white hover:bg-emerald-700"><Plus size={13} aria-hidden="true" /> Create plan</button></div></div>
          )}
        </div>
      </div>
    </section>
  );
}
