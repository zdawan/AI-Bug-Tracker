
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import OtpForm from "./OtpForm";
import TesterLoginReadinessPanel from "./TesterLoginReadinessPanel";
import TesterLoginWorkflowPreview from "./TesterLoginWorkflowPreview";
import TesterLoginStatusNotice from "./TesterLoginStatusNotice";
import TesterLoginTrustSummary from "./TesterLoginTrustSummary";
import TesterLoginDestinationNotice from "./TesterLoginDestinationNotice";
import TesterLoginEmailGuidance from "./TesterLoginEmailGuidance";
import TesterLoginFormMeta from "./TesterLoginFormMeta";
import TesterLoginSessionPrivacy from "./TesterLoginSessionPrivacy";
import TesterLoginBrowserNotice from "./TesterLoginBrowserNotice";
import TesterLoginRecoveryHint from "./TesterLoginRecoveryHint";
import TesterLoginEmailSecurity from "./TesterLoginEmailSecurity";
import TesterLoginKeyboardGuide from "./TesterLoginKeyboardGuide";
import TesterLoginFocusStatus from "./TesterLoginFocusStatus";
import TesterLoginEmailActions from "./TesterLoginEmailActions";
import { getTesterReturnToFromLocation } from "./testerLoginRedirect";
import {
  normalizeTesterEmail,
  validateTesterEmail,
} from "./testerLoginValidation";
import { Mail } from "lucide-react";
import {
  API_ENDPOINTS,
  getApiErrorMessage,
  normalizeEmail,
  postJson,
} from "../../lib/apiClient";
import { useTesterAuth } from "../../lib/TesterAuthProvider";
const RESEND_COOLDOWN_SECONDS = 30;

export default function TesterLoginPage() {
  const router = useRouter();
  const { setSession } = useTesterAuth();

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [returnTo, setReturnTo] = useState("/tester/url");

  useEffect(() => {
    setReturnTo(getTesterReturnToFromLocation(window.location));
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const requestOtp = async (normalizedEmail) => {
    setAuthError("");
    setIsSending(true);

    try {
      const data = await postJson(API_ENDPOINTS.testers.sendOtp, {
        email: normalizedEmail,
      });

      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success(
        data.message || `A verification code was sent to ${normalizedEmail}.`,
      );
      return true;
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Could not send a verification code. Please try again.",
      );
      setAuthError(message);
      toast.error(message);
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const sendOtp = async (event) => {
    event.preventDefault();
    if (isSending) return;

    const normalizedEmail = normalizeTesterEmail(email);
    const validationError = validateTesterEmail(normalizedEmail);
    if (validationError) {
      setEmailError(validationError);
      return;
    }

    setEmail(normalizedEmail);
    setEmailError("");
    const sent = await requestOtp(normalizedEmail);

    if (sent) {
      setStep("otp");
    }
  };

  const verifyOtp = async (event, enteredOtp) => {
    event.preventDefault();

    if (isVerifying) return;

    if (!/^\d{6}$/.test(enteredOtp.trim())) {
      setAuthError("Enter the complete 6-digit verification code.");
      toast.error("Enter the 6-digit verification code.");
      return;
    }

    setIsVerifying(true);
    setAuthError("");

    try {
      const data = await postJson(API_ENDPOINTS.testers.verifyOtp, {
        email: normalizeEmail(email),
        otp: enteredOtp.trim(),
      });

      if (!data.token) {
        throw new Error("The server did not return an authentication token.");
      }

      const sessionResult = setSession({
        token: data.token,
        email,
        data,
      });

      if (!sessionResult.ok) {
        throw sessionResult.error;
      }

      toast.success("Email verified successfully.");

      router.push(returnTo);
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Verification failed. Please try again.",
      );
      setAuthError(message);
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const resendOtp = async () => {
    if (isSending || resendCooldown > 0) return false;
    return requestOtp(normalizeEmail(email));
  };

  const changeEmail = () => {
    if (isSending || isVerifying) return;

    setStep("email");
    setEmailError("");
    setAuthError("");
    setResendCooldown(0);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8f3ff] px-4 py-10 font-sans sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(124,92,170,0.17) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-purple-200/40 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl"
      />

      <section
        aria-labelledby="tester-login-title"
        aria-label="Tester authentication"
        aria-describedby="tester-login-subtitle"
        aria-busy={isSending || isVerifying}
        className="relative z-10 w-full max-w-[480px] rounded-[28px] border border-white/80 bg-white/90 px-6 py-9 shadow-[0_28px_70px_-28px_rgba(38,25,55,0.30)] backdrop-blur-xl sm:px-10 sm:py-11"
      >
        {step === "email" ? (
          <>
            <button
              type="button"
              onClick={() => router.back()}
              disabled={isSending}
              className="mb-6 inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Go back to previous page"
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <div className="mb-5 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-100 bg-purple-50 text-purple-700">
                <Mail size={26} strokeWidth={1.8} />
              </div>
            </div>
            <header className="mb-8 text-center">
              <h1
                id="tester-login-title"
                className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
              >
                Tester{" "}
                <span className="font-normal italic [font-family:Georgia,serif]">
                  login
                </span>
              </h1>

              <p
                id="tester-login-subtitle"
                className="mx-auto mt-4 max-w-[340px] text-base leading-7 text-slate-600"
              >
                Sign in with your email to access the tester workspace.
              </p>
            </header>

            <form
              aria-label="Tester email sign-in"
              onSubmit={sendOtp}
              noValidate
              aria-busy={isSending}
              aria-describedby={authError ? "tester-auth-error" : undefined}
              className="space-y-5"
            >
              <div className="space-y-2">
                <label
                  htmlFor="tester-email"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Email address
                </label>

                <input
                  id="tester-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  enterKeyHint="send"
                  autoComplete="email"
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  minLength={3}
                  maxLength={254}
                  required
                  disabled={isSending}
                  placeholder="you@example.com"
                  value={email}
                  aria-invalid={Boolean(emailError)}
                  aria-keyshortcuts="Escape"
                  aria-errormessage={emailError ? "tester-email-error" : undefined}
                  aria-describedby={
                    emailError ? "tester-email-error" : "tester-email-hint"
                  }
                  onFocus={() => setAuthError("")}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setAuthError("");
                    if (emailError) {
                      setEmailError(validateTesterEmail(event.target.value));
                    }
                  }}
                  onBlur={() => {
                    const validationError = validateTesterEmail(email);
                    setEmailError(validationError);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Escape" || !email) return;
                    event.preventDefault();
                    setEmail("");
                    setEmailError("");
                    setAuthError("");
                  }}
                  className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:cursor-wait disabled:bg-slate-50 disabled:opacity-70"
                />
                <TesterLoginEmailActions
                  value={email}
                  disabled={isSending}
                  onClear={() => {
                    setEmail("");
                    setEmailError("");
                    setAuthError("");
                  }}
                />
                {emailError ? (
                  <p
                    id="tester-email-error"
                    role="alert"
                    className="text-sm text-rose-700"
                  >
                    {emailError}
                  </p>
                ) : (
                  <p
                    id="tester-email-hint"
                    className="text-xs leading-5 text-slate-500"
                  >
                    We’ll send a one-time verification code to this address.
                  </p>
                )}
                <TesterLoginEmailGuidance value={email} touched={Boolean(emailError)} />
              </div>

              <button
                type="submit"
                disabled={isSending}
                aria-busy={isSending}
                className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-black px-5 text-base font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-200 disabled:cursor-wait disabled:opacity-60"
              >
                {isSending ? "Sending code..." : "Send verification code"}
                {!isSending && <ArrowRight size={19} aria-hidden="true" />}
              </button>
              {authError && (
                <p
                  id="tester-auth-error"
                  role="alert"
                  className="text-center text-sm text-rose-700"
                >
                  {authError}
                </p>
              )}
            </form>

            <TesterLoginStatusNotice
              step={step}
              isSending={isSending}
              isVerifying={isVerifying}
              resendCooldown={resendCooldown}
              error={authError}
            />
            <TesterLoginFormMeta />
            <TesterLoginSessionPrivacy />
            <TesterLoginBrowserNotice />
            <TesterLoginRecoveryHint />
            <TesterLoginEmailSecurity />
            <TesterLoginKeyboardGuide />
            <TesterLoginFocusStatus />
            <TesterLoginTrustSummary />
            <TesterLoginDestinationNotice destination={returnTo} />

            <TesterLoginReadinessPanel />
            <TesterLoginWorkflowPreview
              email={email}
              step={step}
              isSending={isSending}
              isVerifying={isVerifying}
              resendCooldown={resendCooldown}
            />

            <div className="mt-7 flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
              <ShieldCheck
                size={20}
                className="mt-0.5 shrink-0 text-purple-700"
              />
              <p className="text-sm leading-6 text-slate-600">
                Your code is single-use. Don’t share it with anyone.
              </p>
            </div>
          </>
        ) : (
          <OtpForm
            email={email}
            onBack={changeEmail}
            onResend={resendOtp}
            resendCooldown={resendCooldown}
            isSending={isSending}
            isVerifying={isVerifying}
            error={authError}
            onCodeChange={() => setAuthError("")}
            onVerify={verifyOtp}
          />
        )}

        <footer className="mt-9 border-t border-slate-100 pt-6 text-center text-sm leading-6 text-slate-500">
          Only test websites you are authorized to access.
        </footer>
      </section>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        limit={3}
        preventDuplicate
        closeOnClick
        newestOnTop
        pauseOnFocusLoss
        theme="light"
      />
    </main>
  );
}
