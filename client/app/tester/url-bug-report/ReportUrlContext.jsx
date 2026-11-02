"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  LockKeyhole,
  Monitor,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

const PRIVATE_QUERY_KEY =
  /token|secret|password|passwd|auth|session|credential|email|code|key/i;

const ACTION_CLASS =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

function parseHttpUrl(value) {
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getQueryEntries(url) {
  const occurrences = new Map();
  return [...url.searchParams.entries()].map(([key, value], index) => {
    const occurrence = (occurrences.get(key) || 0) + 1;
    occurrences.set(key, occurrence);
    return {
      id: `${key}-${occurrence}-${index}`,
      key,
      value,
      occurrence,
      isPrivate: PRIVATE_QUERY_KEY.test(key),
    };
  });
}

function createSanitizedUrl(url) {
  const sanitized = new URL(url.href);
  const queryEntries = [...sanitized.searchParams.entries()];
  sanitized.search = "";
  queryEntries.forEach(([key]) => {
    sanitized.searchParams.append(key, "[redacted]");
  });
  sanitized.hash = "";
  return {
    href: sanitized.href,
    redactedCount: queryEntries.length,
  };
}

function createReportContext(url, entries) {
  const parameterNames = [
    ...new Set(
      entries.map((entry) =>
        entry.isPrivate ? "[sensitive parameter]" : entry.key || "(empty key)",
      ),
    ),
  ];

  return [
    "Test context",
    `Website: ${url.origin}`,
    `Page path: ${url.pathname || "/"}`,
    `Protocol: ${url.protocol}`,
    `Query parameter names: ${
      parameterNames.length ? parameterNames.join(", ") : "none"
    }`,
    `Fragment: ${url.hash ? "present (value omitted)" : "none"}`,
    "Privacy: query values and fragment contents are omitted; review the page path before sharing.",
  ].join("\n");
}

function getBrowserEnvironment() {
  const connection = navigator.connection;
  const colorScheme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "Dark"
    : "Light";
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return [
    { label: "Browser user agent", value: navigator.userAgent },
    {
      label: "Platform",
      value:
        navigator.userAgentData?.platform ||
        navigator.platform ||
        "Not available",
    },
    {
      label: "Viewport",
      value: `${window.innerWidth} × ${window.innerHeight} CSS pixels`,
    },
    {
      label: "Screen",
      value: `${window.screen.width} × ${window.screen.height} pixels at ${window.devicePixelRatio || 1}×`,
    },
    { label: "Language", value: navigator.language || "Not available" },
    { label: "Time zone", value: timeZone || "Not available" },
    {
      label: "Color scheme",
      value: colorScheme,
    },
    {
      label: "Reduced motion",
      value: reducedMotion ? "Preferred" : "Not requested",
    },
    {
      label: "Network",
      value: navigator.onLine
        ? connection?.effectiveType || "Online (type unavailable)"
        : "Offline",
    },
  ];
}

function formatBrowserEnvironment(snapshot) {
  return [
    "Browser environment",
    ...snapshot.map(({ label, value }) => `${label}: ${value}`),
    "Privacy: collected locally only when requested. Review before sharing.",
  ].join("\n");
}

function formatUrlWithoutValues(url) {
  const query = [...url.searchParams.keys()]
    .map((key) => `${encodeURIComponent(key)}=…`)
    .join("&");
  const fragment = url.hash ? "#(hidden)" : "";
  return `${url.origin}${url.pathname}${query ? `?${query}` : ""}${fragment}`;
}

function formatPathSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

async function safeCopyText(value, successMessage) {
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error("Clipboard access is unavailable.");
    }

    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
  } catch {
    toast.error("Could not copy this value. Please copy it manually.");
  }
}

function UrlFact({ label, value, compact = false }) {
  return (
    <div
      className={`min-w-0 rounded-xl border border-slate-200 bg-white ${
        compact ? "px-3 py-2" : "px-3 py-3"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-all text-xs leading-5 text-slate-700">
        {value || "None"}
      </p>
    </div>
  );
}

function PathBreadcrumb({ pathname, onSelect }) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = [{ label: "Home", value: "/" }];
  let accumulatedPath = "";

  segments.forEach((segment) => {
    accumulatedPath += `/${segment}`;
    crumbs.push({
      label: formatPathSegment(segment),
      value: accumulatedPath,
    });
  });

  return (
    <nav aria-label="Test destination path" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-1 text-xs">
        {crumbs.map((crumb, index) => (
          <li key={`${crumb.value}-${index}`} className="flex min-w-0 items-center gap-1">
            {index > 0 && (
              <ChevronRight
                size={13}
                aria-hidden="true"
                className="shrink-0 text-slate-300"
              />
            )}
            <button
              type="button"
              onClick={() => onSelect(crumb.value)}
              aria-current={index === crumbs.length - 1 ? "page" : undefined}
              title={`Test ${crumb.value}`}
              className={`max-w-[180px] truncate rounded px-1 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                index === crumbs.length - 1
                  ? "font-semibold text-slate-900"
                  : "text-violet-700 hover:bg-violet-50 hover:text-violet-900"
              }`}
            >
              {crumb.label}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function QueryParameterRow({ entry, showValues }) {
  const value = showValues
    ? entry.value || "(empty value)"
    : entry.isPrivate
      ? "Hidden for privacy"
      : "Value hidden";

  return (
    <li className="grid gap-1 border-t border-slate-100 py-2.5 first:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-center sm:gap-3">
      <div className="flex min-w-0 items-center gap-1.5">
        <code className="break-all text-xs font-semibold text-slate-800">
          {entry.key || "(empty key)"}
        </code>
        {entry.occurrence > 1 && (
          <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
            repeated
          </span>
        )}
      </div>
      <p
        className={`break-all text-[11px] leading-5 ${
          entry.isPrivate && showValues ? "text-amber-800" : "text-slate-500"
        }`}
      >
        {value}
      </p>
      {entry.isPrivate && (
        <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700">
          <ShieldAlert size={11} aria-hidden="true" />
          Sensitive key
        </span>
      )}
    </li>
  );
}

function UrlEditorDialog({ url, onCancel, onApply }) {
  const dialogRef = useRef(null);
  const pathRef = useRef(null);
  const [pathname, setPathname] = useState(url.pathname);
  const [query, setQuery] = useState(url.search);
  const [fragment, setFragment] = useState(url.hash);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    dialog.showModal();
    pathRef.current?.focus();

    const handleClose = () => onCancel();
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("close", handleClose);
      if (dialog.open) dialog.close();
    };
  }, [onCancel]);

  const updateQuery = (value) => {
    setQuery(value && !value.startsWith("?") ? `?${value}` : value);
    setError("");
  };

  const updateFragment = (value) => {
    setFragment(value && !value.startsWith("#") ? `#${value}` : value);
    setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const normalizedPath = pathname.trim()
      ? pathname.trim().startsWith("/")
        ? pathname.trim()
        : `/${pathname.trim()}`
      : "/";
    const candidate = new URL(url.origin);
    candidate.pathname = normalizedPath;
    candidate.search = query.trim();
    candidate.hash = fragment.trim();

    if (!["http:", "https:"].includes(candidate.protocol)) {
      setError("Only HTTP and HTTPS destinations are supported.");
      return;
    }

    onApply(candidate);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="report-url-editor-title"
      aria-describedby="report-url-editor-help"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(94vw,560px)] rounded-2xl border border-slate-200 bg-white p-0 text-left shadow-2xl backdrop:bg-slate-950/50"
    >
      <form onSubmit={handleSubmit} className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="report-url-editor-title"
              className="text-lg font-semibold text-slate-950"
            >
              Edit test destination
            </h2>
            <p
              id="report-url-editor-help"
              className="mt-1 text-xs leading-5 text-slate-500"
            >
              The website origin stays the same. Update the path, query, or
              fragment for the page you tested.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close URL editor"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <UrlFact label="Website origin (locked)" value={url.origin} compact />

          <label className="block text-xs font-semibold text-slate-700">
            Page path
            <input
              ref={pathRef}
              value={pathname}
              onChange={(event) => {
                setPathname(event.target.value);
                setError("");
              }}
              maxLength={2048}
              spellCheck={false}
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm font-normal text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              placeholder="/account/settings"
            />
            <span className="mt-1 block font-normal text-slate-400">
              A leading slash is added if needed.
            </span>
          </label>

          <label className="block text-xs font-semibold text-slate-700">
            Query string
            <input
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              maxLength={4096}
              spellCheck={false}
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm font-normal text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              placeholder="?tab=details"
            />
            <span className="mt-1 block font-normal text-slate-400">
              Optional. Query values may contain private data.
            </span>
          </label>

          <label className="block text-xs font-semibold text-slate-700">
            Fragment
            <input
              value={fragment}
              onChange={(event) => updateFragment(event.target.value)}
              maxLength={2048}
              spellCheck={false}
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm font-normal text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
              placeholder="#section"
            />
          </label>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className={`${ACTION_CLASS} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`${ACTION_CLASS} border-violet-700 bg-violet-700 text-white hover:bg-violet-800`}
          >
            <Check size={14} aria-hidden="true" />
            Apply destination
          </button>
        </div>
      </form>
    </dialog>
  );
}

export default function ReportUrlContext({ value, initialValue, onChange }) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showQueryValues, setShowQueryValues] = useState(false);
  const [querySearch, setQuerySearch] = useState("");
  const [browserSnapshot, setBrowserSnapshot] = useState(null);
  const currentUrl = useMemo(() => parseHttpUrl(value), [value]);
  const startingUrl = useMemo(
    () => parseHttpUrl(initialValue),
    [initialValue],
  );
  const queryEntries = useMemo(
    () => (currentUrl ? getQueryEntries(currentUrl) : []),
    [currentUrl],
  );
  const filteredQueryEntries = useMemo(() => {
    const normalizedSearch = querySearch.trim().toLowerCase();
    if (!normalizedSearch) return queryEntries;
    return queryEntries.filter((entry) =>
      entry.key.toLowerCase().includes(normalizedSearch),
    );
  }, [queryEntries, querySearch]);
  const sensitiveCount = queryEntries.filter((entry) => entry.isPrivate).length;
  const sanitized = currentUrl ? createSanitizedUrl(currentUrl) : null;
  const displayUrl = currentUrl ? formatUrlWithoutValues(currentUrl) : "";
  const reportContext = currentUrl
    ? createReportContext(currentUrl, queryEntries)
    : "";
  const hasChanged =
    currentUrl &&
    startingUrl &&
    currentUrl.href !== startingUrl.href;

  const closeEditor = useCallback(() => setIsEditorOpen(false), []);

  const applyEditedUrl = (editedUrl) => {
    onChange(editedUrl.href);
    setShowQueryValues(false);
    closeEditor();
    toast.success("Test destination updated.");
  };

  const selectPath = (selectedPath) => {
    if (!currentUrl) return;
    const updatedUrl = new URL(currentUrl.href);
    updatedUrl.pathname = selectedPath;
    onChange(updatedUrl.href);
  };

  const resetDestination = () => {
    if (!startingUrl) return;
    onChange(startingUrl.href);
    setShowQueryValues(false);
    toast.info("Original test destination restored.");
  };

  const copyCurrentUrl = () => {
    if (!currentUrl) return;
    safeCopyText(currentUrl.href, "Test destination copied.");
  };

  const copySanitizedUrl = () => {
    if (!sanitized) return;
    safeCopyText(
      sanitized.href,
      sanitized.redactedCount || currentUrl.hash
        ? "Sanitized URL copied with query values redacted and its fragment removed."
        : "Safe URL copied.",
    );
  };

  const copyReportContext = () => {
    if (!reportContext) return;
    safeCopyText(reportContext, "Safe report context copied.");
  };

  const captureBrowserSnapshot = () => {
    setBrowserSnapshot(getBrowserEnvironment());
  };

  const copyBrowserContext = () => {
    if (!browserSnapshot) return;
    safeCopyText(
      `${reportContext}\n\n${formatBrowserEnvironment(browserSnapshot)}`,
      "Report and browser context copied.",
    );
  };

  if (!currentUrl) {
    return (
      <section
        aria-label="Test destination"
        className="relative mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle
            size={18}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-amber-700"
          />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-amber-950">
              Test destination needs attention
            </h2>
            <p className="mt-1 break-all text-xs leading-5 text-amber-900">
              {value || "No destination URL was provided."}
            </p>
            <p className="mt-2 text-xs leading-5 text-amber-800">
              The destination could not be parsed as an HTTP or HTTPS URL. The
              report form remains available, but this address cannot be
              previewed safely.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const pathSegments = currentUrl.pathname.split("/").filter(Boolean);

  return (
    <>
      <section
        aria-label="Test destination"
        className="mb-6 overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm"
      >
        <div className="border-b border-orange-100 bg-gradient-to-r from-orange-50 via-white to-violet-50 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white bg-white text-orange-600 shadow-sm">
                {currentUrl.protocol === "https:" ? (
                  <LockKeyhole size={18} aria-hidden="true" />
                ) : (
                  <Globe size={18} aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-950">
                    Test destination
                  </h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                      currentUrl.protocol === "https:"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {currentUrl.protocol === "https:"
                      ? "HTTPS"
                      : "HTTP · not encrypted"}
                  </span>
                  {hasChanged && (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-800">
                      Edited
                    </span>
                  )}
                </div>
                <p className="mt-1 break-all text-xs leading-5 text-slate-600">
                  {displayUrl}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
              <a
                href={currentUrl.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Preview test destination in a new tab"
                className={`${ACTION_CLASS} border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:text-violet-800`}
              >
                <ExternalLink size={13} aria-hidden="true" />
                Preview
              </a>
              <button
                type="button"
                onClick={copyCurrentUrl}
                aria-label="Copy full test destination, including query values and fragment"
                title="Copies the complete URL, including query values and fragment"
                className={`${ACTION_CLASS} border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:text-violet-800`}
              >
                <Copy size={13} aria-hidden="true" />
                Copy full URL
              </button>
              <button
                type="button"
                onClick={copyReportContext}
                aria-label="Copy report context without query values or fragment contents"
                className={`${ACTION_CLASS} border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-300 hover:bg-violet-100`}
              >
                <Copy size={13} aria-hidden="true" />
                Copy report context
              </button>
              <button
                type="button"
                onClick={() => setIsEditorOpen(true)}
                className={`${ACTION_CLASS} border-orange-600 bg-orange-600 text-white hover:bg-orange-700`}
              >
                <SlidersHorizontal size={13} aria-hidden="true" />
                Edit
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Page path
              </p>
              <div className="mt-1">
                <PathBreadcrumb
                  pathname={currentUrl.pathname}
                  onSelect={selectPath}
                />
              </div>
            </div>
            {hasChanged && (
              <button
                type="button"
                onClick={resetDestination}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <RotateCcw size={12} aria-hidden="true" />
                Restore original
              </button>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <UrlFact label="Website" value={currentUrl.host} compact />
            <UrlFact
              label="Query parameters"
              value={`${queryEntries.length} ${
                queryEntries.length === 1 ? "parameter" : "parameters"
              }`}
              compact
            />
            <UrlFact
              label="Fragment"
              value={currentUrl.hash ? "Present (value hidden)" : "No fragment"}
              compact
            />
          </div>

          {(queryEntries.length > 0 || currentUrl.hash) && (
            <div
              role="note"
              className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="flex items-start gap-2 text-[10px] leading-5 text-amber-900">
                <ShieldAlert
                  size={14}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0"
                />
                <span>
                  {sensitiveCount > 0
                    ? `${sensitiveCount} query ${
                        sensitiveCount === 1 ? "entry is" : "entries are"
                      } marked sensitive.`
                    : "Query strings and fragments can contain private values."}{" "}
                  The sanitized URL redacts every query value and removes the
                  fragment before copying.
                </span>
              </p>
              <button
                type="button"
                onClick={copySanitizedUrl}
                className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[10px] font-semibold text-amber-900 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <Copy size={12} aria-hidden="true" />
                Copy sanitized URL
              </button>
            </div>
          )}

          <details
            open={isDetailsOpen}
            onToggle={(event) => setIsDetailsOpen(event.currentTarget.open)}
            className="rounded-xl border border-slate-200 bg-slate-50/60"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-violet-500">
              <span>Inspect URL details</span>
              <span className="text-[10px] font-medium text-slate-400">
                {queryEntries.length
                  ? `${queryEntries.length} query ${
                      queryEntries.length === 1 ? "entry" : "entries"
                    }`
                  : "No query parameters"}
              </span>
            </summary>
            <div className="space-y-3 border-t border-slate-200 p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <UrlFact
                  label="Protocol"
                  value={currentUrl.protocol}
                  compact
                />
                <UrlFact
                  label="Origin"
                  value={currentUrl.origin}
                  compact
                />
                <UrlFact
                  label="Full path"
                  value={currentUrl.pathname || "/"}
                  compact
                />
                <UrlFact
                  label="Fragment"
                  value={currentUrl.hash ? "Present (value hidden)" : "None"}
                  compact
                />
              </div>

              {pathSegments.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Path segments
                  </h3>
                  <ol className="mt-1 flex flex-wrap gap-1.5">
                    {pathSegments.map((segment, index) => (
                      <li
                        key={`${segment}-${index}`}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] text-slate-600"
                      >
                        {index + 1}. {formatPathSegment(segment)}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-col gap-2 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-800">
                      Query parameters
                    </h3>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      Values remain hidden unless you explicitly reveal them.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQueryValues((visible) => !visible)}
                    disabled={queryEntries.length === 0}
                    aria-pressed={showQueryValues}
                    className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-40"
                  >
                    {showQueryValues ? (
                      <EyeOff size={12} aria-hidden="true" />
                    ) : (
                      <Eye size={12} aria-hidden="true" />
                    )}
                    {showQueryValues ? "Hide values" : "Reveal values"}
                  </button>
                </div>

                {queryEntries.length > 0 ? (
                  <>
                    <div className="border-b border-slate-100 p-3">
                      <label className="relative block">
                        <Search
                          size={13}
                          aria-hidden="true"
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <span className="sr-only">Filter query parameters</span>
                        <input
                          type="search"
                          value={querySearch}
                          onChange={(event) =>
                            setQuerySearch(event.target.value)
                          }
                          placeholder="Filter by parameter name"
                          className="min-h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        />
                      </label>
                    </div>
                    <ul className="max-h-56 overflow-y-auto px-3 py-1">
                      {filteredQueryEntries.length > 0 ? (
                        filteredQueryEntries.map((entry) => (
                          <QueryParameterRow
                            key={entry.id}
                            entry={entry}
                            showValues={showQueryValues}
                          />
                        ))
                      ) : (
                        <li className="py-4 text-center text-xs text-slate-500">
                          No parameter names match this filter.
                        </li>
                      )}
                    </ul>
                  </>
                ) : (
                  <p className="p-4 text-center text-xs text-slate-500">
                    This destination has no query parameters.
                  </p>
                )}
              </div>

              <details
                onToggle={(event) => {
                  if (event.currentTarget.open && !browserSnapshot) {
                    captureBrowserSnapshot();
                  }
                }}
                className="rounded-xl border border-slate-200 bg-white"
              >
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-violet-500">
                  <Monitor
                    size={14}
                    aria-hidden="true"
                    className="text-violet-600"
                  />
                  Browser environment
                  <span className="ml-auto text-[10px] font-medium text-slate-400">
                    Optional · captured on request
                  </span>
                </summary>
                <div className="border-t border-slate-100 p-3">
                  <p className="text-[10px] leading-5 text-slate-500">
                    These details can help reproduce a bug. They are read only
                    when you open this section, stay in this page, and are not
                    sent with your report unless you choose to copy and share
                    them.
                  </p>
                  {browserSnapshot ? (
                    <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                      {browserSnapshot.map(({ label, value }) => (
                        <div
                          key={label}
                          className="min-w-0 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2"
                        >
                          <dt className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                            {label}
                          </dt>
                          <dd className="mt-1 break-all text-[10px] leading-4 text-slate-700">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">
                      Open this section to capture the current browser details.
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={captureBrowserSnapshot}
                      className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                    >
                      <RefreshCw size={12} aria-hidden="true" />
                      Refresh snapshot
                    </button>
                    <button
                      type="button"
                      onClick={copyBrowserContext}
                      disabled={!browserSnapshot}
                      className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-800 transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Copy size={12} aria-hidden="true" />
                      Copy report + browser context
                    </button>
                  </div>
                </div>
              </details>

              {sensitiveCount > 0 && (
                <p className="flex items-start gap-2 text-[10px] leading-5 text-amber-800">
                  <AlertTriangle
                    size={13}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                  />
                  <span>
                    Sensitive-name detection is a best-effort hint. Review the
                    URL yourself before sharing; values are not automatically
                    removed from the report submission.
                  </span>
                </p>
              )}
            </div>
          </details>
        </div>
      </section>

      {isEditorOpen && (
        <UrlEditorDialog
          url={currentUrl}
          onCancel={closeEditor}
          onApply={applyEditedUrl}
        />
      )}
    </>
  );
}
