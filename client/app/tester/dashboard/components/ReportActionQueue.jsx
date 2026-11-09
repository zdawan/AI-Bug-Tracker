"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock3,
  Copy,
  Download,
  Filter,
  Flag,
  ListChecks,
  MoreHorizontal,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

const STORAGE_PREFIX = "tester-report-action-queue-v1";
const MAX_NOTE_LENGTH = 500;
const MAX_ACTIONS = 300;
const STATUSES = [
  { value: "todo", label: "To do", tone: "border-slate-200 bg-slate-50 text-slate-700" },
  { value: "doing", label: "In progress", tone: "border-amber-200 bg-amber-50 text-amber-700" },
  { value: "done", label: "Done", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
];
const PRIORITIES = [
  { value: "high", label: "High", tone: "text-rose-700", dot: "bg-rose-500" },
  { value: "medium", label: "Medium", tone: "text-amber-700", dot: "bg-amber-500" },
  { value: "low", label: "Low", tone: "text-sky-700", dot: "bg-sky-500" },
];
const FILTERS = [
  { value: "all", label: "All actions" },
  { value: "todo", label: "To do" },
  { value: "doing", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "overdue", label: "Overdue" },
];
const SORTS = [
  { value: "priority", label: "Priority" },
  { value: "due", label: "Due date" },
  { value: "updated", label: "Recently updated" },
  { value: "title", label: "Title A–Z" },
];

function text(value, fallback = "", limit = 1000) {
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
  return text(report?.severity, "Unspecified");
}

function reportCategory(report) {
  return text(report?.category, "Uncategorized");
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDate(value) {
  if (!value) return "No due date";
  const date = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return "Invalid date";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function dateKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function todayKey() {
  return dateKey(new Date());
}

function isOverdue(action) {
  return action.status !== "done" && Boolean(action.dueDate) && action.dueDate < todayKey();
}

function priorityRank(priority) {
  return priority === "high" ? 3 : priority === "medium" ? 2 : 1;
}

function statusConfig(value) {
  return STATUSES.find((status) => status.value === value) || STATUSES[0];
}

function priorityConfig(value) {
  return PRIORITIES.find((priority) => priority.value === value) || PRIORITIES[1];
}

function storageKey(email) {
  const normalized = text(email).toLocaleLowerCase();
  return normalized ? `${STORAGE_PREFIX}:${encodeURIComponent(normalized)}` : "";
}

function normalizeAction(value) {
  if (!value || typeof value !== "object") return null;
  const id = text(value.id, "", 80);
  const report = text(value.reportId, "", 200);
  const title = text(value.title, "", 240);
  if (!id || !report || !title) return null;
  const status = STATUSES.some((item) => item.value === value.status)
    ? value.status
    : "todo";
  const priority = PRIORITIES.some((item) => item.value === value.priority)
    ? value.priority
    : "medium";
  return {
    id,
    reportId: report,
    title,
    priority,
    status,
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(value.dueDate || "")
      ? value.dueDate
      : "",
    note: text(value.note, "", MAX_NOTE_LENGTH),
    createdAt: text(value.createdAt, new Date().toISOString(), 40),
    updatedAt: text(value.updatedAt, new Date().toISOString(), 40),
  };
}

function loadActions(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeAction).filter(Boolean).slice(0, MAX_ACTIONS);
}

function createAction(report, priority = "medium") {
  const now = new Date().toISOString();
  return {
    id: `${reportId(report)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    reportId: reportId(report),
    title: `Follow up: ${reportTitle(report)}`,
    priority,
    status: "todo",
    dueDate: "",
    note: "",
    createdAt: now,
    updatedAt: now,
  };
}

function exportCsv(actions, reports) {
  const reportMap = new Map(reports.map((report) => [reportId(report), report]));
  const escape = (value) => {
    const raw = String(value ?? "");
    const safe = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const rows = [
    ["Action", "Report ID", "Report title", "Severity", "Category", "Priority", "Status", "Due date", "Note"],
    ...actions.map((action) => {
      const report = reportMap.get(action.reportId);
      return [
        action.title,
        action.reportId,
        reportTitle(report),
        reportSeverity(report),
        reportCategory(report),
        priorityConfig(action.priority).label,
        statusConfig(action.status).label,
        action.dueDate || "",
        action.note,
      ];
    }),
  ];
  const content = `\uFEFF${rows.map((row) => row.map(escape).join(",")).join("\r\n")}`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `report-action-queue-${todayKey()}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function StatusBadge({ status }) {
  const config = statusConfig(status);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold ${config.tone}`}>
      {status === "done" ? <CheckCircle2 size={11} /> : status === "doing" ? <Clock3 size={11} /> : <CircleDashed size={11} />}
      {config.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const config = priorityConfig(priority);
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-semibold ${config.tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-2.5 pr-7 text-[10px] font-semibold text-slate-600 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
    </label>
  );
}

function SummaryCard({ label, value, detail, tone, icon: Icon }) {
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-semibold uppercase tracking-wide opacity-75">{label}</span>
        <Icon size={14} aria-hidden="true" />
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums">{formatNumber(value)}</p>
      <p className="mt-1 text-[9px] opacity-70">{detail}</p>
    </div>
  );
}

function EmptyState({ hasActions, onCreate }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-10 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-white text-violet-500 shadow-sm">
        <ListChecks size={19} aria-hidden="true" />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-slate-800">
        {hasActions ? "No actions match these filters" : "Your action queue is clear"}
      </h3>
      <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-slate-500">
        {hasActions
          ? "Try another status, priority, or search term."
          : "Create a local follow-up for a report to keep the next step visible."}
      </p>
      {!hasActions && (
        <button type="button" onClick={onCreate} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[10px] font-semibold text-white hover:bg-violet-700">
          <Target size={12} aria-hidden="true" />
          Create first action
        </button>
      )}
    </div>
  );
}

function ActionRow({
  action,
  report,
  selected,
  onSelect,
  onOpenReport,
  onUpdate,
  onDelete,
}) {
  const overdue = isOverdue(action);
  return (
    <article className={`rounded-xl border bg-white p-3 transition ${selected ? "border-violet-300 ring-2 ring-violet-100" : "border-slate-200/80 hover:border-slate-300"}`}>
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(action.id)}
          aria-label={`Select ${action.title}`}
          className="mt-1 h-4 w-4 rounded border-slate-300 accent-violet-600 focus:ring-4 focus:ring-violet-100"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-2">
            <p className="min-w-0 flex-1 break-words text-xs font-semibold leading-5 text-slate-800">{action.title}</p>
            <PriorityBadge priority={action.priority} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-slate-400">
            <span>#{action.reportId}</span>
            <span>{reportCategory(report)}</span>
            <span>{reportSeverity(report)}</span>
            {action.dueDate && (
              <span className={overdue ? "font-semibold text-rose-600" : "text-slate-500"}>
                <CalendarClock size={10} className="mr-0.5 inline" aria-hidden="true" />
                {overdue ? "Overdue · " : ""}{formatDate(action.dueDate)}
              </span>
            )}
          </div>
          {action.note && <p className="mt-2 whitespace-pre-wrap break-words text-[10px] leading-4 text-slate-500">{action.note}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SelectField label={`Status for ${action.title}`} value={action.status} options={STATUSES} onChange={(value) => onUpdate(action.id, { status: value })} />
            <SelectField label={`Priority for ${action.title}`} value={action.priority} options={PRIORITIES} onChange={(value) => onUpdate(action.id, { priority: value })} />
            {report && (
              <button type="button" onClick={() => onOpenReport?.(report)} className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[9px] font-semibold text-violet-700 hover:bg-violet-50">
                Open report
              </button>
            )}
            <button type="button" onClick={() => onUpdate(action.id, { editing: true })} className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[9px] font-semibold text-slate-500 hover:bg-slate-50">
              <MoreHorizontal size={12} aria-hidden="true" />
              Edit
            </button>
            <button type="button" onClick={() => onDelete(action.id)} aria-label={`Delete ${action.title}`} className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
              <Trash2 size={13} aria-hidden="true" />
            </button>
          </div>
          {action.editing && (
            <div className="mt-3 grid gap-2 rounded-lg border border-violet-100 bg-violet-50/50 p-2.5 sm:grid-cols-[minmax(0,1fr)_150px]">
              <textarea
                defaultValue={action.note}
                maxLength={MAX_NOTE_LENGTH}
                onBlur={(event) => onUpdate(action.id, { note: event.target.value, editing: false })}
                placeholder="Add a private follow-up note…"
                className="min-h-16 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              />
              <div className="space-y-2">
                <label className="grid gap-1 text-[9px] font-semibold text-slate-500">
                  Due date
                  <input
                    type="date"
                    defaultValue={action.dueDate}
                    onBlur={(event) => onUpdate(action.id, { dueDate: event.target.value, editing: false })}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[10px] text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                  />
                </label>
                <button type="button" onClick={() => onUpdate(action.id, { dueDate: "", note: "", editing: false })} className="inline-flex items-center gap-1 text-[9px] font-semibold text-slate-500 hover:text-rose-600">
                  <RotateCcw size={11} aria-hidden="true" />
                  Clear note and due date
                </button>
              </div>
            </div>
          )}
        </div>
        <StatusBadge status={action.status} />
      </div>
    </article>
  );
}

export default function ReportActionQueue({
  reports = [],
  email,
  onOpenReport,
}) {
  const [actions, setActions] = useState([]);
  const [loadedEmail, setLoadedEmail] = useState("");
  const [canPersist, setCanPersist] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [filter, setFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("priority");
  const [sortDirection, setSortDirection] = useState("desc");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState("");
  const normalizedEmail = text(email).toLocaleLowerCase();
  const key = storageKey(normalizedEmail);
  const reportMap = useMemo(() => new Map(reports.map((report) => [reportId(report), report])), [reports]);
  const availableReports = useMemo(() => reports.filter((report) => reportId(report)), [reports]);

  useEffect(() => {
    setActions([]);
    setLoadedEmail("");
    setCanPersist(false);
    setStorageError("");
    setSelectedIds(new Set());
    if (!normalizedEmail) return;
    try {
      const saved = window.localStorage.getItem(storageKey(normalizedEmail));
      setActions(saved ? loadActions(JSON.parse(saved)) : []);
      setCanPersist(true);
    } catch {
      setStorageError("Saved action items could not be read. New changes remain in memory.");
    } finally {
      setLoadedEmail(normalizedEmail);
    }
  }, [normalizedEmail]);

  useEffect(() => {
    if (!canPersist || !key || loadedEmail !== normalizedEmail) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(actions));
      setStorageError("");
    } catch {
      setStorageError("Action changes are only in memory because this browser could not save them.");
    }
  }, [actions, canPersist, key, loadedEmail, normalizedEmail]);

  const counts = useMemo(() => {
    const result = { total: actions.length, todo: 0, doing: 0, done: 0, overdue: 0, high: 0 };
    actions.forEach((action) => {
      result[action.status] += 1;
      if (isOverdue(action)) result.overdue += 1;
      if (action.priority === "high" && action.status !== "done") result.high += 1;
    });
    return result;
  }, [actions]);

  const filteredActions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return actions
      .filter((action) => {
        if (filter === "overdue" ? !isOverdue(action) : filter !== "all" && action.status !== filter) return false;
        if (priorityFilter !== "all" && action.priority !== priorityFilter) return false;
        if (normalizedQuery && !`${action.title} ${action.reportId} ${action.note}`.toLocaleLowerCase().includes(normalizedQuery)) return false;
        return true;
      })
      .sort((left, right) => {
        let result = 0;
        if (sortBy === "priority") result = priorityRank(right.priority) - priorityRank(left.priority);
        else if (sortBy === "due") result = (left.dueDate || "9999-12-31").localeCompare(right.dueDate || "9999-12-31");
        else if (sortBy === "updated") result = String(right.updatedAt).localeCompare(String(left.updatedAt));
        else result = left.title.localeCompare(right.title);
        return sortDirection === "asc" ? -result : result;
      });
  }, [actions, filter, priorityFilter, query, sortBy, sortDirection]);

  const allVisibleSelected = filteredActions.length > 0 && filteredActions.every((action) => selectedIds.has(action.id));
  const selectedVisibleCount = filteredActions.filter((action) => selectedIds.has(action.id)).length;

  const updateAction = (id, patch) => {
    setActions((current) => current.map((action) => action.id === id ? { ...action, ...patch, updatedAt: new Date().toISOString() } : action));
    setNotice("");
  };

  const deleteAction = (id) => {
    setActions((current) => current.filter((action) => action.id !== id));
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };

  const toggleSelection = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleVisibleSelection = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) filteredActions.forEach((action) => next.delete(action.id));
      else filteredActions.forEach((action) => next.add(action.id));
      return next;
    });
  };

  const bulkUpdate = (patch) => {
    setActions((current) => current.map((action) => selectedIds.has(action.id) ? { ...action, ...patch, updatedAt: new Date().toISOString() } : action));
    setSelectedIds(new Set());
    setNotice(`Updated ${formatNumber(selectedVisibleCount)} action${selectedVisibleCount === 1 ? "" : "s"}.`);
  };

  const createForReport = (report, priority = "medium") => {
    const id = reportId(report);
    if (!id) return;
    setActions((current) => {
      const existing = current.find((action) => action.reportId === id && action.status !== "done");
      if (existing) return current;
      return [createAction(report, priority), ...current].slice(0, MAX_ACTIONS);
    });
    setShowCreate(false);
    setNotice(`Added a follow-up for ${reportTitle(report)}.`);
  };

  const createFirst = () => {
    if (availableReports[0]) createForReport(availableReports[0], "medium");
    else setShowCreate(true);
  };

  const clearDone = () => {
    setActions((current) => current.filter((action) => action.status !== "done"));
    setSelectedIds(new Set());
    setNotice("Completed actions were cleared from this browser.");
  };

  const copySummary = async () => {
    const summary = `${counts.todo} to do · ${counts.doing} in progress · ${counts.done} done · ${counts.overdue} overdue`;
    try {
      await navigator.clipboard.writeText(summary);
      setNotice("Queue summary copied.");
    } catch {
      setNotice("Could not copy the summary in this browser.");
    }
  };

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
      <div className="border-b border-slate-200/80 bg-gradient-to-r from-violet-50/80 via-white to-amber-50/60 p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-violet-100 bg-white text-violet-700 shadow-sm"><ListChecks size={19} aria-hidden="true" /></span>
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">Local action queue</span>
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">Report follow-up planner</h2>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">Keep personal next steps beside reports without changing their server status. Actions are private to this browser account.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={copySummary} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-600 hover:border-violet-200 hover:text-violet-700"><Copy size={12} aria-hidden="true" />Copy summary</button>
            <button type="button" onClick={() => exportCsv(filteredActions, reports)} disabled={!filteredActions.length} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-600 hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"><Download size={12} aria-hidden="true" />Export CSV</button>
            <button type="button" onClick={() => setShowCreate((current) => !current)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[10px] font-semibold text-white hover:bg-violet-700"><Target size={12} aria-hidden="true" />Add action</button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          <SummaryCard label="Total" value={counts.total} detail="Personal actions" tone="border-slate-200 bg-white text-slate-800" icon={ListChecks} />
          <SummaryCard label="To do" value={counts.todo} detail="Waiting to start" tone="border-violet-200 bg-violet-50 text-violet-800" icon={CircleDashed} />
          <SummaryCard label="In progress" value={counts.doing} detail="Currently active" tone="border-amber-200 bg-amber-50 text-amber-800" icon={Clock3} />
          <SummaryCard label="Overdue" value={counts.overdue} detail="Needs attention" tone="border-rose-200 bg-rose-50 text-rose-800" icon={ShieldAlert} />
          <SummaryCard label="Done" value={counts.done} detail="Completed locally" tone="border-emerald-200 bg-emerald-50 text-emerald-800" icon={CheckCircle2} />
        </div>
      </div>

      {showCreate && (
        <div className="border-b border-violet-100 bg-violet-50/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <div><p className="text-xs font-semibold text-slate-800">Choose a report for the new action</p><p className="mt-1 text-[10px] text-slate-500">Existing unfinished actions for the same report are not duplicated.</p></div>
            <button type="button" onClick={() => setShowCreate(false)} aria-label="Close action picker" className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700"><X size={14} /></button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {availableReports.slice(0, 12).map((report) => (
              <button key={reportId(report)} type="button" onClick={() => createForReport(report)} className="min-w-0 rounded-xl border border-white bg-white p-3 text-left shadow-sm transition hover:border-violet-300">
                <span className="block truncate text-[10px] font-semibold text-slate-800">{reportTitle(report)}</span>
                <span className="mt-1 block truncate text-[9px] text-slate-400">#{reportId(report)} · {reportSeverity(report)}</span>
              </button>
            ))}
          </div>
          {!availableReports.length && <p className="mt-3 text-[10px] text-slate-500">No reports with usable IDs are loaded yet.</p>}
        </div>
      )}

      <div className="space-y-3 p-4 sm:p-5">
        {storageError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] text-amber-800">{storageError}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[10px] text-emerald-800">{notice}</p>}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="text-xs font-semibold text-slate-800">Find an action</p><p className="mt-1 text-[10px] text-slate-500">Filter your private queue before making bulk changes.</p></div>
            <button type="button" onClick={clearDone} disabled={!counts.done} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-slate-500 hover:bg-white hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={11} aria-hidden="true" />Clear done</button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="relative block sm:col-span-2 lg:col-span-1"><span className="sr-only">Search actions</span><Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, ID, notes…" className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-[10px] text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100" /></label>
            <SelectField label="Action status" value={filter} options={FILTERS} onChange={setFilter} />
            <SelectField label="Action priority" value={priorityFilter} options={[{ value: "all", label: "All priorities" }, ...PRIORITIES]} onChange={setPriorityFilter} />
            <SelectField label="Sort actions" value={sortBy} options={SORTS} onChange={setSortBy} />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
            <span aria-live="polite">Showing {formatNumber(filteredActions.length)} of {formatNumber(actions.length)} actions</span>
            <button type="button" onClick={() => setSortDirection((current) => current === "desc" ? "asc" : "desc")} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-semibold hover:bg-white hover:text-violet-700">{sortDirection === "desc" ? <ArrowDownAZ size={12} /> : <ArrowUpAZ size={12} />} {sortDirection === "desc" ? "Descending" : "Ascending"}</button>
          </div>
        </div>

        {filteredActions.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2.5">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[10px] font-semibold text-slate-700"><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleSelection} className="h-4 w-4 rounded border-slate-300 accent-violet-600" />Select filtered ({formatNumber(filteredActions.length)})</label>
            <div className="flex flex-wrap items-center gap-2"><span className="text-[9px] text-slate-500">{formatNumber(selectedVisibleCount)} selected</span><SelectField label="Bulk action status" value="" options={[{ value: "", label: "Bulk status…" }, ...STATUSES]} onChange={(value) => value && bulkUpdate({ status: value })} /><SelectField label="Bulk action priority" value="" options={[{ value: "", label: "Bulk priority…" }, ...PRIORITIES]} onChange={(value) => value && bulkUpdate({ priority: value })} />{selectedVisibleCount > 0 && <button type="button" onClick={() => setSelectedIds(new Set())} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[9px] font-semibold text-slate-500 hover:bg-white"><X size={11} />Clear</button>}</div>
          </div>
        )}

        {filteredActions.length ? (
          <div className="space-y-2">
            {filteredActions.map((action) => <ActionRow key={action.id} action={action} report={reportMap.get(action.reportId)} selected={selectedIds.has(action.id)} onSelect={toggleSelection} onOpenReport={onOpenReport} onUpdate={updateAction} onDelete={deleteAction} />)}
          </div>
        ) : (
          <EmptyState hasActions={actions.length > 0} onCreate={createFirst} />
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-[9px] text-slate-400 sm:px-5">
        <span className="inline-flex items-center gap-1"><UserRound size={11} aria-hidden="true" />Private to {normalizedEmail || "this browser"}</span>
        <span className="inline-flex items-center gap-1"><Sparkles size={11} aria-hidden="true" />Advisory only · reports are not reopened</span>
      </div>
    </section>
  );
}
