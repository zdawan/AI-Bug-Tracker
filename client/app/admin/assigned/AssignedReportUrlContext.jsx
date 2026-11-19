"use client";

import { Globe2, Link2Off, ShieldCheck } from "lucide-react";

export default function AssignedReportUrlContext({ url }) {
  const value = typeof url === "string" ? url.trim() : "";
  const isMissing = !value;
  const isSecure = value.startsWith("https://");
  const isLocal = /localhost|127\.0\.0\.1/i.test(value);
  const label = isMissing ? "URL missing" : isLocal ? "Local target" : isSecure ? "Secure target" : "Review scheme";
  const detail = isMissing
    ? "No destination was supplied"
    : isLocal
      ? "Only available from a local environment"
      : isSecure
        ? "Uses an encrypted connection"
        : "The destination is not using HTTPS";
  const environmentLabel = isLocal ? "Development" : isMissing ? "Unknown" : "External";
  const reviewHint = isMissing ? "Ask the tester for a destination" : "Confirm the target before opening";
  const tone = isMissing || !isSecure
    ? "text-amber-700"
    : "text-emerald-700";
  const Icon = isMissing ? Link2Off : isSecure ? ShieldCheck : Globe2;

  return (
    <span
      className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold ${tone}`}
      title={detail}
      aria-label={`${label}: ${detail}`}
      role="status"
      aria-live="polite"
    >
      <Icon size={11} aria-hidden="true" />
      <span>
        <span className="block">{label}</span>
        <span className="block text-[9px] font-normal opacity-75">{environmentLabel} · {reviewHint}</span>
      </span>
    </span>
  );
}
