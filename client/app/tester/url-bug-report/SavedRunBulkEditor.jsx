"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Pencil, X } from "lucide-react";

const MAX_RUN_NAME_LENGTH = 72;
const PREVIEW_LIMIT = 6;

const EDITOR_BUTTON =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40";

const TOKENS = [
  { token: "{name}", description: "Current saved-run name" },
  { token: "{index}", description: "Position in the selected runs" },
  { token: "{total}", description: "Number of selected runs" },
  { token: "{date}", description: "Today’s date" },
  { token: "{pages}", description: "Page count in the run" },
  { token: "{issues}", description: "Issue count in the run" },
  { token: "{passed}", description: "Passed page count" },
  { token: "{untested}", description: "Untested page count" },
];

function getRunCounts(scenarios) {
  return scenarios.reduce(
    (counts, scenario) => {
      if (scenario.status in counts) counts[scenario.status] += 1;
      return counts;
    },
    { "not-tested": 0, passed: 0, "issue-found": 0 },
  );
}

function getTemplateValues(run, index, total, dateLabel) {
  const counts = getRunCounts(run.scenarios);

  return {
    name: run.name,
    index: String(index + 1),
    total: String(total),
    date: dateLabel,
    pages: String(run.scenarios.length),
    issues: String(counts["issue-found"]),
    passed: String(counts.passed),
    untested: String(counts["not-tested"]),
  };
}

function renderNameTemplate(template, run, index, total, dateLabel) {
  const values = getTemplateValues(run, index, total, dateLabel);
  const rendered = template.replace(/\{([^{}]+)\}/g, (token, key) =>
    Object.hasOwn(values, key) ? values[key] : token,
  );

  return {
    rendered: rendered.trim().slice(0, MAX_RUN_NAME_LENGTH),
    hasUnknownToken: /\{[^{}]*\}/.test(rendered),
    wasTruncated: rendered.trim().length > MAX_RUN_NAME_LENGTH,
  };
}

function buildNamePreviews(runs, template) {
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return runs.map((run, index) => ({
    id: run.id,
    originalName: run.name,
    ...renderNameTemplate(template, run, index, runs.length, dateLabel),
  }));
}

function getDuplicateNames(previews, runs, selectedRuns, isDuplicate) {
  const counts = new Map();
  const selectedIds = new Set(selectedRuns.map((run) => run.id));
  runs.forEach((run) => {
    if (isDuplicate || !selectedIds.has(run.id)) {
      const key = run.name.toLocaleLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  });
  previews.forEach((preview) => {
    const key = preview.rendered.toLocaleLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return previews.filter(
    (preview) => counts.get(preview.rendered.toLocaleLowerCase()) > 1,
  );
}

function PreviewBadge({ children, tone = "neutral" }) {
  const toneClass =
    tone === "changed"
      ? "bg-violet-100 text-violet-800"
      : tone === "warning"
        ? "bg-amber-100 text-amber-900"
        : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${toneClass}`}
    >
      {children}
    </span>
  );
}

function PreviewRow({ preview, index, isDuplicate }) {
  const isChanged = preview.rendered !== preview.originalName;

  return (
    <li className="grid min-w-0 gap-1.5 rounded-lg border border-slate-200 bg-white p-2.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
          Current · {index + 1}
        </p>
        <p className="mt-0.5 break-words text-[10px] leading-4 text-slate-700">
          {preview.originalName}
        </p>
      </div>
      <span
        aria-hidden="true"
        className="hidden text-center text-slate-400 sm:block"
      >
        →
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
            {isDuplicate ? "Copy name" : "New name"}
          </p>
          {isChanged && <PreviewBadge tone="changed">Changed</PreviewBadge>}
          {preview.wasTruncated && (
            <PreviewBadge tone="warning">Name shortened</PreviewBadge>
          )}
        </div>
        <p className="mt-0.5 break-words text-[10px] leading-4 text-slate-900">
          {preview.rendered || (
            <span className="italic text-rose-700">Name will be empty</span>
          )}
        </p>
      </div>
    </li>
  );
}

function TemplateGuide({ onInsert }) {
  return (
    <details className="rounded-lg border border-slate-200 bg-slate-50">
      <summary className="cursor-pointer px-3 py-2 text-[10px] font-semibold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
        Show available name tokens
      </summary>
      <div className="border-t border-slate-200 px-3 py-2.5">
        <p className="text-[9px] leading-4 text-slate-500">
          Tokens are replaced separately for each selected run. Unknown tokens
          must be removed before applying.
        </p>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {TOKENS.map(({ token, description }) => (
            <li
              key={token}
              className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-white px-2 py-1.5"
            >
              <span className="font-mono text-[9px] font-semibold text-violet-800">
                {token}
              </span>
              <span className="text-right text-[9px] text-slate-500">
                {description}
              </span>
              <button
                type="button"
                onClick={() => onInsert(token)}
                className="shrink-0 rounded px-1.5 py-1 text-[9px] font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                aria-label={`Insert ${token}`}
              >
                Insert
              </button>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function NameTemplateField({ value, onChange, onInsert, isDuplicate }) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-semibold text-slate-700">
        {isDuplicate ? "Copy name template" : "New name template"}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={MAX_RUN_NAME_LENGTH * 2}
          autoComplete="off"
          spellCheck={false}
          placeholder="{name} - reviewed"
          className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          aria-describedby="bulk-run-template-help"
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id="bulk-run-template-help" className="text-[9px] text-slate-500">
          Output names are trimmed and limited to {MAX_RUN_NAME_LENGTH}{" "}
          characters.
        </p>
        <span className="text-[9px] tabular-nums text-slate-400">
          {value.length}/{MAX_RUN_NAME_LENGTH * 2}
        </span>
      </div>
      <TemplateGuide onInsert={onInsert} />
    </div>
  );
}

function PreviewSummary({
  previews,
  duplicateNames,
  invalidCount,
  unchangedCount,
  isDuplicate,
}) {
  const changedCount = previews.length - unchangedCount;
  const truncatedCount = previews.filter((preview) => preview.wasTruncated).length;

  return (
    <div
      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
        <p className="text-[9px] font-medium text-slate-500">Selected</p>
        <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
          {previews.length}
          <span className="ml-1 text-[9px] font-normal">
            {isDuplicate ? "copies planned" : "runs in preview"}
          </span>
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
        <p className="text-[9px] font-medium text-slate-500">
          {isDuplicate ? "New copies" : "Names changing"}
        </p>
        <p className="mt-0.5 text-sm font-bold tabular-nums text-violet-800">
          {isDuplicate ? previews.length : changedCount}
          {!isDuplicate && (
            <span className="ml-1 text-[9px] font-normal text-slate-500">
              of {previews.length}
            </span>
          )}
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
        <p className="text-[9px] font-medium text-slate-500">Duplicate names</p>
        <p
          className={`mt-0.5 text-sm font-bold tabular-nums ${
            duplicateNames.length ? "text-amber-800" : "text-emerald-700"
          }`}
        >
          {duplicateNames.length}
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
        <p className="text-[9px] font-medium text-slate-500">
          {invalidCount ? "Needs attention" : "Names shortened"}
        </p>
        <p
          className={`mt-0.5 text-sm font-bold tabular-nums ${
            invalidCount || truncatedCount ? "text-amber-800" : "text-slate-700"
          }`}
        >
          {invalidCount || truncatedCount}
          <span className="ml-1 text-[9px] font-normal">
            {invalidCount ? "invalid" : "over limit"}
          </span>
        </p>
      </div>
    </div>
  );
}

function DuplicateCapacityNotice({ copyCount, remainingSlots, maxRuns }) {
  const hasCapacity = copyCount <= remainingSlots;

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        hasCapacity
          ? "border-sky-200 bg-sky-50 text-sky-950"
          : "border-rose-200 bg-rose-50 text-rose-950"
      }`}
      role={hasCapacity ? "status" : "alert"}
    >
      <p className="text-[10px] font-semibold">
        {hasCapacity ? "Copies fit in the saved-run library" : "Not enough save slots"}
      </p>
      <p className="mt-1 text-[9px] leading-4">
        {copyCount} selected run{copyCount === 1 ? "" : "s"} will create{" "}
        {copyCount} cop{copyCount === 1 ? "y" : "ies"}. {remainingSlots} of the
        {` `}{maxRuns} total slots are currently available.
      </p>
    </div>
  );
}

function ModeSelector({ mode, onChange }) {
  return (
    <fieldset className="grid gap-2 sm:grid-cols-2">
      <legend className="mb-1 text-[10px] font-semibold text-slate-700">
        Bulk action
      </legend>
      <label
        className={`flex min-h-14 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition ${
          mode === "rename"
            ? "border-violet-300 bg-violet-50"
            : "border-slate-200 bg-white hover:bg-slate-50"
        }`}
      >
        <input
          type="radio"
          name="saved-run-bulk-mode"
          value="rename"
          checked={mode === "rename"}
          onChange={() => onChange("rename")}
          className="h-4 w-4 border-slate-300 text-violet-700 focus:ring-violet-500"
        />
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-800">
          <Pencil size={14} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold text-slate-900">
            Rename selected
          </span>
          <span className="mt-0.5 block text-[9px] text-slate-500">
            Apply a custom name template.
          </span>
        </span>
      </label>
      <label
        className={`flex min-h-14 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition ${
          mode === "duplicate"
            ? "border-sky-300 bg-sky-50"
            : "border-slate-200 bg-white hover:bg-slate-50"
        }`}
      >
        <input
          type="radio"
          name="saved-run-bulk-mode"
          value="duplicate"
          checked={mode === "duplicate"}
          onChange={() => onChange("duplicate")}
          className="h-4 w-4 border-slate-300 text-sky-700 focus:ring-sky-500"
        />
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-100 text-sky-800">
          <Copy size={14} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold text-slate-900">
            Duplicate selected
          </span>
          <span className="mt-0.5 block text-[9px] text-slate-500">
            Create copies with fresh page identifiers.
          </span>
        </span>
      </label>
    </fieldset>
  );
}

function getTemplateErrors(template, previews) {
  const errors = [];
  if (!template.trim()) {
    errors.push("Enter a template before applying the bulk action.");
  }
  if (previews.some((preview) => !preview.rendered)) {
    errors.push("Every selected run must produce a non-empty name.");
  }
  if (previews.some((preview) => preview.hasUnknownToken)) {
    errors.push("Remove or correct unknown tokens in the name template.");
  }
  return errors;
}

function TemplateErrors({ errors }) {
  if (!errors.length) return null;

  return (
    <ul
      className="space-y-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5"
      role="alert"
      aria-label="Name template errors"
    >
      {errors.map((error) => (
        <li key={error} className="text-[9px] leading-4 text-rose-900">
          {error}
        </li>
      ))}
    </ul>
  );
}

function DuplicateNameNotice({ duplicates }) {
  if (!duplicates.length) return null;

  const names = [...new Set(duplicates.map((preview) => preview.rendered))];

  return (
    <div
      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5"
      role="status"
    >
      <p className="text-[10px] font-semibold text-amber-950">
        Some generated names are repeated
      </p>
      <p className="mt-1 break-words text-[9px] leading-4 text-amber-900">
        {names.join(", ")}. Repeated names are allowed, but may be harder to
        distinguish in the saved-run list.
      </p>
    </div>
  );
}

function PreviewList({ previews, isDuplicate }) {
  const visiblePreviews = previews.slice(0, PREVIEW_LIMIT);
  const hiddenCount = previews.length - visiblePreviews.length;

  return (
    <section
      aria-labelledby="bulk-edit-preview-title"
      className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3
            id="bulk-edit-preview-title"
            className="text-[11px] font-semibold text-slate-900"
          >
            Preview selected runs
          </h3>
          <p className="mt-0.5 text-[9px] text-slate-500">
            Names only are shown here; page destinations and notes are not
            included.
          </p>
        </div>
        <PreviewBadge>{previews.length} selected</PreviewBadge>
      </div>
      <ul className="space-y-1.5" aria-label="Bulk edit name preview">
        {visiblePreviews.map((preview, index) => (
          <PreviewRow
            key={preview.id}
            preview={preview}
            index={index}
            isDuplicate={isDuplicate}
          />
        ))}
      </ul>
      {hiddenCount > 0 && (
        <p className="text-right text-[9px] text-slate-500">
          And {hiddenCount} more selected run{hiddenCount === 1 ? "" : "s"}.
        </p>
      )}
    </section>
  );
}

function BulkEditorHeader({ selectedCount, onClose }) {
  return (
    <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-violet-700">
          Saved-run tools
        </p>
        <h2
          id="saved-run-bulk-editor-title"
          className="mt-1 text-sm font-semibold text-slate-950"
        >
          Bulk edit selected runs
        </h2>
        <p className="mt-1 text-[10px] leading-4 text-slate-600">
          Preview a consistent naming pattern before updating or copying your
          selected snapshots. {selectedCount} run
          {selectedCount === 1 ? "" : "s"} selected.
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close bulk editor"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </header>
  );
}

function BulkEditorFooter({
  mode,
  selectedCount,
  hasCapacity,
  canApply,
  onClose,
  onApply,
}) {
  const label =
    mode === "duplicate"
      ? `Create ${selectedCount} cop${selectedCount === 1 ? "y" : "ies"}`
      : `Rename ${selectedCount} run${selectedCount === 1 ? "" : "s"}`;

  return (
    <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-[9px] leading-4 text-slate-500">
        {mode === "duplicate"
          ? "Original runs stay unchanged. Copies include their saved page results and notes."
          : "Only saved-run names and update timestamps will change."}
      </p>
      <div className="flex shrink-0 justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className={`${EDITOR_BUTTON} border-slate-200 bg-white text-slate-700 hover:bg-slate-100`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={!canApply || (mode === "duplicate" && !hasCapacity)}
          className={`${EDITOR_BUTTON} border-violet-700 bg-violet-700 text-white hover:bg-violet-800`}
        >
          {label}
        </button>
      </div>
    </footer>
  );
}

export default function SavedRunBulkEditor({
  runs,
  selectedRuns,
  remainingSlots,
  maxRuns,
  onClose,
  onRename,
  onDuplicate,
}) {
  const [mode, setMode] = useState("rename");
  const [renameTemplate, setRenameTemplate] = useState("{name} - reviewed");
  const [duplicateTemplate, setDuplicateTemplate] = useState(
    "{name} (copy {index})",
  );
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const closeButton = dialog?.querySelector("button[aria-label='Close bulk editor']");
    closeButton?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus instanceof HTMLElement && document.contains(previousFocus)) {
        previousFocus.focus();
      }
    };
  }, []);

  const template = mode === "rename" ? renameTemplate : duplicateTemplate;
  const setTemplate = mode === "rename" ? setRenameTemplate : setDuplicateTemplate;
  const previews = useMemo(
    () => buildNamePreviews(selectedRuns, template),
    [selectedRuns, template],
  );
  const duplicateNames = useMemo(
    () => getDuplicateNames(previews, runs, selectedRuns, mode === "duplicate"),
    [previews, runs, selectedRuns, mode],
  );
  const errors = useMemo(
    () => getTemplateErrors(template, previews),
    [template, previews],
  );
  const unchangedCount = previews.filter(
    (preview) => preview.rendered === preview.originalName,
  ).length;
  const invalidCount = previews.filter(
    (preview) => !preview.rendered || preview.hasUnknownToken,
  ).length;
  const hasCapacity = selectedRuns.length <= remainingSlots;
  const canApply =
    errors.length === 0 &&
    (mode === "duplicate" || previews.some(
      (preview) => preview.rendered !== preview.originalName,
    ));

  const insertToken = (token) => {
    setTemplate((current) => `${current}${current ? " " : ""}${token}`);
  };

  const handleApply = () => {
    if (!canApply || (mode === "duplicate" && !hasCapacity)) return;

    if (mode === "rename") {
      const updates = new Map(
        previews.map((preview) => [preview.id, preview.rendered]),
      );
      onRename(updates);
      return;
    }

    onDuplicate(
      selectedRuns.map((run, index) => ({
        run,
        name: previews[index].rendered,
      })),
    );
  };

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="saved-run-bulk-editor-title"
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-6"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const focusableElements = dialogRef.current?.querySelectorAll(
          "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex='-1'])",
        );
        if (!focusableElements?.length) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <BulkEditorHeader
          selectedCount={selectedRuns.length}
          onClose={onClose}
        />
        <div className="space-y-4 overflow-y-auto p-4 sm:p-5">
          <ModeSelector mode={mode} onChange={setMode} />
          <NameTemplateField
            value={template}
            onChange={setTemplate}
            onInsert={insertToken}
            isDuplicate={mode === "duplicate"}
          />
          <PreviewSummary
            previews={previews}
            duplicateNames={duplicateNames}
            invalidCount={invalidCount}
            unchangedCount={unchangedCount}
            isDuplicate={mode === "duplicate"}
          />
          <TemplateErrors errors={errors} />
          <DuplicateNameNotice duplicates={duplicateNames} />
          {mode === "duplicate" && (
            <DuplicateCapacityNotice
              copyCount={selectedRuns.length}
              remainingSlots={remainingSlots}
              maxRuns={maxRuns}
            />
          )}
          {mode === "rename" && unchangedCount > 0 && (
            <p
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[9px] leading-4 text-slate-600"
              role="status"
            >
              {unchangedCount} selected run{unchangedCount === 1 ? "" : "s"}{" "}
              {unchangedCount === 1 ? "already has" : "already have"} the
              generated name and will not be modified.
            </p>
          )}
          <PreviewList previews={previews} isDuplicate={mode === "duplicate"} />
          <p className="text-[9px] leading-4 text-slate-500">
            Templates are evaluated at preview time. A date token uses your
            browser’s local date. Warnings above include name collisions with
            other saved runs; collisions do not prevent applying the template.
          </p>
        </div>
        <BulkEditorFooter
          mode={mode}
          selectedCount={selectedRuns.length}
          hasCapacity={hasCapacity}
          canApply={canApply}
          onClose={onClose}
          onApply={handleApply}
        />
      </div>
    </section>
  );
}
