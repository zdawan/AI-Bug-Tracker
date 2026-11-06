"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDashed,
  ClipboardList,
  Clock3,
  Download,
  FileSearch,
  FilterX,
  Info,
  RotateCcw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";

const STORAGE_PREFIX = "tester-report-investigation-v1";
const INITIAL_VISIBLE = 6;
const MAX_STEPS = 30;
const MAX_NOTE_LENGTH = 800;

const STEP_STATES = [
  {
    id: "pending",
    label: "Not run",
    icon: Circle,
    tone: "border-slate-200 bg-slate-50 text-slate-600",
  },
  {
    id: "passed",
    label: "Passed",
    icon: CheckCircle2,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    id: "failed",
    label: "Failed",
    icon: ShieldAlert,
    tone: "border-rose-200 bg-rose-50 text-rose-700",
  },
  {
    id: "blocked",
    label: "Blocked",
    icon: AlertTriangle,
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
];

const SESSION_STATES = [
  { value: "all", label: "All investigation states" },
  { value: "pending", label: "Not started" },
  { value: "in-progress", label: "In progress" },
  { value: "reproduced", label: "Issue reproduced" },
  { value: "not-reproduced", label: "Not reproduced" },
  { value: "blocked", label: "Blocked" },
];

function getText(value, limit = 320) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function getReportId(report) {
  const raw = report?._id ?? report?.id;
  return raw === null || raw === undefined ? "" : String(raw).trim();
}

function getTitle(report) {
  return (
    getText(report?.title, 240) ||
    getText(report?.summary, 240) ||
    "Untitled report"
  );
}

function getCategory(report) {
  return getText(report?.category, 120) || "Uncategorized";
}

function getSeverity(report) {
  return getText(report?.severity, 80) || "Unspecified";
}

function getReportDate(report) {
  const value = report?.createdAt || report?.created_at || report?.reportedAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function getTimestamp(value) {
  if (typeof value !== "string" || !value) return "";
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
}

function getStorageKey(email) {
  return `${STORAGE_PREFIX}:${email}`;
}

function getSeverityRank(report) {
  const severity = getSeverity(report).toLowerCase();
  if (["critical", "blocker", "urgent"].includes(severity)) return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  if (severity === "low") return 1;
  return 0;
}

function parseReproductionSteps(description) {
  if (typeof description !== "string" || !description.trim()) return [];

  const lines = description.replace(/\r\n?/g, "\n").split("\n");
  const heading = /^\s*(?:steps to reproduce|reproduction steps|steps)\s*:?\s*$/i;
  const sectionEnd =
    /^\s*(?:expected behavior|actual behavior|observed behavior|additional context|environment|notes|result)\s*:?\s*$/i;
  const numbered = /^\s*(?:\d{1,2}[.)]|[-*•])\s+(.+?)\s*$/;
  const steps = [];
  let inSteps = false;

  for (const line of lines) {
    if (heading.test(line)) {
      inSteps = true;
      continue;
    }
    if (inSteps && sectionEnd.test(line)) break;
    if (!inSteps) continue;

    const match = line.match(numbered);
    if (match && match[1]) {
      steps.push(match[1].trim());
      if (steps.length >= MAX_STEPS) break;
    }
  }

  if (steps.length) return steps;

  const allNumbered = lines
    .map((line) => line.match(numbered)?.[1]?.trim())
    .filter(Boolean)
    .slice(0, MAX_STEPS);
  return allNumbered;
}

function getInitialSteps(report) {
  const parsed = parseReproductionSteps(report?.description);
  if (parsed.length) return parsed;
  return [
    "Review the report description and define a reproducible path.",
    "Verify the reported behavior and record the result.",
  ];
}

function makeStepId(text, index) {
  return `${index}:${text.toLowerCase().replace(/\s+/g, " ").slice(0, 80)}`;
}

function normalizeSession(raw, report) {
  const currentSteps = getInitialSteps(report);
  const savedSteps = Array.isArray(raw?.steps) ? raw.steps : [];
  const byId = new Map(
    savedSteps
      .filter((step) => step && typeof step === "object")
      .map((step) => [getText(step.id, 180), step]),
  );
  const steps = currentSteps.map((text, index) => {
    const id = makeStepId(text, index);
    const saved = byId.get(id);
    const state = STEP_STATES.some((item) => item.id === saved?.state)
      ? saved.state
      : "pending";
    return { id, text, state };
  });

  return {
    steps,
    note:
      typeof raw?.note === "string"
        ? raw.note.slice(0, MAX_NOTE_LENGTH)
        : "",
    startedAt: getTimestamp(raw?.startedAt),
    updatedAt: getTimestamp(raw?.updatedAt),
  };
}

function normalizeStore(raw, reports) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const reportById = new Map(
    reports.map((report) => [getReportId(report), report]).filter(([id]) => id),
  );

  return Object.entries(raw).reduce((result, [id, session]) => {
    const report = reportById.get(id);
    if (!report || !session || typeof session !== "object") return result;
    result[id] = normalizeSession(session, report);
    return result;
  }, {});
}

function makeEmptySession(report) {
  return normalizeSession({}, report);
}

function getSessionState(session) {
  const steps = Array.isArray(session?.steps) ? session.steps : [];
  if (!steps.some((step) => step.state !== "pending")) return "pending";
  if (steps.some((step) => step.state === "failed")) return "reproduced";
  if (steps.some((step) => step.state === "blocked")) return "blocked";
  if (steps.length && steps.every((step) => step.state === "passed")) {
    return "not-reproduced";
  }
  return "in-progress";
}

function getStateLabel(state) {
  return (
    SESSION_STATES.find((item) => item.value === state)?.label ||
    "Not started"
  );
}

function getCompletion(session) {
  const steps = Array.isArray(session?.steps) ? session.steps : [];
  const finished = steps.filter((step) => step.state !== "pending").length;
  return {
    finished,
    total: steps.length,
    percent: steps.length ? Math.round((finished / steps.length) * 100) : 0,
    passed: steps.filter((step) => step.state === "passed").length,
    failed: steps.filter((step) => step.state === "failed").length,
    blocked: steps.filter((step) => step.state === "blocked").length,
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDate(value) {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    return "Date unavailable";
  }
  return value.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  const timestamp = Date.parse(value || "");
  if (!Number.isFinite(timestamp)) return "Not started";
  return new Date(timestamp).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function matchesSearch(report, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    getReportId(report),
    getTitle(report),
    getCategory(report),
    getSeverity(report),
    getText(report?.description, 4000),
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function exportCsv(reports, sessions) {
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = [
    [
      "Report ID",
      "Report title",
      "Category",
      "Severity",
      "Investigation state",
      "Passed steps",
      "Failed steps",
      "Blocked steps",
      "Total steps",
      "Last updated",
    ],
  ];

  reports.forEach((report) => {
    const id = getReportId(report);
    const session = sessions[id] || makeEmptySession(report);
    const completion = getCompletion(session);
    rows.push([
      id,
      getTitle(report),
      getCategory(report),
      getSeverity(report),
      getStateLabel(getSessionState(session)),
      completion.passed,
      completion.failed,
      completion.blocked,
      completion.total,
      session.updatedAt,
    ]);
  });

  const blob = new Blob(
    [`\uFEFF${rows.map((row) => row.map(escape).join(",")).join("\r\n")}`],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `open-report-investigation-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function OutcomeButton({ step, state, onChange }) {
  const Icon = state.icon;
  const active = step.state === state.id;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onChange(step.id, state.id)}
      title={`Mark step ${state.label.toLowerCase()}`}
      className={`inline-flex min-h-8 items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[9px] font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 ${
        active
          ? state.tone
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
      }`}
    >
      <Icon size={11} aria-hidden="true" />
      {state.label}
    </button>
  );
}

function StateBadge({ state }) {
  const styles = {
    pending: "border-slate-200 bg-slate-50 text-slate-600",
    "in-progress": "border-sky-200 bg-sky-50 text-sky-700",
    reproduced: "border-rose-200 bg-rose-50 text-rose-700",
    "not-reproduced": "border-emerald-200 bg-emerald-50 text-emerald-700",
    blocked: "border-amber-200 bg-amber-50 text-amber-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-semibold ${styles[state]}`}
    >
      {state === "reproduced" ? (
        <ShieldAlert size={11} aria-hidden="true" />
      ) : state === "not-reproduced" ? (
        <CheckCircle2 size={11} aria-hidden="true" />
      ) : state === "blocked" ? (
        <AlertTriangle size={11} aria-hidden="true" />
      ) : state === "in-progress" ? (
        <Clock3 size={11} aria-hidden="true" />
      ) : (
        <CircleDashed size={11} aria-hidden="true" />
      )}
      {getStateLabel(state)}
    </span>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-2.5 pr-8 text-[10px] font-medium text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={12}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
      </span>
    </label>
  );
}

function StepRow({ step, index, onChange }) {
  return (
    <li className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-[9px] font-bold text-slate-500 tabular-nums">
            {index + 1}
          </span>
          <p className="min-w-0 flex-1 whitespace-pre-wrap break-words pt-0.5 text-[11px] leading-5 text-slate-700">
            {step.text}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          {STEP_STATES.map((state) => (
            <OutcomeButton
              key={state.id}
              step={step}
              state={state}
              onChange={onChange}
            />
          ))}
        </div>
      </div>
    </li>
  );
}

function InvestigationCard({
  report,
  session,
  onStepChange,
  onNoteChange,
  onReset,
  onOpenReport,
}) {
  const id = getReportId(report);
  const state = getSessionState(session);
  const completion = getCompletion(session);
  const severityRank = getSeverityRank(report);
  const severityTone =
    severityRank >= 3
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : severityRank === 2
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-600";
  const started = Boolean(session.startedAt);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/20">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[9px] font-semibold text-slate-400">
                {id ? `#${id.slice(-8)}` : "Report"}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${severityTone}`}
              >
                {getSeverity(report)}
              </span>
              <span className="max-w-full truncate rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] text-slate-500">
                {getCategory(report)}
              </span>
            </div>
            <h3 className="mt-2 break-words text-sm font-semibold text-slate-900">
              {getTitle(report)}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-slate-500">
              <span>Submitted {formatDate(getReportDate(report))}</span>
              <span>Session {started ? "started" : "not started"}</span>
              <span>Updated {formatDateTime(session.updatedAt)}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <StateBadge state={state} />
            {onOpenReport && (
              <button
                type="button"
                onClick={() => onOpenReport(report)}
                className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
              >
                Open report
                <ArrowUpRight size={11} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold text-violet-900">
                Reproduction checklist
              </p>
              <p className="mt-0.5 text-[9px] text-violet-800/70">
                {completion.finished} of {completion.total} steps recorded ·{" "}
                {completion.passed} passed · {completion.failed} failed ·{" "}
                {completion.blocked} blocked
              </p>
            </div>
            <span className="text-xs font-semibold text-violet-800 tabular-nums">
              {completion.percent}%
            </span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-white"
            role="progressbar"
            aria-label={`Investigation completion for ${getTitle(report)}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completion.percent}
          >
            <div
              className="h-full rounded-full bg-violet-500 transition-[width]"
              style={{ width: `${completion.percent}%` }}
            />
          </div>
        </div>

        <ol className="mt-3 space-y-2">
          {session.steps.map((step, index) => (
            <StepRow
              key={step.id}
              step={step}
              index={index}
              onChange={(stepId, result) => onStepChange(id, stepId, result)}
            />
          ))}
        </ol>

        <label className="mt-3 block">
          <span className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            <span>Private investigation note</span>
            <span className="font-normal normal-case tracking-normal">
              {session.note.length}/{MAX_NOTE_LENGTH} · excluded from CSV
            </span>
          </span>
          <textarea
            value={session.note}
            maxLength={MAX_NOTE_LENGTH}
            rows={2}
            onChange={(event) => onNoteChange(id, event.target.value)}
            placeholder="Optional browser-only note about setup, observations, or follow-up."
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] leading-5 text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
          />
        </label>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="max-w-xl text-[9px] leading-4 text-slate-500">
            Results and notes stay in this browser under the tester email. They
            do not change the report&apos;s server-side status.
          </p>
          {(started || session.note) && (
            <button
              type="button"
              onClick={() => onReset(id)}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[9px] font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
            >
              <RotateCcw size={11} aria-hidden="true" />
              Reset session
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function MetricCard({ label, value, hint, icon: Icon, tone }) {
  const tones = {
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    sky: "border-sky-100 bg-sky-50 text-sky-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
  };
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold leading-none text-slate-950 tabular-nums">
            {formatNumber(value)}
          </p>
        </div>
        <span
          className={`grid h-9 w-9 place-items-center rounded-xl border ${tones[tone]}`}
        >
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-[9px] leading-4 text-slate-500">{hint}</p>
    </article>
  );
}

function EmptyState({ hasOpenReports, hasFilters, onReset }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-9 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-white text-slate-400 shadow-sm">
        {hasOpenReports ? (
          <Search size={18} aria-hidden="true" />
        ) : (
          <FileSearch size={18} aria-hidden="true" />
        )}
      </span>
      <h3 className="mt-3 text-xs font-semibold text-slate-800">
        {hasOpenReports
          ? "No open reports match these filters"
          : "No open reports to investigate"}
      </h3>
      <p className="mx-auto mt-1 max-w-md text-[10px] leading-5 text-slate-500">
        {hasOpenReports
          ? "Try another investigation state or search term."
          : "Open reports will appear here with reproduction steps extracted from their descriptions when available."}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          <FilterX size={12} aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );
}

export default function ReportInvestigationWorkspace({
  reports = [],
  email,
  onOpenReport,
}) {
  const [sessions, setSessions] = useState({});
  const [loadedForEmail, setLoadedForEmail] = useState("");
  const [canPersist, setCanPersist] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [exportError, setExportError] = useState("");
  const [exportNotice, setExportNotice] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stepFilter, setStepFilter] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const normalizedEmail = getText(email, 320).toLowerCase();
  const storageKey = normalizedEmail ? getStorageKey(normalizedEmail) : "";

  const openReports = useMemo(
    () =>
      reports.filter(
        (report) => report?.status !== "Closed" && getReportId(report),
      ),
    [reports],
  );
  const categoryOptions = useMemo(() => {
    const categories = Array.from(
      new Set(openReports.map((report) => getCategory(report))),
    ).sort((left, right) => left.localeCompare(right));
    return [
      { value: "all", label: "All categories" },
      ...categories.map((category) => ({ value: category, label: category })),
    ];
  }, [openReports]);
  const severityOptions = useMemo(() => {
    const severities = Array.from(
      new Set(openReports.map((report) => getSeverity(report))),
    ).sort((left, right) => left.localeCompare(right));
    return [
      { value: "all", label: "All severities" },
      ...severities.map((severity) => ({ value: severity, label: severity })),
    ];
  }, [openReports]);

  useEffect(() => {
    setSessions({});
    setLoadedForEmail("");
    setCanPersist(false);
    setStorageError("");
    setStateFilter("all");
    setSeverityFilter("all");
    setCategoryFilter("all");
    setStepFilter("all");
    setQuery("");
    setVisibleCount(INITIAL_VISIBLE);
    if (!normalizedEmail) return;

    try {
      const saved = window.localStorage.getItem(getStorageKey(normalizedEmail));
      setSessions(saved ? normalizeStore(JSON.parse(saved), reports) : {});
      setCanPersist(true);
    } catch {
      setStorageError(
        "Could not read investigation sessions from this browser. New changes remain available in memory.",
      );
      setSessions({});
    } finally {
      setLoadedForEmail(normalizedEmail);
    }
  }, [normalizedEmail, reports]);

  useEffect(() => {
    if (!canPersist || !storageKey || loadedForEmail !== normalizedEmail) {
      return;
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(sessions));
      setStorageError("");
    } catch {
      setStorageError(
        "Investigation changes are only in memory because browser storage could not save them.",
      );
    }
  }, [canPersist, loadedForEmail, normalizedEmail, sessions, storageKey]);

  const counts = useMemo(
    () =>
      openReports.reduce(
        (result, report) => {
          const id = getReportId(report);
          const state = getSessionState(
            sessions[id] || makeEmptySession(report),
          );
          result.total += 1;
          result[state] = (result[state] || 0) + 1;
          return result;
        },
        {
          total: 0,
          pending: 0,
          "in-progress": 0,
          reproduced: 0,
          "not-reproduced": 0,
          blocked: 0,
        },
      ),
    [openReports, sessions],
  );

  const filteredReports = useMemo(
    () =>
      openReports
        .filter((report) => {
          if (
            severityFilter !== "all" &&
            getSeverity(report) !== severityFilter
          ) {
            return false;
          }
          if (
            categoryFilter !== "all" &&
            getCategory(report) !== categoryFilter
          ) {
            return false;
          }
          const id = getReportId(report);
          const session = sessions[id] || makeEmptySession(report);
          const completion = getCompletion(session);
          if (
            stateFilter !== "all" &&
            getSessionState(session) !== stateFilter
          ) {
            return false;
          }
          if (stepFilter === "with-failures" && completion.failed === 0) {
            return false;
          }
          if (stepFilter === "with-blockers" && completion.blocked === 0) {
            return false;
          }
          if (
            stepFilter === "unfinished" &&
            completion.finished >= completion.total
          ) {
            return false;
          }
          return matchesSearch(report, query);
        })
        .sort((left, right) => {
          if (sortBy === "oldest") {
            return (
              (getReportDate(left)?.getTime() ?? 0) -
              (getReportDate(right)?.getTime() ?? 0)
            );
          }
          if (sortBy === "newest") {
            return (
              (getReportDate(right)?.getTime() ?? 0) -
              (getReportDate(left)?.getTime() ?? 0)
            );
          }
          if (sortBy === "severity") {
            return getSeverityRank(right) - getSeverityRank(left);
          }
          if (sortBy === "title") {
            return getTitle(left).localeCompare(getTitle(right));
          }
          const leftState = getSessionState(
            sessions[getReportId(left)] || makeEmptySession(left),
          );
          const rightState = getSessionState(
            sessions[getReportId(right)] || makeEmptySession(right),
          );
          const order = {
            reproduced: 0,
            blocked: 1,
            "in-progress": 2,
            pending: 3,
            "not-reproduced": 4,
          };
          const stateDifference =
            (order[leftState] ?? 5) - (order[rightState] ?? 5);
          if (stateDifference) return stateDifference;
          const severityDifference =
            getSeverityRank(right) - getSeverityRank(left);
          if (severityDifference) return severityDifference;
          return (
            (getReportDate(left)?.getTime() ?? 0) -
            (getReportDate(right)?.getTime() ?? 0)
          );
        }),
    [
      categoryFilter,
      openReports,
      query,
      sessions,
      severityFilter,
      sortBy,
      stepFilter,
      stateFilter,
    ],
  );

  const visibleReports = filteredReports.slice(0, visibleCount);
  const completedSteps = openReports.reduce((total, report) => {
    const session =
      sessions[getReportId(report)] || makeEmptySession(report);
    return total + getCompletion(session).finished;
  }, 0);
  const failedSteps = openReports.reduce((total, report) => {
    const session =
      sessions[getReportId(report)] || makeEmptySession(report);
    return total + getCompletion(session).failed;
  }, 0);
  const hasFilters =
    stateFilter !== "all" ||
    severityFilter !== "all" ||
    categoryFilter !== "all" ||
    stepFilter !== "all" ||
    Boolean(query.trim());

  const updateSession = (reportId, updater) => {
    const report = openReports.find(
      (candidate) => getReportId(candidate) === reportId,
    );
    if (!report) return;
    setSessions((current) => {
      const existing = current[reportId] || makeEmptySession(report);
      const updatedAt = new Date().toISOString();
      const next = updater(existing);
      return {
        ...current,
        [reportId]: {
          ...next,
          startedAt: existing.startedAt || updatedAt,
          updatedAt,
        },
      };
    });
    setExportError("");
    setExportNotice("");
  };

  const handleStepChange = (reportId, stepId, state) => {
    if (!STEP_STATES.some((candidate) => candidate.id === state)) return;
    updateSession(reportId, (session) => ({
      ...session,
      steps: session.steps.map((step) =>
        step.id === stepId ? { ...step, state } : step,
      ),
    }));
  };

  const handleNoteChange = (reportId, note) => {
    updateSession(reportId, (session) => ({
      ...session,
      note: typeof note === "string" ? note.slice(0, MAX_NOTE_LENGTH) : "",
    }));
  };

  const handleReset = (reportId) => {
    const report = openReports.find(
      (candidate) => getReportId(candidate) === reportId,
    );
    if (!report) return;
    setSessions((current) => {
      const next = { ...current };
      delete next[reportId];
      return next;
    });
  };

  const resetFilters = () => {
    setStateFilter("all");
    setSeverityFilter("all");
    setCategoryFilter("all");
    setStepFilter("all");
    setSortBy("priority");
    setQuery("");
    setVisibleCount(INITIAL_VISIBLE);
  };

  const handleExport = () => {
    setExportError("");
    setExportNotice("");
    try {
      exportCsv(filteredReports, sessions);
      setExportNotice(
        `Exported ${formatNumber(filteredReports.length)} filtered reports. Private notes were excluded.`,
      );
    } catch {
      setExportError(
        "Could not create the investigation CSV. Check browser download permissions and try again.",
      );
    }
  };

  const setFilter = (setter, value) => {
    setter(value);
    setVisibleCount(INITIAL_VISIBLE);
    setExportError("");
    setExportNotice("");
  };

  const hasMore = visibleCount < filteredReports.length;

  return (
    <section className="mt-5 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
      <div className="border-b border-slate-200/80 bg-gradient-to-r from-sky-50/70 via-white to-rose-50/50 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-sky-100 bg-white text-sky-700 shadow-sm">
                <ClipboardList size={19} aria-hidden="true" />
              </span>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold text-sky-700">
                Patch 13 · Local investigation sessions
              </span>
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">
              Open-report investigation workspace
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-slate-600">
              Work through reproduction steps for open reports, record each
              result, and keep private browser-only notes. Outcomes stay
              separate from the server report status.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={!filteredReports.length}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={14} aria-hidden="true" />
            Export filtered CSV
          </button>
        </div>
        <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-3 text-[10px] leading-5 text-amber-900/80">
          Investigation results are personal notes, not a workflow transition.
          Marking steps as passed, failed, or blocked never changes the
          server-side report status. CSV includes aggregate step outcomes but
          excludes private notes and report descriptions.
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {storageError && (
          <p
            role="status"
            className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-800"
          >
            {storageError}
          </p>
        )}
        {!normalizedEmail && (
          <p
            role="status"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs leading-5 text-slate-600"
          >
            Search for your reports using your tester email to enable
            email-scoped investigation storage.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Open reports"
            value={counts.total}
            hint="Available to investigate"
            icon={FileSearch}
            tone="violet"
          />
          <MetricCard
            label="Not started"
            value={counts.pending}
            hint="No local step results recorded"
            icon={CircleDashed}
            tone="sky"
          />
          <MetricCard
            label="In progress"
            value={counts["in-progress"]}
            hint="At least one step checked"
            icon={Clock3}
            tone="amber"
          />
          <MetricCard
            label="Issue reproduced"
            value={counts.reproduced}
            hint="One or more steps marked failed"
            icon={ShieldAlert}
            tone="rose"
          />
          <MetricCard
            label="Steps recorded"
            value={completedSteps}
            hint={`${formatNumber(failedSteps)} failed across all open reports`}
            icon={CheckCircle2}
            tone="emerald"
          />
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-slate-800">
                Filter investigation sessions
              </h3>
              <p className="mt-1 text-[9px] text-slate-500">
                Filters apply to the visible queue and CSV export.
              </p>
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[9px] font-semibold text-violet-700 hover:bg-violet-50"
              >
                <X size={11} aria-hidden="true" />
                Clear filters
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FilterSelect
              label="Investigation state"
              value={stateFilter}
              onChange={(value) => setFilter(setStateFilter, value)}
              options={SESSION_STATES}
            />
            <FilterSelect
              label="Step results"
              value={stepFilter}
              onChange={(value) => setFilter(setStepFilter, value)}
              options={[
                { value: "all", label: "Any step results" },
                { value: "with-failures", label: "Has failed steps" },
                { value: "with-blockers", label: "Has blocked steps" },
                { value: "unfinished", label: "Has unfinished steps" },
              ]}
            />
            <FilterSelect
              label="Severity"
              value={severityFilter}
              onChange={(value) => setFilter(setSeverityFilter, value)}
              options={severityOptions}
            />
            <FilterSelect
              label="Category"
              value={categoryFilter}
              onChange={(value) => setFilter(setCategoryFilter, value)}
              options={categoryOptions}
            />
            <FilterSelect
              label="Sort by"
              value={sortBy}
              onChange={(value) => setFilter(setSortBy, value)}
              options={[
                { value: "priority", label: "Investigation priority" },
                { value: "severity", label: "Severity first" },
                { value: "oldest", label: "Oldest report first" },
                { value: "newest", label: "Newest report first" },
                { value: "title", label: "Title A–Z" },
              ]}
            />
            <label className="grid gap-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Search reports
              </span>
              <span className="relative">
                <Search
                  size={13}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setFilter(setQuery, event.target.value)}
                  placeholder="Title, ID, description…"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                />
              </span>
            </label>
          </div>
          <p className="mt-3 text-[9px] text-slate-500" aria-live="polite">
            Showing {formatNumber(filteredReports.length)} of{" "}
            {formatNumber(openReports.length)} open reports
          </p>
        </div>

        {(exportError || exportNotice) && (
          <p
            role={exportError ? "alert" : "status"}
            className={`rounded-xl border px-3.5 py-3 text-xs ${
              exportError
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {exportError || exportNotice}
          </p>
        )}

        {filteredReports.length ? (
          <div className="space-y-3">
            {visibleReports.map((report) => {
              const id = getReportId(report);
              return (
                <InvestigationCard
                  key={id}
                  report={report}
                  session={sessions[id] || makeEmptySession(report)}
                  onStepChange={handleStepChange}
                  onNoteChange={handleNoteChange}
                  onReset={handleReset}
                  onOpenReport={onOpenReport}
                />
              );
            })}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <p className="text-[9px] text-slate-500">
                {hasMore
                  ? `Showing ${formatNumber(visibleReports.length)} of ${formatNumber(
                      filteredReports.length,
                    )}`
                  : `All ${formatNumber(filteredReports.length)} matching reports are shown`}
              </p>
              <div className="flex items-center gap-2">
                {visibleCount > INITIAL_VISIBLE && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount(INITIAL_VISIBLE)}
                    className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <ChevronDown size={11} className="rotate-180" aria-hidden="true" />
                    Show fewer
                  </button>
                )}
                {hasMore && (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount((current) =>
                        Math.min(current + INITIAL_VISIBLE, filteredReports.length),
                      )
                    }
                    className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[9px] font-semibold text-violet-700 hover:bg-violet-100"
                  >
                    Show more
                    <ChevronDown size={11} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            hasOpenReports={openReports.length > 0}
            hasFilters={hasFilters}
            onReset={resetFilters}
          />
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-violet-900">
              <ClipboardList size={14} aria-hidden="true" />
              Step extraction
            </p>
            <p className="mt-1.5 text-[10px] leading-5 text-violet-900/75">
              Numbered or bulleted steps inside a Steps to reproduce section
              are extracted from the report description. If no steps are
              detected, a small manual investigation starter checklist is
              provided instead.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800">
              <Info size={14} aria-hidden="true" />
              Local data and status
            </p>
            <p className="mt-1.5 text-[10px] leading-5 text-slate-600">
              Sessions are scoped to the tester email in browser storage.
              Investigation outcomes are not shared with admins and never
              change the report&apos;s open or closed status.
            </p>
          </div>
        </div>

        {!normalizedEmail && (
          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[9px] leading-4 text-slate-500">
            <Info size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              Sign-in email is needed for saved sessions. You can still review
              and edit steps during the current page view, but changes will not
              persist until an email is available.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
