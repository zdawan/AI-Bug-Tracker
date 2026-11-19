"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { MailQuestion, ShieldCheck, X } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { buildApiEndpoint } from "../../lib/apiClient";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const router = useRouter();
  const emailRef = useRef(null);
  const normalizedEmail = email.trim().toLowerCase();
  const emailLooksReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

  useEffect(() => {
    const dev = localStorage.getItem("developer");
    if (dev) {
      router.push("/admin/assigned");
    }

    const savedEmail = localStorage.getItem("adminLoginEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, [router]);

  useEffect(() => {
    if (rememberEmail && normalizedEmail) {
      localStorage.setItem("adminLoginEmail", normalizedEmail);
    } else if (!rememberEmail) {
      localStorage.removeItem("adminLoginEmail");
    }
  }, [normalizedEmail, rememberEmail]);

  useEffect(() => {
    if (!isSubmitting) {
      emailRef.current?.focus();
    }
  }, [isSubmitting]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!normalizedEmail) {
      setErrorMessage("Enter your organization email to continue.");
      toast.error("Enter email to login", { autoClose: 3000 });
      return;
    }

    if (!emailLooksReady) {
      setErrorMessage(
        "Enter a complete organization email, including the domain.",
      );
      toast.error("Use a valid email address", { autoClose: 3000 });
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const endpoint = buildApiEndpoint(
        `/developers/email/${encodeURIComponent(normalizedEmail)}`,
      );
      const res = await axios.get(endpoint, {
        timeout: 15000,
      });

      if (!res.data?._id) {
        throw new Error(
          "The account response did not include a developer session.",
        );
      }

      localStorage.setItem("developer", JSON.stringify(res.data));
      toast.success("Access confirmed", { autoClose: 1500 });
      router.replace("/admin/assigned");
    } catch (err) {
      const notFound = err?.response?.status === 404;
      const message = notFound
        ? "This organization email is not registered. Confirm the address and try again."
        : "We could not verify this email. Check your connection or contact an administrator.";
      setErrorMessage(message);
      toast.error(
        notFound ? "Email not recognized" : "Unable to verify access",
        {
          autoClose: 3000,
        },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearEmail = () => {
    setEmail("");
    setErrorMessage("");
    setShowEmailPreview(false);
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center 
      font-sans
      bg-[radial-gradient(circle,_rgba(0,0,0,0.08)_1px,_transparent_1px)] 
      [background-size:24px_24px] 
      bg-gradient-to-br from-blue-50 to-purple-100 
      px-6 relative overflow-hidden"
    >
      {/* Gradient glow rising from bottom */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 
        w-[160vw] h-[160vw] 
        bg-gradient-to-r from-pink-300/40 via-purple-300/40 to-blue-300/40
        blur-3xl opacity-40"
      ></div>

      <div className="relative z-10 bg-white/80 backdrop-blur-md shadow-2xl rounded-3xl p-10 max-w-md w-full">
        <h1 className="text-4xl font-bold text-center mb-6 text-gray-900">
          Admin{" "}
          <span
            className="font-extralight italic text-gray-900"
            style={{ fontFamily: "Times New Roman, Times, serif" }}
          >
            Login
          </span>
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Use your organization email to
          <br />
          access the assigned url's.
        </p>
        <p className="mb-4 text-center text-[11px] font-medium text-gray-500">
          Verification usually completes in a few seconds.
        </p>
        <div
          className="mb-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-3 text-blue-900"
          role="note"
        >
          <ShieldCheck
            size={17}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-blue-600"
          />
          <div>
            <p className="text-xs font-semibold">Restricted tester access</p>
            <p className="mt-1 text-[10px] leading-4 text-blue-800">
              Only registered organization emails can open assigned reports.
              Your session stays in this browser until you log out.
            </p>
          </div>
        </div>
        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-4"
          aria-busy={isSubmitting}
        >
          <label
            htmlFor="admin-email"
            className="text-sm font-semibold text-gray-700"
          >
            Organization email
            <span className="ml-1 text-red-600" aria-hidden="true">
              *
            </span>
          </label>
          <div className="relative">
            <input
              id="admin-email"
              type="email"
              name="email"
              placeholder="you@organization.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setShowEmailPreview(false);
                if (errorMessage) setErrorMessage("");
              }}
              onBlur={() => {
                if (email) {
                  setEmail(normalizedEmail);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" && email) {
                  clearEmail();
                }
              }}
              ref={emailRef}
              autoComplete="email"
              spellCheck="false"
              required
              disabled={isSubmitting}
              aria-describedby="admin-email-help"
              aria-invalid={Boolean(errorMessage)}
              aria-required="true"
              className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 shadow-sm disabled:cursor-not-allowed disabled:bg-gray-100"
            />
            {email && !isSubmitting && (
              <button
                type="button"
                onClick={clearEmail}
                aria-label="Clear organization email"
                title="Clear email"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          {errorMessage && (
            <p
              className="-mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700"
              role="alert"
            >
              {errorMessage}
            </p>
          )}
          <p id="admin-email-help" className="-mt-2 text-xs text-gray-500">
            Use the email assigned to your tester account.
          </p>
          <p className="-mt-1 text-[11px] leading-4 text-gray-500">
            <span className="font-semibold text-gray-700">Required:</span>{" "}
            organization email address
          </p>
          {email && !errorMessage && (
            <div className="-mt-2 space-y-1.5" role="status" aria-live="polite">
              <p
                className={`text-xs ${emailLooksReady ? "text-emerald-700" : "text-amber-700"}`}
              >
                {emailLooksReady
                  ? "Email format looks ready to check."
                  : "Enter a complete email address, including @ and a domain."}
              </p>
              {emailLooksReady && (
                <button
                  type="button"
                  onClick={() => setShowEmailPreview((current) => !current)}
                  className="text-[11px] font-semibold text-purple-700 underline-offset-2 hover:underline"
                >
                  {showEmailPreview ? "Hide normalized email" : "Review normalized email"}
                </button>
              )}
              {showEmailPreview && emailLooksReady && (
                <p className="rounded-lg border border-purple-100 bg-purple-50 px-3 py-2 text-xs text-purple-800">
                  Login value: <span className="font-semibold">{normalizedEmail}</span>
                </p>
              )}
            </div>
          )}
          <label className="-mt-1 flex items-center gap-2 text-[11px] text-gray-600">
            <input
              type="checkbox"
              checked={rememberEmail}
              onChange={(event) => setRememberEmail(event.target.checked)}
              disabled={isSubmitting}
              className="h-3.5 w-3.5 rounded border-gray-300 accent-purple-600"
            />
            Remember this email on this browser
          </label>
          {isSubmitting && (
            <div
              className="-mt-1 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800"
              role="status"
              aria-live="polite"
            >
              <ShieldCheck size={14} aria-hidden="true" />
              <span>Verifying the organization account and preparing secure access.</span>
            </div>
          )}
          <p className="-mt-1 text-[11px] leading-4 text-gray-500">
            Press Enter to check access. Press Escape to clear the email field.
          </p>
          {errorMessage && (
            <p className="-mt-1 text-[11px] leading-4 text-gray-500">
              After correcting the email, press Enter or select Login to retry.
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            aria-describedby="admin-login-submit-status"
            className="py-3 rounded-xl bg-black text-white font-semibold text-lg shadow-lg cursor-pointer hover:bg-blue-600 hover:opacity-90 transition disabled:cursor-wait disabled:bg-gray-500"
          >
            {isSubmitting ? "Checking access…" : "Login"}
          </button>
          <ul className="-mt-1 grid gap-1 text-[10px] leading-4 text-gray-500" aria-label="Login keyboard instructions">
            <li>
              <span className="font-semibold text-gray-700">Enter:</span>{" "}
              submit the login form
            </li>
            <li>
              <span className="font-semibold text-gray-700">Escape:</span>{" "}
              clear the organization email
            </li>
            <li>
              <span className="font-semibold text-gray-700">Tab:</span>{" "}
              move through login controls
            </li>
          </ul>
          <p
            id="admin-login-submit-status"
            className="sr-only"
            role="status"
            aria-live="polite"
          >
            {isSubmitting
              ? "Login verification is in progress."
              : "Login verification is ready."}
          </p>
          <p className="flex items-center justify-center">
            Example mail: githubtest@gmail.com
          </p>
        </form>
        <div className="mt-6 border-t border-gray-200 pt-5" role="note">
          <div className="flex items-start gap-2 text-gray-600">
            <MailQuestion
              size={15}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-purple-600"
            />
            <div>
              <p className="text-xs font-semibold text-gray-800">
                Email not recognized?
              </p>
              <p className="mt-1 text-[10px] leading-4">
                Confirm that you are using the same organization email that was
                assigned to the tester account.
              </p>
              <p className="mt-1 text-[10px] leading-4 text-gray-500">
                If access still fails, contact your project administrator before
                trying another account.
              </p>
            </div>
          </div>
        </div>
        <div
          className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
          role="note"
        >
          <p className="text-[11px] font-semibold text-slate-700">
            Browser privacy
          </p>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            Remembered email is stored only in this browser. It is not sent until
            you submit the login form.
          </p>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            Uncheck Remember this email to remove the saved value.
          </p>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            On a shared device, clear the email after login or leave the
            Remember option unchecked.
          </p>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            Logging out does not remove a remembered email automatically.
          </p>
        </div>
      </div>

      {/* Toastify */}
      <ToastContainer position="top-right" autoClose={3000} />
    </main>
  );
}
