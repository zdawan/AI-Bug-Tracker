"use client";

import { useState } from "react";
import AssignedTickets from "./admin/assigned/page";
import BugForm from "./tester/components/BugForm";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import FloatingDecorations from "./components/FloatingDecorations";
import HowItWorks from "./components/HowItWorks";
import Link from "next/link";

export default function HomePage() {
  const [showTracker, setShowTracker] = useState(false);
  const [role, setRole] = useState("");
  const [showUpgradesModal, setShowUpgradesModal] = useState(false);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white to-purple-100 font-sans">
      {/* Background dot pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,_rgba(0,0,0,0.08)_1px,_transparent_1px)] [background-size:24px_24px]"
      />

      {/* Floating developer-themed SVG illustrations */}
      {!showTracker && <FloatingDecorations />}

      <ToastContainer position="top-right" autoClose={3000} />

      <div className="relative z-10 flex flex-col items-center justify-center px-6 py-20">
        {!showTracker ? (
          <>
            {/* Hero section */}
            <section className="mb-10 w-full max-w-4xl text-center">
              <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl md:text-7xl">
                <span className="bg-gradient-to-bl from-blue-500 via-purple-500 to-orange-600 bg-clip-text font-bold text-transparent">
                  AI
                </span>
                -Powered{" "}
                <span
                  className="font-extralight italic text-gray-900"
                  style={{
                    fontFamily: "Times New Roman, Times, serif",
                  }}
                >
                  Bug Tracker
                </span>
              </h1>

              <p className="mx-auto max-w-3xl text-base leading-relaxed text-gray-700 md:text-xl">
                Submit, preview, and monitor bugs in your web apps seamlessly.
                Powered by AI insights to make testing faster and smarter.
              </p>

              <p className="mt-8 text-sm text-gray-500">
                Select your role below to get started
              </p>
            </section>

            {/* Role selection cards */}
            <section
              aria-label="Choose your workspace"
              className="grid w-full max-w-5xl grid-cols-1 gap-7 md:grid-cols-2 md:gap-9"
            >
              {/* Tester card */}
              <article className="group flex flex-col items-center justify-between rounded-3xl border border-white/80 bg-white/85 p-8 text-center shadow-[0_20px_60px_-30px_rgba(45,35,80,0.3)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-30px_rgba(45,35,80,0.38)] sm:p-12 md:p-14">
                <div>
                  <h2 className="mb-3 text-2xl font-bold text-gray-950 sm:text-3xl">
                    Tester / User
                  </h2>

                  <p className="mb-8 max-w-sm text-base leading-relaxed text-gray-600 sm:text-lg">
                    Submit bugs, get AI insights, and preview UI snapshots
                    instantly.
                  </p>
                </div>

                <Link
                  href="/tester/url"
                  className="inline-flex min-h-14 w-full max-w-[230px] items-center justify-center rounded-2xl bg-black px-7 py-4 text-base font-semibold text-white transition duration-200 hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-300"
                >
                  Enter as Tester
                </Link>
              </article>

              {/* Developer card */}
              <article className="group flex flex-col items-center justify-between rounded-3xl border border-white/80 bg-white/85 p-8 text-center shadow-[0_20px_60px_-30px_rgba(45,35,80,0.3)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-30px_rgba(45,35,80,0.38)] sm:p-12 md:p-14">
                <div>
                  <h2 className="mb-3 text-2xl font-bold text-gray-950 sm:text-3xl">
                    Developer
                  </h2>

                  <p className="mb-8 max-w-sm text-base leading-relaxed text-gray-600 sm:text-lg">
                    Manage submitted bugs and track progress.
                  </p>
                </div>

                <Link
                  href="/admin/login"
                  className="inline-flex min-h-14 w-full max-w-[230px] items-center justify-center rounded-2xl bg-black px-7 py-4 text-base font-semibold text-white transition duration-200 hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
                >
                  Enter as Developer
                </Link>
              </article>
            </section>

            <div className="mt-16">
              <button
                type="button"
                onClick={() => setShowUpgradesModal(true)}
                className="cursor-pointer rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 px-7 py-3.5 font-medium text-white shadow-lg shadow-purple-500/20 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-300"
              >
                List of future upgrades
              </button>
            </div>

            {/* How It Works */}
            <HowItWorks />
          </>
        ) : (
          <section className="mt-10 flex w-full max-w-6xl flex-col items-center gap-6">
            <button
              type="button"
              onClick={() => setShowTracker(false)}
              className="self-start rounded-xl bg-white/80 px-4 py-2 text-gray-800 shadow-sm transition hover:bg-white"
            >
              Back to Landing
            </button>

            {role === "user" ? <BugForm /> : <AssignedTickets />}
          </section>
        )}
      </div>

      {/* Future upgrades modal */}
      {showUpgradesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowUpgradesModal(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrades-title"
            className="w-full max-w-md rounded-3xl border border-white/60 bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2
                id="upgrades-title"
                className="text-xl font-bold text-gray-900 sm:text-2xl"
              >
                Future Upgrades
              </h2>

              <span className="shrink-0 rounded-full bg-purple-100 px-3 py-1.5 text-xs font-bold text-purple-700">
                Coming Soon
              </span>
            </div>

            <ul className="mb-8 space-y-4 text-sm leading-relaxed text-gray-700 sm:text-base">
              {[
                "AI-driven automatic test case generation",
                "Domain-specific bug data for seamless integration",
                "Seamless CI/CD pipeline integration",
                "Advanced real-time collaborative debugging",
              ].map((upgrade) => (
                <li key={upgrade} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-500"
                  />
                  <span>{upgrade}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setShowUpgradesModal(false)}
              className="w-full cursor-pointer rounded-xl bg-gray-900 py-3 font-medium text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-300"
            >
              Close
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
