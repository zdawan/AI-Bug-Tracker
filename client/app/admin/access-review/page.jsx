"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpAZ,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react";

const STORAGE_KEY = "admin-access-review-v1";
const REVIEW_STATES = ["planned", "requested", "reviewing", "approved", "revoked", "expired", "accepted"];
const RISK_LEVELS = ["critical", "high", "medium", "low"];
const ACCESS_TYPES = ["role", "permission", "service-account", "api-key", "group", "temporary", "break-glass"];
const SYSTEMS = ["application", "database", "cloud", "analytics", "support", "billing", "identity", "integration"];
const EVIDENCE_TYPES = ["access-log", "permission-export", "manager-approval", "owner-approval", "usage-report", "ticket", "screenshot", "exception"];
const AVAILABILITY = ["available", "busy", "offline", "unknown"];
const CONTROL_PROMPTS = [
  "Confirm access owner",
  "Confirm access subject",
  "Confirm business purpose",
  "Confirm system boundary",
  "Confirm role boundary",
  "Confirm permission boundary",
  "Confirm least privilege",
  "Confirm separation of duties",
  "Confirm manager approval",
  "Confirm system owner approval",
  "Confirm security review",
  "Confirm privacy review",
  "Confirm usage evidence",
  "Confirm last-used date",
  "Confirm access age",
  "Confirm dormant access",
  "Confirm duplicate access",
  "Confirm inherited access",
  "Confirm nested group access",
  "Confirm temporary access expiry",
  "Confirm break-glass justification",
  "Confirm service account owner",
  "Confirm API key owner",
  "Confirm secret rotation",
  "Confirm authentication method",
  "Confirm multi-factor protection",
  "Confirm device boundary",
  "Confirm network boundary",
  "Confirm region boundary",
  "Confirm environment boundary",
  "Confirm production restriction",
  "Confirm development restriction",
  "Confirm database restriction",
  "Confirm export restriction",
  "Confirm billing restriction",
  "Confirm support restriction",
  "Confirm privileged action logging",
  "Confirm failed-login monitoring",
  "Confirm anomaly alerting",
  "Confirm emergency escalation",
  "Confirm revocation path",
  "Confirm revocation owner",
  "Confirm revocation evidence",
  "Confirm approval expiry",
  "Confirm review cadence",
  "Confirm exception expiry",
  "Confirm audit retention",
  "Confirm evidence redaction",
  "Confirm sensitive-data handling",
  "Confirm access communication",
  "Confirm reviewer independence",
  "Confirm conflict of interest",
  "Confirm owner backup",
  "Confirm support handoff",
  "Confirm unresolved risk",
  "Confirm accepted risk",
  "Confirm remediation action",
  "Confirm remediation due date",
  "Confirm final decision",
];
const REVIEW_GUIDE = [
  "Access should have a named owner and a named subject.",
  "Every privileged permission needs a business purpose.",
  "A role is not automatically least privilege.",
  "Inherited access must be reviewed at the effective level.",
  "Temporary access needs a specific expiry.",
  "Break-glass access needs a reason and follow-up.",
  "Service accounts need an accountable human owner.",
  "API keys need rotation evidence and a usage boundary.",
  "Dormant access should be revoked or explicitly accepted.",
  "A reviewer should not approve their own access.",
  "Approval evidence should identify the decision maker.",
  "Access logs should be reviewed for critical permissions.",
  "Sensitive-data access needs a privacy-aware purpose.",
  "Production access needs stronger review than development access.",
  "A revoked access record should remain auditable.",
  "An expired exception should not remain active.",
  "A group membership change can change effective access.",
  "A role change can remove or add multiple permissions.",
  "Access should be reviewed after ownership changes.",
  "Access should be reviewed after incident response.",
  "Access should be reviewed after a system migration.",
  "Access should be reviewed after a policy change.",
  "Access should be reviewed after a merger or team move.",
  "Access should be reviewed before a sensitive release.",
  "Do not approve access with an empty purpose.",
  "Do not accept risk without an owner and expiry.",
  "Do not export sensitive access data without redaction.",
  "Do not treat a group name as proof of need.",
  "Do not use a screenshot as the only critical evidence.",
  "Do not leave emergency access without post-use review.",
  "Do not delete revoked access history.",
  "Do not assume inactive users have no active tokens.",
  "Do not assume disabled accounts have no group membership.",
  "Do not close a review while remediation is unowned.",
  "Record the source of every access decision.",
  "Record the effective permission, not only the requested role.",
  "Record the last-used observation window.",
  "Record the reviewer and decision timestamp.",
  "Record the exception reason and expiry.",
  "Record the revocation result and actor.",
  "Record the next review date.",
  "Record the escalation contact.",
  "Record the backup owner.",
  "Record the evidence reference.",
  "Use explicit permission names in review notes.",
  "Use a bounded sample when reviewing access logs.",
  "Use redacted exports for broad stakeholder updates.",
  "Use independent review for critical access.",
  "Use a short expiry for temporary access.",
  "Use a second approval for production privilege.",
  "Use a break-glass log for emergency access.",
  "Use a revocation test for high-risk accounts.",
  "Use a rotation record for keys and tokens.",
  "Use a reconciliation report for group membership.",
  "When ownership is unclear, mark the review blocked.",
  "When usage is unknown, do not call access unused.",
  "When access is duplicated, identify the canonical grant.",
  "When access is inherited, review the parent source.",
  "When risk changes, repeat approval at the new level.",
  "When a subject changes role, revisit all privileged access.",
  "When an exception expires, revoke or renew explicitly.",
  "When evidence is missing, record the evidence gap.",
  "When access is revoked, validate the effective result.",
  "When a token is rotated, validate dependent integrations.",
];
const ACCESS_SCENARIOS = [
  "Quarterly privileged access review",
  "New administrator request",
  "Production database access",
  "Temporary incident access",
  "Break-glass access follow-up",
  "Service account ownership review",
  "API key rotation review",
  "Dormant account cleanup",
  "Contractor access expiry",
  "Role transfer review",
  "Team membership review",
  "Nested group review",
  "Sensitive report access",
  "Billing permission review",
  "Support impersonation review",
  "Cloud console access",
  "Analytics warehouse access",
  "Deployment pipeline access",
  "Secret manager access",
  "Audit log access",
  "Customer export access",
  "Security tool access",
  "Identity administrator review",
  "Regional data access",
  "Emergency token review",
  "Failed-login investigation",
  "Suspicious access review",
  "Post-incident access review",
  "Post-migration access review",
  "Post-release access review",
  "Policy exception review",
  "Access recertification",
  "Manager approval refresh",
  "Owner approval refresh",
  "Privacy purpose refresh",
  "Least-privilege remediation",
  "Separation-of-duties remediation",
  "Access evidence refresh",
  "Revoked access validation",
  "Expired access cleanup",
];
const CERTIFICATION_CHECKLIST = [
  "Subject identity is verified",
  "Subject employment or service status is current",
  "Access owner is named",
  "System owner is named",
  "Business owner is named",
  "Reviewer is independent",
  "Access type is classified",
  "System is classified",
  "Environment is classified",
  "Permission is written explicitly",
  "Role mapping is available",
  "Inherited grants are expanded",
  "Group membership is expanded",
  "Effective access is calculated",
  "Business purpose is current",
  "Purpose matches permission",
  "Purpose matches system",
  "Purpose matches subject role",
  "Last-used date is available",
  "Usage window is defined",
  "Unused access is flagged",
  "Duplicate access is flagged",
  "Conflicting access is flagged",
  "Separation of duties is checked",
  "Privileged access is highlighted",
  "Production access is highlighted",
  "Sensitive-data access is highlighted",
  "Export access is highlighted",
  "Billing access is highlighted",
  "Support access is highlighted",
  "Approval evidence is attached",
  "Owner evidence is attached",
  "Usage evidence is attached",
  "Log evidence is attached",
  "Exception evidence is attached",
  "Evidence is dated",
  "Evidence is attributable",
  "Evidence is redacted",
  "Evidence is reproducible",
  "Evidence is retained",
  "Expiry is set",
  "Expiry is realistic",
  "Expiry owner is named",
  "Renewal path is documented",
  "Revocation path is documented",
  "Revocation owner is named",
  "Revocation test is documented",
  "Emergency path is documented",
  "Emergency use is logged",
  "Emergency review is scheduled",
  "Token rotation is scheduled",
  "Credential rotation is scheduled",
  "Key rotation is scheduled",
  "Device restriction is reviewed",
  "Network restriction is reviewed",
  "Region restriction is reviewed",
  "Time restriction is reviewed",
  "Multi-factor protection is reviewed",
  "Authentication method is reviewed",
  "Failed-login alerts are reviewed",
  "Anomaly alerts are reviewed",
  "Privileged actions are logged",
  "Read actions are logged where required",
  "Export actions are logged",
  "Administrative actions are logged",
  "Log retention is sufficient",
  "Log access is restricted",
  "Review cadence is assigned",
  "Next review date is recorded",
  "Owner backup is recorded",
  "Security escalation is recorded",
  "Privacy escalation is recorded",
  "Operations escalation is recorded",
  "Support escalation is recorded",
  "Risk is rated",
  "Risk rationale is written",
  "Risk owner is named",
  "Risk expiry is written",
  "Accepted risk is approved",
  "Rejected access has a reason",
  "Revoked access has a reason",
  "Expired access has a reason",
  "Blocked review has a dependency",
  "Remediation action is written",
  "Remediation owner is named",
  "Remediation due date is written",
  "Remediation evidence is expected",
  "Manager decision is recorded",
  "System owner decision is recorded",
  "Security decision is recorded",
  "Privacy decision is recorded",
  "Business decision is recorded",
  "Decision timestamp is recorded",
  "Decision source is recorded",
  "Decision can be audited",
  "Stakeholder notification is recorded",
  "Subject notification is recorded",
  "Support handoff is recorded",
  "Access change is tested",
  "Access change is validated",
  "Access change is reconciled",
  "Access change is monitored",
  "Access change has a rollback",
  "Rollback owner is named",
  "Rollback evidence is retained",
  "Closure reason is written",
  "Closure reviewer is named",
  "Closure date is written",
  "Open questions remain visible",
  "Open findings remain visible",
  "Open exceptions remain visible",
  "Future review remains scheduled",
  "Export contains review context",
  "Export contains decision context",
  "Export excludes unnecessary secrets",
  "Export excludes unnecessary personal data",
  "Final access state is confirmed",
  "Final owner acknowledgement is recorded",
  "Final reviewer acknowledgement is recorded",
  "Final audit reference is recorded",
];

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clean(value, fallback = "", limit = 1200) {
  if (typeof value !== "string") return fallback;
  const result = value.trim();
  return result ? result.slice(0, limit) : fallback;
}

function now() {
  return new Date().toISOString();
}

function emptyData() {
  return { reviews: [], evidence: [], owners: [], notes: [] };
}

function readData() {
  if (typeof window === "undefined") return emptyData();
  try {
    return { ...emptyData(), ...JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return emptyData();
  }
}

function tone(value) {
  if (["approved", "revoked", "accepted", "available", "low"].includes(value)) return "emerald";
  if (["critical", "high", "expired", "blocked"].includes(value)) return "rose";
  if (["requested", "reviewing", "medium", "busy"].includes(value)) return "amber";
  return "slate";
}

function Badge({ children, value }) {
  const colors = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${colors[tone(value)] || colors.slate}`}>{children}</span>;
}

function Button({ children, icon: Icon, onClick, variant = "secondary", type = "button" }) {
  const variants = {
    secondary: "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
    primary: "border-violet-600 bg-violet-600 text-white hover:bg-violet-700",
    danger: "border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
  };
  return <button type={type} onClick={onClick} className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold ${variants[variant]}`}>{Icon && <Icon size={14} />}{children}</button>;
}

function Field({ label, value, onChange, placeholder, options, required = false }) {
  const common = { value: value || "", onChange: (event) => onChange(event.target.value), required, className: "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-500" };
  return <label className="block text-xs font-semibold text-slate-700">{label}{options ? <select {...common}><option value="">Select...</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input {...common} placeholder={placeholder} />}</label>;
}

function Area({ label, value, onChange, placeholder }) {
  return <label className="block text-xs font-semibold text-slate-700">{label}<textarea value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500" /></label>;
}

function Section({ title, description, action, children }) {
  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="text-sm font-semibold text-slate-950">{title}</h2><p className="mt-1 text-xs text-slate-500">{description}</p></div>{action}</div>{children}</section>;
}

function Empty({ title, description, action }) {
  return <div className="p-8 text-center"><p className="text-sm font-semibold text-slate-800">{title}</p><p className="mx-auto mt-1 max-w-md text-xs text-slate-500">{description}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

function Modal({ title, onClose, children }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-5"><h2 className="font-semibold">{title}</h2><button type="button" onClick={onClose}><X size={17} /></button></div><div className="p-5">{children}</div></div></div>;
}

function Stat({ icon: Icon, label, value, detail }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Icon size={17} /></span></div><p className="mt-2 text-[11px] text-slate-500">{detail}</p></article>;
}

export default function AccessReviewPage() {
  const [data, setData] = useState(emptyData);
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [ascending, setAscending] = useState(false);
  const [modal, setModal] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewForm, setReviewForm] = useState({ title: "", subject: "", type: "role", system: "application", state: "planned", risk: "medium", owner: "", reviewer: "", purpose: "", permission: "", expiry: "", impact: "" });
  const [evidenceForm, setEvidenceForm] = useState({ title: "", type: "access-log", reference: "", detail: "" });
  const [ownerForm, setOwnerForm] = useState({ name: "", role: "", area: "", availability: "available", backup: "" });
  const [noteForm, setNoteForm] = useState({ title: "", audience: "", detail: "" });

  useEffect(() => setData(readData()), []);
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => { if (!notice) return undefined; const timer = window.setTimeout(() => setNotice(""), 2500); return () => window.clearTimeout(timer); }, [notice]);

  const selected = data.reviews.find((item) => item.id === selectedId);
  const reviews = selectedId ? data.reviews.filter((item) => item.id === selectedId) : data.reviews;
  const evidence = data.evidence.filter((item) => !selectedId || item.reviewId === selectedId);
  const owners = data.owners.filter((item) => !selectedId || item.reviewId === selectedId);
  const notes = data.notes.filter((item) => !selectedId || item.reviewId === selectedId);
  const approved = reviews.filter((item) => item.state === "approved" || item.state === "accepted").length;
  const open = reviews.filter((item) => !["revoked", "expired", "accepted"].includes(item.state)).length;
  const highRisk = reviews.filter((item) => ["critical", "high"].includes(item.risk) && !["revoked", "expired"].includes(item.state)).length;
  const coverage = reviews.length ? Math.round((approved / reviews.length) * 100) : 0;
  const filtered = useMemo(() => reviews.filter((item) => `${item.title} ${item.subject} ${item.type} ${item.system} ${item.state} ${item.risk} ${item.owner}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => { const result = a.title.localeCompare(b.title); return ascending ? result : result * -1; }), [ascending, reviews, query]);

  function update(key, items) { setData((current) => ({ ...current, [key]: items })); }
  function addReview(event) {
    event.preventDefault();
    const item = { ...reviewForm, id: makeId("review"), title: clean(reviewForm.title), subject: clean(reviewForm.subject), owner: clean(reviewForm.owner), reviewer: clean(reviewForm.reviewer), purpose: clean(reviewForm.purpose), permission: clean(reviewForm.permission), expiry: clean(reviewForm.expiry), impact: clean(reviewForm.impact), createdAt: now() };
    update("reviews", [item, ...data.reviews]);
    setSelectedId(item.id);
    setReviewForm({ title: "", subject: "", type: "role", system: "application", state: "planned", risk: "medium", owner: "", reviewer: "", purpose: "", permission: "", expiry: "", impact: "" });
    setModal("");
    setNotice("Access review created");
  }
  function addEvidence(event) {
    event.preventDefault();
    if (!selectedId) { setNotice("Select a review first"); return; }
    const item = { ...evidenceForm, id: makeId("evidence"), reviewId: selectedId, title: clean(evidenceForm.title), reference: clean(evidenceForm.reference), detail: clean(evidenceForm.detail), createdAt: now() };
    update("evidence", [item, ...data.evidence]);
    setEvidenceForm({ title: "", type: "access-log", reference: "", detail: "" });
    setModal("");
    setNotice("Access evidence added");
  }
  function addOwner(event) {
    event.preventDefault();
    if (!selectedId) { setNotice("Select a review first"); return; }
    const item = { ...ownerForm, id: makeId("owner"), reviewId: selectedId, name: clean(ownerForm.name), role: clean(ownerForm.role), area: clean(ownerForm.area), backup: clean(ownerForm.backup), createdAt: now() };
    update("owners", [item, ...data.owners]);
    setOwnerForm({ name: "", role: "", area: "", availability: "available", backup: "" });
    setModal("");
    setNotice("Access owner added");
  }
  function addNote(event) {
    event.preventDefault();
    if (!selectedId) { setNotice("Select a review first"); return; }
    const item = { ...noteForm, id: makeId("note"), reviewId: selectedId, title: clean(noteForm.title), audience: clean(noteForm.audience), detail: clean(noteForm.detail), createdAt: now() };
    update("notes", [item, ...data.notes]);
    setNoteForm({ title: "", audience: "", detail: "" });
    setModal("");
    setNotice("Review note added");
  }
  function changeField(key, itemId, field, value) { update(key, data[key].map((item) => item.id === itemId ? { ...item, [field]: value, updatedAt: now() } : item)); }
  function remove(key, itemId) { update(key, data[key].filter((item) => item.id !== itemId)); setNotice("Record removed"); }
  function applyControls() {
    if (!selectedId) { setNotice("Select a review first"); return; }
    const existing = new Set(evidence.map((item) => item.title));
    const additions = CONTROL_PROMPTS.slice(0, 18).filter((title) => !existing.has(title)).map((title) => ({ id: makeId("control"), reviewId: selectedId, title, type: "exception", reference: "", detail: "Control prompt applied; attach review proof.", createdAt: now() }));
    update("evidence", [...additions, ...data.evidence]);
    setNotice(`${additions.length} access controls added`);
  }
  function copySummary() {
    navigator.clipboard?.writeText([`Review: ${selected?.title || "All access reviews"}`, `Coverage: ${coverage}%`, `Approved: ${approved}`, `Open: ${open}`, `High risk: ${highRisk}`, `Evidence: ${evidence.length}`, `Owners: ${owners.length}`, `Notes: ${notes.length}`, selected?.purpose || "No purpose recorded."].join("\n"));
    setNotice("Access summary copied");
  }
  function exportRows() {
    const rows = [["Type", "Title", "State", "Risk", "Owner", "Detail"], ...reviews.map((item) => ["Review", item.title, item.state, item.risk, item.owner, item.permission]), ...evidence.map((item) => ["Evidence", item.title, item.type, "", "", item.reference]), ...owners.map((item) => ["Owner", item.name, item.availability, "", item.role, item.area]), ...notes.map((item) => ["Note", item.title, "", "", item.audience, item.detail])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "admin-access-review.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Access review export downloaded");
  }

  const tabs = [["overview", "Overview"], ["reviews", `Reviews (${reviews.length})`], ["evidence", `Evidence (${evidence.length})`], ["owners", `Owners (${owners.length})`], ["notes", `Notes (${notes.length})`]];
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-7xl space-y-5">
    <div className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-slate-50 p-5 shadow-sm sm:p-7"><div className="flex flex-col gap-5 lg:flex-row lg:justify-between"><div className="max-w-3xl"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700"><KeyRound size={16} /> Admin access review</div><h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Make access decisions visible, bounded, and easy to recertify.</h1><p className="mt-3 text-sm leading-6 text-slate-600">A browser-local administration workspace for access purpose, permission scope, approvals, evidence, ownership, expiry, and remediation.</p></div><div className="flex flex-wrap gap-2"><Button icon={Plus} variant="primary" onClick={() => setModal("review")}>New review</Button><Button icon={Copy} onClick={copySummary}>Copy summary</Button><Button icon={Download} onClick={exportRows}>Export</Button></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={Gauge} label="Review coverage" value={`${coverage}%`} detail={`${approved} approved or accepted`} /><Stat icon={AlertTriangle} label="Open reviews" value={open} detail={`${highRisk} high-risk items`} /><Stat icon={Shield} label="Evidence" value={evidence.length} detail="Decision proof indexed" /><Stat icon={Users} label="Owners" value={owners.length} detail={`${notes.length} review notes`} /></div></div>
    {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">{notice}</div>}
    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">{tabs.map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-t-lg px-3 py-2 text-xs font-semibold ${tab === value ? "border-b-2 border-violet-600 text-violet-700" : "text-slate-500"}`}>{label}</button>)}</div>
    <Section title="Review context" description="Select the access review under consideration." action={<Button icon={RefreshCw} onClick={() => { setData(readData()); setNotice("Workspace refreshed"); }}>Refresh</Button>}><div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto]"><label className="text-xs font-semibold text-slate-700">Selected review<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="">All reviews</option>{data.reviews.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><div className="flex items-end gap-2"><Button icon={ClipboardCheck} onClick={applyControls}>Apply controls</Button><Button icon={Plus} onClick={() => setModal("review")}>Add review</Button></div></div><div className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-2 xl:grid-cols-3">{data.reviews.slice(0, 6).map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`rounded-xl border p-4 text-left ${selectedId === item.id ? "border-violet-300 bg-violet-50" : "border-slate-200"}`}><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold">{item.title}</p><Badge value={item.state}>{item.state}</Badge></div><p className="mt-2 line-clamp-2 text-xs text-slate-500">{item.purpose || "No business purpose recorded."}</p><p className="mt-3 text-[11px] text-slate-400">{item.system} · {item.subject || "No subject"} · {item.risk} risk</p></button>)}{!data.reviews.length && <div className="md:col-span-2 xl:col-span-3"><Empty title="No access reviews" description="Create a review for privileged access, a role, a service account, a key, or a temporary permission." action={<Button icon={Plus} variant="primary" onClick={() => setModal("review")}>Create review</Button>} /></div>}</div></Section>
    {tab === "overview" && <div className="grid gap-5 xl:grid-cols-2"><Section title="Access posture" description="A quick read of review coverage and remaining attention."><div className="space-y-4 p-5"><div className="rounded-xl border border-violet-100 bg-violet-50 p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-violet-900">Decision coverage</p><p className="text-lg font-semibold text-violet-900">{coverage}%</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-violet-600" style={{ width: `${coverage}%` }} /></div><p className="mt-3 text-xs text-violet-800">{highRisk ? `${highRisk} high-risk review${highRisk === 1 ? "" : "s"} need attention.` : "No high-risk open reviews recorded."}</p></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Reviews</p><p className="mt-1 text-xl font-semibold">{reviews.length}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Evidence</p><p className="mt-1 text-xl font-semibold">{evidence.length}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Owners</p><p className="mt-1 text-xl font-semibold">{owners.length}</p></div></div><p className="text-[11px] text-slate-500">Control library: {CONTROL_PROMPTS.length} reusable access-review prompts.</p></div></Section><Section title="Selected review narrative" description="Keep purpose, permission, and impact together."><div className="space-y-4 p-5"><Area label="Purpose" value={selected?.purpose || ""} onChange={(value) => selected && changeField("reviews", selected.id, "purpose", value)} placeholder="Why is this access needed?" /><Area label="Permission" value={selected?.permission || ""} onChange={(value) => selected && changeField("reviews", selected.id, "permission", value)} placeholder="What effective permission is being reviewed?" /><Area label="Impact" value={selected?.impact || ""} onChange={(value) => selected && changeField("reviews", selected.id, "impact", value)} placeholder="What could happen if this access is wrong?" /></div></Section><Section title="Access principles" description="Use consistent safeguards for every access decision."><div className="grid gap-3 p-5 sm:grid-cols-2">{[["Identify", "Name the subject, owner, system, and effective permission.", Users], ["Minimize", "Grant only what the documented purpose requires.", Shield], ["Prove", "Index approvals, usage, logs, and exception evidence.", CheckCircle2], ["Expire", "Bound temporary and accepted access with review dates.", KeyRound]].map(([title, detail, Icon]) => <div key={title} className="rounded-xl border border-slate-200 p-4"><Icon size={17} className="text-violet-600" /><p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div>)}</div></Section></div>}
    {tab === "reviews" && <Section title="Access reviews" description="Track purpose, scope, risk, expiry, and decision state." action={<Button icon={Plus} variant="primary" onClick={() => setModal("review")}>Add review</Button>}><div className="flex gap-3 border-b border-slate-100 p-5"><div className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reviews, subjects, systems, owners..." className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm" /></div><Button icon={ascending ? ArrowUpAZ : ArrowDownAZ} onClick={() => setAscending((value) => !value)}>Sort</Button></div>{!filtered.length ? <Empty title="No access reviews" description="Create a review or adjust the search query." action={<Button icon={Plus} onClick={() => setModal("review")}>Add review</Button>} /> : <div className="divide-y">{filtered.map((item) => <div key={item.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{item.title}</h3><Badge value={item.state}>{item.state}</Badge><Badge value={item.risk}>{item.risk} risk</Badge><Badge value={item.system}>{item.system}</Badge></div><p className="mt-2 text-xs text-slate-600">{item.purpose || "No purpose recorded."}</p><p className="mt-2 text-[11px] text-slate-500">Subject: {item.subject || "Unassigned"} · Owner: {item.owner || "Unassigned"} · Expires: {item.expiry || "Not set"}</p></div><div className="flex gap-2"><select value={item.state} onChange={(event) => changeField("reviews", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{REVIEW_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => remove("reviews", item.id)}>Remove</Button></div></div>)}</div>}</Section>}
    {tab === "evidence" && <Section title="Access evidence" description="Index logs, approvals, usage reports, exceptions, and revocation proof." action={<Button icon={Plus} variant="primary" onClick={() => setModal("evidence")}>Add evidence</Button>}>{!evidence.length ? <Empty title="No evidence" description="Add evidence that supports the access decision." action={<Button icon={Plus} onClick={() => setModal("evidence")}>Add evidence</Button>} /> : <div className="divide-y">{evidence.map((item) => <div key={item.id} className="flex justify-between gap-3 p-5"><div><div className="flex flex-wrap gap-2"><h3 className="text-sm font-semibold">{item.title}</h3><Badge value={item.type}>{item.type}</Badge></div><p className="mt-2 text-xs text-slate-600">{item.detail || "No detail recorded."}</p><p className="mt-2 text-[11px] text-violet-700">{item.reference || "No reference recorded"}</p></div><Button variant="danger" icon={Trash2} onClick={() => remove("evidence", item.id)}>Remove</Button></div>)}</div>}</Section>}
    {tab === "owners" && <Section title="Access ownership" description="Map access owners, reviewers, backups, and availability." action={<Button icon={Plus} variant="primary" onClick={() => setModal("owner")}>Add owner</Button>}>{!owners.length ? <Empty title="No owners" description="Add named owners before approving access." action={<Button icon={Plus} onClick={() => setModal("owner")}>Add owner</Button>} /> : <div className="grid gap-3 p-5 md:grid-cols-2">{owners.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between gap-3"><div><p className="text-sm font-semibold">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.role} · {item.area}</p></div><Badge value={item.availability}>{item.availability}</Badge></div><p className="mt-3 text-[11px] text-slate-500">Backup: {item.backup || "Not assigned"}</p><div className="mt-3"><Button variant="danger" icon={Trash2} onClick={() => remove("owners", item.id)}>Remove</Button></div></div>)}</div>}</Section>}
    {tab === "notes" && <Section title="Review notes" description="Keep access communication and remediation updates visible." action={<Button icon={Plus} variant="primary" onClick={() => setModal("note")}>Add note</Button>}>{!notes.length ? <Empty title="No review notes" description="Record an access decision, remediation update, or stakeholder communication." action={<Button icon={Plus} onClick={() => setModal("note")}>Add note</Button>} /> : <div className="divide-y">{notes.map((item) => <div key={item.id} className="flex justify-between gap-3 p-5"><div><h3 className="text-sm font-semibold">{item.title}</h3><p className="mt-2 text-xs text-slate-600">{item.detail || "No detail recorded."}</p><p className="mt-2 text-[11px] text-slate-500">Audience: {item.audience || "Not set"}</p></div><Button variant="danger" icon={Trash2} onClick={() => remove("notes", item.id)}>Remove</Button></div>)}</div>}</Section>}
    <Section title="Access review guide" description="Decision rules for least privilege, evidence, expiry, and remediation."><div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-4">{REVIEW_GUIDE.slice(0, 24).map((rule) => <p key={rule} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">{rule}</p>)}</div><p className="px-5 pb-5 text-[11px] text-slate-400">Guide coverage: {REVIEW_GUIDE.length} rules.</p></Section>
    <Section title="Access scenarios" description="Start a review from a recognizable governance scenario."><div className="flex flex-wrap gap-2 p-5">{ACCESS_SCENARIOS.map((scenario) => <button key={scenario} type="button" onClick={() => { setModal("review"); setReviewForm((current) => ({ ...current, title: scenario })); setNotice("Scenario loaded into review form"); }} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600 hover:border-violet-300 hover:text-violet-700">{scenario}</button>)}</div></Section>
    <Section title="Certification checklist" description="Use a complete recertification pass before approving, renewing, or accepting access."><div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-4">{CERTIFICATION_CHECKLIST.slice(0, 32).map((item) => <button key={item} type="button" onClick={() => { setTab("evidence"); setEvidenceForm((current) => ({ ...current, title: item })); setNotice("Checklist item loaded into evidence form"); }} className="rounded-lg border border-slate-200 px-3 py-2 text-left text-[11px] text-slate-600 hover:border-violet-300 hover:text-violet-700">{item}</button>)}</div><p className="px-5 pb-5 text-[11px] text-slate-400">Certification coverage: {CERTIFICATION_CHECKLIST.length} checks.</p></Section>
    {modal === "review" && <Modal title="Create access review" onClose={() => setModal("")}><form onSubmit={addReview} className="space-y-4"><Field label="Review title" value={reviewForm.title} onChange={(value) => setReviewForm({ ...reviewForm, title: value })} placeholder="Quarterly privileged access review" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Subject" value={reviewForm.subject} onChange={(value) => setReviewForm({ ...reviewForm, subject: value })} placeholder="Person, group, or service account" /><Field label="Access type" options={ACCESS_TYPES} value={reviewForm.type} onChange={(value) => setReviewForm({ ...reviewForm, type: value })} /><Field label="System" options={SYSTEMS} value={reviewForm.system} onChange={(value) => setReviewForm({ ...reviewForm, system: value })} /><Field label="State" options={REVIEW_STATES} value={reviewForm.state} onChange={(value) => setReviewForm({ ...reviewForm, state: value })} /><Field label="Risk" options={RISK_LEVELS} value={reviewForm.risk} onChange={(value) => setReviewForm({ ...reviewForm, risk: value })} /><Field label="Owner" value={reviewForm.owner} onChange={(value) => setReviewForm({ ...reviewForm, owner: value })} placeholder="Access owner" /><Field label="Reviewer" value={reviewForm.reviewer} onChange={(value) => setReviewForm({ ...reviewForm, reviewer: value })} placeholder="Independent reviewer" /><Field label="Expiry" value={reviewForm.expiry} onChange={(value) => setReviewForm({ ...reviewForm, expiry: value })} placeholder="2026-12-31" /></div><Area label="Purpose" value={reviewForm.purpose} onChange={(value) => setReviewForm({ ...reviewForm, purpose: value })} placeholder="Why is this access needed?" /><Area label="Permission" value={reviewForm.permission} onChange={(value) => setReviewForm({ ...reviewForm, permission: value })} placeholder="What effective permission is being reviewed?" /><Area label="Impact" value={reviewForm.impact} onChange={(value) => setReviewForm({ ...reviewForm, impact: value })} placeholder="What is the consequence of incorrect access?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Create review</Button></div></form></Modal>}
    {modal === "evidence" && <Modal title="Add access evidence" onClose={() => setModal("")}><form onSubmit={addEvidence} className="space-y-4"><Field label="Evidence title" value={evidenceForm.title} onChange={(value) => setEvidenceForm({ ...evidenceForm, title: value })} placeholder="Manager approval record" required /><Field label="Type" options={EVIDENCE_TYPES} value={evidenceForm.type} onChange={(value) => setEvidenceForm({ ...evidenceForm, type: value })} /><Field label="Reference" value={evidenceForm.reference} onChange={(value) => setEvidenceForm({ ...evidenceForm, reference: value })} placeholder="URL, file, ticket, or report" /><Area label="Detail" value={evidenceForm.detail} onChange={(value) => setEvidenceForm({ ...evidenceForm, detail: value })} placeholder="What does this evidence prove?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add evidence</Button></div></form></Modal>}
    {modal === "owner" && <Modal title="Add access owner" onClose={() => setModal("")}><form onSubmit={addOwner} className="space-y-4"><Field label="Name" value={ownerForm.name} onChange={(value) => setOwnerForm({ ...ownerForm, name: value })} placeholder="Named owner" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Role" value={ownerForm.role} onChange={(value) => setOwnerForm({ ...ownerForm, role: value })} placeholder="System owner" /><Field label="Area" value={ownerForm.area} onChange={(value) => setOwnerForm({ ...ownerForm, area: value })} placeholder="Identity" /><Field label="Availability" options={AVAILABILITY} value={ownerForm.availability} onChange={(value) => setOwnerForm({ ...ownerForm, availability: value })} /><Field label="Backup" value={ownerForm.backup} onChange={(value) => setOwnerForm({ ...ownerForm, backup: value })} placeholder="Backup owner" /></div><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add owner</Button></div></form></Modal>}
    {modal === "note" && <Modal title="Add review note" onClose={() => setModal("")}><form onSubmit={addNote} className="space-y-4"><Field label="Title" value={noteForm.title} onChange={(value) => setNoteForm({ ...noteForm, title: value })} placeholder="Remediation update" required /><Field label="Audience" value={noteForm.audience} onChange={(value) => setNoteForm({ ...noteForm, audience: value })} placeholder="Security and system owners" /><Area label="Detail" value={noteForm.detail} onChange={(value) => setNoteForm({ ...noteForm, detail: value })} placeholder="What was communicated or decided?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add note</Button></div></form></Modal>}
  </div></main>;
}
