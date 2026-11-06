"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  FileClock,
  History,
  Info,
  RotateCcw,
  Save,
  ShieldAlert,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { createReportAuditSnapshot } from "./ReportDataIntegrityAudit";

const STORAGE_PREFIX = "tester-report-audit-history-v1";
const MAX_SNAPSHOTS = 20;

function getText(value, limit = 320) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function getStorageKey(email) {
  return `${STORAGE_PREFIX}:${email}`;
}

function validTimestamp(value) {
  if (typeof value !== "string") return "";
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
}

function normalizeSnapshot(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const capturedAt = validTimestamp(value.capturedAt);
  if (!capturedAt) return null;
  const records = Array.isArray(value.records)
    ? value.records
        .filter((record) => record && typeof record === "object")
        .slice(0, 10000)
        .map((record, index) => ({
          key: getText(record.key, 400) || `snapshot-row-${index + 1}`,
          id: getText(record.id, 240),
          issues: Array.isArray(record.issues)
            ? record.issues
                .filter(
                  (issue) =>
                    issue &&
                    typeof issue === "object" &&
                    typeof issue.code === "string" &&
                    typeof issue.level === "string",
                )
                .slice(0, 20)
                .map((issue) => ({
                  code: getText(issue.code, 100),
                  level: ["error", "warning", "info"].includes(issue.level)
                    ? issue.level
                    : "info",
                }))
            : [],
        }))
    : [];
  const counts = records.reduce(
    (result, record) => {
      record.issues.forEach((issue) => {
        result.findings += 1;
        result[issue.level] += 1;
      });
      return result;
    },
    { findings: 0, error: 0, warning: 0, info: 0 },
  );
  const suppliedId = getText(value.id, 100);

  return {
    id: suppliedId || `${Date.parse(capturedAt)}-${records.length}`,
    capturedAt,
    reportCount: Number.isFinite(Number(value.reportCount))
      ? Math.max(0, Math.floor(Number(value.reportCount)))
      : records.length,
    findings: counts.findings,
    errors: counts.error,
    warnings: counts.warning,
    info: counts.info,
    records,
  };
}

function normalizeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeSnapshot)
    .filter(Boolean)
    .sort(
      (left, right) =>
        Date.parse(right.capturedAt) - Date.parse(left.capturedAt),
    )
    .slice(0, MAX_SNAPSHOTS);
}

function issueSet(snapshot) {
  const result = new Map();
  (snapshot?.records || []).forEach((record) => {
    record.issues.forEach((issue) => {
      const signature = `${record.key}\u0000${issue.code}`;
      result.set(signature, {
        key: record.key,
        id: record.id,
        code: issue.code,
        level: issue.level,
      });
    });
  });
  return result;
}

function compareSnapshots(current, baseline) {
  const currentIssues = issueSet(current);
  const baselineIssues = issueSet(baseline);
  const added = [];
  const resolved = [];
  const unchanged = [];

  currentIssues.forEach((issue, signature) => {
    if (baselineIssues.has(signature)) unchanged.push(issue);
    else added.push(issue);
  });
  baselineIssues.forEach((issue, signature) => {
    if (!currentIssues.has(signature)) resolved.push(issue);
  });

  const currentKeys = new Set(
    (current?.records || []).map((record) => record.key),
  );
  const baselineKeys = new Set(
    (baseline?.records || []).map((record) => record.key),
  );
  let newReports = 0;
  let absentReports = 0;
  currentKeys.forEach((key) => {
    if (!baselineKeys.has(key)) newReports += 1;
  });
  baselineKeys.forEach((key) => {
    if (!currentKeys.has(key)) absentReports += 1;
  });

  return {
    added,
    resolved,
    unchanged,
    newReports,
    absentReports,
    currentCount: currentIssues.size,
    baselineCount: baselineIssues.size,
    net: currentIssues.size - baselineIssues.size,
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDateTime(value) {
  const timestamp = Date.parse(value || "");
  if (!Number.isFinite(timestamp)) return "Date unavailable";
  return new Date(timestamp).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelative(value, now = Date.now()) {
  const timestamp = Date.parse(value || "");
  if (!Number.isFinite(timestamp)) return "Unknown date";
  const days = Math.max(0, Math.floor((now - timestamp) / 86_400_000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${formatNumber(days)} days ago`;
}

function issueCodeLabel(code) {
  return code
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function downloadComparisonCsv(comparison, current, baseline) {
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = [
    ["Report audit snapshot comparison"],
    ["Current snapshot", current.capturedAt],
    ["Baseline snapshot", baseline.capturedAt],
    ["Current reports", current.reportCount],
    ["Baseline reports", baseline.reportCount],
    ["Current findings", comparison.currentCount],
    ["Baseline findings", comparison.baselineCount],
    ["New findings", comparison.added.length],
    ["Cleared findings", comparison.resolved.length],
    ["New report rows", comparison.newReports],
    ["No longer present", comparison.absentReports],
    [],
    ["Change", "Report ID", "Check code", "Audit level"],
    ...comparison.added.map((issue) => [
      "New",
      issue.id,
      issueCodeLabel(issue.code),
      issue.level,
    ]),
    ...comparison.resolved.map((issue) => [
      "Cleared",
      issue.id,
      issueCodeLabel(issue.code),
      issue.level,
    ]),
    ...comparison.unchanged.map((issue) => [
      "Unchanged",
      issue.id,
      issueCodeLabel(issue.code),
      issue.level,
    ]),
  ];
  const blob = new Blob(
    [`\uFEFF${rows.map((row) => row.map(escape).join(",")).join("\r\n")}`],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `audit-snapshot-diff-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Metric({ label, value, caption, icon: Icon, tone }) {
  const tones = {
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    sky: "border-sky-100 bg-sky-50 text-sky-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
  };
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm shadow-slate-200/20">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[9px] font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-xl font-semibold leading-none text-slate-950 tabular-nums">
            {formatNumber(value)}
          </p>
        </div>
        <span
          className={`grid h-8 w-8 place-items-center rounded-lg border ${tones[tone]}`}
        >
          <Icon size={14} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2.5 text-[8px] leading-4 text-slate-500">{caption}</p>
    </article>
  );
}

function SnapshotOption({ snapshot, index }) {
  return (
    <option value={snapshot.id}>
      {index === 0 ? "Latest" : formatDateTime(snapshot.capturedAt)} ·{" "}
      {snapshot.findings} findings
    </option>
  );
}

function SnapshotTimeline({ snapshots, onSelect, selectedId }) {
  if (!snapshots.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
        <History
          size={17}
          className="mx-auto text-slate-400"
          aria-hidden="true"
        />
        <p className="mt-2 text-[10px] font-semibold text-slate-700">
          No snapshots captured yet
        </p>
        <p className="mt-1 text-[9px] text-slate-500">
          Save a snapshot to start tracking audit changes.
        </p>
      </div>
    );
  }

  const maximum = Math.max(1, ...snapshots.map((snapshot) => snapshot.findings));
  return (
    <div className="space-y-2">
      {snapshots.map((snapshot, index) => (
        <button
          key={snapshot.id}
          type="button"
          onClick={() => onSelect(snapshot.id)}
          aria-pressed={selectedId === snapshot.id}
          className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 ${
            selectedId === snapshot.id
              ? "border-violet-300 bg-violet-50/70"
              : "border-slate-200 bg-white hover:border-violet-200"
          }`}
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 text-slate-500">
            {index === 0 ? (
              <Clock3 size={14} aria-hidden="true" />
            ) : (
              <History size={14} aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0">
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-[9px] font-semibold text-slate-700">
                {formatDateTime(snapshot.capturedAt)}
              </span>
              <span className="shrink-0 text-[8px] text-slate-500">
                {formatRelative(snapshot.capturedAt)}
              </span>
            </span>
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100">
              <span
                className="block h-full rounded-full bg-violet-400"
                style={{
                  width: `${(snapshot.findings / maximum) * 100}%`,
                }}
              />
            </span>
          </span>
          <span className="text-right">
            <span className="block text-xs font-semibold text-slate-800 tabular-nums">
              {formatNumber(snapshot.findings)}
            </span>
            <span className="text-[8px] text-slate-400">
              {formatNumber(snapshot.reportCount)} reports
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

function ChangeSummary({ comparison, baseline, current }) {
  const change = comparison.net;
  const tone =
    change > 0
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : change < 0
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-slate-200 bg-slate-50 text-slate-700";
  const TrendIcon =
    change > 0 ? TrendingUp : change < 0 ? TrendingDown : CheckCircle2;

  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold">
            <TrendIcon size={14} aria-hidden="true" />
            {change > 0
              ? `${formatNumber(change)} more findings`
              : change < 0
                ? `${formatNumber(Math.abs(change))} fewer findings`
                : "Finding count unchanged"}
          </p>
          <p className="mt-1 text-[9px] leading-4 opacity-80">
            Compared {formatDateTime(current.capturedAt)} with{" "}
            {formatDateTime(baseline.capturedAt)}.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-lg border border-current/10 bg-white/70 px-2.5 py-1.5 text-[8px]">
            {comparison.added.length} new
          </span>
          <span className="rounded-lg border border-current/10 bg-white/70 px-2.5 py-1.5 text-[8px]">
            {comparison.resolved.length} cleared
          </span>
        </div>
      </div>
    </div>
  );
}

function ChangeList({ title, items, tone, emptyText }) {
  const [showAll, setShowAll] = useState(false);
  const tones = {
    rose: "border-rose-100 bg-rose-50/50 text-rose-800",
    emerald: "border-emerald-100 bg-emerald-50/50 text-emerald-800",
    slate: "border-slate-200 bg-slate-50 text-slate-800",
  };
  const itemTones = {
    rose: "border-rose-100 bg-white",
    emerald: "border-emerald-100 bg-white",
    slate: "border-slate-100 bg-white",
  };
  const visibleItems = showAll ? items : items.slice(0, 20);
  return (
    <section className={`rounded-2xl border p-3.5 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[10px] font-semibold">{title}</h4>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[8px] font-semibold tabular-nums">
          {formatNumber(items.length)}
        </span>
      </div>
      {items.length ? (
        <>
          <ul className="mt-2 max-h-64 space-y-1.5 overflow-auto">
          {visibleItems.map((item, index) => (
            <li
              key={`${item.key}-${item.code}-${index}`}
              className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 ${itemTones[tone]}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-[8px] font-medium text-slate-700">
                  {item.id ? `#${item.id.slice(-8)}` : "Report without ID"}
                </span>
                <span className="mt-0.5 block truncate text-[8px] text-slate-500">
                  {issueCodeLabel(item.code)}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-slate-50 px-1.5 py-0.5 text-[7px] uppercase text-slate-500">
                {item.level}
              </span>
            </li>
          ))}
          </ul>
          {items.length > 20 && (
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="mt-2 inline-flex min-h-7 items-center gap-1 rounded-lg px-2 text-[8px] font-semibold text-slate-600 transition hover:bg-white hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100"
            >
              {showAll
                ? "Show fewer changes"
                : `Show all ${formatNumber(items.length)} changes`}
              <ChevronDown
                size={10}
                className={showAll ? "rotate-180" : ""}
                aria-hidden="true"
              />
            </button>
          )}
        </>
      ) : (
        <p className="mt-2 rounded-lg border border-dashed border-current/20 bg-white/70 px-2.5 py-3 text-center text-[8px] opacity-70">
          {emptyText}
        </p>
      )}
    </section>
  );
}

function compareCaptureTime(left, right) {
  return Date.parse(right.capturedAt) - Date.parse(left.capturedAt);
}

export default function ReportAuditHistory({ reports = [], email }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loadedEmail, setLoadedEmail] = useState("");
  const [historyReady, setHistoryReady] = useState(false);
  const [baselineId, setBaselineId] = useState("");
  const [storageError, setStorageError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const normalizedEmail = getText(email, 320).toLowerCase();
  const storageKey = normalizedEmail ? getStorageKey(normalizedEmail) : "";
  const currentSnapshot = useMemo(
    () => createReportAuditSnapshot(reports),
    [reports],
  );

  useEffect(() => {
    setSnapshots([]);
    setLoadedEmail("");
    setHistoryReady(false);
    setBaselineId("");
    setStorageError("");
    setNotice("");
    setConfirmClear(false);
    if (!normalizedEmail) return;

    try {
      const saved = window.localStorage.getItem(getStorageKey(normalizedEmail));
      const history = saved ? normalizeHistory(JSON.parse(saved)) : [];
      setSnapshots(history);
      setBaselineId(history[0]?.id || "");
      setHistoryReady(true);
    } catch {
      setStorageError(
        "Could not read the audit history from this browser. Existing saved data was not overwritten.",
      );
    } finally {
      setLoadedEmail(normalizedEmail);
    }
  }, [normalizedEmail]);

  useEffect(() => {
    if (
      !storageKey ||
      loadedEmail !== normalizedEmail ||
      !normalizedEmail ||
      !historyReady
    ) {
      return;
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(snapshots));
      setStorageError("");
    } catch {
      setStorageError(
        "Audit history is available in this view but could not be saved to browser storage.",
      );
    }
  }, [historyReady, loadedEmail, normalizedEmail, snapshots, storageKey]);

  const baseline = snapshots.find((snapshot) => snapshot.id === baselineId);
  const comparison = baseline
    ? compareSnapshots(currentSnapshot, baseline)
    : null;
  const recentTrend = [...snapshots]
    .sort(compareCaptureTime)
    .slice(0, 8)
    .reverse();
  const newestSnapshot = snapshots[0];
  const currentHasFindings = currentSnapshot.findings > 0;
  const hasSavedBaseline = snapshots.length > 0;

  const handleCapture = () => {
    setNotice("");
    setStorageError("");
    if (!normalizedEmail) {
      setStorageError(
        "A tester email is required to save a private audit snapshot.",
      );
      return;
    }
    if (!historyReady) {
      setStorageError(
        "Saved audit history could not be loaded safely, so this snapshot was not written.",
      );
      return;
    }
    const capturedAt = new Date().toISOString();
    const snapshot = {
      ...currentSnapshot,
      id: `${Date.parse(capturedAt)}-${snapshots.length + 1}`,
    };
    const next = [snapshot, ...snapshots]
      .sort(compareCaptureTime)
      .slice(0, MAX_SNAPSHOTS);
    setSnapshots(next);
    setBaselineId(snapshot.id);
    setNotice(
      `Snapshot saved with ${formatNumber(snapshot.findings)} findings across ${formatNumber(
        snapshot.reportCount,
      )} reports.`,
    );
    setConfirmClear(false);
  };

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setSnapshots([]);
    setBaselineId("");
    setConfirmClear(false);
    setNotice("Saved local audit history cleared.");
  };

  const handleExport = () => {
    setStorageError("");
    setNotice("");
    if (!comparison || !baseline) return;
    try {
      downloadComparisonCsv(comparison, currentSnapshot, baseline);
      setNotice("Snapshot comparison downloaded. No report descriptions were included.");
    } catch {
      setStorageError(
        "Could not create the comparison file. Check browser download permissions and try again.",
      );
    }
  };

  return (
    <section className="mt-4 overflow-hidden rounded-[22px] border border-violet-100 bg-white shadow-sm shadow-violet-100/30">
      <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50/70 via-white to-sky-50/50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-violet-100 bg-white text-violet-700">
                <FileClock size={17} aria-hidden="true" />
              </span>
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[9px] font-semibold text-violet-700">
                Local audit snapshots
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-semibold text-slate-600">
                {snapshots.length}/{MAX_SNAPSHOTS} saved
              </span>
            </div>
            <h2 className="mt-2.5 text-sm font-semibold tracking-tight text-slate-950">
              Audit history and change tracking
            </h2>
            <p className="mt-1 text-[10px] leading-5 text-slate-600">
              Capture the current audit, then compare new findings against a
              saved baseline. History is private to this browser and tester
              email; it is not sent to the server.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCapture}
              disabled={
                !normalizedEmail ||
                loadedEmail !== normalizedEmail ||
                !historyReady
              }
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-[9px] font-semibold text-white transition hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save size={12} aria-hidden="true" />
              Capture snapshot
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={!comparison}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download size={12} aria-hidden="true" />
              Export diff
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2.5 text-[8px] leading-4 text-sky-900/80">
          <Database size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            Stored snapshot data is minimized to report IDs, check codes,
            severity levels, counts, and capture time. Descriptions, URLs,
            titles, and notes are not saved.
          </p>
        </div>
      </div>

      <div className="space-y-3.5 p-4">
        {storageError && (
          <p
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[9px] leading-4 text-amber-800"
          >
            {storageError}
          </p>
        )}
        {!normalizedEmail && (
          <p
            role="status"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[9px] leading-4 text-slate-600"
          >
            Search for your reports using your tester email to enable browser-local snapshots.
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[9px] leading-4 text-emerald-800"
          >
            {notice}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Current findings"
            value={currentSnapshot.findings}
            caption={`${currentSnapshot.errors} errors · ${currentSnapshot.warnings} warnings · ${currentSnapshot.info} info`}
            icon={currentHasFindings ? AlertTriangle : CheckCircle2}
            tone={currentHasFindings ? "amber" : "emerald"}
          />
          <Metric
            label="Current report set"
            value={currentSnapshot.reportCount}
            caption="Reports included in current audit snapshot"
            icon={BarChart3}
            tone="violet"
          />
          <Metric
            label="Latest saved"
            value={newestSnapshot ? newestSnapshot.findings : 0}
            caption={
              newestSnapshot
                ? formatRelative(newestSnapshot.capturedAt)
                : "No baseline saved yet"
            }
            icon={Clock3}
            tone="sky"
          />
          <Metric
            label="Finding change"
            value={comparison ? Math.abs(comparison.net) : 0}
            caption={
              comparison
                ? comparison.net > 0
                  ? "More than selected baseline"
                  : comparison.net < 0
                    ? "Fewer than selected baseline"
                    : "Same total as selected baseline"
                : "Capture a snapshot to compare"
            }
            icon={
              comparison?.net > 0
                ? ArrowUpRight
                : comparison?.net < 0
                  ? ArrowDownRight
                  : RotateCcw
            }
            tone={
              comparison?.net > 0
                ? "rose"
                : comparison?.net < 0
                  ? "emerald"
                  : "sky"
            }
          />
        </div>

        {comparison && baseline ? (
          <>
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
              <div className="space-y-3">
                <ChangeSummary
                  comparison={comparison}
                  baseline={baseline}
                  current={currentSnapshot}
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric
                    label="New findings"
                    value={comparison.added.length}
                    caption="Not present in the selected baseline"
                    icon={ArrowUpRight}
                    tone="rose"
                  />
                  <Metric
                    label="Cleared findings"
                    value={comparison.resolved.length}
                    caption="No longer present on matching report rows"
                    icon={ArrowDownRight}
                    tone="emerald"
                  />
                  <Metric
                    label="Reports no longer present"
                    value={comparison.absentReports}
                    caption="Separated from findings cleared on existing reports"
                    icon={Info}
                    tone="sky"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <ChangeList
                    title="New findings"
                    items={comparison.added}
                    tone="rose"
                    emptyText="No new findings since this baseline."
                  />
                  <ChangeList
                    title="Cleared on matching reports"
                    items={comparison.resolved}
                    tone="emerald"
                    emptyText="No findings were cleared on matching reports."
                  />
                </div>
              </div>
              <aside className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[10px] font-semibold text-slate-800">
                    Choose a baseline
                  </h3>
                  <History size={13} className="text-violet-500" aria-hidden="true" />
                </div>
                <label className="mt-2 block">
                  <span className="sr-only">Select audit history baseline</span>
                  <span className="relative block">
                    <select
                      value={baselineId}
                      onChange={(event) => setBaselineId(event.target.value)}
                      className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-2.5 pr-8 text-[9px] text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                    >
                      {snapshots.map((snapshot, index) => (
                        <SnapshotOption
                          key={snapshot.id}
                          snapshot={snapshot}
                          index={index}
                        />
                      ))}
                    </select>
                    <ChevronDown
                      size={11}
                      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                  </span>
                </label>
                <p className="mt-2 text-[8px] leading-4 text-slate-500">
                  The current report set is compared with this saved capture.
                  Older snapshots provide a longer-term baseline.
                </p>
                <div className="mt-3 rounded-xl border border-white bg-white p-3">
                  <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">
                    Selected baseline
                  </p>
                  <p className="mt-1 text-[9px] font-medium text-slate-700">
                    {formatDateTime(baseline.capturedAt)}
                  </p>
                  <p className="mt-1 text-[8px] text-slate-500">
                    {formatNumber(baseline.reportCount)} reports ·{" "}
                    {formatNumber(baseline.findings)} findings
                  </p>
                </div>
              </aside>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <ChangeList
                title="Unchanged findings"
                items={comparison.unchanged}
                tone="slate"
                emptyText="No findings persist from the baseline."
              />
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
                <p className="text-[10px] font-semibold text-slate-800">
                  Comparison scope
                </p>
                <ul className="mt-2 space-y-1.5 text-[8px] leading-4 text-slate-500">
                  <li>
                    {formatNumber(comparison.newReports)} report rows appeared
                    since the baseline.
                  </li>
                  <li>
                    {formatNumber(comparison.absentReports)} baseline rows are
                    absent from the current report set; these are not counted
                    as cleared findings.
                  </li>
                  <li>
                    Findings match on report ID plus occurrence number and
                    check code. Duplicate or missing IDs can make comparisons
                    less certain.
                  </li>
                </ul>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-3 text-[9px] leading-4 text-sky-900/75">
            <Info size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              {hasSavedBaseline
                ? "Choose a saved baseline to compare it with the current report audit."
                : "Capture your first snapshot to establish a baseline. Each capture stores only audit codes and report IDs."}
            </p>
          </div>
        )}

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-[10px] font-semibold text-slate-800">
                Snapshot history
              </h3>
              <span className="text-[8px] text-slate-400">
                Newest first · max {MAX_SNAPSHOTS}
              </span>
            </div>
            <SnapshotTimeline
              snapshots={snapshots}
              selectedId={baselineId}
              onSelect={setBaselineId}
            />
            {snapshots.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <p className="text-[8px] text-slate-500">
                  Oldest snapshots are removed when the history limit is reached.
                </p>
                {!confirmClear ? (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex min-h-7 items-center gap-1 rounded-lg px-2 text-[8px] font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <Trash2 size={10} aria-hidden="true" />
                    Clear history
                  </button>
                ) : (
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    <span className="text-[8px] text-rose-700">
                      Remove all local snapshots?
                    </span>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="rounded-md bg-rose-600 px-2 py-1 text-[8px] font-semibold text-white hover:bg-rose-700"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[8px] font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-[10px] font-semibold text-slate-800">
                  Recent findings trend
                </h3>
                <p className="mt-1 text-[8px] text-slate-500">
                  Total findings at each saved capture.
                </p>
              </div>
              <BarChart3 size={13} className="text-violet-500" aria-hidden="true" />
            </div>
            {recentTrend.length > 0 ? (
              <div className="mt-3 space-y-2">
                {recentTrend.map((snapshot, index) => {
                  const previous = recentTrend[index - 1];
                  const delta = previous
                    ? snapshot.findings - previous.findings
                    : 0;
                  return (
                    <div
                      key={snapshot.id}
                      className="grid grid-cols-[72px_1fr_42px] items-center gap-2"
                    >
                      <span className="text-[8px] text-slate-500">
                        {formatDateTime(snapshot.capturedAt).split(",")[0]}
                      </span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <span
                          className="block h-full rounded-full bg-violet-400"
                          style={{
                            width: `${
                              recentTrend.length
                                ? Math.max(
                                    snapshot.findings ? 3 : 0,
                                    (snapshot.findings /
                                      Math.max(
                                        1,
                                        ...recentTrend.map(
                                          (item) => item.findings,
                                        ),
                                      )) *
                                      100,
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </span>
                      <span className="text-right text-[8px] font-semibold text-slate-700 tabular-nums">
                        {formatNumber(snapshot.findings)}
                        {previous && delta !== 0 && (
                          <span
                            className={
                              delta > 0 ? "text-rose-600" : "text-emerald-600"
                            }
                          >
                            {" "}
                            {delta > 0 ? "+" : ""}
                            {delta}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-slate-50 px-3 py-5 text-center text-[8px] text-slate-500">
                No saved captures to chart.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-3.5">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-violet-900">
              <CheckCircle2 size={12} aria-hidden="true" />
              What counts as cleared
            </p>
            <p className="mt-1.5 text-[8px] leading-4 text-violet-900/75">
              A finding is marked cleared only when the same report occurrence
              and check code are present in the baseline but absent from the
              current audit. Reports removed from the current dataset are
              counted separately.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3.5">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-950">
              <AlertTriangle size={12} aria-hidden="true" />
              Local history is not a server backup
            </p>
            <p className="mt-1.5 text-[8px] leading-4 text-amber-900/75">
              Browser storage may be cleared by device or browser settings.
              Capture comparisons are advisory and depend on the report set
              returned each time.
            </p>
          </div>
        </div>

        {normalizedEmail && loadedEmail !== normalizedEmail && (
          <p
            role="status"
            className="text-[8px] text-slate-400"
          >
            Loading local audit history for this tester…
          </p>
        )}
      </div>
    </section>
  );
}
