"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  Bell,
  CalendarClock,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileText,
  Flag,
  Plus,
  Search,
  ShieldCheck,
  StickyNote,
  Tag,
  Trash2,
  X,
} from "lucide-react";

const STORAGE_PREFIX = "tester-personal-triage-v1";
const MAX_TRIAGE_ITEMS = 200;
const MAX_NOTE_LENGTH = 1200;
const MAX_LABELS = 5;
const MAX_LABEL_LENGTH = 24;

const TRIAGE_STATUSES = [
  { value: "next", label: "To review" },
  { value: "waiting", label: "Waiting" },
  { value: "done", label: "Done" },
];

const TRIAGE_FILTERS = [
  { value: "all", label: "All" },
  { value: "next", label: "To review" },
  { value: "waiting", label: "Waiting" },
  { value: "done", label: "Done" },
  { value: "overdue", label: "Overdue" },
];

function normalizeText(value, maximumLength = 200) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

function normalizeBugId(value) {
  return normalizeText(value, 120);
}

function isCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeLabels(labels) {
  if (!Array.isArray(labels)) return [];

  return [
    ...new Set(
      labels
        .filter((label) => typeof label === "string")
        .map((label) => label.trim().slice(0, MAX_LABEL_LENGTH))
        .filter(Boolean),
    ),
  ].slice(0, MAX_LABELS);
}

function normalizeTriageItem(value) {
  if (!value || typeof value !== "object") return null;

  const bugId = normalizeBugId(value.bugId);
  if (!bugId) return null;

  const validStatus = TRIAGE_STATUSES.some(
    (status) => status.value === value.status,
  );

  return {
    bugId,
    status: validStatus ? value.status : "next",
    note: normalizeText(value.note, MAX_NOTE_LENGTH),
    labels: normalizeLabels(value.labels),
    followUpDate: isCalendarDate(value.followUpDate)
      ? value.followUpDate
      : "",
    addedAt:
      typeof value.addedAt === "string" &&
      !Number.isNaN(Date.parse(value.addedAt))
        ? value.addedAt
        : new Date().toISOString(),
    updatedAt:
      typeof value.updatedAt === "string" &&
      !Number.isNaN(Date.parse(value.updatedAt))
        ? value.updatedAt
        : new Date().toISOString(),
  };
}

function normalizeTriageItems(value) {
  if (!Array.isArray(value)) {
    throw new Error("Saved triage data has an invalid format.");
  }

  const seenIds = new Set();
  const normalized = [];

  for (const candidate of value) {
    const item = normalizeTriageItem(candidate);

    if (!item || seenIds.has(item.bugId)) continue;
    seenIds.add(item.bugId);
    normalized.push(item);

    if (normalized.length >= MAX_TRIAGE_ITEMS) break;
  }

  return normalized;
}

function getStorageKey(email) {
  return `${STORAGE_PREFIX}:${encodeURIComponent(email.trim().toLowerCase())}`;
}

function getBugTitle(bug) {
  return normalizeText(bug?.title, 180) || "Untitled report";
}

function getBugId(bug) {
  return normalizeBugId(bug?._id || bug?.id);
}

function getBugSeverity(bug) {
  return normalizeText(bug?.severity, 40) || "Unspecified";
}

function getBugStatus(bug) {
  return normalizeText(bug?.status, 40) || "Open";
}

function getSafeHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";

  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function severityRank(bug) {
  const severity = getBugSeverity(bug).toLowerCase();
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function getDateState(followUpDate, status) {
  if (!followUpDate || status === "done") return "none";
  if (followUpDate < getTodayDate()) return "overdue";
  if (followUpDate === getTodayDate()) return "today";
  return "upcoming";
}

function formatFollowUpDate(value) {
  if (!isCalendarDate(value)) return "No follow-up set";

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatUpdatedDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just added";

  return `Updated ${date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })}`;
}

function buildPersonalTriageExport(email, items, bugs) {
  const bugById = new Map(bugs.map((bug) => [getBugId(bug), bug]));

  return {
    format: "ai-bug-tracker-personal-triage",
    version: 1,
    exportedAt: new Date().toISOString(),
    reporter: email,
    items: items.map((item) => ({
      bugId: item.bugId,
      title: getBugTitle(bugById.get(item.bugId)),
      status: item.status,
      note: item.note,
      labels: item.labels,
      followUpDate: item.followUpDate,
      updatedAt: item.updatedAt,
    })),
  };
}

function downloadPersonalTriage(email, items, bugs) {
  const content = JSON.stringify(
    buildPersonalTriageExport(email, items, bugs),
    null,
    2,
  );
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = getTodayDate();

  anchor.href = objectUrl;
  anchor.download = `personal-triage-${date}.json`;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function parseLabels(value) {
  return normalizeLabels(
    value
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean),
  );
}

function statusStyle(status) {
  if (status === "done") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (status === "waiting") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-violet-200 bg-violet-50 text-violet-800";
}

function TriageStatusSelect({ value, onChange, bugTitle }) {
  return (
    <label className="relative inline-flex">
      <span className="sr-only">Personal triage status for {bugTitle}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-8 appearance-none rounded-lg border py-1 pl-2.5 pr-7 text-[11px] font-semibold outline-none transition focus:ring-2 focus:ring-violet-200 ${statusStyle(value)}`}
      >
        {TRIAGE_STATUSES.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
      />
    </label>
  );
}

function TriageItemCard({
  item,
  bug,
  onUpdate,
  onRemove,
  onOpenBug,
  stale = false,
}) {
  const [noteDraft, setNoteDraft] = useState(item.note);
  const [labelsDraft, setLabelsDraft] = useState(item.labels.join(", "));
  const [isExpanded, setIsExpanded] = useState(
    Boolean(!item.note && !item.labels.length && item.status !== "done"),
  );
  const title = bug ? getBugTitle(bug) : "Report no longer in this result set";
  const dateState = getDateState(item.followUpDate, item.status);

  useEffect(() => {
    setNoteDraft(item.note);
    setLabelsDraft(item.labels.join(", "));
  }, [item.note, item.labels]);

  const saveTextFields = () => {
    onUpdate(item.bugId, {
      note: noteDraft,
      labels: parseLabels(labelsDraft),
    });
  };

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm shadow-slate-200/20 ${
        dateState === "overdue"
          ? "border-rose-200"
          : item.status === "done"
            ? "border-slate-200"
            : "border-slate-200/80"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <TriageStatusSelect
              value={item.status}
              bugTitle={title}
              onChange={(status) => onUpdate(item.bugId, { status })}
            />
            {bug && (
              <>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                  {getBugSeverity(bug)}
                </span>
                <span className="text-[10px] text-slate-400">
                  {getBugStatus(bug)}
                </span>
              </>
            )}
            {dateState === "overdue" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">
                <CircleAlert size={11} />
                Follow-up overdue
              </span>
            )}
            {dateState === "today" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">
                <Bell size={11} />
                Due today
              </span>
            )}
          </div>
          {bug ? (
            <button
              type="button"
              onClick={() => onOpenBug(bug)}
              className="mt-2 block max-w-full truncate text-left text-sm font-semibold text-slate-900 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              {title}
            </button>
          ) : (
            <p className="mt-2 text-sm font-semibold text-slate-700">{title}</p>
          )}
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500">
            <span className="font-mono">{item.bugId}</span>
            <span aria-hidden="true">·</span>
            <span>{formatUpdatedDate(item.updatedAt)}</span>
            {stale && <span className="text-amber-700">Not in latest results</span>}
          </p>
          {item.labels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.labels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-[10px] font-medium text-sky-800"
                >
                  <Tag size={10} />
                  {label}
                </span>
              ))}
            </div>
          )}
          {item.note && !isExpanded && (
            <p className="mt-2 line-clamp-2 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">
              {item.note}
            </p>
          )}
          <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] text-slate-500">
            <CalendarClock size={12} />
            {formatFollowUpDate(item.followUpDate)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {getSafeHttpUrl(bug?.testUrl) && (
            <a
              href={getSafeHttpUrl(bug.testUrl)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open affected page for ${title}`}
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-violet-200 hover:text-violet-700"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded((expanded) => !expanded)}
            aria-expanded={isExpanded}
            className="rounded-lg border border-slate-200 px-2.5 py-2 text-[10px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700"
          >
            {isExpanded ? "Hide details" : "Edit notes"}
          </button>
          <button
            type="button"
            onClick={() => onRemove(item.bugId)}
            aria-label={`Remove ${title} from personal triage`}
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
              <StickyNote size={13} />
              Private note
            </span>
            <textarea
              value={noteDraft}
              maxLength={MAX_NOTE_LENGTH}
              onChange={(event) => setNoteDraft(event.target.value)}
              onBlur={saveTextFields}
              placeholder="Add your own context or next action..."
              rows={3}
              className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs leading-5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
            />
            <span className="mt-1 block text-right text-[10px] tabular-nums text-slate-400">
              {noteDraft.length}/{MAX_NOTE_LENGTH}
            </span>
          </label>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <Tag size={13} />
                Personal labels
              </span>
              <input
                type="text"
                value={labelsDraft}
                onChange={(event) => setLabelsDraft(event.target.value)}
                onBlur={saveTextFields}
                placeholder="e.g. reproduce, ask team"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
              />
              <span className="mt-1 block text-[10px] text-slate-400">
                Separate labels with commas · up to {MAX_LABELS}
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <CalendarClock size={13} />
                Follow-up date
              </span>
              <input
                type="date"
                value={item.followUpDate}
                onChange={(event) =>
                  onUpdate(item.bugId, {
                    followUpDate: event.target.value,
                  })
                }
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs text-slate-700 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {[1, 3, 7].map((days) => {
                const date = new Date();
                date.setDate(date.getDate() + days);
                const quickDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

                return (
                  <button
                    key={days}
                    type="button"
                    onClick={() =>
                      onUpdate(item.bugId, { followUpDate: quickDate })
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-600 hover:border-violet-200 hover:text-violet-700"
                  >
                    In {days} day{days > 1 ? "s" : ""}
                  </button>
                );
              })}
              {item.followUpDate && (
                <button
                  type="button"
                  onClick={() => onUpdate(item.bugId, { followUpDate: "" })}
                  className="rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-slate-500 hover:bg-slate-100"
                >
                  Clear date
                </button>
              )}
            </div>
            <p className="text-[10px] leading-4 text-slate-400">
              Notes, labels, and reminders stay in this browser and are never
              sent with the report.
            </p>
          </div>
        </div>
      )}
    </article>
  );
}

function QueueCount({ label, value, tone = "slate" }) {
  const styles = {
    violet: "bg-violet-50 text-violet-800",
    amber: "bg-amber-50 text-amber-800",
    rose: "bg-rose-50 text-rose-800",
    emerald: "bg-emerald-50 text-emerald-800",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
      <p className="text-[10px] font-medium text-slate-500">{label}</p>
      <p
        className={`mt-1 inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${styles[tone]}`}
      >
        {value}
      </p>
    </div>
  );
}

export default function PersonalTriageWorkspace({
  bugs,
  email,
  onOpenBug,
}) {
  const [items, setItems] = useState([]);
  const [loadedForEmail, setLoadedForEmail] = useState("");
  const [canPersist, setCanPersist] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [queueSearch, setQueueSearch] = useState("");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [showAddReports, setShowAddReports] = useState(false);
  const normalizedEmail = normalizeText(email, 320).toLowerCase();
  const storageKey = normalizedEmail ? getStorageKey(normalizedEmail) : "";

  useEffect(() => {
    setItems([]);
    setLoadedForEmail("");
    setCanPersist(false);
    setStorageError("");
    setActiveFilter("all");
    setQueueSearch("");
    setCandidateSearch("");

    if (!normalizedEmail) return;

    try {
      const saved = window.localStorage.getItem(getStorageKey(normalizedEmail));
      const parsed = saved ? JSON.parse(saved) : [];
      setItems(normalizeTriageItems(parsed));
      setCanPersist(true);
    } catch {
      setStorageError(
        "Could not read your personal triage list from this browser.",
      );
      setItems([]);
    } finally {
      setLoadedForEmail(normalizedEmail);
    }
  }, [normalizedEmail]);

  useEffect(() => {
    if (!canPersist || !storageKey || loadedForEmail !== normalizedEmail) {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
      setStorageError("");
    } catch {
      setStorageError(
        "Changes are only in memory. Browser storage could not save this triage list.",
      );
    }
  }, [items, canPersist, loadedForEmail, normalizedEmail, storageKey]);

  const bugById = useMemo(
    () => new Map(bugs.map((bug) => [getBugId(bug), bug])),
    [bugs],
  );
  const queuedIds = useMemo(
    () => new Set(items.map((item) => item.bugId)),
    [items],
  );
  const sortedItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        const leftBug = bugById.get(left.bugId);
        const rightBug = bugById.get(right.bugId);
        const leftDate = getDateState(left.followUpDate, left.status);
        const rightDate = getDateState(right.followUpDate, right.status);
        const dateOrder = { overdue: 0, today: 1, upcoming: 2, none: 3 };

        if (dateOrder[leftDate] !== dateOrder[rightDate]) {
          return dateOrder[leftDate] - dateOrder[rightDate];
        }

        const severityDifference =
          severityRank(rightBug || {}) - severityRank(leftBug || {});
        if (severityDifference) return severityDifference;

        return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
      }),
    [items, bugById],
  );
  const visibleItems = useMemo(() => {
    const query = queueSearch.trim().toLowerCase();

    return sortedItems.filter((item) => {
      const bug = bugById.get(item.bugId);
      const dateState = getDateState(item.followUpDate, item.status);
      const matchesFilter =
        activeFilter === "all" ||
        item.status === activeFilter ||
        (activeFilter === "overdue" && dateState === "overdue");
      const searchText = [
        item.bugId,
        item.note,
        ...item.labels,
        bug?.title,
        bug?.description,
        bug?.summary,
        bug?.category,
      ]
        .filter((part) => typeof part === "string")
        .join(" ")
        .toLowerCase();

      return matchesFilter && (!query || searchText.includes(query));
    });
  }, [sortedItems, queueSearch, activeFilter, bugById]);
  const candidateReports = useMemo(() => {
    const query = candidateSearch.trim().toLowerCase();

    return bugs
      .filter((bug) => {
        const id = getBugId(bug);
        if (!id || id === "ID unavailable" || queuedIds.has(id)) return false;
        if (!query) return true;

        return [id, bug.title, bug.summary, bug.description, bug.category]
          .filter((part) => typeof part === "string")
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((left, right) => {
        const statusDifference =
          Number(getBugStatus(left) === "Closed") -
          Number(getBugStatus(right) === "Closed");
        return statusDifference || severityRank(right) - severityRank(left);
      })
      .slice(0, 6);
  }, [bugs, candidateSearch, queuedIds]);

  const counts = useMemo(
    () => ({
      total: items.length,
      next: items.filter((item) => item.status === "next").length,
      waiting: items.filter((item) => item.status === "waiting").length,
      done: items.filter((item) => item.status === "done").length,
      overdue: items.filter(
        (item) => getDateState(item.followUpDate, item.status) === "overdue",
      ).length,
    }),
    [items],
  );

  const updateItem = (bugId, changes) => {
    setItems((current) =>
      current.map((item) =>
        item.bugId === bugId
          ? normalizeTriageItem({
              ...item,
              ...changes,
              updatedAt: new Date().toISOString(),
            })
          : item,
      ),
    );
  };

  const addReport = (bug) => {
    const bugId = getBugId(bug);
    if (!bugId || bugId === "ID unavailable" || queuedIds.has(bugId)) return;

    if (items.length >= MAX_TRIAGE_ITEMS) {
      setStorageError(
        `Your personal queue is full. Remove an item before adding more than ${MAX_TRIAGE_ITEMS} reports.`,
      );
      return;
    }

    const now = new Date().toISOString();
    setItems((current) => [
      normalizeTriageItem({
        bugId,
        status: "next",
        note: "",
        labels: [],
        followUpDate: "",
        addedAt: now,
        updatedAt: now,
      }),
      ...current,
    ]);
  };

  const removeReport = (bugId) => {
    setItems((current) => current.filter((item) => item.bugId !== bugId));
  };

  const exportQueue = () => {
    try {
      downloadPersonalTriage(normalizedEmail, items, bugs);
      setStorageError("");
    } catch {
      setStorageError("Could not export this personal triage list.");
    }
  };

  const filterCounts = {
    all: counts.total,
    next: counts.next,
    waiting: counts.waiting,
    done: counts.done,
    overdue: counts.overdue,
  };

  if (!normalizedEmail || loadedForEmail !== normalizedEmail) {
    return null;
  }

  return (
    <section
      className="mt-7 overflow-hidden rounded-[22px] border border-violet-100 bg-gradient-to-br from-violet-50/70 via-white to-sky-50/40 shadow-sm shadow-violet-100/40"
      aria-labelledby="personal-triage-heading"
    >
      <div className="border-b border-violet-100/80 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
              <ClipboardCheck size={19} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="personal-triage-heading"
                  className="text-base font-semibold tracking-tight text-slate-900"
                >
                  My triage list
                </h2>
                <span className="rounded-full border border-violet-100 bg-white px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                  Private to this browser
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                Keep personal notes, labels, review status, and follow-up dates
                for reports. These details are not sent to the server.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddReports((visible) => !visible)}
              aria-expanded={showAddReports}
              aria-controls="personal-triage-add-reports"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-violet-700 px-3 text-xs font-semibold text-white transition hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
            >
              {showAddReports ? <X size={14} /> : <Plus size={14} />}
              {showAddReports ? "Close picker" : "Add reports"}
            </button>
            <button
              type="button"
              onClick={exportQueue}
              disabled={!items.length}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download size={14} />
              Export notes
            </button>
          </div>
        </div>
        {storageError && (
          <p
            role="status"
            className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900"
          >
            {storageError}
          </p>
        )}
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <QueueCount label="In my queue" value={counts.total} tone="violet" />
          <QueueCount label="To review" value={counts.next} tone="slate" />
          <QueueCount label="Waiting" value={counts.waiting} tone="amber" />
          <QueueCount label="Done" value={counts.done} tone="emerald" />
          <QueueCount label="Overdue" value={counts.overdue} tone="rose" />
        </div>

        {showAddReports && (
          <div
            id="personal-triage-add-reports"
            className="rounded-2xl border border-violet-100 bg-white p-3 sm:p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Add a report to your personal queue
                </h3>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  Adding a report creates browser-only triage data; it does not
                  change the shared report or its status.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600">
                {items.length}/{MAX_TRIAGE_ITEMS}
              </span>
            </div>
            <label className="relative mt-3 block">
              <span className="sr-only">Search reports to add</span>
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={candidateSearch}
                onChange={(event) => setCandidateSearch(event.target.value)}
                placeholder="Find a report by title, ID, or category"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
              />
            </label>
            {candidateReports.length ? (
              <ul className="mt-3 divide-y divide-slate-100">
                {candidateReports.map((bug) => (
                  <li
                    key={getBugId(bug)}
                    className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-slate-800">
                        {getBugTitle(bug)}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-x-2 text-[10px] text-slate-500">
                        <span className="font-mono">{getBugId(bug)}</span>
                        <span>{getBugSeverity(bug)} severity</span>
                        <span>{getBugStatus(bug)}</span>
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => addReport(bug)}
                      disabled={items.length >= MAX_TRIAGE_ITEMS}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[10px] font-semibold text-violet-800 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus size={12} />
                      Add to queue
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
                <p className="text-xs font-medium text-slate-700">
                  {bugs.length
                    ? "No reports match your search."
                    : "There are no reports available to add."}
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  {bugs.length
                    ? "Try a different title, report ID, or category."
                    : "Search for reports with this email to start a queue."}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1"
            role="group"
            aria-label="Filter personal triage reports"
          >
            {TRIAGE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                aria-pressed={activeFilter === filter.value}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-semibold transition ${
                  activeFilter === filter.value
                    ? "bg-white text-violet-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {filter.label}
                <span className="tabular-nums text-slate-400">
                  {filterCounts[filter.value]}
                </span>
              </button>
            ))}
          </div>
          <label className="relative block min-w-0 lg:w-72">
            <span className="sr-only">Search your personal triage list</span>
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={queueSearch}
              onChange={(event) => setQueueSearch(event.target.value)}
              placeholder="Search notes, labels, or reports"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </label>
        </div>

        {visibleItems.length ? (
          <div className="space-y-2.5">
            {visibleItems.map((item) => {
              const bug = bugById.get(item.bugId);

              return (
                <TriageItemCard
                  key={item.bugId}
                  item={item}
                  bug={bug}
                  stale={!bug}
                  onUpdate={updateItem}
                  onRemove={removeReport}
                  onOpenBug={onOpenBug}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white/80 px-5 py-8 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-700">
              {items.length ? (
                <ArrowDownWideNarrow size={19} />
              ) : (
                <FileText size={19} />
              )}
            </span>
            <h3 className="mt-3 text-sm font-semibold text-slate-800">
              {items.length
                ? "No triage items match this view"
                : "Your personal queue is empty"}
            </h3>
            <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
              {items.length
                ? "Change the filter or search, or add another report to your personal queue."
                : "Add reports you want to revisit. You can keep private notes, set follow-up dates, and track your own progress."}
            </p>
            {!items.length && (
              <button
                type="button"
                onClick={() => setShowAddReports(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-violet-800"
              >
                <Plus size={13} />
                Add your first report
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-start gap-2 border-t border-violet-100 pt-3 text-[10px] leading-4 text-slate-500">
          <ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-600" />
          <p className="min-w-0 flex-1">
            Personal triage is saved in this browser for{" "}
            <span className="font-medium text-slate-700">{normalizedEmail}</span>
            . It is separate from report status and is not included in report
            submissions.
          </p>
          {items.length > 0 && (
            <span className="inline-flex items-center gap-1 text-slate-400">
              <Flag size={11} />
              Sorted by follow-up and severity
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
