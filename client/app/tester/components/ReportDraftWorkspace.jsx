"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownAZ,
  Bookmark,
  Check,
  Clock3,
  Copy,
  Download,
  FileUp,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

const DRAFT_LIBRARY_KEY = "tester-report-draft-library-v1";
const MAX_SAVED_DRAFTS = 12;
const MAX_IMPORT_BYTES = 250_000;

const DRAFT_FILTERS = [
  { id: "all", label: "All drafts" },
  { id: "favorites", label: "Favorites" },
  { id: "complete", label: "Ready to continue" },
  { id: "incomplete", label: "Needs details" },
];

function createDraftId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isValidDraftRecord(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value.title === "string" &&
    typeof value.description === "string"
  );
}

function normalizeDraftRecord(value) {
  const timestamp = new Date().toISOString();
  const createdAt =
    typeof value.createdAt === "string" &&
    !Number.isNaN(Date.parse(value.createdAt))
      ? value.createdAt
      : timestamp;
  const updatedAt =
    typeof value.updatedAt === "string" &&
    !Number.isNaN(Date.parse(value.updatedAt))
      ? value.updatedAt
      : createdAt;

  return {
    id: typeof value.id === "string" && value.id ? value.id : createDraftId(),
    name:
      typeof value.name === "string" && value.name.trim()
        ? value.name.trim().slice(0, 80)
        : "Untitled draft",
    title: value.title.slice(0, 240),
    description: value.description.slice(0, 20_000),
    createdAt,
    updatedAt,
    favorite: value.favorite === true,
  };
}

function readDraftLibrary() {
  const storedValue = window.sessionStorage.getItem(DRAFT_LIBRARY_KEY);

  if (!storedValue) return [];

  const parsedValue = JSON.parse(storedValue);

  if (!Array.isArray(parsedValue)) {
    throw new Error("The saved draft library has an invalid format.");
  }

  return parsedValue
    .filter(isValidDraftRecord)
    .slice(0, MAX_SAVED_DRAFTS)
    .map(normalizeDraftRecord);
}

function countWords(value) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function isDraftReady(draft) {
  return draft.title.trim().length >= 12 && draft.description.trim().length >= 40;
}

function getDraftPreview(value, limit = 150) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) return "No description yet.";
  if (normalized.length <= limit) return normalized;

  return `${normalized.slice(0, limit).trimEnd()}…`;
}

function formatDraftDate(value) {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) return "Date unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

function getSuggestedDraftName(title) {
  const normalized = title.trim().replace(/\s+/g, " ");

  if (!normalized) return "Untitled report";
  return normalized.length > 52
    ? `${normalized.slice(0, 49).trimEnd()}…`
    : normalized;
}

function makeExportPayload(drafts) {
  return {
    format: "tester-report-drafts",
    version: 1,
    exportedAt: new Date().toISOString(),
    privacyNote:
      "Contains only draft names, titles, and descriptions. Review before sharing.",
    drafts: drafts.map(({ name, title, description, favorite }) => ({
      name,
      title,
      description,
      favorite,
    })),
  };
}

function parseImportedDrafts(value) {
  const parsedValue = JSON.parse(value);
  const records = Array.isArray(parsedValue)
    ? parsedValue
    : parsedValue?.format === "tester-report-drafts" &&
        Array.isArray(parsedValue.drafts)
      ? parsedValue.drafts
      : null;

  if (!records) {
    throw new Error("Choose a draft export or a JSON array of drafts.");
  }

  const validRecords = records.filter(isValidDraftRecord);

  if (!validRecords.length) {
    throw new Error("The selected file contains no usable report drafts.");
  }

  return validRecords.map((record) =>
    normalizeDraftRecord({
      ...record,
      id: createDraftId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  );
}

function saveDraftLibrary(drafts) {
  window.sessionStorage.setItem(
    DRAFT_LIBRARY_KEY,
    JSON.stringify(drafts.slice(0, MAX_SAVED_DRAFTS)),
  );
}

function DraftMetric({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <Icon size={14} aria-hidden="true" className="text-violet-600" />
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className="ml-auto text-xs font-semibold tabular-nums text-slate-800">
        {value}
      </span>
    </div>
  );
}

function DraftActionButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  tone = "neutral",
}) {
  const toneClasses =
    tone === "danger"
      ? "border-rose-200 text-rose-700 hover:bg-rose-50"
      : tone === "primary"
        ? "border-violet-200 text-violet-700 hover:bg-violet-50"
        : "border-slate-200 text-slate-600 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${toneClasses}`}
    >
      <Icon size={12} aria-hidden="true" />
      {label}
    </button>
  );
}

function DraftStatusBadge({ ready, favorite }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className={`rounded-full px-2 py-1 text-[9px] font-semibold ${
          ready
            ? "bg-emerald-50 text-emerald-700"
            : "bg-amber-50 text-amber-800"
        }`}
      >
        {ready ? "Ready to continue" : "Needs details"}
      </span>
      {favorite && (
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[9px] font-semibold text-violet-700">
          <Star size={10} aria-hidden="true" />
          Favorite
        </span>
      )}
    </div>
  );
}

function DraftCard({
  draft,
  selected,
  pendingDelete,
  onSelect,
  onRestore,
  onDuplicate,
  onToggleFavorite,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  onCopy,
  canAddDrafts,
}) {
  const ready = isDraftReady(draft);

  return (
    <article
      className={`rounded-xl border p-3 transition ${
        selected
          ? "border-violet-300 bg-violet-50/50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={(event) => onSelect(draft.id, event.target.checked)}
          aria-label={`Select draft ${draft.name}`}
          className="mt-1 h-3.5 w-3.5 rounded border-slate-300 text-violet-700 focus:ring-violet-500"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="break-words text-xs font-semibold text-slate-900">
                {draft.name}
              </h4>
              <p className="mt-1 break-words text-[11px] font-medium text-slate-700">
                {draft.title || "Untitled issue"}
              </p>
            </div>
            <DraftStatusBadge ready={ready} favorite={draft.favorite} />
          </div>
          <p className="mt-2 break-words text-[10px] leading-4 text-slate-500">
            {getDraftPreview(draft.description)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-slate-400">
            <span>{countWords(draft.description)} description words</span>
            <span>Updated {formatDraftDate(draft.updatedAt)}</span>
          </div>
          {pendingDelete ? (
            <div
              className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-rose-50 p-2"
              role="alert"
            >
              <p className="mr-auto text-[10px] font-medium text-rose-800">
                Delete this saved draft?
              </p>
              <button
                type="button"
                onClick={onCancelDelete}
                className="rounded px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-white"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={() => onConfirmDelete(draft.id)}
                className="rounded bg-rose-700 px-2 py-1 text-[10px] font-semibold text-white hover:bg-rose-800"
              >
                Delete
              </button>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <DraftActionButton
                icon={Check}
                label="Use draft"
                onClick={() => onRestore(draft)}
                tone="primary"
              />
              <DraftActionButton
                icon={Star}
                label={draft.favorite ? "Unfavorite" : "Favorite"}
                onClick={() => onToggleFavorite(draft.id)}
              />
              <DraftActionButton
                icon={Copy}
                label="Duplicate"
                onClick={() => onDuplicate(draft.id)}
                disabled={!canAddDrafts}
              />
              <DraftActionButton
                icon={Download}
                label="Copy text"
                onClick={() => onCopy(draft)}
              />
              <DraftActionButton
                icon={Trash2}
                label="Delete"
                onClick={() => onRequestDelete(draft.id)}
                tone="danger"
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ReportDraftWorkspace({
  title,
  description,
  onRestore,
}) {
  const [drafts, setDrafts] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [pendingRestore, setPendingRestore] = useState(null);
  const importInputRef = useRef(null);

  useEffect(() => {
    try {
      setDrafts(readDraftLibrary());
    } catch {
      toast.error("Could not read the saved draft library from this session.");
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveDrafts = (nextDrafts) => {
    try {
      saveDraftLibrary(nextDrafts);
      setDrafts(nextDrafts.slice(0, MAX_SAVED_DRAFTS));
      setSelectedIds((current) => {
        const remainingIds = new Set(
          nextDrafts.map((draft) => draft.id).filter((id) => current.has(id)),
        );
        return remainingIds;
      });
      return true;
    } catch {
      toast.error("Could not update saved drafts in this browser session.");
      return false;
    }
  };

  const canAddDrafts = drafts.length < MAX_SAVED_DRAFTS;
  const readyDraftCount = drafts.filter(isDraftReady).length;
  const favoriteDraftCount = drafts.filter((draft) => draft.favorite).length;
  const filteredDrafts = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    return drafts
      .filter((draft) => {
        if (filter === "favorites" && !draft.favorite) return false;
        if (filter === "complete" && !isDraftReady(draft)) return false;
        if (filter === "incomplete" && isDraftReady(draft)) return false;
        if (!normalizedQuery) return true;

        return [draft.name, draft.title, draft.description]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((left, right) => {
        if (sortBy === "oldest") {
          return Date.parse(left.updatedAt) - Date.parse(right.updatedAt);
        }
        if (sortBy === "title") {
          return left.name.localeCompare(right.name);
        }
        return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
      });
  }, [drafts, filter, search, sortBy]);

  const handleSaveDraft = (event) => {
    event.preventDefault();

    if (!title.trim() && !description.trim()) {
      toast.error("Add a title or description before saving a draft.");
      return;
    }
    if (!canAddDrafts) {
      toast.error(`You can keep up to ${MAX_SAVED_DRAFTS} drafts in this session.`);
      return;
    }

    const name = draftName.trim() || getSuggestedDraftName(title);
    const timestamp = new Date().toISOString();
    const draft = normalizeDraftRecord({
      id: createDraftId(),
      name,
      title,
      description,
      createdAt: timestamp,
      updatedAt: timestamp,
      favorite: false,
    });

    if (saveDrafts([draft, ...drafts])) {
      setDraftName("");
      toast.success(`Saved “${draft.name}” for this session.`);
    }
  };

  const handleRestoreDraft = (draft) => {
    if (title.trim() || description.trim()) {
      setPendingRestore(draft);
      return;
    }

    onRestore(draft);
    toast.success(`Loaded “${draft.name}”.`);
  };

  const confirmRestoreDraft = () => {
    if (!pendingRestore) return;

    onRestore(pendingRestore);
    toast.success(`Loaded “${pendingRestore.name}”.`);
    setPendingRestore(null);
  };

  const handleDuplicateDraft = (draftId) => {
    if (!canAddDrafts) {
      toast.error(`You can keep up to ${MAX_SAVED_DRAFTS} drafts in this session.`);
      return;
    }

    const source = drafts.find((draft) => draft.id === draftId);
    if (!source) return;

    const duplicate = normalizeDraftRecord({
      ...source,
      id: createDraftId(),
      name: `${source.name} (copy)`.slice(0, 80),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      favorite: false,
    });

    if (saveDrafts([duplicate, ...drafts])) {
      toast.success("Draft duplicated.");
    }
  };

  const handleToggleFavorite = (draftId) => {
    const nextDrafts = drafts.map((draft) =>
      draft.id === draftId
        ? { ...draft, favorite: !draft.favorite, updatedAt: new Date().toISOString() }
        : draft,
    );

    if (saveDrafts(nextDrafts)) {
      toast.success("Draft favorite updated.");
    }
  };

  const handleConfirmDelete = (draftId) => {
    const nextDrafts = drafts.filter((draft) => draft.id !== draftId);

    if (saveDrafts(nextDrafts)) {
      setPendingDeleteId("");
      toast.success("Saved draft deleted.");
    }
  };

  const handleBulkDelete = () => {
    if (!confirmBulkDelete) {
      setConfirmBulkDelete(true);
      return;
    }

    const nextDrafts = drafts.filter((draft) => !selectedIds.has(draft.id));

    if (saveDrafts(nextDrafts)) {
      setConfirmBulkDelete(false);
      toast.success("Selected drafts deleted.");
    }
  };

  const handleSelectDraft = (draftId, selected) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (selected) {
        next.add(draftId);
      } else {
        next.delete(draftId);
      }

      return next;
    });
  };

  const handleSelectVisible = () => {
    const visibleIds = filteredDrafts.map((draft) => draft.id);
    const allVisibleSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

    setSelectedIds((current) => {
      const next = new Set(current);

      visibleIds.forEach((id) => {
        if (allVisibleSelected) {
          next.delete(id);
        } else {
          next.add(id);
        }
      });

      return next;
    });
  };

  const handleCopyDraft = async (draft) => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable.");
      }

      await navigator.clipboard.writeText(
        `${draft.title}\n\n${draft.description}`.trim(),
      );
      toast.success("Draft text copied.");
    } catch {
      toast.error("Could not copy this draft. Please copy the text manually.");
    }
  };

  const handleExportDrafts = () => {
    const selectedDrafts = drafts.filter((draft) => selectedIds.has(draft.id));
    const exportDrafts = selectedDrafts.length ? selectedDrafts : drafts;

    if (!exportDrafts.length) {
      toast.info("There are no drafts to export.");
      return;
    }

    try {
      const blob = new Blob(
        [JSON.stringify(makeExportPayload(exportDrafts), null, 2)],
        { type: "application/json" },
      );
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = "tester-report-drafts.json";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
      toast.success(
        `Exported ${exportDrafts.length} draft${exportDrafts.length === 1 ? "" : "s"}.`,
      );
    } catch {
      toast.error("Could not export drafts from this browser.");
    }
  };

  const handleImportDrafts = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error("Draft import files must be smaller than 250 KB.");
      return;
    }

    try {
      const importedDrafts = parseImportedDrafts(await file.text());
      const availableSlots = MAX_SAVED_DRAFTS - drafts.length;

      if (availableSlots <= 0) {
        toast.error(`Your session already has the maximum of ${MAX_SAVED_DRAFTS} drafts.`);
        return;
      }

      const acceptedDrafts = importedDrafts.slice(0, availableSlots);
      if (saveDrafts([...acceptedDrafts, ...drafts])) {
        const skipped = importedDrafts.length - acceptedDrafts.length;
        toast.success(
          skipped
            ? `Imported ${acceptedDrafts.length}; ${skipped} skipped because the session limit was reached.`
            : `Imported ${acceptedDrafts.length} draft${acceptedDrafts.length === 1 ? "" : "s"}.`,
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not import this draft file.",
      );
    }
  };

  const handleClearSearch = () => setSearch("");
  const allVisibleSelected =
    filteredDrafts.length > 0 &&
    filteredDrafts.every((draft) => selectedIds.has(draft.id));

  return (
    <section
      className="mb-6 overflow-hidden rounded-2xl border border-violet-100 bg-violet-50/40"
      aria-labelledby="report-draft-workspace-heading"
    >
      <div className="border-b border-violet-100 bg-white/80 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
              <Bookmark size={17} aria-hidden="true" />
            </span>
            <div>
              <h3
                id="report-draft-workspace-heading"
                className="text-sm font-semibold text-slate-900"
              >
                Report draft workspace
              </h3>
              <p className="mt-1 max-w-xl text-[11px] leading-5 text-slate-600">
                Keep multiple report ideas in this browser tab and return to
                them later. Drafts never include email addresses or screenshots.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
            {drafts.length}/{MAX_SAVED_DRAFTS} saved
          </span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <DraftMetric
            icon={Bookmark}
            label="Saved drafts"
            value={drafts.length}
          />
          <DraftMetric
            icon={Check}
            label="Ready to continue"
            value={readyDraftCount}
          />
          <DraftMetric
            icon={Star}
            label="Favorites"
            value={favoriteDraftCount}
          />
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <form
          onSubmit={handleSaveDraft}
          className="rounded-xl border border-violet-100 bg-white p-3"
        >
          <label
            htmlFor="saved-report-draft-name"
            className="block text-[11px] font-semibold text-slate-800"
          >
            Save the current report as a named draft
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="saved-report-draft-name"
              type="text"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              maxLength={80}
              placeholder={getSuggestedDraftName(title)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
            <button
              type="submit"
              disabled={!isLoaded || !canAddDrafts || (!title.trim() && !description.trim())}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Bookmark size={13} aria-hidden="true" />
              Save named draft
            </button>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-slate-500">
            {canAddDrafts
              ? "Title and description are saved in session storage only."
              : "Draft limit reached. Delete or export drafts before adding another."}
          </p>
        </form>

        {pendingRestore && (
          <div
            className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3"
            role="alert"
          >
            <p className="mr-auto text-xs leading-5 text-amber-900">
              Loading “{pendingRestore.name}” replaces the current title and
              description. Save the current text first if you need it.
            </p>
            <button
              type="button"
              onClick={() => setPendingRestore(null)}
              className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmRestoreDraft}
              className="rounded-lg bg-amber-800 px-3 py-1.5 text-[10px] font-semibold text-white"
            >
              Replace current text
            </button>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Search
              size={14}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <label htmlFor="saved-draft-search" className="sr-only">
              Search saved drafts
            </label>
            <input
              id="saved-draft-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search draft name, title, or description"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-xs text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear draft search"
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={13} aria-hidden="true" />
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-500">
            <ArrowDownAZ size={13} aria-hidden="true" />
            <span>Sort</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              aria-label="Sort saved drafts"
              className="bg-transparent text-[10px] font-semibold text-slate-700 outline-none"
            >
              <option value="recent">Recently updated</option>
              <option value="oldest">Oldest updated</option>
              <option value="title">Name A–Z</option>
            </select>
          </label>
        </div>

        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Filter saved drafts"
        >
          {DRAFT_FILTERS.map((draftFilter) => {
            const active = filter === draftFilter.id;
            const count = drafts.filter((draft) => {
              if (draftFilter.id === "favorites") return draft.favorite;
              if (draftFilter.id === "complete") return isDraftReady(draft);
              if (draftFilter.id === "incomplete") return !isDraftReady(draft);
              return true;
            }).length;

            return (
              <button
                key={draftFilter.id}
                type="button"
                onClick={() => setFilter(draftFilter.id)}
                aria-pressed={active}
                className={`shrink-0 rounded-lg px-3 py-2 text-[10px] font-semibold transition ${
                  active
                    ? "bg-violet-700 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700"
                }`}
              >
                {draftFilter.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
          <button
            type="button"
            onClick={handleSelectVisible}
            disabled={!filteredDrafts.length}
            className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            {allVisibleSelected ? "Clear visible selection" : "Select visible"}
          </button>
          <span className="text-[10px] text-slate-400">
            {selectedIds.size} selected
          </span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <DraftActionButton
              icon={FileUp}
              label="Import JSON"
              onClick={() => importInputRef.current?.click()}
              disabled={!canAddDrafts}
              tone="primary"
            />
            <DraftActionButton
              icon={Download}
              label={selectedIds.size ? "Export selected" : "Export all"}
              onClick={handleExportDrafts}
              disabled={!drafts.length}
            />
            {selectedIds.size > 0 && (
              <DraftActionButton
                icon={Trash2}
                label={`Delete selected (${selectedIds.size})`}
                onClick={handleBulkDelete}
                tone="danger"
              />
            )}
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            aria-label="Import report drafts from JSON"
            onChange={handleImportDrafts}
            className="sr-only"
          />
        </div>
        <p className="text-[10px] leading-4 text-slate-500">
          Export files include draft names, titles, and descriptions. Review
          their contents before sharing. Imports accept this workspace’s JSON
          export format.
        </p>

        {confirmBulkDelete && selectedIds.size > 0 && (
          <div
            className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3"
            role="alert"
          >
            <p className="mr-auto text-xs text-rose-900">
              Delete {selectedIds.size} selected draft
              {selectedIds.size === 1 ? "" : "s"}?
            </p>
            <button
              type="button"
              onClick={() => setConfirmBulkDelete(false)}
              className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="rounded-lg bg-rose-700 px-3 py-1.5 text-[10px] font-semibold text-white"
            >
              Confirm delete
            </button>
          </div>
        )}

        {!isLoaded ? (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-500">
            Loading session drafts…
          </p>
        ) : filteredDrafts.length ? (
          <div className="space-y-2" aria-live="polite">
            {filteredDrafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                selected={selectedIds.has(draft.id)}
                pendingDelete={pendingDeleteId === draft.id}
                onSelect={handleSelectDraft}
                onRestore={handleRestoreDraft}
                onDuplicate={handleDuplicateDraft}
                onToggleFavorite={handleToggleFavorite}
                onRequestDelete={setPendingDeleteId}
                onCancelDelete={() => setPendingDeleteId("")}
                onConfirmDelete={handleConfirmDelete}
                onCopy={handleCopyDraft}
                canAddDrafts={canAddDrafts}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-7 text-center">
            <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500">
              {search ? (
                <Search size={16} aria-hidden="true" />
              ) : (
                <Clock3 size={16} aria-hidden="true" />
              )}
            </span>
            <h4 className="mt-2 text-xs font-semibold text-slate-800">
              {search ? "No matching drafts" : "No drafts in this session"}
            </h4>
            <p className="mx-auto mt-1 max-w-sm text-[10px] leading-4 text-slate-500">
              {search
                ? "Try another search or choose a different filter."
                : "Save the current title and description above to keep report ideas here."}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                Clear search and filters
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
