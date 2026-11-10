export const TESTER_EMAIL_MIN_LENGTH = 3;
export const TESTER_EMAIL_MAX_LENGTH = 254;
export const TESTER_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeTesterEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isTesterEmailEmpty(value) {
  return normalizeTesterEmail(value).length === 0;
}

export function isTesterEmailTooShort(value) {
  return normalizeTesterEmail(value).length < TESTER_EMAIL_MIN_LENGTH;
}

export function isTesterEmailTooLong(value) {
  return normalizeTesterEmail(value).length > TESTER_EMAIL_MAX_LENGTH;
}

export function matchesTesterEmailPattern(value) {
  return TESTER_EMAIL_PATTERN.test(normalizeTesterEmail(value));
}

export function validateTesterEmail(value) {
  const normalizedEmail = normalizeTesterEmail(value);

  if (isTesterEmailEmpty(normalizedEmail)) {
    return "Please enter your email address.";
  }

  if (isTesterEmailTooShort(normalizedEmail)) {
    return "Email address is too short.";
  }

  if (isTesterEmailTooLong(normalizedEmail)) {
    return "Email address is too long.";
  }

  if (!matchesTesterEmailPattern(normalizedEmail)) {
    return "Please enter a valid email address.";
  }

  return "";
}

export function getTesterEmailValidationState(value) {
  const normalizedEmail = normalizeTesterEmail(value);
  const error = validateTesterEmail(normalizedEmail);

  return {
    value: normalizedEmail,
    error,
    valid: !error,
    empty: isTesterEmailEmpty(normalizedEmail),
    tooShort: isTesterEmailTooShort(normalizedEmail),
    tooLong: isTesterEmailTooLong(normalizedEmail),
    patternMatch: matchesTesterEmailPattern(normalizedEmail),
  };
}

export function getTesterEmailInputProps(value, disabled = false) {
  const state = getTesterEmailValidationState(value);

  return {
    type: "email",
    inputMode: "email",
    autoComplete: "email",
    minLength: TESTER_EMAIL_MIN_LENGTH,
    maxLength: TESTER_EMAIL_MAX_LENGTH,
    required: true,
    disabled,
    value: state.value,
    "aria-invalid": Boolean(state.error),
  };
}

export function shouldShowTesterEmailError(value, touched = false) {
  return Boolean(touched && validateTesterEmail(value));
}
