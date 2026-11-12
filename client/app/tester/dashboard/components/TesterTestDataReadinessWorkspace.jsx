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
  Database,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";

const STORAGE_KEY = "tester-test-data-readiness-v1";
const MAX_PLANS = 25;
const MAX_RECORDS = 160;
const MAX_RISKS = 100;
const MAX_STEPS = 100;
const PAGE_SIZE = 8;

const PLAN_STATES = [
  { value: "draft", label: "Draft", tone: "slate" },
  { value: "preparing", label: "Preparing", tone: "cyan" },
  { value: "ready", label: "Ready", tone: "emerald" },
  { value: "blocked", label: "Blocked", tone: "rose" },
  { value: "retired", label: "Retired", tone: "amber" },
];
const RECORD_STATES = [
  { value: "needed", label: "Needed" },
  { value: "requested", label: "Requested" },
  { value: "available", label: "Available" },
  { value: "validated", label: "Validated" },
  { value: "expired", label: "Expired" },
];
const RISK_STATES = [
  { value: "open", label: "Open" },
  { value: "owned", label: "Owned" },
  { value: "mitigated", label: "Mitigated" },
  { value: "accepted", label: "Accepted" },
  { value: "closed", label: "Closed" },
];
const RISK_LEVELS = [
  { value: "critical", label: "Critical", tone: "rose" },
  { value: "high", label: "High", tone: "orange" },
  { value: "medium", label: "Medium", tone: "amber" },
  { value: "low", label: "Low", tone: "emerald" },
];
const RECORD_TYPES = ["Account", "Fixture", "Dataset", "File", "Token", "Permission", "Environment"];
const DATA_CHECKS = [
  ["scope", "Data scope is explicit", "The feature, journey, environment, and user type are named."],
  ["records", "Required records exist", "The account, fixture, or dataset needed by the run is listed."],
  ["privacy", "Privacy handling is clear", "Sensitive values are masked, synthetic, or approved for testing."],
  ["reset", "Reset path is documented", "The tester can restore or recreate the data after execution."],
  ["validation", "Data is validated", "Records are confirmed usable before the test starts."],
  ["owners", "Owners are assigned", "Every important record and risk has a responsible owner."],
  ["risks", "Data risks are dispositioned", "Open risks have mitigation, acceptance, or closure context."],
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
function stateTone(options, value) {
  return options.find((item) => item.value === value)?.tone || "slate";
}
function emptyData() {
  return { plans: [], records: [], risks: [], steps: [], reports: [], references: [] };
}
function readData() {
  if (typeof window === "undefined") return emptyData();
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    const blank = emptyData();
    return Object.fromEntries(Object.keys(blank).map((key) => [key, Array.isArray(saved[key]) ? saved[key] : []]));
  } catch {
    return emptyData();
  }
}
function Button({ children, onClick, icon: Icon, variant = "secondary", type = "button", disabled = false }) {
  const variants = {
    primary: "border-violet-600 bg-violet-600 text-white hover:bg-violet-700",
    secondary: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
    danger: "border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]}`}>{Icon && <Icon size={14} />}{children}</button>;
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
  return <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p></div>{Icon && <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors[tone]}`}><Icon size={17} /></span>}</div>{note && <p className="mt-2 text-[11px] leading-5 text-slate-500">{note}</p>}</article>;
}
function Empty({ title, description, action }) {
  return <div className="px-5 py-12 text-center"><Database className="mx-auto text-slate-300" size={32} /><p className="mt-3 text-sm font-semibold text-slate-800">{title}</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">{description}</p>{action && <div className="mt-4">{action}</div>}</div>;
}
function Modal({ title, onClose, children }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 p-5"><h2 className="text-base font-semibold text-slate-950">{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={17} /></button></div><div className="p-5">{children}</div></div></div>;
}
function Progress({ value }) {
  const percentage = Math.max(0, Math.min(100, Number(value) || 0));
  return <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${percentage}%` }} /></div>;
}

function DataSafetyReview({ plan, records, risks, steps }) {
  const rows = [
    ["Synthetic or masked values", Boolean(plan?.privacy), "Document how sensitive values are protected.", "amber"],
    ["Record ownership", records.length > 0 && records.every((item) => item.owner), "Every important record needs a responsible owner.", "cyan"],
    ["Reset coverage", steps.length > 0 && steps.every((item) => item.detail), "Reset steps should be repeatable by another tester.", "violet"],
    ["Open risk handling", risks.every((item) => item.owner || ["accepted", "closed"].includes(item.state)), "Open data risks need ownership or explicit acceptance.", "rose"],
    ["Validation evidence", records.length > 0 && records.every((item) => item.validation), "Validation notes should explain how records were confirmed.", "emerald"],
    ["Access boundaries", Boolean(plan?.environment), "Name the environment and access boundary for the data.", "slate"],
  ];
  return (
    <Section title="Data safety review" description="Review privacy, ownership, reset, and validation before the data is used.">
      <div className="grid gap-3 p-5 md:grid-cols-2">
        {rows.map(([title, complete, detail, tone]) => (
          <div key={title} className={`rounded-xl border p-3 ${complete ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200"}`}>
            <div className="flex items-start gap-3">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${complete ? "bg-emerald-100 text-emerald-700" : toneClasses(tone)}`}>
                {complete ? <Check size={14} /> : <ShieldAlert size={14} />}
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-800">{title}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">{complete ? "Complete" : detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function SetupPlaybook({ plan, records, steps, onChange }) {
  const prompts = [
    ["Prepare", "What must be created or requested before the run?", records.length ? `${records.length} record(s) listed.` : "No records listed yet."],
    ["Verify", "How will the tester know the data is usable?", records.every((item) => item.validation) && records.length ? "Validation notes are present." : "Add validation notes to each record."],
    ["Execute", "Which account, fixture, or dataset is used by each case?", plan?.scope || "Add the data scope and intended usage."],
    ["Reset", "How is the environment restored after the run?", steps.length ? `${steps.length} reset step(s) recorded.` : "No reset step is recorded."],
    ["Protect", "What must not be copied into reports or chat?", plan?.privacy || "Add masking and privacy instructions."],
    ["Escalate", "Who should be contacted when data is stale or unavailable?", plan?.owner || "Assign a data readiness owner."],
  ];
  return (
    <Section title="Setup playbook" description="Keep the setup sequence close to the data inventory.">
      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {prompts.map(([title, question, answer]) => (
          <article key={title} className="rounded-xl border border-slate-200 p-3">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-700">{title}</p>
            <p className="mt-2 text-[10px] font-semibold text-slate-800">{question}</p>
            <p className="mt-1 text-[10px] leading-5 text-slate-500">{answer}</p>
          </article>
        ))}
      </div>
      <div className="border-t border-slate-100 p-5">
        <TextArea label="Setup handoff note" value={plan?.handoff || ""} onChange={(value) => plan && onChange({ handoff: value })} placeholder="Write the short sequence another tester should follow." rows={4} />
      </div>
    </Section>
  );
}

function DataOwnershipMatrix({ records, risks, steps }) {
  const owners = Array.from(new Set([...records, ...risks, ...steps].map((item) => item.owner).filter(Boolean)));
  const rows = owners.map((owner) => ({
    owner,
    records: records.filter((item) => item.owner === owner).length,
    risks: risks.filter((item) => item.owner === owner).length,
    steps: steps.filter((item) => item.owner === owner).length,
  }));
  return (
    <Section title="Data ownership matrix" description="Check that setup work is distributed and visible.">
      {rows.length ? (
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.owner} className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-800">{row.owner}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-[9px] text-slate-500">Records</p><p className="mt-1 text-sm font-semibold text-slate-900">{row.records}</p></div>
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-[9px] text-slate-500">Risks</p><p className="mt-1 text-sm font-semibold text-rose-700">{row.risks}</p></div>
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-[9px] text-slate-500">Steps</p><p className="mt-1 text-sm font-semibold text-violet-700">{row.steps}</p></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="No ownership data" description="Assign owners to records, risks, and reset steps." />
      )}
    </Section>
  );
}

function DataHandoffGuide({ plan, records, risks }) {
  const lines = [
    ["Data needed", plan?.scope || "Name the accounts, fixtures, and datasets required."],
    ["Privacy note", plan?.privacy || "State whether values are synthetic, masked, or restricted."],
    ["Availability", records.length ? `${records.length} record(s) are listed for this plan.` : "No records are listed yet."],
    ["Known risk", risks.length ? `${risks.length} data risk(s) should be reviewed before execution.` : "No data risks have been recorded."],
    ["Owner", plan?.owner || "Assign a person or team for setup questions."],
    ["Environment", plan?.environment || "Name where the data should be created or used."],
  ];
  return (
    <Section title="Handoff guide" description="A concise set of facts for the tester receiving the data setup.">
      <div className="grid gap-2 p-5 sm:grid-cols-2">
        {lines.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 p-3">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-700">{value}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export default function TesterTestDataReadinessWorkspace({ reports = [], email = "", onOpenReport }) {
  const [data, setData] = useState(emptyData);
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState("overview");
  const [planFilter, setPlanFilter] = useState("all");
  const [recordFilter, setRecordFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [ascending, setAscending] = useState(false);
  const [modal, setModal] = useState("");
  const [notice, setNotice] = useState("");
  const [planForm, setPlanForm] = useState({ title: "", feature: "", owner: "", environment: "", state: "draft", scope: "", privacy: "" });
  const [recordForm, setRecordForm] = useState({ title: "", planId: "", type: "Account", state: "needed", owner: "", location: "", reset: "", validation: "" });
  const [riskForm, setRiskForm] = useState({ title: "", planId: "", severity: "medium", state: "open", owner: "", impact: "", mitigation: "" });
  const [stepForm, setStepForm] = useState({ title: "", planId: "", state: "planned", owner: "", detail: "" });

  useEffect(() => setData(readData()), []);
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => { if (!notice) return undefined; const timer = window.setTimeout(() => setNotice(""), 3000); return () => window.clearTimeout(timer); }, [notice]);

  const plan = data.plans.find((item) => item.id === selectedId) || null;
  const records = data.records.filter((item) => !selectedId || item.planId === selectedId);
  const risks = data.risks.filter((item) => !selectedId || item.planId === selectedId);
  const steps = data.steps.filter((item) => !selectedId || item.planId === selectedId);
  const filteredRecords = useMemo(() => { const text = query.toLowerCase(); return records.filter((item) => recordFilter === "all" || item.state === recordFilter).filter((item) => !text || `${item.title} ${item.type} ${item.owner} ${item.location}`.toLowerCase().includes(text)).sort((a, b) => ascending ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)); }, [ascending, query, recordFilter, records]);
  const openRisks = risks.filter((item) => !["accepted", "closed"].includes(item.state));
  const validatedRecords = records.filter((item) => item.state === "validated").length;
  const completedSteps = steps.filter((item) => ["done", "skipped"].includes(item.state)).length;
  const checks = [Boolean(plan?.scope), records.length > 0, Boolean(plan?.privacy), steps.length > 0 && steps.every((item) => item.owner), validatedRecords === records.length && records.length > 0, risks.every((item) => item.owner || ["accepted", "closed"].includes(item.state)), Boolean(plan?.owner)];
  const readiness = checks.filter(Boolean).length;
  const readinessPercent = Math.round((readiness / DATA_CHECKS.length) * 100);

  function update(key, items) { setData((current) => ({ ...current, [key]: items })); }
  function addPlan(event) {
    event.preventDefault();
    if (!clean(planForm.title) || data.plans.length >= MAX_PLANS) return;
    const item = { ...planForm, id: makeId("data-plan"), title: clean(planForm.title), feature: clean(planForm.feature), owner: clean(planForm.owner), environment: clean(planForm.environment), scope: clean(planForm.scope), privacy: clean(planForm.privacy), createdAt: now() };
    update("plans", [item, ...data.plans].slice(0, MAX_PLANS)); setSelectedId(item.id); setModal(""); setNotice("Data readiness plan created"); setPlanForm({ title: "", feature: "", owner: "", environment: "", state: "draft", scope: "", privacy: "" });
  }
  function addRecord(event) {
    event.preventDefault();
    if (!clean(recordForm.title) || data.records.length >= MAX_RECORDS) return;
    const item = { ...recordForm, id: makeId("data-record"), planId: recordForm.planId || selectedId, title: clean(recordForm.title), owner: clean(recordForm.owner), location: clean(recordForm.location), reset: clean(recordForm.reset), validation: clean(recordForm.validation), createdAt: now() };
    update("records", [item, ...data.records].slice(0, MAX_RECORDS)); setModal(""); setNotice("Test data record added"); setRecordForm({ title: "", planId: selectedId, type: "Account", state: "needed", owner: "", location: "", reset: "", validation: "" });
  }
  function addRisk(event) {
    event.preventDefault();
    if (!clean(riskForm.title) || data.risks.length >= MAX_RISKS) return;
    const item = { ...riskForm, id: makeId("data-risk"), planId: riskForm.planId || selectedId, title: clean(riskForm.title), owner: clean(riskForm.owner), impact: clean(riskForm.impact), mitigation: clean(riskForm.mitigation), createdAt: now() };
    update("risks", [item, ...data.risks].slice(0, MAX_RISKS)); setModal(""); setNotice("Data risk added"); setRiskForm({ title: "", planId: selectedId, severity: "medium", state: "open", owner: "", impact: "", mitigation: "" });
  }
  function addStep(event) {
    event.preventDefault();
    if (!clean(stepForm.title) || data.steps.length >= MAX_STEPS) return;
    const item = { ...stepForm, id: makeId("data-step"), planId: stepForm.planId || selectedId, title: clean(stepForm.title), owner: clean(stepForm.owner), detail: clean(stepForm.detail), createdAt: now() };
    update("steps", [item, ...data.steps].slice(0, MAX_STEPS)); setModal(""); setNotice("Reset step added"); setStepForm({ title: "", planId: selectedId, state: "planned", owner: "", detail: "" });
  }
  function change(key, itemId, field, value) { update(key, data[key].map((item) => item.id === itemId ? { ...item, [field]: value, updatedAt: now() } : item)); }
  function remove(key, itemId) { update(key, data[key].filter((item) => item.id !== itemId)); setNotice("Item removed"); }
  function attachReport(report) { if (data.reports.some((item) => item.id === report.id)) return; update("reports", [{ id: report.id, title: clean(report.title || report.summary || `Report ${report.id}`), createdAt: now() }, ...data.reports]); setNotice("Report attached"); }
  function addReference() { const title = window.prompt("Reference title"); if (!clean(title)) return; update("references", [{ id: makeId("reference"), title: clean(title), createdAt: now() }, ...data.references]); setNotice("Reference added"); }
  function copySummary() { navigator.clipboard?.writeText([`Data plan: ${plan?.title || "All plans"}`, `Readiness: ${readinessPercent}%`, `Validated records: ${validatedRecords}/${records.length}`, `Open risks: ${openRisks.length}`, `Reset steps: ${completedSteps}/${steps.length}`, plan?.scope || "No scope recorded."].join("\n")); setNotice("Summary copied"); }
  function exportRecords() {
    const rows = [["Record", "Plan", "Type", "State", "Owner", "Location", "Reset", "Validation"], ...filteredRecords.map((item) => [item.title, data.plans.find((planItem) => planItem.id === item.planId)?.title || "", item.type, item.state, item.owner, item.location, item.reset, item.validation])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "tester-data-readiness.csv"; anchor.click(); URL.revokeObjectURL(url); setNotice("Data records exported");
  }

  const tabs = [["overview", "Overview"], ["records", `Records (${records.length})`], ["risks", `Risks (${risks.length})`], ["reset", `Reset steps (${steps.length})`], ["sources", "Sources"]];

  return (
    <section className="mt-8 space-y-5">
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="max-w-3xl"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700"><Database size={16} /> Test data readiness</div><h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Make test data predictable before execution starts.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Track accounts, fixtures, datasets, permissions, reset steps, privacy notes, and data risks in a private tester workspace.</p></div><div className="flex flex-wrap gap-2"><Button icon={Plus} variant="primary" onClick={() => setModal("plan")}>New data plan</Button><Button icon={Copy} onClick={copySummary}>Copy summary</Button></div></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Readiness" value={`${readinessPercent}%`} note={`${readiness} of ${DATA_CHECKS.length} checks`} tone="violet" icon={CheckCircle2} /><Stat label="Validated records" value={validatedRecords} note={`${records.length} records tracked`} tone="emerald" icon={Database} /><Stat label="Open risks" value={openRisks.length} note={`${risks.length} risks recorded`} tone="rose" icon={ShieldAlert} /><Stat label="Reset progress" value={completedSteps} note={`${steps.length} reset steps`} tone="amber" icon={RefreshCw} /></div>
      </div>
      {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"><CheckCircle2 size={16} />{notice}</div>}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">{tabs.map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-t-lg px-3 py-2 text-xs font-semibold ${tab === value ? "border-b-2 border-emerald-600 text-emerald-700" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>)}</div>
      <Section title="Data plan context" description="Focus the workspace on one feature, journey, or environment." action={<Button icon={RefreshCw} onClick={() => { setData(readData()); setNotice("Workspace refreshed"); }}>Refresh</Button>}><div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_180px_170px]"><label className="text-xs font-semibold text-slate-700">Selected plan<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-emerald-500"><option value="">All data plans</option>{data.plans.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="text-xs font-semibold text-slate-700">Plan state<select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-emerald-500"><option value="all">All plans</option>{PLAN_STATES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><div className="flex items-end"><Button icon={Plus} onClick={() => setModal("plan")}>Add plan</Button></div></div><div className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-2 xl:grid-cols-3">{data.plans.filter((item) => planFilter === "all" || item.state === planFilter).map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`rounded-xl border p-4 text-left ${selectedId === item.id ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200"}`}><div className="flex items-start justify-between gap-3"><span className="text-sm font-semibold text-slate-900">{item.title}</span><Badge tone={stateTone(PLAN_STATES, item.state)}>{labelFor(PLAN_STATES, item.state)}</Badge></div><p className="mt-2 line-clamp-2 text-xs text-slate-500">{item.scope || "No scope recorded"}</p><div className="mt-3 flex justify-between text-[11px] text-slate-400"><span>{item.feature || "No feature"}</span><span>{item.owner || "Unassigned"}</span></div></button>)}{!data.plans.length && <div className="md:col-span-2 xl:col-span-3"><Empty title="No data plan yet" description="Create a plan for the records and setup a test needs." action={<Button icon={Plus} variant="primary" onClick={() => setModal("plan")}>Create plan</Button>} /></div>}</div></Section>
      {tab === "overview" && <div className="space-y-5"><div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]"><Section title="Readiness checklist" description="Confirm the data can be used, restored, and explained."><div className="space-y-3 p-5">{DATA_CHECKS.map(([id, title, detail], index) => { const complete = [Boolean(plan?.scope), records.length > 0, Boolean(plan?.privacy), steps.length > 0 && steps.every((item) => item.owner), records.length > 0 && validatedRecords === records.length, risks.every((item) => item.owner || ["accepted", "closed"].includes(item.state)), Boolean(plan?.owner)][index]; return <div key={id} className={`flex gap-3 rounded-xl border p-3 ${complete ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200"}`}><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${complete ? "bg-emerald-600 text-white" : "border border-slate-300 text-transparent"}`}><Check size={13} /></span><div><p className="text-xs font-semibold text-slate-800">{title}</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{detail}</p></div></div>; })}</div></Section><Section title="Data plan notes" description="Write the context a tester needs before requesting access or setup."><div className="space-y-4 p-5"><TextArea label="Privacy and masking" value={plan?.privacy || ""} onChange={(value) => plan && update("plans", data.plans.map((item) => item.id === plan.id ? { ...item, privacy: value, updatedAt: now() } : item))} placeholder="Describe synthetic data, masking, access limits, or approval requirements." rows={5} /><TextArea label="Execution notes" value={plan?.notes || ""} onChange={(value) => plan && update("plans", data.plans.map((item) => item.id === plan.id ? { ...item, notes: value, updatedAt: now() } : item))} placeholder="Record setup order, dependencies, and assumptions." rows={5} /></div></Section></div><div className="grid gap-5 xl:grid-cols-2"><Section title="Data quality guidance" description="Use these prompts to avoid setup surprises."><div className="grid gap-2 p-5 sm:grid-cols-2"><div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3"><p className="text-xs font-semibold text-emerald-900">Validate before use</p><p className="mt-1 text-[11px] leading-5 text-emerald-800/80">Confirm records exist, permissions work, and the expected state is reproducible.</p></div><div className="rounded-xl border border-cyan-100 bg-cyan-50 p-3"><p className="text-xs font-semibold text-cyan-900">Protect sensitive values</p><p className="mt-1 text-[11px] leading-5 text-cyan-800/80">Prefer synthetic data and document any approved access to real-like values.</p></div><div className="rounded-xl border border-violet-100 bg-violet-50 p-3"><p className="text-xs font-semibold text-violet-900">Record reset steps</p><p className="mt-1 text-[11px] leading-5 text-violet-800/80">A successful test is easier to repeat when cleanup and recreation are explicit.</p></div><div className="rounded-xl border border-amber-100 bg-amber-50 p-3"><p className="text-xs font-semibold text-amber-900">Name dependencies</p><p className="mt-1 text-[11px] leading-5 text-amber-800/80">Call out services, feature flags, accounts, or approvals that can block the run.</p></div></div></Section><Section title="Data summary" description="Current inventory for the selected plan."><div className="grid gap-3 p-5 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Accounts and records</p><p className="mt-1 text-2xl font-semibold text-slate-900">{records.length}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Validated</p><p className="mt-1 text-2xl font-semibold text-emerald-700">{validatedRecords}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Open risks</p><p className="mt-1 text-2xl font-semibold text-rose-700">{openRisks.length}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Reset steps</p><p className="mt-1 text-2xl font-semibold text-violet-700">{steps.length}</p></div></div></Section></div><DataSafetyReview plan={plan} records={records} risks={risks} steps={steps} /><SetupPlaybook plan={plan} records={records} steps={steps} onChange={(patch) => plan && update("plans", data.plans.map((item) => item.id === plan.id ? { ...item, ...patch, updatedAt: now() } : item))} /><div className="grid gap-5 xl:grid-cols-2"><DataOwnershipMatrix records={records} risks={risks} steps={steps} /><DataHandoffGuide plan={plan} records={records} risks={risks} /></div></div>}
      {tab === "records" && <Section title="Test data records" description="Track accounts, fixtures, datasets, permissions, and environment setup." action={<div className="flex gap-2"><Button icon={Download} onClick={exportRecords}>Export CSV</Button><Button icon={Plus} variant="primary" onClick={() => setModal("record")}>Add record</Button></div>}><div className="grid gap-3 border-b border-slate-100 p-5 lg:grid-cols-[minmax(0,1fr)_170px_auto]"><label className="relative block"><Search size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search data records..." className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" /></label><select value={recordFilter} onChange={(event) => setRecordFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-xs">{[{ value: "all", label: "All records" }, ...RECORD_STATES].map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><Button icon={ascending ? ArrowUpAZ : ArrowDownAZ} onClick={() => setAscending((value) => !value)}>Name</Button></div>{!filteredRecords.length ? <Empty title="No records match" description="Add a test data record or clear the current filter." action={<Button icon={Plus} onClick={() => setModal("record")}>Add record</Button>} /> : <div className="divide-y divide-slate-100">{filteredRecords.slice(0, PAGE_SIZE).map((item) => <div key={item.id} className="p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-900">{item.title}</h4><Badge tone={stateTone(RECORD_STATES, item.state)}>{labelFor(RECORD_STATES, item.state)}</Badge><Badge>{item.type}</Badge></div><p className="mt-2 text-xs text-slate-600">Location: {item.location || "Not recorded"}</p><p className="mt-1 text-xs text-slate-600">Validation: {item.validation || "Not recorded"}</p><p className="mt-2 text-[11px] text-slate-500">Owner: {item.owner || "Unassigned"} · Reset: {item.reset || "Not recorded"}</p></div><div className="flex gap-2"><select value={item.state} onChange={(event) => change("records", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{RECORD_STATES.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => remove("records", item.id)}>Remove</Button></div></div></div>)}</div>}</Section>}
      {tab === "risks" && <Section title="Data risks" description="Track privacy, availability, staleness, permission, and reset risks." action={<Button icon={Plus} variant="primary" onClick={() => setModal("risk")}>Add risk</Button>}>{!risks.length ? <Empty title="No data risks recorded" description="Add a risk when test data may reduce confidence or create exposure." action={<Button icon={Plus} onClick={() => setModal("risk")}>Add risk</Button>} /> : <div className="divide-y divide-slate-100">{risks.filter((item) => riskFilter === "all" || item.state === riskFilter).map((item) => <div key={item.id} className="p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-900">{item.title}</h4><Badge tone={stateTone(RISK_LEVELS, item.severity)}>{labelFor(RISK_LEVELS, item.severity)}</Badge><Badge tone={item.state === "closed" || item.state === "accepted" ? "emerald" : "rose"}>{labelFor(RISK_STATES, item.state)}</Badge></div><p className="mt-2 text-xs text-slate-600">{item.impact || "Impact not described."}</p><p className="mt-2 text-[11px] text-slate-500">Owner: {item.owner || "Unassigned"} · Mitigation: {item.mitigation || "Not recorded"}</p></div><div className="flex gap-2"><select value={item.state} onChange={(event) => change("risks", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{RISK_STATES.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => remove("risks", item.id)}>Remove</Button></div></div></div>)}</div>}</Section>}
      {tab === "reset" && <Section title="Reset and setup steps" description="Make data cleanup and recreation repeatable for the next tester." action={<Button icon={Plus} variant="primary" onClick={() => setModal("step")}>Add step</Button>}>{!steps.length ? <Empty title="No reset steps" description="Document how to seed, clean, restore, or recreate test data." action={<Button icon={Plus} onClick={() => setModal("step")}>Add step</Button>} /> : <div className="divide-y divide-slate-100">{steps.map((item) => <div key={item.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><h4 className="text-sm font-semibold text-slate-900">{item.title}</h4><Badge tone={item.state === "done" ? "emerald" : "violet"}>{item.state}</Badge></div><p className="mt-1 text-xs text-slate-500">{item.detail || "No step detail"} · Owner: {item.owner || "Unassigned"}</p></div><div className="flex gap-2"><select value={item.state} onChange={(event) => change("steps", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{["planned", "in-progress", "done", "skipped"].map((state) => <option key={state} value={state}>{state}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => remove("steps", item.id)}>Remove</Button></div></div>)}</div>}</Section>}
      {tab === "sources" && <div className="grid gap-5 xl:grid-cols-2"><Section title="Attached reports" description="Use submitted reports to support data readiness decisions."><div className="divide-y divide-slate-100">{reports.slice(0, 20).map((report) => { const attached = data.reports.some((item) => item.id === report.id); return <div key={report.id} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{report.title || report.summary || `Report ${report.id}`}</p><p className="mt-1 text-[11px] text-slate-500">Available tester report</p></div><div className="flex gap-2">{onOpenReport && <Button icon={ExternalLink} onClick={() => onOpenReport(report)}>Open</Button>}<Button icon={attached ? Check : Plus} onClick={() => attachReport(report)} disabled={attached}>{attached ? "Attached" : "Attach"}</Button></div></div>; })}{!reports.length && <Empty title="No reports available" description="Submitted reports will appear here when available." />}</div></Section><Section title="References" description="Keep data documentation, tickets, and approvals nearby." action={<Button icon={Plus} onClick={addReference}>Add reference</Button>}><div className="divide-y divide-slate-100">{data.references.map((reference) => <div key={reference.id} className="flex items-center justify-between gap-3 p-4"><div><p className="text-xs font-semibold text-slate-800">{reference.title}</p><p className="mt-1 text-[11px] text-slate-400">{dateLabel(reference.createdAt)}</p></div><Button variant="danger" icon={Trash2} onClick={() => remove("references", reference.id)}>Remove</Button></div>)}{!data.references.length && <Empty title="No references yet" description="Add a source that supports the setup decision." action={<Button icon={Plus} onClick={addReference}>Add reference</Button>} />}</div></Section></div>}

      {modal === "plan" && <Modal title="Create test data plan" onClose={() => setModal("")}><form onSubmit={addPlan} className="space-y-4"><Field label="Plan title" value={planForm.title} onChange={(value) => setPlanForm({ ...planForm, title: value })} placeholder="Checkout test data readiness" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Feature or journey" value={planForm.feature} onChange={(value) => setPlanForm({ ...planForm, feature: value })} placeholder="Checkout / account recovery" /><Field label="Owner" value={planForm.owner} onChange={(value) => setPlanForm({ ...planForm, owner: value })} placeholder={email || "Tester or team"} /><Field label="Environment" value={planForm.environment} onChange={(value) => setPlanForm({ ...planForm, environment: value })} placeholder="Staging / Chrome" /><Field label="State" options={PLAN_STATES} value={planForm.state} onChange={(value) => setPlanForm({ ...planForm, state: value })} /></div><TextArea label="Scope" value={planForm.scope} onChange={(value) => setPlanForm({ ...planForm, scope: value })} placeholder="Accounts, fixtures, datasets, permissions, and exclusions" rows={4} /><TextArea label="Privacy and masking" value={planForm.privacy} onChange={(value) => setPlanForm({ ...planForm, privacy: value })} placeholder="Synthetic data, masking, access approvals, and retention notes" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Create plan</Button></div></form></Modal>}
      {modal === "record" && <Modal title="Add test data record" onClose={() => setModal("")}><form onSubmit={addRecord} className="space-y-4"><Field label="Record title" value={recordForm.title} onChange={(value) => setRecordForm({ ...recordForm, title: value })} placeholder="Verified customer account" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Plan" options={data.plans.map((item) => ({ value: item.id, label: item.title }))} value={recordForm.planId || selectedId} onChange={(value) => setRecordForm({ ...recordForm, planId: value })} /><Field label="Type" options={RECORD_TYPES.map((value) => ({ value, label: value }))} value={recordForm.type} onChange={(value) => setRecordForm({ ...recordForm, type: value })} /><Field label="State" options={RECORD_STATES} value={recordForm.state} onChange={(value) => setRecordForm({ ...recordForm, state: value })} /><Field label="Owner" value={recordForm.owner} onChange={(value) => setRecordForm({ ...recordForm, owner: value })} placeholder="Data owner" /></div><Field label="Location or identifier" value={recordForm.location} onChange={(value) => setRecordForm({ ...recordForm, location: value })} placeholder="Fixture name, vault path, or safe identifier" /><TextArea label="Reset path" value={recordForm.reset} onChange={(value) => setRecordForm({ ...recordForm, reset: value })} placeholder="How can the record be restored or recreated?" /><TextArea label="Validation note" value={recordForm.validation} onChange={(value) => setRecordForm({ ...recordForm, validation: value })} placeholder="How was availability or correctness confirmed?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add record</Button></div></form></Modal>}
      {modal === "risk" && <Modal title="Add data risk" onClose={() => setModal("")}><form onSubmit={addRisk} className="space-y-4"><Field label="Risk title" value={riskForm.title} onChange={(value) => setRiskForm({ ...riskForm, title: value })} placeholder="Account data may expire before execution" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Plan" options={data.plans.map((item) => ({ value: item.id, label: item.title }))} value={riskForm.planId || selectedId} onChange={(value) => setRiskForm({ ...riskForm, planId: value })} /><Field label="Severity" options={RISK_LEVELS} value={riskForm.severity} onChange={(value) => setRiskForm({ ...riskForm, severity: value })} /><Field label="State" options={RISK_STATES} value={riskForm.state} onChange={(value) => setRiskForm({ ...riskForm, state: value })} /><Field label="Owner" value={riskForm.owner} onChange={(value) => setRiskForm({ ...riskForm, owner: value })} placeholder="Risk owner" /></div><TextArea label="Impact" value={riskForm.impact} onChange={(value) => setRiskForm({ ...riskForm, impact: value })} placeholder="How could this data issue affect test confidence?" required /><TextArea label="Mitigation" value={riskForm.mitigation} onChange={(value) => setRiskForm({ ...riskForm, mitigation: value })} placeholder="Refresh, replace, mask, or accept the data risk" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add risk</Button></div></form></Modal>}
      {modal === "step" && <Modal title="Add reset step" onClose={() => setModal("")}><form onSubmit={addStep} className="space-y-4"><Field label="Step title" value={stepForm.title} onChange={(value) => setStepForm({ ...stepForm, title: value })} placeholder="Restore account to verified state" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Plan" options={data.plans.map((item) => ({ value: item.id, label: item.title }))} value={stepForm.planId || selectedId} onChange={(value) => setStepForm({ ...stepForm, planId: value })} /><Field label="Owner" value={stepForm.owner} onChange={(value) => setStepForm({ ...stepForm, owner: value })} placeholder="Setup owner" /></div><TextArea label="Step detail" value={stepForm.detail} onChange={(value) => setStepForm({ ...stepForm, detail: value })} placeholder="Command, action, fixture, or verification needed" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add step</Button></div></form></Modal>}
    </section>
  );
}
