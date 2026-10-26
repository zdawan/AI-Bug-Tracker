"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bug,
  CalendarDays,
  ExternalLink,
  FileSearch,
  Filter,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const severityStyles = {
  High: "bg-red-50 text-red-700 ring-red-200",
  Medium: "bg-amber-50 text-amber-700 ring-amber-200",
  Low: "bg-blue-50 text-blue-700 ring-blue-200",
};

const statusStyles = {
  Open: "bg-violet-50 text-violet-700",
  Closed: "bg-emerald-50 text-emerald-700",
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

function Badge({ value, styles }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[value] || "bg-slate-100 text-slate-600"
      }`}
    >
      {value || "Unknown"}
    </span>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        <Icon size={19} className="text-slate-400" />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function BugDetails({ bug, onClose }) {
  if (!bug) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="bug-details-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Bug report
            </p>
            <h2
              id="bug-details-title"
              className="mt-2 text-2xl font-semibold text-slate-900"
            >
              {bug.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bug details"
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Badge value={bug.status} styles={statusStyles} />
          <Badge value={bug.severity} styles={severityStyles} />
          {bug.category && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {bug.category}
            </span>
          )}
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900">AI summary</h3>
          <p className="mt-2 leading-7 text-slate-600">
            {bug.summary || "No AI summary is available for this report."}
          </p>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900">Description</h3>
          <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-600">
            {bug.description || "No description provided."}
          </p>
        </div>

        {bug.tags?.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-slate-900">Tags</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {bug.tags.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs text-violet-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {bug.testUrl && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-900">
              Affected URL
            </h3>
            <a
              href={bug.testUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex max-w-full items-center gap-2 break-all text-sm text-violet-700 underline"
            >
              {bug.testUrl}
              <ExternalLink size={14} className="shrink-0" />
            </a>
          </div>
        )}

        {bug.screenshot && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-900">Screenshot</h3>
            <img
              src={`${API_URL}${bug.screenshot}`}
              alt={`Screenshot for ${bug.title}`}
              className="mt-3 max-h-96 w-full rounded-xl border border-slate-200 object-contain"
            />
          </div>
        )}

        <p className="mt-6 text-xs text-slate-400">
          Reported {formatDate(bug.createdAt)} · {bug.reports || 1} report
          {(bug.reports || 1) === 1 ? "" : "s"}
        </p>
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
      const matchesSearch =
        !query ||
        [bug.title, bug.description, bug.summary, bug.testUrl, bug.category]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));

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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft size={17} />
            Home
          </Link>

          <Link
            href="/tester/url"
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Report a bug
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-violet-700">
              TESTER PORTAL
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              My reports
            </h1>
            <p className="mt-3 max-w-2xl text-slate-500">
              Review your submitted bugs, check their status, and revisit the
              affected pages.
            </p>
          </div>

          <form
            onSubmit={loadReports}
            className="flex w-full max-w-xl flex-col gap-2 sm:flex-row"
          >
            <label className="sr-only" htmlFor="reporter-email">
              Reporter email
            </label>
            <input
              id="reporter-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter the email used to report bugs"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <Search size={17} />
              )}
              {loading ? "Loading" : "Find reports"}
            </button>
          </form>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total reports" value={bugs.length} icon={Bug} />
          <StatCard label="Open" value={openCount} icon={FileSearch} />
          <StatCard label="Closed" value={closedCount} icon={CalendarDays} />
          <StatCard
            label="High severity"
            value={highSeverityCount}
            icon={ShieldAlert}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Submitted bugs</h2>
              <p className="mt-1 text-sm text-slate-500">
                {loadedEmail
                  ? `Reports found for ${loadedEmail}`
                  : "Enter your reporter email to load your reports."}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <label className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search reports"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-400"
                />
              </label>

              <label className="relative">
                <Filter
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-400"
                >
                  <option value="All">All statuses</option>
                  <option value="Open">Open</option>
                  <option value="Closed">Closed</option>
                </select>
              </label>

              <select
                aria-label="Filter by severity"
                value={severity}
                onChange={(event) => setSeverity(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400"
              >
                <option value="All">All severities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 p-16 text-sm text-slate-500">
              <LoaderCircle size={20} className="animate-spin" />
              Loading your reports…
            </div>
          ) : !loadedEmail ? (
            <div className="p-14 text-center">
              <FileSearch className="mx-auto text-slate-300" size={36} />
              <h3 className="mt-4 font-semibold">Find your reports</h3>
              <p className="mt-2 text-sm text-slate-500">
                Use the email address you entered when reporting a bug.
              </p>
            </div>
          ) : filteredBugs.length === 0 ? (
            <div className="p-14 text-center">
              <Bug className="mx-auto text-slate-300" size={36} />
              <h3 className="mt-4 font-semibold">No reports found</h3>
              <p className="mt-2 text-sm text-slate-500">
                {bugs.length
                  ? "Try changing your search or filters."
                  : "No reports are associated with this email yet."}
              </p>
              <Link
                href="/tester/url"
                className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Report a bug
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Bug</th>
                    <th className="px-5 py-4 font-semibold">Severity</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Reported</th>
                    <th className="px-5 py-4 text-right font-semibold">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBugs.map((bug) => (
                    <tr key={bug._id} className="transition hover:bg-slate-50">
                      <td className="max-w-md px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {bug.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                          {bug.summary || bug.description}
                        </p>
                        {bug.testUrl && (
                          <p className="mt-2 truncate text-xs text-slate-400">
                            {bug.testUrl}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Badge value={bug.severity} styles={severityStyles} />
                      </td>
                      <td className="px-5 py-4">
                        <Badge value={bug.status} styles={statusStyles} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                        {formatDate(bug.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedBug(bug)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-violet-300 hover:text-violet-700"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {loadedEmail && !loading && bugs.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {filteredBugs.length} of {bugs.length} reports
              </span>
              <button
                type="button"
                onClick={loadReports}
                className="inline-flex items-center gap-2 self-start font-semibold text-violet-700 hover:text-violet-900 sm:self-auto"
              >
                <RefreshCw size={15} />
                Refresh
              </button>
            </div>
          )}
        </section>
      </div>

      <BugDetails bug={selectedBug} onClose={() => setSelectedBug(null)} />
    </main>
  );
}
