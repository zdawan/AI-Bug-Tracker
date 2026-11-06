"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  Bug,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  Flag,
  FlaskConical,
  Layers3,
  ListFilter,
  MessageSquareText,
  Pause,
  Play,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";

const STORAGE_PREFIX = "tester-bug-bash-campaigns-v1";
const MAX_CAMPAIGNS = 30;
const MAX_PARTICIPANTS = 60;
const MAX_ROUNDS = 40;
const MAX_FINDINGS = 250;
const MAX_ACTIVITY = 120;
const TEXT_LIMIT = 1400;

const CAMPAIGN_STATES = {
  draft: { label: "Draft", tone: "border-slate-200 bg-slate-50 text-slate-600" },
  planned: { label: "Planned", tone: "border-sky-200 bg-sky-50 text-sky-700" },
  active: { label: "In progress", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  paused: { label: "Paused", tone: "border-amber-200 bg-amber-50 text-amber-700" },
  completed: { label: "Completed", tone: "border-violet-200 bg-violet-50 text-violet-700" },
};

const ROUND_STATES = {
  planned: { label: "Planned", tone: "border-slate-200 bg-slate-50 text-slate-600" },
  active: { label: "Active", tone: "border-sky-200 bg-sky-50 text-sky-700" },
  completed: { label: "Completed", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  skipped: { label: "Skipped", tone: "border-slate-200 bg-white text-slate-500" },
};

const FINDING_STATES = [
  { id: "new", label: "New", icon: Sparkles, tone: "border-sky-200 bg-sky-50 text-sky-700" },
  { id: "confirmed", label: "Confirmed", icon: CheckCircle2, tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { id: "needs-triage", label: "Needs triage", icon: ShieldAlert, tone: "border-amber-200 bg-amber-50 text-amber-700" },
  { id: "duplicate", label: "Duplicate", icon: Copy, tone: "border-violet-200 bg-violet-50 text-violet-700" },
  { id: "not-reproducible", label: "Not reproducible", icon: CircleDashed, tone: "border-slate-200 bg-slate-50 text-slate-600" },
];

const FINDING_FILTERS = [
  { id: "all", label: "All findings" },
  { id: "new", label: "New" },
  { id: "confirmed", label: "Confirmed" },
  { id: "needs-triage", label: "Needs triage" },
  { id: "duplicate", label: "Duplicate" },
  { id: "not-reproducible", label: "Not reproducible" },
];

const AREA_PRESETS = [
  "Authentication",
  "Navigation",
  "Search and filtering",
  "Core workflow",
  "Forms and validation",
  "Responsive layout",
  "Accessibility",
  "Performance",
  "Notifications",
  "Other",
];

const ROUND_PRESETS = [
  {
    name: "Warm-up",
    focus: "Explore the main user journey and note confusing or broken behavior.",
    duration: 15,
  },
  {
    name: "Focused exploration",
    focus: "Concentrate on one high-impact feature and test realistic edge cases.",
    duration: 25,
  },
  {
    name: "Cross-browser pass",
    focus: "Repeat key workflows with a different browser or viewport.",
    duration: 20,
  },
  {
    name: "Triage and wrap-up",
    focus: "Review findings, confirm duplicates, and identify follow-up owners.",
    duration: 15,
  },
];

function getText(value, limit = 320) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getDateTime(value) {
  if (typeof value !== "string" || !value) return "";
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : "";
}

function getStorageKey(email) {
  return `${STORAGE_PREFIX}:${encodeURIComponent(getText(email, 240).toLowerCase())}`;
}

function normalizeState(value, states, fallback) {
  return Object.hasOwn(states, value) ? value : fallback;
}

function normalizeParticipant(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const name = getText(value.name, 120);
  if (!name) return null;
  return {
    id: getText(value.id, 100) || makeId(),
    name,
    role: getText(value.role, 100),
    focus: getText(value.focus, 180),
    environment: getText(value.environment, 180),
    notes: getText(value.notes, 600),
    checkedIn: Boolean(value.checkedIn),
  };
}

function normalizeRound(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const duration = Number(value.duration);
  return {
    id: getText(value.id, 100) || makeId(),
    name: getText(value.name, 140) || "Untitled round",
    focus: getText(value.focus, 500),
    duration: Number.isFinite(duration) ? Math.min(360, Math.max(5, Math.round(duration))) : 15,
    startsAt: getDateTime(value.startsAt),
    status: normalizeState(value.status, ROUND_STATES, "planned"),
    notes: getText(value.notes, 1000),
    participantIds: Array.isArray(value.participantIds)
      ? [...new Set(value.participantIds.map((id) => getText(id, 100)).filter(Boolean))].slice(0, MAX_PARTICIPANTS)
      : [],
  };
}

function normalizeFinding(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const allowedStates = FINDING_STATES.map((state) => state.id);
  const severity = ["Critical", "High", "Medium", "Low"].includes(value.severity)
    ? value.severity
    : "Unspecified";
  return {
    id: getText(value.id, 100) || makeId(),
    title: getText(value.title, 180) || "Untitled finding",
    description: getText(value.description, TEXT_LIMIT),
    area: getText(value.area, 120),
    severity,
    status: allowedStates.includes(value.status) ? value.status : "new",
    participantId: getText(value.participantId, 100),
    roundId: getText(value.roundId, 100),
    reportId: getText(value.reportId, 120),
    evidenceUrl: getText(value.evidenceUrl, 1000),
    createdAt: getDateTime(value.createdAt) || new Date().toISOString(),
    updatedAt: getDateTime(value.updatedAt) || new Date().toISOString(),
  };
}

function normalizeActivity(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const message = getText(value.message, 240);
  if (!message) return null;
  return {
    id: getText(value.id, 100) || makeId(),
    message,
    createdAt: getDateTime(value.createdAt) || new Date().toISOString(),
  };
}

function normalizeCampaign(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const participants = Array.isArray(value.participants)
    ? value.participants.slice(0, MAX_PARTICIPANTS).map(normalizeParticipant).filter(Boolean)
    : [];
  const rounds = Array.isArray(value.rounds)
    ? value.rounds.slice(0, MAX_ROUNDS).map(normalizeRound).filter(Boolean)
    : [];
  const findings = Array.isArray(value.findings)
    ? value.findings.slice(0, MAX_FINDINGS).map(normalizeFinding).filter(Boolean)
    : [];
  const activity = Array.isArray(value.activity)
    ? value.activity.slice(-MAX_ACTIVITY).map(normalizeActivity).filter(Boolean)
    : [];
  return {
    id: getText(value.id, 100) || makeId(),
    name: getText(value.name, 180) || "Untitled bug bash",
    objective: getText(value.objective, 1200),
    build: getText(value.build, 100),
    environment: getText(value.environment, 160),
    baseUrl: getText(value.baseUrl, 1000),
    startsAt: getDateTime(value.startsAt),
    status: normalizeState(value.status, CAMPAIGN_STATES, "draft"),
    areas: Array.isArray(value.areas)
      ? [...new Set(value.areas.map((area) => getText(area, 120)).filter(Boolean))].slice(0, 40)
      : [],
    reportIds: Array.isArray(value.reportIds)
      ? [...new Set(value.reportIds.map((id) => getText(id, 120)).filter(Boolean))].slice(0, 250)
      : [],
    participants,
    rounds,
    findings,
    createdAt: getDateTime(value.createdAt) || new Date().toISOString(),
    updatedAt: getDateTime(value.updatedAt) || new Date().toISOString(),
    completedAt: getDateTime(value.completedAt),
    activity,
  };
}

function normalizeCampaigns(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_CAMPAIGNS).map(normalizeCampaign).filter(Boolean);
}

function formatDate(value, options = {}) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(date);
}

function parseLocalDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : "";
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

function reportId(report) {
  const id = report?._id ?? report?.id;
  return id === null || id === undefined ? "" : String(id).trim();
}

function reportTitle(report) {
  return getText(report?.title, 200) || getText(report?.summary, 200) || "Untitled report";
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function appendActivity(campaign, message) {
  return [
    ...campaign.activity,
    { id: makeId(), message: getText(message, 240), createdAt: new Date().toISOString() },
  ].slice(-MAX_ACTIVITY);
}

function getCampaignMetrics(campaign, reports) {
  const findingsByState = FINDING_STATES.reduce(
    (result, state) => ({ ...result, [state.id]: 0 }),
    {},
  );
  const findingsBySeverity = { Critical: 0, High: 0, Medium: 0, Low: 0, Unspecified: 0 };
  campaign.findings.forEach((finding) => {
    findingsByState[finding.status] += 1;
    findingsBySeverity[finding.severity] += 1;
  });
  const reportIds = new Set(reports.map(reportId).filter(Boolean));
  const includedReports = campaign.reportIds.filter((id) => reportIds.has(id)).length;
  const completedRounds = campaign.rounds.filter((round) => round.status === "completed").length;
  const activeRounds = campaign.rounds.filter((round) => round.status === "active").length;
  const checkedIn = campaign.participants.filter((participant) => participant.checkedIn).length;
  const totalMinutes = campaign.rounds.reduce((sum, round) => sum + round.duration, 0);
  return {
    ...findingsByState,
    ...findingsBySeverity,
    totalFindings: campaign.findings.length,
    confirmed: findingsByState.confirmed,
    needsTriage: findingsByState["needs-triage"],
    participants: campaign.participants.length,
    checkedIn,
    rounds: campaign.rounds.length,
    completedRounds,
    activeRounds,
    totalMinutes,
    includedReports,
    unavailableReports: campaign.reportIds.length - includedReports,
    findingsPerParticipant: campaign.participants.length
      ? (campaign.findings.length / campaign.participants.length).toFixed(1)
      : "0.0",
  };
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

function createCampaign(name, startsAt) {
  const now = new Date().toISOString();
  return normalizeCampaign({
    id: makeId(),
    name: getText(name, 180),
    objective: "",
    build: "",
    environment: "",
    baseUrl: "",
    startsAt,
    status: "draft",
    areas: [],
    reportIds: [],
    participants: [],
    rounds: [],
    findings: [],
    createdAt: now,
    updatedAt: now,
    completedAt: "",
    activity: [{ id: makeId(), message: "Created bug-bash campaign", createdAt: now }],
  });
}

function StateBadge({ status, states = CAMPAIGN_STATES }) {
  const state = states[status] || states.draft || states.planned;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${state.tone}`}>
      {state.label}
    </span>
  );
}

function Metric({ label, value, detail, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-900",
    sky: "border-sky-200 bg-sky-50/60 text-sky-900",
    green: "border-emerald-200 bg-emerald-50/60 text-emerald-900",
    amber: "border-amber-200 bg-amber-50/60 text-amber-900",
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

function EmptyPanel({ icon: Icon = ClipboardList, title, description, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-9 text-center">
      <Icon className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold text-slate-800">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>
      {action}
    </div>
  );
}

function CampaignListItem({ campaign, selected, onSelect, onDuplicate, onDelete }) {
  const metrics = getCampaignMetrics(campaign, []);
  return (
    <article className={`rounded-2xl border p-3 transition ${selected ? "border-sky-300 bg-sky-50/70 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}>
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-sm font-semibold text-slate-900">{campaign.name}</span>
          <StateBadge status={campaign.status} />
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">
          {[campaign.build && `Build ${campaign.build}`, campaign.environment].filter(Boolean).join(" · ") || "No build details"}
        </p>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>{metrics.totalFindings} findings · {metrics.participants} testers</span>
          <span>{formatDate(campaign.startsAt, { year: undefined, hour: undefined, minute: undefined })}</span>
        </div>
      </button>
      <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2">
        <button type="button" onClick={onDuplicate} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">
          <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Duplicate
        </button>
        <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
        </button>
      </div>
    </article>
  );
}

function ParticipantCard({ participant, canEdit, onChange, onRemove }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-2">
        <label className="flex flex-1 items-start gap-2">
          <input
            type="checkbox"
            checked={participant.checkedIn}
            onChange={(event) => onChange(participant.id, "checkedIn", event.target.checked)}
            disabled={!canEdit}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-500 disabled:opacity-50"
            aria-label={`Check in ${participant.name}`}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-800">{participant.name}</span>
            <span className="block truncate text-xs text-slate-500">{participant.role || "Tester"}</span>
          </span>
        </label>
        {canEdit ? (
          <button type="button" onClick={() => onRemove(participant.id)} aria-label={`Remove ${participant.name}`} className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {(participant.focus || participant.environment) ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {[participant.focus, participant.environment].filter(Boolean).join(" · ")}
        </p>
      ) : null}
      {canEdit ? (
        <textarea
          value={participant.notes}
          onChange={(event) => onChange(participant.id, "notes", getText(event.target.value, 600))}
          maxLength={600}
          rows={2}
          placeholder="Local notes for this tester"
          aria-label={`Notes for ${participant.name}`}
          className="mt-2 w-full resize-y rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-600 outline-none focus:border-sky-400"
        />
      ) : participant.notes ? (
        <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{participant.notes}</p>
      ) : null}
    </article>
  );
}

function RoundCard({ round, index, participantNames, canEdit, onUpdate, onRemove }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-xs font-semibold text-sky-700">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={round.name}
                onChange={(event) => onUpdate(round.id, "name", event.target.value)}
                maxLength={140}
                disabled={!canEdit}
                className="min-w-[140px] flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-sm font-semibold text-slate-900 outline-none hover:border-slate-200 focus:border-sky-400 disabled:opacity-70"
              />
              <StateBadge status={round.status} states={ROUND_STATES} />
            </div>
            <textarea
              value={round.focus}
              onChange={(event) => onUpdate(round.id, "focus", event.target.value)}
              disabled={!canEdit}
              maxLength={500}
              rows={2}
              placeholder="What should testers focus on during this round?"
              className="mt-1 w-full resize-y rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-sm leading-5 text-slate-600 outline-none hover:border-slate-200 focus:border-sky-400 disabled:opacity-70"
            />
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
              <label className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                <input
                  type="number"
                  min="5"
                  max="360"
                  value={round.duration}
                  onChange={(event) => onUpdate(round.id, "duration", event.target.value)}
                  disabled={!canEdit}
                  className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs disabled:bg-slate-50"
                  aria-label={`${round.name} duration in minutes`}
                />
                min
              </label>
              <label className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                <input
                  type="datetime-local"
                  value={round.startsAt ? new Date(round.startsAt).toISOString().slice(0, 16) : ""}
                  onChange={(event) => onUpdate(round.id, "startsAt", event.target.value)}
                  disabled={!canEdit}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs disabled:bg-slate-50"
                  aria-label={`${round.name} start time`}
                />
              </label>
            </div>
            {participantNames.length ? (
              <p className="mt-2 text-xs text-slate-500">
                Testers: {participantNames.join(", ")}
              </p>
            ) : null}
            <label className="mt-2 block text-xs font-medium text-slate-500">
              Round notes
              <textarea
                value={round.notes}
                onChange={(event) => onUpdate(round.id, "notes", event.target.value)}
                disabled={!canEdit}
                maxLength={1000}
                rows={2}
                placeholder="Capture handoff notes or session observations."
                className="mt-1 w-full resize-y rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-normal text-slate-600 outline-none focus:border-sky-400 disabled:bg-slate-50"
              />
            </label>
          </div>
        </div>
        {canEdit ? (
          <div className="flex shrink-0 flex-wrap gap-1">
            {Object.entries(ROUND_STATES).map(([id, option]) => (
              <button
                type="button"
                key={id}
                onClick={() => onUpdate(round.id, "status", id)}
                aria-pressed={round.status === id}
                className={`rounded-lg border px-2 py-1 text-[11px] font-medium ${round.status === id ? option.tone : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}
              >
                {option.label}
              </button>
            ))}
            <button type="button" onClick={() => onRemove(round.id)} aria-label={`Remove ${round.name}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function FindingCard({
  finding,
  participants,
  rounds,
  reports,
  canEdit,
  onChange,
  onRemove,
  onOpenReport,
}) {
  const linkedReport = reports.find((report) => reportId(report) === finding.reportId);
  const participant = participants.find((item) => item.id === finding.participantId);
  const round = rounds.find((item) => item.id === finding.roundId);
  const statusOption = FINDING_STATES.find((state) => state.id === finding.status) || FINDING_STATES[0];
  const StatusIcon = statusOption.icon;
  const evidenceValid = validHttpUrl(finding.evidenceUrl);
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400">{finding.area || "Unassigned area"}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{finding.severity}</span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusOption.tone}`}>
              <StatusIcon className="h-3 w-3" aria-hidden="true" /> {statusOption.label}
            </span>
          </div>
          <h4 className="mt-2 text-sm font-semibold text-slate-900">{finding.title}</h4>
          {finding.description ? <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-600">{finding.description}</p> : null}
          <p className="mt-2 text-xs text-slate-400">
            {participant ? `Reported by ${participant.name}` : "Reporter not assigned"}
            {round ? ` · ${round.name}` : ""}
            {` · ${formatDate(finding.createdAt)}`}
          </p>
        </div>
        {canEdit ? (
          <div className="flex shrink-0 items-center gap-1">
            <select
              value={finding.status}
              onChange={(event) => onChange(finding.id, "status", event.target.value)}
              aria-label={`Finding status for ${finding.title}`}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600"
            >
              {FINDING_STATES.map((state) => <option key={state.id} value={state.id}>{state.label}</option>)}
            </select>
            <button type="button" onClick={() => onRemove(finding.id)} aria-label={`Remove finding ${finding.title}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
      <div className="grid gap-3 border-t border-slate-100 bg-slate-50/50 p-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-slate-500">
          Severity
          {canEdit ? (
            <select value={finding.severity} onChange={(event) => onChange(finding.id, "severity", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-700">
              <option>Critical</option><option>High</option><option>Medium</option><option>Low</option><option>Unspecified</option>
            </select>
          ) : <span className="mt-1.5 block rounded-lg bg-white px-2.5 py-2 text-xs text-slate-700">{finding.severity}</span>}
        </label>
        <label className="text-xs font-medium text-slate-500">
          Area
          {canEdit ? (
            <select value={finding.area} onChange={(event) => onChange(finding.id, "area", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-700">
              <option value="">Unassigned</option>
              {AREA_PRESETS.map((area) => <option key={area}>{area}</option>)}
            </select>
          ) : <span className="mt-1.5 block rounded-lg bg-white px-2.5 py-2 text-xs text-slate-700">{finding.area || "Unassigned"}</span>}
        </label>
        {canEdit ? (
          <>
            <label className="text-xs font-medium text-slate-500">
              Reporter
              <select value={finding.participantId} onChange={(event) => onChange(finding.id, "participantId", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-700">
                <option value="">Not assigned</option>
                {participants.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-500">
              Round
              <select value={finding.roundId} onChange={(event) => onChange(finding.id, "roundId", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-700">
                <option value="">Not assigned</option>
                {rounds.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-500 sm:col-span-2">
              Evidence URL
              <input value={finding.evidenceUrl} onChange={(event) => onChange(finding.id, "evidenceUrl", event.target.value)} maxLength={1000} placeholder="https://..." className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-700" />
              {finding.evidenceUrl && !evidenceValid ? <span className="mt-1 block text-rose-600">Use an http:// or https:// link.</span> : null}
            </label>
          </>
        ) : null}
        {linkedReport ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 sm:col-span-2">
            <span className="inline-flex min-w-0 items-center gap-2 text-xs text-slate-700">
              <Bug className="h-3.5 w-3.5 shrink-0 text-rose-500" aria-hidden="true" />
              <span className="truncate">{reportTitle(linkedReport)}</span>
            </span>
            {onOpenReport ? <button type="button" onClick={() => onOpenReport(linkedReport)} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-sky-700 hover:underline">Open <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></button> : null}
          </div>
        ) : finding.reportId ? (
          <p className="text-xs text-amber-700 sm:col-span-2">Linked report is unavailable in the currently loaded data.</p>
        ) : null}
      </div>
    </article>
  );
}

export default function BugBashCampaignWorkspace({ reports = [], email, onOpenReport }) {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loadedEmail, setLoadedEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [campaignQuery, setCampaignQuery] = useState("");
  const [findingQuery, setFindingQuery] = useState("");
  const [reportQuery, setReportQuery] = useState("");
  const [findingFilter, setFindingFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignDate, setNewCampaignDate] = useState("");
  const [showParticipantForm, setShowParticipantForm] = useState(false);
  const [participantName, setParticipantName] = useState("");
  const [participantRole, setParticipantRole] = useState("");
  const [participantFocus, setParticipantFocus] = useState("");
  const [participantEnvironment, setParticipantEnvironment] = useState("");
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [roundName, setRoundName] = useState("");
  const [roundFocus, setRoundFocus] = useState("");
  const [roundDuration, setRoundDuration] = useState("15");
  const [showFindingForm, setShowFindingForm] = useState(false);
  const [findingTitle, setFindingTitle] = useState("");
  const [findingDescription, setFindingDescription] = useState("");
  const [findingArea, setFindingArea] = useState("");
  const [findingSeverity, setFindingSeverity] = useState("Medium");
  const [findingParticipant, setFindingParticipant] = useState("");
  const [findingRound, setFindingRound] = useState("");
  const [findingReport, setFindingReport] = useState("");
  const [findingEvidence, setFindingEvidence] = useState("");

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedId) || null;
  const requestedEmail = getText(email, 240).toLowerCase();
  const metrics = selectedCampaign ? getCampaignMetrics(selectedCampaign, reports) : null;

  const visibleCampaigns = useMemo(() => {
    const query = getText(campaignQuery, 120).toLowerCase();
    return campaigns
      .filter((campaign) => !query || [
        campaign.name,
        campaign.build,
        campaign.environment,
        campaign.objective,
        CAMPAIGN_STATES[campaign.status]?.label,
      ].some((value) => value?.toLowerCase().includes(query)))
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  }, [campaigns, campaignQuery]);

  const visibleFindings = useMemo(() => {
    if (!selectedCampaign) return [];
    const query = getText(findingQuery, 120).toLowerCase();
    return selectedCampaign.findings
      .filter((finding) => findingFilter === "all" || finding.status === findingFilter)
      .filter((finding) => !query || [
        finding.title,
        finding.description,
        finding.area,
        finding.severity,
        finding.status,
      ].some((value) => value?.toLowerCase().includes(query)))
      .sort((left, right) => {
        const severityRank = { Critical: 0, High: 1, Medium: 2, Low: 3, Unspecified: 4 };
        return severityRank[left.severity] - severityRank[right.severity] ||
          Date.parse(right.createdAt) - Date.parse(left.createdAt);
      });
  }, [selectedCampaign, findingFilter, findingQuery]);

  useEffect(() => {
    const normalizedEmail = getText(email, 240).toLowerCase();
    setLoading(true);
    setLoadError("");
    setNotice("");
    setSelectedId("");
    if (!normalizedEmail) {
      setCampaigns([]);
      setLoadedEmail("");
      setLoadError("A signed-in tester account is required to load local bug-bash campaigns.");
      setLoading(false);
      return;
    }

    try {
      const saved = window.localStorage.getItem(getStorageKey(normalizedEmail));
      const parsed = saved ? JSON.parse(saved) : [];
      const loaded = normalizeCampaigns(parsed);
      setCampaigns(loaded);
      setSelectedId(loaded[0]?.id || "");
      setLoadedEmail(normalizedEmail);
    } catch (error) {
      setCampaigns([]);
      setLoadedEmail(normalizedEmail);
      setLoadError(
        error instanceof SyntaxError
          ? "Saved campaign data could not be read because its format is invalid. The data was left untouched."
          : `Campaign data could not be loaded: ${error.message}`,
      );
    } finally {
      setLoading(false);
    }
  }, [email]);

  const persistCampaigns = (nextCampaigns) => {
    if (loadError) {
      setNotice("Cannot overwrite campaign storage after a load error. Resolve the storage issue first.");
      return false;
    }
    if (!loadedEmail || loadedEmail !== requestedEmail) {
      setNotice("Wait for local campaign data to finish loading before making changes.");
      return false;
    }
    if (nextCampaigns.length > MAX_CAMPAIGNS) {
      setNotice(`Keep at most ${MAX_CAMPAIGNS} campaigns in this browser.`);
      return false;
    }
    try {
      window.localStorage.setItem(
        getStorageKey(loadedEmail),
        JSON.stringify(nextCampaigns.map(normalizeCampaign)),
      );
      setCampaigns(nextCampaigns);
      setNotice("Saved locally in this browser.");
      return true;
    } catch (error) {
      setNotice(`Could not save campaign changes: ${error.message}`);
      return false;
    }
  };

  const updateCampaign = (campaignId, updater, successMessage = "") => {
    const current = campaigns.find((campaign) => campaign.id === campaignId);
    if (!current) {
      setNotice("This campaign is no longer available.");
      return false;
    }
    const next = normalizeCampaign({
      ...updater(current),
      updatedAt: new Date().toISOString(),
    });
    const saved = persistCampaigns(campaigns.map((campaign) =>
      campaign.id === campaignId ? next : campaign,
    ));
    if (saved && successMessage) setNotice(successMessage);
    return saved;
  };

  const createNewCampaign = () => {
    const name = getText(newCampaignName, 180);
    if (!name) {
      setNotice("Enter a name for the bug-bash campaign.");
      return;
    }
    if (campaigns.length >= MAX_CAMPAIGNS) {
      setNotice(`You have reached the ${MAX_CAMPAIGNS}-campaign browser limit.`);
      return;
    }
    const campaign = createCampaign(name, parseLocalDate(newCampaignDate));
    if (persistCampaigns([campaign, ...campaigns])) {
      setSelectedId(campaign.id);
      setNewCampaignName("");
      setNewCampaignDate("");
      setShowCreate(false);
    }
  };

  const duplicateCampaign = (campaign) => {
    if (campaigns.length >= MAX_CAMPAIGNS) {
      setNotice(`You have reached the ${MAX_CAMPAIGNS}-campaign browser limit.`);
      return;
    }
    const now = new Date().toISOString();
    const duplicate = normalizeCampaign({
      ...campaign,
      id: makeId(),
      name: `${campaign.name} (copy)`.slice(0, 180),
      status: "draft",
      createdAt: now,
      updatedAt: now,
      completedAt: "",
      participants: campaign.participants.map((person) => ({
        ...person,
        id: makeId(),
        checkedIn: false,
        notes: "",
      })),
      rounds: campaign.rounds.map((round) => ({
        ...round,
        id: makeId(),
        status: "planned",
        participantIds: [],
        notes: "",
      })),
      findings: [],
      activity: [{ id: makeId(), message: `Copied from "${campaign.name}"`, createdAt: now }],
    });
    if (persistCampaigns([duplicate, ...campaigns])) setSelectedId(duplicate.id);
  };

  const deleteCampaign = (campaign) => {
    if (!window.confirm(`Delete "${campaign.name}" and all local planning and findings? This cannot be undone.`)) return;
    const next = campaigns.filter((item) => item.id !== campaign.id);
    if (persistCampaigns(next)) {
      if (campaign.id === selectedId) setSelectedId(next[0]?.id || "");
      setNotice("Campaign and its local notes were deleted.");
    }
  };

  const updateCampaignField = (field, value) => {
    if (!selectedCampaign) return;
    const limits = { name: 180, objective: 1200, build: 100, environment: 160, baseUrl: 1000 };
    const nextValue = getText(value, limits[field] || 300);
    if (field === "name" && !nextValue) {
      setNotice("Campaign name cannot be empty.");
      return;
    }
    if (field === "baseUrl" && !validHttpUrl(nextValue)) {
      setNotice("Campaign URL must be empty or a valid http:// or https:// URL.");
      return;
    }
    updateCampaign(selectedCampaign.id, (campaign) => ({
      ...campaign,
      [field]: nextValue,
    }));
  };

  const updateCampaignState = (status) => {
    if (!selectedCampaign || !Object.hasOwn(CAMPAIGN_STATES, status)) return;
    const now = new Date().toISOString();
    updateCampaign(selectedCampaign.id, (campaign) => ({
      ...campaign,
      status,
      completedAt: status === "completed" ? now : "",
      activity: appendActivity(campaign, `Campaign marked ${CAMPAIGN_STATES[status].label.toLowerCase()}`),
    }), `Campaign marked ${CAMPAIGN_STATES[status].label.toLowerCase()}.`);
  };

  const toggleArea = (area) => {
    if (!selectedCampaign) return;
    const areas = selectedCampaign.areas.includes(area)
      ? selectedCampaign.areas.filter((item) => item !== area)
      : [...selectedCampaign.areas, area];
    updateCampaign(selectedCampaign.id, (campaign) => ({
      ...campaign,
      areas,
      activity: appendActivity(campaign, `${selectedCampaign.areas.includes(area) ? "Removed" : "Added"} focus area: ${area}`),
    }), "Focus areas updated.");
  };

  const toggleReport = (id) => {
    if (!selectedCampaign) return;
    const reportIds = selectedCampaign.reportIds.includes(id)
      ? selectedCampaign.reportIds.filter((item) => item !== id)
      : [...selectedCampaign.reportIds, id].slice(0, 250);
    updateCampaign(selectedCampaign.id, (campaign) => ({
      ...campaign,
      reportIds,
      activity: appendActivity(campaign, `${selectedCampaign.reportIds.includes(id) ? "Removed report from" : "Added report to"} campaign scope`),
    }), "Campaign report scope updated.");
  };

  const addParticipant = () => {
    if (!selectedCampaign) return;
    const name = getText(participantName, 120);
    if (!name) {
      setNotice("Enter a tester name.");
      return;
    }
    if (selectedCampaign.participants.length >= MAX_PARTICIPANTS) {
      setNotice(`A campaign can have at most ${MAX_PARTICIPANTS} local roster entries.`);
      return;
    }
    const person = normalizeParticipant({
      id: makeId(),
      name,
      role: participantRole,
      focus: participantFocus,
      environment: participantEnvironment,
    });
    const saved = updateCampaign(selectedCampaign.id, (campaign) => ({
      ...campaign,
      participants: [...campaign.participants, person],
      activity: appendActivity(campaign, `Added tester: ${person.name}`),
    }), "Tester added to the local roster.");
    if (saved) {
      setParticipantName("");
      setParticipantRole("");
      setParticipantFocus("");
      setParticipantEnvironment("");
      setShowParticipantForm(false);
    }
  };

  const updateParticipant = (participantId, field, value) => {
    if (!selectedCampaign) return;
    updateCampaign(selectedCampaign.id, (campaign) => ({
      ...campaign,
      participants: campaign.participants.map((person) =>
        person.id === participantId ? { ...person, [field]: value } : person,
      ),
      activity: field === "checkedIn"
        ? appendActivity(
          campaign,
          `${campaign.participants.find((person) => person.id === participantId)?.name || "Tester"} ${value ? "checked in" : "checked out"}`,
        )
        : campaign.activity,
    }));
  };

  const removeParticipant = (participantId) => {
    if (!selectedCampaign) return;
    const person = selectedCampaign.participants.find((item) => item.id === participantId);
    if (!person) return;
    updateCampaign(selectedCampaign.id, (campaign) => ({
      ...campaign,
      participants: campaign.participants.filter((item) => item.id !== participantId),
      rounds: campaign.rounds.map((round) => ({
        ...round,
        participantIds: round.participantIds.filter((id) => id !== participantId),
      })),
      findings: campaign.findings.map((finding) =>
        finding.participantId === participantId ? { ...finding, participantId: "" } : finding,
      ),
      activity: appendActivity(campaign, `Removed tester: ${person.name}`),
    }), "Tester removed. Existing findings are retained without a reporter link.");
  };

  const addRound = (preset = null) => {
    if (!selectedCampaign) return;
    if (selectedCampaign.rounds.length >= MAX_ROUNDS) {
      setNotice(`A campaign can have at most ${MAX_ROUNDS} rounds.`);
      return;
    }
    const name = getText(preset?.name || roundName, 140);
    if (!name) {
      setNotice("Enter a name for the testing round.");
      return;
    }
    const round = normalizeRound({
      id: makeId(),
      name,
      focus: getText(preset?.focus || roundFocus, 500),
      duration: preset?.duration || roundDuration,
      status: "planned",
      participantIds: [],
      notes: "",
    });
    const saved = updateCampaign(selectedCampaign.id, (campaign) => ({
      ...campaign,
      rounds: [...campaign.rounds, round],
      activity: appendActivity(campaign, `Added round: ${round.name}`),
    }), "Testing round added.");
    if (saved) {
      setRoundName("");
      setRoundFocus("");
      setRoundDuration("15");
      setShowRoundForm(false);
    }
  };

  const updateRound = (roundId, field, value) => {
    if (!selectedCampaign) return;
    const limits = { name: 140, focus: 500, notes: 1000 };
    let nextValue = value;
    if (field === "participantIds") {
      const knownIds = new Set(selectedCampaign.participants.map((person) => person.id));
      nextValue = Array.isArray(value)
        ? [...new Set(value.filter((id) => typeof id === "string" && knownIds.has(id)))].slice(0, MAX_PARTICIPANTS)
        : [];
    } else if (field === "duration") {
      const duration = Number(value);
      if (!Number.isFinite(duration)) return;
      nextValue = Math.min(360, Math.max(5, Math.round(duration)));
    } else if (field === "startsAt") {
      nextValue = parseLocalDate(value);
    } else if (field !== "status") {
      nextValue = getText(value, limits[field] || 300);
    }
    updateCampaign(selectedCampaign.id, (campaign) => ({
      ...campaign,
      rounds: campaign.rounds.map((round) =>
        round.id === roundId ? { ...round, [field]: nextValue } : round,
      ),
    }));
  };

  const removeRound = (roundId) => {
    if (!selectedCampaign) return;
    const round = selectedCampaign.rounds.find((item) => item.id === roundId);
    if (!round || !window.confirm(`Remove "${round.name}"? Findings assigned to it will be kept without the round link.`)) return;
    updateCampaign(selectedCampaign.id, (campaign) => ({
      ...campaign,
      rounds: campaign.rounds.filter((item) => item.id !== roundId),
      findings: campaign.findings.map((finding) =>
        finding.roundId === roundId ? { ...finding, roundId: "" } : finding,
      ),
      activity: appendActivity(campaign, `Removed round: ${round.name}`),
    }), "Round removed. Linked findings are preserved.");
  };

  const addFinding = () => {
    if (!selectedCampaign) return;
    const title = getText(findingTitle, 180);
    if (!title) {
      setNotice("Enter a short summary for the finding.");
      return;
    }
    if (selectedCampaign.findings.length >= MAX_FINDINGS) {
      setNotice(`A campaign can have at most ${MAX_FINDINGS} findings.`);
      return;
    }
    if (!validHttpUrl(getText(findingEvidence, 1000))) {
      setNotice("Evidence must be empty or a valid http:// or https:// URL.");
      return;
    }
    const finding = normalizeFinding({
      id: makeId(),
      title,
      description: findingDescription,
      area: findingArea,
      severity: findingSeverity,
      status: "new",
      participantId: findingParticipant,
      roundId: findingRound,
      reportId: findingReport,
      evidenceUrl: findingEvidence,
      createdAt: new Date().toISOString(),
    });
    const saved = updateCampaign(selectedCampaign.id, (campaign) => ({
      ...campaign,
      findings: [finding, ...campaign.findings],
      activity: appendActivity(campaign, `Captured finding: ${finding.title}`),
    }), "Finding recorded in this browser.");
    if (saved) {
      setFindingTitle("");
      setFindingDescription("");
      setFindingArea("");
      setFindingSeverity("Medium");
      setFindingParticipant("");
      setFindingRound("");
      setFindingReport("");
      setFindingEvidence("");
      setShowFindingForm(false);
    }
  };

  const updateFinding = (findingId, field, value) => {
    if (!selectedCampaign) return;
    if (field === "evidenceUrl" && !validHttpUrl(getText(value, 1000))) {
      setNotice("Evidence must be empty or use http:// or https://.");
      return;
    }
    updateCampaign(selectedCampaign.id, (campaign) => ({
      ...campaign,
      findings: campaign.findings.map((finding) =>
        finding.id === findingId
          ? { ...finding, [field]: value, updatedAt: new Date().toISOString() }
          : finding,
      ),
      activity: field === "status"
        ? appendActivity(campaign, `Updated finding status to ${FINDING_STATES.find((state) => state.id === value)?.label || value}`)
        : campaign.activity,
    }), field === "status" ? "Finding status updated." : "");
  };

  const removeFinding = (findingId) => {
    if (!selectedCampaign) return;
    const finding = selectedCampaign.findings.find((item) => item.id === findingId);
    if (!finding || !window.confirm(`Remove finding "${finding.title}" from this local campaign?`)) return;
    updateCampaign(selectedCampaign.id, (campaign) => ({
      ...campaign,
      findings: campaign.findings.filter((item) => item.id !== findingId),
      activity: appendActivity(campaign, `Removed finding: ${finding.title}`),
    }), "Finding removed.");
  };

  const toggleCampaignReport = (event) => toggleReport(event.target.value);

  const exportCampaignJson = () => {
    if (!selectedCampaign) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      scope: "Browser-local bug-bash planning; this export does not modify server reports.",
      campaign: selectedCampaign,
    };
    const filename = selectedCampaign.name.replace(/[^a-z0-9-_]+/gi, "-").slice(0, 60) || "bug-bash";
    downloadFile(`${filename}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
    setNotice("Campaign exported as JSON.");
  };

  const exportFindingsCsv = () => {
    if (!selectedCampaign) return;
    const rows = [
      ["Campaign", "Build", "Environment", "Finding", "Severity", "State", "Area", "Reporter", "Round", "Related report ID", "Evidence URL", "Description", "Created"],
      ...selectedCampaign.findings.map((finding) => [
        selectedCampaign.name,
        selectedCampaign.build,
        selectedCampaign.environment,
        finding.title,
        finding.severity,
        FINDING_STATES.find((state) => state.id === finding.status)?.label || finding.status,
        finding.area,
        selectedCampaign.participants.find((person) => person.id === finding.participantId)?.name || "",
        selectedCampaign.rounds.find((round) => round.id === finding.roundId)?.name || "",
        finding.reportId,
        finding.evidenceUrl,
        finding.description,
        finding.createdAt,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
    const filename = selectedCampaign.name.replace(/[^a-z0-9-_]+/gi, "-").slice(0, 60) || "bug-bash";
    downloadFile(`${filename}-findings.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
    setNotice("Campaign findings exported as CSV.");
  };

  const getCampaignChecklist = () => {
    if (!selectedCampaign) return [];
    return [
      { label: "Campaign has a name", ready: Boolean(selectedCampaign.name) },
      { label: "Build or version is recorded", ready: Boolean(selectedCampaign.build) },
      { label: "At least one focus area is selected", ready: selectedCampaign.areas.length > 0 },
      { label: "At least one tester is listed", ready: selectedCampaign.participants.length > 0 },
      { label: "At least one testing round is planned", ready: selectedCampaign.rounds.length > 0 },
      { label: "Campaign start time is scheduled", ready: Boolean(selectedCampaign.startsAt) },
      { label: "Test target uses a valid web URL or is intentionally blank", ready: validHttpUrl(selectedCampaign.baseUrl) },
    ];
  };

  const checklist = selectedCampaign ? getCampaignChecklist() : [];
  const planningScore = checklist.length
    ? Math.round((checklist.filter((item) => item.ready).length / checklist.length) * 100)
    : 0;
  const canEditPlan = selectedCampaign?.status !== "completed";
  const visibleReportOptions = useMemo(() => {
    return reports
      .filter((report) => reportId(report))
      .map((report) => ({
        id: reportId(report),
        title: reportTitle(report),
        status: report?.status === "Closed" ? "Closed" : "Open",
        severity: getText(report?.severity, 80) || "Unspecified",
      }))
      .sort((left, right) => left.title.localeCompare(right.title));
  }, [reports]);
  const reportScopeOptions = useMemo(() => {
    const query = getText(reportQuery, 120).toLowerCase();
    return visibleReportOptions
      .filter((report) => !query || [report.title, report.status, report.severity]
        .some((value) => value.toLowerCase().includes(query)))
      .slice(0, 200);
  }, [visibleReportOptions, reportQuery]);
  const selectedReportOptions = useMemo(() => {
    if (!selectedCampaign) return [];
    const selectedIds = new Set(selectedCampaign.reportIds);
    return visibleReportOptions.filter((report) => selectedIds.has(report.id));
  }, [visibleReportOptions, selectedCampaign]);

  if (loading || (requestedEmail && loadedEmail !== requestedEmail)) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-busy="true">
        <div className="h-5 w-56 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-20 animate-pulse rounded-2xl bg-slate-50" />
        <p className="mt-3 text-xs text-slate-500">Loading browser-local bug-bash campaigns…</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
      <header className="border-b border-slate-200 bg-gradient-to-br from-violet-50 via-white to-sky-50/70 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-violet-700">
              <FlaskConical className="h-5 w-5" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em]">Bug-bash campaign planner</p>
            </div>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">Coordinate focused testing rounds</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Organize a tester roster, focus areas, time-boxed rounds, and findings for an exploratory test event. Campaign data stays in this browser and does not change server reports.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate((value) => !value)}
            disabled={campaigns.length >= MAX_CAMPAIGNS || Boolean(loadError)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> New campaign
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><Layers3 className="h-3.5 w-3.5" aria-hidden="true" /> {campaigns.length}/{MAX_CAMPAIGNS} local campaigns</span>
          <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" aria-hidden="true" /> Roster and notes are private to this browser</span>
          <span className="inline-flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" /> Findings are not submitted as reports</span>
        </div>
      </header>

      <div className="space-y-4 p-4 sm:p-5">
        {loadError ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <p className="font-semibold">Campaign storage could not be loaded</p>
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

        {showCreate && !loadError ? (
          <div className="rounded-2xl border border-violet-200 bg-violet-50/30 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Create a campaign</h3>
                <p className="mt-1 text-xs text-slate-500">Add a name and optional date; fill out the plan from the campaign view.</p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} aria-label="Close create campaign form" className="rounded-lg p-1.5 text-slate-500 hover:bg-white">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-600">
                Campaign name *
                <input value={newCampaignName} onChange={(event) => setNewCampaignName(event.target.value)} maxLength={180} placeholder="e.g. Mobile checkout bug bash" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
              </label>
              <label className="text-xs font-medium text-slate-600">
                Planned start
                <input type="datetime-local" value={newCampaignDate} onChange={(event) => setNewCampaignDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={createNewCampaign} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800">
                <Plus className="h-4 w-4" aria-hidden="true" /> Create campaign
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input value={campaignQuery} onChange={(event) => setCampaignQuery(event.target.value)} placeholder="Find campaigns…" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
              </label>
              <div className="mt-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Campaigns</h3>
                <span className="text-xs text-slate-400">{visibleCampaigns.length} shown</span>
              </div>
              <div className="mt-2 max-h-[34rem] space-y-2 overflow-y-auto pr-1">
                {visibleCampaigns.length ? visibleCampaigns.map((campaign) => (
                  <CampaignListItem
                    key={campaign.id}
                    campaign={campaign}
                    selected={campaign.id === selectedId}
                    onSelect={() => setSelectedId(campaign.id)}
                    onDuplicate={() => duplicateCampaign(campaign)}
                    onDelete={() => deleteCampaign(campaign)}
                  />
                )) : (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-500">
                    {campaigns.length ? "No campaigns match your search." : "Create a campaign to start planning."}
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Planning guide</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">Use the checklist to track logistics. It is not a quality score or release gate.</p>
              {selectedCampaign ? (
                <>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">Planning details</span>
                    <span className="font-semibold text-violet-700">{planningScore}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${planningScore}%` }} />
                  </div>
                  <ul className="mt-3 space-y-2">
                    {checklist.map((item) => (
                      <li key={item.label} className="flex items-start gap-2 text-xs">
                        {item.ready ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" /> : <CircleDashed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />}
                        <span className={item.ready ? "text-slate-600" : "text-slate-500"}>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-3 text-xs text-slate-500">Select a campaign to see its planning checklist.</p>
              )}
            </div>
          </aside>

          <main className="min-w-0 space-y-4">
            {!selectedCampaign ? (
              <EmptyPanel
                title="No campaign selected"
                description="Create an event plan, add testers and focus areas, then use rounds to guide a time-boxed exploratory session."
                action={<button type="button" onClick={() => setShowCreate(true)} className="mt-4 rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-800">Create campaign</button>}
              />
            ) : (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StateBadge status={selectedCampaign.status} />
                        <span className="text-xs text-slate-400">Updated {formatDate(selectedCampaign.updatedAt)}</span>
                      </div>
                      <input
                        key={`${selectedCampaign.id}-name`}
                        defaultValue={selectedCampaign.name}
                        onBlur={(event) => updateCampaignField("name", event.target.value)}
                        onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                        maxLength={180}
                        disabled={!canEditPlan}
                        aria-label="Campaign name"
                        className="mt-3 w-full rounded-lg border border-transparent bg-transparent px-1 py-1 text-xl font-bold tracking-tight text-slate-950 outline-none hover:border-slate-200 focus:border-violet-400 disabled:opacity-70 sm:text-2xl"
                      />
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                          ["build", "Build or version", selectedCampaign.build, "e.g. 3.2.0"],
                          ["environment", "Environment", selectedCampaign.environment, "e.g. Staging · Chrome"],
                          ["baseUrl", "Target URL", selectedCampaign.baseUrl, "https://..."],
                        ].map(([field, label, value, placeholder]) => (
                          <label key={field} className="text-[11px] font-medium text-slate-500">
                            {label}
                            <input
                              key={`${selectedCampaign.id}-${field}`}
                              type={field === "baseUrl" ? "url" : "text"}
                              defaultValue={value}
                              onBlur={(event) => updateCampaignField(field, event.target.value)}
                              onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                              maxLength={field === "baseUrl" ? 1000 : 160}
                              disabled={!canEditPlan}
                              placeholder={placeholder}
                              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50"
                            />
                          </label>
                        ))}
                        <label className="text-[11px] font-medium text-slate-500">
                          Planned start
                          <input
                            type="datetime-local"
                            value={selectedCampaign.startsAt ? new Date(selectedCampaign.startsAt).toISOString().slice(0, 16) : ""}
                            onChange={(event) => updateCampaignField("startsAt", parseLocalDate(event.target.value))}
                            disabled={!canEditPlan}
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-700 disabled:bg-slate-50"
                          />
                        </label>
                      </div>
                      <label className="mt-3 block text-[11px] font-medium text-slate-500">
                        Objective and scope
                        <textarea
                          key={`${selectedCampaign.id}-objective`}
                          defaultValue={selectedCampaign.objective}
                          onBlur={(event) => updateCampaignField("objective", event.target.value)}
                          disabled={!canEditPlan}
                          rows={2}
                          maxLength={1200}
                          placeholder="What should this bug bash learn or validate?"
                          className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50"
                        />
                      </label>
                      {selectedCampaign.baseUrl && validHttpUrl(selectedCampaign.baseUrl) ? (
                        <a href={selectedCampaign.baseUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-sky-700 hover:bg-sky-50">
                          Open target <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 xl:max-w-64 xl:justify-end">
                      {selectedCampaign.status === "draft" ? (
                        <button type="button" onClick={() => updateCampaignState("planned")} className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100">
                          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Mark planned
                        </button>
                      ) : null}
                      {["draft", "planned", "paused"].includes(selectedCampaign.status) ? (
                        <button type="button" onClick={() => updateCampaignState("active")} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800">
                          <Play className="h-3.5 w-3.5" aria-hidden="true" /> Start campaign
                        </button>
                      ) : null}
                      {selectedCampaign.status === "active" ? (
                        <button type="button" onClick={() => updateCampaignState("paused")} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100">
                          <Pause className="h-3.5 w-3.5" aria-hidden="true" /> Pause
                        </button>
                      ) : null}
                      {selectedCampaign.status !== "completed" ? (
                        <button type="button" onClick={() => updateCampaignState("completed")} className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800 hover:bg-violet-100">
                          <Check className="h-3.5 w-3.5" aria-hidden="true" /> Complete
                        </button>
                      ) : (
                        <button type="button" onClick={() => updateCampaignState("active")} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          Reopen
                        </button>
                      )}
                      <button type="button" onClick={exportCampaignJson} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" /> Export JSON
                      </button>
                      <button type="button" onClick={exportFindingsCsv} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        <Download className="h-3.5 w-3.5" aria-hidden="true" /> Findings CSV
                      </button>
                    </div>
                  </div>
                </section>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <Metric label="Findings" value={metrics.totalFindings} detail={`${metrics.confirmed} confirmed · ${metrics.needsTriage} need triage`} tone="sky" />
                  <Metric label="High severity" value={metrics.Critical + metrics.High} detail={`${metrics.Critical} critical · ${metrics.High} high`} tone={metrics.Critical + metrics.High ? "rose" : "slate"} />
                  <Metric label="Tester check-in" value={`${metrics.checkedIn}/${metrics.participants}`} detail={`${metrics.findingsPerParticipant} findings per tester`} tone="green" />
                  <Metric label="Rounds" value={`${metrics.completedRounds}/${metrics.rounds}`} detail={`${metrics.activeRounds} currently active`} />
                  <Metric label="Planned time" value={`${Math.floor(metrics.totalMinutes / 60)}h ${metrics.totalMinutes % 60}m`} detail={`${metrics.unavailableReports} scoped reports unavailable`} tone={metrics.unavailableReports ? "amber" : "slate"} />
                </div>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-violet-700" aria-hidden="true" />
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Focus areas</h3>
                        <p className="mt-0.5 text-xs text-slate-500">Choose what testers should explore.</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">{selectedCampaign.areas.length} selected</span>
                  </div>
                  <div className="flex flex-wrap gap-2 p-4">
                    {AREA_PRESETS.map((area) => {
                      const selected = selectedCampaign.areas.includes(area);
                      return (
                        <button
                          type="button"
                          key={area}
                          onClick={() => toggleArea(area)}
                          disabled={!canEditPlan}
                          aria-pressed={selected}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${selected ? "border-violet-300 bg-violet-50 text-violet-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                        >
                          {area}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-sky-700" aria-hidden="true" />
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Tester roster</h3>
                          <p className="mt-0.5 text-xs text-slate-500">{metrics.checkedIn} checked in · {metrics.participants} listed</p>
                        </div>
                      </div>
                      {canEditPlan ? (
                        <button type="button" onClick={() => setShowParticipantForm((value) => !value)} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-2 text-xs font-semibold text-white hover:bg-slate-700">
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add tester
                        </button>
                      ) : null}
                    </div>
                    {showParticipantForm && canEditPlan ? (
                      <div className="space-y-3 border-b border-slate-200 bg-sky-50/30 p-4">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="text-xs font-medium text-slate-600">Name *
                            <input value={participantName} onChange={(event) => setParticipantName(event.target.value)} maxLength={120} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal" placeholder="Tester name" />
                          </label>
                          <label className="text-xs font-medium text-slate-600">Role
                            <input value={participantRole} onChange={(event) => setParticipantRole(event.target.value)} maxLength={100} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal" placeholder="QA, developer, product…" />
                          </label>
                          <label className="text-xs font-medium text-slate-600">Focus
                            <input value={participantFocus} onChange={(event) => setParticipantFocus(event.target.value)} maxLength={180} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal" placeholder="Feature or area" />
                          </label>
                          <label className="text-xs font-medium text-slate-600">Environment
                            <input value={participantEnvironment} onChange={(event) => setParticipantEnvironment(event.target.value)} maxLength={180} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal" placeholder="Browser / device" />
                          </label>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setShowParticipantForm(false)} className="rounded-lg px-3 py-2 text-xs text-slate-600 hover:bg-white">Cancel</button>
                          <button type="button" onClick={addParticipant} className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800">Add tester</button>
                        </div>
                      </div>
                    ) : null}
                    <div className="space-y-2 p-3">
                      {selectedCampaign.participants.length ? selectedCampaign.participants.map((person) => (
                        <ParticipantCard
                          key={person.id}
                          participant={person}
                          canEdit={canEditPlan}
                          onChange={updateParticipant}
                          onRemove={removeParticipant}
                        />
                      )) : (
                        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">Add names to organize the tester roster. Entries remain in this browser.</p>
                      )}
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-violet-700" aria-hidden="true" />
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Testing rounds</h3>
                          <p className="mt-0.5 text-xs text-slate-500">{metrics.completedRounds} of {metrics.rounds} complete · {metrics.totalMinutes} planned minutes</p>
                        </div>
                      </div>
                      {canEditPlan ? (
                        <button type="button" onClick={() => setShowRoundForm((value) => !value)} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-2 text-xs font-semibold text-white hover:bg-slate-700">
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add round
                        </button>
                      ) : null}
                    </div>
                    {showRoundForm && canEditPlan ? (
                      <div className="space-y-3 border-b border-slate-200 bg-violet-50/30 p-4">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <label className="text-xs font-medium text-slate-600">Round name *
                            <input value={roundName} onChange={(event) => setRoundName(event.target.value)} maxLength={140} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal" placeholder="Exploration round" />
                          </label>
                          <label className="text-xs font-medium text-slate-600">Duration (minutes)
                            <input type="number" min="5" max="360" value={roundDuration} onChange={(event) => setRoundDuration(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal" />
                          </label>
                          <label className="text-xs font-medium text-slate-600">Focus
                            <input value={roundFocus} onChange={(event) => setRoundFocus(event.target.value)} maxLength={500} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal" placeholder="What should testers explore?" />
                          </label>
                        </div>
                        <div className="flex flex-wrap justify-between gap-2">
                          <div className="flex flex-wrap gap-1.5">
                            {ROUND_PRESETS.map((preset) => (
                              <button type="button" key={preset.name} onClick={() => addRound(preset)} className="rounded-full border border-violet-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-violet-700 hover:bg-violet-50">
                                + {preset.name}
                              </button>
                            ))}
                          </div>
                          <button type="button" onClick={() => addRound()} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-800">Add custom round</button>
                        </div>
                      </div>
                    ) : null}
                    <div className="space-y-2 p-3">
                      {selectedCampaign.rounds.length ? selectedCampaign.rounds.map((round, index) => (
                        <RoundCard
                          key={round.id}
                          round={round}
                          index={index}
                          participantNames={round.participantIds.map((id) => selectedCampaign.participants.find((person) => person.id === id)?.name).filter(Boolean)}
                          canEdit={canEditPlan}
                          onUpdate={updateRound}
                          onRemove={removeRound}
                        />
                      )) : (
                        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-500">Add time-boxed rounds to give the event a clear rhythm.</p>
                      )}
                    </div>
                  </section>
                </div>

                {selectedCampaign.rounds.length && canEditPlan ? (
                  <section className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-sky-700" aria-hidden="true" />
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Round assignments</h3>
                        <p className="mt-0.5 text-xs text-slate-500">Select roster entries for each round; assignments are local planning notes.</p>
                      </div>
                    </div>
                    {selectedCampaign.participants.length ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {selectedCampaign.rounds.map((round) => (
                          <fieldset key={`${round.id}-assignments`} className="rounded-xl border border-slate-200 p-3">
                            <legend className="px-1 text-xs font-semibold text-slate-700">{round.name}</legend>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {selectedCampaign.participants.map((person) => {
                                const assigned = round.participantIds.includes(person.id);
                                return (
                                  <label key={person.id} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs ${assigned ? "border-sky-300 bg-sky-50 text-sky-800" : "border-slate-200 bg-white text-slate-600"}`}>
                                    <input
                                      type="checkbox"
                                      checked={assigned}
                                      onChange={() => updateRound(round.id, "participantIds", assigned ? round.participantIds.filter((id) => id !== person.id) : [...round.participantIds, person.id])}
                                      className="sr-only"
                                    />
                                    {person.name}
                                  </label>
                                );
                              })}
                            </div>
                          </fieldset>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Add testers to the roster before assigning rounds.</p>
                    )}
                  </section>
                ) : null}

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2">
                      <Bug className="h-4 w-4 text-rose-600" aria-hidden="true" />
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Report scope</h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {metrics.includedReports} of {selectedCampaign.reportIds.length} selected reports currently loaded
                        </p>
                      </div>
                    </div>
                    {selectedCampaign.reportIds.length ? (
                      <button type="button" onClick={() => updateCampaign(selectedCampaign.id, (campaign) => ({ ...campaign, reportIds: [], activity: appendActivity(campaign, "Cleared report scope") }), "Report scope cleared.")} disabled={!canEditPlan} className="rounded-lg px-2.5 py-2 text-xs text-slate-500 hover:bg-white disabled:opacity-50">Clear scope</button>
                    ) : null}
                  </div>
                  <div className="max-h-72 overflow-y-auto p-3">
                    {visibleReportOptions.length ? (
                      <>
                      <label className="relative mb-3 block">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input value={reportQuery} onChange={(event) => setReportQuery(event.target.value)} placeholder="Search reports by title, severity, or status" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
                      </label>
                      <div className="grid gap-2 md:grid-cols-2">
                        {reportScopeOptions.map((report) => {
                          const checked = selectedCampaign.reportIds.includes(report.id);
                          return (
                            <label key={report.id} className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 transition ${checked ? "border-sky-300 bg-sky-50/60" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={toggleCampaignReport}
                                value={report.id}
                                disabled={!canEditPlan}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-500"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-semibold text-slate-800">{report.title}</span>
                                <span className="mt-1 block text-[11px] text-slate-500">{report.severity} · {report.status}</span>
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] ${report.status === "Open" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{report.status}</span>
                            </label>
                          );
                        })}
                      </div>
                      {reportScopeOptions.length < visibleReportOptions.length ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Showing {reportScopeOptions.length} matching reports. Refine the search to find other reports.
                        </p>
                      ) : null}
                      </>
                    ) : (
                      <p className="py-6 text-center text-xs text-slate-500">No reports are currently available to scope.</p>
                    )}
                    {metrics.unavailableReports ? (
                      <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        {metrics.unavailableReports} saved report reference(s) are not in the currently loaded report list. They are retained until you clear scope or reopen the report data.
                      </p>
                    ) : null}
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquareText className="h-4 w-4 text-amber-700" aria-hidden="true" />
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Findings board</h3>
                        <p className="mt-0.5 text-xs text-slate-500">{visibleFindings.length} shown · {metrics.totalFindings} total · sorted by severity</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input value={findingQuery} onChange={(event) => setFindingQuery(event.target.value)} placeholder="Search findings" className="w-40 rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-xs outline-none focus:border-sky-400" />
                      </label>
                      <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600">
                        <ListFilter className="h-3.5 w-3.5" aria-hidden="true" />
                        <select value={findingFilter} onChange={(event) => setFindingFilter(event.target.value)} aria-label="Filter findings" className="bg-transparent outline-none">
                          {FINDING_FILTERS.map((filter) => <option key={filter.id} value={filter.id}>{filter.label}</option>)}
                        </select>
                      </label>
                      <button type="button" onClick={() => setShowFindingForm((value) => !value)} disabled={!canEditPlan} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-50">
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Record finding
                      </button>
                    </div>
                  </div>
                  {showFindingForm && canEditPlan ? (
                    <div className="border-b border-slate-200 bg-rose-50/30 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-800">Record a finding</h4>
                        <button type="button" onClick={() => setShowFindingForm(false)} aria-label="Close finding form" className="rounded-lg p-1 text-slate-500 hover:bg-white"><X className="h-4 w-4" aria-hidden="true" /></button>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="text-xs font-medium text-slate-600 sm:col-span-2">Summary *
                          <input value={findingTitle} onChange={(event) => setFindingTitle(event.target.value)} maxLength={180} placeholder="Describe the unexpected behavior" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" />
                        </label>
                        <label className="text-xs font-medium text-slate-600">Area
                          <select value={findingArea} onChange={(event) => setFindingArea(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal">
                            <option value="">Choose area</option>
                            {[...new Set([...selectedCampaign.areas, ...AREA_PRESETS])].map((area) => <option key={area}>{area}</option>)}
                          </select>
                        </label>
                        <label className="text-xs font-medium text-slate-600">Severity
                          <select value={findingSeverity} onChange={(event) => setFindingSeverity(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal">
                            <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
                          </select>
                        </label>
                        <label className="text-xs font-medium text-slate-600">Tester
                          <select value={findingParticipant} onChange={(event) => setFindingParticipant(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal">
                            <option value="">Not assigned</option>
                            {selectedCampaign.participants.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                          </select>
                        </label>
                        <label className="text-xs font-medium text-slate-600">Round
                          <select value={findingRound} onChange={(event) => setFindingRound(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal">
                            <option value="">Not assigned</option>
                            {selectedCampaign.rounds.map((round) => <option key={round.id} value={round.id}>{round.name}</option>)}
                          </select>
                        </label>
                        <label className="text-xs font-medium text-slate-600">Related report
                          <select value={findingReport} onChange={(event) => setFindingReport(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-normal">
                            <option value="">No linked report</option>
                            {selectedReportOptions.map((report) => <option key={report.id} value={report.id}>{report.title}</option>)}
                          </select>
                        </label>
                        <label className="text-xs font-medium text-slate-600 sm:col-span-2">Evidence URL
                          <input type="url" value={findingEvidence} onChange={(event) => setFindingEvidence(event.target.value)} maxLength={1000} placeholder="https://..." className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" />
                        </label>
                        <label className="text-xs font-medium text-slate-600 sm:col-span-4">What happened?
                          <textarea value={findingDescription} onChange={(event) => setFindingDescription(event.target.value)} maxLength={TEXT_LIMIT} rows={3} placeholder="Include steps to reproduce, actual versus expected behavior, and relevant context." className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" />
                        </label>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button type="button" onClick={addFinding} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-800">
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Save finding locally
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-3 p-3 sm:p-4">
                    {visibleFindings.length ? visibleFindings.map((finding) => (
                      <FindingCard
                        key={finding.id}
                        finding={finding}
                        participants={selectedCampaign.participants}
                        rounds={selectedCampaign.rounds}
                        reports={reports}
                        canEdit={canEditPlan}
                        onChange={updateFinding}
                        onRemove={removeFinding}
                        onOpenReport={onOpenReport}
                      />
                    )) : (
                      <EmptyPanel
                        icon={Search}
                        title={selectedCampaign.findings.length ? "No findings match these filters" : "No findings recorded"}
                        description={selectedCampaign.findings.length ? "Change the search or status filter to see other results." : "Capture an exploratory test observation and route it to a loaded report if one already exists."}
                        action={!selectedCampaign.findings.length && canEditPlan ? <button type="button" onClick={() => setShowFindingForm(true)} className="mt-4 rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800">Record first finding</button> : null}
                      />
                    )}
                  </div>
                </section>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Campaign activity</h3>
                        <p className="mt-0.5 text-xs text-slate-500">Latest {selectedCampaign.activity.length} local events</p>
                      </div>
                      <Activity className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </div>
                    {selectedCampaign.activity.length ? (
                      <ol className="mt-4 space-y-3">
                        {[...selectedCampaign.activity].reverse().slice(0, 12).map((entry) => (
                          <li key={entry.id} className="flex gap-3">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-400 ring-4 ring-violet-50" />
                            <div>
                              <p className="text-xs font-medium text-slate-700">{entry.message}</p>
                              <p className="mt-0.5 text-[11px] text-slate-400">{formatDate(entry.createdAt)}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    ) : <p className="mt-4 text-xs text-slate-500">Changes will appear here.</p>}
                  </section>
                  <aside className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                    <div className="flex items-center gap-2 text-violet-800">
                      <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                      <h3 className="text-sm font-semibold">Local planning only</h3>
                    </div>
                    <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
                      <li>Roster names, assignments, and notes are stored in this browser under the signed-in tester account.</li>
                      <li>Campaign findings are planning records, not submitted bug reports or changes to report status.</li>
                      <li>Use an export to share the plan. No other tester can see this local roster automatically.</li>
                      <li>Do not add passwords, tokens, private customer information, or other secrets to notes or links.</li>
                    </ul>
                    <div className="mt-4 border-t border-violet-100 pt-3 text-xs text-slate-500">
                      Last saved {formatDate(selectedCampaign.updatedAt)}
                    </div>
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
