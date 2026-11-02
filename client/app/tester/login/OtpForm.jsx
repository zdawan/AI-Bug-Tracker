"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardPaste,
  Eye,
  EyeOff,
  RefreshCw,
  Clock3,
} from "lucide-react";
import { ShieldCheck } from "lucide-react";
import OtpHelpPanel from "./OtpHelpPanel";
import OtpActivityPanel from "./OtpActivityPanel";

const CODE_REVEAL_SECONDS = 15;
const AUTO_VERIFY_STORAGE_KEY = "testerOtpAutoVerify";
const RESEND_COOLDOWN_SECONDS = 30;
const MAX_ACTIVITY_EVENTS = 50;

export default function OtpForm({
  email,
  onBack,
  onResend,
  resendCooldown = 0,
  isSending = false,
  isVerifying = false,
  error = "",
  onCodeChange,
  onVerify,
}) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [codeError, setCodeError] = useState("");
  const [clipboardMessage, setClipboardMessage] = useState("");
  const [isCodeVisible, setIsCodeVisible] = useState(true);
  const [autoVerify, setAutoVerify] = useState(false);
  const [autoVerifyPreferenceLoaded, setAutoVerifyPreferenceLoaded] =
    useState(false);
  const [autoVerifyPreferenceMessage, setAutoVerifyPreferenceMessage] =
    useState("");
  const [revealSeconds, setRevealSeconds] = useState(0);
  const [activityEvents, setActivityEvents] = useState([]);
  const activitySequence = useRef(0);
  const previousRequestState = useRef(false);
  const previousVerifyState = useRef(false);
  const inputRefs = useRef([]);
  const focusedInputIndex = useRef(0);
  const revealTimer = useRef(null);
  const enteredDigits = otp.filter(Boolean).length;
  const visibleError = codeError || error;

  const recordActivity = (type, detail, source = "") => {
    activitySequence.current += 1;
    const entry = {
      id: `otp-event-${Date.now()}-${activitySequence.current}`,
      type,
      detail,
      source,
      timestamp: Date.now(),
    };
    setActivityEvents((current) =>
      [entry, ...current].slice(0, MAX_ACTIVITY_EVENTS),
    );
  };

  useEffect(() => {
    const requestStarted =
      isSending && !previousRequestState.current;
    const requestFinished =
      !isSending && previousRequestState.current;

    if (requestStarted) {
      recordActivity(
        "request_started",
        "A request was sent to deliver a verification code.",
      );
    } else if (requestFinished) {
      recordActivity(
        error ? "request_failed" : "request_finished",
        error
          ? "The code request returned an error. Review the message above."
          : "The code request completed successfully.",
      );
    }

    previousRequestState.current = isSending;
  }, [error, isSending]);

  useEffect(() => {
    const verificationStarted =
      isVerifying && !previousVerifyState.current;
    const verificationFinished =
      !isVerifying && previousVerifyState.current;

    if (verificationStarted) {
      recordActivity(
        "verify_started",
        "The six-digit code was submitted for verification.",
      );
    } else if (verificationFinished) {
      recordActivity(
        error ? "verify_failed" : "verify_succeeded",
        error
          ? "The code was not accepted. The code itself is never recorded."
          : "The server accepted the verification request.",
      );
    }

    previousVerifyState.current = isVerifying;
  }, [error, isVerifying]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    try {
      setAutoVerify(
        window.localStorage.getItem(AUTO_VERIFY_STORAGE_KEY) === "true",
      );
    } catch {
      setAutoVerifyPreferenceMessage(
        "This browser does not allow saving the auto-verify preference.",
      );
    } finally {
      setAutoVerifyPreferenceLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!autoVerifyPreferenceLoaded) return;

    try {
      window.localStorage.setItem(
        AUTO_VERIFY_STORAGE_KEY,
        String(autoVerify),
      );
      setAutoVerifyPreferenceMessage(
        autoVerify
          ? "Auto-verify preference saved in this browser."
          : "Auto-verify preference saved as off in this browser.",
      );
    } catch {
      setAutoVerifyPreferenceMessage(
        "Could not save this preference. Auto-verify applies to this visit only.",
      );
    }
  }, [autoVerify, autoVerifyPreferenceLoaded]);

  useEffect(
    () => () => {
      if (revealTimer.current !== null) {
        window.clearInterval(revealTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    const hideCode = () => {
      if (!isCodeVisible) return;

      stopRevealTimer();
      setRevealSeconds(0);
      setIsCodeVisible(false);
    };
    const hideCodeWhenHidden = () => {
      if (document.visibilityState === "hidden") hideCode();
    };

    window.addEventListener("blur", hideCode);
    document.addEventListener("visibilitychange", hideCodeWhenHidden);

    return () => {
      window.removeEventListener("blur", hideCode);
      document.removeEventListener("visibilitychange", hideCodeWhenHidden);
    };
  }, [isCodeVisible]);

  const stopRevealTimer = () => {
    if (revealTimer.current !== null) {
      window.clearInterval(revealTimer.current);
      revealTimer.current = null;
    }
  };

  const startRevealTimer = () => {
    if (!isCodeVisible) return;

    stopRevealTimer();
    setRevealSeconds(CODE_REVEAL_SECONDS);
    revealTimer.current = window.setInterval(() => {
      setRevealSeconds((remaining) => {
        if (remaining <= 1) {
          stopRevealTimer();
          setIsCodeVisible(false);
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);
  };

  const applyPastedCode = (value, currentIndex) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return false;

    const isCompleteCode = digits.length >= otp.length;
    const startIndex = isCompleteCode ? 0 : currentIndex;
    const pastedDigits = digits
      .slice(0, otp.length - startIndex)
      .split("");
    const updatedOtp = isCompleteCode
      ? Array(otp.length).fill("")
      : [...otp];

    pastedDigits.forEach((digit, offset) => {
      updatedOtp[startIndex + offset] = digit;
    });

    setOtp(updatedOtp);
    setCodeError("");
    setClipboardMessage("");
    recordActivity(
      "code_pasted",
      `${updatedOtp.filter(Boolean).length} of 6 digits were filled. The code value was not recorded.`,
      "Paste",
    );
    startRevealTimer();
    onCodeChange?.();

    const firstEmptyIndex = updatedOtp.findIndex(
      (digit, index) => index >= startIndex && !digit,
    );
    inputRefs.current[firstEmptyIndex < 0 ? otp.length - 1 : firstEmptyIndex]?.focus();
    return updatedOtp.join("");
  };

  const maybeAutoVerify = (event, code) => {
    if (
      !autoVerify ||
      isVerifying ||
      isSending ||
      !/^\d{6}$/.test(code)
    ) {
      return;
    }

    setCodeError("");
    onVerify?.(event, code);
  };

  const handleOtpChange = (value, index, event) => {
    setCodeError("");
    setClipboardMessage("");
    const digits = value.replace(/\D/g, "");

    if (digits.length > 1) {
      const completedCode = applyPastedCode(digits, index);
      maybeAutoVerify(event, completedCode || "");
      return;
    }

    const updatedOtp = [...otp];
    updatedOtp[index] = digits;
    setOtp(updatedOtp);
    if (digits) {
      recordActivity(
        "code_edited",
        `${updatedOtp.filter(Boolean).length} of 6 digits are currently entered.`,
        "Keyboard",
      );
    }
    if (digits) startRevealTimer();
    onCodeChange?.();
    maybeAutoVerify(event, updatedOtp.join(""));

    if (digits && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (event, index) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const targetIndex = otp[index] ? index : Math.max(0, index - 1);
      if (targetIndex !== index || otp[index]) {
        setOtp((current) => {
          const updatedOtp = [...current];
          updatedOtp[targetIndex] = "";
          return updatedOtp;
        });
        setCodeError("");
        setClipboardMessage("");
        onCodeChange?.();
      }
      inputRefs.current[targetIndex]?.focus();
      return;
    }

    if (event.key === "Delete") {
      event.preventDefault();
      if (otp[index]) {
        setOtp((current) => {
          const updatedOtp = [...current];
          updatedOtp[index] = "";
          return updatedOtp;
        });
        setCodeError("");
        setClipboardMessage("");
        onCodeChange?.();
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowRight" && index < 5) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      inputRefs.current[0]?.focus();
    }

    if (event.key === "End") {
      event.preventDefault();
      inputRefs.current[5]?.focus();
    }
  };

  const handlePaste = (event, index) => {
    event.preventDefault();
    const clipboardText = event.clipboardData.getData("text");
    const completedCode = applyPastedCode(clipboardText, index);
    if (!completedCode) {
      recordActivity(
        "code_pasted",
        "No digits were found in the pasted text. No clipboard contents were saved.",
        "Paste",
      );
    }
    maybeAutoVerify(event, completedCode || "");
  };

  const handlePasteFromClipboard = async (event) => {
    setClipboardMessage("");

    try {
      if (!navigator.clipboard?.readText) {
        setClipboardMessage(
          "Clipboard access is unavailable. Paste into a code box instead.",
        );
        return;
      }

      const clipboardText = await navigator.clipboard.readText();
      const pastedCode = applyPastedCode(clipboardText, 0);

      if (!pastedCode) {
        setClipboardMessage(
          "No digits were found. Copy the code first, then try again.",
        );
        return;
      }

      setClipboardMessage("Verification code pasted from clipboard.");
      maybeAutoVerify(event, pastedCode);
    } catch {
      setClipboardMessage(
        "Clipboard access was blocked. Paste into a code box instead.",
      );
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (isVerifying || isSending) return;

    const enteredOtp = otp.join("");
    if (!/^\d{6}$/.test(enteredOtp)) {
      setCodeError("Enter all 6 digits before continuing.");
      setClipboardMessage("");
      recordActivity(
        "code_incomplete",
        "Verification was not submitted because the code is incomplete.",
        "Form",
      );
      const firstEmptyIndex = otp.findIndex((digit) => !digit);
      inputRefs.current[firstEmptyIndex < 0 ? 0 : firstEmptyIndex]?.focus();
      return;
    }

    setCodeError("");
    onVerify?.(event, enteredOtp);
  };

  const handleFormKeyDown = (event) => {
    if (
      event.key !== "Enter" ||
      (!event.ctrlKey && !event.metaKey) ||
      event.altKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();
    if (isVerifying || isSending) return;

    const form = event.currentTarget;
    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
    } else {
      form.querySelector('button[type="submit"]')?.click();
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || isSending || !onResend) return;

    recordActivity(
      "resend_requested",
      "A request was made to send a new verification code.",
      "Resend control",
    );
    const sent = await onResend();
    if (sent) {
      stopRevealTimer();
      setRevealSeconds(0);
      setOtp(["", "", "", "", "", ""]);
      setIsCodeVisible(true);
      setCodeError("");
      setClipboardMessage("");
      onCodeChange?.();
      inputRefs.current[0]?.focus();
    }
  };

  const handleResetCode = () => {
    if (enteredDigits > 0) {
      recordActivity(
        "code_cleared",
        `${enteredDigits} entered digits were cleared. The code value was not recorded.`,
        "Clear control",
      );
    }
    stopRevealTimer();
    setRevealSeconds(0);
    setOtp(["", "", "", "", "", ""]);
    setIsCodeVisible(true);
    setCodeError("");
    setClipboardMessage("");
    onCodeChange?.();
    inputRefs.current[0]?.focus();
  };

  const focusCodeForCorrection = () => {
    const firstEmptyIndex = otp.findIndex((digit) => !digit);
    const targetIndex = firstEmptyIndex < 0 ? 0 : firstEmptyIndex;
    const targetInput = inputRefs.current[targetIndex];

    focusedInputIndex.current = targetIndex;
    targetInput?.focus();
    targetInput?.select();
  };

  const toggleCodeVisibility = () => {
    recordActivity(
      "visibility_changed",
      isCodeVisible
        ? "The verification code was hidden."
        : "The verification code was revealed.",
      "Visibility control",
    );
    if (isCodeVisible) {
      stopRevealTimer();
      setRevealSeconds(0);
      setIsCodeVisible(false);
    } else {
      setIsCodeVisible(true);
      startRevealTimer();
    }

    window.requestAnimationFrame(() => {
      const input = inputRefs.current[focusedInputIndex.current];
      input?.focus();
      input?.select();
    });
  };

  const handleAutoVerifyChange = (enabled) => {
    setAutoVerify(enabled);
    recordActivity(
      "auto_verify_changed",
      enabled
        ? "Automatic verification was enabled."
        : "Automatic verification was disabled.",
      "Preference",
    );
  };

  const clearActivity = () => {
    setActivityEvents([]);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
        aria-label="Back to email entry"
      >
        <ArrowLeft size={18} />
        Back
      </button>
      <div className="mb-5 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-100 bg-purple-50 text-purple-700">
          <ShieldCheck size={26} strokeWidth={1.8} />
        </div>
      </div>
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Verify your{" "}
          <span className="font-normal italic [font-family:Georgia,serif]">
            email
          </span>
        </h1>

        <p className="mx-auto mt-4 max-w-[340px] text-base leading-7 text-slate-600">
          Enter the six-digit verification code sent to your email.
        </p>

        {email.trim() && (
          <p className="mt-2 break-all text-sm font-semibold text-slate-900">
            {email}
          </p>
        )}
      </header>

      <form
        onSubmit={handleSubmit}
        onKeyDown={handleFormKeyDown}
        aria-busy={isVerifying || isSending}
        noValidate
        className="space-y-6"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label
              id="tester-otp-label"
              className="block text-sm font-semibold text-slate-800"
            >
              Verification code
            </label>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                disabled={isVerifying || isSending}
                aria-label="Paste verification code from clipboard"
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ClipboardPaste size={14} aria-hidden="true" />
                <span className="hidden sm:inline">Paste</span>
              </button>
              <button
                type="button"
                onClick={toggleCodeVisibility}
                disabled={isVerifying || isSending || enteredDigits === 0}
                aria-controls="tester-otp-fields"
                aria-label={
                  isCodeVisible
                    ? "Hide verification code"
                    : "Show verification code"
                }
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCodeVisible ? (
                  <EyeOff size={14} aria-hidden="true" />
                ) : (
                  <Eye size={14} aria-hidden="true" />
                )}
                {isCodeVisible ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                onClick={handleResetCode}
                disabled={isVerifying || isSending || enteredDigits === 0}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={13} aria-hidden="true" />
                Clear code
              </button>
            </div>
          </div>
          {isCodeVisible && revealSeconds > 0 && (
            <p className="text-right text-[10px] text-slate-500">
              Code hides in {formatTime(revealSeconds)} for privacy.
            </p>
          )}

          <div
            id="tester-otp-fields"
            className="flex justify-center gap-2 sm:gap-3"
          >
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                type={isCodeVisible ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                autoCapitalize="off"
                spellCheck={false}
                autoComplete={index === 0 ? "one-time-code" : "off"}
                aria-label={`OTP digit ${index + 1} of 6, ${
                  digit ? "filled" : "empty"
                }`}
                aria-invalid={Boolean(visibleError)}
                aria-describedby={`tester-otp-progress${visibleError ? " tester-otp-error" : ""}`}
                maxLength={index === 0 ? 6 : 1}
                disabled={isVerifying || isSending}
                value={digit}
                onChange={(event) =>
                  handleOtpChange(event.target.value, index, event)
                }
                onKeyDown={(event) => handleKeyDown(event, index)}
                onPaste={(event) => handlePaste(event, index)}
                onFocus={(event) => {
                  focusedInputIndex.current = index;
                  event.target.select();
                }}
                className={`h-12 w-10 rounded-xl border bg-white text-center text-xl font-semibold text-slate-950 outline-none transition sm:h-14 sm:w-12 ${
                  digit
                    ? "border-purple-500 bg-purple-50/50"
                    : "border-slate-300"
                } focus:border-purple-600 focus:ring-4 focus:ring-purple-100`}
              />
            ))}
          </div>

          <div
            id="tester-otp-progress"
            className="mx-auto max-w-[280px]"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="mb-1.5 flex items-center justify-between text-[10px] text-slate-500">
              <span>{enteredDigits} of 6 digits entered</span>
              {enteredDigits === 6 && (
                <span className="font-semibold text-emerald-700">
                  Code ready
                </span>
              )}
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-slate-100"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-violet-600 transition-[width] duration-200"
                style={{ width: `${(enteredDigits / 6) * 100}%` }}
              />
            </div>
          </div>

          <label
            htmlFor="tester-otp-auto-verify"
            className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition ${
              autoVerify
                ? "border-violet-200 bg-violet-50/60"
                : "border-slate-200 bg-white"
            } ${
              isVerifying || isSending
                ? "cursor-not-allowed opacity-60"
                : "hover:border-violet-200"
            }`}
          >
            <input
              id="tester-otp-auto-verify"
              type="checkbox"
              checked={autoVerify}
              onChange={(event) => handleAutoVerifyChange(event.target.checked)}
              disabled={
                isVerifying || isSending || !autoVerifyPreferenceLoaded
              }
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-slate-700">
                Verify automatically when complete
              </span>
              <span className="mt-0.5 block text-[10px] leading-4 text-slate-500">
                When enabled, a complete code is submitted automatically and
                this choice is remembered in this browser.
              </span>
            </span>
          </label>
          {autoVerifyPreferenceMessage && (
            <p
              role="status"
              aria-live="polite"
              className={`text-center text-[10px] ${
                autoVerifyPreferenceMessage.startsWith("Could not") ||
                autoVerifyPreferenceMessage.startsWith("This browser")
                  ? "text-amber-700"
                  : "text-slate-500"
              }`}
            >
              {autoVerifyPreferenceMessage}
            </p>
          )}

          {clipboardMessage && (
            <p
              role="status"
              aria-live="polite"
              className={`text-center text-[10px] ${
                clipboardMessage.startsWith("Verification code pasted")
                  ? "text-emerald-700"
                  : "text-amber-700"
              }`}
            >
              {clipboardMessage}
            </p>
          )}

          <p className="text-center text-xs text-slate-500">
            Paste the full code into any box, or enter each digit. Check your
            spam folder if the message is missing.
          </p>
        </div>

        <button
          type="submit"
          aria-keyshortcuts="Control+Enter Meta+Enter"
          aria-live="polite"
          aria-atomic="true"
          disabled={isVerifying || isSending}
          className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-black px-5 text-base font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-200 disabled:cursor-wait disabled:opacity-60"
        >
          {isVerifying ? "Verifying..." : "Verify and continue"}
          {!isVerifying && <ArrowRight size={19} aria-hidden="true" />}
        </button>
        <p className="text-center text-[10px] text-slate-400">
          Tip: press Ctrl+Enter or ⌘+Enter to verify.
        </p>
        {visibleError && (
          <div
            id="tester-otp-error"
            role="alert"
            aria-live="assertive"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-center text-sm text-rose-800"
          >
            <span className="block">{visibleError}</span>
            <button
              type="button"
              onClick={focusCodeForCorrection}
              disabled={isVerifying || isSending}
              className="mt-2 inline-flex min-h-9 items-center justify-center rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Edit verification code
            </button>
          </div>
        )}
      </form>

      <div className="mt-6 flex flex-col items-center gap-4 text-sm">
        {resendCooldown > 0 ? (
          <div className="w-full max-w-[280px]">
            <p className="inline-flex w-full items-center justify-center gap-2 text-slate-500">
              <Clock3 size={15} aria-hidden="true" />
              Resend code in{" "}
              <span className="font-semibold tabular-nums text-slate-800">
                {formatTime(resendCooldown)}
              </span>
            </p>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="Resend code cooldown"
              aria-valuemin={0}
              aria-valuemax={RESEND_COOLDOWN_SECONDS}
              aria-valuenow={Math.min(
                RESEND_COOLDOWN_SECONDS,
                Math.max(0, RESEND_COOLDOWN_SECONDS - resendCooldown),
              )}
              aria-valuetext={`${formatTime(resendCooldown)} remaining before another code can be sent`}
            >
              <div
                className="h-full rounded-full bg-violet-600 transition-[width] duration-300"
                style={{
                  width: `${
                    (Math.min(
                      RESEND_COOLDOWN_SECONDS,
                      Math.max(0, RESEND_COOLDOWN_SECONDS - resendCooldown),
                    ) /
                      RESEND_COOLDOWN_SECONDS) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleResendCode}
            disabled={isSending || isVerifying}
            className="inline-flex cursor-pointer items-center gap-2 font-semibold text-purple-700 hover:text-purple-900 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw size={15} />
            {isSending ? "Sending new code..." : "Resend code"}
          </button>
        )}

        <button
          type="button"
          onClick={handleResetCode}
          disabled={isVerifying || isSending || enteredDigits === 0}
          className="inline-flex cursor-pointer items-center gap-2 text-slate-600 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear verification code
        </button>

        <button
          type="button"
          onClick={onBack}
          disabled={isSending || isVerifying}
          className="inline-flex cursor-pointer items-center gap-2 text-slate-600 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft size={16} />
          Change email address
        </button>
      </div>
      <OtpHelpPanel
        email={email}
        onResend={onResend}
        onBack={onBack}
        resendCooldown={resendCooldown}
        isSending={isSending}
        isVerifying={isVerifying}
      />
      <OtpActivityPanel events={activityEvents} onClear={clearActivity} />
    </div>
  );
}
