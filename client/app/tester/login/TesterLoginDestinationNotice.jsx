"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown, ExternalLink, MapPin, Route, Shield } from "lucide-react";

function getDestinationLabel(destination) {
  if (!destination || destination === "/tester") return "Tester workspace";
  if (destination === "/tester/url") return "URL testing workspace";
  if (destination === "/tester/url-bug-report") return "URL bug report workspace";
  return destination.replace(/^\/tester\/?/, "").replaceAll("-", " ") || "Tester workspace";
}

function isSafeTesterDestination(destination) {
  return Boolean(
    destination &&
      destination.startsWith("/tester") &&
      !destination.startsWith("//") &&
      !destination.includes("/login"),
  );
}

export default function TesterLoginDestinationNotice({ destination = "/tester/url" }) {
  const [open, setOpen] = useState(false);
  const safeDestination = isSafeTesterDestination(destination) ? destination : "/tester/url";
  const destinationLabel = getDestinationLabel(safeDestination);

  return (
    <section
      className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/50 p-4"
      aria-labelledby="tester-login-destination-title"
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-700">
          <MapPin size={18} aria-hidden="true" />
        </div>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span id="tester-login-destination-title" className="text-sm font-semibold text-blue-950">Where you will go next</span>
            <ChevronDown size={17} className={`shrink-0 text-blue-700 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </span>
          <span className="mt-1 block text-xs leading-5 text-blue-900/75">After verification, you will return to the requested tester area.</span>
        </span>
      </button>

      {open ? (
        <div className="mt-4 space-y-3 border-t border-blue-100 pt-4">
          <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-white/75 p-3">
            <Route size={16} className="shrink-0 text-blue-700" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-blue-950">{destinationLabel}</p>
              <p className="mt-1 truncate text-[11px] text-blue-900/70">{safeDestination}</p>
            </div>
            <ArrowRight size={15} className="shrink-0 text-blue-600" aria-hidden="true" />
          </div>
          <div className="flex items-start gap-2 text-[11px] leading-5 text-blue-900/75">
            <Shield size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>The destination is restricted to the tester area for a safer sign-in redirect.</p>
          </div>
          <p className="inline-flex items-center gap-1.5 text-[11px] text-blue-800/70">
            <ExternalLink size={13} aria-hidden="true" />
            No external website will be opened automatically.
          </p>
        </div>
      ) : null}
    </section>
  );
}

export { getDestinationLabel, isSafeTesterDestination };
