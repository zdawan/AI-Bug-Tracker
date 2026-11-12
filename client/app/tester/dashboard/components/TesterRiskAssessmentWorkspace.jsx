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

const STORAGE_KEY = "tester-risk-assessment-v1";
const MAX_ASSESSMENTS = 25;
const MAX_RISKS = 120;
const MAX_CONTROLS = 100;
const MAX_FINDINGS = 100;
const MAX_REPORTS = 100;
const MAX_REFERENCES = 40;
const PAGE_SIZE = 8;

const ASSESSMENT_STATES = [
  { value: "draft", label: "Draft", tone: "slate" },
  { value: "scoping", label: "Scoping", tone: "cyan" },
  { value: "assessing", label: "Assessing", tone: "violet" },
  { value: "mitigation", label: "Mitigation", tone: "amber" },
  { value: "accepted", label: "Risk accepted", tone: "emerald" },
  { value: "blocked", label: "Blocked", tone: "rose" },
];
const ASSESSMENT_FILTERS = [
  { value: "all", label: "All assessments" },
  ...ASSESSMENT_STATES,
];
const RISK_STATES = [
  { value: "identified", label: "Identified" },
  { value: "investigating", label: "Investigating" },
  { value: "mitigating", label: "Mitigating" },
  { value: "accepted", label: "Accepted" },
  { value: "closed", label: "Closed" },
];
const RISK_FILTERS = [{ value: "all", label: "All risks" }, ...RISK_STATES];
const SEVERITIES = [
  { value: "critical", label: "Critical", tone: "rose", score: 4 },
  { value: "high", label: "High", tone: "orange", score: 3 },
  { value: "medium", label: "Medium", tone: "amber", score: 2 },
  { value: "low", label: "Low", tone: "emerald", score: 1 },
];
const SEVERITY_FILTERS = [{ value: "all", label: "All severities" }, ...SEVERITIES];
const CONTROL_STATES = [
  { value: "planned", label: "Planned" },
  { value: "implemented", label: "Implemented" },
  { value: "verified", label: "Verified" },
  { value: "failed", label: "Failed" },
  { value: "not-applicable", label: "Not applicable" },
];
const CONTROL_FILTERS = [{ value: "all", label: "All controls" }, ...CONTROL_STATES];
const FINDING_STATES = [
  { value: "open", label: "Open" },
  { value: "in-progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "accepted", label: "Accepted" },
];
const CATEGORIES = [
  "Authentication",
  "Authorization",
  "Data integrity",
  "Availability",
  "Privacy",
  "Usability",
  "Integration",
  "Operations",
];
const CHECKS = [
  ["scope", "Assessment scope is explicit", "The release, feature, and impacted users are named."],
  ["owners", "Risk ownership is assigned", "Every material risk has an accountable owner."],
  ["likelihood", "Likelihood is reasoned", "The chance of occurrence has supporting context."],
  ["impact", "Impact is described", "User, business, and operational consequences are documented."],
  ["controls", "Controls are mapped", "Preventive or detective controls are linked to risks."],
  ["residual", "Residual risk is reviewed", "Remaining exposure is understood after controls."],
  ["evidence", "Evidence is attached", "Reports or references support the assessment conclusion."],
];

function clean(value, fallback = "", limit = 1200) {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, limit);
}

function id(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

function dateLabel(value) {
  if (!value) return "No date";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "No date"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function stateLabel(list, value) {
  return list.find((item) => item.value === value)?.label || value || "Unknown";
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

function severityTone(value) {
  return SEVERITIES.find((item) => item.value === value)?.tone || "slate";
}

function scoreSeverity(value) {
  return SEVERITIES.find((item) => item.value === value)?.score || 0;
}

function emptyData() {
  return {
    assessments: [],
    risks: [],
    controls: [],
    findings: [],
    reports: [],
    references: [],
  };
}

function loadData() {
  if (typeof window === "undefined") return emptyData();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    const base = emptyData();
    return Object.fromEntries(
      Object.keys(base).map((key) => [key, Array.isArray(parsed[key]) ? parsed[key] : []]),
    );
  } catch {
    return emptyData();
  }
}

function Button({ children, onClick, variant = "secondary", icon: Icon, type = "button", disabled }) {
  const styles = {
    primary: "border-violet-600 bg-violet-600 text-white hover:bg-violet-700",
    secondary: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
    subtle: "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200",
    danger: "border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]}`}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

function Badge({ children, tone = "slate" }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClasses(tone)}`}>{children}</span>;
}

function Section({ title, description, action, children }) {
  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", options, required }) {
  const common = {
    value: value || "",
    onChange: (event) => onChange(event.target.value),
    required,
    className: "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100",
  };
  return (
    <label className="block text-xs font-semibold text-slate-700">
      {label}
      {options ? (
        <select {...common}>
          <option value="">Select...</option>
          {options.map((option) => <option key={option.value || option} value={option.value || option}>{option.label || option}</option>)}
        </select>
      ) : (
        <input {...common} type={type} placeholder={placeholder} />
      )}
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <label className="block text-xs font-semibold text-slate-700">
      {label}
      <textarea
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
      />
    </label>
  );
}

function Stat({ label, value, note, tone = "violet", icon: Icon }) {
  const iconTone = { violet: "bg-violet-100 text-violet-700", amber: "bg-amber-100 text-amber-700", rose: "bg-rose-100 text-rose-700", emerald: "bg-emerald-100 text-emerald-700" }[tone] || "bg-slate-100 text-slate-700";
  return (
    <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        {Icon && <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconTone}`}><Icon size={17} /></span>}
      </div>
      {note && <p className="mt-2 text-[11px] leading-5 text-slate-500">{note}</p>}
    </article>
  );
}

function Empty({ title, description, action }) {
  return (
    <div className="px-5 py-12 text-center">
      <ShieldCheck className="mx-auto text-slate-300" size={32} />
      <p className="mt-3 text-sm font-semibold text-slate-800">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function RiskAssessmentWorkspace({ reports = [], email = "", onOpenReport }) {
  const [data, setData] = useState(emptyData);
  const [activeTab, setActiveTab] = useState("overview");
  const [assessmentFilter, setAssessmentFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [controlFilter, setControlFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sortAscending, setSortAscending] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [showControlForm, setShowControlForm] = useState(false);
  const [showFindingForm, setShowFindingForm] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [notice, setNotice] = useState("");
  const [assessmentForm, setAssessmentForm] = useState({ title: "", scope: "", owner: "", state: "draft", target: "", notes: "" });
  const [riskForm, setRiskForm] = useState({ title: "", assessmentId: "", category: "Availability", severity: "medium", likelihood: "possible", impact: "", owner: "", state: "identified", mitigation: "", dueDate: "" });
  const [controlForm, setControlForm] = useState({ title: "", riskId: "", type: "Preventive", state: "planned", owner: "", evidence: "", notes: "" });
  const [findingForm, setFindingForm] = useState({ title: "", riskId: "", severity: "medium", state: "open", owner: "", detail: "", action: "" });

  useEffect(() => {
    setData(loadData());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const assessments = useMemo(() => data.assessments, [data.assessments]);
  const risks = useMemo(() => data.risks, [data.risks]);
  const controls = useMemo(() => data.controls, [data.controls]);
  const findings = useMemo(() => data.findings, [data.findings]);
  const selectedAssessment = assessments.find((item) => item.id === selectedAssessmentId);
  const scopedRisks = selectedAssessmentId ? risks.filter((item) => item.assessmentId === selectedAssessmentId) : risks;
  const riskIds = new Set(scopedRisks.map((item) => item.id));
  const scopedControls = controls.filter((item) => !selectedAssessmentId || riskIds.has(item.riskId));
  const scopedFindings = findings.filter((item) => !selectedAssessmentId || riskIds.has(item.riskId));

  const filteredRisks = useMemo(() => {
    const normalized = query.toLowerCase();
    return scopedRisks
      .filter((item) => riskFilter === "all" || item.state === riskFilter)
      .filter((item) => severityFilter === "all" || item.severity === severityFilter)
      .filter((item) => !normalized || `${item.title} ${item.category} ${item.owner} ${item.mitigation}`.toLowerCase().includes(normalized))
      .sort((a, b) => {
        const score = scoreSeverity(b.severity) - scoreSeverity(a.severity);
        return sortAscending ? -score : score;
      });
  }, [query, riskFilter, scopedRisks, severityFilter, sortAscending]);

  const filteredControls = useMemo(() => scopedControls.filter((item) => controlFilter === "all" || item.state === controlFilter), [controlFilter, scopedControls]);
  const openRisks = scopedRisks.filter((item) => !["accepted", "closed"].includes(item.state));
  const criticalRisks = scopedRisks.filter((item) => item.severity === "critical" && item.state !== "closed");
  const resolvedFindings = scopedFindings.filter((item) => ["resolved", "accepted"].includes(item.state)).length;
  const verifiedControls = scopedControls.filter((item) => item.state === "verified").length;
  const readiness = CHECKS.filter(([key]) => {
    if (key === "scope") return Boolean(selectedAssessment?.scope);
    if (key === "owners") return scopedRisks.length > 0 && scopedRisks.every((item) => item.owner);
    if (key === "likelihood") return scopedRisks.length > 0 && scopedRisks.every((item) => item.likelihood);
    if (key === "impact") return scopedRisks.length > 0 && scopedRisks.every((item) => item.impact);
    if (key === "controls") return scopedRisks.length > 0 && scopedRisks.every((item) => controls.some((control) => control.riskId === item.id));
    if (key === "residual") return scopedRisks.length > 0 && scopedRisks.every((item) => item.mitigation);
    return data.reports.length > 0 || data.references.length > 0;
  }).length;
  const readinessPercent = Math.round((readiness / CHECKS.length) * 100);

  function update(key, value) {
    setData((current) => ({ ...current, [key]: value }));
  }

  function addAssessment(event) {
    event.preventDefault();
    if (!clean(assessmentForm.title) || assessments.length >= MAX_ASSESSMENTS) return;
    const item = { ...assessmentForm, id: id("assessment"), title: clean(assessmentForm.title), scope: clean(assessmentForm.scope), owner: clean(assessmentForm.owner), target: clean(assessmentForm.target), notes: clean(assessmentForm.notes), createdAt: now() };
    update("assessments", [item, ...assessments].slice(0, MAX_ASSESSMENTS));
    setSelectedAssessmentId(item.id);
    setAssessmentForm({ title: "", scope: "", owner: "", state: "draft", target: "", notes: "" });
    setShowAssessmentForm(false);
    setNotice("Assessment added");
  }

  function addRisk(event) {
    event.preventDefault();
    if (!clean(riskForm.title) || risks.length >= MAX_RISKS) return;
    const item = { ...riskForm, id: id("risk"), assessmentId: riskForm.assessmentId || selectedAssessmentId, title: clean(riskForm.title), category: clean(riskForm.category), impact: clean(riskForm.impact), owner: clean(riskForm.owner), mitigation: clean(riskForm.mitigation), dueDate: clean(riskForm.dueDate), createdAt: now() };
    update("risks", [item, ...risks].slice(0, MAX_RISKS));
    setRiskForm({ title: "", assessmentId: selectedAssessmentId, category: "Availability", severity: "medium", likelihood: "possible", impact: "", owner: "", state: "identified", mitigation: "", dueDate: "" });
    setShowRiskForm(false);
    setNotice("Risk added");
  }

  function addControl(event) {
    event.preventDefault();
    if (!clean(controlForm.title) || controls.length >= MAX_CONTROLS) return;
    const item = { ...controlForm, id: id("control"), riskId: controlForm.riskId || scopedRisks[0]?.id || "", title: clean(controlForm.title), owner: clean(controlForm.owner), evidence: clean(controlForm.evidence), notes: clean(controlForm.notes), createdAt: now() };
    update("controls", [item, ...controls].slice(0, MAX_CONTROLS));
    setControlForm({ title: "", riskId: scopedRisks[0]?.id || "", type: "Preventive", state: "planned", owner: "", evidence: "", notes: "" });
    setShowControlForm(false);
    setNotice("Control added");
  }

  function addFinding(event) {
    event.preventDefault();
    if (!clean(findingForm.title) || findings.length >= MAX_FINDINGS) return;
    const item = { ...findingForm, id: id("finding"), riskId: findingForm.riskId || scopedRisks[0]?.id || "", title: clean(findingForm.title), owner: clean(findingForm.owner), detail: clean(findingForm.detail), action: clean(findingForm.action), createdAt: now() };
    update("findings", [item, ...findings].slice(0, MAX_FINDINGS));
    setFindingForm({ title: "", riskId: scopedRisks[0]?.id || "", severity: "medium", state: "open", owner: "", detail: "", action: "" });
    setShowFindingForm(false);
    setNotice("Finding added");
  }

  function removeItem(key, itemId) {
    update(key, data[key].filter((item) => item.id !== itemId));
    setNotice("Item removed");
  }

  function changeItem(key, itemId, field, value) {
    update(key, data[key].map((item) => item.id === itemId ? { ...item, [field]: value, updatedAt: now() } : item));
  }

  function copySummary() {
    const lines = [
      `Risk assessment: ${selectedAssessment?.title || "All assessments"}`,
      `Readiness: ${readinessPercent}% (${readiness}/${CHECKS.length} checks)`,
      `Open risks: ${openRisks.length}; critical risks: ${criticalRisks.length}`,
      `Verified controls: ${verifiedControls}/${scopedControls.length}`,
      `Open findings: ${scopedFindings.length - resolvedFindings}`,
      ...scopedRisks.slice(0, 10).map((item) => `- ${item.severity.toUpperCase()}: ${item.title} (${stateLabel(RISK_STATES, item.state)})`),
    ];
    navigator.clipboard?.writeText(lines.join("\n"));
    setNotice("Summary copied");
  }

  function exportCsv() {
    const header = ["Risk", "Assessment", "Category", "Severity", "Likelihood", "State", "Owner", "Mitigation", "Due date"];
    const rows = filteredRisks.map((risk) => [risk.title, assessments.find((item) => item.id === risk.assessmentId)?.title || "", risk.category, risk.severity, risk.likelihood, risk.state, risk.owner, risk.mitigation, risk.dueDate]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "tester-risk-register.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Risk register exported");
  }

  function attachReport(report) {
    if (data.reports.some((item) => item.id === report.id) || data.reports.length >= MAX_REPORTS) return;
    update("reports", [{ id: report.id, title: clean(report.title || report.summary || `Report ${report.id}`), attachedAt: now() }, ...data.reports]);
    setNotice("Report attached");
  }

  function addReference() {
    const title = window.prompt("Reference title");
    if (!clean(title) || data.references.length >= MAX_REFERENCES) return;
    update("references", [{ id: id("reference"), title: clean(title), url: "", createdAt: now() }, ...data.references]);
    setNotice("Reference added");
  }

  const tabs = [
    ["overview", "Overview"],
    ["risks", `Risks (${scopedRisks.length})`],
    ["controls", `Controls (${scopedControls.length})`],
    ["findings", `Findings (${scopedFindings.length})`],
    ["evidence", "Evidence"],
  ];

  return (
    <div className="mt-8 space-y-5">
      <div className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-rose-50 p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700"><ShieldAlert size={16} /> Risk assessment workspace</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Make product risk visible before it becomes an incident.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Keep a lightweight, tester-owned risk register with likelihood, impact, controls, findings, and evidence. This workspace is browser-local and advisory only.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button icon={Plus} variant="primary" onClick={() => setShowAssessmentForm(true)}>New assessment</Button>
            <Button icon={Copy} onClick={copySummary}>Copy summary</Button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Open risks" value={openRisks.length} note={`${criticalRisks.length} critical exposure${criticalRisks.length === 1 ? "" : "s"}`} tone="rose" icon={ShieldAlert} />
          <Stat label="Readiness" value={`${readinessPercent}%`} note={`${readiness} of ${CHECKS.length} checks complete`} tone="violet" icon={CheckCircle2} />
          <Stat label="Verified controls" value={verifiedControls} note={`${scopedControls.length} controls mapped`} tone="emerald" icon={ShieldCheck} />
          <Stat label="Open findings" value={scopedFindings.length - resolvedFindings} note={`${resolvedFindings} resolved or accepted`} tone="amber" icon={FileCheck2} />
        </div>
      </div>

      {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"><CheckCircle2 size={16} />{notice}</div>}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {tabs.map(([value, label]) => <button key={value} type="button" onClick={() => setActiveTab(value)} className={`rounded-t-lg px-3 py-2 text-xs font-semibold transition ${activeTab === value ? "border-b-2 border-violet-600 text-violet-700" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>)}
      </div>

      <Section title="Assessment context" description="Choose one assessment to keep the register focused, or work across all of your browser-local entries." action={<Button icon={RefreshCw} onClick={() => { setData(loadData()); setNotice("Workspace refreshed"); }}>Refresh</Button>}>
        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
          <label className="text-xs font-semibold text-slate-700">Selected assessment<select value={selectedAssessmentId} onChange={(event) => setSelectedAssessmentId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"><option value="">All assessments</option>{assessments.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-700">Assessment state<select value={assessmentFilter} onChange={(event) => setAssessmentFilter(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100">{ASSESSMENT_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <div className="flex items-end"><Button icon={Plus} onClick={() => setShowAssessmentForm(true)} disabled={assessments.length >= MAX_ASSESSMENTS}>Add assessment</Button></div>
        </div>
        <div className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-2 xl:grid-cols-3">
          {assessments.filter((item) => assessmentFilter === "all" || item.state === assessmentFilter).map((item) => <button key={item.id} type="button" onClick={() => setSelectedAssessmentId(item.id)} className={`rounded-xl border p-4 text-left transition hover:border-violet-300 ${selectedAssessmentId === item.id ? "border-violet-300 bg-violet-50/50" : "border-slate-200"}`}><div className="flex items-start justify-between gap-3"><span className="min-w-0 text-sm font-semibold text-slate-900">{item.title}</span><Badge tone={ASSESSMENT_STATES.find((state) => state.value === item.state)?.tone}>{stateLabel(ASSESSMENT_STATES, item.state)}</Badge></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{item.scope || "No scope described"}</p><div className="mt-3 flex items-center justify-between text-[11px] text-slate-400"><span>{item.owner || "Unassigned"}</span><span>{dateLabel(item.createdAt)}</span></div></button>)}
          {!assessments.length && <div className="md:col-span-2 xl:col-span-3"><Empty title="No risk assessment yet" description="Start with the product area, release, or journey you want to assess." action={<Button icon={Plus} variant="primary" onClick={() => setShowAssessmentForm(true)}>Create assessment</Button>} /></div>}
        </div>
      </Section>

      {activeTab === "overview" && <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Section title="Readiness checklist" description="Use these checks before sharing a risk conclusion with a release or product team." action={<Badge tone={readinessPercent === 100 ? "emerald" : "violet"}>{readinessPercent}% ready</Badge>}>
          <div className="space-y-3 p-5">{CHECKS.map(([key, label, detail]) => {
            const complete = readiness === CHECKS.findIndex((check) => check[0] === key) + 1 ? false : (() => {
              if (key === "scope") return Boolean(selectedAssessment?.scope);
              if (key === "owners") return scopedRisks.length > 0 && scopedRisks.every((item) => item.owner);
              if (key === "likelihood") return scopedRisks.length > 0 && scopedRisks.every((item) => item.likelihood);
              if (key === "impact") return scopedRisks.length > 0 && scopedRisks.every((item) => item.impact);
              if (key === "controls") return scopedRisks.length > 0 && scopedRisks.every((item) => controls.some((control) => control.riskId === item.id));
              if (key === "residual") return scopedRisks.length > 0 && scopedRisks.every((item) => item.mitigation);
              return data.reports.length > 0 || data.references.length > 0;
            })();
            return <div key={key} className={`flex gap-3 rounded-xl border p-3 ${complete ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200"}`}><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${complete ? "bg-emerald-600 text-white" : "border border-slate-300 text-transparent"}`}><Check size={13} /></span><div><p className="text-xs font-semibold text-slate-800">{label}</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{detail}</p></div></div>;
          })}</div>
        </Section>
        <Section title="Risk distribution" description="Current exposure by severity and lifecycle state.">
          <div className="space-y-4 p-5">{SEVERITIES.map((severity) => { const count = scopedRisks.filter((item) => item.severity === severity.value).length; const width = scopedRisks.length ? (count / scopedRisks.length) * 100 : 0; return <div key={severity.value}><div className="flex justify-between text-xs"><span className="font-semibold text-slate-700">{severity.label}</span><span className="text-slate-500">{count}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${severity.value === "critical" ? "bg-rose-500" : severity.value === "high" ? "bg-orange-500" : severity.value === "medium" ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${width}%` }} /></div></div>; })}<div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">{RISK_STATES.slice(0, 4).map((state) => <div key={state.value} className="rounded-lg bg-slate-50 p-3"><p className="text-[11px] text-slate-500">{state.label}</p><p className="mt-1 text-xl font-semibold text-slate-900">{scopedRisks.filter((item) => item.state === state.value).length}</p></div>)}</div></div>
        </Section>
      </div>}

      {activeTab === "risks" && <Section title="Risk register" description="Track exposure, ownership, mitigation, and residual state." action={<div className="flex flex-wrap gap-2"><Button icon={Download} onClick={exportCsv}>Export CSV</Button><Button icon={Plus} variant="primary" onClick={() => setShowRiskForm(true)} disabled={risks.length >= MAX_RISKS}>Add risk</Button></div>}>
        <div className="grid gap-3 border-b border-slate-100 p-5 lg:grid-cols-[minmax(0,1fr)_160px_160px_auto]"><label className="relative block"><Search size={15} className="pointer-events-none absolute left-3 top-3 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search risks..." className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" /></label><select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-violet-500">{RISK_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-violet-500">{SEVERITY_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><Button icon={sortAscending ? ArrowUpAZ : ArrowDownAZ} onClick={() => setSortAscending((value) => !value)}>Severity</Button></div>
        {!filteredRisks.length ? <Empty title="No risks match these filters" description="Add a risk or clear the current search and filters." action={<Button icon={Plus} onClick={() => setShowRiskForm(true)}>Add risk</Button>} /> : <div className="divide-y divide-slate-100">{filteredRisks.slice(0, PAGE_SIZE).map((risk) => <div key={risk.id} className="p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-900">{risk.title}</h4><Badge tone={severityTone(risk.severity)}>{stateLabel(SEVERITIES, risk.severity)}</Badge><Badge>{stateLabel(RISK_STATES, risk.state)}</Badge></div><p className="mt-2 text-xs leading-5 text-slate-600">{risk.impact || "Impact not described."}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500"><span>{risk.category}</span><span>Likelihood: {risk.likelihood}</span><span>Owner: {risk.owner || "Unassigned"}</span><span>Due: {dateLabel(risk.dueDate)}</span></div></div><div className="flex shrink-0 gap-2"><select value={risk.state} onChange={(event) => changeItem("risks", risk.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]"><option value="">State</option>{RISK_STATES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => removeItem("risks", risk.id)}>Remove</Button></div></div>{risk.mitigation && <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-xs text-emerald-900"><span className="font-semibold">Mitigation:</span> {risk.mitigation}</div>}</div>)}</div>}
      </Section>}

      {activeTab === "controls" && <Section title="Control coverage" description="Map preventive and detective controls to the risks they reduce." action={<Button icon={Plus} variant="primary" onClick={() => setShowControlForm(true)} disabled={controls.length >= MAX_CONTROLS}>Add control</Button>}>
        <div className="border-b border-slate-100 p-5"><select value={controlFilter} onChange={(event) => setControlFilter(event.target.value)} className="h-10 w-full max-w-xs rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-violet-500">{CONTROL_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        {!filteredControls.length ? <Empty title="No controls mapped" description="Map a control to a risk to make mitigation reviewable." action={<Button icon={Plus} onClick={() => setShowControlForm(true)}>Add control</Button>} /> : <div className="divide-y divide-slate-100">{filteredControls.map((control) => <div key={control.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-900">{control.title}</h4><Badge tone={control.state === "verified" ? "emerald" : control.state === "failed" ? "rose" : "slate"}>{stateLabel(CONTROL_STATES, control.state)}</Badge></div><p className="mt-1 text-xs text-slate-500">{control.type} · {control.owner || "Unassigned"} · {scopedRisks.find((risk) => risk.id === control.riskId)?.title || "Unlinked risk"}</p></div><div className="flex gap-2"><select value={control.state} onChange={(event) => changeItem("controls", control.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{CONTROL_STATES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => removeItem("controls", control.id)}>Remove</Button></div></div>)}</div>}
      </Section>}

      {activeTab === "findings" && <Section title="Risk findings" description="Capture evidence-based gaps, owners, and remediation actions." action={<Button icon={Plus} variant="primary" onClick={() => setShowFindingForm(true)} disabled={findings.length >= MAX_FINDINGS}>Add finding</Button>}>
        {!scopedFindings.length ? <Empty title="No findings recorded" description="Add a finding when a control or risk review exposes a follow-up." action={<Button icon={Plus} onClick={() => setShowFindingForm(true)}>Add finding</Button>} /> : <div className="divide-y divide-slate-100">{scopedFindings.map((finding) => <div key={finding.id} className="p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-900">{finding.title}</h4><Badge tone={severityTone(finding.severity)}>{stateLabel(SEVERITIES, finding.severity)}</Badge></div><p className="mt-2 text-xs leading-5 text-slate-600">{finding.detail || "No finding detail provided."}</p><p className="mt-2 text-[11px] text-slate-500">Owner: {finding.owner || "Unassigned"} · Risk: {scopedRisks.find((risk) => risk.id === finding.riskId)?.title || "Unlinked"}</p>{finding.action && <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700"><span className="font-semibold">Action:</span> {finding.action}</div>}</div><div className="flex gap-2"><select value={finding.state} onChange={(event) => changeItem("findings", finding.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{FINDING_STATES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><Button variant="danger" icon={Trash2} onClick={() => removeItem("findings", finding.id)}>Remove</Button></div></div></div>)}</div>}
      </Section>}

      {activeTab === "evidence" && <div className="grid gap-5 xl:grid-cols-2"><Section title="Attached reports" description="Use existing tester reports as supporting evidence." action={<Badge>{data.reports.length}</Badge>}><div className="divide-y divide-slate-100">{reports.slice(0, 20).map((report) => { const attached = data.reports.some((item) => item.id === report.id); return <div key={report.id} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{report.title || report.summary || `Report ${report.id}`}</p><p className="mt-1 text-[11px] text-slate-500">Available report evidence</p></div><div className="flex shrink-0 gap-2">{onOpenReport && <Button icon={ExternalLink} onClick={() => onOpenReport(report)}>Open</Button>}<Button icon={attached ? Check : Plus} onClick={() => attachReport(report)} disabled={attached}>{attached ? "Attached" : "Attach"}</Button></div></div>; })}{!reports.length && <Empty title="No reports available" description="Submitted reports will appear here when available." />}</div></Section><Section title="References" description="Keep standards, designs, tickets, or release notes close to the conclusion." action={<Button icon={Plus} onClick={addReference}>Add reference</Button>}><div className="divide-y divide-slate-100">{data.references.map((reference) => <div key={reference.id} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{reference.title}</p><p className="mt-1 text-[11px] text-slate-400">{dateLabel(reference.createdAt)}</p></div><Button variant="danger" icon={Trash2} onClick={() => removeItem("references", reference.id)}>Remove</Button></div>)}{!data.references.length && <Empty title="No references yet" description="Add a link or note that supports the assessment." action={<Button icon={Plus} onClick={addReference}>Add reference</Button>} />}</div></Section></div>}

      {showAssessmentForm && <Modal title="Create risk assessment" onClose={() => setShowAssessmentForm(false)}><form onSubmit={addAssessment} className="space-y-4"><Field label="Assessment title" value={assessmentForm.title} onChange={(value) => setAssessmentForm({ ...assessmentForm, title: value })} placeholder="Checkout release risk review" required /><Field label="Scope" value={assessmentForm.scope} onChange={(value) => setAssessmentForm({ ...assessmentForm, scope: value })} placeholder="Feature, release, journey, or user group" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Owner" value={assessmentForm.owner} onChange={(value) => setAssessmentForm({ ...assessmentForm, owner: value })} placeholder={email || "Tester or team"} /><Field label="Target date" type="date" value={assessmentForm.target} onChange={(value) => setAssessmentForm({ ...assessmentForm, target: value })} /></div><Field label="State" options={ASSESSMENT_STATES} value={assessmentForm.state} onChange={(value) => setAssessmentForm({ ...assessmentForm, state: value })} /><TextArea label="Notes" value={assessmentForm.notes} onChange={(value) => setAssessmentForm({ ...assessmentForm, notes: value })} placeholder="Context, assumptions, and decision notes" /><div className="flex justify-end gap-2 pt-2"><Button onClick={() => setShowAssessmentForm(false)}>Cancel</Button><Button type="submit" variant="primary">Create assessment</Button></div></form></Modal>}
      {showRiskForm && <Modal title="Add risk" onClose={() => setShowRiskForm(false)}><form onSubmit={addRisk} className="space-y-4"><Field label="Risk title" value={riskForm.title} onChange={(value) => setRiskForm({ ...riskForm, title: value })} placeholder="Payment confirmation may be delayed" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Assessment" options={assessments.map((item) => ({ value: item.id, label: item.title }))} value={riskForm.assessmentId || selectedAssessmentId} onChange={(value) => setRiskForm({ ...riskForm, assessmentId: value })} /><Field label="Category" options={CATEGORIES.map((value) => ({ value, label: value }))} value={riskForm.category} onChange={(value) => setRiskForm({ ...riskForm, category: value })} /><Field label="Severity" options={SEVERITIES} value={riskForm.severity} onChange={(value) => setRiskForm({ ...riskForm, severity: value })} /><Field label="Likelihood" options={["rare", "unlikely", "possible", "likely", "almost-certain"].map((value) => ({ value, label: value }))} value={riskForm.likelihood} onChange={(value) => setRiskForm({ ...riskForm, likelihood: value })} /><Field label="Owner" value={riskForm.owner} onChange={(value) => setRiskForm({ ...riskForm, owner: value })} placeholder="Responsible person or team" /><Field label="Due date" type="date" value={riskForm.dueDate} onChange={(value) => setRiskForm({ ...riskForm, dueDate: value })} /></div><Field label="State" options={RISK_STATES} value={riskForm.state} onChange={(value) => setRiskForm({ ...riskForm, state: value })} /><TextArea label="Impact" value={riskForm.impact} onChange={(value) => setRiskForm({ ...riskForm, impact: value })} placeholder="Who or what is affected if this occurs?" required /><TextArea label="Mitigation" value={riskForm.mitigation} onChange={(value) => setRiskForm({ ...riskForm, mitigation: value })} placeholder="What reduces likelihood or impact?" /><div className="flex justify-end gap-2 pt-2"><Button onClick={() => setShowRiskForm(false)}>Cancel</Button><Button type="submit" variant="primary">Add risk</Button></div></form></Modal>}
      {showControlForm && <Modal title="Map a control" onClose={() => setShowControlForm(false)}><form onSubmit={addControl} className="space-y-4"><Field label="Control title" value={controlForm.title} onChange={(value) => setControlForm({ ...controlForm, title: value })} placeholder="Verify authorization before account export" required /><Field label="Risk" options={scopedRisks.map((item) => ({ value: item.id, label: item.title }))} value={controlForm.riskId} onChange={(value) => setControlForm({ ...controlForm, riskId: value })} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Type" options={["Preventive", "Detective", "Corrective"].map((value) => ({ value, label: value }))} value={controlForm.type} onChange={(value) => setControlForm({ ...controlForm, type: value })} /><Field label="State" options={CONTROL_STATES} value={controlForm.state} onChange={(value) => setControlForm({ ...controlForm, state: value })} /><Field label="Owner" value={controlForm.owner} onChange={(value) => setControlForm({ ...controlForm, owner: value })} placeholder="Responsible person or team" /></div><TextArea label="Evidence" value={controlForm.evidence} onChange={(value) => setControlForm({ ...controlForm, evidence: value })} placeholder="Test, log, screenshot, or link reference" /><TextArea label="Notes" value={controlForm.notes} onChange={(value) => setControlForm({ ...controlForm, notes: value })} placeholder="Verification notes" /><div className="flex justify-end gap-2 pt-2"><Button onClick={() => setShowControlForm(false)}>Cancel</Button><Button type="submit" variant="primary">Map control</Button></div></form></Modal>}
      {showFindingForm && <Modal title="Add finding" onClose={() => setShowFindingForm(false)}><form onSubmit={addFinding} className="space-y-4"><Field label="Finding title" value={findingForm.title} onChange={(value) => setFindingForm({ ...findingForm, title: value })} placeholder="Rate limit is not enforced on retry path" required /><Field label="Risk" options={scopedRisks.map((item) => ({ value: item.id, label: item.title }))} value={findingForm.riskId} onChange={(value) => setFindingForm({ ...findingForm, riskId: value })} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Severity" options={SEVERITIES} value={findingForm.severity} onChange={(value) => setFindingForm({ ...findingForm, severity: value })} /><Field label="State" options={FINDING_STATES} value={findingForm.state} onChange={(value) => setFindingForm({ ...findingForm, state: value })} /><Field label="Owner" value={findingForm.owner} onChange={(value) => setFindingForm({ ...findingForm, owner: value })} placeholder="Responsible person or team" /></div><TextArea label="Detail" value={findingForm.detail} onChange={(value) => setFindingForm({ ...findingForm, detail: value })} placeholder="What did the review observe?" required /><TextArea label="Action" value={findingForm.action} onChange={(value) => setFindingForm({ ...findingForm, action: value })} placeholder="What should happen next?" /><div className="flex justify-end gap-2 pt-2"><Button onClick={() => setShowFindingForm(false)}>Cancel</Button><Button type="submit" variant="primary">Add finding</Button></div></form></Modal>}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 p-5"><h2 className="text-base font-semibold text-slate-950">{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={17} /></button></div><div className="p-5">{children}</div></div></div>;
}

export default function TesterRiskAssessmentWorkspace({ reports, email, onOpenReport }) {
  return <RiskAssessmentWorkspace reports={reports} email={email} onOpenReport={onOpenReport} />;
}
