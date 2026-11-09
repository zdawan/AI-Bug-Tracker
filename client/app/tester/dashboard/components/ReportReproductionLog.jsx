"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  Bug,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FilePlus2,
  FilterX,
  FlaskConical,
  Monitor,
  Plus,
  Search,
  ShieldAlert,
  Smartphone,
  Tablet,
  Trash2,
  X,
} from "lucide-react";

const STORAGE_PREFIX = "tester-report-reproduction-log-v1";
const MAX_ATTEMPTS = 200;
const MAX_TEXT = 4000;
const MAX_TITLE = 180;

const OUTCOMES = [
  {
    id: "reproduced",
    label: "Reproduced",
    icon: CheckCircle2,
    tone: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
  },
  {
    id: "not-reproduced",
    label: "Not reproduced",
    icon: Check,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  {
    id: "intermittent",
    label: "Intermittent",
    icon: CircleDashed,
    tone: "border-amber-200 bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
  },
  {
    id: "blocked",
    label: "Blocked",
    icon: AlertCircle,
    tone: "border-sky-200 bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
  },
  {
    id: "needs-info",
    label: "Needs more information",
    icon: ShieldAlert,
    tone: "border-violet-200 bg-violet-50 text-violet-700",
    dot: "bg-violet-500",
  },
];

const DEVICE_OPTIONS = ["Desktop", "Laptop", "Tablet", "Mobile", "Other"];
const MAX_ACTIVITY = 100;

function getText(value, limit = 500) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getTimestamp(value) {
  if (typeof value !== "string" || !value) return "";
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
}

function getStorageKey(email) {
  return `${STORAGE_PREFIX}:${encodeURIComponent(getText(email, 240).toLowerCase())}`;
}

function getReportId(report) {
  const value = report?._id ?? report?.id;
  return value === null || value === undefined ? "" : String(value).trim();
}

function getReportTitle(report) {
  return getText(report?.title, MAX_TITLE) ||
    getText(report?.summary, MAX_TITLE) ||
    "Untitled report";
}

function getOutcome(id) {
  return OUTCOMES.find((outcome) => outcome.id === id) || OUTCOMES[4];
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

function normalizeAttempt(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const outcome = OUTCOMES.some((item) => item.id === value.outcome)
    ? value.outcome
    : "needs-info";
  return {
    id: getText(value.id, 100) || makeId(),
    reportId: getText(value.reportId, 120),
    reportTitle: getText(value.reportTitle, MAX_TITLE),
    title: getText(value.title, MAX_TITLE) || "Untitled reproduction attempt",
    outcome,
    environment: getText(value.environment, 180),
    browser: getText(value.browser, 100),
    browserVersion: getText(value.browserVersion, 80),
    platform: getText(value.platform, 120),
    device: DEVICE_OPTIONS.includes(value.device) ? value.device : "Desktop",
    build: getText(value.build, 100),
    steps: getText(value.steps, MAX_TEXT),
    expected: getText(value.expected, MAX_TEXT),
    actual: getText(value.actual, MAX_TEXT),
    evidenceUrl: getText(value.evidenceUrl, 1000),
    notes: getText(value.notes, MAX_TEXT),
    createdAt: getTimestamp(value.createdAt) || new Date().toISOString(),
    updatedAt: getTimestamp(value.updatedAt) || new Date().toISOString(),
  };
}

function normalizeState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const attempts = Array.isArray(value.attempts)
    ? value.attempts.slice(0, MAX_ATTEMPTS).map(normalizeAttempt).filter(Boolean)
    : [];
  return {
    version: 1,
    attempts,
    activity: Array.isArray(value.activity)
      ? value.activity.slice(-MAX_ACTIVITY).map(normalizeActivity).filter(Boolean)
      : [],
  };
}

function appendActivity(state, message) {
  return [
    ...state.activity,
    { id: makeId(), message: getText(message, 240), createdAt: new Date().toISOString() },
  ].slice(-MAX_ACTIVITY);
}

function csvEscape(value) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function safeFilename(value) {
  return getText(value, 80).replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") ||
    "reproduction-log";
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusBadge({ outcome }) {
  const state = getOutcome(outcome);
  const Icon = state.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${state.tone}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {state.label}
    </span>
  );
}

function Metric({ label, value, tone = "slate" }) {
  const styles = {
    slate: "border-slate-200 bg-white text-slate-900",
    rose: "border-rose-200 bg-rose-50/60 text-rose-900",
    emerald: "border-emerald-200 bg-emerald-50/60 text-emerald-900",
    amber: "border-amber-200 bg-amber-50/60 text-amber-900",
    sky: "border-sky-200 bg-sky-50/60 text-sky-900",
  };
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${styles[tone]}`}>
      <p className="text-[10px] font-medium opacity-70">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function AttemptCard({ attempt, report, expanded, onToggle, onEdit, onDelete, onOpenReport }) {
  const DeviceIcon = attempt.device === "Mobile"
    ? Smartphone
    : attempt.device === "Tablet"
      ? Tablet
      : Monitor;
  const reportAvailable = Boolean(report && onOpenReport);
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge outcome={attempt.outcome} />
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
              <DeviceIcon className="h-3 w-3" aria-hidden="true" />
              {attempt.environment || attempt.device}
            </span>
            <time className="text-[10px] text-slate-400">{formatDate(attempt.updatedAt)}</time>
          </div>
          <h4 className="mt-2 truncate text-sm font-semibold text-slate-900">{attempt.title}</h4>
          <p className="mt-1 truncate text-[11px] text-slate-500">
            {attempt.reportTitle || "Unlinked report"}{attempt.build ? ` · Build ${attempt.build}` : ""}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {reportAvailable ? (
            <button type="button" onClick={() => onOpenReport(report)} aria-label={`Open report: ${attempt.reportTitle}`} className="rounded-lg p-2 text-sky-700 hover:bg-sky-50">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
          <button type="button" onClick={onEdit} aria-label={`Edit attempt: ${attempt.title}`} className="rounded-lg px-2 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100">Edit</button>
          <button type="button" onClick={onDelete} aria-label={`Delete attempt: ${attempt.title}`} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={onToggle} aria-label={expanded ? "Collapse attempt details" : "Expand attempt details"} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
        </div>
      </div>
      {expanded ? (
        <div className="grid gap-3 border-t border-slate-100 bg-slate-50/50 p-3 sm:grid-cols-2">
          <Detail label="Environment" value={[
            attempt.browser,
            attempt.browserVersion,
            attempt.platform,
            attempt.device,
          ].filter(Boolean).join(" · ") || "Not specified"} />
          <Detail label="Last updated" value={formatDate(attempt.updatedAt)} />
          <Detail label="Reproduction steps" value={attempt.steps} />
          <Detail label="Expected result" value={attempt.expected} />
          <Detail label="Actual result" value={attempt.actual} />
          <Detail label="Additional notes" value={attempt.notes} />
          {attempt.evidenceUrl && validHttpUrl(attempt.evidenceUrl) ? (
            <a href={attempt.evidenceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline">
              Open evidence <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function Detail({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200/80 bg-white p-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">{value || "Not recorded"}</p>
    </div>
  );
}

function AttemptForm({
  reports,
  values,
  onChange,
  onSubmit,
  onCancel,
  editing,
}) {
  const field = (name, value) => (event) => onChange(name, event.target.value);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="rounded-xl border border-sky-200 bg-sky-50/40 p-3 sm:p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{editing ? "Edit reproduction attempt" : "Log a reproduction attempt"}</h3>
          <p className="mt-1 text-[10px] text-slate-500">Saved only in this browser under the signed-in tester account.</p>
        </div>
        <button type="button" onClick={onCancel} aria-label="Close reproduction form" className="rounded-lg p-1.5 text-slate-500 hover:bg-white">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-[10px] font-semibold text-slate-600 sm:col-span-2">Attempt title *
          <input required value={values.title} onChange={field("title")} maxLength={MAX_TITLE} placeholder="e.g. Recheck checkout failure on clean profile" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal" />
        </label>
        <label className="text-[10px] font-semibold text-slate-600 sm:col-span-2">Related report
          <select value={values.reportId} onChange={field("reportId")} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal">
            <option value="">No linked report</option>
            {values.reportId && !reports.some((report) => getReportId(report) === values.reportId) ? (
              <option value={values.reportId}>{values.reportTitle || "Saved report reference unavailable"}</option>
            ) : null}
            {reports.map((report) => {
              const id = getReportId(report);
              return id ? <option key={id} value={id}>{getReportTitle(report)}</option> : null;
            })}
          </select>
        </label>
        <label className="text-[10px] font-semibold text-slate-600">Outcome
          <select value={values.outcome} onChange={field("outcome")} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal">
            {OUTCOMES.map((outcome) => <option key={outcome.id} value={outcome.id}>{outcome.label}</option>)}
          </select>
        </label>
        <label className="text-[10px] font-semibold text-slate-600">Device class
          <select value={values.device} onChange={field("device")} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal">
            {DEVICE_OPTIONS.map((device) => <option key={device}>{device}</option>)}
          </select>
        </label>
        <label className="text-[10px] font-semibold text-slate-600">Environment label
          <input value={values.environment} onChange={field("environment")} maxLength={180} placeholder="Staging / clean profile" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal" />
        </label>
        <label className="text-[10px] font-semibold text-slate-600">Browser
          <input value={values.browser} onChange={field("browser")} maxLength={100} placeholder="Chrome" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal" />
        </label>
        <label className="text-[10px] font-semibold text-slate-600">Browser version
          <input value={values.browserVersion} onChange={field("browserVersion")} maxLength={80} placeholder="Latest / 126" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal" />
        </label>
        <label className="text-[10px] font-semibold text-slate-600">Platform / OS
          <input value={values.platform} onChange={field("platform")} maxLength={120} placeholder="Windows 11" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal" />
        </label>
        <label className="text-[10px] font-semibold text-slate-600">Build
          <input value={values.build} onChange={field("build")} maxLength={100} placeholder="Build or release ID" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal" />
        </label>
        <label className="text-[10px] font-semibold text-slate-600 sm:col-span-2">Evidence URL
          <input value={values.evidenceUrl} onChange={field("evidenceUrl")} maxLength={1000} placeholder="https://..." className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal" />
          {values.evidenceUrl && !validHttpUrl(values.evidenceUrl) ? <span className="mt-1 block font-normal text-rose-600">Use an http:// or https:// URL.</span> : null}
        </label>
        <label className="text-[10px] font-semibold text-slate-600 sm:col-span-2 xl:col-span-4">Reproduction steps *
          <textarea required value={values.steps} onChange={field("steps")} maxLength={MAX_TEXT} rows={3} placeholder={"1. Open the affected page\n2. Enter the test data\n3. Submit the form"} className="mt-1 block w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal" />
        </label>
        <label className="text-[10px] font-semibold text-slate-600 sm:col-span-2">Expected result
          <textarea value={values.expected} onChange={field("expected")} maxLength={MAX_TEXT} rows={2} placeholder="What should happen?" className="mt-1 block w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal" />
        </label>
        <label className="text-[10px] font-semibold text-slate-600 sm:col-span-2">Actual result
          <textarea value={values.actual} onChange={field("actual")} maxLength={MAX_TEXT} rows={2} placeholder="What happened during this attempt?" className="mt-1 block w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal" />
        </label>
        <label className="text-[10px] font-semibold text-slate-600 sm:col-span-2 xl:col-span-4">Additional notes
          <textarea value={values.notes} onChange={field("notes")} maxLength={MAX_TEXT} rows={2} placeholder="Test data, configuration, or anything needed to interpret the result." className="mt-1 block w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal" />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white">Cancel</button>
        <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-sky-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-900">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          {editing ? "Save attempt" : "Save reproduction attempt"}
        </button>
      </div>
    </form>
  );
}

function createEmptyForm() {
  return {
    reportId: "",
    reportTitle: "",
    title: "",
    outcome: "reproduced",
    environment: "",
    browser: "",
    browserVersion: "",
    platform: "",
    device: "Desktop",
    build: "",
    steps: "",
    expected: "",
    actual: "",
    evidenceUrl: "",
    notes: "",
  };
}

export default function ReportReproductionLog({ reports = [], email, onOpenReport }) {
  const [state, setState] = useState({ version: 1, attempts: [], activity: [] });
  const [loadedEmail, setLoadedEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(createEmptyForm);
  const [expandedIds, setExpandedIds] = useState({});
  const [copyState, setCopyState] = useState("");
  const requestedEmail = getText(email, 240).toLowerCase();

  const reportById = useMemo(() => {
    const map = new Map();
    reports.forEach((report) => {
      const id = getReportId(report);
      if (id) map.set(id, report);
    });
    return map;
  }, [reports]);
  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...[
        ...new Set(
          reports.map((report) => getText(report?.category, 120) || "Uncategorized"),
        ),
      ]
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ value, label: value })),
    ],
    [reports],
  );

  const filteredAttempts = useMemo(() => {
    const search = getText(query, 200).toLowerCase();
    return [...state.attempts]
      .filter((attempt) => outcomeFilter === "all" || attempt.outcome === outcomeFilter)
      .filter((attempt) => {
        if (categoryFilter === "all") return true;
        const report = reportById.get(attempt.reportId);
        return (
          getText(report?.category, 120) || "Uncategorized"
        ) === categoryFilter;
      })
      .filter((attempt) => !search || [
        attempt.title,
        attempt.reportTitle,
        attempt.environment,
        attempt.browser,
        attempt.platform,
        attempt.build,
        attempt.steps,
        attempt.expected,
        attempt.actual,
        attempt.notes,
      ].some((value) => value.toLowerCase().includes(search)))
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  }, [categoryFilter, query, outcomeFilter, reportById, state.attempts]);

  const outcomeCounts = useMemo(
    () => OUTCOMES.reduce((counts, outcome) => ({
      ...counts,
      [outcome.id]: state.attempts.filter((attempt) => attempt.outcome === outcome.id).length,
    }), {}),
    [state.attempts],
  );

  useEffect(() => {
    const account = getText(email, 240).toLowerCase();
    setLoading(true);
    setLoadError("");
    setMessage("");
    setState({ version: 1, attempts: [], activity: [] });
    setLoadedEmail("");
    if (!account) {
      setLoadError("A signed-in tester account is required to load reproduction attempts.");
      setLoading(false);
      return;
    }
    try {
      const raw = window.localStorage.getItem(getStorageKey(account));
      const parsed = raw ? JSON.parse(raw) : {};
      if (raw && (!parsed || typeof parsed !== "object" || Array.isArray(parsed))) {
        throw new TypeError("Saved reproduction log data has an invalid shape.");
      }
      setState(normalizeState(parsed) || { version: 1, attempts: [], activity: [] });
      setLoadedEmail(account);
    } catch (error) {
      setLoadError(
        error instanceof SyntaxError
          ? "Saved reproduction log data is invalid JSON. Existing browser data was left untouched."
          : `Reproduction log data could not be loaded: ${error.message}`,
      );
    } finally {
      setLoading(false);
    }
  }, [email]);

  const persist = (nextState) => {
    if (loadError) {
      setMessage("Cannot overwrite local storage after a load error. Resolve the storage issue first.");
      return false;
    }
    if (!requestedEmail || loadedEmail !== requestedEmail) {
      setMessage("Wait for this account's reproduction log to load before editing.");
      return false;
    }
    if (nextState.attempts.length > MAX_ATTEMPTS) {
      setMessage(`Keep at most ${MAX_ATTEMPTS} reproduction attempts in this browser.`);
      return false;
    }
    try {
      const normalized = normalizeState(nextState);
      window.localStorage.setItem(getStorageKey(loadedEmail), JSON.stringify(normalized));
      setState(normalized);
      setMessage("Reproduction log saved in this browser.");
      return true;
    } catch (error) {
      setMessage(`Could not save reproduction log: ${error.message}`);
      return false;
    }
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openNewForm = () => {
    setEditingId("");
    setForm(createEmptyForm());
    setFormOpen(true);
    setMessage("");
  };

  const cancelForm = () => {
    setFormOpen(false);
    setEditingId("");
    setForm(createEmptyForm());
  };

  const editAttempt = (attempt) => {
    setEditingId(attempt.id);
    setForm({
      reportId: attempt.reportId,
      reportTitle: attempt.reportTitle,
      title: attempt.title,
      outcome: attempt.outcome,
      environment: attempt.environment,
      browser: attempt.browser,
      browserVersion: attempt.browserVersion,
      platform: attempt.platform,
      device: attempt.device,
      build: attempt.build,
      steps: attempt.steps,
      expected: attempt.expected,
      actual: attempt.actual,
      evidenceUrl: attempt.evidenceUrl,
      notes: attempt.notes,
    });
    setFormOpen(true);
    setMessage("");
  };

  const saveAttempt = () => {
    const title = getText(form.title, MAX_TITLE);
    const steps = getText(form.steps, MAX_TEXT);
    if (!title || !steps) {
      setMessage("Add an attempt title and reproduction steps before saving.");
      return;
    }
    if (form.evidenceUrl && !validHttpUrl(getText(form.evidenceUrl, 1000))) {
      setMessage("Evidence URL must be empty or a valid http:// or https:// link.");
      return;
    }
    const report = reportById.get(form.reportId);
    const previous = state.attempts.find((attempt) => attempt.id === editingId);
    if (editingId && !previous) {
      setMessage("This reproduction attempt is no longer available.");
      return;
    }
    const now = new Date().toISOString();
    const attempt = normalizeAttempt({
      ...form,
      id: previous?.id || makeId(),
      reportId: form.reportId,
      reportTitle: report ? getReportTitle(report) : form.reportId ? form.reportTitle : "",
      title,
      steps,
      createdAt: previous?.createdAt || now,
      updatedAt: now,
    });
    const nextAttempts = previous
      ? state.attempts.map((item) => item.id === editingId ? attempt : item)
      : [attempt, ...state.attempts];
    if (persist({
      ...state,
      attempts: nextAttempts,
      activity: appendActivity(
        state,
        previous
          ? `Updated reproduction attempt: ${attempt.title}`
          : `Logged reproduction attempt: ${attempt.title}`,
      ),
    })) {
      cancelForm();
    }
  };

  const deleteAttempt = (attempt) => {
    if (!window.confirm(`Delete the reproduction attempt "${attempt.title}"? This cannot be undone.`)) return;
    if (persist({
      ...state,
      attempts: state.attempts.filter((item) => item.id !== attempt.id),
      activity: appendActivity(state, `Deleted reproduction attempt: ${attempt.title}`),
    })) {
      setExpandedIds((current) => {
        const next = { ...current };
        delete next[attempt.id];
        return next;
      });
    }
  };

  const duplicateAttempt = (attempt) => {
    if (state.attempts.length >= MAX_ATTEMPTS) {
      setMessage(`A reproduction log can contain at most ${MAX_ATTEMPTS} attempts.`);
      return;
    }
    const now = new Date().toISOString();
    const duplicate = normalizeAttempt({
      ...attempt,
      id: makeId(),
      title: `${attempt.title} (copy)`.slice(0, MAX_TITLE),
      outcome: "needs-info",
      actual: "",
      notes: "",
      createdAt: now,
      updatedAt: now,
    });
    persist({
      ...state,
      attempts: [duplicate, ...state.attempts],
      activity: appendActivity(state, `Duplicated reproduction attempt: ${duplicate.title}`),
    });
  };

  const exportCsv = () => {
    const columns = [
      "Attempt ID",
      "Attempt title",
      "Report ID",
      "Report title",
      "Outcome",
      "Environment",
      "Browser",
      "Browser version",
      "Platform",
      "Device",
      "Build",
      "Reproduction steps",
      "Expected result",
      "Actual result",
      "Evidence URL",
      "Additional notes",
      "Created at",
      "Updated at",
    ];
    const rows = filteredAttempts.map((attempt) => [
      attempt.id,
      attempt.title,
      attempt.reportId,
      attempt.reportTitle,
      getOutcome(attempt.outcome).label,
      attempt.environment,
      attempt.browser,
      attempt.browserVersion,
      attempt.platform,
      attempt.device,
      attempt.build,
      attempt.steps,
      attempt.expected,
      attempt.actual,
      attempt.evidenceUrl,
      attempt.notes,
      attempt.createdAt,
      attempt.updatedAt,
    ]);
    const metadata = [
      ["Browser-local report reproduction log"],
      ["Generated", new Date().toLocaleString("en-IN")],
      ["Tester account", loadedEmail],
      ["Outcome filter", outcomeFilter],
      ["Category filter", categoryFilter],
      ["Search", query || "None"],
      ["Exported attempts", filteredAttempts.length],
      [],
    ];
    const csv = [...metadata, columns, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\r\n");
    downloadFile("report-reproduction-log.csv", `\uFEFF${csv}`, "text/csv;charset=utf-8");
    setMessage(`Exported ${filteredAttempts.length} reproduction attempt(s) as CSV.`);
  };

  const exportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      account: loadedEmail,
      scope: "Browser-local reproduction observations. This export does not modify server reports.",
      filters: { query, outcome: outcomeFilter, category: categoryFilter },
      attempts: filteredAttempts,
      activity: state.activity,
    };
    downloadFile(
      "report-reproduction-log.json",
      JSON.stringify(payload, null, 2),
      "application/json;charset=utf-8",
    );
    setMessage(`Exported ${filteredAttempts.length} reproduction attempt(s) as JSON.`);
  };

  const copySummary = async () => {
    const lines = [
      `Reproduction attempts (${filteredAttempts.length})`,
      ...filteredAttempts.slice(0, 30).map((attempt) =>
        `- ${getOutcome(attempt.outcome).label}: ${attempt.title} | ${attempt.reportTitle || "Unlinked report"} | ${attempt.environment || attempt.device}`,
      ),
    ];
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable in this browser.");
      }
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyState("copied");
      window.setTimeout(() => setCopyState(""), 2000);
    } catch (error) {
      setCopyState("");
      setMessage(`Could not copy the summary: ${error.message}`);
    }
  };

  if (loading || (requestedEmail && loadedEmail !== requestedEmail && !loadError)) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5" aria-busy="true">
        <div className="h-5 w-64 animate-pulse rounded bg-slate-100" />
        <p className="mt-3 text-xs text-slate-500">Loading browser-local reproduction attempts…</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
      <header className="border-b border-slate-200 bg-gradient-to-br from-sky-50 via-white to-violet-50/50 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-sky-100 bg-white text-sky-700">
              <FlaskConical className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-800">Reproduction workflow</p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-950">Report reproduction log</h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">
                Record how a report behaves across attempts, environments, and builds. These notes are local to this browser and never change server reports.
              </p>
            </div>
          </div>
          <button type="button" onClick={openNewForm} disabled={Boolean(loadError) || state.attempts.length >= MAX_ATTEMPTS} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-sky-800 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-50">
            <FilePlus2 className="h-4 w-4" aria-hidden="true" /> Log attempt
          </button>
        </div>
        <p className="mt-3 text-[10px] text-slate-500">{state.attempts.length}/{MAX_ATTEMPTS} saved attempts · Account-scoped browser storage</p>
      </header>

      <div className="space-y-4 p-3 sm:p-4">
        {loadError ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800">
            <strong className="block">Reproduction log could not be loaded</strong>
            <span className="mt-1 block">{loadError}</span>
          </div>
        ) : null}
        {message ? (
          <div role="status" aria-live="polite" className="flex items-start justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2.5 text-xs text-sky-800">
            <span>{message}</span>
            <button type="button" onClick={() => setMessage("")} aria-label="Dismiss message" className="rounded p-0.5 hover:bg-sky-100">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : null}
        {formOpen && !loadError ? (
          <AttemptForm
            reports={reports}
            values={form}
            editing={Boolean(editingId)}
            onChange={updateForm}
            onSubmit={saveAttempt}
            onCancel={cancelForm}
          />
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {OUTCOMES.map((outcome) => (
            <Metric
              key={outcome.id}
              label={outcome.label}
              value={outcomeCounts[outcome.id] || 0}
              tone={outcome.id === "reproduced" ? "rose" : outcome.id === "not-reproduced" ? "emerald" : outcome.id === "intermittent" ? "amber" : outcome.id === "blocked" ? "sky" : "slate"}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 lg:flex-row lg:flex-wrap lg:items-center">
          <label className="relative min-w-0 flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, report, environment, or notes" className="h-9 w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2.5 text-[11px] outline-none focus:border-sky-400" />
          </label>
          <label className="sr-only" htmlFor="reproduction-outcome-filter">Filter attempts by outcome</label>
          <select id="reproduction-outcome-filter" value={outcomeFilter} onChange={(event) => setOutcomeFilter(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-600">
            <option value="all">All outcomes ({state.attempts.length})</option>
            {OUTCOMES.map((outcome) => (
              <option key={outcome.id} value={outcome.id}>{outcome.label} ({outcomeCounts[outcome.id] || 0})</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="reproduction-category-filter">Filter attempts by category</label>
          <select id="reproduction-category-filter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-600">
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {(query || outcomeFilter !== "all" || categoryFilter !== "all") ? (
            <button type="button" onClick={() => { setQuery(""); setOutcomeFilter("all"); setCategoryFilter("all"); }} className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[10px] font-semibold text-slate-500 hover:bg-white hover:text-sky-700">
              <FilterX className="h-3.5 w-3.5" aria-hidden="true" /> Reset
            </button>
          ) : null}
          <div className="flex flex-wrap gap-1.5 lg:ml-auto">
            <button type="button" onClick={copySummary} disabled={!filteredAttempts.length} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-600 hover:border-sky-200 hover:text-sky-700 disabled:opacity-45">
              {copyState === "copied" ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              {copyState === "copied" ? "Copied" : "Copy summary"}
            </button>
            <button type="button" onClick={exportCsv} disabled={!filteredAttempts.length} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-600 hover:border-sky-200 hover:text-sky-700 disabled:opacity-45">
              <Download className="h-3.5 w-3.5" aria-hidden="true" /> CSV
            </button>
            <button type="button" onClick={exportJson} disabled={!filteredAttempts.length} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-semibold text-slate-600 hover:border-sky-200 hover:text-sky-700 disabled:opacity-45">
              <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" /> JSON
            </button>
          </div>
        </div>

        <p className="text-[10px] text-slate-500" aria-live="polite">
          Showing {filteredAttempts.length} of {state.attempts.length} reproduction attempts, newest first.
        </p>
        {filteredAttempts.length ? (
          <div className="space-y-2">
            {filteredAttempts.map((attempt) => (
              <AttemptCard
                key={attempt.id}
                attempt={attempt}
                report={reportById.get(attempt.reportId)}
                expanded={Boolean(expandedIds[attempt.id])}
                onToggle={() => setExpandedIds((current) => ({ ...current, [attempt.id]: !current[attempt.id] }))}
                onEdit={() => editAttempt(attempt)}
                onDelete={() => deleteAttempt(attempt)}
                onOpenReport={onOpenReport}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <Bug className="mx-auto h-7 w-7 text-slate-400" aria-hidden="true" />
            <h3 className="mt-2 text-sm font-semibold text-slate-800">{state.attempts.length ? "No attempts match this view" : "No reproduction attempts yet"}</h3>
            <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-500">
              {state.attempts.length ? "Clear the search or outcome filter to see other saved attempts." : "Log an attempt with clear steps, environment details, and an observed outcome to build a useful reproduction history."}
            </p>
            {state.attempts.length ? (
              <button type="button" onClick={() => { setQuery(""); setOutcomeFilter("all"); }} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                <FilterX className="h-3.5 w-3.5" aria-hidden="true" /> Clear filters
              </button>
            ) : null}
          </div>
        )}

        {state.activity.length ? (
          <details className="rounded-xl border border-slate-200 bg-white">
            <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-slate-700">
              Recent local activity ({state.activity.length})
            </summary>
            <ol className="space-y-2 border-t border-slate-100 px-3 py-3">
              {[...state.activity].reverse().slice(0, 10).map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 text-[10px]">
                  <span className="min-w-0 flex-1 text-slate-600">{entry.message}</span>
                  <time className="text-slate-400">{formatDate(entry.createdAt)}</time>
                </li>
              ))}
            </ol>
          </details>
        ) : null}
        <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/50 px-3 py-2.5">
          <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-700" aria-hidden="true" />
          <p className="text-[10px] leading-5 text-sky-800">
            Attempts are observations, not proof that a defect is fixed or present in every environment. Keep test data safe and avoid putting credentials or secrets in notes.
          </p>
        </div>
      </div>
    </section>
  );
}
