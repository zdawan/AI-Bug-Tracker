"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  Inbox,
  LifeBuoy,
  Mail,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import OtpInboxGuide from "./OtpInboxGuide";

const HELP_CATEGORIES = [
  { id: "all", label: "All topics" },
  { id: "delivery", label: "Finding the email" },
  { id: "code", label: "Code problems" },
  { id: "input", label: "Entering the code" },
  { id: "security", label: "Keeping safe" },
];

const TROUBLESHOOTING_TOPICS = [
  {
    id: "missing-email",
    category: "delivery",
    title: "I can’t find the email",
    summary: "Check the folders and address where automated messages may land.",
    icon: Inbox,
    steps: [
      "Confirm the email address shown above is the inbox you are checking.",
      "Look in Spam, Junk, Promotions, Updates, and any filtered folders.",
      "Search your mailbox for “verification code” or the site name.",
      "Wait a short while before requesting another code.",
    ],
    note: "Mail delivery can take a little time depending on your provider.",
  },
  {
    id: "wrong-address",
    category: "delivery",
    title: "The address is incorrect",
    summary: "Return to the previous step and request a code for the right inbox.",
    icon: Mail,
    steps: [
      "Choose Change email address below.",
      "Correct any spelling errors, extra spaces, or an outdated domain.",
      "Request a fresh code after confirming the address.",
    ],
    note: "A code sent to another address cannot verify this email.",
    action: "change-email",
  },
  {
    id: "delayed-code",
    category: "delivery",
    title: "The code has not arrived yet",
    summary: "Avoid requesting multiple codes while the first message is in transit.",
    icon: Clock3,
    steps: [
      "Leave this page open while checking your inbox in another tab.",
      "Refresh the mailbox rather than repeatedly submitting the login form.",
      "Wait until the resend timer reaches zero before requesting a new code.",
    ],
    note: "Only the latest code may remain valid after you request another one.",
    action: "resend",
  },
  {
    id: "expired-code",
    category: "code",
    title: "The code may have expired",
    summary: "Verification codes are time-sensitive and may stop working.",
    icon: RefreshCw,
    steps: [
      "Use the newest message in your inbox, not an earlier email.",
      "Check the message timestamp before entering the code.",
      "If the newest code is no longer accepted, request another one.",
    ],
    note: "Requesting a new code can invalidate codes sent earlier.",
    action: "resend",
  },
  {
    id: "rejected-code",
    category: "code",
    title: "The code was not accepted",
    summary: "Make sure the digits came from the newest message.",
    icon: AlertCircle,
    steps: [
      "Clear the current entry so digits from different messages are not mixed.",
      "Open the most recent verification email and copy its six digits.",
      "Paste the complete code into any one of the six boxes.",
      "If it still fails, request a fresh code and try that message instead.",
    ],
    note: "The form sends the six digits exactly as entered for server verification.",
    action: "resend",
  },
  {
    id: "typing-code",
    category: "input",
    title: "I’m having trouble entering the code",
    summary: "The six boxes support keyboard navigation and pasting.",
    icon: CheckCircle2,
    steps: [
      "Enter one digit in each box; focus moves forward automatically.",
      "Use the left and right arrow keys to move between boxes.",
      "Use Backspace to clear a digit or move back to the previous box.",
      "Paste the complete six-digit code into one box to fill the entry.",
    ],
    note: "Non-numeric characters are ignored when a code is pasted.",
  },
  {
    id: "resend-code",
    category: "delivery",
    title: "When can I request another code?",
    summary: "The resend control becomes available when its countdown ends.",
    icon: Clock3,
    steps: [
      "Watch the countdown below the verification form.",
      "When it reaches zero, select Resend code.",
      "Wait for the success message before checking for the new email.",
    ],
    note: "If sending fails, the page displays the server error so you can retry.",
    action: "resend",
  },
  {
    id: "safe-code",
    category: "security",
    title: "Keep your verification code private",
    summary: "A verification code can grant access to your tester session.",
    icon: ShieldCheck,
    steps: [
      "Enter the code only on this login page.",
      "Do not send the code to another person or post it in a message.",
      "If you did not request a code, do not use or share it.",
    ],
    note: "This form does not display or store the code outside the current page.",
  },
];

const INBOX_CHECKS = [
  {
    id: "address",
    label: "I checked that this is the correct email address.",
  },
  {
    id: "spam",
    label: "I checked spam, junk, and filtered folders.",
  },
  {
    id: "latest",
    label: "I am using the newest verification email.",
  },
  {
    id: "digits",
    label: "I entered all six digits from the same message.",
  },
];

function matchesSearch(topic, query) {
  if (!query) return true;

  const searchableText = [
    topic.title,
    topic.summary,
    topic.note,
    ...topic.steps,
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(query);
}

function getCategoryLabel(categoryId) {
  return (
    HELP_CATEGORIES.find((category) => category.id === categoryId)?.label ||
    "Help"
  );
}

function ChecklistItem({ item, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 transition hover:bg-white">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
      />
      <span
        className={`text-xs leading-5 ${
          checked ? "text-slate-400 line-through" : "text-slate-700"
        }`}
      >
        {item.label}
      </span>
    </label>
  );
}

function HelpTopic({
  topic,
  expanded,
  onToggle,
  onAction,
  resendDisabled,
  isSending,
}) {
  const Icon = topic.icon;

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`otp-help-${topic.id}`}
          className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700">
            <Icon size={16} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-slate-800">
              {topic.title}
            </span>
            <span className="mt-0.5 block text-[10px] leading-4 text-slate-500">
              {topic.summary}
            </span>
          </span>
          <span className="hidden shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-medium text-slate-500 sm:inline">
            {getCategoryLabel(topic.category)}
          </span>
          <ChevronDown
            size={15}
            aria-hidden="true"
            className={`shrink-0 text-slate-400 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>
      </h3>

      {expanded && (
        <div
          id={`otp-help-${topic.id}`}
          className="border-t border-slate-100 px-4 pb-4 pt-3"
        >
          <ol className="space-y-2.5">
            {topic.steps.map((step, index) => (
              <li key={`${topic.id}-step-${index}`} className="flex gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet-50 text-[10px] font-semibold text-violet-700">
                  {index + 1}
                </span>
                <span className="pt-0.5 text-xs leading-5 text-slate-600">
                  {step}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-900">
            {topic.note}
          </p>

          {topic.action === "resend" && (
            <button
              type="button"
              onClick={onAction}
              disabled={resendDisabled || isSending}
              className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={isSending ? "animate-spin" : ""}
                aria-hidden="true"
              />
              {isSending ? "Sending code..." : "Request another code"}
            </button>
          )}

          {topic.action === "change-email" && (
            <button
              type="button"
              onClick={onAction}
              className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Mail size={13} aria-hidden="true" />
              Change email address
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default function OtpHelpPanel({
  email,
  onResend,
  onBack,
  resendCooldown = 0,
  isSending = false,
  isVerifying = false,
  isOnline = true,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedTopic, setExpandedTopic] = useState("");
  const [checkedItems, setCheckedItems] = useState(() => new Set());
  const [copyStatus, setCopyStatus] = useState("");
  const searchRef = useRef(null);
  const normalizedQuery = query.trim().toLowerCase();
  const safeEmail = typeof email === "string" ? email.trim() : "";
  const resendDisabled =
    resendCooldown > 0 || isSending || isVerifying || !isOnline;

  const filteredTopics = useMemo(
    () =>
      TROUBLESHOOTING_TOPICS.filter((topic) => {
        const categoryMatches =
          activeCategory === "all" || topic.category === activeCategory;
        return categoryMatches && matchesSearch(topic, normalizedQuery);
      }),
    [activeCategory, normalizedQuery],
  );

  const completedChecks = checkedItems.size;
  const checklistProgress = Math.round(
    (completedChecks / INBOX_CHECKS.length) * 100,
  );

  useEffect(() => {
    if (isOpen) searchRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!copyStatus) return undefined;

    const timer = window.setTimeout(() => setCopyStatus(""), 3000);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  const toggleChecklistItem = (itemId) => {
    setCheckedItems((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const resetChecklist = () => {
    setCheckedItems(new Set());
    setCopyStatus("Checklist reset.");
  };

  const handleTopicToggle = (topicId) => {
    setExpandedTopic((current) => (current === topicId ? "" : topicId));
  };

  const handleCategoryChange = (categoryId) => {
    setActiveCategory(categoryId);
    setExpandedTopic("");
  };

  const handleCopyEmail = async () => {
    if (!safeEmail) {
      setCopyStatus("There is no email address to copy.");
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable in this browser.");
      }

      await navigator.clipboard.writeText(safeEmail);
      setCopyStatus("Email address copied.");
    } catch (copyError) {
      setCopyStatus(
        copyError instanceof Error
          ? copyError.message
          : "Could not copy the email address.",
      );
    }
  };

  const handleResend = async () => {
    if (resendDisabled || !onResend) return;
    await onResend();
  };

  const handleBack = () => {
    if (isSending || isVerifying) return;
    onBack?.();
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Escape" && query) {
      setQuery("");
      event.stopPropagation();
    }
  };

  return (
    <section
      className="mt-5 border-t border-slate-100 pt-4"
      aria-labelledby="otp-help-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-600">
            <LifeBuoy size={15} aria-hidden="true" />
          </span>
          <div>
            <h2
              id="otp-help-heading"
              className="text-xs font-semibold text-slate-800"
            >
              Need help with your code?
            </h2>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Find a quick answer or check the delivery steps.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls="otp-help-content"
          className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          {isOpen ? "Close help" : "Open help"}
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {isOpen && (
        <div
          id="otp-help-content"
          className="mt-4 space-y-4"
          aria-label="Verification code help"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex min-w-0 items-center gap-2">
              <Mail size={15} className="shrink-0 text-slate-500" aria-hidden="true" />
              <span className="min-w-0 break-all text-xs font-medium text-slate-700">
                {safeEmail || "No email address provided"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyEmail}
              disabled={!safeEmail}
              className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copyStatus === "Email address copied." ? (
                <Check size={12} aria-hidden="true" />
              ) : (
                <Copy size={12} aria-hidden="true" />
              )}
              Copy address
            </button>
          </div>

          {copyStatus && (
            <p
              role="status"
              aria-live="polite"
              className={`text-[10px] ${
                copyStatus.includes("copied")
                  ? "text-emerald-700"
                  : "text-rose-700"
              }`}
            >
              {copyStatus}
            </p>
          )}

          <section
            className="rounded-xl border border-violet-100 bg-violet-50/50 p-3"
            aria-labelledby="otp-checklist-title"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3
                  id="otp-checklist-title"
                  className="text-xs font-semibold text-slate-800"
                >
                  Quick delivery checklist
                </h3>
                <p className="mt-1 text-[10px] text-slate-500">
                  {completedChecks} of {INBOX_CHECKS.length} checks complete
                </p>
              </div>
              {completedChecks > 0 && (
                <button
                  type="button"
                  onClick={resetChecklist}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-white hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <RotateCcw size={11} aria-hidden="true" />
                  Reset
                </button>
              )}
            </div>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-white"
              role="progressbar"
              aria-label="Delivery checklist progress"
              aria-valuemin={0}
              aria-valuemax={INBOX_CHECKS.length}
              aria-valuenow={completedChecks}
              aria-valuetext={`${completedChecks} of ${INBOX_CHECKS.length} checks complete`}
            >
              <div
                className="h-full rounded-full bg-violet-600 transition-[width] duration-200"
                style={{ width: `${checklistProgress}%` }}
              />
            </div>
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {INBOX_CHECKS.map((item) => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  checked={checkedItems.has(item.id)}
                  onChange={() => toggleChecklistItem(item.id)}
                />
              ))}
            </div>
            {completedChecks === INBOX_CHECKS.length && (
              <p
                className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-700"
                role="status"
              >
                <CheckCircle2 size={13} aria-hidden="true" />
                Checklist complete. Try the newest code or request another.
              </p>
            )}
          </section>

          <OtpInboxGuide email={safeEmail} />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-slate-800">
                Troubleshooting topics
              </h3>
              <span className="text-[10px] text-slate-500">
                {filteredTopics.length}{" "}
                {filteredTopics.length === 1 ? "topic" : "topics"}
              </span>
            </div>

            <label
              htmlFor="otp-help-search"
              className="sr-only"
            >
              Search verification help
            </label>
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                ref={searchRef}
                id="otp-help-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search code help..."
                autoComplete="off"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </div>

            <div
              className="flex gap-1.5 overflow-x-auto pb-1"
              role="group"
              aria-label="Filter help topics"
            >
              {HELP_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategoryChange(category.id)}
                  aria-pressed={activeCategory === category.id}
                  className={`min-h-8 shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 ${
                    activeCategory === category.id
                      ? "border-violet-200 bg-violet-50 text-violet-700"
                      : "border-slate-200 bg-white text-slate-500 hover:border-violet-200 hover:text-violet-700"
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div
            className="space-y-2"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {filteredTopics.length ? (
              filteredTopics.map((topic) => (
                <HelpTopic
                  key={topic.id}
                  topic={topic}
                  expanded={expandedTopic === topic.id}
                  onToggle={() => handleTopicToggle(topic.id)}
                  onAction={
                    topic.action === "resend" ? handleResend : handleBack
                  }
                  resendDisabled={resendDisabled}
                  isSending={isSending}
                />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                <Search
                  size={20}
                  className="mx-auto text-slate-400"
                  aria-hidden="true"
                />
                <p className="mt-2 text-xs font-semibold text-slate-700">
                  No matching help topics
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Try different words or choose another topic category.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setActiveCategory("all");
                  }}
                  className="mt-3 rounded-lg px-3 py-2 text-[10px] font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  Clear search and filters
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="inline-flex items-center gap-2 text-[10px] text-slate-600">
              <Clock3 size={13} aria-hidden="true" />
              {!isOnline
                ? "Reconnect to the internet before requesting another code."
                : resendCooldown > 0
                ? `You can request another code in ${Math.floor(
                    resendCooldown / 60,
                  )}:${String(resendCooldown % 60).padStart(2, "0")}.`
                : "A new code can be requested now."}
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendDisabled || !onResend}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-violet-700 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={12}
                className={isSending ? "animate-spin" : ""}
                aria-hidden="true"
              />
              {isSending ? "Sending..." : "Resend code"}
            </button>
          </div>

          <p className="flex items-start gap-2 px-1 text-[10px] leading-4 text-slate-500">
            <ShieldCheck
              size={13}
              className="mt-0.5 shrink-0 text-violet-600"
              aria-hidden="true"
            />
            Never share a verification code. The support tips above do not
            require you to reveal it.
          </p>
        </div>
      )}
    </section>
  );
}
