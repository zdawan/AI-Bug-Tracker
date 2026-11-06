"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Accessibility,
  AlertCircle,
  ArrowDown,
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  Download,
  ExternalLink,
  Eye,
  FilePlus2,
  FilterX,
  Keyboard,
  Layers3,
  Link2,
  ListChecks,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

const STORAGE_PREFIX = "tester-accessibility-audits-v1";
const MAX_AUDITS = 35;
const MAX_CHECKS = 100;
const MAX_ACTIVITY = 100;
const MAX_NOTE_LENGTH = 1400;

const CHECK_STATES = [
  { id: "pending", label: "Not reviewed", short: "Pending", icon: CircleDashed, tone: "border-slate-200 bg-slate-50 text-slate-600" },
  { id: "pass", label: "Looks good", short: "Pass", icon: CheckCircle2, tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { id: "issue", label: "Issue found", short: "Issue", icon: ShieldAlert, tone: "border-rose-200 bg-rose-50 text-rose-700" },
  { id: "blocked", label: "Unable to assess", short: "Blocked", icon: AlertCircle, tone: "border-amber-200 bg-amber-50 text-amber-800" },
  { id: "na", label: "Not applicable", short: "N/A", icon: FilterX, tone: "border-violet-200 bg-violet-50 text-violet-700" },
];

const AUDIT_STATES = {
  draft: { label: "Draft", tone: "border-slate-200 bg-slate-50 text-slate-600" },
  active: { label: "In progress", tone: "border-sky-200 bg-sky-50 text-sky-700" },
  review: { label: "Ready for review", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  complete: { label: "Complete", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
};

const GROUPS = [
  {
    id: "perceivable",
    label: "Perceivable",
    description: "Content and controls should be available through more than one sensory channel.",
    icon: Eye,
    checks: [
      ["Text alternatives", "Meaningful images have useful text alternatives; decorative images are ignored by assistive technology.", "High"],
      ["Color and contrast", "Text, controls, and status indicators remain distinguishable without relying on color alone.", "High"],
      ["Text resizing", "Text can be enlarged and layouts remain usable without clipped or overlapping content.", "Medium"],
      ["Reflow and zoom", "Content can reflow at a narrow viewport or high zoom without unnecessary two-dimensional scrolling.", "Medium"],
      ["Captions and alternatives", "Audio or video information has captions or an equivalent text alternative where needed.", "Medium"],
      ["Structure and relationships", "Headings, lists, and form relationships are conveyed by structure, not appearance alone.", "High"],
    ].map(([title, guidance, priority]) => ({ title, guidance, priority })),
  },
  {
    id: "operable",
    label: "Operable",
    description: "Users should be able to navigate, operate, and understand interactive controls.",
    icon: Keyboard,
    checks: [
      ["Keyboard access", "All interactive functionality can be reached and operated using a keyboard.", "High"],
      ["Visible focus", "Keyboard focus is clearly visible and is not hidden by sticky or overlaid content.", "High"],
      ["Focus order", "Focus moves in a logical sequence that preserves the meaning and operation of the page.", "High"],
      ["No keyboard trap", "Users can move focus away from every component using standard keyboard interaction.", "Critical"],
      ["Pointer alternatives", "Complex pointer gestures have a simpler single-pointer or keyboard alternative.", "Medium"],
      ["Target size and spacing", "Interactive targets are sufficiently large and separated for reliable activation.", "Medium"],
      ["Motion and animation", "Motion can be reduced or paused when it may distract or cause discomfort.", "Medium"],
    ].map(([title, guidance, priority]) => ({ title, guidance, priority })),
  },
  {
    id: "understandable",
    label: "Understandable",
    description: "Language, forms, and interactions should be predictable and easy to recover from.",
    icon: Accessibility,
    checks: [
      ["Page language", "The primary language is programmatically identifiable and changes are indicated where needed.", "Low"],
      ["Consistent navigation", "Repeated navigation and controls behave consistently across related views.", "Medium"],
      ["Clear labels and instructions", "Controls have understandable names and instructions appear before they are needed.", "High"],
      ["Error identification", "Input errors are described in text and associated with the relevant field.", "High"],
      ["Error prevention", "High-impact submissions allow review, correction, or confirmation where appropriate.", "Medium"],
      ["Predictable interaction", "Focusing or changing a control does not unexpectedly trigger a context change.", "Medium"],
    ].map(([title, guidance, priority]) => ({ title, guidance, priority })),
  },
  {
    id: "robust",
    label: "Robust",
    description: "Semantics and dynamic updates should work with assistive technologies.",
    icon: Layers3,
    checks: [
      ["Semantic controls", "Native or correctly named controls expose their role, name, and current value.", "High"],
      ["Accessible names", "Icon-only and custom controls have a useful accessible name.", "High"],
      ["Dynamic status updates", "Important loading, validation, and completion messages can be discovered by assistive technology.", "High"],
      ["Component state", "Expanded, selected, disabled, and checked states are exposed accurately.", "Medium"],
      ["Assistive technology spot check", "At least one representative path was checked with an appropriate screen reader or accessibility inspector.", "Medium"],
    ].map(([title, guidance, priority]) => ({ title, guidance, priority })),
  },
];

const CHECK_FILTERS = [
  { id: "all", label: "All checks" },
  { id: "pending", label: "Not reviewed" },
  { id: "pass", label: "Looks good" },
  { id: "issue", label: "Issues found" },
  { id: "blocked", label: "Unable to assess" },
  { id: "na", label: "Not applicable" },
];

const PRIORITY_FILTERS = [
  { id: "all", label: "All priorities" },
  { id: "Critical", label: "Critical priority" },
  { id: "High", label: "High priority" },
  { id: "Medium", label: "Medium priority" },
  { id: "Low", label: "Low priority" },
];

function getText(value, limit = 320) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getTimestamp(value) {
  if (typeof value !== "string" || !value) return "";
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
}

function getLocalStorageKey(email) {
  return `${STORAGE_PREFIX}:${encodeURIComponent(getText(email, 240).toLowerCase())}`;
}

function checkState(value) {
  return CHECK_STATES.find((state) => state.id === value) || CHECK_STATES[0];
}

function normalizeCheck(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const validStates = CHECK_STATES.map((state) => state.id);
  return {
    id: getText(value.id, 100) || makeId(),
    groupId: getText(value.groupId, 80) || "custom",
    groupLabel: getText(value.groupLabel, 100) || "Custom",
    title: getText(value.title, 180) || "Untitled check",
    guidance: getText(value.guidance, 600),
    priority: ["Critical", "High", "Medium", "Low"].includes(value.priority) ? value.priority : "Medium",
    status: validStates.includes(value.status) ? value.status : "pending",
    notes: getText(value.notes, MAX_NOTE_LENGTH),
    evidenceUrl: getText(value.evidenceUrl, 1000),
    reportId: getText(value.reportId, 120),
    updatedAt: getTimestamp(value.updatedAt),
    custom: Boolean(value.custom),
  };
}

function normalizeActivity(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const message = getText(value.message, 240);
  if (!message) return null;
  return {
    id: getText(value.id, 100) || makeId(),
    message,
    createdAt: getTimestamp(value.createdAt) || new Date().toISOString(),
  };
}

function normalizeAudit(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const checks = Array.isArray(value.checks)
    ? value.checks.slice(0, MAX_CHECKS).map(normalizeCheck).filter(Boolean)
    : [];
  const status = Object.hasOwn(AUDIT_STATES, value.status) ? value.status : "draft";
  return {
    id: getText(value.id, 100) || makeId(),
    name: getText(value.name, 180) || "Untitled accessibility audit",
    targetUrl: getText(value.targetUrl, 1000),
    build: getText(value.build, 100),
    environment: getText(value.environment, 180),
    reviewer: getText(value.reviewer, 120),
    notes: getText(value.notes, MAX_NOTE_LENGTH),
    status,
    reportIds: Array.isArray(value.reportIds)
      ? [...new Set(value.reportIds.map((id) => getText(id, 120)).filter(Boolean))].slice(0, 250)
      : [],
    checks,
    activity: Array.isArray(value.activity)
      ? value.activity.slice(-MAX_ACTIVITY).map(normalizeActivity).filter(Boolean)
      : [],
    createdAt: getTimestamp(value.createdAt) || new Date().toISOString(),
    updatedAt: getTimestamp(value.updatedAt) || new Date().toISOString(),
    completedAt: getTimestamp(value.completedAt),
  };
}

function normalizeAudits(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_AUDITS).map(normalizeAudit).filter(Boolean);
}

function seedChecks() {
  return GROUPS.flatMap((group) => group.checks.map((check) => normalizeCheck({
    id: makeId(),
    groupId: group.id,
    groupLabel: group.label,
    ...check,
    status: "pending",
    notes: "",
    evidenceUrl: "",
    reportId: "",
    updatedAt: "",
    custom: false,
  })));
}

function formatDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function validHttpUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getReportId(report) {
  const id = report?._id ?? report?.id;
  return id === null || id === undefined ? "" : String(id).trim();
}

function getReportTitle(report) {
  return getText(report?.title, 200) || getText(report?.summary, 200) || "Untitled report";
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function safeFilename(value) {
  return getText(value, 120).replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "accessibility-audit";
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function appendActivity(audit, message) {
  return [
    ...audit.activity,
    { id: makeId(), message: getText(message, 240), createdAt: new Date().toISOString() },
  ].slice(-MAX_ACTIVITY);
}

function getMetrics(audit) {
  const counts = CHECK_STATES.reduce(
    (result, state) => ({ ...result, [state.id]: 0 }),
    {},
  );
  audit.checks.forEach((check) => {
    counts[checkState(check.status).id] += 1;
  });
  const reviewed = audit.checks.length - counts.pending;
  const applicable = counts.pass + counts.issue;
  const passRate = applicable > 0 ? Math.round((counts.pass / applicable) * 100) : 0;
  const criticalIssues = audit.checks.filter(
    (check) => check.status === "issue" && check.priority === "Critical",
  ).length;
  const completeness = audit.checks.length
    ? Math.round((reviewed / audit.checks.length) * 100)
    : 0;
  return {
    ...counts,
    total: audit.checks.length,
    reviewed,
    applicable,
    passRate,
    criticalIssues,
    completeness,
    issueCount: counts.issue,
    linkedReports: audit.reportIds.length,
  };
}

function newAudit(name) {
  const now = new Date().toISOString();
  return normalizeAudit({
    id: makeId(),
    name,
    targetUrl: "",
    build: "",
    environment: "",
    reviewer: "",
    notes: "",
    status: "draft",
    reportIds: [],
    checks: seedChecks(),
    activity: [{ id: makeId(), message: "Created accessibility audit from the starter checklist", createdAt: now }],
    createdAt: now,
    updatedAt: now,
  });
}

function StateBadge({ status }) {
  const state = AUDIT_STATES[status] || AUDIT_STATES.draft;
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${state.tone}`}>{state.label}</span>;
}

function MetricCard({ label, value, detail, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    sky: "border-sky-200 bg-sky-50/60 text-sky-900",
    green: "border-emerald-200 bg-emerald-50/60 text-emerald-900",
    rose: "border-rose-200 bg-rose-50/60 text-rose-900",
    amber: "border-amber-200 bg-amber-50/60 text-amber-900",
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs opacity-70">{detail}</p>
    </div>
  );
}

function EmptyState({ title, description, icon: Icon = Accessibility }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-9 text-center">
      <Icon className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>
    </div>
  );
}

function AuditListItem({ audit, selected, onSelect, onDelete }) {
  const metrics = getMetrics(audit);
  return (
    <article className={`rounded-2xl border p-3 transition ${selected ? "border-sky-300 bg-sky-50/70 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}>
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-sm font-semibold text-slate-900">{audit.name}</span>
          <StateBadge status={audit.status} />
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">{audit.environment || audit.build || "No environment details"}</p>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>{metrics.reviewed}/{metrics.total} reviewed · {metrics.issueCount} issues</span>
          <span>{formatDate(audit.updatedAt)}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-label={`${metrics.completeness}% reviewed`}>
          <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${metrics.completeness}%` }} />
        </div>
      </button>
      <div className="mt-3 flex justify-end border-t border-slate-100 pt-2">
        <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
        </button>
      </div>
    </article>
  );
}

function CheckCard({ item, index, reports, canEdit, onState, onField, onOpenReport, onRemove }) {
  const selectedReport = reports.find((report) => getReportId(report) === item.reportId);
  const state = checkState(item.status);
  const Icon = state.icon;
  return (
    <article
      id={`accessibility-check-${item.id}`}
      tabIndex={-1}
      className={`overflow-hidden rounded-2xl border outline-none focus:ring-2 focus:ring-sky-400 ${item.status === "issue" ? "border-rose-200 bg-rose-50/20" : "border-slate-200 bg-white"}`}
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">{index + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{item.groupLabel}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${item.priority === "Critical" ? "bg-rose-100 text-rose-700" : item.priority === "High" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{item.priority} priority</span>
              {item.custom ? <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">Custom</span> : null}
            </div>
            <h4 className="mt-1.5 text-sm font-semibold text-slate-900">{item.title}</h4>
            {item.guidance ? <p className="mt-1 text-sm leading-5 text-slate-600">{item.guidance}</p> : null}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {CHECK_STATES.filter((option) => option.id !== "pending").map((option) => {
                const OptionIcon = option.icon;
                return (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() => onState(item.id, option.id)}
                    disabled={!canEdit}
                    aria-pressed={item.status === option.id}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${item.status === option.id ? option.tone : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}
                  >
                    <OptionIcon className="h-3.5 w-3.5" aria-hidden="true" /> {option.short}
                  </button>
                );
              })}
              {item.status !== "pending" ? (
                <button type="button" onClick={() => onState(item.id, "pending")} disabled={!canEdit} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50">Reset</button>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${state.tone}`}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {state.short}
          </span>
          {item.custom && canEdit ? (
            <button type="button" onClick={() => onRemove(item.id)} aria-label={`Remove check ${item.title}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
      {(item.status === "issue" || item.status === "blocked" || item.notes || item.evidenceUrl || item.reportId) ? (
        <div className="grid gap-3 border-t border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-slate-600 sm:col-span-2">
            Observation {item.status === "issue" ? "(describe what you observed)" : item.status === "blocked" ? "(describe why the check could not be assessed)" : ""}
            <textarea
              value={item.notes}
              onChange={(event) => onField(item.id, "notes", event.target.value)}
              disabled={!canEdit}
              maxLength={MAX_NOTE_LENGTH}
              rows={2}
              placeholder="Record the observed behavior, context, assistive technology, or viewport."
              className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-sky-400 disabled:bg-slate-100"
            />
            <span className="mt-1 block text-right text-[10px] font-normal text-slate-400">{item.notes.length}/{MAX_NOTE_LENGTH}</span>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Evidence URL
            <input
              type="url"
              value={item.evidenceUrl}
              onChange={(event) => onField(item.id, "evidenceUrl", event.target.value)}
              disabled={!canEdit}
              maxLength={1000}
              placeholder="https://..."
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-700 disabled:bg-slate-100"
            />
            {item.evidenceUrl && !validHttpUrl(item.evidenceUrl) ? <span className="mt-1 block text-rose-600">Use an http:// or https:// URL.</span> : null}
            {validHttpUrl(item.evidenceUrl) && item.evidenceUrl ? (
              <a href={item.evidenceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-sky-700 hover:underline">Open evidence <ExternalLink className="h-3 w-3" aria-hidden="true" /></a>
            ) : null}
          </label>
          <label className="text-xs font-medium text-slate-600">
            Related report
            <select
              value={item.reportId}
              onChange={(event) => onField(item.id, "reportId", event.target.value)}
              disabled={!canEdit}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-700 disabled:bg-slate-100"
            >
              <option value="">No linked report</option>
              {item.reportId && !selectedReport ? <option value={item.reportId}>Saved report reference unavailable</option> : null}
              {reports.map((report) => {
                const id = getReportId(report);
                return id ? <option key={id} value={id}>{getReportTitle(report)}</option> : null;
              })}
            </select>
            {selectedReport && onOpenReport ? (
              <button type="button" onClick={() => onOpenReport(selectedReport)} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline">
                Open report <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </button>
            ) : null}
          </label>
        </div>
      ) : null}
      {item.updatedAt ? <div className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400">Updated {formatDate(item.updatedAt)}</div> : null}
    </article>
  );
}

export default function AccessibilityAuditWorkspace({ reports = [], email, onOpenReport }) {
  const [audits, setAudits] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loadedEmail, setLoadedEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [auditQuery, setAuditQuery] = useState("");
  const [checkQuery, setCheckQuery] = useState("");
  const [checkFilter, setCheckFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [nextCheckId, setNextCheckId] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAuditName, setNewAuditName] = useState("");
  const [newTargetUrl, setNewTargetUrl] = useState("");
  const [newBuild, setNewBuild] = useState("");
  const [newEnvironment, setNewEnvironment] = useState("");
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customGroup, setCustomGroup] = useState("Custom");
  const [customTitle, setCustomTitle] = useState("");
  const [customGuidance, setCustomGuidance] = useState("");
  const [customPriority, setCustomPriority] = useState("Medium");
  const [reportSearch, setReportSearch] = useState("");

  const requestedEmail = getText(email, 240).toLowerCase();
  const selectedAudit = audits.find((audit) => audit.id === selectedId) || null;
  const metrics = selectedAudit ? getMetrics(selectedAudit) : null;
  const canEdit = selectedAudit?.status !== "complete";

  const visibleAudits = useMemo(() => {
    const query = getText(auditQuery, 120).toLowerCase();
    return audits
      .filter((audit) => !query || [
        audit.name,
        audit.build,
        audit.environment,
        audit.targetUrl,
        audit.reviewer,
      ].some((value) => value.toLowerCase().includes(query)))
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  }, [audits, auditQuery]);

  const visibleChecks = useMemo(() => {
    if (!selectedAudit) return [];
    const query = getText(checkQuery, 140).toLowerCase();
    return selectedAudit.checks
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => groupFilter === "all" || (
        groupFilter === "custom" ? item.custom : item.groupId === groupFilter
      ))
      .filter(({ item }) => checkFilter === "all" || item.status === checkFilter)
      .filter(({ item }) => priorityFilter === "all" || item.priority === priorityFilter)
      .filter(({ item }) => !query || [
        item.title,
        item.guidance,
        item.notes,
        item.groupLabel,
        item.priority,
      ].some((value) => value.toLowerCase().includes(query)));
  }, [selectedAudit, checkQuery, checkFilter, priorityFilter, groupFilter]);

  useEffect(() => {
    if (!nextCheckId || !visibleChecks.some(({ item }) => item.id === nextCheckId)) return;
    const element = document.getElementById(`accessibility-check-${nextCheckId}`);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.focus({ preventScroll: true });
    setNextCheckId("");
  }, [nextCheckId, visibleChecks]);

  const reportOptions = useMemo(() => {
    const query = getText(reportSearch, 120).toLowerCase();
    return reports
      .filter((report) => getReportId(report))
      .map((report) => ({
        id: getReportId(report),
        title: getReportTitle(report),
        status: report?.status === "Closed" ? "Closed" : "Open",
      }))
      .filter((report) => !query || `${report.title} ${report.status}`.toLowerCase().includes(query))
      .sort((left, right) => left.title.localeCompare(right.title))
      .slice(0, 200);
  }, [reports, reportSearch]);

  useEffect(() => {
    const normalizedEmail = getText(email, 240).toLowerCase();
    setLoading(true);
    setLoadError("");
    setNotice("");
    setSelectedId("");
    if (!normalizedEmail) {
      setAudits([]);
      setLoadedEmail("");
      setLoadError("A signed-in tester account is required to load local accessibility audits.");
      setLoading(false);
      return;
    }

    try {
      const saved = window.localStorage.getItem(getLocalStorageKey(normalizedEmail));
      const parsed = saved ? JSON.parse(saved) : [];
      const next = normalizeAudits(parsed);
      setAudits(next);
      setSelectedId(next[0]?.id || "");
      setLoadedEmail(normalizedEmail);
    } catch (error) {
      setAudits([]);
      setLoadedEmail(normalizedEmail);
      setLoadError(
        error instanceof SyntaxError
          ? "Saved accessibility audit data is invalid JSON. Existing browser data was left untouched."
          : `Accessibility audits could not be loaded: ${error.message}`,
      );
    } finally {
      setLoading(false);
    }
  }, [email]);

  const persistAudits = (nextAudits) => {
    if (loadError) {
      setNotice("Cannot overwrite audit storage after a load error. Resolve the storage issue first.");
      return false;
    }
    if (!loadedEmail || loadedEmail !== requestedEmail) {
      setNotice("Wait for account-specific audit data to load before editing.");
      return false;
    }
    if (nextAudits.length > MAX_AUDITS) {
      setNotice(`Keep at most ${MAX_AUDITS} accessibility audits in this browser.`);
      return false;
    }
    try {
      window.localStorage.setItem(
        getLocalStorageKey(loadedEmail),
        JSON.stringify(nextAudits.map(normalizeAudit)),
      );
      setAudits(nextAudits);
      setNotice("Saved locally in this browser.");
      return true;
    } catch (error) {
      setNotice(`Could not save accessibility audit changes: ${error.message}`);
      return false;
    }
  };

  const updateAudit = (auditId, updater, successMessage = "") => {
    const current = audits.find((audit) => audit.id === auditId);
    if (!current) {
      setNotice("This accessibility audit is no longer available.");
      return false;
    }
    const next = normalizeAudit({ ...updater(current), updatedAt: new Date().toISOString() });
    const saved = persistAudits(audits.map((audit) => audit.id === auditId ? next : audit));
    if (saved && successMessage) setNotice(successMessage);
    return saved;
  };

  const updateSelectedField = (field, value) => {
    if (!selectedAudit) return;
    const limits = { name: 180, targetUrl: 1000, build: 100, environment: 180, reviewer: 120, notes: MAX_NOTE_LENGTH };
    const nextValue = getText(value, limits[field] || 300);
    if (field === "name" && !nextValue) {
      setNotice("Audit name cannot be empty.");
      return;
    }
    if (field === "targetUrl" && !validHttpUrl(nextValue)) {
      setNotice("Target URL must be empty or a valid http:// or https:// URL.");
      return;
    }
    updateAudit(selectedAudit.id, (audit) => ({ ...audit, [field]: nextValue }));
  };

  const createAudit = () => {
    const name = getText(newAuditName, 180);
    if (!name) {
      setNotice("Enter a name for the accessibility audit.");
      return;
    }
    if (!validHttpUrl(getText(newTargetUrl, 1000))) {
      setNotice("Target URL must be empty or a valid http:// or https:// URL.");
      return;
    }
    if (audits.length >= MAX_AUDITS) {
      setNotice(`You have reached the ${MAX_AUDITS}-audit browser limit.`);
      return;
    }
    const audit = newAudit(name);
    audit.targetUrl = getText(newTargetUrl, 1000);
    audit.build = getText(newBuild, 100);
    audit.environment = getText(newEnvironment, 180);
    if (persistAudits([audit, ...audits])) {
      setSelectedId(audit.id);
      setNewAuditName("");
      setNewTargetUrl("");
      setNewBuild("");
      setNewEnvironment("");
      setShowCreateForm(false);
    }
  };

  const deleteAudit = (audit) => {
    if (!window.confirm(`Delete "${audit.name}" and its local accessibility notes? This cannot be undone.`)) return;
    const next = audits.filter((item) => item.id !== audit.id);
    if (persistAudits(next)) {
      if (selectedId === audit.id) setSelectedId(next[0]?.id || "");
      setNotice("Accessibility audit and its local notes were deleted.");
    }
  };

  const updateCheck = (checkId, field, value) => {
    if (!selectedAudit) return;
    if (field === "evidenceUrl" && !validHttpUrl(getText(value, 1000))) {
      setNotice("Evidence URL must be empty or use http:// or https://.");
      return;
    }
    const limits = { notes: MAX_NOTE_LENGTH, evidenceUrl: 1000, reportId: 120 };
    const nextValue = field === "status"
      ? CHECK_STATES.some((state) => state.id === value) ? value : "pending"
      : getText(value, limits[field] || 300);
    const check = selectedAudit.checks.find((item) => item.id === checkId);
    if (!check) return;
    const message = field === "status"
      ? `${check.title}: ${checkState(nextValue).label}`
      : "";
    updateAudit(selectedAudit.id, (audit) => ({
      ...audit,
      checks: audit.checks.map((item) => item.id === checkId
        ? { ...item, [field]: nextValue, updatedAt: new Date().toISOString() }
        : item),
      activity: message ? appendActivity(audit, message) : audit.activity,
    }), message);
  };

  const createCustomCheck = () => {
    if (!selectedAudit) return;
    const title = getText(customTitle, 180);
    if (!title) {
      setNotice("Enter a title for the custom check.");
      return;
    }
    if (selectedAudit.checks.length >= MAX_CHECKS) {
      setNotice(`An audit can contain at most ${MAX_CHECKS} checks.`);
      return;
    }
    const group = getText(customGroup, 100) || "Custom";
    const item = normalizeCheck({
      id: makeId(),
      groupId: group.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      groupLabel: group,
      title,
      guidance: customGuidance,
      priority: customPriority,
      status: "pending",
      custom: true,
    });
    if (updateAudit(selectedAudit.id, (audit) => ({
      ...audit,
      checks: [...audit.checks, item],
      activity: appendActivity(audit, `Added custom check: ${item.title}`),
    }), "Custom check added.")) {
      setCustomTitle("");
      setCustomGuidance("");
      setCustomGroup("Custom");
      setCustomPriority("Medium");
      setShowCustomForm(false);
    }
  };

  const removeCustomCheck = (checkId) => {
    if (!selectedAudit) return;
    const item = selectedAudit.checks.find((check) => check.id === checkId);
    if (!item || !item.custom || !window.confirm(`Remove custom check "${item.title}"?`)) return;
    updateAudit(selectedAudit.id, (audit) => ({
      ...audit,
      checks: audit.checks.filter((check) => check.id !== checkId),
      activity: appendActivity(audit, `Removed custom check: ${item.title}`),
    }), "Custom check removed.");
  };

  const toggleReport = (id) => {
    if (!selectedAudit) return;
    const reportIds = selectedAudit.reportIds.includes(id)
      ? selectedAudit.reportIds.filter((item) => item !== id)
      : [...selectedAudit.reportIds, id].slice(0, 250);
    updateAudit(selectedAudit.id, (audit) => ({
      ...audit,
      reportIds,
      activity: appendActivity(audit, `${selectedAudit.reportIds.includes(id) ? "Unlinked" : "Linked"} a report reference`),
    }), "Report references updated.");
  };

  const updateAuditStatus = (status) => {
    if (!selectedAudit || !Object.hasOwn(AUDIT_STATES, status)) return;
    const nextStatus = status === "complete" && metrics.pending > 0
      ? "review"
      : status;
    if (status === "complete" && metrics.pending > 0) {
      setNotice(`Review all checks or mark them not applicable before completing. ${metrics.pending} check(s) remain.`);
      return;
    }
    updateAudit(selectedAudit.id, (audit) => ({
      ...audit,
      status: nextStatus,
      completedAt: nextStatus === "complete" ? new Date().toISOString() : "",
      activity: appendActivity(audit, `Audit marked ${AUDIT_STATES[nextStatus].label.toLowerCase()}`),
    }), `Audit marked ${AUDIT_STATES[nextStatus].label.toLowerCase()}.`);
  };

  const resetFilters = () => {
    setCheckFilter("all");
    setPriorityFilter("all");
    setGroupFilter("all");
    setCheckQuery("");
  };

  const jumpToCheck = (status) => {
    const targetCheck = selectedAudit?.checks.find((item) => item.status === status);
    if (!targetCheck) return;
    setGroupFilter("all");
    setCheckFilter("all");
    setCheckQuery("");
    setNextCheckId(targetCheck.id);
  };

  const markPendingNotApplicable = (groupId = "all") => {
    if (!selectedAudit) return;
    const pendingCount = selectedAudit.checks.filter(
      (item) => item.status === "pending" &&
        (groupId === "all" || item.groupId === groupId),
    ).length;
    if (!pendingCount) return;
    const groupLabel = GROUPS.find((group) => group.id === groupId)?.label;
    const scope = groupLabel ? ` in ${groupLabel}` : "";
    if (!window.confirm(`Mark ${pendingCount} unreviewed check(s)${scope} as not applicable?`)) return;
    updateAudit(selectedAudit.id, (audit) => ({
      ...audit,
      checks: audit.checks.map((item) => item.status === "pending" &&
        (groupId === "all" || item.groupId === groupId)
        ? { ...item, status: "na", updatedAt: new Date().toISOString() }
        : item),
      activity: appendActivity(
        audit,
        `Marked ${pendingCount} unreviewed check(s)${scope} not applicable`,
      ),
    }), `${pendingCount} unreviewed check(s)${scope} marked not applicable.`);
  };

  const exportCsv = () => {
    if (!selectedAudit) return;
    const rows = [
      ["Audit", "Target URL", "Build", "Environment", "Reviewer", "Group", "Check", "Priority", "Result", "Observation", "Evidence URL", "Related report ID", "Updated"],
      ...selectedAudit.checks.map((item) => [
        selectedAudit.name,
        selectedAudit.targetUrl,
        selectedAudit.build,
        selectedAudit.environment,
        selectedAudit.reviewer,
        item.groupLabel,
        item.title,
        item.priority,
        checkState(item.status).label,
        item.notes,
        item.evidenceUrl,
        item.reportId,
        item.updatedAt,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
    downloadFile(`${safeFilename(selectedAudit.name)}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
    setNotice("Accessibility audit exported as CSV.");
  };

  const exportJson = () => {
    if (!selectedAudit) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      scope: "Manual accessibility review notes. This export is not an automated conformance claim and does not change server reports.",
      audit: selectedAudit,
    };
    downloadFile(`${safeFilename(selectedAudit.name)}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
    setNotice("Accessibility audit exported as JSON.");
  };

  const copySummary = async () => {
    if (!selectedAudit || !metrics) return;
    const summary = [
      `Accessibility review: ${selectedAudit.name}`,
      `Status: ${AUDIT_STATES[selectedAudit.status].label}`,
      `Target: ${selectedAudit.targetUrl || "Not specified"}`,
      `Build: ${selectedAudit.build || "Not specified"}`,
      `Environment: ${selectedAudit.environment || "Not specified"}`,
      `Reviewer: ${selectedAudit.reviewer || "Not specified"}`,
      `Checks: ${metrics.reviewed}/${metrics.total} reviewed · ${metrics.issueCount} issue(s) · ${metrics.blocked} unable to assess`,
      `Completion: ${metrics.completeness}% reviewed; this is not a compliance score.`,
      "",
      "Issues found:",
      ...selectedAudit.checks
        .filter((item) => item.status === "issue")
        .map((item) => `- [${item.priority}] ${item.groupLabel}: ${item.title}${item.notes ? ` — ${item.notes}` : ""}`),
      "",
      "Manual review only; results require appropriate assistive-technology and accessibility-specialist follow-up.",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(summary);
      setNotice("Audit summary copied. Review and contextualize it before sharing.");
    } catch (error) {
      setNotice(`Could not copy the audit summary: ${error.message}`);
    }
  };

  const copyIssueList = async () => {
    if (!selectedAudit) return;
    const issues = selectedAudit.checks.filter((item) => item.status === "issue");
    const content = [
      `Accessibility issue list: ${selectedAudit.name}`,
      `Target: ${selectedAudit.targetUrl || "Not specified"}`,
      `Build: ${selectedAudit.build || "Not specified"}`,
      `Environment: ${selectedAudit.environment || "Not specified"}`,
      `Reviewer: ${selectedAudit.reviewer || "Not specified"}`,
      `Manual review findings: ${issues.length}`,
      "",
      ...(issues.length
        ? issues.flatMap((item, index) => [
          `${index + 1}. [${item.priority}] ${item.groupLabel} — ${item.title}`,
          `   Observation: ${item.notes || "No observation recorded"}`,
          item.evidenceUrl ? `   Evidence: ${item.evidenceUrl}` : "",
          item.reportId ? `   Related report ID: ${item.reportId}` : "",
        ].filter(Boolean))
        : ["No checks are currently marked as issues."]),
      "",
      "Draft from a manual checklist; verify findings and context before sharing. This is not an automated conformance report.",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(content);
      setNotice("Issue list copied. Verify findings and context before sharing.");
    } catch (error) {
      setNotice(`Could not copy the issue list: ${error.message}`);
    }
  };

  const groupCounts = selectedAudit
    ? GROUPS.map((group) => ({
      ...group,
      count: selectedAudit.checks.filter((item) => item.groupId === group.id).length,
      reviewed: selectedAudit.checks.filter((item) => item.groupId === group.id && item.status !== "pending").length,
      pending: selectedAudit.checks.filter((item) => item.groupId === group.id && item.status === "pending").length,
      passed: selectedAudit.checks.filter((item) => item.groupId === group.id && item.status === "pass").length,
      issues: selectedAudit.checks.filter((item) => item.groupId === group.id && item.status === "issue").length,
      blocked: selectedAudit.checks.filter((item) => item.groupId === group.id && item.status === "blocked").length,
      notApplicable: selectedAudit.checks.filter((item) => item.groupId === group.id && item.status === "na").length,
    }))
    : [];

  if (loading || (requestedEmail && loadedEmail !== requestedEmail)) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-busy="true">
        <div className="h-5 w-56 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-20 animate-pulse rounded-2xl bg-slate-50" />
        <p className="mt-3 text-xs text-slate-500">Loading browser-local accessibility audits…</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
      <header className="border-b border-slate-200 bg-gradient-to-br from-sky-50 via-white to-violet-50/60 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-sky-800">
              <Accessibility className="h-5 w-5" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em]">Accessibility audit workspace</p>
            </div>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">Review inclusive access across user journeys</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Work through a manual checklist across perceivable, operable, understandable, and robust experiences. Record observations, evidence, and related reports without making an automated conformance claim.
            </p>
          </div>
          <button type="button" onClick={() => setShowCreateForm((value) => !value)} disabled={audits.length >= MAX_AUDITS || Boolean(loadError)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-50">
            <Plus className="h-4 w-4" aria-hidden="true" /> New audit
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><Layers3 className="h-3.5 w-3.5" aria-hidden="true" /> {audits.length}/{MAX_AUDITS} local audits</span>
          <span className="inline-flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" /> Manual checklist, not a certification</span>
          <span className="inline-flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Report links are references only</span>
        </div>
      </header>

      <div className="space-y-4 p-4 sm:p-5">
        {loadError ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <p className="font-semibold">Audit storage could not be loaded</p>
            <p className="mt-1">{loadError}</p>
          </div>
        ) : null}
        {notice ? (
          <div role="status" aria-live="polite" className="flex items-start justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50 px-3.5 py-2.5 text-sm text-sky-800">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} aria-label="Dismiss message" className="rounded p-0.5 hover:bg-sky-100"><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        ) : null}

        {showCreateForm && !loadError ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50/30 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Create a manual audit</h3>
                <p className="mt-1 text-xs text-slate-500">A starter checklist will be added; tailor the scope and record only what you actually assessed.</p>
              </div>
              <button type="button" onClick={() => setShowCreateForm(false)} aria-label="Close create audit form" className="rounded-lg p-1.5 text-slate-500 hover:bg-white"><X className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-medium text-slate-600 sm:col-span-2">Audit name *
                <input value={newAuditName} onChange={(event) => setNewAuditName(event.target.value)} maxLength={180} placeholder="e.g. Checkout keyboard and screen-reader review" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400" />
              </label>
              <label className="text-xs font-medium text-slate-600">Build
                <input value={newBuild} onChange={(event) => setNewBuild(event.target.value)} maxLength={100} placeholder="e.g. 3.2.0-rc1" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400" />
              </label>
              <label className="text-xs font-medium text-slate-600">Environment
                <input value={newEnvironment} onChange={(event) => setNewEnvironment(event.target.value)} maxLength={180} placeholder="Browser, OS, assistive tech" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400" />
              </label>
              <label className="text-xs font-medium text-slate-600 sm:col-span-2 lg:col-span-4">Target URL
                <input type="url" value={newTargetUrl} onChange={(event) => setNewTargetUrl(event.target.value)} maxLength={1000} placeholder="https://..." className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400" />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={createAudit} className="inline-flex items-center gap-2 rounded-xl bg-sky-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-900"><FilePlus2 className="h-4 w-4" aria-hidden="true" /> Create audit</button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input value={auditQuery} onChange={(event) => setAuditQuery(event.target.value)} placeholder="Find an audit…" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sky-400" />
              </label>
              <div className="mt-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Audits</h3>
                <span className="text-xs text-slate-400">{visibleAudits.length} shown</span>
              </div>
              <div className="mt-2 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
                {visibleAudits.length ? visibleAudits.map((audit) => (
                  <AuditListItem key={audit.id} audit={audit} selected={audit.id === selectedId} onSelect={() => setSelectedId(audit.id)} onDelete={() => deleteAudit(audit)} />
                )) : (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-500">{audits.length ? "No audits match your search." : "Create an audit to get started."}</p>
                )}
              </div>
            </div>
            {selectedAudit ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Review groups</h3>
                <div className="mt-2 space-y-1">
                  {groupCounts.map((group) => {
                    const Icon = group.icon;
                    return (
                      <div key={group.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setGroupFilter(groupFilter === group.id ? "all" : group.id)}
                          aria-pressed={groupFilter === group.id}
                          className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left ${groupFilter === group.id ? "bg-sky-50 text-sky-800" : "text-slate-600 hover:bg-slate-50"}`}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-medium">{group.label}</span>
                            <span className="block text-[10px] text-slate-400">{group.reviewed}/{group.count} reviewed{group.issues ? ` · ${group.issues} issue(s)` : ""}</span>
                            <span
                              className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-slate-100"
                              role="img"
                              aria-label={`${group.label}: ${group.passed} passed, ${group.issues} issues, ${group.blocked} unable to assess, ${group.notApplicable} not applicable, ${group.pending} pending`}
                            >
                              {[
                                ["bg-emerald-500", group.passed],
                                ["bg-rose-500", group.issues],
                                ["bg-amber-400", group.blocked],
                                ["bg-violet-400", group.notApplicable],
                              ].map(([tone, count]) => count > 0 ? (
                                <span key={tone} className={tone} style={{ width: `${(count / group.count) * 100}%` }} />
                              ) : null)}
                            </span>
                          </span>
                        </button>
                        {canEdit && group.pending > 0 ? (
                          <button
                            type="button"
                            onClick={() => markPendingNotApplicable(group.id)}
                            aria-label={`Mark ${group.pending} pending ${group.label} checks not applicable`}
                            className="shrink-0 rounded px-1.5 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                          >
                            N/A {group.pending}
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                  <button type="button" onClick={() => setGroupFilter(groupFilter === "custom" ? "all" : "custom")} aria-pressed={groupFilter === "custom"} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left ${groupFilter === "custom" ? "bg-sky-50 text-sky-800" : "text-slate-600 hover:bg-slate-50"}`}>
                    <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1 text-xs font-medium">Custom checks</span>
                    <span className="text-[10px] text-slate-400">{selectedAudit.checks.filter((item) => item.custom).length}</span>
                  </button>
                </div>
                <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-500">This checklist is a prompt for manual evaluation, not a substitute for applicable standards, assistive-technology testing, or expert review.</p>
              </div>
            ) : null}
          </aside>

          <main className="min-w-0 space-y-4">
            {!selectedAudit ? (
              <EmptyState title="No audit selected" description="Create an audit to review a page or journey using a structured accessibility checklist." />
            ) : (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StateBadge status={selectedAudit.status} />
                        <span className="text-xs text-slate-400">Updated {formatDate(selectedAudit.updatedAt)}</span>
                      </div>
                      <input key={`${selectedAudit.id}-name`} defaultValue={selectedAudit.name} onBlur={(event) => updateSelectedField("name", event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} disabled={!canEdit} maxLength={180} aria-label="Audit name" className="mt-3 w-full rounded-lg border border-transparent bg-transparent px-1 py-1 text-xl font-bold tracking-tight text-slate-950 outline-none hover:border-slate-200 focus:border-sky-400 disabled:opacity-70 sm:text-2xl" />
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                          ["targetUrl", "Target URL", selectedAudit.targetUrl, "https://..."],
                          ["build", "Build or version", selectedAudit.build, "3.2.0"],
                          ["environment", "Environment", selectedAudit.environment, "Browser · OS · assistive tech"],
                          ["reviewer", "Reviewer", selectedAudit.reviewer, "Name or role"],
                        ].map(([field, label, value, placeholder]) => (
                          <label key={field} className="text-[11px] font-medium text-slate-500">{label}
                            <input key={`${selectedAudit.id}-${field}`} type={field === "targetUrl" ? "url" : "text"} defaultValue={value} onBlur={(event) => updateSelectedField(field, event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} disabled={!canEdit} maxLength={field === "targetUrl" ? 1000 : 180} placeholder={placeholder} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-700 outline-none focus:border-sky-400 disabled:bg-slate-50" />
                          </label>
                        ))}
                      </div>
                      <label className="mt-3 block text-[11px] font-medium text-slate-500">Scope and setup notes
                        <textarea value={selectedAudit.notes} onChange={(event) => updateSelectedField("notes", event.target.value)} disabled={!canEdit} maxLength={MAX_NOTE_LENGTH} rows={2} placeholder="Document pages and user journeys covered, assistive technology, input method, viewport, and known limitations." className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-sky-400 disabled:bg-slate-50" />
                      </label>
                      {selectedAudit.targetUrl && validHttpUrl(selectedAudit.targetUrl) ? <a href={selectedAudit.targetUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:underline">Open target <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a> : null}
                    </div>
                    <div className="flex flex-wrap gap-2 xl:max-w-64 xl:justify-end">
                      <select value={selectedAudit.status} onChange={(event) => updateAuditStatus(event.target.value)} aria-label="Audit lifecycle status" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700" disabled={!canEdit}>
                        {Object.entries(AUDIT_STATES).map(([id, state]) => <option key={id} value={id}>{state.label}</option>)}
                      </select>
                      <button type="button" onClick={copySummary} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" /> Copy summary</button>
                      <button type="button" onClick={copyIssueList} disabled={metrics.issueCount === 0} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"><ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" /> Copy issue list</button>
                      <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-3.5 w-3.5" aria-hidden="true" /> Export CSV</button>
                      <button type="button" onClick={exportJson} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" /> Export JSON</button>
                    </div>
                  </div>
                </section>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <MetricCard label="Review coverage" value={`${metrics.completeness}%`} detail={`${metrics.reviewed} of ${metrics.total} checks reviewed`} tone="sky" />
                  <MetricCard label="Issues found" value={metrics.issueCount} detail={`${metrics.criticalIssues} critical-priority finding(s)`} tone={metrics.issueCount ? "rose" : "green"} />
                  <MetricCard label="Looks good" value={metrics.pass} detail="Manual observations marked pass" tone="green" />
                  <MetricCard label="Unable to assess" value={metrics.blocked} detail="Follow up or record constraints" tone={metrics.blocked ? "amber" : "slate"} />
                  <MetricCard label="Pass rate" value={`${metrics.passRate}%`} detail="Of reviewed, applicable checks; not a compliance score" />
                </div>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-sky-800" aria-hidden="true" />
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Manual review checks</h3>
                        <p className="mt-0.5 text-xs text-slate-500">{visibleChecks.length} shown · {metrics.total} total · {metrics.pending} not reviewed</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => jumpToCheck("pending")}
                        disabled={!canEdit || metrics.pending === 0}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                        Review next pending
                      </button>
                      <button
                        type="button"
                        onClick={() => jumpToCheck("issue")}
                        disabled={metrics.issueCount === 0}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        Review next issue
                      </button>
                      <button
                        type="button"
                        onClick={markPendingNotApplicable}
                        disabled={!canEdit || metrics.pending === 0}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Mark pending N/A
                      </button>
                      <label className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input value={checkQuery} onChange={(event) => setCheckQuery(event.target.value)} placeholder="Search checks" className="w-40 rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2.5 text-xs outline-none focus:border-sky-400" />
                      </label>
                      <select value={checkFilter} onChange={(event) => setCheckFilter(event.target.value)} aria-label="Filter accessibility check results" className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600">
                        {CHECK_FILTERS.map((filter) => <option key={filter.id} value={filter.id}>{filter.label} ({filter.id === "all" ? metrics.total : metrics[filter.id]})</option>)}
                      </select>
                      <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} aria-label="Filter accessibility checks by priority" className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600">
                        {PRIORITY_FILTERS.map((filter) => (
                          <option key={filter.id} value={filter.id}>
                            {filter.label} ({filter.id === "all" ? metrics.total : selectedAudit.checks.filter((item) => item.priority === filter.id).length})
                          </option>
                        ))}
                      </select>
                      {groupFilter !== "all" || checkFilter !== "all" || priorityFilter !== "all" || checkQuery ? (
                        <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-slate-500 hover:bg-slate-100"><FilterX className="h-3.5 w-3.5" aria-hidden="true" /> Reset</button>
                      ) : null}
                      {canEdit ? <button type="button" onClick={() => setShowCustomForm((value) => !value)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Custom check</button> : null}
                    </div>
                  </div>

                  {showCustomForm && canEdit ? (
                    <div className="border-b border-slate-200 bg-violet-50/30 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-800">Add a custom check</h4>
                        <button type="button" onClick={() => setShowCustomForm(false)} aria-label="Close custom check form" className="rounded-lg p-1 text-slate-500 hover:bg-white"><X className="h-4 w-4" aria-hidden="true" /></button>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="text-xs font-medium text-slate-600 sm:col-span-2">Check *
                          <input value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} maxLength={180} placeholder="What should be assessed?" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" />
                        </label>
                        <label className="text-xs font-medium text-slate-600">Group
                          <input value={customGroup} onChange={(event) => setCustomGroup(event.target.value)} maxLength={100} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" />
                        </label>
                        <label className="text-xs font-medium text-slate-600">Priority
                          <select value={customPriority} onChange={(event) => setCustomPriority(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select>
                        </label>
                        <label className="text-xs font-medium text-slate-600 sm:col-span-2 lg:col-span-4">Assessment guidance
                          <textarea value={customGuidance} onChange={(event) => setCustomGuidance(event.target.value)} maxLength={600} rows={2} placeholder="Describe the question or expected accessible behavior." className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" />
                        </label>
                      </div>
                      <div className="mt-3 flex justify-end"><button type="button" onClick={createCustomCheck} className="rounded-lg bg-violet-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-violet-800">Add check</button></div>
                    </div>
                  ) : null}

                  <div className="space-y-3 p-3 sm:p-4">
                    {visibleChecks.length ? visibleChecks.map(({ item, index }) => (
                      <CheckCard
                        key={item.id}
                        item={item}
                        index={index}
                        reports={reports}
                        canEdit={canEdit}
                        onState={(id, status) => updateCheck(id, "status", status)}
                        onField={updateCheck}
                        onOpenReport={onOpenReport}
                        onRemove={removeCustomCheck}
                      />
                    )) : (
                      <EmptyState
                        title={selectedAudit.checks.length ? "No checks match these filters" : "No checks in this audit"}
                        description={selectedAudit.checks.length ? "Change the search or status filter to see other checks." : "Add a custom check to record an assessment in this audit."}
                        icon={Search}
                      />
                    )}
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-rose-600" aria-hidden="true" />
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Related reports</h3>
                        <p className="mt-0.5 text-xs text-slate-500">{selectedAudit.reportIds.length} local report reference(s)</p>
                      </div>
                    </div>
                    {selectedAudit.reportIds.length ? <button type="button" onClick={() => updateAudit(selectedAudit.id, (audit) => ({ ...audit, reportIds: [], activity: appendActivity(audit, "Cleared linked report references") }), "Report references cleared.")} disabled={!canEdit} className="rounded-lg px-2.5 py-2 text-xs text-slate-500 hover:bg-white disabled:opacity-50">Clear links</button> : null}
                  </div>
                  <div className="max-h-80 overflow-y-auto p-3">
                    {reportOptions.length ? (
                      <>
                        <label className="relative mb-3 block">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                          <input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Search reports" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-sky-400" />
                        </label>
                        <div className="grid gap-2 md:grid-cols-2">
                          {reportOptions.map((report) => {
                            const checked = selectedAudit.reportIds.includes(report.id);
                            return (
                              <label key={report.id} className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 ${checked ? "border-sky-300 bg-sky-50/60" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                                <input type="checkbox" checked={checked} onChange={() => toggleReport(report.id)} disabled={!canEdit} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-700" />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-semibold text-slate-800">{report.title}</span>
                                  <span className="mt-1 block text-[11px] text-slate-500">{report.status}</span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    ) : <p className="py-6 text-center text-xs text-slate-500">No loaded reports match this search.</p>}
                    {selectedAudit.reportIds.some((id) => !reports.some((report) => getReportId(report) === id)) ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Some saved report references are not currently loaded; their IDs are retained.</p> : null}
                  </div>
                </section>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)]">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Audit activity</h3>
                        <p className="mt-0.5 text-xs text-slate-500">Latest {selectedAudit.activity.length} local events</p>
                      </div>
                      <ClipboardCheck className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </div>
                    {selectedAudit.activity.length ? (
                      <ol className="mt-4 space-y-3">
                        {[...selectedAudit.activity].reverse().slice(0, 12).map((entry) => (
                          <li key={entry.id} className="flex gap-3">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-400 ring-4 ring-sky-50" />
                            <div>
                              <p className="text-xs font-medium text-slate-700">{entry.message}</p>
                              <p className="mt-0.5 text-[11px] text-slate-400">{formatDate(entry.createdAt)}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    ) : <p className="mt-4 text-xs text-slate-500">Changes will appear here.</p>}
                  </section>
                  <aside className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
                    <div className="flex items-center gap-2 text-sky-900"><ShieldAlert className="h-4 w-4" aria-hidden="true" /><h3 className="text-sm font-semibold">Interpret this checklist carefully</h3></div>
                    <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
                      <li>Checks are manual prompts, not automated tests or a complete standards audit.</li>
                      <li>Pass rate and review coverage describe this checklist only; they do not establish accessibility conformance.</li>
                      <li>Test key paths with relevant assistive technologies and seek specialist review for high-impact concerns.</li>
                      <li>Results and notes stay in this browser. Linked report references do not submit or update a report.</li>
                      <li>Avoid storing personal data, credentials, or confidential content in notes and evidence links.</li>
                    </ul>
                    <div className="mt-4 border-t border-sky-100 pt-3 text-xs text-slate-500">Last saved {formatDate(selectedAudit.updatedAt)}</div>
                  </aside>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </section>
  );
}
