"use client";

import { Check, Info, Mail, X } from "lucide-react";
import { getTesterEmailValidationState, TESTER_EMAIL_MAX_LENGTH } from "./testerLoginValidation";

export default function TesterLoginEmailGuidance({ value = "", touched = false }) {
  const state = getTesterEmailValidationState(value);
  const hasValue = state.value.length > 0;
  const showError = touched && Boolean(state.error);
  const showSuccess = touched && hasValue && state.valid;

  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Mail size={13} aria-hidden="true" />
          {hasValue ? "Address preview" : "Email guidance"}
        </span>
        <span className={state.tooLong ? "font-semibold text-rose-700" : ""}>
          {state.value.length}/{TESTER_EMAIL_MAX_LENGTH}
        </span>
      </div>

      {!hasValue ? (
        <p className="flex items-start gap-2 text-[11px] leading-5 text-slate-500">
          <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          Use the approved tester email address that can receive the verification code.
        </p>
      ) : null}

      {showSuccess ? (
        <p className="flex items-start gap-2 text-[11px] leading-5 text-emerald-700">
          <Check size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          This email looks ready for verification.
        </p>
      ) : null}

      {showError ? (
        <p className="flex items-start gap-2 text-[11px] leading-5 text-rose-700">
          <X size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      ) : null}

      {hasValue && state.value !== value ? (
        <p className="truncate rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-500">
          Normalized preview: <span className="font-medium text-slate-700">{state.value}</span>
        </p>
      ) : null}
    </div>
  );
}
