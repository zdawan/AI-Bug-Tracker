"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Lightbulb,
  Link2,
  ListChecks,
  Plus,
  Search,
  ShieldCheck,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";

const STORAGE_PREFIX = "tester-incident-retrospectives-v1";
const MAX_RETROSPECTIVES = 40;
const MAX_TIMELINE_EVENTS = 100;
const MAX_ACTIONS = 100;
const MAX_TEXT = 1600;

const LIFECYCLE = {
  draft: { label: "Draft", tone: "border-slate-200 bg-slate-50 text-slate-600" },
  reviewing: { label: "In review", tone: "border-sky-200 bg-sky-50 text-sky-700" },
  "follow-up": { label: "Follow-up", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  complete: { label: "Complete", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
};

const EVENT_KINDS = [
  "Detection",
  "Mitigation",
  "Resolution",
  "Communication",
  "Decision",
  "Other",
];

const ACTION_STATES = [
  { id: "open", label: "Open", icon: CircleDashed, tone: "border-amber-200 bg-amber-50 text-amber-800" },
  { id: "in-progress", label: "In progress", icon: Clock3, tone: "border-sky-200 bg-sky-50 text-sky-700" },
  { id: "done", label: "Done", icon: CheckCircle2, tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { id: "deferred", label: "Deferred", icon: CalendarClock, tone: "border-slate-200 bg-slate-50 text-slate-600" },
];

const ACTION_FILTERS = [
  { id: "all", label: "All actions" },
  { id: "open", label: "Open" },
  { id: "in-progress", label: "In progress" },
  { id: "done", label: "Done" },
  { id: "deferred", label: "Deferred" },
];

const FACTOR_CATEGORIES = [
  "Detection",
  "Communication",
  "Process",
  "Technology",
  "Dependencies",
  "Documentation",
  "Other",
];

function getText(value, limit = 320) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function timestamp(value) {
  if (typeof value !== "string" || !value) return "";
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
}

function localDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 16) : "";
}

function formatDate(value, options = {}) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(date);
}

function getStorageKey(email) {
  return `${STORAGE_PREFIX}:${encodeURIComponent(getText(email, 240).toLowerCase())}`;
}

function normalizeLifecycle(value) {
  return Object.hasOwn(LIFECYCLE, value) ? value : "draft";
}

function normalizeEvent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const kind = EVENT_KINDS.includes(value.kind) ? value.kind : "Other";
  const title = getText(value.title, 180);
  if (!title) return null;
  return {
    id: getText(value.id, 100) || createId(),
    title,
    details: getText(value.details, MAX_TEXT),
    kind,
    occurredAt: timestamp(value.occurredAt) || new Date().toISOString(),
    createdAt: timestamp(value.createdAt) || new Date().toISOString(),
  };
}

function normalizeFactor(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const title = getText(value.title, 180);
  if (!title) return null;
  return {
    id: getText(value.id, 100) || createId(),
    title,
    category: FACTOR_CATEGORIES.includes(value.category) ? value.category : "Other",
    evidence: getText(value.evidence, 1000),
    learnings: getText(value.learnings, 1000),
  };
}

function normalizeAction(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const title = getText(value.title, 180);
  if (!title) return null;
  const status = ACTION_STATES.some((item) => item.id === value.status) ? value.status : "open";
  return {
    id: getText(value.id, 100) || createId(),
    title,
    details: getText(value.details, 900),
    owner: getText(value.owner, 120),
    dueDate: timestamp(value.dueDate),
    status,
    priority: ["High", "Medium", "Low"].includes(value.priority) ? value.priority : "Medium",
    createdAt: timestamp(value.createdAt) || new Date().toISOString(),
    completedAt: timestamp(value.completedAt),
  };
}

function normalizeActivity(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const label = getText(value.label, 240);
  if (!label) return null;
  return {
    id: getText(value.id, 100) || createId(),
    label,
    createdAt: timestamp(value.createdAt) || new Date().toISOString(),
  };
}

function normalizeRetrospective(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return {
    id: getText(value.id, 100) || createId(),
    title: getText(value.title, 180) || "Untitled incident retrospective",
    summary: getText(value.summary, MAX_TEXT),
    impact: getText(value.impact, MAX_TEXT),
    detection: getText(value.detection, MAX_TEXT),
    resolution: getText(value.resolution, MAX_TEXT),
    whatWentWell: getText(value.whatWentWell, MAX_TEXT),
    whatWasHard: getText(value.whatWasHard, MAX_TEXT),
    status: normalizeLifecycle(value.status),
    startedAt: timestamp(value.startedAt),
    detectedAt: timestamp(value.detectedAt),
    mitigatedAt: timestamp(value.mitigatedAt),
    resolvedAt: timestamp(value.resolvedAt),
    severity: ["Critical", "High", "Medium", "Low"].includes(value.severity)
      ? value.severity
      : "Unspecified",
    affectedUsers: getText(value.affectedUsers, 240),
    affectedSystems: getText(value.affectedSystems, 600),
    lead: getText(value.lead, 120),
    reportIds: Array.isArray(value.reportIds)
      ? [...new Set(value.reportIds.map((id) => getText(id, 120)).filter(Boolean))].slice(0, 250)
      : [],
    events: Array.isArray(value.events)
      ? value.events.slice(0, MAX_TIMELINE_EVENTS).map(normalizeEvent).filter(Boolean)
      : [],
    factors: Array.isArray(value.factors)
      ? value.factors.slice(0, 40).map(normalizeFactor).filter(Boolean)
      : [],
    actions: Array.isArray(value.actions)
      ? value.actions.slice(0, MAX_ACTIONS).map(normalizeAction).filter(Boolean)
      : [],
    activity: Array.isArray(value.activity)
      ? value.activity.slice(-100).map(normalizeActivity).filter(Boolean)
      : [],
    createdAt: timestamp(value.createdAt) || new Date().toISOString(),
    updatedAt: timestamp(value.updatedAt) || new Date().toISOString(),
    completedAt: timestamp(value.completedAt),
  };
}

function normalizeRetrospectives(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_RETROSPECTIVES).map(normalizeRetrospective).filter(Boolean);
}

function appendActivity(retrospective, label) {
  return [
    ...retrospective.activity,
    { id: createId(), label: getText(label, 240), createdAt: new Date().toISOString() },
  ].slice(-100);
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
  return getText(value, 120).replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "incident-retrospective";
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

function createRetrospective(title) {
  const now = new Date().toISOString();
  return normalizeRetrospective({
    id: createId(),
    title: getText(title, 180),
    status: "draft",
    events: [],
    factors: [],
    actions: [],
    activity: [{ id: createId(), label: "Created incident retrospective", createdAt: now }],
    createdAt: now,
    updatedAt: now,
  });
}

function getMetrics(retrospective) {
  const actionCounts = ACTION_STATES.reduce(
    (counts, state) => ({ ...counts, [state.id]: 0 }),
    {},
  );
  retrospective.actions.forEach((action) => {
    actionCounts[action.status] += 1;
  });
  const overdue = retrospective.actions.filter(
    (action) =>
      action.status !== "done" &&
      action.dueDate &&
      Date.parse(action.dueDate) < Date.now(),
  ).length;
  const linkedOpen = retrospective.reportIds.length;
  const checkpoints = [
    retrospective.summary,
    retrospective.impact,
    retrospective.detection,
    retrospective.resolution,
    retrospective.startedAt,
    retrospective.resolvedAt,
    retrospective.events.length,
    retrospective.factors.length,
    retrospective.actions.length,
  ];
  const completeness = Math.round(
    (checkpoints.filter(Boolean).length / checkpoints.length) * 100,
  );
  return {
    openActions: actionCounts.open + actionCounts["in-progress"],
    doneActions: actionCounts.done,
    deferredActions: actionCounts.deferred,
    overdue,
    linkedReports: linkedOpen,
    events: retrospective.events.length,
    factors: retrospective.factors.length,
    completeness,
  };
}

function StateBadge({ status }) {
  const state = LIFECYCLE[status] || LIFECYCLE.draft;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${state.tone}`}>
      {state.label}
    </span>
  );
}

function ActionBadge({ status }) {
  const state = ACTION_STATES.find((item) => item.id === status) || ACTION_STATES[0];
  const Icon = state.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium ${state.tone}`}>
      <Icon className="h-3 w-3" aria-hidden="true" /> {state.label}
    </span>
  );
}

function MetricCard({ label, value, detail, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    sky: "border-sky-200 bg-sky-50/60 text-sky-900",
    amber: "border-amber-200 bg-amber-50/60 text-amber-900",
    green: "border-emerald-200 bg-emerald-50/60 text-emerald-900",
    rose: "border-rose-200 bg-rose-50/60 text-rose-900",
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs opacity-70">{detail}</p>
    </div>
  );
}

function EmptyState({ title, description, icon: Icon = FileText }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-9 text-center">
      <Icon className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>
    </div>
  );
}

function RetrospectiveRow({ item, selected, onSelect, onDelete }) {
  const metrics = getMetrics(item);
  return (
    <article className={`rounded-2xl border p-3 transition ${selected ? "border-sky-300 bg-sky-50/70 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}>
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-sm font-semibold text-slate-900">{item.title}</span>
          <StateBadge status={item.status} />
        </div>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
          {item.summary || "Add a short incident summary."}
        </p>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>{metrics.openActions} open actions</span>
          <span>{formatDate(item.updatedAt, { year: undefined, hour: undefined, minute: undefined })}</span>
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

function TimelineEventCard({ event, index, canEdit, onRemove }) {
  const kindColors = {
    Detection: "bg-sky-100 text-sky-800",
    Mitigation: "bg-amber-100 text-amber-800",
    Resolution: "bg-emerald-100 text-emerald-800",
    Communication: "bg-violet-100 text-violet-800",
    Decision: "bg-orange-100 text-orange-800",
    Other: "bg-slate-100 text-slate-700",
  };
  return (
    <article className="relative pl-8">
      <span className="absolute left-2 top-1.5 h-3 w-3 rounded-full border-2 border-sky-500 bg-white ring-4 ring-sky-50" />
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${kindColors[event.kind] || kindColors.Other}`}>
                {event.kind}
              </span>
              <span className="text-[11px] text-slate-400">Event {index + 1}</span>
            </div>
            <h4 className="mt-1.5 text-sm font-semibold text-slate-800">{event.title}</h4>
            {event.details ? <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-600">{event.details}</p> : null}
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> {formatDate(event.occurredAt)}
            </p>
          </div>
          {canEdit ? (
            <button type="button" onClick={() => onRemove(event.id)} aria-label={`Remove timeline event ${event.title}`} className="self-end rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 sm:self-start">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function FactorCard({ factor, canEdit, onUpdate, onRemove }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">{factor.category}</span>
          <h4 className="mt-1.5 text-sm font-semibold text-slate-800">{factor.title}</h4>
        </div>
        {canEdit ? (
          <button type="button" onClick={() => onRemove(factor.id)} aria-label={`Remove contributing factor ${factor.title}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {factor.evidence ? (
        <div className="mt-3 rounded-lg bg-slate-50 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Evidence / context</p>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{factor.evidence}</p>
        </div>
      ) : null}
      {canEdit ? (
        <label className="mt-3 block text-[11px] font-medium text-slate-500">
          Learning or improvement opportunity
          <textarea
            value={factor.learnings}
            onChange={(event) => onUpdate(factor.id, event.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="What could make this less likely or less impactful?"
            className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-normal text-slate-700 outline-none focus:border-sky-400"
          />
        </label>
      ) : factor.learnings ? (
        <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-600">{factor.learnings}</p>
      ) : null}
    </article>
  );
}

function ActionCard({ action, canEdit, onUpdate, onRemove }) {
  const state = ACTION_STATES.find((item) => item.id === action.status) || ACTION_STATES[0];
  const StateIcon = state.icon;
  const isOverdue = action.status !== "done" && action.dueDate && Date.parse(action.dueDate) < Date.now();
  return (
    <article className={`rounded-xl border p-3 ${isOverdue ? "border-rose-200 bg-rose-50/40" : "border-slate-200 bg-white"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ActionBadge status={action.status} />
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${action.priority === "High" ? "bg-rose-100 text-rose-700" : action.priority === "Medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
              {action.priority} priority
            </span>
            {isOverdue ? <span className="text-[10px] font-semibold text-rose-700">Overdue</span> : null}
          </div>
          <h4 className="mt-2 text-sm font-semibold text-slate-800">{action.title}</h4>
          {action.details ? <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{action.details}</p> : null}
          <p className="mt-2 text-[11px] text-slate-500">
            {action.owner ? `Owner: ${action.owner}` : "No owner assigned"}
            {action.dueDate ? ` · Due ${formatDate(action.dueDate, { year: undefined, hour: undefined, minute: undefined })}` : ""}
          </p>
        </div>
        {canEdit ? (
          <div className="flex shrink-0 items-center gap-1">
            <select
              value={action.status}
              onChange={(event) => onUpdate(action.id, "status", event.target.value)}
              aria-label={`Status for action ${action.title}`}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600"
            >
              {ACTION_STATES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <button type="button" onClick={() => onRemove(action.id)} aria-label={`Remove action ${action.title}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <StateIcon className="h-4 w-4 text-slate-400" aria-hidden="true" />
        )}
      </div>
      {canEdit ? (
        <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-3">
          <label className="text-[11px] font-medium text-slate-500">Owner
            <input value={action.owner} onChange={(event) => onUpdate(action.id, "owner", event.target.value)} maxLength={120} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-normal text-slate-700" placeholder="Name or role" />
          </label>
          <label className="text-[11px] font-medium text-slate-500">Due date
            <input type="date" value={action.dueDate ? action.dueDate.slice(0, 10) : ""} onChange={(event) => onUpdate(action.id, "dueDate", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-normal text-slate-700" />
          </label>
          <label className="text-[11px] font-medium text-slate-500">Priority
            <select value={action.priority} onChange={(event) => onUpdate(action.id, "priority", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-normal text-slate-700">
              <option>High</option><option>Medium</option><option>Low</option>
            </select>
          </label>
        </div>
      ) : null}
    </article>
  );
}

export default function IncidentRetrospectiveWorkspace({
  reports = [],
  email,
  onOpenReport,
}) {
  const [retrospectives, setRetrospectives] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loadedEmail, setLoadedEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventKind, setEventKind] = useState("Detection");
  const [eventAt, setEventAt] = useState("");
  const [eventDetails, setEventDetails] = useState("");
  const [showFactorForm, setShowFactorForm] = useState(false);
  const [factorTitle, setFactorTitle] = useState("");
  const [factorCategory, setFactorCategory] = useState("Process");
  const [factorEvidence, setFactorEvidence] = useState("");
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionTitle, setActionTitle] = useState("");
  const [actionDetails, setActionDetails] = useState("");
  const [actionOwner, setActionOwner] = useState("");
  const [actionDueDate, setActionDueDate] = useState("");
  const [actionPriority, setActionPriority] = useState("Medium");

  const requestedEmail = getText(email, 240).toLowerCase();
  const selected = retrospectives.find((item) => item.id === selectedId) || null;
  const metrics = selected ? getMetrics(selected) : null;

  const visibleRetrospectives = useMemo(() => {
    const query = getText(search, 120).toLowerCase();
    return retrospectives
      .filter((item) => !query || [
        item.title,
        item.summary,
        item.lead,
        item.status,
        item.affectedSystems,
      ].some((value) => value.toLowerCase().includes(query)))
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  }, [retrospectives, search]);

  const reportOptions = useMemo(() => {
    const query = getText(reportSearch, 120).toLowerCase();
    return reports
      .filter((report) => getReportId(report))
      .map((report) => ({
        id: getReportId(report),
        title: getReportTitle(report),
        severity: getText(report?.severity, 80) || "Unspecified",
        status: report?.status === "Closed" ? "Closed" : "Open",
      }))
      .filter((item) => !query || [item.title, item.severity, item.status].some((value) => value.toLowerCase().includes(query)))
      .sort((left, right) => left.title.localeCompare(right.title))
      .slice(0, 250);
  }, [reports, reportSearch]);

  const selectedReports = useMemo(() => {
    if (!selected) return [];
    const ids = new Set(selected.reportIds);
    return reports.filter((report) => ids.has(getReportId(report)));
  }, [reports, selected]);

  const visibleActions = useMemo(() => {
    if (!selected) return [];
    return selected.actions
      .filter((action) => actionFilter === "all" || action.status === actionFilter)
      .sort((left, right) => {
        const rank = { High: 0, Medium: 1, Low: 2 };
        return rank[left.priority] - rank[right.priority] ||
          (left.dueDate ? Date.parse(left.dueDate) : Infinity) -
          (right.dueDate ? Date.parse(right.dueDate) : Infinity);
      });
  }, [selected, actionFilter]);

  useEffect(() => {
    const normalizedEmail = getText(email, 240).toLowerCase();
    setLoading(true);
    setLoadError("");
    setNotice("");
    setSelectedId("");
    if (!normalizedEmail) {
      setRetrospectives([]);
      setLoadedEmail("");
      setLoadError("A signed-in tester account is required to load local retrospectives.");
      setLoading(false);
      return;
    }

    try {
      const saved = window.localStorage.getItem(getStorageKey(normalizedEmail));
      const parsed = saved ? JSON.parse(saved) : [];
      const next = normalizeRetrospectives(parsed);
      setRetrospectives(next);
      setSelectedId(next[0]?.id || "");
      setLoadedEmail(normalizedEmail);
    } catch (error) {
      setRetrospectives([]);
      setLoadedEmail(normalizedEmail);
      setLoadError(
        error instanceof SyntaxError
          ? "Saved retrospective data is not valid JSON. The existing browser data was left untouched."
          : `Retrospective data could not be loaded: ${error.message}`,
      );
    } finally {
      setLoading(false);
    }
  }, [email]);

  const persistRetrospectives = (next) => {
    if (loadError) {
      setNotice("Cannot overwrite retrospective storage after a load error. Resolve the storage issue first.");
      return false;
    }
    if (!loadedEmail || loadedEmail !== requestedEmail) {
      setNotice("Wait for account-specific retrospective data to load before editing.");
      return false;
    }
    if (next.length > MAX_RETROSPECTIVES) {
      setNotice(`Keep at most ${MAX_RETROSPECTIVES} retrospectives in this browser.`);
      return false;
    }
    try {
      window.localStorage.setItem(
        getStorageKey(loadedEmail),
        JSON.stringify(next.map(normalizeRetrospective)),
      );
      setRetrospectives(next);
      setNotice("Saved locally in this browser.");
      return true;
    } catch (error) {
      setNotice(`Could not save retrospective changes: ${error.message}`);
      return false;
    }
  };

  const updateSelected = (updater, successMessage = "") => {
    if (!selected) return false;
    const nextItem = normalizeRetrospective({
      ...updater(selected),
      updatedAt: new Date().toISOString(),
    });
    const saved = persistRetrospectives(retrospectives.map((item) =>
      item.id === selected.id ? nextItem : item,
    ));
    if (saved && successMessage) setNotice(successMessage);
    return saved;
  };

  const createRetrospectiveEntry = () => {
    const title = getText(newTitle, 180);
    if (!title) {
      setNotice("Enter a title for the incident retrospective.");
      return;
    }
    if (retrospectives.length >= MAX_RETROSPECTIVES) {
      setNotice(`You have reached the ${MAX_RETROSPECTIVES}-retrospective browser limit.`);
      return;
    }
    const item = createRetrospective(title);
    if (persistRetrospectives([item, ...retrospectives])) {
      setSelectedId(item.id);
      setNewTitle("");
      setShowCreateForm(false);
    }
  };

  const deleteRetrospective = (item) => {
    if (!window.confirm(`Delete "${item.title}" and all its local notes and action items? This cannot be undone.`)) return;
    const next = retrospectives.filter((candidate) => candidate.id !== item.id);
    if (persistRetrospectives(next)) {
      if (selectedId === item.id) setSelectedId(next[0]?.id || "");
      setNotice("Retrospective and its local notes were deleted.");
    }
  };

  const updateField = (field, value) => {
    if (!selected) return;
    const limits = {
      title: 180,
      summary: MAX_TEXT,
      impact: MAX_TEXT,
      detection: MAX_TEXT,
      resolution: MAX_TEXT,
      whatWentWell: MAX_TEXT,
      whatWasHard: MAX_TEXT,
      lead: 120,
      affectedUsers: 240,
      affectedSystems: 600,
    };
    const nextValue = ["startedAt", "detectedAt", "mitigatedAt", "resolvedAt"].includes(field)
      ? timestamp(value)
      : getText(value, limits[field] || 500);
    if (field === "title" && !nextValue) {
      setNotice("Retrospective title cannot be empty.");
      return;
    }
    updateSelected((item) => ({
      ...item,
      [field]: nextValue,
    }));
  };

  const updateLifecycle = (status) => {
    if (!Object.hasOwn(LIFECYCLE, status)) return;
    updateSelected((item) => ({
      ...item,
      status,
      completedAt: status === "complete" ? new Date().toISOString() : "",
      activity: appendActivity(item, `Retrospective marked ${LIFECYCLE[status].label.toLowerCase()}`),
    }), `Retrospective marked ${LIFECYCLE[status].label.toLowerCase()}.`);
  };

  const addEvent = () => {
    if (!selected) return;
    const title = getText(eventTitle, 180);
    if (!title) {
      setNotice("Enter a short timeline event title.");
      return;
    }
    if (selected.events.length >= MAX_TIMELINE_EVENTS) {
      setNotice(`A retrospective can contain at most ${MAX_TIMELINE_EVENTS} timeline events.`);
      return;
    }
    const event = normalizeEvent({
      id: createId(),
      title,
      details: eventDetails,
      kind: eventKind,
      occurredAt: timestamp(eventAt) || new Date().toISOString(),
    });
    const saved = updateSelected((item) => ({
      ...item,
      events: [...item.events, event].sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt)),
      activity: appendActivity(item, `Added timeline event: ${event.title}`),
    }), "Timeline event added.");
    if (saved) {
      setEventTitle("");
      setEventDetails("");
      setEventKind("Detection");
      setEventAt("");
      setShowEventForm(false);
    }
  };

  const removeEvent = (eventId) => {
    if (!selected) return;
    const event = selected.events.find((item) => item.id === eventId);
    if (!event || !window.confirm(`Remove timeline event "${event.title}"?`)) return;
    updateSelected((item) => ({
      ...item,
      events: item.events.filter((candidate) => candidate.id !== eventId),
      activity: appendActivity(item, `Removed timeline event: ${event.title}`),
    }), "Timeline event removed.");
  };

  const addFactor = () => {
    if (!selected) return;
    const title = getText(factorTitle, 180);
    if (!title) {
      setNotice("Enter a contributing factor or condition.");
      return;
    }
    if (selected.factors.length >= 40) {
      setNotice("A retrospective can contain at most 40 contributing factors.");
      return;
    }
    const factor = normalizeFactor({
      id: createId(),
      title,
      category: factorCategory,
      evidence: factorEvidence,
    });
    const saved = updateSelected((item) => ({
      ...item,
      factors: [...item.factors, factor],
      activity: appendActivity(item, `Added contributing factor: ${factor.title}`),
    }), "Contributing factor added.");
    if (saved) {
      setFactorTitle("");
      setFactorCategory("Process");
      setFactorEvidence("");
      setShowFactorForm(false);
    }
  };

  const updateFactorLearning = (factorId, learnings) => {
    updateSelected((item) => ({
      ...item,
      factors: item.factors.map((factor) =>
        factor.id === factorId ? { ...factor, learnings: getText(learnings, 1000) } : factor,
      ),
    }));
  };

  const removeFactor = (factorId) => {
    if (!selected) return;
    const factor = selected.factors.find((item) => item.id === factorId);
    if (!factor || !window.confirm(`Remove contributing factor "${factor.title}"?`)) return;
    updateSelected((item) => ({
      ...item,
      factors: item.factors.filter((candidate) => candidate.id !== factorId),
      activity: appendActivity(item, `Removed contributing factor: ${factor.title}`),
    }), "Contributing factor removed.");
  };

  const addAction = () => {
    if (!selected) return;
    const title = getText(actionTitle, 180);
    if (!title) {
      setNotice("Enter a follow-up action.");
      return;
    }
    if (selected.actions.length >= MAX_ACTIONS) {
      setNotice(`A retrospective can contain at most ${MAX_ACTIONS} action items.`);
      return;
    }
    const action = normalizeAction({
      id: createId(),
      title,
      details: actionDetails,
      owner: actionOwner,
      dueDate: actionDueDate ? `${actionDueDate}T12:00:00.000Z` : "",
      priority: actionPriority,
      status: "open",
    });
    const saved = updateSelected((item) => ({
      ...item,
      actions: [...item.actions, action],
      activity: appendActivity(item, `Added follow-up action: ${action.title}`),
    }), "Follow-up action added.");
    if (saved) {
      setActionTitle("");
      setActionDetails("");
      setActionOwner("");
      setActionDueDate("");
      setActionPriority("Medium");
      setShowActionForm(false);
    }
  };

  const updateAction = (actionId, field, value) => {
    if (!selected) return;
    const nextValue = field === "dueDate"
      ? (value ? `${value}T12:00:00.000Z` : "")
      : field === "status"
        ? (ACTION_STATES.some((item) => item.id === value) ? value : "open")
        : field === "priority"
          ? (["High", "Medium", "Low"].includes(value) ? value : "Medium")
          : getText(value, field === "details" ? 900 : 120);
    updateSelected((item) => ({
      ...item,
      actions: item.actions.map((action) => action.id === actionId
        ? {
          ...action,
          [field]: nextValue,
          completedAt: field === "status" && value === "done"
            ? new Date().toISOString()
            : field === "status"
              ? ""
              : action.completedAt,
        }
        : action),
      activity: field === "status"
        ? appendActivity(item, `Follow-up action ${ACTION_STATES.find((state) => state.id === value)?.label?.toLowerCase() || "updated"}`)
        : item.activity,
    }), field === "status" ? "Follow-up action status updated." : "");
  };

  const removeAction = (actionId) => {
    if (!selected) return;
    const action = selected.actions.find((item) => item.id === actionId);
    if (!action || !window.confirm(`Remove action "${action.title}"?`)) return;
    updateSelected((item) => ({
      ...item,
      actions: item.actions.filter((candidate) => candidate.id !== actionId),
      activity: appendActivity(item, `Removed follow-up action: ${action.title}`),
    }), "Follow-up action removed.");
  };

  const toggleReport = (id) => {
    if (!selected) return;
    const reportIds = selected.reportIds.includes(id)
      ? selected.reportIds.filter((item) => item !== id)
      : [...selected.reportIds, id].slice(0, 250);
    updateSelected((item) => ({
      ...item,
      reportIds,
      activity: appendActivity(item, `${selected.reportIds.includes(id) ? "Unlinked" : "Linked"} a report`),
    }), "Linked report references updated.");
  };

  const exportJson = () => {
    if (!selected) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      scope: "Browser-local incident retrospective. This export does not modify server-side reports.",
      retrospective: selected,
    };
    downloadFile(`${safeFilename(selected.title)}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
    setNotice("Retrospective exported as JSON.");
  };

  const exportActionsCsv = () => {
    if (!selected) return;
    const rows = [
      ["Retrospective", "Action", "Details", "Owner", "Priority", "Status", "Due date", "Created", "Completed"],
      ...selected.actions.map((action) => [
        selected.title,
        action.title,
        action.details,
        action.owner,
        action.priority,
        ACTION_STATES.find((item) => item.id === action.status)?.label || action.status,
        action.dueDate,
        action.createdAt,
        action.completedAt,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
    downloadFile(`${safeFilename(selected.title)}-actions.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
    setNotice("Follow-up actions exported as CSV.");
  };

  const copySummary = async () => {
    if (!selected || !metrics) return;
    const summary = [
      `Incident retrospective: ${selected.title}`,
      `Status: ${LIFECYCLE[selected.status].label}`,
      `Severity: ${selected.severity}`,
      `Incident lead: ${selected.lead || "Unassigned"}`,
      `Affected users: ${selected.affectedUsers || "Not recorded"}`,
      `Affected systems: ${selected.affectedSystems || "Not recorded"}`,
      `Started: ${formatDate(selected.startedAt)}`,
      `Detected: ${formatDate(selected.detectedAt)}`,
      `Mitigated: ${formatDate(selected.mitigatedAt)}`,
      `Resolved: ${formatDate(selected.resolvedAt)}`,
      `Linked reports: ${selected.reportIds.length}`,
      `Follow-up actions: ${metrics.doneActions} done, ${metrics.openActions} open, ${metrics.overdue} overdue`,
      "",
      "Summary:",
      selected.summary || "Not recorded",
      "",
      "Impact:",
      selected.impact || "Not recorded",
      "",
      "Follow-up:",
      ...selected.actions.map((action) => `- [${action.status}] ${action.title}${action.owner ? ` (owner: ${action.owner})` : ""}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(summary);
      setNotice("Retrospective summary copied to the clipboard.");
    } catch (error) {
      setNotice(`Could not copy the summary: ${error.message}`);
    }
  };

  const completeRetrospective = () => {
    if (!selected) return;
    const openActions = selected.actions.filter((action) => action.status !== "done");
    if (openActions.length && !window.confirm(`${openActions.length} follow-up action(s) remain open or deferred. Mark this retrospective complete anyway?`)) return;
    updateLifecycle("complete");
  };

  const selectedReportList = useMemo(() => {
    if (!selected) return [];
    const selectedIds = new Set(selected.reportIds);
    return reports.filter((report) => selectedIds.has(getReportId(report)));
  }, [reports, selected]);

  if (loading || (requestedEmail && loadedEmail !== requestedEmail)) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-busy="true">
        <div className="h-5 w-56 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-20 animate-pulse rounded-2xl bg-slate-50" />
        <p className="mt-3 text-xs text-slate-500">Loading browser-local incident retrospectives…</p>
      </section>
    );
  }

  const canEdit = selected?.status !== "complete";
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
      <header className="border-b border-slate-200 bg-gradient-to-br from-amber-50 via-white to-sky-50/70 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-amber-800">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em]">Incident retrospective</p>
            </div>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">Turn incident learning into follow-through</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Capture impact and response timelines, discuss contributing conditions, and track improvement actions. Notes are browser-local and never update linked reports.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateForm((value) => !value)}
            disabled={retrospectives.length >= MAX_RETROSPECTIVES || Boolean(loadError)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> New retrospective
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" aria-hidden="true" /> {retrospectives.length}/{MAX_RETROSPECTIVES} local records</span>
          <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" aria-hidden="true" /> Private to this browser account</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Learning-focused, not blame-focused</span>
        </div>
      </header>

      <div className="space-y-4 p-4 sm:p-5">
        {loadError ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <p className="font-semibold">Retrospective storage could not be loaded</p>
            <p className="mt-1">{loadError}</p>
          </div>
        ) : null}
        {notice ? (
          <div role="status" aria-live="polite" className="flex items-start justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50 px-3.5 py-2.5 text-sm text-sky-800">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} aria-label="Dismiss message" className="rounded p-0.5 hover:bg-sky-100">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {showCreateForm && !loadError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Start a retrospective</h3>
                <p className="mt-1 text-xs text-slate-500">Create the record, then add a timeline and follow-up actions.</p>
              </div>
              <button type="button" onClick={() => setShowCreateForm(false)} aria-label="Close create form" className="rounded-lg p-1.5 text-slate-500 hover:bg-white">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-600">
                Incident title *
                <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} maxLength={180} placeholder="e.g. Checkout latency incident" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
              </label>
              <p className="self-end pb-2 text-xs leading-5 text-slate-500">Use a neutral title focused on the incident, system, or user impact.</p>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={createRetrospectiveEntry} className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800">
                <Plus className="h-4 w-4" aria-hidden="true" /> Create retrospective
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find retrospectives…" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
              </label>
              <div className="mt-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Retrospectives</h3>
                <span className="text-xs text-slate-400">{visibleRetrospectives.length} shown</span>
              </div>
              <div className="mt-2 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
                {visibleRetrospectives.length ? visibleRetrospectives.map((item) => (
                  <RetrospectiveRow
                    key={item.id}
                    item={item}
                    selected={item.id === selectedId}
                    onSelect={() => setSelectedId(item.id)}
                    onDelete={() => deleteRetrospective(item)}
                  />
                )) : (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-500">
                    {retrospectives.length ? "No records match your search." : "Create a retrospective to start capturing learning."}
                  </p>
                )}
              </div>
            </div>
            {selected ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">A blameless review</h3>
                <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
                  <li>Focus on system conditions, information available, and trade-offs at the time.</li>
                  <li>Separate observed facts from hypotheses; avoid assigning intent or blame.</li>
                  <li>Choose small, owned follow-ups that reduce recurrence risk or improve detection.</li>
                  <li>Record unknowns as unknowns. A retrospective is useful without a single root cause.</li>
                </ul>
                <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  This is a private working document. Export and share intentionally; don't include secrets or sensitive user data.
                </div>
              </div>
            ) : null}
          </aside>

          <main className="min-w-0 space-y-4">
            {!selected ? (
              <EmptyState
                title="No retrospective selected"
                description="Create a retrospective to record incident context, a sequence of events, contributing conditions, and accountable improvement work."
                icon={ShieldCheck}
              />
            ) : (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StateBadge status={selected.status} />
                        <span className="text-xs text-slate-400">Updated {formatDate(selected.updatedAt)}</span>
                      </div>
                      <input
                        key={`${selected.id}-title`}
                        defaultValue={selected.title}
                        onBlur={(event) => updateField("title", event.target.value)}
                        onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                        disabled={!canEdit}
                        maxLength={180}
                        aria-label="Retrospective title"
                        className="mt-3 w-full rounded-lg border border-transparent bg-transparent px-1 py-1 text-xl font-bold tracking-tight text-slate-950 outline-none hover:border-slate-200 focus:border-amber-400 disabled:opacity-70 sm:text-2xl"
                      />
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <label className="text-[11px] font-medium text-slate-500">Severity
                          <select value={selected.severity} onChange={(event) => updateField("severity", event.target.value)} disabled={!canEdit} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-700 disabled:bg-slate-50">
                            <option>Unspecified</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
                          </select>
                        </label>
                        <label className="text-[11px] font-medium text-slate-500">Incident lead
                          <input value={selected.lead} onChange={(event) => updateField("lead", event.target.value)} disabled={!canEdit} maxLength={120} placeholder="Name or role" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-700 disabled:bg-slate-50" />
                        </label>
                        <label className="text-[11px] font-medium text-slate-500">Affected users / scope
                          <input value={selected.affectedUsers} onChange={(event) => updateField("affectedUsers", event.target.value)} disabled={!canEdit} maxLength={240} placeholder="e.g. a subset of checkout users" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-700 disabled:bg-slate-50" />
                        </label>
                        <label className="text-[11px] font-medium text-slate-500">Affected systems
                          <input value={selected.affectedSystems} onChange={(event) => updateField("affectedSystems", event.target.value)} disabled={!canEdit} maxLength={600} placeholder="Services or components" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-700 disabled:bg-slate-50" />
                        </label>
                      </div>
                      <label className="mt-3 block text-[11px] font-medium text-slate-500">Incident summary
                        <textarea value={selected.summary} onChange={(event) => updateField("summary", event.target.value)} disabled={!canEdit} maxLength={MAX_TEXT} rows={3} placeholder="Describe what happened and the user-visible impact in neutral, factual language." className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal leading-5 text-slate-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-50" />
                      </label>
                      <label className="mt-3 block text-[11px] font-medium text-slate-500">Impact details
                        <textarea value={selected.impact} onChange={(event) => updateField("impact", event.target.value)} disabled={!canEdit} maxLength={MAX_TEXT} rows={3} placeholder="What was affected, for how long, and how was the impact assessed? Record estimates as estimates." className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal leading-5 text-slate-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-50" />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2 xl:max-w-64 xl:justify-end">
                      <select value={selected.status} onChange={(event) => updateLifecycle(event.target.value)} aria-label="Retrospective status" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                        {Object.entries(LIFECYCLE).map(([id, state]) => <option key={id} value={id}>{state.label}</option>)}
                      </select>
                      {selected.status !== "complete" ? (
                        <button type="button" onClick={completeRetrospective} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800">
                          <Check className="h-3.5 w-3.5" aria-hidden="true" /> Complete review
                        </button>
                      ) : null}
                      <button type="button" onClick={copySummary} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Copy summary
                      </button>
                      <button type="button" onClick={exportJson} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" /> Export JSON
                      </button>
                      <button type="button" onClick={exportActionsCsv} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <Download className="h-3.5 w-3.5" aria-hidden="true" /> Actions CSV
                      </button>
                    </div>
                  </div>
                </section>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <MetricCard label="Review completeness" value={`${metrics.completeness}%`} detail="Context checklist only; not a severity score" tone="sky" />
                  <MetricCard label="Timeline" value={metrics.events} detail="Recorded event checkpoints" />
                  <MetricCard label="Contributing factors" value={metrics.factors} detail="Conditions and evidence captured" tone="amber" />
                  <MetricCard label="Follow-up actions" value={metrics.openActions} detail={`${metrics.doneActions} done · ${metrics.overdue} overdue`} tone={metrics.overdue ? "rose" : "green"} />
                  <MetricCard label="Linked reports" value={selected.reportIds.length} detail="References only; statuses stay unchanged" />
                </div>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-sky-700" aria-hidden="true" />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Response milestones</h3>
                      <p className="mt-0.5 text-xs text-slate-500">Record approximate times; capture uncertainty in the incident notes.</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["startedAt", "Incident began"],
                      ["detectedAt", "Detected"],
                      ["mitigatedAt", "Mitigated"],
                      ["resolvedAt", "Resolved"],
                    ].map(([field, label]) => (
                      <label key={field} className="text-xs font-medium text-slate-600">
                        {label}
                        <input
                          type="datetime-local"
                          value={localDateTime(selected[field])}
                          onChange={(event) => updateField(field, event.target.value)}
                          disabled={!canEdit}
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 disabled:bg-slate-50"
                        />
                        {selected[field] ? <span className="mt-1 block text-[10px] font-normal text-slate-400">{formatDate(selected[field])}</span> : null}
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-medium text-slate-600">How was the incident detected?
                      <textarea value={selected.detection} onChange={(event) => updateField("detection", event.target.value)} disabled={!canEdit} maxLength={MAX_TEXT} rows={3} placeholder="Signals, reports, monitoring, or customer feedback that surfaced the issue." className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-sky-400 disabled:bg-slate-50" />
                    </label>
                    <label className="text-xs font-medium text-slate-600">What mitigated or resolved it?
                      <textarea value={selected.resolution} onChange={(event) => updateField("resolution", event.target.value)} disabled={!canEdit} maxLength={MAX_TEXT} rows={3} placeholder="Summarize mitigations, fixes, validation, and any remaining uncertainty." className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-sky-400 disabled:bg-slate-50" />
                    </label>
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-sky-700" aria-hidden="true" />
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Incident timeline</h3>
                        <p className="mt-0.5 text-xs text-slate-500">{selected.events.length} event(s), ordered by time</p>
                      </div>
                    </div>
                    {canEdit ? (
                      <button type="button" onClick={() => setShowEventForm((value) => !value)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add event
                      </button>
                    ) : null}
                  </div>
                  {showEventForm && canEdit ? (
                    <div className="border-b border-slate-200 bg-sky-50/30 p-4">
                      <h4 className="text-sm font-semibold text-slate-800">Add timeline event</h4>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="text-xs font-medium text-slate-600 sm:col-span-2">Event *
                          <input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} maxLength={180} placeholder="e.g. Error rate alert fired" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" />
                        </label>
                        <label className="text-xs font-medium text-slate-600">Kind
                          <select value={eventKind} onChange={(event) => setEventKind(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal">
                            {EVENT_KINDS.map((kind) => <option key={kind}>{kind}</option>)}
                          </select>
                        </label>
                        <label className="text-xs font-medium text-slate-600">Occurred at
                          <input type="datetime-local" value={eventAt} onChange={(event) => setEventAt(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal" />
                        </label>
                        <label className="text-xs font-medium text-slate-600 sm:col-span-4">Details
                          <textarea value={eventDetails} onChange={(event) => setEventDetails(event.target.value)} maxLength={MAX_TEXT} rows={2} placeholder="What happened? Include the source or confidence where useful." className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" />
                        </label>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button type="button" onClick={addEvent} className="rounded-lg bg-sky-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-800">Save timeline event</button>
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-3 p-4">
                    {selected.events.length ? (
                      <div className="relative space-y-3 before:absolute before:bottom-4 before:left-[13px] before:top-4 before:w-px before:bg-sky-100">
                        {selected.events.map((event, index) => (
                          <TimelineEventCard key={event.id} event={event} index={index} canEdit={canEdit} onRemove={removeEvent} />
                        ))}
                      </div>
                    ) : (
                      <EmptyState title="No timeline events yet" description="Add detection, mitigation, communication, and resolution events to reconstruct the response sequence." icon={Clock3} />
                    )}
                  </div>
                </section>

                <div className="grid gap-4 xl:grid-cols-2">
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-700" aria-hidden="true" />
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Contributing conditions</h3>
                          <p className="mt-0.5 text-xs text-slate-500">{selected.factors.length} factor(s) · focus on conditions, not blame</p>
                        </div>
                      </div>
                      {canEdit ? <button type="button" onClick={() => setShowFactorForm((value) => !value)} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-2 text-xs font-semibold text-white hover:bg-slate-700"><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add factor</button> : null}
                    </div>
                    {showFactorForm && canEdit ? (
                      <div className="space-y-3 border-b border-slate-200 bg-amber-50/30 p-4">
                        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                          <label className="text-xs font-medium text-slate-600">Condition or factor *
                            <input value={factorTitle} onChange={(event) => setFactorTitle(event.target.value)} maxLength={180} placeholder="e.g. Alert lacked a clear owner" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" />
                          </label>
                          <label className="text-xs font-medium text-slate-600">Category
                            <select value={factorCategory} onChange={(event) => setFactorCategory(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal">
                              {FACTOR_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                            </select>
                          </label>
                        </div>
                        <label className="block text-xs font-medium text-slate-600">Evidence or context
                          <textarea value={factorEvidence} onChange={(event) => setFactorEvidence(event.target.value)} maxLength={1000} rows={2} placeholder="What facts support this observation?" className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" />
                        </label>
                        <div className="flex justify-end"><button type="button" onClick={addFactor} className="rounded-lg bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-800">Save factor</button></div>
                      </div>
                    ) : null}
                    <div className="space-y-2 p-3">
                      {selected.factors.length ? selected.factors.map((factor) => (
                        <FactorCard key={factor.id} factor={factor} canEdit={canEdit} onUpdate={updateFactorLearning} onRemove={removeFactor} />
                      )) : (
                        <EmptyState title="No conditions captured" description="Record contributing conditions, evidence, and possible system improvements without assigning blame." icon={Lightbulb} />
                      )}
                    </div>
                    <div className="grid gap-3 border-t border-slate-100 bg-slate-50/50 p-4 sm:grid-cols-2">
                      <label className="text-xs font-medium text-slate-600">What went well?
                        <textarea value={selected.whatWentWell} onChange={(event) => updateField("whatWentWell", event.target.value)} disabled={!canEdit} maxLength={MAX_TEXT} rows={3} placeholder="Helpful signals, collaboration, tools, or decisions." className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal disabled:bg-slate-50" />
                      </label>
                      <label className="text-xs font-medium text-slate-600">What was difficult?
                        <textarea value={selected.whatWasHard} onChange={(event) => updateField("whatWasHard", event.target.value)} disabled={!canEdit} maxLength={MAX_TEXT} rows={3} placeholder="Friction, uncertainty, missing context, or coordination gaps." className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal disabled:bg-slate-50" />
                      </label>
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Improvement actions</h3>
                          <p className="mt-0.5 text-xs text-slate-500">{metrics.doneActions} done · {metrics.openActions} open · {metrics.deferredActions} deferred</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} aria-label="Filter follow-up actions" className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-600">
                          {ACTION_FILTERS.map((filter) => <option key={filter.id} value={filter.id}>{filter.label}</option>)}
                        </select>
                        {canEdit ? <button type="button" onClick={() => setShowActionForm((value) => !value)} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-2 text-xs font-semibold text-white hover:bg-slate-700"><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add action</button> : null}
                      </div>
                    </div>
                    {showActionForm && canEdit ? (
                      <div className="space-y-3 border-b border-slate-200 bg-emerald-50/30 p-4">
                        <label className="block text-xs font-medium text-slate-600">Action *
                          <input value={actionTitle} onChange={(event) => setActionTitle(event.target.value)} maxLength={180} placeholder="e.g. Add alert for queue saturation" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" />
                        </label>
                        <label className="block text-xs font-medium text-slate-600">Details / success criteria
                          <textarea value={actionDetails} onChange={(event) => setActionDetails(event.target.value)} maxLength={900} rows={2} placeholder="What change is expected, and how will its effect be checked?" className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" />
                        </label>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <label className="text-xs font-medium text-slate-600">Owner
                            <input value={actionOwner} onChange={(event) => setActionOwner(event.target.value)} maxLength={120} placeholder="Name or role" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal" />
                          </label>
                          <label className="text-xs font-medium text-slate-600">Due date
                            <input type="date" value={actionDueDate} onChange={(event) => setActionDueDate(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal" />
                          </label>
                          <label className="text-xs font-medium text-slate-600">Priority
                            <select value={actionPriority} onChange={(event) => setActionPriority(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal">
                              <option>High</option><option>Medium</option><option>Low</option>
                            </select>
                          </label>
                        </div>
                        <div className="flex justify-end"><button type="button" onClick={addAction} className="rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800">Add follow-up action</button></div>
                      </div>
                    ) : null}
                    <div className="space-y-2 p-3">
                      {visibleActions.length ? visibleActions.map((action) => (
                        <ActionCard key={action.id} action={action} canEdit={canEdit} onUpdate={updateAction} onRemove={removeAction} />
                      )) : (
                        <EmptyState title={selected.actions.length ? "No actions match this filter" : "No improvement actions yet"} description={selected.actions.length ? "Choose another status to see actions." : "Add a concrete, owned follow-up with a due date where possible."} icon={Target} />
                      )}
                    </div>
                  </section>
                </div>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-rose-600" aria-hidden="true" />
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Related reports</h3>
                        <p className="mt-0.5 text-xs text-slate-500">{selectedReports.length} loaded of {selected.reportIds.length} saved references</p>
                      </div>
                    </div>
                    {selected.reportIds.length ? <button type="button" onClick={() => updateSelected((item) => ({ ...item, reportIds: [], activity: appendActivity(item, "Cleared linked report references") }), "Report references cleared.")} disabled={!canEdit} className="rounded-lg px-2.5 py-2 text-xs text-slate-500 hover:bg-white disabled:opacity-50">Clear links</button> : null}
                  </div>
                  <div className="max-h-80 overflow-y-auto p-3">
                    {reportOptions.length ? (
                      <>
                        <label className="relative mb-3 block">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                          <input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Search reports by title, severity, or status" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-sky-400" />
                        </label>
                        <div className="grid gap-2 md:grid-cols-2">
                          {reportOptions.map((report) => {
                            const checked = selected.reportIds.includes(report.id);
                            return (
                              <label key={report.id} className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 ${checked ? "border-sky-300 bg-sky-50/60" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                                <input type="checkbox" checked={checked} onChange={() => toggleReport(report.id)} disabled={!canEdit} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-700" />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-semibold text-slate-800">{report.title}</span>
                                  <span className="mt-1 block text-[11px] text-slate-500">{report.severity} · {report.status}</span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        {reportOptions.length === 250 ? <p className="mt-2 text-xs text-slate-500">Showing at most 250 matching reports. Refine the search to find other reports.</p> : null}
                      </>
                    ) : (
                      <p className="py-6 text-center text-xs text-slate-500">No loaded reports match this search.</p>
                    )}
                    {selected.reportIds.some((id) => !reports.some((report) => getReportId(report) === id)) ? (
                      <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Some report references are not in the currently loaded data; their IDs are retained locally.
                      </p>
                    ) : null}
                    {selected.reportIds.length ? (
                      <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                        {selectedReports.map((report) => (
                          <div key={getReportId(report)} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                            <span className="inline-flex min-w-0 items-center gap-2 truncate text-xs text-slate-700"><AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />{getReportTitle(report)}</span>
                            {onOpenReport ? <button type="button" onClick={() => onOpenReport(report)} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-sky-700 hover:underline">Open <ExternalLink className="h-3 w-3" aria-hidden="true" /></button> : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)]">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Retrospective activity</h3>
                        <p className="mt-0.5 text-xs text-slate-500">Latest {selected.activity.length} local changes</p>
                      </div>
                      <Clock3 className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </div>
                    {selected.activity.length ? (
                      <ol className="mt-4 space-y-3">
                        {[...selected.activity].reverse().slice(0, 12).map((entry) => (
                          <li key={entry.id} className="flex gap-3">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400 ring-4 ring-amber-50" />
                            <div>
                              <p className="text-xs font-medium text-slate-700">{entry.label}</p>
                              <p className="mt-0.5 text-[11px] text-slate-400">{formatDate(entry.createdAt)}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    ) : <p className="mt-4 text-xs text-slate-500">Changes will appear here.</p>}
                  </section>
                  <aside className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                    <div className="flex items-center gap-2 text-amber-900">
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      <h3 className="text-sm font-semibold">Local learning record</h3>
                    </div>
                    <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
                      <li>Content is stored in this browser under the signed-in tester account; it is not shared with teammates.</li>
                      <li>Linked reports are references only. This workspace does not create reports or change their status.</li>
                      <li>Export a JSON copy for a full record or a CSV for action tracking; review exported content before sharing.</li>
                      <li>A completion state is an organizational marker, not a declaration that all risk has been removed.</li>
                    </ul>
                    <div className="mt-4 border-t border-amber-100 pt-3 text-xs text-slate-500">Last saved {formatDate(selected.updatedAt)}</div>
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
