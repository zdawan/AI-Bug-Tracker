"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { MailQuestion, ShieldCheck } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const normalizedEmail = email.trim().toLowerCase();
  const emailLooksReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

  useEffect(() => {
    const dev = localStorage.getItem("developer");
    if (dev) {
      router.push("/admin/assigned");
    }
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!normalizedEmail) {
      setErrorMessage("Enter your organization email to continue.");
      toast.error("Enter email to login", { autoClose: 3000 });
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const res = await axios.get(
        `https://ai-bug-tracker-1.onrender.com/api/developers/email/${encodeURIComponent(
          normalizedEmail
        )}`
      );
      // Save developer in local storage for session
      localStorage.setItem("developer", JSON.stringify(res.data));
      router.push("/admin/assigned");
    } catch (err) {
      setErrorMessage(
        "We could not verify this email. Check the address or contact an administrator.",
      );
      toast.error("Invalid email or server error", { autoClose: 3000 });
    } finally {
      setIsSubmitting(false);
    }
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
        <div
          className="mb-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-3 text-blue-900"
          role="note"
        >
          <ShieldCheck size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-blue-600" />
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
          <label htmlFor="admin-email" className="text-sm font-semibold text-gray-700">
            Organization email
          </label>
          <input
            id="admin-email"
            type="email"
            name="email"
            placeholder="you@organization.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMessage) setErrorMessage("");
            }}
            autoComplete="email"
            required
            disabled={isSubmitting}
            aria-describedby="admin-email-help"
            className="px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 shadow-sm disabled:cursor-not-allowed disabled:bg-gray-100"
          />
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
          {email && !errorMessage && (
            <p
              className={`-mt-2 text-xs ${emailLooksReady ? "text-emerald-700" : "text-amber-700"}`}
              role="status"
              aria-live="polite"
            >
              {emailLooksReady
                ? "Email format looks ready to check."
                : "Enter a complete email address, including @ and a domain."}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="py-3 rounded-xl bg-black text-white font-semibold text-lg shadow-lg cursor-pointer hover:bg-blue-600 hover:opacity-90 transition disabled:cursor-wait disabled:bg-gray-500"
          >
            {isSubmitting ? "Checking access…" : "Login"}
          </button>
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
      </div>

      {/* Toastify */}
      <ToastContainer position="top-right" autoClose={3000} />
    </main>
  );
}
