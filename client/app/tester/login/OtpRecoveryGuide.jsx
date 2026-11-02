"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Inbox,
  KeyRound,
  LifeBuoy,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  WifiOff,
  X,
} from "lucide-react";

const RECOVERY_PATHS = [
  {
    id: "missing",
    title: "The email has not arrived",
    description: "Check delivery before requesting another code.",
    icon: Inbox,
    tone: "blue",
    steps: [
      {
        id: "check-address",
        title: "Confirm the inbox",
        detail:
          "Make sure the address shown on this page is the inbox you are checking.",
      },
      {
        id: "check-folders",
        title: "Check filtered folders",
        detail:
          "Look in Spam, Junk, Promotions, Updates, and any custom mail filters.",
      },
      {
        id: "check-search",
        title: "Search the mailbox",
        detail:
          "Search for the site name or “verification code” rather than relying only on the inbox view.",
      },
      {
        id: "wait-for-delivery",
        title: "Give delivery a moment",
        detail:
          "Mail delivery can be delayed. Avoid requesting several codes while the newest message is in transit.",
      },
    ],
    action: "resend",
    actionLabel: "Request a new code",
  },
  {
    id: "rejected",
    title: "The code was not accepted",
    description: "Check the message and entry before retrying.",
    icon: KeyRound,
    tone: "rose",
    steps: [
      {
        id: "use-newest-message",
        title: "Use the newest message",
        detail:
          "A resend may invalidate earlier codes. Open the message with the latest timestamp.",
      },
      {
        id: "same-message",
        title: "Use one message only",
        detail:
          "Make sure all six digits come from the same email, not a combination of older messages.",
      },
      {
        id: "replace-entry",
        title: "Replace the current entry",
        detail:
          "Clear the boxes, then paste the full six-digit code or enter it again.",
        action: "clear",
        actionLabel: "Clear code",
      },
      {
        id: "check-expiry",
        title: "Check whether it expired",
        detail:
          "Codes are time-sensitive. If the newest message is old, request a fresh code.",
      },
    ],
    action: "focus",
    actionLabel: "Review entered code",
  },
  {
    id: "entry",
    title: "Entering the code is difficult",
    description: "Use the keyboard shortcuts or paste the whole code.",
    icon: ClipboardCheck,
    tone: "violet",
    steps: [
      {
        id: "paste-any-box",
        title: "Paste into any box",
        detail:
          "Copy the six digits and paste into any digit box; the form distributes them automatically.",
      },
      {
        id: "navigate-boxes",
        title: "Move between digits",
        detail:
          "Focus advances as you type. Use the arrow keys to move between boxes.",
      },
      {
        id: "correct-digit",
        title: "Correct an individual digit",
        detail:
          "Select a box and type its replacement. Backspace clears the current or previous box.",
      },
      {
        id: "submit-shortcut",
        title: "Submit from the keyboard",
        detail:
          "Press Ctrl+Enter on Windows/Linux or Command+Enter on macOS to verify.",
      },
    ],
    action: "focus",
    actionLabel: "Continue entering code",
  },
  {
    id: "connection",
    title: "The page is offline",
    description: "Keep the code here and retry after reconnecting.",
    icon: WifiOff,
    tone: "amber",
    steps: [
      {
        id: "keep-page",
        title: "Keep this page open",
        detail:
          "The code remains in the current page while you reconnect; it is not saved to storage.",
      },
      {
        id: "check-network",
        title: "Restore your connection",
        detail:
          "Reconnect to Wi-Fi or mobile data, then wait for the online notice.",
      },
      {
        id: "submit-again",
        title: "Submit when online",
        detail:
          "Verification and resend are paused offline. The form will not queue a request.",
      },
    ],
    action: "focus",
    actionLabel: "Return to verification",
  },
];

const TONE_STYLES = {
  blue: {
    icon: "bg-sky-50 text-sky-700",
    selected: "border-sky-300 bg-sky-50/60 ring-sky-100",
    progress: "bg-sky-600",
    check: "border-sky-300 bg-sky-600 text-white",
  },
  rose: {
    icon: "bg-rose-50 text-rose-700",
    selected: "border-rose-300 bg-rose-50/60 ring-rose-100",
    progress: "bg-rose-600",
    check: "border-rose-300 bg-rose-600 text-white",
  },
  violet: {
    icon: "bg-violet-50 text-violet-700",
    selected: "border-violet-300 bg-violet-50/60 ring-violet-100",
    progress: "bg-violet-600",
    check: "border-violet-300 bg-violet-600 text-white",
  },
  amber: {
    icon: "bg-amber-50 text-amber-800",
    selected: "border-amber-300 bg-amber-50/60 ring-amber-100",
    progress: "bg-amber-600",
    check: "border-amber-300 bg-amber-600 text-white",
  },
};

function getPath(pathId) {
  return RECOVERY_PATHS.find((path) => path.id === pathId) || RECOVERY_PATHS[0];
}

function RecoveryPathCard({ path, selected, onSelect }) {
  const Icon = path.icon;
  const tone = TONE_STYLES[path.tone];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex min-h-[76px] items-start gap-2.5 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
        selected
          ? `${tone.selected} ring-2`
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone.icon}`}
        aria-hidden="true"
      >
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold text-slate-800">
          {path.title}
        </span>
        <span className="mt-1 block text-[10px] leading-4 text-slate-500">
          {path.description}
        </span>
      </span>
      {selected && (
        <CheckCircle2
          size={15}
          className="mt-0.5 shrink-0 text-violet-700"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function RecoveryStep({
  step,
  checked,
  tone,
  disabled,
  onToggle,
  onAction,
}) {
  const actionStep = Boolean(step.action);
  const style = TONE_STYLES[tone];

  return (
    <li className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-white p-3">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={checked}
        aria-label={`${checked ? "Mark incomplete" : "Mark complete"}: ${step.title}`}
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 ${
          checked
            ? style.check
            : "border-slate-300 bg-white text-transparent hover:border-violet-400"
        }`}
      >
        <Check size={12} aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`text-[11px] font-semibold ${
            checked ? "text-slate-500" : "text-slate-800"
          }`}
        >
          {step.title}
          {checked && (
            <span className="ml-1.5 text-[9px] font-medium text-emerald-700">
              Done
            </span>
          )}
        </p>
        <p className="mt-1 text-[10px] leading-4 text-slate-500">
          {step.detail}
        </p>
        {actionStep && (
          <button
            type="button"
            onClick={onAction}
            disabled={disabled}
            className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            {step.actionLabel}
            <ArrowRight size={11} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  );
}

function RecoveryProgress({ completed, total, tone }) {
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const path = TONE_STYLES[tone];

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px]">
        <span className="font-medium text-slate-600">Recovery checklist</span>
        <span className="tabular-nums text-slate-500">
          {completed} of {total} complete
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label="Recovery checklist progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        aria-valuetext={`${completed} of ${total} recovery steps complete`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${path.progress}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function getRecommendedAction({
  path,
  isOnline,
  isSending,
  isVerifying,
  resendCooldown,
  enteredDigits,
}) {
  if (isSending) {
    return {
      label: "Sending code...",
      disabled: true,
      icon: LoaderCircle,
      reason: "Wait for the current request to finish.",
    };
  }
  if (isVerifying) {
    return {
      label: "Verifying code...",
      disabled: true,
      icon: LoaderCircle,
      reason: "Wait for verification to finish before starting another action.",
    };
  }
  if (path.action === "resend" && !isOnline) {
    return {
      label: "Reconnect to request a code",
      disabled: true,
      icon: WifiOff,
      reason: "Code requests are not queued while you are offline.",
    };
  }
  if (path.action === "resend" && resendCooldown > 0) {
    return {
      label: `Wait ${resendCooldown}s to resend`,
      disabled: true,
      icon: Clock3,
      reason: "The resend control becomes available when the countdown ends.",
    };
  }
  if (path.action === "resend") {
    return {
      label: path.actionLabel,
      disabled: false,
      icon: RefreshCw,
      reason: "A new request can invalidate a previously sent code.",
    };
  }
  if (path.id === "rejected" && enteredDigits > 0) {
    return {
      label: "Clear and enter the newest code",
      disabled: false,
      icon: X,
      reason: "Clearing affects only the digits currently in these boxes.",
    };
  }
  return {
    label: path.actionLabel,
    disabled: false,
    icon: ArrowRight,
    reason: path.id === "connection" && !isOnline
      ? "Reconnect first; the entered digits will remain in this page."
      : "Return to the code fields when you are ready.",
  };
}

export default function OtpRecoveryGuide({
  onResend,
  onFocusCode,
  onClearCode,
  resendCooldown = 0,
  enteredDigits = 0,
  isOnline = true,
  isSending = false,
  isVerifying = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePathId, setActivePathId] = useState("missing");
  const [completedSteps, setCompletedSteps] = useState({});
  const [statusMessage, setStatusMessage] = useState("");

  const activePath = getPath(activePathId);
  const currentSteps = completedSteps[activePath.id] || [];
  const completedSet = useMemo(
    () => new Set(currentSteps),
    [currentSteps],
  );
  const recommendedAction = getRecommendedAction({
    path: activePath,
    isOnline,
    isSending,
    isVerifying,
    resendCooldown,
    enteredDigits,
  });
  const RecommendedIcon = recommendedAction.icon;
  const ActiveIcon = activePath.icon;
  const allStepsComplete = currentSteps.length === activePath.steps.length;
  const activePathIndex = RECOVERY_PATHS.findIndex(
    (path) => path.id === activePath.id,
  );

  const toggleStep = (stepId) => {
    setCompletedSteps((current) => {
      const currentStepsForPath = current[activePath.id] || [];
      const nextSteps = currentStepsForPath.includes(stepId)
        ? currentStepsForPath.filter((id) => id !== stepId)
        : [...currentStepsForPath, stepId];

      return { ...current, [activePath.id]: nextSteps };
    });
    setStatusMessage("");
  };

  const selectPath = (pathId) => {
    setActivePathId(pathId);
    setStatusMessage("");
  };

  const movePath = (direction) => {
    const nextIndex =
      (activePathIndex + direction + RECOVERY_PATHS.length) %
      RECOVERY_PATHS.length;
    selectPath(RECOVERY_PATHS[nextIndex].id);
  };

  const runAction = async () => {
    if (recommendedAction.disabled) return;

    if (activePath.action === "resend") {
      const sent = await onResend?.();
      setStatusMessage(
        sent
          ? "A new code was requested. Check the newest email message."
          : "The request was not completed. Review the message on the page and try again.",
      );
      return;
    }

    if (activePath.id === "rejected" && enteredDigits > 0) {
      onClearCode?.();
      setStatusMessage("The entered digits were cleared. Enter the newest code.");
      return;
    }

    onFocusCode?.();
    setIsOpen(false);
    setStatusMessage("");
  };

  const resetPath = () => {
    setCompletedSteps((current) => ({
      ...current,
      [activePath.id]: [],
    }));
    setStatusMessage("This checklist was reset.");
  };

  const closeGuide = () => {
    setIsOpen(false);
    setStatusMessage("");
  };

  return (
    <section
      className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white"
      aria-labelledby="otp-recovery-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-50 text-violet-700">
            <LifeBuoy size={15} aria-hidden="true" />
          </span>
          <div>
            <h2
              id="otp-recovery-title"
              className="text-xs font-semibold text-slate-800"
            >
              Guided sign-in recovery
            </h2>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Follow a short checklist for the problem you are seeing.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls="otp-recovery-content"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          {isOpen ? "Close guide" : "Open guide"}
          <ChevronDown
            size={13}
            aria-hidden="true"
            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {isOpen && (
        <div
          id="otp-recovery-content"
          className="space-y-4 border-t border-slate-100 p-3"
        >
          <div
            className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${
              isOnline
                ? "border-slate-200 bg-slate-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            {isOnline ? (
              <CircleHelp
                size={15}
                className="mt-0.5 shrink-0 text-slate-500"
                aria-hidden="true"
              />
            ) : (
              <WifiOff
                size={15}
                className="mt-0.5 shrink-0 text-amber-800"
                aria-hidden="true"
              />
            )}
            <p
              className={`text-[10px] leading-4 ${
                isOnline ? "text-slate-600" : "text-amber-900"
              }`}
            >
              {isOnline
                ? "Choose the situation that best matches what is happening. Your progress stays in this page only."
                : "You are offline. The guide will not send or queue requests; the code remains only in the current form."}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {RECOVERY_PATHS.map((path) => (
              <RecoveryPathCard
                key={path.id}
                path={path}
                selected={activePath.id === path.id}
                onSelect={() => selectPath(path.id)}
              />
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                    TONE_STYLES[activePath.tone].icon
                  }`}
                >
                  <ActiveIcon size={15} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-slate-800">
                    {activePath.title}
                  </h3>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Step through the checks, then use the suggested action.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => movePath(-1)}
                  aria-label="Previous recovery topic"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <ArrowLeft size={13} aria-hidden="true" />
                </button>
                <span className="px-1 text-[9px] tabular-nums text-slate-400">
                  {activePathIndex + 1}/{RECOVERY_PATHS.length}
                </span>
                <button
                  type="button"
                  onClick={() => movePath(1)}
                  aria-label="Next recovery topic"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="mt-4">
              <RecoveryProgress
                completed={completedSet.size}
                total={activePath.steps.length}
                tone={activePath.tone}
              />
              <ol className="mt-3 space-y-2">
                {activePath.steps.map((step) => (
                  <RecoveryStep
                    key={step.id}
                    step={step}
                    checked={completedSet.has(step.id)}
                    tone={activePath.tone}
                    disabled={isSending || isVerifying}
                    onToggle={() => toggleStep(step.id)}
                    onAction={() => {
                      if (isSending || isVerifying) return;
                      if (step.action === "clear") onClearCode?.();
                      if (step.action === "focus") onFocusCode?.();
                      setStatusMessage(
                        step.action === "clear"
                          ? "The entered digits were cleared."
                          : "The code fields are ready for editing.",
                      );
                    }}
                  />
                ))}
              </ol>
            </div>

            <div className="mt-3 rounded-xl border border-violet-100 bg-white p-3">
              <div className="flex items-start gap-2">
                <ShieldCheck
                  size={14}
                  className="mt-0.5 shrink-0 text-violet-700"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-slate-800">
                    Suggested next action
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500">
                    {recommendedAction.reason}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={runAction}
                disabled={recommendedAction.disabled}
                className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <RecommendedIcon
                  size={13}
                  aria-hidden="true"
                  className={isSending || isVerifying ? "animate-spin" : ""}
                />
                {recommendedAction.label}
              </button>
              {activePath.action === "resend" && resendCooldown > 0 && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-[9px] text-slate-500">
                  <Clock3 size={11} aria-hidden="true" />
                  Resend available in {resendCooldown} seconds.
                </p>
              )}
              {allStepsComplete && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-[9px] font-medium text-emerald-700">
                  <CheckCircle2 size={11} aria-hidden="true" />
                  Checklist complete. Continue when ready.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={resetPath}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <RefreshCw size={11} aria-hidden="true" />
              Reset this checklist
            </button>
            <button
              type="button"
              onClick={closeGuide}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              Done for now
              <X size={11} aria-hidden="true" />
            </button>
          </div>

          {statusMessage && (
            <p
              role="status"
              aria-live="polite"
              className="rounded-lg bg-emerald-50 px-3 py-2 text-[10px] text-emerald-800"
            >
              {statusMessage}
            </p>
          )}
          <p className="text-center text-[9px] leading-4 text-slate-400">
            Checklist progress is kept in memory only. Verification digits and
            mailbox contents are never included.
          </p>
        </div>
      )}
    </section>
  );
}
