"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, Globe } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function TesterPage() {
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const normalizeUrl = (value) => {
    const trimmed = value.trim();

    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    return `https://${trimmed}`;
  };

  const getPreviewUrl = () => {
    if (!url.trim()) {
      return "https://github.com/";
    }

    try {
      return normalizeUrl(url);
    } catch {
      return url.trim();
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    const enteredValue = url.trim();

    if (!enteredValue) {
      toast.error("Please enter a website name.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(normalizeUrl(enteredValue));
    } catch {
      toast.error("Please enter a valid website name, such as github.com.", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    if (
      !["http:", "https:"].includes(parsedUrl.protocol) ||
      !parsedUrl.hostname.includes(".") ||
      parsedUrl.hostname.startsWith(".") ||
      parsedUrl.hostname.endsWith(".") ||
      /\s/.test(parsedUrl.hostname)
    ) {
      toast.error("Please enter a valid website domain, such as github.com.", {
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
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
          aria-label="Go back to previous page"
        >
          <ArrowLeft size={18} />
          Back
        </button>
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
            Enter the website you want to test.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div>
            <label htmlFor="test-url" className="sr-only">
              Website name or URL
            </label>

            <div className="flex h-14 items-center gap-3 rounded-2xl border border-[#d4d8e1] bg-white px-4 shadow-sm transition hover:border-gray-400 focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-100">
              <Globe
                size={20}
                aria-hidden="true"
                className="shrink-0 text-slate-400"
              />

              <input
                id="test-url"
                type="text"
                inputMode="url"
                autoComplete="url"
                placeholder="e.g. github.com"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                required
                className="h-full min-w-0 flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400"
              />

              {url && (
                <button
                  type="button"
                  onClick={() => setUrl("")}
                  aria-label="Clear website name"
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <span aria-hidden="true" className="text-2xl leading-none">
                    ×
                  </span>
                </button>
              )}
            </div>

            <p className="mt-2 px-1 text-sm leading-5 text-slate-500">
              Enter a name like github.com or a full page URL.
            </p>
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

          <div className="mt-1 rounded-xl bg-slate-50 px-4 py-3">
            <p className="mb-1 text-sm font-semibold text-slate-700">
              Test URL preview
            </p>

            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 break-all text-sm leading-6 text-slate-600 sm:text-base">
                {getPreviewUrl()}
              </p>

              <ExternalLink
                size={16}
                aria-hidden="true"
                className="mt-1 shrink-0 text-slate-400"
              />
            </div>
          </div>
        </form>

        <footer className="mt-10 border-t border-slate-100 pt-6 text-center text-base text-[#596579] sm:mt-12">
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