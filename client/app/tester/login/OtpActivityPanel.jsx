"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  Download,
  Eraser,
  Filter,
  KeyRound,
  LockKeyhole,
  Mail,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";

const ACTIVITY_FILTERS = [
  { id: "all", label: "All activity" },
  { id: "verification", label: "Verification" },
  { id: "delivery", label: "Email delivery" },
  { id: "input", label: "Code entry" },
  { id: "privacy", label: "Privacy" },
];

const PAGE_SIZE = 8;

const EVENT_PRESENTATION = {
  request_started: {
    category: "delivery",
    label: "Code request started",
    icon: Send,
    tone: "blue",
  },
  request_finished: {
    category: "delivery",
    label: "Code request completed",
    icon: Mail,
    tone: "green",
  },
  request_failed: {
    category: "delivery",
    label: "Code request failed",
    icon: AlertCircle,
    tone: "rose",
  },
  verify_started: {
    category: "verification",
    label: "Verification started",
    icon: KeyRound,
    tone: "blue",
  },
  verify_succeeded: {
    category: "verification",
    label: "Verification completed",
    icon: CheckCircle2,
    tone: "green",
  },
  verify_failed: {
    category: "verification",
    label: "Verification was not accepted",
    icon: XCircle,
    tone: "rose",
  },
  code_edited: {
    category: "input",
    label: "Code entry updated",
    icon: ClipboardList,
    tone: "slate",
  },
  code_pasted: {
    category: "input",
    label: "Code pasted",
    icon: ClipboardList,
    tone: "violet",
  },
  code_cleared: {
    category: "input",
    label: "Code entry cleared",
    icon: Eraser,
    tone: "slate",
  },
  code_incomplete: {
    category: "input",
    label: "Incomplete code",
    icon: AlertCircle,
    tone: "amber",
  },
  auto_verify_changed: {
    category: "verification",
    label: "Auto-verify preference changed",
    icon: Activity,
    tone: "violet",
  },
  visibility_changed: {
    category: "privacy",
    label: "Code visibility changed",
    icon: LockKeyhole,
    tone: "amber",
  },
  resend_requested: {
    category: "delivery",
    label: "Resend requested",
    icon: Send,
    tone: "blue",
  },
  resend_ready: {
    category: "delivery",
    label: "Resend available",
    icon: Clock3,
    tone: "green",
  },
};

const TONE_CLASSES = {
  blue: "bg-sky-50 text-sky-700 ring-sky-100",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
  amber: "bg-amber-50 text-amber-800 ring-amber-100",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
};

function getPresentation(event) {
  return (
    EVENT_PRESENTATION[event.type] || {
      category: event.category || "input",
      label: event.title || "Activity recorded",
      icon: Activity,
      tone: "slate",
    }
  );
}

function getFilterLabel(filterId) {
  return (
    ACTIVITY_FILTERS.find((filter) => filter.id === filterId)?.label ||
    "Activity"
  );
}

function formatClock(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatCalendarDate(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDayKey(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "unknown";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDayHeading(dayKey, now = new Date()) {
  if (dayKey === "unknown") return "Date unavailable";

  const todayKey = getDayKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getDayKey(yesterday.getTime());

  if (dayKey === todayKey) return "Today";
  if (dayKey === yesterdayKey) return "Yesterday";

  const [year, month, day] = dayKey.split("-").map(Number);
  return formatCalendarDate(new Date(year, month - 1, day).getTime());
}

function getRelativeTime(timestamp, now = Date.now()) {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - Number(timestamp)) / 1000),
  );

  if (!Number.isFinite(elapsedSeconds)) return "Time unavailable";
  if (elapsedSeconds < 5) return "Just now";
  if (elapsedSeconds < 60) return `${elapsedSeconds}s ago`;

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}d ago`;
}

function buildCsvValue(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function getSearchableEventText(event, presentation) {
  return [
    presentation.label,
    presentation.category,
    event.detail || "",
    event.source || "",
  ]
    .join(" ")
    .toLowerCase();
}

function groupEventsByDay(events) {
  const groups = new Map();

  events.forEach((event) => {
    const key = getDayKey(event.timestamp);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  });

  return [...groups.entries()].map(([key, dayEvents]) => ({
    key,
    title: getDayHeading(key),
    events: dayEvents,
  }));
}

function ActivityIcon({ event }) {
  const presentation = getPresentation(event);
  const Icon = presentation.icon;

  return (
    <span
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ring-inset ${
        TONE_CLASSES[presentation.tone] || TONE_CLASSES.slate
      }`}
      aria-hidden="true"
    >
      <Icon size={15} />
    </span>
  );
}

function ActivityRecord({ event, index, isLast }) {
  const presentation = getPresentation(event);
  const detail = event.detail || "No additional details.";
  const [showExactTime, setShowExactTime] = useState(false);

  return (
    <li className="relative flex gap-3 pb-3 last:pb-0">
      {!isLast && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-4 top-8 w-px bg-slate-200"
        />
      )}
      <ActivityIcon event={event} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-800">
              {presentation.label}
            </p>
            <p className="mt-0.5 break-words text-[10px] leading-4 text-slate-500">
              {detail}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowExactTime((visible) => !visible)}
            aria-label={`Event ${index + 1}, ${
              showExactTime ? formatClock(event.timestamp) : "show exact time"
            }`}
            className="inline-flex shrink-0 items-center gap-1 rounded px-1 py-0.5 text-[9px] tabular-nums text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <Clock3 size={10} aria-hidden="true" />
            {showExactTime
              ? formatClock(event.timestamp)
              : getRelativeTime(event.timestamp)}
          </button>
        </div>
        {event.source && (
          <p className="mt-1 text-[9px] text-slate-400">
            Source: {event.source}
          </p>
        )}
      </div>
    </li>
  );
}

function FilterButton({ filter, active, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 ${
        active
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : "border-slate-200 bg-white text-slate-500 hover:border-violet-200 hover:text-violet-700"
      }`}
    >
      {filter.label}
      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] tabular-nums">
        {count}
      </span>
    </button>
  );
}

function ActivitySummary({ events }) {
  const summary = useMemo(() => {
    const counts = {
      delivery: 0,
      verification: 0,
      input: 0,
      privacy: 0,
    };

    events.forEach((event) => {
      const { category } = getPresentation(event);
      if (Object.hasOwn(counts, category)) counts[category] += 1;
    });

    return counts;
  }, [events]);

  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[
        { id: "delivery", label: "Delivery", value: summary.delivery },
        {
          id: "verification",
          label: "Verification",
          value: summary.verification,
        },
        { id: "input", label: "Code entry", value: summary.input },
        { id: "privacy", label: "Privacy", value: summary.privacy },
      ].map((item) => (
        <div
          key={item.id}
          className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2"
        >
          <dt className="text-[9px] text-slate-500">{item.label}</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-slate-800">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function OtpActivityPanel({ events = [], onClear }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [exportMessage, setExportMessage] = useState("");
  const [showSummary, setShowSummary] = useState(true);
  const normalizedSearch = searchText.trim().toLowerCase();

  const filterCounts = useMemo(
    () =>
      ACTIVITY_FILTERS.reduce((counts, filter) => {
        counts[filter.id] =
          filter.id === "all"
            ? events.length
            : events.filter(
                (event) => getPresentation(event).category === filter.id,
              ).length;
        return counts;
      }, {}),
    [events],
  );

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const presentation = getPresentation(event);
        const categoryMatches =
          activeFilter === "all" || presentation.category === activeFilter;
        return (
          categoryMatches &&
          getSearchableEventText(event, presentation).includes(normalizedSearch)
        );
      }),
    [activeFilter, events, normalizedSearch],
  );

  const visibleEvents = filteredEvents.slice(0, visibleCount);
  const dayGroups = useMemo(
    () => groupEventsByDay(visibleEvents),
    [visibleEvents],
  );
  const hasActiveFilters = activeFilter !== "all" || normalizedSearch.length > 0;

  const clearFilters = () => {
    setActiveFilter("all");
    setSearchText("");
    setVisibleCount(PAGE_SIZE);
  };

  const changeFilter = (filterId) => {
    setActiveFilter(filterId);
    setVisibleCount(PAGE_SIZE);
  };

  const updateSearch = (value) => {
    setSearchText(value);
    setVisibleCount(PAGE_SIZE);
  };

  const exportActivity = () => {
    setExportMessage("");

    if (!events.length) {
      setExportMessage("There is no activity to export yet.");
      return;
    }

    let downloadUrl = "";

    try {
      const rows = [
        ["Time (local)", "Event", "Category", "Details", "Source"],
        ...filteredEvents.map((event) => {
          const presentation = getPresentation(event);
          return [
            formatCalendarDate(event.timestamp) + " " + formatClock(event.timestamp),
            presentation.label,
            presentation.category,
            event.detail || "",
            event.source || "",
          ];
        }),
      ];
      const csv = rows
        .map((row) => row.map(buildCsvValue).join(","))
        .join("\r\n");
      const blob = new Blob(["\uFEFF", csv], {
        type: "text/csv;charset=utf-8",
      });

      downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `otp-activity-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      downloadUrl = "";
      setExportMessage(
        `Exported ${filteredEvents.length} filtered activity ${
          filteredEvents.length === 1 ? "event" : "events"
        }.`,
      );
    } catch {
      setExportMessage("Could not export activity. Please try again.");
    } finally {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    }
  };

  const clearActivity = () => {
    if (!events.length || !onClear) return;
    onClear();
    setExportMessage("Session activity cleared.");
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <section
      className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white"
      aria-labelledby="otp-activity-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600">
            <Activity size={15} aria-hidden="true" />
          </span>
          <div>
            <h3
              id="otp-activity-title"
              className="text-xs font-semibold text-slate-800"
            >
              Sign-in activity
            </h3>
            <p className="mt-0.5 text-[10px] text-slate-500">
              {events.length
                ? `${events.length} session ${
                    events.length === 1 ? "event" : "events"
                  } recorded`
                : "No sign-in events recorded yet"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls="otp-activity-content"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          {isOpen ? "Hide activity" : "View activity"}
          <ChevronDown
            size={13}
            aria-hidden="true"
            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {isOpen && (
        <div
          id="otp-activity-content"
          className="space-y-3 border-t border-slate-100 p-3"
        >
          <div className="flex items-start gap-2 rounded-lg bg-violet-50/60 px-3 py-2">
            <ShieldCheck
              size={13}
              className="mt-0.5 shrink-0 text-violet-700"
              aria-hidden="true"
            />
            <p className="text-[10px] leading-4 text-violet-900">
              This timeline is kept in page memory only. Verification digits,
              email contents, and authentication tokens are never recorded.
            </p>
          </div>

          {events.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowSummary((visible) => !visible)}
                aria-expanded={showSummary}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <Activity size={12} aria-hidden="true" />
                {showSummary ? "Hide summary" : "Show summary"}
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={exportActivity}
                  disabled={!filteredEvents.length}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-600 hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download size={12} aria-hidden="true" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={clearActivity}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-600 hover:border-rose-200 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  <Trash2 size={12} aria-hidden="true" />
                  Clear
                </button>
              </div>
            </div>
          )}

          {showSummary && events.length > 0 && (
            <ActivitySummary events={events} />
          )}

          {exportMessage && (
            <p
              role="status"
              aria-live="polite"
              className={`text-[10px] ${
                exportMessage.startsWith("Could not") ||
                exportMessage.startsWith("There is no")
                  ? "text-rose-700"
                  : "text-slate-500"
              }`}
            >
              {exportMessage}
            </p>
          )}

          {events.length > 0 && (
            <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
              {ACTIVITY_FILTERS.map((filter) => (
                <FilterButton
                  key={filter.id}
                  filter={filter}
                  count={filterCounts[filter.id] || 0}
                  active={activeFilter === filter.id}
                  onClick={() => changeFilter(filter.id)}
                />
              ))}
            </div>
          )}

          {events.length > 0 && (
            <div className="relative">
              <Search
                size={13}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchText}
                onChange={(event) => updateSearch(event.target.value)}
                placeholder="Search sign-in activity..."
                aria-label="Search sign-in activity"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[10px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </div>
          )}

          {filteredEvents.length > 0 ? (
            <ol className="space-y-4" aria-label="Sign-in event timeline">
              {dayGroups.map((group) => (
                <li key={group.key}>
                  <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {group.title}
                  </h4>
                  <ol className="space-y-2">
                    {group.events.map((event, index) => (
                      <ActivityRecord
                        key={event.id}
                        event={event}
                        index={index}
                        isLast={index === group.events.length - 1}
                      />
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          ) : events.length > 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <Filter
                size={19}
                className="mx-auto text-slate-400"
                aria-hidden="true"
              />
              <p className="mt-2 text-xs font-semibold text-slate-700">
                No matching activity
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                Try a different search or activity category.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 rounded-lg px-3 py-2 text-[10px] font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <ClipboardList
                size={19}
                className="mx-auto text-slate-400"
                aria-hidden="true"
              />
              <p className="mt-2 text-xs font-semibold text-slate-700">
                Your sign-in timeline is ready
              </p>
              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                Code requests, verification outcomes, and privacy actions will
                appear here for this page session.
              </p>
            </div>
          )}

          {visibleEvents.length < filteredEvents.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <ArrowDownToLine size={12} aria-hidden="true" />
              Show {Math.min(
                PAGE_SIZE,
                filteredEvents.length - visibleEvents.length,
              )}{" "}
              more events
            </button>
          )}

          <p className="text-center text-[9px] leading-4 text-slate-400">
            Showing {visibleEvents.length} of {filteredEvents.length} matching
            events · {getFilterLabel(activeFilter)}
          </p>
        </div>
      )}
    </section>
  );
}
