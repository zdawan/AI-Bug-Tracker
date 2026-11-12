"use client";

import { Sparkles } from "lucide-react";

export default function TesterUrlPreviewExplanation({ value }) {
  const trimmed = value.trim();
  const receivesProtocol = trimmed && !/^https?:\/\//i.test(trimmed);

  return (
    <p className="mt-2 flex items-start gap-2 px-1 text-[11px] leading-5 text-slate-500">
      <Sparkles
        size={13}
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-violet-500"
      />
      <span>
        {receivesProtocol
          ? "The preview adds https:// so you can see the exact destination before continuing."
          : "The preview mirrors the full address that will be used for this test."}
      </span>
    </p>
  );
}
