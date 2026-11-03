"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Download,
  FileJson2,
  Info,
  Merge,
  ShieldAlert,
  Upload,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

const BACKUP_FORMAT = "tester-page-checklist";
const BACKUP_VERSION = 1;
const MAX_BACKUP_BYTES = 1_000_000;
const MAX_PREVIEW_ROWS = 6;
const VALID_STATUSES = new Set(["not-tested", "passed", "issue-found"]);
const BUTTON_CLASS =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40";

function parseHttpUrl(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

function makeBackup(scenarios, activeScenarioId, origin) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    origin,
    activeScenarioId,
    privacyNote:
      "Contains full page URLs including query values and fragments, plus tester notes. Keep this file private.",
    scenarios: scenarios.map((scenario) => {
      const url = parseHttpUrl(scenario.url);
      if (!url || url.origin !== origin) {
        throw new Error("A checklist page does not match this website.");
      }

      url.username = "";
      url.password = "";
      return { ...scenario, url: url.href };
    }),
  };
}

function createScenarioId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `page-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isValidTimestamp(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function validateImportedScenario(value, origin, index) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    typeof value.id !== "string" ||
    !value.id.trim() ||
    typeof value.title !== "string" ||
    typeof value.url !== "string" ||
    typeof value.notes !== "string" ||
    !VALID_STATUSES.has(value.status)
  ) {
    throw new Error(`Page ${index + 1} has missing or invalid fields.`);
  }

  const url = parseHttpUrl(value.url);
  if (!url) {
    throw new Error(`Page ${index + 1} does not contain a valid HTTP or HTTPS URL.`);
  }
  if (url.origin !== origin) {
    throw new Error(`Page ${index + 1} belongs to a different website.`);
  }
  if (value.title.length > 100 || value.notes.length > 1000) {
    throw new Error(`Page ${index + 1} exceeds the supported name or note length.`);
  }

  url.username = "";
  url.password = "";
  return {
    id: value.id.slice(0, 120),
    title: value.title.trim() || "Untitled page",
    url: url.href,
    status: value.status,
    checkedAt: isValidTimestamp(value.checkedAt) ? value.checkedAt : null,
    notes: value.notes,
    createdAt: isValidTimestamp(value.createdAt)
      ? value.createdAt
      : new Date().toISOString(),
    updatedAt: isValidTimestamp(value.updatedAt)
      ? value.updatedAt
      : new Date().toISOString(),
  };
}

function parseBackup(text, origin) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    payload.format !== BACKUP_FORMAT ||
    payload.version !== BACKUP_VERSION ||
    payload.origin !== origin ||
    !Array.isArray(payload.scenarios)
  ) {
    throw new Error(
      "Choose a version 1 checklist backup made for this exact website.",
    );
  }
  if (!payload.scenarios.length) {
    throw new Error("This backup contains no checklist pages to restore.");
  }

  const scenarios = payload.scenarios.map((scenario, index) =>
    validateImportedScenario(scenario, origin, index),
  );
  const ids = scenarios.map((scenario) => scenario.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("This backup contains duplicate page identifiers.");
  }
  const urls = scenarios.map((scenario) => scenario.url);
  if (new Set(urls).size !== urls.length) {
    throw new Error("This backup contains duplicate page destinations.");
  }
  if (
    payload.activeScenarioId &&
    !ids.includes(payload.activeScenarioId)
  ) {
    throw new Error("The backup’s active page is not included in its page list.");
  }

  return {
    scenarios,
    activeScenarioId:
      typeof payload.activeScenarioId === "string"
        ? payload.activeScenarioId
        : "",
    origin: payload.origin,
    exportedAt: isValidTimestamp(payload.exportedAt)
      ? payload.exportedAt
      : "",
  };
}

function saveTextFile(content, filename) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

function formatDate(value) {
  if (!isValidTimestamp(value)) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusLabel(status) {
  if (status === "passed") return "Passed";
  if (status === "issue-found") return "Issue found";
  return "Not tested";
}

function getScenarioCounts(scenarios) {
  return scenarios.reduce(
    (counts, scenario) => {
      counts[scenario.status] += 1;
      return counts;
    },
    { "not-tested": 0, passed: 0, "issue-found": 0 },
  );
}

function getImportPlan(backup, currentScenarios, currentActiveId, mode) {
  if (mode === "replace") {
    const idMap = new Map(
      backup.scenarios.map((scenario) => [scenario.id, createScenarioId()]),
    );
    const scenarios = backup.scenarios.map((scenario) => ({
      ...scenario,
      id: idMap.get(scenario.id),
    }));
    return {
      scenarios,
      activeScenarioId: idMap.get(backup.activeScenarioId) || scenarios[0]?.id || "",
      addedCount: scenarios.length,
      skippedCount: 0,
      replacedCount: currentScenarios.length,
    };
  }

  const currentByUrl = new Map(
    currentScenarios.map((scenario) => [scenario.url, scenario]),
  );
  const existingIds = new Set(currentScenarios.map((scenario) => scenario.id));
  const importedIdMap = new Map();
  const added = [];
  let skippedCount = 0;

  backup.scenarios.forEach((scenario) => {
    const existing = currentByUrl.get(scenario.url);
    if (existing) {
      importedIdMap.set(scenario.id, existing.id);
      skippedCount += 1;
      return;
    }

    let id = createScenarioId();
    while (existingIds.has(id)) id = createScenarioId();
    existingIds.add(id);
    importedIdMap.set(scenario.id, id);
    added.push({ ...scenario, id });
  });

  const importedActiveId = importedIdMap.get(backup.activeScenarioId) || "";
  return {
    scenarios: [...currentScenarios, ...added],
    activeScenarioId: currentActiveId || importedActiveId,
    addedCount: added.length,
    skippedCount,
    replacedCount: 0,
  };
}

function BackupMetric({ label, value, tone = "neutral" }) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-slate-200 bg-white text-slate-800";

  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
      <p className="text-[9px] font-medium opacity-70">{label}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}

function StatusSummary({ scenarios }) {
  const counts = getScenarioCounts(scenarios);

  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Page result counts">
      <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-700">
        {counts["not-tested"]} not tested
      </span>
      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-800">
        {counts.passed} passed
      </span>
      <span className="rounded-full bg-rose-50 px-2 py-1 text-[9px] font-semibold text-rose-800">
        {counts["issue-found"]} issues
      </span>
    </div>
  );
}

function PrivacyNotice() {
  return (
    <div
      className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3"
      role="note"
    >
      <ShieldAlert
        size={14}
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-amber-700"
      />
      <div>
        <p className="text-[10px] font-semibold text-amber-950">
          Backups contain private checklist data
        </p>
        <p className="mt-1 text-[9px] leading-4 text-amber-900">
          The JSON file includes full URLs, query values, fragments, and page
          notes. Store it securely and inspect it before sharing.
        </p>
      </div>
    </div>
  );
}

function BackupSummary({ scenarios, origin }) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex items-start gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-800">
          <FileJson2 size={15} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h4 className="text-[10px] font-semibold text-slate-900">
            Current checklist backup
          </h4>
          <p className="mt-0.5 break-all text-[9px] text-slate-500">{origin}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <BackupMetric label="Pages" value={scenarios.length} />
        <BackupMetric
          label="Not tested"
          value={getScenarioCounts(scenarios)["not-tested"]}
        />
        <BackupMetric
          label="Passed"
          value={getScenarioCounts(scenarios).passed}
          tone="success"
        />
        <BackupMetric
          label="Issues"
          value={getScenarioCounts(scenarios)["issue-found"]}
          tone="warning"
        />
      </div>
    </div>
  );
}

function BackupHeader({ isOpen, onToggle, pageCount }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls="checklist-backup-panel"
      className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-100 text-sky-800">
        <FileJson2 size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-slate-900">
          Checklist backup and restore
        </span>
        <span className="mt-0.5 block text-[9px] text-slate-500">
          Export a portable JSON backup or preview one before importing.
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-600">
        {pageCount} page{pageCount === 1 ? "" : "s"}
      </span>
      <span aria-hidden="true" className="text-xs text-slate-400">
        {isOpen ? "−" : "+"}
      </span>
    </button>
  );
}

function BackupActions({
  pageCount,
  isReading,
  onExport,
  onChooseFile,
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onExport}
        disabled={!pageCount}
        className={`${BUTTON_CLASS} border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100`}
      >
        <Download size={12} aria-hidden="true" />
        Export JSON backup
      </button>
      <button
        type="button"
        onClick={onChooseFile}
        disabled={isReading}
        className={`${BUTTON_CLASS} border-violet-200 bg-white text-violet-800 hover:bg-violet-50`}
      >
        <Upload size={12} aria-hidden="true" />
        {isReading ? "Reading backup…" : "Choose backup"}
      </button>
    </div>
  );
}

function BackupFormatHelp() {
  return (
    <details className="rounded-lg border border-slate-200 bg-white">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[10px] font-semibold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
        <Info size={12} aria-hidden="true" className="text-sky-700" />
        Backup format and limits
      </summary>
      <ul className="space-y-1.5 border-t border-slate-100 px-3 py-2.5 text-[9px] leading-4 text-slate-600">
        <li>Only version 1 backups from the same website origin are accepted.</li>
        <li>Import files must be smaller than 1 MB.</li>
        <li>
          Page results, names, notes, timestamps, and destinations are included.
        </li>
        <li>
          Invalid pages reject the whole backup so no partial restore is applied.
        </li>
        <li>
          Imported page IDs are regenerated to avoid conflicts with existing
          checklist items.
        </li>
      </ul>
    </details>
  );
}

function ImportFileSummary({ backup, fileName }) {
  return (
    <div className="space-y-2 rounded-xl border border-sky-200 bg-sky-50/50 p-3">
      <div className="flex items-start gap-2">
        <Check
          size={14}
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-emerald-700"
        />
        <div className="min-w-0">
          <p className="break-all text-[10px] font-semibold text-slate-900">
            {fileName}
          </p>
          <p className="mt-0.5 text-[9px] text-slate-600">
            {backup.exportedAt
              ? `Exported ${formatDate(backup.exportedAt)}`
              : "Export time not available"}
          </p>
        </div>
      </div>
      <StatusSummary scenarios={backup.scenarios} />
    </div>
  );
}

function ImportModeSelector({ mode, onChange, currentCount }) {
  return (
    <fieldset className="grid gap-2 sm:grid-cols-2">
      <legend className="mb-1 text-[10px] font-semibold text-slate-800">
        How should this backup be applied?
      </legend>
      <label
        className={`flex min-h-14 cursor-pointer items-start gap-2 rounded-xl border p-3 transition ${
          mode === "merge"
            ? "border-sky-300 bg-sky-50"
            : "border-slate-200 bg-white hover:bg-slate-50"
        }`}
      >
        <input
          type="radio"
          name="checklist-backup-mode"
          value="merge"
          checked={mode === "merge"}
          onChange={() => onChange("merge")}
          className="mt-0.5 h-4 w-4 border-slate-300 text-sky-700 focus:ring-sky-500"
        />
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-100 text-sky-800">
          <Merge size={14} aria-hidden="true" />
        </span>
        <span>
          <span className="block text-[10px] font-semibold text-slate-900">
            Merge pages
          </span>
          <span className="mt-0.5 block text-[9px] leading-4 text-slate-600">
            Keep the current {currentCount} page{currentCount === 1 ? "" : "s"}.
            Matching destinations are skipped.
          </span>
        </span>
      </label>
      <label
        className={`flex min-h-14 cursor-pointer items-start gap-2 rounded-xl border p-3 transition ${
          mode === "replace"
            ? "border-rose-300 bg-rose-50"
            : "border-slate-200 bg-white hover:bg-slate-50"
        }`}
      >
        <input
          type="radio"
          name="checklist-backup-mode"
          value="replace"
          checked={mode === "replace"}
          onChange={() => onChange("replace")}
          className="mt-0.5 h-4 w-4 border-slate-300 text-rose-700 focus:ring-rose-500"
        />
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-100 text-rose-800">
          <AlertCircle size={14} aria-hidden="true" />
        </span>
        <span>
          <span className="block text-[10px] font-semibold text-slate-900">
            Replace checklist
          </span>
          <span className="mt-0.5 block text-[9px] leading-4 text-slate-600">
            Replace all current pages with this backup. This cannot be undone.
          </span>
        </span>
      </label>
    </fieldset>
  );
}

function ImportPlanMetrics({ plan, mode }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <BackupMetric
        label={mode === "replace" ? "Restored" : "Pages to add"}
        value={plan.addedCount}
        tone="success"
      />
      <BackupMetric
        label="Duplicate destinations"
        value={plan.skippedCount}
        tone={plan.skippedCount ? "warning" : "neutral"}
      />
      <BackupMetric
        label="Current pages"
        value={plan.replacedCount}
        tone={mode === "replace" && plan.replacedCount ? "warning" : "neutral"}
      />
      <BackupMetric label="Resulting pages" value={plan.scenarios.length} />
    </div>
  );
}

function ImportPreviewList({ scenarios, mode }) {
  const previewScenarios = scenarios.slice(0, MAX_PREVIEW_ROWS);
  const remainingCount = scenarios.length - previewScenarios.length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-[10px] font-semibold text-slate-800">
          {mode === "replace" ? "Pages to restore" : "New pages to add"}
        </h4>
        <span className="text-[9px] text-slate-500">
          Names and results only
        </span>
      </div>
      {previewScenarios.length ? (
        <ul className="mt-2 space-y-1.5">
          {previewScenarios.map((scenario, index) => (
            <li
              key={scenario.id}
              className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2"
            >
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[9px] font-semibold tabular-nums text-slate-500">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-[10px] font-medium text-slate-800">
                  {scenario.title || "Untitled page"}
                </span>
                <span className="mt-0.5 block text-[9px] text-slate-500">
                  {getStatusLabel(scenario.status)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-4 text-center text-[10px] text-slate-600">
          No new pages will be added because every destination is already in the
          checklist.
        </p>
      )}
      {remainingCount > 0 && (
        <p className="mt-2 text-right text-[9px] text-slate-500">
          And {remainingCount} more page{remainingCount === 1 ? "" : "s"}.
        </p>
      )}
    </div>
  );
}

function ReplaceConfirmation({ checked, onChange, currentCount }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-rose-300 text-rose-700 focus:ring-rose-500"
      />
      <span className="text-[9px] leading-4 text-rose-900">
        I understand this replaces the current {currentCount} page
        {currentCount === 1 ? "" : "s"} and cannot be undone.
      </span>
    </label>
  );
}

function ImportError({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div
      className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5"
      role="alert"
    >
      <AlertCircle
        size={14}
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-rose-700"
      />
      <p className="min-w-0 flex-1 text-[10px] leading-4 text-rose-900">
        {message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss import error"
        className="grid h-6 w-6 shrink-0 place-items-center rounded text-rose-700 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
      >
        <X size={12} aria-hidden="true" />
      </button>
    </div>
  );
}

function ImportPreview({
  backup,
  fileName,
  plan,
  mode,
  onModeChange,
  confirmReplace,
  onConfirmReplaceChange,
  onApply,
  onClear,
  currentCount,
  isApplying,
}) {
  const canApply =
    mode === "replace"
      ? confirmReplace
      : plan.addedCount > 0 || !currentCount;

  return (
    <section
      aria-labelledby="checklist-import-preview-title"
      className="space-y-3 rounded-xl border border-sky-200 bg-white p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3
            id="checklist-import-preview-title"
            className="text-xs font-semibold text-slate-900"
          >
            Import preview
          </h3>
          <p className="mt-0.5 text-[9px] leading-4 text-slate-500">
            Review the planned result before applying this backup.
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg px-2 py-1 text-[9px] font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          Remove preview
        </button>
      </div>
      <ImportFileSummary backup={backup} fileName={fileName} />
      <ImportModeSelector
        mode={mode}
        onChange={onModeChange}
        currentCount={currentCount}
      />
      <ImportPlanMetrics plan={plan} mode={mode} />
      <ImportPreviewList
        scenarios={mode === "replace" ? backup.scenarios : plan.scenarios.slice(currentCount)}
        mode={mode}
      />
      {mode === "replace" && (
        <ReplaceConfirmation
          checked={confirmReplace}
          onChange={onConfirmReplaceChange}
          currentCount={currentCount}
        />
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[9px] leading-4 text-slate-500">
          Import adds pages to this page only; no data is uploaded.
        </p>
        <button
          type="button"
          onClick={onApply}
          disabled={!canApply || isApplying}
          className={`${BUTTON_CLASS} ${
            mode === "replace"
              ? "border-rose-700 bg-rose-700 text-white hover:bg-rose-800"
              : "border-sky-700 bg-sky-700 text-white hover:bg-sky-800"
          }`}
        >
          {mode === "replace" ? (
            <AlertCircle size={12} aria-hidden="true" />
          ) : (
            <Check size={12} aria-hidden="true" />
          )}
          {isApplying
            ? "Applying…"
            : mode === "replace"
              ? "Replace checklist"
              : `Merge ${plan.addedCount} page${plan.addedCount === 1 ? "" : "s"}`}
        </button>
      </div>
    </section>
  );
}

export default function ChecklistBackupWorkspace({
  scenarios,
  activeScenarioId,
  origin,
  onApplyBackup,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [backup, setBackup] = useState(null);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState("merge");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [error, setError] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const fileInputRef = useRef(null);

  const plan = useMemo(
    () =>
      backup && backup.origin === origin
        ? getImportPlan(backup, scenarios, activeScenarioId, mode)
        : null,
    [backup, scenarios, activeScenarioId, mode, origin],
  );

  const handleExport = () => {
    if (!scenarios.length) {
      toast.info("Add at least one page before exporting a checklist backup.");
      return;
    }

    try {
      const payload = makeBackup(scenarios, activeScenarioId, origin);
      saveTextFile(
        JSON.stringify(payload, null, 2),
        `page-test-checklist-${new Date().toISOString().slice(0, 10)}.json`,
      );
      toast.success(
        `Exported a backup with ${scenarios.length} page${scenarios.length === 1 ? "" : "s"}.`,
      );
    } catch (exportError) {
      toast.error(
        exportError instanceof Error
          ? exportError.message
          : "Could not export this checklist backup.",
      );
    }
  };

  const clearPreview = () => {
    setBackup(null);
    setFileName("");
    setConfirmReplace(false);
    setMode("merge");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleChooseFile = () => {
    setError("");
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_BACKUP_BYTES) {
      setError("Checklist backup files must be smaller than 1 MB.");
      setBackup(null);
      setFileName("");
      return;
    }

    setIsReading(true);
    setError("");
    try {
      const parsed = parseBackup(await file.text(), origin);
      setBackup(parsed);
      setFileName(file.name);
      setMode("merge");
      setConfirmReplace(false);
    } catch (parseError) {
      setBackup(null);
      setFileName("");
      setError(
        parseError instanceof Error
          ? parseError.message
          : "Could not read this checklist backup.",
      );
    } finally {
      setIsReading(false);
    }
  };

  const handleApply = () => {
    if (!backup || !plan) return;
    if (backup.origin !== origin) {
      setError("The page destination changed. Choose a backup for this website.");
      return;
    }
    if (mode === "replace" && !confirmReplace) {
      setError("Confirm that you want to replace the current checklist.");
      return;
    }
    if (mode === "merge" && !plan.addedCount && scenarios.length) {
      setError("This backup has no new destinations to merge.");
      return;
    }

    setIsApplying(true);
    try {
      onApplyBackup({
        scenarios: plan.scenarios,
        activeScenarioId: plan.activeScenarioId,
      });
      toast.success(
        mode === "replace"
          ? `Restored ${plan.scenarios.length} page${plan.scenarios.length === 1 ? "" : "s"} from backup.`
          : `Added ${plan.addedCount} page${plan.addedCount === 1 ? "" : "s"}; skipped ${plan.skippedCount} existing destination${plan.skippedCount === 1 ? "" : "s"}.`,
      );
      clearPreview();
    } catch {
      setError("The checklist could not be updated. Your current pages remain in place.");
      toast.error("Could not apply this checklist backup.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setConfirmReplace(false);
    setError("");
  };

  const handleClosePanel = () => {
    setIsOpen(false);
    setError("");
  };

  return (
    <section
      aria-label="Checklist backup and restore"
      className="overflow-hidden rounded-xl border border-sky-200 bg-white"
    >
      <BackupHeader
        isOpen={isOpen}
        onToggle={() => setIsOpen((open) => !open)}
        pageCount={scenarios.length}
      />
      {isOpen && (
        <div
          id="checklist-backup-panel"
          className="space-y-3 border-t border-sky-100 bg-slate-50/50 p-3 sm:p-4"
        >
          <PrivacyNotice />
          <BackupSummary scenarios={scenarios} origin={origin} />
          <BackupActions
            pageCount={scenarios.length}
            isReading={isReading}
            onExport={handleExport}
            onChooseFile={handleChooseFile}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            aria-label="Choose a checklist JSON backup"
            onChange={handleFileChange}
            className="sr-only"
          />
          <ImportError message={error} onDismiss={() => setError("")} />
          {backup && !plan && (
            <ImportError
              message="The current website changed after this backup was selected. Choose a backup for the current website."
              onDismiss={clearPreview}
            />
          )}
          {backup && plan && (
            <ImportPreview
              backup={backup}
              fileName={fileName}
              plan={plan}
              mode={mode}
              onModeChange={handleModeChange}
              confirmReplace={confirmReplace}
              onConfirmReplaceChange={setConfirmReplace}
              onApply={handleApply}
              onClear={clearPreview}
              currentCount={scenarios.length}
              isApplying={isApplying}
            />
          )}
          <BackupFormatHelp />
          <div className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-[9px] leading-4 text-slate-500">
              Files are read locally in your browser. The backup is not sent to
              the bug tracker.
            </p>
            <button
              type="button"
              onClick={handleClosePanel}
              className="shrink-0 rounded px-2 py-1 text-[9px] font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
