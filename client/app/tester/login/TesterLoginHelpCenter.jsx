"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Clipboard,
  Clock3,
  Copy,
  ExternalLink,
  Filter,
  Inbox,
  Info,
  Keyboard,
  LifeBuoy,
  Mail,
  MessageCircleQuestion,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

const HELP_CATEGORIES = [
  { id: "all", label: "All help", icon: BookOpen },
  { id: "email", label: "Email", icon: Mail },
  { id: "delivery", label: "Delivery", icon: Inbox },
  { id: "privacy", label: "Privacy", icon: ShieldCheck },
  { id: "keyboard", label: "Keyboard", icon: Keyboard },
];

const HELP_ARTICLES = [
  {
    id: "email-format",
    category: "email",
    title: "What email address should I use?",
    summary: "Use the approved address assigned to your tester access.",
    answer:
      "Enter the address that is authorized for the tester workspace and that you can open right now. The form trims surrounding spaces before the request is sent, but it does not change which account receives the message.",
    tags: ["address", "account", "access"],
    icon: Mail,
  },
  {
    id: "email-normalized",
    category: "email",
    title: "Why does the page normalize my email?",
    summary: "Whitespace is removed so accidental spaces do not cause a failed request.",
    answer:
      "The login flow removes leading and trailing whitespace and uses a consistent lowercase preview. This helps avoid mistakes caused by copying an address with an invisible space while preserving the intended mailbox.",
    tags: ["normalize", "spaces", "input"],
    icon: Sparkles,
  },
  {
    id: "delivery-time",
    category: "delivery",
    title: "How long should delivery take?",
    summary: "Give the message a short moment before requesting another code.",
    answer:
      "Delivery time depends on the inbox provider and its filtering rules. Keep this tab open, check the inbox again, and use the newest message if more than one request is made.",
    tags: ["wait", "message", "time"],
    icon: Clock3,
  },
  {
    id: "delivery-folders",
    category: "delivery",
    title: "Where should I look if the message is missing?",
    summary: "Check spam, promotions, updates, and custom filtered folders.",
    answer:
      "Search for the tester verification email and review folders that commonly receive automated messages. If your organization uses inbox rules, confirm that the message was not moved or quarantined.",
    tags: ["spam", "folders", "search"],
    icon: Search,
  },
  {
    id: "newest-code",
    category: "delivery",
    title: "Which code should I enter?",
    summary: "Always use the code from the newest verification email.",
    answer:
      "If you request more than one code, earlier messages may no longer be valid. Open the most recent email and enter its complete six-digit code on the verification screen.",
    tags: ["code", "newest", "otp"],
    icon: Inbox,
  },
  {
    id: "code-privacy",
    category: "privacy",
    title: "Should I share the verification code?",
    summary: "No. The code belongs only in the verification form.",
    answer:
      "Never send the code to another person, paste it into a support chat, or enter it on an unrelated page. The tester workspace will only ask for it in the verification form shown after this email step.",
    tags: ["privacy", "security", "code"],
    icon: ShieldCheck,
  },
  {
    id: "shared-device",
    category: "privacy",
    title: "What if I am using a shared device?",
    summary: "Use a private browser profile and sign out after testing.",
    answer:
      "Avoid saving credentials or leaving an authenticated tab open for another person. When the authorized test is complete, sign out and close the tab if the device is shared.",
    tags: ["device", "session", "sign out"],
    icon: ShieldCheck,
  },
  {
    id: "keyboard-flow",
    category: "keyboard",
    title: "Can I complete sign-in without a mouse?",
    summary: "Yes. Use Tab, Shift+Tab, Enter, and Escape.",
    answer:
      "Tab moves forward through controls, Shift+Tab moves backward, Enter submits the email form, and Escape clears the current email value. The form announces validation and request status as it changes.",
    tags: ["tab", "keyboard", "accessibility"],
    icon: Keyboard,
  },
  {
    id: "keyboard-errors",
    category: "keyboard",
    title: "How are errors communicated?",
    summary: "Invalid input and request failures are announced in the form.",
    answer:
      "The email field exposes invalid state and the page surfaces request errors using live status messaging. Focus the field again to correct the address, or use the reset action when a fresh start is clearer.",
    tags: ["error", "screen reader", "focus"],
    icon: AlertCircle,
  },
  {
    id: "redirect",
    category: "privacy",
    title: "Where will I go after verification?",
    summary: "You return to the requested tester destination.",
    answer:
      "The login route preserves only safe internal tester destinations. External addresses, login loops, and unrelated routes are rejected and replaced with the default tester workspace.",
    tags: ["redirect", "route", "workspace"],
    icon: ExternalLink,
  },
  {
    id: "browser-storage",
    category: "privacy",
    title: "What does the browser remember?",
    summary: "The authenticated tester session is stored for this browser profile.",
    answer:
      "The browser may retain the tester session so protected routes can be restored. It does not need access to your inbox content, browsing history, or unrelated websites to complete this form.",
    tags: ["storage", "session", "browser"],
    icon: Info,
  },
  {
    id: "retry",
    category: "delivery",
    title: "Can I retry after a failed request?",
    summary: "Correct the address or reset the email step before trying again.",
    answer:
      "Review the inline error first. If the address is correct but the request failed, wait for the connection to recover and try again. Resetting the email step clears only local form state.",
    tags: ["retry", "error", "request"],
    icon: LifeBuoy,
  },
];

const QUICK_CHECKS = [
  "The email address belongs to an approved tester account.",
  "The inbox is open or easy to access in another tab.",
  "You will use only the newest verification message.",
  "The target website is within your authorized test scope.",
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function normalizeSearch(value) {
  return value.trim().toLowerCase();
}

function articleMatches(article, query) {
  if (!query) return true;
  const searchable = [article.title, article.summary, article.answer, ...article.tags].join(" ").toLowerCase();
  return searchable.includes(query);
}

function getCategoryIcon(categoryId) {
  return HELP_CATEGORIES.find((category) => category.id === categoryId)?.icon || BookOpen;
}

function StatusPill({ label, tone = "slate" }) {
  const toneClasses = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-600",
    purple: "bg-purple-50 text-purple-700",
  };

  return <span className={cx("rounded-full px-2.5 py-1 text-[10px] font-bold", toneClasses[tone] || toneClasses.slate)}>{label}</span>;
}

function ArticleCard({ article, expanded, onToggle }) {
  const Icon = article.icon;
  const CategoryIcon = getCategoryIcon(article.category);

  return (
    <article className={cx("rounded-2xl border bg-white transition", expanded ? "border-purple-200 shadow-sm" : "border-slate-200")}>
      <button
        type="button"
        onClick={() => onToggle(article.id)}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-start gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-100"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
          <Icon size={17} aria-hidden="true" />
        </div>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-3">
            <span className="text-sm font-semibold text-slate-900">{article.title}</span>
            <ChevronDown size={17} className={cx("shrink-0 text-slate-400 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-600">{article.summary}</span>
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"><CategoryIcon size={11} aria-hidden="true" />{article.category}</span>
            {article.tags.slice(0, 2).map((tag) => <span key={tag} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{tag}</span>)}
          </span>
        </span>
      </button>
      {expanded ? (
        <div className="border-t border-slate-100 px-4 pb-4 pl-16">
          <p className="pt-3 text-xs leading-6 text-slate-600">{article.answer}</p>
          <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-emerald-700"><Check size={14} aria-hidden="true" />Helpful guidance for this sign-in step</div>
        </div>
      ) : null}
    </article>
  );
}

function CategoryButton({ category, selected, count, onSelect }) {
  const Icon = category.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(category.id)}
      aria-pressed={selected}
      className={cx("inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200", selected ? "border-purple-200 bg-purple-50 text-purple-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}
    >
      <Icon size={14} aria-hidden="true" />
      {category.label}
      <span className={cx("rounded-full px-1.5 py-0.5 text-[10px]", selected ? "bg-white text-purple-700" : "bg-slate-100 text-slate-500")}>{count}</span>
    </button>
  );
}

function QuickCheckList({ checks, completed, onToggle }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700"><Clipboard size={17} aria-hidden="true" /></div>
        <div><h3 className="text-sm font-semibold text-emerald-950">Quick start checklist</h3><p className="mt-1 text-xs leading-5 text-emerald-900/75">Mark the reminders that apply before requesting a code.</p></div>
      </div>
      <ul className="mt-4 space-y-2">
        {checks.map((check, index) => {
          const checked = completed.includes(index);
          return <li key={check}><button type="button" onClick={() => onToggle(index)} aria-pressed={checked} className={cx("flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300", checked ? "border-emerald-200 bg-white" : "border-emerald-100/70 bg-white/60 hover:bg-white")}><span className={cx("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border", checked ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-300 text-transparent")}><Check size={13} aria-hidden="true" /></span><span className={cx("text-[11px] leading-5", checked ? "text-emerald-900" : "text-emerald-900/75")}>{check}</span></button></li>;
        })}
      </ul>
      <p className="mt-3 text-[11px] font-semibold text-emerald-800" role="status" aria-live="polite">{completed.length}/{checks.length} reminders reviewed</p>
    </div>
  );
}

function SearchField({ value, onChange, onClear }) {
  return (
    <div className="relative">
      <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search sign-in help" aria-label="Search tester sign-in help" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100" />
      {value ? <button type="button" onClick={onClear} aria-label="Clear help search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200"><X size={15} aria-hidden="true" /></button> : null}
    </div>
  );
}

function EmptyState({ query, onClear }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"><MessageCircleQuestion size={24} className="mx-auto text-slate-400" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-slate-800">No help articles found</p><p className="mt-1 text-xs leading-5 text-slate-500">Try a different search term{query ? ` instead of “${query}”` : ""}.</p>{query ? <button type="button" onClick={onClear} className="mt-3 cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200">Clear search</button> : null}</div>;
}

export default function TesterLoginHelpCenter({ defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [expandedArticle, setExpandedArticle] = useState("");
  const [completedChecks, setCompletedChecks] = useState([]);
  const normalizedQuery = normalizeSearch(query);

  const filteredArticles = useMemo(() => HELP_ARTICLES.filter((article) => (category === "all" || article.category === category) && articleMatches(article, normalizedQuery)), [category, normalizedQuery]);
  const categoryCounts = useMemo(() => Object.fromEntries(HELP_CATEGORIES.map((item) => [item.id, item.id === "all" ? HELP_ARTICLES.length : HELP_ARTICLES.filter((article) => article.category === item.id).length])), []);

  const toggleCheck = (index) => setCompletedChecks((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
  const toggleArticle = (id) => setExpandedArticle((current) => current === id ? "" : id);
  const clearSearch = () => setQuery("");

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm" aria-labelledby="tester-login-help-center-title">
      <div className="p-4 sm:p-5">
        <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} className="flex w-full cursor-pointer items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-100">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-purple-100 bg-purple-50 text-purple-700"><LifeBuoy size={19} aria-hidden="true" /></div>
          <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3"><span><span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Need a hand?</span><span id="tester-login-help-center-title" className="block text-base font-semibold text-slate-950">Tester sign-in help center</span></span><ChevronDown size={19} className={cx("shrink-0 text-slate-400 transition-transform", open && "rotate-180")} aria-hidden="true" /></span><span className="mt-1 block text-sm leading-6 text-slate-600">Search practical answers without leaving the login page.</span></span>
        </button>

        {open ? (
          <div className="mt-5 space-y-5">
            <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><Info size={18} className="mt-0.5 shrink-0 text-blue-700" aria-hidden="true" /><p className="text-xs leading-5 text-blue-900/80"><span className="font-semibold text-blue-950">Private, local guidance. </span>This panel does not inspect your inbox or contact support automatically. It only helps explain the current sign-in flow.</p></div>
            <SearchField value={query} onChange={setQuery} onClear={clearSearch} />
            <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Help categories"><Filter size={15} className="shrink-0 text-slate-400" aria-hidden="true" />{HELP_CATEGORIES.map((item) => <CategoryButton key={item.id} category={item} selected={category === item.id} count={categoryCounts[item.id]} onSelect={setCategory} />)}</div>
            <p className="text-xs text-slate-500" role="status" aria-live="polite">Showing {filteredArticles.length} {filteredArticles.length === 1 ? "article" : "articles"}{category !== "all" ? ` in ${HELP_CATEGORIES.find((item) => item.id === category)?.label}` : ""}{normalizedQuery ? ` matching “${query.trim()}”` : ""}.</p>
            <div className="grid gap-2">{filteredArticles.length ? filteredArticles.map((article) => <ArticleCard key={article.id} article={article} expanded={expandedArticle === article.id} onToggle={toggleArticle} />) : <EmptyState query={query.trim()} onClear={clearSearch} />}</div>
            <QuickCheckList checks={QUICK_CHECKS} completed={completedChecks} onToggle={toggleCheck} />
            <div className="grid gap-3 sm:grid-cols-2"><div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><Keyboard size={17} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" /><p className="text-xs leading-5 text-slate-600"><span className="font-semibold text-slate-800">Keyboard tip: </span>Tab through controls, Enter to activate, and Escape to clear an email field.</p></div><div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" /><p className="text-xs leading-5 text-slate-600"><span className="font-semibold text-slate-800">Security tip: </span>Never share a one-time verification code.</p></div></div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1.5"><Sparkles size={13} aria-hidden="true" />Help updates with your search</span><span className="inline-flex items-center gap-1.5"><ArrowRight size={13} aria-hidden="true" />Return to the form whenever ready</span></div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function getTesterHelpArticles() {
  return HELP_ARTICLES.map((article) => ({ ...article, tags: [...article.tags] }));
}

export function getTesterHelpCategories() {
  return HELP_CATEGORIES.map((category) => ({ ...category }));
}

export function searchTesterHelpArticles(query = "", category = "all") {
  const normalizedQuery = normalizeSearch(query);
  return HELP_ARTICLES.filter((article) => (category === "all" || article.category === category) && articleMatches(article, normalizedQuery));
}

export function getTesterHelpArticle(id) {
  return HELP_ARTICLES.find((article) => article.id === id) || null;
}

export const TESTER_HELP_ARTICLE_COUNT = HELP_ARTICLES.length;
export const TESTER_HELP_CATEGORY_COUNT = HELP_CATEGORIES.length;

export const TESTER_HELP_TROUBLESHOOTING_MATRIX = [
  {
    id: "address-typo",
    symptom: "The message never appears",
    likelyCause: "The submitted address contains a typo or belongs to a different inbox.",
    firstAction: "Compare the address with the approved tester account and correct it before retrying.",
    nextAction: "Use the reset action if the form contains stale error state.",
    category: "email",
    priority: "high",
  },
  {
    id: "filtered-message",
    symptom: "The inbox is empty",
    likelyCause: "An inbox rule moved the automated message into another folder.",
    firstAction: "Search the entire mailbox for the verification message.",
    nextAction: "Review spam, promotions, updates, quarantine, and custom folders.",
    category: "delivery",
    priority: "medium",
  },
  {
    id: "old-code",
    symptom: "The code is rejected",
    likelyCause: "A newer code request may have invalidated the message you opened.",
    firstAction: "Find the newest verification email and use its complete code.",
    nextAction: "Wait for the resend control before making another request.",
    category: "delivery",
    priority: "high",
  },
  {
    id: "offline-request",
    symptom: "The request keeps failing",
    likelyCause: "The browser connection changed during the request.",
    firstAction: "Confirm that the browser is online before submitting again.",
    nextAction: "Reload only after preserving the approved destination and email context.",
    category: "delivery",
    priority: "medium",
  },
  {
    id: "storage-blocked",
    symptom: "The session does not remain active",
    likelyCause: "Private browsing or a browser policy may block session storage.",
    firstAction: "Use a supported browser profile with storage enabled.",
    nextAction: "Complete the test in a private, dedicated profile when possible.",
    category: "privacy",
    priority: "medium",
  },
  {
    id: "shared-browser",
    symptom: "Another person may use this device",
    likelyCause: "The browser profile is shared or the tester tab may remain open.",
    firstAction: "Avoid saving credentials and use a dedicated browser profile.",
    nextAction: "Sign out and close the tester tab after the authorized test.",
    category: "privacy",
    priority: "high",
  },
  {
    id: "keyboard-focus",
    symptom: "The focus order feels unclear",
    likelyCause: "The browser or assistive technology may have retained a previous focus position.",
    firstAction: "Press Tab once and follow the visible focus ring.",
    nextAction: "Use the focus assistance panel to confirm the active control.",
    category: "keyboard",
    priority: "low",
  },
  {
    id: "screen-reader",
    symptom: "A status change is easy to miss",
    likelyCause: "Live status messages may be grouped with other browser announcements.",
    firstAction: "Move focus back to the email field or submit button.",
    nextAction: "Review the visible status notice and error recovery action.",
    category: "keyboard",
    priority: "low",
  },
  {
    id: "unsafe-route",
    symptom: "The requested destination changed",
    likelyCause: "The original destination was outside the protected tester route.",
    firstAction: "Continue using the safe tester destination shown on the page.",
    nextAction: "Do not manually paste an external address into a return parameter.",
    category: "privacy",
    priority: "high",
  },
  {
    id: "mobile-layout",
    symptom: "The form looks different on a phone",
    likelyCause: "The page switches to a compact layout at narrow widths.",
    firstAction: "Scroll through the page and keep the inbox app available.",
    nextAction: "Use the mobile guidance panel for touch and orientation tips.",
    category: "email",
    priority: "low",
  },
  {
    id: "duplicate-request",
    symptom: "Several messages arrive",
    likelyCause: "The request was submitted more than once or retried quickly.",
    firstAction: "Use only the newest verification message.",
    nextAction: "Wait for the cooldown before requesting another code.",
    category: "delivery",
    priority: "medium",
  },
  {
    id: "long-address",
    symptom: "The email field reports a length warning",
    likelyCause: "The address is near or above the supported email length.",
    firstAction: "Check for accidental pasted text or an incorrect address.",
    nextAction: "Use the approved account address and remove unrelated characters.",
    category: "email",
    priority: "medium",
  },
];

export function getTesterTroubleshootingItem(id) {
  return TESTER_HELP_TROUBLESHOOTING_MATRIX.find((item) => item.id === id) || null;
}

export function getTesterTroubleshootingByCategory(category = "all") {
  if (category === "all") return [...TESTER_HELP_TROUBLESHOOTING_MATRIX];
  return TESTER_HELP_TROUBLESHOOTING_MATRIX.filter((item) => item.category === category);
}

export function getTesterTroubleshootingByPriority(priority = "all") {
  if (priority === "all") return [...TESTER_HELP_TROUBLESHOOTING_MATRIX];
  return TESTER_HELP_TROUBLESHOOTING_MATRIX.filter((item) => item.priority === priority);
}

export function findTesterTroubleshooting(query = "") {
  const normalized = normalizeSearch(query);
  if (!normalized) return [...TESTER_HELP_TROUBLESHOOTING_MATRIX];

  return TESTER_HELP_TROUBLESHOOTING_MATRIX.filter((item) =>
    [item.symptom, item.likelyCause, item.firstAction, item.nextAction, item.category]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
}

export function getTesterTroubleshootingSummary(item) {
  if (!item) return "No troubleshooting guidance selected.";
  return `${item.symptom}: ${item.firstAction}`;
}

export function getTesterHelpSearchSummary({ query = "", category = "all" } = {}) {
  const articles = searchTesterHelpArticles(query, category);
  const categoryLabel = HELP_CATEGORIES.find((item) => item.id === category)?.label || "All help";

  return {
    count: articles.length,
    category: categoryLabel,
    query: query.trim(),
    empty: articles.length === 0,
    firstArticleId: articles[0]?.id || null,
  };
}

export function getTesterHelpArticleTags(id) {
  return getTesterHelpArticle(id)?.tags || [];
}

export function getTesterHelpArticleCategory(id) {
  return getTesterHelpArticle(id)?.category || null;
}

export function getTesterHelpArticleTitle(id) {
  return getTesterHelpArticle(id)?.title || "Tester sign-in help";
}

export function isTesterHelpArticle(id) {
  return Boolean(getTesterHelpArticle(id));
}

export function isTesterHelpCategory(id) {
  return HELP_CATEGORIES.some((category) => category.id === id);
}

export function getTesterHelpCategoryLabel(id) {
  return HELP_CATEGORIES.find((category) => category.id === id)?.label || "All help";
}

export function getTesterHelpArticleCount(category = "all") {
  return searchTesterHelpArticles("", category).length;
}

export function getTesterTroubleshootingCount(category = "all") {
  return getTesterTroubleshootingByCategory(category).length;
}

export const TESTER_HELP_TROUBLESHOOTING_COUNT = TESTER_HELP_TROUBLESHOOTING_MATRIX.length;
export const TESTER_HELP_PRIORITY_LEVELS = Object.freeze(["low", "medium", "high"]);
export const TESTER_HELP_DEFAULT_CATEGORY = "all";
export const TESTER_HELP_DEFAULT_QUERY = "";
