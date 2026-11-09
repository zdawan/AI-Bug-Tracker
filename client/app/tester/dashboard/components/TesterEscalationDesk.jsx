"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  BadgeAlert,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Filter,
  Flag,
  ListFilter,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";

const STORAGE_PREFIX = "tester-escalation-desk-v1";
const MAX_CASES = 100;
const MAX_NOTE_LENGTH = 1600;
const INITIAL_VISIBLE = 8;

const ESCALATION_STAGES = [
  { value: "monitor", label: "Monitor" },
  { value: "review", label: "Needs review" },
  { value: "escalated", label: "Escalated" },
  { value: "accepted", label: "Accepted" },
  { value: "closed", label: "Closed" },
];

const STAGE_FILTERS = [
  { value: "all", label: "All stages" },
  ...ESCALATION_STAGES,
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All priorities" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
];

const REPORT_STATUS_OPTIONS = [
  { value: "all", label: "All reports" },
  { value: "open", label: "Open reports" },
  { value: "closed", label: "Resolved reports" },
];

const SORT_OPTIONS = [
  { value: "priority", label: "Priority first" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "Title A–Z" },
  { value: "updated", label: "Recently updated" },
];

const PRIORITY_RANK = { urgent: 0, high: 1, normal: 2, low: 3 };

function clean(value, fallback = "", limit = 400) {
  if (typeof value !== "string") return fallback;
  const result = value.trim();
  return result ? result.slice(0, limit) : fallback;
}

function getId(report) {
  const value = report?._id ?? report?.id;
  return value === null || value === undefined ? "" : String(value).trim();
}

function getTitle(report) {
  return clean(report?.title || report?.summary, "Untitled report", 240);
}

function getCategory(report) {
  return clean(report?.category, "Uncategorized", 100);
}

function getSeverity(report) {
  return clean(report?.severity, "Unspecified", 40).toLowerCase();
}

function getStatus(report) {
  return clean(report?.status).toLowerCase() === "closed" ? "closed" : "open";
}

function getDate(report) {
  const value = report?.createdAt || report?.created_at || report?.reportedAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "Date unavailable";
  }
  return value.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return "Not recorded";
  }
  return value.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function severityRank(value) {
  return { critical: 0, high: 1, medium: 2, low: 3, unspecified: 4 }[value] ?? 5;
}

function createEntry(report, index) {
  const id = getId(report) || `${getTitle(report)}-${index}`;
  const now = new Date().toISOString();
  return {
    id: `case-${id}`,
    reportId: id,
    report,
    title: getTitle(report),
    category: getCategory(report),
    severity: getSeverity(report),
    status: getStatus(report),
    date: getDate(report),
    priority:
      severityRank(getSeverity(report)) <= 1 && getStatus(report) === "open"
        ? "high"
        : "normal",
    stage: "monitor",
    owner: "",
    targetTeam: "",
    rationale: "",
    nextAction: "",
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeEntry(value) {
  if (!value || typeof value !== "object") return null;
  return {
    ...value,
    id: clean(value.id, `case-${Date.now()}`, 180),
    reportId: clean(value.reportId, "", 180),
    title: clean(value.title, "Untitled report", 240),
    category: clean(value.category, "Uncategorized", 100),
    severity: clean(value.severity, "unspecified", 40).toLowerCase(),
    status: value.status === "closed" ? "closed" : "open",
    priority: PRIORITY_RANK[value.priority] !== undefined ? value.priority : "normal",
    stage: ESCALATION_STAGES.some((item) => item.value === value.stage)
      ? value.stage
      : "monitor",
    owner: clean(value.owner, "", 120),
    targetTeam: clean(value.targetTeam, "", 120),
    rationale: clean(value.rationale, "", MAX_NOTE_LENGTH),
    nextAction: clean(value.nextAction, "", MAX_NOTE_LENGTH),
    notes: clean(value.notes, "", MAX_NOTE_LENGTH),
    createdAt: clean(value.createdAt, new Date().toISOString(), 60),
    updatedAt: clean(value.updatedAt, new Date().toISOString(), 60),
  };
}

function loadEntries(email) {
  if (typeof window === "undefined" || !email) return [];
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${email}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map(normalizeEntry).filter(Boolean).slice(0, MAX_CASES)
      : [];
  } catch {
    return [];
  }
}

function saveEntries(email, entries) {
  if (typeof window === "undefined" || !email) return;
  try {
    window.localStorage.setItem(
      `${STORAGE_PREFIX}:${email}`,
      JSON.stringify(entries.slice(0, MAX_CASES)),
    );
  } catch {
    // Browser-local escalation notes are advisory.
  }
}

function escapeCsv(value) {
  const normalized = String(value ?? "").replace(/\r\n?/g, "\n");
  const safe = /^[\s]*[=+\-@]/.test(normalized)
    ? `'${normalized}`
    : normalized;
  return `"${safe.replaceAll('"', '""')}"`;
}

function downloadFile(contents, name, type) {
  const blob = new Blob(["\uFEFF", contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function copyText(value) {
  if (!navigator.clipboard?.writeText) {
    return Promise.reject(new Error("Clipboard unavailable"));
  }
  return navigator.clipboard.writeText(value);
}

function buildEntrySummary(entry) {
  return [
    `Escalation: ${entry.title}`,
    `Stage: ${ESCALATION_STAGES.find((item) => item.value === entry.stage)?.label || entry.stage}`,
    `Priority: ${entry.priority}`,
    `Severity: ${entry.severity}`,
    `Category: ${entry.category}`,
    `Owner: ${entry.owner || "Unassigned"}`,
    `Target team: ${entry.targetTeam || "Unassigned"}`,
    "",
    `Rationale: ${entry.rationale || "Not documented"}`,
    `Next action: ${entry.nextAction || "Not documented"}`,
    `Notes: ${entry.notes || "No notes recorded"}`,
  ].join("\n");
}

function buildCsv(entries) {
  const header = [
    "Report ID",
    "Title",
    "Category",
    "Severity",
    "Report status",
    "Priority",
    "Escalation stage",
    "Owner",
    "Target team",
    "Rationale",
    "Next action",
    "Notes",
    "Updated",
  ];
  const rows = entries.map((entry) => [
    entry.reportId,
    entry.title,
    entry.category,
    entry.severity,
    entry.status,
    entry.priority,
    entry.stage,
    entry.owner,
    entry.targetTeam,
    entry.rationale,
    entry.nextAction,
    entry.notes,
    entry.updatedAt,
  ]);
  return [header, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");
}

function SelectControl({ label, value, options, onChange }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-[10px] font-semibold text-slate-600 outline-none transition hover:border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 text-slate-400"
      />
    </label>
  );
}

function Metric({ label, value, detail, tone }) {
  return (
    <article className="rounded-xl border border-slate-200/80 bg-white p-3">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-[9px] text-slate-400">{detail}</p>
      <span className={`mt-2 inline-flex h-1 w-8 rounded-full ${tone}`} />
    </article>
  );
}

function StageBadge({ stage }) {
  const labels = Object.fromEntries(
    ESCALATION_STAGES.map((item) => [item.value, item.label]),
  );
  const tones = {
    monitor: "bg-slate-100 text-slate-600",
    review: "bg-amber-50 text-amber-700",
    escalated: "bg-rose-50 text-rose-700",
    accepted: "bg-violet-50 text-violet-700",
    closed: "bg-emerald-50 text-emerald-700",
  };
  return (
    <span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${tones[stage] || tones.monitor}`}>
      {labels[stage] || "Monitor"}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const tones = {
    urgent: "bg-rose-100 text-rose-700",
    high: "bg-orange-50 text-orange-700",
    normal: "bg-sky-50 text-sky-700",
    low: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${tones[priority] || tones.normal}`}>
      {priority}
    </span>
  );
}

function TextField({ label, value, onChange, placeholder, multiline = false }) {
  const className =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100";
  return (
    <label className="block">
      <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {multiline ? (
        <textarea
          rows={4}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`${className} resize-y leading-4`}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={className}
        />
      )}
    </label>
  );
}

function CaseCard({ entry, selected, onSelect, onDelete }) {
  return (
    <article
      className={`rounded-2xl border p-3 transition ${
        selected
          ? "border-rose-200 bg-rose-50/60"
          : "border-slate-200/80 bg-white hover:border-slate-300"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-slate-800">
              {entry.title}
            </p>
            <p className="mt-1 truncate text-[9px] text-slate-400">
              {entry.category} · {formatDate(entry.date)}
            </p>
          </div>
          <PriorityBadge priority={entry.priority} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <StageBadge stage={entry.stage} />
          <span className="text-[8px] text-slate-400">
            Updated {formatDateTime(new Date(entry.updatedAt))}
          </span>
        </div>
      </button>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
        <span className="truncate text-[8px] text-slate-400">
          {entry.owner || "No owner assigned"}
        </span>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Remove ${entry.title} from escalation desk`}
          className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 size={12} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function ReportPickerRow({ report, selected, onToggle, onOpenReport }) {
  return (
    <article
      className={`rounded-xl border p-3 transition ${
        selected
          ? "border-rose-200 bg-rose-50/50"
          : "border-slate-200/80 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`${selected ? "Remove" : "Add"} ${report.title}`}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-600 accent-rose-600 focus:ring-rose-500"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-slate-800">
                {report.title}
              </p>
              <p className="mt-1 text-[8px] text-slate-400">
                {report.category} · {formatDate(report.date)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <PriorityBadge priority={report.severity === "critical" ? "urgent" : report.severity === "high" ? "high" : "normal"} />
              <StageBadge stage={report.status === "closed" ? "closed" : "monitor"} />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="truncate text-[8px] text-slate-400">
              {report.id ? `#${report.id.slice(-10)}` : "No report ID"}
            </span>
            {onOpenReport && (
              <button
                type="button"
                onClick={() => onOpenReport(report.report)}
                className="rounded-lg px-2 py-1 text-[9px] font-semibold text-rose-700 hover:bg-rose-100"
              >
                Open report
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function TesterEscalationDesk({
  reports = [],
  email = "",
  onOpenReport,
}) {
  const [cases, setCases] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [stageFilter, setStageFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("priority");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [showAllReports, setShowAllReports] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  const reportEntries = useMemo(() => {
    if (!Array.isArray(reports)) return [];
    const seen = new Set();
    return reports
      .filter((report) => report && typeof report === "object")
      .map((report, index) => ({
        id: getId(report) || `${getTitle(report)}-${index}`,
        report,
        title: getTitle(report),
        category: getCategory(report),
        severity: getSeverity(report),
        status: getStatus(report),
        date: getDate(report),
      }))
      .filter((entry) => {
        if (seen.has(entry.id)) return false;
        seen.add(entry.id);
        return true;
      });
  }, [reports]);

  useEffect(() => {
    const loaded = loadEntries(clean(email).toLowerCase());
    setCases(loaded);
    setSelectedId(loaded[0]?.id || "");
    setStorageLoaded(true);
  }, [email]);

  useEffect(() => {
    if (!storageLoaded) return;
    saveEntries(clean(email).toLowerCase(), cases);
  }, [cases, email, storageLoaded]);

  const selectedCase = useMemo(
    () => cases.find((entry) => entry.id === selectedId) || null,
    [cases, selectedId],
  );

  const filteredCases = useMemo(() => {
    const query = search.trim().toLowerCase();
    return cases
      .filter((entry) => stageFilter === "all" || entry.stage === stageFilter)
      .filter((entry) => priorityFilter === "all" || entry.priority === priorityFilter)
      .filter((entry) => {
        if (!query) return true;
        return [entry.title, entry.category, entry.owner, entry.targetTeam, entry.rationale]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((left, right) => {
        if (sortBy === "title") return left.title.localeCompare(right.title);
        if (sortBy === "newest") return right.createdAt.localeCompare(left.createdAt);
        if (sortBy === "oldest") return left.createdAt.localeCompare(right.createdAt);
        if (sortBy === "updated") return right.updatedAt.localeCompare(left.updatedAt);
        return PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority];
      });
  }, [cases, priorityFilter, search, sortBy, stageFilter]);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reportEntries
      .filter((entry) => reportStatusFilter === "all" || entry.status === reportStatusFilter)
      .filter((entry) => {
        if (!query) return true;
        return [entry.id, entry.title, entry.category, entry.severity]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((left, right) => {
        if (sortBy === "title") return left.title.localeCompare(right.title);
        if (sortBy === "oldest") return (left.date?.getTime() || 0) - (right.date?.getTime() || 0);
        return severityRank(left.severity) - severityRank(right.severity);
      });
  }, [reportEntries, reportStatusFilter, search, sortBy]);

  const openCount = cases.filter((entry) => entry.stage !== "closed").length;
  const escalatedCount = cases.filter((entry) => entry.stage === "escalated").length;
  const urgentCount = cases.filter((entry) => entry.priority === "urgent").length;
  const hasFilters =
    stageFilter !== "all" ||
    priorityFilter !== "all" ||
    reportStatusFilter !== "all" ||
    Boolean(search.trim());

  const updateCase = (changes) => {
    if (!selectedId) return;
    setCases((current) =>
      current.map((entry) =>
        entry.id === selectedId
          ? { ...entry, ...changes, updatedAt: new Date().toISOString() }
          : entry,
      ),
    );
  };

  const createCaseFromReport = (report) => {
    if (cases.length >= MAX_CASES) return;
    const existing = cases.find((entry) => entry.reportId === report.id);
    if (existing) {
      setSelectedId(existing.id);
      return;
    }
    const created = {
      ...createEntry(report.report, 0),
      reportId: report.id,
      title: report.title,
      category: report.category,
      severity: report.severity,
      status: report.status,
      date: report.date ? report.date.toISOString() : null,
    };
    setCases((current) => [created, ...current]);
    setSelectedId(created.id);
  };

  const deleteCase = (id) => {
    const remaining = cases.filter((entry) => entry.id !== id);
    setCases(remaining);
    if (selectedId === id) setSelectedId(remaining[0]?.id || "");
  };

  const clearFilters = () => {
    setStageFilter("all");
    setPriorityFilter("all");
    setReportStatusFilter("all");
    setSearch("");
    setSortBy("priority");
    setVisibleCount(INITIAL_VISIBLE);
  };

  const copySelected = () => {
    if (!selectedCase) return;
    copyText(buildEntrySummary(selectedCase))
      .then(() => {
        setCopyMessage("Copied");
        window.setTimeout(() => setCopyMessage(""), 1600);
      })
      .catch(() => setCopyMessage("Copy unavailable"));
  };

  const exportCases = () => {
    if (!cases.length) return;
    downloadFile(buildCsv(cases), "tester-escalation-desk.csv", "text/csv;charset=utf-8");
  };

  const visibleReports = showAllReports
    ? filteredReports
    : filteredReports.slice(0, visibleCount);

  return (
    <section
      aria-labelledby="tester-escalation-desk-heading"
      className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30"
    >
      <header className="border-b border-slate-100 bg-gradient-to-br from-rose-50/70 via-white to-orange-50/40 p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-700">
              <BadgeAlert size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-rose-700">
                Private follow-up desk
              </p>
              <h2 id="tester-escalation-desk-heading" className="mt-1 text-base font-semibold tracking-tight text-slate-950">
                Escalation desk
              </h2>
              <p className="mt-1 max-w-2xl text-[10px] leading-4 text-slate-500">
                Capture why a report needs attention, who should receive it,
                and what action should happen next.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportCases} disabled={!cases.length} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[9px] font-semibold text-slate-600 hover:border-rose-200 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-45">
              <Download size={13} aria-hidden="true" />
              Export desk
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Metric label="Open follow-ups" value={formatNumber(openCount)} detail="Needs a decision" tone="bg-rose-500" />
          <Metric label="Escalated" value={formatNumber(escalatedCount)} detail="Sent to a target team" tone="bg-orange-500" />
          <Metric label="Urgent" value={formatNumber(urgentCount)} detail="Highest private priority" tone="bg-violet-500" />
        </div>
      </header>

      <div className="space-y-4 p-3 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="inline-flex items-center gap-1.5 px-1 text-[11px] font-semibold text-slate-500">
            <ListFilter size={13} aria-hidden="true" />
            Filter desk
          </span>
          <SelectControl label="Filter escalation stage" value={stageFilter} options={STAGE_FILTERS} onChange={setStageFilter} />
          <SelectControl label="Filter escalation priority" value={priorityFilter} options={PRIORITY_OPTIONS} onChange={setPriorityFilter} />
          <SelectControl label="Filter reports by status" value={reportStatusFilter} options={REPORT_STATUS_OPTIONS} onChange={setReportStatusFilter} />
          <SelectControl
            label="Sort escalation cases"
            value={sortBy}
            options={SORT_OPTIONS}
            onChange={setSortBy}
          />
          <label className="relative min-w-[190px] flex-1 sm:max-w-xs">
            <span className="sr-only">Search escalation desk</span>
            <Search size={13} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search desk or reports"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-[10px] text-slate-700 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={12} aria-hidden="true" />
              </button>
            )}
          </label>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="inline-flex h-9 items-center justify-center gap-1 rounded-lg px-2 text-[10px] font-semibold text-slate-500 hover:bg-white hover:text-rose-700">
              <X size={13} aria-hidden="true" />
              Reset
            </button>
          )}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.8fr)]">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-xs font-semibold text-slate-800">Escalation cases</p>
                <p className="mt-1 text-[9px] text-slate-400">{formatNumber(filteredCases.length)} matching cases</p>
              </div>
              <Flag size={17} aria-hidden="true" className="text-rose-500" />
            </div>
            {filteredCases.length ? (
              <div className="space-y-2">
                {filteredCases.map((entry) => (
                  <CaseCard
                    key={entry.id}
                    entry={entry}
                    selected={entry.id === selectedId}
                    onSelect={() => setSelectedId(entry.id)}
                    onDelete={() => deleteCase(entry.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <Flag size={20} aria-hidden="true" className="mx-auto text-slate-300" />
                <p className="mt-2 text-[10px] font-semibold text-slate-600">No escalation cases yet</p>
                <p className="mt-1 text-[9px] leading-4 text-slate-400">Add a report below to start a private follow-up.</p>
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-4">
            {selectedCase ? (
              <>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-rose-700">Selected case</p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-900">{selectedCase.title}</p>
                      <p className="mt-1 text-[9px] text-slate-400">{selectedCase.category} · {formatDate(selectedCase.date)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StageBadge stage={selectedCase.stage} />
                      <button type="button" onClick={copySelected} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-semibold text-slate-600 hover:border-rose-200 hover:text-rose-700">
                        {copyMessage === "Copied" ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                        {copyMessage || "Copy brief"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">Stage</span>
                      <SelectControl label="Escalation stage" value={selectedCase.stage} options={ESCALATION_STAGES} onChange={(value) => updateCase({ stage: value })} />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">Priority</span>
                      <SelectControl label="Escalation priority" value={selectedCase.priority} options={PRIORITY_OPTIONS.slice(1)} onChange={(value) => updateCase({ priority: value })} />
                    </label>
                    <TextField label="Owner" value={selectedCase.owner} onChange={(value) => updateCase({ owner: value })} placeholder="Person responsible for follow-up" />
                    <TextField label="Target team" value={selectedCase.targetTeam} onChange={(value) => updateCase({ targetTeam: value })} placeholder="Team receiving the escalation" />
                    <div className="sm:col-span-2">
                      <TextField label="Escalation rationale" value={selectedCase.rationale} onChange={(value) => updateCase({ rationale: value })} placeholder="Why does this report need attention now?" multiline />
                    </div>
                    <div className="sm:col-span-2">
                      <TextField label="Next action" value={selectedCase.nextAction} onChange={(value) => updateCase({ nextAction: value })} placeholder="What should happen after this handoff?" multiline />
                    </div>
                    <div className="sm:col-span-2">
                      <TextField label="Private notes" value={selectedCase.notes} onChange={(value) => updateCase({ notes: value })} placeholder="Capture context that is useful to you but not part of the server report." multiline />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-100 bg-rose-50/60 p-3">
                    <p className="flex items-center gap-1.5 text-[9px] font-semibold text-rose-800">
                      <ShieldAlert size={12} aria-hidden="true" />
                      Browser-local escalation record
                    </p>
                    <span className="text-[9px] text-rose-700/80">Updated {formatDateTime(new Date(selectedCase.updatedAt))}</span>
                  </div>
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Add a report to the desk</p>
                      <p className="mt-1 text-[9px] text-slate-400">Choose a report to create a private escalation case.</p>
                    </div>
                    <span className="text-[9px] font-semibold text-slate-500">{formatNumber(filteredReports.length)} matching reports</span>
                  </div>
                  {visibleReports.length ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      {visibleReports.map((report) => (
                        <ReportPickerRow
                          key={report.id}
                          report={report}
                          selected={cases.some((entry) => entry.reportId === report.id)}
                          onToggle={() => createCaseFromReport(report)}
                          onOpenReport={onOpenReport}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-[10px] text-slate-500">No reports match the current filters.</p>
                  )}
                  {!showAllReports && filteredReports.length > visibleCount && (
                    <button type="button" onClick={() => setShowAllReports(true)} className="mx-auto flex items-center gap-1 rounded-lg px-3 py-2 text-[10px] font-semibold text-rose-700 hover:bg-rose-50">
                      Show all {formatNumber(filteredReports.length)} reports
                      <ArrowDownAZ size={12} aria-hidden="true" />
                    </button>
                  )}
                  {showAllReports && filteredReports.length > INITIAL_VISIBLE && (
                    <button type="button" onClick={() => setShowAllReports(false)} className="mx-auto flex items-center gap-1 rounded-lg px-3 py-2 text-[10px] font-semibold text-slate-500 hover:bg-slate-50">
                      Show fewer reports
                      <ArrowUpAZ size={12} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="grid min-h-[420px] place-items-center rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <div>
                  <Flag size={28} aria-hidden="true" className="mx-auto text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">Select a report to begin</p>
                  <p className="mx-auto mt-1 max-w-sm text-[10px] leading-4 text-slate-500">Choose any report below and keep escalation context separate from server data.</p>
                  {filteredReports[0] && (
                    <button type="button" onClick={() => createCaseFromReport(filteredReports[0])} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-[9px] font-semibold text-white hover:bg-rose-700">
                      <Plus size={13} aria-hidden="true" />
                      Add first report
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
