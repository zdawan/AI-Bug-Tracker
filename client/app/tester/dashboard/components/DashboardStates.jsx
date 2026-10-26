import Link from "next/link";
import {
  Bug,
  FileSearch,
  LoaderCircle,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";

export function DashboardError({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-800 shadow-sm"
    >
      <ShieldAlert size={19} className="mt-0.5 shrink-0" />

      <div className="min-w-0 flex-1">
        <p className="font-semibold">We couldn't load your reports</p>
        <p className="mt-1 leading-6">{message}</p>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="rounded-lg p-1 text-rose-500 transition hover:bg-rose-100"
      >
        <X size={17} />
      </button>
    </div>
  );
}

export function DashboardLoading() {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center px-5 py-16 text-center"
    >
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
  );
}

export function DashboardEmptyState({
  type = "initial",
  hasReports = false,
  onClearFilters,
}) {
  let icon = Search;
  let title = "Let's find your reports";
  let description =
    "Use the email address you entered when reporting a bug. Your associated submissions will appear here.";

  if (type === "empty") {
    icon = hasReports ? FileSearch : Bug;
    title = hasReports ? "No matching reports" : "No reports yet";
    description = hasReports
      ? "Try adjusting your search or filters to find the report you're looking for."
      : "There are no reports associated with this email yet. You can submit your first bug report whenever you're ready.";
  }

  const Icon = icon;

  return (
    <div className="flex flex-col items-center px-5 py-14 text-center sm:py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 text-violet-600 shadow-sm">
        <Icon size={28} strokeWidth={1.6} />
      </div>

      <h3 className="mt-5 text-base font-semibold text-slate-900">{title}</h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {description}
      </p>

      {hasReports && type === "empty" ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-5 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50"
        >
          Clear filters
        </button>
      ) : type === "empty" ? (
        <Link
          href="/tester/url"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
        >
          <Bug size={16} />
          Report a bug
        </Link>
      ) : null}
    </div>
  );
}
