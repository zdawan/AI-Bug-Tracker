"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";

const STORAGE_KEY = "admin-maintenance-windows-v1";
const STATES = ["draft", "proposed", "review", "approved", "scheduled", "active", "completed", "cancelled", "rolled-back"];
const RISKS = ["critical", "high", "medium", "low"];
const TYPES = ["release", "migration", "infrastructure", "database", "security", "dependency", "backup", "recovery", "network"];
const ENVIRONMENTS = ["staging", "production", "disaster-recovery", "shared-services"];
const APPROVAL_STATES = ["pending", "approved", "rejected", "expired"];
const EVIDENCE_TYPES = ["runbook", "test", "approval", "calendar", "monitoring", "rollback", "communication", "incident"];
const CONTROL_PROMPTS = [
  "Confirm window owner",
  "Confirm business owner",
  "Confirm technical owner",
  "Confirm support owner",
  "Confirm start timezone",
  "Confirm end timezone",
  "Confirm preparation time",
  "Confirm recovery buffer",
  "Confirm affected service",
  "Confirm affected users",
  "Confirm affected data",
  "Confirm environment",
  "Confirm maintenance type",
  "Confirm risk level",
  "Confirm implementation steps",
  "Confirm validation steps",
  "Confirm rollback steps",
  "Confirm rollback trigger",
  "Confirm backup point",
  "Confirm restore point",
  "Confirm monitoring dashboard",
  "Confirm alert owner",
  "Confirm on-call coverage",
  "Confirm escalation path",
  "Confirm dependency readiness",
  "Confirm freeze conflict",
  "Confirm release conflict",
  "Confirm incident conflict",
  "Confirm customer conflict",
  "Confirm support conflict",
  "Confirm communication audience",
  "Confirm communication channel",
  "Confirm status cadence",
  "Confirm completion message",
  "Confirm cancellation message",
  "Confirm access availability",
  "Confirm deployment identity",
  "Confirm artifact identity",
  "Confirm checksum or commit",
  "Confirm data reconciliation",
  "Confirm queue behavior",
  "Confirm cache behavior",
  "Confirm replica behavior",
  "Confirm API behavior",
  "Confirm report behavior",
  "Confirm export behavior",
  "Confirm notification behavior",
  "Confirm security behavior",
  "Confirm privacy behavior",
  "Confirm performance behavior",
  "Confirm availability behavior",
  "Confirm rollback duration",
  "Confirm validation duration",
  "Confirm maximum duration",
  "Confirm stop condition",
  "Confirm approval threshold",
  "Confirm independent reviewer",
  "Confirm emergency exception",
  "Confirm follow-up review",
  "Confirm lessons learned",
];
const WINDOW_GUIDE = [
  "A window must have a named owner.",
  "A window must state its timezone.",
  "A window should include preparation and recovery buffers.",
  "A production window should have an independent approval.",
  "A critical window should have a tested rollback.",
  "A data window should have reconciliation evidence.",
  "A security window should have monitoring coverage.",
  "A dependency window should confirm consumer readiness.",
  "A recovery window should confirm restore capacity.",
  "A network window should confirm support coverage.",
  "A window should avoid known freeze periods.",
  "A window should avoid overlapping customer events.",
  "A window should identify all affected teams.",
  "A window should identify the escalation channel.",
  "A window should identify the completion signal.",
  "A window should identify the cancellation signal.",
  "A window should identify the rollback signal.",
  "A window should identify the validation observer.",
  "A window should identify the evidence location.",
  "A window should identify the next review date.",
  "Do not schedule without a rollback owner.",
  "Do not call a dry run a completed window.",
  "Do not approve an empty implementation plan.",
  "Do not hide conflicts in free-text notes.",
  "Do not extend a window without recording approval.",
  "Do not mark complete without monitoring results.",
  "Do not cancel without recording the reason.",
  "Do not delete cancelled window history.",
  "Do not overlap destructive data operations.",
  "Do not use a generic emergency reason.",
  "Record the intended start and end.",
  "Record the actual start and end.",
  "Record the actor who started the work.",
  "Record the actor who ended the work.",
  "Record the artifact or package version.",
  "Record the backup or snapshot reference.",
  "Record the validation result.",
  "Record the rollback decision.",
  "Record the customer communication.",
  "Record the support handoff.",
  "Record the unresolved risk.",
  "Use a canary when the blast radius is uncertain.",
  "Use a bounded batch for data operations.",
  "Use a separate validation query.",
  "Use an explicit stop condition.",
  "Use an on-call backup.",
  "Use a second approver for critical risk.",
  "Use a buffer after recovery work.",
  "Use a dated completion note.",
  "When a dependency is not ready, mark the window blocked.",
  "When risk changes, repeat approval.",
  "When scope changes, return to review.",
  "When a window conflicts, reschedule or escalate.",
  "When rollback begins, update stakeholders.",
  "When rollback completes, validate the restored state.",
  "When an emergency bypasses review, schedule retrospective review.",
  "When monitoring is missing, do not declare success.",
  "When ownership is unclear, stop scheduling.",
  "When evidence is missing, record the gap.",
];
const WINDOW_SCENARIOS = [
  "Monthly production release",
  "Database schema migration",
  "Data backfill",
  "Index rebuild",
  "Security patch",
  "Certificate rotation",
  "Secret rotation",
  "Dependency upgrade",
  "Infrastructure scaling",
  "Network maintenance",
  "Backup validation",
  "Restore exercise",
  "Regional failover",
  "Disaster recovery exercise",
  "Queue migration",
  "Cache migration",
  "Search index rebuild",
  "Analytics pipeline update",
  "Report refresh",
  "Notification provider change",
  "Identity provider change",
  "Billing maintenance",
  "Support tooling maintenance",
  "Emergency incident mitigation",
  "Hotfix deployment",
  "Feature flag activation",
  "Feature flag rollback",
  "Customer communication window",
  "Privacy deletion run",
  "Retention cleanup",
  "Audit export",
  "Access recertification",
  "Load testing window",
  "Performance tuning",
  "Capacity expansion",
  "Monitoring migration",
  "Logging migration",
  "Tracing migration",
  "API version transition",
  "Legacy service retirement",
];
const EXECUTION_CHECKLIST = [
  "Objective is written",
  "Scope is written",
  "Window owner is named",
  "Business owner is named",
  "Technical owner is named",
  "Support owner is named",
  "Backup owner is named",
  "Risk is rated",
  "Risk rationale is written",
  "Environment is named",
  "Type is named",
  "Start timezone is written",
  "End timezone is written",
  "Preparation time is written",
  "Recovery buffer is written",
  "Maximum duration is written",
  "Affected service is named",
  "Affected data is named",
  "Affected users are named",
  "Affected teams are named",
  "Implementation steps are ordered",
  "Implementation operator is named",
  "Implementation access is ready",
  "Implementation artifact is named",
  "Implementation version is named",
  "Implementation checksum is named",
  "Implementation dependency is ready",
  "Implementation stop condition is written",
  "Implementation evidence location is ready",
  "Validation steps are ordered",
  "Validation observer is named",
  "Validation environment is named",
  "Validation data is named",
  "Validation threshold is written",
  "Validation query is ready",
  "Validation dashboard is ready",
  "Validation duration is written",
  "Validation failure response is written",
  "Validation evidence location is ready",
  "Rollback steps are ordered",
  "Rollback operator is named",
  "Rollback owner is named",
  "Rollback trigger is written",
  "Rollback duration is written",
  "Rollback artifact is ready",
  "Rollback backup is ready",
  "Rollback restore point is named",
  "Rollback validation is written",
  "Rollback communication is written",
  "Monitoring dashboard is ready",
  "Monitoring observer is named",
  "Error threshold is written",
  "Latency threshold is written",
  "Availability threshold is written",
  "Saturation threshold is written",
  "Queue threshold is written",
  "Replica threshold is written",
  "Backup threshold is written",
  "Alert owner is named",
  "Escalation owner is named",
  "On-call schedule is checked",
  "Support schedule is checked",
  "Business schedule is checked",
  "Customer schedule is checked",
  "Release schedule is checked",
  "Incident schedule is checked",
  "Freeze schedule is checked",
  "Dependency schedule is checked",
  "Calendar conflict is resolved",
  "Approval threshold is known",
  "Independent reviewer is named",
  "Business approval is recorded",
  "Technical approval is recorded",
  "Operations approval is recorded",
  "Security approval is recorded",
  "Privacy approval is recorded",
  "Release approval is recorded",
  "Approval expiry is written",
  "Approval decision is written",
  "Approval timestamp is written",
  "Approval evidence is linked",
  "Approval questions are closed",
  "Communication audience is named",
  "Communication channel is named",
  "Communication start message is ready",
  "Communication progress message is ready",
  "Communication completion message is ready",
  "Communication rollback message is ready",
  "Communication cancellation message is ready",
  "Communication support handoff is ready",
  "Communication escalation is ready",
  "Communication owner is named",
  "Communication timestamp is recorded",
  "Access is available",
  "Access is least privilege",
  "Secrets are available",
  "Secrets are not exposed",
  "Credentials are time bounded",
  "Deployment identity is known",
  "Audit logging is enabled",
  "Change reference is recorded",
  "Incident reference is recorded",
  "Release reference is recorded",
  "Customer reference is recorded",
  "Data protection is reviewed",
  "Privacy handling is reviewed",
  "Security handling is reviewed",
  "Retention handling is reviewed",
  "Export handling is reviewed",
  "Backup handling is reviewed",
  "Restore handling is reviewed",
  "Queue handling is reviewed",
  "Cache handling is reviewed",
  "API handling is reviewed",
  "Report handling is reviewed",
  "Notification handling is reviewed",
  "Emergency criteria is written",
  "Emergency approver is named",
  "Emergency evidence is ready",
  "Emergency follow-up is scheduled",
  "Emergency communication is ready",
  "Start decision is recorded",
  "Start actor is recorded",
  "Start timestamp is recorded",
  "Start environment is recorded",
  "Start version is recorded",
  "Progress decision is recorded",
  "Progress actor is recorded",
  "Progress timestamp is recorded",
  "Progress metrics are recorded",
  "Stop decision is recorded",
  "Stop actor is recorded",
  "Stop timestamp is recorded",
  "Stop reason is recorded",
  "Rollback decision is recorded",
  "Rollback actor is recorded",
  "Rollback timestamp is recorded",
  "Rollback result is recorded",
  "Completion decision is recorded",
  "Completion actor is recorded",
  "Completion timestamp is recorded",
  "Completion metrics are recorded",
  "Completion evidence is linked",
  "Completion communication is sent",
  "Support handoff is complete",
  "Open risk is visible",
  "Open issue is visible",
  "Open dependency is visible",
  "Exception owner is named",
  "Exception expiry is written",
  "Lessons owner is named",
  "Lessons note is written",
  "Next review is scheduled",
  "Audit retention is confirmed",
  "Export is reproducible",
];

function makeId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function clean(value, fallback = "", limit = 1200) { if (typeof value !== "string") return fallback; const result = value.trim(); return result ? result.slice(0, limit) : fallback; }
function now() { return new Date().toISOString(); }
function emptyData() { return { windows: [], approvals: [], evidence: [], owners: [], notes: [] }; }
function readData() {
  if (typeof window === "undefined") return emptyData();
  try { return { ...emptyData(), ...JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") }; } catch { return emptyData(); }
}
function tone(value) {
  if (["approved", "scheduled", "active", "completed", "low", "available"].includes(value)) return "emerald";
  if (["critical", "high", "rejected", "cancelled", "rolled-back"].includes(value)) return "rose";
  if (["review", "proposed", "medium", "pending", "busy"].includes(value)) return "amber";
  return "slate";
}
function Badge({ children, value }) {
  const colors = { slate: "border-slate-200 bg-slate-50 text-slate-700", emerald: "border-emerald-200 bg-emerald-50 text-emerald-800", amber: "border-amber-200 bg-amber-50 text-amber-800", rose: "border-rose-200 bg-rose-50 text-rose-800" };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${colors[tone(value)] || colors.slate}`}>{children}</span>;
}
function Button({ children, icon: Icon, onClick, variant = "secondary", type = "button" }) {
  const variants = { secondary: "border-slate-200 bg-white text-slate-700 hover:border-slate-300", primary: "border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700", danger: "border-rose-200 bg-white text-rose-700 hover:bg-rose-50" };
  return <button type={type} onClick={onClick} className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold ${variants[variant]}`}>{Icon && <Icon size={14} />}{children}</button>;
}
function Field({ label, value, onChange, placeholder, options, required = false }) {
  const common = { value: value || "", onChange: (event) => onChange(event.target.value), required, className: "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-500" };
  return <label className="block text-xs font-semibold text-slate-700">{label}{options ? <select {...common}><option value="">Select...</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input {...common} placeholder={placeholder} />}</label>;
}
function Area({ label, value, onChange, placeholder }) { return <label className="block text-xs font-semibold text-slate-700">{label}<textarea value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500" /></label>; }
function Section({ title, description, action, children }) { return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="text-sm font-semibold text-slate-950">{title}</h2><p className="mt-1 text-xs text-slate-500">{description}</p></div>{action}</div>{children}</section>; }
function Empty({ title, description, action }) { return <div className="p-8 text-center"><p className="text-sm font-semibold text-slate-800">{title}</p><p className="mx-auto mt-1 max-w-md text-xs text-slate-500">{description}</p>{action && <div className="mt-4">{action}</div>}</div>; }
function Modal({ title, onClose, children }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-5"><h2 className="font-semibold">{title}</h2><button type="button" onClick={onClose}><X size={17} /></button></div><div className="p-5">{children}</div></div></div>; }
function Stat({ icon: Icon, label, value, detail }) { return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700"><Icon size={17} /></span></div><p className="mt-2 text-[11px] text-slate-500">{detail}</p></article>; }

export default function MaintenanceWindowsPage() {
  const [data, setData] = useState(emptyData);
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [ascending, setAscending] = useState(false);
  const [modal, setModal] = useState("");
  const [notice, setNotice] = useState("");
  const [windowForm, setWindowForm] = useState({ title: "", type: "release", state: "draft", risk: "medium", environment: "staging", owner: "", businessOwner: "", start: "", end: "", objective: "", implementation: "", validation: "", rollback: "", impact: "" });
  const [approvalForm, setApprovalForm] = useState({ name: "", role: "", state: "pending", decision: "", due: "" });
  const [evidenceForm, setEvidenceForm] = useState({ title: "", type: "runbook", reference: "", detail: "" });
  const [ownerForm, setOwnerForm] = useState({ name: "", role: "", area: "", availability: "available", backup: "" });
  const [noteForm, setNoteForm] = useState({ title: "", audience: "", detail: "" });

  useEffect(() => setData(readData()), []);
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => { if (!notice) return undefined; const timer = window.setTimeout(() => setNotice(""), 2500); return () => window.clearTimeout(timer); }, [notice]);

  const selected = data.windows.find((item) => item.id === selectedId);
  const windows = selectedId ? data.windows.filter((item) => item.id === selectedId) : data.windows;
  const approvals = data.approvals.filter((item) => !selectedId || item.windowId === selectedId);
  const evidence = data.evidence.filter((item) => !selectedId || item.windowId === selectedId);
  const owners = data.owners.filter((item) => !selectedId || item.windowId === selectedId);
  const notes = data.notes.filter((item) => !selectedId || item.windowId === selectedId);
  const approved = windows.filter((item) => ["approved", "scheduled", "active", "completed"].includes(item.state)).length;
  const active = windows.filter((item) => ["scheduled", "active"].includes(item.state)).length;
  const highRisk = windows.filter((item) => ["critical", "high"].includes(item.risk) && !["completed", "cancelled"].includes(item.state)).length;
  const readiness = windows.length ? Math.round((approved / windows.length) * 100) : 0;
  const filtered = useMemo(() => windows.filter((item) => `${item.title} ${item.type} ${item.state} ${item.risk} ${item.environment} ${item.owner}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => { const result = a.title.localeCompare(b.title); return ascending ? result : result * -1; }), [ascending, windows, query]);

  function update(key, items) { setData((current) => ({ ...current, [key]: items })); }
  function addWindow(event) {
    event.preventDefault();
    const item = { ...windowForm, id: makeId("window"), title: clean(windowForm.title), owner: clean(windowForm.owner), businessOwner: clean(windowForm.businessOwner), start: clean(windowForm.start), end: clean(windowForm.end), objective: clean(windowForm.objective), implementation: clean(windowForm.implementation), validation: clean(windowForm.validation), rollback: clean(windowForm.rollback), impact: clean(windowForm.impact), createdAt: now() };
    update("windows", [item, ...data.windows]);
    setSelectedId(item.id);
    setWindowForm({ title: "", type: "release", state: "draft", risk: "medium", environment: "staging", owner: "", businessOwner: "", start: "", end: "", objective: "", implementation: "", validation: "", rollback: "", impact: "" });
    setModal("");
    setNotice("Maintenance window created");
  }
  function addApproval(event) {
    event.preventDefault();
    if (!selectedId) { setNotice("Select a window first"); return; }
    const item = { ...approvalForm, id: makeId("approval"), windowId: selectedId, name: clean(approvalForm.name), role: clean(approvalForm.role), decision: clean(approvalForm.decision), due: clean(approvalForm.due), createdAt: now() };
    update("approvals", [item, ...data.approvals]);
    setApprovalForm({ name: "", role: "", state: "pending", decision: "", due: "" });
    setModal("");
    setNotice("Window approval added");
  }
  function addEvidence(event) {
    event.preventDefault();
    if (!selectedId) { setNotice("Select a window first"); return; }
    const item = { ...evidenceForm, id: makeId("evidence"), windowId: selectedId, title: clean(evidenceForm.title), reference: clean(evidenceForm.reference), detail: clean(evidenceForm.detail), createdAt: now() };
    update("evidence", [item, ...data.evidence]);
    setEvidenceForm({ title: "", type: "runbook", reference: "", detail: "" });
    setModal("");
    setNotice("Window evidence added");
  }
  function addOwner(event) {
    event.preventDefault();
    if (!selectedId) { setNotice("Select a window first"); return; }
    const item = { ...ownerForm, id: makeId("owner"), windowId: selectedId, name: clean(ownerForm.name), role: clean(ownerForm.role), area: clean(ownerForm.area), backup: clean(ownerForm.backup), createdAt: now() };
    update("owners", [item, ...data.owners]);
    setOwnerForm({ name: "", role: "", area: "", availability: "available", backup: "" });
    setModal("");
    setNotice("Window owner added");
  }
  function addNote(event) {
    event.preventDefault();
    if (!selectedId) { setNotice("Select a window first"); return; }
    const item = { ...noteForm, id: makeId("note"), windowId: selectedId, title: clean(noteForm.title), audience: clean(noteForm.audience), detail: clean(noteForm.detail), createdAt: now() };
    update("notes", [item, ...data.notes]);
    setNoteForm({ title: "", audience: "", detail: "" });
    setModal("");
    setNotice("Window note added");
  }
  function changeField(key, itemId, field, value) { update(key, data[key].map((item) => item.id === itemId ? { ...item, [field]: value, updatedAt: now() } : item)); }
  function remove(key, itemId) { update(key, data[key].filter((item) => item.id !== itemId)); setNotice("Record removed"); }
  function applyControls() {
    if (!selectedId) { setNotice("Select a window first"); return; }
    const existing = new Set(evidence.map((item) => item.title));
    const additions = CONTROL_PROMPTS.slice(0, 20).filter((title) => !existing.has(title)).map((title) => ({ id: makeId("control"), windowId: selectedId, title, type: "runbook", reference: "", detail: "Window control applied; attach proof before execution.", createdAt: now() }));
    update("evidence", [...additions, ...data.evidence]);
    setNotice(`${additions.length} window controls added`);
  }
  function copySummary() {
    navigator.clipboard?.writeText([`Window: ${selected?.title || "All windows"}`, `Readiness: ${readiness}%`, `Approved or beyond: ${approved}`, `Active: ${active}`, `High risk: ${highRisk}`, `Approvals: ${approvals.length}`, `Evidence: ${evidence.length}`, `Owners: ${owners.length}`, `Notes: ${notes.length}`, selected?.objective || "No objective recorded."].join("\n"));
    setNotice("Window summary copied");
  }
  function exportRows() {
    const rows = [["Type", "Title", "State", "Risk", "Owner", "Detail"], ...windows.map((item) => ["Window", item.title, item.state, item.risk, item.owner, item.objective]), ...approvals.map((item) => ["Approval", item.name, item.state, "", item.role, item.decision]), ...evidence.map((item) => ["Evidence", item.title, item.type, "", "", item.reference]), ...notes.map((item) => ["Note", item.title, "", "", item.audience, item.detail])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "admin-maintenance-windows.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Window export downloaded");
  }

  const tabs = [["overview", "Overview"], ["windows", `Windows (${windows.length})`], ["approvals", `Approvals (${approvals.length})`], ["evidence", `Evidence (${evidence.length})`], ["owners", `Owners (${owners.length})`], ["notes", `Notes (${notes.length})`]];
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-7xl space-y-5">
    <div className="rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-slate-50 p-5 shadow-sm sm:p-7"><div className="flex flex-col gap-5 lg:flex-row lg:justify-between"><div className="max-w-3xl"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700"><CalendarClock size={16} /> Admin maintenance windows</div><h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Make maintenance work safer to schedule, communicate, execute, and recover.</h1><p className="mt-3 text-sm leading-6 text-slate-600">A browser-local administration workspace for maintenance windows, approvals, dependencies, evidence, ownership, communication, and rollback readiness.</p></div><div className="flex flex-wrap gap-2"><Button icon={Plus} variant="primary" onClick={() => setModal("window")}>New window</Button><Button icon={Copy} onClick={copySummary}>Copy summary</Button><Button icon={Download} onClick={exportRows}>Export</Button></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={ClipboardCheck} label="Readiness" value={`${readiness}%`} detail={`${approved} approved or beyond`} /><Stat icon={AlertTriangle} label="Active windows" value={active} detail={`${highRisk} high-risk items`} /><Stat icon={ShieldCheck} label="Evidence" value={evidence.length} detail="Window proof indexed" /><Stat icon={Users} label="Owners" value={owners.length} detail={`${notes.length} communication notes`} /></div></div>
    {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">{notice}</div>}
    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">{tabs.map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-t-lg px-3 py-2 text-xs font-semibold ${tab === value ? "border-b-2 border-cyan-600 text-cyan-700" : "text-slate-500"}`}>{label}</button>)}</div>
    <Section title="Window context" description="Select the maintenance window under review." action={<Button icon={RefreshCw} onClick={() => { setData(readData()); setNotice("Workspace refreshed"); }}>Refresh</Button>}><div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto]"><label className="text-xs font-semibold text-slate-700">Selected window<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="">All windows</option>{data.windows.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><div className="flex items-end gap-2"><Button icon={ClipboardCheck} onClick={applyControls}>Apply controls</Button><Button icon={Plus} onClick={() => setModal("window")}>Add window</Button></div></div><div className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-2 xl:grid-cols-3">{data.windows.slice(0, 6).map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`rounded-xl border p-4 text-left ${selectedId === item.id ? "border-cyan-300 bg-cyan-50" : "border-slate-200"}`}><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold">{item.title}</p><Badge value={item.state}>{item.state}</Badge></div><p className="mt-2 line-clamp-2 text-xs text-slate-500">{item.objective || "No objective recorded."}</p><p className="mt-3 text-[11px] text-slate-400">{item.environment} · {item.owner || "Unassigned"} · {item.risk} risk</p></button>)}{!data.windows.length && <div className="md:col-span-2 xl:col-span-3"><Empty title="No maintenance windows" description="Create a window for a release, migration, infrastructure change, recovery exercise, or emergency action." action={<Button icon={Plus} variant="primary" onClick={() => setModal("window")}>Create window</Button>} /></div>}</div></Section>
    {tab === "overview" && <div className="grid gap-5 xl:grid-cols-2"><Section title="Window posture" description="A quick read of readiness and remaining attention."><div className="space-y-4 p-5"><div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-cyan-900">Readiness coverage</p><p className="text-lg font-semibold text-cyan-900">{readiness}%</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-cyan-600" style={{ width: `${readiness}%` }} /></div><p className="mt-3 text-xs text-cyan-800">{highRisk ? `${highRisk} high-risk window${highRisk === 1 ? "" : "s"} need attention.` : "No high-risk open windows recorded."}</p></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Windows</p><p className="mt-1 text-xl font-semibold">{windows.length}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Approvals</p><p className="mt-1 text-xl font-semibold">{approvals.length}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Evidence</p><p className="mt-1 text-xl font-semibold">{evidence.length}</p></div></div><p className="text-[11px] text-slate-500">Control library: {CONTROL_PROMPTS.length} reusable window prompts.</p></div></Section><Section title="Selected window narrative" description="Keep objective, impact, and rollback together."><div className="space-y-4 p-5"><Area label="Objective" value={selected?.objective || ""} onChange={(value) => selected && changeField("windows", selected.id, "objective", value)} placeholder="What outcome should this window produce?" /><Area label="Impact" value={selected?.impact || ""} onChange={(value) => selected && changeField("windows", selected.id, "impact", value)} placeholder="Who or what may be affected?" /><Area label="Rollback" value={selected?.rollback || ""} onChange={(value) => selected && changeField("windows", selected.id, "rollback", value)} placeholder="How and when will this work be reversed?" /></div></Section><Section title="Window principles" description="Use consistent safeguards for scheduled work."><div className="grid gap-3 p-5 sm:grid-cols-2">{[["Plan", "Define scope, owner, timing, dependencies, and steps.", ClipboardCheck], ["Coordinate", "Resolve conflicts and align support, business, and technical owners.", Users], ["Observe", "Monitor the work with explicit stop conditions and thresholds.", ShieldCheck], ["Recover", "Keep rollback, backups, communication, and validation ready.", CheckCircle2]].map(([title, detail, Icon]) => <div key={title} className="rounded-xl border border-slate-200 p-4"><Icon size={17} className="text-cyan-600" /><p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div>)}</div></Section></div>}
    {tab === "windows" && <Section title="Maintenance windows" description="Track schedule, risk, ownership, scope, and lifecycle state." action={<Button icon={Plus} variant="primary" onClick={() => setModal("window")}>Add window</Button>}><div className="flex gap-3 border-b border-slate-100 p-5"><div className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, type, state, risk, owner..." className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm" /></div><Button icon={ascending ? ArrowUpAZ : ArrowDownAZ} onClick={() => setAscending((value) => !value)}>Sort</Button></div>{!filtered.length ? <Empty title="No maintenance windows" description="Create a window or adjust the search query." action={<Button icon={Plus} onClick={() => setModal("window")}>Add window</Button>} /> : <div className="divide-y">{filtered.map((item) => <div key={item.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{item.title}</h3><Badge value={item.state}>{item.state}</Badge><Badge value={item.risk}>{item.risk} risk</Badge><Badge value={item.environment}>{item.environment}</Badge></div><p className="mt-2 text-xs text-slate-600">{item.objective || "No objective recorded."}</p><p className="mt-2 text-[11px] text-slate-500">Owner: {item.owner || "Unassigned"} · {item.start || "Start not set"} to {item.end || "end not set"}</p></div><div className="flex gap-2"><select value={item.state} onChange={(event) => changeField("windows", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => remove("windows", item.id)}>Remove</Button></div></div>)}</div>}</Section>}
    {tab === "approvals" && <Section title="Window approvals" description="Capture independent decisions and approval expiry." action={<Button icon={Plus} variant="primary" onClick={() => setModal("approval")}>Add approval</Button>}>{!approvals.length ? <Empty title="No approvals" description="Select a window and add its business, technical, security, or operations approvers." action={<Button icon={Plus} onClick={() => setModal("approval")}>Add approval</Button>} /> : <div className="divide-y">{approvals.map((item) => <div key={item.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap gap-2"><h3 className="text-sm font-semibold">{item.name}</h3><Badge value={item.state}>{item.state}</Badge></div><p className="mt-2 text-xs text-slate-600">{item.decision || "No decision note recorded."}</p><p className="mt-2 text-[11px] text-slate-500">{item.role || "Role not set"} · Due {item.due || "not set"}</p></div><div className="flex gap-2"><select value={item.state} onChange={(event) => changeField("approvals", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{APPROVAL_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => remove("approvals", item.id)}>Remove</Button></div></div>)}</div>}</Section>}
    {tab === "evidence" && <Section title="Window evidence" description="Index runbooks, tests, approvals, monitoring, rollback, and communications." action={<Button icon={Plus} variant="primary" onClick={() => setModal("evidence")}>Add evidence</Button>}>{!evidence.length ? <Empty title="No evidence" description="Add evidence that supports readiness, execution, validation, or recovery." action={<Button icon={Plus} onClick={() => setModal("evidence")}>Add evidence</Button>} /> : <div className="divide-y">{evidence.map((item) => <div key={item.id} className="flex justify-between gap-3 p-5"><div><div className="flex flex-wrap gap-2"><h3 className="text-sm font-semibold">{item.title}</h3><Badge value={item.type}>{item.type}</Badge></div><p className="mt-2 text-xs text-slate-600">{item.detail || "No detail recorded."}</p><p className="mt-2 text-[11px] text-cyan-700">{item.reference || "No reference recorded"}</p></div><Button variant="danger" icon={Trash2} onClick={() => remove("evidence", item.id)}>Remove</Button></div>)}</div>}</Section>}
    {tab === "owners" && <Section title="Window ownership" description="Map technical, business, operations, support, and backup owners." action={<Button icon={Plus} variant="primary" onClick={() => setModal("owner")}>Add owner</Button>}>{!owners.length ? <Empty title="No owners" description="Add named owners before approving or scheduling work." action={<Button icon={Plus} onClick={() => setModal("owner")}>Add owner</Button>} /> : <div className="grid gap-3 p-5 md:grid-cols-2">{owners.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between gap-3"><div><p className="text-sm font-semibold">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.role} · {item.area}</p></div><Badge value={item.availability}>{item.availability}</Badge></div><p className="mt-3 text-[11px] text-slate-500">Backup: {item.backup || "Not assigned"}</p><div className="mt-3"><Button variant="danger" icon={Trash2} onClick={() => remove("owners", item.id)}>Remove</Button></div></div>)}</div>}</Section>}
    {tab === "notes" && <Section title="Window communication" description="Keep stakeholder updates, customer notices, and handoffs visible." action={<Button icon={Plus} variant="primary" onClick={() => setModal("note")}>Add note</Button>}>{!notes.length ? <Empty title="No communication notes" description="Record audience, timing, impact, and support handoff updates." action={<Button icon={Plus} onClick={() => setModal("note")}>Add note</Button>} /> : <div className="divide-y">{notes.map((item) => <div key={item.id} className="flex justify-between gap-3 p-5"><div><h3 className="text-sm font-semibold">{item.title}</h3><p className="mt-2 text-xs text-slate-600">{item.detail || "No detail recorded."}</p><p className="mt-2 text-[11px] text-slate-500">Audience: {item.audience || "Not set"}</p></div><Button variant="danger" icon={Trash2} onClick={() => remove("notes", item.id)}>Remove</Button></div>)}</div>}</Section>}
    <Section title="Window guide" description="Decision rules for scheduling, execution, communication, and recovery."><div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-4">{WINDOW_GUIDE.slice(0, 24).map((rule) => <p key={rule} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">{rule}</p>)}</div><p className="px-5 pb-5 text-[11px] text-slate-400">Guide coverage: {WINDOW_GUIDE.length} rules.</p></Section>
    <Section title="Window scenarios" description="Start a maintenance window from a recognizable operational scenario."><div className="flex flex-wrap gap-2 p-5">{WINDOW_SCENARIOS.map((scenario) => <button key={scenario} type="button" onClick={() => { setModal("window"); setWindowForm((current) => ({ ...current, title: scenario })); setNotice("Scenario loaded into window form"); }} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600 hover:border-cyan-300 hover:text-cyan-700">{scenario}</button>)}</div></Section>
    <Section title="Execution readiness checklist" description="Use this checklist before starting, extending, rolling back, or closing a maintenance window."><div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-4">{EXECUTION_CHECKLIST.slice(0, 32).map((item) => <button key={item} type="button" onClick={() => { setTab("evidence"); setEvidenceForm((current) => ({ ...current, title: item })); setNotice("Checklist item loaded into evidence form"); }} className="rounded-lg border border-slate-200 px-3 py-2 text-left text-[11px] text-slate-600 hover:border-cyan-300 hover:text-cyan-700">{item}</button>)}</div><p className="px-5 pb-5 text-[11px] text-slate-400">Readiness coverage: {EXECUTION_CHECKLIST.length} checks.</p></Section>
    {modal === "window" && <Modal title="Create maintenance window" onClose={() => setModal("")}><form onSubmit={addWindow} className="space-y-4"><Field label="Window title" value={windowForm.title} onChange={(value) => setWindowForm({ ...windowForm, title: value })} placeholder="Monthly production release" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Type" options={TYPES} value={windowForm.type} onChange={(value) => setWindowForm({ ...windowForm, type: value })} /><Field label="Risk" options={RISKS} value={windowForm.risk} onChange={(value) => setWindowForm({ ...windowForm, risk: value })} /><Field label="Environment" options={ENVIRONMENTS} value={windowForm.environment} onChange={(value) => setWindowForm({ ...windowForm, environment: value })} /><Field label="Owner" value={windowForm.owner} onChange={(value) => setWindowForm({ ...windowForm, owner: value })} placeholder="Technical owner" /><Field label="Business owner" value={windowForm.businessOwner} onChange={(value) => setWindowForm({ ...windowForm, businessOwner: value })} placeholder="Business owner" /><Field label="Start" value={windowForm.start} onChange={(value) => setWindowForm({ ...windowForm, start: value })} placeholder="2026-12-01 22:00 UTC" /><Field label="End" value={windowForm.end} onChange={(value) => setWindowForm({ ...windowForm, end: value })} placeholder="2026-12-02 00:00 UTC" /></div><Area label="Objective" value={windowForm.objective} onChange={(value) => setWindowForm({ ...windowForm, objective: value })} placeholder="What outcome should this window produce?" /><Area label="Implementation" value={windowForm.implementation} onChange={(value) => setWindowForm({ ...windowForm, implementation: value })} placeholder="Ordered implementation steps." /><Area label="Validation" value={windowForm.validation} onChange={(value) => setWindowForm({ ...windowForm, validation: value })} placeholder="How will success be observed?" /><Area label="Rollback" value={windowForm.rollback} onChange={(value) => setWindowForm({ ...windowForm, rollback: value })} placeholder="When and how will this work be reversed?" /><Area label="Impact" value={windowForm.impact} onChange={(value) => setWindowForm({ ...windowForm, impact: value })} placeholder="Who or what may be affected?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Create window</Button></div></form></Modal>}
    {modal === "approval" && <Modal title="Add window approval" onClose={() => setModal("")}><form onSubmit={addApproval} className="space-y-4"><Field label="Approver" value={approvalForm.name} onChange={(value) => setApprovalForm({ ...approvalForm, name: value })} placeholder="Approver name" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Role" value={approvalForm.role} onChange={(value) => setApprovalForm({ ...approvalForm, role: value })} placeholder="Operations approver" /><Field label="State" options={APPROVAL_STATES} value={approvalForm.state} onChange={(value) => setApprovalForm({ ...approvalForm, state: value })} /><Field label="Due" value={approvalForm.due} onChange={(value) => setApprovalForm({ ...approvalForm, due: value })} placeholder="2026-12-01" /></div><Area label="Decision" value={approvalForm.decision} onChange={(value) => setApprovalForm({ ...approvalForm, decision: value })} placeholder="What was reviewed and decided?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add approval</Button></div></form></Modal>}
    {modal === "evidence" && <Modal title="Add window evidence" onClose={() => setModal("")}><form onSubmit={addEvidence} className="space-y-4"><Field label="Evidence title" value={evidenceForm.title} onChange={(value) => setEvidenceForm({ ...evidenceForm, title: value })} placeholder="Production validation result" required /><Field label="Type" options={EVIDENCE_TYPES} value={evidenceForm.type} onChange={(value) => setEvidenceForm({ ...evidenceForm, type: value })} /><Field label="Reference" value={evidenceForm.reference} onChange={(value) => setEvidenceForm({ ...evidenceForm, reference: value })} placeholder="URL, file, ticket, or report" /><Area label="Detail" value={evidenceForm.detail} onChange={(value) => setEvidenceForm({ ...evidenceForm, detail: value })} placeholder="What does this evidence prove?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add evidence</Button></div></form></Modal>}
    {modal === "owner" && <Modal title="Add window owner" onClose={() => setModal("")}><form onSubmit={addOwner} className="space-y-4"><Field label="Name" value={ownerForm.name} onChange={(value) => setOwnerForm({ ...ownerForm, name: value })} placeholder="Named owner" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Role" value={ownerForm.role} onChange={(value) => setOwnerForm({ ...ownerForm, role: value })} placeholder="Operations owner" /><Field label="Area" value={ownerForm.area} onChange={(value) => setOwnerForm({ ...ownerForm, area: value })} placeholder="Monitoring" /><Field label="Availability" options={["available", "busy", "offline", "unknown"]} value={ownerForm.availability} onChange={(value) => setOwnerForm({ ...ownerForm, availability: value })} /><Field label="Backup" value={ownerForm.backup} onChange={(value) => setOwnerForm({ ...ownerForm, backup: value })} placeholder="Backup owner" /></div><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add owner</Button></div></form></Modal>}
    {modal === "note" && <Modal title="Add window note" onClose={() => setModal("")}><form onSubmit={addNote} className="space-y-4"><Field label="Title" value={noteForm.title} onChange={(value) => setNoteForm({ ...noteForm, title: value })} placeholder="Support handoff update" required /><Field label="Audience" value={noteForm.audience} onChange={(value) => setNoteForm({ ...noteForm, audience: value })} placeholder="Support and release stakeholders" /><Area label="Detail" value={noteForm.detail} onChange={(value) => setNoteForm({ ...noteForm, detail: value })} placeholder="What was communicated and when?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add note</Button></div></form></Modal>}
  </div></main>;
}
