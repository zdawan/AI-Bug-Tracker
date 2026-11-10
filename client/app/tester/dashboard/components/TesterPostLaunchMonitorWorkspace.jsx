"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownAZ,
  ArrowUpAZ,
  BellRing,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  Gauge,
  ListChecks,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";

const STORAGE_KEY = "tester-post-launch-monitor-v1";
const MAX_MONITORS = 25;
const MAX_WATCH_ITEMS = 100;
const MAX_OBSERVATIONS = 120;
const MAX_SIGNALS = 100;
const MAX_REPORTS = 100;
const PAGE_SIZE = 8;

const MONITOR_STATES = [
  { value: "draft", label: "Draft", tone: "slate" },
  { value: "watching", label: "Watching", tone: "cyan" },
  { value: "review", label: "Review", tone: "violet" },
  { value: "stable", label: "Stable", tone: "emerald" },
  { value: "alert", label: "Alert", tone: "rose" },
  { value: "closed", label: "Closed", tone: "amber" },
];

const MONITOR_FILTERS = [
  { value: "all", label: "All monitors" },
  ...MONITOR_STATES,
];

const WATCH_STATES = [
  { value: "planned", label: "Planned" },
  { value: "watching", label: "Watching" },
  { value: "clear", label: "Clear" },
  { value: "degraded", label: "Degraded" },
  { value: "blocked", label: "Blocked" },
];

const WATCH_FILTERS = [
  { value: "all", label: "All watch items" },
  ...WATCH_STATES,
];

const SIGNAL_LEVELS = [
  { value: "critical", label: "Critical", tone: "rose" },
  { value: "high", label: "High", tone: "orange" },
  { value: "medium", label: "Medium", tone: "amber" },
  { value: "low", label: "Low", tone: "emerald" },
];

const SIGNAL_FILTERS = [
  { value: "all", label: "All signal levels" },
  ...SIGNAL_LEVELS,
];

const OBSERVATION_RESULTS = [
  { value: "pending", label: "Pending" },
  { value: "normal", label: "Normal" },
  { value: "concern", label: "Concern" },
  { value: "incident", label: "Incident" },
  { value: "not-run", label: "Not run" },
];

const CHECKS = [
  { id: "owner", label: "Monitoring owner is named", detail: "Someone is accountable for watching the release." },
  { id: "window", label: "Observation window is defined", detail: "The start and end of post-launch observation are clear." },
  { id: "baseline", label: "Baseline is recorded", detail: "The expected behavior or comparison point is documented." },
  { id: "signals", label: "Alert signals are understood", detail: "The team knows what should trigger escalation." },
  { id: "coverage", label: "Priority journeys are covered", detail: "The watch list represents the most important user paths." },
  { id: "evidence", label: "Observations have evidence", detail: "Notes, reports, and references support the monitoring conclusion." },
  { id: "handoff", label: "Follow-up handoff is ready", detail: "Open concerns have a next owner and destination." },
];

const DEFAULT_WATCH_ITEMS = [
  { id: "primary", title: "Primary user journey", area: "", state: "planned", owner: "", frequency: "After each deployment", note: "" },
  { id: "error", title: "Error and failure path", area: "", state: "planned", owner: "", frequency: "Every observation", note: "" },
  { id: "regression", title: "Regression-sensitive flow", area: "", state: "planned", owner: "", frequency: "Daily", note: "" },
  { id: "support", title: "Support or feedback signal", area: "", state: "planned", owner: "", frequency: "Daily", note: "" },
];

function clean(value, fallback = "", limit = 1200) {
  if (typeof value !== "string") return fallback;
  const result = value.trim();
  return result ? result.slice(0, limit) : fallback;
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function reportId(report) {
  return String(report?._id ?? report?.id ?? report?.bugId ?? "");
}

function reportTitle(report) {
  return clean(report?.title ?? report?.summary ?? report?.name, "Untitled report", 180);
}

function reportSeverity(report) {
  const value = String(report?.severity ?? report?.priority ?? "medium").toLowerCase();
  return SIGNAL_LEVELS.some((item) => item.value === value) ? value : "medium";
}

function reportStatus(report) {
  const value = String(report?.status ?? report?.state ?? "open").toLowerCase();
  return ["closed", "resolved", "fixed", "done"].includes(value) ? "resolved" : "open";
}

function reportCategory(report) {
  return clean(report?.category ?? report?.type ?? report?.area, "Uncategorized", 80);
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value);
}

function formatDate(value) {
  if (!value) return "No date";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function escapeCsv(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCsv(filename, rows) {
  const body = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function readStorage(email) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY}:${email || "anonymous"}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStorage(email, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${STORAGE_KEY}:${email || "anonymous"}`, JSON.stringify(value));
  } catch {
    // Monitoring notes remain usable if browser storage is unavailable.
  }
}

function monitorStateMeta(value) {
  return MONITOR_STATES.find((state) => state.value === value) || MONITOR_STATES[0];
}

function signalMeta(value) {
  return SIGNAL_LEVELS.find((level) => level.value === value) || SIGNAL_LEVELS[2];
}

function toneClasses(tone, compact = false) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-800",
    violet: "border-violet-100 bg-violet-50 text-violet-800",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-800",
    rose: "border-rose-100 bg-rose-50 text-rose-800",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    orange: "border-orange-100 bg-orange-50 text-orange-800",
  };
  return `${tones[tone] || tones.slate} ${compact ? "px-2 py-0.5" : "px-2.5 py-1"}`;
}

function createMonitor() {
  return {
    id: makeId("monitor"),
    name: "Untitled post-launch monitor",
    release: "",
    environment: "",
    owner: "",
    recipient: "",
    state: "draft",
    startDate: "",
    endDate: "",
    baseline: "",
    recommendation: "",
    escalation: "",
    checks: {
      owner: false,
      window: false,
      baseline: false,
      signals: false,
      coverage: false,
      evidence: false,
      handoff: false,
    },
    watchItems: DEFAULT_WATCH_ITEMS.map((item) => ({ ...item })),
    observations: [],
    signals: [],
    reportIds: [],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function normalizeMonitor(value) {
  const source = value && typeof value === "object" ? value : createMonitor();
  return {
    ...createMonitor(),
    ...source,
    checks: { ...createMonitor().checks, ...(source.checks || {}) },
    watchItems: Array.isArray(source.watchItems)
      ? source.watchItems.slice(0, MAX_WATCH_ITEMS).map((item) => ({
          id: makeId("watch"),
          title: "",
          area: "",
          state: "planned",
          owner: "",
          frequency: "",
          note: "",
          ...item,
        }))
      : DEFAULT_WATCH_ITEMS.map((item) => ({ ...item })),
    observations: Array.isArray(source.observations)
      ? source.observations.slice(0, MAX_OBSERVATIONS).map((item) => ({
          id: makeId("observation"),
          date: today(),
          title: "",
          result: "pending",
          owner: "",
          detail: "",
          nextAction: "",
          ...item,
        }))
      : [],
    signals: Array.isArray(source.signals)
      ? source.signals.slice(0, MAX_SIGNALS).map((item) => ({
          id: makeId("signal"),
          title: "",
          level: "medium",
          status: "open",
          owner: "",
          detectedAt: today(),
          mitigation: "",
          ...item,
        }))
      : [],
    reportIds: Array.isArray(source.reportIds) ? source.reportIds.slice(0, MAX_REPORTS) : [],
  };
}

function Panel({ title, detail, icon: Icon, action, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon ? <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-cyan-600" /> : null}
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-slate-800">{title}</h3>
            {detail ? <p className="mt-1 text-[9px] leading-4 text-slate-400">{detail}</p> : null}
          </div>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Button({ children, onClick, icon: Icon, variant = "secondary", disabled = false, title }) {
  const variants = {
    primary: "border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700",
    secondary: "border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:text-cyan-700",
    ghost: "border-transparent bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700",
    danger: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  };
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick} className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[9px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]}`}>
      {Icon ? <Icon size={12} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] leading-4 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
    </label>
  );
}

function SelectField({ label, value, onChange, options, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="relative block">
        <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 pr-7 text-[10px] text-slate-700 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100">
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDown size={12} aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
      </span>
    </label>
  );
}

function StateBadge({ value }) {
  const state = monitorStateMeta(value);
  return <span className={`inline-flex rounded-full border text-[8px] font-semibold ${toneClasses(state.tone, true)}`}>{state.label}</span>;
}

function SignalBadge({ value }) {
  const level = signalMeta(value);
  return <span className={`inline-flex rounded-full border text-[8px] font-semibold ${toneClasses(level.tone, true)}`}>{level.label}</span>;
}

function ProgressBar({ value, tone = "cyan" }) {
  const colors = { cyan: "bg-cyan-500", emerald: "bg-emerald-500", violet: "bg-violet-500", amber: "bg-amber-500", rose: "bg-rose-500" };
  return <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all ${colors[tone] || colors.cyan}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

function StatCard({ label, value, detail, icon: Icon, tone = "cyan" }) {
  const tones = { cyan: "bg-cyan-50 text-cyan-700", violet: "bg-violet-50 text-violet-700", emerald: "bg-emerald-50 text-emerald-700", rose: "bg-rose-50 text-rose-700" };
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm shadow-slate-200/20">
      <div className="flex items-center justify-between gap-2"><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><span className={`rounded-lg p-1.5 ${tones[tone] || tones.cyan}`}><Icon size={13} aria-hidden="true" /></span></div>
      <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-[9px] text-slate-400">{detail}</p>
    </div>
  );
}

function CheckRow({ check, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 transition hover:border-cyan-200">
      <input type="checkbox" checked={checked} onChange={onChange} className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-cyan-600 focus:ring-cyan-500" />
      <span><span className="block text-[10px] font-semibold text-slate-700">{check.label}</span><span className="mt-0.5 block text-[9px] leading-4 text-slate-400">{check.detail}</span></span>
    </label>
  );
}

function EmptyState({ title, detail, icon: Icon = Clipboard }) {
  return <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center"><Icon size={21} aria-hidden="true" className="mx-auto text-slate-300" /><p className="mt-2 text-[10px] font-semibold text-slate-600">{title}</p><p className="mx-auto mt-1 max-w-sm text-[9px] leading-4 text-slate-400">{detail}</p></div>;
}

function MonitorCard({ monitor, selected, metrics, onSelect }) {
  return (
    <button type="button" onClick={onSelect} className={`w-full rounded-xl border p-3 text-left transition ${selected ? "border-cyan-300 bg-cyan-50/50 shadow-sm" : "border-slate-200/80 bg-white hover:border-cyan-200"}`}>
      <div className="flex items-start justify-between gap-2"><span className="min-w-0 truncate text-[10px] font-semibold text-slate-800">{monitor.name || "Untitled monitor"}</span><StateBadge value={monitor.state} /></div>
      <p className="mt-1 truncate text-[9px] text-slate-400">{monitor.release || "No release target yet"}</p>
      <div className="mt-3 flex items-center justify-between text-[8px] text-slate-400"><span>{formatNumber(metrics.watchDone)} clear</span><span>{formatNumber(metrics.alerts)} alerts</span><span>{metrics.readiness}% ready</span></div>
      <div className="mt-2"><ProgressBar value={metrics.readiness} tone={monitor.state === "alert" ? "rose" : "cyan"} /></div>
    </button>
  );
}

function WatchRow({ item, onChange, onRemove }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1.2fr)_140px_130px_170px_auto]">
        <Field label="Watch item" value={item.title} onChange={(value) => onChange({ title: value })} placeholder="What are we monitoring?" />
        <Field label="Area" value={item.area} onChange={(value) => onChange({ area: value })} placeholder="Checkout" />
        <SelectField label="State" value={item.state} onChange={(value) => onChange({ state: value })} options={WATCH_STATES} />
        <Field label="Owner" value={item.owner} onChange={(value) => onChange({ owner: value })} placeholder="Name or team" />
        <div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove watch item" onClick={onRemove}>Remove</Button></div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-[200px_minmax(0,1fr)]">
        <Field label="Frequency" value={item.frequency} onChange={(value) => onChange({ frequency: value })} placeholder="Every 2 hours" />
        <Field label="Watch note" value={item.note} onChange={(value) => onChange({ note: value })} placeholder="Baseline, threshold, or expected behavior" />
      </div>
    </div>
  );
}

function ObservationRow({ observation, onChange, onRemove }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3">
      <div className="grid gap-2 md:grid-cols-[130px_minmax(0,1.2fr)_130px_150px_auto]">
        <Field label="Date" type="date" value={observation.date} onChange={(value) => onChange({ date: value })} />
        <Field label="Observation" value={observation.title} onChange={(value) => onChange({ title: value })} placeholder="What was checked?" />
        <SelectField label="Result" value={observation.result} onChange={(value) => onChange({ result: value })} options={OBSERVATION_RESULTS} />
        <Field label="Owner" value={observation.owner} onChange={(value) => onChange({ owner: value })} placeholder="Name or team" />
        <div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove observation" onClick={onRemove}>Remove</Button></div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <Field label="Details" value={observation.detail} onChange={(value) => onChange({ detail: value })} placeholder="Observed behavior, metric, or comparison" />
        <Field label="Next action" value={observation.nextAction} onChange={(value) => onChange({ nextAction: value })} placeholder="Follow-up, escalation, or none" />
      </div>
    </div>
  );
}

function SignalRow({ signal, onChange, onRemove }) {
  const statuses = [
    { value: "open", label: "Open" },
    { value: "investigating", label: "Investigating" },
    { value: "mitigated", label: "Mitigated" },
    { value: "closed", label: "Closed" },
  ];
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1.2fr)_120px_140px_140px_auto]">
        <Field label="Signal" value={signal.title} onChange={(value) => onChange({ title: value })} placeholder="Unexpected checkout errors" />
        <SelectField label="Level" value={signal.level} onChange={(value) => onChange({ level: value })} options={SIGNAL_LEVELS} />
        <SelectField label="Status" value={signal.status} onChange={(value) => onChange({ status: value })} options={statuses} />
        <Field label="Owner" value={signal.owner} onChange={(value) => onChange({ owner: value })} placeholder="Name or team" />
        <div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove signal" onClick={onRemove}>Remove</Button></div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-[140px_minmax(0,1fr)]">
        <Field label="Detected" type="date" value={signal.detectedAt} onChange={(value) => onChange({ detectedAt: value })} />
        <Field label="Mitigation / next action" value={signal.mitigation} onChange={(value) => onChange({ mitigation: value })} placeholder="What should happen next?" />
      </div>
    </div>
  );
}

function ReportRow({ report, checked, onToggle, onOpenReport }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3">
      <input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 rounded border-slate-300 accent-cyan-600 focus:ring-cyan-500" aria-label={`Attach ${reportTitle(report)}`} />
      <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-slate-700">{reportTitle(report)}</p><p className="mt-1 truncate text-[9px] text-slate-400">{reportCategory(report)} · {reportStatus(report) === "resolved" ? "Resolved" : "Open"}</p></div>
      <SignalBadge value={reportSeverity(report)} />
      {onOpenReport ? <button type="button" onClick={() => onOpenReport(report)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-cyan-700" title="Open report"><ExternalLink size={13} aria-hidden="true" /></button> : null}
    </div>
  );
}

function Guidance({ monitor, metrics, evidenceCount }) {
  const suggestions = [];
  if (!monitor.owner) suggestions.push("Assign a monitoring owner.");
  if (!monitor.endDate) suggestions.push("Define when the observation window ends.");
  if (!monitor.baseline) suggestions.push("Record the expected baseline before interpreting changes.");
  if (metrics.alerts) suggestions.push(`Review ${metrics.alerts} open signal(s) before calling the release stable.`);
  if (!evidenceCount) suggestions.push("Attach reports or observation references.");
  if (!monitor.escalation) suggestions.push("Document the escalation path for a new alert.");
  if (!suggestions.length) suggestions.push("The monitor has enough context for a focused stability review.");
  return (
    <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-3.5">
      <div className="flex items-start gap-2"><Sparkles size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-cyan-600" /><div><p className="text-[10px] font-semibold text-cyan-900">Suggested next moves</p><p className="mt-1 text-[9px] leading-4 text-cyan-800/70">Private prompts based on this monitoring record.</p></div></div>
      <ul className="mt-3 space-y-1.5">{suggestions.map((suggestion) => <li key={suggestion} className="flex items-start gap-2 text-[9px] leading-4 text-cyan-800/80"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-cyan-500" />{suggestion}</li>)}</ul>
      <p className="mt-3 border-t border-cyan-100 pt-3 text-[8px] leading-4 text-cyan-800/60">This workspace does not change report status, send alerts, or update release systems.</p>
    </div>
  );
}

function MonitorHeader({ monitor, onChange, onDelete, onDuplicate }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><BellRing size={17} aria-hidden="true" className="text-cyan-600" /><h2 className="truncate text-sm font-semibold text-slate-900">{monitor.name || "Untitled post-launch monitor"}</h2><StateBadge value={monitor.state} /></div><p className="mt-1 pl-6 text-[9px] text-slate-400">Private post-launch observation workspace</p></div><div className="flex flex-wrap gap-1.5"><Button icon={Copy} onClick={onDuplicate}>Duplicate</Button><Button variant="danger" icon={Trash2} onClick={onDelete}>Delete</Button></div></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Monitor name" value={monitor.name} onChange={(value) => onChange({ name: value })} placeholder="Checkout launch watch" /><Field label="Release / build" value={monitor.release} onChange={(value) => onChange({ release: value })} placeholder="v2.4.0 / build 1842" /><Field label="Environment" value={monitor.environment} onChange={(value) => onChange({ environment: value })} placeholder="Production / web" /><SelectField label="Monitor state" value={monitor.state} onChange={(value) => onChange({ state: value })} options={MONITOR_STATES} /></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Owner" value={monitor.owner} onChange={(value) => onChange({ owner: value })} placeholder="Tester or team" /><Field label="Recipient" value={monitor.recipient} onChange={(value) => onChange({ recipient: value })} placeholder="Release manager" /><Field label="Start date" type="date" value={monitor.startDate} onChange={(value) => onChange({ startDate: value })} /><Field label="End date" type="date" value={monitor.endDate} onChange={(value) => onChange({ endDate: value })} /></div>
    </div>
  );
}

export default function TesterPostLaunchMonitorWorkspace({ reports = [], email = "", onOpenReport }) {
  const [monitors, setMonitors] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [monitorFilter, setMonitorFilter] = useState("all");
  const [monitorSearch, setMonitorSearch] = useState("");
  const [sortAscending, setSortAscending] = useState(false);
  const [showAllMonitors, setShowAllMonitors] = useState(false);
  const [watchFilter, setWatchFilter] = useState("all");
  const [watchSearch, setWatchSearch] = useState("");
  const [observationFilter, setObservationFilter] = useState("all");
  const [signalFilter, setSignalFilter] = useState("all");
  const [signalSearch, setSignalSearch] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reportFilter, setReportFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const stored = readStorage(email);
    if (stored && Array.isArray(stored.monitors) && stored.monitors.length) {
      const restored = stored.monitors.slice(0, MAX_MONITORS).map(normalizeMonitor);
      setMonitors(restored);
      setSelectedId(stored.selectedId || restored[0].id);
      return;
    }
    const initial = createMonitor();
    initial.name = "Post-launch stability watch";
    initial.startDate = today();
    setMonitors([initial]);
    setSelectedId(initial.id);
  }, [email]);

  useEffect(() => {
    if (!monitors.length) return;
    writeStorage(email, { monitors, selectedId });
  }, [email, monitors, selectedId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const selectedMonitor = useMemo(() => monitors.find((monitor) => monitor.id === selectedId) || monitors[0] || null, [monitors, selectedId]);

  const metricsByMonitor = useMemo(() => {
    const result = new Map();
    monitors.forEach((monitor) => {
      const watchDone = monitor.watchItems.filter((item) => item.state === "clear").length;
      const watchBlocked = monitor.watchItems.filter((item) => item.state === "blocked").length;
      const observationsDone = monitor.observations.filter((item) => ["normal", "concern", "incident"].includes(item.result)).length;
      const checksDone = Object.values(monitor.checks).filter(Boolean).length;
      const checksProgress = Math.round((checksDone / CHECKS.length) * 100);
      const watchProgress = monitor.watchItems.length ? Math.round((watchDone / monitor.watchItems.length) * 100) : 0;
      const observationProgress = monitor.observations.length ? Math.round((observationsDone / monitor.observations.length) * 100) : 0;
      const alerts = monitor.signals.filter((signal) => !["mitigated", "closed"].includes(signal.status)).length;
      const highAlerts = monitor.signals.filter((signal) => !["mitigated", "closed"].includes(signal.status) && ["critical", "high"].includes(signal.level)).length;
      const readiness = Math.max(0, Math.round((checksProgress * 0.4) + (watchProgress * 0.3) + (observationProgress * 0.3) - (watchBlocked * 8) - (highAlerts * 8)));
      result.set(monitor.id, { watchDone, watchBlocked, observationsDone, checksProgress, watchProgress, observationProgress, alerts, highAlerts, readiness });
    });
    return result;
  }, [monitors]);

  const filteredMonitors = useMemo(() => {
    const query = monitorSearch.trim().toLowerCase();
    const result = monitors.filter((monitor) => {
      const stateMatch = monitorFilter === "all" || monitor.state === monitorFilter;
      const haystack = `${monitor.name} ${monitor.release} ${monitor.environment} ${monitor.owner} ${monitor.recipient}`.toLowerCase();
      return stateMatch && (!query || haystack.includes(query));
    });
    result.sort((left, right) => {
      const comparison = (left.name || "").localeCompare(right.name || "");
      return sortAscending ? comparison : -comparison;
    });
    return result;
  }, [monitorFilter, monitorSearch, monitors, sortAscending]);

  const visibleMonitors = showAllMonitors ? filteredMonitors : filteredMonitors.slice(0, PAGE_SIZE);

  const filteredWatchItems = useMemo(() => {
    if (!selectedMonitor) return [];
    const query = watchSearch.trim().toLowerCase();
    return selectedMonitor.watchItems.filter((item) => {
      const stateMatch = watchFilter === "all" || item.state === watchFilter;
      const haystack = `${item.title} ${item.area} ${item.owner} ${item.note}`.toLowerCase();
      return stateMatch && (!query || haystack.includes(query));
    });
  }, [selectedMonitor, watchFilter, watchSearch]);

  const filteredObservations = useMemo(() => {
    if (!selectedMonitor) return [];
    return selectedMonitor.observations.filter((observation) => observationFilter === "all" || observation.result === observationFilter);
  }, [observationFilter, selectedMonitor]);

  const filteredSignals = useMemo(() => {
    if (!selectedMonitor) return [];
    const query = signalSearch.trim().toLowerCase();
    return selectedMonitor.signals.filter((signal) => {
      const levelMatch = signalFilter === "all" || signal.level === signalFilter;
      const haystack = `${signal.title} ${signal.owner} ${signal.mitigation}`.toLowerCase();
      return levelMatch && (!query || haystack.includes(query));
    });
  }, [selectedMonitor, signalFilter, signalSearch]);

  const filteredReports = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();
    return reports.filter((report) => {
      const queryMatch = !query || `${reportTitle(report)} ${reportCategory(report)}`.toLowerCase().includes(query);
      const levelMatch = reportFilter === "all" || reportSeverity(report) === reportFilter;
      const statusMatch = reportStatusFilter === "all" || reportStatus(report) === reportStatusFilter;
      return queryMatch && levelMatch && statusMatch;
    });
  }, [reportFilter, reportSearch, reportStatusFilter, reports]);

  const selectedReports = useMemo(() => reports.filter((report) => selectedMonitor?.reportIds.includes(reportId(report))), [reports, selectedMonitor]);
  const metrics = selectedMonitor ? metricsByMonitor.get(selectedMonitor.id) : null;

  const updateMonitor = (patch) => {
    if (!selectedMonitor) return;
    setMonitors((current) => current.map((monitor) => monitor.id === selectedMonitor.id ? { ...monitor, ...patch, updatedAt: new Date().toISOString() } : monitor));
  };

  const updateWatchItem = (id, patch) => updateMonitor({ watchItems: selectedMonitor.watchItems.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const updateObservation = (id, patch) => updateMonitor({ observations: selectedMonitor.observations.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const updateSignal = (id, patch) => updateMonitor({ signals: selectedMonitor.signals.map((item) => item.id === id ? { ...item, ...patch } : item) });

  const createNewMonitor = () => {
    if (monitors.length >= MAX_MONITORS) {
      setNotice(`Maximum of ${MAX_MONITORS} monitors reached.`);
      return;
    }
    const monitor = createMonitor();
    monitor.name = `Post-launch monitor ${monitors.length + 1}`;
    setMonitors((current) => [monitor, ...current]);
    setSelectedId(monitor.id);
    setNotice("New post-launch monitor created.");
  };

  const duplicateMonitor = () => {
    if (!selectedMonitor || monitors.length >= MAX_MONITORS) return;
    const copy = normalizeMonitor({ ...selectedMonitor, id: makeId("monitor"), name: `${selectedMonitor.name || "Post-launch monitor"} copy`, state: "draft", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setMonitors((current) => [copy, ...current]);
    setSelectedId(copy.id);
    setNotice("Post-launch monitor duplicated.");
  };

  const deleteMonitor = () => {
    if (!selectedMonitor) return;
    if (monitors.length === 1) {
      setNotice("Keep at least one post-launch monitor available.");
      return;
    }
    const remaining = monitors.filter((monitor) => monitor.id !== selectedMonitor.id);
    setMonitors(remaining);
    setSelectedId(remaining[0]?.id || "");
    setNotice("Post-launch monitor removed.");
  };

  const addWatchItem = () => {
    if (!selectedMonitor || selectedMonitor.watchItems.length >= MAX_WATCH_ITEMS) return;
    updateMonitor({ watchItems: [...selectedMonitor.watchItems, { id: makeId("watch"), title: "", area: "", state: "planned", owner: "", frequency: "", note: "" }] });
  };

  const removeWatchItem = (id) => updateMonitor({ watchItems: selectedMonitor.watchItems.filter((item) => item.id !== id) });

  const addObservation = () => {
    if (!selectedMonitor || selectedMonitor.observations.length >= MAX_OBSERVATIONS) return;
    updateMonitor({ observations: [...selectedMonitor.observations, { id: makeId("observation"), date: today(), title: "", result: "pending", owner: "", detail: "", nextAction: "" }] });
  };

  const removeObservation = (id) => updateMonitor({ observations: selectedMonitor.observations.filter((item) => item.id !== id) });

  const addSignal = () => {
    if (!selectedMonitor || selectedMonitor.signals.length >= MAX_SIGNALS) return;
    updateMonitor({ signals: [...selectedMonitor.signals, { id: makeId("signal"), title: "", level: "medium", status: "open", owner: "", detectedAt: today(), mitigation: "" }] });
  };

  const removeSignal = (id) => updateMonitor({ signals: selectedMonitor.signals.filter((item) => item.id !== id) });

  const toggleReport = (id) => {
    const ids = selectedMonitor.reportIds.includes(id) ? selectedMonitor.reportIds.filter((value) => value !== id) : [...selectedMonitor.reportIds, id].slice(0, MAX_REPORTS);
    updateMonitor({ reportIds: ids });
  };

  const toggleVisibleReports = () => {
    const visibleIds = filteredReports.map(reportId).filter(Boolean);
    const allSelected = visibleIds.every((id) => selectedMonitor.reportIds.includes(id));
    const nextIds = allSelected ? selectedMonitor.reportIds.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selectedMonitor.reportIds, ...visibleIds])).slice(0, MAX_REPORTS);
    updateMonitor({ reportIds: nextIds });
  };

  const summaryText = useMemo(() => {
    if (!selectedMonitor) return "";
    const observations = selectedMonitor.observations.filter((item) => item.result !== "not-run");
    const alerts = selectedMonitor.signals.filter((item) => !["mitigated", "closed"].includes(item.status));
    return [
      `${selectedMonitor.name || "Untitled post-launch monitor"} — ${monitorStateMeta(selectedMonitor.state).label}`,
      `Release: ${selectedMonitor.release || "Not specified"}`,
      `Environment: ${selectedMonitor.environment || "Not specified"}`,
      `Owner: ${selectedMonitor.owner || "Not assigned"} · Recipient: ${selectedMonitor.recipient || "Not assigned"}`,
      `Observation window: ${formatDate(selectedMonitor.startDate)} to ${formatDate(selectedMonitor.endDate)}`,
      `Readiness: ${metrics?.readiness || 0}%`,
      `Watch items clear: ${metrics?.watchDone || 0}/${selectedMonitor.watchItems.length}`,
      `Observations recorded: ${observations.length}`,
      `Open signals: ${alerts.length}`,
      `Reports attached: ${selectedReports.length}`,
      "",
      selectedMonitor.recommendation || "No stability recommendation has been written yet.",
      "",
      "Open signals:",
      ...(alerts.length ? alerts.map((signal) => `- ${signal.title || "Untitled signal"} [${signal.level}]`) : ["- None"]),
      "",
      "Escalation:",
      selectedMonitor.escalation || "Not documented",
    ].join("\n");
  }, [metrics, selectedMonitor, selectedReports]);

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setNotice("Monitoring summary copied.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setNotice("Clipboard access is unavailable.");
    }
  };

  const exportMonitor = () => {
    if (!selectedMonitor) return;
    const rows = [
      ["Post-launch monitor", "Value"],
      ["Name", selectedMonitor.name],
      ["Release", selectedMonitor.release],
      ["Environment", selectedMonitor.environment],
      ["State", monitorStateMeta(selectedMonitor.state).label],
      ["Owner", selectedMonitor.owner],
      ["Recipient", selectedMonitor.recipient],
      ["Start date", selectedMonitor.startDate],
      ["End date", selectedMonitor.endDate],
      ["Readiness", `${metrics?.readiness || 0}%`],
      [],
      ["Watch item", "Area", "State", "Owner", "Frequency", "Note"],
      ...selectedMonitor.watchItems.map((item) => [item.title, item.area, item.state, item.owner, item.frequency, item.note]),
      [],
      ["Observation date", "Observation", "Result", "Owner", "Details", "Next action"],
      ...selectedMonitor.observations.map((item) => [item.date, item.title, item.result, item.owner, item.detail, item.nextAction]),
      [],
      ["Signal", "Level", "Status", "Owner", "Detected", "Mitigation"],
      ...selectedMonitor.signals.map((item) => [item.title, item.level, item.status, item.owner, item.detectedAt, item.mitigation]),
    ];
    downloadCsv("post-launch-monitor.csv", rows);
    setNotice("Monitoring export downloaded.");
  };

  const resetMonitor = () => {
    if (!selectedMonitor) return;
    const reset = createMonitor();
    reset.id = selectedMonitor.id;
    reset.name = selectedMonitor.name;
    reset.release = selectedMonitor.release;
    reset.environment = selectedMonitor.environment;
    reset.owner = selectedMonitor.owner;
    reset.recipient = selectedMonitor.recipient;
    reset.startDate = selectedMonitor.startDate;
    reset.endDate = selectedMonitor.endDate;
    updateMonitor(reset);
    setNotice("Monitoring data reset.");
  };

  if (!selectedMonitor) return null;

  const allVisibleReportsSelected = filteredReports.length > 0 && filteredReports.every((report) => selectedMonitor.reportIds.includes(reportId(report)));
  const highAlerts = selectedMonitor.signals.filter((signal) => !["mitigated", "closed"].includes(signal.status) && ["critical", "high"].includes(signal.level)).length;

  return (
    <section id="tester-post-launch-monitor" className="space-y-4 rounded-3xl bg-slate-50/70 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="flex items-center gap-2"><BellRing size={18} aria-hidden="true" className="text-cyan-600" /><h2 className="text-base font-semibold tracking-tight text-slate-900">Post-launch monitoring</h2></div><p className="mt-1 max-w-2xl text-[10px] leading-5 text-slate-500">Track stability observations, watch items, signals, and follow-up evidence after a release decision.</p></div>
        <div className="flex flex-wrap gap-1.5"><Button icon={Plus} variant="primary" onClick={createNewMonitor}>New monitor</Button><Button icon={Download} onClick={exportMonitor}>Export</Button><Button icon={copied ? Check : Copy} onClick={copySummary}>{copied ? "Copied" : "Copy summary"}</Button></div>
      </div>
      {notice ? <div className="flex items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2.5 text-[9px] font-medium text-cyan-800"><CheckCircle2 size={13} aria-hidden="true" />{notice}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Panel title="Monitoring records" detail={`${formatNumber(filteredMonitors.length)} matching monitor(s)`} icon={BellRing} action={<Button variant="ghost" icon={sortAscending ? ArrowUpAZ : ArrowDownAZ} onClick={() => setSortAscending((value) => !value)} title="Toggle monitor sort" />}>
          <div className="space-y-2.5">
            <div className="relative"><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={monitorSearch} onChange={(event) => setMonitorSearch(event.target.value)} placeholder="Search monitors" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></div>
            <SelectField label="State filter" value={monitorFilter} onChange={setMonitorFilter} options={MONITOR_FILTERS} />
            {visibleMonitors.length ? <div className="space-y-2">{visibleMonitors.map((monitor) => <MonitorCard key={monitor.id} monitor={monitor} selected={monitor.id === selectedMonitor.id} onSelect={() => setSelectedId(monitor.id)} metrics={metricsByMonitor.get(monitor.id) || { watchDone: 0, alerts: 0, readiness: 0 }} />)}</div> : <EmptyState title="No matching monitors" detail="Try clearing the search or state filter." icon={Search} />}
            {filteredMonitors.length > PAGE_SIZE ? <Button variant="ghost" onClick={() => setShowAllMonitors((value) => !value)}>{showAllMonitors ? "Show fewer" : `Show all ${filteredMonitors.length}`}</Button> : null}
          </div>
        </Panel>

        <div className="min-w-0 space-y-4">
          <MonitorHeader monitor={selectedMonitor} onChange={updateMonitor} onDelete={deleteMonitor} onDuplicate={duplicateMonitor} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Readiness" value={`${metrics?.readiness || 0}%`} detail="Combined stability signal" icon={Gauge} tone="cyan" />
            <StatCard label="Watch items" value={`${metrics?.watchDone || 0}/${selectedMonitor.watchItems.length}`} detail="Marked clear" icon={Target} tone="violet" />
            <StatCard label="Open signals" value={formatNumber(metrics?.alerts || 0)} detail={`${highAlerts} high or critical`} icon={ShieldAlert} tone="rose" />
            <StatCard label="Observations" value={formatNumber(metrics?.observationsDone || 0)} detail={`${selectedMonitor.observations.length} recorded`} icon={CalendarClock} tone="emerald" />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <Panel title="Stability recommendation" detail="Capture what the observed behavior means for the release." icon={Clipboard}>
              <div className="space-y-3"><TextArea label="Recommendation" value={selectedMonitor.recommendation} onChange={(value) => updateMonitor({ recommendation: value })} placeholder="Is the release stable, needs continued observation, or should be escalated?" rows={4} /><TextArea label="Escalation path" value={selectedMonitor.escalation} onChange={(value) => updateMonitor({ escalation: value })} placeholder="Who should be contacted and what should happen if a new signal appears?" rows={3} /><TextArea label="Baseline" value={selectedMonitor.baseline} onChange={(value) => updateMonitor({ baseline: value })} placeholder="Record the expected behavior, metric, or comparison point." rows={3} /><Guidance monitor={selectedMonitor} metrics={metrics || { alerts: 0 }} evidenceCount={selectedMonitor.reportIds.length} /></div>
            </Panel>
            <Panel title="Monitoring criteria" detail={`${metrics?.checksProgress || 0}% complete`} icon={ListChecks}><div className="space-y-2">{CHECKS.map((check) => <CheckRow key={check.id} check={check} checked={Boolean(selectedMonitor.checks[check.id])} onChange={(event) => updateMonitor({ checks: { ...selectedMonitor.checks, [check.id]: event.target.checked } })} />)}</div></Panel>
          </div>

          <Panel title="Watch list" detail={`${formatNumber(selectedMonitor.watchItems.length)} item(s) · ${formatNumber(filteredWatchItems.length)} shown`} icon={Target} action={<Button icon={Plus} onClick={addWatchItem} disabled={selectedMonitor.watchItems.length >= MAX_WATCH_ITEMS}>Add watch item</Button>}>
            <div className="space-y-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_160px]"><label className="relative block"><span className="sr-only">Search watch items</span><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={watchSearch} onChange={(event) => setWatchSearch(event.target.value)} placeholder="Search items, areas, or owners" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label><SelectField label="State" value={watchFilter} onChange={setWatchFilter} options={WATCH_FILTERS} /></div>{filteredWatchItems.length ? <div className="space-y-2.5">{filteredWatchItems.map((item) => <WatchRow key={item.id} item={item} onChange={(patch) => updateWatchItem(item.id, patch)} onRemove={() => removeWatchItem(item.id)} />)}</div> : <EmptyState title="No watch items match" detail="Adjust the filter or add a new stability watch item." icon={Target} />}</div>
          </Panel>

          <Panel title="Observation log" detail={`${formatNumber(selectedMonitor.observations.length)} observation(s)`} icon={CalendarClock} action={<Button icon={Plus} onClick={addObservation} disabled={selectedMonitor.observations.length >= MAX_OBSERVATIONS}>Add observation</Button>}>
            <div className="space-y-3"><div className="flex flex-wrap gap-1.5">{[{ value: "all", label: "All results" }, ...OBSERVATION_RESULTS].map((option) => <button key={option.value} type="button" onClick={() => setObservationFilter(option.value)} className={`rounded-full border px-2.5 py-1 text-[8px] font-semibold transition ${observationFilter === option.value ? "border-cyan-300 bg-cyan-50 text-cyan-800" : "border-slate-200 bg-white text-slate-500 hover:border-cyan-200"}`}>{option.label}</button>)}</div>{filteredObservations.length ? <div className="space-y-2.5">{filteredObservations.map((observation) => <ObservationRow key={observation.id} observation={observation} onChange={(patch) => updateObservation(observation.id, patch)} onRemove={() => removeObservation(observation.id)} />)}</div> : <EmptyState title="No observations recorded" detail="Add a result after checking a priority journey or signal." icon={CalendarClock} />}</div>
          </Panel>

          <Panel title="Signal register" detail={`${formatNumber(selectedMonitor.signals.length)} signal(s) · ${formatNumber(metrics?.alerts || 0)} open`} icon={ShieldAlert} action={<Button icon={Plus} onClick={addSignal} disabled={selectedMonitor.signals.length >= MAX_SIGNALS}>Add signal</Button>}>
            <div className="space-y-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_160px]"><label className="relative block"><span className="sr-only">Search signals</span><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={signalSearch} onChange={(event) => setSignalSearch(event.target.value)} placeholder="Search signals, owners, or actions" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label><SelectField label="Level" value={signalFilter} onChange={setSignalFilter} options={SIGNAL_FILTERS} /></div>{filteredSignals.length ? <div className="space-y-2.5">{filteredSignals.map((signal) => <SignalRow key={signal.id} signal={signal} onChange={(patch) => updateSignal(signal.id, patch)} onRemove={() => removeSignal(signal.id)} />)}</div> : <EmptyState title="No signals recorded" detail="Add an alert when observed behavior needs follow-up or escalation." icon={ShieldAlert} />}</div>
          </Panel>

          <Panel title="Report evidence" detail={`${formatNumber(selectedMonitor.reportIds.length)} attached · ${formatNumber(filteredReports.length)} shown`} icon={FileCheck2} action={<Button icon={allVisibleReportsSelected ? X : Check} onClick={toggleVisibleReports}>{allVisibleReportsSelected ? "Clear shown" : "Select shown"}</Button>}>
            <div className="space-y-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_150px]"><label className="relative block"><span className="sr-only">Search reports</span><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Search report title or category" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label><SelectField label="Severity" value={reportFilter} onChange={setReportFilter} options={SIGNAL_FILTERS} /><SelectField label="Status" value={reportStatusFilter} onChange={setReportStatusFilter} options={[{ value: "all", label: "All statuses" }, { value: "open", label: "Open reports" }, { value: "resolved", label: "Resolved reports" }]} /></div>{filteredReports.length ? <div className="space-y-2">{filteredReports.slice(0, 20).map((report) => <ReportRow key={reportId(report)} report={report} checked={selectedMonitor.reportIds.includes(reportId(report))} onToggle={() => toggleReport(reportId(report))} onOpenReport={onOpenReport} />)}</div> : <EmptyState title="No reports match" detail="Adjust the report filters or wait for reports to be available." icon={FileCheck2} />}{filteredReports.length > 20 ? <p className="text-center text-[9px] text-slate-400">Showing the first 20 matching reports. Narrow the search to find a specific report.</p> : null}<div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3"><p className="flex items-center gap-1.5 text-[9px] font-semibold text-violet-800"><Users size={12} aria-hidden="true" /> Browser-local evidence</p><p className="mt-1 text-[9px] leading-4 text-violet-700/75">Selecting reports here stores only their IDs in this tester&apos;s browser. It does not update report status or ownership.</p></div></div>
          </Panel>

          <Panel title="Workspace actions" detail="Browser-local controls for this monitoring workspace." icon={RefreshCw}><div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-[9px] leading-4 text-slate-400">Reset clears watch items, observations, signals, criteria, and report links while preserving the monitor identity fields.</p><Button variant="danger" icon={RefreshCw} onClick={resetMonitor}>Reset monitoring data</Button></div></Panel>
        </div>
      </div>
    </section>
  );
}
