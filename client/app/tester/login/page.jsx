
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import OtpForm from "./OtpForm";
import { Mail } from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

export default function TesterLoginPage() {
  const router = useRouter();

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const validateEmail = (value) => {
    const normalizedEmail = value.trim();

    if (!normalizedEmail) {
      return "Please enter your email address.";
    }

    if (normalizedEmail.length > 254) {
      return "Email address is too long.";
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      return "Please enter a valid email address.";
    }

    return "";
  };

  const handleEmailChange = (event) => {
    const value = event.target.value;

    setEmail(value);

    if (emailError) {
      setEmailError(validateEmail(value));
    }
  };

  const sendOtp = (event) => {
    event.preventDefault();

    // Skip email validation and email delivery in test mode.
    setEmail(email.trim().toLowerCase());
    setEmailError("");
    setStep("otp");
  };

  const verifyOtp = async (event) => {
    event.preventDefault();

    if (isVerifying) return;

    if (!/^\d{6}$/.test(otp.trim())) {
      toast.error("Enter the 6-digit verification code.");
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch(`${API_URL}/api/testers/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Invalid or expired verification code.",
        );
      }

      if (!data.token) {
        throw new Error("The server did not return an authentication token.");
      }

      sessionStorage.setItem("testerToken", data.token);
      sessionStorage.setItem("testerEmail", email.trim().toLowerCase());

      toast.success("Email verified successfully.");

      router.push("/tester/url");
    } catch (error) {
      toast.error(error.message || "Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const changeEmail = () => {
    if (isSending || isVerifying) return;

    setStep("email");
    setOtp("");
    setEmailError("");
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

      <section className="relative z-10 w-full max-w-[480px] rounded-[28px] border border-white/80 bg-white/90 px-6 py-9 shadow-[0_28px_70px_-28px_rgba(38,25,55,0.30)] backdrop-blur-xl sm:px-10 sm:py-11">
        {step === "email" ? (
          <>
            <button
              type="button"
              onClick={() => router.back()}
              className="mb-6 inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
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
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Tester{" "}
                <span className="font-normal italic [font-family:Georgia,serif]">
                  login
                </span>
              </h1>

              <p className="mx-auto mt-4 max-w-[340px] text-base leading-7 text-slate-600">
                Sign in with your email to access the tester workspace.
              </p>
            </header>

            <form onSubmit={sendOtp} noValidate className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="tester-email"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Email address
                </label>

                <input
                  id="tester-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                />
              </div>

              <button
                type="submit"
                className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-black px-5 text-base font-semibold text-white transition hover:bg-gray-800"
              >
                Continue with email
                <ArrowRight size={19} />
              </button>
            </form>

            <div className="mt-7 flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
              <ShieldCheck
                size={20}
                className="mt-0.5 shrink-0 text-purple-700"
              />
              <p className="text-sm leading-6 text-slate-600">
                Temporary test mode is enabled. No email will be sent.
              </p>
            </div>
          </>
        ) : (
          <OtpForm email={email} onBack={() => setStep("email")} />
        )}

        <footer className="mt-9 border-t border-slate-100 pt-6 text-center text-sm leading-6 text-slate-500">
          Only test websites you are authorized to access.
        </footer>
      </section>

      <ToastContainer position="top-right" autoClose={3000} theme="light" />
    </main>
  );
}
