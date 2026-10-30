"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  ExternalLink,
  GitCompareArrows,
  Search,
  X,
} from "lucide-react";

const STORAGE_PREFIX = "tester-duplicate-review-v1";
const MAX_CANDIDATES = 5000;
const MAX_TOKEN_FREQUENCY = 30;
const REVIEW_STATES = ["possible-duplicate", "not-duplicate", "later"];
const REVIEW_FILTERS = [
  { value: "all", label: "All candidates" },
  { value: "unreviewed", label: "Unreviewed" },
  { value: "possible-duplicate", label: "Possible duplicates" },
  { value: "not-duplicate", label: "Not duplicates" },
  { value: "later", label: "Review later" },
];
const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "been",
  "before",
  "being",
  "could",
  "does",
  "from",
  "have",
  "into",
  "issue",
  "just",
  "more",
  "only",
  "other",
  "page",
  "same",
  "that",
  "their",
  "then",
  "there",
  "this",
  "when",
  "where",
  "with",
  "would",
]);

function getText(value, limit = 500) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function getReportId(report, index) {
  return getText(report?._id || report?.id, 120) || `row-${index + 1}`;
}

function getTitle(report) {
  return getText(report?.title, 180) || "Untitled report";
}

function tokenize(value) {
  return new Set(
    getText(value, 3000)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token)),
  );
}

function normalizePageUrl(value) {
  const rawUrl = getText(value, 1000);
  if (!rawUrl) return "";

  try {
    const url = new URL(rawUrl);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return `${url.origin}${url.pathname}`.replace(/\/+$/, "").toLowerCase();
  } catch {
    return "";
  }
}

function overlapScore(left, right) {
  if (!left.size || !right.size) return 0;
  let shared = 0;
  left.forEach((token) => {
    if (right.has(token)) shared += 1;
  });
  return shared / (left.size + right.size - shared);
}

function getPairKey(left, right) {
  return [left.id, right.id].sort().map(encodeURIComponent).join("::");
}

function buildDuplicateCandidates(reports) {
  const records = reports.map((report, index) => {
    const safeReport =
      report && typeof report === "object" && !Array.isArray(report)
        ? report
        : {};
    const title = getTitle(safeReport);
    const body = getText(safeReport.summary || safeReport.description, 3000);
    const normalizedTitle = [...tokenize(title)].sort().join(" ");

    return {
      id: getReportId(safeReport, index),
      report: safeReport,
      title,
      body,
      titleTokens: tokenize(title),
      bodyTokens: tokenize(body),
      category: getText(safeReport.category, 100),
      pageUrl: normalizePageUrl(safeReport.testUrl),
      createdAt: new Date(
        safeReport.createdAt || safeReport.created_at || 0,
      ).getTime(),
      normalizedTitle,
    };
  });

  const pairIndexes = new Set();
  let limitReached = false;
  const addBucketPairs = (indexes) => {
    for (let left = 0; left < indexes.length; left += 1) {
      for (let right = left + 1; right < indexes.length; right += 1) {
        const pairKey = `${indexes[left]}:${indexes[right]}`;
        if (pairIndexes.has(pairKey)) continue;
        if (pairIndexes.size >= MAX_CANDIDATES) {
          limitReached = true;
          return false;
        }
        pairIndexes.add(pairKey);
      }
    }
    return true;
  };

  const exactTitles = new Map();
  const titleTokens = new Map();
  records.forEach((record, index) => {
    if (record.normalizedTitle) {
      const exactBucket = exactTitles.get(record.normalizedTitle) || [];
      exactBucket.push(index);
      exactTitles.set(record.normalizedTitle, exactBucket);
    }
    record.titleTokens.forEach((token) => {
      const bucket = titleTokens.get(token) || [];
      bucket.push(index);
      titleTokens.set(token, bucket);
    });
  });

  for (const indexes of exactTitles.values()) {
    if (!addBucketPairs(indexes)) break;
  }

  if (pairIndexes.size < MAX_CANDIDATES) {
    for (const indexes of titleTokens.values()) {
      if (indexes.length < 2 || indexes.length > MAX_TOKEN_FREQUENCY) continue;
      if (!addBucketPairs(indexes)) break;
    }
  }

  const items = [...pairIndexes]
    .map((pair) => pair.split(":").map(Number))
    .map(([leftIndex, rightIndex]) => {
      const left = records[leftIndex];
      const right = records[rightIndex];
      const titleSimilarity = overlapScore(left.titleTokens, right.titleTokens);
      const bodySimilarity = overlapScore(left.bodyTokens, right.bodyTokens);
      const samePage = Boolean(left.pageUrl && left.pageUrl === right.pageUrl);
      const sameCategory =
        Boolean(left.category) &&
        left.category.toLowerCase() === right.category.toLowerCase();
      const score =
        titleSimilarity * 0.6 +
        bodySimilarity * 0.25 +
        (samePage ? 0.1 : 0) +
        (sameCategory ? 0.05 : 0);

      return {
        key: getPairKey(left, right),
        left,
        right,
        score,
        samePage,
        sameCategory,
      };
    })
    .filter((candidate) => candidate.score >= 0.35)
    .sort(
      (left, right) =>
        right.score - left.score ||
        Math.max(right.left.createdAt, right.right.createdAt) -
          Math.max(left.left.createdAt, left.right.createdAt),
    );

  return { items, limitReached };
}

function normalizeReviewData(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Saved duplicate-review data has an invalid format.");
  }

  return Object.entries(value).reduce((result, [key, entry]) => {
    if (
      key.length <= 260 &&
      entry &&
      typeof entry === "object" &&
      REVIEW_STATES.includes(entry.status)
    ) {
      result[key] = {
        status: entry.status,
        updatedAt:
          typeof entry.updatedAt === "string" &&
          !Number.isNaN(Date.parse(entry.updatedAt))
            ? entry.updatedAt
            : new Date().toISOString(),
      };
    }
    return result;
  }, {});
}

function getStorageKey(email) {
  return `${STORAGE_PREFIX}:${encodeURIComponent(email)}`;
}

function escapeCsvCell(value) {
  const text = String(value ?? "");
  const safeText = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function downloadCandidates(candidates, reviews) {
  let objectUrl = "";

  try {
    const rows = [
      [
        "Match score",
        "Review status",
        "First report ID",
        "First report title",
        "Second report ID",
        "Second report title",
        "Same affected page",
        "Same category",
      ],
      ...candidates.map((candidate) => [
        `${Math.round(candidate.score * 100)}%`,
        reviews[candidate.key]?.status || "unreviewed",
        candidate.left.id,
        candidate.left.title,
        candidate.right.id,
        candidate.right.title,
        candidate.samePage ? "Yes" : "No",
        candidate.sameCategory ? "Yes" : "No",
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8",
    });
    objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `duplicate-review-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    objectUrl = "";
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

function statusLabel(status) {
  if (status === "possible-duplicate") return "Possible duplicate";
  if (status === "not-duplicate") return "Not a duplicate";
  if (status === "later") return "Review later";
  return "Unreviewed";
}

function statusStyle(status) {
  if (status === "possible-duplicate") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (status === "not-duplicate") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }
  if (status === "later") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function ReportMatchCard({ record, onOpenReport, side }) {
  const details = record.body || "No summary or description is available.";
  const safeUrl = record.pageUrl;

  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {side} report
          </p>
          <button
            type="button"
            onClick={() => onOpenReport?.(record.report)}
            className="mt-1 block w-full truncate text-left text-sm font-semibold text-slate-900 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            {record.title}
          </button>
        </div>
        {record.report.severity && (
          <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
            {getText(record.report.severity, 30)}
          </span>
        )}
      </div>
      <p className="mt-2 line-clamp-3 break-words text-xs leading-5 text-slate-600">
        {details}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
        <span className="rounded-md bg-slate-100 px-2 py-1">
          {record.category || "Uncategorized"}
        </span>
        {safeUrl && (
          <span className="inline-flex max-w-full items-center gap-1 truncate">
            <ExternalLink size={11} aria-hidden="true" />
            {safeUrl}
          </span>
        )}
      </div>
      <p className="mt-2 truncate font-mono text-[10px] text-slate-400">
        {record.id}
      </p>
    </article>
  );
}

function DuplicateCandidateCard({
  candidate,
  status,
  onDecision,
  onOpenReport,
}) {
  const matchPercent = Math.round(candidate.score * 100);

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusStyle(status)}`}
          >
            {statusLabel(status)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
            {matchPercent}% match score
          </span>
          {candidate.samePage && (
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-medium text-sky-700">
              Same page
            </span>
          )}
          {candidate.sameCategory && (
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-medium text-violet-700">
              Same category
            </span>
          )}
        </div>
        <label className="relative">
          <span className="sr-only">Review decision for this pair</span>
          <select
            value={status}
            onChange={(event) => onDecision(candidate.key, event.target.value)}
            className={`h-8 appearance-none rounded-lg border py-1 pl-2.5 pr-7 text-[10px] font-semibold outline-none focus:ring-2 focus:ring-violet-200 ${statusStyle(status)}`}
          >
            <option value="unreviewed">Unreviewed</option>
            <option value="possible-duplicate">Possible duplicate</option>
            <option value="not-duplicate">Not a duplicate</option>
            <option value="later">Review later</option>
          </select>
          <ChevronDown
            size={12}
            aria-hidden="true"
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
          />
        </label>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <ReportMatchCard
          record={candidate.left}
          side="First"
          onOpenReport={onOpenReport}
        />
        <ReportMatchCard
          record={candidate.right}
          side="Second"
          onOpenReport={onOpenReport}
        />
      </div>
      <p className="mt-2 text-[10px] leading-4 text-slate-500">
        Heuristic score uses title/description word overlap, category, and
        affected page. It is a review aid, not an automatic duplicate verdict.
      </p>
    </article>
  );
}

export default function DuplicateReviewWorkspace({ bugs = [], email, onOpenReport }) {
  const [reviews, setReviews] = useState({});
  const [loadedForEmail, setLoadedForEmail] = useState("");
  const [canPersist, setCanPersist] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [exportError, setExportError] = useState("");
  const [activeFilter, setActiveFilter] = useState("unreviewed");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const normalizedEmail = getText(email, 320).toLowerCase();
  const storageKey = normalizedEmail ? getStorageKey(normalizedEmail) : "";

  const candidateAnalysis = useMemo(
    () => buildDuplicateCandidates(bugs),
    [bugs],
  );
  const candidates = candidateAnalysis.items;

  useEffect(() => {
    setReviews({});
    setLoadedForEmail("");
    setCanPersist(false);
    setStorageError("");
    setActiveFilter("unreviewed");
    setQuery("");

    if (!normalizedEmail) return;

    try {
      const saved = window.localStorage.getItem(getStorageKey(normalizedEmail));
      setReviews(saved ? normalizeReviewData(JSON.parse(saved)) : {});
      setCanPersist(true);
    } catch {
      setStorageError(
        "Could not read saved duplicate-review decisions from this browser.",
      );
      setReviews({});
    } finally {
      setLoadedForEmail(normalizedEmail);
    }
  }, [normalizedEmail]);

  useEffect(() => {
    if (!canPersist || !storageKey || loadedForEmail !== normalizedEmail) return;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(reviews));
      setStorageError("");
    } catch {
      setStorageError(
        "Duplicate-review decisions are only in memory because browser storage could not save them.",
      );
    }
  }, [canPersist, loadedForEmail, normalizedEmail, reviews, storageKey]);

  const counts = useMemo(
    () =>
      candidates.reduce(
        (result, candidate) => {
          const status = reviews[candidate.key]?.status || "unreviewed";
          result.all += 1;
          result[status] = (result[status] || 0) + 1;
          return result;
        },
        { all: 0, unreviewed: 0 },
      ),
    [candidates, reviews],
  );

  const visibleCandidates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return candidates.filter((candidate) => {
      const status = reviews[candidate.key]?.status || "unreviewed";
      if (activeFilter !== "all" && status !== activeFilter) return false;
      if (!normalizedQuery) return true;

      return [
        candidate.left.title,
        candidate.left.body,
        candidate.left.category,
        candidate.right.title,
        candidate.right.body,
        candidate.right.category,
        candidate.left.id,
        candidate.right.id,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [activeFilter, candidates, query, reviews]);

  const updateDecision = (key, status) => {
    if (status !== "unreviewed" && !REVIEW_STATES.includes(status)) return;

    setReviews((current) => {
      const next = { ...current };
      if (status === "unreviewed") {
        delete next[key];
      } else {
        next[key] = { status, updatedAt: new Date().toISOString() };
      }
      return next;
    });
  };

  const handleExport = () => {
    try {
      downloadCandidates(visibleCandidates, reviews);
      setExportError("");
    } catch {
      setExportError("Could not export duplicate-review candidates.");
    }
  };

  if (!bugs.length) return null;

  const displayedCandidates = expanded
    ? visibleCandidates
    : visibleCandidates.slice(0, 5);

  return (
    <section
      className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20 sm:p-5"
      aria-labelledby="duplicate-review-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600">
            Patch 7 · Review assistance
          </p>
          <h2
            id="duplicate-review-heading"
            className="mt-1 flex items-center gap-2 text-base font-semibold text-slate-900"
          >
            <GitCompareArrows size={17} className="text-violet-600" />
            Possible duplicate reports
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Review similar reports from this email. Your decisions stay in this
            browser and never merge, resolve, or edit shared reports.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          {expanded ? <X size={14} /> : <CircleHelp size={14} />}
          {expanded ? "Collapse" : "Review candidates"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-medium text-slate-500">Candidates</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
            {counts.all}
          </p>
        </div>
        <div className="rounded-xl bg-sky-50 px-3 py-2.5">
          <p className="text-[10px] font-medium text-sky-700">Unreviewed</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-sky-800">
            {counts.unreviewed}
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 px-3 py-2.5">
          <p className="text-[10px] font-medium text-amber-700">
            Possible duplicates
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-amber-800">
            {counts["possible-duplicate"] || 0}
          </p>
        </div>
        <div className="rounded-xl bg-slate-100 px-3 py-2.5">
          <p className="text-[10px] font-medium text-slate-500">
            Marked separate
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-slate-700">
            {counts["not-duplicate"] || 0}
          </p>
        </div>
      </div>

      {candidateAnalysis.limitReached && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Candidate generation reached its {MAX_CANDIDATES.toLocaleString()}-pair
          limit. Review these matches first; the list may not include every
          possible pair.
        </p>
      )}
      {storageError && (
        <p role="alert" className="mt-3 text-xs text-amber-800">
          {storageError}
        </p>
      )}

      {expanded && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {REVIEW_FILTERS.map((filter) => {
                const count =
                  filter.value === "all"
                    ? counts.all
                    : counts[filter.value] || 0;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveFilter(filter.value)}
                    aria-pressed={activeFilter === filter.value}
                    className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
                      activeFilter === filter.value
                        ? "bg-violet-700 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-violet-200"
                    }`}
                  >
                    {filter.label} <span className="ml-1 tabular-nums">{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 sm:w-64">
                <span className="sr-only">Search duplicate candidates</span>
                <Search
                  size={14}
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search reports"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </label>
              <button
                type="button"
                onClick={handleExport}
                disabled={!visibleCandidates.length}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download size={14} aria-hidden="true" />
                Export CSV
              </button>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">
            Showing {displayedCandidates.length} of {visibleCandidates.length}{" "}
            matches. Pair scores are heuristic, not definitive.
          </p>
          {exportError && (
            <p role="alert" className="mt-2 text-xs text-rose-700">
              {exportError}
            </p>
          )}

          <div className="mt-3 space-y-3">
            {displayedCandidates.map((candidate) => (
              <DuplicateCandidateCard
                key={candidate.key}
                candidate={candidate}
                status={reviews[candidate.key]?.status || "unreviewed"}
                onDecision={updateDecision}
                onOpenReport={onOpenReport}
              />
            ))}
            {!displayedCandidates.length && (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  {candidates.length
                    ? "No candidates match this filter."
                    : "No likely duplicate pairs found."}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {candidates.length
                    ? "Choose another review status or search term."
                    : "Candidates need overlapping report titles; this review does not modify existing reports."}
                </p>
              </div>
            )}
            {visibleCandidates.length > displayedCandidates.length && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700"
              >
                Showing first five matches
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
