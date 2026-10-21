import { useEffect, useMemo, useState } from "react";

const demoBugs = [
  {
    _id: "BUG-1024",
    title: "Login button does not respond on click",
    description:
      "The login button becomes unresponsive after entering valid credentials.",
    severity: "Critical",
    status: "Open",
    assignedDeveloper: "Arun Kumar",
    reportedAt: "2026-10-20T10:30:00Z",
    url: "https://example.com/login",
  },
  {
    _id: "BUG-1023",
    title: "Dashboard cards overlap on smaller screens",
    description: "Dashboard layout breaks at mobile viewport widths.",
    severity: "High",
    status: "In Progress",
    assignedDeveloper: "Priya S",
    reportedAt: "2026-10-19T08:15:00Z",
    url: "https://example.com/dashboard",
  },
  {
    _id: "BUG-1022",
    title: "Profile image is not loading",
    description: "The profile image returns an unexpected response.",
    severity: "Medium",
    status: "Open",
    assignedDeveloper: "Unassigned",
    reportedAt: "2026-10-18T11:45:00Z",
    url: "https://example.com/profile",
  },
  {
    _id: "BUG-1021",
    title: "Incorrect total shown in analytics",
    description: "The total differs from the underlying report data.",
    severity: "High",
    status: "Resolved",
    assignedDeveloper: "Karthik R",
    reportedAt: "2026-10-17T09:20:00Z",
    url: "https://example.com/analytics",
  },
  {
    _id: "BUG-1020",
    title: "Search results take too long to load",
    description: "Search requests have a noticeable delay.",
    severity: "Low",
    status: "Open",
    assignedDeveloper: "Arun Kumar",
    reportedAt: "2026-10-16T07:00:00Z",
    url: "https://example.com/search",
  },
];

const severityStyles = {
  Critical: "bg-red-50 text-red-700 ring-red-200",
  High: "bg-orange-50 text-orange-700 ring-orange-200",
  Medium: "bg-amber-50 text-amber-700 ring-amber-200",
  Low: "bg-blue-50 text-blue-700 ring-blue-200",
};

const statusStyles = {
  Open: "bg-red-50 text-red-700",
  "In Progress": "bg-violet-50 text-violet-700",
  Resolved: "bg-emerald-50 text-emerald-700",
  Closed: "bg-slate-100 text-slate-600",
};

function formatDate(date) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeBug(bug, index) {
  return {
    ...bug,
    _id: bug._id || bug.id || `BUG-${index + 1}`,
    title: bug.title || bug.name || "Untitled bug",
    severity: bug.severity || bug.priority || "Medium",
    status: bug.status || "Open",
    assignedDeveloper:
      bug.assignedDeveloper?.name ||
      bug.assignedDeveloper ||
      bug.assignedTo?.name ||
      bug.assignedTo ||
      bug.developer?.name ||
      bug.developer ||
      "Unassigned",
    reportedAt: bug.reportedAt || bug.createdAt || bug.created_at || null,
  };
}

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function Badge({ value, styles }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${
        styles[value] || "bg-slate-100 text-slate-600"
      }`}
    >
      {value}
    </span>
  );
}

export default function BugList({
  apiUrl = "/api/bugs",
  initialBugs,
  useDemoData = true,
}) {
  const [bugs, setBugs] = useState(initialBugs || []);
  const [loading, setLoading] = useState(!initialBugs);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("All");
  const [status, setStatus] = useState("All");
  const [selectedBug, setSelectedBug] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 7;

  useEffect(() => {
    if (initialBugs) {
      setBugs(initialBugs);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadBugs() {
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("developerToken");

        const response = await fetch(apiUrl, {
          signal: controller.signal,
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          throw new Error(`Unable to load bugs (${response.status}).`);
        }

        const result = await response.json();

        const records = Array.isArray(result)
          ? result
          : result.bugs || result.data || [];

        setBugs(records.map(normalizeBug));
      } catch (err) {
        if (err.name === "AbortError") return;

        if (useDemoData) {
          setBugs(demoBugs.map(normalizeBug));
          setError("");
        } else {
          setError(err.message || "Unable to load bugs.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadBugs();

    return () => controller.abort();
  }, [apiUrl, initialBugs, useDemoData]);

  const normalizedBugs = useMemo(() => bugs.map(normalizeBug), [bugs]);

  const stats = useMemo(
    () => ({
      total: normalizedBugs.length,
      open: normalizedBugs.filter((bug) => bug.status === "Open").length,
      progress: normalizedBugs.filter((bug) => bug.status === "In Progress")
        .length,
      resolved: normalizedBugs.filter(
        (bug) => bug.status === "Resolved" || bug.status === "Closed",
      ).length,
    }),
    [normalizedBugs],
  );

  const filteredBugs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return normalizedBugs.filter((bug) => {
      const matchesSearch = [bug._id, bug.title, bug.assignedDeveloper].some(
        (value) => String(value).toLowerCase().includes(query),
      );

      const matchesSeverity = severity === "All" || bug.severity === severity;

      const matchesStatus = status === "All" || bug.status === status;

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [normalizedBugs, search, severity, status]);

  const totalPages = Math.max(1, Math.ceil(filteredBugs.length / pageSize));

  const visibleBugs = filteredBugs.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  function resetFilters() {
    setSearch("");
    setSeverity("All");
    setStatus("All");
    setPage(1);
  }

  function updateSearch(value) {
    setSearch(value);
    setPage(1);
  }

  function updateSeverity(value) {
    setSeverity(value);
    setPage(1);
  }

  function updateStatus(value) {
    setStatus(value);
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-600">
              Developer workspace
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Bug List
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track, investigate, and resolve reported issues.
            </p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-100"
          >
            ↻ Refresh
          </button>
        </header>

        {/* Overview */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total bugs"
            value={stats.total}
            color="text-slate-900"
          />
          <StatCard label="Open" value={stats.open} color="text-red-600" />
          <StatCard
            label="In progress"
            value={stats.progress}
            color="text-violet-600"
          />
          <StatCard
            label="Resolved / closed"
            value={stats.resolved}
            color="text-emerald-600"
          />
        </section>

        {/* Filters */}
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                ⌕
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => updateSearch(e.target.value)}
                placeholder="Search bug ID, title, or developer..."
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <select
              value={severity}
              onChange={(e) => updateSeverity(e.target.value)}
              aria-label="Filter by severity"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
            >
              <option value="All">All severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={status}
              onChange={(e) => updateStatus(e.target.value)}
              aria-label="Filter by status"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
            >
              <option value="All">All statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>

            <button
              onClick={resetFilters}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Clear filters
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Showing {filteredBugs.length} of {normalizedBugs.length} bugs
          </p>
        </section>

        {/* Bug table */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading bugs...
            </div>
          ) : error ? (
            <div className="p-10 text-center">
              <p className="font-medium text-red-600">{error}</p>
              <p className="mt-2 text-sm text-slate-500">
                Check your API URL and authentication token.
              </p>
            </div>
          ) : filteredBugs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-3xl">⌕</div>
              <h2 className="mt-3 font-medium">No bugs found</h2>
              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or filters.
              </p>
              <button
                onClick={resetFilters}
                className="mt-4 text-sm font-medium text-indigo-600 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-medium">Bug</th>
                      <th className="px-4 py-4 font-medium">Severity</th>
                      <th className="px-4 py-4 font-medium">Status</th>
                      <th className="px-4 py-4 font-medium">
                        Assigned developer
                      </th>
                      <th className="px-4 py-4 font-medium">Reported date</th>
                      <th className="px-4 py-4 text-right font-medium">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {visibleBugs.map((bug) => (
                      <tr
                        key={bug._id}
                        className="transition-colors hover:bg-slate-50/80"
                      >
                        <td className="max-w-sm px-5 py-4">
                          <p className="font-medium text-slate-900">
                            {bug.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {bug._id}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <Badge value={bug.severity} styles={severityStyles} />
                        </td>

                        <td className="px-4 py-4">
                          <Badge value={bug.status} styles={statusStyles} />
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
                              {bug.assignedDeveloper === "Unassigned"
                                ? "—"
                                : bug.assignedDeveloper
                                    .split(" ")
                                    .map((part) => part[0])
                                    .slice(0, 2)
                                    .join("")
                                    .toUpperCase()}
                            </span>
                            <span className="text-slate-700">
                              {bug.assignedDeveloper}
                            </span>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                          {formatDate(bug.reportedAt)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => setSelectedBug(bug)}
                            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            View details →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Page {page} of {totalPages}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Bug details modal */}
      {selectedBug && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedBug(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="bug-detail-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-indigo-600">
                  {selectedBug._id}
                </p>
                <h2
                  id="bug-detail-title"
                  className="mt-2 text-xl font-semibold"
                >
                  {selectedBug.title}
                </h2>
              </div>

              <button
                onClick={() => setSelectedBug(null)}
                aria-label="Close bug details"
                className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-800"
              >
                ×
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Badge value={selectedBug.severity} styles={severityStyles} />
              <Badge value={selectedBug.status} styles={statusStyles} />
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <h3 className="text-sm font-medium text-slate-500">
                  Description
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {selectedBug.description || "No description provided."}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-medium text-slate-500">
                    Assigned developer
                  </h3>
                  <p className="mt-1 text-sm font-medium">
                    {selectedBug.assignedDeveloper}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-slate-500">
                    Reported date
                  </h3>
                  <p className="mt-1 text-sm font-medium">
                    {formatDate(selectedBug.reportedAt)}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <h3 className="text-sm font-medium text-slate-500">
                    Affected URL
                  </h3>
                  {selectedBug.url ? (
                    <a
                      href={selectedBug.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block break-all text-sm text-indigo-600 hover:underline"
                    >
                      {selectedBug.url}
                    </a>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">
                      No URL provided.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-7 flex justify-end">
              <button
                onClick={() => setSelectedBug(null)}
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                Close details
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
