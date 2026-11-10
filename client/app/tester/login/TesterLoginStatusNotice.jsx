"use client";

import { CheckCircle2, Clock3, Loader2, MailCheck, ShieldAlert } from "lucide-react";
import { getTesterLoginViewState } from "./testerLoginViewState";

function getStatusContent({ step, isSending, isVerifying, resendCooldown, error }) {
  const viewState = getTesterLoginViewState({ step, isSending, isVerifying, resendCooldown, error });

  if (error) {
    return {
      tone: "border-rose-100 bg-rose-50 text-rose-800",
      icon: ShieldAlert,
      title: "Action needed",
      message: error,
    };
  }

  if (isSending) {
    return {
      tone: "border-blue-100 bg-blue-50 text-blue-800",
      icon: Loader2,
      title: "Sending your code",
      message: "Keep this tab open while we send the verification email.",
      busy: true,
    };
  }

  if (isVerifying) {
    return {
      tone: "border-blue-100 bg-blue-50 text-blue-800",
      icon: Loader2,
      title: "Checking your code",
      message: "We are securely validating the verification code.",
      busy: true,
    };
  }

  if (viewState.phase === "cooldown") {
    return {
      tone: "border-amber-100 bg-amber-50 text-amber-800",
      icon: Clock3,
      title: "Verification code sent",
      message: `You can request another code in ${resendCooldown} seconds.`,
    };
  }

  if (viewState.step === "otp") {
    return {
      tone: "border-emerald-100 bg-emerald-50 text-emerald-800",
      icon: MailCheck,
      title: "Check your inbox",
      message: "Enter the six-digit code from the newest verification email.",
    };
  }

  return {
    tone: "border-slate-200 bg-slate-50 text-slate-700",
    icon: CheckCircle2,
    title: "Ready to sign in",
    message: "Enter an approved tester email address to begin.",
  };
}

export default function TesterLoginStatusNotice({
  step = "email",
  isSending = false,
  isVerifying = false,
  resendCooldown = 0,
  error = "",
}) {
  const status = getStatusContent({
    step,
    isSending,
    isVerifying,
    resendCooldown,
    error,
  });
  const Icon = status.icon;

  return (
    <div
      className={`mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3 ${status.tone}`}
      role={error ? "alert" : "status"}
      aria-live={error ? "assertive" : "polite"}
      aria-busy={Boolean(status.busy)}
    >
      <Icon
        size={18}
        className={`mt-0.5 shrink-0 ${status.busy ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-xs font-semibold">{status.title}</p>
        <p className="mt-1 text-xs leading-5 opacity-90">{status.message}</p>
      </div>
    </div>
  );
}
