"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { ArrowLeft, ArrowRight, RefreshCw, Clock3 } from "lucide-react";
import { ShieldCheck } from "lucide-react";

const RESEND_COOLDOWN = 30;

export default function OtpForm({ email, onBack }) {
  const router = useRouter();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef([]);

  // Countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleOtpChange = (value, index) => {
    const digits = value.replace(/\D/g, "");

    // Support pasting a complete OTP
    if (digits.length > 1) {
      const pastedDigits = digits.slice(0, 6).split("");
      const updatedOtp = ["", "", "", "", "", ""];

      pastedDigits.forEach((digit, i) => {
        updatedOtp[i] = digit;
      });

      setOtp(updatedOtp);
      inputRefs.current[Math.min(pastedDigits.length, 5)]?.focus();
      return;
    }

    const updatedOtp = [...otp];
    updatedOtp[index] = digits;
    setOtp(updatedOtp);

    if (digits && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (event, index) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();

    const digits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!digits) return;

    const updatedOtp = ["", "", "", "", "", ""];

    digits.split("").forEach((digit, index) => {
      updatedOtp[index] = digit;
    });

    setOtp(updatedOtp);
    inputRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const enteredOtp = otp.join("");

    // Temporary test mode: the OTP is optional.
    if (enteredOtp.length > 0 && enteredOtp.length !== 6) {
      toast.error("Enter all 6 digits or leave the code empty.");
      return;
    }

    try {
      sessionStorage.setItem("testerEmail", email.trim().toLowerCase());
      sessionStorage.setItem("testerToken", "TEST_MODE");

      router.push("/tester/url");
    } catch {
      toast.error("Unable to continue. Please try again.");
    }
  };

  const handleResendCode = () => {
    if (resendCooldown > 0) return;

    // Temporary test mode: no email is sent.
    setOtp(["", "", "", "", "", ""]);
    setResendCooldown(RESEND_COOLDOWN);
    inputRefs.current[0]?.focus();

    toast.success("Test code reset. You can enter a new code.");
  };

  const handleResetCode = () => {
    setOtp(["", "", "", "", "", ""]);
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
          Enter any six-digit number to continue, or leave it empty to skip.
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
            <label className="block text-sm font-semibold text-slate-800">
              Verification code
            </label>

            <button
              type="button"
              onClick={handleResetCode}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-purple-700"
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
                autoComplete={index === 0 ? "one-time-code" : "off"}
                aria-label={`OTP digit ${index + 1}`}
                maxLength={6}
                value={digit}
                onChange={(event) => handleOtpChange(event.target.value, index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                onPaste={handlePaste}
                onFocus={(event) => event.target.select()}
                className={`h-12 w-10 rounded-xl border bg-white text-center text-xl font-semibold text-slate-950 outline-none transition sm:h-14 sm:w-12 ${
                  digit
                    ? "border-purple-500 bg-purple-50/50"
                    : "border-slate-300"
                } focus:border-purple-600 focus:ring-4 focus:ring-purple-100`}
              />
            ))}
          </div>

          <p className="text-center text-xs text-slate-500">
            Enter six digits, or skip the code in test mode.
          </p>
        </div>

        <button
          type="submit"
          className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-black px-5 text-base font-semibold text-white transition hover:bg-gray-800"
        >
          Verify and continue
          <ArrowRight size={19} />
        </button>
      </form>

      {/* Resend countdown */}
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
            className="inline-flex cursor-pointer items-center gap-2 font-semibold text-purple-700 hover:text-purple-900"
          >
            <RefreshCw size={15} />
            Resend code
          </button>
        )}

        <button
          type="button"
          onClick={handleResetCode}
          className="inline-flex cursor-pointer items-center gap-2 text-slate-600 hover:text-slate-950"
        >
          Clear verification code
        </button>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-2 text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft size={16} />
          Change email address
        </button>
      </div>
    </div>
  );
}
