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
} from "lucide-react";

const metricStyles = {
  slate: "bg-slate-100 text-slate-600",
  violet: "bg-violet-100 text-violet-600",
  green: "bg-emerald-100 text-emerald-600",
  rose: "bg-rose-100 text-rose-600",
};

function MetricCard({
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

function WeeklyActivityChart({ data = [] }) {
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
    <section className="rounded-[22px] border border-white bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-semibold text-slate-900">
        Resolution overview
      </h2>

      <p className="mt-1 text-xs text-slate-500">
        Progress across submitted reports
      </p>

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

      <div className="mt-5 flex justify-center gap-4 text-[11px] text-slate-500">
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-600" />
          Resolved ({resolved})
        </span>

        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-100" />
          Remaining ({Math.max(0, total - resolved)})
        </span>
      </div>
    </section>
  );
}