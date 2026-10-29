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

  const copyPreviewUrl = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable.");
      }

      await navigator.clipboard.writeText(getPreviewUrl());
      toast.success("Test URL copied.", {
        position: "top-right",
        autoClose: 3000,
      });
    } catch {
      toast.error("Could not copy the URL. Please copy it manually.", {
        position: "top-right",
        autoClose: 3000,
      });
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
      (!parsedUrl.hostname.includes(".") &&
        parsedUrl.hostname !== "localhost") ||
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
                aria-describedby="test-url-hint"
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

            <p
              id="test-url-hint"
              className="mt-2 px-1 text-sm leading-5 text-slate-500"
            >
              Enter a name like github.com or a full page URL.
            </p>
            <UrlLengthIndicator value={url} />
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
              <button
                type="button"
                onClick={copyPreviewUrl}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700"
              >
                Copy URL
              </button>
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

const URL_AUDIT_CATEGORIES = [
  { value: "all", label: "All checks" },
  { value: "privacy", label: "Privacy" },
  { value: "transport", label: "Connection" },
  { value: "sharing", label: "Shared data" },
];

const SENSITIVE_PARAMETER_PATTERN =
  /(^|[_-])(token|access[_-]?token|refresh[_-]?token|secret|password|passwd|session|sessionid|auth|authorization|api[_-]?key|client[_-]?secret|credential|signature|jwt)([_-]|$)/i;

const PERSONAL_PARAMETER_PATTERN =
  /(^|[_-])(email|e-mail|phone|mobile|telephone|address|username|user[_-]?name|birth[_-]?date|dob)([_-]|$)/i;

const PRIVATE_HOST_PATTERN =
  /(^localhost$|\.localhost$|\.local$|\.internal$|\.test$|^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\.)/i;

function makeUrlAuditCheck({
  id,
  category,
  state,
  title,
  detail,
  recommendation,
  evidence,
}) {
  return {
    id,
    category,
    state,
    title,
    detail,
    recommendation,
    evidence,
  };
}

function getFlaggedQueryParameterNames(parsed) {
  const flaggedNames = new Set();

  for (const [key, value] of parsed.searchParams.entries()) {
    const cleanKey = key.trim();
    const valueLooksSensitive =
      value &&
      /^(bearer\s+|eyJ[a-zA-Z0-9_-]{10,}\.|gh[pousr]_[a-zA-Z0-9]{12,})/i.test(
        value,
      );

    if (
      SENSITIVE_PARAMETER_PATTERN.test(cleanKey) ||
      PERSONAL_PARAMETER_PATTERN.test(cleanKey) ||
      valueLooksSensitive
    ) {
      flaggedNames.add(key);
    }
  }

  return flaggedNames;
}

function getQueryParameterSummary(parsed) {
  const flaggedNames = getFlaggedQueryParameterNames(parsed);
  const parameters = new Map();

  for (const [name] of parsed.searchParams.entries()) {
    const existing = parameters.get(name);

    if (existing) {
      existing.occurrences += 1;
    } else {
      parameters.set(name, {
        name,
        occurrences: 1,
        flagged: flaggedNames.has(name),
      });
    }
  }

  return [...parameters.values()];
}

function getUrlAuditChecks(value) {
  const entered = value.trim();

  if (!entered) {
    return [
      makeUrlAuditCheck({
        id: "destination",
        category: "sharing",
        state: "neutral",
        title: "No destination to review yet",
        detail: "The audit updates locally as you enter a URL.",
        recommendation: "Enter the destination you intend to test.",
      }),
    ];
  }

  const normalized = /^https?:\/\//i.test(entered)
    ? entered
    : `https://${entered}`;
  let parsed;

  try {
    parsed = new URL(normalized);
  } catch {
    return [
      makeUrlAuditCheck({
        id: "parse",
        category: "sharing",
        state: "attention",
        title: "Address could not be inspected",
        detail: "The text is not currently parseable as a web address.",
        recommendation: "Check for missing separators, spaces, or typos.",
      }),
    ];
  }

  const checks = [];
  const isHttp = parsed.protocol === "http:";
  const isHttps = parsed.protocol === "https:";
  const isPrivateHost = PRIVATE_HOST_PATTERN.test(parsed.hostname);
  const isLoopbackHost =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "[::1]";
  const sensitiveKeys = [];
  const personalKeys = [];

  for (const [key, queryValue] of parsed.searchParams.entries()) {
    const cleanKey = key.trim();

    if (SENSITIVE_PARAMETER_PATTERN.test(cleanKey)) {
      sensitiveKeys.push(cleanKey);
    } else if (PERSONAL_PARAMETER_PATTERN.test(cleanKey)) {
      personalKeys.push(cleanKey);
    }

    if (
      queryValue &&
      /^(bearer\s+|eyJ[a-zA-Z0-9_-]{10,}\.|gh[pousr]_[a-zA-Z0-9]{12,})/i.test(
        queryValue,
      ) &&
      !sensitiveKeys.includes(cleanKey)
    ) {
      sensitiveKeys.push(cleanKey || "unnamed parameter");
    }
  }

  checks.push(
    makeUrlAuditCheck({
      id: "transport",
      category: "transport",
      state: isHttps ? "good" : isHttp ? "attention" : "attention",
      title: isHttps ? "HTTPS is enabled" : "Connection is not HTTPS",
      detail: isHttps
        ? "The address uses an encrypted web protocol."
        : "The address uses HTTP, so traffic is not encrypted in transit.",
      recommendation: isHttps
        ? "Keep the secure protocol for public websites."
        : isLoopbackHost
          ? "HTTP is expected for many local previews."
          : "Prefer HTTPS for public or shared destinations.",
      evidence: parsed.protocol.replace(":", "").toUpperCase(),
    }),
  );

  checks.push(
    makeUrlAuditCheck({
      id: "credentials",
      category: "privacy",
      state:
        parsed.username || parsed.password
          ? "attention"
          : "good",
      title:
        parsed.username || parsed.password
          ? "Credentials appear in the address"
          : "No embedded credentials detected",
      detail:
        parsed.username || parsed.password
          ? "A user name or password is embedded before the host."
          : "The address does not contain URL user-name or password fields.",
      recommendation:
        parsed.username || parsed.password
          ? "Remove credentials and use an approved sign-in workflow instead."
          : "Avoid adding account credentials to a shared URL.",
    }),
  );

  checks.push(
    makeUrlAuditCheck({
      id: "secret-query",
      category: "privacy",
      state: sensitiveKeys.length ? "attention" : "good",
      title: sensitiveKeys.length
        ? "Possible secret in query parameter name"
        : "No sensitive query names detected",
      detail: sensitiveKeys.length
        ? "Parameter names may indicate access tokens, keys, or session data. Values are intentionally hidden."
        : "No query parameter names matched common secret indicators.",
      recommendation: sensitiveKeys.length
        ? "Remove secrets from the URL before sharing it or opening the report form."
        : "Still review the link manually; unusual secrets may not be recognized.",
      evidence: sensitiveKeys.length
        ? sensitiveKeys.map((key) => maskParameterName(key))
        : undefined,
    }),
  );

  checks.push(
    makeUrlAuditCheck({
      id: "personal-query",
      category: "privacy",
      state: personalKeys.length ? "attention" : "good",
      title: personalKeys.length
        ? "Personal-data query names detected"
        : "No common personal-data query names detected",
      detail: personalKeys.length
        ? "Parameter names may contain contact or profile data. Values are never shown here."
        : "No common email, phone, address, or profile parameter names were found.",
      recommendation: personalKeys.length
        ? "Remove personal values unless they are essential and approved for the report."
        : "Check the destination manually for personal information in other fields.",
      evidence: personalKeys.length
        ? personalKeys.map((key) => maskParameterName(key))
        : undefined,
    }),
  );

  const queryCount = [...parsed.searchParams.keys()].length;
  checks.push(
    makeUrlAuditCheck({
      id: "query-data",
      category: "sharing",
      state: queryCount > 0 ? "neutral" : "good",
      title: queryCount
        ? `${queryCount} query ${
            queryCount === 1 ? "parameter is" : "parameters are"
          } attached`
        : "No query parameters attached",
      detail: queryCount
        ? "Query values are excluded from this audit display to avoid exposing them."
        : "The address does not include query-string data.",
      recommendation: queryCount
        ? "Inspect the original link locally and remove values that are not needed."
        : "No query-string cleanup is needed.",
      evidence: queryCount
        ? [...new Set([...parsed.searchParams.keys()])].map(maskParameterName)
        : undefined,
    }),
  );

  checks.push(
    makeUrlAuditCheck({
      id: "fragment",
      category: "sharing",
      state: parsed.hash ? "neutral" : "good",
      title: parsed.hash
        ? "Page fragment is included"
        : "No page fragment attached",
      detail: parsed.hash
        ? "The part after # may identify a client-side section and is not sent to the server."
        : "The address does not include an anchor or client-side fragment.",
      recommendation: parsed.hash
        ? "Keep the fragment if it is needed to reproduce the issue; otherwise remove it."
        : "No fragment review is needed.",
    }),
  );

  checks.push(
    makeUrlAuditCheck({
      id: "host-scope",
      category: "transport",
      state: isPrivateHost ? "neutral" : "good",
      title: isPrivateHost
        ? "Local or private host detected"
        : "Public-style host name",
      detail: isPrivateHost
        ? "This address appears to use localhost, a private network, or a development-only domain."
        : "The host does not match the common local or private-host patterns.",
      recommendation: isPrivateHost
        ? "Confirm the environment is accessible to the people and services involved in testing."
        : "This check cannot verify ownership, authorization, or reachability.",
      evidence: parsed.hostname,
    }),
  );

  const port = parsed.port;
  const standardPort =
    !port ||
    (isHttp && port === "80") ||
    (isHttps && port === "443");
  checks.push(
    makeUrlAuditCheck({
      id: "port",
      category: "transport",
      state: standardPort ? "good" : "neutral",
      title: standardPort
        ? "Standard web port"
        : `Custom port ${port} is specified`,
      detail: standardPort
        ? "No non-standard port is visible in the address."
        : "Custom ports are often used by preview environments and local servers.",
      recommendation: standardPort
        ? "No port review is needed."
        : "Confirm the target environment is approved and the port is intentional.",
      evidence: port || (isHttps ? "443" : "80"),
    }),
  );

  const addressLength = entered.length;
  const lengthState =
    addressLength > 2000
      ? "attention"
      : addressLength > 500
        ? "neutral"
        : "good";
  checks.push(
    makeUrlAuditCheck({
      id: "length",
      category: "sharing",
      state: lengthState,
      title:
        lengthState === "attention"
          ? "Address is unusually long"
          : lengthState === "neutral"
            ? "Address is longer than typical"
            : "Address length looks typical",
      detail: `${addressLength} characters entered. Long links can include unnecessary tracking or state data.`,
      recommendation:
        lengthState === "attention"
          ? "Review and shorten the link before continuing."
          : lengthState === "neutral"
            ? "Remove unused tracking parameters if they are not needed."
            : "No length cleanup is suggested.",
      evidence: `${addressLength} characters`,
    }),
  );

  return checks;
}

function maskParameterName(value) {
  const key = String(value || "").trim();

  if (!key) return "unnamed parameter";
  if (key.length <= 4) return `${key.slice(0, 1)}***`;

  return `${key.slice(0, 2)}***${key.slice(-1)}`;
}

function UrlAuditBadge({ state }) {
  const styles = {
    good: "bg-emerald-100 text-emerald-800",
    attention: "bg-amber-100 text-amber-900",
    neutral: "bg-slate-100 text-slate-600",
  };

  const labels = {
    good: "Looks good",
    attention: "Review",
    neutral: "Note",
  };

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
        styles[state] || styles.neutral
      }`}
    >
      {labels[state] || labels.neutral}
    </span>
  );
}

function UrlAuditCheck({ check }) {
  const accentStyles = {
    good: "border-emerald-200",
    attention: "border-amber-200",
    neutral: "border-slate-200",
  };

  return (
    <article
      className={`rounded-xl border bg-white p-3 ${
        accentStyles[check.state] || accentStyles.neutral
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-xs font-semibold text-slate-800">
            {check.title}
          </h4>
          <p className="mt-1 text-[11px] leading-5 text-slate-600">
            {check.detail}
          </p>
        </div>
        <UrlAuditBadge state={check.state} />
      </div>
      <p className="mt-2 border-t border-slate-100 pt-2 text-[10px] leading-4 text-slate-500">
        <span className="font-semibold text-slate-600">Next step: </span>
        {check.recommendation}
      </p>
      {check.evidence && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(Array.isArray(check.evidence)
            ? check.evidence
            : [check.evidence]
          ).map((item, index) => (
            <span
              key={`${check.id}-${index}`}
              className="max-w-full truncate rounded-md bg-slate-50 px-2 py-1 font-mono text-[9px] text-slate-500"
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function UrlPrivacyAudit({ url, onChangeUrl }) {
  const [expanded, setExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const checks = getUrlAuditChecks(url);
  const parsedUrl = (() => {
    const entered = url.trim();

    if (!entered) return null;

    try {
      const normalized = /^https?:\/\//i.test(entered)
        ? entered
        : `https://${entered}`;
      return new URL(normalized);
    } catch {
      return null;
    }
  })();
  const queryParameters = parsedUrl
    ? getQueryParameterSummary(parsedUrl)
    : [];
  const flaggedParameterNames = parsedUrl
    ? getFlaggedQueryParameterNames(parsedUrl)
    : new Set();
  const reviewCount = checks.filter(
    (check) => check.state === "attention",
  ).length;
  const filteredChecks =
    activeCategory === "all"
      ? checks
      : checks.filter((check) => check.category === activeCategory);
  const displayedChecks = expanded
    ? filteredChecks
    : filteredChecks.slice(0, 3);

  return (
    <section
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
      aria-labelledby="url-privacy-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
            <span aria-hidden="true" className="text-sm font-bold">
              {reviewCount ? "!" : "✓"}
            </span>
          </span>
          <div className="min-w-0">
            <h3
              id="url-privacy-heading"
              className="text-xs font-semibold text-slate-800"
            >
              Privacy and target review
            </h3>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              {reviewCount
                ? `${reviewCount} item${reviewCount === 1 ? "" : "s"} worth reviewing. Nothing is blocked.`
                : "Local checks only; review the destination before continuing."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls="url-privacy-details"
          className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700"
        >
          {expanded ? "Hide review" : "Review URL"}
        </button>
      </div>

      {expanded && (
        <div
          id="url-privacy-details"
          className="border-t border-slate-100 bg-slate-50/60 px-4 py-4"
        >
          <p className="text-[11px] leading-5 text-slate-500">
            This check runs in your browser and does not contact the
            destination. Query values and credentials are never displayed by
            the review panel.
          </p>
          {queryParameters.length > 0 && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="text-[11px] font-semibold text-slate-800">
                    Query parameter review
                  </h4>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500">
                    Names are masked and values stay hidden. Review these
                    parameters before sharing the destination.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                  {queryParameters.length} unique ·{" "}
                  {[...parsedUrl.searchParams.keys()].length} total
                </span>
              </div>
              <ul className="mt-3 divide-y divide-slate-100">
                {queryParameters.map((parameter, index) => (
                  <li
                    key={`${parameter.name}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                  >
                    <span className="font-mono text-[10px] text-slate-600">
                      {maskParameterName(parameter.name)}
                    </span>
                    <span className="flex items-center gap-2 text-[10px]">
                      {parameter.occurrences > 1 && (
                        <span className="text-slate-400">
                          {parameter.occurrences} occurrences
                        </span>
                      )}
                      <span
                        className={
                          parameter.flagged
                            ? "font-semibold text-amber-700"
                            : "text-slate-500"
                        }
                      >
                        {parameter.flagged ? "Flagged" : "Not recognized"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const cleaned = new URL(parsedUrl.href);
                    cleaned.search = "";
                    onChangeUrl(cleaned.href);
                    toast.success("All query parameters removed.");
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-700 transition hover:border-violet-200 hover:text-violet-700"
                >
                  Remove all query data
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (!navigator.clipboard?.writeText) {
                        throw new Error("Clipboard access is unavailable.");
                      }

                      const cleaned = new URL(parsedUrl.href);
                      cleaned.search = "";
                      await navigator.clipboard.writeText(cleaned.href);
                      toast.success("Query-free URL copied.");
                    } catch {
                      toast.error(
                        "Could not copy the cleaned URL. Please copy it manually.",
                      );
                    }
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-700 transition hover:border-violet-200 hover:text-violet-700"
                >
                  Copy query-free URL
                </button>
              </div>
            </div>
          )}
          {flaggedParameterNames.size > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-[11px] leading-5 text-amber-900">
                {flaggedParameterNames.size} query{" "}
                {flaggedParameterNames.size === 1 ? "parameter" : "parameters"}{" "}
                flagged for review.
              </p>
              <button
                type="button"
                onClick={() => {
                  const entered = url.trim();
                  const normalized = /^https?:\/\//i.test(entered)
                    ? entered
                    : `https://${entered}`;
                  const cleaned = new URL(normalized);

                  for (const name of flaggedParameterNames) {
                    cleaned.searchParams.delete(name);
                  }

                  onChangeUrl(cleaned.href);
                }}
                className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[10px] font-semibold text-amber-900 transition hover:bg-amber-100"
              >
                Remove flagged parameters
              </button>
            </div>
          )}
          <div
            className="mt-3 flex gap-2 overflow-x-auto pb-2"
            aria-label="Filter URL audit checks"
          >
            {URL_AUDIT_CATEGORIES.map((category) => {
              const count =
                category.value === "all"
                  ? checks.length
                  : checks.filter(
                      (check) => check.category === category.value,
                    ).length;

              return (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setActiveCategory(category.value)}
                  aria-pressed={activeCategory === category.value}
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition ${
                    activeCategory === category.value
                      ? "bg-violet-700 text-white"
                      : "border border-slate-200 bg-white text-slate-500 hover:text-violet-700"
                  }`}
                >
                  {category.label} ({count})
                </button>
              );
            })}
          </div>
          <div className="mt-2 grid gap-2">
            {displayedChecks.map((check) => (
              <UrlAuditCheck key={check.id} check={check} />
            ))}
          </div>
          {filteredChecks.length > displayedChecks.length && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600 hover:border-violet-200 hover:text-violet-700"
            >
              Show remaining checks
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function UrlLengthIndicator({ value }) {
  const length = value.length;
  const isLong = length > 500;
  const isVeryLong = length > 2000;

  return (
    <div className="mt-2 flex flex-wrap items-start justify-between gap-2 px-1">
      <p
        className={`text-[11px] leading-4 ${
          isVeryLong
            ? "font-medium text-rose-700"
            : isLong
              ? "text-amber-700"
              : "text-slate-400"
        }`}
        aria-live={isLong ? "polite" : "off"}
      >
        {isVeryLong
          ? "This link is very long. Check for extra tracking or private data."
          : isLong
            ? "Long links can contain extra tracking or private data."
            : "Short links are easier to review and share."}
      </p>
      <span
        className={`shrink-0 text-[10px] tabular-nums ${
          isVeryLong
            ? "font-semibold text-rose-700"
            : isLong
              ? "text-amber-700"
              : "text-slate-400"
        }`}
        aria-label={`${length} characters in the address`}
        aria-live={isLong ? "polite" : "off"}
      >
        {length.toLocaleString("en-IN")} characters
      </span>
    </div>
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
  const hasAcceptableHostname =
    (parsed.hostname === "localhost" || parsed.hostname.includes(".")) &&
    !parsed.hostname.startsWith(".") &&
    !parsed.hostname.endsWith(".") &&
    !/\s/.test(parsed.hostname);

  if (!hasWebProtocol || !hasAcceptableHostname) {
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

        <UrlPrivacyAudit url={url} onChangeUrl={onUseExample} />

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