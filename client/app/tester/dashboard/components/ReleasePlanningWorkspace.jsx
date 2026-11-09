"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  Download,
  FileCheck2,
  Flag,
  Gauge,
  GitBranch,
  LockKeyhole,
  MessageSquareText,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";

const STORAGE_PREFIX = "tester-release-planning-v1";
const MAX_PLANS = 40;
const MAX_MILESTONES = 60;
const MAX_DECISIONS = 40;
const MAX_DESCRIPTION = 1200;
const MAX_NOTE = 1000;

const PLAN_STATES = [
  { value: "planning", label: "Planning" },
  { value: "in-progress", label: "In progress" },
  { value: "ready-for-review", label: "Ready for review" },
  { value: "released", label: "Released" },
  { value: "paused", label: "Paused" },
];

const MILESTONE_STATES = [
  { value: "pending", label: "Not started" },
  { value: "in-progress", label: "In progress" },
  { value: "complete", label: "Complete" },
  { value: "blocked", label: "Blocked" },
];

const SEVERITY_OPTIONS = [
  { value: "all", label: "No severity blocker" },
  { value: "critical", label: "Block on critical" },
  { value: "high", label: "Block on high or critical" },
];

const DEFAULT_MILESTONES = [
  {
    id: "scope",
    title: "Scope and owners confirmed",
    detail: "Confirm the release scope, owners, and target window.",
    status: "pending",
    dueDate: "",
  },
  {
    id: "verification",
    title: "Verification complete",
    detail: "Complete planned testing for the release scope.",
    status: "pending",
    dueDate: "",
  },
  {
    id: "blockers",
    title: "Release blockers reviewed",
    detail: "Review unresolved issues against the release policy.",
    status: "pending",
    dueDate: "",
  },
  {
    id: "decision",
    title: "Release decision recorded",
    detail: "Document the decision owner, date, and any conditions.",
    status: "pending",
    dueDate: "",
  },
];

const DECISION_TYPES = [
  { value: "go", label: "Go" },
  { value: "conditional", label: "Conditional go" },
  { value: "hold", label: "Hold" },
  { value: "rollback", label: "Rollback" },
  { value: "note", label: "Note" },
];

const PLAN_FILTERS = [
  { value: "all", label: "All plans" },
  { value: "planning", label: "Planning" },
  { value: "in-progress", label: "In progress" },
  { value: "ready-for-review", label: "Ready for review" },
  { value: "released", label: "Released" },
  { value: "paused", label: "Paused" },
];

function getText(value, fallback = "", limit = 3000) {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, limit) || fallback;
}

function getReportId(report) {
  const rawId = report?._id ?? report?.id;
  return rawId === null || rawId === undefined ? "" : String(rawId).trim();
}

function getReportTitle(report) {
  return getText(report?.title || report?.summary, "Untitled report", 240);
}

function getStatus(report) {
  return getText(report?.status).toLowerCase() === "closed"
    ? "closed"
    : "open";
}

function getSeverity(report) {
  return getText(report?.severity, "Unspecified").toLowerCase();
}

function severityRank(report) {
  const severity = getSeverity(report);
  if (["critical", "blocker", "urgent"].includes(severity)) return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  if (severity === "low") return 1;
  return 0;
}

function getCategory(report) {
  return getText(report?.category, "Uncategorized", 120);
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getStorageKey(email) {
  const normalized = getText(email).toLocaleLowerCase();
  return normalized
    ? `${STORAGE_PREFIX}:${encodeURIComponent(normalized)}`
    : "";
}

function normalizeMilestone(value) {
  if (
    !value ||
    typeof value.id !== "string" ||
    typeof value.title !== "string"
  ) {
    return null;
  }
  return {
    id: value.id.slice(0, 100),
    title: value.title.slice(0, 180),
    detail: getText(value.detail, "", 500),
    status: MILESTONE_STATES.some((item) => item.value === value.status)
      ? value.status
      : "pending",
    dueDate: getText(value.dueDate, "", 20),
  };
}

function normalizeDecision(value) {
  if (
    !value ||
    typeof value.id !== "string" ||
    typeof value.type !== "string" ||
    typeof value.at !== "string"
  ) {
    return null;
  }
  return {
    id: value.id.slice(0, 100),
    type: DECISION_TYPES.some((item) => item.value === value.type)
      ? value.type
      : "note",
    summary: getText(value.summary, "", MAX_DESCRIPTION),
    owner: getText(value.owner, "", 80),
    at: value.at,
    conditions: getText(value.conditions, "", MAX_NOTE),
  };
}

function normalizePlan(value) {
  if (
    !value ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    !Array.isArray(value.milestones)
  ) {
    return null;
  }
  const reportIds = Array.isArray(value.reportIds)
    ? [...new Set(
        value.reportIds.filter(
          (id) => typeof id === "string" && id.trim(),
        ),
      )].slice(0, 2000)
    : [];
  return {
    id: value.id.slice(0, 100),
    name: value.name.slice(0, 120),
    version: getText(value.version, "", 80),
    owner: getText(value.owner, "", 80),
    status: PLAN_STATES.some((item) => item.value === value.status)
      ? value.status
      : "planning",
    targetDate: getText(value.targetDate, "", 20),
    startDate: getText(value.startDate, "", 20),
    description: getText(value.description, "", MAX_DESCRIPTION),
    severityPolicy: ["all", "critical", "high"].includes(value.severityPolicy)
      ? value.severityPolicy
      : "critical",
    reportIds,
    milestones: value.milestones
      .map(normalizeMilestone)
      .filter(Boolean)
      .slice(0, MAX_MILESTONES),
    decisions: Array.isArray(value.decisions)
      ? value.decisions
          .map(normalizeDecision)
          .filter(Boolean)
          .slice(-MAX_DECISIONS)
      : [],
    createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
    archived: value.archived === true,
  };
}

function normalizePlans(value) {
  if (!Array.isArray(value)) {
    throw new Error("Saved release plans have an unsupported format.");
  }
  const byId = new Map();
  value.slice(0, MAX_PLANS).forEach((item) => {
    const plan = normalizePlan(item);
    if (plan) byId.set(plan.id, plan);
  });
  return [...byId.values()];
}

function createPlan(name, owner) {
  const now = new Date().toISOString();
  return {
    id: createId(),
    name: getText(name, "Untitled release", 120),
    version: "",
    owner: getText(owner, "", 80),
    status: "planning",
    targetDate: "",
    startDate: "",
    description: "",
    severityPolicy: "critical",
    reportIds: [],
    milestones: DEFAULT_MILESTONES.map((item) => ({
      ...item,
      id: createId(),
    })),
    decisions: [
      {
        id: createId(),
        type: "note",
        summary: "Release plan created.",
        owner: getText(owner, "", 80),
        at: now,
        conditions: "",
      },
    ],
    createdAt: now,
    updatedAt: now,
    archived: false,
  };
}

function formatDate(value, options = {}) {
  if (!value) return "Not set";
  const date = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getDaysRemaining(targetDate) {
  if (!targetDate) return null;
  const target = new Date(`${targetDate}T00:00:00`);
  if (!Number.isFinite(target.getTime())) return null;
  return Math.ceil(
    (target.getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000,
  );
}

function isPastDue(dateValue, status) {
  const days = getDaysRemaining(dateValue);
  return days !== null && days < 0 && status !== "complete";
}

function getMilestoneProgress(plan) {
  const total = plan.milestones.length;
  const complete = plan.milestones.filter(
    (milestone) => milestone.status === "complete",
  ).length;
  const blocked = plan.milestones.filter(
    (milestone) => milestone.status === "blocked",
  ).length;
  return {
    total,
    complete,
    blocked,
    percentage: total ? Math.round((complete / total) * 100) : 0,
  };
}

function getReleaseAssessment(plan, reports) {
  const reportById = new Map(
    reports.map((report) => [getReportId(report), report]),
  );
  const includedReports = plan.reportIds
    .map((id) => reportById.get(id))
    .filter(Boolean);
  const missingReports = plan.reportIds.filter((id) => !reportById.has(id));
  const openReports = includedReports.filter(
    (report) => getStatus(report) === "open",
  );
  const criticalOpen = openReports.filter(
    (report) => severityRank(report) === 4,
  );
  const highOpen = openReports.filter(
    (report) => severityRank(report) === 3,
  );
  const policyBlockers =
    plan.severityPolicy === "high"
      ? [...criticalOpen, ...highOpen]
      : plan.severityPolicy === "critical"
        ? criticalOpen
        : [];
  const blockedMilestones = plan.milestones.filter(
    (milestone) =>
      milestone.status === "blocked" ||
      isPastDue(milestone.dueDate, milestone.status),
  );
  const missingMilestones = plan.milestones.filter(
    (milestone) => milestone.status !== "complete",
  );
  const statusReasons = [];
  if (!plan.reportIds.length) {
    statusReasons.push("No reports are included in the release scope");
  }
  if (!plan.milestones.length) {
    statusReasons.push("No release milestones are defined");
  }
  if (missingReports.length) {
    statusReasons.push(`${missingReports.length} included report(s) are unavailable`);
  }
  if (policyBlockers.length) {
    statusReasons.push(`${policyBlockers.length} open report(s) breach severity policy`);
  }
  if (blockedMilestones.length) {
    statusReasons.push(`${blockedMilestones.length} milestone(s) blocked or overdue`);
  }
  if (plan.status === "paused") {
    statusReasons.push("Release plan is paused");
  }
  const isReady =
    plan.reportIds.length > 0 &&
    plan.milestones.length > 0 &&
    missingReports.length === 0 &&
    policyBlockers.length === 0 &&
    missingMilestones.length === 0 &&
    plan.status !== "paused";

  return {
    includedReports,
    missingReports,
    openReports,
    criticalOpen,
    highOpen,
    policyBlockers,
    blockedMilestones,
    missingMilestones,
    isReady,
    statusReasons,
  };
}

function severityLabel(report) {
  const rank = severityRank(report);
  if (rank === 4) return "Critical";
  if (rank === 3) return "High";
  if (rank === 2) return "Medium";
  if (rank === 1) return "Low";
  return getText(report?.severity, "Unspecified");
}

function severityTone(report) {
  const rank = severityRank(report);
  if (rank >= 4) return "bg-rose-50 text-rose-700";
  if (rank === 3) return "bg-orange-50 text-orange-700";
  if (rank === 2) return "bg-amber-50 text-amber-700";
  if (rank === 1) return "bg-sky-50 text-sky-700";
  return "bg-slate-100 text-slate-500";
}

function planStateTone(status) {
  const tones = {
    planning: "border-slate-200 bg-slate-50 text-slate-600",
    "in-progress": "border-blue-200 bg-blue-50 text-blue-700",
    "ready-for-review": "border-emerald-200 bg-emerald-50 text-emerald-700",
    released: "border-violet-200 bg-violet-50 text-violet-700",
    paused: "border-amber-200 bg-amber-50 text-amber-700",
  };
  return tones[status] || tones.planning;
}

function decisionTone(type) {
  const tones = {
    go: "bg-emerald-50 text-emerald-700",
    conditional: "bg-amber-50 text-amber-700",
    hold: "bg-rose-50 text-rose-700",
    rollback: "bg-orange-50 text-orange-700",
    note: "bg-slate-100 text-slate-600",
  };
  return tones[type] || tones.note;
}

function createDecision(type, summary, owner, conditions = "") {
  return {
    id: createId(),
    type,
    summary: getText(summary, "", MAX_DESCRIPTION),
    owner: getText(owner, "", 80),
    at: new Date().toISOString(),
    conditions: getText(conditions, "", MAX_NOTE),
  };
}

function toCsvCell(value) {
  const raw = String(value ?? "").replace(/\r\n/g, "\n");
  const safe = /^[\t\r ]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function StatusBadge({ status }) {
  const label =
    PLAN_STATES.find((item) => item.value === status)?.label || "Planning";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-[9px] font-semibold ${planStateTone(
        status,
      )}`}
    >
      {label}
    </span>
  );
}

function MetricCard({ label, value, tone = "slate", icon: Icon }) {
  const tones = {
    slate: "bg-slate-50 text-slate-900",
    violet: "bg-violet-50 text-violet-900",
    emerald: "bg-emerald-50 text-emerald-900",
    amber: "bg-amber-50 text-amber-900",
    rose: "bg-rose-50 text-rose-900",
  };
  return (
    <div className={`rounded-xl px-3 py-2.5 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-medium opacity-70">{label}</p>
        {Icon && <Icon size={13} aria-hidden="true" className="opacity-60" />}
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function SmallSelect({ label, value, options, onChange, disabled = false }) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-2.5 pr-7 text-[10px] font-medium text-slate-600 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={11}
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </label>
  );
}

function PlanQueueCard({ plan, active, assessment, onSelect }) {
  const progress = getMilestoneProgress(plan);
  const daysRemaining = getDaysRemaining(plan.targetDate);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`w-full rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 ${
        active
          ? "border-violet-200 bg-violet-50/60"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
          <GitBranch size={14} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-800">
            {plan.name}
          </p>
          <p className="mt-1 truncate text-[9px] text-slate-400">
            {plan.version ? `v${plan.version} · ` : ""}
            {plan.owner || "Owner not set"}
          </p>
        </div>
        <StatusBadge status={plan.status} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[9px]">
        <span className="text-slate-500">
          {plan.reportIds.length} reports · {progress.complete}/{progress.total} milestones
        </span>
        <span
          className={
            assessment.policyBlockers.length || assessment.missingReports.length
              ? "font-medium text-rose-600"
              : assessment.isReady
                ? "font-medium text-emerald-600"
                : "text-slate-400"
          }
        >
          {assessment.isReady ? "Ready" : `${assessment.statusReasons.length} concerns`}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-violet-500 transition-[width]"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        <span className="w-8 text-right text-[9px] tabular-nums text-slate-400">
          {daysRemaining === null
            ? "No date"
            : daysRemaining < 0
              ? `${Math.abs(daysRemaining)}d late`
              : `${daysRemaining}d`}
        </span>
      </div>
    </button>
  );
}

function MilestoneRow({ milestone, index, locked, onChange, onDelete }) {
  const late = isPastDue(milestone.dueDate, milestone.status);
  return (
    <article
      className={`rounded-xl border p-3 ${
        milestone.status === "blocked" || late
          ? "border-amber-200 bg-amber-50/30"
          : milestone.status === "complete"
            ? "border-emerald-100 bg-emerald-50/20"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_150px_auto] sm:items-start">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-slate-100 text-[9px] font-semibold tabular-nums text-slate-500">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <label className="block">
              <span className="sr-only">Milestone title</span>
              <input
                type="text"
                value={milestone.title}
                maxLength={180}
                disabled={locked}
                onChange={(event) =>
                  onChange({ ...milestone, title: event.target.value })
                }
                className="h-7 w-full rounded-md border border-transparent bg-transparent px-1 text-xs font-semibold text-slate-800 outline-none transition hover:border-slate-200 focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100 disabled:cursor-default"
              />
            </label>
            <label className="mt-1 block">
              <span className="sr-only">Milestone details</span>
              <input
                type="text"
                value={milestone.detail}
                maxLength={500}
                disabled={locked}
                onChange={(event) =>
                  onChange({ ...milestone, detail: event.target.value })
                }
                placeholder="Add context or definition of done..."
                className="h-7 w-full rounded-md border border-transparent bg-transparent px-1 text-[10px] text-slate-500 outline-none transition placeholder:text-slate-300 hover:border-slate-200 focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100 disabled:cursor-default"
              />
            </label>
          </div>
        </div>
        <SmallSelect
          label={`Status for milestone ${milestone.title}`}
          value={milestone.status}
          options={MILESTONE_STATES}
          disabled={locked}
          onChange={(status) => onChange({ ...milestone, status })}
        />
        <label className="block">
          <span className="sr-only">Milestone target date</span>
          <input
            type="date"
            value={milestone.dueDate}
            disabled={locked}
            onChange={(event) =>
              onChange({ ...milestone, dueDate: event.target.value })
            }
            className={`h-9 w-full rounded-lg border bg-white px-2 text-[10px] outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50 ${
              late ? "border-amber-300 text-amber-800" : "border-slate-200"
            }`}
          />
          {late && (
            <span className="mt-1 block text-[9px] font-medium text-amber-700">
              Past due
            </span>
          )}
        </label>
        {!locked ? (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete milestone ${milestone.title}`}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
          >
            <Trash2 size={13} aria-hidden="true" />
          </button>
        ) : (
          <span className="h-8 w-8" aria-hidden="true" />
        )}
      </div>
    </article>
  );
}

function DecisionCard({ decision }) {
  const label =
    DECISION_TYPES.find((item) => item.value === decision.type)?.label ||
    "Note";
  return (
    <article className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-white p-2.5">
      <span
        className={`mt-0.5 rounded-md px-2 py-1 text-[9px] font-semibold ${decisionTone(
          decision.type,
        )}`}
      >
        {label}
      </span>
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap text-[10px] leading-4 text-slate-700">
          {decision.summary}
        </p>
        {decision.conditions && (
          <p className="mt-1 whitespace-pre-wrap text-[9px] leading-4 text-slate-500">
            Conditions: {decision.conditions}
          </p>
        )}
        <p className="mt-1 text-[9px] text-slate-400">
          {decision.owner || "Owner not set"} · {formatDateTime(decision.at)}
        </p>
      </div>
    </article>
  );
}

function ReportRow({ report, included, blocked, onToggle, onOpen }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-white p-2.5">
      <button
        type="button"
        onClick={() => onToggle(getReportId(report))}
        aria-pressed={included}
        aria-label={`${included ? "Remove" : "Include"} ${getReportTitle(report)} ${
          included ? "from" : "in"
        } release scope`}
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 ${
          included
            ? "border-violet-600 bg-violet-600 text-white"
            : "border-slate-300 bg-white text-transparent hover:border-violet-400"
        }`}
      >
        <Check size={12} aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="break-words text-[10px] font-semibold leading-4 text-slate-800">
            {getReportTitle(report)}
          </p>
          <span
            className={`rounded-md px-1.5 py-0.5 text-[8px] font-semibold ${
              getStatus(report) === "closed"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-violet-50 text-violet-700"
            }`}
          >
            {getStatus(report) === "closed" ? "Resolved" : "Open"}
          </span>
          <span
            className={`rounded-md px-1.5 py-0.5 text-[8px] font-semibold ${severityTone(
              report,
            )}`}
          >
            {severityLabel(report)}
          </span>
          {blocked && (
            <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[8px] font-semibold text-rose-700">
              Policy blocker
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-[9px] text-slate-400">
          #{getReportId(report)} · {getCategory(report)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onOpen(report)}
        aria-label={`Open report details for ${getReportTitle(report)}`}
        title="Open report details"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
      >
        <ArrowUpRight size={13} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function ReleasePlanningWorkspace({
  reports,
  email,
  onOpenReport,
}) {
  const [plans, setPlans] = useState([]);
  const [activePlanId, setActivePlanId] = useState("");
  const [savedEmail, setSavedEmail] = useState("");
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [newPlanName, setNewPlanName] = useState("");
  const [planOwner, setPlanOwner] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [reportCategoryFilter, setReportCategoryFilter] = useState("all");
  const [reportSort, setReportSort] = useState("risk");
  const [planFilter, setPlanFilter] = useState("all");
  const [planSearch, setPlanSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDetail, setNewMilestoneDetail] = useState("");
  const [decisionType, setDecisionType] = useState("note");
  const [decisionSummary, setDecisionSummary] = useState("");
  const [decisionConditions, setDecisionConditions] = useState("");
  const [decisionOwner, setDecisionOwner] = useState("");
  const [showAllDecisions, setShowAllDecisions] = useState(false);

  const availableReports = useMemo(
    () =>
      reports.filter(
        (report) => report && typeof report === "object" && getReportId(report),
      ),
    [reports],
  );
  const reportById = useMemo(
    () =>
      new Map(
        availableReports.map((report) => [getReportId(report), report]),
      ),
    [availableReports],
  );
  const reportCategoryOptions = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...[
        ...new Set(availableReports.map((report) => getCategory(report))),
      ]
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ value, label: value })),
    ],
    [availableReports],
  );
  const normalizedEmail = getText(email).toLocaleLowerCase();

  useEffect(() => {
    setPlans([]);
    setActivePlanId("");
    setSavedEmail("");
    setStorageError("");
    setStorageLoaded(false);
    setFeedback("");
    const storageKey = getStorageKey(email);
    if (!storageKey) {
      setStorageLoaded(true);
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      const loadedPlans = raw ? normalizePlans(JSON.parse(raw)) : [];
      setPlans(loadedPlans);
      setSavedEmail(normalizedEmail);
      setStorageLoaded(true);
    } catch {
      setStorageError("Could not load release plans from browser storage.");
      setPlans([]);
      setStorageLoaded(false);
    }
  }, [email, normalizedEmail]);

  const activePlan = useMemo(
    () => plans.find((plan) => plan.id === activePlanId) || null,
    [activePlanId, plans],
  );
  const assessment = useMemo(
    () => (activePlan ? getReleaseAssessment(activePlan, availableReports) : null),
    [activePlan, availableReports],
  );
  const planProgress = activePlan ? getMilestoneProgress(activePlan) : null;

  const planById = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);
  const assessmentsByPlan = useMemo(
    () =>
      new Map(
        plans.map((plan) => [
          plan.id,
          getReleaseAssessment(plan, availableReports),
        ]),
      ),
    [availableReports, plans],
  );

  const visiblePlans = useMemo(() => {
    const needle = planSearch.trim().toLocaleLowerCase();
    return plans
      .filter((plan) => {
        if (!showArchived && plan.archived) return false;
        if (planFilter !== "all" && plan.status !== planFilter) return false;
        if (!needle) return true;
        return [
          plan.name,
          plan.version,
          plan.owner,
          plan.description,
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(needle);
      })
      .sort(
        (left, right) =>
          new Date(right.updatedAt || 0).getTime() -
          new Date(left.updatedAt || 0).getTime(),
      );
  }, [planFilter, planSearch, plans, showArchived]);

  const filteredReports = useMemo(() => {
    const needle = reportSearch.trim().toLocaleLowerCase();
    return availableReports
      .filter((report) => {
        if (
          reportStatusFilter === "open" &&
          getStatus(report) !== "open"
        ) {
          return false;
        }
        if (
          reportStatusFilter === "closed" &&
          getStatus(report) !== "closed"
        ) {
          return false;
        }
        if (
          reportCategoryFilter !== "all" &&
          getCategory(report) !== reportCategoryFilter
        ) {
          return false;
        }
        if (!needle) return true;
        return [
          getReportId(report),
          getReportTitle(report),
          report?.description,
          report?.category,
          report?.severity,
        ]
          .filter((value) => typeof value === "string")
          .join(" ")
          .toLocaleLowerCase()
          .includes(needle);
      })
      .sort((left, right) => {
        if (reportSort === "title") {
          return getReportTitle(left).localeCompare(getReportTitle(right));
        }
        if (reportSort === "severity") {
          return severityRank(right) - severityRank(left);
        }
        return (
          Number(getStatus(right) === "open") -
            Number(getStatus(left) === "open") ||
          severityRank(right) - severityRank(left) ||
          getReportTitle(left).localeCompare(getReportTitle(right))
        );
      });
  }, [
    availableReports,
    reportCategoryFilter,
    reportSearch,
    reportSort,
    reportStatusFilter,
  ]);

  const planStats = useMemo(() => {
    const currentPlans = plans.filter((plan) => !plan.archived);
    const counts = {
      total: currentPlans.length,
      active: currentPlans.filter((plan) =>
        ["planning", "in-progress"].includes(plan.status),
      ).length,
      ready: currentPlans.filter(
        (plan) => assessmentsByPlan.get(plan.id)?.isReady,
      ).length,
      released: currentPlans.filter((plan) => plan.status === "released").length,
    };
    return counts;
  }, [assessmentsByPlan, plans]);

  const persistPlans = (nextPlans) => {
    const storageKey = getStorageKey(email);
    if (!storageKey || !storageLoaded || savedEmail !== normalizedEmail) {
      setStorageError("Load a tester email before changing local release plans.");
      return false;
    }
    if (nextPlans.length > MAX_PLANS) {
      setStorageError(`This browser can store up to ${MAX_PLANS} release plans.`);
      return false;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextPlans));
      setPlans(nextPlans);
      setStorageError("");
      return true;
    } catch {
      setStorageError("Could not save release plans to browser storage.");
      return false;
    }
  };

  const updatePlan = (planId, updater, allowReleased = false) => {
    const current = planById.get(planId);
    if (!current) {
      setFeedback("This release plan is no longer available.");
      return false;
    }
    if (current.status === "released" && !current.archived && !allowReleased) {
      setFeedback("Released plans are locked. Reopen the plan before editing.");
      return false;
    }
    const updated = {
      ...updater(current),
      updatedAt: new Date().toISOString(),
    };
    const nextPlans = plans.map((plan) =>
      plan.id === planId ? updated : plan,
    );
    return persistPlans(nextPlans);
  };

  const createReleasePlan = () => {
    const name = getText(newPlanName, "", 120);
    if (!name) {
      setFeedback("Enter a release name before creating the plan.");
      return;
    }
    if (plans.length >= MAX_PLANS) {
      setFeedback(`Plan limit reached (${MAX_PLANS}). Archive or delete a plan first.`);
      return;
    }
    const plan = createPlan(name, planOwner);
    if (persistPlans([plan, ...plans])) {
      setActivePlanId(plan.id);
      setNewPlanName("");
      setFeedback("Release plan created locally.");
    }
  };

  const updatePlanField = (field, value) => {
    if (!activePlan) return;
    const limits = {
      name: 120,
      version: 80,
      owner: 80,
      description: MAX_DESCRIPTION,
    };
    const boundedValue =
      typeof value === "string" && limits[field]
        ? value.slice(0, limits[field])
        : value;
    if (updatePlan(activePlan.id, (plan) => ({ ...plan, [field]: boundedValue }))) {
      setFeedback("Release plan saved locally.");
    }
  };

  const toggleReportInPlan = (reportId) => {
    if (!activePlan) return;
    const currentIds = activePlan.reportIds;
    const nextIds = currentIds.includes(reportId)
      ? currentIds.filter((id) => id !== reportId)
      : [...currentIds, reportId];
    if (updatePlan(activePlan.id, (plan) => ({ ...plan, reportIds: nextIds }))) {
      setFeedback(
        currentIds.includes(reportId)
          ? "Report removed from release scope."
          : "Report added to release scope.",
      );
    }
  };

  const updateMilestone = (milestoneId, nextMilestone) => {
    if (!activePlan) return;
    const current = activePlan.milestones.find(
      (item) => item.id === milestoneId,
    );
    if (!current) return;
    const updatedMilestones = activePlan.milestones.map((item) =>
      item.id === milestoneId ? nextMilestone : item,
    );
    if (
      updatePlan(activePlan.id, (plan) => ({
        ...plan,
        milestones: updatedMilestones,
      }))
    ) {
      setFeedback(
        current.status !== nextMilestone.status
          ? `Milestone updated: ${nextMilestone.title}.`
          : "Milestone details saved.",
      );
    }
  };

  const addMilestone = () => {
    if (!activePlan) return;
    const title = getText(newMilestoneTitle, "", 180);
    if (!title) {
      setFeedback("Enter a milestone title.");
      return;
    }
    if (activePlan.milestones.length >= MAX_MILESTONES) {
      setFeedback(`A release plan can have up to ${MAX_MILESTONES} milestones.`);
      return;
    }
    const duplicate = activePlan.milestones.some(
      (milestone) =>
        milestone.title.toLocaleLowerCase() === title.toLocaleLowerCase(),
    );
    if (duplicate) {
      setFeedback("That milestone already exists in this plan.");
      return;
    }
    const milestone = {
      id: createId(),
      title,
      detail: getText(newMilestoneDetail, "", 500),
      status: "pending",
      dueDate: "",
    };
    if (
      updatePlan(activePlan.id, (plan) => ({
        ...plan,
        milestones: [...plan.milestones, milestone],
      }))
    ) {
      setNewMilestoneTitle("");
      setNewMilestoneDetail("");
      setFeedback("Milestone added.");
    }
  };

  const deleteMilestone = (milestoneId) => {
    if (!activePlan) return;
    const milestone = activePlan.milestones.find(
      (item) => item.id === milestoneId,
    );
    if (!milestone) return;
    if (
      updatePlan(activePlan.id, (plan) => ({
        ...plan,
        milestones: plan.milestones.filter(
          (item) => item.id !== milestoneId,
        ),
      }))
    ) {
      setFeedback(`Deleted milestone: ${milestone.title}.`);
    }
  };

  const addDecision = () => {
    if (!activePlan) return;
    const summary = getText(decisionSummary, "", MAX_DESCRIPTION);
    if (!summary) {
      setFeedback("Enter a decision summary before adding it.");
      return;
    }
    const decision = createDecision(
      decisionType,
      summary,
      decisionOwner || activePlan.owner,
      decisionConditions,
    );
    const nextDecisions = [
      ...activePlan.decisions,
      decision,
    ].slice(-MAX_DECISIONS);
    if (
      updatePlan(activePlan.id, (plan) => ({
        ...plan,
        decisions: nextDecisions,
        status:
          decisionType === "go" && plan.status !== "released"
            ? "ready-for-review"
            : decisionType === "hold" || decisionType === "rollback"
              ? "paused"
              : plan.status,
      }))
    ) {
      setDecisionSummary("");
      setDecisionConditions("");
      setFeedback(`${DECISION_TYPES.find((item) => item.value === decisionType)?.label} decision recorded locally.`);
    }
  };

  const removeDecision = (decisionId) => {
    if (!activePlan) return;
    if (
      updatePlan(activePlan.id, (plan) => ({
        ...plan,
        decisions: plan.decisions.filter(
          (decision) => decision.id !== decisionId,
        ),
      }))
    ) {
      setFeedback("Decision entry removed.");
    }
  };

  const markReleased = () => {
    if (!activePlan || !assessment) return;
    if (!assessment.isReady) {
      setFeedback("Resolve readiness concerns before marking this plan released.");
      return;
    }
    if (
      updatePlan(activePlan.id, (plan) => ({
        ...plan,
        status: "released",
        decisions: [
          ...plan.decisions,
          createDecision(
            "go",
            "Release marked complete in the local planning workspace.",
            plan.owner,
          ),
        ].slice(-MAX_DECISIONS),
      }))
    ) {
      setFeedback("Release marked complete locally. Server report status is unchanged.");
    }
  };

  const reopenPlan = () => {
    if (!activePlan || activePlan.status !== "released") return;
    if (
      updatePlan(activePlan.id, (plan) => ({
        ...plan,
        status: "in-progress",
      }), true)
    ) {
      setFeedback("Release plan reopened locally.");
    }
  };

  const pausePlan = () => {
    if (!activePlan || activePlan.status === "released") return;
    const nextStatus =
      activePlan.status === "paused" ? "in-progress" : "paused";
    if (updatePlan(activePlan.id, (plan) => ({ ...plan, status: nextStatus }))) {
      setFeedback(
        nextStatus === "paused"
          ? "Release plan paused locally."
          : "Release plan resumed locally.",
      );
    }
  };

  const archivePlan = () => {
    if (!activePlan) return;
    const archived = !activePlan.archived;
    if (updatePlan(activePlan.id, (plan) => ({ ...plan, archived }))) {
      setFeedback(archived ? "Release plan archived." : "Release plan restored.");
      if (archived) setActivePlanId("");
    }
  };

  const deletePlan = (planId) => {
    const plan = planById.get(planId);
    if (!plan) return;
    if (persistPlans(plans.filter((item) => item.id !== planId))) {
      if (activePlanId === planId) setActivePlanId("");
      setFeedback(`Deleted release plan “${plan.name}”.`);
    }
  };

  const exportPlan = (plan) => {
    const planAssessment = getReleaseAssessment(plan, availableReports);
    const rows = [
      ["Release plan", plan.name],
      ["Version", plan.version],
      ["Owner", plan.owner],
      ["Status", PLAN_STATES.find((item) => item.value === plan.status)?.label],
      ["Start date", plan.startDate],
      ["Target date", plan.targetDate],
      ["Severity policy", plan.severityPolicy],
      ["Readiness", planAssessment.isReady ? "Ready (advisory)" : "Concerns present"],
      ["Readiness concerns", planAssessment.statusReasons.join("; ")],
      [],
      ["Included report", "Report ID", "Status", "Severity", "Category"],
      ...planAssessment.includedReports.map((report) => [
        getReportTitle(report),
        getReportId(report),
        getStatus(report),
        severityLabel(report),
        getCategory(report),
      ]),
      ...planAssessment.missingReports.map((id) => [
        "Unavailable in current results",
        id,
        "",
        "",
        "",
      ]),
      [],
      ["Milestone", "Status", "Due date", "Details"],
      ...plan.milestones.map((milestone) => [
        milestone.title,
        MILESTONE_STATES.find((item) => item.value === milestone.status)?.label,
        milestone.dueDate,
        milestone.detail,
      ]),
      [],
      ["Decision", "Owner", "Time", "Summary", "Conditions"],
      ...plan.decisions.map((decision) => [
        DECISION_TYPES.find((item) => item.value === decision.type)?.label,
        decision.owner,
        decision.at,
        decision.summary,
        decision.conditions,
      ]),
    ];
    const csv = rows.map((row) => row.map(toCsvCell).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `release-plan-${plan.id.slice(0, 8)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback("Release plan exported. Report descriptions were not included.");
  };

  const statusOptions = [
    { value: "all", label: "All report statuses" },
    { value: "open", label: "Open only" },
    { value: "closed", label: "Resolved only" },
  ];
  const currentPlans = plans.filter((plan) => !plan.archived);
  const archivedPlans = plans.filter((plan) => plan.archived);
  const activePlanLocked = activePlan?.status === "released";
  const releaseDateDays = activePlan
    ? getDaysRemaining(activePlan.targetDate)
    : null;
  const includedIds = new Set(activePlan?.reportIds || []);

  return (
    <section
      aria-labelledby="release-planning-title"
      className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
            <GitBranch size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3
              id="release-planning-title"
              className="text-sm font-semibold tracking-tight text-slate-900"
            >
              Release planning workspace
            </h3>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
              Organize release scope, milestones, readiness concerns, and
              decision notes in this browser.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/70 px-2.5 py-1 text-[10px] font-medium text-indigo-700">
          <LockKeyhole size={11} aria-hidden="true" />
          Advisory · browser local
        </span>
      </header>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricCard
            label="Active plans"
            value={planStats.active}
            tone="violet"
            icon={GitBranch}
          />
          <MetricCard
            label="Ready (advisory)"
            value={planStats.ready}
            tone="emerald"
            icon={CheckCheck}
          />
          <MetricCard
            label="Released locally"
            value={planStats.released}
            icon={BadgeCheck}
          />
          <MetricCard
            label="Current plans"
            value={planStats.total}
            tone="amber"
            icon={Target}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.55fr)]">
          <aside className="space-y-3">
            <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
              <div className="flex items-start gap-2">
                <Plus size={14} aria-hidden="true" className="mt-0.5 text-violet-600" />
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">
                    Create a release plan
                  </h4>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500">
                    Start with a name and a local owner.
                  </p>
                </div>
              </div>
              <label className="mt-3 block">
                <span className="mb-1 block text-[9px] font-semibold text-slate-500">
                  Release name
                </span>
                <input
                  type="text"
                  value={newPlanName}
                  maxLength={120}
                  onChange={(event) => setNewPlanName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") createReleasePlan();
                  }}
                  placeholder="For example, Mobile v2.4"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                />
              </label>
              <label className="mt-2 block">
                <span className="mb-1 block text-[9px] font-semibold text-slate-500">
                  Local owner
                </span>
                <span className="relative block">
                  <UsersRound
                    size={12}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={planOwner}
                    maxLength={80}
                    onChange={(event) => setPlanOwner(event.target.value)}
                    placeholder="Optional"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                  />
                </span>
              </label>
              <button
                type="button"
                onClick={createReleasePlan}
                disabled={!newPlanName.trim() || !storageLoaded || !savedEmail}
                className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={13} aria-hidden="true" />
                Create plan
              </button>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800">
                    Release plans
                  </h4>
                  <p className="mt-1 text-[9px] text-slate-400">
                    {visiblePlans.length} plans shown
                  </p>
                </div>
                <label className="inline-flex items-center gap-1.5 text-[9px] text-slate-500">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(event) => setShowArchived(event.target.checked)}
                    className="accent-violet-600"
                  />
                  Archived
                </label>
              </div>
              <label className="relative block">
                <span className="sr-only">Search release plans</span>
                <Search
                  size={13}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={planSearch}
                  onChange={(event) => setPlanSearch(event.target.value)}
                  placeholder="Search plans..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <SmallSelect
                  label="Filter release plans by status"
                  value={planFilter}
                  options={PLAN_FILTERS}
                  onChange={setPlanFilter}
                />
                <button
                  type="button"
                  onClick={() => setPlanFilter("all")}
                  className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[9px] font-medium text-slate-500 transition hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
                >
                  <RotateCcw size={11} aria-hidden="true" />
                  Reset filter
                </button>
              </div>

              {visiblePlans.length ? (
                <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
                  {visiblePlans.map((plan) => (
                    <PlanQueueCard
                      key={plan.id}
                      plan={plan}
                      active={plan.id === activePlanId}
                      assessment={assessmentsByPlan.get(plan.id)}
                      onSelect={() => setActivePlanId(plan.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-7 text-center">
                  <GitBranch
                    size={17}
                    aria-hidden="true"
                    className="mx-auto text-slate-400"
                  />
                  <p className="mt-2 text-[10px] font-medium text-slate-600">
                    {plans.length ? "No plans match these filters" : "No plans yet"}
                  </p>
                  <p className="mt-1 text-[9px] leading-4 text-slate-400">
                    Create a release plan to track scope and milestones.
                  </p>
                </div>
              )}
              {archivedPlans.length > 0 && showArchived && (
                <p className="text-[9px] text-slate-400">
                  {archivedPlans.length} archived plan(s) are included.
                </p>
              )}
            </section>
          </aside>

          <div className="min-w-0 space-y-3">
            {activePlan && assessment && planProgress ? (
              <>
                <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
                        <Flag size={16} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="break-words text-sm font-semibold text-slate-900">
                            {activePlan.name}
                          </h4>
                          <StatusBadge status={activePlan.status} />
                          {activePlan.version && (
                            <span className="rounded-md bg-slate-50 px-2 py-1 text-[9px] font-medium text-slate-500">
                              v{activePlan.version}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500">
                          {activePlan.owner || "Owner not set"} ·{" "}
                          {activePlan.reportIds.length} scoped reports
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => exportPlan(activePlan)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[10px] font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
                      >
                        <Download size={11} aria-hidden="true" />
                        Export
                      </button>
                      <button
                        type="button"
                        onClick={archivePlan}
                        disabled={activePlanLocked}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 disabled:opacity-40"
                      >
                        {activePlan.archived ? "Restore" : "Archive"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePlan(activePlan.id)}
                        aria-label="Delete active release plan"
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {activePlanLocked && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-100 bg-violet-50/70 px-3 py-2">
                      <p className="text-[10px] text-violet-700">
                        This local plan is marked released and locked against edits.
                      </p>
                      <button
                        type="button"
                        onClick={reopenPlan}
                        className="inline-flex h-7 items-center gap-1 rounded-md bg-white px-2 text-[9px] font-semibold text-violet-700 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
                      >
                        <RotateCcw size={10} aria-hidden="true" />
                        Reopen
                      </button>
                    </div>
                  )}

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <label>
                      <span className="mb-1 block text-[9px] font-semibold text-slate-500">
                        Release name
                      </span>
                      <input
                        type="text"
                        value={activePlan.name}
                        maxLength={120}
                        disabled={activePlanLocked}
                        onChange={(event) =>
                          updatePlanField("name", event.target.value)
                        }
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-[9px] font-semibold text-slate-500">
                        Version or build
                      </span>
                      <input
                        type="text"
                        value={activePlan.version}
                        maxLength={80}
                        disabled={activePlanLocked}
                        onChange={(event) =>
                          updatePlanField("version", event.target.value)
                        }
                        placeholder="Optional"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-[9px] font-semibold text-slate-500">
                        Release owner
                      </span>
                      <input
                        type="text"
                        value={activePlan.owner}
                        maxLength={80}
                        disabled={activePlanLocked}
                        onChange={(event) =>
                          updatePlanField("owner", event.target.value)
                        }
                        placeholder="Optional"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50"
                      />
                    </label>
                    <SmallSelect
                      label="Release plan status"
                      value={activePlan.status}
                      options={PLAN_STATES.filter(
                        (item) => item.value !== "released",
                      )}
                      disabled={activePlanLocked}
                      onChange={(status) =>
                        updatePlanField("status", status)
                      }
                    />
                    <label>
                      <span className="mb-1 block text-[9px] font-semibold text-slate-500">
                        Start date
                      </span>
                      <input
                        type="date"
                        value={activePlan.startDate}
                        disabled={activePlanLocked}
                        onChange={(event) =>
                          updatePlanField("startDate", event.target.value)
                        }
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-[9px] font-semibold text-slate-500">
                        Target date
                      </span>
                      <input
                        type="date"
                        value={activePlan.targetDate}
                        disabled={activePlanLocked}
                        onChange={(event) =>
                          updatePlanField("targetDate", event.target.value)
                        }
                        className={`h-9 w-full rounded-lg border bg-white px-2.5 text-[10px] outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50 ${
                          releaseDateDays !== null && releaseDateDays < 0
                            ? "border-amber-300 text-amber-800"
                            : "border-slate-200 text-slate-700"
                        }`}
                      />
                      {releaseDateDays !== null && (
                        <span
                          className={`mt-1 block text-[9px] ${
                            releaseDateDays < 0
                              ? "text-amber-700"
                              : "text-slate-400"
                          }`}
                        >
                          {releaseDateDays < 0
                            ? `${Math.abs(releaseDateDays)} days past target`
                            : `${releaseDateDays} days to target`}
                        </span>
                      )}
                    </label>
                    <SmallSelect
                      label="Open issue severity policy"
                      value={activePlan.severityPolicy}
                      options={SEVERITY_OPTIONS}
                      disabled={activePlanLocked}
                      onChange={(value) =>
                        updatePlanField("severityPolicy", value)
                      }
                    />
                  </div>
                  <label className="mt-3 block">
                    <span className="mb-1 block text-[9px] font-semibold text-slate-500">
                      Release description and scope
                    </span>
                    <textarea
                      rows={3}
                      maxLength={MAX_DESCRIPTION}
                      value={activePlan.description}
                      disabled={activePlanLocked}
                      onChange={(event) =>
                        updatePlanField("description", event.target.value)
                      }
                      placeholder="What is in scope, out of scope, and notable?"
                      className="w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] leading-4 text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50"
                    />
                    <span className="mt-0.5 block text-right text-[9px] tabular-nums text-slate-300">
                      {activePlan.description.length}/{MAX_DESCRIPTION}
                    </span>
                  </label>
                </section>

                <section
                  aria-label="Release readiness"
                  className={`rounded-xl border p-3 sm:p-4 ${
                    assessment.isReady
                      ? "border-emerald-200 bg-emerald-50/30"
                      : assessment.policyBlockers.length
                        ? "border-rose-200 bg-rose-50/30"
                        : "border-amber-200 bg-amber-50/30"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      {assessment.isReady ? (
                        <CheckCheck
                          size={16}
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-emerald-600"
                        />
                      ) : assessment.policyBlockers.length ? (
                        <ShieldAlert
                          size={16}
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-rose-600"
                        />
                      ) : (
                        <CircleAlert
                          size={16}
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-amber-600"
                        />
                      )}
                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          {assessment.isReady
                            ? "Plan meets the configured advisory checks"
                            : "Readiness concerns need review"}
                        </p>
                        <p className="mt-1 text-[9px] leading-4 text-slate-500">
                          This is a local planning signal, not deployment approval
                          or a guarantee of release quality.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={markReleased}
                      disabled={!assessment.isReady || activePlanLocked}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[10px] font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <BadgeCheck size={13} aria-hidden="true" />
                      Mark released locally
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <MetricCard
                      label="Scoped reports"
                      value={assessment.includedReports.length}
                      icon={GitBranch}
                    />
                    <MetricCard
                      label="Open"
                      value={assessment.openReports.length}
                      tone="violet"
                    />
                    <MetricCard
                      label="Critical open"
                      value={assessment.criticalOpen.length}
                      tone={assessment.criticalOpen.length ? "rose" : "emerald"}
                      icon={ShieldAlert}
                    />
                    <MetricCard
                      label="Milestones done"
                      value={`${planProgress.complete}/${planProgress.total}`}
                      tone="emerald"
                    />
                    <MetricCard
                      label="Overdue / blocked"
                      value={assessment.blockedMilestones.length}
                      tone={
                        assessment.blockedMilestones.length ? "amber" : "emerald"
                      }
                    />
                  </div>
                  {assessment.statusReasons.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {assessment.statusReasons.map((reason) => (
                        <li
                          key={reason}
                          className="flex items-start gap-1.5 text-[9px] text-slate-600"
                        >
                          <AlertTriangle
                            size={11}
                            aria-hidden="true"
                            className="mt-0.5 shrink-0 text-amber-600"
                          />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  )}
                  {assessment.isReady && (
                    <p className="mt-2 text-[9px] text-emerald-700">
                      All included reports are available, severity policy passes,
                      and every milestone is complete.
                    </p>
                  )}
                </section>

                <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800">
                        Release milestones
                      </h4>
                      <p className="mt-1 text-[9px] text-slate-400">
                        {planProgress.complete} complete · {planProgress.blocked} blocked ·{" "}
                        {planProgress.total - planProgress.complete} remaining
                      </p>
                    </div>
                    <span className="rounded-md bg-white px-2 py-1 text-[9px] font-medium tabular-nums text-slate-500">
                      {planProgress.percentage}%
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Release milestone progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={planProgress.percentage}
                    aria-valuetext={`${planProgress.percentage}% of milestones complete`}
                    className="h-1.5 overflow-hidden rounded-full bg-slate-200"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-[width] motion-reduce:transition-none"
                      style={{ width: `${planProgress.percentage}%` }}
                    />
                  </div>
                  {activePlan.milestones.length ? (
                    <div className="space-y-2">
                      {activePlan.milestones.map((milestone, index) => (
                        <MilestoneRow
                          key={milestone.id}
                          milestone={milestone}
                          index={index}
                          locked={activePlanLocked}
                          onChange={(next) =>
                            updateMilestone(milestone.id, next)
                          }
                          onDelete={() => deleteMilestone(milestone.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-5 text-center text-[10px] text-slate-400">
                      Add milestones to make the release path actionable.
                    </p>
                  )}
                  {!activePlanLocked && (
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto]">
                      <label>
                        <span className="sr-only">New milestone title</span>
                        <input
                          type="text"
                          value={newMilestoneTitle}
                          maxLength={180}
                          onChange={(event) =>
                            setNewMilestoneTitle(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") addMilestone();
                          }}
                          placeholder="New milestone..."
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                        />
                      </label>
                      <label>
                        <span className="sr-only">Milestone definition of done</span>
                        <input
                          type="text"
                          value={newMilestoneDetail}
                          maxLength={500}
                          onChange={(event) =>
                            setNewMilestoneDetail(event.target.value)
                          }
                          placeholder="Definition of done (optional)"
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={addMilestone}
                        disabled={activePlan.milestones.length >= MAX_MILESTONES}
                        className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus size={12} aria-hidden="true" />
                        Add
                      </button>
                    </div>
                  )}
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800">
                        Report scope
                      </h4>
                      <p className="mt-1 text-[9px] text-slate-400">
                        Include reports for this release. Current status and
                        severity are re-evaluated from loaded report data.
                      </p>
                    </div>
                    <span className="rounded-md bg-indigo-50 px-2 py-1 text-[9px] font-semibold tabular-nums text-indigo-700">
                      {activePlan.reportIds.length} selected
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_150px_150px]">
                    <label className="relative block">
                      <span className="sr-only">Search reports for release scope</span>
                      <Search
                        size={12}
                        aria-hidden="true"
                        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="search"
                        value={reportSearch}
                        onChange={(event) =>
                          setReportSearch(event.target.value)
                        }
                        placeholder="Search reports..."
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                      />
                    </label>
                    <SmallSelect
                      label="Filter scope reports by status"
                      value={reportStatusFilter}
                      options={statusOptions}
                      onChange={setReportStatusFilter}
                    />
                    <SmallSelect
                      label="Filter scope reports by category"
                      value={reportCategoryFilter}
                      options={reportCategoryOptions}
                      onChange={setReportCategoryFilter}
                    />
                    <SmallSelect
                      label="Sort scope reports"
                      value={reportSort}
                      options={[
                        { value: "risk", label: "Risk first" },
                        { value: "severity", label: "Severity first" },
                        { value: "title", label: "Title A–Z" },
                      ]}
                      onChange={setReportSort}
                    />
                  </div>
                  <div className="mt-2 max-h-[360px] space-y-2 overflow-y-auto pr-1">
                    {filteredReports.length ? (
                      filteredReports.map((report) => {
                        const reportId = getReportId(report);
                        return (
                          <ReportRow
                            key={reportId}
                            report={report}
                            included={includedIds.has(reportId)}
                            blocked={assessment.policyBlockers.some(
                              (item) => getReportId(item) === reportId,
                            )}
                            onToggle={toggleReportInPlan}
                            onOpen={onOpenReport}
                          />
                        );
                      })
                    ) : (
                      <p className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center text-[10px] text-slate-400">
                        No reports match these search and status filters.
                      </p>
                    )}
                  </div>
                  {assessment.missingReports.length > 0 && (
                    <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50/70 p-2.5">
                      <p className="text-[9px] font-semibold text-amber-800">
                        {assessment.missingReports.length} saved report reference(s)
                        are unavailable in current results.
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {assessment.missingReports.slice(0, 8).map((id) => (
                          <span
                            key={id}
                            className="rounded bg-white px-1.5 py-0.5 text-[8px] text-amber-700"
                          >
                            #{id}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MessageSquareText
                        size={14}
                        aria-hidden="true"
                        className="text-indigo-600"
                      />
                      <div>
                        <h4 className="text-xs font-semibold text-slate-800">
                          Decision log
                        </h4>
                        <p className="mt-1 text-[9px] text-slate-400">
                          Local planning notes, not a deployment action.
                        </p>
                      </div>
                    </div>
                    <span className="rounded-md bg-white px-2 py-1 text-[9px] tabular-nums text-slate-500">
                      {activePlan.decisions.length}/{MAX_DECISIONS}
                    </span>
                  </div>
                  {!activePlanLocked && (
                    <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <SmallSelect
                          label="Decision type"
                          value={decisionType}
                          options={DECISION_TYPES}
                          onChange={setDecisionType}
                        />
                        <label>
                          <span className="sr-only">Decision owner</span>
                          <input
                            type="text"
                            value={decisionOwner}
                            maxLength={80}
                            onChange={(event) =>
                              setDecisionOwner(event.target.value)
                            }
                            placeholder={`Owner (${activePlan.owner || "optional"})`}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                          />
                        </label>
                      </div>
                      <label className="block">
                        <span className="sr-only">Decision summary</span>
                        <textarea
                          rows={2}
                          maxLength={MAX_DESCRIPTION}
                          value={decisionSummary}
                          onChange={(event) =>
                            setDecisionSummary(event.target.value)
                          }
                          placeholder="What was decided?"
                          className="w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                        />
                      </label>
                      <label className="block">
                        <span className="sr-only">
                          Decision conditions or follow-up
                        </span>
                        <input
                          type="text"
                          maxLength={MAX_NOTE}
                          value={decisionConditions}
                          onChange={(event) =>
                            setDecisionConditions(event.target.value)
                          }
                          placeholder="Conditions or follow-up (optional)"
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={addDecision}
                        disabled={
                          !decisionSummary.trim() ||
                          activePlan.decisions.length >= MAX_DECISIONS
                        }
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-indigo-600 px-3 text-[10px] font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus size={11} aria-hidden="true" />
                        Record decision
                      </button>
                    </div>
                  )}
                  <div className="mt-3 space-y-2">
                    {(showAllDecisions
                      ? [...activePlan.decisions].reverse()
                      : [...activePlan.decisions].slice(-5).reverse()
                    ).map((decision) => (
                      <div
                        key={decision.id}
                        className="flex items-start gap-1.5"
                      >
                        <div className="min-w-0 flex-1">
                          <DecisionCard decision={decision} />
                        </div>
                        {!activePlanLocked && (
                          <button
                            type="button"
                            onClick={() => removeDecision(decision.id)}
                            aria-label="Remove decision entry"
                            className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
                          >
                            <X size={12} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    ))}
                    {activePlan.decisions.length > 5 && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowAllDecisions((show) => !show)
                        }
                        className="w-full rounded-lg py-2 text-[9px] font-medium text-violet-700 hover:bg-violet-50"
                      >
                        {showAllDecisions
                          ? "Show recent decisions"
                          : `Show all ${activePlan.decisions.length} decisions`}
                      </button>
                    )}
                  </div>
                </section>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={pausePlan}
                      disabled={activePlanLocked}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      {activePlan.status === "paused" ? "Resume plan" : "Pause plan"}
                    </button>
                    <span className="text-[9px] text-slate-400">
                      Updated {formatDateTime(activePlan.updatedAt)}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[9px] text-slate-400">
                    <Sparkles size={10} aria-hidden="true" />
                    Scope and policy are editable while planning
                  </span>
                </div>
              </>
            ) : (
              <div className="flex min-h-[440px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-8 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                  <GitBranch size={19} aria-hidden="true" />
                </span>
                <h4 className="mt-3 text-sm font-semibold text-slate-800">
                  Select a release plan
                </h4>
                <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                  Create a plan or choose one from the queue to set its scope,
                  assign milestones, and review its advisory readiness.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] text-slate-500">
                    Milestones
                  </span>
                  <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] text-slate-500">
                    Report scope
                  </span>
                  <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] text-slate-500">
                    Decision log
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {plans.length > 0 && (
          <section className="space-y-2 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h4 className="text-xs font-semibold text-slate-800">
                  Release portfolio
                </h4>
                <p className="mt-1 text-[9px] text-slate-400">
                  Cross-plan schedule and readiness snapshot from local plans.
                </p>
              </div>
              <span className="text-[9px] tabular-nums text-slate-400">
                {currentPlans.length} active · {archivedPlans.length} archived
              </span>
            </div>
            {currentPlans.length ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                      <th scope="col" className="px-3 py-2.5">Release</th>
                      <th scope="col" className="px-3 py-2.5">Owner</th>
                      <th scope="col" className="px-3 py-2.5">Target</th>
                      <th scope="col" className="px-3 py-2.5">Scope</th>
                      <th scope="col" className="px-3 py-2.5">Milestones</th>
                      <th scope="col" className="px-3 py-2.5">Readiness</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentPlans
                      .slice()
                      .sort((left, right) => {
                        const leftDate = left.targetDate
                          ? new Date(`${left.targetDate}T00:00:00`).getTime()
                          : Number.MAX_SAFE_INTEGER;
                        const rightDate = right.targetDate
                          ? new Date(`${right.targetDate}T00:00:00`).getTime()
                          : Number.MAX_SAFE_INTEGER;
                        return leftDate - rightDate;
                      })
                      .map((plan) => {
                        const itemAssessment = assessmentsByPlan.get(plan.id);
                        const progress = getMilestoneProgress(plan);
                        return (
                          <tr key={plan.id} className="text-[10px] text-slate-600">
                            <td className="max-w-[240px] px-3 py-2.5">
                              <button
                                type="button"
                                onClick={() => setActivePlanId(plan.id)}
                                className="block truncate text-left font-semibold text-slate-800 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
                              >
                                {plan.name}
                              </button>
                              <span className="mt-1 block">
                                <StatusBadge status={plan.status} />
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              {plan.owner || "—"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5">
                              {formatDate(plan.targetDate)}
                            </td>
                            <td className="px-3 py-2.5 tabular-nums">
                              {itemAssessment.includedReports.length}
                              {itemAssessment.missingReports.length > 0 &&
                                ` + ${itemAssessment.missingReports.length} unavailable`}
                            </td>
                            <td className="px-3 py-2.5 tabular-nums">
                              {progress.complete}/{progress.total}
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={
                                  itemAssessment.isReady
                                    ? "font-semibold text-emerald-700"
                                    : itemAssessment.policyBlockers.length
                                      ? "font-semibold text-rose-700"
                                      : "text-amber-700"
                                }
                              >
                                {itemAssessment.isReady
                                  ? "Ready"
                                  : `${itemAssessment.statusReasons.length} concerns`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-[10px] text-slate-400">
                All release plans are archived.
              </p>
            )}
          </section>
        )}

        <footer className="flex flex-wrap items-start justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="flex max-w-4xl items-start gap-2">
            <ShieldAlert
              size={13}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-slate-400"
            />
            <p className="text-[9px] leading-4 text-slate-400">
              Release plans, scope, milestones, and decisions are stored only
              in this browser, scoped to the loaded tester email. Readiness is
              advisory and does not change server reports, deploy software, or
              approve a release.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[9px] text-slate-400">
            <LockKeyhole size={10} aria-hidden="true" />
            Local only
          </span>
        </footer>

        {storageError && (
          <p
            role="alert"
            className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[10px] text-rose-700"
          >
            {storageError}
          </p>
        )}
        {feedback && (
          <p
            role="status"
            aria-live="polite"
            className="text-[10px] text-slate-500"
          >
            {feedback}
          </p>
        )}
      </div>
    </section>
  );
}
