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
        <div className="mb-5 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-100 bg-purple-50 text-purple-700">
            <Globe size={26} strokeWidth={1.8} />
          </div>
        </div>

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

        <UrlReadinessGuide url={url} onUseExample={setUrl} />

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

const URL_ENTRY_EXAMPLES = [
  {
    label: "Website home",
    value: "https://example.com",
    description: "Start at the main page",
    icon: "01",
  },
  {
    label: "Specific page",
    value: "https://example.com/products",
    description: "Include the route to test",
    icon: "02",
  },
  {
    label: "Nested route",
    value: "https://example.com/account/settings",
    description: "Point to a deeper screen",
    icon: "03",
  },
  {
    label: "Local preview",
    value: "http://localhost:3000",
    description: "Use a local development site",
    icon: "04",
  },
];

const URL_GUIDE_STEPS = [
  {
    title: "Choose the exact destination",
    description:
      "Use the page where the issue appears, not just the website home page.",
    detail:
      "A precise path makes it easier to understand which screen and workflow you were testing.",
  },
  {
    title: "Use a site you are allowed to test",
    description:
      "Only test websites and environments you own or have permission to assess.",
    detail:
      "For a team project, confirm the target is an approved development, staging, or production environment.",
  },
  {
    title: "Keep private tokens out of the address",
    description:
      "Avoid pasting links that contain temporary access tokens or private credentials.",
    detail:
      "Query strings can carry sensitive data. Remove private values before sharing a test destination.",
  },
  {
    title: "Check the protocol and page path",
    description:
      "HTTPS is preferred for public websites; keep the path if the bug is page-specific.",
    detail:
      "Local development servers commonly use HTTP. Do not change a local preview protocol unless that server supports it.",
  },
];

function inspectTesterUrl(value) {
  const entered = value.trim();

  if (!entered) {
    return {
      state: "empty",
      normalized: "",
      protocol: "",
      hostname: "",
      pathname: "",
      queryCount: 0,
      hasFragment: false,
      message: "Add a website name or page URL to see its destination details.",
    };
  }

  const normalized = /^https?:\/\//i.test(entered)
    ? entered
    : `https://${entered}`;

  let parsed;

  try {
    parsed = new URL(normalized);
  } catch {
    return {
      state: "invalid",
      normalized,
      protocol: "",
      hostname: "",
      pathname: "",
      queryCount: 0,
      hasFragment: false,
      message: "This value could not be read as a web address.",
    };
  }

  const hasWebProtocol = ["http:", "https:"].includes(parsed.protocol);
  const hasDottedHostname =
    parsed.hostname.includes(".") &&
    !parsed.hostname.startsWith(".") &&
    !parsed.hostname.endsWith(".") &&
    !/\s/.test(parsed.hostname);

  if (!hasWebProtocol || !hasDottedHostname) {
    return {
      state: "invalid",
      normalized: parsed.href,
      protocol: parsed.protocol.replace(":", ""),
      hostname: parsed.hostname,
      pathname: parsed.pathname,
      queryCount: [...parsed.searchParams.keys()].length,
      hasFragment: Boolean(parsed.hash),
      message:
        "Use a valid website domain such as example.com, with an optional page path.",
    };
  }

  const usesSecureProtocol = parsed.protocol === "https:";
  const hasSensitiveQuery = [...parsed.searchParams.keys()].some((key) =>
    /token|secret|password|session|auth|key/i.test(key),
  );

  return {
    state: "valid",
    normalized: parsed.href,
    protocol: parsed.protocol.replace(":", ""),
    hostname: parsed.hostname,
    pathname: parsed.pathname,
    queryCount: [...parsed.searchParams.keys()].length,
    hasFragment: Boolean(parsed.hash),
    usesSecureProtocol,
    hasSensitiveQuery,
    message: usesSecureProtocol
      ? "This address uses HTTPS and is ready to continue."
      : "This address uses HTTP. That is common for local previews; check before using it for a public website.",
  };
}

function UrlGuideStatus({ state, message }) {
  const styles = {
    empty: "border-slate-200 bg-slate-50 text-slate-600",
    valid: "border-emerald-200 bg-emerald-50 text-emerald-800",
    invalid: "border-rose-200 bg-rose-50 text-rose-800",
  };

  const labels = {
    empty: "Waiting for a URL",
    valid: "URL format looks good",
    invalid: "Check this address",
  };

  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        styles[state] || styles.empty
      }`}
      role={state === "invalid" ? "alert" : "status"}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/80 text-xs font-bold"
        >
          {state === "valid" ? "✓" : state === "invalid" ? "!" : "i"}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{labels[state] || labels.empty}</p>
          <p className="mt-1 break-words text-xs leading-5 opacity-90">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

function UrlDetail({ label, value, hint }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200/80 bg-white px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-semibold text-slate-800">
        {value || "—"}
      </p>
      {hint && (
        <p className="mt-1 text-[11px] leading-4 text-slate-500">{hint}</p>
      )}
    </div>
  );
}

function UrlExampleCard({ example, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(example.value)}
      aria-pressed={selected}
      className={`group flex h-full w-full items-start gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 ${
        selected
          ? "border-violet-300 bg-violet-50/80"
          : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40"
      }`}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[10px] font-bold ${
          selected
            ? "bg-violet-700 text-white"
            : "bg-slate-100 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-700"
        }`}
      >
        {example.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-slate-800">
          {example.label}
        </span>
        <span className="mt-1 block break-all text-[11px] leading-4 text-slate-500">
          {example.value}
        </span>
        <span className="mt-1 block text-[10px] leading-4 text-slate-400">
          {example.description}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${
          selected
            ? "border-[5px] border-violet-600 bg-white"
            : "border-slate-300 bg-white group-hover:border-violet-300"
        }`}
      />
    </button>
  );
}

function UrlGuideStep({ step, index, isLast }) {
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!isLast && (
        <span
          aria-hidden="true"
          className="absolute left-[13px] top-8 h-[calc(100%-1rem)] w-px bg-slate-200"
        />
      )}
      <span className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-violet-100 bg-violet-50 text-[10px] font-bold text-violet-700">
        {index + 1}
      </span>
      <div className="min-w-0 pb-1">
        <h4 className="text-xs font-semibold text-slate-800">{step.title}</h4>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">
          {step.description}
        </p>
        <p className="mt-1 text-[10px] leading-4 text-slate-400">
          {step.detail}
        </p>
      </div>
    </li>
  );
}

function UrlReadinessGuide({ url, onUseExample }) {
  const [showAllSteps, setShowAllSteps] = useState(false);
  const inspected = inspectTesterUrl(url);
  const selectedExample = URL_ENTRY_EXAMPLES.find(
    (example) => example.value === url.trim(),
  );
  const visibleSteps = showAllSteps
    ? URL_GUIDE_STEPS
    : URL_GUIDE_STEPS.slice(0, 2);

  return (
    <section
      className="mt-6 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40"
      aria-labelledby="url-readiness-heading"
    >
      <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50/80 via-white to-sky-50/60 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-violet-100 bg-white text-violet-700 shadow-sm">
            <Globe size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600">
              Before you continue
            </p>
            <h2
              id="url-readiness-heading"
              className="mt-1 text-base font-semibold text-slate-900"
            >
              Check your test destination
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Review the address and choose a precise page so your report starts
              with the right context.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        <UrlGuideStatus state={inspected.state} message={inspected.message} />

        {inspected.state !== "empty" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-slate-700">
                Destination breakdown
              </h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-500">
                Preview only · no connection is made
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <UrlDetail
                label="Protocol"
                value={inspected.protocol}
                hint={
                  inspected.usesSecureProtocol
                    ? "Encrypted web connection"
                    : inspected.protocol === "http"
                      ? "Use for local previews or approved targets"
                      : "Web protocol"
                }
              />
              <UrlDetail
                label="Website"
                value={inspected.hostname}
                hint="The host that will be included in the report"
              />
              <UrlDetail
                label="Page path"
                value={inspected.pathname}
                hint={
                  inspected.pathname === "/"
                    ? "Root page"
                    : "Specific route within the website"
                }
              />
              <UrlDetail
                label="Extra address data"
                value={
                  inspected.queryCount
                    ? `${inspected.queryCount} query ${
                        inspected.queryCount === 1 ? "parameter" : "parameters"
                      }`
                    : inspected.hasFragment
                      ? "Page fragment"
                      : "None"
                }
                hint="Review query values before sharing private links"
              />
            </div>
            {inspected.hasSensitiveQuery && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                This address contains a query parameter that may be sensitive.
                Remove private values before continuing.
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-slate-700">
                Quick examples
              </h3>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">
                Select an example to put it in the URL field above.
              </p>
            </div>
            <span className="text-[10px] text-slate-400">
              Examples do not submit a report
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {URL_ENTRY_EXAMPLES.map((example) => (
              <UrlExampleCard
                key={example.value}
                example={example}
                selected={selectedExample?.value === example.value}
                onSelect={onUseExample}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-slate-800">
                Destination checklist
              </h3>
              <p className="mt-1 text-[11px] text-slate-500">
                A few checks before you open the report form.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAllSteps((visible) => !visible)}
              aria-expanded={showAllSteps}
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100"
            >
              {showAllSteps ? "Show fewer checks" : "Show all checks"}
            </button>
          </div>
          <ol className="mt-4">
            {visibleSteps.map((step, index) => (
              <UrlGuideStep
                key={step.title}
                step={step}
                index={index}
                isLast={index === visibleSteps.length - 1}
              />
            ))}
          </ol>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
          <span
            aria-hidden="true"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-violet-700"
          >
            <ExternalLink size={14} />
          </span>
          <p className="text-[11px] leading-5 text-slate-600">
            The destination preview is generated from your input only. This
            page does not visit the website or verify whether it is reachable.
            Continue when the address and testing permission are correct.
          </p>
        </div>
      </div>
    </section>
  );
}