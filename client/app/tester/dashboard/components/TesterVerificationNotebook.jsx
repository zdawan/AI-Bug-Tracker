"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clipboard,
  Copy,
  Download,
  FileText,
  Filter,
  FolderKanban,
  ListChecks,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

const STORAGE_PREFIX = "tester-verification-notebook-v1";
const MAX_NOTEBOOKS = 40;
const MAX_REPORTS = 100;
const MAX_TEXT = 1600;
const INITIAL_VISIBLE = 8;

const NOTEBOOK_STATUS = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "complete", label: "Complete" },
];

const NOTEBOOK_FILTERS = [
  { value: "all", label: "All notebooks" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "complete", label: "Complete" },
];

const REPORT_STATUS = [
  { value: "all", label: "All reports" },
  { value: "open", label: "Open reports" },
  { value: "closed", label: "Resolved reports" },
];

const SEVERITY_OPTIONS = [
  { value: "all", label: "All severities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const SORT_OPTIONS = [
  { value: "severity", label: "Highest severity" },
  { value: "newest", label: "Newest first" },
  { value: "title", label: "Title A–Z" },
  { value: "category", label: "Category A–Z" },
];

const CHECKLIST = [
  {
    id: "scope",
    label: "Scope confirmed",
    description: "The test area and intended behavior are clear.",
  },
  {
    id: "baseline",
    label: "Baseline captured",
    description: "The starting build or environment is recorded.",
  },
  {
    id: "steps",
    label: "Steps prepared",
    description: "The path to verify is written down.",
  },
  {
    id: "evidence",
    label: "Evidence planned",
    description: "Screenshots, recordings, or logs are identified.",
  },
  {
    id: "result",
    label: "Result documented",
    description: "Pass, fail, or blocked outcomes are ready to share.",
  },
];

function text(value, fallback = "", limit = MAX_TEXT) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, limit) : fallback;
}

function reportId(report) {
  const value = report?._id ?? report?.id;
  return value === null || value === undefined ? "" : String(value).trim();
}

function reportTitle(report) {
  return text(report?.title || report?.summary, "Untitled report", 240);
}

function reportCategory(report) {
  return text(report?.category, "Uncategorized", 100);
}

function reportSeverity(report) {
  return text(report?.severity, "Unspecified", 40).toLowerCase();
}

function reportStatus(report) {
  return text(report?.status).toLowerCase() === "closed" ? "closed" : "open";
}

function reportDate(report) {
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
  return { critical: 0, high: 1, medium: 2, low: 3, unspecified: 4 }[
    value
  ] ?? 5;
}

function safeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function createNotebook() {
  const now = new Date().toISOString();
  return {
    id: `notebook-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "Untitled verification run",
    purpose: "",
    owner: "",
    environment: "",
    status: "active",
    notes: "",
    selectedReports: [],
    checklist: Object.fromEntries(CHECKLIST.map((item) => [item.id, false])),
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeNotebook(value) {
  if (!value || typeof value !== "object") return null;
  const checklist =
    value.checklist && typeof value.checklist === "object"
      ? Object.fromEntries(
          CHECKLIST.map((item) => [item.id, value.checklist[item.id] === true]),
        )
      : Object.fromEntries(CHECKLIST.map((item) => [item.id, false]));
  return {
    ...createNotebook(),
    ...value,
    id: text(value.id, `notebook-${Date.now()}`, 120),
    name: text(value.name, "Untitled verification run", 120),
    purpose: text(value.purpose, "", MAX_TEXT),
    owner: text(value.owner, "", 120),
    environment: text(value.environment, "", 160),
    notes: text(value.notes, "", MAX_TEXT),
    status: NOTEBOOK_STATUS.some((item) => item.value === value.status)
      ? value.status
      : "active",
    selectedReports: Array.isArray(value.selectedReports)
      ? value.selectedReports.filter((item) => typeof item === "string").slice(0, MAX_REPORTS)
      : [],
    checklist,
    createdAt: text(value.createdAt, new Date().toISOString(), 60),
    updatedAt: text(value.updatedAt, new Date().toISOString(), 60),
  };
}

function loadNotebooks(email) {
  if (typeof window === "undefined" || !email) return [];
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${email}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map(normalizeNotebook).filter(Boolean).slice(0, MAX_NOTEBOOKS)
      : [];
  } catch {
    return [];
  }
}

function saveNotebooks(email, notebooks) {
  if (typeof window === "undefined" || !email) return;
  try {
    window.localStorage.setItem(
      `${STORAGE_PREFIX}:${email}`,
      JSON.stringify(notebooks.slice(0, MAX_NOTEBOOKS)),
    );
  } catch {
    // Browser storage is advisory and may be unavailable.
  }
}

function escapeCsv(value) {
  const normalized = String(value ?? "").replace(/\r\n?/g, "\n");
  const safe = /^[\s]*[=+\-@]/.test(normalized)
    ? `'${normalized}`
    : normalized;
  return `"${safe.replaceAll('"', '""')}"`;
}

function downloadText(contents, fileName, type) {
  const blob = new Blob(["\uFEFF", contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function copyText(value) {
  if (!navigator.clipboard?.writeText) return Promise.reject(new Error("Copy unavailable"));
  return navigator.clipboard.writeText(value);
}

function getNotebookProgress(notebook) {
  const complete = CHECKLIST.filter((item) => notebook.checklist[item.id]).length;
  return Math.round((complete / CHECKLIST.length) * 100);
}

function getSelectedReports(notebook, entries) {
  const selected = new Set(notebook?.selectedReports || []);
  return entries.filter((entry) => selected.has(entry.id));
}

function createSummary(notebook, entries) {
  const selected = getSelectedReports(notebook, entries);
  const lines = [
    `Verification run: ${notebook.name}`,
    `Status: ${NOTEBOOK_STATUS.find((item) => item.value === notebook.status)?.label || notebook.status}`,
    `Owner: ${notebook.owner || "Unassigned"}`,
    `Environment: ${notebook.environment || "Not specified"}`,
    `Progress: ${getNotebookProgress(notebook)}%`,
    `Reports attached: ${selected.length}`,
    "",
    `Purpose: ${notebook.purpose || "Not documented"}`,
    "",
    "Checklist:",
    ...CHECKLIST.map(
      (item) => `- ${notebook.checklist[item.id] ? "[x]" : "[ ]"} ${item.label}`,
    ),
    "",
    "Attached reports:",
    ...selected.map(
      (entry) =>
        `- ${entry.title} (${entry.severity}, ${entry.status === "closed" ? "resolved" : "open"})`,
    ),
    "",
    `Notes: ${notebook.notes || "No notes recorded"}`,
  ];
  return lines.join("\n");
}

function createCsv(notebooks, entries) {
  const header = [
    "Notebook",
    "Status",
    "Owner",
    "Environment",
    "Progress",
    "Reports attached",
    "Created",
    "Updated",
  ];
  const rows = notebooks.map((notebook) => [
    notebook.name,
    notebook.status,
    notebook.owner,
    notebook.environment,
    `${getNotebookProgress(notebook)}%`,
    notebook.selectedReports.length,
    notebook.createdAt,
    notebook.updatedAt,
  ]);
  return [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
}

function SelectControl({ label, value, options, onChange }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-[10px] font-semibold text-slate-600 outline-none transition hover:border-violet-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
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

function StatusBadge({ status }) {
  const labels = { active: "Active", paused: "Paused", complete: "Complete" };
  const tones = {
    active: "bg-violet-50 text-violet-700",
    paused: "bg-amber-50 text-amber-700",
    complete: "bg-emerald-50 text-emerald-700",
  };
  return (
    <span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${tones[status]}`}>
      {labels[status] || "Active"}
    </span>
  );
}

function SeverityBadge({ value }) {
  const tones = {
    critical: "bg-rose-100 text-rose-700",
    high: "bg-orange-50 text-orange-700",
    medium: "bg-amber-50 text-amber-700",
    low: "bg-sky-50 text-sky-700",
    unspecified: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${tones[value] || tones.unspecified}`}>
      {value === "unspecified" ? "Unspecified" : value}
    </span>
  );
}

function NotebookCard({ notebook, selected, onSelect, onDelete, entries }) {
  const attached = getSelectedReports(notebook, entries);
  const progress = getNotebookProgress(notebook);
  return (
    <article
      className={`rounded-2xl border p-3 transition ${
        selected
          ? "border-violet-200 bg-violet-50/60"
          : "border-slate-200/80 bg-white hover:border-slate-300"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-slate-800">
              {notebook.name}
            </p>
            <p className="mt-1 truncate text-[9px] text-slate-400">
              {notebook.owner || "Unassigned"} · {notebook.environment || "No environment"}
            </p>
          </div>
          <StatusBadge status={notebook.status} />
        </div>
        <div className="mt-3 flex items-center justify-between text-[9px] text-slate-500">
          <span>{formatNumber(attached.length)} reports</span>
          <span className="font-semibold text-violet-700">{progress}% ready</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <span
            className="block h-full rounded-full bg-violet-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </button>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
        <span className="text-[8px] text-slate-400">
          Updated {formatDateTime(new Date(notebook.updatedAt))}
        </span>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${notebook.name}`}
          className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 size={12} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function ReportRow({ entry, selected, onToggle, onOpenReport }) {
  return (
    <article
      className={`rounded-xl border p-3 transition ${
        selected
          ? "border-violet-200 bg-violet-50/50"
          : "border-slate-200/80 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`${selected ? "Remove" : "Add"} ${entry.title}`}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 accent-violet-600 focus:ring-violet-500"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-slate-800">
                {entry.title}
              </p>
              <p className="mt-1 text-[8px] text-slate-400">
                {entry.category} · {formatDate(entry.date)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <SeverityBadge value={entry.severity} />
              <span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${
                entry.status === "closed"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}>
                {entry.status === "closed" ? "Resolved" : "Open"}
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="truncate text-[8px] text-slate-400">
              {entry.id ? `#${entry.id.slice(-10)}` : "No report ID"}
            </span>
            {onOpenReport && (
              <button
                type="button"
                onClick={() => onOpenReport(entry.report)}
                className="shrink-0 rounded-lg px-2 py-1 text-[9px] font-semibold text-violet-700 hover:bg-violet-100"
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

function ChecklistRow({ item, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 transition hover:border-violet-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 accent-violet-600 focus:ring-violet-500"
      />
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold text-slate-700">
          {item.label}
        </span>
        <span className="mt-0.5 block text-[9px] leading-4 text-slate-400">
          {item.description}
        </span>
      </span>
    </label>
  );
}

function TextField({ label, value, onChange, placeholder, multiline = false }) {
  const common =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100";
  return (
    <label className="block">
      <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={4}
          className={`${common} resize-y leading-4`}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={common}
        />
      )}
    </label>
  );
}

export default function TesterVerificationNotebook({
  reports = [],
  email = "",
  onOpenReport,
}) {
  const [notebooks, setNotebooks] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [notebookFilter, setNotebookFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("severity");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [copyMessage, setCopyMessage] = useState("");
  const [showAllReports, setShowAllReports] = useState(false);

  const entries = useMemo(() => {
    if (!Array.isArray(reports)) return [];
    const seen = new Set();
    return reports
      .filter((report) => report && typeof report === "object")
      .map((report, index) => {
        const id = reportId(report) || `${reportTitle(report)}-${index}`;
        return {
          id,
          report,
          title: reportTitle(report),
          category: reportCategory(report),
          severity: reportSeverity(report),
          status: reportStatus(report),
          date: reportDate(report),
        };
      })
      .filter((entry) => {
        if (seen.has(entry.id)) return false;
        seen.add(entry.id);
        return true;
      });
  }, [reports]);

  useEffect(() => {
    const loaded = loadNotebooks(text(email).toLowerCase());
    setNotebooks(loaded);
    setSelectedId(loaded[0]?.id || "");
    setStorageLoaded(true);
  }, [email]);

  useEffect(() => {
    if (!storageLoaded) return;
    saveNotebooks(text(email).toLowerCase(), notebooks);
  }, [email, notebooks, storageLoaded]);

  const selectedNotebook = useMemo(
    () => notebooks.find((notebook) => notebook.id === selectedId) || null,
    [notebooks, selectedId],
  );

  const visibleNotebooks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notebooks
      .filter((notebook) => notebookFilter === "all" || notebook.status === notebookFilter)
      .filter((notebook) => {
        if (!query) return true;
        return [notebook.name, notebook.owner, notebook.environment, notebook.purpose]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((left, right) => {
        if (sortBy === "title") return left.name.localeCompare(right.name);
        if (sortBy === "newest") return right.updatedAt.localeCompare(left.updatedAt);
        return getNotebookProgress(left) - getNotebookProgress(right);
      });
  }, [notebooks, notebookFilter, search, sortBy]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries
      .filter((entry) => reportStatusFilter === "all" || entry.status === reportStatusFilter)
      .filter((entry) => severityFilter === "all" || entry.severity === severityFilter)
      .filter((entry) => {
        if (!query) return true;
        return [entry.id, entry.title, entry.category, entry.severity]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((left, right) => {
        if (sortBy === "title") return left.title.localeCompare(right.title);
        if (sortBy === "category") return left.category.localeCompare(right.category);
        if (sortBy === "newest") return (right.date?.getTime() || 0) - (left.date?.getTime() || 0);
        return severityRank(left.severity) - severityRank(right.severity);
      });
  }, [entries, reportStatusFilter, search, severityFilter, sortBy]);

  const notebookReports = selectedNotebook
    ? getSelectedReports(selectedNotebook, entries)
    : [];
  const selectedReportIds = new Set(selectedNotebook?.selectedReports || []);
  const progress = selectedNotebook ? getNotebookProgress(selectedNotebook) : 0;
  const completeCount = notebooks.filter((notebook) => notebook.status === "complete").length;
  const activeCount = notebooks.filter((notebook) => notebook.status === "active").length;
  const hasFilters =
    notebookFilter !== "all" ||
    reportStatusFilter !== "all" ||
    severityFilter !== "all" ||
    Boolean(search.trim());

  const updateNotebook = (changes) => {
    if (!selectedId) return;
    setNotebooks((current) =>
      current.map((notebook) =>
        notebook.id === selectedId
          ? { ...notebook, ...changes, updatedAt: new Date().toISOString() }
          : notebook,
      ),
    );
  };

  const createNewNotebook = () => {
    if (notebooks.length >= MAX_NOTEBOOKS) return;
    const notebook = createNotebook();
    setNotebooks((current) => [notebook, ...current]);
    setSelectedId(notebook.id);
    setCopyMessage("");
  };

  const deleteNotebook = (id) => {
    const remaining = notebooks.filter((notebook) => notebook.id !== id);
    setNotebooks(remaining);
    if (selectedId === id) setSelectedId(remaining[0]?.id || "");
  };

  const toggleReport = (id) => {
    if (!selectedNotebook) return;
    const selected = new Set(selectedNotebook.selectedReports);
    if (selected.has(id)) selected.delete(id);
    else if (selected.size < MAX_REPORTS) selected.add(id);
    updateNotebook({ selectedReports: Array.from(selected) });
  };

  const toggleAllVisible = () => {
    if (!selectedNotebook) return;
    const next = new Set(selectedNotebook.selectedReports);
    const allSelected = filteredEntries.every((entry) => next.has(entry.id));
    filteredEntries.forEach((entry) => {
      if (allSelected) next.delete(entry.id);
      else if (next.size < MAX_REPORTS) next.add(entry.id);
    });
    updateNotebook({ selectedReports: Array.from(next).slice(0, MAX_REPORTS) });
  };

  const clearFilters = () => {
    setNotebookFilter("all");
    setReportStatusFilter("all");
    setSeverityFilter("all");
    setSearch("");
    setSortBy("severity");
    setVisibleCount(INITIAL_VISIBLE);
  };

  const copyNotebookSummary = () => {
    if (!selectedNotebook) return;
    copyText(createSummary(selectedNotebook, entries))
      .then(() => {
        setCopyMessage("Summary copied.");
        window.setTimeout(() => setCopyMessage(""), 1800);
      })
      .catch(() => setCopyMessage("Copy unavailable."));
  };

  const exportNotebooks = () => {
    if (!notebooks.length) return;
    downloadText(createCsv(notebooks, entries), "tester-verification-notebooks.csv", "text/csv;charset=utf-8");
  };

  const visibleReportEntries = showAllReports
    ? filteredEntries
    : filteredEntries.slice(0, visibleCount);

  return (
    <section
      aria-labelledby="tester-verification-notebook-heading"
      className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30"
    >
      <header className="border-b border-slate-100 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/50 p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
              <FolderKanban size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-indigo-700">
                Private tester workspace
              </p>
              <h2
                id="tester-verification-notebook-heading"
                className="mt-1 text-base font-semibold tracking-tight text-slate-950"
              >
                Verification notebook
              </h2>
              <p className="mt-1 max-w-2xl text-[10px] leading-4 text-slate-500">
                Keep a browser-local record of test scope, evidence, outcomes,
                and the reports that need attention.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportNotebooks}
              disabled={!notebooks.length}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[9px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Download size={13} aria-hidden="true" />
              Export runs
            </button>
            <button
              type="button"
              onClick={createNewNotebook}
              disabled={notebooks.length >= MAX_NOTEBOOKS}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-[9px] font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Plus size={13} aria-hidden="true" />
              New run
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Metric label="Active runs" value={formatNumber(activeCount)} detail="Browser-local notebooks" tone="bg-indigo-500" />
          <Metric label="Completed" value={formatNumber(completeCount)} detail="Ready to share" tone="bg-emerald-500" />
          <Metric label="Attached reports" value={formatNumber(notebookReports.length)} detail="In selected run" tone="bg-violet-500" />
        </div>
      </header>

      <div className="space-y-4 p-3 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="inline-flex items-center gap-1.5 px-1 text-[11px] font-semibold text-slate-500">
            <Filter size={13} aria-hidden="true" />
            Filter workspace
          </span>
          <SelectControl label="Filter notebooks" value={notebookFilter} options={NOTEBOOK_FILTERS} onChange={setNotebookFilter} />
          <SelectControl label="Filter reports by status" value={reportStatusFilter} options={REPORT_STATUS} onChange={setReportStatusFilter} />
          <SelectControl label="Filter reports by severity" value={severityFilter} options={SEVERITY_OPTIONS} onChange={setSeverityFilter} />
          <SelectControl
            label="Sort notebook content"
            value={sortBy}
            options={[
              { value: "severity", label: "Highest severity" },
              { value: "newest", label: "Newest first" },
              { value: "title", label: "Title A–Z" },
              { value: "category", label: "Category A–Z" },
            ]}
            onChange={setSortBy}
          />
          <label className="relative min-w-[190px] flex-1 sm:max-w-xs">
            <span className="sr-only">Search notebooks and reports</span>
            <Search size={13} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search runs or reports"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-[10px] text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={12} aria-hidden="true" />
              </button>
            )}
          </label>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="inline-flex h-9 items-center justify-center gap-1 rounded-lg px-2 text-[10px] font-semibold text-slate-500 hover:bg-white hover:text-indigo-700">
              <X size={13} aria-hidden="true" />
              Reset
            </button>
          )}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(230px,0.75fr)_minmax(0,1.8fr)]">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-xs font-semibold text-slate-800">Test runs</p>
                <p className="mt-1 text-[9px] text-slate-400">{formatNumber(visibleNotebooks.length)} matching notebooks</p>
              </div>
              <button type="button" onClick={createNewNotebook} aria-label="Create notebook" className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                <Plus size={14} aria-hidden="true" />
              </button>
            </div>
            {visibleNotebooks.length ? (
              <div className="space-y-2">
                {visibleNotebooks.map((notebook) => (
                  <NotebookCard
                    key={notebook.id}
                    notebook={notebook}
                    entries={entries}
                    selected={notebook.id === selectedId}
                    onSelect={() => setSelectedId(notebook.id)}
                    onDelete={() => deleteNotebook(notebook.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <FolderKanban size={20} aria-hidden="true" className="mx-auto text-slate-300" />
                <p className="mt-2 text-[10px] font-semibold text-slate-600">No verification runs yet</p>
                <button type="button" onClick={createNewNotebook} className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-[9px] font-semibold text-white hover:bg-indigo-700">
                  Create a run
                </button>
              </div>
            )}
          </div>

          {selectedNotebook ? (
            <div className="min-w-0 space-y-4">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-indigo-700">Selected run</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900">{selectedNotebook.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedNotebook.status} />
                    <button type="button" onClick={copyNotebookSummary} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-semibold text-slate-600 hover:border-indigo-200 hover:text-indigo-700">
                      {copyMessage === "Summary copied." ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                      {copyMessage || "Copy summary"}
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <TextField label="Run name" value={selectedNotebook.name} onChange={(value) => updateNotebook({ name: value.slice(0, 120) })} placeholder="Checkout smoke test" />
                  <label className="block">
                    <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-500">Status</span>
                    <SelectControl label="Run status" value={selectedNotebook.status} options={NOTEBOOK_STATUS} onChange={(value) => updateNotebook({ status: value })} />
                  </label>
                  <TextField label="Owner" value={selectedNotebook.owner} onChange={(value) => updateNotebook({ owner: value.slice(0, 120) })} placeholder="Tester or team" />
                  <TextField label="Environment" value={selectedNotebook.environment} onChange={(value) => updateNotebook({ environment: value.slice(0, 160) })} placeholder="Chrome · staging · Windows" />
                  <div className="sm:col-span-2">
                    <TextField label="Purpose" value={selectedNotebook.purpose} onChange={(value) => updateNotebook({ purpose: value })} placeholder="What behavior is this run verifying?" multiline />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-700">Readiness</p>
                    <p className="mt-1 text-[9px] text-slate-400">{progress}% of the run checklist is complete</p>
                  </div>
                  <span className="text-sm font-bold text-indigo-700">{progress}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <span className="block h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.75fr)]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Verification checklist</p>
                      <p className="mt-1 text-[9px] text-slate-400">Track the handoff quality of this run.</p>
                    </div>
                    <ListChecks size={17} aria-hidden="true" className="text-indigo-500" />
                  </div>
                  <div className="space-y-2">
                    {CHECKLIST.map((item) => (
                      <ChecklistRow
                        key={item.id}
                        item={item}
                        checked={Boolean(selectedNotebook.checklist[item.id])}
                        onChange={(event) =>
                          updateNotebook({
                            checklist: {
                              ...selectedNotebook.checklist,
                              [item.id]: event.target.checked,
                            },
                          })
                        }
                      />
                    ))}
                  </div>
                  <TextField label="Private notes" value={selectedNotebook.notes} onChange={(value) => updateNotebook({ notes: value })} placeholder="Record observations, blockers, or follow-up context." multiline />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">Attached reports</p>
                      <p className="mt-1 text-[9px] text-slate-400">{formatNumber(notebookReports.length)} selected for this run</p>
                    </div>
                    <BadgeCheck size={17} aria-hidden="true" className="text-emerald-500" />
                  </div>
                  {notebookReports.length ? (
                    <div className="space-y-2">
                      {notebookReports.slice(0, 5).map((entry) => (
                        <div key={entry.id} className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5">
                          <CheckCircle2 size={14} aria-hidden="true" className="shrink-0 text-emerald-500" />
                          <span className="min-w-0 flex-1 truncate text-[9px] font-semibold text-slate-700">{entry.title}</span>
                          <SeverityBadge value={entry.severity} />
                        </div>
                      ))}
                      {notebookReports.length > 5 && <p className="text-center text-[9px] text-slate-400">+{formatNumber(notebookReports.length - 5)} more attached</p>}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center">
                      <FileText size={18} aria-hidden="true" className="mx-auto text-slate-300" />
                      <p className="mt-2 text-[9px] text-slate-500">Select reports below to build this run.</p>
                    </div>
                  )}
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                    <p className="flex items-center gap-1.5 text-[9px] font-semibold text-indigo-800">
                      <Sparkles size={12} aria-hidden="true" />
                      Browser-local only
                    </p>
                    <p className="mt-1 text-[9px] leading-4 text-indigo-700/80">This notebook is private to the current tester browser and does not change server report data.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Add reports to this run</p>
                    <p className="mt-1 text-[9px] text-slate-400">Choose up to {formatNumber(MAX_REPORTS)} reports.</p>
                  </div>
                  <button type="button" onClick={toggleAllVisible} disabled={!filteredEntries.length} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-semibold text-slate-600 hover:border-indigo-200 hover:text-indigo-700 disabled:opacity-45">
                    <Clipboard size={12} aria-hidden="true" />
                    {filteredEntries.length && filteredEntries.every((entry) => selectedReportIds.has(entry.id)) ? "Remove visible" : "Add visible"}
                  </button>
                </div>
                {visibleReportEntries.length ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {visibleReportEntries.map((entry) => (
                      <ReportRow
                        key={entry.id}
                        entry={entry}
                        selected={selectedReportIds.has(entry.id)}
                        onToggle={() => toggleReport(entry.id)}
                        onOpenReport={onOpenReport}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-[10px] text-slate-500">No reports match the current filters.</p>
                )}
                {!showAllReports && filteredEntries.length > visibleCount && (
                  <button type="button" onClick={() => setShowAllReports(true)} className="mx-auto flex items-center gap-1 rounded-lg px-3 py-2 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-50">
                    Show all {formatNumber(filteredEntries.length)} reports
                    <ArrowDownAZ size={12} aria-hidden="true" />
                  </button>
                )}
                {showAllReports && filteredEntries.length > INITIAL_VISIBLE && (
                  <button type="button" onClick={() => setShowAllReports(false)} className="mx-auto flex items-center gap-1 rounded-lg px-3 py-2 text-[10px] font-semibold text-slate-500 hover:bg-slate-50">
                    Show fewer reports
                    <ArrowUpAZ size={12} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid min-h-[420px] place-items-center rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <div>
                <FolderKanban size={28} aria-hidden="true" className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">Create a verification run</p>
                <p className="mx-auto mt-1 max-w-sm text-[10px] leading-4 text-slate-500">Capture scope, checklist progress, and supporting reports in one private workspace.</p>
                <button type="button" onClick={createNewNotebook} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-[9px] font-semibold text-white hover:bg-indigo-700">
                  <Plus size={13} aria-hidden="true" />
                  Start a run
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
