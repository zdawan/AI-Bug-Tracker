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
  FileClock,
  FileText,
  Filter,
  Gauge,
  History,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";

const STORAGE_KEY = "admin-change-control-v1";
const CHANGE_STATES = ["draft", "proposed", "review", "approved", "scheduled", "in-progress", "completed", "rolled-back", "cancelled"];
const RISK_LEVELS = ["critical", "high", "medium", "low"];
const CHANGE_TYPES = ["configuration", "schema", "code", "content", "access", "infrastructure", "migration", "dependency", "operational"];
const ENVIRONMENTS = ["development", "staging", "production", "disaster-recovery"];
const REVIEW_STATES = ["pending", "approved", "rejected", "commented", "expired"];
const EVIDENCE_TYPES = ["plan", "test-result", "approval", "deployment-log", "screenshot", "rollback-proof", "monitoring", "communication"];
const CONTROL_PROMPTS = [
  "Confirm change owner",
  "Confirm change objective",
  "Confirm affected service",
  "Confirm affected data",
  "Confirm affected users",
  "Confirm dependency impact",
  "Confirm environment scope",
  "Confirm maintenance window",
  "Confirm implementation steps",
  "Confirm validation steps",
  "Confirm rollback steps",
  "Confirm rollback trigger",
  "Confirm backup reference",
  "Confirm test evidence",
  "Confirm staging result",
  "Confirm production readiness",
  "Confirm monitoring coverage",
  "Confirm alert ownership",
  "Confirm communication plan",
  "Confirm support handoff",
  "Confirm access requirement",
  "Confirm least privilege",
  "Confirm secret handling",
  "Confirm privacy impact",
  "Confirm retention impact",
  "Confirm audit impact",
  "Confirm compatibility impact",
  "Confirm performance impact",
  "Confirm availability impact",
  "Confirm security impact",
  "Confirm dependency version",
  "Confirm migration order",
  "Confirm idempotency",
  "Confirm retry behavior",
  "Confirm timeout behavior",
  "Confirm rate-limit behavior",
  "Confirm feature flag state",
  "Confirm configuration defaults",
  "Confirm cache invalidation",
  "Confirm queue behavior",
  "Confirm event behavior",
  "Confirm report behavior",
  "Confirm export behavior",
  "Confirm notification behavior",
  "Confirm user-facing copy",
  "Confirm accessibility impact",
  "Confirm browser coverage",
  "Confirm mobile coverage",
  "Confirm localization impact",
  "Confirm analytics impact",
  "Confirm support script",
  "Confirm incident linkage",
  "Confirm release linkage",
  "Confirm issue linkage",
  "Confirm approval threshold",
  "Confirm independent reviewer",
  "Confirm conflict of interest",
  "Confirm emergency criteria",
  "Confirm schedule conflict",
  "Confirm freeze exception",
  "Confirm business owner",
  "Confirm technical owner",
  "Confirm operations owner",
  "Confirm security reviewer",
  "Confirm privacy reviewer",
  "Confirm release reviewer",
  "Confirm backup owner",
  "Confirm escalation path",
  "Confirm contact window",
  "Confirm status update cadence",
  "Confirm deployment access",
  "Confirm audit logging",
  "Confirm change ticket",
  "Confirm artifact version",
  "Confirm checksum or commit",
  "Confirm deployment identity",
  "Confirm deployment timestamp",
  "Confirm post-change metrics",
  "Confirm error-rate threshold",
  "Confirm latency threshold",
  "Confirm saturation threshold",
  "Confirm rollback duration",
  "Confirm restore point",
  "Confirm data reconciliation",
  "Confirm schema compatibility",
  "Confirm API compatibility",
  "Confirm consumer readiness",
  "Confirm retry queue drain",
  "Confirm cache warmup",
  "Confirm replica health",
  "Confirm backup health",
  "Confirm log health",
  "Confirm dashboard health",
  "Confirm alert health",
  "Confirm synthetic health",
  "Confirm user acceptance",
  "Confirm stakeholder acceptance",
  "Confirm completion note",
  "Confirm lessons learned",
];
const REVIEW_GUIDE = [
  "A change needs a named owner before review begins.",
  "A critical change needs an independent reviewer.",
  "A production change needs a rollback trigger.",
  "A data change needs a reconciliation check.",
  "An access change needs an expiry or review date.",
  "A dependency change needs compatibility evidence.",
  "A schema change needs an ordered migration plan.",
  "An infrastructure change needs capacity evidence.",
  "An emergency change needs a retrospective review.",
  "A cancelled change must retain its reason.",
  "A rolled-back change must retain rollback proof.",
  "A completed change must retain validation evidence.",
  "An approved change must not silently change scope.",
  "A schedule change needs affected owners notified.",
  "A blocked change needs a visible dependency.",
  "A rejected change needs an actionable reason.",
  "A stale approval needs to be renewed.",
  "A deployment log must identify the actor.",
  "A test result must identify the environment.",
  "A monitoring result must identify the observation window.",
  "A communication record must identify the audience.",
  "A backup reference must identify the restore point.",
  "A rollback plan must identify the stop condition.",
  "A validation plan must be different from the implementation plan.",
  "A change summary should state user impact plainly.",
  "A risk rating should explain likelihood and impact.",
  "A low risk rating is not a substitute for evidence.",
  "A high risk change should have a smaller blast radius.",
  "A change window should avoid known release conflicts.",
  "A maintenance window should include a recovery buffer.",
  "Do not approve a change with an empty implementation plan.",
  "Do not schedule a change with an empty owner field.",
  "Do not close a change without post-change observations.",
  "Do not delete evidence when a change is cancelled.",
  "Do not broaden access to simplify deployment.",
  "Do not use production data for unapproved testing.",
  "Do not call a dry run a completed deployment.",
  "Do not treat a green build as production validation.",
  "Do not skip communication because impact is uncertain.",
  "Do not use a generic rollback statement.",
  "Do not approve conflicting maintenance windows.",
  "Do not hide a dependency in free-text notes.",
  "Do not mark a reviewer approved without a decision.",
  "Do not keep expired approvals in the active set.",
  "Do not use browser-local notes as backend authorization.",
  "Record the artifact version before deployment.",
  "Record the commit or package before deployment.",
  "Record the deployment identity after deployment.",
  "Record the observed metrics after deployment.",
  "Record the decision reason for every exception.",
  "Record the next review date for recurring changes.",
  "Record the affected teams before communication.",
  "Record the support handoff before closing.",
  "Record data reconciliation before declaring success.",
  "Record cache and queue behavior after a change.",
  "Record a restore point before mutating data.",
  "Record the emergency reason before execution.",
  "Record lessons learned after rollback.",
  "Record unresolved risk in the completion note.",
  "The change owner owns the plan and execution.",
  "The reviewer owns challenge and approval quality.",
  "The business owner owns user impact acceptance.",
  "The operations owner owns monitoring and recovery.",
  "The security owner owns access and security impact.",
  "The privacy owner owns personal-data impact.",
  "The release owner owns schedule coordination.",
  "The backup owner owns continuity when needed.",
  "The approver owns accepted residual risk.",
  "The support owner owns post-change readiness.",
  "Use a bounded rollout when impact is uncertain.",
  "Use a canary when a safe sample is available.",
  "Use a feature flag when reversible exposure is possible.",
  "Use a dry run when a write operation is risky.",
  "Use a second reviewer for high-impact changes.",
  "Use a maintenance buffer for recovery work.",
  "Use a separate validation observer where possible.",
  "Use explicit thresholds for rollback decisions.",
  "Use a named communication channel.",
  "Use a dated completion record.",
  "When scope changes, return the change to review.",
  "When risk changes, recalculate the approval threshold.",
  "When validation fails, stop and preserve evidence.",
  "When monitoring is missing, do not declare completion.",
  "When a dependency is unavailable, mark the change blocked.",
  "When a window conflicts, reschedule rather than overlap.",
  "When an owner is unavailable, assign a named backup.",
  "When rollback begins, communicate the transition.",
  "When rollback completes, validate the restored state.",
  "When a change is urgent, document why normal review was bypassed.",
  "Completion requires evidence, not only a status update.",
  "Approval requires a decision, not only a reviewer name.",
  "Rollback requires proof, not only an intention.",
  "Communication requires an audience, not only a draft.",
  "Monitoring requires a time window, not only a dashboard link.",
  "Testing requires an environment, not only a test title.",
  "Risk requires impact and likelihood, not only a badge.",
  "Ownership requires a person, not only a team.",
  "Scheduling requires a timezone, not only a date.",
  "Closure requires a next step, not only a completed state.",
];
const CLOSURE_RUBRIC = [
  "Objective is recorded",
  "Scope is recorded",
  "Owner is recorded",
  "Business owner is recorded",
  "Risk is justified",
  "Environment is recorded",
  "Window is recorded",
  "Implementation is documented",
  "Validation is documented",
  "Rollback is documented",
  "Approval is documented",
  "Test evidence is linked",
  "Deployment evidence is linked",
  "Monitoring evidence is linked",
  "Communication is linked",
  "Support handoff is linked",
  "Data impact is reconciled",
  "Access impact is reviewed",
  "Security impact is reviewed",
  "Privacy impact is reviewed",
  "Performance impact is observed",
  "Availability impact is observed",
  "Error impact is observed",
  "User impact is observed",
  "Alerts are healthy",
  "Queues are healthy",
  "Caches are healthy",
  "Replicas are healthy",
  "Backups are healthy",
  "Rollback proof is available",
  "Unresolved risks are visible",
  "Exceptions have expiry",
  "Lessons are captured",
  "Next review is scheduled",
  "Change record is exportable",
];
const OPERATIONAL_CHECKLIST = [
  "Request includes a clear business reason",
  "Request includes a technical reason",
  "Request identifies the service boundary",
  "Request identifies the data boundary",
  "Request identifies the user boundary",
  "Request identifies the deployment boundary",
  "Request identifies the support boundary",
  "Request identifies the compliance boundary",
  "Request identifies the security boundary",
  "Request identifies the recovery boundary",
  "Owner has confirmed the requested window",
  "Owner has confirmed the affected systems",
  "Owner has confirmed the implementation order",
  "Owner has confirmed the validation order",
  "Owner has confirmed the rollback order",
  "Owner has confirmed the communication order",
  "Owner has confirmed the escalation order",
  "Owner has confirmed the expected duration",
  "Owner has confirmed the maximum duration",
  "Owner has confirmed the stop condition",
  "Reviewer can reproduce the objective",
  "Reviewer can identify the risk",
  "Reviewer can identify the blast radius",
  "Reviewer can identify the dependency",
  "Reviewer can identify the fallback",
  "Reviewer can identify the monitoring",
  "Reviewer can identify the approval threshold",
  "Reviewer can identify the accountable owner",
  "Reviewer can identify the affected audience",
  "Reviewer can identify the completion proof",
  "Plan lists each implementation action",
  "Plan lists the expected output of each action",
  "Plan lists the operator for each action",
  "Plan lists the required access for each action",
  "Plan lists the expected duration for each action",
  "Plan lists the dependency for each action",
  "Plan lists the validation after each action",
  "Plan lists the stop condition for each action",
  "Plan lists the rollback action for each action",
  "Plan lists the evidence for each action",
  "Risk includes a likelihood rating",
  "Risk includes an impact rating",
  "Risk includes a user impact statement",
  "Risk includes a data impact statement",
  "Risk includes a security impact statement",
  "Risk includes an availability impact statement",
  "Risk includes a performance impact statement",
  "Risk includes a compliance impact statement",
  "Risk includes an operational impact statement",
  "Risk includes a mitigation statement",
  "Risk includes an owner",
  "Risk includes a review date",
  "Test plan names the test environment",
  "Test plan names the test data",
  "Test plan names the expected result",
  "Test plan names the observed result",
  "Test plan names the tester",
  "Test plan names the test timestamp",
  "Test plan names the failure response",
  "Test plan includes the compatibility case",
  "Test plan includes the error case",
  "Test plan includes the retry case",
  "Test plan includes the timeout case",
  "Test plan includes the rollback case",
  "Test plan includes the recovery case",
  "Test plan includes the user-facing case",
  "Test plan includes the monitoring case",
  "Approval confirms objective and scope",
  "Approval confirms implementation readiness",
  "Approval confirms validation readiness",
  "Approval confirms rollback readiness",
  "Approval confirms communication readiness",
  "Approval confirms monitoring readiness",
  "Approval confirms owner availability",
  "Approval confirms backup availability",
  "Approval confirms window availability",
  "Approval confirms dependency availability",
  "Approval records reviewer identity",
  "Approval records decision timestamp",
  "Approval records decision rationale",
  "Approval records unresolved questions",
  "Approval records expiry where required",
  "Approval records the next action",
  "Schedule includes timezone",
  "Schedule includes start time",
  "Schedule includes end time",
  "Schedule includes preparation time",
  "Schedule includes recovery buffer",
  "Schedule avoids freeze conflicts",
  "Schedule avoids release conflicts",
  "Schedule avoids maintenance conflicts",
  "Schedule includes stakeholder availability",
  "Schedule includes escalation availability",
  "Schedule includes support availability",
  "Schedule includes rollback availability",
  "Schedule includes monitoring availability",
  "Schedule includes a reschedule owner",
  "Deployment records the package version",
  "Deployment records the commit identity",
  "Deployment records the actor identity",
  "Deployment records the environment",
  "Deployment records the start timestamp",
  "Deployment records the end timestamp",
  "Deployment records the command or pipeline",
  "Deployment records the output",
  "Deployment records the warnings",
  "Deployment records the errors",
  "Deployment records the decision to continue",
  "Deployment records the decision to stop",
  "Deployment records the decision to rollback",
  "Deployment records the communication event",
  "Deployment records the monitoring event",
  "Deployment records the validation event",
  "Rollback names the trigger threshold",
  "Rollback names the decision owner",
  "Rollback names the communication owner",
  "Rollback names the rollback operator",
  "Rollback names the restore point",
  "Rollback names the rollback command",
  "Rollback names the expected duration",
  "Rollback names the validation query",
  "Rollback names the restored state",
  "Rollback names the residual risk",
  "Rollback names the follow-up action",
  "Rollback names the incident link",
  "Rollback names the change link",
  "Rollback names the completion evidence",
  "Rollback names the lessons owner",
  "Monitoring checks error rate",
  "Monitoring checks latency",
  "Monitoring checks saturation",
  "Monitoring checks availability",
  "Monitoring checks queue depth",
  "Monitoring checks queue age",
  "Monitoring checks replica lag",
  "Monitoring checks cache health",
  "Monitoring checks database health",
  "Monitoring checks API health",
  "Monitoring checks worker health",
  "Monitoring checks authentication health",
  "Monitoring checks authorization health",
  "Monitoring checks export health",
  "Monitoring checks notification health",
  "Communication names the change",
  "Communication names the impact",
  "Communication names the window",
  "Communication names the expected duration",
  "Communication names the support channel",
  "Communication names the escalation channel",
  "Communication names the rollback signal",
  "Communication names the completion signal",
  "Communication names the affected audience",
  "Communication names the internal audience",
  "Communication names the external audience",
  "Communication names the business owner",
  "Communication names the technical owner",
  "Communication names the support owner",
  "Communication records the send time",
  "Communication records the response owner",
  "Closure confirms the change reached its objective",
  "Closure confirms the change stayed in scope",
  "Closure confirms the final environment",
  "Closure confirms the final version",
  "Closure confirms the final actor",
  "Closure confirms the final timestamp",
  "Closure confirms validation passed",
  "Closure confirms monitoring is healthy",
  "Closure confirms alerts are healthy",
  "Closure confirms queues are healthy",
  "Closure confirms caches are healthy",
  "Closure confirms replicas are healthy",
  "Closure confirms backups are healthy",
  "Closure confirms support handoff",
  "Closure confirms stakeholder update",
  "Closure confirms unresolved risk",
  "Closure confirms accepted exceptions",
  "Closure confirms lessons learned",
  "Closure confirms next review",
  "Closure confirms evidence export",
  "Closure confirms audit retention",
  "Closure confirms access cleanup",
  "Closure confirms temporary credential cleanup",
  "Closure confirms temporary data cleanup",
  "Closure confirms rollback evidence",
  "Closure confirms owner acknowledgement",
  "Closure confirms business acknowledgement",
  "Closure confirms technical acknowledgement",
  "Closure confirms operations acknowledgement",
  "Closure confirms security acknowledgement",
  "Closure confirms privacy acknowledgement",
  "Closure confirms release acknowledgement",
  "Closure confirms support acknowledgement",
  "Closure confirms program acknowledgement",
];
const CHANGE_SCENARIOS = [
  "Routine configuration update",
  "Feature flag activation",
  "Feature flag rollback",
  "Database index addition",
  "Database index removal",
  "Schema column addition",
  "Schema column migration",
  "Schema column removal",
  "Data backfill",
  "Data correction",
  "Data reconciliation",
  "Data retention cleanup",
  "Data export update",
  "Data import update",
  "API contract update",
  "API version transition",
  "API authentication update",
  "API authorization update",
  "Webhook contract update",
  "Event schema update",
  "Queue configuration update",
  "Queue consumer update",
  "Queue retry update",
  "Queue dead-letter replay",
  "Cache configuration update",
  "Cache invalidation change",
  "Search index rebuild",
  "Analytics pipeline update",
  "Report query update",
  "Dashboard calculation update",
  "Notification template update",
  "Email provider update",
  "Payment provider update",
  "Identity provider update",
  "Permission model update",
  "Role assignment update",
  "Secret rotation",
  "Certificate rotation",
  "Encryption key rotation",
  "Audit policy update",
  "Privacy classification update",
  "Retention policy update",
  "Backup policy update",
  "Restore procedure update",
  "Replication configuration update",
  "Failover exercise",
  "Disaster recovery exercise",
  "Infrastructure capacity update",
  "Infrastructure scaling event",
  "Load balancer update",
  "Network policy update",
  "Firewall policy update",
  "Monitoring rule update",
  "Alert threshold update",
  "Dashboard ownership update",
  "Log routing update",
  "Log retention update",
  "Tracing configuration update",
  "Dependency patch",
  "Dependency major upgrade",
  "Runtime upgrade",
  "Operating system patch",
  "Container image update",
  "Build pipeline update",
  "Deployment pipeline update",
  "Release branch transition",
  "Production hotfix",
  "Emergency incident mitigation",
  "Incident follow-up repair",
  "Rollback exercise",
  "Canary rollout",
  "Blue-green switch",
  "Regional failover",
  "Regional recovery",
  "Browser compatibility update",
  "Mobile compatibility update",
  "Accessibility remediation",
  "Localization update",
  "Content moderation update",
  "User-facing copy update",
  "Support workflow update",
  "Customer communication update",
  "Legal notice update",
  "Terms or policy update",
  "Billing configuration update",
  "Subscription plan update",
  "Entitlement calculation update",
  "Feature availability update",
  "Tenant configuration update",
  "Environment variable update",
  "Runtime feature toggle",
  "Scheduled job update",
  "Batch window update",
  "Worker concurrency update",
  "Rate limit update",
  "Timeout update",
  "Retry policy update",
  "Circuit breaker update",
  "Service ownership transition",
  "On-call ownership transition",
  "Support escalation transition",
  "Change freeze exception",
  "Tenant migration",
  "Regional data movement",
  "Production access review",
  "Service decommission",
  "Legacy integration retirement",
];

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clean(value, fallback = "", limit = 1400) {
  if (typeof value !== "string") return fallback;
  const result = value.trim();
  return result ? result.slice(0, limit) : fallback;
}

function now() {
  return new Date().toISOString();
}

function emptyData() {
  return { changes: [], reviews: [], evidence: [], owners: [], notes: [] };
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
  if (["completed", "approved", "low", "passed", "available"].includes(value)) return "emerald";
  if (["critical", "high", "rejected", "rolled-back", "blocked"].includes(value)) return "rose";
  if (["review", "scheduled", "in-progress", "medium", "pending"].includes(value)) return "amber";
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
    primary: "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700",
    danger: "border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
  };
  return <button type={type} onClick={onClick} className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold ${variants[variant]}`}>{Icon && <Icon size={14} />}{children}</button>;
}

function Field({ label, value, onChange, placeholder, options, required = false }) {
  const common = {
    value: value || "",
    onChange: (event) => onChange(event.target.value),
    required,
    className: "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500",
  };
  return <label className="block text-xs font-semibold text-slate-700">{label}{options ? <select {...common}><option value="">Select...</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input {...common} placeholder={placeholder} />}</label>;
}

function Area({ label, value, onChange, placeholder }) {
  return <label className="block text-xs font-semibold text-slate-700">{label}<textarea value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" /></label>;
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
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><Icon size={17} /></span></div><p className="mt-2 text-[11px] text-slate-500">{detail}</p></article>;
}

export default function ChangeControlPage() {
  const [data, setData] = useState(emptyData);
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [ascending, setAscending] = useState(false);
  const [modal, setModal] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ title: "", type: "configuration", state: "draft", risk: "medium", environment: "staging", owner: "", businessOwner: "", window: "", objective: "", implementation: "", validation: "", rollback: "", impact: "" });
  const [reviewForm, setReviewForm] = useState({ reviewer: "", role: "", state: "pending", decision: "", due: "" });
  const [evidenceForm, setEvidenceForm] = useState({ title: "", type: "plan", reference: "", detail: "" });
  const [ownerForm, setOwnerForm] = useState({ name: "", role: "", area: "", availability: "available", backup: "" });
  const [noteForm, setNoteForm] = useState({ title: "", audience: "", detail: "" });

  useEffect(() => setData(readData()), []);
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => { if (!notice) return undefined; const timer = window.setTimeout(() => setNotice(""), 2600); return () => window.clearTimeout(timer); }, [notice]);

  const change = data.changes.find((item) => item.id === selectedId);
  const changes = selectedId ? data.changes.filter((item) => item.id === selectedId) : data.changes;
  const reviews = data.reviews.filter((item) => !selectedId || item.changeId === selectedId);
  const evidence = data.evidence.filter((item) => !selectedId || item.changeId === selectedId);
  const owners = data.owners.filter((item) => !selectedId || item.changeId === selectedId);
  const notes = data.notes.filter((item) => !selectedId || item.changeId === selectedId);
  const approved = changes.filter((item) => item.state === "approved" || item.state === "scheduled" || item.state === "in-progress" || item.state === "completed").length;
  const active = changes.filter((item) => ["proposed", "review", "scheduled", "in-progress"].includes(item.state)).length;
  const highRisk = changes.filter((item) => ["critical", "high"].includes(item.risk) && !["completed", "cancelled"].includes(item.state)).length;
  const completion = changes.length ? Math.round((changes.filter((item) => item.state === "completed").length / changes.length) * 100) : 0;
  const filtered = useMemo(() => changes.filter((item) => `${item.title} ${item.type} ${item.state} ${item.risk} ${item.environment} ${item.owner}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => { const result = a.title.localeCompare(b.title); return ascending ? result : result * -1; }), [ascending, changes, query]);

  function update(key, items) {
    setData((current) => ({ ...current, [key]: items }));
  }

  function addChange(event) {
    event.preventDefault();
    const item = { ...form, id: makeId("change"), title: clean(form.title), owner: clean(form.owner), businessOwner: clean(form.businessOwner), window: clean(form.window), objective: clean(form.objective), implementation: clean(form.implementation), validation: clean(form.validation), rollback: clean(form.rollback), impact: clean(form.impact), createdAt: now() };
    update("changes", [item, ...data.changes]);
    setSelectedId(item.id);
    setForm({ title: "", type: "configuration", state: "draft", risk: "medium", environment: "staging", owner: "", businessOwner: "", window: "", objective: "", implementation: "", validation: "", rollback: "", impact: "" });
    setModal("");
    setNotice("Change record created");
  }

  function addReview(event) {
    event.preventDefault();
    if (!selectedId) { setNotice("Select a change first"); return; }
    const item = { ...reviewForm, id: makeId("review"), changeId: selectedId, reviewer: clean(reviewForm.reviewer), role: clean(reviewForm.role), decision: clean(reviewForm.decision), due: clean(reviewForm.due), createdAt: now() };
    update("reviews", [item, ...data.reviews]);
    setReviewForm({ reviewer: "", role: "", state: "pending", decision: "", due: "" });
    setModal("");
    setNotice("Review added");
  }

  function addEvidence(event) {
    event.preventDefault();
    if (!selectedId) { setNotice("Select a change first"); return; }
    const item = { ...evidenceForm, id: makeId("evidence"), changeId: selectedId, title: clean(evidenceForm.title), reference: clean(evidenceForm.reference), detail: clean(evidenceForm.detail), createdAt: now() };
    update("evidence", [item, ...data.evidence]);
    setEvidenceForm({ title: "", type: "plan", reference: "", detail: "" });
    setModal("");
    setNotice("Evidence added");
  }

  function addOwner(event) {
    event.preventDefault();
    if (!selectedId) { setNotice("Select a change first"); return; }
    const item = { ...ownerForm, id: makeId("owner"), changeId: selectedId, name: clean(ownerForm.name), role: clean(ownerForm.role), area: clean(ownerForm.area), backup: clean(ownerForm.backup), createdAt: now() };
    update("owners", [item, ...data.owners]);
    setOwnerForm({ name: "", role: "", area: "", availability: "available", backup: "" });
    setModal("");
    setNotice("Change owner added");
  }

  function addNote(event) {
    event.preventDefault();
    if (!selectedId) { setNotice("Select a change first"); return; }
    const item = { ...noteForm, id: makeId("note"), changeId: selectedId, title: clean(noteForm.title), audience: clean(noteForm.audience), detail: clean(noteForm.detail), createdAt: now() };
    update("notes", [item, ...data.notes]);
    setNoteForm({ title: "", audience: "", detail: "" });
    setModal("");
    setNotice("Communication note added");
  }

  function changeField(key, itemId, field, value) {
    update(key, data[key].map((item) => item.id === itemId ? { ...item, [field]: value, updatedAt: now() } : item));
  }

  function remove(key, itemId) {
    update(key, data[key].filter((item) => item.id !== itemId));
    setNotice("Record removed");
  }

  function applyControls() {
    if (!selectedId) { setNotice("Select a change first"); return; }
    const existing = new Set(data.evidence.filter((item) => item.changeId === selectedId).map((item) => item.title));
    const additions = CONTROL_PROMPTS.slice(0, 20).filter((title) => !existing.has(title)).map((title) => ({ id: makeId("control"), changeId: selectedId, title, type: "plan", reference: "", detail: "Control prompt applied; attach proof after review.", createdAt: now() }));
    update("evidence", [...additions, ...data.evidence]);
    setNotice(`${additions.length} control prompts added`);
  }

  function copySummary() {
    const text = [`Change: ${change?.title || "All changes"}`, `Completion: ${completion}%`, `Approved or beyond: ${approved}`, `Active: ${active}`, `High risk open: ${highRisk}`, `Reviews: ${reviews.length}`, `Evidence: ${evidence.length}`, `Owners: ${owners.length}`, `Notes: ${notes.length}`, change?.objective || "No objective recorded."].join("\n");
    navigator.clipboard?.writeText(text);
    setNotice("Change summary copied");
  }

  function exportRows() {
    const rows = [["Type", "Title", "State", "Risk", "Owner", "Detail"], ...changes.map((item) => ["Change", item.title, item.state, item.risk, item.owner, item.objective]), ...reviews.map((item) => ["Review", item.reviewer, item.state, "", item.role, item.decision]), ...evidence.map((item) => ["Evidence", item.title, item.type, "", "", item.reference]), ...notes.map((item) => ["Note", item.title, "", "", item.audience, item.detail])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "admin-change-control.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Change control export downloaded");
  }

  const tabs = [["overview", "Overview"], ["changes", `Changes (${changes.length})`], ["reviews", `Reviews (${reviews.length})`], ["evidence", `Evidence (${evidence.length})`], ["owners", `Owners (${owners.length})`], ["notes", `Notes (${notes.length})`]];
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-7xl space-y-5">
    <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-5 shadow-sm sm:p-7"><div className="flex flex-col gap-5 lg:flex-row lg:justify-between"><div className="max-w-3xl"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700"><FileClock size={16} /> Admin change control</div><h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Make operational changes safer to plan, approve, execute, and close.</h1><p className="mt-3 text-sm leading-6 text-slate-600">A browser-local administration workspace for change records, approvals, evidence, ownership, communication, and rollback readiness.</p></div><div className="flex flex-wrap gap-2"><Button icon={Plus} variant="primary" onClick={() => setModal("change")}>New change</Button><Button icon={Copy} onClick={copySummary}>Copy summary</Button><Button icon={Download} onClick={exportRows}>Export</Button></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={Gauge} label="Completion" value={`${completion}%`} detail={`${approved} approved or beyond`} /><Stat icon={History} label="Active changes" value={active} detail={`${highRisk} high-risk items open`} /><Stat icon={ShieldCheck} label="Reviews" value={reviews.length} detail="Decisions indexed locally" /><Stat icon={FileText} label="Evidence" value={evidence.length} detail={`${owners.length} owners mapped`} /></div></div>
    {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">{notice}</div>}
    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">{tabs.map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-t-lg px-3 py-2 text-xs font-semibold ${tab === value ? "border-b-2 border-indigo-600 text-indigo-700" : "text-slate-500"}`}>{label}</button>)}</div>
    <Section title="Change context" description="Select the change record under review." action={<Button icon={RefreshCw} onClick={() => { setData(readData()); setNotice("Workspace refreshed"); }}>Refresh</Button>}><div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto]"><label className="text-xs font-semibold text-slate-700">Selected change<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"><option value="">All changes</option>{data.changes.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><div className="flex items-end gap-2"><Button icon={ClipboardCheck} onClick={applyControls}>Apply controls</Button><Button icon={Plus} onClick={() => setModal("change")}>Add change</Button></div></div><div className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-2 xl:grid-cols-3">{data.changes.slice(0, 6).map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`rounded-xl border p-4 text-left ${selectedId === item.id ? "border-indigo-300 bg-indigo-50" : "border-slate-200"}`}><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold">{item.title}</p><Badge value={item.state}>{item.state}</Badge></div><p className="mt-2 line-clamp-2 text-xs text-slate-500">{item.objective || "No objective recorded."}</p><p className="mt-3 text-[11px] text-slate-400">{item.environment} · {item.owner || "Unassigned"} · {item.risk} risk</p></button>)}{!data.changes.length && <div className="md:col-span-2 xl:col-span-3"><Empty title="No change records" description="Create a change for a release, migration, access update, configuration change, or operational intervention." action={<Button icon={Plus} variant="primary" onClick={() => setModal("change")}>Create change</Button>} /></div>}</div></Section>
    {tab === "overview" && <div className="grid gap-5 xl:grid-cols-2"><Section title="Change posture" description="A quick read of readiness and remaining attention."><div className="space-y-4 p-5"><div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-indigo-900">Completion progress</p><p className="text-lg font-semibold text-indigo-900">{completion}%</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${completion}%` }} /></div><p className="mt-3 text-xs text-indigo-800">{highRisk ? `${highRisk} high-risk change${highRisk === 1 ? "" : "s"} need attention.` : "No high-risk open changes recorded."}</p></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Changes</p><p className="mt-1 text-xl font-semibold">{changes.length}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Evidence</p><p className="mt-1 text-xl font-semibold">{evidence.length}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Owners</p><p className="mt-1 text-xl font-semibold">{owners.length}</p></div></div><p className="text-[11px] text-slate-500">Control library: {CONTROL_PROMPTS.length} reusable readiness prompts.</p></div></Section><Section title="Selected change narrative" description="Keep objective, impact, and rollback decisions together."><div className="space-y-4 p-5"><Area label="Objective" value={change?.objective || ""} onChange={(value) => change && changeField("changes", change.id, "objective", value)} placeholder="What outcome should this change produce?" /><Area label="Impact" value={change?.impact || ""} onChange={(value) => change && changeField("changes", change.id, "impact", value)} placeholder="Who or what may be affected?" /><Area label="Rollback" value={change?.rollback || ""} onChange={(value) => change && changeField("changes", change.id, "rollback", value)} placeholder="How and when will the change be reversed?" /></div></Section><Section title="Change principles" description="Use consistent controls for every operational change."><div className="grid gap-3 p-5 sm:grid-cols-2">{[["Plan", "Make objective, scope, owner, and steps explicit.", ClipboardCheck], ["Review", "Capture independent challenge and approval evidence.", Users], ["Execute", "Use a bounded window with observable stop conditions.", Gauge], ["Recover", "Keep rollback, monitoring, and communication ready.", ShieldCheck]].map(([title, detail, Icon]) => <div key={title} className="rounded-xl border border-slate-200 p-4"><Icon size={17} className="text-indigo-600" /><p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div>)}</div></Section></div>}
    {tab === "changes" && <Section title="Change records" description="Track scope, risk, readiness, and lifecycle state." action={<Button icon={Plus} variant="primary" onClick={() => setModal("change")}>Add change</Button>}><div className="flex gap-3 border-b border-slate-100 p-5"><div className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, type, state, risk, owner..." className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm" /></div><Button icon={ascending ? ArrowUpAZ : ArrowDownAZ} onClick={() => setAscending((value) => !value)}>Sort</Button><Button icon={Filter} onClick={() => setNotice("Search and selected change filters are active")}>Filter</Button></div>{!filtered.length ? <Empty title="No change records" description="Create a change or adjust the search query." action={<Button icon={Plus} onClick={() => setModal("change")}>Add change</Button>} /> : <div className="divide-y">{filtered.map((item) => <div key={item.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{item.title}</h3><Badge value={item.state}>{item.state}</Badge><Badge value={item.risk}>{item.risk} risk</Badge><Badge value={item.environment}>{item.environment}</Badge></div><p className="mt-2 text-xs text-slate-600">{item.objective || "No objective recorded."}</p><p className="mt-2 text-[11px] text-slate-500">Owner: {item.owner || "Unassigned"} · Type: {item.type} · Window: {item.window || "Not set"}</p></div><div className="flex gap-2"><select value={item.state} onChange={(event) => changeField("changes", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{CHANGE_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => remove("changes", item.id)}>Remove</Button></div></div>)}</div>}</Section>}
    {tab === "reviews" && <Section title="Reviews and approvals" description="Capture independent decisions and review expiry." action={<Button icon={Plus} variant="primary" onClick={() => setModal("review")}>Add review</Button>}>{!reviews.length ? <Empty title="No reviews" description="Select a change and add its reviewers, approvers, or business owners." action={<Button icon={Plus} onClick={() => setModal("review")}>Add review</Button>} /> : <div className="divide-y">{reviews.map((item) => <div key={item.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap gap-2"><h3 className="text-sm font-semibold">{item.reviewer}</h3><Badge value={item.state}>{item.state}</Badge></div><p className="mt-2 text-xs text-slate-600">{item.decision || "No decision note recorded."}</p><p className="mt-2 text-[11px] text-slate-500">{item.role || "Role not set"} · Due {item.due || "not set"}</p></div><div className="flex gap-2"><select value={item.state} onChange={(event) => changeField("reviews", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{REVIEW_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => remove("reviews", item.id)}>Remove</Button></div></div>)}</div>}</Section>}
    {tab === "evidence" && <Section title="Change evidence" description="Index plans, test results, deployment proof, rollback proof, and monitoring." action={<Button icon={Plus} variant="primary" onClick={() => setModal("evidence")}>Add evidence</Button>}>{!evidence.length ? <Empty title="No evidence" description="Add evidence that supports readiness, execution, validation, or recovery." action={<Button icon={Plus} onClick={() => setModal("evidence")}>Add evidence</Button>} /> : <div className="divide-y">{evidence.map((item) => <div key={item.id} className="flex justify-between gap-3 p-5"><div><div className="flex flex-wrap gap-2"><h3 className="text-sm font-semibold">{item.title}</h3><Badge value={item.type}>{item.type}</Badge></div><p className="mt-2 text-xs text-slate-600">{item.detail || "No detail recorded."}</p><p className="mt-2 text-[11px] text-indigo-700">{item.reference || "No reference recorded"}</p></div><Button variant="danger" icon={Trash2} onClick={() => remove("evidence", item.id)}>Remove</Button></div>)}</div>}</Section>}
    {tab === "owners" && <Section title="Change ownership" description="Map technical, business, operations, security, and backup owners." action={<Button icon={Plus} variant="primary" onClick={() => setModal("owner")}>Add owner</Button>}>{!owners.length ? <Empty title="No owners" description="Add named owners before scheduling a change." action={<Button icon={Plus} onClick={() => setModal("owner")}>Add owner</Button>} /> : <div className="grid gap-3 p-5 md:grid-cols-2">{owners.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between gap-3"><div><p className="text-sm font-semibold">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.role} · {item.area}</p></div><Badge value={item.availability}>{item.availability}</Badge></div><p className="mt-3 text-[11px] text-slate-500">Backup: {item.backup || "Not assigned"}</p><div className="mt-3"><Button variant="danger" icon={Trash2} onClick={() => remove("owners", item.id)}>Remove</Button></div></div>)}</div>}</Section>}
    {tab === "notes" && <Section title="Communication notes" description="Keep stakeholder updates and support handoffs close to the change." action={<Button icon={Plus} variant="primary" onClick={() => setModal("note")}>Add note</Button>}>{!notes.length ? <Empty title="No communication notes" description="Record audience, timing, impact, and handoff updates." action={<Button icon={Plus} onClick={() => setModal("note")}>Add note</Button>} /> : <div className="divide-y">{notes.map((item) => <div key={item.id} className="flex justify-between gap-3 p-5"><div><h3 className="text-sm font-semibold">{item.title}</h3><p className="mt-2 text-xs text-slate-600">{item.detail || "No detail recorded."}</p><p className="mt-2 text-[11px] text-slate-500">Audience: {item.audience || "Not set"}</p></div><Button variant="danger" icon={Trash2} onClick={() => remove("notes", item.id)}>Remove</Button></div>)}</div>}</Section>}
    <Section title="Change control prompt library" description="Use readiness prompts to create evidence without changing backend records."><div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-4">{CONTROL_PROMPTS.slice(0, 24).map((prompt) => <button key={prompt} type="button" onClick={() => { setTab("evidence"); setEvidenceForm((current) => ({ ...current, title: prompt })); setNotice("Prompt loaded into evidence form"); }} className="rounded-lg border border-slate-200 px-3 py-2 text-left text-[11px] text-slate-600 hover:border-indigo-300 hover:text-indigo-700">{prompt}</button>)}</div><p className="px-5 pb-5 text-[11px] text-slate-400">The full library contains {CONTROL_PROMPTS.length} prompts.</p></Section>
    <Section title="Change review guide" description="Decision rules for safe planning, execution, and closure."><div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-4">{REVIEW_GUIDE.slice(0, 24).map((rule) => <p key={rule} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-900">{rule}</p>)}</div><p className="px-5 pb-5 text-[11px] text-slate-400">Guide coverage: {REVIEW_GUIDE.length} rules.</p></Section>
    <Section title="Closure rubric" description="Check evidence coverage before declaring a change complete."><div className="flex flex-wrap gap-2 p-5">{CLOSURE_RUBRIC.slice(0, 24).map((item) => <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600">{item}</span>)}</div><p className="px-5 pb-5 text-[11px] text-slate-400">Closure signals: {CLOSURE_RUBRIC.length} checks.</p></Section>
    <Section title="Operational readiness checklist" description="Use a broad checklist when a change touches production, data, access, or recovery."><div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-4">{OPERATIONAL_CHECKLIST.slice(0, 32).map((item) => <button key={item} type="button" onClick={() => { setTab("evidence"); setEvidenceForm((current) => ({ ...current, title: item })); setNotice("Checklist item loaded into evidence form"); }} className="rounded-lg border border-slate-200 px-3 py-2 text-left text-[11px] text-slate-600 hover:border-indigo-300 hover:text-indigo-700">{item}</button>)}</div><p className="px-5 pb-5 text-[11px] text-slate-400">Checklist coverage: {OPERATIONAL_CHECKLIST.length} readiness checks.</p></Section>
    <Section title="Common change scenarios" description="Start a change record from a recognizable operational scenario."><div className="flex flex-wrap gap-2 p-5">{CHANGE_SCENARIOS.slice(0, 36).map((item) => <button key={item} type="button" onClick={() => { setModal("change"); setForm((current) => ({ ...current, title: item })); setNotice("Scenario loaded into change form"); }} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600 hover:border-indigo-300 hover:text-indigo-700">{item}</button>)}</div><p className="px-5 pb-5 text-[11px] text-slate-400">Scenario library: {CHANGE_SCENARIOS.length} common change types.</p></Section>
    {modal === "change" && <Modal title="Create change record" onClose={() => setModal("")}><form onSubmit={addChange} className="space-y-4"><Field label="Change title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} placeholder="Deploy reporting query update" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Type" options={CHANGE_TYPES} value={form.type} onChange={(value) => setForm({ ...form, type: value })} /><Field label="Risk" options={RISK_LEVELS} value={form.risk} onChange={(value) => setForm({ ...form, risk: value })} /><Field label="Environment" options={ENVIRONMENTS} value={form.environment} onChange={(value) => setForm({ ...form, environment: value })} /><Field label="Owner" value={form.owner} onChange={(value) => setForm({ ...form, owner: value })} placeholder="Technical owner" /><Field label="Business owner" value={form.businessOwner} onChange={(value) => setForm({ ...form, businessOwner: value })} placeholder="Business owner" /><Field label="Window" value={form.window} onChange={(value) => setForm({ ...form, window: value })} placeholder="2026-11-20 22:00 UTC" /></div><Area label="Objective" value={form.objective} onChange={(value) => setForm({ ...form, objective: value })} placeholder="What outcome should this produce?" /><Area label="Implementation" value={form.implementation} onChange={(value) => setForm({ ...form, implementation: value })} placeholder="Ordered implementation steps." /><Area label="Validation" value={form.validation} onChange={(value) => setForm({ ...form, validation: value })} placeholder="How will success be measured?" /><Area label="Rollback" value={form.rollback} onChange={(value) => setForm({ ...form, rollback: value })} placeholder="When and how will this be reversed?" /><Area label="Impact" value={form.impact} onChange={(value) => setForm({ ...form, impact: value })} placeholder="Who or what may be affected?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Create change</Button></div></form></Modal>}
    {modal === "review" && <Modal title="Add change review" onClose={() => setModal("")}><form onSubmit={addReview} className="space-y-4"><Field label="Reviewer" value={reviewForm.reviewer} onChange={(value) => setReviewForm({ ...reviewForm, reviewer: value })} placeholder="Reviewer name" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Role" value={reviewForm.role} onChange={(value) => setReviewForm({ ...reviewForm, role: value })} placeholder="Security reviewer" /><Field label="State" options={REVIEW_STATES} value={reviewForm.state} onChange={(value) => setReviewForm({ ...reviewForm, state: value })} /><Field label="Due" value={reviewForm.due} onChange={(value) => setReviewForm({ ...reviewForm, due: value })} placeholder="2026-11-20" /></div><Area label="Decision" value={reviewForm.decision} onChange={(value) => setReviewForm({ ...reviewForm, decision: value })} placeholder="What was reviewed, accepted, or rejected?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add review</Button></div></form></Modal>}
    {modal === "evidence" && <Modal title="Add change evidence" onClose={() => setModal("")}><form onSubmit={addEvidence} className="space-y-4"><Field label="Evidence title" value={evidenceForm.title} onChange={(value) => setEvidenceForm({ ...evidenceForm, title: value })} placeholder="Staging validation result" required /><Field label="Type" options={EVIDENCE_TYPES} value={evidenceForm.type} onChange={(value) => setEvidenceForm({ ...evidenceForm, type: value })} /><Field label="Reference" value={evidenceForm.reference} onChange={(value) => setEvidenceForm({ ...evidenceForm, reference: value })} placeholder="URL, file, query, or ticket" /><Area label="Detail" value={evidenceForm.detail} onChange={(value) => setEvidenceForm({ ...evidenceForm, detail: value })} placeholder="What does this evidence prove?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add evidence</Button></div></form></Modal>}
    {modal === "owner" && <Modal title="Add change owner" onClose={() => setModal("")}><form onSubmit={addOwner} className="space-y-4"><Field label="Name" value={ownerForm.name} onChange={(value) => setOwnerForm({ ...ownerForm, name: value })} placeholder="Named owner" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Role" value={ownerForm.role} onChange={(value) => setOwnerForm({ ...ownerForm, role: value })} placeholder="Operations owner" /><Field label="Area" value={ownerForm.area} onChange={(value) => setOwnerForm({ ...ownerForm, area: value })} placeholder="Monitoring" /><Field label="Availability" options={["available", "busy", "offline", "unknown"]} value={ownerForm.availability} onChange={(value) => setOwnerForm({ ...ownerForm, availability: value })} /><Field label="Backup" value={ownerForm.backup} onChange={(value) => setOwnerForm({ ...ownerForm, backup: value })} placeholder="Backup owner" /></div><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add owner</Button></div></form></Modal>}
    {modal === "note" && <Modal title="Add communication note" onClose={() => setModal("")}><form onSubmit={addNote} className="space-y-4"><Field label="Title" value={noteForm.title} onChange={(value) => setNoteForm({ ...noteForm, title: value })} placeholder="Support handoff update" required /><Field label="Audience" value={noteForm.audience} onChange={(value) => setNoteForm({ ...noteForm, audience: value })} placeholder="Support and release stakeholders" /><Area label="Detail" value={noteForm.detail} onChange={(value) => setNoteForm({ ...noteForm, detail: value })} placeholder="What was communicated and when?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add note</Button></div></form></Modal>}
  </div></main>;
}
