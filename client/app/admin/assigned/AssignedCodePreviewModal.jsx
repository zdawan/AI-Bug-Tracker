"use client";

import { Check, Clipboard, Code2, X } from "lucide-react";
import { useState } from "react";

export default function AssignedCodePreviewModal({ code, onClose }) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <header className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Code2 size={17} aria-hidden="true" className="text-violet-600" />
            Report code preview
          </div>
          <button type="button" onClick={onClose} aria-label="Close code preview" title="Close code preview" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
            <X size={17} aria-hidden="true" />
          </button>
        </header>
        <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-100 whitespace-pre-wrap">{code}</pre>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={copyCode} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
            {copied ? <Check size={14} aria-hidden="true" /> : <Clipboard size={14} aria-hidden="true" />}
            {copied ? "Copied" : "Copy code"}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
