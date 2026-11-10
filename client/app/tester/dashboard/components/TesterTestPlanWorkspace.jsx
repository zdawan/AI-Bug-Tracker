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
  ListChecks,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";

const STORAGE_KEY = "tester-test-plan-workspace-v1";
const MAX_PLANS = 25;
const MAX_CASES = 120;
const MAX_NOTES = 100;
const MAX_REPORTS = 100;
const MAX_REFERENCES = 40;
const PAGE_SIZE = 8;

const PLAN_STATES = [
  { value: "draft", label: "Draft", tone: "slate" },
  { value: "ready", label: "Ready to run", tone: "cyan" },
  { value: "running", label: "Running", tone: "violet" },
  { value: "review", label: "In review", tone: "amber" },
  { value: "complete", label: "Complete", tone: "emerald" },
  { value: "blocked", label: "Blocked", tone: "rose" },
];

const PLAN_FILTERS = [{ value: "all", label: "All plans" }, ...PLAN_STATES];
const CASE_STATES = [
  { value: "todo", label: "To do" },
  { value: "in-progress", label: "In progress" },
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "blocked", label: "Blocked" },
  { value: "skipped", label: "Skipped" },
];
const CASE_FILTERS = [{ value: "all", label: "All cases" }, ...CASE_STATES];
const PRIORITIES = [
  { value: "critical", label: "Critical", tone: "rose" },
  { value: "high", label: "High", tone: "orange" },
  { value: "medium", label: "Medium", tone: "amber" },
  { value: "low", label: "Low", tone: "emerald" },
];
const PRIORITY_FILTERS = [{ value: "all", label: "All priorities" }, ...PRIORITIES];
const CHECKS = [
  { id: "scope", label: "Scope is defined", detail: "The feature, build, and boundaries are clear." },
  { id: "environment", label: "Environment is ready", detail: "The target browser, device, or environment is named." },
  { id: "coverage", label: "Critical paths are covered", detail: "Important user journeys have executable cases." },
  { id: "data", label: "Test data is available", detail: "Accounts, fixtures, and setup requirements are known." },
  { id: "evidence", label: "Evidence capture is planned", detail: "The run has a clear place for supporting evidence." },
  { id: "owners", label: "Case owners are assigned", detail: "Execution ownership is visible for important cases." },
  { id: "exit", label: "Exit criteria are clear", detail: "The plan can be completed without guesswork." },
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
  return PRIORITIES.some((item) => item.value === value) ? value : "medium";
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
    // The test plan remains usable when browser storage is unavailable.
  }
}

function planMeta(value) {
  return PLAN_STATES.find((state) => state.value === value) || PLAN_STATES[0];
}

function priorityMeta(value) {
  return PRIORITIES.find((priority) => priority.value === value) || PRIORITIES[2];
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

function createPlan() {
  return {
    id: makeId("test-plan"),
    name: "Untitled test plan",
    release: "",
    environment: "",
    owner: "",
    audience: "",
    state: "draft",
    targetDate: "",
    objective: "",
    setup: "",
    exitCriteria: "",
    checks: Object.fromEntries(CHECKS.map((check) => [check.id, false])),
    cases: [],
    notes: [],
    reportIds: [],
    references: [],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function normalizePlan(value) {
  const source = value && typeof value === "object" ? value : createPlan();
  return {
    ...createPlan(),
    ...source,
    checks: { ...createPlan().checks, ...(source.checks || {}) },
    cases: Array.isArray(source.cases)
      ? source.cases.slice(0, MAX_CASES).map((testCase) => ({
          id: makeId("case"),
          title: "",
          area: "",
          state: "todo",
          priority: "medium",
          owner: "",
          dueDate: "",
          expected: "",
          actual: "",
          ...testCase,
        }))
      : [],
    notes: Array.isArray(source.notes)
      ? source.notes.slice(0, MAX_NOTES).map((note) => ({
          id: makeId("note"),
          title: "",
          body: "",
          ...note,
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

function TextArea({ label, value, onChange, placeholder, rows = 3, className = "" }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span><textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] leading-4 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label>;
}

function SelectField({ label, value, onChange, options, className = "" }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span><span className="relative block"><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 pr-7 text-[10px] text-slate-700 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={12} aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" /></span></label>;
}

function StateBadge({ value }) {
  const state = planMeta(value);
  return <span className={`inline-flex rounded-full border text-[8px] font-semibold ${toneClasses(state.tone, true)}`}>{state.label}</span>;
}

function PriorityBadge({ value }) {
  const priority = priorityMeta(value);
  return <span className={`inline-flex rounded-full border text-[8px] font-semibold ${toneClasses(priority.tone, true)}`}>{priority.label}</span>;
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

function CaseRow({ testCase, onChange, onRemove }) {
  return <div className="rounded-xl border border-slate-200/80 bg-white p-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1.25fr)_130px_120px_140px_auto]"><Field label="Test case" value={testCase.title} onChange={(value) => onChange({ title: value })} placeholder="What should be verified?" /><SelectField label="State" value={testCase.state} onChange={(value) => onChange({ state: value })} options={CASE_STATES} /><SelectField label="Priority" value={testCase.priority} onChange={(value) => onChange({ priority: value })} options={PRIORITIES} /><Field label="Owner" value={testCase.owner} onChange={(value) => onChange({ owner: value })} placeholder="Name or team" /><div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove test case" onClick={onRemove}>Remove</Button></div></div><div className="mt-3 grid gap-2 md:grid-cols-2"><TextArea label="Expected result" value={testCase.expected} onChange={(value) => onChange({ expected: value })} placeholder="What should happen?" rows={2} /><TextArea label="Actual result / note" value={testCase.actual} onChange={(value) => onChange({ actual: value })} placeholder="What happened during execution?" rows={2} /></div></div>;
}

function NoteRow({ note, onChange, onRemove }) {
  return <div className="rounded-xl border border-slate-200/80 bg-white p-3"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><Field label="Note title" value={note.title} onChange={(value) => onChange({ title: value })} placeholder="Execution note" /><div className="mt-3"><TextArea label="Note" value={note.body} onChange={(value) => onChange({ body: value })} placeholder="Capture context, observation, or handoff detail." rows={3} /></div></div><Button variant="ghost" icon={Trash2} title="Remove note" onClick={onRemove}>Remove</Button></div></div>;
}

function ReferenceRow({ reference, onChange, onRemove }) {
  return <div className="grid gap-2 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto]"><Field label="Label" value={reference.label} onChange={(value) => onChange({ label: value })} placeholder="Runbook" /><Field label="URL or reference" value={reference.url} onChange={(value) => onChange({ url: value })} placeholder="https://..." /><div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove reference" onClick={onRemove}>Remove</Button></div></div>;
}

function ReportRow({ report, checked, onToggle, onOpenReport }) {
  return <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3"><input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 rounded border-slate-300 accent-cyan-600 focus:ring-cyan-500" aria-label={`Attach ${reportTitle(report)}`} /><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-slate-700">{reportTitle(report)}</p><p className="mt-1 truncate text-[9px] text-slate-400">{reportCategory(report)} · {reportStatus(report) === "resolved" ? "Resolved" : "Open"}</p></div><PriorityBadge value={reportSeverity(report)} />{onOpenReport ? <button type="button" onClick={() => onOpenReport(report)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-cyan-700" title="Open report"><ExternalLink size={13} aria-hidden="true" /></button> : null}</div>;
}

function Guidance({ plan, metrics, evidenceCount }) {
  const suggestions = [];
  if (!plan.objective) suggestions.push("Describe the test objective and risk being explored.");
  if (!plan.owner) suggestions.push("Assign a test plan owner.");
  if (!metrics.casesDone) suggestions.push("Complete at least one test case.");
  if (!evidenceCount) suggestions.push("Attach a report or reference to the plan.");
  if (!plan.exitCriteria) suggestions.push("Write the condition that ends the test run.");
  if (!suggestions.length) suggestions.push("The test plan has enough context for a focused execution review.");
  return <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-3.5"><div className="flex items-start gap-2"><Sparkles size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-cyan-600" /><div><p className="text-[10px] font-semibold text-cyan-900">Suggested next moves</p><p className="mt-1 text-[9px] leading-4 text-cyan-800/70">Private prompts based on this plan.</p></div></div><ul className="mt-3 space-y-1.5">{suggestions.map((suggestion) => <li key={suggestion} className="flex items-start gap-2 text-[9px] leading-4 text-cyan-800/80"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-cyan-500" />{suggestion}</li>)}</ul><p className="mt-3 border-t border-cyan-100 pt-3 text-[8px] leading-4 text-cyan-800/60">This workspace does not execute tests, change report status, or update server-side assignments.</p></div>;
}

function PlanHeader({ plan, onChange, onDelete, onDuplicate }) {
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><Target size={17} aria-hidden="true" className="text-cyan-600" /><h2 className="truncate text-sm font-semibold text-slate-900">{plan.name || "Untitled test plan"}</h2><StateBadge value={plan.state} /></div><p className="mt-1 pl-6 text-[9px] text-slate-400">Private test execution planning workspace</p></div><div className="flex flex-wrap gap-1.5"><Button icon={Copy} onClick={onDuplicate}>Duplicate</Button><Button variant="danger" icon={Trash2} onClick={onDelete}>Delete</Button></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Plan name" value={plan.name} onChange={(value) => onChange({ name: value })} placeholder="Checkout regression plan" /><Field label="Release / build" value={plan.release} onChange={(value) => onChange({ release: value })} placeholder="v2.4.0 / build 1842" /><Field label="Environment" value={plan.environment} onChange={(value) => onChange({ environment: value })} placeholder="Staging / Chrome" /><SelectField label="Plan state" value={plan.state} onChange={(value) => onChange({ state: value })} options={PLAN_STATES} /></div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Field label="Owner" value={plan.owner} onChange={(value) => onChange({ owner: value })} placeholder="Tester or team" /><Field label="Audience" value={plan.audience} onChange={(value) => onChange({ audience: value })} placeholder="Release team" /><Field label="Target date" type="date" value={plan.targetDate} onChange={(value) => onChange({ targetDate: value })} /></div></div>;
}

export default function TesterTestPlanWorkspace({ reports = [], email = "", onOpenReport }) {
  const [plans, setPlans] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [planSearch, setPlanSearch] = useState("");
  const [sortAscending, setSortAscending] = useState(false);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [caseSearch, setCaseSearch] = useState("");
  const [caseFilter, setCaseFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [reportSearch, setReportSearch] = useState("");
  const [reportFilter, setReportFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const stored = readStorage(email);
    if (stored && Array.isArray(stored.plans) && stored.plans.length) {
      const restored = stored.plans.slice(0, MAX_PLANS).map(normalizePlan);
      setPlans(restored);
      setSelectedId(stored.selectedId || restored[0].id);
      return;
    }
    const initial = createPlan();
    initial.name = "Release regression test plan";
    initial.targetDate = today();
    setPlans([initial]);
    setSelectedId(initial.id);
  }, [email]);

  useEffect(() => {
    if (!plans.length) return;
    writeStorage(email, { plans, selectedId });
  }, [email, plans, selectedId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedId) || plans[0] || null, [plans, selectedId]);

  const metricsByPlan = useMemo(() => {
    const result = new Map();
    plans.forEach((plan) => {
      const casesDone = plan.cases.filter((testCase) => ["pass", "skipped"].includes(testCase.state)).length;
      const failed = plan.cases.filter((testCase) => testCase.state === "fail").length;
      const blocked = plan.cases.filter((testCase) => testCase.state === "blocked").length;
      const checksDone = Object.values(plan.checks).filter(Boolean).length;
      const checkProgress = Math.round((checksDone / CHECKS.length) * 100);
      const caseProgress = plan.cases.length ? Math.round((casesDone / plan.cases.length) * 100) : 0;
      const readiness = Math.max(0, Math.round((checkProgress * 0.5) + (caseProgress * 0.5) - (failed * 6) - (blocked * 8)));
      result.set(plan.id, { casesDone, failed, blocked, checkProgress, caseProgress, readiness });
    });
    return result;
  }, [plans]);

  const filteredPlans = useMemo(() => {
    const query = planSearch.trim().toLowerCase();
    const result = plans.filter((plan) => {
      const stateMatch = planFilter === "all" || plan.state === planFilter;
      const haystack = `${plan.name} ${plan.release} ${plan.environment} ${plan.owner} ${plan.audience}`.toLowerCase();
      return stateMatch && (!query || haystack.includes(query));
    });
    result.sort((left, right) => {
      const comparison = (left.name || "").localeCompare(right.name || "");
      return sortAscending ? comparison : -comparison;
    });
    return result;
  }, [planFilter, planSearch, plans, sortAscending]);

  const visiblePlans = showAllPlans ? filteredPlans : filteredPlans.slice(0, PAGE_SIZE);

  const filteredCases = useMemo(() => {
    if (!selectedPlan) return [];
    const query = caseSearch.trim().toLowerCase();
    return selectedPlan.cases.filter((testCase) => {
      const stateMatch = caseFilter === "all" || testCase.state === caseFilter;
      const priorityMatch = priorityFilter === "all" || testCase.priority === priorityFilter;
      const searchMatch = !query || `${testCase.title} ${testCase.owner} ${testCase.expected} ${testCase.actual}`.toLowerCase().includes(query);
      return stateMatch && priorityMatch && searchMatch;
    });
  }, [caseFilter, caseSearch, priorityFilter, selectedPlan]);

  const filteredReports = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();
    return reports.filter((report) => {
      const searchMatch = !query || `${reportTitle(report)} ${reportCategory(report)}`.toLowerCase().includes(query);
      const priorityMatch = reportFilter === "all" || reportSeverity(report) === reportFilter;
      const statusMatch = reportStatusFilter === "all" || reportStatus(report) === reportStatusFilter;
      return searchMatch && priorityMatch && statusMatch;
    });
  }, [reportFilter, reportSearch, reportStatusFilter, reports]);

  const selectedReports = useMemo(() => reports.filter((report) => selectedPlan?.reportIds.includes(reportId(report))), [reports, selectedPlan]);
  const metrics = selectedPlan ? metricsByPlan.get(selectedPlan.id) : null;

  const updatePlan = (patch) => {
    if (!selectedPlan) return;
    setPlans((current) => current.map((plan) => plan.id === selectedPlan.id ? { ...plan, ...patch, updatedAt: new Date().toISOString() } : plan));
  };

  const updateCase = (id, patch) => updatePlan({ cases: selectedPlan.cases.map((testCase) => testCase.id === id ? { ...testCase, ...patch } : testCase) });
  const updateNote = (id, patch) => updatePlan({ notes: selectedPlan.notes.map((note) => note.id === id ? { ...note, ...patch } : note) });
  const updateReference = (id, patch) => updatePlan({ references: selectedPlan.references.map((reference) => reference.id === id ? { ...reference, ...patch } : reference) });

  const createNewPlan = () => {
    if (plans.length >= MAX_PLANS) {
      setNotice(`Maximum of ${MAX_PLANS} test plans reached.`);
      return;
    }
    const plan = createPlan();
    plan.name = `Test plan ${plans.length + 1}`;
    setPlans((current) => [plan, ...current]);
    setSelectedId(plan.id);
    setNotice("New test plan created.");
  };

  const duplicatePlan = () => {
    if (!selectedPlan || plans.length >= MAX_PLANS) return;
    const copy = normalizePlan({ ...selectedPlan, id: makeId("test-plan"), name: `${selectedPlan.name || "Test plan"} copy`, state: "draft", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setPlans((current) => [copy, ...current]);
    setSelectedId(copy.id);
    setNotice("Test plan duplicated.");
  };

  const deletePlan = () => {
    if (!selectedPlan) return;
    if (plans.length === 1) {
      setNotice("Keep at least one test plan available.");
      return;
    }
    const remaining = plans.filter((plan) => plan.id !== selectedPlan.id);
    setPlans(remaining);
    setSelectedId(remaining[0]?.id || "");
    setNotice("Test plan removed.");
  };

  const addCase = () => {
    if (!selectedPlan || selectedPlan.cases.length >= MAX_CASES) return;
    updatePlan({ cases: [...selectedPlan.cases, { id: makeId("case"), title: "", area: "", state: "todo", priority: "medium", owner: "", dueDate: "", expected: "", actual: "" }] });
  };

  const removeCase = (id) => updatePlan({ cases: selectedPlan.cases.filter((testCase) => testCase.id !== id) });

  const addNote = () => {
    if (!selectedPlan || selectedPlan.notes.length >= MAX_NOTES) return;
    updatePlan({ notes: [...selectedPlan.notes, { id: makeId("note"), title: "", body: "" }] });
  };

  const removeNote = (id) => updatePlan({ notes: selectedPlan.notes.filter((note) => note.id !== id) });

  const addReference = () => {
    if (!selectedPlan || selectedPlan.references.length >= MAX_REFERENCES) return;
    updatePlan({ references: [...selectedPlan.references, { id: makeId("reference"), label: "", url: "" }] });
  };

  const removeReference = (id) => updatePlan({ references: selectedPlan.references.filter((reference) => reference.id !== id) });

  const toggleReport = (id) => {
    const ids = selectedPlan.reportIds.includes(id) ? selectedPlan.reportIds.filter((value) => value !== id) : [...selectedPlan.reportIds, id].slice(0, MAX_REPORTS);
    updatePlan({ reportIds: ids });
  };

  const toggleVisibleReports = () => {
    const visibleIds = filteredReports.map(reportId).filter(Boolean);
    const allSelected = visibleIds.every((id) => selectedPlan.reportIds.includes(id));
    const nextIds = allSelected ? selectedPlan.reportIds.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selectedPlan.reportIds, ...visibleIds])).slice(0, MAX_REPORTS);
    updatePlan({ reportIds: nextIds });
  };

  const summaryText = useMemo(() => {
    if (!selectedPlan) return "";
    const failed = selectedPlan.cases.filter((testCase) => ["fail", "blocked"].includes(testCase.state));
    return [
      `${selectedPlan.name || "Untitled test plan"} — ${planMeta(selectedPlan.state).label}`,
      `Release: ${selectedPlan.release || "Not specified"}`,
      `Environment: ${selectedPlan.environment || "Not specified"}`,
      `Owner: ${selectedPlan.owner || "Not assigned"} · Audience: ${selectedPlan.audience || "Not assigned"}`,
      `Readiness: ${metrics?.readiness || 0}%`,
      `Cases complete: ${metrics?.casesDone || 0}/${selectedPlan.cases.length}`,
      `Reports attached: ${selectedReports.length}`,
      "",
      selectedPlan.objective || "No objective has been written yet.",
      "",
      "Failed or blocked cases:",
      ...(failed.length ? failed.map((testCase) => `- ${testCase.title || "Untitled case"} [${testCase.state}]`) : ["- None"]),
      "",
      "Exit criteria:",
      selectedPlan.exitCriteria || "Not recorded",
    ].join("\n");
  }, [metrics, selectedPlan, selectedReports]);

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setNotice("Test plan summary copied.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setNotice("Clipboard access is unavailable.");
    }
  };

  const exportPlan = () => {
    if (!selectedPlan) return;
    const rows = [
      ["Test plan", "Value"],
      ["Name", selectedPlan.name],
      ["Release", selectedPlan.release],
      ["Environment", selectedPlan.environment],
      ["State", planMeta(selectedPlan.state).label],
      ["Owner", selectedPlan.owner],
      ["Audience", selectedPlan.audience],
      ["Target date", selectedPlan.targetDate],
      ["Readiness", `${metrics?.readiness || 0}%`],
      [],
      ["Case", "State", "Priority", "Owner", "Expected", "Actual"],
      ...selectedPlan.cases.map((testCase) => [testCase.title, testCase.state, testCase.priority, testCase.owner, testCase.expected, testCase.actual]),
      [],
      ["Note title", "Body"],
      ...selectedPlan.notes.map((note) => [note.title, note.body]),
      [],
      ["Reference", "URL"],
      ...selectedPlan.references.map((reference) => [reference.label, reference.url]),
    ];
    downloadCsv("test-plan.csv", rows);
    setNotice("Test plan export downloaded.");
  };

  const resetPlan = () => {
    if (!selectedPlan) return;
    const reset = createPlan();
    reset.id = selectedPlan.id;
    reset.name = selectedPlan.name;
    reset.release = selectedPlan.release;
    reset.environment = selectedPlan.environment;
    reset.owner = selectedPlan.owner;
    reset.audience = selectedPlan.audience;
    reset.targetDate = selectedPlan.targetDate;
    updatePlan(reset);
    setNotice("Test plan data reset.");
  };

  if (!selectedPlan) return null;

  const allVisibleReportsSelected = filteredReports.length > 0 && filteredReports.every((report) => selectedPlan.reportIds.includes(reportId(report)));
  const highFailures = selectedPlan.cases.filter((testCase) => ["fail", "blocked"].includes(testCase.state) && ["critical", "high"].includes(testCase.priority)).length;

  return (
    <section id="tester-test-plan" className="space-y-4 rounded-3xl bg-slate-50/70 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Target size={18} aria-hidden="true" className="text-cyan-600" /><h2 className="text-base font-semibold tracking-tight text-slate-900">Test plan workspace</h2></div><p className="mt-1 max-w-2xl text-[10px] leading-5 text-slate-500">Organize executable test cases, expected outcomes, evidence, and exit criteria in a private tester plan.</p></div><div className="flex flex-wrap gap-1.5"><Button icon={Plus} variant="primary" onClick={createNewPlan}>New plan</Button><Button icon={Download} onClick={exportPlan}>Export</Button><Button icon={copied ? Check : Copy} onClick={copySummary}>{copied ? "Copied" : "Copy summary"}</Button></div></div>
      {notice ? <div className="flex items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2.5 text-[9px] font-medium text-cyan-800"><CheckCircle2 size={13} aria-hidden="true" />{notice}</div> : null}
      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Panel title="Test plans" detail={`${formatNumber(filteredPlans.length)} matching plan(s)`} icon={Target} action={<Button variant="ghost" icon={sortAscending ? ArrowUpAZ : ArrowDownAZ} onClick={() => setSortAscending((value) => !value)} title="Toggle plan sort" />}><div className="space-y-2.5"><div className="relative"><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={planSearch} onChange={(event) => setPlanSearch(event.target.value)} placeholder="Search plans" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></div><SelectField label="State filter" value={planFilter} onChange={setPlanFilter} options={PLAN_FILTERS} />{visiblePlans.length ? <div className="space-y-2">{visiblePlans.map((plan) => <PlanCard key={plan.id} plan={plan} selected={plan.id === selectedPlan.id} onSelect={() => setSelectedId(plan.id)} metrics={metricsByPlan.get(plan.id) || { casesDone: 0, failed: 0, readiness: 0 }} />)}</div> : <EmptyState title="No matching plans" detail="Try clearing the search or state filter." icon={Search} />}{filteredPlans.length > PAGE_SIZE ? <Button variant="ghost" onClick={() => setShowAllPlans((value) => !value)}>{showAllPlans ? "Show fewer" : `Show all ${filteredPlans.length}`}</Button> : null}</div></Panel>
        <div className="min-w-0 space-y-4">
          <PlanHeader plan={selectedPlan} onChange={updatePlan} onDelete={deletePlan} onDuplicate={duplicatePlan} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Readiness" value={`${metrics?.readiness || 0}%`} detail="Plan completeness" icon={ShieldCheck} tone="cyan" /><StatCard label="Cases" value={`${metrics?.casesDone || 0}/${selectedPlan.cases.length}`} detail="Pass or skipped" icon={ListChecks} tone="violet" /><StatCard label="Failures" value={formatNumber(metrics?.failed || 0)} detail={`${highFailures} critical or high`} icon={ShieldAlert} tone="rose" /><StatCard label="Evidence" value={formatNumber(selectedReports.length)} detail="Reports attached" icon={FileCheck2} tone="emerald" /></div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]"><Panel title="Plan brief" detail="Describe what this test run is intended to prove." icon={Clipboard}><div className="space-y-3"><TextArea label="Objective" value={selectedPlan.objective} onChange={(value) => updatePlan({ objective: value })} placeholder="What risk, behavior, or release question is this plan testing?" rows={4} /><TextArea label="Setup and data" value={selectedPlan.setup} onChange={(value) => updatePlan({ setup: value })} placeholder="List accounts, fixtures, permissions, or environment setup." rows={3} /><TextArea label="Exit criteria" value={selectedPlan.exitCriteria} onChange={(value) => updatePlan({ exitCriteria: value })} placeholder="What must be true before this plan can be considered complete?" rows={3} /><Guidance plan={selectedPlan} metrics={metrics || { casesDone: 0 }} evidenceCount={selectedReports.length + selectedPlan.references.length} /></div></Panel><Panel title="Plan readiness" detail={`${metrics?.checkProgress || 0}% complete`} icon={ShieldCheck}><div className="space-y-2">{CHECKS.map((check) => <CheckRow key={check.id} check={check} checked={Boolean(selectedPlan.checks[check.id])} onChange={(event) => updatePlan({ checks: { ...selectedPlan.checks, [check.id]: event.target.checked } })} />)}</div></Panel></div>
          <Panel title="Executable cases" detail={`${formatNumber(selectedPlan.cases.length)} case(s) · ${formatNumber(filteredCases.length)} shown`} icon={ListChecks} action={<Button icon={Plus} onClick={addCase} disabled={selectedPlan.cases.length >= MAX_CASES}>Add case</Button>}><div className="space-y-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_150px]"><label className="relative block"><span className="sr-only">Search cases</span><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={caseSearch} onChange={(event) => setCaseSearch(event.target.value)} placeholder="Search cases, owners, or outcomes" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label><SelectField label="State" value={caseFilter} onChange={setCaseFilter} options={CASE_FILTERS} /><SelectField label="Priority" value={priorityFilter} onChange={setPriorityFilter} options={PRIORITY_FILTERS} /></div>{filteredCases.length ? <div className="space-y-2.5">{filteredCases.map((testCase) => <CaseRow key={testCase.id} testCase={testCase} onChange={(patch) => updateCase(testCase.id, patch)} onRemove={() => removeCase(testCase.id)} />)}</div> : <EmptyState title="No cases match" detail="Adjust the filters or add a new executable case." icon={ListChecks} />}</div></Panel>
          <Panel title="Execution notes" detail={`${formatNumber(selectedPlan.notes.length)} note(s)`} icon={Clipboard} action={<Button icon={Plus} onClick={addNote} disabled={selectedPlan.notes.length >= MAX_NOTES}>Add note</Button>}><div className="space-y-2.5">{selectedPlan.notes.length ? selectedPlan.notes.map((note) => <NoteRow key={note.id} note={note} onChange={(patch) => updateNote(note.id, patch)} onRemove={() => removeNote(note.id)} />) : <EmptyState title="No execution notes" detail="Capture observations, setup caveats, or handoff context during the run." icon={Clipboard} />}</div></Panel>
          <Panel title="Report evidence" detail={`${formatNumber(selectedPlan.reportIds.length)} attached · ${formatNumber(filteredReports.length)} shown`} icon={FileCheck2} action={<Button icon={allVisibleReportsSelected ? X : Check} onClick={toggleVisibleReports}>{allVisibleReportsSelected ? "Clear shown" : "Select shown"}</Button>}><div className="space-y-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_150px]"><label className="relative block"><span className="sr-only">Search reports</span><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Search report title or category" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label><SelectField label="Severity" value={reportFilter} onChange={setReportFilter} options={PRIORITY_FILTERS} /><SelectField label="Status" value={reportStatusFilter} onChange={setReportStatusFilter} options={[{ value: "all", label: "All statuses" }, { value: "open", label: "Open reports" }, { value: "resolved", label: "Resolved reports" }]} /></div>{filteredReports.length ? <div className="space-y-2">{filteredReports.slice(0, 20).map((report) => <ReportRow key={reportId(report)} report={report} checked={selectedPlan.reportIds.includes(reportId(report))} onToggle={() => toggleReport(reportId(report))} onOpenReport={onOpenReport} />)}</div> : <EmptyState title="No reports match" detail="Adjust the filters or wait for reports to be available." icon={FileCheck2} />}<div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3"><p className="flex items-center gap-1.5 text-[9px] font-semibold text-violet-800"><Users size={12} aria-hidden="true" /> Browser-local evidence</p><p className="mt-1 text-[9px] leading-4 text-violet-700/75">Selecting reports here stores only their IDs in this tester&apos;s browser and does not change report status.</p></div></div></Panel>
          <Panel title="Reference links" detail={`${formatNumber(selectedPlan.references.length)} supporting reference(s)`} icon={ExternalLink} action={<Button icon={Plus} onClick={addReference} disabled={selectedPlan.references.length >= MAX_REFERENCES}>Add link</Button>}><div className="space-y-3">{selectedPlan.references.length ? selectedPlan.references.map((reference) => <ReferenceRow key={reference.id} reference={reference} onChange={(patch) => updateReference(reference.id, patch)} onRemove={() => removeReference(reference.id)} />) : <EmptyState title="No reference links" detail="Keep a fixture, build, runbook, or requirement reference beside the plan." icon={ExternalLink} />}</div></Panel>
          <Panel title="Workspace actions" detail="Browser-local controls for this test plan." icon={ShieldCheck}><div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-[9px] leading-4 text-slate-400">Reset clears cases, notes, checks, references, and report links while preserving plan identity fields.</p><Button variant="danger" icon={RefreshCw} onClick={resetPlan}>Reset plan data</Button></div></Panel>
        </div>
      </div>
    </section>
  );
}
