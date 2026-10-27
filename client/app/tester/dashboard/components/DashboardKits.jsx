"use client";

import React from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Bug,
  CheckCircle2,
  Clock3,
  Code2,
  Flame,
  Gauge,
  GitPullRequest,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

const severityStyles = {
  Critical: {
    color: "text-red-600",
    background: "bg-red-50",
    bar: "bg-red-500",
  },
  High: {
    color: "text-orange-600",
    background: "bg-orange-50",
    bar: "bg-orange-500",
  },
  Medium: {
    color: "text-amber-600",
    background: "bg-amber-50",
    bar: "bg-amber-500",
  },
  Low: {
    color: "text-emerald-600",
    background: "bg-emerald-50",
    bar: "bg-emerald-500",
  },
};

function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  trend,
  positive = true,
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
          <Icon size={21} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {trend && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
              positive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {positive ? (
              <ArrowUpRight size={13} />
            ) : (
              <ArrowDownRight size={13} />
            )}
            {trend}
          </span>
        )}
        {description && (
          <span className="text-xs text-slate-500">{description}</span>
        )}
      </div>
    </article>
  );
}

function ProgressBar({ value, color = "bg-blue-600" }) {
  const percentage = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export function DashboardMetrics({
  totalBugs = 0,
  openBugs = 0,
  resolvedBugs = 0,
  criticalBugs = 0,
  resolutionRate,
}) {
  const calculatedRate =
    resolutionRate ??
    (totalBugs > 0 ? Math.round((resolvedBugs / totalBugs) * 100) : 0);

  const metrics = [
    {
      label: "Total reports",
      value: totalBugs,
      description: "All reported issues",
      icon: Bug,
    },
    {
      label: "Open issues",
      value: openBugs,
      description: "Awaiting resolution",
      icon: AlertCircle,
    },
    {
      label: "Resolved",
      value: resolvedBugs,
      description: "Successfully closed",
      icon: CheckCircle2,
    },
    {
      label: "Critical issues",
      value: criticalBugs,
      description: "Requires attention",
      icon: Flame,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} {...metric} />
      ))}

      <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-blue-600" />
            <span className="text-sm font-medium text-slate-700">
              Resolution progress
            </span>
          </div>
          <span className="text-sm font-semibold text-slate-900">
            {calculatedRate}%
          </span>
        </div>
        <ProgressBar value={calculatedRate} />
      </div>
    </div>
  );
}

export function SeverityDistribution({ counts = {} }) {
  const total = Object.values(counts).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0,
  );

  return (
    <Panel
      title="Severity distribution"
      subtitle="Reported issues grouped by severity"
    >
      <div className="space-y-5">
        {Object.entries(severityStyles).map(([severity, style]) => {
          const count = Number(counts[severity]) || 0;
          const percentage = total ? Math.round((count / total) * 100) : 0;

          return (
            <div key={severity}>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${style.bar}`} />
                  <span className="text-sm text-slate-700">{severity}</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {count}
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {percentage}%
                  </span>
                </span>
              </div>
              <ProgressBar value={percentage} color={style.bar} />
            </div>
          );
        })}

        {total === 0 && (
          <p className="py-5 text-center text-sm text-slate-500">
            No severity data available yet.
          </p>
        )}
      </div>
    </Panel>
  );
}

export function StatusOverview({
  open = 0,
  inProgress = 0,
  resolved = 0,
  closed = 0,
}) {
  const statuses = [
    { label: "Open", value: open, color: "bg-blue-500" },
    { label: "In progress", value: inProgress, color: "bg-amber-500" },
    { label: "Resolved", value: resolved, color: "bg-emerald-500" },
    { label: "Closed", value: closed, color: "bg-slate-500" },
  ];

  const total = statuses.reduce((sum, item) => sum + item.value, 0);

  return (
    <Panel
      title="Issue status"
      subtitle={`${total} issues across all statuses`}
    >
      <div className="space-y-4">
        {statuses.map((status) => (
          <div key={status.label} className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${status.color}`} />
            <span className="flex-1 text-sm text-slate-600">
              {status.label}
            </span>
            <span className="text-sm font-semibold text-slate-900">
              {status.value}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function RecentActivity({ activities = [] }) {
  const icons = {
    created: Bug,
    resolved: CheckCircle2,
    assigned: Users,
    updated: Activity,
  };

  return (
    <Panel
      title="Recent activity"
      subtitle="Latest changes across your reports"
      action={<Activity size={18} className="text-slate-400" />}
    >
      {activities.length === 0 ? (
        <div className="rounded-xl bg-slate-50 px-4 py-8 text-center">
          <Clock3 className="mx-auto mb-2 text-slate-400" size={24} />
          <p className="text-sm font-medium text-slate-700">
            No recent activity
          </p>
          <p className="mt-1 text-xs text-slate-500">
            New report updates will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {activities.slice(0, 6).map((activity, index) => {
            const Icon = icons[activity.type] || Activity;

            return (
              <div key={activity.id || index} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Icon size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800">
                    {activity.message || "Report updated"}
                  </p>
                  {activity.title && (
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {activity.title}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    {activity.time || "Recently"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

export function QuickActions({
  onCreateReport,
  onViewReports,
  onViewDevelopers,
}) {
  const actions = [
    {
      label: "Create report",
      description: "Document a new issue",
      icon: Bug,
      onClick: onCreateReport,
      color: "bg-blue-600 text-white",
    },
    {
      label: "View reports",
      description: "Review all reported bugs",
      icon: GitPullRequest,
      onClick: onViewReports,
      color: "bg-slate-100 text-slate-800",
    },
    {
      label: "Developers",
      description: "Manage assignments",
      icon: Code2,
      onClick: onViewDevelopers,
      color: "bg-slate-100 text-slate-800",
    },
  ];

  return (
    <Panel title="Quick actions" subtitle="Jump into your workflow">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              disabled={!action.onClick}
              className="group rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${action.color}`}
              >
                <Icon size={19} />
              </span>
              <span className="block text-sm font-semibold text-slate-900">
                {action.label}
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                {action.description}
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

export function PerformanceSummary({
  averageResolutionTime = "—",
  assignedDevelopers = 0,
  weeklyResolved = 0,
  targetResolved = 10,
}) {
  const completion =
    targetResolved > 0
      ? Math.min(100, Math.round((weeklyResolved / targetResolved) * 100))
      : 0;

  return (
    <Panel
      title="Performance summary"
      subtitle="A quick look at resolution activity"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <Clock3 size={18} className="mb-3 text-blue-600" />
          <p className="text-xs text-slate-500">Avg. resolution time</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {averageResolutionTime}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <Users size={18} className="mb-3 text-violet-600" />
          <p className="text-xs text-slate-500">Assigned developers</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {assignedDevelopers}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <TrendingUp size={18} className="mb-3 text-emerald-600" />
          <p className="text-xs text-slate-500">Resolved this week</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {weeklyResolved}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Weekly resolution target
          </span>
          <span className="text-xs font-semibold text-slate-700">
            {weeklyResolved}/{targetResolved}
          </span>
        </div>
        <ProgressBar value={completion} color="bg-emerald-500" />
      </div>
    </Panel>
  );
}

export function SystemHealth({ apiOnline = true, aiEnabled = true }) {
  const services = [
    { label: "Backend API", online: apiOnline },
    { label: "AI assistance", online: aiEnabled },
  ];

  return (
    <Panel
      title="System health"
      subtitle="Service availability"
      action={<ShieldCheck size={18} className="text-slate-400" />}
    >
      <div className="space-y-4">
        {services.map((service) => (
          <div
            key={service.label}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              {service.label === "Backend API" ? (
                <Gauge size={17} className="text-slate-500" />
              ) : (
                <Zap size={17} className="text-slate-500" />
              )}
              <span className="text-sm text-slate-700">{service.label}</span>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                service.online
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {service.online ? "Operational" : "Unavailable"}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export default DashboardMetrics;
