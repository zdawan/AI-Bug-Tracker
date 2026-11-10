"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Check,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";

const STORAGE_KEY = "tester-handoff-notes-v1";
const MAX_PACKAGES = 30;
const MAX_ACTIONS = 100;
const MAX_ACKNOWLEDGEMENTS = 80;
const MAX_REPORTS = 100;
const PAGE_SIZE = 8;

const PACKAGE_STATES = [
  { value: "draft", label: "Draft", tone: "slate" },
  { value: "preparing", label: "Preparing", tone: "cyan" },
  { value: "sent", label: "Sent", tone: "violet" },
  { value: "acknowledged", label: "Acknowledged", tone: "emerald" },
  { value: "needs-follow-up", label: "Needs follow-up", tone: "rose" },
  { value: "closed", label: "Closed", tone: "amber" },
];

const PACKAGE_FILTERS = [{ value: "all", label: "All packages" }, ...PACKAGE_STATES];

const ACTION_STATES = [
  { value: "open", label: "Open" },
  { value: "in-progress", label: "In progress" },
  { value: "waiting", label: "Waiting" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

const ACTION_FILTERS = [{ value: "all", label: "All actions" }, ...ACTION_STATES];

const PRIORITIES = [
  { value: "critical", label: "Critical", tone: "rose" },
  { value: "high", label: "High", tone: "orange" },
  { value: "medium", label: "Medium", tone: "amber" },
  { value: "low", label: "Low", tone: "emerald" },
];

const PRIORITY_FILTERS = [{ value: "all", label: "All priorities" }, ...PRIORITIES];

const ACK_STATES = [
  { value: "pending", label: "Pending" },
  { value: "read", label: "Read" },
  { value: "accepted", label: "Accepted" },
  { value: "question", label: "Question" },
  { value: "declined", label: "Declined" },
];

const CHECKS = [
  { id: "summary", label: "Summary is understandable", detail: "The recipient can see the recommendation without reopening every report." },
  { id: "scope", label: "Scope and build are named", detail: "The package is anchored to a release, build, or test window." },
  { id: "evidence", label: "Evidence is attached", detail: "Reports and supporting references are easy to locate." },
  { id: "risks", label: "Risks are called out", detail: "Known concerns include owners, status, or mitigation context." },
  { id: "actions", label: "Follow-up actions are assigned", detail: "Open work has a responsible person or team." },
  { id: "audience", label: "Audience is confirmed", detail: "The package is addressed to the right decision makers." },
  { id: "acknowledgement", label: "Acknowledgement path is clear", detail: "Recipients know how to respond or raise a question." },
];

const DEFAULT_ACTIONS = [
  { id: "review", title: "Review recommendation", owner: "", state: "open", priority: "high", dueDate: "", detail: "" },
  { id: "questions", title: "Resolve recipient questions", owner: "", state: "open", priority: "medium", dueDate: "", detail: "" },
  { id: "follow-up", title: "Confirm follow-up ownership", owner: "", state: "open", priority: "medium", dueDate: "", detail: "" },
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
  return PRIORITIES.some((item) => item.value === value) ? value : "medium";
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
    // Handoff notes remain usable if browser storage is unavailable.
  }
}

function packageMeta(value) {
  return PACKAGE_STATES.find((state) => state.value === value) || PACKAGE_STATES[0];
}

function priorityMeta(value) {
  return PRIORITIES.find((priority) => priority.value === value) || PRIORITIES[2];
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

function createPackage() {
  return {
    id: makeId("handoff"),
    name: "Untitled handoff package",
    release: "",
    owner: "",
    recipient: "",
    channel: "",
    state: "draft",
    sentDate: "",
    dueDate: "",
    summary: "",
    decision: "",
    constraints: "",
    checks: {
      summary: false,
      scope: false,
      evidence: false,
      risks: false,
      actions: false,
      audience: false,
      acknowledgement: false,
    },
    actions: DEFAULT_ACTIONS.map((item) => ({ ...item })),
    acknowledgements: [],
    reportIds: [],
    references: [],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function normalizePackage(value) {
  const source = value && typeof value === "object" ? value : createPackage();
  return {
    ...createPackage(),
    ...source,
    checks: { ...createPackage().checks, ...(source.checks || {}) },
    actions: Array.isArray(source.actions)
      ? source.actions.slice(0, MAX_ACTIONS).map((item) => ({
          id: makeId("action"),
          title: "",
          owner: "",
          state: "open",
          priority: "medium",
          dueDate: "",
          detail: "",
          ...item,
        }))
      : DEFAULT_ACTIONS.map((item) => ({ ...item })),
    acknowledgements: Array.isArray(source.acknowledgements)
      ? source.acknowledgements.slice(0, MAX_ACKNOWLEDGEMENTS).map((item) => ({
          id: makeId("ack"),
          recipient: "",
          role: "",
          state: "pending",
          date: "",
          response: "",
          ...item,
        }))
      : [],
    reportIds: Array.isArray(source.reportIds) ? source.reportIds.slice(0, MAX_REPORTS) : [],
    references: Array.isArray(source.references)
      ? source.references.slice(0, 40).map((item) => ({ id: makeId("reference"), label: "", url: "", ...item }))
      : [],
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
  const state = packageMeta(value);
  return <span className={`inline-flex rounded-full border text-[8px] font-semibold ${toneClasses(state.tone, true)}`}>{state.label}</span>;
}

function PriorityBadge({ value }) {
  const priority = priorityMeta(value);
  return <span className={`inline-flex rounded-full border text-[8px] font-semibold ${toneClasses(priority.tone, true)}`}>{priority.label}</span>;
}

function ProgressBar({ value, tone = "cyan" }) {
  const colors = { cyan: "bg-cyan-500", emerald: "bg-emerald-500", violet: "bg-violet-500", rose: "bg-rose-500" };
  return <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all ${colors[tone] || colors.cyan}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

function StatCard({ label, value, detail, icon: Icon, tone = "cyan" }) {
  const tones = { cyan: "bg-cyan-50 text-cyan-700", violet: "bg-violet-50 text-violet-700", emerald: "bg-emerald-50 text-emerald-700", rose: "bg-rose-50 text-rose-700" };
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm shadow-slate-200/20"><div className="flex items-center justify-between gap-2"><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><span className={`rounded-lg p-1.5 ${tones[tone] || tones.cyan}`}><Icon size={13} aria-hidden="true" /></span></div><p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-[9px] text-slate-400">{detail}</p></div>;
}

function CheckRow({ check, checked, onChange }) {
  return <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 transition hover:border-cyan-200"><input type="checkbox" checked={checked} onChange={onChange} className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-cyan-600 focus:ring-cyan-500" /><span><span className="block text-[10px] font-semibold text-slate-700">{check.label}</span><span className="mt-0.5 block text-[9px] leading-4 text-slate-400">{check.detail}</span></span></label>;
}

function EmptyState({ title, detail, icon: Icon = Clipboard }) {
  return <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center"><Icon size={21} aria-hidden="true" className="mx-auto text-slate-300" /><p className="mt-2 text-[10px] font-semibold text-slate-600">{title}</p><p className="mx-auto mt-1 max-w-sm text-[9px] leading-4 text-slate-400">{detail}</p></div>;
}

function PackageCard({ packageValue, selected, metrics, onSelect }) {
  return <button type="button" onClick={onSelect} className={`w-full rounded-xl border p-3 text-left transition ${selected ? "border-cyan-300 bg-cyan-50/50 shadow-sm" : "border-slate-200/80 bg-white hover:border-cyan-200"}`}><div className="flex items-start justify-between gap-2"><span className="min-w-0 truncate text-[10px] font-semibold text-slate-800">{packageValue.name || "Untitled handoff package"}</span><StateBadge value={packageValue.state} /></div><p className="mt-1 truncate text-[9px] text-slate-400">{packageValue.release || "No release target yet"}</p><div className="mt-3 flex items-center justify-between text-[8px] text-slate-400"><span>{formatNumber(metrics.actionsDone)} done</span><span>{formatNumber(metrics.pendingAcks)} pending</span><span>{metrics.readiness}% ready</span></div><div className="mt-2"><ProgressBar value={metrics.readiness} tone={packageValue.state === "needs-follow-up" ? "rose" : "cyan"} /></div></button>;
}

function ActionRow({ action, onChange, onRemove }) {
  return <div className="rounded-xl border border-slate-200/80 bg-white p-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1.3fr)_130px_120px_140px_auto]"><Field label="Action" value={action.title} onChange={(value) => onChange({ title: value })} placeholder="What should happen next?" /><SelectField label="State" value={action.state} onChange={(value) => onChange({ state: value })} options={ACTION_STATES} /><SelectField label="Priority" value={action.priority} onChange={(value) => onChange({ priority: value })} options={PRIORITIES} /><Field label="Owner" value={action.owner} onChange={(value) => onChange({ owner: value })} placeholder="Name or team" /><div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove action" onClick={onRemove}>Remove</Button></div></div><div className="mt-3 grid gap-2 md:grid-cols-[140px_minmax(0,1fr)]"><Field label="Due date" type="date" value={action.dueDate} onChange={(value) => onChange({ dueDate: value })} /><Field label="Detail" value={action.detail} onChange={(value) => onChange({ detail: value })} placeholder="Context or acceptance note" /></div></div>;
}

function AcknowledgementRow({ acknowledgement, onChange, onRemove }) {
  return <div className="rounded-xl border border-slate-200/80 bg-white p-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1.1fr)_140px_130px_130px_auto]"><Field label="Recipient" value={acknowledgement.recipient} onChange={(value) => onChange({ recipient: value })} placeholder="Name or team" /><Field label="Role" value={acknowledgement.role} onChange={(value) => onChange({ role: value })} placeholder="Product" /><SelectField label="Response" value={acknowledgement.state} onChange={(value) => onChange({ state: value })} options={ACK_STATES} /><Field label="Date" type="date" value={acknowledgement.date} onChange={(value) => onChange({ date: value })} /><div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove acknowledgement" onClick={onRemove}>Remove</Button></div></div><div className="mt-3"><Field label="Response detail" value={acknowledgement.response} onChange={(value) => onChange({ response: value })} placeholder="Question, acceptance note, or follow-up" /></div></div>;
}

function ReferenceRow({ reference, onChange, onRemove }) {
  return <div className="grid gap-2 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto]"><Field label="Label" value={reference.label} onChange={(value) => onChange({ label: value })} placeholder="Runbook" /><Field label="URL or reference" value={reference.url} onChange={(value) => onChange({ url: value })} placeholder="https://..." /><div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove reference" onClick={onRemove}>Remove</Button></div></div>;
}

function ReportRow({ report, checked, onToggle, onOpenReport }) {
  return <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3"><input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 rounded border-slate-300 accent-cyan-600 focus:ring-cyan-500" aria-label={`Attach ${reportTitle(report)}`} /><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-slate-700">{reportTitle(report)}</p><p className="mt-1 truncate text-[9px] text-slate-400">{reportCategory(report)} · {reportStatus(report) === "resolved" ? "Resolved" : "Open"}</p></div><PriorityBadge value={reportSeverity(report)} />{onOpenReport ? <button type="button" onClick={() => onOpenReport(report)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-cyan-700" title="Open report"><ExternalLink size={13} aria-hidden="true" /></button> : null}</div>;
}

function Guidance({ packageValue, metrics, evidenceCount }) {
  const suggestions = [];
  if (!packageValue.summary) suggestions.push("Write a concise recipient-facing summary.");
  if (!packageValue.recipient) suggestions.push("Name the person or team receiving this package.");
  if (!evidenceCount) suggestions.push("Attach at least one report or reference.");
  if (metrics.pendingAcks) suggestions.push(`Track ${metrics.pendingAcks} pending acknowledgement(s).`);
  if (metrics.openActions) suggestions.push(`Review ${metrics.openActions} open follow-up action(s).`);
  if (!packageValue.decision) suggestions.push("State the decision or response you need.");
  if (!suggestions.length) suggestions.push("The handoff package has enough context for recipient review.");
  return <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-3.5"><div className="flex items-start gap-2"><Sparkles size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-cyan-600" /><div><p className="text-[10px] font-semibold text-cyan-900">Suggested next moves</p><p className="mt-1 text-[9px] leading-4 text-cyan-800/70">Private prompts based on this package.</p></div></div><ul className="mt-3 space-y-1.5">{suggestions.map((suggestion) => <li key={suggestion} className="flex items-start gap-2 text-[9px] leading-4 text-cyan-800/80"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-cyan-500" />{suggestion}</li>)}</ul><p className="mt-3 border-t border-cyan-100 pt-3 text-[8px] leading-4 text-cyan-800/60">This workspace does not send messages, change report status, or update server-side ownership.</p></div>;
}

function PackageHeader({ packageValue, onChange, onDelete, onDuplicate }) {
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><Send size={17} aria-hidden="true" className="text-cyan-600" /><h2 className="truncate text-sm font-semibold text-slate-900">{packageValue.name || "Untitled handoff package"}</h2><StateBadge value={packageValue.state} /></div><p className="mt-1 pl-6 text-[9px] text-slate-400">Private stakeholder handoff workspace</p></div><div className="flex flex-wrap gap-1.5"><Button icon={Copy} onClick={onDuplicate}>Duplicate</Button><Button variant="danger" icon={Trash2} onClick={onDelete}>Delete</Button></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Package name" value={packageValue.name} onChange={(value) => onChange({ name: value })} placeholder="Release decision handoff" /><Field label="Release / build" value={packageValue.release} onChange={(value) => onChange({ release: value })} placeholder="v2.4.0 / build 1842" /><Field label="Owner" value={packageValue.owner} onChange={(value) => onChange({ owner: value })} placeholder="Tester or team" /><SelectField label="Package state" value={packageValue.state} onChange={(value) => onChange({ state: value })} options={PACKAGE_STATES} /></div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Recipient" value={packageValue.recipient} onChange={(value) => onChange({ recipient: value })} placeholder="Release manager" /><Field label="Channel" value={packageValue.channel} onChange={(value) => onChange({ channel: value })} placeholder="Email / Slack / meeting" /><Field label="Sent date" type="date" value={packageValue.sentDate} onChange={(value) => onChange({ sentDate: value })} /><Field label="Response due" type="date" value={packageValue.dueDate} onChange={(value) => onChange({ dueDate: value })} /></div></div>;
}

export default function TesterHandoffNotesWorkspace({ reports = [], email = "", onOpenReport }) {
  const [packages, setPackages] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [packageFilter, setPackageFilter] = useState("all");
  const [packageSearch, setPackageSearch] = useState("");
  const [sortAscending, setSortAscending] = useState(false);
  const [showAllPackages, setShowAllPackages] = useState(false);
  const [actionFilter, setActionFilter] = useState("all");
  const [actionSearch, setActionSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [reportSearch, setReportSearch] = useState("");
  const [reportFilter, setReportFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const stored = readStorage(email);
    if (stored && Array.isArray(stored.packages) && stored.packages.length) {
      const restored = stored.packages.slice(0, MAX_PACKAGES).map(normalizePackage);
      setPackages(restored);
      setSelectedId(stored.selectedId || restored[0].id);
      return;
    }
    const initial = createPackage();
    initial.name = "Release handoff package";
    initial.sentDate = today();
    setPackages([initial]);
    setSelectedId(initial.id);
  }, [email]);

  useEffect(() => {
    if (!packages.length) return;
    writeStorage(email, { packages, selectedId });
  }, [email, packages, selectedId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const selectedPackage = useMemo(() => packages.find((packageValue) => packageValue.id === selectedId) || packages[0] || null, [packages, selectedId]);

  const metricsByPackage = useMemo(() => {
    const result = new Map();
    packages.forEach((packageValue) => {
      const actionsDone = packageValue.actions.filter((action) => ["done", "cancelled"].includes(action.state)).length;
      const openActions = packageValue.actions.filter((action) => !["done", "cancelled"].includes(action.state)).length;
      const pendingAcks = packageValue.acknowledgements.filter((ack) => ["pending", "question"].includes(ack.state)).length;
      const ackDone = packageValue.acknowledgements.filter((ack) => ["read", "accepted", "declined"].includes(ack.state)).length;
      const checksDone = Object.values(packageValue.checks).filter(Boolean).length;
      const checkProgress = Math.round((checksDone / CHECKS.length) * 100);
      const actionProgress = packageValue.actions.length ? Math.round((actionsDone / packageValue.actions.length) * 100) : 0;
      const ackProgress = packageValue.acknowledgements.length ? Math.round((ackDone / packageValue.acknowledgements.length) * 100) : 0;
      const readiness = Math.round((checkProgress * 0.45) + (actionProgress * 0.3) + (ackProgress * 0.25));
      result.set(packageValue.id, { actionsDone, openActions, pendingAcks, ackDone, checkProgress, actionProgress, ackProgress, readiness });
    });
    return result;
  }, [packages]);

  const filteredPackages = useMemo(() => {
    const query = packageSearch.trim().toLowerCase();
    const result = packages.filter((packageValue) => {
      const stateMatch = packageFilter === "all" || packageValue.state === packageFilter;
      const haystack = `${packageValue.name} ${packageValue.release} ${packageValue.owner} ${packageValue.recipient} ${packageValue.channel}`.toLowerCase();
      return stateMatch && (!query || haystack.includes(query));
    });
    result.sort((left, right) => {
      const comparison = (left.name || "").localeCompare(right.name || "");
      return sortAscending ? comparison : -comparison;
    });
    return result;
  }, [packageFilter, packageSearch, packages, sortAscending]);

  const visiblePackages = showAllPackages ? filteredPackages : filteredPackages.slice(0, PAGE_SIZE);

  const filteredActions = useMemo(() => {
    if (!selectedPackage) return [];
    const query = actionSearch.trim().toLowerCase();
    return selectedPackage.actions.filter((action) => {
      const stateMatch = actionFilter === "all" || action.state === actionFilter;
      const priorityMatch = priorityFilter === "all" || action.priority === priorityFilter;
      const searchMatch = !query || `${action.title} ${action.owner} ${action.detail}`.toLowerCase().includes(query);
      return stateMatch && priorityMatch && searchMatch;
    });
  }, [actionFilter, actionSearch, priorityFilter, selectedPackage]);

  const filteredReports = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();
    return reports.filter((report) => {
      const searchMatch = !query || `${reportTitle(report)} ${reportCategory(report)}`.toLowerCase().includes(query);
      const priorityMatch = reportFilter === "all" || reportSeverity(report) === reportFilter;
      const statusMatch = reportStatusFilter === "all" || reportStatus(report) === reportStatusFilter;
      return searchMatch && priorityMatch && statusMatch;
    });
  }, [reportFilter, reportSearch, reportStatusFilter, reports]);

  const selectedReports = useMemo(() => reports.filter((report) => selectedPackage?.reportIds.includes(reportId(report))), [reports, selectedPackage]);
  const metrics = selectedPackage ? metricsByPackage.get(selectedPackage.id) : null;

  const updatePackage = (patch) => {
    if (!selectedPackage) return;
    setPackages((current) => current.map((packageValue) => packageValue.id === selectedPackage.id ? { ...packageValue, ...patch, updatedAt: new Date().toISOString() } : packageValue));
  };

  const updateAction = (id, patch) => updatePackage({ actions: selectedPackage.actions.map((action) => action.id === id ? { ...action, ...patch } : action) });
  const updateAcknowledgement = (id, patch) => updatePackage({ acknowledgements: selectedPackage.acknowledgements.map((ack) => ack.id === id ? { ...ack, ...patch } : ack) });
  const updateReference = (id, patch) => updatePackage({ references: selectedPackage.references.map((reference) => reference.id === id ? { ...reference, ...patch } : reference) });

  const createNewPackage = () => {
    if (packages.length >= MAX_PACKAGES) {
      setNotice(`Maximum of ${MAX_PACKAGES} handoff packages reached.`);
      return;
    }
    const packageValue = createPackage();
    packageValue.name = `Handoff package ${packages.length + 1}`;
    setPackages((current) => [packageValue, ...current]);
    setSelectedId(packageValue.id);
    setNotice("New handoff package created.");
  };

  const duplicatePackage = () => {
    if (!selectedPackage || packages.length >= MAX_PACKAGES) return;
    const copy = normalizePackage({ ...selectedPackage, id: makeId("handoff"), name: `${selectedPackage.name || "Handoff package"} copy`, state: "draft", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setPackages((current) => [copy, ...current]);
    setSelectedId(copy.id);
    setNotice("Handoff package duplicated.");
  };

  const deletePackage = () => {
    if (!selectedPackage) return;
    if (packages.length === 1) {
      setNotice("Keep at least one handoff package available.");
      return;
    }
    const remaining = packages.filter((packageValue) => packageValue.id !== selectedPackage.id);
    setPackages(remaining);
    setSelectedId(remaining[0]?.id || "");
    setNotice("Handoff package removed.");
  };

  const addAction = () => {
    if (!selectedPackage || selectedPackage.actions.length >= MAX_ACTIONS) return;
    updatePackage({ actions: [...selectedPackage.actions, { id: makeId("action"), title: "", owner: "", state: "open", priority: "medium", dueDate: "", detail: "" }] });
  };

  const removeAction = (id) => updatePackage({ actions: selectedPackage.actions.filter((action) => action.id !== id) });

  const addAcknowledgement = () => {
    if (!selectedPackage || selectedPackage.acknowledgements.length >= MAX_ACKNOWLEDGEMENTS) return;
    updatePackage({ acknowledgements: [...selectedPackage.acknowledgements, { id: makeId("ack"), recipient: "", role: "", state: "pending", date: "", response: "" }] });
  };

  const removeAcknowledgement = (id) => updatePackage({ acknowledgements: selectedPackage.acknowledgements.filter((ack) => ack.id !== id) });

  const addReference = () => {
    if (!selectedPackage || selectedPackage.references.length >= 40) return;
    updatePackage({ references: [...selectedPackage.references, { id: makeId("reference"), label: "", url: "" }] });
  };

  const removeReference = (id) => updatePackage({ references: selectedPackage.references.filter((reference) => reference.id !== id) });

  const toggleReport = (id) => {
    const ids = selectedPackage.reportIds.includes(id) ? selectedPackage.reportIds.filter((value) => value !== id) : [...selectedPackage.reportIds, id].slice(0, MAX_REPORTS);
    updatePackage({ reportIds: ids });
  };

  const toggleVisibleReports = () => {
    const visibleIds = filteredReports.map(reportId).filter(Boolean);
    const allSelected = visibleIds.every((id) => selectedPackage.reportIds.includes(id));
    const nextIds = allSelected ? selectedPackage.reportIds.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selectedPackage.reportIds, ...visibleIds])).slice(0, MAX_REPORTS);
    updatePackage({ reportIds: nextIds });
  };

  const summaryText = useMemo(() => {
    if (!selectedPackage) return "";
    const pending = selectedPackage.acknowledgements.filter((ack) => ["pending", "question"].includes(ack.state));
    const actions = selectedPackage.actions.filter((action) => !["done", "cancelled"].includes(action.state));
    return [
      `${selectedPackage.name || "Untitled handoff package"} — ${packageMeta(selectedPackage.state).label}`,
      `Release: ${selectedPackage.release || "Not specified"}`,
      `Owner: ${selectedPackage.owner || "Not assigned"} · Recipient: ${selectedPackage.recipient || "Not assigned"}`,
      `Channel: ${selectedPackage.channel || "Not specified"}`,
      `Readiness: ${metrics?.readiness || 0}%`,
      `Reports attached: ${selectedReports.length}`,
      `Pending acknowledgements: ${pending.length}`,
      "",
      selectedPackage.summary || "No summary has been written yet.",
      "",
      "Decision requested:",
      selectedPackage.decision || "Not specified",
      "",
      "Open actions:",
      ...(actions.length ? actions.map((action) => `- ${action.title || "Untitled action"} [${action.priority}]`) : ["- None"]),
      "",
      "Constraints:",
      selectedPackage.constraints || "None recorded",
    ].join("\n");
  }, [metrics, selectedPackage, selectedReports]);

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setNotice("Handoff summary copied.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setNotice("Clipboard access is unavailable.");
    }
  };

  const exportPackage = () => {
    if (!selectedPackage) return;
    const rows = [
      ["Handoff package", "Value"],
      ["Name", selectedPackage.name],
      ["Release", selectedPackage.release],
      ["State", packageMeta(selectedPackage.state).label],
      ["Owner", selectedPackage.owner],
      ["Recipient", selectedPackage.recipient],
      ["Channel", selectedPackage.channel],
      ["Sent date", selectedPackage.sentDate],
      ["Response due", selectedPackage.dueDate],
      ["Readiness", `${metrics?.readiness || 0}%`],
      [],
      ["Action", "Owner", "State", "Priority", "Due", "Detail"],
      ...selectedPackage.actions.map((action) => [action.title, action.owner, action.state, action.priority, action.dueDate, action.detail]),
      [],
      ["Recipient", "Role", "Response", "Date", "Detail"],
      ...selectedPackage.acknowledgements.map((ack) => [ack.recipient, ack.role, ack.state, ack.date, ack.response]),
      [],
      ["Reference", "URL"],
      ...selectedPackage.references.map((reference) => [reference.label, reference.url]),
    ];
    downloadCsv("handoff-package.csv", rows);
    setNotice("Handoff export downloaded.");
  };

  const resetPackage = () => {
    if (!selectedPackage) return;
    const reset = createPackage();
    reset.id = selectedPackage.id;
    reset.name = selectedPackage.name;
    reset.release = selectedPackage.release;
    reset.owner = selectedPackage.owner;
    reset.recipient = selectedPackage.recipient;
    reset.channel = selectedPackage.channel;
    reset.sentDate = selectedPackage.sentDate;
    reset.dueDate = selectedPackage.dueDate;
    updatePackage(reset);
    setNotice("Handoff planning data reset.");
  };

  if (!selectedPackage) return null;

  const allVisibleReportsSelected = filteredReports.length > 0 && filteredReports.every((report) => selectedPackage.reportIds.includes(reportId(report)));
  const highActions = selectedPackage.actions.filter((action) => !["done", "cancelled"].includes(action.state) && ["critical", "high"].includes(action.priority)).length;

  return (
    <section id="tester-handoff-notes" className="space-y-4 rounded-3xl bg-slate-50/70 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="flex items-center gap-2"><Send size={18} aria-hidden="true" className="text-cyan-600" /><h2 className="text-base font-semibold tracking-tight text-slate-900">Handoff notes workspace</h2></div><p className="mt-1 max-w-2xl text-[10px] leading-5 text-slate-500">Prepare recipient-ready release context, track acknowledgements, and keep follow-up ownership visible.</p></div>
        <div className="flex flex-wrap gap-1.5"><Button icon={Plus} variant="primary" onClick={createNewPackage}>New package</Button><Button icon={Download} onClick={exportPackage}>Export</Button><Button icon={copied ? Check : Copy} onClick={copySummary}>{copied ? "Copied" : "Copy summary"}</Button></div>
      </div>
      {notice ? <div className="flex items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2.5 text-[9px] font-medium text-cyan-800"><CheckCircle2 size={13} aria-hidden="true" />{notice}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Panel title="Handoff packages" detail={`${formatNumber(filteredPackages.length)} matching package(s)`} icon={Send} action={<Button variant="ghost" icon={sortAscending ? ArrowUpAZ : ArrowDownAZ} onClick={() => setSortAscending((value) => !value)} title="Toggle package sort" />}>
          <div className="space-y-2.5"><div className="relative"><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={packageSearch} onChange={(event) => setPackageSearch(event.target.value)} placeholder="Search packages" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></div><SelectField label="State filter" value={packageFilter} onChange={setPackageFilter} options={PACKAGE_FILTERS} />{visiblePackages.length ? <div className="space-y-2">{visiblePackages.map((packageValue) => <PackageCard key={packageValue.id} packageValue={packageValue} selected={packageValue.id === selectedPackage.id} onSelect={() => setSelectedId(packageValue.id)} metrics={metricsByPackage.get(packageValue.id) || { actionsDone: 0, pendingAcks: 0, readiness: 0 }} />)}</div> : <EmptyState title="No matching packages" detail="Try clearing the search or state filter." icon={Search} />}{filteredPackages.length > PAGE_SIZE ? <Button variant="ghost" onClick={() => setShowAllPackages((value) => !value)}>{showAllPackages ? "Show fewer" : `Show all ${filteredPackages.length}`}</Button> : null}</div>
        </Panel>

        <div className="min-w-0 space-y-4">
          <PackageHeader packageValue={selectedPackage} onChange={updatePackage} onDelete={deletePackage} onDuplicate={duplicatePackage} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Readiness" value={`${metrics?.readiness || 0}%`} detail="Combined handoff signal" icon={ShieldCheck} tone="cyan" /><StatCard label="Actions" value={`${metrics?.actionsDone || 0}/${selectedPackage.actions.length}`} detail="Follow-up complete" icon={CheckCircle2} tone="violet" /><StatCard label="Pending" value={formatNumber(metrics?.pendingAcks || 0)} detail="Acknowledgements" icon={Users} tone="rose" /><StatCard label="Evidence" value={formatNumber(selectedReports.length)} detail="Reports attached" icon={FileCheck2} tone="emerald" /></div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <Panel title="Recipient briefing" detail="Write the context the audience should receive first." icon={MessageSquareText}><div className="space-y-3"><TextArea label="Summary" value={selectedPackage.summary} onChange={(value) => updatePackage({ summary: value })} placeholder="What changed, what was tested, and what should the recipient know?" rows={4} /><TextArea label="Decision requested" value={selectedPackage.decision} onChange={(value) => updatePackage({ decision: value })} placeholder="What response, approval, or acknowledgement is needed?" rows={3} /><TextArea label="Constraints and caveats" value={selectedPackage.constraints} onChange={(value) => updatePackage({ constraints: value })} placeholder="Known limitations, timing constraints, or conditions." rows={3} /><Guidance packageValue={selectedPackage} metrics={metrics || { pendingAcks: 0, openActions: 0 }} evidenceCount={selectedReports.length + selectedPackage.references.length} /></div></Panel>
            <Panel title="Handoff quality" detail={`${metrics?.checkProgress || 0}% complete`} icon={ShieldCheck}><div className="space-y-2">{CHECKS.map((check) => <CheckRow key={check.id} check={check} checked={Boolean(selectedPackage.checks[check.id])} onChange={(event) => updatePackage({ checks: { ...selectedPackage.checks, [check.id]: event.target.checked } })} />)}</div></Panel>
          </div>

          <Panel title="Follow-up actions" detail={`${formatNumber(selectedPackage.actions.length)} action(s) · ${highActions} high priority open`} icon={Clipboard} action={<Button icon={Plus} onClick={addAction} disabled={selectedPackage.actions.length >= MAX_ACTIONS}>Add action</Button>}>
            <div className="space-y-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_150px]"><label className="relative block"><span className="sr-only">Search actions</span><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={actionSearch} onChange={(event) => setActionSearch(event.target.value)} placeholder="Search actions, owners, or details" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label><SelectField label="State" value={actionFilter} onChange={setActionFilter} options={ACTION_FILTERS} /><SelectField label="Priority" value={priorityFilter} onChange={setPriorityFilter} options={PRIORITY_FILTERS} /></div>{filteredActions.length ? <div className="space-y-2.5">{filteredActions.map((action) => <ActionRow key={action.id} action={action} onChange={(patch) => updateAction(action.id, patch)} onRemove={() => removeAction(action.id)} />)}</div> : <EmptyState title="No actions match" detail="Adjust the filters or add a new handoff action." icon={Clipboard} />}</div>
          </Panel>

          <Panel title="Acknowledgements" detail={`${formatNumber(selectedPackage.acknowledgements.length)} recipient response(s)`} icon={Users} action={<Button icon={Plus} onClick={addAcknowledgement} disabled={selectedPackage.acknowledgements.length >= MAX_ACKNOWLEDGEMENTS}>Add recipient</Button>}>
            <div className="space-y-2.5">{selectedPackage.acknowledgements.length ? selectedPackage.acknowledgements.map((acknowledgement) => <AcknowledgementRow key={acknowledgement.id} acknowledgement={acknowledgement} onChange={(patch) => updateAcknowledgement(acknowledgement.id, patch)} onRemove={() => removeAcknowledgement(acknowledgement.id)} />) : <EmptyState title="No recipient responses" detail="Add people or teams who need to read and respond to this package." icon={Users} />}</div>
          </Panel>

          <Panel title="Report evidence" detail={`${formatNumber(selectedPackage.reportIds.length)} attached · ${formatNumber(filteredReports.length)} shown`} icon={FileCheck2} action={<Button icon={allVisibleReportsSelected ? X : Check} onClick={toggleVisibleReports}>{allVisibleReportsSelected ? "Clear shown" : "Select shown"}</Button>}>
            <div className="space-y-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_150px]"><label className="relative block"><span className="sr-only">Search reports</span><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Search report title or category" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label><SelectField label="Severity" value={reportFilter} onChange={setReportFilter} options={PRIORITY_FILTERS} /><SelectField label="Status" value={reportStatusFilter} onChange={setReportStatusFilter} options={[{ value: "all", label: "All statuses" }, { value: "open", label: "Open reports" }, { value: "resolved", label: "Resolved reports" }]} /></div>{filteredReports.length ? <div className="space-y-2">{filteredReports.slice(0, 20).map((report) => <ReportRow key={reportId(report)} report={report} checked={selectedPackage.reportIds.includes(reportId(report))} onToggle={() => toggleReport(reportId(report))} onOpenReport={onOpenReport} />)}</div> : <EmptyState title="No reports match" detail="Adjust the report filters or wait for reports to be available." icon={FileCheck2} />}<div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3"><p className="flex items-center gap-1.5 text-[9px] font-semibold text-violet-800"><Users size={12} aria-hidden="true" /> Browser-local evidence</p><p className="mt-1 text-[9px] leading-4 text-violet-700/75">Selecting reports here stores only their IDs in this tester&apos;s browser. It does not update report status or ownership.</p></div></div>
          </Panel>

          <Panel title="Reference links" detail={`${formatNumber(selectedPackage.references.length)} supporting reference(s)`} icon={ExternalLink} action={<Button icon={Plus} onClick={addReference} disabled={selectedPackage.references.length >= 40}>Add link</Button>}><div className="space-y-3">{selectedPackage.references.length ? selectedPackage.references.map((reference) => <ReferenceRow key={reference.id} reference={reference} onChange={(patch) => updateReference(reference.id, patch)} onRemove={() => removeReference(reference.id)} />) : <EmptyState title="No reference links" detail="Keep a runbook, build, incident, or design reference close to the handoff." icon={ExternalLink} />}</div></Panel>

          <Panel title="Workspace actions" detail="Browser-local controls for this handoff workspace." icon={ShieldCheck}><div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-[9px] leading-4 text-slate-400">Reset clears actions, acknowledgements, references, checks, and report links while preserving package identity fields.</p><Button variant="danger" icon={RefreshCw} onClick={resetPackage}>Reset handoff data</Button></div></Panel>
        </div>
      </div>
    </section>
  );
}
