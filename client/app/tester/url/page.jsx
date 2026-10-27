"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function TesterPage() {
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const normalizeUrl = (value) => {
    const trimmed = value.trim();

    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      toast.error("Please enter a URL", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(normalizeUrl(trimmedUrl));
    } catch {
      toast.error("Invalid URL, please enter a valid one", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    if (
      !["http:", "https:"].includes(parsedUrl.protocol) ||
      !parsedUrl.hostname.includes(".") ||
      parsedUrl.hostname.startsWith(".") ||
      parsedUrl.hostname.endsWith(".")
    ) {
      toast.error("Please enter a valid website URL", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setIsSubmitting(true);

    router.push(
      `/tester/url-bug-report?url=${encodeURIComponent(parsedUrl.href)}`,
    );
  };

  const previewUrl = url.trim()
    ? normalizeUrl(url.trim())
    : "https://github.com/";

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
        className="pointer-events-none absolute left-1/2 top-1/2 h-[min(90vw,600px)] w-[min(90vw,600px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-200/25 blur-3xl"
      />

      <section className="relative z-10 w-full max-w-[560px] rounded-[28px] border border-white/80 bg-white/90 px-6 py-10 shadow-[0_28px_70px_-28px_rgba(38,25,55,0.30)] backdrop-blur-xl sm:px-10 sm:py-12">
        <header className="text-center">
          <h1 className="text-3xl font-semibold leading-tight tracking-[-1px] text-[#111827] sm:text-4xl">
            Enter{" "}
            <span
              className="font-normal italic tracking-[-1.5px]"
              style={{ fontFamily: "Times New Roman, Times, serif" }}
            >
              Test URL
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-[390px] text-base leading-7 text-[#596579]">
            Paste the testing URL you’re testing.
            <br />
            We’ll attach it to your bug reports.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div>
            <label htmlFor="test-url" className="sr-only">
              Test website URL
            </label>

            <input
              id="test-url"
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder="https://example.com"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              aria-describedby="url-preview"
              className="h-14 w-full rounded-2xl border border-[#d4d8e1] bg-white px-4 text-base text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 hover:border-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="group flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-black px-5 text-base font-semibold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-[#202020] hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-200 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
          >
            {isSubmitting ? "Continuing..." : "Continue"}

            {!isSubmitting && (
              <ArrowRight
                size={19}
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-1"
              />
            )}
          </button>

          <div
            id="url-preview"
            className="flex min-h-7 items-center justify-center gap-2 text-center text-sm text-[#596579] sm:text-base"
          >
            <span className="shrink-0 font-medium">Test URL:</span>

            <span className="max-w-[260px] truncate" title={previewUrl}>
              {previewUrl}
            </span>

            {url.trim() && (
              <ExternalLink
                size={15}
                aria-hidden="true"
                className="shrink-0 text-slate-400"
              />
            )}
          </div>
        </form>

        <footer className="mt-12 border-t border-slate-100 pt-6 text-center text-sm text-[#596579] sm:mt-14 sm:text-base">
          Already reported a bug?{" "}
          <Link
            href="/tester/dashboard"
            className="cursor-pointer font-semibold text-purple-700 underline decoration-purple-300 underline-offset-4 transition hover:text-purple-900 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            View my reports
          </Link>
        </footer>
      </section>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        theme="light"
        closeOnClick
        pauseOnHover
      />
    </main>
  );
}
