"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  Filter,
  Image,
  Link2,
  ListChecks,
  MessageSquareText,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Tag,
  Target,
  Video,
  X,
} from "lucide-react";

const STORAGE_PREFIX = "tester-report-evidence-readiness-v1";
const MAX_RECORDS = 300;
const MAX_NOTE_LENGTH = 600;
const INITIAL_VISIBLE = 8;

const EVIDENCE_ITEMS = [
  {
    id: "screenshot",
    label: "Screenshot",
    description: "A focused image shows the observed behavior.",
    icon: Image,
  },
  {
    id: "steps",
    label: "Reproduction steps",
    description: "Another tester can follow the steps without guessing.",
    icon: ListChecks,
  },
  {
    id: "expected",
    label: "Expected result",
    description: "The intended behavior is stated clearly.",
    icon: Target,
  },
  {
    id: "environment",
    label: "Environment",
    description: "Browser, platform, device, and viewport are known.",
    icon: Tag,
  },
  {
    id: "url",
    label: "Affected URL",
    description: "A valid page URL points to the affected flow.",
    icon: Link2,
  },
  {
    id: "recording",
    label: "Screen recording",
    description: "A short recording is available for timing or motion issues.",
    icon: Video,
  },
];

const STATUS_FILTERS = [
  { value: "all", label: "All readiness states" },
  { value: "missing", label: "Missing evidence" },
  { value: "partial", label: "Partially ready" },
  { value: "ready", label: "Ready to share" },
];

const SEVERITY_FILTERS = [
  { value: "all", label: "All severities" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

const SORT_OPTIONS = [
  { value: "readiness", label: "Lowest readiness" },
  { value: "severity", label: "Highest severity" },
  { value: "newest", label: "Newest report" },
  { value: "title", label: "Title A–Z" },
];

function getText(value, fallback = "", limit = 2000) {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, limit) || fallback;
}

function getReportId(report) {
  const rawId = report?._id ?? report?.id;
  return rawId === null || rawId === undefined ? "" : String(rawId).trim();
}

function getTitle(report) {
  return getText(report?.title || report?.summary, "Untitled report", 240);
}

function getSeverity(report) {
  return getText(report?.severity, "Unspecified", 80);
}

function getCategory(report) {
  return getText(report?.category, "Uncategorized", 120);
}

function getStatus(report) {
  return report?.status === "Closed" ? "Closed" : "Open";
}

function getReportDate(report) {
  const value = report?.createdAt || report?.created_at || report?.reportedAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function getSearchText(report) {
  return [
    getReportId(report),
    getTitle(report),
    getCategory(report),
    getSeverity(report),
    getText(report?.description, "", 1000),
    getText(report?.url || report?.pageUrl, "", 500),
  ]
    .join(" ")
    .toLowerCase();
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStorageKey(email) {
  const normalized = getText(email).toLocaleLowerCase();
  return normalized
    ? `${STORAGE_PREFIX}:${encodeURIComponent(normalized)}`
    : "";
}

function createChecklist() {
  return Object.fromEntries(
    EVIDENCE_ITEMS.map((item) => [item.id, false]),
  );
}

function normalizeChecklist(value) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(
    EVIDENCE_ITEMS.map((item) => [item.id, source[item.id] === true]),
  );
}

function normalizeRecord(value) {
  if (!value || typeof value !== "object") return null;
  const reportId = getText(value.reportId, "", 200);
  if (!reportId) return null;
  return {
    reportId,
    checklist: normalizeChecklist(value.checklist),
    note: getText(value.note, "", MAX_NOTE_LENGTH),
    updatedAt: getText(value.updatedAt, "", 60),
  };
}

function normalizeRecords(value) {
  if (!Array.isArray(value)) return {};
  return Object.fromEntries(
    value
      .map(normalizeRecord)
      .filter(Boolean)
      .slice(0, MAX_RECORDS)
      .map((record) => [record.reportId, record]),
  );
}

function getRecord(records, reportId) {
  return (
    records[reportId] || {
      reportId,
      checklist: createChecklist(),
      note: "",
      updatedAt: "",
    }
  );
}

function getCompletedCount(record) {
  return EVIDENCE_ITEMS.reduce(
    (count, item) => count + (record.checklist[item.id] ? 1 : 0),
    0,
  );
}

function getReadiness(record) {
  return Math.round((getCompletedCount(record) / EVIDENCE_ITEMS.length) * 100);
}

function getReadinessState(record) {
  const readiness = getReadiness(record);
  if (readiness === 100) return "ready";
  if (readiness > 0) return "partial";
  return "missing";
}

function getSeverityRank(value) {
  if (value === "High") return 3;
  if (value === "Medium") return 2;
  if (value === "Low") return 1;
  return 0;
}

function getStateLabel(state) {
  return (
    STATUS_FILTERS.find((option) => option.value === state)?.label ||
    "Missing evidence"
  );
}

function getStateTone(state) {
  if (state === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (state === "partial") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function buildInitialRecords(reports) {
  return Object.fromEntries(
    reports
      .map((report) => getReportId(report))
      .filter(Boolean)
      .map((reportId) => [reportId, getRecord({}, reportId)]),
  );
}

function createCsv(records, reports) {
  const reportMap = new Map(
    reports.map((report) => [getReportId(report), report]),
  );
  const escape = (value) => {
    const raw = String(value ?? "");
    const safe = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const headers = [
    "Report ID",
    "Title",
    "Status",
    "Severity",
    "Category",
    "Readiness",
    ...EVIDENCE_ITEMS.map((item) => item.label),
    "Private note",
  ];
  const rows = Object.values(records).map((record) => {
    const report = reportMap.get(record.reportId);
    return [
      record.reportId,
      getTitle(report),
      getStatus(report),
      getSeverity(report),
      getCategory(report),
      `${getReadiness(record)}%`,
      ...EVIDENCE_ITEMS.map((item) =>
        record.checklist[item.id] ? "Complete" : "Missing",
      ),
      record.note,
    ];
  });
  return [headers, ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
}

function downloadCsv(records, reports) {
  const blob = new Blob([`\uFEFF${createCsv(records, reports)}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `report-evidence-readiness-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SummaryCard({ label, value, detail, tone, icon: Icon }) {
  return (
    <article className={`rounded-xl border p-3 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-wide opacity-75">
          {label}
        </p>
        <Icon size={14} aria-hidden="true" />
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums">
        {formatNumber(value)}
      </p>
      <p className="mt-1 text-[9px] opacity-70">{detail}</p>
    </article>
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
        className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-2.5 pr-7 text-[10px] font-semibold text-slate-600 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
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
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </label>
  );
}

function ReadinessBadge({ state }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold ${getStateTone(
        state,
      )}`}
    >
      {state === "ready" ? (
        <BadgeCheck size={11} aria-hidden="true" />
      ) : state === "partial" ? (
        <CircleDashed size={11} aria-hidden="true" />
      ) : (
        <ShieldAlert size={11} aria-hidden="true" />
      )}
      {getStateLabel(state)}
    </span>
  );
}

function ProgressBar({ value }) {
  const color =
    value === 100 ? "bg-emerald-500" : value > 0 ? "bg-amber-500" : "bg-rose-400";
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={`Evidence readiness ${value}%`}
    >
      <div
        className={`h-full rounded-full transition-[width] ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function EvidenceItem({
  item,
  checked,
  locked,
  onToggle,
}) {
  const Icon = item.icon;
  return (
    <label
      className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 transition ${
        checked
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-slate-100 bg-slate-50/60 hover:border-violet-200"
      } ${locked ? "cursor-default opacity-70" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={locked}
        onChange={onToggle}
        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 accent-emerald-600"
      />
      <Icon
        size={13}
        aria-hidden="true"
        className={checked ? "text-emerald-600" : "text-slate-400"}
      />
      <span className="min-w-0">
        <span
          className={`block text-[9px] font-semibold ${
            checked ? "text-emerald-700" : "text-slate-700"
          }`}
        >
          {item.label}
        </span>
        <span className="mt-0.5 block text-[8px] leading-3 text-slate-400">
          {item.description}
        </span>
      </span>
    </label>
  );
}

function ReportReadinessCard({
  report,
  record,
  selected,
  expanded,
  onSelect,
  onToggle,
  onNote,
  onOpenReport,
  onReset,
}) {
  const readiness = getReadiness(record);
  const state = getReadinessState(record);
  const reportId = getReportId(report);
  return (
    <article
      className={`rounded-2xl border bg-white p-3.5 transition ${
        selected
          ? "border-violet-300 ring-2 ring-violet-100"
          : "border-slate-200/80 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(reportId)}
          aria-label={`Select ${getTitle(report)}`}
          className="mt-1 h-4 w-4 rounded border-slate-300 accent-violet-600"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onOpenReport?.(report)}
                className="block max-w-full truncate text-left text-xs font-semibold text-slate-800 hover:text-violet-700"
              >
                {getTitle(report)}
              </button>
              <p className="mt-1 truncate text-[9px] text-slate-400">
                #{reportId} · {getCategory(report)} · {getSeverity(report)}
              </p>
            </div>
            <ReadinessBadge state={state} />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <ProgressBar value={readiness} />
            <span className="shrink-0 text-[9px] font-semibold tabular-nums text-slate-500">
              {readiness}%
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-slate-400">
            <span>{getStatus(report)}</span>
            <span>{getCompletedCount(record)}/{EVIDENCE_ITEMS.length} evidence items</span>
            {getReportDate(report) && <span>Reported {formatDate(getReportDate(report))}</span>}
            {record.updatedAt && <span>Updated {formatDate(record.updatedAt)}</span>}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onToggle(reportId)}
              aria-expanded={expanded}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-semibold text-slate-600 hover:border-violet-200 hover:text-violet-700"
            >
              <ClipboardCheck size={11} aria-hidden="true" />
              {expanded ? "Hide checklist" : "Open checklist"}
            </button>
            {onOpenReport && (
              <button
                type="button"
                onClick={() => onOpenReport(report)}
                className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[9px] font-semibold text-violet-700 hover:bg-violet-50"
              >
                <ExternalLink size={11} aria-hidden="true" />
                Open report
              </button>
            )}
            {readiness > 0 && (
              <button
                type="button"
                onClick={() => onReset(reportId)}
                className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[9px] font-semibold text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              >
                <RotateCcw size={11} aria-hidden="true" />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {EVIDENCE_ITEMS.map((item) => (
              <EvidenceItem
                key={item.id}
                item={item}
                checked={record.checklist[item.id]}
                onToggle={() => onToggle(reportId, item.id)}
              />
            ))}
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-[9px] font-semibold text-slate-500">
              Private evidence note
            </span>
            <textarea
              value={record.note}
              maxLength={MAX_NOTE_LENGTH}
              onChange={(event) => onNote(reportId, event.target.value)}
              placeholder="Capture what is still needed or where evidence is stored…"
              className="min-h-16 w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] leading-4 text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            />
            <span className="mt-0.5 block text-right text-[8px] tabular-nums text-slate-300">
              {record.note.length}/{MAX_NOTE_LENGTH}
            </span>
          </label>
        </div>
      )}
    </article>
  );
}

function EmptyState({ hasReports, hasFilters, onReset }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-10 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-white text-violet-500 shadow-sm">
        <ClipboardCheck size={19} aria-hidden="true" />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-slate-800">
        {hasReports
          ? "No reports match the readiness filters"
          : "No reports are available"}
      </h3>
      <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-slate-500">
        {hasReports
          ? "Try another readiness state, severity, or search term."
          : "Loaded reports will appear here when the dashboard receives data."}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-violet-700 hover:border-violet-200 hover:bg-violet-50"
        >
          <X size={12} aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );
}

function ReadinessHelp() {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3">
      <div className="flex items-start gap-2">
        <Sparkles
          size={14}
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-violet-600"
        />
        <div>
          <h3 className="text-[10px] font-semibold text-slate-800">
            How readiness works
          </h3>
          <p className="mt-1 text-[9px] leading-4 text-slate-500">
            Each checklist item contributes equally. This workspace is a
            private preparation aid and never changes report fields, status, or
            attachments on the server.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ReportEvidenceReadiness({
  reports = [],
  email,
  onOpenReport,
}) {
  const [records, setRecords] = useState({});
  const [loadedEmail, setLoadedEmail] = useState("");
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("readiness");
  const [sortDirection, setSortDirection] = useState("asc");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [feedback, setFeedback] = useState("");

  const normalizedEmail = getText(email).toLocaleLowerCase();
  const storageKey = getStorageKey(normalizedEmail);
  const availableReports = useMemo(
    () =>
      reports.filter(
        (report) =>
          report &&
          typeof report === "object" &&
          !Array.isArray(report) &&
          getReportId(report),
      ),
    [reports],
  );
  const reportMap = useMemo(
    () =>
      new Map(
        availableReports.map((report) => [getReportId(report), report]),
      ),
    [availableReports],
  );

  useEffect(() => {
    setRecords({});
    setLoadedEmail("");
    setStorageLoaded(false);
    setStorageError("");
    setSelectedIds(new Set());
    setExpandedIds(new Set());
    if (!normalizedEmail) {
      setStorageLoaded(true);
      return;
    }
    try {
      const saved = window.localStorage.getItem(storageKey);
      setRecords(saved ? normalizeRecords(JSON.parse(saved)) : {});
      setLoadedEmail(normalizedEmail);
      setStorageLoaded(true);
    } catch {
      setStorageError(
        "Saved evidence readiness could not be loaded. New changes remain in memory.",
      );
      setLoadedEmail(normalizedEmail);
      setStorageLoaded(true);
    }
  }, [normalizedEmail, storageKey]);

  useEffect(() => {
    if (!storageLoaded || loadedEmail !== normalizedEmail || !storageKey) return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(Object.values(records).slice(0, MAX_RECORDS)),
      );
      setStorageError("");
    } catch {
      setStorageError(
        "Evidence changes are only in memory because this browser could not save them.",
      );
    }
  }, [loadedEmail, normalizedEmail, records, storageKey, storageLoaded]);

  const getReportRecord = (reportId) => getRecord(records, reportId);

  const filteredReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return availableReports
      .filter((report) => {
        const record = getRecord(records, getReportId(report));
        const state = getReadinessState(record);
        if (statusFilter !== "all" && state !== statusFilter) return false;
        if (
          severityFilter !== "all" &&
          getSeverity(report) !== severityFilter
        ) {
          return false;
        }
        if (normalizedQuery && !getSearchText(report).includes(normalizedQuery)) {
          return false;
        }
        return true;
      })
      .sort((left, right) => {
        const leftRecord = getRecord(records, getReportId(left));
        const rightRecord = getRecord(records, getReportId(right));
        let comparison = 0;
        if (sortBy === "readiness") {
          comparison = getReadiness(leftRecord) - getReadiness(rightRecord);
        } else if (sortBy === "severity") {
          comparison = getSeverityRank(getSeverity(right)) - getSeverityRank(getSeverity(left));
        } else if (sortBy === "newest") {
          comparison =
            (getReportDate(right)?.getTime() || 0) -
            (getReportDate(left)?.getTime() || 0);
        } else {
          comparison = getTitle(left).localeCompare(getTitle(right));
        }
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [
    availableReports,
    query,
    records,
    severityFilter,
    sortBy,
    sortDirection,
    statusFilter,
  ]);

  const visibleReports = filteredReports.slice(0, visibleCount);
  const selectedVisibleCount = visibleReports.filter((report) =>
    selectedIds.has(getReportId(report)),
  ).length;
  const allVisibleSelected =
    visibleReports.length > 0 &&
    selectedVisibleCount === visibleReports.length;
  const summaries = useMemo(() => {
    const result = {
      total: availableReports.length,
      missing: 0,
      partial: 0,
      ready: 0,
      average: 0,
    };
    let totalReadiness = 0;
    availableReports.forEach((report) => {
      const record = getRecord(records, getReportId(report));
      const state = getReadinessState(record);
      result[state] += 1;
      totalReadiness += getReadiness(record);
    });
    result.average = result.total
      ? Math.round(totalReadiness / result.total)
      : 0;
    return result;
  }, [availableReports, records]);
  const hasFilters =
    statusFilter !== "all" ||
    severityFilter !== "all" ||
    Boolean(query.trim());

  const updateRecord = (reportId, updater) => {
    setRecords((current) => {
      const existing = getRecord(current, reportId);
      const updated = updater(existing);
      return {
        ...current,
        [reportId]: {
          ...updated,
          reportId,
          updatedAt: new Date().toISOString(),
        },
      };
    });
    setFeedback("");
  };

  const toggleEvidence = (reportId, evidenceId) => {
    updateRecord(reportId, (record) => ({
      ...record,
      checklist: {
        ...record.checklist,
        [evidenceId]: !record.checklist[evidenceId],
      },
    }));
  };

  const updateNote = (reportId, note) => {
    updateRecord(reportId, (record) => ({
      ...record,
      note: note.slice(0, MAX_NOTE_LENGTH),
    }));
  };

  const resetRecord = (reportId) => {
    updateRecord(reportId, () => getRecord({}, reportId));
    setFeedback("Evidence checklist reset for the selected report.");
  };

  const toggleExpanded = (reportId) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(reportId)) next.delete(reportId);
      else next.add(reportId);
      return next;
    });
  };

  const toggleSelected = (reportId) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(reportId)) next.delete(reportId);
      else next.add(reportId);
      return next;
    });
  };

  const toggleVisibleSelection = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        visibleReports.forEach((report) => next.delete(getReportId(report)));
      } else {
        visibleReports.forEach((report) => next.add(getReportId(report)));
      }
      return next;
    });
  };

  const applyBulkItem = (evidenceId, value) => {
    if (!evidenceId || !selectedIds.size) return;
    setRecords((current) => {
      const next = { ...current };
      selectedIds.forEach((reportId) => {
        const record = getRecord(current, reportId);
        next[reportId] = {
          ...record,
          checklist: {
            ...record.checklist,
            [evidenceId]: value,
          },
          updatedAt: new Date().toISOString(),
        };
      });
      return next;
    });
    setSelectedIds(new Set());
    setFeedback(
      `${formatNumber(selectedVisibleCount)} report checklists updated.`,
    );
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setSeverityFilter("all");
    setQuery("");
    setSortBy("readiness");
    setSortDirection("asc");
    setVisibleCount(INITIAL_VISIBLE);
  };

  const copySummary = async () => {
    const summary = `${summaries.ready} ready · ${summaries.partial} partially ready · ${summaries.missing} missing evidence · ${summaries.average}% average readiness`;
    try {
      await navigator.clipboard.writeText(summary);
      setFeedback("Readiness summary copied.");
    } catch {
      setFeedback("Could not copy the summary in this browser.");
    }
  };

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
      <header className="border-b border-slate-200/80 bg-gradient-to-r from-sky-50/80 via-white to-emerald-50/60 p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border border-sky-100 bg-white text-sky-700 shadow-sm">
                <ClipboardCheck size={19} aria-hidden="true" />
              </span>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold text-sky-700">
                Evidence readiness
              </span>
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">
              Report evidence readiness
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">
              Prepare a stronger handoff by checking the evidence each report
              needs. All checklist state and notes remain private to this
              browser account.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copySummary}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-600 hover:border-sky-200 hover:text-sky-700"
            >
              <Copy size={12} aria-hidden="true" />
              Copy summary
            </button>
            <button
              type="button"
              onClick={() => downloadCsv(records, availableReports)}
              disabled={!availableReports.length}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-600 hover:border-sky-200 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download size={12} aria-hidden="true" />
              Export CSV
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryCard
            label="Reports"
            value={summaries.total}
            detail="Loaded report set"
            tone="border-slate-200 bg-white text-slate-800"
            icon={ListChecks}
          />
          <SummaryCard
            label="Missing"
            value={summaries.missing}
            detail="No checklist items complete"
            tone="border-rose-200 bg-rose-50 text-rose-800"
            icon={ShieldAlert}
          />
          <SummaryCard
            label="Partial"
            value={summaries.partial}
            detail="Needs more evidence"
            tone="border-amber-200 bg-amber-50 text-amber-800"
            icon={CircleDashed}
          />
          <SummaryCard
            label="Ready"
            value={summaries.ready}
            detail="All checklist items complete"
            tone="border-emerald-200 bg-emerald-50 text-emerald-800"
            icon={CheckCircle2}
          />
          <SummaryCard
            label="Average"
            value={`${summaries.average}%`}
            detail="Across loaded reports"
            tone="border-sky-200 bg-sky-50 text-sky-800"
            icon={BadgeCheck}
          />
        </div>
      </header>

      <div className="space-y-3 p-4 sm:p-5">
        {storageError && (
          <p
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] text-amber-800"
          >
            {storageError}
          </p>
        )}
        {feedback && (
          <p
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[10px] text-emerald-800"
          >
            {feedback}
          </p>
        )}
        <ReadinessHelp />
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-800">
                Find evidence gaps
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                Filter the local checklist before reviewing or bulk-updating reports.
              </p>
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-violet-700 hover:bg-white"
              >
                <X size={11} aria-hidden="true" />
                Clear filters
              </button>
            )}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="relative block sm:col-span-2 lg:col-span-1">
              <span className="sr-only">Search reports</span>
              <Search
                size={13}
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleCount(INITIAL_VISIBLE);
                }}
                placeholder="Search title, ID, category…"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              />
            </label>
            <SelectField
              label="Readiness state"
              value={statusFilter}
              options={STATUS_FILTERS}
              onChange={(value) => {
                setStatusFilter(value);
                setVisibleCount(INITIAL_VISIBLE);
              }}
            />
            <SelectField
              label="Report severity"
              value={severityFilter}
              options={SEVERITY_FILTERS}
              onChange={(value) => {
                setSeverityFilter(value);
                setVisibleCount(INITIAL_VISIBLE);
              }}
            />
            <SelectField
              label="Sort reports"
              value={sortBy}
              options={SORT_OPTIONS}
              onChange={(value) => {
                setSortBy(value);
                setVisibleCount(INITIAL_VISIBLE);
              }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
            <span aria-live="polite">
              Showing {formatNumber(filteredReports.length)} of{" "}
              {formatNumber(availableReports.length)} reports
            </span>
            <button
              type="button"
              onClick={() =>
                setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
              }
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-semibold hover:bg-white hover:text-sky-700"
            >
              {sortDirection === "asc" ? (
                <ArrowUpAZ size={12} aria-hidden="true" />
              ) : (
                <ArrowDownAZ size={12} aria-hidden="true" />
              )}
              {sortDirection === "asc" ? "Ascending" : "Descending"}
            </button>
          </div>
        </div>

        {filteredReports.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2.5">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[10px] font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleVisibleSelection}
                className="h-4 w-4 rounded border-slate-300 accent-sky-600"
              />
              Select visible ({formatNumber(visibleReports.length)})
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] text-slate-500">
                {formatNumber(selectedVisibleCount)} selected
              </span>
              <SelectField
                label="Bulk evidence item"
                value=""
                options={[
                  { value: "", label: "Bulk evidence…" },
                  ...EVIDENCE_ITEMS.map((item) => ({
                    value: item.id,
                    label: item.label,
                  })),
                ]}
                onChange={(value) => value && applyBulkItem(value, true)}
              />
              {selectedVisibleCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[9px] font-semibold text-slate-500 hover:bg-white"
                >
                  <X size={11} aria-hidden="true" />
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {filteredReports.length ? (
          <div className="space-y-2.5">
            {visibleReports.map((report) => {
              const reportId = getReportId(report);
              return (
                <ReportReadinessCard
                  key={reportId}
                  report={report}
                  record={getReportRecord(reportId)}
                  selected={selectedIds.has(reportId)}
                  expanded={expandedIds.has(reportId)}
                  onSelect={toggleSelected}
                  onToggle={(id, itemId) =>
                    itemId ? toggleEvidence(id, itemId) : toggleExpanded(id)
                  }
                  onNote={updateNote}
                  onOpenReport={onOpenReport}
                  onReset={resetRecord}
                />
              );
            })}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <p className="text-[9px] text-slate-500">
                Showing {formatNumber(visibleReports.length)} of{" "}
                {formatNumber(filteredReports.length)} matching reports
              </p>
              <div className="flex items-center gap-2">
                {visibleCount > INITIAL_VISIBLE && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount(INITIAL_VISIBLE)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Show fewer
                  </button>
                )}
                {visibleCount < filteredReports.length && (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount((current) =>
                        Math.min(current + INITIAL_VISIBLE, filteredReports.length),
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[9px] font-semibold text-sky-700 hover:bg-sky-100"
                  >
                    Show more
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            hasReports={availableReports.length > 0}
            hasFilters={hasFilters}
            onReset={resetFilters}
          />
        )}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-[9px] text-slate-400 sm:px-5">
        <span className="inline-flex items-center gap-1">
          <MessageSquareText size={11} aria-hidden="true" />
          Notes and checklist state are private to {normalizedEmail || "this browser"}.
        </span>
        <span className="inline-flex items-center gap-1">
          <ShieldAlert size={11} aria-hidden="true" />
          Advisory only
        </span>
      </footer>
    </section>
  );
}
