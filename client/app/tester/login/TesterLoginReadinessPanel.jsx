"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Accessibility,
  AlertCircle,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  ExternalLink,
  Globe2,
  Info,
  Keyboard,
  LockKeyhole,
  MailCheck,
  MonitorCheck,
  Network,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

const DEFAULT_ACCENT = "purple";

const ACCENT_STYLES = {
  purple: {
    badge: "bg-purple-50 text-purple-700",
    icon: "border-purple-100 bg-purple-50 text-purple-700",
    ring: "focus:border-purple-500 focus:ring-purple-100",
    button: "bg-purple-700 hover:bg-purple-800",
    soft: "bg-purple-50/70",
  },
  blue: {
    badge: "bg-blue-50 text-blue-700",
    icon: "border-blue-100 bg-blue-50 text-blue-700",
    ring: "focus:border-blue-500 focus:ring-blue-100",
    button: "bg-blue-700 hover:bg-blue-800",
    soft: "bg-blue-50/70",
  },
  emerald: {
    badge: "bg-emerald-50 text-emerald-700",
    icon: "border-emerald-100 bg-emerald-50 text-emerald-700",
    ring: "focus:border-emerald-500 focus:ring-emerald-100",
    button: "bg-emerald-700 hover:bg-emerald-800",
    soft: "bg-emerald-50/70",
  },
};

const readinessSteps = [
  {
    id: "authorized",
    title: "Confirm the test scope",
    description:
      "Only continue when you have permission to test the target website and account.",
    icon: ShieldCheck,
    tone: "emerald",
    detail:
      "This workspace is intended for authorized QA, accessibility, and reliability checks. Keep your test plan, target domain, and approved account in scope before signing in.",
  },
  {
    id: "inbox",
    title: "Keep your inbox nearby",
    description:
      "The one-time code will arrive in the inbox for the email address you enter.",
    icon: MailCheck,
    tone: "blue",
    detail:
      "Use an inbox you can access right now. If delivery is delayed, check spam or filtered folders before requesting another code.",
  },
  {
    id: "browser",
    title: "Stay in this browser tab",
    description:
      "Returning to this tab after reading the code keeps the verification flow simple.",
    icon: MonitorCheck,
    tone: "purple",
    detail:
      "Avoid opening several login tabs at once. A code is single-use, and a newer request can make an older code unusable.",
  },
  {
    id: "privacy",
    title: "Protect the verification code",
    description:
      "Never share a code with another person, support chat, or website prompt.",
    icon: LockKeyhole,
    tone: "purple",
    detail:
      "The tester workspace will never ask you to paste a code anywhere except the verification form shown after this step.",
  },
];

const browserChecks = [
  {
    id: "cookies",
    label: "Browser storage is available",
    description: "The session is remembered only in this browser profile.",
    icon: LockKeyhole,
  },
  {
    id: "javascript",
    label: "JavaScript is enabled",
    description: "The login form needs JavaScript to request and verify a code.",
    icon: Sparkles,
  },
  {
    id: "viewport",
    label: "The page fits your screen",
    description: "The layout adapts for phones, tablets, and desktop screens.",
    icon: Smartphone,
  },
  {
    id: "secure",
    label: "You are on the expected site",
    description: "Confirm the address bar before entering an email address.",
    icon: Globe2,
  },
];

const keyboardShortcuts = [
  {
    keys: ["Tab"],
    label: "Move through controls",
    description: "Move forward through the form and readiness controls.",
  },
  {
    keys: ["Shift", "Tab"],
    label: "Move backward",
    description: "Return to the previous interactive control.",
  },
  {
    keys: ["Enter"],
    label: "Submit the email",
    description: "Request the verification code while the email field is focused.",
  },
  {
    keys: ["Esc"],
    label: "Clear the email",
    description: "Clear the email field when it contains a value.",
  },
];

const troubleshootingItems = [
  {
    id: "no-email",
    question: "I did not receive a code.",
    answer:
      "Wait a moment, then check spam, promotions, and filtered folders. Make sure the email address is spelled correctly. Requesting a second code starts a fresh delivery attempt.",
  },
  {
    id: "wrong-email",
    question: "I entered the wrong email address.",
    answer:
      "Use the back action on the verification screen to return to the email form. You can correct the address without losing the rest of the page context.",
  },
  {
    id: "expired-code",
    question: "The code no longer works.",
    answer:
      "Codes can expire or become invalid after a newer code is requested. Return to the email step and request one fresh code, then use the newest message.",
  },
  {
    id: "offline",
    question: "My connection changed while signing in.",
    answer:
      "Reconnect before submitting again. The readiness panel reports the current browser connection, but it cannot restore a dropped request that already timed out.",
  },
  {
    id: "shared-device",
    question: "I am using a shared computer.",
    answer:
      "Sign out when testing is complete and avoid saving credentials in the browser. Close the tab if another person may use the same profile.",
  },
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getAccent(accent) {
  return ACCENT_STYLES[accent] || ACCENT_STYLES[DEFAULT_ACCENT];
}

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateStatus = () => setIsOnline(window.navigator.onLine !== false);

    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  return isOnline;
}

function useBrowserChecks() {
  const [checks, setChecks] = useState({
    cookies: null,
    javascript: true,
    viewport: null,
    secure: null,
  });

  useEffect(() => {
    const updateChecks = () => {
      const storageAvailable = (() => {
        try {
          const key = "tester-login-readiness";
          window.sessionStorage.setItem(key, "ok");
          window.sessionStorage.removeItem(key);
          return true;
        } catch {
          return false;
        }
      })();

      const viewportReady = window.innerWidth >= 320 && window.innerHeight >= 420;
      const protocolReady = ["https:", "http:", "file:"].includes(
        window.location.protocol,
      );

      setChecks({
        cookies: storageAvailable,
        javascript: true,
        viewport: viewportReady,
        secure: protocolReady,
      });
    };

    updateChecks();
    window.addEventListener("resize", updateChecks);

    return () => window.removeEventListener("resize", updateChecks);
  }, []);

  return checks;
}

function PanelHeading({ eyebrow, title, description, icon: Icon, accent }) {
  const colors = getAccent(accent);

  return (
    <div className="flex items-start gap-3">
      <div
        className={cx(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
          colors.icon,
        )}
      >
        <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

function StatusBadge({ ok, pending, label }) {
  const stateLabel = pending ? "Checking" : ok ? "Ready" : "Review";
  const StateIcon = pending ? Clock3 : ok ? Check : AlertCircle;

  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        pending
          ? "bg-amber-50 text-amber-700"
          : ok
            ? "bg-emerald-50 text-emerald-700"
            : "bg-rose-50 text-rose-700",
      )}
    >
      <StateIcon size={13} aria-hidden="true" />
      <span>{label || stateLabel}</span>
    </span>
  );
}

function ReadinessStep({ step, expanded, completed, onToggle }) {
  const Icon = step.icon;
  const colors = getAccent(step.tone);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => onToggle(step.id)}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-start gap-3 rounded-2xl p-4 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-100"
      >
        <div
          className={cx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            colors.icon,
          )}
        >
          {completed ? (
            <Check size={18} strokeWidth={2.2} aria-hidden="true" />
          ) : (
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
          )}
        </div>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-900">
              {step.title}
            </span>
            <ChevronDown
              size={17}
              className={cx(
                "shrink-0 text-slate-400 transition-transform",
                expanded && "rotate-180",
              )}
              aria-hidden="true"
            />
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-600">
            {step.description}
          </span>
        </span>
      </button>
      {expanded ? (
        <div className="border-t border-slate-100 px-4 pb-4 pl-16">
          <p className="pt-3 text-xs leading-5 text-slate-600">{step.detail}</p>
          <button
            type="button"
            onClick={() => onToggle(step.id, true)}
            className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-purple-700 transition hover:bg-purple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200"
          >
            <Check size={14} aria-hidden="true" />
            Mark as understood
          </button>
        </div>
      ) : null}
    </div>
  );
}

function BrowserCheckRow({ check, value }) {
  const Icon = check.icon;
  const pending = value === null;

  return (
    <li className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
        <Icon size={15} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-slate-800">{check.label}</p>
          <StatusBadge ok={value} pending={pending} />
        </div>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">
          {check.description}
        </p>
      </div>
    </li>
  );
}

function KeyboardKey({ children }) {
  return (
    <kbd className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-[0_1px_0_0_rgba(15,23,42,0.12)]">
      {children}
    </kbd>
  );
}

function KeyboardShortcutList() {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {keyboardShortcuts.map((shortcut) => (
        <li
          key={shortcut.label}
          className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3"
        >
          <div className="flex items-center gap-1.5">
            {shortcut.keys.map((key) => (
              <KeyboardKey key={key}>{key}</KeyboardKey>
            ))}
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-800">
            {shortcut.label}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            {shortcut.description}
          </p>
        </li>
      ))}
    </ul>
  );
}

function TroubleshootingAccordion({ item, open, onToggle }) {
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={() => onToggle(item.id)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200"
      >
        <span className="text-xs font-semibold text-slate-800">{item.question}</span>
        <ChevronDown
          size={16}
          className={cx(
            "shrink-0 text-slate-400 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <p className="pb-3 text-xs leading-5 text-slate-600">{item.answer}</p>
      ) : null}
    </div>
  );
}

function ConnectionSummary({ isOnline, onRefresh }) {
  return (
    <div
      className={cx(
        "flex items-center justify-between gap-3 rounded-2xl border px-3 py-3",
        isOnline
          ? "border-emerald-100 bg-emerald-50/70"
          : "border-rose-100 bg-rose-50/70",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {isOnline ? (
          <Wifi size={17} className="shrink-0 text-emerald-700" aria-hidden="true" />
        ) : (
          <WifiOff size={17} className="shrink-0 text-rose-700" aria-hidden="true" />
        )}
        <div className="min-w-0">
          <p
            className={cx(
              "text-xs font-semibold",
              isOnline ? "text-emerald-800" : "text-rose-800",
            )}
          >
            {isOnline ? "Connection looks available" : "You appear to be offline"}
          </p>
          <p className="mt-0.5 text-[11px] leading-5 text-slate-600">
            {isOnline
              ? "You can request a code when your email is ready."
              : "Reconnect before requesting a verification code."}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200"
        aria-label="Refresh connection status"
      >
        <RefreshCw size={13} aria-hidden="true" />
        Refresh
      </button>
    </div>
  );
}

function CopyableTip({ text }) {
  const [copied, setCopied] = useState(false);

  const copyTip = async () => {
    if (!navigator.clipboard?.writeText) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copyTip}
      className="group flex w-full cursor-pointer items-start gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3 text-left transition hover:border-purple-300 hover:bg-purple-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200"
    >
      <Copy size={15} className="mt-0.5 shrink-0 text-slate-500 group-hover:text-purple-700" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-slate-800">
          {copied ? "Tip copied" : "Copy a quick troubleshooting tip"}
        </span>
        <span className="mt-1 block text-[11px] leading-5 text-slate-500">{text}</span>
      </span>
    </button>
  );
}

function CompletionMeter({ completedCount, totalCount }) {
  const percentage = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-600">
        <span>Readiness progress</span>
        <span>{completedCount}/{totalCount} understood</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div
          className="h-full rounded-full bg-purple-600 transition-[width] duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] leading-5 text-slate-500">
        {percentage === 100
          ? "You have reviewed the main sign-in expectations."
          : "Review each item if this is your first time using the tester workspace."}
      </p>
    </div>
  );
}

function SectionToggle({ label, icon: Icon, open, onClick, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-1 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200"
    >
      <Icon size={17} className="shrink-0 text-slate-500" aria-hidden="true" />
      <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">{label}</span>
      {badge ? (
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
          {badge}
        </span>
      ) : null}
      <ChevronDown
        size={17}
        className={cx("shrink-0 text-slate-400 transition-transform", open && "rotate-180")}
        aria-hidden="true"
      />
    </button>
  );
}

export default function TesterLoginReadinessPanel({
  defaultOpen = false,
  accent = DEFAULT_ACCENT,
  className = "",
}) {
  const [panelOpen, setPanelOpen] = useState(defaultOpen);
  const [expandedStep, setExpandedStep] = useState("authorized");
  const [understoodSteps, setUnderstoodSteps] = useState([]);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [troubleshootingOpen, setTroubleshootingOpen] = useState(false);
  const [openTroubleshooting, setOpenTroubleshooting] = useState("");
  const [statusVersion, setStatusVersion] = useState(0);
  const isOnline = useOnlineStatus();
  const browserChecks = useBrowserChecks();
  const colors = getAccent(accent);

  const understoodCount = understoodSteps.length;
  const browserCheckValues = useMemo(
    () => browserCheckDefinitions.map((check) => check.id),
    [],
  );

  const refreshStatus = () => setStatusVersion((version) => version + 1);

  const toggleStep = (stepId, markComplete = false) => {
    if (markComplete) {
      setUnderstoodSteps((current) =>
        current.includes(stepId) ? current : [...current, stepId],
      );
      setExpandedStep("");
      return;
    }

    setExpandedStep((current) => (current === stepId ? "" : stepId));
  };

  const toggleTroubleshooting = (itemId) => {
    setOpenTroubleshooting((current) => (current === itemId ? "" : itemId));
  };

  const browserCheckCount = Object.values(browserChecks).filter(Boolean).length;
  const browserReady = browserCheckCount === browserCheckDefinitions.length;

  return (
    <section
      className={cx(
        "mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm",
        className,
      )}
      aria-labelledby="tester-login-readiness-title"
      data-status-version={statusVersion}
    >
      <div className="p-4 sm:p-5">
        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          aria-expanded={panelOpen}
          className="flex w-full cursor-pointer items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-100"
        >
          <div className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", colors.icon)}>
            <Sparkles size={19} strokeWidth={1.8} aria-hidden="true" />
          </div>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-3">
              <span>
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Before you begin
                </span>
                <span id="tester-login-readiness-title" className="block text-base font-semibold text-slate-950">
                  Prepare for a smooth sign-in
                </span>
              </span>
              <ChevronDown
                size={19}
                className={cx("shrink-0 text-slate-400 transition-transform", panelOpen && "rotate-180")}
                aria-hidden="true"
              />
            </span>
            <span className="mt-1 block text-sm leading-6 text-slate-600">
              A few quick checks can save time before the verification email arrives.
            </span>
          </span>
        </button>

        {panelOpen ? (
          <div className="mt-5 space-y-5">
            <ConnectionSummary isOnline={isOnline} onRefresh={refreshStatus} />

            <div>
              <PanelHeading
                eyebrow="Sign-in checklist"
                title="Know what happens next"
                description="Open each item for a short explanation, then continue with the email form above."
                icon={ShieldCheck}
                accent={accent}
              />
              <div className="mt-4 space-y-2">
                {readinessSteps.map((step) => (
                  <ReadinessStep
                    key={step.id}
                    step={step}
                    expanded={expandedStep === step.id}
                    completed={understoodSteps.includes(step.id)}
                    onToggle={toggleStep}
                  />
                ))}
              </div>
              <CompletionMeter
                completedCount={understoodCount}
                totalCount={readinessSteps.length}
              />
            </div>

            <div className="border-t border-slate-100 pt-5">
              <SectionToggle
                label="Browser readiness"
                icon={MonitorCheck}
                open={browserOpen}
                onClick={() => setBrowserOpen((open) => !open)}
                badge={browserReady ? "Ready" : `${browserCheckCount}/4`}
              />
              {browserOpen ? (
                <div className="mt-3 space-y-3">
                  <p className="text-xs leading-5 text-slate-600">
                    These checks are local hints only. They do not inspect your inbox, saved passwords, or browsing history.
                  </p>
                  <ul className="space-y-2">
                    {browserCheckValues.map((checkId) => {
                      const definition = browserCheckDefinitions.find(
                        (check) => check.id === checkId,
                      );

                      return (
                        <BrowserCheckRow
                          key={checkId}
                          check={definition}
                          value={browserChecks[checkId]}
                        />
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="border-t border-slate-100 pt-5">
              <SectionToggle
                label="Keyboard-friendly controls"
                icon={Keyboard}
                open={keyboardOpen}
                onClick={() => setKeyboardOpen((open) => !open)}
                badge="4 shortcuts"
              />
              {keyboardOpen ? (
                <div className="mt-3 space-y-3">
                  <p className="text-xs leading-5 text-slate-600">
                    You can complete the email step without a mouse. Focus moves in a predictable order and errors are announced by the form.
                  </p>
                  <KeyboardShortcutList />
                </div>
              ) : null}
            </div>

            <div className="border-t border-slate-100 pt-5">
              <SectionToggle
                label="Troubleshooting before you start"
                icon={Search}
                open={troubleshootingOpen}
                onClick={() => setTroubleshootingOpen((open) => !open)}
                badge="5 answers"
              />
              {troubleshootingOpen ? (
                <div className="mt-3">
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/60 px-3">
                    {troubleshootingItems.map((item) => (
                      <TroubleshootingAccordion
                        key={item.id}
                        item={item}
                        open={openTroubleshooting === item.id}
                        onToggle={toggleTroubleshooting}
                      />
                    ))}
                  </div>
                  <div className="mt-3">
                    <CopyableTip text="Use the newest verification email. A later request may invalidate an earlier code." />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
              <Accessibility size={18} className="mt-0.5 shrink-0 text-purple-700" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-purple-900">Designed to stay out of your way</p>
                <p className="mt-1 text-xs leading-5 text-purple-800/80">
                  This helper is optional. Collapse it whenever you want more space, and the email form will continue to work normally.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Network size={13} aria-hidden="true" />
                Status updates automatically
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Info size={13} aria-hidden="true" />
                No inbox content is read here
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

const browserCheckDefinitions = [
  {
    id: "cookies",
    label: "Browser storage is available",
    description: "The session is remembered only in this browser profile.",
    icon: LockKeyhole,
  },
  {
    id: "javascript",
    label: "JavaScript is enabled",
    description: "The login form needs JavaScript to request and verify a code.",
    icon: Sparkles,
  },
  {
    id: "viewport",
    label: "The page fits your screen",
    description: "The layout adapts for phones, tablets, and desktop screens.",
    icon: Smartphone,
  },
  {
    id: "secure",
    label: "You are on the expected site",
    description: "Confirm the address bar before entering an email address.",
    icon: Globe2,
  },
];
