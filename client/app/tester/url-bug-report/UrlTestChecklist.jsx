"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  Check,
  CheckCircle2,
  Clipboard,
  Clock3,
  Download,
  ExternalLink,
  FileCheck2,
  Filter,
  ListChecks,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import UrlTestRunLibrary from "./UrlTestRunLibrary";

const TEST_STATUSES = [
  { id: "not-tested", label: "Not tested", icon: ListChecks },
  { id: "passed", label: "Passed", icon: CheckCircle2 },
  { id: "issue-found", label: "Issue found", icon: AlertCircle },
];

const STATUS_STYLES = {
  "not-tested": {
    badge: "border-slate-200 bg-slate-100 text-slate-700",
    button: "border-slate-200 text-slate-600 hover:bg-slate-50",
    activeButton: "border-slate-300 bg-slate-100 text-slate-800",
  },
  passed: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
    button: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
    activeButton: "border-emerald-300 bg-emerald-100 text-emerald-800",
  },
  "issue-found": {
    badge: "border-rose-200 bg-rose-50 text-rose-800",
    button: "border-rose-200 text-rose-700 hover:bg-rose-50",
    activeButton: "border-rose-300 bg-rose-100 text-rose-800",
  },
};

const FILTER_OPTIONS = [
  { id: "all", label: "All pages" },
  { id: "not-tested", label: "Not tested" },
  { id: "passed", label: "Passed" },
  { id: "issue-found", label: "Issues found" },
];

const PANEL_BUTTON =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

function createScenarioId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `page-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

function createScenario(url, title = "") {
  const parsedUrl = parseHttpUrl(url);
  if (!parsedUrl) return null;
  parsedUrl.username = "";
  parsedUrl.password = "";

  const lastSegment = decodePathSegment(
    parsedUrl.pathname.split("/").filter(Boolean).at(-1) || "",
  );

  return {
    id: createScenarioId(),
    title: title.trim() || lastSegment || "Home page",
    url: parsedUrl.href,
    status: "not-tested",
    checkedAt: null,
    notes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function decodePathSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function buildUrlForSite(value, activeValue) {
  const activeUrl = parseHttpUrl(activeValue);
  if (!activeUrl) {
    throw new Error("The current test destination is not a valid web URL.");
  }

  const enteredValue = value.trim();
  if (!enteredValue) {
    throw new Error("Enter a page path or URL first.");
  }

  let destination;
  try {
    if (/^https?:\/\//i.test(enteredValue)) {
      destination = new URL(enteredValue);
    } else {
      const path = enteredValue.startsWith("/")
        ? enteredValue
        : `/${enteredValue}`;
      destination = new URL(path, activeUrl.origin);
    }
  } catch {
    throw new Error("Enter a valid path, such as /account/settings.");
  }

  if (!["http:", "https:"].includes(destination.protocol)) {
    throw new Error("Only HTTP and HTTPS pages can be added.");
  }

  if (destination.origin !== activeUrl.origin) {
    throw new Error("Checklist pages must use the current website origin.");
  }

  destination.username = "";
  destination.password = "";
  return destination.href;
}

function makeSafeUrl(value) {
  const url = parseHttpUrl(value);
  if (!url) return "Invalid URL";

  url.username = "";
  url.password = "";
  const entries = [...url.searchParams.entries()];
  url.search = "";
  entries.forEach(([key]) => url.searchParams.append(key, "[redacted]"));
  url.hash = "";
  return url.href;
}

function makeChecklistExport(scenarios, activeUrl) {
  const lines = [
    "Manual page test checklist",
    `Website: ${parseHttpUrl(activeUrl)?.origin || "Not available"}`,
    `Exported: ${new Date().toLocaleString()}`,
    "Privacy: query values are redacted; URL fragments and credentials are omitted.",
    "Review notes and page paths before sharing.",
    "",
  ];

  scenarios.forEach((scenario, index) => {
    const status =
      TEST_STATUSES.find((item) => item.id === scenario.status)?.label ||
      "Not tested";
    lines.push(`${index + 1}. ${scenario.title}`);
    lines.push(`   Result: ${status}`);
    const checkedAt = formatCheckedAt(scenario.checkedAt);
    if (checkedAt) lines.push(`   Last checked: ${checkedAt}`);
    lines.push(`   Page: ${makeSafeUrl(scenario.url)}`);
    if (scenario.notes.trim()) {
      lines.push(`   Notes: ${scenario.notes.trim().replace(/\s+/g, " ")}`);
    }
    lines.push("");
  });

  return lines.join("\n").trim();
}

function getStatusLabel(statusId) {
  return TEST_STATUSES.find((status) => status.id === statusId)?.label ||
    "Not tested";
}

function formatCheckedAt(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function StatusBadge({ status }) {
  const config =
    TEST_STATUSES.find((item) => item.id === status) || TEST_STATUSES[0];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${STATUS_STYLES[config.id].badge}`}
    >
      <Icon size={11} aria-hidden="true" />
      {config.label}
    </span>
  );
}

function ChecklistMetric({ label, value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-800",
    emerald: "border-emerald-100 bg-emerald-50/70 text-emerald-800",
    rose: "border-rose-100 bg-rose-50/70 text-rose-800",
    violet: "border-violet-100 bg-violet-50/70 text-violet-800",
  };

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${tones[tone] || tones.slate}`}
    >
      <p className="text-[9px] font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

function ScenarioStatusControls({ scenario, onChange }) {
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">
        Test result for {scenario.title || "this page"}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {TEST_STATUSES.map((status) => {
          const Icon = status.icon;
          const isActive = scenario.status === status.id;

          return (
            <button
              key={status.id}
              type="button"
              onClick={() => onChange(status.id)}
              aria-pressed={isActive}
              className={`inline-flex min-h-8 items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                isActive
                  ? STATUS_STYLES[status.id].activeButton
                  : STATUS_STYLES[status.id].button
              }`}
            >
              <Icon size={12} aria-hidden="true" />
              {status.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ScenarioCard({
  scenario,
  isActive,
  isSelected,
  onToggleSelected,
  onSelect,
  onReportIssue,
  onUpdate,
  onRemove,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const parsedUrl = parseHttpUrl(scenario.url);

  return (
    <li
      className={`rounded-xl border bg-white transition ${
        isActive
          ? "border-violet-300 ring-2 ring-violet-100"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="space-y-3 p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(event) => onToggleSelected(event.target.checked)}
            aria-label={`Select ${scenario.title} for bulk result updates`}
            className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-violet-700 focus:ring-2 focus:ring-violet-400"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="break-words text-sm font-semibold text-slate-900">
                {scenario.title}
              </h4>
              <StatusBadge status={scenario.status} />
              {isActive && (
                <span className="rounded-full bg-violet-100 px-2 py-1 text-[9px] font-semibold text-violet-800">
                  Active report destination
                </span>
              )}
            </div>
            <p className="mt-1 break-all text-[11px] leading-5 text-slate-500">
              {parsedUrl ? makeSafeUrl(scenario.url) : "Invalid URL"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(scenario.id)}
            aria-label={`Remove ${scenario.title} from checklist`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>

        <ScenarioStatusControls
          scenario={scenario}
          onChange={(status) => {
            onUpdate(scenario.id, { status });
            if (status === "issue-found") setIsExpanded(true);
          }}
        />
        {scenario.checkedAt && formatCheckedAt(scenario.checkedAt) && (
          <p className="inline-flex items-center gap-1.5 text-[10px] text-slate-500">
            <Clock3 size={11} aria-hidden="true" />
            Last checked{" "}
            <time dateTime={scenario.checkedAt}>
              {formatCheckedAt(scenario.checkedAt)}
            </time>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={async () => {
              try {
                if (!navigator.clipboard?.writeText) {
                  throw new Error("Clipboard access is unavailable.");
                }

                await navigator.clipboard.writeText(makeSafeUrl(scenario.url));
                toast.success("Sanitized page URL copied.");
              } catch {
                toast.error("Could not copy this page URL.");
              }
            }}
            disabled={!parsedUrl}
            aria-label={`Copy sanitized URL for ${scenario.title}`}
            className={`${PANEL_BUTTON} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
          >
            <Clipboard size={13} aria-hidden="true" />
            Copy safe URL
          </button>
          <button
            type="button"
            onClick={onSelect}
            disabled={!parsedUrl || isActive}
            className={`${PANEL_BUTTON} border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100`}
          >
            <ExternalLink size={13} aria-hidden="true" />
            {isActive ? "Currently testing" : "Test this page"}
          </button>
          {scenario.status === "issue-found" && (
            <button
              type="button"
              onClick={onReportIssue}
              className={`${PANEL_BUTTON} border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100`}
            >
              <ArrowDown size={13} aria-hidden="true" />
              Write report for this page
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded((expanded) => !expanded)}
            aria-expanded={isExpanded}
            className={`${PANEL_BUTTON} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
          >
            {isExpanded ? "Hide notes" : "Notes"}
            {scenario.notes.trim() && (
              <span className="rounded-full bg-violet-100 px-1.5 text-[9px] text-violet-800">
                added
              </span>
            )}
          </button>
        </div>

        {isExpanded && (
          <div className="space-y-3 border-t border-slate-100 pt-3">
            <label className="block text-xs font-semibold text-slate-700">
              Page name
              <input
                value={scenario.title}
                onChange={(event) =>
                  onUpdate(scenario.id, { title: event.target.value })
                }
                maxLength={100}
                className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Test notes
              <textarea
                value={scenario.notes}
                onChange={(event) =>
                  onUpdate(scenario.id, { notes: event.target.value })
                }
                rows={3}
                maxLength={1000}
                placeholder="Record what you checked or what happened..."
                aria-describedby={`checklist-note-help-${scenario.id}`}
                className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal leading-5 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              <span
                id={`checklist-note-help-${scenario.id}`}
                className="mt-1 flex justify-between gap-2 text-[10px] font-normal text-slate-400"
              >
                <span>Notes stay in this page until you leave it.</span>
                <span className="shrink-0 tabular-nums">
                  {scenario.notes.length}/1000
                </span>
              </span>
            </label>
            <p className="text-[10px] leading-4 text-amber-800">
              Notes may contain sensitive details. They are included when you
              copy or download the checklist, so review them before sharing.
            </p>
          </div>
        )}
      </div>
    </li>
  );
}

export default function UrlTestChecklist({
  value,
  onSelect,
  onReportIssue,
}) {
  const [initialChecklist] = useState(() => {
    const firstScenario = createScenario(value);
    return firstScenario
      ? { scenarios: [firstScenario], activeScenarioId: firstScenario.id }
      : { scenarios: [], activeScenarioId: "" };
  });
  const [scenarios, setScenarios] = useState(initialChecklist.scenarios);
  const [activeScenarioId, setActiveScenarioId] = useState(
    initialChecklist.activeScenarioId,
  );
  const [pagePath, setPagePath] = useState("");
  const [pageName, setPageName] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("checklist");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [formError, setFormError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const counts = useMemo(
    () =>
      scenarios.reduce(
        (result, scenario) => {
          result[scenario.status] = (result[scenario.status] || 0) + 1;
          return result;
        },
        { "not-tested": 0, passed: 0, "issue-found": 0 },
      ),
    [scenarios],
  );
  const completionCount = counts.passed + counts["issue-found"];
  const progress = scenarios.length
    ? Math.round((completionCount / scenarios.length) * 100)
    : 0;
  const filteredScenarios = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const matches = scenarios.filter((scenario) => {
      const matchesStatus =
        statusFilter === "all" || scenario.status === statusFilter;
      const matchesSearch =
        !normalizedSearch ||
        scenario.title.toLowerCase().includes(normalizedSearch) ||
        scenario.url.toLowerCase().includes(normalizedSearch) ||
        scenario.notes.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
    if (sortOrder === "name") {
      return [...matches].sort((left, right) =>
        left.title.localeCompare(right.title, undefined, {
          sensitivity: "base",
          numeric: true,
        }),
      );
    }
    if (sortOrder === "last-checked") {
      return [...matches].sort((left, right) => {
        const leftTime = Date.parse(left.checkedAt || "");
        const rightTime = Date.parse(right.checkedAt || "");
        if (Number.isNaN(leftTime)) return Number.isNaN(rightTime) ? 0 : 1;
        if (Number.isNaN(rightTime)) return -1;
        return rightTime - leftTime;
      });
    }
    if (sortOrder === "result") {
      const statusOrder = {
        "not-tested": 0,
        "issue-found": 1,
        passed: 2,
      };
      return [...matches].sort(
        (left, right) =>
          statusOrder[left.status] - statusOrder[right.status],
      );
    }
    return matches;
  }, [scenarios, search, statusFilter, sortOrder]);
  const currentPageAlreadyAdded = scenarios.some(
    (scenario) => scenario.url === value,
  );
  const visibleIds = filteredScenarios.map((scenario) => scenario.id);
  const selectedVisibleCount = visibleIds.filter((id) =>
    selectedIds.has(id),
  ).length;
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const nextUntestedScenario = useMemo(() => {
    const activeIndex = scenarios.findIndex(
      (scenario) =>
        scenario.id === activeScenarioId && scenario.url === value,
    );
    const startIndex = activeIndex < 0 ? 0 : activeIndex + 1;
    const orderedScenarios = [
      ...scenarios.slice(startIndex),
      ...scenarios.slice(0, startIndex),
    ];
    const nextScenario = orderedScenarios.find(
      (scenario) =>
        scenario.status === "not-tested" &&
        scenario.id !== activeScenarioId,
    );

    if (nextScenario) return nextScenario;
    return scenarios.find(
      (scenario) =>
        scenario.status === "not-tested" &&
        scenario.id === activeScenarioId,
    ) || null;
  }, [activeScenarioId, scenarios, value]);

  const updateScenario = (scenarioId, changes) => {
    setScenarios((current) =>
      current.map((scenario) =>
        scenario.id === scenarioId
          ? {
              ...scenario,
              ...changes,
              ...(Object.prototype.hasOwnProperty.call(changes, "status")
                ? {
                    checkedAt:
                      changes.status === "not-tested"
                        ? null
                        : new Date().toISOString(),
                  }
                : {}),
              updatedAt: new Date().toISOString(),
            }
          : scenario,
      ),
    );
  };

  const handleAddPage = (event) => {
    event.preventDefault();
    setFormError("");

    try {
      const url = buildUrlForSite(pagePath, value);
      if (scenarios.some((scenario) => scenario.url === url)) {
        setFormError("This page is already in your checklist.");
        return;
      }

      const scenario = createScenario(url, pageName);
      if (!scenario) {
        setFormError("Enter a valid HTTP or HTTPS page.");
        return;
      }

      setScenarios((current) => [...current, scenario]);
      setPagePath("");
      setPageName("");
      setAnnouncement(`${scenario.title} added to the page checklist.`);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not add this page.",
      );
    }
  };

  const handleSelectScenario = (scenario) => {
    setActiveScenarioId(scenario.id);
    onSelect(scenario.url);
    setAnnouncement(`${scenario.title} is now the active report destination.`);
  };

  const handleLoadSavedRun = (run) => {
    setScenarios(run.scenarios);
    setSelectedIds(new Set());
    setSearch("");
    setStatusFilter("all");
    const activeScenario =
      run.scenarios.find(
        (scenario) => scenario.id === run.activeScenarioId,
      ) || run.scenarios[0];
    setActiveScenarioId(activeScenario?.id || "");
    if (activeScenario) onSelect(activeScenario.url);
  };

  const handleAddCurrentPage = () => {
    const scenario = createScenario(value);
    if (!scenario) {
      setFormError("The current destination cannot be added to the checklist.");
      return;
    }

    if (scenarios.some((item) => item.url === scenario.url)) {
      setFormError("The current destination is already in the checklist.");
      return;
    }

    setScenarios((current) => [...current, scenario]);
    setActiveScenarioId(scenario.id);
    setFormError("");
    setAnnouncement("Current destination added to the page checklist.");
  };

  const handleRemoveScenario = (scenarioId) => {
    const scenario = scenarios.find((item) => item.id === scenarioId);
    setScenarios((current) =>
      current.filter((item) => item.id !== scenarioId),
    );
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(scenarioId);
      return next;
    });
    if (activeScenarioId === scenarioId) setActiveScenarioId("");
    setAnnouncement(
      `${scenario?.title || "Page"} removed from the page checklist.`,
    );
  };

  const handleClearChecklist = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }

    setScenarios([]);
    setSelectedIds(new Set());
    setActiveScenarioId("");
    setConfirmClear(false);
    setAnnouncement("The page checklist was cleared.");
  };

  const handleShare = async () => {
    if (!scenarios.length) {
      toast.info("Add a page before exporting the checklist.");
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable.");
      }

      await navigator.clipboard.writeText(
        makeChecklistExport(scenarios, value),
      );
      toast.success("Sanitized checklist summary copied.");
    } catch {
      toast.error("Could not copy the checklist. Try downloading it instead.");
    }
  };

  const handleDownload = () => {
    if (!scenarios.length) {
      toast.info("Add a page before downloading the checklist.");
      return;
    }

    try {
      const content = makeChecklistExport(scenarios, value);
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `page-test-checklist-${new Date()
        .toISOString()
        .slice(0, 10)}.txt`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      toast.success("Sanitized checklist downloaded.");
    } catch {
      toast.error("Could not download the checklist.");
    }
  };

  const handleShareSelected = async () => {
    const selectedScenarios = scenarios.filter((scenario) =>
      selectedIds.has(scenario.id),
    );
    if (!selectedScenarios.length) {
      toast.info("Select at least one page before copying a summary.");
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable.");
      }

      await navigator.clipboard.writeText(
        makeChecklistExport(selectedScenarios, value),
      );
      setAnnouncement(
        `Copied a sanitized summary of ${selectedScenarios.length} selected page${selectedScenarios.length === 1 ? "" : "s"}.`,
      );
      toast.success("Selected-page summary copied.");
    } catch {
      toast.error(
        "Could not copy the selected pages. Try downloading the checklist instead.",
      );
    }
  };

  const handleDownloadSelected = () => {
    const selectedScenarios = scenarios.filter((scenario) =>
      selectedIds.has(scenario.id),
    );
    if (!selectedScenarios.length) {
      toast.info("Select at least one page before downloading a summary.");
      return;
    }

    try {
      const content = makeChecklistExport(selectedScenarios, value);
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `selected-page-checklist-${new Date()
        .toISOString()
        .slice(0, 10)}.txt`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      setAnnouncement(
        `Downloaded a sanitized summary of ${selectedScenarios.length} selected page${selectedScenarios.length === 1 ? "" : "s"}.`,
      );
      toast.success("Selected-page checklist downloaded.");
    } catch {
      toast.error("Could not download the selected pages.");
    }
  };

  const handleFilterChange = (nextFilter) => {
    setStatusFilter(nextFilter);
    setConfirmClear(false);
  };

  const toggleScenarioSelection = (scenarioId, isSelected) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (isSelected) {
        next.add(scenarioId);
      } else {
        next.delete(scenarioId);
      }
      return next;
    });
  };

  const toggleVisibleSelection = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const updateSelectedResults = (status) => {
    if (!selectedIds.size) return;

    const updatedCount = scenarios.filter((scenario) =>
      selectedIds.has(scenario.id),
    ).length;
    setScenarios((current) =>
      current.map((scenario) =>
        selectedIds.has(scenario.id)
          ? {
              ...scenario,
              status,
              checkedAt:
                status === "not-tested" ? null : new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : scenario,
      ),
    );
    setSelectedIds(new Set());
    setAnnouncement(
      `${updatedCount} selected ${
        updatedCount === 1 ? "page was" : "pages were"
      } marked ${getStatusLabel(status).toLowerCase()}.`,
    );
  };

  return (
    <section
      aria-labelledby="url-test-checklist-title"
      className="mb-6 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm"
    >
      <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-sky-50 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white bg-white text-violet-700 shadow-sm">
              <FileCheck2 size={18} aria-hidden="true" />
            </span>
            <div>
              <h2
                id="url-test-checklist-title"
                className="text-sm font-semibold text-slate-950"
              >
                Page test checklist
              </h2>
              <p className="mt-1 max-w-xl text-xs leading-5 text-slate-600">
                Manually track pages on this website. Pick a page to make it
                the active destination for your bug report.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              onClick={handleShare}
              disabled={!scenarios.length}
              className={`${PANEL_BUTTON} border-violet-200 bg-white text-violet-800 hover:bg-violet-50`}
            >
              <Clipboard size={13} aria-hidden="true" />
              Copy summary
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!scenarios.length}
              className={`${PANEL_BUTTON} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
            >
              <Download size={13} aria-hidden="true" />
              Download
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          aria-label="Checklist progress"
        >
          <ChecklistMetric label="Pages" value={scenarios.length} />
          <ChecklistMetric
            label="Not tested"
            value={counts["not-tested"]}
            tone="slate"
          />
          <ChecklistMetric label="Passed" value={counts.passed} tone="emerald" />
          <ChecklistMetric
            label="Issues"
            value={counts["issue-found"]}
            tone="rose"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px] text-slate-500">
            <span>Manual checks completed</span>
            <span className="font-semibold tabular-nums text-slate-700">
              {completionCount}/{scenarios.length} · {progress}%
            </span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label="Manual page checks completed"
            aria-valuemin={0}
            aria-valuemax={scenarios.length}
            aria-valuenow={completionCount}
            aria-valuetext={`${completionCount} of ${scenarios.length} pages checked`}
          >
            <div
              className="h-full rounded-full bg-violet-600 transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-violet-100 bg-violet-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                {nextUntestedScenario ? "Next page to test" : "Checklist status"}
              </p>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-800">
                {nextUntestedScenario
                  ? nextUntestedScenario.title
                  : scenarios.length
                    ? "All pages have a result."
                    : "Add a page to start testing."}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                nextUntestedScenario &&
                handleSelectScenario(nextUntestedScenario)
              }
              disabled={!nextUntestedScenario}
              className={`${PANEL_BUTTON} shrink-0 border-violet-700 bg-violet-700 text-white hover:bg-violet-800`}
            >
              <ArrowRight size={13} aria-hidden="true" />
              {nextUntestedScenario ? "Test next page" : "No pages left"}
            </button>
          </div>
        </div>

        <form
          onSubmit={handleAddPage}
          className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4"
        >
          <div className="flex items-center gap-2">
            <Plus
              size={15}
              aria-hidden="true"
              className="text-violet-700"
            />
            <h3 className="text-xs font-semibold text-slate-800">
              Add a page to check
            </h3>
          </div>
          <p className="mt-1 text-[10px] leading-5 text-slate-500">
            Add a path like <code>/settings/profile</code> or a full URL from
            this website. External websites are not allowed.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]">
            <label className="block text-[10px] font-semibold text-slate-600">
              Page path or URL
              <input
                value={pagePath}
                onChange={(event) => {
                  setPagePath(event.target.value);
                  setFormError("");
                }}
                maxLength={4096}
                autoComplete="url"
                inputMode="url"
                placeholder="/settings/profile"
                aria-describedby={
                  formError ? "page-checklist-error" : "page-checklist-hint"
                }
                className="mt-1 block min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <label className="block text-[10px] font-semibold text-slate-600">
              Page name
              <input
                value={pageName}
                onChange={(event) => setPageName(event.target.value)}
                maxLength={100}
                placeholder="Optional label"
                className="mt-1 block min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <button
              type="submit"
              disabled={!pagePath.trim()}
              className={`${PANEL_BUTTON} mt-4 border-violet-700 bg-violet-700 text-white hover:bg-violet-800 sm:self-end`}
            >
              <Plus size={14} aria-hidden="true" />
              Add page
            </button>
          </div>
          <p
            id={formError ? "page-checklist-error" : "page-checklist-hint"}
            className={`mt-2 text-[10px] leading-4 ${
              formError ? "text-rose-700" : "text-slate-500"
            }`}
            role={formError ? "alert" : undefined}
          >
            {formError ||
              `Pages are limited to ${parseHttpUrl(value)?.origin || "the current website"}.`}
          </p>
          {!currentPageAlreadyAdded && parseHttpUrl(value) && (
            <button
              type="button"
              onClick={handleAddCurrentPage}
              className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-violet-700 underline underline-offset-2 hover:text-violet-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Check size={11} aria-hidden="true" />
              Add current destination to checklist
            </button>
          )}
        </form>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative min-w-0 flex-1">
            <Search
              size={14}
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <span className="sr-only">Search checklist pages</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search pages, paths, or notes"
              className="min-h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </label>
          <label className="flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5">
            <Filter
              size={13}
              aria-hidden="true"
              className="shrink-0 text-slate-400"
            />
            <span className="sr-only">Filter checklist by result</span>
            <select
              value={statusFilter}
              onChange={(event) => handleFilterChange(event.target.value)}
              className="min-w-28 bg-transparent py-1 text-xs text-slate-700 outline-none"
            >
              {FILTER_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5">
            <span className="sr-only">Sort checklist pages</span>
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              className="min-w-32 bg-transparent py-1 text-xs text-slate-700 outline-none"
            >
              <option value="checklist">Checklist order</option>
              <option value="name">Name A–Z</option>
              <option value="last-checked">Last checked</option>
              <option value="result">Result priority</option>
            </select>
          </label>
        </div>

        {scenarios.length > 0 && (
          <p className="text-[10px] text-slate-500" aria-live="polite">
            Showing {filteredScenarios.length} of {scenarios.length} page
            {scenarios.length === 1 ? "" : "s"}
          </p>
        )}

        {scenarios.length > 0 && (
          <section
            aria-label="Bulk checklist actions"
            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                ref={(element) => {
                  if (element) {
                    element.indeterminate =
                      selectedVisibleCount > 0 && !allVisibleSelected;
                  }
                }}
                onChange={toggleVisibleSelection}
                disabled={visibleIds.length === 0}
                aria-label={`Select all ${visibleIds.length} visible pages`}
                className="h-4 w-4 cursor-pointer rounded border-slate-300 text-violet-700 focus:ring-2 focus:ring-violet-400 disabled:cursor-not-allowed"
              />
              Select visible
              <span className="text-[10px] text-slate-500">
                {selectedIds.size} selected
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleShareSelected}
                disabled={!selectedIds.size}
                className={`${PANEL_BUTTON} border-violet-200 bg-white text-violet-800 hover:bg-violet-50`}
              >
                <Clipboard size={13} aria-hidden="true" />
                Copy selected
              </button>
              <button
                type="button"
                onClick={handleDownloadSelected}
                disabled={!selectedIds.size}
                className={`${PANEL_BUTTON} border-slate-200 bg-white text-slate-700 hover:bg-slate-100`}
              >
                <Download size={13} aria-hidden="true" />
                Download selected
              </button>
              <button
                type="button"
                onClick={() => updateSelectedResults("passed")}
                disabled={!selectedIds.size}
                className={`${PANEL_BUTTON} border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50`}
              >
                <CheckCircle2 size={13} aria-hidden="true" />
                Mark passed
              </button>
              <button
                type="button"
                onClick={() => updateSelectedResults("issue-found")}
                disabled={!selectedIds.size}
                className={`${PANEL_BUTTON} border-rose-200 bg-white text-rose-800 hover:bg-rose-50`}
              >
                <AlertCircle size={13} aria-hidden="true" />
                Mark issue found
              </button>
              <button
                type="button"
                onClick={() => updateSelectedResults("not-tested")}
                disabled={!selectedIds.size}
                className={`${PANEL_BUTTON} border-slate-200 bg-white text-slate-700 hover:bg-slate-100`}
              >
                <ListChecks size={13} aria-hidden="true" />
                Reset result
              </button>
            </div>
          </section>
        )}

        {scenarios.length > 0 ? (
          <ul className="space-y-2.5" aria-label="Pages in the test checklist">
            {filteredScenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                isActive={
                  activeScenarioId === scenario.id && scenario.url === value
                }
                isSelected={selectedIds.has(scenario.id)}
                onToggleSelected={(isSelected) =>
                  toggleScenarioSelection(scenario.id, isSelected)
                }
                onSelect={() => handleSelectScenario(scenario)}
                onReportIssue={() => {
                  handleSelectScenario(scenario);
                  onReportIssue(scenario.url);
                }}
                onUpdate={updateScenario}
                onRemove={handleRemoveScenario}
              />
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-7 text-center">
            <ListChecks
              size={22}
              aria-hidden="true"
              className="mx-auto text-slate-400"
            />
            <h3 className="mt-2 text-xs font-semibold text-slate-800">
              No pages in this checklist yet
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-[10px] leading-5 text-slate-500">
              Add the pages you plan to check. You can mark the result and
              switch the active report destination from each item.
            </p>
          </div>
        )}

        {scenarios.length > 0 && filteredScenarios.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center">
            <p className="text-xs font-semibold text-slate-700">
              No pages match those filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              className="mt-2 text-[10px] font-semibold text-violet-700 underline underline-offset-2"
            >
              Clear filters
            </button>
          </div>
        )}

        {scenarios.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-1.5 text-[10px] leading-4 text-slate-500">
              <ShieldAlert
                size={12}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-amber-600"
              />
              This checklist is kept only in page memory. It is not submitted
              with your bug report. Exported URLs redact query values and omit
              fragments; review paths and notes before sharing.
            </p>
            <div className="flex shrink-0 justify-end gap-2">
              {confirmClear && (
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className={`${PANEL_BUTTON} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleClearChecklist}
                className={`${PANEL_BUTTON} ${
                  confirmClear
                    ? "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100"
                    : "border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:text-rose-700"
                }`}
              >
                <X size={13} aria-hidden="true" />
                {confirmClear ? "Confirm clear" : "Clear checklist"}
              </button>
            </div>
          </div>
        )}
        <UrlTestRunLibrary
          value={value}
          scenarios={scenarios}
          activeScenarioId={activeScenarioId}
          onLoadRun={handleLoadSavedRun}
        />
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
