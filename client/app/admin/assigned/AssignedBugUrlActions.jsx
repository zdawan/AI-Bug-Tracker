"use client";

import { Check, Clipboard, ExternalLink } from "lucide-react";
import { useState } from "react";

export default function AssignedBugUrlActions({ url }) {
  const [copied, setCopied] = useState(false);
  if (!url) return null;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">
        Test URL actions
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >
          <ExternalLink size={14} aria-hidden="true" />
          Open URL
        </a>
        <button
          type="button"
          onClick={copyUrl}
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >
          {copied ? <Check size={14} aria-hidden="true" /> : <Clipboard size={14} aria-hidden="true" />}
          {copied ? "Copied" : "Copy URL"}
        </button>
      </div>
    </div>
  );
}
