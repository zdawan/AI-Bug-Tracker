"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarDays,
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
  Gauge,
  ListChecks,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Target,
  Trash2,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";

const STORAGE_KEY = "tester-release-control-room-v1";
const MAX_ROOMS = 20;
const MAX_MILESTONES = 60;
const MAX_RISKS = 100;
const MAX_REPORTS = 100;
const INITIAL_VISIBLE = 8;

const ROOM_STATES = [
  { value: "draft", label: "Draft", tone: "slate" },
  { value: "active", label: "Active", tone: "cyan" },
  { value: "review", label: "Review", tone: "violet" },
  { value: "ready", label: "Ready", tone: "emerald" },
  { value: "blocked", label: "Blocked", tone: "rose" },
  { value: "closed", label: "Closed", tone: "amber" },
];

const STATE_FILTERS = [
  { value: "all", label: "All rooms" },
  ...ROOM_STATES,
];

const RISK_LEVELS = [
  { value: "critical", label: "Critical", tone: "rose" },
  { value: "high", label: "High", tone: "orange" },
  { value: "medium", label: "Medium", tone: "amber" },
  { value: "low", label: "Low", tone: "emerald" },
];

const RISK_FILTERS = [
  { value: "all", label: "All risk levels" },
  ...RISK_LEVELS,
];

const MILESTONE_STATES = [
  { value: "planned", label: "Planned" },
  { value: "in-progress", label: "In progress" },
  { value: "complete", label: "Complete" },
  { value: "skipped", label: "Skipped" },
];

const CHECKS = [
  {
    id: "scope",
    label: "Release scope is clear",
    detail: "The build, feature area, or test window is named.",
  },
  {
    id: "coverage",
    label: "Coverage is represented",
    detail: "The attached reports and milestones reflect the intended testing.",
  },
  {
    id: "risks",
    label: "Known risks have owners",
    detail: "Open risk items have a next action and accountable owner.",
  },
  {
    id: "regression",
    label: "Regression impact is considered",
    detail: "Nearby flows and recent changes have been reviewed.",
  },
  {
    id: "evidence",
    label: "Evidence is easy to find",
    detail: "Reports, notes, and links can be handed to the decision maker.",
  },
  {
    id: "fallback",
    label: "Fallback is documented",
    detail: "A mitigation, rollback, or containment path is recorded.",
  },
];

const DEFAULT_MILESTONES = [
  {
    id: "scope",
    title: "Confirm release scope",
    owner: "",
    dueDate: "",
    state: "planned",
    note: "",
  },
  {
    id: "smoke",
    title: "Run smoke coverage",
    owner: "",
    dueDate: "",
    state: "planned",
    note: "",
  },
  {
    id: "regression",
    title: "Review regression risks",
    owner: "",
    dueDate: "",
    state: "planned",
    note: "",
  },
  {
    id: "handoff",
    title: "Prepare decision handoff",
    owner: "",
    dueDate: "",
    state: "planned",
    note: "",
  },
];

const DEFAULT_CHECKS = {
  scope: false,
  coverage: false,
  risks: false,
  regression: false,
  evidence: false,
  fallback: false,
};

function clean(value, fallback = "", limit = 1000) {
  if (typeof value !== "string") return fallback;
  const result = value.trim();
  return result ? result.slice(0, limit) : fallback;
}

function reportId(report) {
  return String(report?._id ?? report?.id ?? report?.bugId ?? "");
}

function reportTitle(report) {
  return clean(report?.title ?? report?.summary ?? report?.name, "Untitled report", 180);
}

function reportSeverity(report) {
  const value = String(report?.severity ?? report?.priority ?? "medium").toLowerCase();
  return RISK_LEVELS.some((item) => item.value === value) ? value : "medium";
}

function reportCategory(report) {
  return clean(report?.category ?? report?.type ?? report?.area, "Uncategorized", 80);
}

function reportStatus(report) {
  const value = String(report?.status ?? report?.state ?? "open").toLowerCase();
  return ["closed", "resolved", "fixed", "done"].includes(value) ? "closed" : "open";
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
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

function formatNumber(value) {
  return new Intl.NumberFormat().format(value);
}

function escapeCsv(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function csvDownload(filename, rows) {
  const body = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function readRoom(email) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY}:${email || "anonymous"}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveRoom(email, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${STORAGE_KEY}:${email || "anonymous"}`,
      JSON.stringify(value),
    );
  } catch {
    // Browser storage is advisory and may be unavailable in private mode.
  }
}

function createRoom() {
  return {
    id: makeId("release"),
    name: "Untitled release room",
    release: "",
    owner: "",
    recipient: "",
    state: "draft",
    targetDate: "",
    summary: "",
    fallback: "",
    checks: { ...DEFAULT_CHECKS },
    milestones: DEFAULT_MILESTONES.map((item) => ({ ...item })),
    risks: [],
    reportIds: [],
    links: [],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function normalizeRoom(value) {
  const room = value && typeof value === "object" ? value : createRoom();
  return {
    ...createRoom(),
    ...room,
    checks: { ...DEFAULT_CHECKS, ...(room.checks || {}) },
    milestones: Array.isArray(room.milestones)
      ? room.milestones.slice(0, MAX_MILESTONES).map((milestone) => ({
          id: makeId("milestone"),
          title: "",
          owner: "",
          dueDate: "",
          state: "planned",
          note: "",
          ...milestone,
        }))
      : DEFAULT_MILESTONES.map((item) => ({ ...item })),
    risks: Array.isArray(room.risks)
      ? room.risks.slice(0, MAX_RISKS).map((risk) => ({
          id: makeId("risk"),
          title: "",
          level: "medium",
          owner: "",
          dueDate: "",
          status: "open",
          mitigation: "",
          ...risk,
        }))
      : [],
    reportIds: Array.isArray(room.reportIds) ? room.reportIds.slice(0, MAX_REPORTS) : [],
    links: Array.isArray(room.links) ? room.links.slice(0, 20) : [],
  };
}

function stateMeta(value) {
  return ROOM_STATES.find((state) => state.value === value) || ROOM_STATES[0];
}

function riskMeta(value) {
  return RISK_LEVELS.find((level) => level.value === value) || RISK_LEVELS[2];
}

function toneClasses(tone, compact = false) {
  const map = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-800",
    violet: "border-violet-100 bg-violet-50 text-violet-800",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-800",
    rose: "border-rose-100 bg-rose-50 text-rose-800",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    orange: "border-orange-100 bg-orange-50 text-orange-800",
  };
  return `${map[tone] || map.slate} ${compact ? "px-2 py-0.5" : "px-2.5 py-1"}`;
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
  const state = stateMeta(value);
  return <span className={`inline-flex rounded-full border text-[8px] font-semibold ${toneClasses(state.tone, true)}`}>{state.label}</span>;
}

function RiskBadge({ value }) {
  const level = riskMeta(value);
  return <span className={`inline-flex rounded-full border text-[8px] font-semibold capitalize ${toneClasses(level.tone, true)}`}>{level.label}</span>;
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
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-cyan-600 focus:ring-cyan-500"
      />
      <span>
        <span className="block text-[10px] font-semibold text-slate-700">{check.label}</span>
        <span className="mt-0.5 block text-[9px] leading-4 text-slate-400">{check.detail}</span>
      </span>
    </label>
  );
}

function Guidance({ room, reportCount, openRisks, milestoneProgress }) {
  const suggestions = [];
  if (!room.release) suggestions.push("Name the release or build target.");
  if (!room.owner) suggestions.push("Assign a release room owner.");
  if (!reportCount) suggestions.push("Attach at least one report as evidence.");
  if (openRisks && !room.checks.risks) suggestions.push("Review open risks before requesting a decision.");
  if (milestoneProgress < 50) suggestions.push("Move the first milestones into progress.");
  if (!room.fallback) suggestions.push("Document a mitigation or fallback path.");
  if (!suggestions.length) suggestions.push("The room has enough context for a focused release review.");
  return (
    <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-3.5">
      <div className="flex items-start gap-2">
        <Sparkles size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-cyan-600" />
        <div>
          <p className="text-[10px] font-semibold text-cyan-900">Suggested next moves</p>
          <p className="mt-1 text-[9px] leading-4 text-cyan-800/70">Private prompts based on this room&apos;s current shape.</p>
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
        This workspace does not approve releases, alter report status, or notify other users.
      </p>
    </div>
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

function RoomCard({ room, selected, onSelect, reportCount, openRisks, progress }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-3 text-left transition ${selected ? "border-cyan-300 bg-cyan-50/50 shadow-sm" : "border-slate-200/80 bg-white hover:border-cyan-200"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-[10px] font-semibold text-slate-800">{room.name || "Untitled release room"}</span>
        <StateBadge value={room.state} />
      </div>
      <p className="mt-1 truncate text-[9px] text-slate-400">{room.release || "No release target yet"}</p>
      <div className="mt-3 flex items-center justify-between text-[8px] text-slate-400">
        <span>{formatNumber(reportCount)} reports</span>
        <span>{formatNumber(openRisks)} open risks</span>
        <span>{progress}% ready</span>
      </div>
      <div className="mt-2"><ProgressBar value={progress} tone={room.state === "blocked" ? "rose" : "cyan"} /></div>
    </button>
  );
}

function MilestoneRow({ milestone, onChange, onRemove }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1.3fr)_minmax(110px,0.8fr)_minmax(110px,0.7fr)_auto]">
        <Field label="Milestone" value={milestone.title} onChange={(value) => onChange({ title: value })} placeholder="What needs to happen?" />
        <Field label="Owner" value={milestone.owner} onChange={(value) => onChange({ owner: value })} placeholder="Name or team" />
        <Field label="Due" type="date" value={milestone.dueDate} onChange={(value) => onChange({ dueDate: value })} />
        <div className="flex items-end justify-end">
          <Button variant="ghost" icon={Trash2} title="Remove milestone" onClick={onRemove}>Remove</Button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-[180px_minmax(0,1fr)]">
        <SelectField label="State" value={milestone.state} onChange={(value) => onChange({ state: value })} options={MILESTONE_STATES} />
        <Field label="Note" value={milestone.note} onChange={(value) => onChange({ note: value })} placeholder="Optional context or completion note" />
      </div>
    </div>
  );
}

function RiskRow({ risk, onChange, onRemove }) {
  const statusOptions = [
    { value: "open", label: "Open" },
    { value: "monitoring", label: "Monitoring" },
    { value: "mitigated", label: "Mitigated" },
    { value: "accepted", label: "Accepted" },
  ];
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1.2fr)_120px_140px_120px_auto]">
        <Field label="Risk" value={risk.title} onChange={(value) => onChange({ title: value })} placeholder="Describe the risk" />
        <SelectField label="Level" value={risk.level} onChange={(value) => onChange({ level: value })} options={RISK_LEVELS} />
        <Field label="Owner" value={risk.owner} onChange={(value) => onChange({ owner: value })} placeholder="Name or team" />
        <SelectField label="Status" value={risk.status} onChange={(value) => onChange({ status: value })} options={statusOptions} />
        <div className="flex items-end justify-end">
          <Button variant="ghost" icon={Trash2} title="Remove risk" onClick={onRemove}>Remove</Button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-[140px_minmax(0,1fr)]">
        <Field label="Review by" type="date" value={risk.dueDate} onChange={(value) => onChange({ dueDate: value })} />
        <Field label="Mitigation / next action" value={risk.mitigation} onChange={(value) => onChange({ mitigation: value })} placeholder="What should happen next?" />
      </div>
    </div>
  );
}

function ReportRow({ report, checked, onToggle, onOpenReport }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 rounded border-slate-300 accent-cyan-600 focus:ring-cyan-500"
        aria-label={`Attach ${reportTitle(report)}`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-semibold text-slate-700">{reportTitle(report)}</p>
        <p className="mt-1 truncate text-[9px] text-slate-400">{reportCategory(report)} · {reportStatus(report) === "closed" ? "Resolved" : "Open"}</p>
      </div>
      <RiskBadge value={reportSeverity(report)} />
      {onOpenReport ? (
        <button type="button" onClick={() => onOpenReport(report)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-cyan-700" title="Open report">
          <ExternalLink size={13} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

function LinkRow({ link, onChange, onRemove }) {
  return (
    <div className="grid gap-2 md:grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)_auto]">
      <Field label="Label" value={link.label} onChange={(value) => onChange({ label: value })} placeholder="Design notes" />
      <Field label="URL or reference" value={link.url} onChange={(value) => onChange({ url: value })} placeholder="https://..." />
      <div className="flex items-end justify-end">
        <Button variant="ghost" icon={Trash2} title="Remove reference" onClick={onRemove}>Remove</Button>
      </div>
    </div>
  );
}

function SummaryPreview({ room, reports, openRisks, progress }) {
  const state = stateMeta(room.state);
  const attached = reports.filter((report) => room.reportIds.includes(reportId(report)));
  const critical = room.risks.filter((risk) => risk.status === "open" && ["critical", "high"].includes(risk.level));
  const lines = [
    `${room.name || "Untitled release room"} — ${state.label}`,
    `Release target: ${room.release || "Not specified"}`,
    `Owner: ${room.owner || "Not assigned"} · Recipient: ${room.recipient || "Not assigned"}`,
    `Target date: ${formatDate(room.targetDate)}`,
    `Readiness: ${progress}% · Evidence: ${attached.length} report(s)`,
    `Open risks: ${openRisks}${critical.length ? ` (${critical.length} critical/high)` : ""}`,
    "",
    room.summary || "No recommendation has been written yet.",
    "",
    "Attached evidence:",
    ...(attached.length ? attached.slice(0, 12).map((report) => `- ${reportTitle(report)} [${reportSeverity(report)}]`) : ["- None"]),
  ];
  return lines.join("\n");
}

function DetailHeader({ room, onChange, onDelete, onDuplicate }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Target size={17} aria-hidden="true" className="text-cyan-600" />
            <h2 className="truncate text-sm font-semibold text-slate-900">{room.name || "Untitled release room"}</h2>
            <StateBadge value={room.state} />
          </div>
          <p className="mt-1 pl-6 text-[9px] text-slate-400">Private release coordination workspace</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button icon={Copy} onClick={onDuplicate}>Duplicate</Button>
          <Button variant="danger" icon={Trash2} onClick={onDelete}>Delete</Button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Room name" value={room.name} onChange={(value) => onChange({ name: value })} placeholder="Checkout release review" />
        <Field label="Release / build" value={room.release} onChange={(value) => onChange({ release: value })} placeholder="v2.4.0 / build 1842" />
        <Field label="Room owner" value={room.owner} onChange={(value) => onChange({ owner: value })} placeholder="Tester or team" />
        <Field label="Target date" type="date" value={room.targetDate} onChange={(value) => onChange({ targetDate: value })} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Decision recipient" value={room.recipient} onChange={(value) => onChange({ recipient: value })} placeholder="Release manager or product team" />
        <SelectField label="Room state" value={room.state} onChange={(value) => onChange({ state: value })} options={ROOM_STATES} />
      </div>
    </div>
  );
}

export default function TesterReleaseControlRoom({ reports = [], email = "", onOpenReport }) {
  const [rooms, setRooms] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortAscending, setSortAscending] = useState(false);
  const [showAllRooms, setShowAllRooms] = useState(false);
  const [reportSearch, setReportSearch] = useState("");
  const [reportSeverityFilter, setReportSeverityFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const stored = readRoom(email);
    if (stored && Array.isArray(stored.rooms) && stored.rooms.length) {
      const restored = stored.rooms.slice(0, MAX_ROOMS).map(normalizeRoom);
      setRooms(restored);
      setSelectedId(stored.selectedId || restored[0].id);
      return;
    }
    const initial = createRoom();
    initial.name = "Release readiness room";
    initial.targetDate = today();
    setRooms([initial]);
    setSelectedId(initial.id);
  }, [email]);

  useEffect(() => {
    if (!rooms.length) return;
    saveRoom(email, { rooms, selectedId });
  }, [email, rooms, selectedId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedId) || rooms[0] || null,
    [rooms, selectedId],
  );

  const metricsByRoom = useMemo(() => {
    const result = new Map();
    rooms.forEach((room) => {
      const milestoneDone = room.milestones.filter((item) => item.state === "complete").length;
      const milestoneProgress = room.milestones.length ? Math.round((milestoneDone / room.milestones.length) * 100) : 0;
      const checkDone = Object.values(room.checks).filter(Boolean).length;
      const checkProgress = Math.round((checkDone / CHECKS.length) * 100);
      const openRisks = room.risks.filter((risk) => !["mitigated", "accepted"].includes(risk.status)).length;
      const riskProgress = room.risks.length ? Math.round(((room.risks.length - openRisks) / room.risks.length) * 100) : 100;
      const readiness = Math.round((checkProgress * 0.45) + (milestoneProgress * 0.35) + (riskProgress * 0.2));
      result.set(room.id, { milestoneProgress, checkProgress, openRisks, readiness });
    });
    return result;
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = rooms.filter((room) => {
      const matchesState = stateFilter === "all" || room.state === stateFilter;
      const haystack = `${room.name} ${room.release} ${room.owner} ${room.recipient}`.toLowerCase();
      return matchesState && (!query || haystack.includes(query));
    });
    result.sort((left, right) => {
      const compared = (left.name || "").localeCompare(right.name || "");
      return sortAscending ? compared : -compared;
    });
    return result;
  }, [rooms, search, stateFilter, sortAscending]);

  const visibleRooms = showAllRooms ? filteredRooms : filteredRooms.slice(0, INITIAL_VISIBLE);

  const filteredReports = useMemo(() => {
    if (!selectedRoom) return [];
    const query = reportSearch.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesSearch = !query || `${reportTitle(report)} ${reportCategory(report)}`.toLowerCase().includes(query);
      const matchesSeverity = reportSeverityFilter === "all" || reportSeverity(report) === reportSeverityFilter;
      const matchesStatus = reportStatusFilter === "all" || reportStatus(report) === reportStatusFilter;
      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [reports, reportSearch, reportSeverityFilter, reportStatusFilter, selectedRoom]);

  const selectedReports = useMemo(
    () => reports.filter((report) => selectedRoom?.reportIds.includes(reportId(report))),
    [reports, selectedRoom],
  );

  const metrics = selectedRoom ? metricsByRoom.get(selectedRoom.id) : null;

  const updateRoom = (patch) => {
    if (!selectedRoom) return;
    setRooms((current) => current.map((room) => (
      room.id === selectedRoom.id
        ? { ...room, ...patch, updatedAt: new Date().toISOString() }
        : room
    )));
  };

  const updateMilestone = (id, patch) => {
    updateRoom({
      milestones: selectedRoom.milestones.map((milestone) => (
        milestone.id === id ? { ...milestone, ...patch } : milestone
      )),
    });
  };

  const updateRisk = (id, patch) => {
    updateRoom({
      risks: selectedRoom.risks.map((risk) => risk.id === id ? { ...risk, ...patch } : risk),
    });
  };

  const createNewRoom = () => {
    if (rooms.length >= MAX_ROOMS) {
      setNotice(`Maximum of ${MAX_ROOMS} release rooms reached.`);
      return;
    }
    const room = createRoom();
    room.name = `Release room ${rooms.length + 1}`;
    setRooms((current) => [room, ...current]);
    setSelectedId(room.id);
    setNotice("New release room created.");
  };

  const duplicateRoom = () => {
    if (!selectedRoom || rooms.length >= MAX_ROOMS) return;
    const copy = normalizeRoom({
      ...selectedRoom,
      id: makeId("release"),
      name: `${selectedRoom.name || "Release room"} copy`,
      state: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setRooms((current) => [copy, ...current]);
    setSelectedId(copy.id);
    setNotice("Release room duplicated.");
  };

  const deleteRoom = () => {
    if (!selectedRoom) return;
    if (rooms.length === 1) {
      setNotice("Keep at least one release room available.");
      return;
    }
    const remaining = rooms.filter((room) => room.id !== selectedRoom.id);
    setRooms(remaining);
    setSelectedId(remaining[0]?.id || "");
    setNotice("Release room removed.");
  };

  const addMilestone = () => {
    if (!selectedRoom || selectedRoom.milestones.length >= MAX_MILESTONES) return;
    updateRoom({
      milestones: [
        ...selectedRoom.milestones,
        { id: makeId("milestone"), title: "", owner: "", dueDate: "", state: "planned", note: "" },
      ],
    });
  };

  const removeMilestone = (id) => {
    updateRoom({ milestones: selectedRoom.milestones.filter((milestone) => milestone.id !== id) });
  };

  const addRisk = () => {
    if (!selectedRoom || selectedRoom.risks.length >= MAX_RISKS) return;
    updateRoom({
      risks: [
        ...selectedRoom.risks,
        { id: makeId("risk"), title: "", level: "medium", owner: "", dueDate: "", status: "open", mitigation: "" },
      ],
    });
  };

  const removeRisk = (id) => {
    updateRoom({ risks: selectedRoom.risks.filter((risk) => risk.id !== id) });
  };

  const addLink = () => {
    if (!selectedRoom || selectedRoom.links.length >= 20) return;
    updateRoom({ links: [...selectedRoom.links, { id: makeId("link"), label: "", url: "" }] });
  };

  const updateLink = (id, patch) => {
    updateRoom({ links: selectedRoom.links.map((link) => link.id === id ? { ...link, ...patch } : link) });
  };

  const removeLink = (id) => {
    updateRoom({ links: selectedRoom.links.filter((link) => link.id !== id) });
  };

  const toggleReport = (id) => {
    const ids = selectedRoom.reportIds.includes(id)
      ? selectedRoom.reportIds.filter((reportIdValue) => reportIdValue !== id)
      : [...selectedRoom.reportIds, id].slice(0, MAX_REPORTS);
    updateRoom({ reportIds: ids });
  };

  const toggleAllVisibleReports = () => {
    const visibleIds = filteredReports.map(reportId).filter(Boolean);
    const allSelected = visibleIds.every((id) => selectedRoom.reportIds.includes(id));
    const nextIds = allSelected
      ? selectedRoom.reportIds.filter((id) => !visibleIds.includes(id))
      : Array.from(new Set([...selectedRoom.reportIds, ...visibleIds])).slice(0, MAX_REPORTS);
    updateRoom({ reportIds: nextIds });
  };

  const copySummary = async () => {
    if (!selectedRoom) return;
    try {
      await navigator.clipboard.writeText(SummaryPreview({
        room: selectedRoom,
        reports: selectedReports,
        openRisks: metrics?.openRisks || 0,
        progress: metrics?.readiness || 0,
      }));
      setCopied(true);
      setNotice("Room summary copied.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setNotice("Clipboard access is unavailable.");
    }
  };

  const exportRoom = () => {
    if (!selectedRoom) return;
    const rows = [
      ["Release control room", "Value"],
      ["Room", selectedRoom.name],
      ["Release", selectedRoom.release],
      ["State", stateMeta(selectedRoom.state).label],
      ["Owner", selectedRoom.owner],
      ["Recipient", selectedRoom.recipient],
      ["Target date", selectedRoom.targetDate],
      ["Readiness", `${metrics?.readiness || 0}%`],
      [],
      ["Milestone", "Owner", "Due", "State", "Note"],
      ...selectedRoom.milestones.map((milestone) => [
        milestone.title,
        milestone.owner,
        milestone.dueDate,
        milestone.state,
        milestone.note,
      ]),
      [],
      ["Risk", "Level", "Owner", "Status", "Review by", "Mitigation"],
      ...selectedRoom.risks.map((risk) => [
        risk.title,
        risk.level,
        risk.owner,
        risk.status,
        risk.dueDate,
        risk.mitigation,
      ]),
    ];
    csvDownload("release-control-room.csv", rows);
    setNotice("Room export downloaded.");
  };

  const resetRoom = () => {
    if (!selectedRoom) return;
    const reset = createRoom();
    reset.id = selectedRoom.id;
    reset.name = selectedRoom.name;
    reset.release = selectedRoom.release;
    reset.owner = selectedRoom.owner;
    reset.recipient = selectedRoom.recipient;
    reset.targetDate = selectedRoom.targetDate;
    updateRoom(reset);
    setNotice("Room checklist and planning data reset.");
  };

  if (!selectedRoom) return null;

  const visibleMilestones = selectedRoom.milestones;
  const visibleRisks = selectedRoom.risks;
  const selectedVisibleReports = filteredReports.filter((report) => selectedRoom.reportIds.includes(reportId(report)));
  const highRiskCount = selectedRoom.risks.filter((risk) => risk.status === "open" && ["critical", "high"].includes(risk.level)).length;
  const allVisibleSelected = filteredReports.length > 0 && filteredReports.every((report) => selectedRoom.reportIds.includes(reportId(report)));

  return (
    <section id="tester-release-control-room" className="space-y-4 rounded-3xl bg-slate-50/70 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Gauge size={18} aria-hidden="true" className="text-cyan-600" />
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Release control room</h2>
          </div>
          <p className="mt-1 max-w-2xl text-[10px] leading-5 text-slate-500">
            Coordinate release evidence, milestones, risks, and handoff context in a private tester workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button icon={Plus} variant="primary" onClick={createNewRoom}>New room</Button>
          <Button icon={Download} onClick={exportRoom}>Export</Button>
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
        <Panel title="Release rooms" detail={`${formatNumber(filteredRooms.length)} matching room(s)`} icon={ClipboardCheck} action={<Button variant="ghost" icon={sortAscending ? ArrowUpAZ : ArrowDownAZ} onClick={() => setSortAscending((value) => !value)} title="Toggle room sort" />}>
          <div className="space-y-2.5">
            <div className="relative">
              <Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search rooms" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
            </div>
            <SelectField label="State filter" value={stateFilter} onChange={setStateFilter} options={STATE_FILTERS} />
            {visibleRooms.length ? (
              <div className="space-y-2">
                {visibleRooms.map((room) => {
                  const roomMetric = metricsByRoom.get(room.id);
                  return <RoomCard key={room.id} room={room} selected={room.id === selectedRoom.id} onSelect={() => setSelectedId(room.id)} reportCount={room.reportIds.length} openRisks={roomMetric?.openRisks || 0} progress={roomMetric?.readiness || 0} />;
                })}
              </div>
            ) : <EmptyState title="No matching rooms" detail="Try clearing the search or state filter." icon={Search} />}
            {filteredRooms.length > INITIAL_VISIBLE ? (
              <Button variant="ghost" onClick={() => setShowAllRooms((value) => !value)}>{showAllRooms ? "Show fewer" : `Show all ${filteredRooms.length}`}</Button>
            ) : null}
          </div>
        </Panel>

        <div className="min-w-0 space-y-4">
          <DetailHeader room={selectedRoom} onChange={updateRoom} onDelete={deleteRoom} onDuplicate={duplicateRoom} />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Readiness" value={`${metrics?.readiness || 0}%`} detail="Combined room signal" icon={Gauge} tone="cyan" />
            <StatCard label="Evidence" value={formatNumber(selectedReports.length)} detail="Reports attached" icon={FileCheck2} tone="violet" />
            <StatCard label="Open risks" value={formatNumber(metrics?.openRisks || 0)} detail={`${highRiskCount} high or critical`} icon={TriangleAlert} tone="rose" />
            <StatCard label="Milestones" value={`${metrics?.milestoneProgress || 0}%`} detail={`${visibleMilestones.length} planned item(s)`} icon={Flag} tone="emerald" />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <Panel title="Decision context" detail="Write the concise context a release owner needs." icon={Clipboard}>
              <div className="space-y-3">
                <TextArea label="Recommendation summary" value={selectedRoom.summary} onChange={(value) => updateRoom({ summary: value })} placeholder="What should the release owner know, and what decision are you asking for?" rows={4} />
                <TextArea label="Fallback or containment" value={selectedRoom.fallback} onChange={(value) => updateRoom({ fallback: value })} placeholder="Describe mitigation, rollback, or a safe containment path." rows={3} />
                <Guidance room={selectedRoom} reportCount={selectedReports.length} openRisks={metrics?.openRisks || 0} milestoneProgress={metrics?.milestoneProgress || 0} />
              </div>
            </Panel>
            <Panel title="Readiness checks" detail={`${metrics?.checkProgress || 0}% complete`} icon={ListChecks}>
              <div className="space-y-2">
                {CHECKS.map((check) => <CheckRow key={check.id} check={check} checked={Boolean(selectedRoom.checks[check.id])} onChange={(event) => updateRoom({ checks: { ...selectedRoom.checks, [check.id]: event.target.checked } })} />)}
              </div>
            </Panel>
          </div>

          <Panel title="Milestone plan" detail="Track the sequence from scope confirmation to decision handoff." icon={CalendarDays} action={<Button icon={Plus} onClick={addMilestone} disabled={visibleMilestones.length >= MAX_MILESTONES}>Add milestone</Button>}>
            <div className="space-y-2.5">
              {visibleMilestones.length ? visibleMilestones.map((milestone) => <MilestoneRow key={milestone.id} milestone={milestone} onChange={(patch) => updateMilestone(milestone.id, patch)} onRemove={() => removeMilestone(milestone.id)} />) : <EmptyState title="No milestones yet" detail="Add a milestone to make the release path visible." icon={CalendarDays} />}
            </div>
          </Panel>

          <Panel title="Risk register" detail="Keep unresolved concerns visible and assign a next action." icon={Shield} action={<Button icon={Plus} onClick={addRisk} disabled={visibleRisks.length >= MAX_RISKS}>Add risk</Button>}>
            <div className="space-y-2.5">
              {visibleRisks.length ? visibleRisks.map((risk) => <RiskRow key={risk.id} risk={risk} onChange={(patch) => updateRisk(risk.id, patch)} onRemove={() => removeRisk(risk.id)} />) : <EmptyState title="No risks recorded" detail="Add known risks, even when the current decision is favorable." icon={Shield} />}
            </div>
          </Panel>

          <Panel title="Evidence reports" detail={`${formatNumber(selectedRoom.reportIds.length)} attached · ${formatNumber(filteredReports.length)} shown`} icon={FileCheck2} action={<Button icon={allVisibleSelected ? X : Check} onClick={toggleAllVisibleReports}>{allVisibleSelected ? "Clear shown" : "Select shown"}</Button>}>
            <div className="space-y-3">
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_150px]">
                <label className="relative block">
                  <span className="sr-only">Search reports</span>
                  <Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Search report title or category" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" />
                </label>
                <SelectField label="Severity" value={reportSeverityFilter} onChange={setReportSeverityFilter} options={RISK_FILTERS} />
                <SelectField label="Status" value={reportStatusFilter} onChange={setReportStatusFilter} options={[{ value: "all", label: "All statuses" }, { value: "open", label: "Open reports" }, { value: "closed", label: "Resolved reports" }]} />
              </div>
              {filteredReports.length ? <div className="space-y-2">{filteredReports.slice(0, 20).map((report) => <ReportRow key={reportId(report)} report={report} checked={selectedRoom.reportIds.includes(reportId(report))} onToggle={() => toggleReport(reportId(report))} onOpenReport={onOpenReport} />)}</div> : <EmptyState title="No reports match" detail="Adjust the evidence filters or wait for reports to be available." icon={FileCheck2} />}
              {filteredReports.length > 20 ? <p className="text-center text-[9px] text-slate-400">Showing the first 20 matching reports. Narrow the search to find a specific report.</p> : null}
              <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3">
                <p className="flex items-center gap-1.5 text-[9px] font-semibold text-violet-800"><Users size={12} aria-hidden="true" /> Evidence remains private</p>
                <p className="mt-1 text-[9px] leading-4 text-violet-700/75">Selecting reports here only stores their IDs in this tester&apos;s browser. It does not change report status or ownership.</p>
              </div>
              <p className="text-[9px] text-slate-400">{formatNumber(selectedVisibleReports.length)} selected in the current filtered view.</p>
            </div>
          </Panel>

          <Panel title="Reference links" detail="Keep design, build, incident, or runbook references together." icon={ExternalLink} action={<Button icon={Plus} onClick={addLink} disabled={selectedRoom.links.length >= 20}>Add link</Button>}>
            <div className="space-y-3">
              {selectedRoom.links.length ? selectedRoom.links.map((link) => <LinkRow key={link.id} link={link} onChange={(patch) => updateLink(link.id, patch)} onRemove={() => removeLink(link.id)} />) : <EmptyState title="No references added" detail="Add a link when the decision depends on another workspace or document." icon={ExternalLink} />}
            </div>
          </Panel>

          <Panel title="Room actions" detail="Browser-local controls for this planning workspace." icon={RefreshCw}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-xl text-[9px] leading-4 text-slate-400">Reset clears milestones, risks, checks, evidence, and links while keeping the room identity fields.</p>
              <Button variant="danger" icon={RefreshCw} onClick={resetRoom}>Reset planning data</Button>
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}
