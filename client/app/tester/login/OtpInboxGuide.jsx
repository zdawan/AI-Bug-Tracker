"use client";

import { useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  ExternalLink,
  Inbox,
  Mail,
  Search,
  ShieldCheck,
} from "lucide-react";

const INBOX_PROVIDERS = [
  {
    id: "gmail",
    label: "Gmail",
    domains: ["gmail.com", "googlemail.com"],
    intro:
      "Gmail sorts some automated messages into category tabs, so check more than the Primary inbox.",
    folders: [
      {
        name: "Primary",
        detail:
          "Start with the Primary tab and refresh the inbox to load recent messages.",
      },
      {
        name: "Spam",
        detail:
          "Open Spam and look for the newest message with a verification subject.",
      },
      {
        name: "Promotions",
        detail:
          "Automated site messages may appear in Promotions or Updates.",
      },
      {
        name: "All Mail",
        detail:
          "All Mail includes archived messages that are no longer in the inbox.",
      },
    ],
    searches: [
      '"verification code"',
      '"one-time code"',
      "newer_than:1d verification",
      "in:anywhere tester",
    ],
    steps: [
      "Open Gmail in the same account shown on the verification page.",
      "Refresh the inbox, then check Primary, Promotions, and Updates.",
      "Open Spam and search for the newest verification email.",
      "If you find the message, use its six digits and ignore older messages.",
    ],
    note:
      "Gmail search can include Spam and Trash with in:anywhere. Search results may vary by account settings.",
  },
  {
    id: "outlook",
    label: "Outlook",
    domains: [
      "outlook.com",
      "hotmail.com",
      "live.com",
      "msn.com",
      "outlook.in",
    ],
    intro:
      "Outlook can separate Focused and Other mail, and may move automated messages to Junk.",
    folders: [
      {
        name: "Focused",
        detail:
          "Check Focused first, then switch to Other if the message is missing.",
      },
      {
        name: "Other",
        detail:
          "The Other inbox tab collects messages Outlook classifies as less urgent.",
      },
      {
        name: "Junk Email",
        detail:
          "Open Junk Email and check whether the newest verification message was filtered.",
      },
      {
        name: "Archive",
        detail:
          "Search Archive if you already moved or cleaned up recent messages.",
      },
    ],
    searches: [
      '"verification code"',
      '"one-time code"',
      "from:tester",
      "received:today verification",
    ],
    steps: [
      "Confirm Outlook is signed in to the email address shown on this page.",
      "Check both Focused and Other inbox tabs.",
      "Open Junk Email and search for a verification subject.",
      "Use the code from the newest message; a resend may invalidate older codes.",
    ],
    note:
      "Organization-managed Outlook accounts may also apply administrator quarantine rules.",
  },
  {
    id: "yahoo",
    label: "Yahoo Mail",
    domains: ["yahoo.com", "yahoo.co.in", "ymail.com", "rocketmail.com"],
    intro:
      "Yahoo Mail has dedicated Spam and Archive folders that are worth checking.",
    folders: [
      {
        name: "Inbox",
        detail:
          "Refresh the inbox and check the newest messages at the top of the list.",
      },
      {
        name: "Spam",
        detail:
          "Open Spam and inspect recent messages for the one-time verification code.",
      },
      {
        name: "Archive",
        detail:
          "Archived messages do not appear in the Inbox but remain searchable.",
      },
      {
        name: "Trash",
        detail:
          "If you accidentally deleted the message, check Trash before requesting another.",
      },
    ],
    searches: [
      '"verification code"',
      '"security code"',
      "newer_than:1d tester",
      "subject:verification",
    ],
    steps: [
      "Open the Yahoo mailbox that matches the displayed address.",
      "Refresh Inbox and check Spam for the latest email.",
      "Search all folders for the words verification or security code.",
      "If you request a new code, use that new message instead of the previous one.",
    ],
    note:
      "Some Yahoo layouts group folders under More; expand the folder list if needed.",
  },
  {
    id: "icloud",
    label: "iCloud Mail",
    domains: ["icloud.com", "me.com", "mac.com"],
    intro:
      "iCloud Mail may filter a message into Junk or a custom folder rather than Inbox.",
    folders: [
      {
        name: "Inbox",
        detail:
          "Refresh the mailbox and review the newest message at the top.",
      },
      {
        name: "Junk",
        detail:
          "Check Junk for messages that were automatically filtered.",
      },
      {
        name: "Archive",
        detail:
          "Search Archive if you may have moved the email while organizing messages.",
      },
      {
        name: "Custom folders",
        detail:
          "Review any rules or folders that automatically sort incoming mail.",
      },
    ],
    searches: [
      '"verification code"',
      '"one-time code"',
      "subject:verification",
      "tester",
    ],
    steps: [
      "Confirm you are checking the iCloud mailbox for the shown address.",
      "Refresh Inbox, then check Junk and Archive.",
      "Search all mailboxes for verification code or the site name.",
      "Review custom rules if other automated messages are routinely redirected.",
    ],
    note:
      "Mail privacy and filtering settings can affect where incoming messages appear.",
  },
  {
    id: "proton",
    label: "Proton Mail",
    domains: ["proton.me", "protonmail.com", "pm.me"],
    intro:
      "Proton Mail provides Spam and Archive folders, and custom filters can route messages.",
    folders: [
      {
        name: "Inbox",
        detail:
          "Refresh Inbox and make sure the current Proton account matches the address.",
      },
      {
        name: "Spam",
        detail:
          "Review Spam for a recent message containing a verification code.",
      },
      {
        name: "Archive",
        detail:
          "Check Archive if the message was removed from Inbox but not deleted.",
      },
      {
        name: "Filters",
        detail:
          "Review rules that automatically label, move, or archive incoming mail.",
      },
    ],
    searches: [
      '"verification code"',
      '"one-time code"',
      "subject:verification",
      "newer_than:1d tester",
    ],
    steps: [
      "Open the Proton account corresponding to the displayed email address.",
      "Check Inbox and Spam for the newest verification message.",
      "Search mail, then include Archive if the first search has no result.",
      "Inspect filters or block lists if similar messages are being redirected.",
    ],
    note:
      "Proton filtering settings differ by account and may be configured on multiple devices.",
  },
  {
    id: "custom",
    label: "Work or other email",
    domains: [],
    intro:
      "For a work, school, or custom-domain mailbox, check its quarantine and organization filters.",
    folders: [
      {
        name: "Inbox",
        detail:
          "Refresh the mailbox and confirm the signed-in account matches the displayed address.",
      },
      {
        name: "Junk or Spam",
        detail:
          "Look for a spam folder, junk folder, or provider-specific filtered view.",
      },
      {
        name: "Quarantine",
        detail:
          "Some organizations hold automated mail in an administrator-managed quarantine.",
      },
      {
        name: "Other folders",
        detail:
          "Check Archive, Clutter, Other, or any folder created by mail rules.",
      },
    ],
    searches: [
      '"verification code"',
      '"one-time code"',
      "subject:verification",
      "newest tester email",
    ],
    steps: [
      "Confirm the correct work or school mailbox is open.",
      "Search all mail folders for verification code or the sender name.",
      "Check Junk and any quarantine or filtered-message view.",
      "If organization rules block the message, ask your mail administrator for help.",
    ],
    note:
      "Do not ask an administrator or anyone else to read or forward your verification code.",
  },
];

function getEmailDomain(email) {
  if (typeof email !== "string") return "";
  const atIndex = email.lastIndexOf("@");
  if (atIndex < 0) return "";
  return email.slice(atIndex + 1).trim().toLowerCase();
}

function findProviderForDomain(domain) {
  if (!domain) return "custom";
  const provider = INBOX_PROVIDERS.find((item) =>
    item.domains.includes(domain),
  );
  return provider?.id || "custom";
}

function SearchTerm({ term, copiedTerm, onCopy }) {
  const isCopied = copiedTerm === term;

  return (
    <li className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
      <code className="min-w-0 flex-1 break-all text-[10px] leading-4 text-slate-700">
        {term}
      </code>
      <button
        type="button"
        onClick={() => onCopy(term)}
        aria-label={`${isCopied ? "Copied" : "Copy"} search text: ${term}`}
        className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-md px-2 text-[10px] font-medium text-violet-700 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        {isCopied ? (
          <Check size={12} aria-hidden="true" />
        ) : (
          <Clipboard size={12} aria-hidden="true" />
        )}
        {isCopied ? "Copied" : "Copy"}
      </button>
    </li>
  );
}

function InboxFolder({ folder, index }) {
  const [isExpanded, setIsExpanded] = useState(index === 0);

  return (
    <li className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        aria-expanded={isExpanded}
        className="flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500"
      >
        <Inbox size={13} className="shrink-0 text-violet-600" aria-hidden="true" />
        <span className="min-w-0 flex-1 text-[11px] font-semibold text-slate-700">
          {folder.name}
        </span>
        <ChevronDown
          size={13}
          className={`shrink-0 text-slate-400 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      {isExpanded && (
        <p className="border-t border-slate-100 px-3 py-2 text-[10px] leading-4 text-slate-500">
          {folder.detail}
        </p>
      )}
    </li>
  );
}

function ProviderStep({ step, index, checked, onToggle }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition hover:border-violet-200 hover:bg-violet-50/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
      />
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[9px] font-semibold text-slate-600">
        {checked ? <Check size={11} aria-hidden="true" /> : index + 1}
      </span>
      <span
        className={`text-[10px] leading-4 ${
          checked ? "text-slate-400 line-through" : "text-slate-700"
        }`}
      >
        {step}
      </span>
    </label>
  );
}

export default function OtpInboxGuide({ email = "" }) {
  const detectedProvider = useMemo(
    () => findProviderForDomain(getEmailDomain(email)),
    [email],
  );
  const [selectedProviderId, setSelectedProviderId] = useState("auto");
  const [activeSection, setActiveSection] = useState("folders");
  const [checkedSteps, setCheckedSteps] = useState(() => new Set());
  const [searchText, setSearchText] = useState("");
  const [copiedTerm, setCopiedTerm] = useState("");
  const [copyError, setCopyError] = useState("");

  const activeProviderId =
    selectedProviderId === "auto" ? detectedProvider : selectedProviderId;
  const provider =
    INBOX_PROVIDERS.find((item) => item.id === activeProviderId) ||
    INBOX_PROVIDERS[INBOX_PROVIDERS.length - 1];
  const completedSteps = checkedSteps.size;
  const progress = Math.round(
    (completedSteps / provider.steps.length) * 100,
  );

  const normalizedSearch = searchText.trim().toLowerCase();
  const visibleFolders = useMemo(
    () =>
      provider.folders.filter((folder) =>
        `${folder.name} ${folder.detail}`
          .toLowerCase()
          .includes(normalizedSearch),
      ),
    [normalizedSearch, provider],
  );
  const visibleSearchTerms = useMemo(
    () =>
      provider.searches.filter((term) =>
        term.toLowerCase().includes(normalizedSearch),
      ),
    [normalizedSearch, provider],
  );
  const visibleSteps = useMemo(
    () =>
      provider.steps
        .map((step, index) => ({ step, index }))
        .filter(({ step }) => step.toLowerCase().includes(normalizedSearch)),
    [normalizedSearch, provider],
  );

  const changeProvider = (providerId) => {
    setSelectedProviderId(providerId);
    setCheckedSteps(new Set());
    setSearchText("");
    setCopiedTerm("");
    setCopyError("");
    setActiveSection("folders");
  };

  const toggleStep = (stepIndex) => {
    setCheckedSteps((current) => {
      const next = new Set(current);
      if (next.has(stepIndex)) next.delete(stepIndex);
      else next.add(stepIndex);
      return next;
    });
  };

  const copySearchTerm = async (term) => {
    setCopyError("");
    setCopiedTerm("");
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable in this browser.");
      }
      await navigator.clipboard.writeText(term);
      setCopiedTerm(term);
    } catch (error) {
      setCopyError(
        error instanceof Error ? error.message : "Could not copy search text.",
      );
    }
  };

  const clearSearch = () => {
    setSearchText("");
    setCopyError("");
  };

  const sections = [
    { id: "folders", label: "Folders", count: provider.folders.length },
    { id: "searches", label: "Search tips", count: provider.searches.length },
    { id: "steps", label: "Checklist", count: provider.steps.length },
  ];

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-3"
      aria-labelledby="otp-inbox-guide-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700">
            <Mail size={15} aria-hidden="true" />
          </span>
          <div>
            <h3
              id="otp-inbox-guide-title"
              className="text-xs font-semibold text-slate-800"
            >
              Email inbox guide
            </h3>
            <p className="mt-1 max-w-[360px] text-[10px] leading-4 text-slate-500">
              Provider-specific places to look for your verification message.
            </p>
          </div>
        </div>
        {selectedProviderId === "auto" && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold text-emerald-700">
            {provider.label} detected
          </span>
        )}
      </div>

      <label
        htmlFor="otp-provider-select"
        className="mt-3 block text-[10px] font-medium text-slate-600"
      >
        Email provider
      </label>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <select
          id="otp-provider-select"
          value={selectedProviderId}
          onChange={(event) => changeProvider(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
        >
          <option value="auto">
            Automatically detect ({provider.label})
          </option>
          {INBOX_PROVIDERS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        {selectedProviderId !== "auto" && (
          <button
            type="button"
            onClick={() => changeProvider("auto")}
            className="min-h-9 rounded-lg px-2.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            Use detected provider
          </button>
        )}
      </div>

      <p className="mt-2 text-[10px] leading-4 text-slate-500">
        {provider.intro}
      </p>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" role="tablist">
        {sections.map((section) => (
          <button
            key={section.id}
            id={`otp-provider-tab-${section.id}`}
            type="button"
            role="tab"
            aria-selected={activeSection === section.id}
            aria-controls={`otp-provider-panel-${section.id}`}
            onClick={() => setActiveSection(section.id)}
            className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 ${
              activeSection === section.id
                ? "border-violet-200 bg-violet-50 text-violet-700"
                : "border-slate-200 bg-white text-slate-500 hover:border-violet-200 hover:text-violet-700"
            }`}
          >
            {section.label}
            <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] tabular-nums">
              {section.count}
            </span>
          </button>
        ))}
      </div>

      <div className="relative mt-3">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder={`Filter ${provider.label} guide...`}
          aria-label={`Filter ${provider.label} inbox guide`}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[11px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
        />
      </div>

      <div
        id={`otp-provider-panel-${activeSection}`}
        role="tabpanel"
        aria-labelledby={`otp-provider-tab-${activeSection}`}
        className="mt-3"
      >
        {activeSection === "folders" && (
          <ul className="space-y-2">
            {visibleFolders.length ? (
              visibleFolders.map((folder, index) => (
                <InboxFolder
                  key={`${provider.id}-${folder.name}`}
                  folder={folder}
                  index={index}
                />
              ))
            ) : (
              <li className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center text-[10px] text-slate-500">
                No inbox folders match “{searchText}”.
              </li>
            )}
          </ul>
        )}

        {activeSection === "searches" && (
          <div>
            <p className="mb-2 text-[10px] leading-4 text-slate-500">
              Copy a phrase and paste it into your mail provider’s search box.
              Search syntax varies by provider.
            </p>
            {visibleSearchTerms.length ? (
              <ul className="space-y-1.5">
                {visibleSearchTerms.map((term) => (
                  <SearchTerm
                    key={`${provider.id}-${term}`}
                    term={term}
                    copiedTerm={copiedTerm}
                    onCopy={copySearchTerm}
                  />
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center text-[10px] text-slate-500">
                No search phrases match “{searchText}”.
              </p>
            )}
            {copyError && (
              <p className="mt-2 text-[10px] text-rose-700" role="alert">
                {copyError}
              </p>
            )}
          </div>
        )}

        {activeSection === "steps" && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] text-slate-500">
                {checkedSteps.size} of {provider.steps.length} steps complete
              </p>
              {checkedSteps.size > 0 && (
                <button
                  type="button"
                  onClick={() => setCheckedSteps(new Set())}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <RotateCcw size={11} aria-hidden="true" />
                  Reset
                </button>
              )}
            </div>
            <div
              className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label={`${provider.label} inbox checklist`}
              aria-valuemin={0}
              aria-valuemax={provider.steps.length}
              aria-valuenow={checkedSteps.size}
            >
              <div
                className="h-full rounded-full bg-violet-600 transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            {visibleSteps.length ? (
              <ul className="space-y-1.5">
                {visibleSteps.map(({ step, index }) => (
                  <li key={`${provider.id}-step-${index}`}>
                    <ProviderStep
                      step={step}
                      index={index}
                      checked={checkedSteps.has(index)}
                      onToggle={() => toggleStep(index)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center text-[10px] text-slate-500">
                No checklist steps match “{searchText}”.
              </p>
            )}
            {checkedSteps.size === provider.steps.length && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-700">
                <CheckCircle2 size={13} aria-hidden="true" />
                Inbox checks complete. Try the newest message or request another
                code.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5">
        <ShieldCheck
          size={13}
          className="mt-0.5 shrink-0 text-amber-800"
          aria-hidden="true"
        />
        <p className="text-[10px] leading-4 text-amber-900">{provider.note}</p>
      </div>
      <p className="mt-2 text-[9px] leading-4 text-slate-400">
        This guide runs locally in the browser. It does not connect to your
        mailbox or change provider settings.
      </p>
    </section>
  );
}
