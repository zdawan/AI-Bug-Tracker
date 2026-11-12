"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  FlaskConical,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";

const STORAGE_KEY = "tester-defect-reproduction-v1";
const MAX_CASES = 30;
const MAX_STEPS = 160;
const MAX_ATTEMPTS = 140;
const MAX_EVIDENCE = 120;
const MAX_ENVIRONMENTS = 80;
const MAX_REPORTS = 100;
const PAGE_SIZE = 8;

const CASE_STATES = [
  { value: "draft", label: "Draft", tone: "slate" },
  { value: "attempting", label: "Attempting", tone: "cyan" },
  { value: "reproduced", label: "Reproduced", tone: "emerald" },
  { value: "intermittent", label: "Intermittent", tone: "amber" },
  { value: "not-reproduced", label: "Not reproduced", tone: "violet" },
  { value: "blocked", label: "Blocked", tone: "rose" },
];
const STEP_STATES = [
  { value: "planned", label: "Planned" },
  { value: "executed", label: "Executed" },
  { value: "failed", label: "Failed" },
  { value: "skipped", label: "Skipped" },
];
const ATTEMPT_RESULTS = [
  { value: "reproduced", label: "Reproduced", tone: "emerald" },
  { value: "not-reproduced", label: "Not reproduced", tone: "violet" },
  { value: "intermittent", label: "Intermittent", tone: "amber" },
  { value: "blocked", label: "Blocked", tone: "rose" },
];
const CONFIDENCE = [
  { value: "low", label: "Low", tone: "amber" },
  { value: "medium", label: "Medium", tone: "cyan" },
  { value: "high", label: "High", tone: "emerald" },
];
const SEVERITIES = [
  { value: "critical", label: "Critical", tone: "rose" },
  { value: "high", label: "High", tone: "orange" },
  { value: "medium", label: "Medium", tone: "amber" },
  { value: "low", label: "Low", tone: "emerald" },
];
const EVIDENCE_TYPES = ["Screenshot", "Video", "Log", "Trace", "Console", "Network", "Note"];
const CHECKS = [
  ["summary", "Defect summary is clear", "The observed behavior is distinguishable from the expected behavior."],
  ["steps", "Steps are executable", "Another tester can follow the sequence without guessing."],
  ["environment", "Environment is recorded", "Browser, device, build, and account context are visible."],
  ["frequency", "Frequency is described", "The result includes repeatability or intermittent behavior."],
  ["evidence", "Evidence is attached", "Artifacts show the actual behavior and useful surrounding context."],
  ["owner", "Follow-up owner is named", "A person or team owns the next reproduction or fix step."],
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
  return Number.isNaN(date.getTime()) ? "No date" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function labelFor(options, value) {
  return options.find((item) => item.value === value)?.label || value || "Unknown";
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
function toneFor(options, value) {
  return options.find((item) => item.value === value)?.tone || "slate";
}
function initialData() {
  return { cases: [], steps: [], attempts: [], evidence: [], environments: [], reports: [] };
}
function readData() {
  if (typeof window === "undefined") return initialData();
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    const blank = initialData();
    return Object.fromEntries(Object.keys(blank).map((key) => [key, Array.isArray(saved[key]) ? saved[key] : []]));
  } catch {
    return initialData();
  }
}
function Button({ children, onClick, icon: Icon, variant = "secondary", type = "button", disabled = false }) {
  const styles = { primary: "border-violet-600 bg-violet-600 text-white hover:bg-violet-700", secondary: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50", danger: "border-rose-200 bg-white text-rose-700 hover:bg-rose-50" };
  return <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]}`}>{Icon && <Icon size={14} />}{children}</button>;
}
function Badge({ children, tone = "slate" }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClasses(tone)}`}>{children}</span>;
}
function Section({ title, description, action, children }) {
  return <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-sm font-semibold text-slate-950">{title}</h3>{description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}</div>{action && <div className="shrink-0">{action}</div>}</div>{children}</section>;
}
function Field({ label, value, onChange, placeholder, type = "text", options, required = false }) {
  const props = { value: value || "", onChange: (event) => onChange(event.target.value), required, className: "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100" };
  return <label className="block text-xs font-semibold text-slate-700">{label}{options ? <select {...props}><option value="">Select...</option>{options.map((option) => <option key={option.value || option} value={option.value || option}>{option.label || option}</option>)}</select> : <input {...props} type={type} placeholder={placeholder} />}</label>;
}
function TextArea({ label, value, onChange, placeholder, rows = 3 }) {
  return <label className="block text-xs font-semibold text-slate-700">{label}<textarea value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-5 text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100" /></label>;
}
function Stat({ label, value, note, icon: Icon, tone = "violet" }) {
  const colors = { violet: "bg-violet-100 text-violet-700", emerald: "bg-emerald-100 text-emerald-700", rose: "bg-rose-100 text-rose-700", amber: "bg-amber-100 text-amber-700" };
  return <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p></div>{Icon && <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors[tone]}`}><Icon size={17} /></span>}</div><p className="mt-2 text-[11px] leading-5 text-slate-500">{note}</p></article>;
}
function Empty({ title, description, action }) {
  return <div className="px-5 py-12 text-center"><FlaskConical className="mx-auto text-slate-300" size={32} /><p className="mt-3 text-sm font-semibold text-slate-800">{title}</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">{description}</p>{action && <div className="mt-4">{action}</div>}</div>;
}
function Modal({ title, onClose, children }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 p-5"><h2 className="text-base font-semibold text-slate-950">{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={17} /></button></div><div className="p-5">{children}</div></div></div>;
}

export default function TesterDefectReproductionWorkspace({ reports = [], email = "", onOpenReport }) {
  const [data, setData] = useState(initialData);
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState("overview");
  const [caseFilter, setCaseFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [ascending, setAscending] = useState(false);
  const [modal, setModal] = useState("");
  const [notice, setNotice] = useState("");
  const [caseForm, setCaseForm] = useState({ title: "", severity: "medium", state: "draft", owner: "", environment: "", expected: "", observed: "", frequency: "", confidence: "low" });
  const [stepForm, setStepForm] = useState({ title: "", caseId: "", state: "planned", expected: "", actual: "" });
  const [attemptForm, setAttemptForm] = useState({ caseId: "", environment: "", result: "not-reproduced", owner: "", notes: "" });
  const [evidenceForm, setEvidenceForm] = useState({ title: "", caseId: "", type: "Screenshot", owner: "", reference: "", note: "" });

  useEffect(() => setData(readData()), []);
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => { if (!notice) return undefined; const timer = window.setTimeout(() => setNotice(""), 3000); return () => window.clearTimeout(timer); }, [notice]);

  const defect = data.cases.find((item) => item.id === selectedId) || null;
  const steps = data.steps.filter((item) => !selectedId || item.caseId === selectedId);
  const attempts = data.attempts.filter((item) => !selectedId || item.caseId === selectedId);
  const evidence = data.evidence.filter((item) => !selectedId || item.caseId === selectedId);
  const filteredCases = useMemo(() => { const text = query.toLowerCase(); return data.cases.filter((item) => caseFilter === "all" || item.state === caseFilter).filter((item) => !text || `${item.title} ${item.owner} ${item.environment} ${item.observed}`.toLowerCase().includes(text)).sort((a, b) => ascending ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)); }, [ascending, caseFilter, data.cases, query]);
  const reproducedAttempts = attempts.filter((item) => item.result === "reproduced").length;
  const failedSteps = steps.filter((item) => item.state === "failed").length;
  const executedSteps = steps.filter((item) => ["executed", "failed", "skipped"].includes(item.state)).length;
  const checks = [Boolean(defect?.observed && defect?.expected), steps.length > 0 && steps.every((item) => item.expected), Boolean(defect?.environment), Boolean(defect?.frequency), evidence.length > 0, Boolean(defect?.owner)];
  const readiness = Math.round((checks.filter(Boolean).length / CHECKS.length) * 100);

  function update(key, items) { setData((current) => ({ ...current, [key]: items })); }
  function addCase(event) {
    event.preventDefault();
    if (!clean(caseForm.title) || data.cases.length >= MAX_CASES) return;
    const item = { ...caseForm, id: makeId("defect"), title: clean(caseForm.title), owner: clean(caseForm.owner), environment: clean(caseForm.environment), expected: clean(caseForm.expected), observed: clean(caseForm.observed), frequency: clean(caseForm.frequency), createdAt: now() };
    update("cases", [item, ...data.cases].slice(0, MAX_CASES)); setSelectedId(item.id); setModal(""); setNotice("Reproduction case created"); setCaseForm({ title: "", severity: "medium", state: "draft", owner: "", environment: "", expected: "", observed: "", frequency: "", confidence: "low" });
  }
  function addStep(event) {
    event.preventDefault();
    if (!clean(stepForm.title) || data.steps.length >= MAX_STEPS) return;
    const item = { ...stepForm, id: makeId("step"), caseId: stepForm.caseId || selectedId, title: clean(stepForm.title), expected: clean(stepForm.expected), actual: clean(stepForm.actual), createdAt: now() };
    update("steps", [item, ...data.steps].slice(0, MAX_STEPS)); setModal(""); setNotice("Reproduction step added"); setStepForm({ title: "", caseId: selectedId, state: "planned", expected: "", actual: "" });
  }
  function addAttempt(event) {
    event.preventDefault();
    if (!clean(attemptForm.environment) || data.attempts.length >= MAX_ATTEMPTS) return;
    const item = { ...attemptForm, id: makeId("attempt"), caseId: attemptForm.caseId || selectedId, environment: clean(attemptForm.environment), owner: clean(attemptForm.owner), notes: clean(attemptForm.notes), createdAt: now() };
    update("attempts", [item, ...data.attempts].slice(0, MAX_ATTEMPTS)); setModal(""); setNotice("Reproduction attempt added"); setAttemptForm({ caseId: selectedId, environment: "", result: "not-reproduced", owner: "", notes: "" });
  }
  function addEvidence(event) {
    event.preventDefault();
    if (!clean(evidenceForm.title) || data.evidence.length >= MAX_EVIDENCE) return;
    const item = { ...evidenceForm, id: makeId("evidence"), caseId: evidenceForm.caseId || selectedId, title: clean(evidenceForm.title), owner: clean(evidenceForm.owner), reference: clean(evidenceForm.reference), note: clean(evidenceForm.note), createdAt: now() };
    update("evidence", [item, ...data.evidence].slice(0, MAX_EVIDENCE)); setModal(""); setNotice("Reproduction evidence added"); setEvidenceForm({ title: "", caseId: selectedId, type: "Screenshot", owner: "", reference: "", note: "" });
  }
  function change(key, itemId, field, value) { update(key, data[key].map((item) => item.id === itemId ? { ...item, [field]: value, updatedAt: now() } : item)); }
  function remove(key, itemId) { update(key, data[key].filter((item) => item.id !== itemId)); setNotice("Item removed"); }
  function copySummary() { navigator.clipboard?.writeText([`Reproduction: ${defect?.title || "All cases"}`, `State: ${labelFor(CASE_STATES, defect?.state)}`, `Confidence: ${labelFor(CONFIDENCE, defect?.confidence)}`, `Attempts reproduced: ${reproducedAttempts}/${attempts.length}`, `Steps executed: ${executedSteps}/${steps.length}`, `Evidence: ${evidence.length}`, defect?.observed || "No observed behavior recorded."].join("\n")); setNotice("Reproduction summary copied"); }
  function exportSteps() { const rows = [["Step", "Case", "State", "Expected", "Actual"], ...steps.map((item) => [item.title, defect?.title || "", item.state, item.expected, item.actual])]; const csv = rows.map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(",")).join("\n"); const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "tester-reproduction-steps.csv"; anchor.click(); URL.revokeObjectURL(url); setNotice("Reproduction steps exported"); }
  function attachReport(report) { if (data.reports.some((item) => item.id === report.id)) return; update("reports", [{ id: report.id, title: clean(report.title || report.summary || `Report ${report.id}`), createdAt: now() }, ...data.reports]); setNotice("Report attached"); }

  const tabs = [["overview", "Overview"], ["steps", `Steps (${steps.length})`], ["attempts", `Attempts (${attempts.length})`], ["evidence", `Evidence (${evidence.length})`], ["reports", "Reports"]];

  return (
    <section className="mt-8 space-y-5">
      <div className="rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-violet-50 p-5 shadow-sm sm:p-7"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="max-w-3xl"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-orange-700"><FlaskConical size={16} /> Defect reproduction lab</div><h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Turn a report into a repeatable reproduction story.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Capture precise steps, attempts, environments, evidence, and confidence so another tester can validate the behavior without starting over.</p></div><div className="flex flex-wrap gap-2"><Button icon={Plus} variant="primary" onClick={() => setModal("case")}>New reproduction</Button><Button icon={Copy} onClick={copySummary}>Copy summary</Button></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Readiness" value={`${readiness}%`} note="Reproduction record completeness" tone="violet" icon={CheckCircle2} /><Stat label="Reproduced" value={reproducedAttempts} note={`${attempts.length} attempts recorded`} tone="emerald" icon={FlaskConical} /><Stat label="Failed steps" value={failedSteps} note={`${steps.length} steps in scope`} tone="rose" icon={ShieldAlert} /><Stat label="Evidence" value={evidence.length} note="Artifacts attached" tone="amber" icon={FileCheck2} /></div></div>
      {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"><CheckCircle2 size={16} />{notice}</div>}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">{tabs.map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-t-lg px-3 py-2 text-xs font-semibold ${tab === value ? "border-b-2 border-orange-600 text-orange-700" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>)}</div>
      <Section title="Reproduction cases" description="Select a defect or work across all local reproduction records." action={<Button icon={RefreshCw} onClick={() => { setData(readData()); setNotice("Workspace refreshed"); }}>Refresh</Button>}><div className="grid gap-3 p-5 lg:grid-cols-[minmax(0,1fr)_180px_auto]"><label className="relative block"><Search size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reproduction cases..." className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-orange-500" /></label><select value={caseFilter} onChange={(event) => setCaseFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-xs"><option value="all">All states</option>{CASE_STATES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><Button icon={ascending ? ArrowUpAZ : ArrowDownAZ} onClick={() => setAscending((value) => !value)}>Name</Button></div><div className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-2 xl:grid-cols-3">{filteredCases.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`rounded-xl border p-4 text-left ${selectedId === item.id ? "border-orange-300 bg-orange-50/50" : "border-slate-200"}`}><div className="flex items-start justify-between gap-2"><span className="text-sm font-semibold text-slate-900">{item.title}</span><Badge tone={toneFor(CASE_STATES, item.state)}>{labelFor(CASE_STATES, item.state)}</Badge></div><p className="mt-2 line-clamp-2 text-xs text-slate-500">{item.observed || "No observed behavior recorded."}</p><div className="mt-3 flex justify-between text-[11px] text-slate-400"><span>{labelFor(CONFIDENCE, item.confidence)} confidence</span><span>{item.owner || "Unassigned"}</span></div></button>)}{!data.cases.length && <div className="md:col-span-2 xl:col-span-3"><Empty title="No reproduction case yet" description="Create a case from a report, tester observation, or customer-impacting behavior." action={<Button icon={Plus} variant="primary" onClick={() => setModal("case")}>Create case</Button>} /></div>}</div></Section>
      {tab === "overview" && <div className="space-y-5"><div className="grid gap-5 xl:grid-cols-[1fr_1fr]"><Section title="Reproduction readiness" description="Confirm the story can be repeated and reviewed."><div className="space-y-3 p-5">{CHECKS.map(([id, title, detail], index) => { const complete = [Boolean(defect?.observed && defect?.expected), steps.length > 0 && steps.every((item) => item.expected), Boolean(defect?.environment), Boolean(defect?.frequency), evidence.length > 0, Boolean(defect?.owner)][index]; return <div key={id} className={`flex gap-3 rounded-xl border p-3 ${complete ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200"}`}><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${complete ? "bg-emerald-600 text-white" : "border border-slate-300 text-transparent"}`}><Check size={13} /></span><div><p className="text-xs font-semibold text-slate-800">{title}</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{detail}</p></div></div>; })}</div></Section><Section title="Defect narrative" description="Keep expected and observed behavior side by side."><div className="space-y-4 p-5"><TextArea label="Expected behavior" value={defect?.expected || ""} onChange={(value) => defect && change("cases", defect.id, "expected", value)} placeholder="What should happen?" rows={4} /><TextArea label="Observed behavior" value={defect?.observed || ""} onChange={(value) => defect && change("cases", defect.id, "observed", value)} placeholder="What actually happens?" rows={4} /><TextArea label="Frequency and trigger" value={defect?.frequency || ""} onChange={(value) => defect && change("cases", defect.id, "frequency", value)} placeholder="Always, intermittent, after a sequence, or under a specific condition." rows={3} /></div></Section></div><Section title="Reproduction guidance" description="Use a disciplined loop when a defect is difficult to reproduce." action={<Badge tone={readiness >= 80 ? "emerald" : "amber"}>{readiness}% ready</Badge>}><div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl border border-cyan-100 bg-cyan-50 p-3"><p className="text-xs font-semibold text-cyan-900">Control variables</p><p className="mt-1 text-[11px] leading-5 text-cyan-800/80">Keep build, account, environment, and data state visible.</p></div><div className="rounded-xl border border-violet-100 bg-violet-50 p-3"><p className="text-xs font-semibold text-violet-900">Repeat deliberately</p><p className="mt-1 text-[11px] leading-5 text-violet-800/80">Record both reproduced and non-reproduced attempts.</p></div><div className="rounded-xl border border-orange-100 bg-orange-50 p-3"><p className="text-xs font-semibold text-orange-900">Capture the moment</p><p className="mt-1 text-[11px] leading-5 text-orange-800/80">Attach evidence that shows the state, not just the final conclusion.</p></div><div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3"><p className="text-xs font-semibold text-emerald-900">State confidence</p><p className="mt-1 text-[11px] leading-5 text-emerald-800/80">Use confidence to communicate how strong the reproduction signal is.</p></div></div></Section></div>}
      {tab === "steps" && <Section title="Reproduction steps" description="Make the sequence executable by another tester." action={<div className="flex gap-2"><Button icon={Download} onClick={exportSteps}>Export CSV</Button><Button icon={Plus} variant="primary" onClick={() => setModal("step")}>Add step</Button></div>}>{!steps.length ? <Empty title="No steps recorded" description="Add the smallest sequence that reaches the observed behavior." action={<Button icon={Plus} onClick={() => setModal("step")}>Add step</Button>} /> : <div className="divide-y divide-slate-100">{steps.map((item, index) => <div key={item.id} className="p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">{index + 1}</span><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-900">{item.title}</h4><Badge tone={toneFor(STEP_STATES, item.state)}>{labelFor(STEP_STATES, item.state)}</Badge></div><p className="mt-2 text-xs text-slate-600"><span className="font-semibold">Expected:</span> {item.expected || "Not recorded"}</p><p className="mt-1 text-xs text-slate-600"><span className="font-semibold">Actual:</span> {item.actual || "Not recorded"}</p></div></div><div className="flex gap-2"><select value={item.state} onChange={(event) => change("steps", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{STEP_STATES.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => remove("steps", item.id)}>Remove</Button></div></div></div>)}</div>}</Section>}
      {tab === "attempts" && <Section title="Reproduction attempts" description="Record the environment and outcome of each deliberate attempt." action={<Button icon={Plus} variant="primary" onClick={() => setModal("attempt")}>Add attempt</Button>}>{!attempts.length ? <Empty title="No attempts recorded" description="Record a reproduced, intermittent, blocked, or non-reproduced attempt." action={<Button icon={Plus} onClick={() => setModal("attempt")}>Add attempt</Button>} /> : <div className="divide-y divide-slate-100">{attempts.map((item) => <div key={item.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-900">{item.environment}</h4><Badge tone={toneFor(ATTEMPT_RESULTS, item.result)}>{labelFor(ATTEMPT_RESULTS, item.result)}</Badge></div><p className="mt-2 text-xs text-slate-600">{item.notes || "No attempt notes recorded."}</p><p className="mt-2 text-[11px] text-slate-500">Owner: {item.owner || "Unassigned"} · {dateLabel(item.createdAt)}</p></div><Button variant="danger" icon={Trash2} onClick={() => remove("attempts", item.id)}>Remove</Button></div>)}</div>}</Section>}
      {tab === "evidence" && <Section title="Reproduction evidence" description="Capture artifacts that prove the behavior and its surrounding state." action={<Button icon={Plus} variant="primary" onClick={() => setModal("evidence")}>Add evidence</Button>}>{!evidence.length ? <Empty title="No evidence attached" description="Add a screenshot, video, log, trace, console capture, or note." action={<Button icon={Plus} onClick={() => setModal("evidence")}>Add evidence</Button>} /> : <div className="divide-y divide-slate-100">{evidence.map((item) => <div key={item.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-900">{item.title}</h4><Badge>{item.type}</Badge></div><p className="mt-2 text-xs text-slate-600">{item.note || "No evidence note recorded."}</p><p className="mt-2 text-[11px] text-slate-500">Owner: {item.owner || "Unassigned"} · Reference: {item.reference || "Not recorded"}</p></div><Button variant="danger" icon={Trash2} onClick={() => remove("evidence", item.id)}>Remove</Button></div>)}</div>}</Section>}
      {tab === "reports" && <Section title="Linked reports" description="Use existing bug reports as anchors for the reproduction record."><div className="divide-y divide-slate-100">{reports.slice(0, 20).map((report) => { const attached = data.reports.some((item) => item.id === report.id); return <div key={report.id} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{report.title || report.summary || `Report ${report.id}`}</p><p className="mt-1 text-[11px] text-slate-500">Available report</p></div><div className="flex gap-2">{onOpenReport && <Button icon={ExternalLink} onClick={() => onOpenReport(report)}>Open</Button>}<Button icon={attached ? Check : Plus} onClick={() => attachReport(report)} disabled={attached}>{attached ? "Attached" : "Attach"}</Button></div></div>; })}{!reports.length && <Empty title="No reports available" description="Submitted reports will appear here when available." />}</div></Section>}

      {modal === "case" && <Modal title="Create reproduction case" onClose={() => setModal("")}><form onSubmit={addCase} className="space-y-4"><Field label="Case title" value={caseForm.title} onChange={(value) => setCaseForm({ ...caseForm, title: value })} placeholder="Saved address disappears after refresh" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Severity" options={SEVERITIES} value={caseForm.severity} onChange={(value) => setCaseForm({ ...caseForm, severity: value })} /><Field label="State" options={CASE_STATES} value={caseForm.state} onChange={(value) => setCaseForm({ ...caseForm, state: value })} /><Field label="Owner" value={caseForm.owner} onChange={(value) => setCaseForm({ ...caseForm, owner: value })} placeholder={email || "Tester or team"} /><Field label="Environment" value={caseForm.environment} onChange={(value) => setCaseForm({ ...caseForm, environment: value })} placeholder="Chrome / staging / build" /><Field label="Confidence" options={CONFIDENCE} value={caseForm.confidence} onChange={(value) => setCaseForm({ ...caseForm, confidence: value })} /></div><TextArea label="Expected behavior" value={caseForm.expected} onChange={(value) => setCaseForm({ ...caseForm, expected: value })} placeholder="What should happen?" required /><TextArea label="Observed behavior" value={caseForm.observed} onChange={(value) => setCaseForm({ ...caseForm, observed: value })} placeholder="What actually happens?" required /><TextArea label="Frequency and trigger" value={caseForm.frequency} onChange={(value) => setCaseForm({ ...caseForm, frequency: value })} placeholder="Always, intermittent, after a specific sequence, or under a condition." /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Create case</Button></div></form></Modal>}
      {modal === "step" && <Modal title="Add reproduction step" onClose={() => setModal("")}><form onSubmit={addStep} className="space-y-4"><Field label="Step title" value={stepForm.title} onChange={(value) => setStepForm({ ...stepForm, title: value })} placeholder="Refresh the account page" required /><Field label="Case" options={data.cases.map((item) => ({ value: item.id, label: item.title }))} value={stepForm.caseId || selectedId} onChange={(value) => setStepForm({ ...stepForm, caseId: value })} /><TextArea label="Expected" value={stepForm.expected} onChange={(value) => setStepForm({ ...stepForm, expected: value })} placeholder="What should happen at this step?" required /><TextArea label="Actual" value={stepForm.actual} onChange={(value) => setStepForm({ ...stepForm, actual: value })} placeholder="What happened when the step was executed?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add step</Button></div></form></Modal>}
      {modal === "attempt" && <Modal title="Record reproduction attempt" onClose={() => setModal("")}><form onSubmit={addAttempt} className="space-y-4"><Field label="Case" options={data.cases.map((item) => ({ value: item.id, label: item.title }))} value={attemptForm.caseId || selectedId} onChange={(value) => setAttemptForm({ ...attemptForm, caseId: value })} /><Field label="Environment" value={attemptForm.environment} onChange={(value) => setAttemptForm({ ...attemptForm, environment: value })} placeholder="Browser, device, build, account, data state" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Result" options={ATTEMPT_RESULTS} value={attemptForm.result} onChange={(value) => setAttemptForm({ ...attemptForm, result: value })} /><Field label="Owner" value={attemptForm.owner} onChange={(value) => setAttemptForm({ ...attemptForm, owner: value })} placeholder="Tester" /></div><TextArea label="Notes" value={attemptForm.notes} onChange={(value) => setAttemptForm({ ...attemptForm, notes: value })} placeholder="Sequence, timing, data state, and observed result" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Record attempt</Button></div></form></Modal>}
      {modal === "evidence" && <Modal title="Add reproduction evidence" onClose={() => setModal("")}><form onSubmit={addEvidence} className="space-y-4"><Field label="Evidence title" value={evidenceForm.title} onChange={(value) => setEvidenceForm({ ...evidenceForm, title: value })} placeholder="Console error after refresh" required /><Field label="Case" options={data.cases.map((item) => ({ value: item.id, label: item.title }))} value={evidenceForm.caseId || selectedId} onChange={(value) => setEvidenceForm({ ...evidenceForm, caseId: value })} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Type" options={EVIDENCE_TYPES.map((value) => ({ value, label: value }))} value={evidenceForm.type} onChange={(value) => setEvidenceForm({ ...evidenceForm, type: value })} /><Field label="Owner" value={evidenceForm.owner} onChange={(value) => setEvidenceForm({ ...evidenceForm, owner: value })} placeholder="Evidence owner" /></div><Field label="Reference" value={evidenceForm.reference} onChange={(value) => setEvidenceForm({ ...evidenceForm, reference: value })} placeholder="File, URL, run, ticket, or report" /><TextArea label="Note" value={evidenceForm.note} onChange={(value) => setEvidenceForm({ ...evidenceForm, note: value })} placeholder="What does this artifact prove?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add evidence</Button></div></form></Modal>}
    </section>
  );
}
