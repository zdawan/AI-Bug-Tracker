"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock3,
  Layers3,
  ShieldAlert,
  TrendingUp,
  X,
  ChartNoAxesCombined,
  CircleAlert,
  Activity,
  TrendingDown,
} from "lucide-react";

const isResolved = (status = "") => status === "Closed";

const isOpen = (status = "") => !isResolved(status);

const isHighSeverity = (severity = "") => severity === "High";

const getDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatCount = (value) => new Intl.NumberFormat("en-IN").format(value);

function getActivityDays(reports, numberOfDays) {
  const today = new Date();
  const days = [];

  for (let offset = numberOfDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    days.push({
      key,
      day:
        numberOfDays === 7
          ? date.toLocaleDateString("en-IN", { weekday: "short" })
          : date.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            }),
      count: 0,
    });
  }

  const byDate = new Map(days.map((day) => [day.key, day]));

  reports.forEach((report) => {
    const date = getDate(report.createdAt || report.created_at);
    if (!date) return;

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const day = byDate.get(key);
    if (day) day.count += 1;
  });

  return days;
}

const metricStyles = {
  slate: "bg-slate-100 text-slate-600",
  violet: "bg-violet-100 text-violet-700",
  green: "bg-emerald-100 text-emerald-700",
  rose: "bg-rose-100 text-rose-700",
};

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  tone = "slate",
  featured = false,
}) {
  return (
    <article
      className={`relative min-h-[150px] overflow-hidden rounded-[22px] p-5 transition hover:-translate-y-0.5 ${
        featured
          ? "bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-600/20"
          : "border border-white bg-white text-slate-900 shadow-sm shadow-slate-200/50 hover:shadow-md"
      }`}
    >
      {featured && (
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full border border-white/15 bg-white/[0.06]" />
      )}

      <div className="relative flex items-center justify-between gap-3">
        <h3
          className={`text-xs font-medium ${
            featured ? "text-white/90" : "text-slate-600"
          }`}
        >
          {label}
        </h3>

        <span
          className={`grid h-8 w-8 place-items-center rounded-full ${
            featured
              ? "bg-white text-violet-700"
              : "border border-slate-200 bg-white text-slate-500"
          }`}
        >
          <ArrowUpRight size={16} />
        </span>
      </div>

      <p className="relative mt-4 text-4xl font-semibold tracking-tight tabular-nums">
        {formatCount(value)}
      </p>

      <div className="relative mt-4 flex items-center gap-2">
        <span
          className={`grid h-5 w-5 place-items-center rounded-md ${
            featured ? "border border-white/30 text-white" : metricStyles[tone]
          }`}
        >
          <Icon size={12} />
        </span>

        <p
          className={`text-[11px] ${
            featured ? "text-white/80" : "text-slate-500"
          }`}
        >
          {note}
        </p>
      </div>
    </article>
  );
}

function WeeklyActivityChart({
  data = [],
  loading = false,
  days = 7,
  onRangeChange,
  previousTotal = 0,
}) {
  const maxCount = Math.max(1, ...data.map((day) => day.count || 0));

  const total = data.reduce((sum, day) => sum + (day.count || 0), 0);
  const activeDays = data.filter((day) => day.count > 0).length;
  const periodChange =
    previousTotal > 0
      ? ((total - previousTotal) / previousTotal) * 100
      : null;

  return (
    <section className="rounded-[22px] border border-white bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Report activity
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            New reports from the last {days} days
          </p>
        </div>

        <div
          className="inline-flex rounded-xl bg-slate-100 p-1"
          aria-label="Activity chart date range"
        >
          {[7, 30].map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => onRangeChange(range)}
              aria-pressed={days === range}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                days === range
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {range}D
            </button>
          ))}
        </div>
      </div>

      {data.length ? (
      <div
        className={`mt-6 grid gap-2 sm:gap-4 ${
          days === 7 ? "grid-cols-7" : "grid-cols-6 sm:grid-cols-10"
        }`}
        role="img"
        aria-label={`${formatCount(total)} reports across ${activeDays} active days in the last ${days} days.`}
      >
        {data.map((day, index) => {
          const count = day.count || 0;

          const height = count > 0 ? Math.max(26, (count / maxCount) * 100) : 8;

          return (
            <div
              key={`${day.key || day.day}-${index}`}
              className="flex min-w-0 flex-col items-center"
            >
              <span className="mb-2 text-[11px] font-semibold tabular-nums text-slate-500">
                {count}
              </span>

              <div className="flex h-32 w-full max-w-12 items-end justify-center rounded-full bg-[#f6f5fa] p-1.5">
                <div
                  className={`relative w-full rounded-full transition-all duration-300 ${
                    count > 0
                      ? "bg-gradient-to-b from-violet-400 to-violet-700"
                      : "bg-slate-200"
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${day.day}: ${count} reports`}
                >
                  {count > 0 && (
                    <span className="absolute left-1/2 top-2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white" />
                  )}
                </div>
              </div>

              <span className="mt-2 truncate text-[11px] font-medium text-slate-400">
                {day.day}
              </span>
            </div>
          );
        })}
      </div>
      ) : (
        <div className="mt-6 flex h-36 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
          Activity data will appear when reports are available.
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <span className="text-slate-400">Daily reports</span>

        <span className="font-medium text-violet-700">
          {loading
            ? "Updating..."
            : `${formatCount(total)} reports · ${activeDays} active days`}
        </span>
      </div>
      {periodChange !== null && (
        <p
          className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${
            periodChange > 0
              ? "text-rose-600"
              : periodChange < 0
                ? "text-emerald-600"
                : "text-slate-500"
          }`}
        >
          {periodChange > 0 ? (
            <TrendingUp size={13} />
          ) : periodChange < 0 ? (
            <TrendingDown size={13} />
          ) : null}
          {Math.abs(periodChange).toFixed(0)}% vs previous {days} days
        </p>
      )}
    </section>
  );
}

function LegacyMetricCard({
  title,
  value,
  note,
  icon: Icon,
  tone = "slate",
  featured = false,
}) {
  return (
    <article
      className={`relative min-h-[150px] overflow-hidden rounded-[22px] p-5 transition hover:-translate-y-0.5 ${
        featured
          ? "bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-600/20"
          : "border border-white bg-white text-slate-900 shadow-sm shadow-slate-200/50 hover:shadow-md"
      }`}
    >
      {featured && (
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border border-white/15 bg-white/[0.06]" />
      )}

      <div className="relative flex items-center justify-between gap-3">
        <h3
          className={`text-xs font-medium ${
            featured ? "text-white/90" : "text-slate-600"
          }`}
        >
          {title}
        </h3>

        <span
          className={`grid h-8 w-8 place-items-center rounded-full ${
            featured
              ? "bg-white text-violet-700"
              : "border border-slate-200 bg-white text-slate-500"
          }`}
        >
          <ArrowUpRight size={16} />
        </span>
      </div>

      <p className="relative mt-4 text-4xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>

      <div className="relative mt-4 flex items-center gap-2">
        <span
          className={`grid h-5 w-5 place-items-center rounded-md ${
            featured ? "border border-white/30 text-white" : metricStyles[tone]
          }`}
        >
          <Icon size={12} />
        </span>

        <p
          className={`text-[11px] ${
            featured ? "text-white/80" : "text-slate-500"
          }`}
        >
          {note}
        </p>
      </div>
    </article>
  );
}

function LegacyWeeklyActivityChart({ data = [] }) {
  const maxCount = Math.max(1, ...data.map((day) => day.count));

  return (
    <section className="rounded-[22px] border border-white bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">
          Report activity
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Reports submitted during the last seven days
        </p>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-2 sm:gap-4">
        {data.map((day, index) => {
          const height =
            day.count > 0 ? Math.max(26, (day.count / maxCount) * 100) : 8;

          return (
            <div
              key={`${day.day}-${index}`}
              className="flex min-w-0 flex-col items-center"
            >
              <span className="mb-2 text-[11px] font-semibold text-slate-500">
                {day.count}
              </span>

              <div className="flex h-32 w-full max-w-12 items-end justify-center rounded-full bg-violet-50/60 p-1.5">
                <div
                  className={`relative w-full rounded-full ${
                    day.count > 0
                      ? "bg-gradient-to-b from-violet-400 to-violet-700"
                      : "bg-slate-200"
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${day.day}: ${day.count} reports`}
                >
                  {day.count > 0 && (
                    <span className="absolute left-1/2 top-2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white" />
                  )}
                </div>
              </div>

              <span className="mt-2 text-[11px] font-medium text-slate-400">
                {day.day}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ResolutionChart({ total, resolved }) {
  const rate = total ? Math.round((resolved / total) * 100) : 0;

  return (
    <section className="rounded-[22px] border border-white bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Resolution overview
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Progress across submitted reports
          </p>
        </div>

        <ChartNoAxesCombined size={17} className="text-slate-400" />
      </div>

      <div className="mt-6 flex justify-center">
        <div
          className="grid h-40 w-40 place-items-center rounded-full"
          style={{
            background: `conic-gradient(#7c3aed ${rate * 3.6}deg, #ede9fe 0deg)`,
          }}
        >
          <div className="grid h-28 w-28 content-center justify-items-center rounded-full bg-white">
            <span className="text-3xl font-semibold text-slate-900">
              {rate}%
            </span>

            <span className="mt-1 text-[10px] text-slate-500">Resolved</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-4 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-violet-600" />
          Resolved ({resolved})
        </span>

        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-violet-100" />
          Remaining ({Math.max(0, total - resolved)})
        </span>
      </div>
    </section>
  );
}
function NotificationWidget({
  notifications = [],
  onDismiss,
  onViewAll,
  onViewReport,
}) {
  const [expanded, setExpanded] = useState(false);

  const visibleNotifications = expanded
    ? notifications
    : notifications.slice(0, 3);

  return (
    <section className="rounded-[22px] border border-white bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Notifications
          </h2>
          <p className="mt-1 text-xs text-slate-500">Recent report updates</p>
        </div>

        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
          {notifications.length} updates
        </span>
      </div>

      <div className="mt-4 divide-y divide-slate-100">
        {visibleNotifications.length ? (
          visibleNotifications.map((item) => (
            <div key={item.id} className="flex gap-3 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600">
                {item.type === "resolved" ? (
                  <CheckCircle2 size={16} />
                ) : item.type === "priority" ? (
                  <ShieldAlert size={16} />
                ) : (
                  <Bell size={16} />
                )}
              </span>

              <button
                type="button"
                onClick={() => item.report && onViewReport?.(item.report)}
                disabled={!item.report || !onViewReport}
                className="min-w-0 flex-1 text-left disabled:cursor-default"
              >
                <p className="text-xs font-semibold text-slate-800">
                  {item.title}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  {item.message}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">{item.time}</p>
              </button>

              {onDismiss && (
                <button
                  type="button"
                  onClick={() => onDismiss(item.id)}
                  aria-label={`Dismiss ${item.title}`}
                  className="h-7 rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-xs text-slate-500">
            You're all caught up.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setExpanded((value) => !value);
          onViewAll?.();
        }}
        className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
      >
        {expanded ? "Show less" : "View all notifications"}
      </button>
    </section>
  );
}

export default function AnalyticsOverview({
  reports = [],
  weeklyActivity = [],
  notifications = [],
  loading = false,
  onDismissNotification,
  onViewAllNotifications,
  onViewReport,
}) {
  const [activityDays, setActivityDays] = useState(7);
  const activity = useMemo(
    () =>
      activityDays === 7 && weeklyActivity.length
        ? weeklyActivity
        : getActivityDays(reports, activityDays),
    [activityDays, reports, weeklyActivity],
  );
  const previousPeriodTotal = useMemo(() => {
    const periodStart = new Date();
    periodStart.setHours(0, 0, 0, 0);
    periodStart.setDate(periodStart.getDate() - activityDays);
    const previousStart = new Date(periodStart);
    previousStart.setDate(previousStart.getDate() - activityDays);

    return reports.filter((report) => {
      const date = getDate(report.createdAt || report.created_at);
      return date && date >= previousStart && date < periodStart;
    }).length;
  }, [activityDays, reports]);

  const stats = useMemo(() => {
    const resolved = reports.filter((report) => isResolved(report.status)).length;
    const open = reports.filter((report) => isOpen(report.status)).length;
    const high = reports.filter((report) =>
      isHighSeverity(report.severity),
    ).length;
    const submissions = reports.reduce((sum, report) => {
      const count = Number(report.reports);
      return sum + (Number.isFinite(count) && count > 0 ? count : 1);
    }, 0);

    return {
      total: reports.length,
      submissions,
      repeats: Math.max(0, submissions - reports.length),
      open,
      resolved,
      high,
      resolutionRate: reports.length
        ? Math.round((resolved / reports.length) * 100)
        : 0,
    };
  }, [reports]);

  const cards = [
    {
      label: "Unique issues",
      value: stats.total,
      note: `${formatCount(stats.submissions)} total submissions`,
      icon: Layers3,
      tone: "slate",
      featured: true,
    },
    {
      label: "Open reports",
      value: stats.open,
      note: "Awaiting attention",
      icon: Clock3,
      tone: "violet",
    },
    {
      label: "Resolved reports",
      value: stats.resolved,
      note: `${stats.resolutionRate}% resolution rate`,
      icon: CheckCircle2,
      tone: "green",
    },
    {
      label: "High severity",
      value: stats.high,
      note: `${formatCount(stats.repeats)} repeat submissions`,
      icon: ShieldAlert,
      tone: "rose",
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600">
            Overview
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Report analytics
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Metrics, activity, and notifications for your bug reports.
          </p>
        </div>

        <span className="text-xs text-slate-400">
          {loading ? "Refreshing..." : "Live dashboard data"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <WeeklyActivityChart
            data={activity}
            days={activityDays}
            loading={loading}
            onRangeChange={setActivityDays}
            previousTotal={previousPeriodTotal}
          />
        </div>
        <ResolutionChart total={stats.total} resolved={stats.resolved} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[22px] border border-white bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Severity overview</h2>

          {[
            { label: "High severity", value: stats.high, color: "bg-rose-500" },
            {
              label: "Open reports",
              value: stats.open,
              color: "bg-violet-500",
            },
            {
              label: "Resolved reports",
              value: stats.resolved,
              color: "bg-emerald-500",
            },
          ].map((item) => (
            <div key={item.label} className="mt-5">
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-slate-600">{item.label}</span>
                <span className="text-slate-500">{item.value}</span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{
                    width: `${stats.total ? (item.value / stats.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </section>

        <NotificationWidget
          notifications={notifications}
          onDismiss={onDismissNotification}
          onViewAll={onViewAllNotifications}
          onViewReport={onViewReport}
        />
      </div>
    </section>
  );
}

<AnalyticsOverview
  reports={bugs}
  loading={loading}
  notifications={notifications}
  onDismissNotification={dismissNotification}
  onViewAllNotifications={openNotifications}
  onViewReport={handleViewReport}
/>;