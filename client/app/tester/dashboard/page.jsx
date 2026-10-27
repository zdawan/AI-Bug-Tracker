"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Bug,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileSearch,
  Filter,
  Layers3,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const severityStyles = {
  High: "bg-rose-50 text-rose-700 ring-rose-200",
  Medium: "bg-amber-50 text-amber-700 ring-amber-200",
  Low: "bg-sky-50 text-sky-700 ring-sky-200",
};

const statusStyles = {
  Open: "bg-violet-50 text-violet-700 ring-violet-100",
  Closed: "bg-emerald-50 text-emerald-700 ring-emerald-100",
};

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRelativeDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86_400_000);

  if (diff >= 0 && days === 0) {
    const hours = Math.floor(diff / 3_600_000);

    if (hours === 0) {
      const minutes = Math.floor(diff / 60_000);

      return minutes <= 1 ? "Just now" : `${minutes} min ago`;
    }

    return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  }

  if (days === 1) return "Yesterday";
  if (days > 1 && days < 7) return `${days} days ago`;

  return formatDate(value);
}

function Badge({ value, styles }) {
  const dotStyles = {
    Open: "bg-violet-500",
    Closed: "bg-emerald-500",
    High: "bg-rose-500",
    Medium: "bg-amber-500",
    Low: "bg-sky-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        styles[value] || "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          dotStyles[value] || "bg-slate-400"
        }`}
      />
      {value || "Unknown"}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, description, accent }) {
  const accents = {
    violet: {
      icon: "bg-violet-100 text-violet-700",
      glow: "from-violet-50/80",
    },
    amber: {
      icon: "bg-amber-100 text-amber-700",
      glow: "from-amber-50/80",
    },
    emerald: {
      icon: "bg-emerald-100 text-emerald-700",
      glow: "from-emerald-50/80",
    },
    rose: {
      icon: "bg-rose-100 text-rose-700",
      glow: "from-rose-50/80",
    },
  };

  const theme = accents[accent] || accents.violet;

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br ${theme.glow} via-white to-white p-5 shadow-[0_4px_24px_rgba(74,58,130,0.045)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(74,58,130,0.09)] sm:p-6`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${theme.icon} transition-transform duration-200 group-hover:scale-105`}
        >
          <Icon size={20} strokeWidth={1.8} />
        </span>
      </div>

      {description && (
        <p className="mt-4 text-xs leading-5 text-slate-500">{description}</p>
      )}
    </article>
  );
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center px-5 py-14 text-center sm:py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 text-violet-600 shadow-sm">
        <Icon size={28} strokeWidth={1.6} />
      </div>

      <h3 className="mt-5 text-base font-semibold text-slate-900">{title}</h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {description}
      </p>

      {action}
    </div>
  );
}

function BugDetails({ bug, onClose }) {
  if (!bug) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="bug-details-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/80 bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Bug size={21} />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600">
                Bug report details
              </p>

              <h2
                id="bug-details-title"
                className="mt-1.5 break-words text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
              >
                {bug.title || "Untitled report"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close bug details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            <X size={19} />
          </button>
        </div>

        <div className="space-y-7 p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge value={bug.status} styles={statusStyles} />
            <Badge value={bug.severity} styles={severityStyles} />

            {bug.category && (
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {bug.category}
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <CalendarDays size={15} />
                Reported on
              </div>

              <p className="mt-2 text-sm font-semibold text-slate-800">
                {formatDate(bug.createdAt)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <ShieldAlert size={15} />
                Severity
              </div>

              <p className="mt-2 text-sm font-semibold text-slate-800">
                {bug.severity || "Not specified"}
              </p>
            </div>
          </div>

          <section>
            <div className="flex items-center gap-2">
              <Sparkles size={17} className="text-violet-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                AI summary
              </h3>
            </div>

            <p className="mt-3 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-indigo-50/50 p-4 text-sm leading-7 text-slate-600">
              {bug.summary || "No AI summary is available for this report."}
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-900">
              Description
            </h3>

            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
              {bug.description || "No description provided."}
            </p>
          </section>

          {Array.isArray(bug.tags) && bug.tags.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-900">Tags</h3>

              <div className="mt-3 flex flex-wrap gap-2">
                {bug.tags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="rounded-lg border border-violet-100 bg-violet-50/80 px-3 py-1.5 text-xs font-medium text-violet-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          {bug.testUrl && (
            <section>
              <h3 className="text-sm font-semibold text-slate-900">
                Affected URL
              </h3>

              <a
                href={bug.testUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-start gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-violet-700 transition hover:border-violet-200 hover:bg-violet-50/40"
              >
                <span className="min-w-0 flex-1 break-all">{bug.testUrl}</span>
                <ExternalLink size={16} className="mt-1 shrink-0" />
              </a>
            </section>
          )}

          {bug.screenshot && (
            <section>
              <h3 className="text-sm font-semibold text-slate-900">
                Screenshot attachment
              </h3>

              <a
                href={`${API_URL}${bug.screenshot}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 transition hover:border-violet-200"
              >
                <img
                  src={`${API_URL}${bug.screenshot}`}
                  alt={`Screenshot for ${bug.title || "bug report"}`}
                  loading="lazy"
                  className="max-h-96 w-full rounded-xl object-contain"
                />

                <span className="flex items-center justify-center gap-2 py-3 text-xs font-semibold text-violet-700">
                  Open full screenshot
                  <ArrowUpRight size={14} />
                </span>
              </a>
            </section>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 text-xs text-slate-400">
            <span>Reported {formatDate(bug.createdAt)}</span>

            <span>
              {bug.reports || 1} report
              {(bug.reports || 1) === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function TesterDashboardPage() {
  const [email, setEmail] = useState("");
  const [loadedEmail, setLoadedEmail] = useState("");
  const [bugs, setBugs] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [severity, setSeverity] = useState("All");
  const [selectedBug, setSelectedBug] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReports = useCallback(
    async (event) => {
      event?.preventDefault();

      const normalizedEmail = email.trim().toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        setError("Enter a valid email address to find your reports.");
        return;
      }

      setLoading(true);
      setError("");
      setLoadedEmail(normalizedEmail);
      setBugs([]);
      setSelectedBug(null);
      setSearch("");
      setStatus("All");
      setSeverity("All");

      try {
        const response = await fetch(
          `${API_URL}/api/bugs?email=${encodeURIComponent(normalizedEmail)}`,
          { cache: "no-store" },
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.message || "Unable to load reports. Please try again.",
          );
        }

        setBugs(Array.isArray(result.bugs) ? result.bugs : []);
      } catch (requestError) {
        setBugs([]);
        setError(
          requestError.message ||
            "Could not connect to the API. Check that the backend is running.",
        );
      } finally {
        setLoading(false);
      }
    },
    [email],
  );

  const filteredBugs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bugs.filter((bug) => {
      const searchableFields = [
        bug.title,
        bug.description,
        bug.summary,
        bug.testUrl,
        bug.category,
        ...(Array.isArray(bug.tags) ? bug.tags : []),
      ];

      const matchesSearch =
        !query ||
        searchableFields.some(
          (value) =>
            typeof value === "string" && value.toLowerCase().includes(query),
        );

      const matchesStatus = status === "All" || bug.status === status;
      const matchesSeverity = severity === "All" || bug.severity === severity;

      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [bugs, search, status, severity]);

  const openCount = bugs.filter((bug) => bug.status === "Open").length;
  const closedCount = bugs.filter((bug) => bug.status === "Closed").length;

  const highSeverityCount = bugs.filter(
    (bug) => bug.severity === "High",
  ).length;

  const hasActiveFilters =
    search.trim() !== "" || status !== "All" || severity !== "All";

  const clearFilters = () => {
    setSearch("");
    setStatus("All");
    setSeverity("All");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f2f3ff] via-[#f8f9ff] to-[#f1f7ff] text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-40 h-80 w-80 rounded-full bg-violet-300/20 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-12 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage: "radial-gradient(#a5a8d5 0.7px, transparent 0.7px)",
          backgroundSize: "22px 22px",
          maskImage: "linear-gradient(to bottom, black, transparent 75%)",
        }}
      />

      <header className="relative z-10 border-b border-white/70 bg-white/65 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-slate-600 transition hover:bg-white/80 hover:text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            <ArrowLeft size={17} />
            <span>Home</span>
          </Link>

          <Link
            href="/tester/url"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_5px_16px_rgba(109,75,210,0.2)] transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2"
          >
            <Bug size={16} />
            <span>Report a bug</span>
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/75 px-3 py-1.5 text-xs font-semibold tracking-wide text-violet-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              TESTER PORTAL
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-[42px]">
              Your reports,
              <span className="block bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 bg-clip-text pb-1 text-transparent">
                all in one place.
              </span>
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Keep track of the bugs you have reported, follow their status, and
              revisit the affected pages whenever you need to.
            </p>
          </div>

          <form
            onSubmit={loadReports}
            className="w-full rounded-2xl border border-white/90 bg-white/80 p-2.5 shadow-[0_8px_32px_rgba(72,63,140,0.08)] backdrop-blur-xl sm:p-3 lg:max-w-xl"
          >
            <label
              className="mb-2 block px-2 text-xs font-semibold text-slate-600"
              htmlFor="reporter-email"
            >
              Find your reports
            </label>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="reporter-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your reporter email"
                  className="h-12 w-full rounded-xl border border-slate-200/90 bg-slate-50/80 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:from-violet-800 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <Search size={17} />
                )}

                {loading ? "Loading..." : "Find reports"}
              </button>
            </div>
          </form>
        </section>

        <section className="mt-8 sm:mt-10">
          <div className="mb-4 flex items-center gap-2">
            <Layers3 size={17} className="text-violet-600" />

            <h2 className="text-sm font-semibold text-slate-800">
              Report overview
            </h2>

            {loadedEmail && (
              <span className="ml-auto max-w-[60%] truncate text-xs text-slate-500">
                {loadedEmail}
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total reports"
              value={bugs.length}
              icon={Layers3}
              description="All reports associated with this email"
              accent="violet"
            />

            <StatCard
              label="Open reports"
              value={openCount}
              icon={Clock3}
              description="Reports currently marked open"
              accent="amber"
            />

            <StatCard
              label="Resolved reports"
              value={closedCount}
              icon={CheckCircle2}
              description="Reports currently marked closed"
              accent="emerald"
            />

            <StatCard
              label="High severity"
              value={highSeverityCount}
              icon={ShieldAlert}
              description="Reports marked with high severity"
              accent="rose"
            />
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-800 shadow-sm"
          >
            <ShieldAlert size={19} className="mt-0.5 shrink-0" />

            <div className="min-w-0 flex-1">
              <p className="font-semibold">We couldn't load your reports</p>
              <p className="mt-1 leading-6">{error}</p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="rounded-lg p-1 text-rose-500 transition hover:bg-rose-100"
            >
              <X size={17} />
            </button>
          </div>
        )}

        <section className="mt-8 overflow-hidden rounded-3xl border border-white/90 bg-white/85 shadow-[0_12px_44px_rgba(70,61,130,0.07)] backdrop-blur-xl sm:mt-10">
          <div className="border-b border-slate-100 bg-gradient-to-r from-white/90 via-violet-50/40 to-indigo-50/40 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <FileSearch size={19} />
                  </div>

                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                    Submitted bugs
                  </h2>
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {loadedEmail
                    ? `Reports found for ${loadedEmail}`
                    : "Enter your reporter email above to see your submitted reports."}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(190px,1fr)_155px_155px]">
                <label className="relative">
                  <span className="sr-only">Search reports</span>

                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search reports..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white/90 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                </label>

                <label className="relative">
                  <Filter
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <span className="sr-only">Filter by status</span>

                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  >
                    <option value="All">All statuses</option>
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                  </select>
                </label>

                <label>
                  <span className="sr-only">Filter by severity</span>

                  <select
                    aria-label="Filter by severity"
                    value={severity}
                    onChange={(event) => setSeverity(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  >
                    <option value="All">All severities</option>
                    <option value="High">High severity</option>
                    <option value="Medium">Medium severity</option>
                    <option value="Low">Low severity</option>
                  </select>
                </label>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">Active filters:</span>

                {search.trim() && (
                  <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                    Search: {search.trim()}
                  </span>
                )}

                {status !== "All" && (
                  <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                    Status: {status}
                  </span>
                )}

                {severity !== "All" && (
                  <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                    Severity: {severity}
                  </span>
                )}

                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-1 text-xs font-semibold text-violet-700 underline decoration-violet-300 underline-offset-4 transition hover:text-violet-900"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <LoaderCircle size={24} className="animate-spin" />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-800">
                Loading your reports
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Fetching your latest submissions...
              </p>
            </div>
          ) : !loadedEmail ? (
            <EmptyState
              icon={Search}
              title="Let's find your reports"
              description="Use the email address you entered when reporting a bug. Your associated submissions will appear here."
            />
          ) : filteredBugs.length === 0 ? (
            <EmptyState
              icon={Bug}
              title={bugs.length ? "No matching reports" : "No reports yet"}
              description={
                bugs.length
                  ? "Try adjusting your search or filters to find the report you're looking for."
                  : "There are no reports associated with this email yet. You can submit your first bug report whenever you're ready."
              }
              action={
                bugs.length ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-5 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50"
                  >
                    Clear filters
                  </button>
                ) : (
                  <Link
                    href="/tester/url"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
                  >
                    <Bug size={16} />
                    Report a bug
                  </Link>
                )
              }
            />
          ) : (
            <>
              <div className="divide-y divide-slate-100 md:hidden">
                {filteredBugs.map((bug) => (
                  <article key={bug._id} className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700">
                        <Bug size={19} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-sm font-semibold leading-6 text-slate-900">
                          {bug.title || "Untitled report"}
                        </h3>

                        <p className="mt-1 text-xs text-slate-400">
                          {formatRelativeDate(bug.createdAt)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedBug(bug)}
                        aria-label={`View details for ${
                          bug.title || "bug report"
                        }`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                      >
                        <ArrowUpRight size={17} />
                      </button>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                      {bug.summary ||
                        bug.description ||
                        "No description provided."}
                    </p>

                    {bug.testUrl && (
                      <p className="mt-2 truncate text-xs text-slate-400">
                        {bug.testUrl}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Badge value={bug.status} styles={statusStyles} />
                      <Badge value={bug.severity} styles={severityStyles} />
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[740px] text-left">
                  <thead className="border-b border-slate-100 bg-slate-50/70">
                    <tr className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      <th scope="col" className="px-6 py-4">
                        Bug report
                      </th>
                      <th scope="col" className="px-4 py-4">
                        Severity
                      </th>
                      <th scope="col" className="px-4 py-4">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-4">
                        Reported
                      </th>
                      <th scope="col" className="px-5 py-4 text-right">
                        Details
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredBugs.map((bug) => (
                      <tr
                        key={bug._id}
                        className="group transition-colors hover:bg-violet-50/30"
                      >
                        <td className="max-w-md px-6 py-5">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700 transition group-hover:from-violet-200 group-hover:to-indigo-200">
                              <Bug size={18} />
                            </div>

                            <div className="min-w-0">
                              <p className="break-words text-sm font-semibold text-slate-800">
                                {bug.title || "Untitled report"}
                              </p>

                              <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">
                                {bug.summary ||
                                  bug.description ||
                                  "No description provided."}
                              </p>

                              {bug.testUrl && (
                                <a
                                  href={bug.testUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 inline-flex max-w-full items-center gap-1.5 text-xs text-violet-600 transition hover:text-violet-800"
                                >
                                  <span className="truncate">
                                    {bug.testUrl}
                                  </span>

                                  <ExternalLink
                                    size={12}
                                    className="shrink-0"
                                  />
                                </a>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-5">
                          <Badge value={bug.severity} styles={severityStyles} />
                        </td>

                        <td className="whitespace-nowrap px-4 py-5">
                          <Badge value={bug.status} styles={statusStyles} />
                        </td>

                        <td className="whitespace-nowrap px-4 py-5">
                          <p className="text-sm font-medium text-slate-700">
                            {formatDate(bug.createdAt)}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {formatRelativeDate(bug.createdAt)}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-5 py-5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedBug(bug)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                          >
                            View details
                            <ArrowUpRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {loadedEmail && !loading && bugs.length > 0 && (
            <footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-800">
                  {filteredBugs.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-800">
                  {bugs.length}
                </span>{" "}
                reports
              </p>

              <button
                type="button"
                onClick={() => loadReports()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50 sm:self-auto"
              >
                <RefreshCw size={14} />
                Refresh reports
              </button>
            </footer>
          )}
        </section>

        <footer className="mt-8 flex flex-col items-center justify-between gap-3 pb-4 text-center text-xs text-slate-400 sm:flex-row sm:text-left">
          <p>AI Bug Tracker · Tester workspace</p>

          <Link
            href="/tester/url"
            className="inline-flex items-center gap-1.5 font-medium text-violet-600 transition hover:text-violet-800"
          >
            Submit another report
            <ArrowUpRight size={13} />
          </Link>
        </footer>
      </div>

      <BugDetails bug={selectedBug} onClose={() => setSelectedBug(null)} />
    </main>
  );
}
