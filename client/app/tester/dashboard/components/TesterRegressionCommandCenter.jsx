"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Check,
  CheckCircle2,
  Clipboard,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  Filter,
  Flag,
  Gauge,
  ListChecks,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";

const STORAGE_KEY = "tester-regression-command-center-v1";
const MAX_SUITES = 30;
const MAX_CASES = 180;
const MAX_FAILURES = 120;
const MAX_EVIDENCE = 120;
const MAX_AREAS = 80;
const MAX_REPORTS = 100;
const MAX_REFERENCES = 50;
const PAGE_SIZE = 10;

const SUITE_STATES = [
  { value: "draft", label: "Draft", tone: "slate" },
  { value: "planned", label: "Planned", tone: "cyan" },
  { value: "running", label: "Running", tone: "violet" },
  { value: "review", label: "In review", tone: "amber" },
  { value: "ready", label: "Ready", tone: "emerald" },
  { value: "blocked", label: "Blocked", tone: "rose" },
];
const SUITE_FILTERS = [{ value: "all", label: "All suites" }, ...SUITE_STATES];
const CASE_STATES = [
  { value: "planned", label: "Planned" },
  { value: "running", label: "Running" },
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "blocked", label: "Blocked" },
  { value: "skipped", label: "Skipped" },
];
const CASE_FILTERS = [{ value: "all", label: "All cases" }, ...CASE_STATES];
const FAILURE_STATES = [
  { value: "open", label: "Open" },
  { value: "triage", label: "In triage" },
  { value: "owned", label: "Owned" },
  { value: "fixed", label: "Fixed" },
  { value: "verified", label: "Verified" },
  { value: "accepted", label: "Accepted" },
];
const FAILURE_FILTERS = [{ value: "all", label: "All failures" }, ...FAILURE_STATES];
const SEVERITIES = [
  { value: "critical", label: "Critical", tone: "rose", score: 4 },
  { value: "high", label: "High", tone: "orange", score: 3 },
  { value: "medium", label: "Medium", tone: "amber", score: 2 },
  { value: "low", label: "Low", tone: "emerald", score: 1 },
];
const SEVERITY_FILTERS = [{ value: "all", label: "All severities" }, ...SEVERITIES];
const EVIDENCE_STATES = [
  { value: "planned", label: "Planned" },
  { value: "attached", label: "Attached" },
  { value: "reviewed", label: "Reviewed" },
  { value: "rejected", label: "Rejected" },
];
const EVIDENCE_TYPES = ["Screenshot", "Video", "Log", "Report", "Trace", "Note", "Link"];
const AREA_TYPES = ["Feature", "Service", "Journey", "Integration", "Platform", "Data"];
const CHECKS = [
  ["scope", "Regression scope is explicit", "The release, build, and impacted areas are named."],
  ["coverage", "Critical paths are covered", "Important journeys have executable regression cases."],
  ["owners", "Execution owners are assigned", "Cases and failures have accountable owners."],
  ["environment", "Target environment is recorded", "The browser, device, or environment is visible."],
  ["failures", "Failures have dispositions", "Open failures have triage, ownership, or acceptance context."],
  ["evidence", "Evidence is attached", "The run can be reviewed without repeating every step."],
  ["summary", "Regression conclusion is written", "The result, limitations, and follow-up are documented."],
];

function clean(value, fallback = "", limit = 1200) {
  if (typeof value !== "string") return fallback;
  const result = value.trim();
  return result ? result.slice(0, limit) : fallback;
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

function dateLabel(value) {
  if (!value) return "No date";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "No date"
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function labelFor(options, value) {
  return options.find((option) => option.value === value)?.label || value || "Unknown";
}

function toneClasses(tone = "slate") {
  return {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-800",
    violet: "border-violet-200 bg-violet-50 text-violet-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    orange: "border-orange-200 bg-orange-50 text-orange-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
  }[tone] || "border-slate-200 bg-slate-50 text-slate-700";
}

function severityTone(value) {
  return SEVERITIES.find((item) => item.value === value)?.tone || "slate";
}

function stateTone(options, value) {
  return options.find((item) => item.value === value)?.tone || "slate";
}

function emptyData() {
  return {
    suites: [],
    cases: [],
    failures: [],
    evidence: [],
    areas: [],
    reports: [],
    references: [],
  };
}

function readData() {
  if (typeof window === "undefined") return emptyData();
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    const blank = emptyData();
    return Object.fromEntries(
      Object.keys(blank).map((key) => [
        key,
        Array.isArray(saved[key]) ? saved[key] : [],
      ]),
    );
  } catch {
    return emptyData();
  }
}

function Button({
  children,
  onClick,
  icon: Icon,
  variant = "secondary",
  type = "button",
  disabled = false,
}) {
  const variants = {
    primary: "border-violet-600 bg-violet-600 text-white hover:bg-violet-700",
    secondary:
      "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
    subtle: "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200",
    danger: "border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]}`}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

function Badge({ children, tone = "slate" }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClasses(
        tone,
      )}`}
    >
      {children}
    </span>
  );
}

function Panel({ title, detail, icon: Icon, children }) {
  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Icon size={15} />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          {detail && <p className="mt-1 text-[11px] leading-5 text-slate-500">{detail}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Section({ title, description, action, children }) {
  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          {description && (
            <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  options,
  required = false,
}) {
  const props = {
    value: value || "",
    onChange: (event) => onChange(event.target.value),
    required,
    className:
      "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100",
  };
  return (
    <label className="block text-xs font-semibold text-slate-700">
      {label}
      {options ? (
        <select {...props}>
          <option value="">Select...</option>
          {options.map((option) => (
            <option key={option.value || option} value={option.value || option}>
              {option.label || option}
            </option>
          ))}
        </select>
      ) : (
        <input {...props} type={type} placeholder={placeholder} />
      )}
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <label className="block text-xs font-semibold text-slate-700">
      {label}
      <textarea
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
      />
    </label>
  );
}

function Stat({ label, value, note, icon: Icon, tone = "violet" }) {
  const colors = {
    violet: "bg-violet-100 text-violet-700",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
  };
  return (
    <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        {Icon && (
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors[tone]}`}
          >
            <Icon size={17} />
          </span>
        )}
      </div>
      {note && <p className="mt-2 text-[11px] leading-5 text-slate-500">{note}</p>}
    </article>
  );
}

function Empty({ title, description, action }) {
  return (
    <div className="px-5 py-12 text-center">
      <ListChecks className="mx-auto text-slate-300" size={32} />
      <p className="mt-3 text-sm font-semibold text-slate-800">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={17} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Progress({ value, label }) {
  const percentage = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex justify-between text-[11px]">
          <span className="text-slate-500">{label}</span>
          <span className="font-semibold text-slate-800">{percentage}%</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-violet-600 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function QualityCard({ title, value, detail, tone = "slate", icon: Icon }) {
  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClasses(tone)}`}>
          <Icon size={15} />
        </span>
        <Badge tone={tone}>{value}</Badge>
      </div>
      <h4 className="mt-3 text-xs font-semibold text-slate-800">{title}</h4>
      <p className="mt-1 text-[11px] leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

function RegressionGuidance({ suite, metrics, cases, failures, evidence }) {
  const suggestions = [];
  if (!suite?.release) suggestions.push("Add the release or build identifier.");
  if (!suite?.environment) suggestions.push("Record the target browser, device, or environment.");
  if (!cases.length) suggestions.push("Add at least one critical regression case.");
  if (!metrics?.passCount) suggestions.push("Run a primary case and capture its result.");
  if (failures.some((failure) => failure.state === "open")) suggestions.push("Triage every open failure before sharing a conclusion.");
  if (!evidence.length) suggestions.push("Attach evidence that lets another tester verify the run.");
  if (!suite?.owner) suggestions.push("Assign a regression owner for the handoff.");
  if (!suggestions.length) suggestions.push("The regression record has enough context for a focused review.");
  return (
    <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
      <div className="flex items-start gap-2">
        <Sparkles size={16} className="mt-0.5 shrink-0 text-violet-600" />
        <div>
          <p className="text-xs font-semibold text-violet-950">Suggested next moves</p>
          <p className="mt-1 text-[11px] leading-5 text-violet-900/70">
            Private prompts based on the current regression record.
          </p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {suggestions.map((suggestion) => (
          <li key={suggestion} className="flex items-start gap-2 text-[11px] leading-5 text-violet-900/80">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-500" />
            {suggestion}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RegressionScorecard({ suite, metrics, cases, failures, evidence, areas }) {
  const critical = cases.filter((item) => item.priority === "critical").length;
  const failed = cases.filter((item) => item.state === "fail").length;
  const blocked = cases.filter((item) => item.state === "blocked").length;
  const owned = cases.filter((item) => item.owner).length;
  const rows = [
    {
      label: "Execution progress",
      value: `${metrics.completed}/${cases.length}`,
      detail: `${metrics.progress}% of cases completed.`,
      tone: metrics.progress >= 80 ? "emerald" : "cyan",
      icon: Gauge,
    },
    {
      label: "Pass confidence",
      value: `${metrics.passCount}/${cases.length}`,
      detail: failed ? `${failed} failed case(s) need a disposition.` : "No failed case is recorded.",
      tone: failed ? "rose" : "emerald",
      icon: CheckCircle2,
    },
    {
      label: "Critical coverage",
      value: critical,
      detail: `${cases.filter((item) => item.priority === "critical" && item.state === "pass").length} critical case(s) pass.`,
      tone: critical && cases.filter((item) => item.priority === "critical" && item.state !== "pass").length ? "amber" : "emerald",
      icon: Flag,
    },
    {
      label: "Failure queue",
      value: failures.length,
      detail: `${failures.filter((item) => item.state === "verified").length} failure(s) verified.`,
      tone: failures.some((item) => item.state === "open") ? "rose" : "violet",
      icon: ShieldAlert,
    },
    {
      label: "Evidence density",
      value: evidence.length,
      detail: `${evidence.filter((item) => item.reference || item.note).length} item(s) have context.`,
      tone: evidence.length ? "emerald" : "amber",
      icon: FileCheck2,
    },
    {
      label: "Ownership",
      value: `${owned}/${cases.length}`,
      detail: `${areas.length} impacted area(s) are tracked.`,
      tone: cases.length && owned === cases.length ? "emerald" : "amber",
      icon: Users,
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => <QualityCard key={row.label} {...row} value={row.value} />)}
      <div className="sm:col-span-2 xl:col-span-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-800">Regression progress</p>
            <p className="text-xs font-semibold text-slate-700">{metrics.progress}%</p>
          </div>
          <Progress value={metrics.progress} />
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] text-slate-500">Planned</p><p className="mt-1 text-sm font-semibold text-slate-900">{metrics.planned}</p></div>
            <div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] text-slate-500">Running</p><p className="mt-1 text-sm font-semibold text-slate-900">{metrics.running}</p></div>
            <div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] text-slate-500">Pass</p><p className="mt-1 text-sm font-semibold text-emerald-700">{metrics.passCount}</p></div>
            <div className="rounded-lg bg-slate-50 p-2"><p className="text-[10px] text-slate-500">Blocked</p><p className="mt-1 text-sm font-semibold text-rose-700">{blocked}</p></div>
          </div>
        </div>
      </div>
      <div className="sm:col-span-2 xl:col-span-3">
        <RegressionGuidance suite={suite} metrics={metrics} cases={cases} failures={failures} evidence={evidence} />
      </div>
    </div>
  );
}

function RegressionRunbook({ suite, cases, failures, evidence, areas }) {
  const steps = [
    ["01", "Confirm the build", suite?.release ? `Run against ${suite.release}.` : "Record the release or build before execution.", suite?.release ? "Complete" : "Missing", suite?.release ? "emerald" : "amber"],
    ["02", "Confirm the environment", suite?.environment ? `Use ${suite.environment}.` : "Name the browser, device, and environment.", suite?.environment ? "Complete" : "Missing", suite?.environment ? "emerald" : "amber"],
    ["03", "Walk the critical path", cases.some((item) => item.priority === "critical") ? "Critical cases are present in the suite." : "Add at least one critical regression case.", cases.some((item) => item.priority === "critical") ? "Ready" : "Add case", cases.some((item) => item.priority === "critical") ? "cyan" : "amber"],
    ["04", "Capture the observed result", cases.some((item) => item.result) ? "At least one execution result is recorded." : "Record observed results as cases run.", cases.some((item) => item.result) ? "Started" : "Pending", cases.some((item) => item.result) ? "cyan" : "amber"],
    ["05", "Triage failures", failures.length ? `${failures.length} failure record(s) are available for triage.` : "No failure record has been created.", failures.length ? "Review" : "Clear", failures.length ? "violet" : "emerald"],
    ["06", "Attach proof", evidence.length ? `${evidence.length} evidence item(s) are attached.` : "Add a screenshot, log, video, or report.", evidence.length ? "Started" : "Missing", evidence.length ? "cyan" : "amber"],
    ["07", "Review impacted areas", areas.length ? `${areas.length} impacted area(s) are mapped.` : "Map the feature and integration surface.", areas.length ? "Mapped" : "Missing", areas.length ? "emerald" : "amber"],
    ["08", "Write the conclusion", suite?.summary ? "The suite has a conclusion ready for review." : "Summarize what passed and what remains uncertain.", suite?.summary ? "Written" : "Pending", suite?.summary ? "emerald" : "amber"],
  ];
  return (
    <Panel title="Regression runbook" detail="A repeatable order of operations for a focused regression pass." icon={ListChecks}>
      <div className="space-y-2">
        {steps.map(([number, title, detail, status, tone]) => (
          <div key={number} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600">{number}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-semibold text-slate-800">{title}</p>
                <Badge tone={tone}>{status}</Badge>
              </div>
              <p className="mt-1 text-[9px] leading-4 text-slate-500">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function CoverageMatrix({ cases, areas }) {
  const states = [
    ["Pass", "pass", "emerald"],
    ["Running", "running", "violet"],
    ["Planned", "planned", "cyan"],
    ["Fail", "fail", "rose"],
    ["Blocked", "blocked", "rose"],
    ["Skipped", "skipped", "amber"],
  ];
  const areaRows = areas.length ? areas : [{ id: "unmapped", name: "Unmapped area", type: "Needs mapping" }];
  return (
    <Panel title="Coverage matrix" detail="See how the regression cases distribute across impacted areas." icon={Target}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-[10px]">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="px-3 py-2 font-semibold">Area</th>
              {states.map(([label]) => <th key={label} className="px-3 py-2 text-center font-semibold">{label}</th>)}
              <th className="px-3 py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {areaRows.map((area) => {
              const rows = cases.filter((item) => item.areaId === area.id || (!item.areaId && area.id === "unmapped"));
              return (
                <tr key={area.id} className="border-b border-slate-100">
                  <td className="px-3 py-3"><p className="font-semibold text-slate-800">{area.name}</p><p className="mt-1 text-[9px] text-slate-400">{area.type}</p></td>
                  {states.map(([label, value, tone]) => <td key={label} className="px-3 py-3 text-center"><span className={`inline-flex min-w-7 justify-center rounded-md border px-1.5 py-1 font-semibold ${toneClasses(tone)}`}>{rows.filter((item) => item.state === value).length}</span></td>)}
                  <td className="px-3 py-3 text-right font-semibold text-slate-800">{rows.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!cases.length && <div className="mt-3 rounded-lg bg-slate-50 p-3 text-[10px] text-slate-500">Add regression cases to populate the coverage matrix.</div>}
    </Panel>
  );
}

function FailureDispositionGuide({ failures }) {
  const buckets = [
    ["Needs triage", failures.filter((item) => item.state === "open").length, "Assign a severity, owner, and next step.", "rose"],
    ["In motion", failures.filter((item) => ["triage", "owned"].includes(item.state)).length, "Keep reproduction and fix context current.", "violet"],
    ["Awaiting verification", failures.filter((item) => item.state === "fixed").length, "Re-run the linked case before closing.", "amber"],
    ["Dispositioned", failures.filter((item) => ["verified", "accepted"].includes(item.state)).length, "Keep the rationale in the conclusion.", "emerald"],
  ];
  return (
    <Panel title="Failure disposition guide" detail="A simple queue view for deciding what happens next." icon={ShieldAlert}>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {buckets.map(([label, count, detail, tone]) => <div key={label} className="rounded-xl border border-slate-200 p-3"><Badge tone={tone}>{count}</Badge><p className="mt-2 text-[10px] font-semibold text-slate-800">{label}</p><p className="mt-1 text-[9px] leading-4 text-slate-500">{detail}</p></div>)}
      </div>
    </Panel>
  );
}

function OwnershipBoard({ cases, failures, evidence }) {
  const owners = Array.from(new Set([...cases, ...failures, ...evidence].map((item) => item.owner).filter(Boolean)));
  const rows = owners.map((owner) => ({
    owner,
    cases: cases.filter((item) => item.owner === owner).length,
    failures: failures.filter((item) => item.owner === owner).length,
    evidence: evidence.filter((item) => item.owner === owner).length,
  }));
  return (
    <Panel title="Ownership board" detail="Check whether execution and evidence have people attached." icon={Users}>
      {rows.length ? <div className="grid gap-2 sm:grid-cols-2">{rows.map((row) => <div key={row.owner} className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-semibold text-slate-800">{row.owner}</p><div className="mt-2 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-slate-50 p-2"><p className="text-[9px] text-slate-500">Cases</p><p className="mt-1 text-sm font-semibold text-slate-900">{row.cases}</p></div><div className="rounded-lg bg-slate-50 p-2"><p className="text-[9px] text-slate-500">Failures</p><p className="mt-1 text-sm font-semibold text-rose-700">{row.failures}</p></div><div className="rounded-lg bg-slate-50 p-2"><p className="text-[9px] text-slate-500">Evidence</p><p className="mt-1 text-sm font-semibold text-emerald-700">{row.evidence}</p></div></div></div>)}</div> : <Empty title="No owners assigned" description="Assign owners to cases, failures, and evidence for a reliable handoff." />}
    </Panel>
  );
}

function ReviewPrompts({ suite, cases, failures, evidence, areas }) {
  const prompts = [
    ["Scope question", suite?.scope || "Which features, journeys, and environments are included in this regression pass?"],
    ["Coverage question", cases.length ? `${cases.length} executable case(s) are in scope. Which critical path is not represented?` : "Which critical user journey should be tested first?"],
    ["Failure question", failures.length ? `${failures.length} failure(s) are recorded. Which ones block confidence?` : "What result would stop a release recommendation?"],
    ["Evidence question", evidence.length ? `${evidence.length} artifact(s) are attached. Can another tester find and understand them?` : "What evidence would make this result reproducible?"],
    ["Area question", areas.length ? `${areas.length} impacted area(s) are mapped. Which integration is most likely to regress?` : "Which feature or service is changed by this release?"],
    ["Environment question", suite?.environment || "Where should the regression run, and what data or account setup is required?"],
    ["Ownership question", suite?.owner || "Who owns execution, triage, and the final handoff?"],
    ["Exit question", suite?.summary || "What must be true before this regression pass can be considered complete?"],
  ];
  return (
    <Panel title="Review prompts" detail="Questions to answer before turning test output into a release recommendation." icon={Clipboard}>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {prompts.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-violet-700">{label}</p>
            <p className="mt-2 text-[10px] leading-5 text-slate-700">{value}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function CasePriorityGuide({ cases }) {
  const rows = [
    ["Critical", cases.filter((item) => item.priority === "critical").length, "Primary journeys, payment, authentication, or irreversible actions.", "rose"],
    ["High", cases.filter((item) => item.priority === "high").length, "Important workflows adjacent to the changed surface.", "orange"],
    ["Medium", cases.filter((item) => item.priority === "medium").length, "Expected behavior with moderate release impact.", "amber"],
    ["Low", cases.filter((item) => item.priority === "low").length, "Useful coverage that can be deferred with context.", "emerald"],
  ];
  return (
    <Panel title="Case priority guide" detail="Use priority to sequence execution when time is limited." icon={Flag}>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map(([label, count, detail, tone]) => (
          <div key={label} className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-2"><Badge tone={tone}>{label}</Badge><span className="text-sm font-bold text-slate-800">{count}</span></div>
            <p className="mt-2 text-[9px] leading-4 text-slate-500">{detail}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function HandoffChecklist({ suite, metrics, failures, evidence }) {
  const rows = [
    ["State the result", suite?.summary ? "Written" : "Missing", suite?.summary ? "emerald" : "amber"],
    ["Name the environment", suite?.environment ? "Recorded" : "Missing", suite?.environment ? "emerald" : "amber"],
    ["Call out open failures", failures.length ? `${failures.length} open` : "None", failures.length ? "rose" : "emerald"],
    ["Attach supporting proof", evidence.length ? `${evidence.length} attached` : "Missing", evidence.length ? "emerald" : "amber"],
    ["Explain limitations", suite?.limitations ? "Written" : "Missing", suite?.limitations ? "emerald" : "amber"],
    ["Identify owner", suite?.owner ? suite.owner : "Missing", suite?.owner ? "cyan" : "amber"],
    ["Report pass ratio", `${metrics.passCount}/${metrics.completed || 0}`, metrics.passCount ? "cyan" : "amber"],
    ["Confirm next action", suite?.nextAction ? "Written" : "Missing", suite?.nextAction ? "emerald" : "amber"],
  ];
  return (
    <Panel title="Handoff checklist" detail="The minimum context a recipient needs to understand the regression outcome." icon={Users}>
      <div className="space-y-2">
        {rows.map(([label, value, tone]) => <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"><span className="text-[10px] font-semibold text-slate-700">{label}</span><Badge tone={tone}>{value}</Badge></div>)}
      </div>
    </Panel>
  );
}

function RegressionReviewLegend() {
  const rows = [
    ["Pass", "The expected behavior was observed in the named environment.", "emerald"],
    ["Fail", "Observed behavior differs from the expected result and needs triage.", "rose"],
    ["Blocked", "The case could not be completed because a dependency or setup issue remains.", "amber"],
    ["Evidence", "A reviewer can inspect the artifact and understand what it proves.", "cyan"],
    ["Owner", "A named person or team is accountable for the next action.", "violet"],
    ["Scope", "The affected journey, feature, or integration is explicitly included.", "slate"],
  ];
  return (
    <Panel title="Regression review legend" detail="Shared vocabulary for execution and handoff conversations." icon={Sparkles}>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, detail, tone]) => (
          <div key={label} className="rounded-xl border border-slate-200 p-3">
            <Badge tone={tone}>{label}</Badge>
            <p className="mt-2 text-[9px] leading-4 text-slate-500">{detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[9px] leading-4 text-slate-500">
        A high readiness percentage should not hide a critical failed path.
        Review the underlying cases, failures, environment, and evidence before
        treating the summary as a release recommendation.
      </div>
    </Panel>
  );
}

function OperationalReview({ suite, failures, cases }) {
  const prompts = [
    ["Before running", suite?.environment ? "Confirm the named environment is available." : "Record the environment and setup dependencies.", suite?.environment ? "Ready" : "Missing", suite?.environment ? "emerald" : "amber"],
    ["During execution", cases.some((item) => item.state === "running") ? "An active case is being executed." : "Move the next planned case into execution.", cases.some((item) => item.state === "running") ? "Active" : "Start", cases.some((item) => item.state === "running") ? "violet" : "cyan"],
    ["When a case fails", failures.length ? "Create or update a failure with impact and next step." : "Keep the failure record ready for the first regression signal.", failures.length ? "Tracked" : "Ready", failures.length ? "rose" : "slate"],
    ["Before handoff", suite?.summary ? "Read the conclusion as a recipient who did not run the tests." : "Write a concise result with limits and next action.", suite?.summary ? "Written" : "Pending", suite?.summary ? "emerald" : "amber"],
    ["After handoff", suite?.nextAction ? "Confirm the next action has an owner and timing." : "Add a next action to prevent the result becoming stale.", suite?.nextAction ? "Named" : "Missing", suite?.nextAction ? "cyan" : "amber"],
  ];
  return (
    <Panel title="Operational review" detail="Prompts for running the regression pass consistently from setup through handoff." icon={RefreshCw}>
      <div className="space-y-2">
        {prompts.map(([title, detail, status, tone]) => (
          <div key={title} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${toneClasses(tone)}`}>
              <CheckCircle2 size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-semibold text-slate-800">{title}</p><Badge tone={tone}>{status}</Badge></div>
              <p className="mt-1 text-[9px] leading-4 text-slate-500">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function FinalDecisionPanel({ suite, metrics, failures, evidence }) {
  const options = [
    ["Proceed", "Use when critical paths pass, failures are dispositioned, and evidence is traceable.", "emerald"],
    ["Conditional", "Use when known gaps remain but owners, mitigations, and monitoring are explicit.", "amber"],
    ["Hold", "Use when a critical path fails or a blocker prevents a confident recommendation.", "rose"],
  ];
  return (
    <Panel title="Final decision framing" detail="Choose language that matches the evidence instead of overstating confidence." icon={Flag}>
      <div className="grid gap-2 md:grid-cols-3">
        {options.map(([label, detail, tone]) => (
          <button type="button" key={label} onClick={() => suite && suite.id && null} className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-violet-300">
            <Badge tone={tone}>{label}</Badge>
            <p className="mt-2 text-[9px] leading-4 text-slate-500">{detail}</p>
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-50 p-3"><p className="text-[9px] text-slate-500">Pass ratio</p><p className="mt-1 text-sm font-semibold text-slate-900">{metrics.passCount}/{metrics.completed || 0}</p></div>
        <div className="rounded-lg bg-slate-50 p-3"><p className="text-[9px] text-slate-500">Open failures</p><p className="mt-1 text-sm font-semibold text-rose-700">{failures.filter((item) => item.state === "open").length}</p></div>
        <div className="rounded-lg bg-slate-50 p-3"><p className="text-[9px] text-slate-500">Evidence items</p><p className="mt-1 text-sm font-semibold text-emerald-700">{evidence.length}</p></div>
      </div>
    </Panel>
  );
}

function DecisionTerms() {
  const terms = [
    ["Disposition", "The current decision for a failure: triage, owned, fixed, verified, or accepted."],
    ["Traceability", "The ability to connect a result to its case, environment, evidence, and owner."],
    ["Coverage", "The relationship between impacted areas and the executable cases that exercise them."],
  ];
  return (
    <Panel title="Decision terms" detail="Shared definitions for concise regression discussions." icon={Clipboard}>
      <div className="grid gap-2 md:grid-cols-3">
        {terms.map(([term, definition]) => (
          <div key={term} className="rounded-xl border border-slate-200 p-3">
            <p className="text-[10px] font-semibold text-slate-800">{term}</p>
            <p className="mt-1 text-[9px] leading-4 text-slate-500">{definition}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function RegressionFooter({ suite }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-[10px] leading-5 text-slate-500">
      <p className="font-semibold text-slate-700">Private workspace reminder</p>
      <p className="mt-1">
        This command center stores planning notes in the tester&apos;s browser.
        It does not update report severity, ownership, status, release state, or
        server-side approval records. Use the suite summary to communicate the
        conclusion through the repository&apos;s normal workflow.
      </p>
      <p className="mt-2 text-slate-400">
        Current suite: {suite?.title || "All regression suites"}.
      </p>
    </div>
  );
}

export default function TesterRegressionCommandCenter({ reports = [], email = "", onOpenReport }) {
  const [data, setData] = useState(emptyData);
  const [selectedSuiteId, setSelectedSuiteId] = useState("");
  const [tab, setTab] = useState("overview");
  const [suiteFilter, setSuiteFilter] = useState("all");
  const [caseFilter, setCaseFilter] = useState("all");
  const [failureFilter, setFailureFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [ascending, setAscending] = useState(false);
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState("");
  const [suiteForm, setSuiteForm] = useState({ title: "", release: "", owner: "", environment: "", state: "draft", scope: "", notes: "" });
  const [caseForm, setCaseForm] = useState({ title: "", suiteId: "", areaId: "", priority: "medium", state: "planned", owner: "", expected: "", result: "" });
  const [failureForm, setFailureForm] = useState({ title: "", suiteId: "", caseId: "", severity: "medium", state: "open", owner: "", impact: "", nextStep: "" });
  const [evidenceForm, setEvidenceForm] = useState({ title: "", suiteId: "", type: "Screenshot", state: "planned", owner: "", reference: "", note: "" });
  const [areaForm, setAreaForm] = useState({ name: "", suiteId: "", type: "Feature", owner: "", risk: "medium", notes: "" });

  useEffect(() => setData(readData()), []);
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const suite = data.suites.find((item) => item.id === selectedSuiteId) || null;
  const scopedCases = data.cases.filter((item) => !selectedSuiteId || item.suiteId === selectedSuiteId);
  const scopedFailures = data.failures.filter((item) => !selectedSuiteId || item.suiteId === selectedSuiteId);
  const scopedEvidence = data.evidence.filter((item) => !selectedSuiteId || item.suiteId === selectedSuiteId);
  const scopedAreas = data.areas.filter((item) => !selectedSuiteId || item.suiteId === selectedSuiteId);
  const metrics = useMemo(() => {
    const completed = scopedCases.filter((item) => ["pass", "fail", "blocked", "skipped"].includes(item.state)).length;
    return {
      completed,
      planned: scopedCases.filter((item) => item.state === "planned").length,
      running: scopedCases.filter((item) => item.state === "running").length,
      passCount: scopedCases.filter((item) => item.state === "pass").length,
      failCount: scopedCases.filter((item) => item.state === "fail").length,
      progress: scopedCases.length ? Math.round((completed / scopedCases.length) * 100) : 0,
    };
  }, [scopedCases]);
  const filteredCases = useMemo(() => {
    const normalized = query.toLowerCase();
    return scopedCases
      .filter((item) => caseFilter === "all" || item.state === caseFilter)
      .filter((item) => !normalized || `${item.title} ${item.owner} ${item.expected} ${item.result}`.toLowerCase().includes(normalized))
      .sort((a, b) => ascending ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title));
  }, [ascending, caseFilter, query, scopedCases]);
  const filteredFailures = useMemo(() => {
    const normalized = query.toLowerCase();
    return scopedFailures
      .filter((item) => failureFilter === "all" || item.state === failureFilter)
      .filter((item) => severityFilter === "all" || item.severity === severityFilter)
      .filter((item) => !normalized || `${item.title} ${item.owner} ${item.impact} ${item.nextStep}`.toLowerCase().includes(normalized));
  }, [failureFilter, query, scopedFailures, severityFilter]);
  const openFailures = scopedFailures.filter((item) => !["verified", "accepted"].includes(item.state));
  const readinessChecks = [
    Boolean(suite?.scope),
    scopedCases.length > 0,
    scopedCases.length > 0 && scopedCases.every((item) => item.owner),
    Boolean(suite?.environment),
    scopedFailures.every((item) => item.owner || ["verified", "accepted"].includes(item.state)),
    scopedEvidence.length > 0,
    Boolean(suite?.summary),
  ];
  const readiness = readinessChecks.filter(Boolean).length;
  const readinessPercent = Math.round((readiness / CHECKS.length) * 100);

  function update(key, items) {
    setData((current) => ({ ...current, [key]: items }));
  }
  function addSuite(event) {
    event.preventDefault();
    if (!clean(suiteForm.title) || data.suites.length >= MAX_SUITES) return;
    const item = { ...suiteForm, id: makeId("suite"), title: clean(suiteForm.title), release: clean(suiteForm.release), owner: clean(suiteForm.owner), environment: clean(suiteForm.environment), scope: clean(suiteForm.scope), notes: clean(suiteForm.notes), summary: "", createdAt: now() };
    update("suites", [item, ...data.suites].slice(0, MAX_SUITES));
    setSelectedSuiteId(item.id);
    setSuiteForm({ title: "", release: "", owner: "", environment: "", state: "draft", scope: "", notes: "" });
    setModal("");
    setNotice("Regression suite created");
  }
  function addCase(event) {
    event.preventDefault();
    if (!clean(caseForm.title) || data.cases.length >= MAX_CASES) return;
    const item = { ...caseForm, id: makeId("case"), suiteId: caseForm.suiteId || selectedSuiteId, title: clean(caseForm.title), owner: clean(caseForm.owner), expected: clean(caseForm.expected), result: clean(caseForm.result), createdAt: now() };
    update("cases", [item, ...data.cases].slice(0, MAX_CASES));
    setCaseForm({ title: "", suiteId: selectedSuiteId, areaId: "", priority: "medium", state: "planned", owner: "", expected: "", result: "" });
    setModal("");
    setNotice("Regression case added");
  }
  function addFailure(event) {
    event.preventDefault();
    if (!clean(failureForm.title) || data.failures.length >= MAX_FAILURES) return;
    const item = { ...failureForm, id: makeId("failure"), suiteId: failureForm.suiteId || selectedSuiteId, title: clean(failureForm.title), owner: clean(failureForm.owner), impact: clean(failureForm.impact), nextStep: clean(failureForm.nextStep), createdAt: now() };
    update("failures", [item, ...data.failures].slice(0, MAX_FAILURES));
    setFailureForm({ title: "", suiteId: selectedSuiteId, caseId: "", severity: "medium", state: "open", owner: "", impact: "", nextStep: "" });
    setModal("");
    setNotice("Failure added");
  }
  function addEvidence(event) {
    event.preventDefault();
    if (!clean(evidenceForm.title) || data.evidence.length >= MAX_EVIDENCE) return;
    const item = { ...evidenceForm, id: makeId("evidence"), suiteId: evidenceForm.suiteId || selectedSuiteId, title: clean(evidenceForm.title), owner: clean(evidenceForm.owner), reference: clean(evidenceForm.reference), note: clean(evidenceForm.note), createdAt: now() };
    update("evidence", [item, ...data.evidence].slice(0, MAX_EVIDENCE));
    setEvidenceForm({ title: "", suiteId: selectedSuiteId, type: "Screenshot", state: "planned", owner: "", reference: "", note: "" });
    setModal("");
    setNotice("Evidence added");
  }
  function addArea(event) {
    event.preventDefault();
    if (!clean(areaForm.name) || data.areas.length >= MAX_AREAS) return;
    const item = { ...areaForm, id: makeId("area"), suiteId: areaForm.suiteId || selectedSuiteId, name: clean(areaForm.name), owner: clean(areaForm.owner), notes: clean(areaForm.notes), createdAt: now() };
    update("areas", [item, ...data.areas].slice(0, MAX_AREAS));
    setAreaForm({ name: "", suiteId: selectedSuiteId, type: "Feature", owner: "", risk: "medium", notes: "" });
    setModal("");
    setNotice("Impacted area added");
  }
  function change(key, itemId, field, value) {
    update(key, data[key].map((item) => item.id === itemId ? { ...item, [field]: value, updatedAt: now() } : item));
  }
  function remove(key, itemId) {
    update(key, data[key].filter((item) => item.id !== itemId));
    setNotice("Item removed");
  }
  function copySummary() {
    const lines = [
      `Regression suite: ${suite?.title || "All suites"}`,
      `Readiness: ${readinessPercent}%`,
      `Execution: ${metrics.passCount}/${scopedCases.length} pass`,
      `Open failures: ${openFailures.length}`,
      `Evidence: ${scopedEvidence.length}`,
      `Impacted areas: ${scopedAreas.length}`,
      suite?.summary || "No regression conclusion written.",
    ];
    navigator.clipboard?.writeText(lines.join("\n"));
    setNotice("Regression summary copied");
  }
  function exportCases() {
    const rows = [["Case", "Suite", "Priority", "State", "Owner", "Area", "Expected", "Result"], ...filteredCases.map((item) => [item.title, data.suites.find((suiteItem) => suiteItem.id === item.suiteId)?.title || "", item.priority, item.state, item.owner, data.areas.find((area) => area.id === item.areaId)?.name || "", item.expected, item.result])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "tester-regression-cases.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Regression cases exported");
  }
  function attachReport(report) {
    if (data.reports.some((item) => item.id === report.id) || data.reports.length >= MAX_REPORTS) return;
    update("reports", [{ id: report.id, title: clean(report.title || report.summary || `Report ${report.id}`), attachedAt: now() }, ...data.reports]);
    setNotice("Report attached");
  }
  function addReference() {
    const title = window.prompt("Reference title");
    if (!clean(title) || data.references.length >= MAX_REFERENCES) return;
    update("references", [{ id: makeId("reference"), title: clean(title), createdAt: now() }, ...data.references]);
    setNotice("Reference added");
  }

  const tabs = [
    ["overview", "Overview"],
    ["cases", `Cases (${scopedCases.length})`],
    ["failures", `Failures (${scopedFailures.length})`],
    ["evidence", `Evidence (${scopedEvidence.length})`],
    ["areas", `Areas (${scopedAreas.length})`],
    ["sources", "Sources"],
  ];

  return (
    <section className="mt-8 space-y-5">
      <div className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700"><Gauge size={16} /> Regression command center</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Make regression coverage easy to run, inspect, and hand off.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Organize suites, cases, impacted areas, failures, and evidence in a private tester workspace. This tool is advisory and does not change server report status.</p>
          </div>
          <div className="flex flex-wrap gap-2"><Button icon={Plus} variant="primary" onClick={() => setModal("suite")} disabled={data.suites.length >= MAX_SUITES}>New suite</Button><Button icon={Copy} onClick={copySummary}>Copy summary</Button></div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Readiness" value={`${readinessPercent}%`} note={`${readiness} of ${CHECKS.length} checks complete`} tone="violet" icon={CheckCircle2} />
          <Stat label="Cases passed" value={metrics.passCount} note={`${scopedCases.length} cases in scope`} tone="emerald" icon={ListChecks} />
          <Stat label="Open failures" value={openFailures.length} note={`${scopedFailures.length} failures tracked`} tone="rose" icon={ShieldAlert} />
          <Stat label="Evidence" value={scopedEvidence.length} note={`${scopedAreas.length} impacted areas`} tone="amber" icon={FileCheck2} />
        </div>
      </div>

      {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"><CheckCircle2 size={16} />{notice}</div>}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">{tabs.map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-t-lg px-3 py-2 text-xs font-semibold transition ${tab === value ? "border-b-2 border-violet-600 text-violet-700" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>)}</div>

      <Section title="Regression suite context" description="Focus the command center on one release, feature, or build." action={<Button icon={RefreshCw} onClick={() => { setData(readData()); setNotice("Workspace refreshed"); }}>Refresh</Button>}>
        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_180px_170px]">
          <label className="text-xs font-semibold text-slate-700">Selected suite<select value={selectedSuiteId} onChange={(event) => setSelectedSuiteId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"><option value="">All regression suites</option>{data.suites.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-700">Suite state<select value={suiteFilter} onChange={(event) => setSuiteFilter(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-violet-500">{SUITE_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <div className="flex items-end"><Button icon={Plus} onClick={() => setModal("suite")}>Add suite</Button></div>
        </div>
        <div className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-2 xl:grid-cols-3">
          {data.suites.filter((item) => suiteFilter === "all" || item.state === suiteFilter).map((item) => <button key={item.id} type="button" onClick={() => setSelectedSuiteId(item.id)} className={`rounded-xl border p-4 text-left transition hover:border-violet-300 ${selectedSuiteId === item.id ? "border-violet-300 bg-violet-50/50" : "border-slate-200"}`}><div className="flex items-start justify-between gap-3"><span className="min-w-0 text-sm font-semibold text-slate-900">{item.title}</span><Badge tone={stateTone(SUITE_STATES, item.state)}>{labelFor(SUITE_STATES, item.state)}</Badge></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{item.scope || "No regression scope described"}</p><div className="mt-3 flex items-center justify-between text-[11px] text-slate-400"><span>{item.release || "No release"}</span><span>{item.owner || "Unassigned"}</span></div></button>)}
          {!data.suites.length && <div className="md:col-span-2 xl:col-span-3"><Empty title="No regression suite yet" description="Create a suite for a release, feature, hotfix, or impacted journey." action={<Button icon={Plus} variant="primary" onClick={() => setModal("suite")}>Create suite</Button>} /></div>}
        </div>
      </Section>

      {tab === "overview" && <div className="space-y-5"><RegressionScorecard suite={suite} metrics={metrics} cases={scopedCases} failures={scopedFailures} evidence={scopedEvidence} areas={scopedAreas} /><div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]"><Section title="Regression readiness" description="Use these checks before sharing a regression conclusion."><div className="space-y-3 p-5">{CHECKS.map(([id, title, detail], index) => { const complete = [Boolean(suite?.scope), scopedCases.length > 0, scopedCases.length > 0 && scopedCases.every((item) => item.owner), Boolean(suite?.environment), scopedFailures.every((item) => item.owner || ["verified", "accepted"].includes(item.state)), scopedEvidence.length > 0, Boolean(suite?.summary)][index]; return <div key={id} className={`flex gap-3 rounded-xl border p-3 ${complete ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200"}`}><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${complete ? "bg-emerald-600 text-white" : "border border-slate-300 text-transparent"}`}><Check size={13} /></span><div><p className="text-xs font-semibold text-slate-800">{title}</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{detail}</p></div></div>; })}</div></Section><Section title="Regression conclusion" description="Write the short result that a release owner can act on."><div className="space-y-4 p-5"><TextArea label="Summary" value={suite?.summary || ""} onChange={(value) => { if (!suite) return; update("suites", data.suites.map((item) => item.id === suite.id ? { ...item, summary: value, updatedAt: now() } : item)); }} placeholder="Summarize what passed, what failed, and what remains uncertain." rows={6} /><TextArea label="Known limitations" value={suite?.limitations || ""} onChange={(value) => { if (!suite) return; update("suites", data.suites.map((item) => item.id === suite.id ? { ...item, limitations: value, updatedAt: now() } : item)); }} placeholder="Document excluded areas, unavailable data, or environment constraints." rows={4} /><TextArea label="Next action" value={suite?.nextAction || ""} onChange={(value) => { if (!suite) return; update("suites", data.suites.map((item) => item.id === suite.id ? { ...item, nextAction: value, updatedAt: now() } : item)); }} placeholder="Name the next action, owner, and expected timing." rows={3} /></div></Section></div><div className="grid gap-5 xl:grid-cols-2"><RegressionRunbook suite={suite} cases={scopedCases} failures={scopedFailures} evidence={scopedEvidence} areas={scopedAreas} /><CoverageMatrix cases={scopedCases} areas={scopedAreas} /></div><div className="grid gap-5 xl:grid-cols-2"><FailureDispositionGuide failures={scopedFailures} /><OwnershipBoard cases={scopedCases} failures={scopedFailures} evidence={scopedEvidence} /></div><div className="grid gap-5 xl:grid-cols-2"><ReviewPrompts suite={suite} cases={scopedCases} failures={scopedFailures} evidence={scopedEvidence} areas={scopedAreas} /><CasePriorityGuide cases={scopedCases} /></div><div className="grid gap-5 xl:grid-cols-2"><HandoffChecklist suite={suite} metrics={metrics} failures={scopedFailures} evidence={scopedEvidence} /><OperationalReview suite={suite} failures={scopedFailures} cases={scopedCases} /></div><RegressionReviewLegend /><FinalDecisionPanel suite={suite} metrics={metrics} failures={scopedFailures} evidence={scopedEvidence} /><DecisionTerms /><RegressionFooter suite={suite} /></div>}

      {tab === "cases" && <Section title="Regression cases" description="Plan and execute the journeys that matter for this release." action={<div className="flex flex-wrap gap-2"><Button icon={Download} onClick={exportCases}>Export CSV</Button><Button icon={Plus} variant="primary" onClick={() => setModal("case")}>Add case</Button></div>}><div className="grid gap-3 border-b border-slate-100 p-5 lg:grid-cols-[minmax(0,1fr)_160px_auto]"><label className="relative block"><Search size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search cases..." className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" /></label><select value={caseFilter} onChange={(event) => setCaseFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-violet-500">{CASE_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><Button icon={ascending ? ArrowUpAZ : ArrowDownAZ} onClick={() => setAscending((value) => !value)}>Name</Button></div>{!filteredCases.length ? <Empty title="No regression cases match" description="Add a case or clear the current search and filter." action={<Button icon={Plus} onClick={() => setModal("case")}>Add case</Button>} /> : <div className="divide-y divide-slate-100">{filteredCases.slice(0, PAGE_SIZE).map((item) => <div key={item.id} className="p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-900">{item.title}</h4><Badge tone={severityTone(item.priority)}>{labelFor(SEVERITIES, item.priority)}</Badge><Badge tone={stateTone(CASE_STATES, item.state)}>{labelFor(CASE_STATES, item.state)}</Badge></div><p className="mt-2 text-xs text-slate-600"><span className="font-semibold">Expected:</span> {item.expected || "Not recorded"}</p><p className="mt-1 text-xs text-slate-600"><span className="font-semibold">Result:</span> {item.result || "Awaiting execution"}</p><p className="mt-2 text-[11px] text-slate-500">Owner: {item.owner || "Unassigned"} · Area: {data.areas.find((area) => area.id === item.areaId)?.name || "Unmapped"}</p></div><div className="flex gap-2"><select value={item.state} onChange={(event) => change("cases", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{CASE_STATES.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => remove("cases", item.id)}>Remove</Button></div></div></div>)}</div>}</Section>}

      {tab === "failures" && <Section title="Failure triage" description="Make every regression failure visible, owned, and dispositioned." action={<Button icon={Plus} variant="primary" onClick={() => setModal("failure")}>Add failure</Button>}><div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-2"><select value={failureFilter} onChange={(event) => setFailureFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-violet-500">{FAILURE_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-violet-500">{SEVERITY_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>{!filteredFailures.length ? <Empty title="No failures match" description="Add a failure when a regression result needs triage or follow-up." action={<Button icon={Plus} onClick={() => setModal("failure")}>Add failure</Button>} /> : <div className="divide-y divide-slate-100">{filteredFailures.map((item) => <div key={item.id} className="p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-900">{item.title}</h4><Badge tone={severityTone(item.severity)}>{labelFor(SEVERITIES, item.severity)}</Badge><Badge tone={item.state === "verified" || item.state === "accepted" ? "emerald" : "rose"}>{labelFor(FAILURE_STATES, item.state)}</Badge></div><p className="mt-2 text-xs leading-5 text-slate-600">{item.impact || "Impact not described."}</p><p className="mt-2 text-[11px] text-slate-500">Owner: {item.owner || "Unassigned"} · Next: {item.nextStep || "Not recorded"}</p></div><div className="flex gap-2"><select value={item.state} onChange={(event) => change("failures", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{FAILURE_STATES.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => remove("failures", item.id)}>Remove</Button></div></div></div>)}</div>}</Section>}

      {tab === "evidence" && <Section title="Evidence register" description="Attach the artifacts that make regression results reviewable." action={<Button icon={Plus} variant="primary" onClick={() => setModal("evidence")}>Add evidence</Button>}><div className="border-b border-slate-100 p-5"><p className="text-xs text-slate-500">Evidence should explain what was tested, where it ran, and what a reviewer should verify.</p></div>{!scopedEvidence.length ? <Empty title="No evidence attached" description="Add screenshots, videos, logs, reports, traces, or notes." action={<Button icon={Plus} onClick={() => setModal("evidence")}>Add evidence</Button>} /> : <div className="divide-y divide-slate-100">{scopedEvidence.map((item) => <div key={item.id} className="p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-900">{item.title}</h4><Badge tone={item.state === "reviewed" ? "emerald" : item.state === "rejected" ? "rose" : "slate"}>{labelFor(EVIDENCE_STATES, item.state)}</Badge><Badge>{item.type}</Badge></div><p className="mt-2 text-xs leading-5 text-slate-600">{item.note || item.reference || "No context recorded."}</p><p className="mt-2 text-[11px] text-slate-500">Owner: {item.owner || "Unassigned"} · Reference: {item.reference || "Not recorded"}</p></div><div className="flex gap-2"><select value={item.state} onChange={(event) => change("evidence", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{EVIDENCE_STATES.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => remove("evidence", item.id)}>Remove</Button></div></div></div>)}</div>}</Section>}

      {tab === "areas" && <Section title="Impacted areas" description="Map the surface touched by the release so regression coverage has context." action={<Button icon={Plus} variant="primary" onClick={() => setModal("area")}>Add area</Button>}>{!scopedAreas.length ? <Empty title="No impacted areas" description="Add features, services, journeys, integrations, platforms, or data surfaces." action={<Button icon={Plus} onClick={() => setModal("area")}>Add area</Button>} /> : <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">{scopedAreas.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><h4 className="text-sm font-semibold text-slate-900">{item.name}</h4><Badge tone={item.risk === "high" || item.risk === "critical" ? "rose" : "amber"}>{item.risk} risk</Badge></div><p className="mt-2 text-xs text-slate-500">{item.type} · {item.owner || "Unassigned"}</p><p className="mt-2 text-xs leading-5 text-slate-600">{item.notes || "No notes recorded."}</p><div className="mt-3 flex justify-end"><Button variant="danger" icon={Trash2} onClick={() => remove("areas", item.id)}>Remove</Button></div></article>)}</div>}</Section>}

      {tab === "sources" && <div className="grid gap-5 xl:grid-cols-2"><Section title="Attached reports" description="Use existing tester reports as regression evidence."><div className="divide-y divide-slate-100">{reports.slice(0, 20).map((report) => { const attached = data.reports.some((item) => item.id === report.id); return <div key={report.id} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{report.title || report.summary || `Report ${report.id}`}</p><p className="mt-1 text-[11px] text-slate-500">Available tester report</p></div><div className="flex shrink-0 gap-2">{onOpenReport && <Button icon={ExternalLink} onClick={() => onOpenReport(report)}>Open</Button>}<Button icon={attached ? Check : Plus} onClick={() => attachReport(report)} disabled={attached}>{attached ? "Attached" : "Attach"}</Button></div></div>; })}{!reports.length && <Empty title="No reports available" description="Submitted reports will appear here when available." />}</div></Section><Section title="References" description="Keep tickets, release notes, designs, and standards near the regression decision." action={<Button icon={Plus} onClick={addReference}>Add reference</Button>}><div className="divide-y divide-slate-100">{data.references.map((reference) => <div key={reference.id} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{reference.title}</p><p className="mt-1 text-[11px] text-slate-400">{dateLabel(reference.createdAt)}</p></div><Button variant="danger" icon={Trash2} onClick={() => remove("references", reference.id)}>Remove</Button></div>)}{!data.references.length && <Empty title="No references yet" description="Add a source that supports the regression conclusion." action={<Button icon={Plus} onClick={addReference}>Add reference</Button>} />}</div></Section></div>}

      {modal === "suite" && <Modal title="Create regression suite" onClose={() => setModal("")}><form onSubmit={addSuite} className="space-y-4"><Field label="Suite title" value={suiteForm.title} onChange={(value) => setSuiteForm({ ...suiteForm, title: value })} placeholder="Checkout release regression" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Release / build" value={suiteForm.release} onChange={(value) => setSuiteForm({ ...suiteForm, release: value })} placeholder="2.4.0 / build 184" /><Field label="Owner" value={suiteForm.owner} onChange={(value) => setSuiteForm({ ...suiteForm, owner: value })} placeholder={email || "Tester or team"} /><Field label="Environment" value={suiteForm.environment} onChange={(value) => setSuiteForm({ ...suiteForm, environment: value })} placeholder="Chrome / staging" /><Field label="State" options={SUITE_STATES} value={suiteForm.state} onChange={(value) => setSuiteForm({ ...suiteForm, state: value })} /></div><TextArea label="Scope" value={suiteForm.scope} onChange={(value) => setSuiteForm({ ...suiteForm, scope: value })} placeholder="Features, journeys, environments, and exclusions" rows={4} /><TextArea label="Notes" value={suiteForm.notes} onChange={(value) => setSuiteForm({ ...suiteForm, notes: value })} placeholder="Setup assumptions or handoff notes" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Create suite</Button></div></form></Modal>}
      {modal === "case" && <Modal title="Add regression case" onClose={() => setModal("")}><form onSubmit={addCase} className="space-y-4"><Field label="Case title" value={caseForm.title} onChange={(value) => setCaseForm({ ...caseForm, title: value })} placeholder="Existing customer completes checkout" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Suite" options={data.suites.map((item) => ({ value: item.id, label: item.title }))} value={caseForm.suiteId || selectedSuiteId} onChange={(value) => setCaseForm({ ...caseForm, suiteId: value })} /><Field label="Impacted area" options={scopedAreas.map((item) => ({ value: item.id, label: item.name }))} value={caseForm.areaId} onChange={(value) => setCaseForm({ ...caseForm, areaId: value })} /><Field label="Priority" options={SEVERITIES} value={caseForm.priority} onChange={(value) => setCaseForm({ ...caseForm, priority: value })} /><Field label="State" options={CASE_STATES} value={caseForm.state} onChange={(value) => setCaseForm({ ...caseForm, state: value })} /><Field label="Owner" value={caseForm.owner} onChange={(value) => setCaseForm({ ...caseForm, owner: value })} placeholder="Executor" /></div><TextArea label="Expected" value={caseForm.expected} onChange={(value) => setCaseForm({ ...caseForm, expected: value })} placeholder="Expected result" /><TextArea label="Result" value={caseForm.result} onChange={(value) => setCaseForm({ ...caseForm, result: value })} placeholder="Observed result, environment, and notes" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add case</Button></div></form></Modal>}
      {modal === "failure" && <Modal title="Add regression failure" onClose={() => setModal("")}><form onSubmit={addFailure} className="space-y-4"><Field label="Failure title" value={failureForm.title} onChange={(value) => setFailureForm({ ...failureForm, title: value })} placeholder="Saved address is not retained" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Suite" options={data.suites.map((item) => ({ value: item.id, label: item.title }))} value={failureForm.suiteId || selectedSuiteId} onChange={(value) => setFailureForm({ ...failureForm, suiteId: value })} /><Field label="Related case" options={scopedCases.map((item) => ({ value: item.id, label: item.title }))} value={failureForm.caseId} onChange={(value) => setFailureForm({ ...failureForm, caseId: value })} /><Field label="Severity" options={SEVERITIES} value={failureForm.severity} onChange={(value) => setFailureForm({ ...failureForm, severity: value })} /><Field label="State" options={FAILURE_STATES} value={failureForm.state} onChange={(value) => setFailureForm({ ...failureForm, state: value })} /><Field label="Owner" value={failureForm.owner} onChange={(value) => setFailureForm({ ...failureForm, owner: value })} placeholder="Triage owner" /></div><TextArea label="Impact" value={failureForm.impact} onChange={(value) => setFailureForm({ ...failureForm, impact: value })} placeholder="Who or what is affected?" required /><TextArea label="Next step" value={failureForm.nextStep} onChange={(value) => setFailureForm({ ...failureForm, nextStep: value })} placeholder="Reproduce, fix, retest, or accept" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add failure</Button></div></form></Modal>}
      {modal === "evidence" && <Modal title="Add evidence" onClose={() => setModal("")}><form onSubmit={addEvidence} className="space-y-4"><Field label="Evidence title" value={evidenceForm.title} onChange={(value) => setEvidenceForm({ ...evidenceForm, title: value })} placeholder="Regression smoke recording" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Suite" options={data.suites.map((item) => ({ value: item.id, label: item.title }))} value={evidenceForm.suiteId || selectedSuiteId} onChange={(value) => setEvidenceForm({ ...evidenceForm, suiteId: value })} /><Field label="Type" options={EVIDENCE_TYPES.map((value) => ({ value, label: value }))} value={evidenceForm.type} onChange={(value) => setEvidenceForm({ ...evidenceForm, type: value })} /><Field label="State" options={EVIDENCE_STATES} value={evidenceForm.state} onChange={(value) => setEvidenceForm({ ...evidenceForm, state: value })} /><Field label="Owner" value={evidenceForm.owner} onChange={(value) => setEvidenceForm({ ...evidenceForm, owner: value })} placeholder="Evidence owner" /></div><Field label="Reference" value={evidenceForm.reference} onChange={(value) => setEvidenceForm({ ...evidenceForm, reference: value })} placeholder="URL, file, run, ticket, or report" /><TextArea label="Note" value={evidenceForm.note} onChange={(value) => setEvidenceForm({ ...evidenceForm, note: value })} placeholder="What does this evidence prove?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add evidence</Button></div></form></Modal>}
      {modal === "area" && <Modal title="Add impacted area" onClose={() => setModal("")}><form onSubmit={addArea} className="space-y-4"><Field label="Area name" value={areaForm.name} onChange={(value) => setAreaForm({ ...areaForm, name: value })} placeholder="Account recovery" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Suite" options={data.suites.map((item) => ({ value: item.id, label: item.title }))} value={areaForm.suiteId || selectedSuiteId} onChange={(value) => setAreaForm({ ...areaForm, suiteId: value })} /><Field label="Type" options={AREA_TYPES.map((value) => ({ value, label: value }))} value={areaForm.type} onChange={(value) => setAreaForm({ ...areaForm, type: value })} /><Field label="Risk" options={SEVERITIES} value={areaForm.risk} onChange={(value) => setAreaForm({ ...areaForm, risk: value })} /><Field label="Owner" value={areaForm.owner} onChange={(value) => setAreaForm({ ...areaForm, owner: value })} placeholder="Area owner" /></div><TextArea label="Notes" value={areaForm.notes} onChange={(value) => setAreaForm({ ...areaForm, notes: value })} placeholder="Why is this area in the regression surface?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add area</Button></div></form></Modal>}
    </section>
  );
}
