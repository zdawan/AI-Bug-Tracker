"use client";

import { useCallback, useState } from "react";
import { FileSearch } from "lucide-react";
import DashboardHeader from "./components/DashboardHeader";
import ReportOverview from "./components/ReportOverview";
import {
  DashboardError,
  DashboardLoading,
  DashboardEmptyState,
} from "./components/DashboardStates";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

export default function TesterDashboardPage() {
  const [email, setEmail] = useState("");
  const [loadedEmail, setLoadedEmail] = useState("");
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReports = useCallback(
    async (event) => {
      event?.preventDefault();

      const normalizedEmail = email.trim().toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        setError("Enter a valid email address to find your reports.");
        return;
      }

      setLoading(true);
      setError("");
      setLoadedEmail(normalizedEmail);

      try {
        const response = await fetch(
          `${API_URL}/api/bugs?email=${encodeURIComponent(normalizedEmail)}`,
          { cache: "no-store" },
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.message || "Unable to load reports. Please try again.",
          );
        }

        setBugs(Array.isArray(result.bugs) ? result.bugs : []);
      } catch (requestError) {
        setBugs([]);
        setError(
          requestError.message ||
            "Could not connect to the API. Check that the backend is running.",
        );
      } finally {
        setLoading(false);
      }
    },
    [email],
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f2f3ff] via-[#f8f9ff] to-[#f1f7ff] text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-40 h-80 w-80 rounded-full bg-violet-300/20 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-12 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage: "radial-gradient(#a5a8d5 0.7px, transparent 0.7px)",
          backgroundSize: "22px 22px",
          maskImage: "linear-gradient(to bottom, black, transparent 75%)",
        }}
      />

      <DashboardHeader
        email={email}
        setEmail={setEmail}
        onSubmit={loadReports}
        loading={loading}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <ReportOverview bugs={bugs} loadedEmail={loadedEmail} />

        <DashboardError message={error} onDismiss={() => setError("")} />

        <section className="mt-8 overflow-hidden rounded-3xl border border-white/90 bg-white/85 shadow-[0_12px_44px_rgba(70,61,130,0.07)] backdrop-blur-xl sm:mt-10">
          <div className="border-b border-slate-100 bg-gradient-to-r from-white/90 via-violet-50/40 to-indigo-50/40 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <FileSearch size={19} />
              </div>

              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Submitted bugs
              </h2>
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {loadedEmail
                ? `Reports found for ${loadedEmail}`
                : "Enter your reporter email above to see your submitted reports."}
            </p>
          </div>

          {loading ? (
            <DashboardLoading />
          ) : !loadedEmail ? (
            <DashboardEmptyState />
          ) : (
            <DashboardEmptyState type="empty" hasReports={bugs.length > 0} />
          )}
        </section>
      </div>
    </main>
  );
}
