"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowDownAZ,
  ArrowUpAZ,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  FileCheck2,
  Flag,
  Gauge,
  GitBranch,
  Layers3,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";

const STORAGE_KEY = "tester-quality-governance-v1";
const GATE_STATES = ["not-started", "in-review", "ready", "blocked", "waived"];
const DECISION_STATES = ["proposed", "accepted", "rejected", "deferred"];
const RISK_LEVELS = ["critical", "high", "medium", "low"];
const DOMAINS = ["Functional", "Accessibility", "Performance", "Security", "Compatibility", "Data", "Release"];
const GOVERNANCE_PRESETS = [
  "Release entry criteria",
  "Critical-path regression",
  "Browser support decision",
  "Accessibility exception",
  "Performance budget review",
  "Privacy evidence review",
  "Incident follow-up",
  "Hotfix validation",
  "Stakeholder sign-off",
  "Post-release observation",
];
const CHECKLIST_LIBRARY = [
  { title: "Scope is explicit", domain: "Release", owner: "Tester lead", evidence: "Approved scope note" },
  { title: "Critical workflows are covered", domain: "Functional", owner: "QA owner", evidence: "Regression run" },
  { title: "Supported browsers are verified", domain: "Compatibility", owner: "Tester", evidence: "Browser matrix" },
  { title: "Keyboard flow is verified", domain: "Accessibility", owner: "Accessibility reviewer", evidence: "Keyboard notes" },
  { title: "Performance budget is reviewed", domain: "Performance", owner: "Performance owner", evidence: "Timing capture" },
  { title: "Security-sensitive paths are reviewed", domain: "Security", owner: "Security reviewer", evidence: "Security note" },
  { title: "Test data is resettable", domain: "Data", owner: "Data owner", evidence: "Reset procedure" },
  { title: "Known gaps have owners", domain: "Release", owner: "Release lead", evidence: "Risk register" },
  { title: "Evidence links are durable", domain: "Release", owner: "Tester", evidence: "Evidence index" },
  { title: "Decision has an expiry", domain: "Release", owner: "Decision owner", evidence: "Review date" },
];

function id(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function timestamp() {
  return new Date().toISOString();
}

function text(value, fallback = "", limit = 1600) {
  if (typeof value !== "string") return fallback;
  const result = value.trim();
  return result ? result.slice(0, limit) : fallback;
}

function emptyData() {
  return {
    programs: [],
    gates: [],
    risks: [],
    decisions: [],
    evidence: [],
    owners: [],
  };
}

function readData() {
  if (typeof window === "undefined") return emptyData();
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      ...emptyData(),
      ...saved,
    };
  } catch {
    return emptyData();
  }
}

function tone(value) {
  if (["ready", "accepted", "low", "closed"].includes(value)) return "emerald";
  if (["blocked", "critical", "high", "rejected"].includes(value)) return "rose";
  if (["in-review", "medium", "proposed"].includes(value)) return "amber";
  return "slate";
}

function Badge({ children, value }) {
  const colors = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    violet: "border-violet-200 bg-violet-50 text-violet-800",
  };
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${colors[tone(value)] || colors.slate}`}>
      {children}
    </span>
  );
}

function Button({ children, icon: Icon, onClick, variant = "secondary", type = "button" }) {
  const variants = {
    secondary: "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
    primary: "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700",
    danger: "border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
    quiet: "border-transparent bg-slate-50 text-slate-600 hover:bg-slate-100",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold ${variants[variant]}`}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

function Field({ label, value, onChange, placeholder, options, required = false }) {
  const common = {
    value: value || "",
    onChange: (event) => onChange(event.target.value),
    required,
    className: "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500",
  };
  return (
    <label className="block text-xs font-semibold text-slate-700">
      {label}
      {options ? (
        <select {...common}>
          <option value="">Select...</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input {...common} placeholder={placeholder} />
      )}
    </label>
  );
}

function Area({ label, value, onChange, placeholder }) {
  return (
    <label className="block text-xs font-semibold text-slate-700">
      {label}
      <textarea
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
      />
    </label>
  );
}

function Empty({ title, description, action }) {
  return (
    <div className="p-8 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function Section({ title, description, action, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="font-semibold text-slate-950">{title}</h2>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-900">
            <X size={17} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, detail }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
          <Icon size={17} />
        </span>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{detail}</p>
    </article>
  );
}

export default function TesterQualityGovernanceWorkspace({ reports = [], onOpenReport }) {
  const [data, setData] = useState(emptyData);
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [sortAscending, setSortAscending] = useState(false);
  const [modal, setModal] = useState("");
  const [notice, setNotice] = useState("");
  const [programForm, setProgramForm] = useState({
    title: "",
    release: "",
    owner: "",
    objective: "",
    horizon: "",
  });
  const [gateForm, setGateForm] = useState({
    title: "",
    domain: "Release",
    owner: "",
    state: "not-started",
    evidence: "",
    due: "",
  });
  const [riskForm, setRiskForm] = useState({
    title: "",
    domain: "Functional",
    level: "medium",
    owner: "",
    mitigation: "",
    trigger: "",
  });
  const [decisionForm, setDecisionForm] = useState({
    title: "",
    state: "proposed",
    owner: "",
    rationale: "",
    reviewDate: "",
  });
  const [evidenceForm, setEvidenceForm] = useState({
    title: "",
    kind: "Test result",
    reference: "",
    summary: "",
  });
  const [ownerForm, setOwnerForm] = useState({
    name: "",
    role: "",
    area: "",
    backup: "",
  });

  useEffect(() => {
    setData(readData());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const program = data.programs.find((item) => item.id === selectedId);
  const gates = data.gates.filter((item) => !selectedId || item.programId === selectedId);
  const risks = data.risks.filter((item) => !selectedId || item.programId === selectedId);
  const decisions = data.decisions.filter((item) => !selectedId || item.programId === selectedId);
  const evidence = data.evidence.filter((item) => !selectedId || item.programId === selectedId);
  const owners = data.owners.filter((item) => !selectedId || item.programId === selectedId);
  const openRisks = risks.filter((item) => !["low", "closed"].includes(item.level));
  const readyGates = gates.filter((item) => item.state === "ready").length;
  const blockedGates = gates.filter((item) => item.state === "blocked").length;
  const gateScore = gates.length ? Math.round((readyGates / gates.length) * 100) : 0;
  const filteredRisks = useMemo(() => {
    const needle = query.toLowerCase();
    return risks
      .filter((item) => `${item.title} ${item.domain} ${item.owner} ${item.mitigation}`.toLowerCase().includes(needle))
      .sort((a, b) => {
        const result = a.title.localeCompare(b.title);
        return sortAscending ? result : result * -1;
      });
  }, [query, risks, sortAscending]);

  function update(key, items) {
    setData((current) => ({ ...current, [key]: items }));
  }

  function createProgram(event) {
    event.preventDefault();
    if (!text(programForm.title)) return;
    const item = {
      ...programForm,
      id: id("governance"),
      title: text(programForm.title),
      release: text(programForm.release),
      owner: text(programForm.owner),
      objective: text(programForm.objective),
      horizon: text(programForm.horizon),
      createdAt: timestamp(),
    };
    update("programs", [item, ...data.programs]);
    setSelectedId(item.id);
    setProgramForm({ title: "", release: "", owner: "", objective: "", horizon: "" });
    setModal("");
    setNotice("Governance program created");
  }

  function createGate(event) {
    event.preventDefault();
    const item = {
      ...gateForm,
      id: id("gate"),
      programId: selectedId,
      title: text(gateForm.title),
      owner: text(gateForm.owner),
      evidence: text(gateForm.evidence),
      due: text(gateForm.due),
      createdAt: timestamp(),
    };
    update("gates", [item, ...data.gates]);
    setGateForm({ title: "", domain: "Release", owner: "", state: "not-started", evidence: "", due: "" });
    setModal("");
    setNotice("Release gate added");
  }

  function createRisk(event) {
    event.preventDefault();
    const item = {
      ...riskForm,
      id: id("risk"),
      programId: selectedId,
      title: text(riskForm.title),
      owner: text(riskForm.owner),
      mitigation: text(riskForm.mitigation),
      trigger: text(riskForm.trigger),
      createdAt: timestamp(),
    };
    update("risks", [item, ...data.risks]);
    setRiskForm({ title: "", domain: "Functional", level: "medium", owner: "", mitigation: "", trigger: "" });
    setModal("");
    setNotice("Governance risk added");
  }

  function createDecision(event) {
    event.preventDefault();
    const item = {
      ...decisionForm,
      id: id("decision"),
      programId: selectedId,
      title: text(decisionForm.title),
      owner: text(decisionForm.owner),
      rationale: text(decisionForm.rationale),
      reviewDate: text(decisionForm.reviewDate),
      createdAt: timestamp(),
    };
    update("decisions", [item, ...data.decisions]);
    setDecisionForm({ title: "", state: "proposed", owner: "", rationale: "", reviewDate: "" });
    setModal("");
    setNotice("Decision recorded");
  }

  function createEvidence(event) {
    event.preventDefault();
    const item = {
      ...evidenceForm,
      id: id("evidence"),
      programId: selectedId,
      title: text(evidenceForm.title),
      reference: text(evidenceForm.reference),
      summary: text(evidenceForm.summary),
      createdAt: timestamp(),
    };
    update("evidence", [item, ...data.evidence]);
    setEvidenceForm({ title: "", kind: "Test result", reference: "", summary: "" });
    setModal("");
    setNotice("Evidence item added");
  }

  function createOwner(event) {
    event.preventDefault();
    const item = {
      ...ownerForm,
      id: id("owner"),
      programId: selectedId,
      name: text(ownerForm.name),
      role: text(ownerForm.role),
      area: text(ownerForm.area),
      backup: text(ownerForm.backup),
      createdAt: timestamp(),
    };
    update("owners", [item, ...data.owners]);
    setOwnerForm({ name: "", role: "", area: "", backup: "" });
    setModal("");
    setNotice("Ownership record added");
  }

  function change(key, itemId, field, value) {
    update(
      key,
      data[key].map((item) => (item.id === itemId ? { ...item, [field]: value, updatedAt: timestamp() } : item)),
    );
  }

  function remove(key, itemId) {
    update(key, data[key].filter((item) => item.id !== itemId));
    setNotice("Record removed");
  }

  function applyPreset() {
    if (!selectedId) {
      setNotice("Select a program before applying a preset");
      return;
    }
    const additions = CHECKLIST_LIBRARY.map((item, index) => ({
      ...item,
      id: id(`gate-${index}`),
      programId: selectedId,
      state: "not-started",
      due: "",
      createdAt: timestamp(),
    }));
    update("gates", [...additions, ...data.gates]);
    setNotice("Governance checklist applied");
  }

  function copySummary() {
    const summary = [
      `Governance program: ${program?.title || "All programs"}`,
      `Gate readiness: ${gateScore}%`,
      `Ready gates: ${readyGates}/${gates.length}`,
      `Blocked gates: ${blockedGates}`,
      `Open risks: ${openRisks.length}`,
      `Decisions: ${decisions.length}`,
      `Evidence items: ${evidence.length}`,
      program?.objective || "No objective recorded.",
    ].join("\n");
    navigator.clipboard?.writeText(summary);
    setNotice("Governance summary copied");
  }

  function exportRows() {
    const rows = [
      ["Type", "Title", "Domain", "State", "Owner", "Detail"],
      ...gates.map((item) => ["Gate", item.title, item.domain, item.state, item.owner, item.evidence]),
      ...risks.map((item) => ["Risk", item.title, item.domain, item.level, item.owner, item.mitigation]),
      ...decisions.map((item) => ["Decision", item.title, "", item.state, item.owner, item.rationale]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "tester-quality-governance.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Governance export downloaded");
  }

  const tabs = [
    ["overview", "Overview"],
    ["gates", `Gates (${gates.length})`],
    ["risks", `Risks (${risks.length})`],
    ["decisions", `Decisions (${decisions.length})`],
    ["evidence", `Evidence (${evidence.length})`],
    ["owners", `Owners (${owners.length})`],
    ["handoff", "Handoff"],
  ];

  return (
    <section className="mt-8 space-y-5">
      <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
              <ShieldCheck size={16} />
              Tester quality governance
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Turn scattered test signals into a release decision that can be explained.
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Maintain gates, risks, evidence, ownership, and decisions in one advisory workspace without changing backend release data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button icon={Plus} variant="primary" onClick={() => setModal("program")}>
              New program
            </Button>
            <Button icon={Copy} onClick={copySummary}>
              Copy summary
            </Button>
            <Button icon={Download} onClick={exportRows}>
              Export
            </Button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Gauge} label="Gate readiness" value={`${gateScore}%`} detail={`${readyGates} ready of ${gates.length}`} />
          <Stat icon={AlertTriangle} label="Open risks" value={openRisks.length} detail={`${risks.length} total risk records`} />
          <Stat icon={ClipboardCheck} label="Decisions" value={decisions.length} detail="Recorded governance calls" />
          <Stat icon={FileCheck2} label="Evidence" value={evidence.length} detail={`${owners.length} ownership records`} />
        </div>
      </div>

      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">{notice}</div>}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {tabs.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-t-lg px-3 py-2 text-xs font-semibold ${tab === value ? "border-b-2 border-indigo-600 text-indigo-700" : "text-slate-500"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <Section
        title="Governance program context"
        description="Select the release, feature, or incident you are evaluating."
        action={
          <Button
            icon={RefreshCw}
            onClick={() => {
              setData(readData());
              setNotice("Governance workspace refreshed");
            }}
          >
            Refresh
          </Button>
        }
      >
        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="text-xs font-semibold text-slate-700">
            Selected program
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">All governance programs</option>
              {data.programs.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <Button icon={BookOpenCheck} onClick={applyPreset}>
              Apply checklist
            </Button>
            <Button icon={Plus} onClick={() => setModal("program")}>
              Add program
            </Button>
          </div>
        </div>
        <div className="grid gap-3 border-t border-slate-100 p-5 md:grid-cols-2 xl:grid-cols-3">
          {data.programs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={`rounded-xl border p-4 text-left ${selectedId === item.id ? "border-indigo-300 bg-indigo-50" : "border-slate-200"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <Badge value={item.horizon || "active"}>{item.horizon || "active"}</Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-slate-500">{item.objective || "No objective recorded."}</p>
              <p className="mt-3 text-[11px] text-slate-400">{item.release || "No release"} · {item.owner || "Unassigned"}</p>
            </button>
          ))}
          {!data.programs.length && (
            <div className="md:col-span-2 xl:col-span-3">
              <Empty
                title="No governance program"
                description="Create a program for a release, feature, or incident review."
                action={<Button icon={Plus} variant="primary" onClick={() => setModal("program")}>Create program</Button>}
              />
            </div>
          )}
        </div>
      </Section>

      {tab === "overview" && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Section title="Readiness narrative" description="Keep the decision context close to the measurable signals.">
            <div className="space-y-4 p-5">
              <Area
                label="Objective"
                value={program?.objective || ""}
                onChange={(value) => program && change("programs", program.id, "objective", value)}
                placeholder="What quality decision should this workspace support?"
              />
              <Area
                label="Decision framing"
                value={program?.framing || ""}
                onChange={(value) => program && change("programs", program.id, "framing", value)}
                placeholder="What is known, what remains uncertain, and what is acceptable?"
              />
            </div>
          </Section>
          <Section title="Decision signal" description="Use a simple signal to make follow-up visible.">
            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-indigo-900">Gate readiness</p>
                  <span className="text-lg font-semibold text-indigo-900">{gateScore}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-indigo-600" style={{ width: `${gateScore}%` }} />
                </div>
                <p className="mt-3 text-xs text-indigo-800">
                  {blockedGates ? `${blockedGates} blocked gate${blockedGates === 1 ? "" : "s"} need attention.` : "No blocked gates recorded."}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Critical risks</p><p className="mt-1 text-xl font-semibold">{risks.filter((item) => item.level === "critical").length}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Pending calls</p><p className="mt-1 text-xl font-semibold">{decisions.filter((item) => item.state === "proposed").length}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Owners</p><p className="mt-1 text-xl font-semibold">{owners.length}</p></div>
              </div>
            </div>
          </Section>
          <Section title="Governance operating model" description="A compact reference for the team.">
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              {[
                ["Observe", "Collect evidence before interpreting a result.", Layers3],
                ["Assess", "Record risk, scope, and confidence explicitly.", Gauge],
                ["Decide", "Name the decision owner and expiry.", ClipboardCheck],
                ["Handoff", "Make follow-up work visible to the next team.", GitBranch],
              ].map(([title, detail, Icon]) => (
                <div key={title} className="rounded-xl border border-slate-200 p-4">
                  <Icon size={17} className="text-indigo-600" />
                  <p className="mt-3 text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
                </div>
              ))}
            </div>
          </Section>
          <Section title="Recent tester reports" description="Attach reports as evidence when they support this decision.">
            <div className="divide-y border-t border-slate-100">
              {reports.slice(0, 6).map((report) => (
                <div key={report.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{report.title || report.summary || `Report ${report.id}`}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{report.severity || "Unclassified"} · {report.status || "Open"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button icon={Archive} onClick={() => { onOpenReport?.(report); setNotice("Report opened"); }}>Open</Button>
                    <Button icon={Plus} onClick={() => { setModal("evidence"); setEvidenceForm((current) => ({ ...current, title: report.title || `Report ${report.id}`, reference: String(report.id) })); }}>Attach</Button>
                  </div>
                </div>
              ))}
              {!reports.length && <Empty title="No tester reports available" description="Reports will appear here when the dashboard has loaded them." />}
            </div>
          </Section>
        </div>
      )}

      {tab === "gates" && (
        <Section
          title="Release gates"
          description="Track entry criteria and evidence-backed readiness."
          action={<Button icon={Plus} variant="primary" onClick={() => setModal("gate")}>Add gate</Button>}
        >
          <div className="flex flex-wrap gap-3 border-b border-slate-100 p-5">
            {GOVERNANCE_PRESETS.map((preset) => <button key={preset} type="button" onClick={() => setGateForm((current) => ({ ...current, title: preset }))} className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] text-slate-600 hover:border-indigo-300 hover:text-indigo-700">{preset}</button>)}
          </div>
          {!gates.length ? (
            <Empty title="No release gates" description="Add gates manually or apply the standard checklist." action={<Button icon={BookOpenCheck} onClick={applyPreset}>Apply checklist</Button>} />
          ) : (
            <div className="divide-y">
              {gates.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold">{item.title}</h4><Badge value={item.state}>{item.state}</Badge><Badge value={item.domain}>{item.domain}</Badge></div>
                    <p className="mt-2 text-xs text-slate-600">{item.evidence || "No evidence requirement recorded."}</p>
                    <p className="mt-2 text-[11px] text-slate-500">Owner: {item.owner || "Unassigned"} · Due: {item.due || "Not set"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select value={item.state} onChange={(event) => change("gates", item.id, "state", event.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[11px]">{GATE_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select>
                    <Button variant="danger" icon={Trash2} onClick={() => remove("gates", item.id)}>Remove</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {tab === "risks" && (
        <Section
          title="Quality risks and exceptions"
          description="Capture impact, triggers, owners, and mitigation instead of leaving gaps implicit."
          action={<Button icon={Plus} variant="primary" onClick={() => setModal("risk")}>Add risk</Button>}
        >
          <div className="flex gap-3 border-b border-slate-100 p-5">
            <div className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search risks, domains, owners..." className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-indigo-500" /></div>
            <Button icon={sortAscending ? ArrowUpAZ : ArrowDownAZ} onClick={() => setSortAscending((current) => !current)}>Sort</Button>
          </div>
          {!filteredRisks.length ? <Empty title="No risks recorded" description="Add a risk when evidence reveals uncertainty, a gap, or an accepted exception." action={<Button icon={Plus} onClick={() => setModal("risk")}>Add risk</Button>} /> : <div className="divide-y">{filteredRisks.map((item) => <div key={item.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:justify-between"><div><div className="flex flex-wrap gap-2"><h4 className="text-sm font-semibold">{item.title}</h4><Badge value={item.level}>{item.level}</Badge><Badge value={item.domain}>{item.domain}</Badge></div><p className="mt-2 text-xs text-slate-600">{item.mitigation || "No mitigation recorded."}</p><p className="mt-2 text-[11px] text-slate-500">Trigger: {item.trigger || "Not recorded"} · Owner: {item.owner || "Unassigned"}</p></div><Button variant="danger" icon={Trash2} onClick={() => remove("risks", item.id)}>Remove</Button></div>)}</div>}
        </Section>
      )}

      {tab === "decisions" && (
        <Section title="Decision journal" description="Record the call, rationale, owner, and review point." action={<Button icon={Plus} variant="primary" onClick={() => setModal("decision")}>Add decision</Button>}>
          {!decisions.length ? <Empty title="No decisions recorded" description="Capture a release recommendation, exception, or follow-up decision." action={<Button icon={Plus} onClick={() => setModal("decision")}>Add decision</Button>} /> : <div className="divide-y">{decisions.map((item) => <div key={item.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:justify-between"><div><div className="flex flex-wrap gap-2"><h4 className="text-sm font-semibold">{item.title}</h4><Badge value={item.state}>{item.state}</Badge></div><p className="mt-2 text-xs text-slate-600">{item.rationale || "No rationale recorded."}</p><p className="mt-2 text-[11px] text-slate-500">Owner: {item.owner || "Unassigned"} · Review: {item.reviewDate || "Not set"}</p></div><Button variant="danger" icon={Trash2} onClick={() => remove("decisions", item.id)}>Remove</Button></div>)}</div>}
        </Section>
      )}

      {tab === "evidence" && (
        <Section title="Evidence index" description="Keep proof and context discoverable for review and handoff." action={<Button icon={Plus} variant="primary" onClick={() => setModal("evidence")}>Add evidence</Button>}>
          {!evidence.length ? <Empty title="No evidence indexed" description="Add test results, screenshots, logs, links, or decision notes." action={<Button icon={Plus} onClick={() => setModal("evidence")}>Add evidence</Button>} /> : <div className="divide-y">{evidence.map((item) => <div key={item.id} className="flex justify-between gap-3 p-5"><div><div className="flex flex-wrap gap-2"><h4 className="text-sm font-semibold">{item.title}</h4><Badge value={item.kind}>{item.kind}</Badge></div><p className="mt-2 text-xs text-slate-600">{item.summary || "No summary recorded."}</p><p className="mt-2 text-[11px] text-indigo-700">{item.reference || "No reference recorded"}</p></div><Button variant="danger" icon={Trash2} onClick={() => remove("evidence", item.id)}>Remove</Button></div>)}</div>}
        </Section>
      )}

      {tab === "owners" && (
        <Section title="Ownership map" description="Make every gate, risk, and decision actionable." action={<Button icon={Plus} variant="primary" onClick={() => setModal("owner")}>Add owner</Button>}>
          {!owners.length ? <Empty title="No owners mapped" description="Add primary and backup ownership for the review." action={<Button icon={Plus} onClick={() => setModal("owner")}>Add owner</Button>} /> : <div className="grid gap-3 p-5 md:grid-cols-2">{owners.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between gap-3"><div><p className="text-sm font-semibold">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.role} · {item.area}</p></div><Users size={17} className="text-indigo-600" /></div><p className="mt-3 text-[11px] text-slate-500">Backup: {item.backup || "Not assigned"}</p><div className="mt-3"><Button variant="danger" icon={Trash2} onClick={() => remove("owners", item.id)}>Remove</Button></div></div>)}</div>}
        </Section>
      )}

      {tab === "handoff" && (
        <Section
          title="Governance handoff"
          description="Package the current quality position for the next reviewer or release owner."
          action={<Button icon={Copy} onClick={copySummary}>Copy handoff</Button>}
        >
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 size={16} className="text-emerald-600" />What is ready</div>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                {gates.filter((item) => item.state === "ready").slice(0, 5).map((item) => <li key={item.id} className="flex gap-2"><Check size={14} className="mt-0.5 text-emerald-600" />{item.title}</li>)}
                {!readyGates && <li className="text-slate-400">No ready gates recorded yet.</li>}
              </ul>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle size={16} className="text-rose-600" />What needs attention</div>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                {openRisks.slice(0, 5).map((item) => <li key={item.id} className="flex gap-2"><Flag size={14} className="mt-0.5 text-rose-600" />{item.title}</li>)}
                {!openRisks.length && <li className="text-slate-400">No open risks recorded yet.</li>}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
              <p className="text-sm font-semibold">Handoff note</p>
              <textarea value={program?.handoff || ""} onChange={(event) => program && change("programs", program.id, "handoff", event.target.value)} rows={5} placeholder="Summarize the recommendation, known gaps, owners, and next review point." className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500"><Badge value={gateScore >= 80 ? "ready" : "in-review"}>{gateScore >= 80 ? "Ready for review" : "Still in review"}</Badge><span>{evidence.length} evidence items attached</span><span>{owners.length} owners mapped</span><span>{decisions.length} decisions logged</span></div>
            </div>
          </div>
        </Section>
      )}

      {modal === "program" && <Modal title="Create governance program" onClose={() => setModal("")}><form onSubmit={createProgram} className="space-y-4"><Field label="Program title" value={programForm.title} onChange={(value) => setProgramForm({ ...programForm, title: value })} placeholder="Release 2.4 quality governance" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Release / build" value={programForm.release} onChange={(value) => setProgramForm({ ...programForm, release: value })} placeholder="2.4.0" /><Field label="Owner" value={programForm.owner} onChange={(value) => setProgramForm({ ...programForm, owner: value })} placeholder="Quality lead" /></div><Field label="Horizon" options={["active", "pre-release", "post-release", "incident"]} value={programForm.horizon} onChange={(value) => setProgramForm({ ...programForm, horizon: value })} /><Area label="Objective" value={programForm.objective} onChange={(value) => setProgramForm({ ...programForm, objective: value })} placeholder="What decision should this program support?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Create program</Button></div></form></Modal>}
      {modal === "gate" && <Modal title="Add release gate" onClose={() => setModal("")}><form onSubmit={createGate} className="space-y-4"><Field label="Gate title" value={gateForm.title} onChange={(value) => setGateForm({ ...gateForm, title: value })} placeholder="Critical path regression is green" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Domain" options={DOMAINS} value={gateForm.domain} onChange={(value) => setGateForm({ ...gateForm, domain: value })} /><Field label="State" options={GATE_STATES} value={gateForm.state} onChange={(value) => setGateForm({ ...gateForm, state: value })} /><Field label="Owner" value={gateForm.owner} onChange={(value) => setGateForm({ ...gateForm, owner: value })} /><Field label="Due" value={gateForm.due} onChange={(value) => setGateForm({ ...gateForm, due: value })} placeholder="Before sign-off" /></div><Area label="Evidence requirement" value={gateForm.evidence} onChange={(value) => setGateForm({ ...gateForm, evidence: value })} placeholder="What evidence makes this gate ready?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add gate</Button></div></form></Modal>}
      {modal === "risk" && <Modal title="Add quality risk" onClose={() => setModal("")}><form onSubmit={createRisk} className="space-y-4"><Field label="Risk title" value={riskForm.title} onChange={(value) => setRiskForm({ ...riskForm, title: value })} placeholder="Safari payment flow is not verified" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Domain" options={DOMAINS} value={riskForm.domain} onChange={(value) => setRiskForm({ ...riskForm, domain: value })} /><Field label="Level" options={RISK_LEVELS} value={riskForm.level} onChange={(value) => setRiskForm({ ...riskForm, level: value })} /><Field label="Owner" value={riskForm.owner} onChange={(value) => setRiskForm({ ...riskForm, owner: value })} /><Field label="Trigger" value={riskForm.trigger} onChange={(value) => setRiskForm({ ...riskForm, trigger: value })} placeholder="What would make this risk active?" /></div><Area label="Mitigation" value={riskForm.mitigation} onChange={(value) => setRiskForm({ ...riskForm, mitigation: value })} placeholder="What is the next concrete action?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add risk</Button></div></form></Modal>}
      {modal === "decision" && <Modal title="Record decision" onClose={() => setModal("")}><form onSubmit={createDecision} className="space-y-4"><Field label="Decision title" value={decisionForm.title} onChange={(value) => setDecisionForm({ ...decisionForm, title: value })} placeholder="Proceed with known browser exception" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="State" options={DECISION_STATES} value={decisionForm.state} onChange={(value) => setDecisionForm({ ...decisionForm, state: value })} /><Field label="Owner" value={decisionForm.owner} onChange={(value) => setDecisionForm({ ...decisionForm, owner: value })} /><Field label="Review date" value={decisionForm.reviewDate} onChange={(value) => setDecisionForm({ ...decisionForm, reviewDate: value })} placeholder="After release" /></div><Area label="Rationale" value={decisionForm.rationale} onChange={(value) => setDecisionForm({ ...decisionForm, rationale: value })} placeholder="Summarize evidence, trade-offs, and follow-up." /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Record decision</Button></div></form></Modal>}
      {modal === "evidence" && <Modal title="Add evidence item" onClose={() => setModal("")}><form onSubmit={createEvidence} className="space-y-4"><Field label="Evidence title" value={evidenceForm.title} onChange={(value) => setEvidenceForm({ ...evidenceForm, title: value })} placeholder="Regression result for checkout" required /><Field label="Kind" options={["Test result", "Screenshot", "Recording", "Log", "Link", "Decision note"]} value={evidenceForm.kind} onChange={(value) => setEvidenceForm({ ...evidenceForm, kind: value })} /><Field label="Reference" value={evidenceForm.reference} onChange={(value) => setEvidenceForm({ ...evidenceForm, reference: value })} placeholder="URL, report id, or file name" /><Area label="Summary" value={evidenceForm.summary} onChange={(value) => setEvidenceForm({ ...evidenceForm, summary: value })} placeholder="What does this evidence prove?" /><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add evidence</Button></div></form></Modal>}
      {modal === "owner" && <Modal title="Map ownership" onClose={() => setModal("")}><form onSubmit={createOwner} className="space-y-4"><Field label="Name" value={ownerForm.name} onChange={(value) => setOwnerForm({ ...ownerForm, name: value })} placeholder="Primary owner" required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Role" value={ownerForm.role} onChange={(value) => setOwnerForm({ ...ownerForm, role: value })} placeholder="QA lead" /><Field label="Area" value={ownerForm.area} onChange={(value) => setOwnerForm({ ...ownerForm, area: value })} placeholder="Compatibility" /><Field label="Backup" value={ownerForm.backup} onChange={(value) => setOwnerForm({ ...ownerForm, backup: value })} placeholder="Backup owner" /></div><div className="flex justify-end gap-2"><Button onClick={() => setModal("")}>Cancel</Button><Button type="submit" variant="primary">Add owner</Button></div></form></Modal>}
    </section>
  );
}
