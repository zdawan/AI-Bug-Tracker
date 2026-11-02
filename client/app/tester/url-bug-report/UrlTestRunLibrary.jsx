"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookmarkPlus,
  Check,
  Clock3,
  Copy,
  FolderOpen,
  Pencil,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

const STORAGE_KEY_PREFIX = "tester-url-test-runs-v1";
const MAX_SAVED_RUNS = 8;
const MAX_SCENARIOS_PER_RUN = 50;
const MAX_RUN_NAME_LENGTH = 72;

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

function getRunCounts(scenarios) {
  return scenarios.reduce(
    (counts, scenario) => {
      if (scenario.status in counts) counts[scenario.status] += 1;
      return counts;
    },
    { "not-tested": 0, passed: 0, "issue-found": 0 },
  );
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
  const [activeRunId, setActiveRunId] = useState("");
  const [renamingRunId, setRenamingRunId] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const [announcement, setAnnouncement] = useState("");

  const currentSnapshot = useMemo(
    () => makeSnapshot(scenarios, activeScenarioId),
    [scenarios, activeScenarioId],
  );

  useEffect(() => {
    setRuns([]);
    setActiveRunId("");
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
    if (!normalizedSearch) return runs;

    return runs.filter((run) => {
      const matchesName = run.name.toLowerCase().includes(normalizedSearch);
      const matchesPage = run.scenarios.some(
        (scenario) =>
          scenario.title.toLowerCase().includes(normalizedSearch) ||
          scenario.url.toLowerCase().includes(normalizedSearch),
      );
      return matchesName || matchesPage;
    });
  }, [runs, search]);

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

  const handleClearSearch = () => setSearch("");

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
                  </div>
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
            {runs.length > 0 && (
              <label className="relative min-w-0 sm:w-64">
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
            )}
          </div>

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
                  No saved runs match “{search}”.
                </p>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="mt-2 text-[10px] font-semibold text-violet-700 underline underline-offset-2"
                >
                  Clear search
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
              Saved runs include page names, notes, results, and destination
              URLs. They stay in session storage for this tab, are not sent
              with bug reports, and are cleared when the browser session ends.
              Treat notes as potentially sensitive.
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
