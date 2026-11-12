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
  FolderCheck,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";

const STORAGE_KEY = "tester-release-evidence-v1";
const MAX_PACKS = 25;
const MAX_EVIDENCE = 120;
const MAX_CHECKPOINTS = 100;
const MAX_BLOCKERS = 100;
const MAX_APPROVALS = 80;
const MAX_REPORTS = 100;
const MAX_REFERENCES = 40;
const PAGE_SIZE = 8;

const PACK_STATES = [
  { value: "draft", label: "Draft", tone: "slate" },
  { value: "collecting", label: "Collecting", tone: "cyan" },
  { value: "review", label: "In review", tone: "violet" },
  { value: "blocked", label: "Blocked", tone: "rose" },
  { value: "ready", label: "Ready", tone: "emerald" },
  { value: "archived", label: "Archived", tone: "amber" },
];
const PACK_FILTERS = [{ value: "all", label: "All packs" }, ...PACK_STATES];
const EVIDENCE_STATES = [
  { value: "planned", label: "Planned" },
  { value: "requested", label: "Requested" },
  { value: "attached", label: "Attached" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];
const EVIDENCE_FILTERS = [{ value: "all", label: "All evidence" }, ...EVIDENCE_STATES];
const CHECKPOINT_STATES = [
  { value: "not-started", label: "Not started" },
  { value: "in-progress", label: "In progress" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  { value: "waived", label: "Waived" },
];
const CHECKPOINT_FILTERS = [{ value: "all", label: "All checkpoints" }, ...CHECKPOINT_STATES];
const BLOCKER_STATES = [
  { value: "open", label: "Open" },
  { value: "owned", label: "Owned" },
  { value: "mitigated", label: "Mitigated" },
  { value: "accepted", label: "Accepted" },
  { value: "closed", label: "Closed" },
];
const APPROVAL_STATES = [
  { value: "requested", label: "Requested" },
  { value: "reviewing", label: "Reviewing" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
];
const EVIDENCE_TYPES = ["Test execution", "Screenshot", "Video", "Log", "Monitoring", "Document", "Report", "Reference"];
const CHECKPOINT_TYPES = ["Functional", "Regression", "Accessibility", "Performance", "Security", "Operations", "Data"];
const CHECKLIST = [
  ["scope", "Release scope is documented", "The release, target build, and covered journeys are named."],
  ["evidence", "Evidence is attached", "Each important checkpoint has supporting material."],
  ["verification", "Evidence is verified", "Attached material has a clear reviewer or verification note."],
  ["blockers", "Blockers are resolved", "Open blockers are closed, mitigated, or explicitly accepted."],
  ["owners", "Ownership is visible", "Evidence, checkpoints, and approvals have accountable owners."],
  ["approvals", "Approvals are recorded", "The required release stakeholders have responded."],
];

function clean(value, fallback = "", limit = 1200) {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, limit);
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function timestamp() {
  return new Date().toISOString();
}

function dateLabel(value) {
  if (!value) return "No date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No date" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function labelFor(options, value) {
  return options.find((option) => option.value === value)?.label || value || "Unknown";
}

function toneFor(tone = "slate") {
  return {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    cyan: "border-cyan-200 bg-cyan-50 text-cyan-800",
    violet: "border-violet-200 bg-violet-50 text-violet-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
  }[tone] || "border-slate-200 bg-slate-50 text-slate-700";
}

function stateTone(options, value) {
  return toneFor(options.find((option) => option.value === value)?.tone);
}

function initialData() {
  return {
    packs: [],
    evidence: [],
    checkpoints: [],
    blockers: [],
    approvals: [],
    reports: [],
    references: [],
  };
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
  const variants = {
    primary: "border-violet-600 bg-violet-600 text-white hover:bg-violet-700",
    secondary: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
    subtle: "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200",
    danger: "border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]}`}>
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

function Badge({ children, tone = "slate" }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneFor(tone)}`}>{children}</span>;
}

function Field({ label, value, onChange, placeholder, type = "text", options, required = false }) {
  const props = {
    value: value || "",
    onChange: (event) => onChange(event.target.value),
    required,
    className: "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100",
  };
  return (
    <label className="block text-xs font-semibold text-slate-700">
      {label}
      {options ? <select {...props}><option value="">Select...</option>{options.map((option) => <option key={option.value || option} value={option.value || option}>{option.label || option}</option>)}</select> : <input {...props} type={type} placeholder={placeholder} />}
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }) {
  return <label className="block text-xs font-semibold text-slate-700">{label}<textarea value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100" /></label>;
}

function Stat({ label, value, note, icon: Icon, tone = "violet" }) {
  const colors = { violet: "bg-violet-100 text-violet-700", emerald: "bg-emerald-100 text-emerald-700", rose: "bg-rose-100 text-rose-700", amber: "bg-amber-100 text-amber-700" };
  return <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p></div>{Icon && <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors[tone]}`}><Icon size={17} /></span>}</div>{note && <p className="mt-2 text-[11px] leading-5 text-slate-500">{note}</p>}</article>;
}

function Section({ title, description, action, children }) {
  return <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-sm font-semibold text-slate-950">{title}</h3>{description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}</div>{action && <div className="shrink-0">{action}</div>}</div>{children}</section>;
}

function Empty({ title, description, action }) {
  return <div className="px-5 py-12 text-center"><FolderCheck className="mx-auto text-slate-300" size={32} /><p className="mt-3 text-sm font-semibold text-slate-800">{title}</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">{description}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

function Modal({ title, onClose, children }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 p-5"><h2 className="text-base font-semibold text-slate-950">{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={17} /></button></div><div className="p-5">{children}</div></div></div>;
}

function GuidancePanel({ evidenceCount, verifiedCount, checkpointCount, blockerCount, approvalCount }) {
  const cards = [
    {
      title: "Prefer observable proof",
      detail: "Attach a result that another tester can inspect without relying on memory or a verbal walkthrough.",
      signal: evidenceCount > 0 ? "Evidence started" : "Needs evidence",
      tone: evidenceCount > 0 ? "emerald" : "amber",
      icon: FileCheck2,
    },
    {
      title: "Verify the important artifacts",
      detail: "A file being attached does not make it trustworthy. Record the check, reviewer, or comparison that confirms it.",
      signal: `${verifiedCount} verified`,
      tone: verifiedCount > 0 ? "emerald" : "violet",
      icon: ShieldCheck,
    },
    {
      title: "Make the release path explicit",
      detail: "Critical journeys should have a named checkpoint, an expected outcome, and an observed result.",
      signal: `${checkpointCount} checkpoints`,
      tone: checkpointCount > 0 ? "cyan" : "amber",
      icon: FolderCheck,
    },
    {
      title: "Separate blockers from notes",
      detail: "If an item can prevent a confident recommendation, track it as a blocker with an owner and next step.",
      signal: `${blockerCount} blockers`,
      tone: blockerCount === 0 ? "emerald" : "rose",
      icon: ShieldCheck,
    },
    {
      title: "Record the decision trail",
      detail: "Approval requests should name the stakeholder, their role, and the question they are being asked to answer.",
      signal: `${approvalCount} approvals`,
      tone: approvalCount > 0 ? "cyan" : "amber",
      icon: Users,
    },
    {
      title: "Keep handoff language precise",
      detail: "Use concise evidence statements: what was tested, where it ran, what passed, and what remains uncertain.",
      signal: "Handoff cue",
      tone: "violet",
      icon: Copy,
    },
  ];

  return (
    <Section
      title="Evidence quality guidance"
      description="Small prompts that help turn a collection of artifacts into a decision-ready release record."
    >
      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ title, detail, signal, tone, icon: Icon }) => (
          <article key={title} className="rounded-xl border border-slate-200 p-4 transition hover:border-cyan-300 hover:shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneFor(tone)}`}>
                <Icon size={16} />
              </span>
              <Badge tone={tone}>{signal}</Badge>
            </div>
            <h4 className="mt-4 text-xs font-semibold text-slate-900">{title}</h4>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">{detail}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

function HandoffCue({ pack, verifiedEvidence, passedCheckpoints, openBlockers, approvals }) {
  const cues = [
    ["Release context", pack?.scope || "Add the release scope before sharing a conclusion."],
    ["Evidence statement", verifiedEvidence ? `${verifiedEvidence} verified evidence item${verifiedEvidence === 1 ? "" : "s"} can support the summary.` : "No verified evidence is available yet."],
    ["Checkpoint statement", passedCheckpoints ? `${passedCheckpoints} checkpoint${passedCheckpoints === 1 ? "" : "s"} passed or waived.` : "No checkpoint has passed or been waived."],
    ["Risk statement", openBlockers ? `${openBlockers} blocker${openBlockers === 1 ? "" : "s"} remain open and should be named.` : "No open blockers are currently recorded."],
    ["Approval statement", approvals ? `${approvals} approval response${approvals === 1 ? "" : "s"} recorded.` : "No approval response has been recorded."],
  ];

  return (
    <div className="rounded-2xl border border-cyan-200 bg-cyan-50/50 p-5">
      <div className="flex items-start gap-3">
        <Clipboard className="mt-0.5 shrink-0 text-cyan-700" size={18} />
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Handoff cue sheet</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">Use these prompts when copying the evidence summary into a release update or tester handoff.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {cues.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-cyan-100 bg-white/80 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-800">{label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-700">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadinessLegend() {
  const rows = [
    ["Ready", "All required checks are complete and no open blocker remains.", "emerald"],
    ["Review", "Evidence exists, but verification or stakeholder responses are incomplete.", "violet"],
    ["Blocked", "An unresolved blocker limits the confidence of the release recommendation.", "rose"],
    ["Incomplete", "The pack needs scope, evidence, checkpoints, or accountable ownership.", "amber"],
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="text-violet-600" size={17} />
        <h3 className="text-sm font-semibold text-slate-950">How to read readiness</h3>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {rows.map(([title, detail, tone]) => (
          <div key={title} className="flex gap-3 rounded-lg border border-slate-100 p-3">
            <Badge tone={tone}>{title}</Badge>
            <p className="text-[11px] leading-5 text-slate-500">{detail}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] leading-5 text-slate-400">
        Readiness is a local planning signal. It does not update release status,
        ownership, or approval state in the server application.
      </p>
    </div>
  );
}

function ReleaseEvidenceWorkspace({ reports = [], email = "", onOpenReport }) {
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState("overview");
  const [selectedPackId, setSelectedPackId] = useState("");
  const [packFilter, setPackFilter] = useState("all");
  const [evidenceFilter, setEvidenceFilter] = useState("all");
  const [checkpointFilter, setCheckpointFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [ascending, setAscending] = useState(false);
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState("");
  const [packForm, setPackForm] = useState({ title: "", release: "", owner: "", state: "draft", target: "", scope: "", notes: "" });
  const [evidenceForm, setEvidenceForm] = useState({ title: "", packId: "", type: "Test execution", state: "planned", owner: "", source: "", notes: "" });
  const [checkpointForm, setCheckpointForm] = useState({ title: "", packId: "", type: "Functional", state: "not-started", owner: "", expected: "", result: "" });
  const [blockerForm, setBlockerForm] = useState({ title: "", packId: "", severity: "high", state: "open", owner: "", impact: "", nextStep: "", dueDate: "" });
  const [approvalForm, setApprovalForm] = useState({ name: "", packId: "", role: "", state: "requested", note: "" });

  useEffect(() => setData(readData()), []);
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const pack = data.packs.find((item) => item.id === selectedPackId);
  const packIds = selectedPackId ? new Set([selectedPackId]) : null;
  const scopedEvidence = data.evidence.filter((item) => !packIds || item.packId === selectedPackId);
  const scopedCheckpoints = data.checkpoints.filter((item) => !packIds || item.packId === selectedPackId);
  const scopedBlockers = data.blockers.filter((item) => !packIds || item.packId === selectedPackId);
  const scopedApprovals = data.approvals.filter((item) => !packIds || item.packId === selectedPackId);
  const filteredEvidence = useMemo(() => {
    const text = query.toLowerCase();
    return scopedEvidence.filter((item) => evidenceFilter === "all" || item.state === evidenceFilter).filter((item) => !text || `${item.title} ${item.type} ${item.owner} ${item.source}`.toLowerCase().includes(text)).sort((a, b) => ascending ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title));
  }, [ascending, evidenceFilter, query, scopedEvidence]);
  const filteredCheckpoints = scopedCheckpoints.filter((item) => checkpointFilter === "all" || item.state === checkpointFilter);
  const verifiedEvidence = scopedEvidence.filter((item) => item.state === "verified").length;
  const passedCheckpoints = scopedCheckpoints.filter((item) => ["passed", "waived"].includes(item.state)).length;
  const openBlockers = scopedBlockers.filter((item) => !["accepted", "closed"].includes(item.state));
  const approved = scopedApprovals.filter((item) => item.state === "approved").length;
  const readiness = [
    Boolean(pack?.scope),
    scopedEvidence.length > 0,
    scopedEvidence.length > 0 && scopedEvidence.every((item) => item.state === "verified"),
    openBlockers.length === 0,
    [...scopedEvidence, ...scopedCheckpoints, ...scopedBlockers].length > 0 && [...scopedEvidence, ...scopedCheckpoints, ...scopedBlockers].every((item) => item.owner),
    scopedApprovals.length > 0 && scopedApprovals.every((item) => ["approved", "declined"].includes(item.state)),
  ].filter(Boolean).length;
  const readinessPercent = Math.round((readiness / CHECKLIST.length) * 100);

  function update(key, items) {
    setData((current) => ({ ...current, [key]: items }));
  }
  function addPack(event) {
    event.preventDefault();
    if (!clean(packForm.title) || data.packs.length >= MAX_PACKS) return;
    const item = { ...packForm, id: makeId("pack"), title: clean(packForm.title), release: clean(packForm.release), owner: clean(packForm.owner), target: clean(packForm.target), scope: clean(packForm.scope), notes: clean(packForm.notes), createdAt: timestamp() };
    update("packs", [item, ...data.packs].slice(0, MAX_PACKS));
    setSelectedPackId(item.id);
    setPackForm({ title: "", release: "", owner: "", state: "draft", target: "", scope: "", notes: "" });
    setModal("");
    setNotice("Evidence pack created");
  }
  function addEvidence(event) {
    event.preventDefault();
    if (!clean(evidenceForm.title) || data.evidence.length >= MAX_EVIDENCE) return;
    const item = { ...evidenceForm, id: makeId("evidence"), packId: evidenceForm.packId || selectedPackId, title: clean(evidenceForm.title), owner: clean(evidenceForm.owner), source: clean(evidenceForm.source), notes: clean(evidenceForm.notes), createdAt: timestamp() };
    update("evidence", [item, ...data.evidence].slice(0, MAX_EVIDENCE));
    setEvidenceForm({ title: "", packId: selectedPackId, type: "Test execution", state: "planned", owner: "", source: "", notes: "" });
    setModal("");
    setNotice("Evidence item added");
  }
  function addCheckpoint(event) {
    event.preventDefault();
    if (!clean(checkpointForm.title) || data.checkpoints.length >= MAX_CHECKPOINTS) return;
    const item = { ...checkpointForm, id: makeId("checkpoint"), packId: checkpointForm.packId || selectedPackId, title: clean(checkpointForm.title), owner: clean(checkpointForm.owner), expected: clean(checkpointForm.expected), result: clean(checkpointForm.result), createdAt: timestamp() };
    update("checkpoints", [item, ...data.checkpoints].slice(0, MAX_CHECKPOINTS));
    setCheckpointForm({ title: "", packId: selectedPackId, type: "Functional", state: "not-started", owner: "", expected: "", result: "" });
    setModal("");
    setNotice("Checkpoint added");
  }
  function addBlocker(event) {
    event.preventDefault();
    if (!clean(blockerForm.title) || data.blockers.length >= MAX_BLOCKERS) return;
    const item = { ...blockerForm, id: makeId("blocker"), packId: blockerForm.packId || selectedPackId, title: clean(blockerForm.title), owner: clean(blockerForm.owner), impact: clean(blockerForm.impact), nextStep: clean(blockerForm.nextStep), dueDate: clean(blockerForm.dueDate), createdAt: timestamp() };
    update("blockers", [item, ...data.blockers].slice(0, MAX_BLOCKERS));
    setBlockerForm({ title: "", packId: selectedPackId, severity: "high", state: "open", owner: "", impact: "", nextStep: "", dueDate: "" });
    setModal("");
    setNotice("Blocker added");
  }
  function addApproval(event) {
    event.preventDefault();
    if (!clean(approvalForm.name) || data.approvals.length >= MAX_APPROVALS) return;
    const item = { ...approvalForm, id: makeId("approval"), packId: approvalForm.packId || selectedPackId, name: clean(approvalForm.name), role: clean(approvalForm.role), note: clean(approvalForm.note), createdAt: timestamp() };
    update("approvals", [item, ...data.approvals].slice(0, MAX_APPROVALS));
    setApprovalForm({ name: "", packId: selectedPackId, role: "", state: "requested", note: "" });
    setModal("");
    setNotice("Approval request added");
  }
  function remove(key, itemId) {
    update(key, data[key].filter((item) => item.id !== itemId));
    setNotice("Item removed");
  }
  function change(key, itemId, field, value) {
    update(key, data[key].map((item) => item.id === itemId ? { ...item, [field]: value, updatedAt: timestamp() } : item));
  }
  function attachReport(report) {
    if (data.reports.some((item) => item.id === report.id) || data.reports.length >= MAX_REPORTS) return;
    update("reports", [{ id: report.id, title: clean(report.title || report.summary || `Report ${report.id}`), attachedAt: timestamp() }, ...data.reports]);
    setNotice("Report attached");
  }
  function addReference() {
    const title = window.prompt("Reference title");
    if (!clean(title) || data.references.length >= MAX_REFERENCES) return;
    update("references", [{ id: makeId("reference"), title: clean(title), createdAt: timestamp() }, ...data.references]);
    setNotice("Reference added");
  }
  function copySummary() {
    const summary = [`Release evidence: ${pack?.title || "All packs"}`, `Readiness: ${readinessPercent}%`, `Verified evidence: ${verifiedEvidence}/${scopedEvidence.length}`, `Passed checkpoints: ${passedCheckpoints}/${scopedCheckpoints.length}`, `Open blockers: ${openBlockers.length}`, `Approvals: ${approved}/${scopedApprovals.length}`];
    navigator.clipboard?.writeText(summary.join("\n"));
    setNotice("Summary copied");
  }
  function exportEvidence() {
    const header = ["Evidence", "Pack", "Type", "State", "Owner", "Source"];
    const rows = filteredEvidence.map((item) => [item.title, data.packs.find((packItem) => packItem.id === item.packId)?.title || "", item.type, item.state, item.owner, item.source]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "tester-release-evidence.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Evidence exported");
  }

  const tabs = [["overview", "Overview"], ["evidence", `Evidence (${scopedEvidence.length})`], ["checkpoints", `Checkpoints (${scopedCheckpoints.length})`], ["blockers", `Blockers (${scopedBlockers.length})`], ["approvals", `Approvals (${scopedApprovals.length})`], ["sources", "Sources"]];

  return (
    <div className="mt-8 space-y-5">
      <div className="rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700"><FolderCheck size={16} /> Release evidence workspace</div><h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Turn test results into a release-ready evidence pack.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Organize evidence, checkpoints, blockers, and approvals in one browser-local workspace. It is advisory only and does not change server release state.</p></div>
          <div className="flex flex-wrap gap-2"><Button icon={Plus} variant="primary" onClick={() => setModal("pack")} disabled={data.packs.length >= MAX_PACKS}>New evidence pack</Button><Button icon={Copy} onClick={copySummary}>Copy summary</Button></div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Readiness" value={`${readinessPercent}%`} note={`${readiness} of ${CHECKLIST.length} checks complete`} icon={CheckCircle2} tone="violet" /><Stat label="Verified evidence" value={verifiedEvidence} note={`${scopedEvidence.length} evidence items`} icon={FileCheck2} tone="emerald" /><Stat label="Open blockers" value={openBlockers.length} note={`${scopedBlockers.length} blockers tracked`} icon={ShieldCheck} tone="rose" /><Stat label="Approvals" value={approved} note={`${scopedApprovals.length} responses recorded`} icon={Users} tone="amber" /></div>
      </div>
      {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"><CheckCircle2 size={16} />{notice}</div>}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">{tabs.map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-t-lg px-3 py-2 text-xs font-semibold transition ${tab === value ? "border-b-2 border-cyan-600 text-cyan-700" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>)}</div>

      <Section title="Evidence pack context" description="Select a release pack to focus every tab on one delivery or work across all local packs." action={<Button icon={RefreshCw} onClick={() => { setData(readData()); setNotice("Workspace refreshed"); }}>Refresh</Button>}>
        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_200px_180px]"><label className="text-xs font-semibold text-slate-700">Selected pack<select value={selectedPackId} onChange={(event) => setSelectedPackId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"><option value="">All evidence packs</option>{data.packs.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="text-xs font-semibold text-slate-700">Pack state<select value={packFilter} onChange={(event) => setPackFilter(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-cyan-500">{PACK_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><div className="flex items-end"><Button icon={Plus} onClick={() => setModal("pack")}>Add pack</Button></div></div>
        <div className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-2 xl:grid-cols-3">{data.packs.filter((item) => packFilter === "all" || item.state === packFilter).map((item) => <button key={item.id} type="button" onClick={() => setSelectedPackId(item.id)} className={`rounded-xl border p-4 text-left transition hover:border-cyan-300 ${selectedPackId === item.id ? "border-cyan-300 bg-cyan-50/50" : "border-slate-200"}`}><div className="flex items-start justify-between gap-3"><span className="min-w-0 text-sm font-semibold text-slate-900">{item.title}</span><Badge tone={PACK_STATES.find((state) => state.value === item.state)?.tone}>{labelFor(PACK_STATES, item.state)}</Badge></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{item.scope || "No release scope described"}</p><div className="mt-3 flex items-center justify-between text-[11px] text-slate-400"><span>{item.release || "No release"}</span><span>{item.owner || "Unassigned"}</span></div></button>)}{!data.packs.length && <div className="md:col-span-2 xl:col-span-3"><Empty title="No evidence pack yet" description="Create a pack for a release, hotfix, feature flag, or test cycle." action={<Button icon={Plus} variant="primary" onClick={() => setModal("pack")}>Create pack</Button>} /></div>}</div>
      </Section>

      {tab === "overview" && <div className="space-y-5"><div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]"><Section title="Readiness checklist" description="Use this before sharing a release recommendation."><div className="space-y-3 p-5">{CHECKLIST.map(([key, title, detail], index) => { const complete = [Boolean(pack?.scope), scopedEvidence.length > 0, scopedEvidence.length > 0 && scopedEvidence.every((item) => item.state === "verified"), openBlockers.length === 0, [...scopedEvidence, ...scopedCheckpoints, ...scopedBlockers].length > 0 && [...scopedEvidence, ...scopedCheckpoints, ...scopedBlockers].every((item) => item.owner), scopedApprovals.length > 0 && scopedApprovals.every((item) => ["approved", "declined"].includes(item.state))][index]; return <div key={key} className={`flex gap-3 rounded-xl border p-3 ${complete ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200"}`}><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${complete ? "bg-emerald-600 text-white" : "border border-slate-300 text-transparent"}`}><Check size={13} /></span><div><p className="text-xs font-semibold text-slate-800">{title}</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{detail}</p></div></div>; })}</div></Section><Section title="Pack activity" description="Recent items that affect release confidence."><div className="space-y-3 p-5">{[...scopedBlockers.map((item) => ({ ...item, kind: "Blocker" })), ...scopedEvidence.map((item) => ({ ...item, kind: "Evidence" })), ...scopedCheckpoints.map((item) => ({ ...item, kind: "Checkpoint" }))].slice(0, 8).map((item) => <div key={`${item.kind}-${item.id}`} className="flex gap-3 rounded-xl border border-slate-200 p-3"><span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><FileCheck2 size={14} /></span><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{item.title}</p><p className="mt-1 text-[11px] text-slate-500">{item.kind} · {dateLabel(item.createdAt)}</p></div></div>)}{!scopedBlockers.length && !scopedEvidence.length && !scopedCheckpoints.length && <Empty title="No activity yet" description="Add evidence or checkpoints to start the release record." />}</div></Section></div><GuidancePanel evidenceCount={scopedEvidence.length} verifiedCount={verifiedEvidence} checkpointCount={scopedCheckpoints.length} blockerCount={scopedBlockers.length} approvalCount={scopedApprovals.length} /><HandoffCue pack={pack} verifiedEvidence={verifiedEvidence} passedCheckpoints={passedCheckpoints} openBlockers={openBlockers.length} approvals={approved} /><ReadinessLegend /></div>}

      {tab === "evidence" && <Section title="Evidence register" description="Capture the artifact, its source, ownership, and verification state." action={<div className="flex flex-wrap gap-2"><Button icon={Download} onClick={exportEvidence}>Export CSV</Button><Button icon={Plus} variant="primary" onClick={() => setModal("evidence")}>Add evidence</Button></div>}><div className="grid gap-3 border-b border-slate-100 p-5 lg:grid-cols-[minmax(0,1fr)_180px_auto]"><label className="relative block"><Search size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search evidence..." className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" /></label><select value={evidenceFilter} onChange={(event) => setEvidenceFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-cyan-500">{EVIDENCE_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><Button icon={ascending ? ArrowUpAZ : ArrowDownAZ} onClick={() => setAscending((value) => !value)}>Name</Button></div>{!filteredEvidence.length ? <Empty title="No evidence matches" description="Add an item or clear the current search and filter." action={<Button icon={Plus} onClick={() => setModal("evidence")}>Add evidence</Button>} /> : <div className="divide-y divide-slate-100">{filteredEvidence.slice(0, PAGE_SIZE).map((item) => <div key={item.id} className="p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-900">{item.title}</h4><Badge tone={item.state === "verified" ? "emerald" : item.state === "rejected" ? "rose" : "slate"}>{labelFor(EVIDENCE_STATES, item.state)}</Badge><Badge>{item.type}</Badge></div><p className="mt-2 text-xs leading-5 text-slate-600">{item.notes || item.source || "No evidence notes provided."}</p><p className="mt-2 text-[11px] text-slate-500">Owner: {item.owner || "Unassigned"} · Source: {item.source || "Not recorded"}</p></div><div className="flex gap-2"><select value={item.state} onChange={(event) => change("evidence", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{EVIDENCE_STATES.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => remove("evidence", item.id)}>Remove</Button></div></div></div>)}</div>}</Section>}

      {tab === "checkpoints" && <Section title="Release checkpoints" description="Track the checks that must pass before evidence is considered complete." action={<Button icon={Plus} variant="primary" onClick={() => setModal("checkpoint")}>Add checkpoint</Button>}><div className="border-b border-slate-100 p-5"><select value={checkpointFilter} onChange={(event) => setCheckpointFilter(event.target.value)} className="h-10 w-full max-w-xs rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-cyan-500">{CHECKPOINT_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>{!filteredCheckpoints.length ? <Empty title="No checkpoints yet" description="Add a functional, regression, accessibility, performance, or operations checkpoint." action={<Button icon={Plus} onClick={() => setModal("checkpoint")}>Add checkpoint</Button>} /> : <div className="divide-y divide-slate-100">{filteredCheckpoints.map((item) => <div key={item.id} className="p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-900">{item.title}</h4><Badge tone={item.state === "passed" || item.state === "waived" ? "emerald" : item.state === "failed" ? "rose" : "slate"}>{labelFor(CHECKPOINT_STATES, item.state)}</Badge><Badge>{item.type}</Badge></div><p className="mt-2 text-xs text-slate-600"><span className="font-semibold">Expected:</span> {item.expected || "Not recorded"}</p><p className="mt-1 text-xs text-slate-600"><span className="font-semibold">Result:</span> {item.result || "Awaiting execution"}</p><p className="mt-2 text-[11px] text-slate-500">Owner: {item.owner || "Unassigned"}</p></div><div className="flex gap-2"><select value={item.state} onChange={(event) => change("checkpoints", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{CHECKPOINT_STATES.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => remove("checkpoints", item.id)}>Remove</Button></div></div></div>)}</div>}</Section>}

      {tab === "blockers" && <Section title="Release blockers" description="Make unresolved release risk explicit and assign the next action." action={<Button icon={Plus} variant="primary" onClick={() => setModal("blocker")}>Add blocker</Button>}>{!scopedBlockers.length ? <Empty title="No blockers recorded" description="Add a blocker when evidence collection or release confidence is constrained." action={<Button icon={Plus} onClick={() => setModal("blocker")}>Add blocker</Button>} /> : <div className="divide-y divide-slate-100">{scopedBlockers.map((item) => <div key={item.id} className="p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-900">{item.title}</h4><Badge tone={item.state === "closed" || item.state === "accepted" ? "emerald" : "rose"}>{labelFor(BLOCKER_STATES, item.state)}</Badge><Badge tone={item.severity === "critical" ? "rose" : "amber"}>{item.severity}</Badge></div><p className="mt-2 text-xs text-slate-600">{item.impact || "Impact not described."}</p><div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700"><span className="font-semibold">Next step:</span> {item.nextStep || "No next step recorded."}</div><p className="mt-2 text-[11px] text-slate-500">Owner: {item.owner || "Unassigned"} · Due: {dateLabel(item.dueDate)}</p></div><div className="flex gap-2"><select value={item.state} onChange={(event) => change("blockers", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{BLOCKER_STATES.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => remove("blockers", item.id)}>Remove</Button></div></div></div>)}</div>}</Section>}

      {tab === "approvals" && <Section title="Approval trail" description="Record the people who need to review the release evidence and their response." action={<Button icon={Plus} variant="primary" onClick={() => setModal("approval")}>Request approval</Button>}>{!scopedApprovals.length ? <Empty title="No approvals requested" description="Add release stakeholders to make the decision trail visible." action={<Button icon={Plus} onClick={() => setModal("approval")}>Request approval</Button>} /> : <div className="divide-y divide-slate-100">{scopedApprovals.map((item) => <div key={item.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-900">{item.name}</h4><Badge tone={item.state === "approved" ? "emerald" : item.state === "declined" ? "rose" : "slate"}>{labelFor(APPROVAL_STATES, item.state)}</Badge></div><p className="mt-1 text-xs text-slate-500">{item.role || "Role not recorded"} · {item.note || "No note"}</p></div><div className="flex gap-2"><select value={item.state} onChange={(event) => change("approvals", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{APPROVAL_STATES.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => remove("approvals", item.id)}>Remove</Button></div></div>)}</div>}</Section>}

      {tab === "sources" && <div className="grid gap-5 xl:grid-cols-2"><Section title="Attached reports" description="Use submitted tester reports as supporting release evidence."><div className="divide-y divide-slate-100">{reports.slice(0, 20).map((report) => { const attached = data.reports.some((item) => item.id === report.id); return <div key={report.id} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{report.title || report.summary || `Report ${report.id}`}</p><p className="mt-1 text-[11px] text-slate-500">Available report</p></div><div className="flex shrink-0 gap-2">{onOpenReport && <Button icon={ExternalLink} onClick={() => onOpenReport(report)}>Open</Button>}<Button icon={attached ? Check : Plus} onClick={() => attachReport(report)} disabled={attached}>{attached ? "Attached" : "Attach"}</Button></div></div>; })}{!reports.length && <Empty title="No reports available" description="Submitted reports will appear here when available." />}</div></Section><Section title="References" description="Keep release notes, tickets, designs, or standards close to the evidence decision." action={<Button icon={Plus} onClick={addReference}>Add reference</Button>}><div className="divide-y divide-slate-100">{data.references.map((reference) => <div key={reference.id} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{reference.title}</p><p className="mt-1 text-[11px] text-slate-400">{dateLabel(reference.createdAt)}</p></div><Button variant="danger" icon={Trash2} onClick={() => remove("references", reference.id)}>Remove</Button></div>)}{!data.references.length && <Empty title="No references yet" description="Add a supporting source for the release conclusion." action={<Button icon={Plus} onClick={addReference}>Add reference</Button>} />}</div></Section></div>}

      {modal === "pack" && <Modal title="Create evidence pack" onClose={() => setModal("")}><form onSubmit={addPack} className="space-y-4"><Field label="Pack title" value={packForm.title} onChange={(value) => setPackForm({ ...packForm, title: value })} placeholder="Release 2.4 evidence pack" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Release or build" value={packForm.release} onChange={(value) => setPackForm({ ...packForm, release: value })} placeholder="2.4.0 / build 184" /><Field label="Owner" value={packForm.owner} onChange={(value) => setPackForm({ ...packForm, owner: value })} placeholder={email || "Tester or team"} /><Field label="State" options={PACK_STATES} value={packForm.state} onChange={(value) => setPackForm({ ...packForm, state: value })} /><Field label="Target date" type="date" value={packForm.target} onChange={(value) => setPackForm({ ...packForm, target: value })} /></div><TextArea label="Scope" value={packForm.scope} onChange={(value) => setPackForm({ ...packForm, scope: value })} placeholder="Release journeys, platforms, and risk areas covered" rows={3} /><TextArea label="Notes" value={packForm.notes} onChange={(value) => setPackForm({ ...packForm, notes: value })} placeholder="Assumptions or handoff notes" /><div className="flex justify-end gap-2 pt-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Create pack</Button></div></form></Modal>}
      {modal === "evidence" && <Modal title="Add evidence" onClose={() => setModal("")}><form onSubmit={addEvidence} className="space-y-4"><Field label="Evidence title" value={evidenceForm.title} onChange={(value) => setEvidenceForm({ ...evidenceForm, title: value })} placeholder="Checkout regression run" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Pack" options={data.packs.map((item) => ({ value: item.id, label: item.title }))} value={evidenceForm.packId || selectedPackId} onChange={(value) => setEvidenceForm({ ...evidenceForm, packId: value })} /><Field label="Type" options={EVIDENCE_TYPES.map((value) => ({ value, label: value }))} value={evidenceForm.type} onChange={(value) => setEvidenceForm({ ...evidenceForm, type: value })} /><Field label="State" options={EVIDENCE_STATES} value={evidenceForm.state} onChange={(value) => setEvidenceForm({ ...evidenceForm, state: value })} /><Field label="Owner" value={evidenceForm.owner} onChange={(value) => setEvidenceForm({ ...evidenceForm, owner: value })} placeholder="Evidence owner" /></div><Field label="Source or link" value={evidenceForm.source} onChange={(value) => setEvidenceForm({ ...evidenceForm, source: value })} placeholder="URL, test run, storage path, or ticket" /><TextArea label="Notes" value={evidenceForm.notes} onChange={(value) => setEvidenceForm({ ...evidenceForm, notes: value })} placeholder="What does this evidence prove?" /><div className="flex justify-end gap-2 pt-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add evidence</Button></div></form></Modal>}
      {modal === "checkpoint" && <Modal title="Add checkpoint" onClose={() => setModal("")}><form onSubmit={addCheckpoint} className="space-y-4"><Field label="Checkpoint title" value={checkpointForm.title} onChange={(value) => setCheckpointForm({ ...checkpointForm, title: value })} placeholder="Critical checkout journey passes" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Pack" options={data.packs.map((item) => ({ value: item.id, label: item.title }))} value={checkpointForm.packId || selectedPackId} onChange={(value) => setCheckpointForm({ ...checkpointForm, packId: value })} /><Field label="Type" options={CHECKPOINT_TYPES.map((value) => ({ value, label: value }))} value={checkpointForm.type} onChange={(value) => setCheckpointForm({ ...checkpointForm, type: value })} /><Field label="State" options={CHECKPOINT_STATES} value={checkpointForm.state} onChange={(value) => setCheckpointForm({ ...checkpointForm, state: value })} /><Field label="Owner" value={checkpointForm.owner} onChange={(value) => setCheckpointForm({ ...checkpointForm, owner: value })} placeholder="Checkpoint owner" /></div><TextArea label="Expected" value={checkpointForm.expected} onChange={(value) => setCheckpointForm({ ...checkpointForm, expected: value })} placeholder="Expected outcome or threshold" /><TextArea label="Result" value={checkpointForm.result} onChange={(value) => setCheckpointForm({ ...checkpointForm, result: value })} placeholder="Observed result and evidence reference" /><div className="flex justify-end gap-2 pt-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add checkpoint</Button></div></form></Modal>}
      {modal === "blocker" && <Modal title="Add release blocker" onClose={() => setModal("")}><form onSubmit={addBlocker} className="space-y-4"><Field label="Blocker title" value={blockerForm.title} onChange={(value) => setBlockerForm({ ...blockerForm, title: value })} placeholder="Missing production-like data for validation" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Pack" options={data.packs.map((item) => ({ value: item.id, label: item.title }))} value={blockerForm.packId || selectedPackId} onChange={(value) => setBlockerForm({ ...blockerForm, packId: value })} /><Field label="Severity" options={["critical", "high", "medium", "low"].map((value) => ({ value, label: value }))} value={blockerForm.severity} onChange={(value) => setBlockerForm({ ...blockerForm, severity: value })} /><Field label="State" options={BLOCKER_STATES} value={blockerForm.state} onChange={(value) => setBlockerForm({ ...blockerForm, state: value })} /><Field label="Owner" value={blockerForm.owner} onChange={(value) => setBlockerForm({ ...blockerForm, owner: value })} placeholder="Responsible person or team" /><Field label="Due date" type="date" value={blockerForm.dueDate} onChange={(value) => setBlockerForm({ ...blockerForm, dueDate: value })} /></div><TextArea label="Impact" value={blockerForm.impact} onChange={(value) => setBlockerForm({ ...blockerForm, impact: value })} placeholder="Why does this block confidence?" required /><TextArea label="Next step" value={blockerForm.nextStep} onChange={(value) => setBlockerForm({ ...blockerForm, nextStep: value })} placeholder="Concrete action to resolve or reduce the blocker" /><div className="flex justify-end gap-2 pt-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add blocker</Button></div></form></Modal>}
      {modal === "approval" && <Modal title="Request release approval" onClose={() => setModal("")}><form onSubmit={addApproval} className="space-y-4"><Field label="Reviewer name" value={approvalForm.name} onChange={(value) => setApprovalForm({ ...approvalForm, name: value })} placeholder="Stakeholder or team" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Pack" options={data.packs.map((item) => ({ value: item.id, label: item.title }))} value={approvalForm.packId || selectedPackId} onChange={(value) => setApprovalForm({ ...approvalForm, packId: value })} /><Field label="Role" value={approvalForm.role} onChange={(value) => setApprovalForm({ ...approvalForm, role: value })} placeholder="Product, engineering, support" /><Field label="State" options={APPROVAL_STATES} value={approvalForm.state} onChange={(value) => setApprovalForm({ ...approvalForm, state: value })} /></div><TextArea label="Note" value={approvalForm.note} onChange={(value) => setApprovalForm({ ...approvalForm, note: value })} placeholder="What should the reviewer focus on?" /><div className="flex justify-end gap-2 pt-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Request approval</Button></div></form></Modal>}
    </div>
  );
}

export default function TesterReleaseEvidenceWorkspace({ reports, email, onOpenReport }) {
  return <ReleaseEvidenceWorkspace reports={reports} email={email} onOpenReport={onOpenReport} />;
}
