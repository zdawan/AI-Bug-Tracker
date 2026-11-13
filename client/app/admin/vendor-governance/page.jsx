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
  FileCheck2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";

const STORAGE_KEY = "admin-vendor-governance-v1";
const STATES = ["planned", "requested", "reviewing", "approved", "active", "watch", "paused", "offboarded"];
const RISKS = ["critical", "high", "medium", "low"];
const VENDOR_TYPES = ["cloud", "payment", "analytics", "identity", "support", "communication", "infrastructure", "security", "data", "consulting"];
const EVIDENCE_TYPES = ["contract", "security-review", "privacy-review", "insurance", "sla", "audit", "usage", "incident", "approval", "offboarding"];
const REVIEW_STATES = ["pending", "passed", "failed", "exception", "expired"];
const CONTROL_PROMPTS = [
  "Confirm vendor owner",
  "Confirm business owner",
  "Confirm technical owner",
  "Confirm vendor purpose",
  "Confirm service scope",
  "Confirm data scope",
  "Confirm user scope",
  "Confirm environment scope",
  "Confirm contract owner",
  "Confirm renewal date",
  "Confirm termination notice",
  "Confirm service level",
  "Confirm support level",
  "Confirm escalation path",
  "Confirm security review",
  "Confirm privacy review",
  "Confirm compliance review",
  "Confirm insurance evidence",
  "Confirm audit evidence",
  "Confirm subprocessor list",
  "Confirm data location",
  "Confirm data transfer",
  "Confirm data retention",
  "Confirm deletion process",
  "Confirm encryption",
  "Confirm key ownership",
  "Confirm access model",
  "Confirm privileged access",
  "Confirm authentication",
  "Confirm logging",
  "Confirm monitoring",
  "Confirm incident response",
  "Confirm breach notification",
  "Confirm backup",
  "Confirm recovery",
  "Confirm continuity",
  "Confirm availability",
  "Confirm latency",
  "Confirm capacity",
  "Confirm integration health",
  "Confirm API limits",
  "Confirm API version",
  "Confirm dependency risk",
  "Confirm concentration risk",
  "Confirm lock-in risk",
  "Confirm exit plan",
  "Confirm migration plan",
  "Confirm export path",
  "Confirm portability",
  "Confirm pricing",
  "Confirm billing owner",
  "Confirm invoice review",
  "Confirm renewal approval",
  "Confirm exception owner",
  "Confirm exception expiry",
  "Confirm remediation owner",
  "Confirm remediation date",
  "Confirm evidence location",
  "Confirm reviewer independence",
  "Confirm final decision",
];
const GOVERNANCE_GUIDE = [
  "Every vendor needs a named business owner.",
  "Every vendor needs a named technical owner.",
  "A contract is not proof that operational controls work.",
  "A security review should match the data and service scope.",
  "A privacy review should identify retention and deletion duties.",
  "A critical vendor needs a tested exit or recovery path.",
  "A vendor handling sensitive data needs a documented purpose.",
  "A vendor with privileged access needs stronger monitoring.",
  "A vendor exception needs an owner and expiry date.",
  "A renewal should not proceed with unresolved critical findings.",
  "A subprocessor change should trigger a targeted review.",
  "A service-level breach should remain visible after remediation.",
  "An incident should update vendor risk and evidence.",
  "Offboarding should include access revocation and data deletion.",
  "Exportability should be tested before it is needed.",
  "Do not approve a vendor with an empty service scope.",
  "Do not treat a questionnaire as the complete security review.",
  "Do not leave renewal decisions until the notice deadline.",
  "Do not hide concentration risk in a low rating.",
  "Do not accept an exception without a review date.",
  "Record the contract reference and renewal date.",
  "Record the data classes and regions.",
  "Record the owner and backup owner.",
  "Record the service-level objective and measurement.",
  "Record the incident and escalation contacts.",
  "Record the exit owner and migration path.",
  "Record the last evidence review date.",
  "Record the next evidence review date.",
  "Use a bounded pilot for uncertain integrations.",
  "Use a second reviewer for critical vendors.",
  "Use an independent privacy reviewer where required.",
  "Use a separate evidence reference for each control.",
  "When a vendor changes scope, repeat the review.",
  "When a vendor is acquired, review continuity risk.",
  "When a vendor changes subprocessors, review data flow.",
  "When a vendor has an incident, update the decision.",
  "When evidence expires, move the vendor to watch.",
  "When renewal is near, confirm open remediation.",
  "When offboarding begins, protect export and deletion proof.",
  "A passed review needs dated evidence.",
  "A failed review needs an owner and action.",
  "An exception needs rationale, owner, and expiry.",
  "An active vendor needs a review cadence.",
  "An offboarded vendor needs retained audit history.",
];
const VENDOR_SCENARIOS = [
  "New cloud vendor review",
  "Payment provider renewal",
  "Analytics provider review",
  "Identity provider review",
  "Support vendor review",
  "Security vendor review",
  "Data processor review",
  "Subprocessor change",
  "Contract renewal",
  "Contract termination",
  "Vendor incident follow-up",
  "Service-level breach review",
  "Vendor access review",
  "Vendor privacy review",
  "Vendor security review",
  "Vendor continuity review",
  "Vendor recovery exercise",
  "Vendor exit planning",
  "Vendor migration planning",
  "Vendor concentration review",
  "Vendor pricing review",
  "Vendor invoice review",
  "Vendor insurance refresh",
  "Vendor audit refresh",
  "Vendor evidence refresh",
  "Vendor ownership transfer",
  "Vendor scope expansion",
  "Vendor scope reduction",
  "Vendor data deletion",
  "Vendor access revocation",
  "Vendor API version change",
  "Vendor integration outage",
  "Vendor capacity review",
  "Vendor performance review",
  "Vendor compliance review",
  "Vendor exception renewal",
  "Vendor offboarding",
];
const CERTIFICATION_CHECKLIST = [
  "Purpose is documented",
  "Service scope is documented",
  "Data scope is documented",
  "User scope is documented",
  "Business owner is named",
  "Technical owner is named",
  "Backup owner is named",
  "Contract reference is stored",
  "Renewal date is stored",
  "Termination notice is stored",
  "Service level is stored",
  "Support path is stored",
  "Escalation path is stored",
  "Security review is current",
  "Privacy review is current",
  "Compliance review is current",
  "Subprocessors are known",
  "Regions are known",
  "Retention is known",
  "Deletion is tested",
  "Encryption is confirmed",
  "Access is reviewed",
  "Logging is confirmed",
  "Monitoring is confirmed",
  "Incident plan is confirmed",
  "Continuity plan is confirmed",
  "Recovery plan is confirmed",
  "Exit plan is confirmed",
  "Export path is tested",
  "Migration owner is named",
  "Risk is rated",
  "Risk rationale is written",
  "Exceptions are bounded",
  "Remediation is owned",
  "Evidence is dated",
  "Evidence is attributable",
  "Evidence is reproducible",
  "Renewal decision is approved",
  "Offboarding decision is approved",
  "Final decision is recorded",
];
const VENDOR_CHECKLIST = [
  "Vendor identity is verified",
  "Vendor legal name is stored",
  "Vendor service name is stored",
  "Vendor category is stored",
  "Vendor website is stored",
  "Vendor contract is stored",
  "Vendor order form is stored",
  "Vendor renewal date is stored",
  "Vendor notice period is stored",
  "Vendor termination terms are stored",
  "Vendor business owner is named",
  "Vendor technical owner is named",
  "Vendor security owner is named",
  "Vendor privacy owner is named",
  "Vendor finance owner is named",
  "Vendor backup owner is named",
  "Vendor escalation contact is named",
  "Vendor support contact is named",
  "Vendor incident contact is named",
  "Vendor renewal contact is named",
  "Service purpose is documented",
  "Service scope is documented",
  "Service boundary is documented",
  "Service dependencies are documented",
  "Service consumers are documented",
  "Service availability is documented",
  "Service support is documented",
  "Service capacity is documented",
  "Service performance is documented",
  "Service limitations are documented",
  "Data classes are documented",
  "Data subjects are documented",
  "Data regions are documented",
  "Data transfers are documented",
  "Data retention is documented",
  "Data deletion is documented",
  "Data export is documented",
  "Data portability is documented",
  "Data minimization is documented",
  "Data purpose is documented",
  "Subprocessors are documented",
  "Subprocessor change is monitored",
  "Security controls are documented",
  "Security certification is current",
  "Security audit is current",
  "Security findings are tracked",
  "Security remediation is tracked",
  "Security notification is tracked",
  "Security escalation is tested",
  "Authentication is reviewed",
  "Authorization is reviewed",
  "Privileged access is reviewed",
  "Credential rotation is reviewed",
  "Key management is reviewed",
  "Encryption is reviewed",
  "Logging is reviewed",
  "Monitoring is reviewed",
  "Vulnerability management is reviewed",
  "Incident response is reviewed",
  "Privacy controls are documented",
  "Privacy assessment is current",
  "Privacy findings are tracked",
  "Privacy remediation is tracked",
  "Deletion request path is tested",
  "Access request path is tested",
  "Correction request path is tested",
  "Breach notice path is tested",
  "Retention exception is documented",
  "Transfer mechanism is documented",
  "Continuity plan is documented",
  "Disaster recovery is documented",
  "Recovery objective is documented",
  "Recovery test is current",
  "Backup evidence is current",
  "Restore evidence is current",
  "Failover evidence is current",
  "Exit plan is documented",
  "Exit owner is named",
  "Exit timeline is estimated",
  "Exit dependency is named",
  "Exit cost is estimated",
  "Exit data export is tested",
  "Exit deletion is tested",
  "Exit access revocation is tested",
  "Exit communication is ready",
  "Exit replacement is identified",
  "Concentration risk is assessed",
  "Lock-in risk is assessed",
  "Geographic risk is assessed",
  "Financial risk is assessed",
  "Operational risk is assessed",
  "Security risk is assessed",
  "Privacy risk is assessed",
  "Compliance risk is assessed",
  "Continuity risk is assessed",
  "Risk owner is named",
  "Risk rationale is written",
  "Risk expiry is written",
  "Exception owner is named",
  "Exception rationale is written",
  "Exception expiry is written",
  "Remediation owner is named",
  "Remediation action is written",
  "Remediation due date is written",
  "Remediation evidence is expected",
  "Review cadence is assigned",
  "Review date is scheduled",
  "Reviewer is independent",
  "Review decision is recorded",
  "Review timestamp is recorded",
  "Review evidence is linked",
  "Approval threshold is met",
  "Renewal approval is recorded",
  "Renewal cost is reviewed",
  "Renewal scope is reviewed",
  "Renewal risk is reviewed",
  "Renewal exceptions are visible",
  "Incident history is reviewed",
  "Incident impact is recorded",
  "Incident remediation is recorded",
  "Incident lessons are recorded",
  "Usage is measured",
  "Unused capability is identified",
  "Unused license is identified",
  "Performance is measured",
  "Availability is measured",
  "Support quality is measured",
  "SLA breach is recorded",
  "SLA remediation is recorded",
  "Invoice owner is named",
  "Invoice review is current",
  "Pricing change is monitored",
  "Budget impact is recorded",
  "Final decision is approved",
  "Final decision owner is named",
  "Final decision expiry is written",
  "Final evidence index is complete",
];

function makeId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function clean(value, fallback = "", limit = 1200) { if (typeof value !== "string") return fallback; const result = value.trim(); return result ? result.slice(0, limit) : fallback; }
function now() { return new Date().toISOString(); }
function emptyData() { return { vendors: [], reviews: [], evidence: [], owners: [], notes: [] }; }
function readData() {
  if (typeof window === "undefined") return emptyData();
  try { return { ...emptyData(), ...JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") }; } catch { return emptyData(); }
}
function tone(value) {
  if (["approved", "active", "passed", "low", "available"].includes(value)) return "emerald";
  if (["critical", "high", "failed", "paused", "offboarded"].includes(value)) return "rose";
  if (["reviewing", "requested", "medium", "pending", "watch"].includes(value)) return "amber";
  return "slate";
}
function Badge({ children, value }) {
  const colors = { slate: "border-slate-200 bg-slate-50 text-slate-700", emerald: "border-emerald-200 bg-emerald-50 text-emerald-800", amber: "border-amber-200 bg-amber-50 text-amber-800", rose: "border-rose-200 bg-rose-50 text-rose-800" };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${colors[tone(value)] || colors.slate}`}>{children}</span>;
}
function Button({ children, icon: Icon, onClick, variant = "secondary", type = "button" }) {
  const variants = { secondary: "border-slate-200 bg-white text-slate-700 hover:border-slate-300", primary: "border-fuchsia-600 bg-fuchsia-600 text-white hover:bg-fuchsia-700", danger: "border-rose-200 bg-white text-rose-700 hover:bg-rose-50" };
  return <button type={type} onClick={onClick} className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold ${variants[variant]}`}>{Icon && <Icon size={14} />}{children}</button>;
}
function Field({ label, value, onChange, placeholder, options, required = false }) {
  const common = { value: value || "", onChange: (event) => onChange(event.target.value), required, className: "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-fuchsia-500" };
  return <label className="block text-xs font-semibold text-slate-700">{label}{options ? <select {...common}><option value="">Select...</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input {...common} placeholder={placeholder} />}</label>;
}
function Area({ label, value, onChange, placeholder }) { return <label className="block text-xs font-semibold text-slate-700">{label}<textarea value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-fuchsia-500" /></label>; }
function Section({ title, description, action, children }) { return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="text-sm font-semibold text-slate-950">{title}</h2><p className="mt-1 text-xs text-slate-500">{description}</p></div>{action}</div>{children}</section>; }
function Empty({ title, description, action }) { return <div className="p-8 text-center"><p className="text-sm font-semibold text-slate-800">{title}</p><p className="mx-auto mt-1 max-w-md text-xs text-slate-500">{description}</p>{action && <div className="mt-4">{action}</div>}</div>; }
function Modal({ title, onClose, children }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-5"><h2 className="font-semibold">{title}</h2><button type="button" onClick={onClose}><X size={17} /></button></div><div className="p-5">{children}</div></div></div>; }
function Stat({ icon: Icon, label, value, detail }) { return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-700"><Icon size={17} /></span></div><p className="mt-2 text-[11px] text-slate-500">{detail}</p></article>; }

export default function VendorGovernancePage() {
  const [data, setData] = useState(emptyData);
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [ascending, setAscending] = useState(false);
  const [modal, setModal] = useState("");
  const [notice, setNotice] = useState("");
  const [vendorForm, setVendorForm] = useState({ title: "", type: "cloud", state: "planned", risk: "medium", owner: "", businessOwner: "", renewal: "", purpose: "", scope: "", data: "", exit: "", impact: "" });
  const [reviewForm, setReviewForm] = useState({ title: "", state: "pending", owner: "", reviewer: "", decision: "", due: "" });
  const [evidenceForm, setEvidenceForm] = useState({ title: "", type: "contract", reference: "", detail: "" });
  const [ownerForm, setOwnerForm] = useState({ name: "", role: "", area: "", availability: "available", backup: "" });
  const [noteForm, setNoteForm] = useState({ title: "", audience: "", detail: "" });

  useEffect(() => setData(readData()), []);
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => { if (!notice) return undefined; const timer = window.setTimeout(() => setNotice(""), 2500); return () => window.clearTimeout(timer); }, [notice]);

  const selected = data.vendors.find((item) => item.id === selectedId);
  const vendors = selectedId ? data.vendors.filter((item) => item.id === selectedId) : data.vendors;
  const reviews = data.reviews.filter((item) => !selectedId || item.vendorId === selectedId);
  const evidence = data.evidence.filter((item) => !selectedId || item.vendorId === selectedId);
  const owners = data.owners.filter((item) => !selectedId || item.vendorId === selectedId);
  const notes = data.notes.filter((item) => !selectedId || item.vendorId === selectedId);
  const approved = vendors.filter((item) => ["approved", "active"].includes(item.state)).length;
  const active = vendors.filter((item) => item.state === "active").length;
  const highRisk = vendors.filter((item) => ["critical", "high"].includes(item.risk) && !["offboarded"].includes(item.state)).length;
  const coverage = vendors.length ? Math.round((approved / vendors.length) * 100) : 0;
  const filtered = useMemo(() => vendors.filter((item) => `${item.title} ${item.type} ${item.state} ${item.risk} ${item.owner} ${item.businessOwner}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => { const result = a.title.localeCompare(b.title); return ascending ? result : result * -1; }), [ascending, vendors, query]);

  function update(key, items) { setData((current) => ({ ...current, [key]: items })); }
  function addVendor(event) {
    event.preventDefault();
    const item = { ...vendorForm, id: makeId("vendor"), title: clean(vendorForm.title), owner: clean(vendorForm.owner), businessOwner: clean(vendorForm.businessOwner), renewal: clean(vendorForm.renewal), purpose: clean(vendorForm.purpose), scope: clean(vendorForm.scope), data: clean(vendorForm.data), exit: clean(vendorForm.exit), impact: clean(vendorForm.impact), createdAt: now() };
    update("vendors", [item, ...data.vendors]);
    setSelectedId(item.id);
    setVendorForm({ title: "", type: "cloud", state: "planned", risk: "medium", owner: "", businessOwner: "", renewal: "", purpose: "", scope: "", data: "", exit: "", impact: "" });
    setModal("");
    setNotice("Vendor record created");
  }
  function addReview(event) {
    event.preventDefault();
    if (!selectedId) { setNotice("Select a vendor first"); return; }
    const item = { ...reviewForm, id: makeId("review"), vendorId: selectedId, title: clean(reviewForm.title), owner: clean(reviewForm.owner), reviewer: clean(reviewForm.reviewer), decision: clean(reviewForm.decision), due: clean(reviewForm.due), createdAt: now() };
    update("reviews", [item, ...data.reviews]);
    setReviewForm({ title: "", state: "pending", owner: "", reviewer: "", decision: "", due: "" });
    setModal("");
    setNotice("Vendor review added");
  }
  function addEvidence(event) {
    event.preventDefault();
    if (!selectedId) { setNotice("Select a vendor first"); return; }
    const item = { ...evidenceForm, id: makeId("evidence"), vendorId: selectedId, title: clean(evidenceForm.title), reference: clean(evidenceForm.reference), detail: clean(evidenceForm.detail), createdAt: now() };
    update("evidence", [item, ...data.evidence]);
    setEvidenceForm({ title: "", type: "contract", reference: "", detail: "" });
    setModal("");
    setNotice("Vendor evidence added");
  }
  function addOwner(event) {
    event.preventDefault();
    if (!selectedId) { setNotice("Select a vendor first"); return; }
    const item = { ...ownerForm, id: makeId("owner"), vendorId: selectedId, name: clean(ownerForm.name), role: clean(ownerForm.role), area: clean(ownerForm.area), backup: clean(ownerForm.backup), createdAt: now() };
    update("owners", [item, ...data.owners]);
    setOwnerForm({ name: "", role: "", area: "", availability: "available", backup: "" });
    setModal("");
    setNotice("Vendor owner added");
  }
  function addNote(event) {
    event.preventDefault();
    if (!selectedId) { setNotice("Select a vendor first"); return; }
    const item = { ...noteForm, id: makeId("note"), vendorId: selectedId, title: clean(noteForm.title), audience: clean(noteForm.audience), detail: clean(noteForm.detail), createdAt: now() };
    update("notes", [item, ...data.notes]);
    setNoteForm({ title: "", audience: "", detail: "" });
    setModal("");
    setNotice("Vendor note added");
  }
  function changeField(key, itemId, field, value) { update(key, data[key].map((item) => item.id === itemId ? { ...item, [field]: value, updatedAt: now() } : item)); }
  function remove(key, itemId) { update(key, data[key].filter((item) => item.id !== itemId)); setNotice("Record removed"); }
  function applyControls() {
    if (!selectedId) { setNotice("Select a vendor first"); return; }
    const existing = new Set(evidence.map((item) => item.title));
    const additions = CONTROL_PROMPTS.slice(0, 20).filter((title) => !existing.has(title)).map((title) => ({ id: makeId("control"), vendorId: selectedId, title, type: "approval", reference: "", detail: "Governance prompt applied; attach vendor evidence.", createdAt: now() }));
    update("evidence", [...additions, ...data.evidence]);
    setNotice(`${additions.length} governance controls added`);
  }
  function copySummary() {
    navigator.clipboard?.writeText([`Vendor: ${selected?.title || "All vendors"}`, `Coverage: ${coverage}%`, `Approved or active: ${approved}`, `Active: ${active}`, `High risk: ${highRisk}`, `Reviews: ${reviews.length}`, `Evidence: ${evidence.length}`, `Owners: ${owners.length}`, `Notes: ${notes.length}`, selected?.purpose || "No purpose recorded."].join("\n"));
    setNotice("Vendor summary copied");
  }
  function exportRows() {
    const rows = [["Type", "Title", "State", "Risk", "Owner", "Detail"], ...vendors.map((item) => ["Vendor", item.title, item.state, item.risk, item.owner, item.scope]), ...reviews.map((item) => ["Review", item.title, item.state, "", item.owner, item.decision]), ...evidence.map((item) => ["Evidence", item.title, item.type, "", "", item.reference]), ...notes.map((item) => ["Note", item.title, "", "", item.audience, item.detail])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "admin-vendor-governance.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Vendor export downloaded");
  }

  const tabs = [["overview", "Overview"], ["vendors", `Vendors (${vendors.length})`], ["reviews", `Reviews (${reviews.length})`], ["evidence", `Evidence (${evidence.length})`], ["owners", `Owners (${owners.length})`], ["notes", `Notes (${notes.length})`]];
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-7xl space-y-5">
    <div className="rounded-3xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-white to-slate-50 p-5 shadow-sm sm:p-7"><div className="flex flex-col gap-5 lg:flex-row lg:justify-between"><div className="max-w-3xl"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-fuchsia-700"><FileCheck2 size={16} /> Admin vendor governance</div><h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Make vendor risk, evidence, ownership, and exit readiness easy to review.</h1><p className="mt-3 text-sm leading-6 text-slate-600">A browser-local administration workspace for vendor records, risk reviews, contracts, renewals, evidence, owners, exceptions, and offboarding.</p></div><div className="flex flex-wrap gap-2"><Button icon={Plus} variant="primary" onClick={() => setModal("vendor")}>New vendor</Button><Button icon={Copy} onClick={copySummary}>Copy summary</Button><Button icon={Download} onClick={exportRows}>Export</Button></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={ClipboardCheck} label="Review coverage" value={`${coverage}%`} detail={`${approved} approved or active`} /><Stat icon={AlertTriangle} label="Active vendors" value={active} detail={`${highRisk} high-risk vendors`} /><Stat icon={ShieldCheck} label="Evidence" value={evidence.length} detail="Governance proof indexed" /><Stat icon={Users} label="Owners" value={owners.length} detail={`${notes.length} governance notes`} /></div></div>
    {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">{notice}</div>}
    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">{tabs.map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-t-lg px-3 py-2 text-xs font-semibold ${tab === value ? "border-b-2 border-fuchsia-600 text-fuchsia-700" : "text-slate-500"}`}>{label}</button>)}</div>
    <Section title="Vendor context" description="Select the vendor record under review." action={<Button icon={RefreshCw} onClick={() => { setData(readData()); setNotice("Workspace refreshed"); }}>Refresh</Button>}><div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto]"><label className="text-xs font-semibold text-slate-700">Selected vendor<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="">All vendors</option>{data.vendors.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><div className="flex items-end gap-2"><Button icon={ClipboardCheck} onClick={applyControls}>Apply controls</Button><Button icon={Plus} onClick={() => setModal("vendor")}>Add vendor</Button></div></div><div className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-2 xl:grid-cols-3">{data.vendors.slice(0, 6).map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`rounded-xl border p-4 text-left ${selectedId === item.id ? "border-fuchsia-300 bg-fuchsia-50" : "border-slate-200"}`}><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold">{item.title}</p><Badge value={item.state}>{item.state}</Badge></div><p className="mt-2 line-clamp-2 text-xs text-slate-500">{item.purpose || "No vendor purpose recorded."}</p><p className="mt-3 text-[11px] text-slate-400">{item.type} · {item.owner || "Unassigned"} · {item.risk} risk</p></button>)}{!data.vendors.length && <div className="md:col-span-2 xl:col-span-3"><Empty title="No vendors" description="Create a vendor record for a cloud service, data processor, payment provider, security tool, or integration." action={<Button icon={Plus} variant="primary" onClick={() => setModal("vendor")}>Create vendor</Button>} /></div>}</div></Section>
    {tab === "overview" && <div className="grid gap-5 xl:grid-cols-2"><Section title="Vendor posture" description="A quick read of governance coverage and remaining attention."><div className="space-y-4 p-5"><div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50 p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-fuchsia-900">Governance coverage</p><p className="text-lg font-semibold text-fuchsia-900">{coverage}%</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-fuchsia-600" style={{ width: `${coverage}%` }} /></div><p className="mt-3 text-xs text-fuchsia-800">{highRisk ? `${highRisk} high-risk vendor${highRisk === 1 ? "" : "s"} need attention.` : "No high-risk open vendors recorded."}</p></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Vendors</p><p className="mt-1 text-xl font-semibold">{vendors.length}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Reviews</p><p className="mt-1 text-xl font-semibold">{reviews.length}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Evidence</p><p className="mt-1 text-xl font-semibold">{evidence.length}</p></div></div><p className="text-[11px] text-slate-500">Control library: {CONTROL_PROMPTS.length} reusable vendor prompts.</p></div></Section><Section title="Selected vendor narrative" description="Keep purpose, scope, data, and exit planning together."><div className="space-y-4 p-5"><Area label="Purpose" value={selected?.purpose || ""} onChange={(value) => selected && changeField("vendors", selected.id, "purpose", value)} placeholder="Why is this vendor needed?" /><Area label="Scope" value={selected?.scope || ""} onChange={(value) => selected && changeField("vendors", selected.id, "scope", value)} placeholder="What services and systems are covered?" /><Area label="Exit plan" value={selected?.exit || ""} onChange={(value) => selected && changeField("vendors", selected.id, "exit", value)} placeholder="How can the service be replaced or ended?" /></div></Section><Section title="Governance principles" description="Use consistent safeguards for third-party relationships."><div className="grid gap-3 p-5 sm:grid-cols-2">{[["Understand", "Name service, data, purpose, owners, and contract boundaries.", ClipboardCheck], ["Challenge", "Review security, privacy, continuity, concentration, and exit risk.", ShieldCheck], ["Prove", "Index contracts, audits, approvals, incidents, and usage evidence.", FileCheck2], ["Prepare", "Keep renewal, remediation, portability, and offboarding ready.", CheckCircle2]].map(([title, detail, Icon]) => <div key={title} className="rounded-xl border border-slate-200 p-4"><Icon size={17} className="text-fuchsia-600" /><p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div>)}</div></Section></div>}
    {tab === "vendors" && <Section title="Vendor records" description="Track scope, risk, ownership, renewals, and lifecycle state." action={<Button icon={Plus} variant="primary" onClick={() => setModal("vendor")}>Add vendor</Button>}><div className="flex gap-3 border-b border-slate-100 p-5"><div className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vendors, type, state, risk, owner..." className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm" /></div><Button icon={ascending ? ArrowUpAZ : ArrowDownAZ} onClick={() => setAscending((value) => !value)}>Sort</Button></div>{!filtered.length ? <Empty title="No vendors" description="Create a vendor or adjust the search query." action={<Button icon={Plus} onClick={() => setModal("vendor")}>Add vendor</Button>} /> : <div className="divide-y">{filtered.map((item) => <div key={item.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{item.title}</h3><Badge value={item.state}>{item.state}</Badge><Badge value={item.risk}>{item.risk} risk</Badge><Badge value={item.type}>{item.type}</Badge></div><p className="mt-2 text-xs text-slate-600">{item.purpose || "No purpose recorded."}</p><p className="mt-2 text-[11px] text-slate-500">Owner: {item.owner || "Unassigned"} · Renewal: {item.renewal || "Not set"} · Data: {item.data || "Not set"}</p></div><div className="flex gap-2"><select value={item.state} onChange={(event) => changeField("vendors", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => remove("vendors", item.id)}>Remove</Button></div></div>)}</div>}</Section>}
    {tab === "reviews" && <Section title="Vendor reviews" description="Capture security, privacy, compliance, continuity, and renewal decisions." action={<Button icon={Plus} variant="primary" onClick={() => setModal("review")}>Add review</Button>}>{!reviews.length ? <Empty title="No reviews" description="Select a vendor and add its governance reviews." action={<Button icon={Plus} onClick={() => setModal("review")}>Add review</Button>} /> : <div className="divide-y">{reviews.map((item) => <div key={item.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap gap-2"><h3 className="text-sm font-semibold">{item.title}</h3><Badge value={item.state}>{item.state}</Badge></div><p className="mt-2 text-xs text-slate-600">{item.decision || "No decision recorded."}</p><p className="mt-2 text-[11px] text-slate-500">Owner: {item.owner || "Unassigned"} · Reviewer: {item.reviewer || "Not set"} · Due: {item.due || "Not set"}</p></div><div className="flex gap-2"><select value={item.state} onChange={(event) => changeField("reviews", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{REVIEW_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => remove("reviews", item.id)}>Remove</Button></div></div>)}</div>}</Section>}
    {tab === "evidence" && <Section title="Vendor evidence" description="Index contracts, audits, security reviews, privacy reviews, incidents, and offboarding proof." action={<Button icon={Plus} variant="primary" onClick={() => setModal("evidence")}>Add evidence</Button>}>{!evidence.length ? <Empty title="No evidence" description="Add evidence that supports vendor approval, renewal, monitoring, or exit." action={<Button icon={Plus} onClick={() => setModal("evidence")}>Add evidence</Button>} /> : <div className="divide-y">{evidence.map((item) => <div key={item.id} className="flex justify-between gap-3 p-5"><div><div className="flex flex-wrap gap-2"><h3 className="text-sm font-semibold">{item.title}</h3><Badge value={item.type}>{item.type}</Badge></div><p className="mt-2 text-xs text-slate-600">{item.detail || "No detail recorded."}</p><p className="mt-2 text-[11px] text-fuchsia-700">{item.reference || "No reference recorded"}</p></div><Button variant="danger" icon={Trash2} onClick={() => remove("evidence", item.id)}>Remove</Button></div>)}</div>}</Section>}
    {tab === "owners" && <Section title="Vendor ownership" description="Map business, technical, security, privacy, and backup owners." action={<Button icon={Plus} variant="primary" onClick={() => setModal("owner")}>Add owner</Button>}>{!owners.length ? <Empty title="No owners" description="Add named owners before approving a vendor." action={<Button icon={Plus} onClick={() => setModal("owner")}>Add owner</Button>} /> : <div className="grid gap-3 p-5 md:grid-cols-2">{owners.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between gap-3"><div><p className="text-sm font-semibold">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.role} · {item.area}</p></div><Badge value={item.availability}>{item.availability}</Badge></div><p className="mt-3 text-[11px] text-slate-500">Backup: {item.backup || "Not assigned"}</p><div className="mt-3"><Button variant="danger" icon={Trash2} onClick={() => remove("owners", item.id)}>Remove</Button></div></div>)}</div>}</Section>}
    {tab === "notes" && <Section title="Vendor notes" description="Keep renewal, incident, remediation, and stakeholder updates visible." action={<Button icon={Plus} variant="primary" onClick={() => setModal("note")}>Add note</Button>}>{!notes.length ? <Empty title="No vendor notes" description="Record an update, decision, remediation, or communication." action={<Button icon={Plus} onClick={() => setModal("note")}>Add note</Button>} /> : <div className="divide-y">{notes.map((item) => <div key={item.id} className="flex justify-between gap-3 p-5"><div><h3 className="text-sm font-semibold">{item.title}</h3><p className="mt-2 text-xs text-slate-600">{item.detail || "No detail recorded."}</p><p className="mt-2 text-[11px] text-slate-500">Audience: {item.audience || "Not set"}</p></div><Button variant="danger" icon={Trash2} onClick={() => remove("notes", item.id)}>Remove</Button></div>)}</div>}</Section>}
    <Section title="Vendor governance guide" description="Decision rules for third-party risk, renewals, incidents, and offboarding."><div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-4">{GOVERNANCE_GUIDE.slice(0, 24).map((rule) => <p key={rule} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">{rule}</p>)}</div><p className="px-5 pb-5 text-[11px] text-slate-400">Guide coverage: {GOVERNANCE_GUIDE.length} rules.</p></Section>
    <Section title="Vendor scenarios" description="Start a governance record from a recognizable third-party scenario."><div className="flex flex-wrap gap-2 p-5">{VENDOR_SCENARIOS.map((scenario) => <button key={scenario} type="button" onClick={() => { setModal("vendor"); setVendorForm((current) => ({ ...current, title: scenario })); setNotice("Scenario loaded into vendor form"); }} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600 hover:border-fuchsia-300 hover:text-fuchsia-700">{scenario}</button>)}</div></Section>
    <Section title="Vendor certification checklist" description="Use a complete governance pass before approval, renewal, or offboarding."><div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-4">{CERTIFICATION_CHECKLIST.slice(0, 24).map((item) => <button key={item} type="button" onClick={() => { setTab("evidence"); setEvidenceForm((current) => ({ ...current, title: item })); setNotice("Checklist item loaded into evidence form"); }} className="rounded-lg border border-slate-200 px-3 py-2 text-left text-[11px] text-slate-600 hover:border-fuchsia-300 hover:text-fuchsia-700">{item}</button>)}</div><p className="px-5 pb-5 text-[11px] text-slate-400">Certification coverage: {CERTIFICATION_CHECKLIST.length} checks.</p></Section>
    <Section title="Vendor assurance checklist" description="Use detailed assurance checks for renewal, exception, incident, and exit decisions."><div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-4">{VENDOR_CHECKLIST.slice(0, 32).map((item) => <button key={item} type="button" onClick={() => { setTab("evidence"); setEvidenceForm((current) => ({ ...current, title: item })); setNotice("Assurance item loaded into evidence form"); }} className="rounded-lg border border-slate-200 px-3 py-2 text-left text-[11px] text-slate-600 hover:border-fuchsia-300 hover:text-fuchsia-700">{item}</button>)}</div><p className="px-5 pb-5 text-[11px] text-slate-400">Assurance coverage: {VENDOR_CHECKLIST.length} checks.</p></Section>
    {modal === "vendor" && <Modal title="Create vendor record" onClose={() => setModal("")}><form onSubmit={addVendor} className="space-y-4"><Field label="Vendor name" value={vendorForm.title} onChange={(value) => setVendorForm({ ...vendorForm, title: value })} placeholder="Cloud analytics provider" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Type" options={VENDOR_TYPES} value={vendorForm.type} onChange={(value) => setVendorForm({ ...vendorForm, type: value })} /><Field label="State" options={STATES} value={vendorForm.state} onChange={(value) => setVendorForm({ ...vendorForm, state: value })} /><Field label="Risk" options={RISKS} value={vendorForm.risk} onChange={(value) => setVendorForm({ ...vendorForm, risk: value })} /><Field label="Owner" value={vendorForm.owner} onChange={(value) => setVendorForm({ ...vendorForm, owner: value })} placeholder="Technical owner" /><Field label="Business owner" value={vendorForm.businessOwner} onChange={(value) => setVendorForm({ ...vendorForm, businessOwner: value })} placeholder="Business owner" /><Field label="Renewal" value={vendorForm.renewal} onChange={(value) => setVendorForm({ ...vendorForm, renewal: value })} placeholder="2027-01-31" /></div><Area label="Purpose" value={vendorForm.purpose} onChange={(value) => setVendorForm({ ...vendorForm, purpose: value })} placeholder="Why is this vendor needed?" /><Area label="Scope" value={vendorForm.scope} onChange={(value) => setVendorForm({ ...vendorForm, scope: value })} placeholder="Services and systems covered." /><Area label="Data" value={vendorForm.data} onChange={(value) => setVendorForm({ ...vendorForm, data: value })} placeholder="Data classes and regions." /><Area label="Exit plan" value={vendorForm.exit} onChange={(value) => setVendorForm({ ...vendorForm, exit: value })} placeholder="How can the service be replaced or ended?" /><Area label="Impact" value={vendorForm.impact} onChange={(value) => setVendorForm({ ...vendorForm, impact: value })} placeholder="What happens if the vendor is unavailable?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Create vendor</Button></div></form></Modal>}
    {modal === "review" && <Modal title="Add vendor review" onClose={() => setModal("")}><form onSubmit={addReview} className="space-y-4"><Field label="Review title" value={reviewForm.title} onChange={(value) => setReviewForm({ ...reviewForm, title: value })} placeholder="Security and privacy review" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="State" options={REVIEW_STATES} value={reviewForm.state} onChange={(value) => setReviewForm({ ...reviewForm, state: value })} /><Field label="Owner" value={reviewForm.owner} onChange={(value) => setReviewForm({ ...reviewForm, owner: value })} placeholder="Review owner" /><Field label="Reviewer" value={reviewForm.reviewer} onChange={(value) => setReviewForm({ ...reviewForm, reviewer: value })} placeholder="Independent reviewer" /><Field label="Due" value={reviewForm.due} onChange={(value) => setReviewForm({ ...reviewForm, due: value })} placeholder="2026-12-15" /></div><Area label="Decision" value={reviewForm.decision} onChange={(value) => setReviewForm({ ...reviewForm, decision: value })} placeholder="What was reviewed and decided?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add review</Button></div></form></Modal>}
    {modal === "evidence" && <Modal title="Add vendor evidence" onClose={() => setModal("")}><form onSubmit={addEvidence} className="space-y-4"><Field label="Evidence title" value={evidenceForm.title} onChange={(value) => setEvidenceForm({ ...evidenceForm, title: value })} placeholder="Current security review" required /><Field label="Type" options={EVIDENCE_TYPES} value={evidenceForm.type} onChange={(value) => setEvidenceForm({ ...evidenceForm, type: value })} /><Field label="Reference" value={evidenceForm.reference} onChange={(value) => setEvidenceForm({ ...evidenceForm, reference: value })} placeholder="URL, file, ticket, or report" /><Area label="Detail" value={evidenceForm.detail} onChange={(value) => setEvidenceForm({ ...evidenceForm, detail: value })} placeholder="What does this evidence prove?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add evidence</Button></div></form></Modal>}
    {modal === "owner" && <Modal title="Add vendor owner" onClose={() => setModal("")}><form onSubmit={addOwner} className="space-y-4"><Field label="Name" value={ownerForm.name} onChange={(value) => setOwnerForm({ ...ownerForm, name: value })} placeholder="Named owner" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Role" value={ownerForm.role} onChange={(value) => setOwnerForm({ ...ownerForm, role: value })} placeholder="Business owner" /><Field label="Area" value={ownerForm.area} onChange={(value) => setOwnerForm({ ...ownerForm, area: value })} placeholder="Security" /><Field label="Availability" options={["available", "busy", "offline", "unknown"]} value={ownerForm.availability} onChange={(value) => setOwnerForm({ ...ownerForm, availability: value })} /><Field label="Backup" value={ownerForm.backup} onChange={(value) => setOwnerForm({ ...ownerForm, backup: value })} placeholder="Backup owner" /></div><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add owner</Button></div></form></Modal>}
    {modal === "note" && <Modal title="Add vendor note" onClose={() => setModal("")}><form onSubmit={addNote} className="space-y-4"><Field label="Title" value={noteForm.title} onChange={(value) => setNoteForm({ ...noteForm, title: value })} placeholder="Renewal decision update" required /><Field label="Audience" value={noteForm.audience} onChange={(value) => setNoteForm({ ...noteForm, audience: value })} placeholder="Owners and stakeholders" /><Area label="Detail" value={noteForm.detail} onChange={(value) => setNoteForm({ ...noteForm, detail: value })} placeholder="What was communicated or decided?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add note</Button></div></form></Modal>}
  </div></main>;
}
