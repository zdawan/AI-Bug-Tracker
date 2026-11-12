"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Check,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  Gauge,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";

const STORAGE_KEY = "tester-performance-review-v1";
const MAX_REVIEWS = 25;
const MAX_SCENARIOS = 100;
const MAX_FINDINGS = 100;
const MAX_REPORTS = 100;
const MAX_REFERENCES = 40;
const PAGE_SIZE = 8;

const REVIEW_STATES = [
  { value: "draft", label: "Draft", tone: "slate" },
  { value: "planned", label: "Planned", tone: "cyan" },
  { value: "running", label: "Running", tone: "violet" },
  { value: "review", label: "In review", tone: "amber" },
  { value: "stable", label: "Stable", tone: "emerald" },
  { value: "regression", label: "Regression", tone: "rose" },
];

const REVIEW_FILTERS = [{ value: "all", label: "All reviews" }, ...REVIEW_STATES];
const SCENARIO_STATES = [
  { value: "planned", label: "Planned" },
  { value: "running", label: "Running" },
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "blocked", label: "Blocked" },
  { value: "skipped", label: "Skipped" },
];
const SCENARIO_FILTERS = [{ value: "all", label: "All scenarios" }, ...SCENARIO_STATES];
const SEVERITIES = [
  { value: "critical", label: "Critical", tone: "rose" },
  { value: "high", label: "High", tone: "orange" },
  { value: "medium", label: "Medium", tone: "amber" },
  { value: "low", label: "Low", tone: "emerald" },
];
const SEVERITY_FILTERS = [{ value: "all", label: "All severities" }, ...SEVERITIES];
const METRICS = [
  { value: "load-time", label: "Load time" },
  { value: "first-contentful-paint", label: "First contentful paint" },
  { value: "largest-contentful-paint", label: "Largest contentful paint" },
  { value: "interaction", label: "Interaction latency" },
  { value: "api", label: "API response" },
  { value: "error-rate", label: "Error rate" },
];
const CHECKS = [
  { id: "scope", label: "Performance scope is clear", detail: "The release, journey, and target environment are named." },
  { id: "baseline", label: "Baseline is recorded", detail: "A comparison run or expected threshold is available." },
  { id: "load", label: "Load profile is defined", detail: "The user volume, data shape, or traffic assumption is explicit." },
  { id: "metrics", label: "Key metrics are selected", detail: "The review focuses on measurable performance signals." },
  { id: "thresholds", label: "Thresholds are understood", detail: "Pass, concern, and failure boundaries are documented." },
  { id: "findings", label: "Regressions have owners", detail: "Open performance findings have a responsible owner." },
  { id: "evidence", label: "Evidence is attached", detail: "Reports and references support the performance conclusion." },
];

function clean(value, fallback = "", limit = 1200) {
  if (typeof value !== "string") return fallback;
  const result = value.trim();
  return result ? result.slice(0, limit) : fallback;
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function reportId(report) {
  return String(report?._id ?? report?.id ?? report?.bugId ?? "");
}

function reportTitle(report) {
  return clean(report?.title ?? report?.summary ?? report?.name, "Untitled report", 180);
}

function reportSeverity(report) {
  const value = String(report?.severity ?? report?.priority ?? "medium").toLowerCase();
  return SEVERITIES.some((item) => item.value === value) ? value : "medium";
}

function reportStatus(report) {
  const value = String(report?.status ?? report?.state ?? "open").toLowerCase();
  return ["closed", "resolved", "fixed", "done"].includes(value) ? "resolved" : "open";
}

function reportCategory(report) {
  return clean(report?.category ?? report?.type ?? report?.area, "Uncategorized", 80);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value);
}

function escapeCsv(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCsv(filename, rows) {
  const blob = new Blob([rows.map((row) => row.map(escapeCsv).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function readStorage(email) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY}:${email || "anonymous"}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStorage(email, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${STORAGE_KEY}:${email || "anonymous"}`, JSON.stringify(value));
  } catch {
    // The review remains usable when browser storage is unavailable.
  }
}

function reviewMeta(value) {
  return REVIEW_STATES.find((state) => state.value === value) || REVIEW_STATES[0];
}

function severityMeta(value) {
  return SEVERITIES.find((severity) => severity.value === value) || SEVERITIES[2];
}

function toneClasses(tone, compact = false) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-800",
    violet: "border-violet-100 bg-violet-50 text-violet-800",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-800",
    rose: "border-rose-100 bg-rose-50 text-rose-800",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    orange: "border-orange-100 bg-orange-50 text-orange-800",
  };
  return `${tones[tone] || tones.slate} ${compact ? "px-2 py-0.5" : "px-2.5 py-1"}`;
}

function createReview() {
  return {
    id: makeId("perf-review"),
    name: "Untitled performance review",
    release: "",
    surface: "",
    environment: "",
    owner: "",
    audience: "",
    state: "draft",
    targetDate: "",
    objective: "",
    baseline: "",
    conclusion: "",
    limitations: "",
    checks: Object.fromEntries(CHECKS.map((check) => [check.id, false])),
    scenarios: [],
    findings: [],
    reportIds: [],
    references: [],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function normalizeReview(value) {
  const source = value && typeof value === "object" ? value : createReview();
  return {
    ...createReview(),
    ...source,
    checks: { ...createReview().checks, ...(source.checks || {}) },
    scenarios: Array.isArray(source.scenarios)
      ? source.scenarios.slice(0, MAX_SCENARIOS).map((scenario) => ({
          id: makeId("scenario"),
          title: "",
          metric: "load-time",
          state: "planned",
          target: "",
          observed: "",
          owner: "",
          note: "",
          ...scenario,
        }))
      : [],
    findings: Array.isArray(source.findings)
      ? source.findings.slice(0, MAX_FINDINGS).map((finding) => ({
          id: makeId("finding"),
          title: "",
          severity: "medium",
          state: "open",
          owner: "",
          impact: "",
          remediation: "",
          ...finding,
        }))
      : [],
    reportIds: Array.isArray(source.reportIds) ? source.reportIds.slice(0, MAX_REPORTS) : [],
    references: Array.isArray(source.references)
      ? source.references.slice(0, MAX_REFERENCES).map((reference) => ({ id: makeId("reference"), label: "", url: "", ...reference }))
      : [],
  };
}

function Panel({ title, detail, icon: Icon, action, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon ? <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-cyan-600" /> : null}
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-slate-800">{title}</h3>
            {detail ? <p className="mt-1 text-[9px] leading-4 text-slate-400">{detail}</p> : null}
          </div>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Button({ children, onClick, icon: Icon, variant = "secondary", disabled = false, title }) {
  const variants = {
    primary: "border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700",
    secondary: "border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:text-cyan-700",
    ghost: "border-transparent bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700",
    danger: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  };
  return <button type="button" title={title} disabled={disabled} onClick={onClick} className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[9px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]}`}>{Icon ? <Icon size={12} aria-hidden="true" /> : null}{children}</button>;
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return <label className="block"><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label>;
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }) {
  return <label className="block"><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span><textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] leading-4 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label>;
}

function SelectField({ label, value, onChange, options }) {
  return <label className="block"><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span><span className="relative block"><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 pr-7 text-[10px] text-slate-700 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={12} aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" /></span></label>;
}

function StateBadge({ value }) {
  const state = reviewMeta(value);
  return <span className={`inline-flex rounded-full border text-[8px] font-semibold ${toneClasses(state.tone, true)}`}>{state.label}</span>;
}

function SeverityBadge({ value }) {
  const severity = severityMeta(value);
  return <span className={`inline-flex rounded-full border text-[8px] font-semibold ${toneClasses(severity.tone, true)}`}>{severity.label}</span>;
}

function StatCard({ label, value, detail, icon: Icon, tone = "cyan" }) {
  const tones = { cyan: "bg-cyan-50 text-cyan-700", violet: "bg-violet-50 text-violet-700", emerald: "bg-emerald-50 text-emerald-700", rose: "bg-rose-50 text-rose-700" };
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm shadow-slate-200/20"><div className="flex items-center justify-between gap-2"><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><span className={`rounded-lg p-1.5 ${tones[tone] || tones.cyan}`}><Icon size={13} aria-hidden="true" /></span></div><p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-[9px] text-slate-400">{detail}</p></div>;
}

function CheckRow({ check, checked, onChange }) {
  return <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 transition hover:border-cyan-200"><input type="checkbox" checked={checked} onChange={onChange} className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-cyan-600 focus:ring-cyan-500" /><span><span className="block text-[10px] font-semibold text-slate-700">{check.label}</span><span className="mt-0.5 block text-[9px] leading-4 text-slate-400">{check.detail}</span></span></label>;
}

function EmptyState({ title, detail, icon: Icon = Clipboard }) {
  return <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center"><Icon size={21} aria-hidden="true" className="mx-auto text-slate-300" /><p className="mt-2 text-[10px] font-semibold text-slate-600">{title}</p><p className="mx-auto mt-1 max-w-sm text-[9px] leading-4 text-slate-400">{detail}</p></div>;
}

function ScenarioRow({ scenario, onChange, onRemove }) {
  return <div className="rounded-xl border border-slate-200/80 bg-white p-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1.25fr)_170px_120px_140px_auto]"><Field label="Scenario" value={scenario.title} onChange={(value) => onChange({ title: value })} placeholder="Checkout under normal load" /><SelectField label="Metric" value={scenario.metric} onChange={(value) => onChange({ metric: value })} options={METRICS} /><SelectField label="State" value={scenario.state} onChange={(value) => onChange({ state: value })} options={SCENARIO_STATES} /><Field label="Owner" value={scenario.owner} onChange={(value) => onChange({ owner: value })} placeholder="Name or team" /><div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove performance scenario" onClick={onRemove}>Remove</Button></div></div><div className="mt-3 grid gap-2 md:grid-cols-3"><Field label="Target threshold" value={scenario.target} onChange={(value) => onChange({ target: value })} placeholder="< 2.5 seconds" /><Field label="Observed value" value={scenario.observed} onChange={(value) => onChange({ observed: value })} placeholder="1.8 seconds" /><Field label="Observation note" value={scenario.note} onChange={(value) => onChange({ note: value })} placeholder="Traffic, data, or comparison context" /></div></div>;
}

function FindingRow({ finding, onChange, onRemove }) {
  return <div className="rounded-xl border border-slate-200/80 bg-white p-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1.2fr)_120px_130px_140px_auto]"><Field label="Finding" value={finding.title} onChange={(value) => onChange({ title: value })} placeholder="API response regressed under load" /><SelectField label="Severity" value={finding.severity} onChange={(value) => onChange({ severity: value })} options={SEVERITIES} /><SelectField label="State" value={finding.state} onChange={(value) => onChange({ state: value })} options={[{ value: "open", label: "Open" }, { value: "investigating", label: "Investigating" }, { value: "fixing", label: "Fixing" }, { value: "verified", label: "Verified" }, { value: "accepted", label: "Accepted" }]} /><Field label="Owner" value={finding.owner} onChange={(value) => onChange({ owner: value })} placeholder="Name or team" /><div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove performance finding" onClick={onRemove}>Remove</Button></div></div><div className="mt-3 grid gap-2 md:grid-cols-2"><TextArea label="Impact" value={finding.impact} onChange={(value) => onChange({ impact: value })} placeholder="Who or what is affected?" rows={2} /><TextArea label="Remediation" value={finding.remediation} onChange={(value) => onChange({ remediation: value })} placeholder="What should change next?" rows={2} /></div></div>;
}

function ReportRow({ report, checked, onToggle, onOpenReport }) {
  return <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3"><input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 rounded border-slate-300 accent-cyan-600 focus:ring-cyan-500" aria-label={`Attach ${reportTitle(report)}`} /><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-slate-700">{reportTitle(report)}</p><p className="mt-1 truncate text-[9px] text-slate-400">{reportCategory(report)} · {reportStatus(report) === "resolved" ? "Resolved" : "Open"}</p></div><SeverityBadge value={reportSeverity(report)} />{onOpenReport ? <button type="button" onClick={() => onOpenReport(report)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-cyan-700" title="Open report"><ExternalLink size={13} aria-hidden="true" /></button> : null}</div>;
}

function Guidance({ review, metrics, evidenceCount }) {
  const suggestions = [];
  if (!review.objective) suggestions.push("Describe the performance risk and review objective.");
  if (!review.baseline) suggestions.push("Record a baseline or expected threshold.");
  if (!metrics.scenariosDone) suggestions.push("Complete at least one performance scenario.");
  if (metrics.openFindings) suggestions.push(`Review ${metrics.openFindings} open finding(s) before calling the release stable.`);
  if (!evidenceCount) suggestions.push("Attach a report or reference to support the conclusion.");
  if (!review.limitations) suggestions.push("Document workload, infrastructure, or data limitations.");
  if (!suggestions.length) suggestions.push("The performance review has enough context for a focused handoff.");
  return <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-3.5"><div className="flex items-start gap-2"><Sparkles size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-cyan-600" /><div><p className="text-[10px] font-semibold text-cyan-900">Suggested next moves</p><p className="mt-1 text-[9px] leading-4 text-cyan-800/70">Private prompts based on this review.</p></div></div><ul className="mt-3 space-y-1.5">{suggestions.map((suggestion) => <li key={suggestion} className="flex items-start gap-2 text-[9px] leading-4 text-cyan-800/80"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-cyan-500" />{suggestion}</li>)}</ul><p className="mt-3 border-t border-cyan-100 pt-3 text-[8px] leading-4 text-cyan-800/60">This workspace does not execute load tests, change report status, or update server-side assignments.</p></div>;
}

function ReviewHeader({ review, onChange, onDelete, onDuplicate }) {
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><Gauge size={17} aria-hidden="true" className="text-cyan-600" /><h2 className="truncate text-sm font-semibold text-slate-900">{review.name || "Untitled performance review"}</h2><StateBadge value={review.state} /></div><p className="mt-1 pl-6 text-[9px] text-slate-400">Private performance review workspace</p></div><div className="flex flex-wrap gap-1.5"><Button icon={Copy} onClick={onDuplicate}>Duplicate</Button><Button variant="danger" icon={Trash2} onClick={onDelete}>Delete</Button></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Review name" value={review.name} onChange={(value) => onChange({ name: value })} placeholder="Checkout performance review" /><Field label="Release / build" value={review.release} onChange={(value) => onChange({ release: value })} placeholder="v2.4.0 / build 1842" /><Field label="Surface" value={review.surface} onChange={(value) => onChange({ surface: value })} placeholder="Checkout / account" /><SelectField label="Review state" value={review.state} onChange={(value) => onChange({ state: value })} options={REVIEW_STATES} /></div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Field label="Environment" value={review.environment} onChange={(value) => onChange({ environment: value })} placeholder="Production / Chrome" /><Field label="Owner" value={review.owner} onChange={(value) => onChange({ owner: value })} placeholder="Tester or team" /><Field label="Audience" value={review.audience} onChange={(value) => onChange({ audience: value })} placeholder="Release team" /></div></div>;
}

export default function TesterPerformanceReviewWorkspace({ reports = [], email = "", onOpenReport }) {
  const [reviews, setReviews] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [reviewSearch, setReviewSearch] = useState("");
  const [sortAscending, setSortAscending] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [scenarioSearch, setScenarioSearch] = useState("");
  const [scenarioFilter, setScenarioFilter] = useState("all");
  const [reportSearch, setReportSearch] = useState("");
  const [reportFilter, setReportFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const stored = readStorage(email);
    if (stored && Array.isArray(stored.reviews) && stored.reviews.length) {
      const restored = stored.reviews.slice(0, MAX_REVIEWS).map(normalizeReview);
      setReviews(restored);
      setSelectedId(stored.selectedId || restored[0].id);
      return;
    }
    const initial = createReview();
    initial.name = "Release performance review";
    initial.targetDate = today();
    setReviews([initial]);
    setSelectedId(initial.id);
  }, [email]);

  useEffect(() => {
    if (!reviews.length) return;
    writeStorage(email, { reviews, selectedId });
  }, [email, reviews, selectedId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const selectedReview = useMemo(() => reviews.find((review) => review.id === selectedId) || reviews[0] || null, [reviews, selectedId]);

  const metricsByReview = useMemo(() => {
    const result = new Map();
    reviews.forEach((review) => {
      const scenariosDone = review.scenarios.filter((scenario) => ["pass", "skipped"].includes(scenario.state)).length;
      const failed = review.scenarios.filter((scenario) => scenario.state === "fail").length;
      const blocked = review.scenarios.filter((scenario) => scenario.state === "blocked").length;
      const openFindings = review.findings.filter((finding) => !["verified", "accepted"].includes(finding.state)).length;
      const checksDone = Object.values(review.checks).filter(Boolean).length;
      const qualityProgress = Math.round((checksDone / CHECKS.length) * 100);
      const scenarioProgress = review.scenarios.length ? Math.round((scenariosDone / review.scenarios.length) * 100) : 0;
      const readiness = Math.max(0, Math.round((qualityProgress * 0.5) + (scenarioProgress * 0.5) - (failed * 7) - (blocked * 8) - (openFindings * 4)));
      result.set(review.id, { scenariosDone, failed, blocked, openFindings, qualityProgress, scenarioProgress, readiness });
    });
    return result;
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    const query = reviewSearch.trim().toLowerCase();
    const result = reviews.filter((review) => {
      const stateMatch = reviewFilter === "all" || review.state === reviewFilter;
      const haystack = `${review.name} ${review.release} ${review.surface} ${review.environment} ${review.owner}`.toLowerCase();
      return stateMatch && (!query || haystack.includes(query));
    });
    result.sort((left, right) => {
      const comparison = (left.name || "").localeCompare(right.name || "");
      return sortAscending ? comparison : -comparison;
    });
    return result;
  }, [reviewFilter, reviewSearch, reviews, sortAscending]);

  const visibleReviews = showAllReviews ? filteredReviews : filteredReviews.slice(0, PAGE_SIZE);

  const filteredScenarios = useMemo(() => {
    if (!selectedReview) return [];
    const query = scenarioSearch.trim().toLowerCase();
    return selectedReview.scenarios.filter((scenario) => {
      const stateMatch = scenarioFilter === "all" || scenario.state === scenarioFilter;
      const searchMatch = !query || `${scenario.title} ${scenario.metric} ${scenario.owner} ${scenario.note}`.toLowerCase().includes(query);
      return stateMatch && searchMatch;
    });
  }, [scenarioFilter, scenarioSearch, selectedReview]);

  const filteredReports = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();
    return reports.filter((report) => {
      const searchMatch = !query || `${reportTitle(report)} ${reportCategory(report)}`.toLowerCase().includes(query);
      const severityMatch = reportFilter === "all" || reportSeverity(report) === reportFilter;
      const statusMatch = reportStatusFilter === "all" || reportStatus(report) === reportStatusFilter;
      return searchMatch && severityMatch && statusMatch;
    });
  }, [reportFilter, reportSearch, reportStatusFilter, reports]);

  const selectedReports = useMemo(() => reports.filter((report) => selectedReview?.reportIds.includes(reportId(report))), [reports, selectedReview]);
  const metrics = selectedReview ? metricsByReview.get(selectedReview.id) : null;

  const updateReview = (patch) => {
    if (!selectedReview) return;
    setReviews((current) => current.map((review) => review.id === selectedReview.id ? { ...review, ...patch, updatedAt: new Date().toISOString() } : review));
  };

  const updateScenario = (id, patch) => updateReview({ scenarios: selectedReview.scenarios.map((scenario) => scenario.id === id ? { ...scenario, ...patch } : scenario) });
  const updateFinding = (id, patch) => updateReview({ findings: selectedReview.findings.map((finding) => finding.id === id ? { ...finding, ...patch } : finding) });
  const updateReference = (id, patch) => updateReview({ references: selectedReview.references.map((reference) => reference.id === id ? { ...reference, ...patch } : reference) });

  const createNewReview = () => {
    if (reviews.length >= MAX_REVIEWS) {
      setNotice(`Maximum of ${MAX_REVIEWS} performance reviews reached.`);
      return;
    }
    const review = createReview();
    review.name = `Performance review ${reviews.length + 1}`;
    setReviews((current) => [review, ...current]);
    setSelectedId(review.id);
    setNotice("New performance review created.");
  };

  const duplicateReview = () => {
    if (!selectedReview || reviews.length >= MAX_REVIEWS) return;
    const copy = normalizeReview({ ...selectedReview, id: makeId("perf-review"), name: `${selectedReview.name || "Performance review"} copy`, state: "draft", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setReviews((current) => [copy, ...current]);
    setSelectedId(copy.id);
    setNotice("Performance review duplicated.");
  };

  const deleteReview = () => {
    if (!selectedReview) return;
    if (reviews.length === 1) {
      setNotice("Keep at least one performance review available.");
      return;
    }
    const remaining = reviews.filter((review) => review.id !== selectedReview.id);
    setReviews(remaining);
    setSelectedId(remaining[0]?.id || "");
    setNotice("Performance review removed.");
  };

  const addScenario = () => {
    if (!selectedReview || selectedReview.scenarios.length >= MAX_SCENARIOS) return;
    updateReview({ scenarios: [...selectedReview.scenarios, { id: makeId("scenario"), title: "", metric: "load-time", state: "planned", target: "", observed: "", owner: "", note: "" }] });
  };

  const removeScenario = (id) => updateReview({ scenarios: selectedReview.scenarios.filter((scenario) => scenario.id !== id) });

  const addFinding = () => {
    if (!selectedReview || selectedReview.findings.length >= MAX_FINDINGS) return;
    updateReview({ findings: [...selectedReview.findings, { id: makeId("finding"), title: "", severity: "medium", state: "open", owner: "", impact: "", remediation: "" }] });
  };

  const removeFinding = (id) => updateReview({ findings: selectedReview.findings.filter((finding) => finding.id !== id) });

  const addReference = () => {
    if (!selectedReview || selectedReview.references.length >= MAX_REFERENCES) return;
    updateReview({ references: [...selectedReview.references, { id: makeId("reference"), label: "", url: "" }] });
  };

  const removeReference = (id) => updateReview({ references: selectedReview.references.filter((reference) => reference.id !== id) });

  const toggleReport = (id) => {
    const ids = selectedReview.reportIds.includes(id) ? selectedReview.reportIds.filter((value) => value !== id) : [...selectedReview.reportIds, id].slice(0, MAX_REPORTS);
    updateReview({ reportIds: ids });
  };

  const toggleVisibleReports = () => {
    const visibleIds = filteredReports.map(reportId).filter(Boolean);
    const allSelected = visibleIds.every((id) => selectedReview.reportIds.includes(id));
    const nextIds = allSelected ? selectedReview.reportIds.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selectedReview.reportIds, ...visibleIds])).slice(0, MAX_REPORTS);
    updateReview({ reportIds: nextIds });
  };

  const summaryText = useMemo(() => {
    if (!selectedReview) return "";
    const failed = selectedReview.scenarios.filter((scenario) => ["fail", "blocked"].includes(scenario.state));
    return [
      `${selectedReview.name || "Untitled performance review"} — ${reviewMeta(selectedReview.state).label}`,
      `Release: ${selectedReview.release || "Not specified"}`,
      `Surface: ${selectedReview.surface || "Not specified"}`,
      `Environment: ${selectedReview.environment || "Not specified"}`,
      `Owner: ${selectedReview.owner || "Not assigned"}`,
      `Readiness: ${metrics?.readiness || 0}%`,
      `Scenarios complete: ${metrics?.scenariosDone || 0}/${selectedReview.scenarios.length}`,
      `Open findings: ${metrics?.openFindings || 0}`,
      `Reports attached: ${selectedReports.length}`,
      "",
      selectedReview.objective || "No performance objective has been written yet.",
      "",
      "Failed or blocked scenarios:",
      ...(failed.length ? failed.map((scenario) => `- ${scenario.title || "Untitled scenario"} [${scenario.state}]`) : ["- None"]),
      "",
      "Limitations:",
      selectedReview.limitations || "Not recorded",
    ].join("\n");
  }, [metrics, selectedReview, selectedReports]);

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setNotice("Performance summary copied.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setNotice("Clipboard access is unavailable.");
    }
  };

  const exportReview = () => {
    if (!selectedReview) return;
    const rows = [
      ["Performance review", "Value"],
      ["Name", selectedReview.name],
      ["Release", selectedReview.release],
      ["Surface", selectedReview.surface],
      ["Environment", selectedReview.environment],
      ["State", reviewMeta(selectedReview.state).label],
      ["Owner", selectedReview.owner],
      ["Audience", selectedReview.audience],
      ["Readiness", `${metrics?.readiness || 0}%`],
      [],
      ["Scenario", "Metric", "State", "Target", "Observed", "Owner", "Note"],
      ...selectedReview.scenarios.map((scenario) => [scenario.title, scenario.metric, scenario.state, scenario.target, scenario.observed, scenario.owner, scenario.note]),
      [],
      ["Finding", "Severity", "State", "Owner", "Impact", "Remediation"],
      ...selectedReview.findings.map((finding) => [finding.title, finding.severity, finding.state, finding.owner, finding.impact, finding.remediation]),
      [],
      ["Reference", "URL"],
      ...selectedReview.references.map((reference) => [reference.label, reference.url]),
    ];
    downloadCsv("performance-review.csv", rows);
    setNotice("Performance review export downloaded.");
  };

  const resetReview = () => {
    if (!selectedReview) return;
    const reset = createReview();
    reset.id = selectedReview.id;
    reset.name = selectedReview.name;
    reset.release = selectedReview.release;
    reset.surface = selectedReview.surface;
    reset.environment = selectedReview.environment;
    reset.owner = selectedReview.owner;
    reset.audience = selectedReview.audience;
    reset.targetDate = selectedReview.targetDate;
    updateReview(reset);
    setNotice("Performance review data reset.");
  };

  if (!selectedReview) return null;

  const allVisibleReportsSelected = filteredReports.length > 0 && filteredReports.every((report) => selectedReview.reportIds.includes(reportId(report)));
  const criticalRegressions = selectedReview.findings.filter((finding) => !["verified", "accepted"].includes(finding.state) && ["critical", "high"].includes(finding.severity)).length;

  return (
    <section id="tester-performance-review" className="space-y-4 rounded-3xl bg-slate-50/70 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Gauge size={18} aria-hidden="true" className="text-cyan-600" /><h2 className="text-base font-semibold tracking-tight text-slate-900">Performance review</h2></div><p className="mt-1 max-w-2xl text-[10px] leading-5 text-slate-500">Organize measurable performance scenarios, thresholds, regressions, evidence, and follow-up ownership in a private tester workspace.</p></div><div className="flex flex-wrap gap-1.5"><Button icon={Plus} variant="primary" onClick={createNewReview}>New review</Button><Button icon={Download} onClick={exportReview}>Export</Button><Button icon={copied ? Check : Copy} onClick={copySummary}>{copied ? "Copied" : "Copy summary"}</Button></div></div>
      {notice ? <div className="flex items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2.5 text-[9px] font-medium text-cyan-800"><CheckCircle2 size={13} aria-hidden="true" />{notice}</div> : null}
      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Panel title="Performance reviews" detail={`${formatNumber(filteredReviews.length)} matching review(s)`} icon={Gauge} action={<Button variant="ghost" icon={sortAscending ? ArrowUpAZ : ArrowDownAZ} onClick={() => setSortAscending((value) => !value)} title="Toggle review sort" />}><div className="space-y-2.5"><div className="relative"><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={reviewSearch} onChange={(event) => setReviewSearch(event.target.value)} placeholder="Search reviews" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></div><SelectField label="State filter" value={reviewFilter} onChange={setReviewFilter} options={REVIEW_FILTERS} />{visibleReviews.length ? <div className="space-y-2">{visibleReviews.map((review) => <ReviewCard key={review.id} review={review} selected={review.id === selectedReview.id} onSelect={() => setSelectedId(review.id)} metrics={metricsByReview.get(review.id) || { checksDone: 0, openFindings: 0, readiness: 0 }} />)}</div> : <EmptyState title="No matching reviews" detail="Try clearing the search or state filter." icon={Search} />}{filteredReviews.length > PAGE_SIZE ? <Button variant="ghost" onClick={() => setShowAllReviews((value) => !value)}>{showAllReviews ? "Show fewer" : `Show all ${filteredReviews.length}`}</Button> : null}</div></Panel>
        <div className="min-w-0 space-y-4">
          <ReviewHeader review={selectedReview} onChange={updateReview} onDelete={deleteReview} onDuplicate={duplicateReview} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Readiness" value={`${metrics?.readiness || 0}%`} detail="Review completeness" icon={ShieldCheck} tone="cyan" /><StatCard label="Scenarios" value={`${metrics?.scenariosDone || 0}/${selectedReview.scenarios.length}`} detail="Pass or skipped" icon={Gauge} tone="violet" /><StatCard label="Regressions" value={formatNumber(metrics?.openFindings || 0)} detail={`${criticalRegressions} critical or high`} icon={ShieldCheck} tone="rose" /><StatCard label="Evidence" value={formatNumber(selectedReports.length)} detail="Reports attached" icon={FileCheck2} tone="emerald" /></div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]"><Panel title="Performance brief" detail="Describe the risk and comparison context." icon={Clipboard}><div className="space-y-3"><TextArea label="Objective" value={selectedReview.objective} onChange={(value) => updateReview({ objective: value })} placeholder="What performance risk or release question does this review address?" rows={4} /><TextArea label="Baseline and threshold context" value={selectedReview.baseline} onChange={(value) => updateReview({ baseline: value })} placeholder="Record the comparison run, expected thresholds, or test data shape." rows={3} /><TextArea label="Conclusion" value={selectedReview.conclusion} onChange={(value) => updateReview({ conclusion: value })} placeholder="What does the evidence say about performance confidence?" rows={3} /><TextArea label="Limitations" value={selectedReview.limitations} onChange={(value) => updateReview({ limitations: value })} placeholder="Infrastructure, traffic, data, or tooling limitations." rows={3} /><Guidance review={selectedReview} metrics={metrics || { scenariosDone: 0, openFindings: 0 }} evidenceCount={selectedReports.length + selectedReview.references.length} /></div></Panel><Panel title="Review readiness" detail={`${metrics?.qualityProgress || 0}% complete`} icon={ShieldCheck}><div className="space-y-2">{CHECKS.map((check) => <CheckRow key={check.id} check={check} checked={Boolean(selectedReview.checks[check.id])} onChange={(event) => updateReview({ checks: { ...selectedReview.checks, [check.id]: event.target.checked } })} />)}</div></Panel></div>
          <Panel title="Performance scenarios" detail={`${formatNumber(selectedReview.scenarios.length)} scenario(s) · ${formatNumber(filteredScenarios.length)} shown`} icon={Gauge} action={<Button icon={Plus} onClick={addScenario} disabled={selectedReview.scenarios.length >= MAX_SCENARIOS}>Add scenario</Button>}><div className="space-y-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_170px]"><label className="relative block"><span className="sr-only">Search performance scenarios</span><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={scenarioSearch} onChange={(event) => setScenarioSearch(event.target.value)} placeholder="Search scenarios, metrics, or owners" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label><SelectField label="State" value={scenarioFilter} onChange={setScenarioFilter} options={SCENARIO_FILTERS} /></div>{filteredScenarios.length ? <div className="space-y-2.5">{filteredScenarios.map((scenario) => <ScenarioRow key={scenario.id} scenario={scenario} onChange={(patch) => updateScenario(scenario.id, patch)} onRemove={() => removeScenario(scenario.id)} />)}</div> : <EmptyState title="No scenarios match" detail="Adjust the filters or add a new measurable performance scenario." icon={Gauge} />}</div></Panel>
          <Panel title="Performance regressions" detail={`${formatNumber(selectedReview.findings.length)} finding(s) · ${criticalRegressions} critical or high open`} icon={ShieldCheck} action={<Button icon={Plus} onClick={addFinding} disabled={selectedReview.findings.length >= MAX_FINDINGS}>Add finding</Button>}><div className="space-y-2.5">{selectedReview.findings.length ? selectedReview.findings.map((finding) => <FindingRow key={finding.id} finding={finding} onChange={(patch) => updateFinding(finding.id, patch)} onRemove={() => removeFinding(finding.id)} />) : <EmptyState title="No regressions recorded" detail="Add a finding when observed performance needs remediation or disposition." icon={ShieldCheck} />}</div></Panel>
          <Panel title="Report evidence" detail={`${formatNumber(selectedReview.reportIds.length)} attached · ${formatNumber(filteredReports.length)} shown`} icon={FileCheck2} action={<Button icon={allVisibleReportsSelected ? X : Check} onClick={toggleVisibleReports}>{allVisibleReportsSelected ? "Clear shown" : "Select shown"}</Button>}><div className="space-y-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_150px]"><label className="relative block"><span className="sr-only">Search reports</span><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Search report title or category" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label><SelectField label="Severity" value={reportFilter} onChange={setReportFilter} options={SEVERITY_FILTERS} /><SelectField label="Status" value={reportStatusFilter} onChange={setReportStatusFilter} options={[{ value: "all", label: "All statuses" }, { value: "open", label: "Open reports" }, { value: "resolved", label: "Resolved reports" }]} /></div>{filteredReports.length ? <div className="space-y-2">{filteredReports.slice(0, 20).map((report) => <ReportRow key={reportId(report)} report={report} checked={selectedReview.reportIds.includes(reportId(report))} onToggle={() => toggleReport(reportId(report))} onOpenReport={onOpenReport} />)}</div> : <EmptyState title="No reports match" detail="Adjust the filters or wait for reports to be available." icon={FileCheck2} />}<div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3"><p className="flex items-center gap-1.5 text-[9px] font-semibold text-violet-800"><Users size={12} aria-hidden="true" /> Browser-local evidence</p><p className="mt-1 text-[9px] leading-4 text-violet-700/75">Selecting reports here stores only their IDs in this tester&apos;s browser and does not change report status.</p></div></div></Panel>
          <Panel title="Reference links" detail={`${formatNumber(selectedReview.references.length)} supporting reference(s)`} icon={ExternalLink} action={<Button icon={Plus} onClick={addReference} disabled={selectedReview.references.length >= MAX_REFERENCES}>Add link</Button>}><div className="space-y-3">{selectedReview.references.length ? selectedReview.references.map((reference) => <div key={reference.id} className="grid gap-2 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto]"><Field label="Label" value={reference.label} onChange={(value) => updateReference(reference.id, { label: value })} placeholder="Performance baseline" /><Field label="URL or reference" value={reference.url} onChange={(value) => updateReference(reference.id, { url: value })} placeholder="https://..." /><div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove reference" onClick={() => removeReference(reference.id)}>Remove</Button></div></div>) : <EmptyState title="No reference links" detail="Keep a dashboard, load profile, build, or runbook reference beside the review." icon={ExternalLink} />}</div></Panel>
          <Panel title="Workspace actions" detail="Browser-local controls for this performance review." icon={ShieldCheck}><div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-[9px] leading-4 text-slate-400">Reset clears scenarios, findings, checks, references, and report links while preserving review identity fields.</p><Button variant="danger" icon={RefreshCw} onClick={resetReview}>Reset review data</Button></div></Panel>
        </div>
      </div>
    </section>
  );
}
