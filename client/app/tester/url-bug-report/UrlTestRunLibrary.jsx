"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookmarkPlus,
  Check,
  Clock3,
  Copy,
  Download,
  FolderOpen,
  Pencil,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

const STORAGE_KEY_PREFIX = "tester-url-test-runs-v1";
const MAX_SAVED_RUNS = 8;
const MAX_SCENARIOS_PER_RUN = 50;
const MAX_RUN_NAME_LENGTH = 72;
const MAX_IMPORT_BYTES = 1_000_000;

const RUN_BUTTON =
  "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40";

function createRunId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseHttpUrl(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

function isValidTimestamp(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isValidScenario(value, origin) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.url !== "string" ||
    typeof value.notes !== "string"
  ) {
    return false;
  }

  const parsedUrl = parseHttpUrl(value.url);
  return (
    parsedUrl?.origin === origin &&
    ["not-tested", "passed", "issue-found"].includes(value.status)
  );
}

function normalizeScenario(value) {
  const now = new Date().toISOString();
  const parsedUrl = parseHttpUrl(value.url);
  if (!parsedUrl) {
    throw new Error("A saved test page contains an invalid URL.");
  }
  parsedUrl.username = "";
  parsedUrl.password = "";

  return {
    id: value.id.slice(0, 120),
    title: value.title.trim().slice(0, 100) || "Untitled page",
    url: parsedUrl.href,
    status: value.status,
    checkedAt: isValidTimestamp(value.checkedAt) ? value.checkedAt : null,
    notes: value.notes.slice(0, 1000),
    createdAt: isValidTimestamp(value.createdAt) ? value.createdAt : now,
    updatedAt: isValidTimestamp(value.updatedAt) ? value.updatedAt : now,
  };
}

function normalizeRun(value, origin) {
  const now = new Date().toISOString();
  const scenarios = value.scenarios
    .filter((scenario) => isValidScenario(scenario, origin))
    .slice(0, MAX_SCENARIOS_PER_RUN)
    .map(normalizeScenario);
  const activeScenarioId =
    typeof value.activeScenarioId === "string" &&
    scenarios.some((scenario) => scenario.id === value.activeScenarioId)
      ? value.activeScenarioId
      : "";

  return {
    id:
      typeof value.id === "string" && value.id
        ? value.id.slice(0, 120)
        : createRunId(),
    name:
      typeof value.name === "string" && value.name.trim()
        ? value.name.trim().slice(0, MAX_RUN_NAME_LENGTH)
        : "Untitled test run",
    origin,
    scenarios,
    activeScenarioId,
    createdAt: isValidTimestamp(value.createdAt) ? value.createdAt : now,
    updatedAt: isValidTimestamp(value.updatedAt) ? value.updatedAt : now,
  };
}

function readSavedRuns(storageKey, origin) {
  const storedValue = window.sessionStorage.getItem(storageKey);
  if (!storedValue) return [];

  const parsedValue = JSON.parse(storedValue);
  if (!Array.isArray(parsedValue)) {
    throw new Error("Saved test runs have an invalid format.");
  }

  return parsedValue
    .filter(
      (run) =>
        run &&
        typeof run === "object" &&
        !Array.isArray(run) &&
        run.origin === origin &&
        typeof run.name === "string" &&
        Array.isArray(run.scenarios),
    )
    .slice(0, MAX_SAVED_RUNS)
    .map((run) => normalizeRun(run, origin));
}

function writeSavedRuns(storageKey, runs) {
  window.sessionStorage.setItem(
    storageKey,
    JSON.stringify(runs.slice(0, MAX_SAVED_RUNS)),
  );
}

function makeRunsExport(runs, origin) {
  return {
    format: "tester-url-test-runs",
    version: 1,
    exportedAt: new Date().toISOString(),
    origin,
    privacyNote:
      "Includes full page URLs, query values, fragments, and tester notes. Keep this backup private.",
    runs: runs.map((run) => ({
      id: run.id,
      name: run.name,
      origin: run.origin,
      scenarios: run.scenarios,
      activeScenarioId: run.activeScenarioId,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    })),
  };
}

function parseRunsImport(text, origin) {
  const payload = JSON.parse(text);
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    payload.format !== "tester-url-test-runs" ||
    payload.version !== 1 ||
    payload.origin !== origin ||
    !Array.isArray(payload.runs) ||
    payload.runs.length === 0
  ) {
    throw new Error(
      "Choose a version 1 test-run backup created for this exact website.",
    );
  }

  if (payload.runs.length > MAX_SAVED_RUNS) {
    throw new Error(
      `The backup has more than ${MAX_SAVED_RUNS} test runs and cannot be imported.`,
    );
  }

  return payload.runs.map((run, runIndex) => {
    if (
      !run ||
      typeof run !== "object" ||
      Array.isArray(run) ||
      run.origin !== origin ||
      typeof run.name !== "string" ||
      !run.name.trim() ||
      !Array.isArray(run.scenarios) ||
      run.scenarios.length === 0 ||
      run.scenarios.length > MAX_SCENARIOS_PER_RUN
    ) {
      throw new Error(`Test run ${runIndex + 1} has invalid or unsupported data.`);
    }

    const invalidScenario = run.scenarios.some(
      (scenario) => !isValidScenario(scenario, origin),
    );
    if (invalidScenario) {
      throw new Error(
        `Test run “${run.name.slice(0, MAX_RUN_NAME_LENGTH)}” contains a page from another website or invalid page data.`,
      );
    }

    const originalScenarioIds = run.scenarios.map((scenario) => scenario.id);
    if (new Set(originalScenarioIds).size !== originalScenarioIds.length) {
      throw new Error(
        `Test run “${run.name.slice(0, MAX_RUN_NAME_LENGTH)}” contains duplicate page identifiers.`,
      );
    }
    if (
      run.activeScenarioId &&
      !originalScenarioIds.includes(run.activeScenarioId)
    ) {
      throw new Error(
        `Test run “${run.name.slice(0, MAX_RUN_NAME_LENGTH)}” references a missing active page.`,
      );
    }

    const scenarioIds = new Map(
      run.scenarios.map((scenario) => [scenario.id, createRunId()]),
    );
    const scenarios = run.scenarios.map((scenario) =>
      normalizeScenario({
        ...scenario,
        id: scenarioIds.get(scenario.id),
      }),
    );

    return normalizeRun(
      {
        ...run,
        id: createRunId(),
        name: `${run.name.trim()} (imported)`.slice(
          0,
          MAX_RUN_NAME_LENGTH,
        ),
        scenarios,
        activeScenarioId:
          scenarioIds.get(run.activeScenarioId) || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      origin,
    );
  });
}

function downloadRunsFile(runs, origin) {
  const content = JSON.stringify(makeRunsExport(runs, origin), null, 2);
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = downloadUrl;
  anchor.download = `tester-url-test-runs-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

function getRunCounts(scenarios) {
  return scenarios.reduce(
    (counts, scenario) => {
      if (scenario.status in counts) counts[scenario.status] += 1;
      return counts;
    },
    { "not-tested": 0, passed: 0, "issue-found": 0 },
  );
}

function getStatusLabel(status) {
  if (status === "passed") return "Passed";
  if (status === "issue-found") return "Issue found";
  return "Not tested";
}

function compareRunScenarios(leftRun, rightRun) {
  const matchedRightIds = new Set();
  const changes = [];

  leftRun.scenarios.forEach((leftScenario) => {
    const rightScenario =
      rightRun.scenarios.find(
        (scenario) =>
          !matchedRightIds.has(scenario.id) &&
          scenario.url === leftScenario.url,
      ) ||
      rightRun.scenarios.find(
        (scenario) =>
          !matchedRightIds.has(scenario.id) &&
          scenario.title.trim().toLowerCase() ===
            leftScenario.title.trim().toLowerCase(),
      );

    if (!rightScenario) {
      changes.push({
        id: `removed-${leftScenario.id}`,
        kind: "removed",
        title: leftScenario.title,
        details: ["Page removed"],
      });
      return;
    }

    matchedRightIds.add(rightScenario.id);
    const details = [
      leftScenario.title !== rightScenario.title && "Name changed",
      leftScenario.url !== rightScenario.url && "Destination changed",
      leftScenario.status !== rightScenario.status &&
        `Result: ${getStatusLabel(leftScenario.status)} → ${getStatusLabel(rightScenario.status)}`,
      leftScenario.notes !== rightScenario.notes && "Notes changed",
    ].filter(Boolean);

    if (details.length) {
      changes.push({
        id: `changed-${leftScenario.id}`,
        kind: "changed",
        title: rightScenario.title,
        details,
      });
    }
  });

  rightRun.scenarios.forEach((rightScenario) => {
    if (matchedRightIds.has(rightScenario.id)) return;
    changes.push({
      id: `added-${rightScenario.id}`,
      kind: "added",
      title: rightScenario.title,
      details: ["Page added"],
    });
  });

  return changes;
}

function formatRunDate(value) {
  if (!isValidTimestamp(value)) return "Date unavailable";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function makeSnapshot(scenarios, activeScenarioId) {
  return {
    scenarios: scenarios.map((scenario) => ({
      id: scenario.id,
      title: scenario.title,
      url: scenario.url,
      status: scenario.status,
      checkedAt: scenario.checkedAt,
      notes: scenario.notes,
      createdAt: scenario.createdAt,
      updatedAt: scenario.updatedAt,
    })),
    activeScenarioId,
  };
}

function areSnapshotsEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getSnapshotChanges(savedSnapshot, currentSnapshot) {
  const savedPages = new Map(
    savedSnapshot.scenarios.map((scenario) => [scenario.id, scenario]),
  );
  const currentPages = new Map(
    currentSnapshot.scenarios.map((scenario) => [scenario.id, scenario]),
  );
  const changes = [];

  currentSnapshot.scenarios.forEach((currentScenario) => {
    const savedScenario = savedPages.get(currentScenario.id);
    if (!savedScenario) {
      changes.push({
        id: `added-${currentScenario.id}`,
        kind: "added",
        title: currentScenario.title,
        detail: "Page added",
      });
      return;
    }

    const changedFields = [
      savedScenario.title !== currentScenario.title && "name",
      savedScenario.url !== currentScenario.url && "destination",
      savedScenario.status !== currentScenario.status && "result",
      savedScenario.notes !== currentScenario.notes && "notes",
      savedScenario.checkedAt !== currentScenario.checkedAt && "check time",
    ].filter(Boolean);

    if (changedFields.length) {
      changes.push({
        id: `updated-${currentScenario.id}`,
        kind: "updated",
        title: currentScenario.title,
        detail: `Changed: ${changedFields.join(", ")}`,
      });
    }
  });

  savedSnapshot.scenarios.forEach((savedScenario) => {
    if (currentPages.has(savedScenario.id)) return;
    changes.push({
      id: `removed-${savedScenario.id}`,
      kind: "removed",
      title: savedScenario.title,
      detail: "Page removed",
    });
  });

  if (savedSnapshot.activeScenarioId !== currentSnapshot.activeScenarioId) {
    changes.push({
      id: "active-page",
      kind: "updated",
      title: "Active report destination",
      detail: "The active page changed",
    });
  }

  return changes;
}

function SnapshotChangeSummary({ changes }) {
  const visibleChanges = changes.slice(0, 5);
  const remainingCount = changes.length - visibleChanges.length;

  return (
    <details className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60">
      <summary className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[10px] font-semibold text-amber-900 outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
        <span>Review {changes.length} unsaved change{changes.length === 1 ? "" : "s"}</span>
        <span className="text-[9px] font-medium text-amber-700">
          Names and fields only
        </span>
      </summary>
      <ul className="space-y-1.5 border-t border-amber-200 px-2.5 py-2">
        {visibleChanges.map((change) => (
          <li key={change.id} className="min-w-0 text-[10px] leading-4">
            <span
              className={`font-semibold ${
                change.kind === "added"
                  ? "text-emerald-800"
                  : change.kind === "removed"
                    ? "text-rose-800"
                    : "text-amber-900"
              }`}
            >
              {change.detail}
            </span>
            <span className="ml-1 break-words text-slate-700">
              {change.title}
            </span>
          </li>
        ))}
        {remainingCount > 0 && (
          <li className="text-[9px] text-slate-500">
            And {remainingCount} more change{remainingCount === 1 ? "" : "s"}.
          </li>
        )}
      </ul>
    </details>
  );
}

function RunCounts({ scenarios }) {
  const counts = getRunCounts(scenarios);

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-slate-500">
      <span>{scenarios.length} pages</span>
      <span>{counts["not-tested"]} not tested</span>
      <span className="text-emerald-700">{counts.passed} passed</span>
      <span className="text-rose-700">{counts["issue-found"]} issues</span>
    </div>
  );
}

function RunComparisonPanel({ leftRun, rightRun, onClear }) {
  const changes = compareRunScenarios(leftRun, rightRun);
  const counts = changes.reduce(
    (result, change) => {
      result[change.kind] += 1;
      return result;
    },
    { added: 0, removed: 0, changed: 0 },
  );

  return (
    <section
      aria-labelledby="saved-run-comparison-title"
      className="rounded-xl border border-violet-200 bg-violet-50/40 p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4
            id="saved-run-comparison-title"
            className="text-xs font-semibold text-slate-900"
          >
            Comparing {leftRun.name} with {rightRun.name}
          </h4>
          <p className="mt-1 text-[9px] text-slate-500">
            Baseline updated {formatRunDate(leftRun.updatedAt)} · Comparison
            updated {formatRunDate(rightRun.updatedAt)}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-600">
            <span>{counts.added} added</span>
            <span>{counts.removed} removed</span>
            <span>{counts.changed} changed</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg px-2 py-1 text-[10px] font-semibold text-violet-800 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          Clear comparison
        </button>
      </div>

      {changes.length ? (
        <ul className="mt-3 space-y-1.5" aria-label="Saved run differences">
          {changes.map((change) => (
            <li
              key={change.id}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-lg border border-violet-100 bg-white px-2.5 py-2 text-[10px]"
            >
              <span
                className={`font-semibold ${
                  change.kind === "added"
                    ? "text-emerald-800"
                    : change.kind === "removed"
                      ? "text-rose-800"
                      : "text-violet-800"
                }`}
              >
                {change.details.join(" · ")}
              </span>
              <span className="break-words text-slate-700">{change.title}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-lg border border-violet-100 bg-white px-2.5 py-2 text-[10px] text-slate-600">
          These saved runs have the same pages, results, destinations, and notes.
        </p>
      )}
      <p className="mt-2 text-[9px] text-slate-500">
        Note contents and full destinations are not shown.
      </p>
    </section>
  );
}

function RunAction({
  icon: Icon,
  label,
  onClick,
  tone = "neutral",
  disabled = false,
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
      : tone === "primary"
        ? "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100"
        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${RUN_BUTTON} ${toneClass}`}
    >
      <Icon size={12} aria-hidden="true" />
      {label}
    </button>
  );
}

function SavedRunCard({
  run,
  isActive,
  isDirty,
  isRenaming,
  isConfirmingDelete,
  onLoad,
  onDuplicate,
  onStartRename,
  onRename,
  onCancelRename,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}) {
  const [nameDraft, setNameDraft] = useState(run.name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isRenaming) {
      setNameDraft(run.name);
      return;
    }

    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isRenaming, run.name]);

  const submitRename = (event) => {
    event.preventDefault();
    const nextName = nameDraft.trim();

    if (!nextName) {
      toast.error("Enter a name for this test run.");
      return;
    }

    onRename(run.id, nextName);
  };

  return (
    <article
      className={`rounded-xl border p-3 ${
        isActive
          ? "border-violet-300 bg-violet-50/40"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
            isActive
              ? "bg-violet-100 text-violet-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          <FolderOpen size={13} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          {isRenaming ? (
            <form
              onSubmit={submitRename}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <label className="min-w-0 flex-1">
                <span className="sr-only">New test run name</span>
                <input
                  ref={inputRef}
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  maxLength={MAX_RUN_NAME_LENGTH}
                  className="min-h-9 w-full rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-violet-100"
                />
                <span className="mt-1 block text-right text-[9px] tabular-nums text-slate-400">
                  {nameDraft.length}/{MAX_RUN_NAME_LENGTH}
                </span>
              </label>
              <div className="flex gap-1.5">
                <RunAction
                  icon={Check}
                  label="Save name"
                  tone="primary"
                  onClick={() => onRename(run.id, nameDraft.trim())}
                />
                <RunAction
                  icon={X}
                  label="Cancel"
                  onClick={onCancelRename}
                />
              </div>
            </form>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="break-words text-xs font-semibold text-slate-900">
                  {run.name}
                </h4>
                {isActive && (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-semibold text-violet-800">
                    Current run
                  </span>
                )}
                {isActive && isDirty && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-900">
                    Unsaved changes
                  </span>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1 text-[9px] text-slate-400">
                <Clock3 size={10} aria-hidden="true" />
                Updated {formatRunDate(run.updatedAt)}
              </p>
            </>
          )}

          {!isRenaming && (
            <>
              <div className="mt-2">
                <RunCounts scenarios={run.scenarios} />
              </div>
              {isConfirmingDelete ? (
                <div
                  className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-rose-50 p-2"
                  role="alert"
                >
                  <p className="mr-auto text-[10px] font-medium text-rose-800">
                    Delete this saved test run?
                  </p>
                  <button
                    type="button"
                    onClick={() => onCancelDelete(run.id)}
                    className="rounded px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-white"
                  >
                    Keep
                  </button>
                  <button
                    type="button"
                    onClick={() => onConfirmDelete(run.id)}
                    className="rounded bg-rose-700 px-2 py-1 text-[10px] font-semibold text-white hover:bg-rose-800"
                  >
                    Delete
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <RunAction
                    icon={FolderOpen}
                    label={isActive ? "Loaded" : "Load run"}
                    tone="primary"
                    disabled={isActive}
                    onClick={() => onLoad(run)}
                  />
                  <RunAction
                    icon={Pencil}
                    label="Rename"
                    onClick={() => onStartRename(run.id)}
                  />
                  <RunAction
                    icon={Copy}
                    label="Duplicate"
                    onClick={() => onDuplicate(run)}
                  />
                  <RunAction
                    icon={Trash2}
                    label="Delete"
                    tone="danger"
                    onClick={() => onRequestDelete(run.id)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default function UrlTestRunLibrary({
  value,
  scenarios,
  activeScenarioId,
  onLoadRun,
}) {
  const parsedUrl = useMemo(() => parseHttpUrl(value), [value]);
  const origin = parsedUrl?.origin || "";
  const storageKey = origin
    ? `${STORAGE_KEY_PREFIX}:${encodeURIComponent(origin)}`
    : "";
  const [runs, setRuns] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [runName, setRunName] = useState("");
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("all");
  const [comparisonRunIds, setComparisonRunIds] = useState({
    left: "",
    right: "",
  });
  const [activeRunId, setActiveRunId] = useState("");
  const [renamingRunId, setRenamingRunId] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const [confirmDiscardChanges, setConfirmDiscardChanges] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const importInputRef = useRef(null);

  const currentSnapshot = useMemo(
    () => makeSnapshot(scenarios, activeScenarioId),
    [scenarios, activeScenarioId],
  );

  useEffect(() => {
    setRuns([]);
    setActiveRunId("");
    setComparisonRunIds({ left: "", right: "" });
    setSearch("");
    setResultFilter("all");
    setIsLoaded(false);
    if (!storageKey || !origin) {
      setIsLoaded(true);
      return;
    }

    try {
      setRuns(readSavedRuns(storageKey, origin));
    } catch {
      toast.error("Could not read saved test runs for this website.");
    } finally {
      setIsLoaded(true);
    }
  }, [origin, storageKey]);

  const activeRun = runs.find((run) => run.id === activeRunId) || null;
  const leftComparisonRun =
    runs.find((run) => run.id === comparisonRunIds.left) || null;
  const rightComparisonRun =
    runs.find((run) => run.id === comparisonRunIds.right) || null;
  const activeSnapshot = activeRun
    ? makeSnapshot(activeRun.scenarios, activeRun.activeScenarioId)
    : null;
  const isActiveRunDirty =
    activeSnapshot !== null &&
    !areSnapshotsEqual(currentSnapshot, activeSnapshot);
  const activeRunChanges =
    isActiveRunDirty && activeSnapshot
      ? getSnapshotChanges(activeSnapshot, currentSnapshot)
      : [];
  const filteredRuns = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return runs.filter((run) => {
      const counts = getRunCounts(run.scenarios);
      const matchesResult =
        resultFilter === "issues"
          ? counts["issue-found"] > 0
          : resultFilter === "passed"
            ? run.scenarios.length > 0 &&
              counts.passed === run.scenarios.length
            : resultFilter === "untested"
              ? counts["not-tested"] > 0
              : true;
      if (!matchesResult) return false;
      if (!normalizedSearch) return true;

      const matchesName = run.name.toLowerCase().includes(normalizedSearch);
      const matchesPage = run.scenarios.some(
        (scenario) =>
          scenario.title.toLowerCase().includes(normalizedSearch) ||
          scenario.url.toLowerCase().includes(normalizedSearch),
      );
      return matchesName || matchesPage;
    });
  }, [runs, search, resultFilter]);

  const commitRuns = (nextRuns) => {
    if (!storageKey) {
      toast.error("A valid website destination is required to save a run.");
      return false;
    }

    try {
      const boundedRuns = nextRuns.slice(0, MAX_SAVED_RUNS);
      writeSavedRuns(storageKey, boundedRuns);
      setRuns(boundedRuns);
      return true;
    } catch {
      toast.error(
        "Could not save this test run in the current browser session.",
      );
      return false;
    }
  };

  const getCurrentRunName = () => {
    const name = runName.trim();
    if (name) return name.slice(0, MAX_RUN_NAME_LENGTH);

    return `Test run ${new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date())}`;
  };

  const handleSaveRun = (event) => {
    event.preventDefault();
    if (!scenarios.length) {
      toast.info("Add at least one page before saving a test run.");
      return;
    }
    if (scenarios.length > MAX_SCENARIOS_PER_RUN) {
      toast.error(`A test run can contain up to ${MAX_SCENARIOS_PER_RUN} pages.`);
      return;
    }
    if (!isLoaded) return;
    if (runs.length >= MAX_SAVED_RUNS) {
      toast.error(
        `You can save up to ${MAX_SAVED_RUNS} test runs for this website.`,
      );
      return;
    }

    const now = new Date().toISOString();
    const run = normalizeRun(
      {
        id: createRunId(),
        name: getCurrentRunName(),
        scenarios: currentSnapshot.scenarios,
        activeScenarioId,
        createdAt: now,
        updatedAt: now,
      },
      origin,
    );

    if (commitRuns([run, ...runs])) {
      setActiveRunId(run.id);
      setRunName("");
      setAnnouncement(`${run.name} saved for this browser session.`);
      toast.success(`Saved "${run.name}" for this browser session.`);
    }
  };

  const handleSaveChanges = () => {
    if (!activeRun || !isActiveRunDirty) return;

    const updatedRun = normalizeRun(
      {
        ...activeRun,
        scenarios: currentSnapshot.scenarios,
        activeScenarioId,
        updatedAt: new Date().toISOString(),
      },
      origin,
    );
    const nextRuns = runs.map((run) =>
      run.id === updatedRun.id ? updatedRun : run,
    );

    if (commitRuns(nextRuns)) {
      setAnnouncement(`Changes to ${updatedRun.name} saved.`);
      toast.success("Test run changes saved.");
    }
  };

  const handleDiscardChanges = () => {
    if (!activeRun || !isActiveRunDirty) {
      setConfirmDiscardChanges(false);
      return;
    }

    onLoadRun({
      scenarios: activeRun.scenarios.map((scenario) => ({ ...scenario })),
      activeScenarioId: activeRun.activeScenarioId,
    });
    setConfirmDiscardChanges(false);
    setAnnouncement(`Unsaved changes to ${activeRun.name} were discarded.`);
    toast.info("Unsaved changes discarded; the saved run was restored.");
  };

  const handleLoadRun = (run) => {
    onLoadRun({
      scenarios: run.scenarios.map((scenario) => ({ ...scenario })),
      activeScenarioId: run.activeScenarioId,
    });
    setActiveRunId(run.id);
    setAnnouncement(`${run.name} loaded.`);
    toast.success(`Loaded "${run.name}".`);
  };

  const handleDuplicateRun = (sourceRun) => {
    if (runs.length >= MAX_SAVED_RUNS) {
      toast.error(
        `You can save up to ${MAX_SAVED_RUNS} test runs for this website.`,
      );
      return;
    }

    const now = new Date().toISOString();
    const scenarioIds = new Map(
      sourceRun.scenarios.map((scenario) => [scenario.id, createRunId()]),
    );
    const duplicate = normalizeRun(
      {
        ...sourceRun,
        id: createRunId(),
        name: `${sourceRun.name} (copy)`.slice(0, MAX_RUN_NAME_LENGTH),
        scenarios: sourceRun.scenarios.map((scenario) => ({
          ...scenario,
          id: scenarioIds.get(scenario.id),
        })),
        activeScenarioId: scenarioIds.get(sourceRun.activeScenarioId) || "",
        createdAt: now,
        updatedAt: now,
      },
      origin,
    );

    if (commitRuns([duplicate, ...runs])) {
      setAnnouncement(`${duplicate.name} duplicated.`);
      toast.success(`Duplicated "${sourceRun.name}".`);
    }
  };

  const handleRenameRun = (runId, name) => {
    if (!name) {
      toast.error("Enter a name for this test run.");
      return;
    }

    const nextRuns = runs.map((run) =>
      run.id === runId
        ? {
            ...run,
            name: name.slice(0, MAX_RUN_NAME_LENGTH),
            updatedAt: new Date().toISOString(),
          }
        : run,
    );

    if (commitRuns(nextRuns)) {
      setRenamingRunId("");
      setAnnouncement(`Test run renamed to ${name}.`);
    }
  };

  const handleDeleteRun = (runId) => {
    const deletedRun = runs.find((run) => run.id === runId);
    const nextRuns = runs.filter((run) => run.id !== runId);

    if (commitRuns(nextRuns)) {
      if (activeRunId === runId) setActiveRunId("");
      setComparisonRunIds((current) => ({
        left: current.left === runId ? "" : current.left,
        right: current.right === runId ? "" : current.right,
      }));
      setConfirmDeleteId("");
      setAnnouncement(`${deletedRun?.name || "Test run"} deleted.`);
      toast.success("Saved test run deleted.");
    }
  };

  const handleClearCurrent = () => {
    setActiveRunId("");
    setAnnouncement("The current checklist is now an unsaved run.");
    toast.info("Current checklist changes are not saved to a run.");
  };

  const handleExportRuns = () => {
    if (!runs.length) {
      toast.info("There are no saved test runs to export.");
      return;
    }

    try {
      downloadRunsFile(runs, origin);
      toast.success(
        `Exported ${runs.length} saved test run${runs.length === 1 ? "" : "s"}.`,
      );
    } catch {
      toast.error("Could not export saved test runs.");
    }
  };

  const handleImportRuns = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_IMPORT_BYTES) {
      toast.error("Test-run backup files must be smaller than 1 MB.");
      return;
    }
    if (!isLoaded) {
      toast.error("Wait for saved test runs to finish loading before importing.");
      return;
    }

    try {
      const importedRuns = parseRunsImport(await file.text(), origin);
      if (runs.length + importedRuns.length > MAX_SAVED_RUNS) {
        toast.error(
          `Import would exceed the ${MAX_SAVED_RUNS}-run limit. Delete saved runs first.`,
        );
        return;
      }

      if (commitRuns([...importedRuns, ...runs])) {
        setAnnouncement(
          `Imported ${importedRuns.length} test run${importedRuns.length === 1 ? "" : "s"}.`,
        );
        toast.success(
          `Imported ${importedRuns.length} test run${importedRuns.length === 1 ? "" : "s"}.`,
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not import this test-run backup.",
      );
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setResultFilter("all");
  };

  const canSaveNewRun = scenarios.length > 0 && runs.length < MAX_SAVED_RUNS;
  const remainingSlots = MAX_SAVED_RUNS - runs.length;

  return (
    <section
      aria-labelledby="url-test-run-library-title"
      className="mb-6 overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-3 bg-gradient-to-r from-sky-50 via-white to-violet-50 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white bg-white text-sky-700 shadow-sm">
            <BookmarkPlus size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="url-test-run-library-title"
                className="text-sm font-semibold text-slate-950"
              >
                Saved test runs
              </h2>
              {activeRun && (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-semibold text-sky-800">
                  {activeRun.name}
                </span>
              )}
            </div>
            <p className="mt-1 max-w-xl text-xs leading-5 text-slate-600">
              Save named snapshots of this site’s checklist and return to them
              later in this browser session.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls="url-test-run-library-content"
          className={`${RUN_BUTTON} shrink-0 border-sky-200 bg-white text-sky-800 hover:bg-sky-50`}
        >
          {isOpen ? "Hide saved runs" : `Manage runs · ${runs.length}`}
        </button>
      </div>

      {isOpen && (
        <div
          id="url-test-run-library-content"
          className="space-y-4 border-t border-sky-100 p-4 sm:p-5"
        >
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportRuns}
            aria-label="Import test-run backup file"
            className="sr-only"
          />
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(220px,1fr)]">
            <form
              onSubmit={handleSaveRun}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
            >
              <div className="flex items-center gap-2">
                <Save
                  size={14}
                  aria-hidden="true"
                  className="text-violet-700"
                />
                <h3 className="text-xs font-semibold text-slate-800">
                  Save current checklist
                </h3>
              </div>
              <label className="mt-2 block text-[10px] font-semibold text-slate-600">
                Run name
                <input
                  value={runName}
                  onChange={(event) => setRunName(event.target.value)}
                  maxLength={MAX_RUN_NAME_LENGTH}
                  placeholder="e.g. Checkout regression"
                  disabled={!isLoaded}
                  className="mt-1.5 min-h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
                <span className="mt-1 flex justify-end text-[9px] font-normal tabular-nums text-slate-400">
                  {runName.length}/{MAX_RUN_NAME_LENGTH}
                </span>
              </label>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[9px] text-slate-500">
                  {scenarios.length}/{MAX_SCENARIOS_PER_RUN} pages ·{" "}
                  {remainingSlots} save slots
                </p>
                <button
                  type="submit"
                  disabled={!canSaveNewRun || !isLoaded}
                  className={`${RUN_BUTTON} border-violet-700 bg-violet-700 text-white hover:bg-violet-800`}
                >
                  <BookmarkPlus size={12} aria-hidden="true" />
                  Save as new run
                </button>
              </div>
            </form>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <Clock3
                  size={14}
                  aria-hidden="true"
                  className="text-sky-700"
                />
                <h3 className="text-xs font-semibold text-slate-800">
                  Current run
                </h3>
              </div>
              <div className="mt-2">
                <RunCounts scenarios={scenarios} />
              </div>
              {activeRun && isActiveRunDirty ? (
                <>
                  <SnapshotChangeSummary changes={activeRunChanges} />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveChanges}
                      className={`${RUN_BUTTON} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}
                    >
                      <Check size={12} aria-hidden="true" />
                      Save changes
                    </button>
                    <button
                      type="button"
                      onClick={handleClearCurrent}
                      className={`${RUN_BUTTON} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
                    >
                      <X size={12} aria-hidden="true" />
                      Detach run
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDiscardChanges((confirming) => !confirming)
                      }
                      className={`${RUN_BUTTON} border-rose-200 bg-white text-rose-700 hover:bg-rose-50`}
                    >
                      <X size={12} aria-hidden="true" />
                      Discard changes
                    </button>
                  </div>
                  {confirmDiscardChanges && (
                    <div
                      role="alert"
                      className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3"
                    >
                      <p className="text-xs font-semibold text-rose-900">
                        Restore the saved version of “{activeRun.name}”?
                      </p>
                      <p className="mt-1 text-[10px] leading-4 text-rose-800">
                        This replaces the current checklist with the saved
                        pages, results, and notes. This action cannot be undone.
                      </p>
                      <div className="mt-2 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDiscardChanges(false)}
                          className={`${RUN_BUTTON} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
                        >
                          Keep my changes
                        </button>
                        <button
                          type="button"
                          onClick={handleDiscardChanges}
                          className={`${RUN_BUTTON} border-rose-700 bg-rose-700 text-white hover:bg-rose-800`}
                        >
                          Restore saved run
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-3 text-[10px] leading-4 text-slate-500">
                  {activeRun
                    ? "The loaded checklist matches its saved snapshot."
                    : "This checklist is not linked to a saved run."}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-800">
                Your saved runs
              </h3>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Stored in this tab only and scoped to {origin || "this website"}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                disabled={!isLoaded || !origin}
                className={`${RUN_BUTTON} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
              >
                <Upload size={12} aria-hidden="true" />
                Import backup
              </button>
              <button
                type="button"
                onClick={handleExportRuns}
                disabled={!runs.length}
                className={`${RUN_BUTTON} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
              >
                <Download size={12} aria-hidden="true" />
                Export backup
              </button>
              {runs.length > 0 && (
                <>
                  <label>
                    <span className="sr-only">Filter runs by result</span>
                    <select
                      value={resultFilter}
                      onChange={(event) => setResultFilter(event.target.value)}
                      className="min-h-8 max-w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    >
                      <option value="all">All results</option>
                      <option value="issues">Contains issues</option>
                      <option value="passed">All pages passed</option>
                      <option value="untested">Contains untested pages</option>
                    </select>
                  </label>
                  <label className="relative min-w-0 sm:w-52">
                    <Search
                      size={13}
                      aria-hidden="true"
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <span className="sr-only">Search saved test runs</span>
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search runs or pages"
                      className="min-h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[10px] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                  </label>
                </>
              )}
            </div>
          </div>

          {isLoaded && runs.length > 0 && (
            <p className="text-[10px] text-slate-500" aria-live="polite">
              Showing {filteredRuns.length} of {runs.length} saved run
              {runs.length === 1 ? "" : "s"}
            </p>
          )}

          {isLoaded && runs.length > 1 && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div>
                <h3 className="text-xs font-semibold text-slate-800">
                  Compare saved runs
                </h3>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Choose two snapshots to review page and result differences.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-[10px] font-semibold text-slate-600">
                  Baseline run
                  <select
                    value={comparisonRunIds.left}
                    onChange={(event) =>
                      setComparisonRunIds((current) => ({
                        ...current,
                        left: event.target.value,
                      }))
                    }
                    className="mt-1 min-h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-normal text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  >
                    <option value="">Choose a saved run</option>
                    {runs.map((run) => (
                      <option
                        key={run.id}
                        value={run.id}
                        disabled={run.id === comparisonRunIds.right}
                      >
                        {run.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[10px] font-semibold text-slate-600">
                  Comparison run
                  <select
                    value={comparisonRunIds.right}
                    onChange={(event) =>
                      setComparisonRunIds((current) => ({
                        ...current,
                        right: event.target.value,
                      }))
                    }
                    className="mt-1 min-h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-normal text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  >
                    <option value="">Choose a saved run</option>
                    {runs.map((run) => (
                      <option
                        key={run.id}
                        value={run.id}
                        disabled={run.id === comparisonRunIds.left}
                      >
                        {run.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {leftComparisonRun && rightComparisonRun && (
                <RunComparisonPanel
                  leftRun={leftComparisonRun}
                  rightRun={rightComparisonRun}
                  onClear={() =>
                    setComparisonRunIds({ left: "", right: "" })
                  }
                />
              )}
            </div>
          )}

          {!isLoaded ? (
            <div
              role="status"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center text-xs text-slate-500"
            >
              Loading saved test runs…
            </div>
          ) : runs.length > 0 ? (
            filteredRuns.length > 0 ? (
              <ul className="space-y-2.5" aria-label="Saved test runs">
                {filteredRuns.map((run) => (
                  <li key={run.id}>
                    <SavedRunCard
                      run={run}
                      isActive={activeRunId === run.id}
                      isDirty={activeRunId === run.id && isActiveRunDirty}
                      isRenaming={renamingRunId === run.id}
                      isConfirmingDelete={confirmDeleteId === run.id}
                      onLoad={handleLoadRun}
                      onDuplicate={handleDuplicateRun}
                      onStartRename={(runId) => setRenamingRunId(runId)}
                      onRename={handleRenameRun}
                      onCancelRename={() => setRenamingRunId("")}
                      onRequestDelete={(runId) => setConfirmDeleteId(runId)}
                      onConfirmDelete={handleDeleteRun}
                      onCancelDelete={() => setConfirmDeleteId("")}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center">
                <p className="text-xs font-semibold text-slate-700">
                  No saved runs match the current search and result filter.
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="mt-2 text-[10px] font-semibold text-violet-700 underline underline-offset-2"
                >
                  Clear search and filter
                </button>
              </div>
            )
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center">
              <FolderOpen
                size={20}
                aria-hidden="true"
                className="mx-auto text-slate-400"
              />
              <p className="mt-2 text-xs font-semibold text-slate-800">
                No test runs saved for this website
              </p>
              <p className="mx-auto mt-1 max-w-md text-[10px] leading-5 text-slate-500">
                Save a named snapshot to preserve page results and notes while
                you work in this browser tab.
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <span className="mt-0.5 text-amber-700" aria-hidden="true">
              !
            </span>
            <p className="text-[10px] leading-5 text-amber-900">
              Saved runs include page names, notes, results, and full
              destination URLs. Backups also include query values and
              fragments. Keep exported files private and review notes before
              sharing. Runs stay in this tab’s session storage and are not sent
              with bug reports.
            </p>
          </div>
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
