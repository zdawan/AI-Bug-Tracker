"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";

export default function OtpForm({ email, onBack }) {
  const router = useRouter();
  const [otp, setOtp] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    // TEMPORARY TEST MODE: no real OTP verification.
    if (otp.trim() !== "" && !/^\d{6}$/.test(otp.trim())) {
      toast.error("Enter a 6-digit number or leave it empty.");
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

  return (
    <div>
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

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="tester-otp"
            className="block text-sm font-semibold text-slate-800"
          >
            Verification code
          </label>

          <input
            id="tester-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            placeholder="123456"
            value={otp}
            onChange={(event) =>
              setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="h-16 w-full rounded-2xl border border-slate-300 bg-white text-center text-2xl font-semibold tracking-[0.55em] text-slate-950 outline-none transition placeholder:text-slate-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
          />
        </div>

        <button
          type="submit"
          className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-black px-5 text-base font-semibold text-white transition hover:bg-gray-800"
        >
          Verify and continue
          <ArrowRight size={19} />
        </button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-4 text-sm">
        <button
          type="button"
          onClick={() => setOtp("")}
          className="inline-flex cursor-pointer items-center gap-2 font-semibold text-purple-700 hover:text-purple-900"
        >
          <RefreshCw size={15} />
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
