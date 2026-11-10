"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  BellRing,
  BookOpen,
  Check,
  ChevronDown,
  Circle,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Eye,
  FileText,
  Inbox,
  KeyRound,
  LifeBuoy,
  Link2,
  ListChecks,
  Mail,
  MessageCircleQuestion,
  MousePointer2,
  PanelTop,
  RefreshCw,
  Search,
  Send,
  Shield,
  Sparkles,
  Target,
  TimerReset,
  UserRoundCheck,
  Waypoints,
  X,
} from "lucide-react";

const flowSteps = [
  {
    id: "email",
    number: "01",
    title: "Enter your email",
    shortTitle: "Email",
    description: "Use the approved tester email address for this workspace.",
    detail:
      "The email field accepts one address at a time. The form normalizes surrounding spaces and checks the address before making a request.",
    icon: Mail,
    color: "purple",
  },
  {
    id: "inbox",
    number: "02",
    title: "Open the newest message",
    shortTitle: "Inbox",
    description: "Find the one-time verification email in your inbox.",
    detail:
      "Keep this tab open while checking your inbox. If several messages arrive, use the newest code and avoid mixing codes from older attempts.",
    icon: Inbox,
    color: "blue",
  },
  {
    id: "verify",
    number: "03",
    title: "Verify and continue",
    shortTitle: "Verify",
    description: "Enter the six-digit code to access the tester workspace.",
    detail:
      "The verification screen provides a clear way to go back, resend after the cooldown, and review the code before submitting it.",
    icon: KeyRound,
    color: "emerald",
  },
];

const expectations = [
  {
    id: "one-time",
    title: "One-time code",
    description: "The code is intended for one sign-in attempt.",
    icon: KeyRound,
  },
  {
    id: "no-password",
    title: "No password entry",
    description: "This tester route uses email verification instead of a password.",
    icon: Shield,
  },
  {
    id: "workspace",
    title: "Tester workspace",
    description: "After verification, you return to the requested tester route.",
    icon: PanelTop,
  },
  {
    id: "authorized",
    title: "Authorized testing",
    description: "Use this access only for websites and accounts you can test.",
    icon: UserRoundCheck,
  },
];

const accessibilityNotes = [
  "The active step is announced with a visible label.",
  "The workflow can be understood without color alone.",
  "Interactive details are reachable with keyboard navigation.",
  "The email and verification steps expose meaningful form errors.",
  "The layout remains useful at narrow mobile widths.",
];

const supportLinks = [
  {
    id: "help",
    label: "Open sign-in help",
    description: "Review common email and code delivery questions.",
    icon: CircleHelp,
  },
  {
    id: "scope",
    label: "Review test scope",
    description: "Confirm the site and account are approved for testing.",
    icon: ClipboardCheck,
  },
  {
    id: "privacy",
    label: "Protect your session",
    description: "Avoid sharing codes and sign out on shared devices.",
    icon: Shield,
  },
];

const colorMap = {
  purple: {
    icon: "border-purple-100 bg-purple-50 text-purple-700",
    active: "border-purple-200 bg-purple-50/80",
    number: "bg-purple-700 text-white",
    line: "bg-purple-200",
    text: "text-purple-800",
  },
  blue: {
    icon: "border-blue-100 bg-blue-50 text-blue-700",
    active: "border-blue-200 bg-blue-50/80",
    number: "bg-blue-700 text-white",
    line: "bg-blue-200",
    text: "text-blue-800",
  },
  emerald: {
    icon: "border-emerald-100 bg-emerald-50 text-emerald-700",
    active: "border-emerald-200 bg-emerald-50/80",
    number: "bg-emerald-700 text-white",
    line: "bg-emerald-200",
    text: "text-emerald-800",
  },
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getStepStyle(color) {
  return colorMap[color] || colorMap.purple;
}

function StepStatus({ state }) {
  if (state === "complete") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
        <Check size={12} aria-hidden="true" />
        Complete
      </span>
    );
  }

  if (state === "current") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-700">
        <Circle size={10} fill="currentColor" aria-hidden="true" />
        Current
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
      <Circle size={10} aria-hidden="true" />
      Next
    </span>
  );
}

function StepIcon({ step, state }) {
  const Icon = step.icon;
  const style = getStepStyle(step.color);

  return (
    <div className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", style.icon)}>
      {state === "complete" ? (
        <Check size={19} strokeWidth={2.3} aria-hidden="true" />
      ) : (
        <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
      )}
    </div>
  );
}

function WorkflowStep({ step, state, expanded, onToggle, isLast }) {
  const style = getStepStyle(step.color);

  return (
    <div className="relative">
      {!isLast ? (
        <div
          className={cx("absolute left-5 top-12 h-8 w-px", state === "complete" ? "bg-emerald-200" : "bg-slate-200")}
          aria-hidden="true"
        />
      ) : null}
      <button
        type="button"
        onClick={() => onToggle(step.id)}
        aria-expanded={expanded}
        className={cx(
          "relative flex w-full cursor-pointer items-start gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-100",
          expanded ? style.active : "border-transparent hover:border-slate-200 hover:bg-slate-50",
        )}
      >
        <StepIcon step={step} state={state} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="text-[10px] font-bold tracking-[0.12em] text-slate-400">{step.number}</span>
              <span className="truncate text-sm font-semibold text-slate-900">{step.title}</span>
            </span>
            <span className="flex items-center gap-2">
              <StepStatus state={state} />
              <ChevronDown
                size={16}
                className={cx("shrink-0 text-slate-400 transition-transform", expanded && "rotate-180")}
                aria-hidden="true"
              />
            </span>
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-600">{step.description}</span>
          {expanded ? (
            <span className={cx("mt-3 block rounded-xl border border-white/70 bg-white/70 p-3 text-xs leading-5", style.text)}>
              {step.detail}
            </span>
          ) : null}
        </span>
      </button>
    </div>
  );
}

function ProgressRail({ activeIndex }) {
  const percentage = Math.round(((activeIndex + 1) / flowSteps.length) * 100);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-500">
        <span>Workflow progress</span>
        <span>{percentage}% mapped</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div className="h-full rounded-full bg-purple-600 transition-[width] duration-300" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function CurrentStepBanner({ step, stateLabel, email }) {
  const Icon = step.icon;
  const style = getStepStyle(step.color);

  return (
    <div className={cx("rounded-2xl border p-4", style.active)} role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", style.icon)}>
          <Icon size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{stateLabel}</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{step.title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{email ? `Ready for ${email}` : step.description}</p>
        </div>
        <span className={cx("rounded-full px-2 py-1 text-[10px] font-bold", style.number)}>{step.number}</span>
      </div>
    </div>
  );
}

function ExpectationItem({ item, complete }) {
  const Icon = item.icon;

  return (
    <li className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
        <Icon size={15} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-800">{item.title}</p>
          {complete ? <Check size={14} className="shrink-0 text-emerald-600" aria-hidden="true" /> : null}
        </div>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">{item.description}</p>
      </div>
    </li>
  );
}

function Disclosure({ title, description, icon: Icon, open, onClick, children }) {
  return (
    <div className="border-t border-slate-100 pt-4">
      <button
        type="button"
        onClick={onClick}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-1 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200"
      >
        <Icon size={17} className="shrink-0 text-slate-500" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-900">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
        </span>
        <ChevronDown size={17} className={cx("shrink-0 text-slate-400 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open ? <div className="mt-3 pl-8">{children}</div> : null}
    </div>
  );
}

function AccessibilityList() {
  return (
    <ul className="space-y-2">
      {accessibilityNotes.map((note) => (
        <li key={note} className="flex items-start gap-2 text-xs leading-5 text-slate-600">
          <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
          <span>{note}</span>
        </li>
      ))}
    </ul>
  );
}

function SupportLink({ link, onSelect }) {
  const Icon = link.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(link.id)}
      className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-left transition hover:border-purple-200 hover:bg-purple-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200"
    >
      <Icon size={16} className="mt-0.5 shrink-0 text-purple-700" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-slate-800">{link.label}</span>
        <span className="mt-1 block text-[11px] leading-5 text-slate-500">{link.description}</span>
      </span>
      <ArrowRight size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
    </button>
  );
}

function MiniTimeline({ activeIndex }) {
  return (
    <div className="flex items-center gap-1" aria-label="Login workflow overview">
      {flowSteps.map((step, index) => {
        const complete = index < activeIndex;
        const active = index === activeIndex;

        return (
          <div key={step.id} className="flex min-w-0 flex-1 items-center gap-1">
            <span
              className={cx(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                complete ? "bg-emerald-600 text-white" : active ? "bg-purple-700 text-white" : "bg-slate-100 text-slate-500",
              )}
            >
              {complete ? <Check size={13} aria-hidden="true" /> : index + 1}
            </span>
            {index < flowSteps.length - 1 ? (
              <span className={cx("h-px min-w-2 flex-1", complete ? "bg-emerald-200" : "bg-slate-200")} aria-hidden="true" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ContextNote({ icon: Icon, title, children }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-3">
      <Icon size={15} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
      <p className="text-[11px] leading-5 text-slate-600">
        <span className="font-semibold text-slate-800">{title}: </span>
        {children}
      </p>
    </div>
  );
}

export default function TesterLoginWorkflowPreview({
  email = "",
  step = "email",
  isSending = false,
  isVerifying = false,
  resendCooldown = 0,
  className = "",
}) {
  const [openStep, setOpenStep] = useState("email");
  const [panelOpen, setPanelOpen] = useState(false);
  const [expectationsOpen, setExpectationsOpen] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [selectedSupport, setSelectedSupport] = useState("");

  const activeIndex = Math.max(0, flowSteps.findIndex((item) => item.id === step));
  const activeStep = flowSteps[activeIndex] || flowSteps[0];
  const isBusy = isSending || isVerifying;
  const activeStateLabel = isSending
    ? "Sending verification email"
    : isVerifying
      ? "Checking verification code"
      : step === "otp"
        ? "Verification step"
        : "Current sign-in step";

  const getState = (index) => {
    if (index < activeIndex) return "complete";
    if (index === activeIndex) return "current";
    return "next";
  };

  const toggleStep = (stepId) => {
    setOpenStep((current) => (current === stepId ? "" : stepId));
  };

  const handleSupportSelect = (supportId) => {
    setSelectedSupport((current) => (current === supportId ? "" : supportId));
  };

  return (
    <section
      className={cx("mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white/75 shadow-sm", className)}
      aria-labelledby="tester-login-workflow-title"
    >
      <div className="p-4 sm:p-5">
        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          aria-expanded={panelOpen}
          className="flex w-full cursor-pointer items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-100"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
            <Waypoints size={19} strokeWidth={1.8} aria-hidden="true" />
          </div>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-3">
              <span>
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">How access works</span>
                <span id="tester-login-workflow-title" className="block text-base font-semibold text-slate-950">Your sign-in journey</span>
              </span>
              <ChevronDown size={19} className={cx("shrink-0 text-slate-400 transition-transform", panelOpen && "rotate-180")} aria-hidden="true" />
            </span>
            <span className="mt-1 block text-sm leading-6 text-slate-600">See the three small steps between this page and the tester workspace.</span>
          </span>
        </button>

        {panelOpen ? (
          <div className="mt-5 space-y-5">
            <CurrentStepBanner step={activeStep} stateLabel={activeStateLabel} email={email} />
            <MiniTimeline activeIndex={activeIndex} />
            <ProgressRail activeIndex={activeIndex} />

            <div className="space-y-2">
              {flowSteps.map((flowStep, index) => (
                <WorkflowStep
                  key={flowStep.id}
                  step={flowStep}
                  state={getState(index)}
                  expanded={openStep === flowStep.id}
                  onToggle={toggleStep}
                  isLast={index === flowSteps.length - 1}
                />
              ))}
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-2">
              <ContextNote icon={TimerReset} title="Cooldown">
                {resendCooldown > 0 ? `A fresh code can be requested in ${resendCooldown}s.` : "A resend option appears only when needed."}
              </ContextNote>
              <ContextNote icon={RefreshCw} title="Busy state">
                {isBusy ? "The current request is being processed." : "The form is ready for your next action."}
              </ContextNote>
            </div>

            <Disclosure
              title="What should I expect?"
              description="A compact overview of the access and privacy rules."
              icon={ListChecks}
              open={expectationsOpen}
              onClick={() => setExpectationsOpen((open) => !open)}
            >
              <ul className="space-y-2">
                {expectations.map((item) => (
                  <ExpectationItem key={item.id} item={item} complete={activeIndex > 0} />
                ))}
              </ul>
            </Disclosure>

            <Disclosure
              title="Accessibility notes"
              description="Details about the interaction model for this route."
              icon={Eye}
              open={accessibilityOpen}
              onClick={() => setAccessibilityOpen((open) => !open)}
            >
              <AccessibilityList />
            </Disclosure>

            <Disclosure
              title="Need a quick reminder?"
              description="Open a focused note without leaving the login page."
              icon={LifeBuoy}
              open={supportOpen}
              onClick={() => setSupportOpen((open) => !open)}
            >
              <div className="space-y-2">
                {supportLinks.map((link) => (
                  <SupportLink key={link.id} link={link} onSelect={handleSupportSelect} />
                ))}
                {selectedSupport ? (
                  <p className="rounded-xl border border-purple-100 bg-purple-50/60 p-3 text-xs leading-5 text-purple-800" role="status">
                    {selectedSupport === "help" && "Keep this tab open, check filtered folders, and use the newest verification message."}
                    {selectedSupport === "scope" && "Confirm the target website, account, and test activity are within your approved scope."}
                    {selectedSupport === "privacy" && "Never forward the code. On a shared device, sign out and close the browser tab when finished."}
                  </p>
                ) : null}
              </div>
            </Disclosure>

            <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              <BellRing size={18} className="mt-0.5 shrink-0 text-blue-700" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-blue-900">Keep the latest message</p>
                <p className="mt-1 text-xs leading-5 text-blue-800/80">If you request another code, use the newest email. Older codes may no longer be accepted.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5"><MousePointer2 size={13} aria-hidden="true" />Optional guidance</span>
              <span className="inline-flex items-center gap-1.5"><Link2 size={13} aria-hidden="true" />No navigation required</span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function getWorkflowStep(step = "email") {
  return flowSteps.find((item) => item.id === step) || flowSteps[0];
}

export function getWorkflowIndex(step = "email") {
  const index = flowSteps.findIndex((item) => item.id === step);
  return index < 0 ? 0 : index;
}

export function getWorkflowLabel(step = "email") {
  return getWorkflowStep(step).shortTitle;
}

export function getWorkflowDescription(step = "email") {
  return getWorkflowStep(step).description;
}

export function getWorkflowIcon(step = "email") {
  return getWorkflowStep(step).icon;
}

export function isWorkflowComplete(step = "email") {
  return getWorkflowIndex(step) === flowSteps.length - 1;
}

export function getWorkflowProgress(step = "email") {
  return Math.round(((getWorkflowIndex(step) + 1) / flowSteps.length) * 100);
}

export function getWorkflowSteps() {
  return flowSteps.map((item) => ({ ...item }));
}

export function getWorkflowExpectations() {
  return expectations.map((item) => ({ ...item }));
}

export function getWorkflowAccessibilityNotes() {
  return [...accessibilityNotes];
}

export function getWorkflowSupportLinks() {
  return supportLinks.map((item) => ({ ...item }));
}

export const WORKFLOW_STEP_IDS = Object.freeze(flowSteps.map((item) => item.id));
export const WORKFLOW_STEP_COUNT = flowSteps.length;
export const WORKFLOW_DEFAULT_STEP = flowSteps[0].id;
export const WORKFLOW_FINAL_STEP = flowSteps[flowSteps.length - 1].id;

export const WORKFLOW_COPY = Object.freeze({
  title: "Your sign-in journey",
  eyebrow: "How access works",
  description: "See the three small steps between this page and the tester workspace.",
  inboxReminder: "Use the newest verification message.",
  privacyReminder: "Never share a one-time verification code.",
  scopeReminder: "Only test websites and accounts you are authorized to access.",
});

export function describeWorkflowState({ step = "email", isSending = false, isVerifying = false, cooldown = 0 } = {}) {
  if (isSending) return "Sending verification email";
  if (isVerifying) return "Checking verification code";
  if (step === "otp" && cooldown > 0) return `Verification step; resend available in ${cooldown}s`;
  if (step === "otp") return "Verification step";
  return "Current sign-in step";
}

export function getWorkflowAnnouncement({ step = "email", email = "" } = {}) {
  const item = getWorkflowStep(step);
  return email ? `${item.title}. Ready for ${email}.` : `${item.title}. ${item.description}`;
}

export function getWorkflowAnalyticsPayload({ step = "email", expanded = false } = {}) {
  return {
    component: "tester-login-workflow-preview",
    step,
    stepIndex: getWorkflowIndex(step),
    expanded,
    progress: getWorkflowProgress(step),
  };
}
