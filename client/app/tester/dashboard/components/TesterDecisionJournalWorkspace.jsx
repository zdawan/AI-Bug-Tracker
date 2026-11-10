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
  HelpCircle,
  Lightbulb,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  ShieldQuestion,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";

const STORAGE_KEY = "tester-decision-journal-v1";
const MAX_JOURNALS = 30;
const MAX_DECISIONS = 100;
const MAX_QUESTIONS = 100;
const MAX_REPORTS = 100;
const PAGE_SIZE = 8;

const JOURNAL_STATES = [
  { value: "draft", label: "Draft", tone: "slate" },
  { value: "collecting", label: "Collecting input", tone: "cyan" },
  { value: "review", label: "Under review", tone: "violet" },
  { value: "decided", label: "Decided", tone: "emerald" },
  { value: "revisit", label: "Revisit needed", tone: "rose" },
  { value: "closed", label: "Closed", tone: "amber" },
];

const STATE_FILTERS = [{ value: "all", label: "All journals" }, ...JOURNAL_STATES];
const DECISION_STATES = [
  { value: "proposed", label: "Proposed" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "deferred", label: "Deferred" },
  { value: "revisit", label: "Revisit" },
];
const QUESTION_STATES = [
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "answered", label: "Answered" },
  { value: "parked", label: "Parked" },
];
const PRIORITIES = [
  { value: "critical", label: "Critical", tone: "rose" },
  { value: "high", label: "High", tone: "orange" },
  { value: "medium", label: "Medium", tone: "amber" },
  { value: "low", label: "Low", tone: "emerald" },
];
const PRIORITY_FILTERS = [{ value: "all", label: "All priorities" }, ...PRIORITIES];
const CHECKS = [
  { id: "context", label: "Context is captured", detail: "The situation and trigger are clear to a later reader." },
  { id: "options", label: "Options were considered", detail: "Reasonable alternatives and tradeoffs are visible." },
  { id: "evidence", label: "Evidence is linked", detail: "Reports or observations support the discussion." },
  { id: "owner", label: "Decision owner is named", detail: "Someone is accountable for the final call." },
  { id: "impact", label: "Impact is understood", detail: "User, release, and operational impact are recorded." },
  { id: "followup", label: "Follow-up is explicit", detail: "The next review point or action is not ambiguous." },
];

function clean(value, fallback = "", limit = 1200) {
  if (typeof value !== "string") return fallback;
  const result = value.trim();
  return result ? result.slice(0, limit) : fallback;
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function reportId(report) {
  return String(report?._id ?? report?.id ?? report?.bugId ?? "");
}

function reportTitle(report) {
  return clean(report?.title ?? report?.summary ?? report?.name, "Untitled report", 180);
}

function reportSeverity(report) {
  const value = String(report?.severity ?? report?.priority ?? "medium").toLowerCase();
  return PRIORITIES.some((item) => item.value === value) ? value : "medium";
}

function reportStatus(report) {
  const value = String(report?.status ?? report?.state ?? "open").toLowerCase();
  return ["closed", "resolved", "fixed", "done"].includes(value) ? "resolved" : "open";
}

function reportCategory(report) {
  return clean(report?.category ?? report?.type ?? report?.area, "Uncategorized", 80);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value);
}

function escapeCsv(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCsv(filename, rows) {
  const blob = new Blob([rows.map((row) => row.map(escapeCsv).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function readStorage(email) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY}:${email || "anonymous"}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStorage(email, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${STORAGE_KEY}:${email || "anonymous"}`, JSON.stringify(value));
  } catch {
    // The journal remains usable when browser storage is unavailable.
  }
}

function createJournal() {
  return {
    id: makeId("journal"),
    name: "Untitled decision journal",
    release: "",
    owner: "",
    audience: "",
    state: "draft",
    decisionDate: "",
    context: "",
    recommendation: "",
    impact: "",
    checks: Object.fromEntries(CHECKS.map((check) => [check.id, false])),
    decisions: [],
    questions: [],
    reportIds: [],
    references: [],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function normalizeJournal(value) {
  const source = value && typeof value === "object" ? value : createJournal();
  return {
    ...createJournal(),
    ...source,
    checks: { ...createJournal().checks, ...(source.checks || {}) },
    decisions: Array.isArray(source.decisions)
      ? source.decisions.slice(0, MAX_DECISIONS).map((item) => ({
          id: makeId("decision"),
          title: "",
          state: "proposed",
          owner: "",
          priority: "medium",
          rationale: "",
          consequence: "",
          ...item,
        }))
      : [],
    questions: Array.isArray(source.questions)
      ? source.questions.slice(0, MAX_QUESTIONS).map((item) => ({
          id: makeId("question"),
          title: "",
          state: "open",
          owner: "",
          dueDate: "",
          answer: "",
          ...item,
        }))
      : [],
    reportIds: Array.isArray(source.reportIds) ? source.reportIds.slice(0, MAX_REPORTS) : [],
    references: Array.isArray(source.references)
      ? source.references.slice(0, 40).map((item) => ({ id: makeId("reference"), label: "", url: "", ...item }))
      : [],
  };
}

function journalMeta(value) {
  return JOURNAL_STATES.find((state) => state.value === value) || JOURNAL_STATES[0];
}

function priorityMeta(value) {
  return PRIORITIES.find((priority) => priority.value === value) || PRIORITIES[2];
}

function toneClasses(tone, compact = false) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-800",
    violet: "border-violet-100 bg-violet-50 text-violet-800",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-800",
    rose: "border-rose-100 bg-rose-50 text-rose-800",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    orange: "border-orange-100 bg-orange-50 text-orange-800",
  };
  return `${tones[tone] || tones.slate} ${compact ? "px-2 py-0.5" : "px-2.5 py-1"}`;
}

function Panel({ title, detail, icon: Icon, action, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon ? <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-cyan-600" /> : null}
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-slate-800">{title}</h3>
            {detail ? <p className="mt-1 text-[9px] leading-4 text-slate-400">{detail}</p> : null}
          </div>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Button({ children, onClick, icon: Icon, variant = "secondary", disabled = false, title }) {
  const variants = {
    primary: "border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700",
    secondary: "border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:text-cyan-700",
    ghost: "border-transparent bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700",
    danger: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  };
  return <button type="button" title={title} disabled={disabled} onClick={onClick} className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[9px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]}`}>{Icon ? <Icon size={12} aria-hidden="true" /> : null}{children}</button>;
}

function Field({ label, value, onChange, placeholder, type = "text", className = "" }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label>;
}

function TextArea({ label, value, onChange, placeholder, rows = 3, className = "" }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span><textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] leading-4 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label>;
}

function SelectField({ label, value, onChange, options, className = "" }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</span><span className="relative block"><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 pr-7 text-[10px] text-slate-700 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={12} aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" /></span></label>;
}

function StateBadge({ value }) {
  const state = journalMeta(value);
  return <span className={`inline-flex rounded-full border text-[8px] font-semibold ${toneClasses(state.tone, true)}`}>{state.label}</span>;
}

function PriorityBadge({ value }) {
  const priority = priorityMeta(value);
  return <span className={`inline-flex rounded-full border text-[8px] font-semibold ${toneClasses(priority.tone, true)}`}>{priority.label}</span>;
}

function StatCard({ label, value, detail, icon: Icon, tone = "cyan" }) {
  const tones = { cyan: "bg-cyan-50 text-cyan-700", violet: "bg-violet-50 text-violet-700", emerald: "bg-emerald-50 text-emerald-700", rose: "bg-rose-50 text-rose-700" };
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm shadow-slate-200/20"><div className="flex items-center justify-between gap-2"><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><span className={`rounded-lg p-1.5 ${tones[tone] || tones.cyan}`}><Icon size={13} aria-hidden="true" /></span></div><p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-[9px] text-slate-400">{detail}</p></div>;
}

function CheckRow({ check, checked, onChange }) {
  return <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 transition hover:border-cyan-200"><input type="checkbox" checked={checked} onChange={onChange} className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-cyan-600 focus:ring-cyan-500" /><span><span className="block text-[10px] font-semibold text-slate-700">{check.label}</span><span className="mt-0.5 block text-[9px] leading-4 text-slate-400">{check.detail}</span></span></label>;
}

function EmptyState({ title, detail, icon: Icon = Clipboard }) {
  return <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center"><Icon size={21} aria-hidden="true" className="mx-auto text-slate-300" /><p className="mt-2 text-[10px] font-semibold text-slate-600">{title}</p><p className="mx-auto mt-1 max-w-sm text-[9px] leading-4 text-slate-400">{detail}</p></div>;
}

function JournalCard({ journal, selected, metrics, onSelect }) {
  return <button type="button" onClick={onSelect} className={`w-full rounded-xl border p-3 text-left transition ${selected ? "border-cyan-300 bg-cyan-50/50 shadow-sm" : "border-slate-200/80 bg-white hover:border-cyan-200"}`}><div className="flex items-start justify-between gap-2"><span className="min-w-0 truncate text-[10px] font-semibold text-slate-800">{journal.name || "Untitled decision journal"}</span><StateBadge value={journal.state} /></div><p className="mt-1 truncate text-[9px] text-slate-400">{journal.release || "No release target yet"}</p><div className="mt-3 flex items-center justify-between text-[8px] text-slate-400"><span>{formatNumber(metrics.decisions)} decisions</span><span>{formatNumber(metrics.openQuestions)} questions</span><span>{metrics.readiness}% ready</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${metrics.readiness}%` }} /></div></button>;
}

function DecisionRow({ decision, onChange, onRemove }) {
  return <div className="rounded-xl border border-slate-200/80 bg-white p-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1.2fr)_130px_120px_140px_auto]"><Field label="Decision or option" value={decision.title} onChange={(value) => onChange({ title: value })} placeholder="What choice is being considered?" /><SelectField label="State" value={decision.state} onChange={(value) => onChange({ state: value })} options={DECISION_STATES} /><SelectField label="Priority" value={decision.priority} onChange={(value) => onChange({ priority: value })} options={PRIORITIES} /><Field label="Owner" value={decision.owner} onChange={(value) => onChange({ owner: value })} placeholder="Name or team" /><div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove decision" onClick={onRemove}>Remove</Button></div></div><div className="mt-3 grid gap-2 md:grid-cols-2"><TextArea label="Rationale" value={decision.rationale} onChange={(value) => onChange({ rationale: value })} placeholder="Why is this option being considered?" rows={2} /><TextArea label="Consequence" value={decision.consequence} onChange={(value) => onChange({ consequence: value })} placeholder="What changes if this option is selected?" rows={2} /></div></div>;
}

function QuestionRow({ question, onChange, onRemove }) {
  return <div className="rounded-xl border border-slate-200/80 bg-white p-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1.25fr)_140px_140px_130px_auto]"><Field label="Question" value={question.title} onChange={(value) => onChange({ title: value })} placeholder="What still needs to be answered?" /><SelectField label="State" value={question.state} onChange={(value) => onChange({ state: value })} options={QUESTION_STATES} /><Field label="Owner" value={question.owner} onChange={(value) => onChange({ owner: value })} placeholder="Name or team" /><Field label="Due date" type="date" value={question.dueDate} onChange={(value) => onChange({ dueDate: value })} /><div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove question" onClick={onRemove}>Remove</Button></div></div><div className="mt-3"><TextArea label="Answer or investigation note" value={question.answer} onChange={(value) => onChange({ answer: value })} placeholder="Capture the response or next research step." rows={2} /></div></div>;
}

function ReferenceRow({ reference, onChange, onRemove }) {
  return <div className="grid gap-2 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto]"><Field label="Label" value={reference.label} onChange={(value) => onChange({ label: value })} placeholder="Design note" /><Field label="URL or reference" value={reference.url} onChange={(value) => onChange({ url: value })} placeholder="https://..." /><div className="flex items-end justify-end"><Button variant="ghost" icon={Trash2} title="Remove reference" onClick={onRemove}>Remove</Button></div></div>;
}

function ReportRow({ report, checked, onToggle, onOpenReport }) {
  return <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3"><input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 rounded border-slate-300 accent-cyan-600 focus:ring-cyan-500" aria-label={`Attach ${reportTitle(report)}`} /><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-slate-700">{reportTitle(report)}</p><p className="mt-1 truncate text-[9px] text-slate-400">{reportCategory(report)} · {reportStatus(report) === "resolved" ? "Resolved" : "Open"}</p></div><PriorityBadge value={reportSeverity(report)} />{onOpenReport ? <button type="button" onClick={() => onOpenReport(report)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-cyan-700" title="Open report"><ExternalLink size={13} aria-hidden="true" /></button> : null}</div>;
}

function Guidance({ journal, metrics, evidenceCount }) {
  const suggestions = [];
  if (!journal.context) suggestions.push("Describe the trigger and context before recording a decision.");
  if (!journal.owner) suggestions.push("Assign a decision owner.");
  if (metrics.openQuestions) suggestions.push(`Resolve or park ${metrics.openQuestions} open question(s).`);
  if (!evidenceCount) suggestions.push("Link a report or reference to support the journal.");
  if (!journal.recommendation) suggestions.push("Write the current recommendation in plain language.");
  if (!suggestions.length) suggestions.push("The decision journal is ready for a focused review.");
  return <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-3.5"><div className="flex items-start gap-2"><Sparkles size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-cyan-600" /><div><p className="text-[10px] font-semibold text-cyan-900">Suggested next moves</p><p className="mt-1 text-[9px] leading-4 text-cyan-800/70">Private prompts based on this journal.</p></div></div><ul className="mt-3 space-y-1.5">{suggestions.map((suggestion) => <li key={suggestion} className="flex items-start gap-2 text-[9px] leading-4 text-cyan-800/80"><span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-cyan-500" />{suggestion}</li>)}</ul><p className="mt-3 border-t border-cyan-100 pt-3 text-[8px] leading-4 text-cyan-800/60">This workspace does not approve releases, send messages, or modify report status.</p></div>;
}

function JournalHeader({ journal, onChange, onDelete, onDuplicate }) {
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/20"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><Lightbulb size={17} aria-hidden="true" className="text-cyan-600" /><h2 className="truncate text-sm font-semibold text-slate-900">{journal.name || "Untitled decision journal"}</h2><StateBadge value={journal.state} /></div><p className="mt-1 pl-6 text-[9px] text-slate-400">Private decision context workspace</p></div><div className="flex flex-wrap gap-1.5"><Button icon={Copy} onClick={onDuplicate}>Duplicate</Button><Button variant="danger" icon={Trash2} onClick={onDelete}>Delete</Button></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Journal name" value={journal.name} onChange={(value) => onChange({ name: value })} placeholder="Checkout launch decision" /><Field label="Release / build" value={journal.release} onChange={(value) => onChange({ release: value })} placeholder="v2.4.0 / build 1842" /><Field label="Decision owner" value={journal.owner} onChange={(value) => onChange({ owner: value })} placeholder="Tester or team" /><SelectField label="Journal state" value={journal.state} onChange={(value) => onChange({ state: value })} options={JOURNAL_STATES} /></div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Field label="Audience" value={journal.audience} onChange={(value) => onChange({ audience: value })} placeholder="Product and release team" /><Field label="Decision date" type="date" value={journal.decisionDate} onChange={(value) => onChange({ decisionDate: value })} /><Field label="Review context" value={journal.release} onChange={(value) => onChange({ release: value })} placeholder="Scope or test window" /></div></div>;
}

export default function TesterDecisionJournalWorkspace({ reports = [], email = "", onOpenReport }) {
  const [journals, setJournals] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [journalFilter, setJournalFilter] = useState("all");
  const [journalSearch, setJournalSearch] = useState("");
  const [sortAscending, setSortAscending] = useState(false);
  const [showAllJournals, setShowAllJournals] = useState(false);
  const [decisionSearch, setDecisionSearch] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [questionFilter, setQuestionFilter] = useState("all");
  const [reportSearch, setReportSearch] = useState("");
  const [reportFilter, setReportFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const stored = readStorage(email);
    if (stored && Array.isArray(stored.journals) && stored.journals.length) {
      const restored = stored.journals.slice(0, MAX_JOURNALS).map(normalizeJournal);
      setJournals(restored);
      setSelectedId(stored.selectedId || restored[0].id);
      return;
    }
    const initial = createJournal();
    initial.name = "Release decision journal";
    initial.decisionDate = today();
    setJournals([initial]);
    setSelectedId(initial.id);
  }, [email]);

  useEffect(() => {
    if (!journals.length) return;
    writeStorage(email, { journals, selectedId });
  }, [email, journals, selectedId]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const selectedJournal = useMemo(() => journals.find((journal) => journal.id === selectedId) || journals[0] || null, [journals, selectedId]);

  const metricsByJournal = useMemo(() => {
    const result = new Map();
    journals.forEach((journal) => {
      const decisions = journal.decisions.length;
      const accepted = journal.decisions.filter((decision) => decision.state === "accepted").length;
      const openQuestions = journal.questions.filter((question) => !["answered", "parked"].includes(question.state)).length;
      const checksDone = Object.values(journal.checks).filter(Boolean).length;
      const checkProgress = Math.round((checksDone / CHECKS.length) * 100);
      const decisionProgress = decisions ? Math.round((accepted / decisions) * 100) : 0;
      const questionProgress = journal.questions.length ? Math.round(((journal.questions.length - openQuestions) / journal.questions.length) * 100) : 100;
      const readiness = Math.max(0, Math.round((checkProgress * 0.5) + (decisionProgress * 0.25) + (questionProgress * 0.25)));
      result.set(journal.id, { decisions, accepted, openQuestions, checkProgress, decisionProgress, questionProgress, readiness });
    });
    return result;
  }, [journals]);

  const filteredJournals = useMemo(() => {
    const query = journalSearch.trim().toLowerCase();
    const result = journals.filter((journal) => {
      const stateMatch = journalFilter === "all" || journal.state === journalFilter;
      const haystack = `${journal.name} ${journal.release} ${journal.owner} ${journal.audience}`.toLowerCase();
      return stateMatch && (!query || haystack.includes(query));
    });
    result.sort((left, right) => {
      const comparison = (left.name || "").localeCompare(right.name || "");
      return sortAscending ? comparison : -comparison;
    });
    return result;
  }, [journalFilter, journalSearch, journals, sortAscending]);

  const visibleJournals = showAllJournals ? filteredJournals : filteredJournals.slice(0, PAGE_SIZE);

  const filteredDecisions = useMemo(() => {
    if (!selectedJournal) return [];
    const query = decisionSearch.trim().toLowerCase();
    return selectedJournal.decisions.filter((decision) => {
      const stateMatch = decisionFilter === "all" || decision.state === decisionFilter;
      const priorityMatch = priorityFilter === "all" || decision.priority === priorityFilter;
      const searchMatch = !query || `${decision.title} ${decision.owner} ${decision.rationale} ${decision.consequence}`.toLowerCase().includes(query);
      return stateMatch && priorityMatch && searchMatch;
    });
  }, [decisionFilter, decisionSearch, priorityFilter, selectedJournal]);

  const filteredQuestions = useMemo(() => {
    if (!selectedJournal) return [];
    return selectedJournal.questions.filter((question) => questionFilter === "all" || question.state === questionFilter);
  }, [questionFilter, selectedJournal]);

  const filteredReports = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();
    return reports.filter((report) => {
      const searchMatch = !query || `${reportTitle(report)} ${reportCategory(report)}`.toLowerCase().includes(query);
      const priorityMatch = reportFilter === "all" || reportSeverity(report) === reportFilter;
      const statusMatch = reportStatusFilter === "all" || reportStatus(report) === reportStatusFilter;
      return searchMatch && priorityMatch && statusMatch;
    });
  }, [reportFilter, reportSearch, reportStatusFilter, reports]);

  const selectedReports = useMemo(() => reports.filter((report) => selectedJournal?.reportIds.includes(reportId(report))), [reports, selectedJournal]);
  const metrics = selectedJournal ? metricsByJournal.get(selectedJournal.id) : null;

  const updateJournal = (patch) => {
    if (!selectedJournal) return;
    setJournals((current) => current.map((journal) => journal.id === selectedJournal.id ? { ...journal, ...patch, updatedAt: new Date().toISOString() } : journal));
  };

  const updateDecision = (id, patch) => updateJournal({ decisions: selectedJournal.decisions.map((decision) => decision.id === id ? { ...decision, ...patch } : decision) });
  const updateQuestion = (id, patch) => updateJournal({ questions: selectedJournal.questions.map((question) => question.id === id ? { ...question, ...patch } : question) });
  const updateReference = (id, patch) => updateJournal({ references: selectedJournal.references.map((reference) => reference.id === id ? { ...reference, ...patch } : reference) });

  const createNewJournal = () => {
    if (journals.length >= MAX_JOURNALS) {
      setNotice(`Maximum of ${MAX_JOURNALS} decision journals reached.`);
      return;
    }
    const journal = createJournal();
    journal.name = `Decision journal ${journals.length + 1}`;
    setJournals((current) => [journal, ...current]);
    setSelectedId(journal.id);
    setNotice("New decision journal created.");
  };

  const duplicateJournal = () => {
    if (!selectedJournal || journals.length >= MAX_JOURNALS) return;
    const copy = normalizeJournal({ ...selectedJournal, id: makeId("journal"), name: `${selectedJournal.name || "Decision journal"} copy`, state: "draft", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setJournals((current) => [copy, ...current]);
    setSelectedId(copy.id);
    setNotice("Decision journal duplicated.");
  };

  const deleteJournal = () => {
    if (!selectedJournal) return;
    if (journals.length === 1) {
      setNotice("Keep at least one decision journal available.");
      return;
    }
    const remaining = journals.filter((journal) => journal.id !== selectedJournal.id);
    setJournals(remaining);
    setSelectedId(remaining[0]?.id || "");
    setNotice("Decision journal removed.");
  };

  const addDecision = () => {
    if (!selectedJournal || selectedJournal.decisions.length >= MAX_DECISIONS) return;
    updateJournal({ decisions: [...selectedJournal.decisions, { id: makeId("decision"), title: "", state: "proposed", owner: "", priority: "medium", rationale: "", consequence: "" }] });
  };

  const removeDecision = (id) => updateJournal({ decisions: selectedJournal.decisions.filter((decision) => decision.id !== id) });

  const addQuestion = () => {
    if (!selectedJournal || selectedJournal.questions.length >= MAX_QUESTIONS) return;
    updateJournal({ questions: [...selectedJournal.questions, { id: makeId("question"), title: "", state: "open", owner: "", dueDate: "", answer: "" }] });
  };

  const removeQuestion = (id) => updateJournal({ questions: selectedJournal.questions.filter((question) => question.id !== id) });

  const addReference = () => {
    if (!selectedJournal || selectedJournal.references.length >= 40) return;
    updateJournal({ references: [...selectedJournal.references, { id: makeId("reference"), label: "", url: "" }] });
  };

  const removeReference = (id) => updateJournal({ references: selectedJournal.references.filter((reference) => reference.id !== id) });

  const toggleReport = (id) => {
    const ids = selectedJournal.reportIds.includes(id) ? selectedJournal.reportIds.filter((value) => value !== id) : [...selectedJournal.reportIds, id].slice(0, MAX_REPORTS);
    updateJournal({ reportIds: ids });
  };

  const toggleVisibleReports = () => {
    const visibleIds = filteredReports.map(reportId).filter(Boolean);
    const allSelected = visibleIds.every((id) => selectedJournal.reportIds.includes(id));
    const nextIds = allSelected ? selectedJournal.reportIds.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selectedJournal.reportIds, ...visibleIds])).slice(0, MAX_REPORTS);
    updateJournal({ reportIds: nextIds });
  };

  const summaryText = useMemo(() => {
    if (!selectedJournal) return "";
    const openQuestions = selectedJournal.questions.filter((question) => !["answered", "parked"].includes(question.state));
    const accepted = selectedJournal.decisions.filter((decision) => decision.state === "accepted");
    return [
      `${selectedJournal.name || "Untitled decision journal"} — ${journalMeta(selectedJournal.state).label}`,
      `Release: ${selectedJournal.release || "Not specified"}`,
      `Owner: ${selectedJournal.owner || "Not assigned"} · Audience: ${selectedJournal.audience || "Not assigned"}`,
      `Readiness: ${metrics?.readiness || 0}%`,
      `Decisions accepted: ${accepted.length}/${selectedJournal.decisions.length}`,
      `Open questions: ${openQuestions.length}`,
      `Reports attached: ${selectedReports.length}`,
      "",
      selectedJournal.recommendation || "No recommendation has been written yet.",
      "",
      "Open questions:",
      ...(openQuestions.length ? openQuestions.map((question) => `- ${question.title || "Untitled question"}`) : ["- None"]),
      "",
      "Impact:",
      selectedJournal.impact || "Not recorded",
    ].join("\n");
  }, [metrics, selectedJournal, selectedReports]);

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setNotice("Decision summary copied.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setNotice("Clipboard access is unavailable.");
    }
  };

  const exportJournal = () => {
    if (!selectedJournal) return;
    const rows = [
      ["Decision journal", "Value"],
      ["Name", selectedJournal.name],
      ["Release", selectedJournal.release],
      ["State", journalMeta(selectedJournal.state).label],
      ["Owner", selectedJournal.owner],
      ["Audience", selectedJournal.audience],
      ["Decision date", selectedJournal.decisionDate],
      ["Readiness", `${metrics?.readiness || 0}%`],
      [],
      ["Decision", "State", "Priority", "Owner", "Rationale", "Consequence"],
      ...selectedJournal.decisions.map((decision) => [decision.title, decision.state, decision.priority, decision.owner, decision.rationale, decision.consequence]),
      [],
      ["Question", "State", "Owner", "Due", "Answer"],
      ...selectedJournal.questions.map((question) => [question.title, question.state, question.owner, question.dueDate, question.answer]),
      [],
      ["Reference", "URL"],
      ...selectedJournal.references.map((reference) => [reference.label, reference.url]),
    ];
    downloadCsv("decision-journal.csv", rows);
    setNotice("Decision journal export downloaded.");
  };

  const resetJournal = () => {
    if (!selectedJournal) return;
    const reset = createJournal();
    reset.id = selectedJournal.id;
    reset.name = selectedJournal.name;
    reset.release = selectedJournal.release;
    reset.owner = selectedJournal.owner;
    reset.audience = selectedJournal.audience;
    reset.decisionDate = selectedJournal.decisionDate;
    updateJournal(reset);
    setNotice("Decision journal data reset.");
  };

  if (!selectedJournal) return null;

  const allVisibleReportsSelected = filteredReports.length > 0 && filteredReports.every((report) => selectedJournal.reportIds.includes(reportId(report)));
  const highDecisions = selectedJournal.decisions.filter((decision) => decision.state === "proposed" && ["critical", "high"].includes(decision.priority)).length;

  return (
    <section id="tester-decision-journal" className="space-y-4 rounded-3xl bg-slate-50/70 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Lightbulb size={18} aria-hidden="true" className="text-cyan-600" /><h2 className="text-base font-semibold tracking-tight text-slate-900">Decision journal</h2></div><p className="mt-1 max-w-2xl text-[10px] leading-5 text-slate-500">Capture decision context, competing options, open questions, and supporting evidence in one private tester workspace.</p></div><div className="flex flex-wrap gap-1.5"><Button icon={Plus} variant="primary" onClick={createNewJournal}>New journal</Button><Button icon={Download} onClick={exportJournal}>Export</Button><Button icon={copied ? Check : Copy} onClick={copySummary}>{copied ? "Copied" : "Copy summary"}</Button></div></div>
      {notice ? <div className="flex items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2.5 text-[9px] font-medium text-cyan-800"><CheckCircle2 size={13} aria-hidden="true" />{notice}</div> : null}
      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Panel title="Decision journals" detail={`${formatNumber(filteredJournals.length)} matching journal(s)`} icon={Lightbulb} action={<Button variant="ghost" icon={sortAscending ? ArrowUpAZ : ArrowDownAZ} onClick={() => setSortAscending((value) => !value)} title="Toggle journal sort" />}><div className="space-y-2.5"><div className="relative"><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={journalSearch} onChange={(event) => setJournalSearch(event.target.value)} placeholder="Search journals" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></div><SelectField label="State filter" value={journalFilter} onChange={setJournalFilter} options={STATE_FILTERS} />{visibleJournals.length ? <div className="space-y-2">{visibleJournals.map((journal) => <JournalCard key={journal.id} journal={journal} selected={journal.id === selectedJournal.id} onSelect={() => setSelectedId(journal.id)} metrics={metricsByJournal.get(journal.id) || { decisions: 0, openQuestions: 0, readiness: 0 }} />)}</div> : <EmptyState title="No matching journals" detail="Try clearing the search or state filter." icon={Search} />}{filteredJournals.length > PAGE_SIZE ? <Button variant="ghost" onClick={() => setShowAllJournals((value) => !value)}>{showAllJournals ? "Show fewer" : `Show all ${filteredJournals.length}`}</Button> : null}</div></Panel>
        <div className="min-w-0 space-y-4">
          <JournalHeader journal={selectedJournal} onChange={updateJournal} onDelete={deleteJournal} onDuplicate={duplicateJournal} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Readiness" value={`${metrics?.readiness || 0}%`} detail="Journal completeness" icon={ShieldQuestion} tone="cyan" /><StatCard label="Decisions" value={`${metrics?.accepted || 0}/${selectedJournal.decisions.length}`} detail="Accepted options" icon={CheckCircle2} tone="violet" /><StatCard label="Questions" value={formatNumber(metrics?.openQuestions || 0)} detail="Still open" icon={HelpCircle} tone="rose" /><StatCard label="Evidence" value={formatNumber(selectedReports.length)} detail="Reports attached" icon={FileCheck2} tone="emerald" /></div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]"><Panel title="Decision brief" detail="Explain the situation and current recommendation." icon={MessageSquareText}><div className="space-y-3"><TextArea label="Context and trigger" value={selectedJournal.context} onChange={(value) => updateJournal({ context: value })} placeholder="What happened, changed, or requires a decision?" rows={4} /><TextArea label="Recommendation" value={selectedJournal.recommendation} onChange={(value) => updateJournal({ recommendation: value })} placeholder="What should happen next, and why?" rows={4} /><TextArea label="Expected impact" value={selectedJournal.impact} onChange={(value) => updateJournal({ impact: value })} placeholder="Describe user, release, operational, or support impact." rows={3} /><Guidance journal={selectedJournal} metrics={metrics || { openQuestions: 0 }} evidenceCount={selectedReports.length + selectedJournal.references.length} /></div></Panel><Panel title="Journal quality" detail={`${metrics?.checkProgress || 0}% complete`} icon={ShieldQuestion}><div className="space-y-2">{CHECKS.map((check) => <CheckRow key={check.id} check={check} checked={Boolean(selectedJournal.checks[check.id])} onChange={(event) => updateJournal({ checks: { ...selectedJournal.checks, [check.id]: event.target.checked } })} />)}</div></Panel></div>
          <Panel title="Decision options" detail={`${formatNumber(selectedJournal.decisions.length)} option(s) · ${highDecisions} high priority proposed`} icon={Lightbulb} action={<Button icon={Plus} onClick={addDecision} disabled={selectedJournal.decisions.length >= MAX_DECISIONS}>Add option</Button>}><div className="space-y-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_150px]"><label className="relative block"><span className="sr-only">Search decisions</span><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={decisionSearch} onChange={(event) => setDecisionSearch(event.target.value)} placeholder="Search options, owners, or rationale" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label><SelectField label="State" value={decisionFilter} onChange={setDecisionFilter} options={[{ value: "all", label: "All decision states" }, ...DECISION_STATES]} /><SelectField label="Priority" value={priorityFilter} onChange={setPriorityFilter} options={PRIORITY_FILTERS} /></div>{filteredDecisions.length ? <div className="space-y-2.5">{filteredDecisions.map((decision) => <DecisionRow key={decision.id} decision={decision} onChange={(patch) => updateDecision(decision.id, patch)} onRemove={() => removeDecision(decision.id)} />)}</div> : <EmptyState title="No decision options match" detail="Adjust the filters or add another option to compare." icon={Lightbulb} />}</div></Panel>
          <Panel title="Open questions" detail={`${formatNumber(selectedJournal.questions.length)} question(s)`} icon={HelpCircle} action={<Button icon={Plus} onClick={addQuestion} disabled={selectedJournal.questions.length >= MAX_QUESTIONS}>Add question</Button>}><div className="space-y-3"><div className="flex flex-wrap gap-1.5">{[{ value: "all", label: "All questions" }, ...QUESTION_STATES].map((option) => <button key={option.value} type="button" onClick={() => setQuestionFilter(option.value)} className={`rounded-full border px-2.5 py-1 text-[8px] font-semibold transition ${questionFilter === option.value ? "border-cyan-300 bg-cyan-50 text-cyan-800" : "border-slate-200 bg-white text-slate-500 hover:border-cyan-200"}`}>{option.label}</button>)}</div>{filteredQuestions.length ? <div className="space-y-2.5">{filteredQuestions.map((question) => <QuestionRow key={question.id} question={question} onChange={(patch) => updateQuestion(question.id, patch)} onRemove={() => removeQuestion(question.id)} />)}</div> : <EmptyState title="No questions match" detail="Add unresolved questions so they are not lost between reviews." icon={HelpCircle} />}</div></Panel>
          <Panel title="Report evidence" detail={`${formatNumber(selectedJournal.reportIds.length)} attached · ${formatNumber(filteredReports.length)} shown`} icon={FileCheck2} action={<Button icon={allVisibleReportsSelected ? X : Check} onClick={toggleVisibleReports}>{allVisibleReportsSelected ? "Clear shown" : "Select shown"}</Button>}><div className="space-y-3"><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px_150px]"><label className="relative block"><span className="sr-only">Search reports</span><Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Search report title or category" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-[10px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100" /></label><SelectField label="Severity" value={reportFilter} onChange={setReportFilter} options={PRIORITY_FILTERS} /><SelectField label="Status" value={reportStatusFilter} onChange={setReportStatusFilter} options={[{ value: "all", label: "All statuses" }, { value: "open", label: "Open reports" }, { value: "resolved", label: "Resolved reports" }]} /></div>{filteredReports.length ? <div className="space-y-2">{filteredReports.slice(0, 20).map((report) => <ReportRow key={reportId(report)} report={report} checked={selectedJournal.reportIds.includes(reportId(report))} onToggle={() => toggleReport(reportId(report))} onOpenReport={onOpenReport} />)}</div> : <EmptyState title="No reports match" detail="Adjust the filters or wait for reports to be available." icon={FileCheck2} />}<div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3"><p className="flex items-center gap-1.5 text-[9px] font-semibold text-violet-800"><Users size={12} aria-hidden="true" /> Browser-local evidence</p><p className="mt-1 text-[9px] leading-4 text-violet-700/75">Selecting reports here stores only their IDs in this tester&apos;s browser and does not change report status.</p></div></div></Panel>
          <Panel title="Reference links" detail={`${formatNumber(selectedJournal.references.length)} supporting reference(s)`} icon={ExternalLink} action={<Button icon={Plus} onClick={addReference} disabled={selectedJournal.references.length >= 40}>Add link</Button>}><div className="space-y-3">{selectedJournal.references.length ? selectedJournal.references.map((reference) => <ReferenceRow key={reference.id} reference={reference} onChange={(patch) => updateReference(reference.id, patch)} onRemove={() => removeReference(reference.id)} />) : <EmptyState title="No reference links" detail="Keep a design note, incident, build, or runbook reference beside the decision." icon={ExternalLink} />}</div></Panel>
          <Panel title="Workspace actions" detail="Browser-local controls for this decision journal." icon={ShieldQuestion}><div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-[9px] leading-4 text-slate-400">Reset clears options, questions, checks, references, and report links while preserving journal identity fields.</p><Button variant="danger" icon={RefreshCw} onClick={resetJournal}>Reset journal data</Button></div></Panel>
        </div>
      </div>
    </section>
  );
}
