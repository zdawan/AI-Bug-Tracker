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
  Globe2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";

const STORAGE_KEY = "tester-environment-matrix-v1";
const MAX_MATRICES = 25;
const MAX_ENVIRONMENTS = 100;
const MAX_GAPS = 80;
const MAX_REPORTS = 100;
const MAX_REFERENCES = 40;
const PAGE_SIZE = 8;

const MATRIX_STATES = [
  { value: "draft", label: "Draft", tone: "slate" },
  { value: "planned", label: "Planned", tone: "cyan" },
  { value: "running", label: "Running", tone: "violet" },
  { value: "review", label: "In review", tone: "amber" },
  { value: "complete", label: "Complete", tone: "emerald" },
  { value: "blocked", label: "Blocked", tone: "rose" },
];

const MATRIX_FILTERS = [{ value: "all", label: "All matrices" }, ...MATRIX_STATES];
const ENVIRONMENT_STATES = [
  { value: "planned", label: "Planned" },
  { value: "ready", label: "Ready" },
  { value: "running", label: "Running" },
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "blocked", label: "Blocked" },
  { value: "not-applicable", label: "Not applicable" },
];
const ENVIRONMENT_FILTERS = [{ value: "all", label: "All environment states" }, ...ENVIRONMENT_STATES];
const RISK_LEVELS = [
  { value: "critical", label: "Critical", tone: "rose" },
  { value: "high", label: "High", tone: "orange" },
  { value: "medium", label: "Medium", tone: "amber" },
  { value: "low", label: "Low", tone: "emerald" },
];
const RISK_FILTERS = [{ value: "all", label: "All risk levels" }, ...RISK_LEVELS];
const CHECKS = [
  { id: "scope", label: "Coverage scope is clear", detail: "The release, feature, and supported environment boundaries are named." },
  { id: "priority", label: "Priority environments are selected", detail: "The matrix distinguishes must-cover combinations from nice-to-have coverage." },
  { id: "data", label: "Environment data is available", detail: "Accounts, devices, browsers, and test fixtures are ready." },
  { id: "execution", label: "Execution ownership is visible", detail: "Important environment checks have a tester or team owner." },
  { id: "gaps", label: "Coverage gaps are tracked", detail: "Unavailable or risky combinations have a documented follow-up." },
  { id: "evidence", label: "Evidence is attached", detail: "Reports and references support the coverage conclusion." },
  { id: "handoff", label: "Coverage handoff is ready", detail: "The audience understands what was and was not tested." },
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
  return RISK_LEVELS.some((item) => item.value === value) ? value : "medium";
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
    // The matrix remains usable when browser storage is unavailable.
  }
}

function matrixMeta(value) {
  return MATRIX_STATES.find((state) => state.value === value) || MATRIX_STATES[0];
}

function riskMeta(value) {
  return RISK_LEVELS.find((risk) => risk.value === value) || RISK_LEVELS[2];
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

function createMatrix() {
  return {
    id: makeId("matrix"),
    name: "Untitled environment matrix",
    release: "",
    owner: "",
    audience: "",
    state: "draft",
    targetDate: "",
    objective: "",
    conclusion: "",
    limitations: "",
    checks: Object.fromEntries(CHECKS.map((check) => [check.id, false])),
    environments: [],
    gaps: [],
    reportIds: [],
    references: [],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function normalizeMatrix(value) {
  const source = value && typeof value === "object" ? value : createMatrix();
  return {
    ...createMatrix(),
    ...source,
    checks: { ...createMatrix().checks, ...(source.checks || {}) },
    environments: Array.isArray(source.environments)
      ? source.environments.slice(0, MAX_ENVIRONMENTS).map((environment) => ({
          id: makeId("environment"),
          browser: "",
          version: "",
          device: "",
          os: "",
          state: "planned",
          owner: "",
          priority: "medium",
          note: "",
          ...environment,
        }))
      : [],
    gaps: Array.isArray(source.gaps)
      ? source.gaps.slice(0, MAX_GAPS).map((gap) => ({
          id: makeId("gap"),
          title: "",
          level: "medium",
          owner: "",
          state: "open",
          mitigation: "",
          ...gap,
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

function Field({ label, value, onChange, placeholder, type = "text", className = "" }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label>;
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }) {
  return <label className="block"><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span><textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] leading-4 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label>;
}

function SelectField({ label, value, onChange, options }) {
  return <label className="block"><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span><span className="relative block"><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 pr-7 text-[10px] text-slate-700 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={12} aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" /></span></label>;
}

function StateBadge({ value }) {
  const state = matrixMeta(value);
  return <span className={`inline-flex rounded-full border text-[8px] font-semibold ${toneClasses(state.tone, true)}`}>{state.label}</span>;
}

function RiskBadge({ value }) {
  const risk = riskMeta(value);
  return <span className={`inline-flex rounded-full border text-[8px] font-semibold ${toneClasses(risk.tone, true)}`}>{risk.label}</span>;
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

function MatrixCard({ matrix, selected, metrics, onSelect }) {
  return <button type="button" onClick={onSelect} className={`w-full rounded-xl border p-3 text-left transition ${selected ? "border-cyan-300 bg-cyan-50/50 shadow-sm" : "border-slate-200/80 bg-white hover:border-cyan-200"}`}><div className="flex items-start justify-between gap-2"><span className="min-w-0 truncate text-[10px] font-semibold text-slate-800">{matrix.name || "Untitled environment matrix"}</span><StateBadge value={matrix.state} /></div><p className="mt-1 truncate text-[9px] text-slate-400">{matrix.release || "No release target yet"}</p><div className="mt-3 flex items-center justify-between text-[8px] text-slate-400"><span>{formatNumber(metrics.environmentsDone)} covered</span><span>{formatNumber(metrics.failed)} failed</span><span>{metrics.readiness}% ready</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${metrics.readiness}%` }} /></div></button>;
}

function EnvironmentRow({ environment, onChange, onRemove }) {
  return <div className="rounded-xl border border-slate-200/80 bg-white p-3"><div className="grid gap-2 md:grid-cols-[130px_100px_130px_130px_130px_120px_auto]"><Field label="Browser" value={environment.browser} onChange={(value) => onChange({ browser: value })} placeholder="Chrome" /><Field label="Version" value={environment.version} onChange={(value) => onChange({ version: value })} placeholder="Latest" /><Field label="Device" value={environment.device} onChange={(value) => onChange({ device: value })} placeholder="Desktop" /><Field label="OS" value={environment.os} onChange={(value) => onChange({ os: value })} placeholder="Windows" /><SelectField label="State" value={environment.state} onChange={(value) => onChange({ state: value })} options={ENVIRONMENT_STATES} /><SelectField label="Priority" value={environment.priority} onChange={(value) => onChange({ priority: value })} options={RISK_LEVELS} /><div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove environment" onClick={onRemove}>Remove</Button></div></div><div className="mt-3 grid gap-2 md:grid-cols-[180px_minmax(0,1fr)]"><Field label="Owner" value={environment.owner} onChange={(value) => onChange({ owner: value })} placeholder="Name or team" /><Field label="Execution note" value={environment.note} onChange={(value) => onChange({ note: value })} placeholder="Version caveat, setup note, or observed behavior" /></div></div>;
}

function GapRow({ gap, onChange, onRemove }) {
  return <div className="rounded-xl border border-slate-200/80 bg-white p-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1.3fr)_120px_130px_130px_auto]"><Field label="Coverage gap" value={gap.title} onChange={(value) => onChange({ title: value })} placeholder="Safari version unavailable" /><SelectField label="Level" value={gap.level} onChange={(value) => onChange({ level: value })} options={RISK_LEVELS} /><SelectField label="State" value={gap.state} onChange={(value) => onChange({ state: value })} options={[{ value: "open", label: "Open" }, { value: "mitigating", label: "Mitigating" }, { value: "accepted", label: "Accepted" }, { value: "closed", label: "Closed" }]} /><Field label="Owner" value={gap.owner} onChange={(value) => onChange({ owner: value })} placeholder="Name or team" /><div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove coverage gap" onClick={onRemove}>Remove</Button></div></div><div className="mt-3"><Field label="Mitigation or note" value={gap.mitigation} onChange={(value) => onChange({ mitigation: value })} placeholder="Alternative coverage, device loan, or accepted limitation" /></div></div>;
}

function ReportRow({ report, checked, onToggle, onOpenReport }) {
  return <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3"><input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 rounded border-slate-300 accent-cyan-600 focus:ring-cyan-500" aria-label={`Attach ${reportTitle(report)}`} /><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-slate-700">{reportTitle(report)}</p><p className="mt-1 truncate text-[9px] text-slate-400">{reportCategory(report)} · {reportStatus(report) === "resolved" ? "Resolved" : "Open"}</p></div><RiskBadge value={reportSeverity(report)} />{onOpenReport ? <button type="button" onClick={() => onOpenReport(report)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-cyan-700" title="Open report"><ExternalLink size={13} aria-hidden="true" /></button> : null}</div>;
}

function Guidance({ matrix, metrics, evidenceCount }) {
  const suggestions = [];
  if (!matrix.objective) suggestions.push("Describe the coverage objective and release risk.");
  if (!matrix.owner) suggestions.push("Assign an environment coverage owner.");
  if (!metrics.environmentsDone) suggestions.push("Complete at least one environment combination.");
  if (metrics.blocked || metrics.failed) suggestions.push(`Review ${metrics.blocked + metrics.failed} blocked or failed combination(s).`);
  if (!evidenceCount) suggestions.push("Attach a report or reference to support the matrix conclusion.");
  if (!matrix.limitations) suggestions.push("Document any environment limitations or exclusions.");
  if (!suggestions.length) suggestions.push("The environment matrix has enough context for a focused coverage review.");
  return <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-3.5"><div className="flex items-start gap-2"><Sparkles size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-cyan-600" /><div><p className="text-[10px] font-semibold text-cyan-900">Suggested next moves</p><p className="mt-1 text-[9px] leading-4 text-cyan-800/70">Private prompts based on this matrix.</p></div></div><ul className="mt-3 space-y-1.5">{suggestions.map((suggestion) => <li key={suggestion} className="flex items-start gap-2 text-[9px] leading-4 text-cyan-800/80"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-cyan-500" />{suggestion}</li>)}</ul><p className="mt-3 border-t border-cyan-100 pt-3 text-[8px] leading-4 text-cyan-800/60">This workspace does not modify browser support policy, report status, or server-side assignments.</p></div>;
}

function MatrixHeader({ matrix, onChange, onDelete, onDuplicate }) {
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><Globe2 size={17} aria-hidden="true" className="text-cyan-600" /><h2 className="truncate text-sm font-semibold text-slate-900">{matrix.name || "Untitled environment matrix"}</h2><StateBadge value={matrix.state} /></div><p className="mt-1 pl-6 text-[9px] text-slate-400">Private environment coverage workspace</p></div><div className="flex flex-wrap gap-1.5"><Button icon={Copy} onClick={onDuplicate}>Duplicate</Button><Button variant="danger" icon={Trash2} onClick={onDelete}>Delete</Button></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Matrix name" value={matrix.name} onChange={(value) => onChange({ name: value })} placeholder="Checkout browser coverage" /><Field label="Release / build" value={matrix.release} onChange={(value) => onChange({ release: value })} placeholder="v2.4.0 / build 1842" /><Field label="Owner" value={matrix.owner} onChange={(value) => onChange({ owner: value })} placeholder="Tester or team" /><SelectField label="Matrix state" value={matrix.state} onChange={(value) => onChange({ state: value })} options={MATRIX_STATES} /></div><div className="mt-3 grid gap-3 sm:grid-cols-3"><Field label="Audience" value={matrix.audience} onChange={(value) => onChange({ audience: value })} placeholder="Release team" /><Field label="Target date" type="date" value={matrix.targetDate} onChange={(value) => onChange({ targetDate: value })} /><Field label="Release context" value={matrix.release} onChange={(value) => onChange({ release: value })} placeholder="Scope or test window" /></div></div>;
}

export default function TesterEnvironmentMatrixWorkspace({ reports = [], email = "", onOpenReport }) {
  const [matrices, setMatrices] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [matrixFilter, setMatrixFilter] = useState("all");
  const [matrixSearch, setMatrixSearch] = useState("");
  const [sortAscending, setSortAscending] = useState(false);
  const [showAllMatrices, setShowAllMatrices] = useState(false);
  const [environmentSearch, setEnvironmentSearch] = useState("");
  const [environmentFilter, setEnvironmentFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [reportSearch, setReportSearch] = useState("");
  const [reportFilter, setReportFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const stored = readStorage(email);
    if (stored && Array.isArray(stored.matrices) && stored.matrices.length) {
      const restored = stored.matrices.slice(0, MAX_MATRICES).map(normalizeMatrix);
      setMatrices(restored);
      setSelectedId(stored.selectedId || restored[0].id);
      return;
    }
    const initial = createMatrix();
    initial.name = "Release environment coverage";
    initial.targetDate = today();
    setMatrices([initial]);
    setSelectedId(initial.id);
  }, [email]);

  useEffect(() => {
    if (!matrices.length) return;
    writeStorage(email, { matrices, selectedId });
  }, [email, matrices, selectedId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const selectedMatrix = useMemo(() => matrices.find((matrix) => matrix.id === selectedId) || matrices[0] || null, [matrices, selectedId]);

  const metricsByMatrix = useMemo(() => {
    const result = new Map();
    matrices.forEach((matrix) => {
      const environmentsDone = matrix.environments.filter((environment) => ["pass", "not-applicable"].includes(environment.state)).length;
      const failed = matrix.environments.filter((environment) => environment.state === "fail").length;
      const blocked = matrix.environments.filter((environment) => environment.state === "blocked").length;
      const checksDone = Object.values(matrix.checks).filter(Boolean).length;
      const checkProgress = Math.round((checksDone / CHECKS.length) * 100);
      const environmentProgress = matrix.environments.length ? Math.round((environmentsDone / matrix.environments.length) * 100) : 0;
      const readiness = Math.max(0, Math.round((checkProgress * 0.5) + (environmentProgress * 0.5) - (failed * 7) - (blocked * 8)));
      result.set(matrix.id, { environmentsDone, failed, blocked, checkProgress, environmentProgress, readiness });
    });
    return result;
  }, [matrices]);

  const filteredMatrices = useMemo(() => {
    const query = matrixSearch.trim().toLowerCase();
    const result = matrices.filter((matrix) => {
      const stateMatch = matrixFilter === "all" || matrix.state === matrixFilter;
      const haystack = `${matrix.name} ${matrix.release} ${matrix.owner} ${matrix.audience}`.toLowerCase();
      return stateMatch && (!query || haystack.includes(query));
    });
    result.sort((left, right) => {
      const comparison = (left.name || "").localeCompare(right.name || "");
      return sortAscending ? comparison : -comparison;
    });
    return result;
  }, [matrixFilter, matrixSearch, matrices, sortAscending]);

  const visibleMatrices = showAllMatrices ? filteredMatrices : filteredMatrices.slice(0, PAGE_SIZE);

  const filteredEnvironments = useMemo(() => {
    if (!selectedMatrix) return [];
    const query = environmentSearch.trim().toLowerCase();
    return selectedMatrix.environments.filter((environment) => {
      const stateMatch = environmentFilter === "all" || environment.state === environmentFilter;
      const riskMatch = riskFilter === "all" || environment.priority === riskFilter;
      const haystack = `${environment.browser} ${environment.version} ${environment.device} ${environment.os} ${environment.owner} ${environment.note}`.toLowerCase();
      return stateMatch && riskMatch && (!query || haystack.includes(query));
    });
  }, [environmentFilter, environmentSearch, riskFilter, selectedMatrix]);

  const filteredReports = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();
    return reports.filter((report) => {
      const searchMatch = !query || `${reportTitle(report)} ${reportCategory(report)}`.toLowerCase().includes(query);
      const priorityMatch = reportFilter === "all" || reportSeverity(report) === reportFilter;
      const statusMatch = reportStatusFilter === "all" || reportStatus(report) === reportStatusFilter;
      return searchMatch && priorityMatch && statusMatch;
    });
  }, [reportFilter, reportSearch, reportStatusFilter, reports]);

  const selectedReports = useMemo(() => reports.filter((report) => selectedMatrix?.reportIds.includes(reportId(report))), [reports, selectedMatrix]);
  const metrics = selectedMatrix ? metricsByMatrix.get(selectedMatrix.id) : null;

  const updateMatrix = (patch) => {
    if (!selectedMatrix) return;
    setMatrices((current) => current.map((matrix) => matrix.id === selectedMatrix.id ? { ...matrix, ...patch, updatedAt: new Date().toISOString() } : matrix));
  };

  const updateEnvironment = (id, patch) => updateMatrix({ environments: selectedMatrix.environments.map((environment) => environment.id === id ? { ...environment, ...patch } : environment) });
  const updateGap = (id, patch) => updateMatrix({ gaps: selectedMatrix.gaps.map((gap) => gap.id === id ? { ...gap, ...patch } : gap) });
  const updateReference = (id, patch) => updateMatrix({ references: selectedMatrix.references.map((reference) => reference.id === id ? { ...reference, ...patch } : reference) });

  const createNewMatrix = () => {
    if (matrices.length >= MAX_MATRICES) {
      setNotice(`Maximum of ${MAX_MATRICES} environment matrices reached.`);
      return;
    }
    const matrix = createMatrix();
    matrix.name = `Environment matrix ${matrices.length + 1}`;
    setMatrices((current) => [matrix, ...current]);
    setSelectedId(matrix.id);
    setNotice("New environment matrix created.");
  };

  const duplicateMatrix = () => {
    if (!selectedMatrix || matrices.length >= MAX_MATRICES) return;
    const copy = normalizeMatrix({ ...selectedMatrix, id: makeId("matrix"), name: `${selectedMatrix.name || "Environment matrix"} copy`, state: "draft", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setMatrices((current) => [copy, ...current]);
    setSelectedId(copy.id);
    setNotice("Environment matrix duplicated.");
  };

  const deleteMatrix = () => {
    if (!selectedMatrix) return;
    if (matrices.length === 1) {
      setNotice("Keep at least one environment matrix available.");
      return;
    }
    const remaining = matrices.filter((matrix) => matrix.id !== selectedMatrix.id);
    setMatrices(remaining);
    setSelectedId(remaining[0]?.id || "");
    setNotice("Environment matrix removed.");
  };

  const addEnvironment = () => {
    if (!selectedMatrix || selectedMatrix.environments.length >= MAX_ENVIRONMENTS) return;
    updateMatrix({ environments: [...selectedMatrix.environments, { id: makeId("environment"), browser: "", version: "", device: "", os: "", state: "planned", owner: "", priority: "medium", note: "" }] });
  };

  const removeEnvironment = (id) => updateMatrix({ environments: selectedMatrix.environments.filter((environment) => environment.id !== id) });

  const addGap = () => {
    if (!selectedMatrix || selectedMatrix.gaps.length >= MAX_GAPS) return;
    updateMatrix({ gaps: [...selectedMatrix.gaps, { id: makeId("gap"), title: "", level: "medium", owner: "", state: "open", mitigation: "" }] });
  };

  const removeGap = (id) => updateMatrix({ gaps: selectedMatrix.gaps.filter((gap) => gap.id !== id) });

  const addReference = () => {
    if (!selectedMatrix || selectedMatrix.references.length >= MAX_REFERENCES) return;
    updateMatrix({ references: [...selectedMatrix.references, { id: makeId("reference"), label: "", url: "" }] });
  };

  const removeReference = (id) => updateMatrix({ references: selectedMatrix.references.filter((reference) => reference.id !== id) });

  const toggleReport = (id) => {
    const ids = selectedMatrix.reportIds.includes(id) ? selectedMatrix.reportIds.filter((value) => value !== id) : [...selectedMatrix.reportIds, id].slice(0, MAX_REPORTS);
    updateMatrix({ reportIds: ids });
  };

  const toggleVisibleReports = () => {
    const visibleIds = filteredReports.map(reportId).filter(Boolean);
    const allSelected = visibleIds.every((id) => selectedMatrix.reportIds.includes(id));
    const nextIds = allSelected ? selectedMatrix.reportIds.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selectedMatrix.reportIds, ...visibleIds])).slice(0, MAX_REPORTS);
    updateMatrix({ reportIds: nextIds });
  };

  const summaryText = useMemo(() => {
    if (!selectedMatrix) return "";
    const failures = selectedMatrix.environments.filter((environment) => ["fail", "blocked"].includes(environment.state));
    return [
      `${selectedMatrix.name || "Untitled environment matrix"} — ${matrixMeta(selectedMatrix.state).label}`,
      `Release: ${selectedMatrix.release || "Not specified"}`,
      `Owner: ${selectedMatrix.owner || "Not assigned"} · Audience: ${selectedMatrix.audience || "Not assigned"}`,
      `Readiness: ${metrics?.readiness || 0}%`,
      `Environments complete: ${metrics?.environmentsDone || 0}/${selectedMatrix.environments.length}`,
      `Reports attached: ${selectedReports.length}`,
      "",
      selectedMatrix.objective || "No coverage objective has been written yet.",
      "",
      "Failed or blocked environments:",
      ...(failures.length ? failures.map((environment) => `- ${environment.browser} ${environment.version} / ${environment.os} [${environment.state}]`) : ["- None"]),
      "",
      "Limitations:",
      selectedMatrix.limitations || "Not recorded",
    ].join("\n");
  }, [metrics, selectedMatrix, selectedReports]);

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setNotice("Environment summary copied.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setNotice("Clipboard access is unavailable.");
    }
  };

  const exportMatrix = () => {
    if (!selectedMatrix) return;
    const rows = [
      ["Environment matrix", "Value"],
      ["Name", selectedMatrix.name],
      ["Release", selectedMatrix.release],
      ["State", matrixMeta(selectedMatrix.state).label],
      ["Owner", selectedMatrix.owner],
      ["Audience", selectedMatrix.audience],
      ["Target date", selectedMatrix.targetDate],
      ["Readiness", `${metrics?.readiness || 0}%`],
      [],
      ["Browser", "Version", "Device", "OS", "State", "Owner", "Priority", "Note"],
      ...selectedMatrix.environments.map((environment) => [environment.browser, environment.version, environment.device, environment.os, environment.state, environment.owner, environment.priority, environment.note]),
      [],
      ["Gap", "Level", "Owner", "State", "Mitigation"],
      ...selectedMatrix.gaps.map((gap) => [gap.title, gap.level, gap.owner, gap.state, gap.mitigation]),
      [],
      ["Reference", "URL"],
      ...selectedMatrix.references.map((reference) => [reference.label, reference.url]),
    ];
    downloadCsv("environment-matrix.csv", rows);
    setNotice("Environment matrix export downloaded.");
  };

  const resetMatrix = () => {
    if (!selectedMatrix) return;
    const reset = createMatrix();
    reset.id = selectedMatrix.id;
    reset.name = selectedMatrix.name;
    reset.release = selectedMatrix.release;
    reset.owner = selectedMatrix.owner;
    reset.audience = selectedMatrix.audience;
    reset.targetDate = selectedMatrix.targetDate;
    updateMatrix(reset);
    setNotice("Environment matrix data reset.");
  };

  if (!selectedMatrix) return null;

  const allVisibleReportsSelected = filteredReports.length > 0 && filteredReports.every((report) => selectedMatrix.reportIds.includes(reportId(report)));
  const highFailures = selectedMatrix.environments.filter((environment) => ["fail", "blocked"].includes(environment.state) && ["critical", "high"].includes(environment.priority)).length;

  return (
    <section id="tester-environment-matrix" className="space-y-4 rounded-3xl bg-slate-50/70 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Globe2 size={18} aria-hidden="true" className="text-cyan-600" /><h2 className="text-base font-semibold tracking-tight text-slate-900">Environment matrix</h2></div><p className="mt-1 max-w-2xl text-[10px] leading-5 text-slate-500">Plan browser, device, and operating-system coverage while keeping gaps and evidence visible to the tester.</p></div><div className="flex flex-wrap gap-1.5"><Button icon={Plus} variant="primary" onClick={createNewMatrix}>New matrix</Button><Button icon={Download} onClick={exportMatrix}>Export</Button><Button icon={copied ? Check : Copy} onClick={copySummary}>{copied ? "Copied" : "Copy summary"}</Button></div></div>
      {notice ? <div className="flex items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2.5 text-[9px] font-medium text-cyan-800"><CheckCircle2 size={13} aria-hidden="true" />{notice}</div> : null}
      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Panel title="Environment matrices" detail={`${formatNumber(filteredMatrices.length)} matching matrix(es)`} icon={Globe2} action={<Button variant="ghost" icon={sortAscending ? ArrowUpAZ : ArrowDownAZ} onClick={() => setSortAscending((value) => !value)} title="Toggle matrix sort" />}><div className="space-y-2.5"><div className="relative"><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={matrixSearch} onChange={(event) => setMatrixSearch(event.target.value)} placeholder="Search matrices" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></div><SelectField label="State filter" value={matrixFilter} onChange={setMatrixFilter} options={MATRIX_FILTERS} />{visibleMatrices.length ? <div className="space-y-2">{visibleMatrices.map((matrix) => <MatrixCard key={matrix.id} matrix={matrix} selected={matrix.id === selectedMatrix.id} onSelect={() => setSelectedId(matrix.id)} metrics={metricsByMatrix.get(matrix.id) || { environmentsDone: 0, failed: 0, readiness: 0 }} />)}</div> : <EmptyState title="No matching matrices" detail="Try clearing the search or state filter." icon={Search} />}{filteredMatrices.length > PAGE_SIZE ? <Button variant="ghost" onClick={() => setShowAllMatrices((value) => !value)}>{showAllMatrices ? "Show fewer" : `Show all ${filteredMatrices.length}`}</Button> : null}</div></Panel>
        <div className="min-w-0 space-y-4">
          <MatrixHeader matrix={selectedMatrix} onChange={updateMatrix} onDelete={deleteMatrix} onDuplicate={duplicateMatrix} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Readiness" value={`${metrics?.readiness || 0}%`} detail="Matrix completeness" icon={ShieldCheck} tone="cyan" /><StatCard label="Coverage" value={`${metrics?.environmentsDone || 0}/${selectedMatrix.environments.length}`} detail="Pass or not applicable" icon={Globe2} tone="violet" /><StatCard label="Failures" value={formatNumber(metrics?.failed || 0)} detail={`${highFailures} critical or high`} icon={ShieldAlert} tone="rose" /><StatCard label="Evidence" value={formatNumber(selectedReports.length)} detail="Reports attached" icon={FileCheck2} tone="emerald" /></div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]"><Panel title="Coverage brief" detail="Explain what this matrix should prove." icon={Clipboard}><div className="space-y-3"><TextArea label="Objective" value={selectedMatrix.objective} onChange={(value) => updateMatrix({ objective: value })} placeholder="What release or user risk does this environment coverage address?" rows={4} /><TextArea label="Conclusion" value={selectedMatrix.conclusion} onChange={(value) => updateMatrix({ conclusion: value })} placeholder="What does the current matrix say about coverage confidence?" rows={3} /><TextArea label="Limitations and exclusions" value={selectedMatrix.limitations} onChange={(value) => updateMatrix({ limitations: value })} placeholder="Unavailable devices, unsupported versions, or accepted gaps." rows={3} /><Guidance matrix={selectedMatrix} metrics={metrics || { environmentsDone: 0, blocked: 0, failed: 0 }} evidenceCount={selectedReports.length + selectedMatrix.references.length} /></div></Panel><Panel title="Matrix readiness" detail={`${metrics?.checkProgress || 0}% complete`} icon={ShieldCheck}><div className="space-y-2">{CHECKS.map((check) => <CheckRow key={check.id} check={check} checked={Boolean(selectedMatrix.checks[check.id])} onChange={(event) => updateMatrix({ checks: { ...selectedMatrix.checks, [check.id]: event.target.checked } })} />)}</div></Panel></div>
          <Panel title="Environment combinations" detail={`${formatNumber(selectedMatrix.environments.length)} combination(s) · ${formatNumber(filteredEnvironments.length)} shown`} icon={Globe2} action={<Button icon={Plus} onClick={addEnvironment} disabled={selectedMatrix.environments.length >= MAX_ENVIRONMENTS}>Add environment</Button>}><div className="space-y-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_170px_150px]"><label className="relative block"><span className="sr-only">Search environments</span><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={environmentSearch} onChange={(event) => setEnvironmentSearch(event.target.value)} placeholder="Search browser, device, OS, or owner" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label><SelectField label="State" value={environmentFilter} onChange={setEnvironmentFilter} options={ENVIRONMENT_FILTERS} /><SelectField label="Priority" value={riskFilter} onChange={setRiskFilter} options={RISK_FILTERS} /></div>{filteredEnvironments.length ? <div className="space-y-2.5">{filteredEnvironments.map((environment) => <EnvironmentRow key={environment.id} environment={environment} onChange={(patch) => updateEnvironment(environment.id, patch)} onRemove={() => removeEnvironment(environment.id)} />)}</div> : <EmptyState title="No environments match" detail="Adjust the filters or add a new browser and device combination." icon={Globe2} />}</div></Panel>
          <Panel title="Coverage gaps" detail={`${formatNumber(selectedMatrix.gaps.length)} gap(s)`} icon={ShieldAlert} action={<Button icon={Plus} onClick={addGap} disabled={selectedMatrix.gaps.length >= MAX_GAPS}>Add gap</Button>}><div className="space-y-2.5">{selectedMatrix.gaps.length ? selectedMatrix.gaps.map((gap) => <GapRow key={gap.id} gap={gap} onChange={(patch) => updateGap(gap.id, patch)} onRemove={() => removeGap(gap.id)} />) : <EmptyState title="No coverage gaps" detail="Record unavailable or risky combinations so they are not forgotten." icon={ShieldAlert} />}</div></Panel>
          <Panel title="Report evidence" detail={`${formatNumber(selectedMatrix.reportIds.length)} attached · ${formatNumber(filteredReports.length)} shown`} icon={FileCheck2} action={<Button icon={allVisibleReportsSelected ? X : Check} onClick={toggleVisibleReports}>{allVisibleReportsSelected ? "Clear shown" : "Select shown"}</Button>}><div className="space-y-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_150px]"><label className="relative block"><span className="sr-only">Search reports</span><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Search report title or category" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label><SelectField label="Severity" value={reportFilter} onChange={setReportFilter} options={RISK_FILTERS} /><SelectField label="Status" value={reportStatusFilter} onChange={setReportStatusFilter} options={[{ value: "all", label: "All statuses" }, { value: "open", label: "Open reports" }, { value: "resolved", label: "Resolved reports" }]} /></div>{filteredReports.length ? <div className="space-y-2">{filteredReports.slice(0, 20).map((report) => <ReportRow key={reportId(report)} report={report} checked={selectedMatrix.reportIds.includes(reportId(report))} onToggle={() => toggleReport(reportId(report))} onOpenReport={onOpenReport} />)}</div> : <EmptyState title="No reports match" detail="Adjust the filters or wait for reports to be available." icon={FileCheck2} />}<div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3"><p className="flex items-center gap-1.5 text-[9px] font-semibold text-violet-800"><Users size={12} aria-hidden="true" /> Browser-local evidence</p><p className="mt-1 text-[9px] leading-4 text-violet-700/75">Selecting reports here stores only their IDs in this tester&apos;s browser and does not change report status.</p></div></div></Panel>
          <Panel title="Reference links" detail={`${formatNumber(selectedMatrix.references.length)} supporting reference(s)`} icon={ExternalLink} action={<Button icon={Plus} onClick={addReference} disabled={selectedMatrix.references.length >= MAX_REFERENCES}>Add link</Button>}><div className="space-y-3">{selectedMatrix.references.length ? selectedMatrix.references.map((reference) => <ReferenceRow key={reference.id} reference={reference} onChange={(patch) => updateReference(reference.id, patch)} onRemove={() => removeReference(reference.id)} />) : <EmptyState title="No reference links" detail="Keep a browser support note, device lab, build, or runbook reference beside the matrix." icon={ExternalLink} />}</div></Panel>
          <Panel title="Workspace actions" detail="Browser-local controls for this environment matrix." icon={ShieldCheck}><div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-[9px] leading-4 text-slate-400">Reset clears environment combinations, gaps, checks, references, and report links while preserving matrix identity fields.</p><Button variant="danger" icon={RefreshCw} onClick={resetMatrix}>Reset matrix data</Button></div></Panel>
        </div>
      </div>
    </section>
  );
}
