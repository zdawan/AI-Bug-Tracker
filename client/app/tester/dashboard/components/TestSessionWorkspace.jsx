"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Bug,
  Check,
  CheckCheck,
  CircleDashed,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FilePlus2,
  FilterX,
  FlaskConical,
  Layers3,
  ListChecks,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  SkipForward,
  Trash2,
  X,
} from "lucide-react";

const STORAGE_PREFIX = "tester-test-sessions-v1";
const MAX_SESSIONS = 40;
const MAX_CASES_PER_SESSION = 80;
const MAX_ACTIVITY_ITEMS = 100;
const MAX_TEXT_LENGTH = 1200;

const CASE_STATES = [
  {
    id: "pending",
    label: "Not run",
    shortLabel: "Pending",
    icon: CircleDashed,
    tone: "border-slate-200 bg-slate-50 text-slate-600",
  },
  {
    id: "passed",
    label: "Passed",
    shortLabel: "Pass",
    icon: CheckCircleIcon,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    id: "failed",
    label: "Failed",
    shortLabel: "Fail",
    icon: ShieldAlert,
    tone: "border-rose-200 bg-rose-50 text-rose-700",
  },
  {
    id: "blocked",
    label: "Blocked",
    shortLabel: "Blocked",
    icon: Pause,
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    id: "skipped",
    label: "Skipped",
    shortLabel: "Skipped",
    icon: SkipForward,
    tone: "border-violet-200 bg-violet-50 text-violet-700",
  },
];

const SESSION_STATES = {
  draft: {
    label: "Draft",
    tone: "border-slate-200 bg-slate-50 text-slate-600",
  },
  active: {
    label: "Running",
    tone: "border-sky-200 bg-sky-50 text-sky-700",
  },
  paused: {
    label: "Paused",
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
  completed: {
    label: "Completed",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
};

const TEMPLATES = [
  {
    id: "smoke",
    name: "Release smoke",
    description: "Quick confidence checks for the most important user paths.",
    cases: [
      {
        title: "Application loads",
        area: "Availability",
        priority: "Critical",
        expected: "The application loads without a blocking error.",
        steps: ["Open the application URL", "Wait for the landing view"],
      },
      {
        title: "Primary navigation works",
        area: "Navigation",
        priority: "High",
        expected: "Primary navigation items open their intended destinations.",
        steps: ["Open each primary navigation item", "Return to the landing view"],
      },
      {
        title: "Core task completes",
        area: "Core workflow",
        priority: "Critical",
        expected: "A user can complete the primary workflow successfully.",
        steps: ["Start the primary workflow", "Submit valid information", "Confirm the success state"],
      },
      {
        title: "No unexpected console errors",
        area: "Stability",
        priority: "Medium",
        expected: "The main user path completes without unexpected runtime errors.",
        steps: ["Open browser developer tools", "Repeat the primary workflow", "Review the console"],
      },
    ],
  },
  {
    id: "regression",
    name: "Regression sweep",
    description: "Exercise existing behaviors around a changed area.",
    cases: [
      {
        title: "Changed behavior still works",
        area: "Changed area",
        priority: "Critical",
        expected: "The target behavior matches the approved requirement.",
        steps: ["Navigate to the changed area", "Perform the target action", "Check the resulting state"],
      },
      {
        title: "Existing adjacent flow is unaffected",
        area: "Adjacent workflow",
        priority: "High",
        expected: "Related existing workflows continue to behave as before.",
        steps: ["Open an adjacent workflow", "Complete its normal path", "Compare the result with expected behavior"],
      },
      {
        title: "Invalid input is handled clearly",
        area: "Validation",
        priority: "Medium",
        expected: "Invalid input is rejected with a useful, recoverable message.",
        steps: ["Enter invalid or incomplete data", "Submit the form", "Check the validation response"],
      },
      {
        title: "State persists across navigation",
        area: "State",
        priority: "Medium",
        expected: "Saved user state remains consistent after navigating away and back.",
        steps: ["Make a reversible state change", "Navigate to another section", "Return and verify the state"],
      },
      {
        title: "Responsive layout remains usable",
        area: "Responsive UI",
        priority: "Low",
        expected: "Content remains readable and interactive at supported viewport sizes.",
        steps: ["Check a desktop viewport", "Check a narrow viewport", "Try the main controls"],
      },
    ],
  },
  {
    id: "accessibility",
    name: "Accessibility basics",
    description: "A lightweight keyboard and semantics review checklist.",
    cases: [
      {
        title: "Keyboard can reach interactive controls",
        area: "Keyboard",
        priority: "High",
        expected: "Interactive controls are reachable in a logical tab order.",
        steps: ["Start from the page heading", "Use Tab and Shift+Tab", "Confirm focus is visible"],
      },
      {
        title: "Primary action works from the keyboard",
        area: "Keyboard",
        priority: "High",
        expected: "The primary action can be activated with an appropriate keyboard key.",
        steps: ["Focus the primary action", "Activate it with Enter or Space", "Confirm the action completes"],
      },
      {
        title: "Form fields have understandable labels",
        area: "Forms",
        priority: "Medium",
        expected: "Each field has a label or accessible name that explains its purpose.",
        steps: ["Inspect visible forms", "Check labels and required indicators", "Verify error messages identify affected fields"],
      },
      {
        title: "Status is not conveyed by color alone",
        area: "Visual communication",
        priority: "Medium",
        expected: "Important status meaning is also expressed with text or an accessible label.",
        steps: ["Review status badges and alerts", "Check for visible text or accessible equivalents"],
      },
    ],
  },
  {
    id: "api",
    name: "API contract checks",
    description: "Manual checks for response shape, validation, and error handling.",
    cases: [
      {
        title: "Valid request returns the expected shape",
        area: "Response contract",
        priority: "Critical",
        expected: "A valid request returns the documented fields and data types.",
        steps: ["Send a representative valid request", "Inspect status and response body", "Compare fields with the API contract"],
      },
      {
        title: "Missing required data is rejected",
        area: "Input validation",
        priority: "High",
        expected: "Missing required data receives a clear client error response.",
        steps: ["Omit one required field", "Send the request", "Check status and validation details"],
      },
      {
        title: "Unauthorized request is handled safely",
        area: "Access control",
        priority: "High",
        expected: "A request without valid authorization does not disclose protected data.",
        steps: ["Send a request without valid credentials", "Check status and response body", "Confirm protected data is absent"],
      },
      {
        title: "Unexpected server error is recoverable",
        area: "Error handling",
        priority: "Medium",
        expected: "The client receives a safe error response and can retry when appropriate.",
        steps: ["Exercise a safe failure scenario", "Inspect the error response", "Confirm no sensitive details are returned"],
      },
    ],
  },
];

const CASE_FILTERS = [
  { id: "all", label: "All cases" },
  { id: "pending", label: "Not run" },
  { id: "passed", label: "Passed" },
  { id: "failed", label: "Failed" },
  { id: "blocked", label: "Blocked" },
  { id: "skipped", label: "Skipped" },
];

function CheckCircleIcon(props) {
  return <CheckCheck {...props} />;
}

function getText(value, limit = 320) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function getId() {
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

function getCaseState(value) {
  return CASE_STATES.find((state) => state.id === value) || CASE_STATES[0];
}

function normalizeCase(testCase) {
  if (!testCase || typeof testCase !== "object" || Array.isArray(testCase)) {
    return null;
  }
  const steps = Array.isArray(testCase.steps)
    ? testCase.steps.slice(0, 20).map((step) => getText(step, 240)).filter(Boolean)
    : [];
  return {
    id: getText(testCase.id, 100) || getId(),
    title: getText(testCase.title, 180) || "Untitled test case",
    area: getText(testCase.area, 100),
    priority: getText(testCase.priority, 40) || "Medium",
    expected: getText(testCase.expected, 600),
    steps,
    status: getCaseState(testCase.status).id,
    observation: getText(testCase.observation, MAX_TEXT_LENGTH),
    reportId: getText(testCase.reportId, 120),
    evidenceUrl: getText(testCase.evidenceUrl, 1000),
    updatedAt: getTimestamp(testCase.updatedAt),
  };
}

function normalizeActivity(activity) {
  if (!activity || typeof activity !== "object" || Array.isArray(activity)) {
    return null;
  }
  const message = getText(activity.message, 240);
  if (!message) return null;
  return {
    id: getText(activity.id, 100) || getId(),
    message,
    createdAt: getTimestamp(activity.createdAt) || new Date().toISOString(),
    caseTitle: getText(activity.caseTitle, 180),
  };
}

function normalizeSession(session) {
  if (!session || typeof session !== "object" || Array.isArray(session)) {
    return null;
  }
  const cases = Array.isArray(session.cases)
    ? session.cases.slice(0, MAX_CASES_PER_SESSION).map(normalizeCase).filter(Boolean)
    : [];
  const activity = Array.isArray(session.activity)
    ? session.activity.slice(0, MAX_ACTIVITY_ITEMS).map(normalizeActivity).filter(Boolean)
    : [];
  const state = Object.hasOwn(SESSION_STATES, session.status)
    ? session.status
    : "draft";
  return {
    id: getText(session.id, 100) || getId(),
    name: getText(session.name, 180) || "Untitled test session",
    build: getText(session.build, 100),
    environment: getText(session.environment, 120),
    baseUrl: getText(session.baseUrl, 1000),
    notes: getText(session.notes, 2000),
    status: state,
    templateId: getText(session.templateId, 80),
    createdAt: getTimestamp(session.createdAt) || new Date().toISOString(),
    updatedAt: getTimestamp(session.updatedAt) || new Date().toISOString(),
    completedAt: getTimestamp(session.completedAt),
    cases,
    activity,
  };
}

function normalizeSessions(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_SESSIONS)
    .map(normalizeSession)
    .filter(Boolean);
}

function formatDate(value, options = {}) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(date);
}

function formatDuration(start, end = new Date()) {
  const startTime = Date.parse(start || "");
  const endTime = end instanceof Date ? end.getTime() : Date.parse(end || "");
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) {
    return "Not timed";
  }
  const minutes = Math.floor((endTime - startTime) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function getReportId(report) {
  const id = report?._id ?? report?.id;
  return id === null || id === undefined ? "" : String(id).trim();
}

function getReportTitle(report) {
  return getText(report?.title, 180) || getText(report?.summary, 180) || "Untitled report";
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function createCases(template) {
  return template.cases.map((testCase) => ({
    ...normalizeCase({
      ...testCase,
      id: getId(),
      status: "pending",
      observation: "",
      reportId: "",
      evidenceUrl: "",
      updatedAt: "",
    }),
  }));
}

function getSessionMetrics(session) {
  const totals = CASE_STATES.reduce(
    (result, state) => ({ ...result, [state.id]: 0 }),
    {},
  );
  session.cases.forEach((testCase) => {
    totals[getCaseState(testCase.status).id] += 1;
  });
  const executed = session.cases.length - totals.pending;
  const resolved = totals.passed + totals.failed;
  const passRate = resolved > 0 ? Math.round((totals.passed / resolved) * 100) : 0;
  return {
    ...totals,
    total: session.cases.length,
    executed,
    resolved,
    passRate,
    completion: session.cases.length
      ? Math.round((executed / session.cases.length) * 100)
      : 0,
  };
}

function makeActivity(message, caseTitle = "") {
  return {
    id: getId(),
    message: getText(message, 240),
    caseTitle: getText(caseTitle, 180),
    createdAt: new Date().toISOString(),
  };
}

function appendActivity(session, entry) {
  return [...session.activity, entry].slice(-MAX_ACTIVITY_ITEMS);
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
  URL.revokeObjectURL(url);
}

function createSession(template, details) {
  const now = new Date().toISOString();
  return normalizeSession({
    id: getId(),
    name: details.name,
    build: details.build,
    environment: details.environment,
    baseUrl: details.baseUrl,
    notes: "",
    status: "draft",
    templateId: template.id,
    createdAt: now,
    updatedAt: now,
    completedAt: "",
    cases: createCases(template),
    activity: [makeActivity(`Created from ${template.name} template`)],
  });
}

function MetricCard({ label, value, detail, tone = "slate" }) {
  const colors = {
    slate: "border-slate-200 bg-white text-slate-900",
    emerald: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
    rose: "border-rose-200 bg-rose-50/70 text-rose-900",
    amber: "border-amber-200 bg-amber-50/70 text-amber-900",
    sky: "border-sky-200 bg-sky-50/70 text-sky-900",
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 ${colors[tone]}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs opacity-70">{detail}</p>
    </div>
  );
}

function EmptyState({ title, description, icon: Icon = FlaskConical }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
      <Icon className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const current = SESSION_STATES[status] || SESSION_STATES.draft;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${current.tone}`}>
      {current.label}
    </span>
  );
}

function CaseStateButton({ status, onClick, disabled }) {
  const state = getCaseState(status);
  const Icon = state.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 ${state.tone}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {state.shortLabel}
    </button>
  );
}

function TestCaseCard({
  testCase,
  index,
  reports,
  canEdit,
  onUpdate,
  onSetState,
  onRemove,
  onOpenReport,
}) {
  const [expanded, setExpanded] = useState(false);
  const linkedReport = reports.find(
    (report) => getReportId(report) === testCase.reportId,
  );
  const linkedReportUnavailable = Boolean(testCase.reportId && !linkedReport);
  const StateIcon = getCaseState(testCase.status).icon;
  const safeEvidenceUrl = validHttpUrl(testCase.evidenceUrl) ? testCase.evidenceUrl : "";

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-1.5 text-xs font-semibold text-slate-600">
              {index + 1}
            </span>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {testCase.area || "General"}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {testCase.priority}
            </span>
          </div>
          <h4 className="mt-2 text-sm font-semibold text-slate-900">{testCase.title}</h4>
          {testCase.expected ? (
            <p className="mt-1 text-sm leading-5 text-slate-600">{testCase.expected}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {CASE_STATES.filter((state) => state.id !== "pending").map((state) => {
              const Icon = state.icon;
              return (
                <button
                  type="button"
                  key={state.id}
                  onClick={() => onSetState(testCase.id, state.id)}
                  disabled={!canEdit}
                  aria-pressed={testCase.status === state.id}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    testCase.status === state.id
                      ? state.tone
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {state.shortLabel}
                </button>
              );
            })}
            <CaseStateButton
              status="pending"
              onClick={() => onSetState(testCase.id, "pending")}
              disabled={!canEdit || testCase.status === "pending"}
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${getCaseState(testCase.status).tone}`}>
            <StateIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {getCaseState(testCase.status).shortLabel}
          </span>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            {expanded ? "Hide details" : "Details"}
          </button>
        </div>
      </div>

      {testCase.status === "failed" || testCase.status === "blocked" ? (
        <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3">
          <label className="block text-xs font-medium text-slate-600" htmlFor={`observation-${testCase.id}`}>
            Observation {testCase.status === "failed" ? "(recommended)" : "(include blocker)"}
          </label>
          <textarea
            id={`observation-${testCase.id}`}
            value={testCase.observation}
            maxLength={MAX_TEXT_LENGTH}
            onChange={(event) => onUpdate(testCase.id, "observation", event.target.value)}
            disabled={!canEdit}
            rows={2}
            placeholder="Describe what happened and any relevant context."
            className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
          />
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Stored only in this browser.</span>
            <span>{testCase.observation.length}/{MAX_TEXT_LENGTH}</span>
          </div>
        </div>
      ) : null}

      {linkedReport || linkedReportUnavailable ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5">
          <span className="inline-flex items-center gap-2 text-xs text-slate-600">
            <Bug className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
            {linkedReport ? getReportTitle(linkedReport) : "Linked report is not loaded"}
          </span>
          {linkedReport && onOpenReport ? (
            <button
              type="button"
              onClick={() => onOpenReport(linkedReport)}
              className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-900"
            >
              Open report <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}

      {expanded ? (
        <div className="space-y-4 border-t border-slate-100 bg-slate-50/50 p-4">
          {testCase.steps.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Steps</p>
              <ol className="mt-2 space-y-1.5">
                {testCase.steps.map((step, stepIndex) => (
                  <li key={`${testCase.id}-step-${stepIndex}`} className="flex gap-2 text-sm text-slate-700">
                    <span className="w-5 shrink-0 text-right text-xs font-medium text-slate-400">{stepIndex + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          <label className="block text-xs font-medium text-slate-600" htmlFor={`evidence-${testCase.id}`}>
            Evidence URL
            <input
              id={`evidence-${testCase.id}`}
              type="url"
              value={testCase.evidenceUrl}
              maxLength={1000}
              onChange={(event) => onUpdate(testCase.id, "evidenceUrl", event.target.value)}
              disabled={!canEdit}
              placeholder="https://..."
              className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
            />
          </label>
          {testCase.evidenceUrl && !safeEvidenceUrl ? (
            <p className="text-xs text-rose-600">Evidence links must use http:// or https://.</p>
          ) : null}
          {safeEvidenceUrl ? (
            <a
              href={safeEvidenceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline"
            >
              Open evidence <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
          <label className="block text-xs font-medium text-slate-600" htmlFor={`report-${testCase.id}`}>
            Related report
            <select
              id={`report-${testCase.id}`}
              value={testCase.reportId}
              onChange={(event) => onUpdate(testCase.id, "reportId", event.target.value)}
              disabled={!canEdit}
              className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
            >
              <option value="">No linked report</option>
              {linkedReportUnavailable ? (
                <option value={testCase.reportId}>Linked report unavailable ({testCase.reportId})</option>
              ) : null}
              {reports.map((report) => {
                const reportId = getReportId(report);
                return reportId ? (
                  <option key={reportId} value={reportId}>{getReportTitle(report)}</option>
                ) : null;
              })}
            </select>
          </label>
          {canEdit ? (
            <button
              type="button"
              onClick={() => onRemove(testCase.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove case
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function SessionRow({ session, selected, onSelect, onDuplicate, onDelete }) {
  const metrics = getSessionMetrics(session);
  return (
    <div className={`rounded-2xl border p-3 transition ${selected ? "border-sky-300 bg-sky-50/70 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}>
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-sm font-semibold text-slate-900">{session.name}</span>
          <StatusBadge status={session.status} />
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">
          {[session.build && `Build ${session.build}`, session.environment].filter(Boolean).join(" · ") || "No build or environment"}
        </p>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>{metrics.executed}/{metrics.total} run</span>
          <span>{formatDate(session.updatedAt)}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-label={`${metrics.completion}% complete`}>
          <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${metrics.completion}%` }} />
        </div>
      </button>
      <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-2">
        <button type="button" onClick={onDuplicate} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800">
          <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Duplicate
        </button>
        <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
        </button>
      </div>
    </div>
  );
}

export default function TestSessionWorkspace({
  reports = [],
  email,
  onOpenReport,
}) {
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loadedEmail, setLoadedEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [sessionSearch, setSessionSearch] = useState("");
  const [caseSearch, setCaseSearch] = useState("");
  const [caseFilter, setCaseFilter] = useState("all");
  const [createTemplateId, setCreateTemplateId] = useState("smoke");
  const [newSessionName, setNewSessionName] = useState("");
  const [newBuild, setNewBuild] = useState("");
  const [newEnvironment, setNewEnvironment] = useState("");
  const [newBaseUrl, setNewBaseUrl] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddCaseForm, setShowAddCaseForm] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newCaseArea, setNewCaseArea] = useState("");
  const [newCasePriority, setNewCasePriority] = useState("Medium");
  const [newCaseExpected, setNewCaseExpected] = useState("");
  const [newCaseSteps, setNewCaseSteps] = useState("");
  const [sortMode, setSortMode] = useState("order");

  const selectedSession = sessions.find((session) => session.id === selectedId) || null;
  const requestedEmail = getText(email, 240).toLowerCase();
  const templates = useMemo(() => {
    if (templateFilter === "all") return TEMPLATES;
    return TEMPLATES.filter((template) => template.id === templateFilter);
  }, [templateFilter]);

  const visibleSessions = useMemo(() => {
    const query = getText(sessionSearch, 120).toLowerCase();
    return sessions
      .filter((session) => {
        if (!query) return true;
        return [
          session.name,
          session.build,
          session.environment,
          session.baseUrl,
          SESSION_STATES[session.status]?.label,
        ].some((value) => value?.toLowerCase().includes(query));
      })
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }, [sessions, sessionSearch]);

  const visibleCases = useMemo(() => {
    if (!selectedSession) return [];
    const query = getText(caseSearch, 120).toLowerCase();
    const indexed = selectedSession.cases.map((testCase, index) => ({ testCase, index }));
    return indexed
      .filter(({ testCase }) => {
        const matchesFilter = caseFilter === "all" || testCase.status === caseFilter;
        const matchesSearch = !query || [
          testCase.title,
          testCase.area,
          testCase.priority,
          testCase.expected,
          testCase.observation,
        ].some((value) => value?.toLowerCase().includes(query));
        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => {
        if (sortMode === "priority") {
          const priorityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
          return (priorityRank[a.testCase.priority] ?? 4) - (priorityRank[b.testCase.priority] ?? 4) || a.index - b.index;
        }
        if (sortMode === "status") {
          return CASE_STATES.findIndex((state) => state.id === a.testCase.status) -
            CASE_STATES.findIndex((state) => state.id === b.testCase.status) || a.index - b.index;
        }
        return a.index - b.index;
      });
  }, [selectedSession, caseSearch, caseFilter, sortMode]);

  const metrics = selectedSession ? getSessionMetrics(selectedSession) : null;

  useEffect(() => {
    const normalizedEmail = getText(email, 240).toLowerCase();
    setLoading(true);
    setLoadError("");
    setMessage("");
    setSelectedId("");
    if (!normalizedEmail) {
      setSessions([]);
      setLoadedEmail("");
      setLoadError("A signed-in tester account is required to load local test sessions.");
      setLoading(false);
      return;
    }

    try {
      const saved = window.localStorage.getItem(getStorageKey(normalizedEmail));
      const parsed = saved ? JSON.parse(saved) : [];
      const nextSessions = normalizeSessions(parsed);
      setSessions(nextSessions);
      setSelectedId(nextSessions[0]?.id || "");
      setLoadedEmail(normalizedEmail);
    } catch (error) {
      setSessions([]);
      setLoadedEmail(normalizedEmail);
      setLoadError(
        error instanceof SyntaxError
          ? "Saved test-session data could not be read because its format is invalid. Clear this browser's test-session storage to start fresh."
          : `Test-session data could not be loaded: ${error.message}`,
      );
    } finally {
      setLoading(false);
    }
  }, [email]);

  const persistSessions = (nextSessions) => {
    if (loadError) {
      setMessage("Cannot overwrite test-session storage after a load error. Resolve the storage issue first.");
      return false;
    }
    if (!loadedEmail || loadedEmail !== getText(email, 240).toLowerCase()) {
      setMessage("Wait for local test-session data to finish loading before making changes.");
      return false;
    }
    if (nextSessions.length > MAX_SESSIONS) {
      setMessage(`Keep at most ${MAX_SESSIONS} test sessions in this browser.`);
      return false;
    }
    try {
      window.localStorage.setItem(
        getStorageKey(loadedEmail),
        JSON.stringify(nextSessions.map(normalizeSession)),
      );
      setSessions(nextSessions);
      setMessage("Saved locally in this browser.");
      return true;
    } catch (error) {
      setMessage(`Could not save test-session changes: ${error.message}`);
      return false;
    }
  };

  const updateSession = (sessionId, updater, successMessage = "Test session updated.") => {
    const current = sessions.find((session) => session.id === sessionId);
    if (!current) {
      setMessage("This test session is no longer available.");
      return false;
    }
    const updated = normalizeSession({
      ...updater(current),
      updatedAt: new Date().toISOString(),
    });
    const nextSessions = sessions.map((session) =>
      session.id === sessionId ? updated : session,
    );
    const saved = persistSessions(nextSessions);
    if (saved && successMessage) setMessage(successMessage);
    return saved;
  };

  const createTestSession = () => {
    const template = TEMPLATES.find((item) => item.id === createTemplateId);
    if (!template) {
      setMessage("Select a valid test-session template.");
      return;
    }
    if (!getText(newSessionName, 180)) {
      setMessage("Enter a name for the test session.");
      return;
    }
    if (!validHttpUrl(getText(newBaseUrl, 1000))) {
      setMessage("Base URL must be empty or a valid http:// or https:// URL.");
      return;
    }
    if (sessions.length >= MAX_SESSIONS) {
      setMessage(`You have reached the ${MAX_SESSIONS}-session browser limit. Delete a session before creating another.`);
      return;
    }
    const session = createSession(template, {
      name: getText(newSessionName, 180),
      build: getText(newBuild, 100),
      environment: getText(newEnvironment, 120),
      baseUrl: getText(newBaseUrl, 1000),
    });
    if (persistSessions([session, ...sessions])) {
      setSelectedId(session.id);
      setNewSessionName("");
      setNewBuild("");
      setNewEnvironment("");
      setNewBaseUrl("");
      setShowCreateForm(false);
    }
  };

  const duplicateSession = (session) => {
    if (sessions.length >= MAX_SESSIONS) {
      setMessage(`You have reached the ${MAX_SESSIONS}-session browser limit.`);
      return;
    }
    const now = new Date().toISOString();
    const duplicate = normalizeSession({
      ...session,
      id: getId(),
      name: `${session.name} (copy)`.slice(0, 180),
      status: "draft",
      createdAt: now,
      updatedAt: now,
      completedAt: "",
      cases: session.cases.map((testCase) => ({
        ...testCase,
        id: getId(),
        status: "pending",
        observation: "",
        evidenceUrl: "",
        updatedAt: "",
      })),
      activity: [makeActivity(`Copied from "${session.name}"`)],
    });
    if (persistSessions([duplicate, ...sessions])) {
      setSelectedId(duplicate.id);
    }
  };

  const deleteSession = (session) => {
    if (!window.confirm(`Delete "${session.name}" and its local run history? This cannot be undone.`)) {
      return;
    }
    const nextSessions = sessions.filter((item) => item.id !== session.id);
    if (persistSessions(nextSessions)) {
      if (selectedId === session.id) setSelectedId(nextSessions[0]?.id || "");
      setMessage("Test session and its local run history were deleted.");
    }
  };

  const changeSessionField = (field, value) => {
    if (!selectedSession) return;
    const text = getText(value, field === "notes" ? 2000 : field === "baseUrl" ? 1000 : 180);
    if (field === "name" && !text) {
      setMessage("Test-session name cannot be empty.");
      return;
    }
    if (field === "baseUrl" && !validHttpUrl(text)) {
      setMessage("Base URL must be empty or a valid http:// or https:// URL.");
      return;
    }
    updateSession(selectedSession.id, (session) => ({
      ...session,
      [field]: text,
    }), "");
  };

  const changeCaseField = (caseId, field, value) => {
    if (!selectedSession) return;
    if (selectedSession.status === "completed") {
      setMessage("Reopen a completed session before editing test cases.");
      return;
    }
    if (field === "evidenceUrl" && !validHttpUrl(getText(value, 1000))) {
      setMessage("Evidence links must be empty or use http:// or https://.");
      return;
    }
    const limits = {
      observation: MAX_TEXT_LENGTH,
      evidenceUrl: 1000,
      reportId: 120,
    };
    const nextValue = getText(value, limits[field] || 600);
    updateSession(selectedSession.id, (session) => ({
      ...session,
      cases: session.cases.map((testCase) =>
        testCase.id === caseId
          ? { ...testCase, [field]: nextValue, updatedAt: new Date().toISOString() }
          : testCase,
      ),
    }), "");
  };

  const setCaseState = (caseId, status) => {
    if (!selectedSession) return;
    if (!CASE_STATES.some((state) => state.id === status)) {
      setMessage("Select a valid test result.");
      return;
    }
    if (selectedSession.status === "completed") {
      setMessage("Reopen a completed session before recording more results.");
      return;
    }
    const testCase = selectedSession.cases.find((item) => item.id === caseId);
    if (!testCase) return;
    const nextLabel = getCaseState(status).label;
    updateSession(selectedSession.id, (session) => ({
      ...session,
      cases: session.cases.map((item) =>
        item.id === caseId
          ? { ...item, status, updatedAt: new Date().toISOString() }
          : item,
      ),
      activity: appendActivity(
        session,
        makeActivity(`Marked ${testCase.title} as ${nextLabel}`, testCase.title),
      ),
    }), `${testCase.title}: ${nextLabel}.`);
  };

  const startSession = () => {
    if (!selectedSession) return;
    updateSession(selectedSession.id, (session) => ({
      ...session,
      status: "active",
      completedAt: "",
      activity: appendActivity(session, makeActivity("Started test session")),
    }), "Test session started.");
  };

  const pauseSession = () => {
    if (!selectedSession) return;
    updateSession(selectedSession.id, (session) => ({
      ...session,
      status: "paused",
      activity: appendActivity(session, makeActivity("Paused test session")),
    }), "Test session paused.");
  };

  const completeSession = () => {
    if (!selectedSession) return;
    const pending = selectedSession.cases.filter((testCase) => testCase.status === "pending").length;
    if (pending) {
      setMessage(`Run, block, or explicitly skip all cases before completing. ${pending} case(s) remain.`);
      setCaseFilter("pending");
      return;
    }
    if (!selectedSession.cases.length) {
      setMessage("Add at least one test case before completing the session.");
      return;
    }
    const now = new Date().toISOString();
    updateSession(selectedSession.id, (session) => ({
      ...session,
      status: "completed",
      completedAt: now,
      activity: appendActivity(session, makeActivity("Completed test session")),
    }), "Test session completed. Its results remain local and advisory.");
  };

  const reopenSession = () => {
    if (!selectedSession) return;
    updateSession(selectedSession.id, (session) => ({
      ...session,
      status: "active",
      completedAt: "",
      activity: appendActivity(session, makeActivity("Reopened completed test session")),
    }), "Test session reopened.");
  };

  const addCustomCase = () => {
    if (!selectedSession) return;
    if (selectedSession.status === "completed") {
      setMessage("Reopen a completed session before adding test cases.");
      return;
    }
    const title = getText(newCaseTitle, 180);
    if (!title) {
      setMessage("Enter a test-case title.");
      return;
    }
    if (selectedSession.cases.length >= MAX_CASES_PER_SESSION) {
      setMessage(`A test session can contain at most ${MAX_CASES_PER_SESSION} cases.`);
      return;
    }
    const testCase = normalizeCase({
      id: getId(),
      title,
      area: getText(newCaseArea, 100),
      priority: newCasePriority,
      expected: getText(newCaseExpected, 600),
      steps: newCaseSteps.split(/\r?\n/).map((step) => getText(step, 240)).filter(Boolean).slice(0, 20),
      status: "pending",
    });
    const saved = updateSession(selectedSession.id, (session) => ({
      ...session,
      cases: [...session.cases, testCase],
      activity: appendActivity(session, makeActivity(`Added test case: ${testCase.title}`, testCase.title)),
    }), "Test case added.");
    if (saved) {
      setNewCaseTitle("");
      setNewCaseArea("");
      setNewCasePriority("Medium");
      setNewCaseExpected("");
      setNewCaseSteps("");
      setShowAddCaseForm(false);
    }
  };

  const removeCase = (caseId) => {
    if (!selectedSession) return;
    const testCase = selectedSession.cases.find((item) => item.id === caseId);
    if (!testCase) return;
    if (!window.confirm(`Remove "${testCase.title}" from this test session?`)) return;
    updateSession(selectedSession.id, (session) => ({
      ...session,
      cases: session.cases.filter((item) => item.id !== caseId),
      activity: appendActivity(session, makeActivity(`Removed test case: ${testCase.title}`, testCase.title)),
    }), "Test case removed.");
  };

  const resetFilters = () => {
    setCaseFilter("all");
    setCaseSearch("");
    setSortMode("order");
  };

  const exportCasesCsv = () => {
    if (!selectedSession) return;
    const rows = [
      ["Session", "Build", "Environment", "Case", "Area", "Priority", "Status", "Expected", "Observation", "Evidence URL", "Related report ID", "Updated"],
      ...selectedSession.cases.map((testCase) => [
        selectedSession.name,
        selectedSession.build,
        selectedSession.environment,
        testCase.title,
        testCase.area,
        testCase.priority,
        getCaseState(testCase.status).label,
        testCase.expected,
        testCase.observation,
        testCase.evidenceUrl,
        testCase.reportId,
        testCase.updatedAt,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
    downloadFile(
      `${selectedSession.name.trim().replace(/[^a-z0-9-_]+/gi, "-").slice(0, 60) || "test-session"}.csv`,
      `\uFEFF${csv}`,
      "text/csv;charset=utf-8",
    );
    setMessage("Test results exported as CSV.");
  };

  const exportSessionJson = () => {
    if (!selectedSession) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      scope: "Browser-local test-session record; results are advisory and not server-synced.",
      session: selectedSession,
    };
    downloadFile(
      `${selectedSession.name.trim().replace(/[^a-z0-9-_]+/gi, "-").slice(0, 60) || "test-session"}.json`,
      JSON.stringify(payload, null, 2),
      "application/json;charset=utf-8",
    );
    setMessage("Test-session record exported as JSON.");
  };

  const copySummary = async () => {
    if (!selectedSession || !metrics) return;
    const summary = [
      `Test session: ${selectedSession.name}`,
      `Build: ${selectedSession.build || "Not specified"}`,
      `Environment: ${selectedSession.environment || "Not specified"}`,
      `Status: ${SESSION_STATES[selectedSession.status].label}`,
      `Results: ${metrics.passed} passed, ${metrics.failed} failed, ${metrics.blocked} blocked, ${metrics.skipped} skipped, ${metrics.pending} not run`,
      `Duration: ${formatDuration(selectedSession.createdAt, selectedSession.completedAt || new Date())}`,
      "",
      ...selectedSession.cases
        .filter((testCase) => ["failed", "blocked"].includes(testCase.status))
        .map((testCase) => `- [${getCaseState(testCase.status).label}] ${testCase.title}${testCase.observation ? `: ${testCase.observation}` : ""}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(summary);
      setMessage("Session summary copied to the clipboard.");
    } catch (error) {
      setMessage(`Could not copy the session summary: ${error.message}`);
    }
  };

  if (loading || (requestedEmail && loadedEmail !== requestedEmail)) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-busy="true">
        <div className="h-5 w-48 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-20 animate-pulse rounded-2xl bg-slate-50" />
        <p className="mt-3 text-xs text-slate-500">Loading browser-local test sessions…</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
      <header className="border-b border-slate-200 bg-gradient-to-br from-sky-50 via-white to-violet-50/60 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-sky-700">
              <FlaskConical className="h-5 w-5" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em]">Local test sessions</p>
            </div>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">Run repeatable checks and record outcomes</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Start from a smoke, regression, accessibility, or API checklist. Record results, evidence links, and related reports without changing server-side report data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm((value) => !value)}
              disabled={sessions.length >= MAX_SESSIONS}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> New session
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><Layers3 className="h-3.5 w-3.5" aria-hidden="true" /> {sessions.length}/{MAX_SESSIONS} local sessions</span>
          <span className="inline-flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" aria-hidden="true" /> Browser-only; not shared with teammates</span>
          <span className="inline-flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" /> Results do not update report status</span>
        </div>
      </header>

      <div className="space-y-4 p-4 sm:p-5">
        {loadError ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <p className="font-semibold">Test-session storage is unavailable</p>
            <p className="mt-1">{loadError}</p>
          </div>
        ) : null}
        {message ? (
          <div role="status" aria-live="polite" className="flex items-start justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50 px-3.5 py-2.5 text-sm text-sky-800">
            <span>{message}</span>
            <button type="button" onClick={() => setMessage("")} aria-label="Dismiss message" className="rounded p-0.5 hover:bg-sky-100">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {showCreateForm ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Create a test session</h3>
                <p className="mt-1 text-xs text-slate-500">Template cases start as not run and can be edited after creation.</p>
              </div>
              <button type="button" onClick={() => setShowCreateForm(false)} aria-label="Close create session form" className="rounded-lg p-1.5 text-slate-500 hover:bg-white">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-medium text-slate-600">
                Session name *
                <input value={newSessionName} onChange={(event) => setNewSessionName(event.target.value)} maxLength={180} placeholder="e.g. Checkout release smoke" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Checklist template
                <select value={createTemplateId} onChange={(event) => setCreateTemplateId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
                  {TEMPLATES.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                Build or version
                <input value={newBuild} onChange={(event) => setNewBuild(event.target.value)} maxLength={100} placeholder="e.g. 2.8.0-rc1" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Environment
                <input value={newEnvironment} onChange={(event) => setNewEnvironment(event.target.value)} maxLength={120} placeholder="e.g. Staging · Chrome · Windows" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </label>
              <label className="text-xs font-medium text-slate-600 sm:col-span-2">
                Base URL
                <input type="url" value={newBaseUrl} onChange={(event) => setNewBaseUrl(event.target.value)} maxLength={1000} placeholder="https://staging.example.test" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {TEMPLATES.find((template) => template.id === createTemplateId)?.description}
              </p>
              <button type="button" onClick={createTestSession} className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800">
                <FilePlus2 className="h-4 w-4" aria-hidden="true" /> Create session
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input value={sessionSearch} onChange={(event) => setSessionSearch(event.target.value)} placeholder="Find a session…" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
              </label>
              <div className="mt-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sessions</h3>
                <span className="text-xs text-slate-400">{visibleSessions.length} shown</span>
              </div>
              <div className="mt-2 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
                {visibleSessions.length ? visibleSessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    selected={session.id === selectedId}
                    onSelect={() => setSelectedId(session.id)}
                    onDuplicate={() => duplicateSession(session)}
                    onDelete={() => deleteSession(session)}
                  />
                )) : (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-500">
                    {sessions.length ? "No sessions match your search." : "Create a session to begin."}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Checklist templates</h3>
                <select value={templateFilter} onChange={(event) => setTemplateFilter(event.target.value)} aria-label="Filter checklist templates" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600">
                  <option value="all">All</option>
                  {TEMPLATES.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
              </div>
              <div className="mt-2 space-y-2">
                {templates.map((template) => (
                  <button
                    type="button"
                    key={template.id}
                    onClick={() => {
                      setCreateTemplateId(template.id);
                      setShowCreateForm(true);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-sky-300 hover:bg-sky-50/40"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-800">{template.name}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{template.cases.length} cases</span>
                    </span>
                    <span className="mt-1 block text-[11px] leading-4 text-slate-500">{template.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="min-w-0 space-y-4">
            {!selectedSession ? (
              <EmptyState
                title="No test session selected"
                description="Create a session from one of the reusable templates, then record pass, fail, blocked, or skipped outcomes as you work."
              />
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={selectedSession.status} />
                        <span className="text-xs text-slate-400">
                          Created {formatDate(selectedSession.createdAt)}
                        </span>
                      </div>
                      <label className="mt-3 block">
                        <span className="sr-only">Test-session name</span>
                        <input
                          key={`${selectedSession.id}-name`}
                          defaultValue={selectedSession.name}
                          onBlur={(event) => changeSessionField("name", event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.currentTarget.blur();
                          }}
                          maxLength={180}
                          disabled={selectedSession.status === "completed"}
                          className="w-full border-0 border-b border-transparent bg-transparent px-0 py-1 text-xl font-bold tracking-tight text-slate-950 outline-none hover:border-slate-200 focus:border-sky-400 focus:ring-0 disabled:opacity-70 sm:text-2xl"
                        />
                      </label>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                          ["build", "Build or version", selectedSession.build, "2.8.0-rc1"],
                          ["environment", "Environment", selectedSession.environment, "Staging · Chrome"],
                          ["baseUrl", "Base URL", selectedSession.baseUrl, "https://..."],
                        ].map(([field, label, value, placeholder]) => (
                          <label key={field} className="text-[11px] font-medium text-slate-500">
                            {label}
                            <input
                              key={`${selectedSession.id}-${field}`}
                              type={field === "baseUrl" ? "url" : "text"}
                              defaultValue={value}
                              onBlur={(event) => changeSessionField(field, event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") event.currentTarget.blur();
                              }}
                              maxLength={field === "baseUrl" ? 1000 : 120}
                              disabled={selectedSession.status === "completed"}
                              placeholder={placeholder}
                              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50"
                            />
                          </label>
                        ))}
                        <div className="flex items-end">
                          {selectedSession.baseUrl && validHttpUrl(selectedSession.baseUrl) ? (
                            <a href={selectedSession.baseUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-sky-700 hover:bg-sky-50">
                              Open test target <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            </a>
                          ) : (
                            <p className="pb-2 text-[11px] text-slate-400">Add an http(s) URL to open the test target.</p>
                          )}
                        </div>
                      </div>
                      <label className="mt-3 block text-[11px] font-medium text-slate-500">
                        Session notes
                        <textarea
                          key={`${selectedSession.id}-notes`}
                          defaultValue={selectedSession.notes}
                          onBlur={(event) => changeSessionField("notes", event.target.value)}
                          disabled={selectedSession.status === "completed"}
                          maxLength={2000}
                          rows={2}
                          placeholder="Capture scope, setup notes, or context for this run."
                          className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50"
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2 xl:max-w-64 xl:justify-end">
                      {selectedSession.status === "draft" ? (
                        <button type="button" onClick={startSession} className="inline-flex items-center gap-1.5 rounded-xl bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800">
                          <Play className="h-3.5 w-3.5" aria-hidden="true" /> Start run
                        </button>
                      ) : null}
                      {selectedSession.status === "active" ? (
                        <button type="button" onClick={pauseSession} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100">
                          <Pause className="h-3.5 w-3.5" aria-hidden="true" /> Pause
                        </button>
                      ) : null}
                      {selectedSession.status === "paused" ? (
                        <button type="button" onClick={startSession} className="inline-flex items-center gap-1.5 rounded-xl bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800">
                          <Play className="h-3.5 w-3.5" aria-hidden="true" /> Resume
                        </button>
                      ) : null}
                      {selectedSession.status !== "completed" ? (
                        <button type="button" onClick={completeSession} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100">
                          <Check className="h-3.5 w-3.5" aria-hidden="true" /> Complete
                        </button>
                      ) : (
                        <button type="button" onClick={reopenSession} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reopen
                        </button>
                      )}
                      <button type="button" onClick={exportCasesCsv} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <Download className="h-3.5 w-3.5" aria-hidden="true" /> CSV
                      </button>
                      <button type="button" onClick={exportSessionJson} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" /> JSON
                      </button>
                      <button type="button" onClick={copySummary} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy summary
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <MetricCard label="Progress" value={`${metrics.completion}%`} detail={`${metrics.executed} of ${metrics.total} cases run`} tone="sky" />
                  <MetricCard label="Passed" value={metrics.passed} detail={metrics.resolved ? `${metrics.passRate}% of resolved cases` : "No resolved cases yet"} tone="emerald" />
                  <MetricCard label="Failed" value={metrics.failed} detail="Review observations and linked reports" tone={metrics.failed ? "rose" : "slate"} />
                  <MetricCard label="Blocked" value={metrics.blocked} detail="Blocked cases are excluded from pass rate" tone={metrics.blocked ? "amber" : "slate"} />
                  <MetricCard label="Duration" value={formatDuration(selectedSession.createdAt, selectedSession.completedAt || new Date())} detail={selectedSession.completedAt ? "Recorded session time" : "Elapsed since session creation"} />
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-sky-700" aria-hidden="true" />
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Test cases</h3>
                        <p className="mt-0.5 text-xs text-slate-500">{visibleCases.length} shown · {metrics.total} total · {metrics.pending} not run</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input value={caseSearch} onChange={(event) => setCaseSearch(event.target.value)} placeholder="Search cases" className="w-40 rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2.5 text-xs outline-none focus:border-sky-400 sm:w-48" />
                      </label>
                      <select value={caseFilter} onChange={(event) => setCaseFilter(event.target.value)} aria-label="Filter test cases" className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600">
                        {CASE_FILTERS.map((filter) => <option key={filter.id} value={filter.id}>{filter.label}</option>)}
                      </select>
                      <select value={sortMode} onChange={(event) => setSortMode(event.target.value)} aria-label="Sort test cases" className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600">
                        <option value="order">Template order</option>
                        <option value="priority">Priority</option>
                        <option value="status">Status</option>
                      </select>
                      {(caseFilter !== "all" || caseSearch || sortMode !== "order") ? (
                        <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-slate-500 hover:bg-slate-100">
                          <FilterX className="h-3.5 w-3.5" aria-hidden="true" /> Reset
                        </button>
                      ) : null}
                      {selectedSession.status !== "completed" ? (
                        <button type="button" onClick={() => setShowAddCaseForm((value) => !value)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add case
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {showAddCaseForm && selectedSession.status !== "completed" ? (
                    <div className="border-b border-slate-200 bg-sky-50/30 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-800">Add a custom test case</h4>
                        <button type="button" onClick={() => setShowAddCaseForm(false)} aria-label="Close add case form" className="rounded-lg p-1 text-slate-500 hover:bg-white">
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="text-xs font-medium text-slate-600 sm:col-span-2">
                          Case title *
                          <input value={newCaseTitle} onChange={(event) => setNewCaseTitle(event.target.value)} maxLength={180} placeholder="Describe the behavior to verify" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-sky-400" />
                        </label>
                        <label className="text-xs font-medium text-slate-600">
                          Area
                          <input value={newCaseArea} onChange={(event) => setNewCaseArea(event.target.value)} maxLength={100} placeholder="e.g. Checkout" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-sky-400" />
                        </label>
                        <label className="text-xs font-medium text-slate-600">
                          Priority
                          <select value={newCasePriority} onChange={(event) => setNewCasePriority(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-sky-400">
                            <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
                          </select>
                        </label>
                        <label className="text-xs font-medium text-slate-600 sm:col-span-2">
                          Expected result
                          <textarea value={newCaseExpected} onChange={(event) => setNewCaseExpected(event.target.value)} maxLength={600} rows={2} placeholder="What should happen?" className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-sky-400" />
                        </label>
                        <label className="text-xs font-medium text-slate-600 sm:col-span-2">
                          Steps (one per line)
                          <textarea value={newCaseSteps} onChange={(event) => setNewCaseSteps(event.target.value)} maxLength={2000} rows={2} placeholder={"Open the feature\nPerform the action\nVerify the result"} className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-sky-400" />
                        </label>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button type="button" onClick={addCustomCase} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-800">
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add test case
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-3 p-3 sm:p-4">
                    {visibleCases.length ? visibleCases.map(({ testCase, index }) => (
                      <TestCaseCard
                        key={testCase.id}
                        testCase={testCase}
                        index={index}
                        reports={reports}
                        canEdit={selectedSession.status !== "completed"}
                        onUpdate={changeCaseField}
                        onSetState={setCaseState}
                        onRemove={removeCase}
                        onOpenReport={onOpenReport}
                      />
                    )) : (
                      <EmptyState
                        title={selectedSession.cases.length ? "No cases match these filters" : "This session has no test cases"}
                        description={selectedSession.cases.length ? "Try a different search or result filter." : "Add a custom case to record a check for this session."}
                        icon={Search}
                      />
                    )}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Run activity</h3>
                        <p className="mt-0.5 text-xs text-slate-500">Latest {selectedSession.activity.length} local events</p>
                      </div>
                      <Clock3 className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </div>
                    {selectedSession.activity.length ? (
                      <ol className="mt-4 space-y-3">
                        {[...selectedSession.activity].reverse().slice(0, 12).map((entry) => (
                          <li key={entry.id} className="relative flex gap-3">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-400 ring-4 ring-sky-50" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-slate-700">{entry.message}</p>
                              <p className="mt-0.5 text-[11px] text-slate-400">{formatDate(entry.createdAt)}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-4 text-xs text-slate-500">Actions recorded during this session will appear here.</p>
                    )}
                  </section>
                  <section className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
                    <div className="flex items-center gap-2 text-sky-800">
                      <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                      <h3 className="text-sm font-semibold">Interpret results carefully</h3>
                    </div>
                    <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
                      <li>Session results are personal browser data; they are not sent to the server or shared with other testers.</li>
                      <li>Fail, blocked, and pass are run observations, not changes to report state or deployment approval.</li>
                      <li>Export a CSV or JSON copy if you need to share or retain this run outside the browser.</li>
                      <li>Evidence URLs are links only; avoid including secrets or private information in notes.</li>
                    </ul>
                    <div className="mt-4 flex items-center gap-2 border-t border-sky-100 pt-3 text-xs text-slate-500">
                      <Activity className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
                      Last saved {formatDate(selectedSession.updatedAt)}
                    </div>
                    <button type="button" onClick={copySummary} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-medium text-sky-800 hover:bg-sky-50">
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy run summary
                    </button>
                  </section>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </section>
  );
}
