"use client";

import Link from "next/link";
import { ArrowLeft, Bug, Search, LoaderCircle } from "lucide-react";

export default function DashboardHeader({
  email,
  setEmail,
  onSubmit,
  loading,
}) {
  return (
    <>
      <header className="relative z-10 border-b border-white/70 bg-white/65 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-slate-600 transition hover:bg-white/80 hover:text-violet-700"
          >
            <ArrowLeft size={17} />
            Home
          </Link>

          <Link
            href="/tester/url"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <Bug size={16} />
            Report a bug
          </Link>
        </div>
      </header>

      <section className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/75 px-3 py-1.5 text-xs font-semibold tracking-wide text-violet-700 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            TESTER PORTAL
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-[42px]">
            Your reports,
            <span className="block bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 bg-clip-text pb-1 text-transparent">
              all in one place.
            </span>
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
            Keep track of the bugs you have reported, follow their status, and
            revisit the affected pages whenever you need to.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="w-full rounded-2xl border border-white/90 bg-white/80 p-2.5 shadow-[0_8px_32px_rgba(72,63,140,0.08)] backdrop-blur-xl sm:p-3 lg:max-w-xl"
        >
          <label
            htmlFor="reporter-email"
            className="mb-2 block px-2 text-xs font-semibold text-slate-600"
          >
            Find your reports
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="reporter-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your reporter email"
                className="h-12 w-full rounded-xl border border-slate-200/90 bg-slate-50/80 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:from-violet-800 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <Search size={17} />
              )}
              {loading ? "Loading..." : "Find reports"}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
