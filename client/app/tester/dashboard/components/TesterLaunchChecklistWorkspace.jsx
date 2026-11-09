"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  Flag,
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

const STORAGE_KEY = "tester-launch-checklist-v1";
const MAX_PLANS = 25;
const MAX_ITEMS = 100;
const MAX_SCENARIOS = 80;
const MAX_EVIDENCE = 100;
const MAX_NOTES = 100;
const PAGE_SIZE = 8;

const PLAN_STATES = [
  { value: "draft", label: "Draft", tone: "slate" },
  { value: "executing", label: "Executing", tone: "cyan" },
  { value: "review", label: "In review", tone: "violet" },
  { value: "ready", label: "Ready", tone: "emerald" },
  { value: "blocked", label: "Blocked", tone: "rose" },
  { value: "complete", label: "Complete", tone: "amber" },
];

const PLAN_STATE_FILTERS = [
  { value: "all", label: "All plans" },
  ...PLAN_STATES,
];

const ITEM_STATES = [
  { value: "todo", label: "To do" },
  { value: "in-progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
  { value: "not-applicable", label: "Not applicable" },
];

const ITEM_STATE_FILTERS = [
  { value: "all", label: "All item states" },
  ...ITEM_STATES,
];

const PRIORITIES = [
  { value: "critical", label: "Critical", tone: "rose" },
  { value: "high", label: "High", tone: "orange" },
  { value: "medium", label: "Medium", tone: "amber" },
  { value: "low", label: "Low", tone: "emerald" },
];

const PRIORITY_FILTERS = [
  { value: "all", label: "All priorities" },
  ...PRIORITIES,
];

const SCENARIO_STATES = [
  { value: "planned", label: "Planned" },
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "blocked", label: "Blocked" },
  { value: "skipped", label: "Skipped" },
];

const EVIDENCE_TYPES = [
  { value: "report", label: "Report" },
  { value: "screenshot", label: "Screenshot" },
  { value: "video", label: "Video" },
  { value: "log", label: "Log" },
  { value: "note", label: "Test note" },
  { value: "link", label: "External link" },
];

const CHECKS = [
  {
    id: "scope",
    label: "Launch scope is confirmed",
    detail: "The target build, feature area, and excluded work are understood.",
  },
  {
    id: "smoke",
    label: "Smoke path is green",
    detail: "The primary journey works from entry point through completion.",
  },
  {
    id: "regression",
    label: "Regression surface is covered",
    detail: "Nearby flows and recent changes have representative checks.",
  },
  {
    id: "severity",
    label: "Severity review is complete",
    detail: "Critical and high findings have a disposition or owner.",
  },
  {
    id: "evidence",
    label: "Evidence is attached",
    detail: "The launch recommendation can be verified without repeating the run.",
  },
  {
    id: "handoff",
    label: "Handoff audience is named",
    detail: "The person or team receiving the launch recommendation is clear.",
  },
  {
    id: "rollback",
    label: "Rollback path is known",
    detail: "A mitigation, rollback, or containment action is documented.",
  },
  {
    id: "monitoring",
    label: "Post-launch monitoring is planned",
    detail: "Someone knows what to watch after the release decision.",
  },
];

const DEFAULT_ITEMS = [
  {
    id: "environment",
    title: "Verify target environment",
    state: "todo",
    priority: "high",
    owner: "",
    dueDate: "",
    note: "",
  },
  {
    id: "smoke",
    title: "Complete critical smoke path",
    state: "todo",
    priority: "critical",
    owner: "",
    dueDate: "",
    note: "",
  },
  {
    id: "regression",
    title: "Review regression-sensitive areas",
    state: "todo",
    priority: "high",
    owner: "",
    dueDate: "",
    note: "",
  },
  {
    id: "evidence",
    title: "Attach launch evidence",
    state: "todo",
    priority: "medium",
    owner: "",
    dueDate: "",
    note: "",
  },
  {
    id: "handoff",
    title: "Share launch recommendation",
    state: "todo",
    priority: "medium",
    owner: "",
    dueDate: "",
    note: "",
  },
];

const DEFAULT_CHECKS = {
  scope: false,
  smoke: false,
  regression: false,
  severity: false,
  evidence: false,
  handoff: false,
  rollback: false,
  monitoring: false,
};

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
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
    window.localStorage.setItem(
      `${STORAGE_KEY}:${email || "anonymous"}`,
      JSON.stringify(value),
    );
  } catch {
    // Local storage is optional and can be unavailable in private browsing.
  }
}

function planStateMeta(value) {
  return PLAN_STATES.find((state) => state.value === value) || PLAN_STATES[0];
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

function createPlan() {
  return {
    id: makeId("launch"),
    name: "Untitled launch checklist",
    release: "",
    owner: "",
    recipient: "",
    environment: "",
    targetDate: "",
    state: "draft",
    recommendation: "",
    rollback: "",
    monitoring: "",
    checks: { ...DEFAULT_CHECKS },
    items: DEFAULT_ITEMS.map((item) => ({ ...item })),
    scenarios: [],
    evidence: [],
    notes: [],
    reportIds: [],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function normalizePlan(value) {
  const source = value && typeof value === "object" ? value : createPlan();
  return {
    ...createPlan(),
    ...source,
    checks: { ...DEFAULT_CHECKS, ...(source.checks || {}) },
    items: Array.isArray(source.items)
      ? source.items.slice(0, MAX_ITEMS).map((item) => ({
          id: makeId("item"),
          title: "",
          state: "todo",
          priority: "medium",
          owner: "",
          dueDate: "",
          note: "",
          ...item,
        }))
      : DEFAULT_ITEMS.map((item) => ({ ...item })),
    scenarios: Array.isArray(source.scenarios)
      ? source.scenarios.slice(0, MAX_SCENARIOS).map((scenario) => ({
          id: makeId("scenario"),
          title: "",
          area: "",
          state: "planned",
          owner: "",
          note: "",
          ...scenario,
        }))
      : [],
    evidence: Array.isArray(source.evidence)
      ? source.evidence.slice(0, MAX_EVIDENCE).map((item) => ({
          id: makeId("evidence"),
          type: "note",
          label: "",
          reference: "",
          note: "",
          ...item,
        }))
      : [],
    notes: Array.isArray(source.notes)
      ? source.notes.slice(0, MAX_NOTES).map((item) => ({
          id: makeId("note"),
          title: "",
          body: "",
          author: "",
          createdAt: new Date().toISOString(),
          ...item,
        }))
      : [],
    reportIds: Array.isArray(source.reportIds) ? source.reportIds.slice(0, MAX_EVIDENCE) : [],
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
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[9px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]}`}
    >
      {Icon ? <Icon size={12} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] leading-4 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 pr-7 text-[10px] text-slate-700 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <ChevronDown size={12} aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
      </span>
    </label>
  );
}

function StateBadge({ value }) {
  const state = planStateMeta(value);
  return <span className={`inline-flex rounded-full border text-[8px] font-semibold ${toneClasses(state.tone, true)}`}>{state.label}</span>;
}

function PriorityBadge({ value }) {
  const priority = priorityMeta(value);
  return <span className={`inline-flex rounded-full border text-[8px] font-semibold ${toneClasses(priority.tone, true)}`}>{priority.label}</span>;
}

function ProgressBar({ value, tone = "cyan" }) {
  const colors = {
    cyan: "bg-cyan-500",
    emerald: "bg-emerald-500",
    violet: "bg-violet-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full transition-all ${colors[tone] || colors.cyan}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function StatCard({ label, value, detail, icon: Icon, tone = "cyan" }) {
  const tones = {
    cyan: "bg-cyan-50 text-cyan-700",
    violet: "bg-violet-50 text-violet-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm shadow-slate-200/20">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <span className={`rounded-lg p-1.5 ${tones[tone] || tones.cyan}`}><Icon size={13} aria-hidden="true" /></span>
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-[9px] text-slate-400">{detail}</p>
    </div>
  );
}

function CheckRow({ check, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 transition hover:border-cyan-200">
      <input type="checkbox" checked={checked} onChange={onChange} className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-cyan-600 focus:ring-cyan-500" />
      <span>
        <span className="block text-[10px] font-semibold text-slate-700">{check.label}</span>
        <span className="mt-0.5 block text-[9px] leading-4 text-slate-400">{check.detail}</span>
      </span>
    </label>
  );
}

function EmptyState({ title, detail, icon: Icon = ClipboardCheck }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
      <Icon size={21} aria-hidden="true" className="mx-auto text-slate-300" />
      <p className="mt-2 text-[10px] font-semibold text-slate-600">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[9px] leading-4 text-slate-400">{detail}</p>
    </div>
  );
}

function PlanCard({ plan, selected, metrics, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-3 text-left transition ${selected ? "border-cyan-300 bg-cyan-50/50 shadow-sm" : "border-slate-200/80 bg-white hover:border-cyan-200"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-[10px] font-semibold text-slate-800">{plan.name || "Untitled launch checklist"}</span>
        <StateBadge value={plan.state} />
      </div>
      <p className="mt-1 truncate text-[9px] text-slate-400">{plan.release || "No build target yet"}</p>
      <div className="mt-3 flex items-center justify-between text-[8px] text-slate-400">
        <span>{formatNumber(metrics.itemsDone)} items done</span>
        <span>{formatNumber(metrics.blockers)} blockers</span>
        <span>{metrics.readiness}% ready</span>
      </div>
      <div className="mt-2"><ProgressBar value={metrics.readiness} tone={plan.state === "blocked" ? "rose" : "cyan"} /></div>
    </button>
  );
}

function ItemRow({ item, onChange, onRemove }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1.3fr)_130px_120px_140px_auto]">
        <Field label="Checklist item" value={item.title} onChange={(value) => onChange({ title: value })} placeholder="What should be verified?" />
        <SelectField label="State" value={item.state} onChange={(value) => onChange({ state: value })} options={ITEM_STATES} />
        <SelectField label="Priority" value={item.priority} onChange={(value) => onChange({ priority: value })} options={PRIORITIES} />
        <Field label="Owner" value={item.owner} onChange={(value) => onChange({ owner: value })} placeholder="Name or team" />
        <div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove checklist item" onClick={onRemove}>Remove</Button></div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-[140px_minmax(0,1fr)]">
        <Field label="Due date" type="date" value={item.dueDate} onChange={(value) => onChange({ dueDate: value })} />
        <Field label="Tester note" value={item.note} onChange={(value) => onChange({ note: value })} placeholder="What should the next person know?" />
      </div>
    </div>
  );
}

function ScenarioRow({ scenario, onChange, onRemove }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1.2fr)_140px_130px_140px_auto]">
        <Field label="Scenario" value={scenario.title} onChange={(value) => onChange({ title: value })} placeholder="Describe the launch path" />
        <Field label="Area" value={scenario.area} onChange={(value) => onChange({ area: value })} placeholder="Checkout" />
        <SelectField label="Result" value={scenario.state} onChange={(value) => onChange({ state: value })} options={SCENARIO_STATES} />
        <Field label="Owner" value={scenario.owner} onChange={(value) => onChange({ owner: value })} placeholder="Name or team" />
        <div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove scenario" onClick={onRemove}>Remove</Button></div>
      </div>
      <div className="mt-3"><Field label="Observation" value={scenario.note} onChange={(value) => onChange({ note: value })} placeholder="Record the observed result or follow-up." /></div>
    </div>
  );
}

function EvidenceRow({ evidence, onChange, onRemove }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3">
      <div className="grid gap-2 md:grid-cols-[130px_minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
        <SelectField label="Type" value={evidence.type} onChange={(value) => onChange({ type: value })} options={EVIDENCE_TYPES} />
        <Field label="Label" value={evidence.label} onChange={(value) => onChange({ label: value })} placeholder="Smoke run" />
        <Field label="Reference" value={evidence.reference} onChange={(value) => onChange({ reference: value })} placeholder="URL, filename, or report ID" />
        <div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove evidence" onClick={onRemove}>Remove</Button></div>
      </div>
      <div className="mt-3"><Field label="Context" value={evidence.note} onChange={(value) => onChange({ note: value })} placeholder="What does this evidence demonstrate?" /></div>
    </div>
  );
}

function NoteRow({ note, onChange, onRemove }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_auto]">
        <Field label="Note title" value={note.title} onChange={(value) => onChange({ title: value })} placeholder="Decision note" />
        <Field label="Author" value={note.author} onChange={(value) => onChange({ author: value })} placeholder="Tester name" />
        <div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove note" onClick={onRemove}>Remove</Button></div>
      </div>
      <div className="mt-3"><TextArea label="Note" value={note.body} onChange={(value) => onChange({ body: value })} placeholder="Capture context, tradeoffs, or questions." rows={3} /></div>
    </div>
  );
}

function Guidance({ plan, metrics, evidenceCount }) {
  const suggestions = [];
  if (!plan.release) suggestions.push("Name the release or build target.");
  if (!plan.owner) suggestions.push("Assign an owner for this launch checklist.");
  if (!metrics.itemsDone) suggestions.push("Complete at least one launch checklist item.");
  if (metrics.blockers) suggestions.push(`Resolve or explicitly accept ${metrics.blockers} blocker(s).`);
  if (!evidenceCount) suggestions.push("Attach evidence before requesting a launch decision.");
  if (!plan.rollback) suggestions.push("Document a rollback or containment path.");
  if (!suggestions.length) suggestions.push("The checklist has enough context for a focused launch review.");
  return (
    <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-3.5">
      <div className="flex items-start gap-2">
        <Sparkles size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-cyan-600" />
        <div>
          <p className="text-[10px] font-semibold text-cyan-900">Suggested next moves</p>
          <p className="mt-1 text-[9px] leading-4 text-cyan-800/70">Private prompts based on this checklist&apos;s current shape.</p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {suggestions.map((suggestion) => (
          <li key={suggestion} className="flex items-start gap-2 text-[9px] leading-4 text-cyan-800/80">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-cyan-500" />
            {suggestion}
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-cyan-100 pt-3 text-[8px] leading-4 text-cyan-800/60">
        This workspace does not approve launches, change report status, or send messages to other users.
      </p>
    </div>
  );
}

function ReportRow({ report, checked, onToggle, onOpenReport }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3">
      <input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 rounded border-slate-300 accent-cyan-600 focus:ring-cyan-500" aria-label={`Attach ${reportTitle(report)}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-semibold text-slate-700">{reportTitle(report)}</p>
        <p className="mt-1 truncate text-[9px] text-slate-400">{reportCategory(report)} · {reportStatus(report) === "resolved" ? "Resolved" : "Open"}</p>
      </div>
      <PriorityBadge value={reportSeverity(report)} />
      {onOpenReport ? <button type="button" onClick={() => onOpenReport(report)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-cyan-700" title="Open report"><ExternalLink size={13} aria-hidden="true" /></button> : null}
    </div>
  );
}

function PlanHeader({ plan, onChange, onDelete, onDuplicate }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Target size={17} aria-hidden="true" className="text-cyan-600" />
            <h2 className="truncate text-sm font-semibold text-slate-900">{plan.name || "Untitled launch checklist"}</h2>
            <StateBadge value={plan.state} />
          </div>
          <p className="mt-1 pl-6 text-[9px] text-slate-400">Private launch readiness workspace</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button icon={Copy} onClick={onDuplicate}>Duplicate</Button>
          <Button variant="danger" icon={Trash2} onClick={onDelete}>Delete</Button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Checklist name" value={plan.name} onChange={(value) => onChange({ name: value })} placeholder="Mobile checkout launch" />
        <Field label="Release / build" value={plan.release} onChange={(value) => onChange({ release: value })} placeholder="v2.4.0 / build 1842" />
        <Field label="Checklist owner" value={plan.owner} onChange={(value) => onChange({ owner: value })} placeholder="Tester or team" />
        <Field label="Target date" type="date" value={plan.targetDate} onChange={(value) => onChange({ targetDate: value })} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Field label="Environment" value={plan.environment} onChange={(value) => onChange({ environment: value })} placeholder="Staging / iOS 18" />
        <Field label="Decision recipient" value={plan.recipient} onChange={(value) => onChange({ recipient: value })} placeholder="Release manager" />
        <SelectField label="Plan state" value={plan.state} onChange={(value) => onChange({ state: value })} options={PLAN_STATES} />
      </div>
    </div>
  );
}

export default function TesterLaunchChecklistWorkspace({ reports = [], email = "", onOpenReport }) {
  const [plans, setPlans] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [planSearch, setPlanSearch] = useState("");
  const [sortAscending, setSortAscending] = useState(false);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [itemFilter, setItemFilter] = useState("all");
  const [itemSearch, setItemSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [reportSearch, setReportSearch] = useState("");
  const [reportFilter, setReportFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [scenarioFilter, setScenarioFilter] = useState("all");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const stored = readStorage(email);
    if (stored && Array.isArray(stored.plans) && stored.plans.length) {
      const restored = stored.plans.slice(0, MAX_PLANS).map(normalizePlan);
      setPlans(restored);
      setSelectedId(stored.selectedId || restored[0].id);
      return;
    }
    const initial = createPlan();
    initial.name = "Launch readiness checklist";
    initial.targetDate = today();
    setPlans([initial]);
    setSelectedId(initial.id);
  }, [email]);

  useEffect(() => {
    if (!plans.length) return;
    writeStorage(email, { plans, selectedId });
  }, [email, plans, selectedId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedId) || plans[0] || null,
    [plans, selectedId],
  );

  const metricsByPlan = useMemo(() => {
    const result = new Map();
    plans.forEach((plan) => {
      const itemsDone = plan.items.filter((item) => ["done", "not-applicable"].includes(item.state)).length;
      const blockers = plan.items.filter((item) => item.state === "blocked").length;
      const itemProgress = plan.items.length ? Math.round((itemsDone / plan.items.length) * 100) : 0;
      const checksDone = Object.values(plan.checks).filter(Boolean).length;
      const checkProgress = Math.round((checksDone / CHECKS.length) * 100);
      const scenariosDone = plan.scenarios.filter((scenario) => ["pass", "skipped"].includes(scenario.state)).length;
      const scenarioProgress = plan.scenarios.length ? Math.round((scenariosDone / plan.scenarios.length) * 100) : 0;
      const failedScenarios = plan.scenarios.filter((scenario) => ["fail", "blocked"].includes(scenario.state)).length;
      const readiness = Math.max(0, Math.round((itemProgress * 0.4) + (checkProgress * 0.4) + (scenarioProgress * 0.2) - (blockers * 8) - (failedScenarios * 5)));
      result.set(plan.id, {
        itemsDone,
        blockers,
        itemProgress,
        checkProgress,
        scenarioProgress,
        failedScenarios,
        readiness,
      });
    });
    return result;
  }, [plans]);

  const filteredPlans = useMemo(() => {
    const query = planSearch.trim().toLowerCase();
    const result = plans.filter((plan) => {
      const matchesState = planFilter === "all" || plan.state === planFilter;
      const haystack = `${plan.name} ${plan.release} ${plan.owner} ${plan.environment} ${plan.recipient}`.toLowerCase();
      return matchesState && (!query || haystack.includes(query));
    });
    result.sort((left, right) => {
      const comparison = (left.name || "").localeCompare(right.name || "");
      return sortAscending ? comparison : -comparison;
    });
    return result;
  }, [plans, planFilter, planSearch, sortAscending]);

  const visiblePlans = showAllPlans ? filteredPlans : filteredPlans.slice(0, PAGE_SIZE);

  const filteredItems = useMemo(() => {
    if (!selectedPlan) return [];
    const query = itemSearch.trim().toLowerCase();
    return selectedPlan.items.filter((item) => {
      const matchesState = itemFilter === "all" || item.state === itemFilter;
      const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;
      const matchesSearch = !query || `${item.title} ${item.owner} ${item.note}`.toLowerCase().includes(query);
      return matchesState && matchesPriority && matchesSearch;
    });
  }, [itemFilter, itemSearch, priorityFilter, selectedPlan]);

  const filteredScenarios = useMemo(() => {
    if (!selectedPlan) return [];
    return selectedPlan.scenarios.filter((scenario) => scenarioFilter === "all" || scenario.state === scenarioFilter);
  }, [scenarioFilter, selectedPlan]);

  const filteredReports = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesSearch = !query || `${reportTitle(report)} ${reportCategory(report)}`.toLowerCase().includes(query);
      const matchesPriority = reportFilter === "all" || reportSeverity(report) === reportFilter;
      const matchesStatus = reportStatusFilter === "all" || reportStatus(report) === reportStatusFilter;
      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [reportFilter, reportSearch, reportStatusFilter, reports]);

  const selectedReports = useMemo(
    () => reports.filter((report) => selectedPlan?.reportIds.includes(reportId(report))),
    [reports, selectedPlan],
  );

  const metrics = selectedPlan ? metricsByPlan.get(selectedPlan.id) : null;

  const updatePlan = (patch) => {
    if (!selectedPlan) return;
    setPlans((current) => current.map((plan) => (
      plan.id === selectedPlan.id
        ? { ...plan, ...patch, updatedAt: new Date().toISOString() }
        : plan
    )));
  };

  const updateItem = (id, patch) => {
    updatePlan({ items: selectedPlan.items.map((item) => item.id === id ? { ...item, ...patch } : item) });
  };

  const updateScenario = (id, patch) => {
    updatePlan({ scenarios: selectedPlan.scenarios.map((scenario) => scenario.id === id ? { ...scenario, ...patch } : scenario) });
  };

  const updateEvidence = (id, patch) => {
    updatePlan({ evidence: selectedPlan.evidence.map((evidence) => evidence.id === id ? { ...evidence, ...patch } : evidence) });
  };

  const updateNote = (id, patch) => {
    updatePlan({ notes: selectedPlan.notes.map((note) => note.id === id ? { ...note, ...patch } : note) });
  };

  const createNewPlan = () => {
    if (plans.length >= MAX_PLANS) {
      setNotice(`Maximum of ${MAX_PLANS} launch checklists reached.`);
      return;
    }
    const plan = createPlan();
    plan.name = `Launch checklist ${plans.length + 1}`;
    setPlans((current) => [plan, ...current]);
    setSelectedId(plan.id);
    setNotice("New launch checklist created.");
  };

  const duplicatePlan = () => {
    if (!selectedPlan || plans.length >= MAX_PLANS) return;
    const copy = normalizePlan({
      ...selectedPlan,
      id: makeId("launch"),
      name: `${selectedPlan.name || "Launch checklist"} copy`,
      state: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setPlans((current) => [copy, ...current]);
    setSelectedId(copy.id);
    setNotice("Launch checklist duplicated.");
  };

  const deletePlan = () => {
    if (!selectedPlan) return;
    if (plans.length === 1) {
      setNotice("Keep at least one launch checklist available.");
      return;
    }
    const remaining = plans.filter((plan) => plan.id !== selectedPlan.id);
    setPlans(remaining);
    setSelectedId(remaining[0]?.id || "");
    setNotice("Launch checklist removed.");
  };

  const addItem = () => {
    if (!selectedPlan || selectedPlan.items.length >= MAX_ITEMS) return;
    updatePlan({
      items: [...selectedPlan.items, {
        id: makeId("item"),
        title: "",
        state: "todo",
        priority: "medium",
        owner: "",
        dueDate: "",
        note: "",
      }],
    });
  };

  const removeItem = (id) => {
    updatePlan({ items: selectedPlan.items.filter((item) => item.id !== id) });
  };

  const addScenario = () => {
    if (!selectedPlan || selectedPlan.scenarios.length >= MAX_SCENARIOS) return;
    updatePlan({
      scenarios: [...selectedPlan.scenarios, {
        id: makeId("scenario"),
        title: "",
        area: "",
        state: "planned",
        owner: "",
        note: "",
      }],
    });
  };

  const removeScenario = (id) => {
    updatePlan({ scenarios: selectedPlan.scenarios.filter((scenario) => scenario.id !== id) });
  };

  const addEvidence = () => {
    if (!selectedPlan || selectedPlan.evidence.length >= MAX_EVIDENCE) return;
    updatePlan({
      evidence: [...selectedPlan.evidence, {
        id: makeId("evidence"),
        type: "note",
        label: "",
        reference: "",
        note: "",
      }],
    });
  };

  const removeEvidence = (id) => {
    updatePlan({ evidence: selectedPlan.evidence.filter((evidence) => evidence.id !== id) });
  };

  const addNote = () => {
    if (!selectedPlan || selectedPlan.notes.length >= MAX_NOTES) return;
    updatePlan({
      notes: [...selectedPlan.notes, {
        id: makeId("note"),
        title: "",
        body: "",
        author: "",
        createdAt: new Date().toISOString(),
      }],
    });
  };

  const removeNote = (id) => {
    updatePlan({ notes: selectedPlan.notes.filter((note) => note.id !== id) });
  };

  const toggleReport = (id) => {
    const ids = selectedPlan.reportIds.includes(id)
      ? selectedPlan.reportIds.filter((reportIdValue) => reportIdValue !== id)
      : [...selectedPlan.reportIds, id].slice(0, MAX_EVIDENCE);
    updatePlan({ reportIds: ids });
  };

  const toggleVisibleReports = () => {
    const visibleIds = filteredReports.map(reportId).filter(Boolean);
    const allSelected = visibleIds.every((id) => selectedPlan.reportIds.includes(id));
    const nextIds = allSelected
      ? selectedPlan.reportIds.filter((id) => !visibleIds.includes(id))
      : Array.from(new Set([...selectedPlan.reportIds, ...visibleIds])).slice(0, MAX_EVIDENCE);
    updatePlan({ reportIds: nextIds });
  };

  const summaryText = useMemo(() => {
    if (!selectedPlan) return "";
    const lines = [
      `${selectedPlan.name || "Untitled launch checklist"} — ${planStateMeta(selectedPlan.state).label}`,
      `Release: ${selectedPlan.release || "Not specified"}`,
      `Environment: ${selectedPlan.environment || "Not specified"}`,
      `Owner: ${selectedPlan.owner || "Not assigned"} · Recipient: ${selectedPlan.recipient || "Not assigned"}`,
      `Target date: ${formatDate(selectedPlan.targetDate)}`,
      `Readiness: ${metrics?.readiness || 0}%`,
      `Checklist: ${metrics?.itemsDone || 0}/${selectedPlan.items.length} complete`,
      `Scenarios: ${selectedPlan.scenarios.filter((scenario) => scenario.state === "pass").length}/${selectedPlan.scenarios.length} pass`,
      `Reports attached: ${selectedReports.length}`,
      "",
      selectedPlan.recommendation || "No launch recommendation has been written yet.",
      "",
      "Open blockers:",
      ...(selectedPlan.items.filter((item) => item.state === "blocked").map((item) => `- ${item.title || "Untitled blocker"}`) || ["- None"]),
      "",
      "Rollback:",
      selectedPlan.rollback || "Not documented",
    ];
    return lines.join("\n");
  }, [metrics, selectedPlan, selectedReports]);

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setNotice("Launch summary copied.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setNotice("Clipboard access is unavailable.");
    }
  };

  const exportPlan = () => {
    if (!selectedPlan) return;
    const rows = [
      ["Launch checklist", "Value"],
      ["Name", selectedPlan.name],
      ["Release", selectedPlan.release],
      ["Environment", selectedPlan.environment],
      ["State", planStateMeta(selectedPlan.state).label],
      ["Owner", selectedPlan.owner],
      ["Recipient", selectedPlan.recipient],
      ["Target date", selectedPlan.targetDate],
      ["Readiness", `${metrics?.readiness || 0}%`],
      [],
      ["Checklist item", "State", "Priority", "Owner", "Due", "Note"],
      ...selectedPlan.items.map((item) => [item.title, item.state, item.priority, item.owner, item.dueDate, item.note]),
      [],
      ["Scenario", "Area", "Result", "Owner", "Observation"],
      ...selectedPlan.scenarios.map((scenario) => [scenario.title, scenario.area, scenario.state, scenario.owner, scenario.note]),
      [],
      ["Evidence type", "Label", "Reference", "Context"],
      ...selectedPlan.evidence.map((evidence) => [evidence.type, evidence.label, evidence.reference, evidence.note]),
    ];
    downloadCsv("launch-checklist.csv", rows);
    setNotice("Launch checklist export downloaded.");
  };

  const resetPlan = () => {
    if (!selectedPlan) return;
    const reset = createPlan();
    reset.id = selectedPlan.id;
    reset.name = selectedPlan.name;
    reset.release = selectedPlan.release;
    reset.owner = selectedPlan.owner;
    reset.recipient = selectedPlan.recipient;
    reset.environment = selectedPlan.environment;
    reset.targetDate = selectedPlan.targetDate;
    updatePlan(reset);
    setNotice("Checklist planning data reset.");
  };

  if (!selectedPlan) return null;

  const allVisibleReportsSelected = filteredReports.length > 0 && filteredReports.every((report) => selectedPlan.reportIds.includes(reportId(report)));
  const visibleItems = filteredItems;
  const visibleScenarios = filteredScenarios;
  const highPriorityOpen = selectedPlan.items.filter((item) => item.state === "blocked" && ["critical", "high"].includes(item.priority)).length;

  return (
    <section id="tester-launch-checklist" className="space-y-4 rounded-3xl bg-slate-50/70 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Flag size={18} aria-hidden="true" className="text-cyan-600" />
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Launch checklist workspace</h2>
          </div>
          <p className="mt-1 max-w-2xl text-[10px] leading-5 text-slate-500">
            Turn a tester&apos;s launch recommendation into a visible checklist of scope, scenarios, blockers, evidence, and handoff notes.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button icon={Plus} variant="primary" onClick={createNewPlan}>New checklist</Button>
          <Button icon={Download} onClick={exportPlan}>Export</Button>
          <Button icon={copied ? Check : Copy} onClick={copySummary}>{copied ? "Copied" : "Copy summary"}</Button>
        </div>
      </div>

      {notice ? (
        <div className="flex items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2.5 text-[9px] font-medium text-cyan-800">
          <CheckCircle2 size={13} aria-hidden="true" />
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Panel title="Launch checklists" detail={`${formatNumber(filteredPlans.length)} matching checklist(s)`} icon={ClipboardCheck} action={<Button variant="ghost" icon={sortAscending ? ArrowUpAZ : ArrowDownAZ} onClick={() => setSortAscending((value) => !value)} title="Toggle checklist sort" />}>
          <div className="space-y-2.5">
            <div className="relative">
              <Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={planSearch} onChange={(event) => setPlanSearch(event.target.value)} placeholder="Search checklists" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
            </div>
            <SelectField label="State filter" value={planFilter} onChange={setPlanFilter} options={PLAN_STATE_FILTERS} />
            {visiblePlans.length ? (
              <div className="space-y-2">
                {visiblePlans.map((plan) => <PlanCard key={plan.id} plan={plan} selected={plan.id === selectedPlan.id} onSelect={() => setSelectedId(plan.id)} metrics={metricsByPlan.get(plan.id) || { itemsDone: 0, blockers: 0, readiness: 0 }} />)}
              </div>
            ) : <EmptyState title="No matching checklists" detail="Try clearing the search or state filter." icon={Search} />}
            {filteredPlans.length > PAGE_SIZE ? <Button variant="ghost" onClick={() => setShowAllPlans((value) => !value)}>{showAllPlans ? "Show fewer" : `Show all ${filteredPlans.length}`}</Button> : null}
          </div>
        </Panel>

        <div className="min-w-0 space-y-4">
          <PlanHeader plan={selectedPlan} onChange={updatePlan} onDelete={deletePlan} onDuplicate={duplicatePlan} />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Readiness" value={`${metrics?.readiness || 0}%`} detail="Combined launch signal" icon={Target} tone="cyan" />
            <StatCard label="Checklist" value={`${metrics?.itemsDone || 0}/${selectedPlan.items.length}`} detail="Items complete" icon={ListChecks} tone="violet" />
            <StatCard label="Blockers" value={formatNumber(metrics?.blockers || 0)} detail={`${highPriorityOpen} critical or high`} icon={ShieldAlert} tone="rose" />
            <StatCard label="Evidence" value={formatNumber(selectedPlan.evidence.length + selectedReports.length)} detail="Links and reports" icon={FileCheck2} tone="emerald" />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <Panel title="Launch recommendation" detail="Write the concise context a release owner needs." icon={Clipboard}>
              <div className="space-y-3">
                <TextArea label="Recommendation" value={selectedPlan.recommendation} onChange={(value) => updatePlan({ recommendation: value })} placeholder="Should this launch proceed, pause, or proceed with conditions?" rows={4} />
                <TextArea label="Rollback or containment" value={selectedPlan.rollback} onChange={(value) => updatePlan({ rollback: value })} placeholder="Describe mitigation, rollback, or a safe containment path." rows={3} />
                <TextArea label="Post-launch monitoring" value={selectedPlan.monitoring} onChange={(value) => updatePlan({ monitoring: value })} placeholder="What should be watched after launch, and for how long?" rows={3} />
                <Guidance plan={selectedPlan} metrics={metrics || { itemsDone: 0, blockers: 0 }} evidenceCount={selectedPlan.evidence.length + selectedReports.length} />
              </div>
            </Panel>
            <Panel title="Exit criteria" detail={`${metrics?.checkProgress || 0}% complete`} icon={ListChecks}>
              <div className="space-y-2">
                {CHECKS.map((check) => <CheckRow key={check.id} check={check} checked={Boolean(selectedPlan.checks[check.id])} onChange={(event) => updatePlan({ checks: { ...selectedPlan.checks, [check.id]: event.target.checked } })} />)}
              </div>
            </Panel>
          </div>

          <Panel title="Launch checklist items" detail={`${formatNumber(selectedPlan.items.length)} item(s) · ${formatNumber(visibleItems.length)} shown`} icon={ListChecks} action={<Button icon={Plus} onClick={addItem} disabled={selectedPlan.items.length >= MAX_ITEMS}>Add item</Button>}>
            <div className="space-y-3">
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_150px]">
                <label className="relative block">
                  <span className="sr-only">Search checklist items</span>
                  <Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} placeholder="Search items, owners, or notes" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
                </label>
                <SelectField label="State" value={itemFilter} onChange={setItemFilter} options={ITEM_STATE_FILTERS} />
                <SelectField label="Priority" value={priorityFilter} onChange={setPriorityFilter} options={PRIORITY_FILTERS} />
              </div>
              {visibleItems.length ? <div className="space-y-2.5">{visibleItems.map((item) => <ItemRow key={item.id} item={item} onChange={(patch) => updateItem(item.id, patch)} onRemove={() => removeItem(item.id)} />)}</div> : <EmptyState title="No checklist items match" detail="Adjust the item filters or add a new launch item." icon={ListChecks} />}
            </div>
          </Panel>

          <Panel title="Scenario coverage" detail={`${formatNumber(selectedPlan.scenarios.length)} scenario(s) · ${metrics?.scenarioProgress || 0}% resolved`} icon={Target} action={<Button icon={Plus} onClick={addScenario} disabled={selectedPlan.scenarios.length >= MAX_SCENARIOS}>Add scenario</Button>}>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {[{ value: "all", label: "All scenarios" }, ...SCENARIO_STATES].map((option) => <button key={option.value} type="button" onClick={() => setScenarioFilter(option.value)} className={`rounded-full border px-2.5 py-1 text-[8px] font-semibold transition ${scenarioFilter === option.value ? "border-cyan-300 bg-cyan-50 text-cyan-800" : "border-slate-200 bg-white text-slate-500 hover:border-cyan-200"}`}>{option.label}</button>)}
              </div>
              {visibleScenarios.length ? <div className="space-y-2.5">{visibleScenarios.map((scenario) => <ScenarioRow key={scenario.id} scenario={scenario} onChange={(patch) => updateScenario(scenario.id, patch)} onRemove={() => removeScenario(scenario.id)} />)}</div> : <EmptyState title="No scenarios recorded" detail="Add the important user journeys or regression paths for this launch." icon={Target} />}
            </div>
          </Panel>

          <Panel title="Evidence register" detail={`${formatNumber(selectedPlan.evidence.length)} manual evidence item(s)`} icon={FileCheck2} action={<Button icon={Plus} onClick={addEvidence} disabled={selectedPlan.evidence.length >= MAX_EVIDENCE}>Add evidence</Button>}>
            <div className="space-y-2.5">
              {selectedPlan.evidence.length ? selectedPlan.evidence.map((evidence) => <EvidenceRow key={evidence.id} evidence={evidence} onChange={(patch) => updateEvidence(evidence.id, patch)} onRemove={() => removeEvidence(evidence.id)} />) : <EmptyState title="No manual evidence" detail="Add screenshots, recordings, logs, or links that support the launch recommendation." icon={FileCheck2} />}
            </div>
          </Panel>

          <Panel title="Report evidence" detail={`${formatNumber(selectedPlan.reportIds.length)} attached · ${formatNumber(filteredReports.length)} shown`} icon={ClipboardCheck} action={<Button icon={allVisibleReportsSelected ? X : Check} onClick={toggleVisibleReports}>{allVisibleReportsSelected ? "Clear shown" : "Select shown"}</Button>}>
            <div className="space-y-3">
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_150px]">
                <label className="relative block">
                  <span className="sr-only">Search reports</span>
                  <Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Search report title or category" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
                </label>
                <SelectField label="Priority" value={reportFilter} onChange={setReportFilter} options={PRIORITY_FILTERS} />
                <SelectField label="Status" value={reportStatusFilter} onChange={setReportStatusFilter} options={[{ value: "all", label: "All statuses" }, { value: "open", label: "Open reports" }, { value: "resolved", label: "Resolved reports" }]} />
              </div>
              {filteredReports.length ? <div className="space-y-2">{filteredReports.slice(0, 20).map((report) => <ReportRow key={reportId(report)} report={report} checked={selectedPlan.reportIds.includes(reportId(report))} onToggle={() => toggleReport(reportId(report))} onOpenReport={onOpenReport} />)}</div> : <EmptyState title="No reports match" detail="Adjust the report filters or wait for reports to be available." icon={FileCheck2} />}
              {filteredReports.length > 20 ? <p className="text-center text-[9px] text-slate-400">Showing the first 20 matching reports. Narrow the search to find a specific report.</p> : null}
              <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3">
                <p className="flex items-center gap-1.5 text-[9px] font-semibold text-violet-800"><Users size={12} aria-hidden="true" /> Browser-local evidence</p>
                <p className="mt-1 text-[9px] leading-4 text-violet-700/75">Selecting reports here stores only their IDs in this tester&apos;s browser. It does not update report status or ownership.</p>
              </div>
            </div>
          </Panel>

          <Panel title="Decision notes" detail="Capture tradeoffs, questions, and context for later review." icon={Clipboard} action={<Button icon={Plus} onClick={addNote} disabled={selectedPlan.notes.length >= MAX_NOTES}>Add note</Button>}>
            <div className="space-y-2.5">
              {selectedPlan.notes.length ? selectedPlan.notes.map((note) => <NoteRow key={note.id} note={note} onChange={(patch) => updateNote(note.id, patch)} onRemove={() => removeNote(note.id)} />) : <EmptyState title="No decision notes" detail="Add a note when a launch choice needs more context than the checklist fields provide." icon={Clipboard} />}
            </div>
          </Panel>

          <Panel title="Workspace actions" detail="Browser-local controls for this planning workspace." icon={RefreshCw}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-xl text-[9px] leading-4 text-slate-400">Reset clears checklist items, scenarios, evidence, notes, reports, and criteria while preserving the plan identity fields.</p>
              <Button variant="danger" icon={RefreshCw} onClick={resetPlan}>Reset planning data</Button>
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}
