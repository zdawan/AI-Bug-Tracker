"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  CheckCircle2,
  CircleDashed,
  Download,
  ExternalLink,
  FilePlus2,
  FilterX,
  Globe2,
  Layers3,
  Monitor,
  Plus,
  Search,
  ShieldAlert,
  Smartphone,
  Tablet,
  Trash2,
  X,
} from "lucide-react";

const STORAGE_PREFIX = "tester-browser-coverage-matrices-v1";
const MAX_MATRICES = 30;
const MAX_ENVIRONMENTS = 30;
const MAX_CHECKS = 100;
const MAX_RESULTS = 3000;
const MAX_TEXT = 1000;

const RESULT_STATES = [
  { id: "pending", label: "Not run", short: "Pending", icon: CircleDashed, tone: "border-slate-200 bg-slate-50 text-slate-600", dot: "bg-slate-300" },
  { id: "pass", label: "Passed", short: "Pass", icon: CheckCircle2, tone: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  { id: "issue", label: "Issue found", short: "Issue", icon: ShieldAlert, tone: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  { id: "blocked", label: "Blocked", short: "Blocked", icon: AlertCircle, tone: "border-amber-200 bg-amber-50 text-amber-800", dot: "bg-amber-400" },
  { id: "na", label: "Not applicable", short: "N/A", icon: X, tone: "border-violet-200 bg-violet-50 text-violet-700", dot: "bg-violet-400" },
];

const MATRIX_STATES = {
  draft: { label: "Draft", tone: "border-slate-200 bg-slate-50 text-slate-600" },
  active: { label: "In progress", tone: "border-sky-200 bg-sky-50 text-sky-700" },
  review: { label: "Ready for review", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  complete: { label: "Complete", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
};

const RESULT_FILTERS = [
  { id: "all", label: "All results" },
  { id: "pending", label: "Not run" },
  { id: "pass", label: "Passed" },
  { id: "issue", label: "Issues" },
  { id: "blocked", label: "Blocked" },
  { id: "na", label: "Not applicable" },
];

const DEVICE_OPTIONS = ["Desktop", "Laptop", "Tablet", "Mobile", "Other"];
const VIEWPORT_OPTIONS = [
  "Wide desktop",
  "Desktop",
  "Small laptop",
  "Tablet portrait",
  "Tablet landscape",
  "Mobile",
  "Custom",
];

const STARTER_CHECKS = [
  ["Application loads and primary content is visible", "Availability", "Critical"],
  ["Sign-in or primary entry flow completes", "Core workflow", "Critical"],
  ["Primary navigation and back navigation work", "Navigation", "High"],
  ["Main task can be completed using representative data", "Core workflow", "Critical"],
  ["Forms validate input and show recoverable errors", "Forms", "High"],
  ["Layout remains usable at this viewport", "Responsive layout", "High"],
  ["Important controls remain reachable and operable", "Interaction", "High"],
  ["Text, icons, and status remain readable", "Visual clarity", "Medium"],
  ["Loading, empty, and error states render correctly", "State handling", "Medium"],
  ["No unexpected runtime errors during the primary path", "Stability", "Medium"],
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

function getStorageKey(email) {
  return `${STORAGE_PREFIX}:${encodeURIComponent(getText(email, 240).toLowerCase())}`;
}

function resultState(value) {
  return RESULT_STATES.find((state) => state.id === value) || RESULT_STATES[0];
}

function normalizeEnvironment(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const name = getText(value.name, 140);
  if (!name) return null;
  return {
    id: getText(value.id, 100) || makeId(),
    name,
    browser: getText(value.browser, 100),
    version: getText(value.version, 80),
    platform: getText(value.platform, 120),
    device: DEVICE_OPTIONS.includes(value.device) ? value.device : "Desktop",
    viewport: getText(value.viewport, 100),
    viewportPreset: VIEWPORT_OPTIONS.includes(value.viewportPreset) ? value.viewportPreset : "Custom",
    notes: getText(value.notes, 500),
  };
}

function normalizeCheck(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return {
    id: getText(value.id, 100) || makeId(),
    title: getText(value.title, 180) || "Untitled check",
    area: getText(value.area, 100) || "General",
    priority: ["Critical", "High", "Medium", "Low"].includes(value.priority) ? value.priority : "Medium",
    expected: getText(value.expected, 600),
    custom: Boolean(value.custom),
  };
}

function normalizeResult(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const states = RESULT_STATES.map((state) => state.id);
  return {
    status: states.includes(value.status) ? value.status : "pending",
    notes: getText(value.notes, MAX_TEXT),
    evidenceUrl: getText(value.evidenceUrl, 1000),
    reportId: getText(value.reportId, 120),
    updatedAt: getTimestamp(value.updatedAt),
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

function normalizeMatrix(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const environments = Array.isArray(value.environments)
    ? value.environments.slice(0, MAX_ENVIRONMENTS).map(normalizeEnvironment).filter(Boolean)
    : [];
  const checks = Array.isArray(value.checks)
    ? value.checks.slice(0, MAX_CHECKS).map(normalizeCheck).filter(Boolean)
    : [];
  const results = {};
  if (value.results && typeof value.results === "object" && !Array.isArray(value.results)) {
    Object.entries(value.results).slice(0, MAX_RESULTS).forEach(([key, result]) => {
      const normalized = normalizeResult(result);
      if (normalized && key.length <= 220) results[key] = normalized;
    });
  }
  return {
    id: getText(value.id, 100) || makeId(),
    name: getText(value.name, 180) || "Untitled browser matrix",
    build: getText(value.build, 100),
    targetUrl: getText(value.targetUrl, 1000),
    notes: getText(value.notes, MAX_TEXT),
    status: Object.hasOwn(MATRIX_STATES, value.status) ? value.status : "draft",
    environments,
    checks,
    results,
    activity: Array.isArray(value.activity)
      ? value.activity.slice(-100).map(normalizeActivity).filter(Boolean)
      : [],
    createdAt: getTimestamp(value.createdAt) || new Date().toISOString(),
    updatedAt: getTimestamp(value.updatedAt) || new Date().toISOString(),
    completedAt: getTimestamp(value.completedAt),
  };
}

function normalizeMatrices(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_MATRICES).map(normalizeMatrix).filter(Boolean);
}

function resultKey(environmentId, checkId) {
  return `${environmentId}:${checkId}`;
}

function getResult(matrix, environmentId, checkId) {
  return matrix.results[resultKey(environmentId, checkId)] || {
    status: "pending",
    notes: "",
    evidenceUrl: "",
    reportId: "",
    updatedAt: "",
  };
}

function getReportId(report) {
  const id = report?._id ?? report?.id;
  return id === null || id === undefined ? "" : String(id).trim();
}

function getReportTitle(report) {
  return getText(report?.title, 180) || getText(report?.summary, 180) || "Untitled report";
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function safeFilename(value) {
  return getText(value, 120).replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "browser-coverage";
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

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function appendActivity(matrix, message) {
  return [
    ...matrix.activity,
    { id: makeId(), message: getText(message, 240), createdAt: new Date().toISOString() },
  ].slice(-100);
}

function getMetrics(matrix) {
  const counts = RESULT_STATES.reduce(
    (result, state) => ({ ...result, [state.id]: 0 }),
    {},
  );
  const total = matrix.environments.length * matrix.checks.length;
  matrix.environments.forEach((environment) => {
    matrix.checks.forEach((check) => {
      const result = resultState(getResult(matrix, environment.id, check.id).status);
      counts[result.id] += 1;
    });
  });
  const executed = total - counts.pending;
  const applicable = total - counts.pending - counts.na;
  const passRate = applicable > 0 ? Math.round((counts.pass / applicable) * 100) : 0;
  const coverage = total ? Math.round((executed / total) * 100) : 0;
  const criticalIssues = matrix.environments.reduce((sum, environment) =>
    sum + matrix.checks.filter((check) =>
      check.priority === "Critical" &&
      getResult(matrix, environment.id, check.id).status === "issue",
    ).length, 0);
  return {
    ...counts,
    total,
    executed,
    applicable,
    passRate,
    coverage,
    criticalIssues,
    environments: matrix.environments.length,
    checks: matrix.checks.length,
    openIssues: counts.issue,
  };
}

function newMatrix(name, targetUrl, build) {
  const now = new Date().toISOString();
  const checks = STARTER_CHECKS.map(([title, area, priority]) => normalizeCheck({
    id: makeId(),
    title,
    area,
    priority,
    expected: "",
  }));
  return normalizeMatrix({
    id: makeId(),
    name: getText(name, 180),
    targetUrl: getText(targetUrl, 1000),
    build: getText(build, 100),
    notes: "",
    status: "draft",
    environments: [],
    checks,
    results: {},
    activity: [{ id: makeId(), message: "Created browser coverage matrix with starter checks", createdAt: now }],
    createdAt: now,
    updatedAt: now,
  });
}

function StatusBadge({ status }) {
  const state = MATRIX_STATES[status] || MATRIX_STATES.draft;
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

function EmptyState({ title, description, icon: Icon = Globe2 }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-9 text-center">
      <Icon className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>
    </div>
  );
}

function MatrixListItem({ matrix, selected, onSelect, onDelete }) {
  const metrics = getMetrics(matrix);
  return (
    <article className={`rounded-2xl border p-3 transition ${selected ? "border-sky-300 bg-sky-50/70 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}>
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-sm font-semibold text-slate-900">{matrix.name}</span>
          <StatusBadge status={matrix.status} />
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">{[matrix.build && `Build ${matrix.build}`, matrix.targetUrl].filter(Boolean).join(" · ") || "No build or target URL"}</p>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>{metrics.coverage}% checked · {metrics.openIssues} issues</span>
          <span>{metrics.environments} env.</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-label={`${metrics.coverage}% of matrix results recorded`}>
          <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${metrics.coverage}%` }} />
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

function EnvironmentHeader({ environment, canEdit, onUpdate, onRemove }) {
  const DeviceIcon = environment.device === "Mobile"
    ? Smartphone
    : environment.device === "Tablet"
      ? Tablet
      : Monitor;
  return (
    <div className="min-w-[220px] border-l border-slate-200 bg-slate-50/80 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <DeviceIcon className="h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-800">{environment.name}</p>
            <p className="mt-0.5 truncate text-[10px] text-slate-500">{[environment.browser, environment.version].filter(Boolean).join(" ") || "Browser not specified"}</p>
          </div>
        </div>
        {canEdit ? (
          <button type="button" onClick={() => onRemove(environment.id)} aria-label={`Remove ${environment.name}`} className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <p className="mt-2 truncate text-[10px] text-slate-500">{[environment.platform, environment.viewport].filter(Boolean).join(" · ") || environment.device}</p>
      {environment.notes ? <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{environment.notes}</p> : null}
      {canEdit ? (
        <div className="mt-2 flex gap-1">
          <button type="button" onClick={() => onUpdate(environment.id, "edit")} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50">Edit environment</button>
        </div>
      ) : null}
    </div>
  );
}

function MatrixCell({ environment, check, result, reports, canEdit, onUpdate, onOpenReport }) {
  const [expanded, setExpanded] = useState(false);
  const state = resultState(result.status);
  const StateIcon = state.icon;
  const linkedReport = reports.find((report) => getReportId(report) === result.reportId);
  return (
    <div className={`min-w-[220px] border-l border-slate-200 p-3 ${result.status === "issue" ? "bg-rose-50/40" : "bg-white"}`}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          aria-label={`${check.title} in ${environment.name}: ${state.label}. ${expanded ? "Hide" : "Show"} details`}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition hover:brightness-95 ${state.tone}`}
        >
          <StateIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {state.short}
        </button>
        <span className="text-[10px] text-slate-400">{result.updatedAt ? new Date(result.updatedAt).toLocaleDateString() : ""}</span>
      </div>
      {result.status === "issue" ? (
        <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-rose-800">{result.notes || "Issue needs an observation."}</p>
      ) : result.status === "blocked" ? (
        <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-amber-800">{result.notes || "Add the blocking reason."}</p>
      ) : null}
      {linkedReport && onOpenReport ? (
        <button type="button" onClick={() => onOpenReport(linkedReport)} className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-sky-700 hover:underline">
          Open linked report <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </button>
      ) : result.reportId && !linkedReport ? (
        <p className="mt-2 text-[10px] text-amber-700">Linked report unavailable</p>
      ) : null}
      {expanded ? (
        <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
          {canEdit ? (
            <div className="grid grid-cols-2 gap-1">
              {RESULT_STATES.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => onUpdate(environment.id, check.id, "status", option.id)}
                  aria-pressed={result.status === option.id}
                  className={`rounded-lg border px-2 py-1.5 text-[10px] font-medium ${result.status === option.id ? option.tone : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}
                >
                  {option.short}
                </button>
              ))}
            </div>
          ) : null}
          {(result.status === "issue" || result.status === "blocked" || result.notes) ? (
            <label className="block text-[10px] font-medium text-slate-600">
              Observation / reason
              <textarea
                value={result.notes}
                onChange={(event) => onUpdate(environment.id, check.id, "notes", event.target.value)}
                disabled={!canEdit}
                maxLength={MAX_TEXT}
                rows={3}
                placeholder="Record what happened in this environment."
                className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-700 disabled:bg-slate-100"
              />
            </label>
          ) : null}
          <label className="block text-[10px] font-medium text-slate-600">
            Evidence URL
            <input
              value={result.evidenceUrl}
              onChange={(event) => onUpdate(environment.id, check.id, "evidenceUrl", event.target.value)}
              disabled={!canEdit}
              maxLength={1000}
              placeholder="https://..."
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-700 disabled:bg-slate-100"
            />
            {result.evidenceUrl && !validHttpUrl(result.evidenceUrl) ? <span className="mt-1 block text-rose-600">Use an http:// or https:// URL.</span> : null}
            {result.evidenceUrl && validHttpUrl(result.evidenceUrl) ? <a href={result.evidenceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sky-700 hover:underline">Open evidence <ExternalLink className="h-3 w-3" aria-hidden="true" /></a> : null}
          </label>
          <label className="block text-[10px] font-medium text-slate-600">
            Related report
            <select
              value={result.reportId}
              onChange={(event) => onUpdate(environment.id, check.id, "reportId", event.target.value)}
              disabled={!canEdit}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-normal text-slate-700 disabled:bg-slate-100"
            >
              <option value="">No linked report</option>
              {result.reportId && !linkedReport ? <option value={result.reportId}>Saved report reference unavailable</option> : null}
              {reports.map((report) => {
                const id = getReportId(report);
                return id ? <option key={id} value={id}>{getReportTitle(report)}</option> : null;
              })}
            </select>
          </label>
        </div>
      ) : null}
    </div>
  );
}

export default function BrowserCoverageMatrix({ reports = [], email, onOpenReport }) {
  const [matrices, setMatrices] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loadedEmail, setLoadedEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [checkQuery, setCheckQuery] = useState("");
  const [resultFilter, setResultFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [environmentFilter, setEnvironmentFilter] = useState("all");
  const [checkSort, setCheckSort] = useState("original");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newBuild, setNewBuild] = useState("");
  const [comparisonId, setComparisonId] = useState("");
  const [showEnvironmentForm, setShowEnvironmentForm] = useState(false);
  const [environmentName, setEnvironmentName] = useState("");
  const [environmentBrowser, setEnvironmentBrowser] = useState("");
  const [environmentVersion, setEnvironmentVersion] = useState("");
  const [environmentPlatform, setEnvironmentPlatform] = useState("");
  const [environmentDevice, setEnvironmentDevice] = useState("Desktop");
  const [environmentViewportPreset, setEnvironmentViewportPreset] = useState("Desktop");
  const [environmentViewport, setEnvironmentViewport] = useState("");
  const [environmentNotes, setEnvironmentNotes] = useState("");
  const [editingEnvironmentId, setEditingEnvironmentId] = useState("");
  const [showCheckForm, setShowCheckForm] = useState(false);
  const [editingCheckId, setEditingCheckId] = useState("");
  const [checkTitle, setCheckTitle] = useState("");
  const [checkArea, setCheckArea] = useState("");
  const [checkPriority, setCheckPriority] = useState("Medium");
  const [checkExpected, setCheckExpected] = useState("");
  const requestedEmail = getText(email, 240).toLowerCase();
  const selectedMatrix = matrices.find((matrix) => matrix.id === selectedId) || null;
  const metrics = selectedMatrix ? getMetrics(selectedMatrix) : null;
  const canEdit = selectedMatrix?.status !== "complete";
  const activeEnvironmentFilter = selectedMatrix?.environments.some(
    (environment) => environment.id === environmentFilter,
  ) ? environmentFilter : "all";
  const visibleEnvironments = useMemo(() => {
    if (!selectedMatrix) return [];
    return activeEnvironmentFilter === "all"
      ? selectedMatrix.environments
      : selectedMatrix.environments.filter((environment) => environment.id === activeEnvironmentFilter);
  }, [selectedMatrix, activeEnvironmentFilter]);

  const visibleMatrices = useMemo(() => {
    const query = getText(search, 120).toLowerCase();
    return matrices
      .filter((matrix) => !query || [
        matrix.name,
        matrix.build,
        matrix.targetUrl,
        matrix.status,
      ].some((value) => value.toLowerCase().includes(query)))
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  }, [matrices, search]);

  const visibleChecks = useMemo(() => {
    if (!selectedMatrix) return [];
    const query = getText(checkQuery, 120).toLowerCase();
    return selectedMatrix.checks
      .map((check, index) => ({ check, index }))
      .filter(({ check }) => !query || [
        check.title,
        check.area,
        check.priority,
        check.expected,
      ].some((value) => value.toLowerCase().includes(query)))
      .filter(({ check }) => priorityFilter === "all" || check.priority === priorityFilter)
      .filter(({ check }) => resultFilter === "all" ||
        visibleEnvironments.some((environment) =>
          getResult(selectedMatrix, environment.id, check.id).status === resultFilter,
        ))
      .sort((left, right) => {
        if (checkSort === "priority") {
          const rank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
          return rank[left.check.priority] - rank[right.check.priority] || left.index - right.index;
        }
        if (checkSort === "area") {
          return left.check.area.localeCompare(right.check.area) || left.index - right.index;
        }
        if (checkSort === "title") {
          return left.check.title.localeCompare(right.check.title) || left.index - right.index;
        }
        return left.index - right.index;
      });
  }, [selectedMatrix, visibleEnvironments, checkQuery, resultFilter, priorityFilter, checkSort]);

  const comparison = useMemo(() => {
    if (!selectedMatrix) return null;
    const previous = matrices.find((matrix) => matrix.id === comparisonId);
    if (!previous) return null;
    const groupByLabel = (items, label) => items.reduce((groups, item) => {
      const key = getText(label(item), 180).toLowerCase();
      groups.set(key, [...(groups.get(key) || []), item]);
      return groups;
    }, new Map());
    const previousEnvironments = groupByLabel(previous.environments, (environment) => environment.name);
    const previousChecks = groupByLabel(previous.checks, (check) => check.title);
    const currentEnvironments = groupByLabel(selectedMatrix.environments, (environment) => environment.name);
    const currentChecks = groupByLabel(selectedMatrix.checks, (check) => check.title);
    const changes = [];
    let unchanged = 0;
    let unmatched = 0;
    selectedMatrix.environments.forEach((environment) => {
      const oldEnvironments = previousEnvironments.get(getText(environment.name, 180).toLowerCase()) || [];
      selectedMatrix.checks.forEach((check) => {
        const oldChecks = previousChecks.get(getText(check.title, 180).toLowerCase()) || [];
        const sameNameEnvironments = currentEnvironments.get(getText(environment.name, 180).toLowerCase()) || [];
        const sameTitleChecks = currentChecks.get(getText(check.title, 180).toLowerCase()) || [];
        if (
          oldEnvironments.length !== 1 ||
          oldChecks.length !== 1 ||
          sameNameEnvironments.length !== 1 ||
          sameTitleChecks.length !== 1
        ) {
          unmatched += 1;
          return;
        }
        const [oldEnvironment] = oldEnvironments;
        const [oldCheck] = oldChecks;
        const currentResult = getResult(selectedMatrix, environment.id, check.id);
        const oldResult = getResult(previous, oldEnvironment.id, oldCheck.id);
        if (currentResult.status === oldResult.status) {
          unchanged += 1;
          return;
        }
        changes.push({
          environment: environment.name,
          check: check.title,
          before: oldResult.status,
          after: currentResult.status,
        });
      });
    });
    return { previous, changes, unchanged, unmatched };
  }, [selectedMatrix, matrices, comparisonId]);

  useEffect(() => {
    const normalizedEmail = getText(email, 240).toLowerCase();
    setLoading(true);
    setLoadError("");
    setNotice("");
    setSelectedId("");
    if (!normalizedEmail) {
      setMatrices([]);
      setLoadedEmail("");
      setLoadError("A signed-in tester account is required to load browser coverage matrices.");
      setLoading(false);
      return;
    }
    try {
      const saved = window.localStorage.getItem(getStorageKey(normalizedEmail));
      const parsed = saved ? JSON.parse(saved) : [];
      const next = normalizeMatrices(parsed);
      setMatrices(next);
      setSelectedId(next[0]?.id || "");
      setLoadedEmail(normalizedEmail);
    } catch (error) {
      setMatrices([]);
      setLoadedEmail(normalizedEmail);
      setLoadError(
        error instanceof SyntaxError
          ? "Saved browser matrix data is invalid JSON. Existing browser data was left untouched."
          : `Browser matrix data could not be loaded: ${error.message}`,
      );
    } finally {
      setLoading(false);
    }
  }, [email]);

  const persistMatrices = (next) => {
    if (loadError) {
      setNotice("Cannot overwrite matrix storage after a load error. Resolve the storage issue first.");
      return false;
    }
    if (!loadedEmail || loadedEmail !== requestedEmail) {
      setNotice("Wait for account-specific matrix data to load before editing.");
      return false;
    }
    if (next.length > MAX_MATRICES) {
      setNotice(`Keep at most ${MAX_MATRICES} matrices in this browser.`);
      return false;
    }
    try {
      const normalized = normalizeMatrices(next);
      window.localStorage.setItem(getStorageKey(loadedEmail), JSON.stringify(normalized));
      setMatrices(normalized);
      setNotice("Saved locally in this browser.");
      return true;
    } catch (error) {
      setNotice(`Could not save browser matrix changes: ${error.message}`);
      return false;
    }
  };

  const updateMatrix = (matrixId, updater, successMessage = "") => {
    const current = matrices.find((matrix) => matrix.id === matrixId);
    if (!current) {
      setNotice("This browser matrix is no longer available.");
      return false;
    }
    const updated = normalizeMatrix({
      ...updater(current),
      updatedAt: new Date().toISOString(),
    });
    const saved = persistMatrices(matrices.map((matrix) =>
      matrix.id === matrixId ? updated : matrix,
    ));
    if (saved && successMessage) setNotice(successMessage);
    return saved;
  };

  const createMatrix = () => {
    const name = getText(newName, 180);
    if (!name) {
      setNotice("Enter a name for the browser coverage matrix.");
      return;
    }
    if (!validHttpUrl(getText(newUrl, 1000))) {
      setNotice("Target URL must be empty or a valid http:// or https:// URL.");
      return;
    }
    if (matrices.length >= MAX_MATRICES) {
      setNotice(`You have reached the ${MAX_MATRICES}-matrix browser limit.`);
      return;
    }
    const matrix = newMatrix(name, newUrl, newBuild);
    if (persistMatrices([matrix, ...matrices])) {
      setSelectedId(matrix.id);
      setNewName("");
      setNewUrl("");
      setNewBuild("");
      setShowCreateForm(false);
    }
  };

  const deleteMatrix = (matrix) => {
    if (!window.confirm(`Delete "${matrix.name}" and all local matrix results? This cannot be undone.`)) return;
    const next = matrices.filter((item) => item.id !== matrix.id);
    if (persistMatrices(next)) {
      if (selectedId === matrix.id) setSelectedId(next[0]?.id || "");
      setNotice("Browser matrix and local results deleted.");
    }
  };

  const updateMatrixField = (field, value) => {
    if (!selectedMatrix) return;
    const limits = { name: 180, targetUrl: 1000, build: 100, notes: MAX_TEXT };
    const nextValue = getText(value, limits[field] || 500);
    if (field === "name" && !nextValue) {
      setNotice("Matrix name cannot be empty.");
      return;
    }
    if (field === "targetUrl" && !validHttpUrl(nextValue)) {
      setNotice("Target URL must be empty or a valid http:// or https:// URL.");
      return;
    }
    updateMatrix(selectedMatrix.id, (matrix) => ({ ...matrix, [field]: nextValue }));
  };

  const updateMatrixStatus = (status) => {
    if (!selectedMatrix || !Object.hasOwn(MATRIX_STATES, status)) return;
    const nextStatus = status === "complete" && metrics.pending > 0 ? "review" : status;
    if (status === "complete" && metrics.pending > 0) {
      setNotice(`${metrics.pending} matrix result(s) are still pending. Record an outcome or mark not applicable before completing.`);
      return;
    }
    updateMatrix(selectedMatrix.id, (matrix) => ({
      ...matrix,
      status: nextStatus,
      completedAt: nextStatus === "complete" ? new Date().toISOString() : "",
      activity: appendActivity(matrix, `Matrix marked ${MATRIX_STATES[nextStatus].label.toLowerCase()}`),
    }), `Matrix marked ${MATRIX_STATES[nextStatus].label.toLowerCase()}.`);
  };

  const addEnvironment = () => {
    if (!selectedMatrix) return;
    const name = getText(environmentName, 140);
    if (!name) {
      setNotice("Enter a name for this browser or device environment.");
      return;
    }
    if (selectedMatrix.environments.length >= MAX_ENVIRONMENTS) {
      setNotice(`A matrix can contain at most ${MAX_ENVIRONMENTS} environments.`);
      return;
    }
    const environment = normalizeEnvironment({
      id: makeId(),
      name,
      browser: environmentBrowser,
      version: environmentVersion,
      platform: environmentPlatform,
      device: environmentDevice,
      viewport: environmentViewport || environmentViewportPreset,
      viewportPreset: environmentViewportPreset,
      notes: environmentNotes,
    });
    const saved = updateMatrix(selectedMatrix.id, (matrix) => ({
      ...matrix,
      environments: [...matrix.environments, environment],
      activity: appendActivity(matrix, `Added environment: ${environment.name}`),
    }), "Environment added to matrix.");
    if (saved) {
      resetEnvironmentForm();
    }
  };

  const resetEnvironmentForm = () => {
    setEnvironmentName("");
    setEnvironmentBrowser("");
    setEnvironmentVersion("");
    setEnvironmentPlatform("");
    setEnvironmentDevice("Desktop");
    setEnvironmentViewportPreset("Desktop");
    setEnvironmentViewport("");
    setEnvironmentNotes("");
    setEditingEnvironmentId("");
    setShowEnvironmentForm(false);
  };

  const beginEditEnvironment = (environmentId) => {
    const environment = selectedMatrix?.environments.find((item) => item.id === environmentId);
    if (!environment) return;
    setEnvironmentName(environment.name);
    setEnvironmentBrowser(environment.browser);
    setEnvironmentVersion(environment.version);
    setEnvironmentPlatform(environment.platform);
    setEnvironmentDevice(environment.device);
    setEnvironmentViewportPreset(environment.viewportPreset);
    setEnvironmentViewport(environment.viewport);
    setEnvironmentNotes(environment.notes);
    setEditingEnvironmentId(environmentId);
    setShowEnvironmentForm(true);
  };

  const saveEnvironment = () => {
    if (!selectedMatrix || !editingEnvironmentId) return;
    const name = getText(environmentName, 140);
    if (!name) {
      setNotice("Environment name cannot be empty.");
      return;
    }
    const saved = updateMatrix(selectedMatrix.id, (matrix) => ({
      ...matrix,
      environments: matrix.environments.map((environment) =>
        environment.id === editingEnvironmentId
          ? normalizeEnvironment({
            ...environment,
            name,
            browser: environmentBrowser,
            version: environmentVersion,
            platform: environmentPlatform,
            device: environmentDevice,
            viewport: environmentViewport || environmentViewportPreset,
            viewportPreset: environmentViewportPreset,
            notes: environmentNotes,
          })
          : environment,
      ),
      activity: appendActivity(matrix, `Updated environment: ${name}`),
    }), "Environment updated.");
    if (saved) resetEnvironmentForm();
  };

  const removeEnvironment = (environmentId) => {
    if (!selectedMatrix) return;
    const environment = selectedMatrix.environments.find((item) => item.id === environmentId);
    if (!environment || !window.confirm(`Remove "${environment.name}" and its matrix results?`)) return;
    updateMatrix(selectedMatrix.id, (matrix) => {
      const results = { ...matrix.results };
      matrix.checks.forEach((check) => delete results[resultKey(environmentId, check.id)]);
      return {
        ...matrix,
        environments: matrix.environments.filter((item) => item.id !== environmentId),
        results,
        activity: appendActivity(matrix, `Removed environment: ${environment.name}`),
      };
    }, "Environment and its results removed.");
  };

  const addCheck = () => {
    if (!selectedMatrix) return;
    const title = getText(checkTitle, 180);
    if (!title) {
      setNotice("Enter a title for the matrix check.");
      return;
    }
    if (editingCheckId) {
      const current = selectedMatrix.checks.find((check) => check.id === editingCheckId && check.custom);
      if (!current) {
        setNotice("This custom check is no longer available to edit.");
        return;
      }
      const updatedCheck = normalizeCheck({
        ...current,
        title,
        area: checkArea,
        priority: checkPriority,
        expected: checkExpected,
      });
      const saved = updateMatrix(selectedMatrix.id, (matrix) => ({
        ...matrix,
        checks: matrix.checks.map((check) => check.id === editingCheckId ? updatedCheck : check),
        activity: appendActivity(matrix, `Updated matrix check: ${updatedCheck.title}`),
      }), "Custom check updated.");
      if (saved) {
        setEditingCheckId("");
        setCheckTitle("");
        setCheckArea("");
        setCheckPriority("Medium");
        setCheckExpected("");
        setShowCheckForm(false);
      }
      return;
    }
    if (selectedMatrix.checks.length >= MAX_CHECKS) {
      setNotice(`A matrix can contain at most ${MAX_CHECKS} checks.`);
      return;
    }
    const check = normalizeCheck({
      id: makeId(),
      title,
      area: checkArea,
      priority: checkPriority,
      expected: checkExpected,
      custom: true,
    });
    const saved = updateMatrix(selectedMatrix.id, (matrix) => ({
      ...matrix,
      checks: [...matrix.checks, check],
      activity: appendActivity(matrix, `Added matrix check: ${check.title}`),
    }), "Check added to matrix.");
    if (saved) {
      setEditingCheckId("");
      setCheckTitle("");
      setCheckArea("");
      setCheckPriority("Medium");
      setCheckExpected("");
      setShowCheckForm(false);
    }
  };

  const editCheck = (check) => {
    if (!check.custom || !canEdit) return;
    setEditingCheckId(check.id);
    setCheckTitle(check.title);
    setCheckArea(check.area);
    setCheckPriority(check.priority);
    setCheckExpected(check.expected);
    setShowCheckForm(true);
  };

  const cancelCheckEdit = () => {
    setEditingCheckId("");
    setCheckTitle("");
    setCheckArea("");
    setCheckPriority("Medium");
    setCheckExpected("");
    setShowCheckForm(false);
  };

  const removeCheck = (checkId) => {
    if (!selectedMatrix) return;
    const check = selectedMatrix.checks.find((item) => item.id === checkId);
    if (!check || !check.custom || !window.confirm(`Remove custom check "${check.title}" and all its environment results?`)) return;
    updateMatrix(selectedMatrix.id, (matrix) => {
      const results = { ...matrix.results };
      matrix.environments.forEach((environment) => delete results[resultKey(environment.id, checkId)]);
      return {
        ...matrix,
        checks: matrix.checks.filter((item) => item.id !== checkId),
        results,
        activity: appendActivity(matrix, `Removed matrix check: ${check.title}`),
      };
    }, "Custom check and its results removed.");
  };

  const updateCell = (environmentId, checkId, field, value) => {
    if (!selectedMatrix) return;
    const key = resultKey(environmentId, checkId);
    const existing = getResult(selectedMatrix, environmentId, checkId);
    const allowed = {
      status: RESULT_STATES.map((state) => state.id),
    };
    const limits = { notes: MAX_TEXT, evidenceUrl: 1000, reportId: 120 };
    const nextValue = field === "status"
      ? allowed.status.includes(value) ? value : "pending"
      : getText(value, limits[field] || 300);
    updateMatrix(selectedMatrix.id, (matrix) => ({
      ...matrix,
      results: {
        ...matrix.results,
        [key]: {
          ...existing,
          [field]: nextValue,
          updatedAt: new Date().toISOString(),
        },
      },
      activity: field === "status"
        ? appendActivity(matrix, `Marked matrix result ${resultState(nextValue).label}`)
        : matrix.activity,
    }), field === "status" ? "Matrix result updated." : "");
  };

  const markCheckPendingNotApplicable = (checkId) => {
    if (!selectedMatrix) return;
    const check = selectedMatrix.checks.find((item) => item.id === checkId);
    if (!check) return;
    const pendingEnvironments = selectedMatrix.environments.filter(
      (environment) => getResult(selectedMatrix, environment.id, checkId).status === "pending",
    );
    if (!pendingEnvironments.length) return;
    if (!window.confirm(`Mark this check not applicable in ${pendingEnvironments.length} pending environment(s)?`)) return;
    const now = new Date().toISOString();
    updateMatrix(selectedMatrix.id, (matrix) => {
      const results = { ...matrix.results };
      pendingEnvironments.forEach((environment) => {
        const key = resultKey(environment.id, checkId);
        const current = getResult(matrix, environment.id, checkId);
        if (current.status === "pending") {
          results[key] = { ...current, status: "na", updatedAt: now };
        }
      });
      return {
        ...matrix,
        results,
        activity: appendActivity(matrix, `Marked pending results for "${check.title}" not applicable in ${pendingEnvironments.length} environment(s)`),
      };
    }, `Pending results for "${check.title}" marked not applicable.`);
  };

  const markEnvironmentState = (environmentId, status) => {
    if (!selectedMatrix) return;
    if (!RESULT_STATES.some((state) => state.id === status)) return;
    const environment = selectedMatrix.environments.find((item) => item.id === environmentId);
    if (!environment) return;
    const pending = selectedMatrix.checks.filter(
      (check) => getResult(selectedMatrix, environmentId, check.id).status === "pending",
    );
    if (!pending.length) {
      setNotice(`${environment.name} has no pending checks.`);
      return;
    }
    if (!window.confirm(`Mark ${pending.length} pending check(s) in "${environment.name}" as ${resultState(status).label.toLowerCase()}?`)) return;
    const now = new Date().toISOString();
    updateMatrix(selectedMatrix.id, (matrix) => {
      const results = { ...matrix.results };
      pending.forEach((check) => {
        const key = resultKey(environmentId, check.id);
        results[key] = {
          ...getResult(matrix, environmentId, check.id),
          status,
          updatedAt: now,
        };
      });
      return {
        ...matrix,
        results,
        activity: appendActivity(matrix, `Marked ${pending.length} pending result(s) in ${environment.name} ${resultState(status).label.toLowerCase()}`),
      };
    }, `${pending.length} pending result(s) in ${environment.name} updated.`);
  };

  const updateCellStatus = (environmentId, checkId, status) => {
    updateCell(environmentId, checkId, "status", status);
  };

  const clearResultFilter = () => {
    setResultFilter("all");
    setPriorityFilter("all");
    setEnvironmentFilter("all");
    setCheckQuery("");
  };

  const exportCsv = () => {
    if (!selectedMatrix) return;
    const rows = [
      ["Matrix", "Build", "Target URL", "Environment", "Browser", "Browser version", "Platform", "Device", "Viewport", "Area", "Check", "Priority", "Expected", "Result", "Observation", "Evidence URL", "Related report ID", "Updated"],
      ...selectedMatrix.environments.flatMap((environment) =>
        selectedMatrix.checks.map((check) => {
          const result = getResult(selectedMatrix, environment.id, check.id);
          return [
            selectedMatrix.name,
            selectedMatrix.build,
            selectedMatrix.targetUrl,
            environment.name,
            environment.browser,
            environment.version,
            environment.platform,
            environment.device,
            environment.viewport,
            check.area,
            check.title,
            check.priority,
            check.expected,
            resultState(result.status).label,
            result.notes,
            result.evidenceUrl,
            result.reportId,
            result.updatedAt,
          ];
        }),
      ),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
    downloadFile(`${safeFilename(selectedMatrix.name)}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
    setNotice("Full browser coverage matrix exported as CSV.");
  };

  const exportVisibleCsv = () => {
    if (!selectedMatrix || !visibleChecks.length || !selectedMatrix.environments.length) return;
    const rows = [
      ["Matrix", "Build", "Environment", "Browser", "Version", "Platform", "Viewport", "Area", "Check", "Priority", "Result", "Observation", "Evidence URL", "Related report ID"],
      ...selectedMatrix.environments.flatMap((environment) =>
        visibleChecks.map(({ check }) => {
          const result = getResult(selectedMatrix, environment.id, check.id);
          return [
            selectedMatrix.name,
            selectedMatrix.build,
            environment.name,
            environment.browser,
            environment.version,
            environment.platform,
            environment.viewport,
            check.area,
            check.title,
            check.priority,
            resultState(result.status).label,
            result.notes,
            result.evidenceUrl,
            result.reportId,
          ];
        }),
      ),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
    downloadFile(`${safeFilename(selectedMatrix.name)}-filtered.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
    setNotice(`${visibleChecks.length} visible check(s) across ${selectedMatrix.environments.length} environment(s) exported.`);
  };

  const exportJson = () => {
    if (!selectedMatrix) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      scope: "Browser-local coverage record. Results are manual observations and do not change server reports.",
      matrix: selectedMatrix,
    };
    downloadFile(`${safeFilename(selectedMatrix.name)}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
    setNotice("Browser coverage matrix exported as JSON.");
  };

  const copySummary = async () => {
    if (!selectedMatrix || !metrics) return;
    const summary = [
      `Browser coverage matrix: ${selectedMatrix.name}`,
      `Build: ${selectedMatrix.build || "Not specified"}`,
      `Target: ${selectedMatrix.targetUrl || "Not specified"}`,
      `Status: ${MATRIX_STATES[selectedMatrix.status].label}`,
      `Coverage: ${metrics.executed}/${metrics.total} results recorded (${metrics.coverage}%)`,
      `Results: ${metrics.pass} passed, ${metrics.issue} issues, ${metrics.blocked} blocked, ${metrics.pending} pending, ${metrics.na} not applicable`,
      `Pass rate: ${metrics.passRate}% of applicable recorded checks; not a certification.`,
      "",
      "Open issues:",
      ...selectedMatrix.environments.flatMap((environment) =>
        selectedMatrix.checks
          .filter((check) => getResult(selectedMatrix, environment.id, check.id).status === "issue")
          .map((check) => {
            const result = getResult(selectedMatrix, environment.id, check.id);
            return `- [${check.priority}] ${environment.name} — ${check.title}${result.notes ? `: ${result.notes}` : ""}`;
          }),
      ),
      "",
      "Manual compatibility observations; verify scope and context before sharing.",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(summary);
      setNotice("Matrix summary copied to clipboard.");
    } catch (error) {
      setNotice(`Could not copy matrix summary: ${error.message}`);
    }
  };

  const copyEnvironment = (environment) => {
    if (!selectedMatrix || selectedMatrix.environments.length >= MAX_ENVIRONMENTS) {
      setNotice(`A matrix can contain at most ${MAX_ENVIRONMENTS} environments.`);
      return;
    }
    const duplicate = normalizeEnvironment({
      ...environment,
      id: makeId(),
      name: `${environment.name} (copy)`.slice(0, 140),
    });
    if (updateMatrix(selectedMatrix.id, (matrix) => ({
      ...matrix,
      environments: [...matrix.environments, duplicate],
      activity: appendActivity(matrix, `Duplicated environment: ${duplicate.name}`),
    }), "Environment copied. Results start as pending.")) {
      setNotice("Environment copied with fresh pending results.");
    }
  };

  const environmentSummary = (environment) => {
    if (!selectedMatrix) return { pass: 0, issue: 0, pending: 0, blocked: 0, na: 0, coverage: 0 };
    const counts = { pass: 0, issue: 0, pending: 0, blocked: 0, na: 0 };
    selectedMatrix.checks.forEach((check) => {
      const status = getResult(selectedMatrix, environment.id, check.id).status;
      counts[status] += 1;
    });
    const total = selectedMatrix.checks.length;
    return { ...counts, coverage: total ? Math.round(((total - counts.pending) / total) * 100) : 0 };
  };

  const checkEnvironmentConsistency = () => {
    if (!selectedMatrix) return [];
    const issues = [];
    const names = new Map();
    selectedMatrix.environments.forEach((environment) => {
      const key = environment.name.toLowerCase();
      if (names.has(key)) issues.push(`Duplicate environment name: ${environment.name}`);
      names.set(key, environment.id);
      if (!environment.browser) issues.push(`${environment.name}: browser is not specified`);
      if (!environment.platform) issues.push(`${environment.name}: platform is not specified`);
      if (!environment.viewport) issues.push(`${environment.name}: viewport is not specified`);
    });
    return issues;
  };

  const environmentIssues = selectedMatrix ? checkEnvironmentConsistency() : [];

  if (loading || (requestedEmail && loadedEmail !== requestedEmail)) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-busy="true">
        <div className="h-5 w-56 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-20 animate-pulse rounded-2xl bg-slate-50" />
        <p className="mt-3 text-xs text-slate-500">Loading browser-local coverage matrices…</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
      <header className="border-b border-slate-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50/60 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-sky-800">
              <Globe2 className="h-5 w-5" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em]">Browser and device coverage</p>
            </div>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">Compare manual checks across environments</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Build a browser/device matrix, record results per environment, and identify gaps or inconsistencies. Coverage is local and advisory; it does not change server report status.
            </p>
          </div>
          <button type="button" onClick={() => setShowCreateForm((value) => !value)} disabled={matrices.length >= MAX_MATRICES || Boolean(loadError)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-50">
            <Plus className="h-4 w-4" aria-hidden="true" /> New matrix
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><Layers3 className="h-3.5 w-3.5" aria-hidden="true" /> {matrices.length}/{MAX_MATRICES} local matrices</span>
          <span className="inline-flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5" aria-hidden="true" /> Up to {MAX_ENVIRONMENTS} environments per matrix</span>
          <span className="inline-flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" /> Manual results; not automated coverage</span>
        </div>
      </header>

      <div className="space-y-4 p-4 sm:p-5">
        {loadError ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <p className="font-semibold">Browser matrix storage could not be loaded</p>
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
                <h3 className="text-sm font-semibold text-slate-900">Create a browser coverage matrix</h3>
                <p className="mt-1 text-xs text-slate-500">A starter set of common checks is included. Add environments after creation.</p>
              </div>
              <button type="button" onClick={() => setShowCreateForm(false)} aria-label="Close create matrix form" className="rounded-lg p-1.5 text-slate-500 hover:bg-white"><X className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-medium text-slate-600 sm:col-span-2">Matrix name *
                <input value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={180} placeholder="e.g. Checkout browser coverage — release 3.2" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400" />
              </label>
              <label className="text-xs font-medium text-slate-600">Build
                <input value={newBuild} onChange={(event) => setNewBuild(event.target.value)} maxLength={100} placeholder="3.2.0-rc1" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400" />
              </label>
              <label className="text-xs font-medium text-slate-600 sm:col-span-3">Target URL
                <input type="url" value={newUrl} onChange={(event) => setNewUrl(event.target.value)} maxLength={1000} placeholder="https://staging.example.test" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400" />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={createMatrix} className="inline-flex items-center gap-2 rounded-xl bg-sky-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-900"><FilePlus2 className="h-4 w-4" aria-hidden="true" /> Create matrix</button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a matrix…" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sky-400" />
              </label>
              <div className="mt-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Coverage matrices</h3>
                <span className="text-xs text-slate-400">{visibleMatrices.length} shown</span>
              </div>
              <div className="mt-2 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
                {visibleMatrices.length ? visibleMatrices.map((matrix) => (
                  <MatrixListItem key={matrix.id} matrix={matrix} selected={matrix.id === selectedId} onSelect={() => setSelectedId(matrix.id)} onDelete={() => deleteMatrix(matrix)} />
                )) : (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-500">{matrices.length ? "No matrices match your search." : "Create a matrix to get started."}</p>
                )}
              </div>
            </div>
            {selectedMatrix ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Result legend</h3>
                <ul className="mt-2 space-y-2">
                  {RESULT_STATES.map((state) => (
                    <li key={state.id} className="flex items-center gap-2 text-xs text-slate-600">
                      <span className={`h-2.5 w-2.5 rounded-full ${state.dot}`} />
                      <span className="flex-1">{state.label}</span>
                      <span>{metrics[state.id]}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-500">A recorded result describes a manual check, not an automated browser compatibility guarantee.</p>
              </div>
            ) : null}
          </aside>

          <main className="min-w-0 space-y-4">
            {!selectedMatrix ? (
              <EmptyState title="No matrix selected" description="Create a matrix, add the browser and device combinations you support, and record a result for each check." />
            ) : (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={selectedMatrix.status} />
                        <span className="text-xs text-slate-400">Updated {new Date(selectedMatrix.updatedAt).toLocaleString()}</span>
                      </div>
                      <input key={`${selectedMatrix.id}-name`} defaultValue={selectedMatrix.name} onBlur={(event) => updateMatrixField("name", event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} disabled={!canEdit} maxLength={180} aria-label="Matrix name" className="mt-3 w-full rounded-lg border border-transparent bg-transparent px-1 py-1 text-xl font-bold tracking-tight text-slate-950 outline-none hover:border-slate-200 focus:border-sky-400 disabled:opacity-70 sm:text-2xl" />
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <label className="text-[11px] font-medium text-slate-500">Build
                          <input key={`${selectedMatrix.id}-build`} defaultValue={selectedMatrix.build} onBlur={(event) => updateMatrixField("build", event.target.value)} disabled={!canEdit} maxLength={100} placeholder="3.2.0" className="mt-1.5 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-normal text-slate-700 disabled:bg-slate-50" />
                        </label>
                        <label className="text-[11px] font-medium text-slate-500">Target URL
                          <input key={`${selectedMatrix.id}-target`} type="url" defaultValue={selectedMatrix.targetUrl} onBlur={(event) => updateMatrixField("targetUrl", event.target.value)} disabled={!canEdit} maxLength={1000} placeholder="https://..." className="mt-1.5 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-normal text-slate-700 disabled:bg-slate-50" />
                        </label>
                        <label className="text-[11px] font-medium text-slate-500">Matrix status
                          {canEdit ? (
                            <select value={selectedMatrix.status} onChange={(event) => updateMatrixStatus(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-700">
                              {Object.entries(MATRIX_STATES).map(([id, state]) => <option key={id} value={id}>{state.label}</option>)}
                            </select>
                          ) : (
                            <button type="button" onClick={() => updateMatrixStatus("active")} className="mt-1.5 w-full rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-2 text-left text-xs font-medium text-sky-700 hover:bg-sky-100">Reopen matrix</button>
                          )}
                        </label>
                      </div>
                      <label className="mt-3 block text-[11px] font-medium text-slate-500">Coverage notes
                        <textarea value={selectedMatrix.notes} onChange={(event) => updateMatrixField("notes", event.target.value)} disabled={!canEdit} maxLength={MAX_TEXT} rows={2} placeholder="Scope, known limitations, testing approach, and assumptions." className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700 disabled:bg-slate-50" />
                      </label>
                      {selectedMatrix.targetUrl && validHttpUrl(selectedMatrix.targetUrl) ? <a href={selectedMatrix.targetUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:underline">Open target <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a> : null}
                    </div>
                    <div className="flex flex-wrap gap-2 xl:max-w-64 xl:justify-end">
                      <button type="button" onClick={copySummary} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Copy summary</button>
                      <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-3.5 w-3.5" aria-hidden="true" /> Full CSV</button>
                      <button type="button" onClick={exportJson} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" /> JSON</button>
                    </div>
                  </div>
                </section>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <MetricCard label="Coverage" value={`${metrics.coverage}%`} detail={`${metrics.executed} of ${metrics.total} results recorded`} tone="sky" />
                  <MetricCard label="Passed" value={metrics.pass} detail={`${metrics.passRate}% of applicable recorded checks`} tone="green" />
                  <MetricCard label="Issues" value={metrics.issue} detail={`${metrics.criticalIssues} critical-priority issue(s)`} tone={metrics.issue ? "rose" : "slate"} />
                  <MetricCard label="Pending" value={metrics.pending} detail="Results still to record" tone={metrics.pending ? "amber" : "green"} />
                  <MetricCard label="Environments" value={metrics.environments} detail={`${metrics.checks} checks per environment`} />
                </div>

                {matrices.length > 1 ? (
                  <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Compare with another matrix</h3>
                        <p className="mt-1 text-xs text-slate-600">Matches exact environment and check labels. Ambiguous or missing matches are excluded.</p>
                      </div>
                      <label className="text-xs font-medium text-slate-600">
                        Baseline matrix
                        <select
                          value={comparisonId}
                          onChange={(event) => setComparisonId(event.target.value)}
                          className="mt-1 block min-w-56 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                        >
                          <option value="">Choose a matrix…</option>
                          {matrices.filter((matrix) => matrix.id !== selectedMatrix.id).map((matrix) => (
                            <option key={matrix.id} value={matrix.id}>{matrix.name}{matrix.build ? ` · ${matrix.build}` : ""}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {comparison ? (
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
                          <span><strong className="text-slate-900">{comparison.changes.length}</strong> changed</span>
                          <span><strong className="text-slate-900">{comparison.unchanged}</strong> unchanged</span>
                          <span><strong className="text-slate-900">{comparison.unmatched}</strong> unmatched</span>
                          <span className="text-slate-500">vs. {comparison.previous.name}</span>
                        </div>
                        {comparison.changes.length ? (
                          <ul className="mt-3 max-h-56 divide-y divide-indigo-100 overflow-y-auto rounded-xl border border-indigo-100 bg-white">
                            {comparison.changes.slice(0, 100).map((change, index) => (
                              <li key={`${change.environment}-${change.check}-${index}`} className="flex flex-col gap-1 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                                <span className="min-w-0"><strong>{change.check}</strong><span className="text-slate-500"> · {change.environment}</span></span>
                                <span className="shrink-0 text-slate-600">{resultState(change.before).short} <span aria-hidden="true">→</span> <strong>{resultState(change.after).short}</strong></span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-3 rounded-xl border border-indigo-100 bg-white px-3 py-3 text-xs text-slate-600">No result status changes among matched cells.</p>
                        )}
                        {comparison.changes.length > 100 ? <p className="mt-2 text-[11px] text-slate-500">Showing the first 100 changed results.</p> : null}
                      </div>
                    ) : null}
                  </section>
                ) : null}

                {environmentIssues.length ? (
                  <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                    <p className="font-semibold">Review environment details</p>
                    <ul className="mt-1 list-inside list-disc">{environmentIssues.slice(0, 5).map((issue) => <li key={issue}>{issue}</li>)}</ul>
                  </div>
                ) : null}

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Layers3 className="h-4 w-4 text-sky-800" aria-hidden="true" />
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Environments</h3>
                        <p className="mt-0.5 text-xs text-slate-500">{selectedMatrix.environments.length}/{MAX_ENVIRONMENTS} configured</p>
                      </div>
                    </div>
                    {canEdit ? (
                      <button type="button" onClick={() => { resetEnvironmentForm(); setShowEnvironmentForm((value) => !value); }} disabled={selectedMatrix.environments.length >= MAX_ENVIRONMENTS} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add environment
                      </button>
                    ) : null}
                  </div>
                  {showEnvironmentForm && canEdit ? (
                    <div className="border-b border-slate-200 bg-sky-50/30 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-800">{editingEnvironmentId ? "Edit environment" : "Add browser or device environment"}</h4>
                        <button type="button" onClick={resetEnvironmentForm} aria-label="Close environment form" className="rounded-lg p-1 text-slate-500 hover:bg-white"><X className="h-4 w-4" aria-hidden="true" /></button>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="text-xs font-medium text-slate-600 sm:col-span-2">Environment label *
                          <input value={environmentName} onChange={(event) => setEnvironmentName(event.target.value)} maxLength={140} placeholder="e.g. Chrome latest — Windows desktop" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" />
                        </label>
                        <label className="text-xs font-medium text-slate-600">Browser
                          <input value={environmentBrowser} onChange={(event) => setEnvironmentBrowser(event.target.value)} maxLength={100} placeholder="Chrome, Firefox, Safari…" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal" />
                        </label>
                        <label className="text-xs font-medium text-slate-600">Version
                          <input value={environmentVersion} onChange={(event) => setEnvironmentVersion(event.target.value)} maxLength={80} placeholder="Latest / 126" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal" />
                        </label>
                        <label className="text-xs font-medium text-slate-600">Platform / OS
                          <input value={environmentPlatform} onChange={(event) => setEnvironmentPlatform(event.target.value)} maxLength={120} placeholder="Windows 11, macOS…" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal" />
                        </label>
                        <label className="text-xs font-medium text-slate-600">Device class
                          <select value={environmentDevice} onChange={(event) => setEnvironmentDevice(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal">{DEVICE_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select>
                        </label>
                        <label className="text-xs font-medium text-slate-600">Viewport preset
                          <select value={environmentViewportPreset} onChange={(event) => setEnvironmentViewportPreset(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal">{VIEWPORT_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select>
                        </label>
                        <label className="text-xs font-medium text-slate-600">Viewport dimensions
                          <input value={environmentViewport} onChange={(event) => setEnvironmentViewport(event.target.value)} maxLength={100} placeholder="1440 × 900" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal" />
                        </label>
                        <label className="text-xs font-medium text-slate-600 sm:col-span-2 lg:col-span-4">Environment notes
                          <input value={environmentNotes} onChange={(event) => setEnvironmentNotes(event.target.value)} maxLength={500} placeholder="Device model, assistive tech, network notes…" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" />
                        </label>
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <button type="button" onClick={resetEnvironmentForm} className="rounded-lg px-3 py-2 text-xs text-slate-600 hover:bg-white">Cancel</button>
                        <button type="button" onClick={editingEnvironmentId ? saveEnvironment : addEnvironment} className="rounded-lg bg-sky-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-900">{editingEnvironmentId ? "Save environment" : "Add environment"}</button>
                      </div>
                    </div>
                  ) : null}

                  <div className="divide-y divide-slate-100">
                    {selectedMatrix.environments.length ? selectedMatrix.environments.map((environment) => {
                      const summary = environmentSummary(environment);
                      return (
                        <div key={environment.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                          <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{environment.name}</span>
                          <span className="text-[11px] text-slate-500">{summary.coverage}% checked · {summary.issue} issue(s) · {summary.pending} pending</span>
                          {canEdit ? (
                            <div className="flex flex-wrap gap-1">
                              <button type="button" onClick={() => markEnvironmentState(environment.id, "na")} disabled={summary.pending === 0} className="rounded-md border border-violet-200 px-2 py-1 text-[10px] text-violet-700 hover:bg-violet-50 disabled:opacity-40">Pending → N/A</button>
                              <button type="button" onClick={() => copyEnvironment(environment)} disabled={selectedMatrix.environments.length >= MAX_ENVIRONMENTS} className="rounded-md border border-slate-200 px-2 py-1 text-[10px] text-slate-600 hover:bg-slate-50 disabled:opacity-40">Duplicate</button>
                            </div>
                          ) : null}
                        </div>
                      );
                    }) : (
                      <p className="px-4 py-8 text-center text-xs text-slate-500">Add at least one browser/device environment to populate the matrix.</p>
                    )}
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Coverage results</h3>
                        <p className="mt-0.5 text-xs text-slate-500">{visibleChecks.length} checks shown · {visibleEnvironments.length} of {selectedMatrix.environments.length} environments · {metrics.total} total result cells</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input value={checkQuery} onChange={(event) => setCheckQuery(event.target.value)} placeholder="Search checks" className="w-40 rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2.5 text-xs outline-none focus:border-sky-400" />
                      </label>
                      <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} aria-label="Filter checks by priority" className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600">
                        <option value="all">All priorities</option>
                        {["Critical", "High", "Medium", "Low"].map((priority) => (
                          <option key={priority} value={priority}>{priority} ({selectedMatrix.checks.filter((check) => check.priority === priority).length})</option>
                        ))}
                      </select>
                      <select value={activeEnvironmentFilter} onChange={(event) => setEnvironmentFilter(event.target.value)} aria-label="Filter matrix environments" className="max-w-48 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600">
                        <option value="all">All environments</option>
                        {selectedMatrix.environments.map((environment) => (
                          <option key={environment.id} value={environment.id}>{environment.name}</option>
                        ))}
                      </select>
                      <select value={resultFilter} onChange={(event) => setResultFilter(event.target.value)} aria-label="Filter checks by environment result" className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600">
                        {RESULT_FILTERS.map((filter) => (
                          <option key={filter.id} value={filter.id}>
                            {filter.label} ({filter.id === "all" ? selectedMatrix.checks.length : selectedMatrix.checks.filter((check) => visibleEnvironments.some((environment) => getResult(selectedMatrix, environment.id, check.id).status === filter.id)).length})
                          </option>
                        ))}
                      </select>
                      <select value={checkSort} onChange={(event) => setCheckSort(event.target.value)} aria-label="Sort matrix checks" className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600">
                        <option value="original">Original order</option>
                        <option value="priority">Priority: highest first</option>
                        <option value="area">Area: A–Z</option>
                        <option value="title">Check: A–Z</option>
                      </select>
                      {checkQuery || resultFilter !== "all" || priorityFilter !== "all" || environmentFilter !== "all" ? <button type="button" onClick={clearResultFilter} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-slate-500 hover:bg-slate-100"><FilterX className="h-3.5 w-3.5" aria-hidden="true" /> Reset filters</button> : null}
                      <button type="button" onClick={exportVisibleCsv} disabled={!visibleChecks.length || !selectedMatrix.environments.length} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><Download className="h-3.5 w-3.5" aria-hidden="true" /> Export shown</button>
                      {canEdit ? <button type="button" onClick={() => { if (showCheckForm) cancelCheckEdit(); else { setEditingCheckId(""); setCheckTitle(""); setCheckArea(""); setCheckPriority("Medium"); setCheckExpected(""); setShowCheckForm(true); } }} disabled={!editingCheckId && selectedMatrix.checks.length >= MAX_CHECKS} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add check</button> : null}
                    </div>
                  </div>
                  {showCheckForm && canEdit ? (
                    <div className="border-b border-slate-200 bg-emerald-50/30 p-4">
                      <h4 className="text-sm font-semibold text-slate-800">{editingCheckId ? "Edit custom check" : "Add a custom check"}</h4>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="text-xs font-medium text-slate-600 sm:col-span-2">Check *
                          <input value={checkTitle} onChange={(event) => setCheckTitle(event.target.value)} maxLength={180} placeholder="Describe the behavior to verify" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" />
                        </label>
                        <label className="text-xs font-medium text-slate-600">Area
                          <input value={checkArea} onChange={(event) => setCheckArea(event.target.value)} maxLength={100} placeholder="e.g. Checkout" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal" />
                        </label>
                        <label className="text-xs font-medium text-slate-600">Priority
                          <select value={checkPriority} onChange={(event) => setCheckPriority(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select>
                        </label>
                        <label className="text-xs font-medium text-slate-600 sm:col-span-2 lg:col-span-4">Expected behavior
                          <textarea value={checkExpected} onChange={(event) => setCheckExpected(event.target.value)} maxLength={600} rows={2} placeholder="What should happen in each environment?" className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" />
                        </label>
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <button type="button" onClick={cancelCheckEdit} className="rounded-lg px-3 py-2 text-xs text-slate-600 hover:bg-white">Cancel</button>
                        <button type="button" onClick={addCheck} className="rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800">{editingCheckId ? "Save changes" : "Add check"}</button>
                      </div>
                    </div>
                  ) : null}

                  {visibleEnvironments.length && visibleChecks.length ? (
                    <div className="overflow-x-auto">
                      <div className="min-w-max">
                        <div className="sticky top-0 z-10 flex border-b border-slate-200 bg-slate-100">
                          <div className="sticky left-0 z-20 min-w-[260px] border-r border-slate-200 bg-slate-100 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-700">Check / scenario</span>
                              {canEdit ? <button type="button" onClick={() => setShowCheckForm(true)} className="text-[10px] font-medium text-sky-700 hover:underline">Add</button> : null}
                            </div>
                            <p className="mt-1 text-[10px] text-slate-500">Rows are checks, columns are environments</p>
                          </div>
                          {visibleEnvironments.map((environment) => (
                            <EnvironmentHeader key={environment.id} environment={environment} canEdit={canEdit} onUpdate={beginEditEnvironment} onRemove={removeEnvironment} />
                          ))}
                        </div>
                        {visibleChecks.map(({ check, index }) => (
                          <div key={check.id} className="flex border-b border-slate-100 last:border-b-0">
                            <div className="sticky left-0 z-[1] min-w-[260px] max-w-[260px] border-r border-slate-200 bg-white p-3">
                              <div className="flex items-start gap-2">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-semibold text-slate-500">{index + 1}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap gap-1">
                                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">{check.area}</span>
                                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${check.priority === "Critical" ? "bg-rose-100 text-rose-700" : check.priority === "High" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>{check.priority}</span>
                                    {check.custom ? <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] text-violet-700">Custom</span> : null}
                                  </div>
                                  <p className="mt-1.5 text-xs font-semibold leading-4 text-slate-800">{check.title}</p>
                                  {check.expected ? <p className="mt-1 line-clamp-3 text-[10px] leading-4 text-slate-500">{check.expected}</p> : null}
                                  {canEdit ? (
                                    <button
                                      type="button"
                                      onClick={() => markCheckPendingNotApplicable(check.id)}
                                      disabled={!selectedMatrix.environments.some((environment) => getResult(selectedMatrix, environment.id, check.id).status === "pending")}
                                      className="mt-2 rounded-md border border-violet-200 px-2 py-1 text-[10px] text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      Pending → N/A ({selectedMatrix.environments.filter((environment) => getResult(selectedMatrix, environment.id, check.id).status === "pending").length})
                                    </button>
                                  ) : null}
                                  {check.custom && canEdit ? <button type="button" onClick={() => editCheck(check)} className="mt-1 block text-[10px] text-sky-700 hover:underline">Edit custom check</button> : null}
                                  {check.custom && canEdit ? <button type="button" onClick={() => removeCheck(check.id)} className="mt-1 text-[10px] text-rose-600 hover:underline">Remove custom check</button> : null}
                                </div>
                              </div>
                            </div>
                            {visibleEnvironments.map((environment) => (
                              <MatrixCell
                                key={`${environment.id}:${check.id}`}
                                environment={environment}
                                check={check}
                                result={getResult(selectedMatrix, environment.id, check.id)}
                                reports={reports}
                                canEdit={canEdit}
                                onUpdate={updateCell}
                                onOpenReport={onOpenReport}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <EmptyState
                        title={!selectedMatrix.environments.length ? "Add an environment to begin" : "No checks match this view"}
                        description={!selectedMatrix.environments.length ? "Configure browsers, platforms, devices, and viewport sizes to create matrix columns." : "Try changing the search or result filter."}
                        icon={Search}
                      />
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Matrix activity</h3>
                      <p className="mt-0.5 text-xs text-slate-500">Latest {selectedMatrix.activity.length} local changes</p>
                    </div>
                    <Layers3 className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  </div>
                  {selectedMatrix.activity.length ? (
                    <ol className="mt-3 space-y-2">
                      {[...selectedMatrix.activity].reverse().slice(0, 10).map((entry) => (
                        <li key={entry.id} className="flex items-start gap-2 text-xs">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                          <span className="flex-1 text-slate-700">{entry.message}</span>
                          <time className="shrink-0 text-[10px] text-slate-400">{new Date(entry.createdAt).toLocaleString()}</time>
                        </li>
                      ))}
                    </ol>
                  ) : <p className="mt-3 text-xs text-slate-500">Matrix changes will appear here.</p>}
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    </section>
  );
}
