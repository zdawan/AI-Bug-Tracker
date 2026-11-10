export const LOGIN_VIEW_EMAIL = "email";
export const LOGIN_VIEW_OTP = "otp";

export function getTesterLoginViewState({
  step = LOGIN_VIEW_EMAIL,
  isSending = false,
  isVerifying = false,
  resendCooldown = 0,
  error = "",
} = {}) {
  const normalizedStep = step === LOGIN_VIEW_OTP ? LOGIN_VIEW_OTP : LOGIN_VIEW_EMAIL;
  const hasError = Boolean(error);
  const busy = Boolean(isSending || isVerifying);
  const cooldown = Math.max(0, Number(resendCooldown) || 0);

  if (hasError) {
    return {
      step: normalizedStep,
      phase: "error",
      busy,
      hasError: true,
      cooldown,
      canSubmit: !busy,
      label: "Action needed",
    };
  }

  if (isSending) {
    return {
      step: normalizedStep,
      phase: "sending",
      busy: true,
      hasError: false,
      cooldown,
      canSubmit: false,
      label: "Sending verification email",
    };
  }

  if (isVerifying) {
    return {
      step: normalizedStep,
      phase: "verifying",
      busy: true,
      hasError: false,
      cooldown,
      canSubmit: false,
      label: "Checking verification code",
    };
  }

  if (normalizedStep === LOGIN_VIEW_OTP && cooldown > 0) {
    return {
      step: normalizedStep,
      phase: "cooldown",
      busy: false,
      hasError: false,
      cooldown,
      canSubmit: true,
      label: "Verification code sent",
    };
  }

  return {
    step: normalizedStep,
    phase: normalizedStep === LOGIN_VIEW_OTP ? "ready-to-verify" : "ready-to-send",
    busy: false,
    hasError: false,
    cooldown,
    canSubmit: true,
    label: normalizedStep === LOGIN_VIEW_OTP ? "Check your inbox" : "Ready to sign in",
  };
}

export function isTesterLoginBusy(state) {
  return Boolean(state?.busy);
}

export function canSubmitTesterLogin(state) {
  return Boolean(state?.canSubmit && !state?.busy);
}

export function getTesterLoginPhaseLabel(state) {
  return state?.label || "Ready to sign in";
}

export function getTesterLoginCooldownLabel(seconds = 0) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  return safeSeconds > 0 ? `Resend available in ${safeSeconds} seconds` : "Resend available";
}
