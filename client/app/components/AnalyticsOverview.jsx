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
