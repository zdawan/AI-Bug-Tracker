"use client";

import {
  useId,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Clock3,
  EyeOff,
  Fingerprint,
  Info,
  LockKeyhole,
  Shield,
  ShieldCheck,
  TimerReset,
  Trash2,
  X,
} from "lucide-react";

const IDLE_TIMEOUT_OPTIONS = [
  {
    minutes: 0,
    title: "Off",
    description: "Keep the code until you clear it or leave this page.",
    label: "No idle timer",
  },
  {
    minutes: 1,
    title: "1 minute",
    description: "Clear the code quickly when stepping away.",
    label: "Clear after one minute",
  },
  {
    minutes: 3,
    title: "3 minutes",
    description: "A short break before the form is cleared.",
    label: "Clear after three minutes",
  },
  {
    minutes: 5,
    title: "5 minutes",
    description: "A longer pause before clearing the code.",
    label: "Clear after five minutes",
  },
  {
    minutes: 10,
    title: "10 minutes",
    description: "Allow more time away from the form.",
    label: "Clear after ten minutes",
  },
];

function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

function getTimeoutOption(minutes) {
  return (
    IDLE_TIMEOUT_OPTIONS.find((option) => option.minutes === minutes) ||
    IDLE_TIMEOUT_OPTIONS[0]
  );
}

function PrivacyOption({ option, selected, onSelect, disabled }) {
  return (
    <label
      className={`flex min-h-[72px] items-start gap-2.5 rounded-xl border p-3 transition focus-within:ring-2 focus-within:ring-violet-500 focus-within:ring-offset-2 ${
        selected
          ? "border-violet-300 bg-violet-50/70 ring-1 ring-violet-100"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <input
        type="radio"
        name="otp-idle-clear-timeout"
        value={option.minutes}
        checked={selected}
        aria-label={option.label}
        disabled={disabled}
        onChange={() => onSelect(option.minutes)}
        className="sr-only"
      />
      <span
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
          selected
            ? "border-violet-600 bg-violet-600 text-white"
            : "border-slate-300 bg-white text-transparent"
        }`}
        aria-hidden="true"
      >
        <Check size={12} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold text-slate-800">
          {option.title}
        </span>
        <span className="mt-1 block text-[10px] leading-4 text-slate-500">
          {option.description}
        </span>
      </span>
    </label>
  );
}

function PrivacyGuarantee({ icon: Icon, title, description }) {
  return (
    <li className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-white px-3 py-2.5">
      <span
        className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600"
        aria-hidden="true"
      >
        <Icon size={13} />
      </span>
      <span>
        <span className="block text-[10px] font-semibold text-slate-700">
          {title}
        </span>
        <span className="mt-0.5 block text-[9px] leading-4 text-slate-500">
          {description}
        </span>
      </span>
    </li>
  );
}

function PrivacyStatus({
  isEnabled,
  hasCode,
  secondsRemaining,
  option,
}) {
  const progress = useMemo(() => {
    if (!isEnabled || !hasCode) return 0;
    const total = option.minutes * 60;
    return Math.max(
      0,
      Math.min(100, ((total - secondsRemaining) / total) * 100),
    );
  }, [hasCode, isEnabled, option.minutes, secondsRemaining]);

  if (!isEnabled) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <Info
          size={14}
          className="mt-0.5 shrink-0 text-slate-500"
          aria-hidden="true"
        />
        <p className="text-[10px] leading-4 text-slate-600">
          The inactivity timer is off. The code remains only in this page’s
          memory and is cleared when you clear it or leave the page.
        </p>
      </div>
    );
  }

  if (!hasCode) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <TimerReset
          size={14}
          className="mt-0.5 shrink-0 text-slate-500"
          aria-hidden="true"
        />
        <p className="text-[10px] leading-4 text-slate-600">
          The timer starts after you enter a digit and resets when you interact
          with this sign-in form.
        </p>
      </div>
    );
  }

  const isWarning = secondsRemaining <= 15;

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        isWarning
          ? "border-amber-200 bg-amber-50"
          : "border-emerald-200 bg-emerald-50/60"
      }`}
      role={isWarning ? "status" : undefined}
      aria-live={isWarning ? "polite" : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {isWarning ? (
            <AlertTriangle
              size={14}
              className="mt-0.5 shrink-0 text-amber-800"
              aria-hidden="true"
            />
          ) : (
            <ShieldCheck
              size={14}
              className="mt-0.5 shrink-0 text-emerald-700"
              aria-hidden="true"
            />
          )}
          <p
            className={`text-[10px] leading-4 ${
              isWarning ? "text-amber-900" : "text-emerald-900"
            }`}
          >
            {isWarning
              ? "The code will be cleared soon. Interact with the form to keep it."
              : "The code will clear after the selected period without activity."}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-1 font-mono text-xs font-semibold tabular-nums ${
            isWarning
              ? "bg-amber-100 text-amber-900"
              : "bg-emerald-100 text-emerald-900"
          }`}
          aria-label={`${formatCountdown(secondsRemaining)} until code is cleared`}
        >
          {formatCountdown(secondsRemaining)}
        </span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80"
        role="progressbar"
        aria-label="Inactivity timeout elapsed"
        aria-valuemin={0}
        aria-valuemax={option.minutes * 60}
        aria-valuenow={option.minutes * 60 - secondsRemaining}
        aria-valuetext={`${formatCountdown(secondsRemaining)} remaining`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${
            isWarning ? "bg-amber-600" : "bg-emerald-600"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function PrivacyDetails({
  onToggle,
  headingId,
  contentId,
  timeoutMinutes,
  onTimeoutChange,
  hasCode,
  secondsRemaining,
  isBusy,
}) {
  const currentOption = getTimeoutOption(timeoutMinutes);
  return (
    <div
      id={contentId}
      className="space-y-3 border-t border-slate-100 p-3"
      aria-labelledby={headingId}
    >
      <div className="flex items-start gap-2.5 rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2.5">
        <Shield
          size={14}
          className="mt-0.5 shrink-0 text-violet-700"
          aria-hidden="true"
        />
        <p className="text-[10px] leading-4 text-violet-900">
          This is an optional privacy control. The timer is disabled by
          default, applies only while a code is present, and is never saved as
          a browser preference.
        </p>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-semibold text-slate-700">
          Clear the code after
        </p>
        <div
          role="radiogroup"
          aria-label="Clear code after inactivity"
          className="grid gap-2 sm:grid-cols-2"
        >
          {IDLE_TIMEOUT_OPTIONS.map((option) => (
            <PrivacyOption
              key={option.minutes}
              option={option}
              selected={timeoutMinutes === option.minutes}
              onSelect={onTimeoutChange}
              disabled={isBusy}
            />
          ))}
        </div>
      </div>

      <PrivacyStatus
        isEnabled={currentOption.minutes > 0}
        hasCode={hasCode}
        secondsRemaining={secondsRemaining}
        option={currentOption}
      />

      <ul className="grid gap-2 sm:grid-cols-2">
        <PrivacyGuarantee
          icon={LockKeyhole}
          title="Code stays in page memory"
          description="The code is not written to local storage, session storage, or a cookie."
        />
        <PrivacyGuarantee
          icon={EyeOff}
          title="Timer does not reveal the code"
          description="The existing visibility control and automatic hiding continue to apply."
        />
        <PrivacyGuarantee
          icon={Fingerprint}
          title="Activity means form interaction"
          description="Typing, pasting, focusing, or using a control in this panel resets the countdown."
        />
        <PrivacyGuarantee
          icon={Trash2}
          title="Only entered digits are cleared"
          description="The timer never sends the code, changes the email address, or requests a new code."
        />
      </ul>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onToggle}
          aria-controls={contentId}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          Close privacy settings
          <X size={11} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default function OtpPrivacyPanel({
  timeoutMinutes,
  onTimeoutChange,
  hasCode,
  secondsRemaining,
  isBusy = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const headingId = useId();
  const contentId = useId();
  const currentOption = getTimeoutOption(timeoutMinutes);
  const isEnabled = currentOption.minutes > 0;

  const handleToggle = () => {
    setIsOpen((open) => !open);
  };

  return (
    <section
      className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white"
      aria-labelledby={headingId}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
            <LockKeyhole size={15} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2
              id={headingId}
              className="text-xs font-semibold text-slate-800"
            >
              Inactivity privacy
            </h2>
            <p className="mt-0.5 text-[10px] text-slate-500">
              {isEnabled
                ? `Code clears after ${currentOption.title} without interaction.`
                : "Choose whether an idle code should be cleared automatically."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold text-violet-700 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          {isOpen ? "Close settings" : "Privacy settings"}
          <ChevronDown
            size={13}
            aria-hidden="true"
            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {isOpen && (
        <PrivacyDetails
          onToggle={handleToggle}
          headingId={headingId}
          contentId={contentId}
          timeoutMinutes={timeoutMinutes}
          onTimeoutChange={onTimeoutChange}
          hasCode={hasCode}
          secondsRemaining={secondsRemaining}
          isBusy={isBusy}
        />
      )}

      <div className="border-t border-slate-100 p-3">
        {!isOpen && (
          <PrivacyStatus
            isEnabled={isEnabled}
            hasCode={hasCode}
            secondsRemaining={secondsRemaining}
            option={currentOption}
          />
        )}
      </div>
    </section>
  );
}
