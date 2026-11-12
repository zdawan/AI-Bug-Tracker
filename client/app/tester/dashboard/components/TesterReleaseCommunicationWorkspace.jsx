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
  FileText,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";

const STORAGE_KEY = "tester-release-communication-v1";
const MAX_PLANS = 25;
const MAX_UPDATES = 140;
const MAX_STAKEHOLDERS = 100;
const MAX_DECISIONS = 100;
const MAX_REPORTS = 100;
const PAGE_SIZE = 8;

const PLAN_STATES = [
  { value: "draft", label: "Draft", tone: "slate" },
  { value: "preparing", label: "Preparing", tone: "cyan" },
  { value: "review", label: "In review", tone: "violet" },
  { value: "ready", label: "Ready", tone: "emerald" },
  { value: "blocked", label: "Blocked", tone: "rose" },
];
const UPDATE_STATES = [
  { value: "draft", label: "Draft" },
  { value: "ready", label: "Ready" },
  { value: "sent", label: "Sent" },
  { value: "acknowledged", label: "Acknowledged" },
];
const UPDATE_TYPES = ["Release summary", "Risk update", "Test status", "Incident note", "Handoff", "Follow-up"];
const AUDIENCES = ["Release team", "Product", "Engineering", "Support", "Leadership", "Customers"];
const DECISION_STATES = ["open", "decided", "deferred", "rejected"];
const READINESS_CHECKS = [
  ["scope", "Release scope is named", "The build, feature area, and audience are clear."],
  ["status", "Test status is summarized", "The message explains what passed and what remains."],
  ["risks", "Risks are visible", "Open risks are stated without hiding uncertainty."],
  ["owner", "Communication owner is assigned", "One person owns the update and follow-up."],
  ["audience", "Audience is selected", "Recipients know why the update is relevant."],
  ["decision", "Decision request is clear", "The reader knows what response or action is needed."],
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
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
  }[tone] || "border-slate-200 bg-slate-50 text-slate-700";
}
function initialData() {
  return { plans: [], updates: [], stakeholders: [], decisions: [], reports: [] };
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
function TextArea({ label, value, onChange, placeholder, rows = 4 }) {
  return <label className="block text-xs font-semibold text-slate-700">{label}<textarea value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-5 text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100" /></label>;
}
function Stat({ label, value, note, icon: Icon, tone = "violet" }) {
  const colors = { violet: "bg-violet-100 text-violet-700", emerald: "bg-emerald-100 text-emerald-700", rose: "bg-rose-100 text-rose-700", amber: "bg-amber-100 text-amber-700" };
  return <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p></div><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors[tone]}`}><Icon size={17} /></span></div><p className="mt-2 text-[11px] leading-5 text-slate-500">{note}</p></article>;
}
function Empty({ title, description, action }) {
  return <div className="px-5 py-12 text-center"><Mail className="mx-auto text-slate-300" size={32} /><p className="mt-3 text-sm font-semibold text-slate-800">{title}</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">{description}</p>{action && <div className="mt-4">{action}</div>}</div>;
}
function Modal({ title, onClose, children }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 p-5"><h2 className="text-base font-semibold text-slate-950">{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={17} /></button></div><div className="p-5">{children}</div></div></div>;
}

export default function TesterReleaseCommunicationWorkspace({ reports = [], email = "", onOpenReport }) {
  const [data, setData] = useState(initialData);
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState("overview");
  const [planFilter, setPlanFilter] = useState("all");
  const [updateFilter, setUpdateFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [ascending, setAscending] = useState(false);
  const [modal, setModal] = useState("");
  const [notice, setNotice] = useState("");
  const [planForm, setPlanForm] = useState({ title: "", release: "", owner: "", audience: "Release team", state: "draft", scope: "", decision: "" });
  const [updateForm, setUpdateForm] = useState({ title: "", planId: "", type: "Release summary", state: "draft", audience: "Release team", author: "", body: "" });
  const [stakeholderForm, setStakeholderForm] = useState({ name: "", planId: "", role: "", channel: "", state: "pending", note: "" });
  const [decisionForm, setDecisionForm] = useState({ title: "", planId: "", state: "open", owner: "", context: "", outcome: "" });

  useEffect(() => setData(readData()), []);
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => { if (!notice) return undefined; const timer = window.setTimeout(() => setNotice(""), 3000); return () => window.clearTimeout(timer); }, [notice]);

  const plan = data.plans.find((item) => item.id === selectedId) || null;
  const updates = data.updates.filter((item) => !selectedId || item.planId === selectedId);
  const stakeholders = data.stakeholders.filter((item) => !selectedId || item.planId === selectedId);
  const decisions = data.decisions.filter((item) => !selectedId || item.planId === selectedId);
  const filteredUpdates = useMemo(() => { const text = query.toLowerCase(); return updates.filter((item) => updateFilter === "all" || item.state === updateFilter).filter((item) => !text || `${item.title} ${item.type} ${item.audience} ${item.body}`.toLowerCase().includes(text)).sort((a, b) => ascending ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)); }, [ascending, query, updateFilter, updates]);
  const sentUpdates = updates.filter((item) => ["sent", "acknowledged"].includes(item.state)).length;
  const acknowledged = stakeholders.filter((item) => item.state === "acknowledged").length;
  const openDecisions = decisions.filter((item) => item.state === "open").length;
  const readinessChecks = [Boolean(plan?.scope), updates.length > 0, Boolean(plan?.decision), Boolean(plan?.owner), Boolean(plan?.audience), decisions.length === 0 || decisions.every((item) => item.state !== "open")];
  const readiness = Math.round((readinessChecks.filter(Boolean).length / READINESS_CHECKS.length) * 100);

  function update(key, items) { setData((current) => ({ ...current, [key]: items })); }
  function addPlan(event) {
    event.preventDefault();
    if (!clean(planForm.title) || data.plans.length >= MAX_PLANS) return;
    const item = { ...planForm, id: makeId("comms"), title: clean(planForm.title), release: clean(planForm.release), owner: clean(planForm.owner), scope: clean(planForm.scope), decision: clean(planForm.decision), createdAt: now() };
    update("plans", [item, ...data.plans].slice(0, MAX_PLANS)); setSelectedId(item.id); setModal(""); setNotice("Communication plan created"); setPlanForm({ title: "", release: "", owner: "", audience: "Release team", state: "draft", scope: "", decision: "" });
  }
  function addUpdate(event) {
    event.preventDefault();
    if (!clean(updateForm.title) || data.updates.length >= MAX_UPDATES) return;
    const item = { ...updateForm, id: makeId("update"), planId: updateForm.planId || selectedId, title: clean(updateForm.title), author: clean(updateForm.author), body: clean(updateForm.body), createdAt: now() };
    update("updates", [item, ...data.updates].slice(0, MAX_UPDATES)); setModal(""); setNotice("Release update drafted"); setUpdateForm({ title: "", planId: selectedId, type: "Release summary", state: "draft", audience: "Release team", author: "", body: "" });
  }
  function addStakeholder(event) {
    event.preventDefault();
    if (!clean(stakeholderForm.name) || data.stakeholders.length >= MAX_STAKEHOLDERS) return;
    const item = { ...stakeholderForm, id: makeId("stakeholder"), planId: stakeholderForm.planId || selectedId, name: clean(stakeholderForm.name), role: clean(stakeholderForm.role), channel: clean(stakeholderForm.channel), note: clean(stakeholderForm.note), createdAt: now() };
    update("stakeholders", [item, ...data.stakeholders].slice(0, MAX_STAKEHOLDERS)); setModal(""); setNotice("Stakeholder added"); setStakeholderForm({ name: "", planId: selectedId, role: "", channel: "", state: "pending", note: "" });
  }
  function addDecision(event) {
    event.preventDefault();
    if (!clean(decisionForm.title) || data.decisions.length >= MAX_DECISIONS) return;
    const item = { ...decisionForm, id: makeId("decision"), planId: decisionForm.planId || selectedId, title: clean(decisionForm.title), owner: clean(decisionForm.owner), context: clean(decisionForm.context), outcome: clean(decisionForm.outcome), createdAt: now() };
    update("decisions", [item, ...data.decisions].slice(0, MAX_DECISIONS)); setModal(""); setNotice("Decision note added"); setDecisionForm({ title: "", planId: selectedId, state: "open", owner: "", context: "", outcome: "" });
  }
  function change(key, itemId, field, value) { update(key, data[key].map((item) => item.id === itemId ? { ...item, [field]: value, updatedAt: now() } : item)); }
  function remove(key, itemId) { update(key, data[key].filter((item) => item.id !== itemId)); setNotice("Item removed"); }
  function copySummary() { navigator.clipboard?.writeText([`Communication plan: ${plan?.title || "All plans"}`, `Readiness: ${readiness}%`, `Updates sent: ${sentUpdates}/${updates.length}`, `Stakeholders acknowledged: ${acknowledged}/${stakeholders.length}`, `Open decisions: ${openDecisions}`, plan?.decision || "No decision request recorded."].join("\n")); setNotice("Communication summary copied"); }
  function exportUpdates() { const rows = [["Update", "Plan", "Type", "State", "Audience", "Author", "Body"], ...filteredUpdates.map((item) => [item.title, data.plans.find((planItem) => planItem.id === item.planId)?.title || "", item.type, item.state, item.audience, item.author, item.body])]; const csv = rows.map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(",")).join("\n"); const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "tester-release-communications.csv"; anchor.click(); URL.revokeObjectURL(url); setNotice("Updates exported"); }
  function attachReport(report) { if (data.reports.some((item) => item.id === report.id)) return; update("reports", [{ id: report.id, title: clean(report.title || report.summary || `Report ${report.id}`), createdAt: now() }, ...data.reports]); setNotice("Report attached"); }

  const tabs = [["overview", "Overview"], ["updates", `Updates (${updates.length})`], ["stakeholders", `Stakeholders (${stakeholders.length})`], ["decisions", `Decisions (${decisions.length})`], ["sources", "Sources"]];

  return (
    <section className="mt-8 space-y-5">
      <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-5 shadow-sm sm:p-7"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="max-w-3xl"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700"><Mail size={16} /> Release communication hub</div><h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Make release updates clear, timely, and actionable.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Draft release summaries, identify audiences, record acknowledgements, and keep decision context close to the tester&apos;s evidence.</p></div><div className="flex flex-wrap gap-2"><Button icon={Plus} variant="primary" onClick={() => setModal("plan")}>New communication plan</Button><Button icon={Copy} onClick={copySummary}>Copy summary</Button></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Readiness" value={`${readiness}%`} note={`${readinessChecks.filter(Boolean).length} of ${READINESS_CHECKS.length} checks`} tone="violet" icon={CheckCircle2} /><Stat label="Updates sent" value={sentUpdates} note={`${updates.length} updates drafted`} tone="emerald" icon={Send} /><Stat label="Acknowledged" value={acknowledged} note={`${stakeholders.length} stakeholders listed`} tone="amber" icon={Users} /><Stat label="Open decisions" value={openDecisions} note={`${decisions.length} decisions tracked`} tone="rose" icon={ShieldAlert} /></div></div>
      {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"><CheckCircle2 size={16} />{notice}</div>}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">{tabs.map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-t-lg px-3 py-2 text-xs font-semibold ${tab === value ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>)}</div>
      <Section title="Communication plan context" description="Focus messages and decisions on one release or handoff." action={<Button icon={RefreshCw} onClick={() => { setData(readData()); setNotice("Workspace refreshed"); }}>Refresh</Button>}><div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_180px_auto]"><label className="text-xs font-semibold text-slate-700">Selected plan<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-blue-500"><option value="">All communication plans</option>{data.plans.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="text-xs font-semibold text-slate-700">Plan state<select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"><option value="all">All plans</option>{PLAN_STATES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><div className="flex items-end"><Button icon={Plus} onClick={() => setModal("plan")}>Add plan</Button></div></div><div className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-2 xl:grid-cols-3">{data.plans.filter((item) => planFilter === "all" || item.state === planFilter).map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`rounded-xl border p-4 text-left ${selectedId === item.id ? "border-blue-300 bg-blue-50/50" : "border-slate-200"}`}><div className="flex items-start justify-between gap-3"><span className="text-sm font-semibold text-slate-900">{item.title}</span><Badge tone={toneClasses(PLAN_STATES.find((state) => state.value === item.state)?.tone)}>{labelFor(PLAN_STATES, item.state)}</Badge></div><p className="mt-2 line-clamp-2 text-xs text-slate-500">{item.scope || "No scope recorded"}</p><div className="mt-3 flex justify-between text-[11px] text-slate-400"><span>{item.release || "No release"}</span><span>{item.owner || "Unassigned"}</span></div></button>)}{!data.plans.length && <div className="md:col-span-2 xl:col-span-3"><Empty title="No communication plan yet" description="Create a plan for a release, incident, test result, or stakeholder handoff." action={<Button icon={Plus} variant="primary" onClick={() => setModal("plan")}>Create plan</Button>} /></div>}</div></Section>
      {tab === "overview" && <div className="space-y-5"><div className="grid gap-5 xl:grid-cols-2"><Section title="Communication readiness" description="Confirm the message can be understood and acted on."><div className="space-y-3 p-5">{READINESS_CHECKS.map(([id, title, detail], index) => { const complete = [Boolean(plan?.scope), updates.length > 0, Boolean(plan?.decision), Boolean(plan?.owner), Boolean(plan?.audience), decisions.length === 0 || decisions.every((item) => item.state !== "open")][index]; return <div key={id} className={`flex gap-3 rounded-xl border p-3 ${complete ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200"}`}><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${complete ? "bg-emerald-600 text-white" : "border border-slate-300 text-transparent"}`}><Check size={13} /></span><div><p className="text-xs font-semibold text-slate-800">{title}</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{detail}</p></div></div>; })}</div></Section><Section title="Decision request" description="State what the audience needs to decide or do next."><div className="space-y-4 p-5"><TextArea label="Requested decision or action" value={plan?.decision || ""} onChange={(value) => plan && update("plans", data.plans.map((item) => item.id === plan.id ? { ...item, decision: value, updatedAt: now() } : item))} placeholder="Approve rollout, confirm support coverage, review known risk, or acknowledge handoff." rows={5} /><TextArea label="Context and limitations" value={plan?.notes || ""} onChange={(value) => plan && update("plans", data.plans.map((item) => item.id === plan.id ? { ...item, notes: value, updatedAt: now() } : item))} placeholder="What should readers know before responding?" rows={5} /></div></Section></div><Section title="Communication guidance" description="Use these principles when drafting a release update."><div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl border border-blue-100 bg-blue-50 p-3"><p className="text-xs font-semibold text-blue-900">Lead with impact</p><p className="mt-1 text-[11px] leading-5 text-blue-800/80">Explain who is affected and why the update matters.</p></div><div className="rounded-xl border border-violet-100 bg-violet-50 p-3"><p className="text-xs font-semibold text-violet-900">Separate facts</p><p className="mt-1 text-[11px] leading-5 text-violet-800/80">Distinguish observed test results from assumptions or plans.</p></div><div className="rounded-xl border border-amber-100 bg-amber-50 p-3"><p className="text-xs font-semibold text-amber-900">Name uncertainty</p><p className="mt-1 text-[11px] leading-5 text-amber-800/80">A visible limitation is more useful than an overconfident summary.</p></div><div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3"><p className="text-xs font-semibold text-emerald-900">Close the loop</p><p className="mt-1 text-[11px] leading-5 text-emerald-800/80">Record acknowledgements and decisions so the handoff does not disappear.</p></div></div></Section></div>}
      {tab === "updates" && <Section title="Release updates" description="Draft, filter, and export audience-specific communication." action={<div className="flex gap-2"><Button icon={Download} onClick={exportUpdates}>Export CSV</Button><Button icon={Plus} variant="primary" onClick={() => setModal("update")}>Add update</Button></div>}><div className="grid gap-3 border-b border-slate-100 p-5 lg:grid-cols-[minmax(0,1fr)_170px_auto]"><label className="relative block"><Search size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search updates..." className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></label><select value={updateFilter} onChange={(event) => setUpdateFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-xs">{[{ value: "all", label: "All updates" }, ...UPDATE_STATES].map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><Button icon={ascending ? ArrowUpAZ : ArrowDownAZ} onClick={() => setAscending((value) => !value)}>Name</Button></div>{!filteredUpdates.length ? <Empty title="No updates match" description="Draft an update or clear the current search and filter." action={<Button icon={Plus} onClick={() => setModal("update")}>Add update</Button>} /> : <div className="divide-y divide-slate-100">{filteredUpdates.slice(0, PAGE_SIZE).map((item) => <div key={item.id} className="p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-900">{item.title}</h4><Badge>{item.type}</Badge><Badge tone={item.state === "acknowledged" ? "emerald" : "violet"}>{labelFor(UPDATE_STATES, item.state)}</Badge></div><p className="mt-2 text-xs leading-5 text-slate-600">{item.body || "No update body written."}</p><p className="mt-2 text-[11px] text-slate-500">Audience: {item.audience} · Author: {item.author || "Unassigned"}</p></div><div className="flex gap-2"><select value={item.state} onChange={(event) => change("updates", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{UPDATE_STATES.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => remove("updates", item.id)}>Remove</Button></div></div></div>)}</div>}</Section>}
      {tab === "stakeholders" && <Section title="Stakeholder acknowledgements" description="Track who received the update and whether they responded." action={<Button icon={Plus} variant="primary" onClick={() => setModal("stakeholder")}>Add stakeholder</Button>}>{!stakeholders.length ? <Empty title="No stakeholders listed" description="Add the people or teams who need to receive and acknowledge the release update." action={<Button icon={Plus} onClick={() => setModal("stakeholder")}>Add stakeholder</Button>} /> : <div className="divide-y divide-slate-100">{stakeholders.map((item) => <div key={item.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><h4 className="text-sm font-semibold text-slate-900">{item.name}</h4><Badge tone={item.state === "acknowledged" ? "emerald" : "amber"}>{item.state}</Badge></div><p className="mt-1 text-xs text-slate-500">{item.role || "Role not recorded"} · {item.channel || "Channel not recorded"}</p><p className="mt-1 text-[11px] text-slate-500">{item.note || "No acknowledgement note"}</p></div><div className="flex gap-2"><select value={item.state} onChange={(event) => change("stakeholders", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{["pending", "sent", "acknowledged", "declined"].map((state) => <option key={state} value={state}>{state}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => remove("stakeholders", item.id)}>Remove</Button></div></div>)}</div>}</Section>}
      {tab === "decisions" && <Section title="Decision log" description="Keep release questions, outcomes, and follow-up context in one place." action={<Button icon={Plus} variant="primary" onClick={() => setModal("decision")}>Add decision</Button>}>{!decisions.length ? <Empty title="No decisions recorded" description="Add an open question or decision that should be visible in the release handoff." action={<Button icon={Plus} onClick={() => setModal("decision")}>Add decision</Button>} /> : <div className="divide-y divide-slate-100">{decisions.map((item) => <div key={item.id} className="p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex items-center gap-2"><h4 className="text-sm font-semibold text-slate-900">{item.title}</h4><Badge tone={item.state === "decided" ? "emerald" : item.state === "open" ? "rose" : "amber"}>{item.state}</Badge></div><p className="mt-2 text-xs text-slate-600">{item.context || "No context recorded."}</p><p className="mt-2 text-[11px] text-slate-500">Owner: {item.owner || "Unassigned"} · Outcome: {item.outcome || "Pending"}</p></div><div className="flex gap-2"><select value={item.state} onChange={(event) => change("decisions", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{DECISION_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => remove("decisions", item.id)}>Remove</Button></div></div></div>)}</div>}</Section>}
      {tab === "sources" && <Section title="Supporting reports" description="Attach tester reports that support the communication plan." action={<Badge>{data.reports.length}</Badge>}><div className="divide-y divide-slate-100">{reports.slice(0, 20).map((report) => { const attached = data.reports.some((item) => item.id === report.id); return <div key={report.id} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{report.title || report.summary || `Report ${report.id}`}</p><p className="mt-1 text-[11px] text-slate-500">Available tester report</p></div><div className="flex gap-2">{onOpenReport && <Button icon={ExternalLink} onClick={() => onOpenReport(report)}>Open</Button>}<Button icon={attached ? Check : Plus} onClick={() => attachReport(report)} disabled={attached}>{attached ? "Attached" : "Attach"}</Button></div></div>; })}{!reports.length && <Empty title="No reports available" description="Submitted reports will appear here when available." />}</div></Section>}

      {modal === "plan" && <Modal title="Create communication plan" onClose={() => setModal("")}><form onSubmit={addPlan} className="space-y-4"><Field label="Plan title" value={planForm.title} onChange={(value) => setPlanForm({ ...planForm, title: value })} placeholder="Checkout release communication" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Release / build" value={planForm.release} onChange={(value) => setPlanForm({ ...planForm, release: value })} placeholder="2.4.0 / build 184" /><Field label="Owner" value={planForm.owner} onChange={(value) => setPlanForm({ ...planForm, owner: value })} placeholder={email || "Tester or team"} /><Field label="Audience" options={AUDIENCES.map((value) => ({ value, label: value }))} value={planForm.audience} onChange={(value) => setPlanForm({ ...planForm, audience: value })} /><Field label="State" options={PLAN_STATES} value={planForm.state} onChange={(value) => setPlanForm({ ...planForm, state: value })} /></div><TextArea label="Scope" value={planForm.scope} onChange={(value) => setPlanForm({ ...planForm, scope: value })} placeholder="What release or test result is being communicated?" required /><TextArea label="Decision request" value={planForm.decision} onChange={(value) => setPlanForm({ ...planForm, decision: value })} placeholder="What should the audience decide or do?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Create plan</Button></div></form></Modal>}
      {modal === "update" && <Modal title="Draft release update" onClose={() => setModal("")}><form onSubmit={addUpdate} className="space-y-4"><Field label="Update title" value={updateForm.title} onChange={(value) => setUpdateForm({ ...updateForm, title: value })} placeholder="Regression status update" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Plan" options={data.plans.map((item) => ({ value: item.id, label: item.title }))} value={updateForm.planId || selectedId} onChange={(value) => setUpdateForm({ ...updateForm, planId: value })} /><Field label="Type" options={UPDATE_TYPES.map((value) => ({ value, label: value }))} value={updateForm.type} onChange={(value) => setUpdateForm({ ...updateForm, type: value })} /><Field label="Audience" options={AUDIENCES.map((value) => ({ value, label: value }))} value={updateForm.audience} onChange={(value) => setUpdateForm({ ...updateForm, audience: value })} /><Field label="Author" value={updateForm.author} onChange={(value) => setUpdateForm({ ...updateForm, author: value })} placeholder={email || "Tester"} /></div><Field label="State" options={UPDATE_STATES} value={updateForm.state} onChange={(value) => setUpdateForm({ ...updateForm, state: value })} /><TextArea label="Message" value={updateForm.body} onChange={(value) => setUpdateForm({ ...updateForm, body: value })} placeholder="What changed, what passed, what remains, and what action is requested?" rows={7} required /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Save update</Button></div></form></Modal>}
      {modal === "stakeholder" && <Modal title="Add stakeholder" onClose={() => setModal("")}><form onSubmit={addStakeholder} className="space-y-4"><Field label="Name or team" value={stakeholderForm.name} onChange={(value) => setStakeholderForm({ ...stakeholderForm, name: value })} placeholder="Release manager or support team" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Plan" options={data.plans.map((item) => ({ value: item.id, label: item.title }))} value={stakeholderForm.planId || selectedId} onChange={(value) => setStakeholderForm({ ...stakeholderForm, planId: value })} /><Field label="Role" value={stakeholderForm.role} onChange={(value) => setStakeholderForm({ ...stakeholderForm, role: value })} placeholder="Product, engineering, support" /><Field label="Channel" value={stakeholderForm.channel} onChange={(value) => setStakeholderForm({ ...stakeholderForm, channel: value })} placeholder="Slack, email, meeting" /></div><TextArea label="Focus note" value={stakeholderForm.note} onChange={(value) => setStakeholderForm({ ...stakeholderForm, note: value })} placeholder="What should this stakeholder review?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add stakeholder</Button></div></form></Modal>}
      {modal === "decision" && <Modal title="Add decision note" onClose={() => setModal("")}><form onSubmit={addDecision} className="space-y-4"><Field label="Decision title" value={decisionForm.title} onChange={(value) => setDecisionForm({ ...decisionForm, title: value })} placeholder="Proceed with staged rollout?" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Plan" options={data.plans.map((item) => ({ value: item.id, label: item.title }))} value={decisionForm.planId || selectedId} onChange={(value) => setDecisionForm({ ...decisionForm, planId: value })} /><Field label="Owner" value={decisionForm.owner} onChange={(value) => setDecisionForm({ ...decisionForm, owner: value })} placeholder="Decision owner" /><Field label="State" options={DECISION_STATES.map((value) => ({ value, label: value }))} value={decisionForm.state} onChange={(value) => setDecisionForm({ ...decisionForm, state: value })} /></div><TextArea label="Context" value={decisionForm.context} onChange={(value) => setDecisionForm({ ...decisionForm, context: value })} placeholder="Facts, evidence, and constraints behind the question." /><TextArea label="Outcome" value={decisionForm.outcome} onChange={(value) => setDecisionForm({ ...decisionForm, outcome: value })} placeholder="Decision, owner, or follow-up once resolved." /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Save decision</Button></div></form></Modal>}
    </section>
  );
}
