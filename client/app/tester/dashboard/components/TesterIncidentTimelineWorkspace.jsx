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
  Flag,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";

const STORAGE_KEY = "tester-incident-timeline-v1";
const MAX_TIMELINES = 30;
const MAX_EVENTS = 120;
const MAX_ACTIONS = 100;
const MAX_REPORTS = 100;
const MAX_REFERENCES = 40;
const PAGE_SIZE = 8;

const TIMELINE_STATES = [
  { value: "draft", label: "Draft", tone: "slate" },
  { value: "investigating", label: "Investigating", tone: "cyan" },
  { value: "contained", label: "Contained", tone: "violet" },
  { value: "resolved", label: "Resolved", tone: "emerald" },
  { value: "revisit", label: "Revisit needed", tone: "rose" },
  { value: "closed", label: "Closed", tone: "amber" },
];

const TIMELINE_FILTERS = [{ value: "all", label: "All timelines" }, ...TIMELINE_STATES];
const EVENT_TYPES = [
  { value: "discovery", label: "Discovery" },
  { value: "change", label: "Change" },
  { value: "observation", label: "Observation" },
  { value: "mitigation", label: "Mitigation" },
  { value: "decision", label: "Decision" },
  { value: "resolution", label: "Resolution" },
];
const EVENT_RESULTS = [
  { value: "unknown", label: "Unknown" },
  { value: "confirmed", label: "Confirmed" },
  { value: "suspected", label: "Suspected" },
  { value: "ruled-out", label: "Ruled out" },
];
const ACTION_STATES = [
  { value: "open", label: "Open" },
  { value: "in-progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];
const PRIORITIES = [
  { value: "critical", label: "Critical", tone: "rose" },
  { value: "high", label: "High", tone: "orange" },
  { value: "medium", label: "Medium", tone: "amber" },
  { value: "low", label: "Low", tone: "emerald" },
];
const PRIORITY_FILTERS = [{ value: "all", label: "All priorities" }, ...PRIORITIES];
const CHECKS = [
  { id: "trigger", label: "Trigger is identified", detail: "The first known signal and surrounding context are recorded." },
  { id: "sequence", label: "Sequence is chronological", detail: "Events explain how the issue developed over time." },
  { id: "impact", label: "Impact is described", detail: "Affected users, areas, or release scope are visible." },
  { id: "containment", label: "Containment is recorded", detail: "The current mitigation or safety boundary is explicit." },
  { id: "owner", label: "Owners are named", detail: "Investigation and follow-up work have accountable owners." },
  { id: "evidence", label: "Evidence is attached", detail: "Reports and references support the incident narrative." },
  { id: "learning", label: "Learning is captured", detail: "The timeline includes what should change next time." },
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value);
}

function escapeCsv(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCsv(filename, rows) {
  const blob = new Blob([rows.map((row) => row.map(escapeCsv).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
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
    // Timeline notes remain available if browser storage is unavailable.
  }
}

function timelineMeta(value) {
  return TIMELINE_STATES.find((state) => state.value === value) || TIMELINE_STATES[0];
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

function createTimeline() {
  return {
    id: makeId("timeline"),
    name: "Untitled incident timeline",
    release: "",
    environment: "",
    owner: "",
    audience: "",
    state: "draft",
    startedAt: "",
    resolvedAt: "",
    impact: "",
    containment: "",
    learning: "",
    checks: Object.fromEntries(CHECKS.map((check) => [check.id, false])),
    events: [],
    actions: [],
    reportIds: [],
    references: [],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function normalizeTimeline(value) {
  const source = value && typeof value === "object" ? value : createTimeline();
  return {
    ...createTimeline(),
    ...source,
    checks: { ...createTimeline().checks, ...(source.checks || {}) },
    events: Array.isArray(source.events)
      ? source.events.slice(0, MAX_EVENTS).map((event) => ({
          id: makeId("event"),
          date: today(),
          time: "",
          title: "",
          type: "observation",
          result: "unknown",
          owner: "",
          detail: "",
          ...event,
        }))
      : [],
    actions: Array.isArray(source.actions)
      ? source.actions.slice(0, MAX_ACTIONS).map((action) => ({
          id: makeId("action"),
          title: "",
          state: "open",
          priority: "medium",
          owner: "",
          dueDate: "",
          detail: "",
          ...action,
        }))
      : [],
    reportIds: Array.isArray(source.reportIds) ? source.reportIds.slice(0, MAX_REPORTS) : [],
    references: Array.isArray(source.references)
      ? source.references.slice(0, MAX_REFERENCES).map((reference) => ({ id: makeId("reference"), label: "", url: "", ...reference }))
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
  return <button type="button" title={title} disabled={disabled} onClick={onClick} className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[9px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]}`}>{Icon ? <Icon size={12} aria-hidden="true" /> : null}{children}</button>;
}

function Field({ label, value, onChange, placeholder, type = "text", className = "" }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label>;
}

function TextArea({ label, value, onChange, placeholder, rows = 3, className = "" }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span><textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] leading-4 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label>;
}

function SelectField({ label, value, onChange, options, className = "" }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span><span className="relative block"><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 pr-7 text-[10px] text-slate-700 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={12} aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" /></span></label>;
}

function StateBadge({ value }) {
  const state = timelineMeta(value);
  return <span className={`inline-flex rounded-full border text-[8px] font-semibold ${toneClasses(state.tone, true)}`}>{state.label}</span>;
}

function PriorityBadge({ value }) {
  const priority = priorityMeta(value);
  return <span className={`inline-flex rounded-full border text-[8px] font-semibold ${toneClasses(priority.tone, true)}`}>{priority.label}</span>;
}

function CheckRow({ check, checked, onChange }) {
  return <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 transition hover:border-cyan-200"><input type="checkbox" checked={checked} onChange={onChange} className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-cyan-600 focus:ring-cyan-500" /><span><span className="block text-[10px] font-semibold text-slate-700">{check.label}</span><span className="mt-0.5 block text-[9px] leading-4 text-slate-400">{check.detail}</span></span></label>;
}

function EmptyState({ title, detail, icon: Icon = Clipboard }) {
  return <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center"><Icon size={21} aria-hidden="true" className="mx-auto text-slate-300" /><p className="mt-2 text-[10px] font-semibold text-slate-600">{title}</p><p className="mx-auto mt-1 max-w-sm text-[9px] leading-4 text-slate-400">{detail}</p></div>;
}

function EventRow({ event, onChange, onRemove }) {
  return <div className="rounded-xl border border-slate-200/80 bg-white p-3"><div className="grid gap-2 md:grid-cols-[130px_100px_minmax(0,1.2fr)_140px_130px_auto]"><Field label="Date" type="date" value={event.date} onChange={(value) => onChange({ date: value })} /><Field label="Time" type="time" value={event.time} onChange={(value) => onChange({ time: value })} /><Field label="Event" value={event.title} onChange={(value) => onChange({ title: value })} placeholder="What happened?" /><SelectField label="Type" value={event.type} onChange={(value) => onChange({ type: value })} options={EVENT_TYPES} /><SelectField label="Result" value={event.result} onChange={(value) => onChange({ result: value })} options={EVENT_RESULTS} /><div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove event" onClick={onRemove}>Remove</Button></div></div><div className="mt-3 grid gap-2 md:grid-cols-[180px_minmax(0,1fr)]"><Field label="Owner" value={event.owner} onChange={(value) => onChange({ owner: value })} placeholder="Name or team" /><Field label="Detail" value={event.detail} onChange={(value) => onChange({ detail: value })} placeholder="Evidence, observation, or context" /></div></div>;
}

function ActionRow({ action, onChange, onRemove }) {
  return <div className="rounded-xl border border-slate-200/80 bg-white p-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1.25fr)_130px_120px_140px_auto]"><Field label="Action" value={action.title} onChange={(value) => onChange({ title: value })} placeholder="Containment or follow-up" /><SelectField label="State" value={action.state} onChange={(value) => onChange({ state: value })} options={ACTION_STATES} /><SelectField label="Priority" value={action.priority} onChange={(value) => onChange({ priority: value })} options={PRIORITIES} /><Field label="Owner" value={action.owner} onChange={(value) => onChange({ owner: value })} placeholder="Name or team" /><div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove action" onClick={onRemove}>Remove</Button></div></div><div className="mt-3 grid gap-2 md:grid-cols-[140px_minmax(0,1fr)]"><Field label="Due date" type="date" value={action.dueDate} onChange={(value) => onChange({ dueDate: value })} /><Field label="Detail" value={action.detail} onChange={(value) => onChange({ detail: value })} placeholder="Expected outcome or dependency" /></div></div>;
}

function ReportRow({ report, checked, onToggle, onOpenReport }) {
  return <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3"><input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 rounded border-slate-300 accent-cyan-600 focus:ring-cyan-500" aria-label={`Attach ${reportTitle(report)}`} /><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-slate-700">{reportTitle(report)}</p><p className="mt-1 truncate text-[9px] text-slate-400">{reportCategory(report)} · {reportStatus(report) === "resolved" ? "Resolved" : "Open"}</p></div><PriorityBadge value={reportSeverity(report)} />{onOpenReport ? <button type="button" onClick={() => onOpenReport(report)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-cyan-700" title="Open report"><ExternalLink size={13} aria-hidden="true" /></button> : null}</div>;
}

function Guidance({ timeline, metrics, evidenceCount }) {
  const suggestions = [];
  if (!timeline.impact) suggestions.push("Describe affected users, workflows, or release scope.");
  if (!timeline.owner) suggestions.push("Assign an incident owner.");
  if (!metrics.openActions) suggestions.push("Record at least one containment or follow-up action.");
  if (!evidenceCount) suggestions.push("Attach a report or reference to support the chronology.");
  if (!timeline.containment) suggestions.push("Document the current safety boundary or mitigation.");
  if (!suggestions.length) suggestions.push("The incident timeline is ready for a focused review.");
  return <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-3.5"><div className="flex items-start gap-2"><Sparkles size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-cyan-600" /><div><p className="text-[10px] font-semibold text-cyan-900">Suggested next moves</p><p className="mt-1 text-[9px] leading-4 text-cyan-800/70">Private prompts based on this timeline.</p></div></div><ul className="mt-3 space-y-1.5">{suggestions.map((suggestion) => <li key={suggestion} className="flex items-start gap-2 text-[9px] leading-4 text-cyan-800/80"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-cyan-500" />{suggestion}</li>)}</ul><p className="mt-3 border-t border-cyan-100 pt-3 text-[8px] leading-4 text-cyan-800/60">This workspace does not update incident systems, notify users, or change report status.</p></div>;
}

function TimelineHeader({ timeline, onChange, onDelete, onDuplicate }) {
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><Flag size={17} aria-hidden="true" className="text-cyan-600" /><h2 className="truncate text-sm font-semibold text-slate-900">{timeline.name || "Untitled incident timeline"}</h2><StateBadge value={timeline.state} /></div><p className="mt-1 pl-6 text-[9px] text-slate-400">Private incident chronology workspace</p></div><div className="flex flex-wrap gap-1.5"><Button icon={Copy} onClick={onDuplicate}>Duplicate</Button><Button variant="danger" icon={Trash2} onClick={onDelete}>Delete</Button></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Timeline name" value={timeline.name} onChange={(value) => onChange({ name: value })} placeholder="Checkout incident chronology" /><Field label="Release / build" value={timeline.release} onChange={(value) => onChange({ release: value })} placeholder="v2.4.0 / build 1842" /><Field label="Environment" value={timeline.environment} onChange={(value) => onChange({ environment: value })} placeholder="Production / web" /><SelectField label="Timeline state" value={timeline.state} onChange={(value) => onChange({ state: value })} options={TIMELINE_STATES} /></div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Owner" value={timeline.owner} onChange={(value) => onChange({ owner: value })} placeholder="Tester or team" /><Field label="Audience" value={timeline.audience} onChange={(value) => onChange({ audience: value })} placeholder="Release or support team" /><Field label="Started" type="date" value={timeline.startedAt} onChange={(value) => onChange({ startedAt: value })} /><Field label="Resolved" type="date" value={timeline.resolvedAt} onChange={(value) => onChange({ resolvedAt: value })} /></div></div>;
}

export default function TesterIncidentTimelineWorkspace({ reports = [], email = "", onOpenReport }) {
  const [timelines, setTimelines] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [timelineFilter, setTimelineFilter] = useState("all");
  const [timelineSearch, setTimelineSearch] = useState("");
  const [sortAscending, setSortAscending] = useState(false);
  const [showAllTimelines, setShowAllTimelines] = useState(false);
  const [eventSearch, setEventSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [reportSearch, setReportSearch] = useState("");
  const [reportFilter, setReportFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const stored = readStorage(email);
    if (stored && Array.isArray(stored.timelines) && stored.timelines.length) {
      const restored = stored.timelines.slice(0, MAX_TIMELINES).map(normalizeTimeline);
      setTimelines(restored);
      setSelectedId(stored.selectedId || restored[0].id);
      return;
    }
    const initial = createTimeline();
    initial.name = "Release incident timeline";
    initial.startedAt = today();
    setTimelines([initial]);
    setSelectedId(initial.id);
  }, [email]);

  useEffect(() => {
    if (!timelines.length) return;
    writeStorage(email, { timelines, selectedId });
  }, [email, selectedId, timelines]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const selectedTimeline = useMemo(() => timelines.find((timeline) => timeline.id === selectedId) || timelines[0] || null, [selectedId, timelines]);

  const metricsByTimeline = useMemo(() => {
    const result = new Map();
    timelines.forEach((timeline) => {
      const eventCount = timeline.events.length;
      const actionDone = timeline.actions.filter((action) => ["done", "cancelled"].includes(action.state)).length;
      const openActions = timeline.actions.filter((action) => !["done", "cancelled"].includes(action.state)).length;
      const checksDone = Object.values(timeline.checks).filter(Boolean).length;
      const checkProgress = Math.round((checksDone / CHECKS.length) * 100);
      const actionProgress = timeline.actions.length ? Math.round((actionDone / timeline.actions.length) * 100) : 0;
      const sequenceProgress = eventCount ? 100 : 0;
      const readiness = Math.round((checkProgress * 0.5) + (actionProgress * 0.3) + (sequenceProgress * 0.2));
      result.set(timeline.id, { eventCount, actionDone, openActions, checkProgress, actionProgress, readiness });
    });
    return result;
  }, [timelines]);

  const filteredTimelines = useMemo(() => {
    const query = timelineSearch.trim().toLowerCase();
    const result = timelines.filter((timeline) => {
      const stateMatch = timelineFilter === "all" || timeline.state === timelineFilter;
      const haystack = `${timeline.name} ${timeline.release} ${timeline.environment} ${timeline.owner} ${timeline.audience}`.toLowerCase();
      return stateMatch && (!query || haystack.includes(query));
    });
    result.sort((left, right) => {
      const comparison = (left.name || "").localeCompare(right.name || "");
      return sortAscending ? comparison : -comparison;
    });
    return result;
  }, [sortAscending, timelineFilter, timelineSearch, timelines]);

  const visibleTimelines = showAllTimelines ? filteredTimelines : filteredTimelines.slice(0, PAGE_SIZE);

  const filteredEvents = useMemo(() => {
    if (!selectedTimeline) return [];
    const query = eventSearch.trim().toLowerCase();
    return [...selectedTimeline.events]
      .filter((event) => {
        const typeMatch = eventTypeFilter === "all" || event.type === eventTypeFilter;
        const searchMatch = !query || `${event.title} ${event.owner} ${event.detail}`.toLowerCase().includes(query);
        return typeMatch && searchMatch;
      })
      .sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`));
  }, [eventSearch, eventTypeFilter, selectedTimeline]);

  const filteredActions = useMemo(() => {
    if (!selectedTimeline) return [];
    return selectedTimeline.actions.filter((action) => actionFilter === "all" || action.state === actionFilter);
  }, [actionFilter, selectedTimeline]);

  const filteredReports = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();
    return reports.filter((report) => {
      const searchMatch = !query || `${reportTitle(report)} ${reportCategory(report)}`.toLowerCase().includes(query);
      const priorityMatch = reportFilter === "all" || reportSeverity(report) === reportFilter;
      const statusMatch = reportStatusFilter === "all" || reportStatus(report) === reportStatusFilter;
      return searchMatch && priorityMatch && statusMatch;
    });
  }, [reportFilter, reportSearch, reportStatusFilter, reports]);

  const selectedReports = useMemo(() => reports.filter((report) => selectedTimeline?.reportIds.includes(reportId(report))), [reports, selectedTimeline]);
  const metrics = selectedTimeline ? metricsByTimeline.get(selectedTimeline.id) : null;

  const updateTimeline = (patch) => {
    if (!selectedTimeline) return;
    setTimelines((current) => current.map((timeline) => timeline.id === selectedTimeline.id ? { ...timeline, ...patch, updatedAt: new Date().toISOString() } : timeline));
  };

  const updateEvent = (id, patch) => updateTimeline({ events: selectedTimeline.events.map((event) => event.id === id ? { ...event, ...patch } : event) });
  const updateAction = (id, patch) => updateTimeline({ actions: selectedTimeline.actions.map((action) => action.id === id ? { ...action, ...patch } : action) });
  const updateReference = (id, patch) => updateTimeline({ references: selectedTimeline.references.map((reference) => reference.id === id ? { ...reference, ...patch } : reference) });

  const createNewTimeline = () => {
    if (timelines.length >= MAX_TIMELINES) {
      setNotice(`Maximum of ${MAX_TIMELINES} timelines reached.`);
      return;
    }
    const timeline = createTimeline();
    timeline.name = `Incident timeline ${timelines.length + 1}`;
    setTimelines((current) => [timeline, ...current]);
    setSelectedId(timeline.id);
    setNotice("New incident timeline created.");
  };

  const duplicateTimeline = () => {
    if (!selectedTimeline || timelines.length >= MAX_TIMELINES) return;
    const copy = normalizeTimeline({ ...selectedTimeline, id: makeId("timeline"), name: `${selectedTimeline.name || "Incident timeline"} copy`, state: "draft", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setTimelines((current) => [copy, ...current]);
    setSelectedId(copy.id);
    setNotice("Incident timeline duplicated.");
  };

  const deleteTimeline = () => {
    if (!selectedTimeline) return;
    if (timelines.length === 1) {
      setNotice("Keep at least one incident timeline available.");
      return;
    }
    const remaining = timelines.filter((timeline) => timeline.id !== selectedTimeline.id);
    setTimelines(remaining);
    setSelectedId(remaining[0]?.id || "");
    setNotice("Incident timeline removed.");
  };

  const addEvent = () => {
    if (!selectedTimeline || selectedTimeline.events.length >= MAX_EVENTS) return;
    updateTimeline({ events: [...selectedTimeline.events, { id: makeId("event"), date: today(), time: "", title: "", type: "observation", result: "unknown", owner: "", detail: "" }] });
  };

  const removeEvent = (id) => updateTimeline({ events: selectedTimeline.events.filter((event) => event.id !== id) });

  const addAction = () => {
    if (!selectedTimeline || selectedTimeline.actions.length >= MAX_ACTIONS) return;
    updateTimeline({ actions: [...selectedTimeline.actions, { id: makeId("action"), title: "", state: "open", priority: "medium", owner: "", dueDate: "", detail: "" }] });
  };

  const removeAction = (id) => updateTimeline({ actions: selectedTimeline.actions.filter((action) => action.id !== id) });

  const addReference = () => {
    if (!selectedTimeline || selectedTimeline.references.length >= MAX_REFERENCES) return;
    updateTimeline({ references: [...selectedTimeline.references, { id: makeId("reference"), label: "", url: "" }] });
  };

  const removeReference = (id) => updateTimeline({ references: selectedTimeline.references.filter((reference) => reference.id !== id) });

  const toggleReport = (id) => {
    const ids = selectedTimeline.reportIds.includes(id) ? selectedTimeline.reportIds.filter((value) => value !== id) : [...selectedTimeline.reportIds, id].slice(0, MAX_REPORTS);
    updateTimeline({ reportIds: ids });
  };

  const toggleVisibleReports = () => {
    const visibleIds = filteredReports.map(reportId).filter(Boolean);
    const allSelected = visibleIds.every((id) => selectedTimeline.reportIds.includes(id));
    const nextIds = allSelected ? selectedTimeline.reportIds.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selectedTimeline.reportIds, ...visibleIds])).slice(0, MAX_REPORTS);
    updateTimeline({ reportIds: nextIds });
  };

  const summaryText = useMemo(() => {
    if (!selectedTimeline) return "";
    const actions = selectedTimeline.actions.filter((action) => !["done", "cancelled"].includes(action.state));
    return [
      `${selectedTimeline.name || "Untitled incident timeline"} — ${timelineMeta(selectedTimeline.state).label}`,
      `Release: ${selectedTimeline.release || "Not specified"}`,
      `Environment: ${selectedTimeline.environment || "Not specified"}`,
      `Owner: ${selectedTimeline.owner || "Not assigned"} · Audience: ${selectedTimeline.audience || "Not assigned"}`,
      `Events recorded: ${selectedTimeline.events.length}`,
      `Readiness: ${metrics?.readiness || 0}%`,
      `Reports attached: ${selectedReports.length}`,
      "",
      selectedTimeline.impact || "No impact summary has been written yet.",
      "",
      "Open actions:",
      ...(actions.length ? actions.map((action) => `- ${action.title || "Untitled action"} [${action.priority}]`) : ["- None"]),
      "",
      "Containment:",
      selectedTimeline.containment || "Not recorded",
      "",
      "Learning:",
      selectedTimeline.learning || "Not recorded",
    ].join("\n");
  }, [metrics, selectedTimeline, selectedReports]);

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setNotice("Incident summary copied.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setNotice("Clipboard access is unavailable.");
    }
  };

  const exportTimeline = () => {
    if (!selectedTimeline) return;
    const rows = [
      ["Incident timeline", "Value"],
      ["Name", selectedTimeline.name],
      ["Release", selectedTimeline.release],
      ["Environment", selectedTimeline.environment],
      ["State", timelineMeta(selectedTimeline.state).label],
      ["Owner", selectedTimeline.owner],
      ["Audience", selectedTimeline.audience],
      ["Started", selectedTimeline.startedAt],
      ["Resolved", selectedTimeline.resolvedAt],
      ["Readiness", `${metrics?.readiness || 0}%`],
      [],
      ["Date", "Time", "Event", "Type", "Result", "Owner", "Detail"],
      ...selectedTimeline.events.map((event) => [event.date, event.time, event.title, event.type, event.result, event.owner, event.detail]),
      [],
      ["Action", "State", "Priority", "Owner", "Due", "Detail"],
      ...selectedTimeline.actions.map((action) => [action.title, action.state, action.priority, action.owner, action.dueDate, action.detail]),
      [],
      ["Reference", "URL"],
      ...selectedTimeline.references.map((reference) => [reference.label, reference.url]),
    ];
    downloadCsv("incident-timeline.csv", rows);
    setNotice("Incident timeline export downloaded.");
  };

  const resetTimeline = () => {
    if (!selectedTimeline) return;
    const reset = createTimeline();
    reset.id = selectedTimeline.id;
    reset.name = selectedTimeline.name;
    reset.release = selectedTimeline.release;
    reset.environment = selectedTimeline.environment;
    reset.owner = selectedTimeline.owner;
    reset.audience = selectedTimeline.audience;
    reset.startedAt = selectedTimeline.startedAt;
    reset.resolvedAt = selectedTimeline.resolvedAt;
    updateTimeline(reset);
    setNotice("Incident timeline data reset.");
  };

  if (!selectedTimeline) return null;

  const allVisibleReportsSelected = filteredReports.length > 0 && filteredReports.every((report) => selectedTimeline.reportIds.includes(reportId(report)));
  const highActions = selectedTimeline.actions.filter((action) => !["done", "cancelled"].includes(action.state) && ["critical", "high"].includes(action.priority)).length;

  return (
    <section id="tester-incident-timeline" className="space-y-4 rounded-3xl bg-slate-50/70 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Flag size={18} aria-hidden="true" className="text-cyan-600" /><h2 className="text-base font-semibold tracking-tight text-slate-900">Incident timeline</h2></div><p className="mt-1 max-w-2xl text-[10px] leading-5 text-slate-500">Build a private chronology of discovery, impact, containment, and learning around a tester-observed issue.</p></div><div className="flex flex-wrap gap-1.5"><Button icon={Plus} variant="primary" onClick={createNewTimeline}>New timeline</Button><Button icon={Download} onClick={exportTimeline}>Export</Button><Button icon={copied ? Check : Copy} onClick={copySummary}>{copied ? "Copied" : "Copy summary"}</Button></div></div>
      {notice ? <div className="flex items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2.5 text-[9px] font-medium text-cyan-800"><CheckCircle2 size={13} aria-hidden="true" />{notice}</div> : null}
      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Panel title="Incident timelines" detail={`${formatNumber(filteredTimelines.length)} matching timeline(s)`} icon={Flag} action={<Button variant="ghost" icon={sortAscending ? ArrowUpAZ : ArrowDownAZ} onClick={() => setSortAscending((value) => !value)} title="Toggle timeline sort" />}><div className="space-y-2.5"><div className="relative"><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={timelineSearch} onChange={(event) => setTimelineSearch(event.target.value)} placeholder="Search timelines" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></div><SelectField label="State filter" value={timelineFilter} onChange={setTimelineFilter} options={TIMELINE_FILTERS} />{visibleTimelines.length ? <div className="space-y-2">{visibleTimelines.map((timeline) => <TimelineCard key={timeline.id} timeline={timeline} selected={timeline.id === selectedTimeline.id} onSelect={() => setSelectedId(timeline.id)} metrics={metricsByTimeline.get(timeline.id) || { eventCount: 0, openActions: 0, readiness: 0 }} />)}</div> : <EmptyState title="No matching timelines" detail="Try clearing the search or state filter." icon={Search} />}{filteredTimelines.length > PAGE_SIZE ? <Button variant="ghost" onClick={() => setShowAllTimelines((value) => !value)}>{showAllTimelines ? "Show fewer" : `Show all ${filteredTimelines.length}`}</Button> : null}</div></Panel>
        <div className="min-w-0 space-y-4">
          <TimelineHeader timeline={selectedTimeline} onChange={updateTimeline} onDelete={deleteTimeline} onDuplicate={duplicateTimeline} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Readiness" value={`${metrics?.readiness || 0}%`} detail="Timeline completeness" icon={ShieldAlert} tone="cyan" /><StatCard label="Events" value={formatNumber(metrics?.eventCount || 0)} detail="Chronology entries" icon={Flag} tone="violet" /><StatCard label="Actions" value={formatNumber(metrics?.openActions || 0)} detail={`${highActions} high priority open`} icon={CheckCircle2} tone="rose" /><StatCard label="Evidence" value={formatNumber(selectedReports.length)} detail="Reports attached" icon={FileCheck2} tone="emerald" /></div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]"><Panel title="Incident brief" detail="Explain impact, containment, and what should happen next." icon={Clipboard}><div className="space-y-3"><TextArea label="Impact summary" value={selectedTimeline.impact} onChange={(value) => updateTimeline({ impact: value })} placeholder="Who or what was affected, and how?" rows={4} /><TextArea label="Containment" value={selectedTimeline.containment} onChange={(value) => updateTimeline({ containment: value })} placeholder="What is currently safe, mitigated, or restricted?" rows={3} /><TextArea label="Learning and prevention" value={selectedTimeline.learning} onChange={(value) => updateTimeline({ learning: value })} placeholder="What should change in tests, process, or product?" rows={3} /><Guidance timeline={selectedTimeline} metrics={metrics || { openActions: 0 }} evidenceCount={selectedReports.length + selectedTimeline.references.length} /></div></Panel><Panel title="Timeline quality" detail={`${metrics?.checkProgress || 0}% complete`} icon={ShieldAlert}><div className="space-y-2">{CHECKS.map((check) => <CheckRow key={check.id} check={check} checked={Boolean(selectedTimeline.checks[check.id])} onChange={(event) => updateTimeline({ checks: { ...selectedTimeline.checks, [check.id]: event.target.checked } })} />)}</div></Panel></div>
          <Panel title="Chronology" detail={`${formatNumber(selectedTimeline.events.length)} event(s) · ${formatNumber(filteredEvents.length)} shown`} icon={Flag} action={<Button icon={Plus} onClick={addEvent} disabled={selectedTimeline.events.length >= MAX_EVENTS}>Add event</Button>}><div className="space-y-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_170px]"><label className="relative block"><span className="sr-only">Search events</span><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={eventSearch} onChange={(event) => setEventSearch(event.target.value)} placeholder="Search events, owners, or details" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label><SelectField label="Event type" value={eventTypeFilter} onChange={setEventTypeFilter} options={[{ value: "all", label: "All event types" }, ...EVENT_TYPES]} /></div>{filteredEvents.length ? <div className="space-y-2.5">{filteredEvents.map((event) => <EventRow key={event.id} event={event} onChange={(patch) => updateEvent(event.id, patch)} onRemove={() => removeEvent(event.id)} />)}</div> : <EmptyState title="No chronology events" detail="Add the first discovery, observation, mitigation, or resolution event." icon={Flag} />}</div></Panel>
          <Panel title="Containment and follow-up" detail={`${formatNumber(selectedTimeline.actions.length)} action(s) · ${highActions} high priority open`} icon={ShieldAlert} action={<Button icon={Plus} onClick={addAction} disabled={selectedTimeline.actions.length >= MAX_ACTIONS}>Add action</Button>}><div className="space-y-3"><div className="flex flex-wrap gap-1.5">{[{ value: "all", label: "All actions" }, ...ACTION_STATES].map((option) => <button key={option.value} type="button" onClick={() => setActionFilter(option.value)} className={`rounded-full border px-2.5 py-1 text-[8px] font-semibold transition ${actionFilter === option.value ? "border-cyan-300 bg-cyan-50 text-cyan-800" : "border-slate-200 bg-white text-slate-500 hover:border-cyan-200"}`}>{option.label}</button>)}</div>{filteredActions.length ? <div className="space-y-2.5">{filteredActions.map((action) => <ActionRow key={action.id} action={action} onChange={(patch) => updateAction(action.id, patch)} onRemove={() => removeAction(action.id)} />)}</div> : <EmptyState title="No actions match" detail="Add an action for containment, investigation, or prevention." icon={ShieldAlert} />}</div></Panel>
          <Panel title="Report evidence" detail={`${formatNumber(selectedTimeline.reportIds.length)} attached · ${formatNumber(filteredReports.length)} shown`} icon={FileCheck2} action={<Button icon={allVisibleReportsSelected ? X : Check} onClick={toggleVisibleReports}>{allVisibleReportsSelected ? "Clear shown" : "Select shown"}</Button>}><div className="space-y-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_150px]"><label className="relative block"><span className="sr-only">Search reports</span><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Search report title or category" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label><SelectField label="Severity" value={reportFilter} onChange={setReportFilter} options={PRIORITY_FILTERS} /><SelectField label="Status" value={reportStatusFilter} onChange={setReportStatusFilter} options={[{ value: "all", label: "All statuses" }, { value: "open", label: "Open reports" }, { value: "resolved", label: "Resolved reports" }]} /></div>{filteredReports.length ? <div className="space-y-2">{filteredReports.slice(0, 20).map((report) => <ReportRow key={reportId(report)} report={report} checked={selectedTimeline.reportIds.includes(reportId(report))} onToggle={() => toggleReport(reportId(report))} onOpenReport={onOpenReport} />)}</div> : <EmptyState title="No reports match" detail="Adjust the filters or wait for reports to be available." icon={FileCheck2} />}<div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3"><p className="flex items-center gap-1.5 text-[9px] font-semibold text-violet-800"><Users size={12} aria-hidden="true" /> Browser-local evidence</p><p className="mt-1 text-[9px] leading-4 text-violet-700/75">Selecting reports here stores only their IDs in this tester&apos;s browser and does not change report status.</p></div></div></Panel>
          <Panel title="Reference links" detail={`${formatNumber(selectedTimeline.references.length)} supporting reference(s)`} icon={ExternalLink} action={<Button icon={Plus} onClick={addReference} disabled={selectedTimeline.references.length >= MAX_REFERENCES}>Add link</Button>}><div className="space-y-3">{selectedTimeline.references.length ? selectedTimeline.references.map((reference) => <ReferenceRow key={reference.id} reference={reference} onChange={(patch) => updateReference(reference.id, patch)} onRemove={() => removeReference(reference.id)} />) : <EmptyState title="No reference links" detail="Keep an incident, build, runbook, or design reference beside the chronology." icon={ExternalLink} />}</div></Panel>
          <Panel title="Workspace actions" detail="Browser-local controls for this incident timeline." icon={ShieldAlert}><div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-[9px] leading-4 text-slate-400">Reset clears events, actions, checks, references, and report links while preserving timeline identity fields.</p><Button variant="danger" icon={RefreshCw} onClick={resetTimeline}>Reset timeline data</Button></div></Panel>
        </div>
      </div>
    </section>
  );
}
