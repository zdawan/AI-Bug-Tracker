"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, RefreshCw, Clock3 } from "lucide-react";
import { ShieldCheck } from "lucide-react";
import OtpHelpPanel from "./OtpHelpPanel";

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
  const inputRefs = useRef([]);
  const enteredDigits = otp.filter(Boolean).length;
  const visibleError = codeError || error;

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

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
    onCodeChange?.();

    const firstEmptyIndex = updatedOtp.findIndex(
      (digit, index) => index >= startIndex && !digit,
    );
    inputRefs.current[firstEmptyIndex < 0 ? otp.length - 1 : firstEmptyIndex]?.focus();
    return true;
  };

  const handleOtpChange = (value, index) => {
    setCodeError("");
    const digits = value.replace(/\D/g, "");

    if (digits.length > 1) {
      applyPastedCode(digits, index);
      return;
    }

    const updatedOtp = [...otp];
    updatedOtp[index] = digits;
    setOtp(updatedOtp);
    onCodeChange?.();

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
    applyPastedCode(event.clipboardData.getData("text"), index);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const enteredOtp = otp.join("");
    if (!/^\d{6}$/.test(enteredOtp)) {
      setCodeError("Enter all 6 digits before continuing.");
      const firstEmptyIndex = otp.findIndex((digit) => !digit);
      inputRefs.current[firstEmptyIndex < 0 ? 0 : firstEmptyIndex]?.focus();
      return;
    }

    setCodeError("");
    onVerify?.(event, enteredOtp);
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || isSending || !onResend) return;

    const sent = await onResend();
    if (sent) {
      setOtp(["", "", "", "", "", ""]);
      setCodeError("");
      onCodeChange?.();
      inputRefs.current[0]?.focus();
    }
  };

  const handleResetCode = () => {
    setOtp(["", "", "", "", "", ""]);
    setCodeError("");
    onCodeChange?.();
    inputRefs.current[0]?.focus();
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

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label
              id="tester-otp-label"
              className="block text-sm font-semibold text-slate-800"
            >
              Verification code
            </label>

            <button
              type="button"
              onClick={handleResetCode}
              disabled={isVerifying || isSending || enteredDigits === 0}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={13} />
              Clear code
            </button>
          </div>

          <div className="flex justify-center gap-2 sm:gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoCapitalize="off"
                spellCheck={false}
                autoComplete={index === 0 ? "one-time-code" : "off"}
                aria-label={`OTP digit ${index + 1}`}
                aria-invalid={Boolean(visibleError)}
                aria-describedby={`tester-otp-progress${visibleError ? " tester-otp-error" : ""}`}
                maxLength={index === 0 ? 6 : 1}
                disabled={isVerifying || isSending}
                value={digit}
                onChange={(event) => handleOtpChange(event.target.value, index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                onPaste={(event) => handlePaste(event, index)}
                onFocus={(event) => event.target.select()}
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

          <p className="text-center text-xs text-slate-500">
            Paste the full code into any box, or enter each digit. Check your
            spam folder if the message is missing.
          </p>
        </div>

        <button
          type="submit"
          disabled={isVerifying || isSending}
          className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-black px-5 text-base font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-200 disabled:cursor-wait disabled:opacity-60"
        >
          {isVerifying ? "Verifying..." : "Verify and continue"}
          {!isVerifying && <ArrowRight size={19} aria-hidden="true" />}
        </button>
        {visibleError && (
          <p
            id="tester-otp-error"
            role="alert"
            aria-live="assertive"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center text-sm text-rose-800"
          >
            {visibleError}
          </p>
        )}
      </form>

      <div className="mt-6 flex flex-col items-center gap-4 text-sm">
        {resendCooldown > 0 ? (
          <p className="inline-flex items-center gap-2 text-slate-500">
            <Clock3 size={15} />
            Resend code in{" "}
            <span className="font-semibold tabular-nums text-slate-800">
              {formatTime(resendCooldown)}
            </span>
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResendCode}
            disabled={isSending}
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
    </div>
  );
}
