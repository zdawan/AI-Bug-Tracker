"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  CircleHelp,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

const faqItems = [
  {
    question: "Who can use AI Bug Tracker?",
    answer:
      "Testers can submit bug reports, while developers can access the developer portal to review submitted issues and manage their progress.",
    category: "GETTING STARTED",
  },
  {
    question: "How do I report a bug?",
    answer:
      "Open the tester workspace, enter the issue details, and include supporting screenshots or other information when available. More context helps developers understand what happened.",
    category: "BUG REPORTING",
  },
  {
    question: "What does the AI analysis do?",
    answer:
      "AI-assisted analysis can help interpret a report, suggest a category or severity, and identify potential duplicates when those capabilities are enabled. Suggestions should be reviewed before action is taken.",
    category: "AI INSIGHTS",
  },
  {
    question: "Can I track an issue after submitting it?",
    answer:
      "Issue tracking depends on the status and visibility features enabled in your workspace. Developers can review submitted reports and update their progress through the supported workflow.",
    category: "ISSUE TRACKING",
  },
  {
    question: "Do I need a developer account?",
    answer:
      "Use the tester entry point to submit reports. Developer access is controlled by the authentication and authorization rules configured for the developer portal.",
    category: "ACCESS & SECURITY",
  },
];

function FAQItem({ item, isOpen, onToggle, index }) {
  const answerId = `faq-answer-${index}`;
  const questionId = `faq-question-${index}`;

  return (
    <article className={`faq-item ${isOpen ? "is-open" : ""}`}>
      <button
        id={questionId}
        type="button"
        className="faq-question"
        aria-expanded={isOpen}
        aria-controls={answerId}
        onClick={onToggle}
      >
        <span className="faq-question-content">
          <span className="faq-index">
            {String(index + 1).padStart(2, "0")}
          </span>

          <span className="faq-question-text">{item.question}</span>
        </span>

        <span className="faq-toggle" aria-hidden="true">
          <ChevronDown size={17} strokeWidth={1.8} />
        </span>
      </button>

      <div
        id={answerId}
        className="faq-answer"
        role="region"
        aria-labelledby={questionId}
        hidden={!isOpen}
      >
        <div className="faq-answer-inner">
          <span className="faq-category">{item.category}</span>
          <p>{item.answer}</p>
        </div>
      </div>
    </article>
  );
}

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const filteredItems = faqItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) =>
      `${item.question} ${item.answer} ${item.category}`
        .toLowerCase()
        .includes(normalizedSearch),
    );

  return (
    <section className="faq-section" aria-labelledby="faq-heading">
      <div className="faq-container">
        <div className="faq-intro">
          <span className="faq-eyebrow">GOOD TO KNOW</span>

          <h2 id="faq-heading">
            A few things you
            <br className="hidden sm:block" /> might be wondering.
          </h2>

          <p>
            New to the platform? Here are some answers to help you get started.
          </p>

          <div className="faq-reassurance">
            <span className="faq-reassurance-icon">
              <ShieldCheck size={17} />
            </span>

            <span>
              <strong>Clear roles. Clear workflows.</strong>
              <small>Find the right place to start.</small>
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <label className="relative min-w-[220px] flex-1">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <span className="sr-only">Search frequently asked questions</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search questions or topics..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white/80 pl-10 pr-10 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear FAQ search"
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </label>
            <p
              className="text-xs tabular-nums text-slate-500"
              aria-live="polite"
              aria-atomic="true"
            >
              {filteredItems.length}{" "}
              {filteredItems.length === 1 ? "answer" : "answers"}
            </p>
          </div>

          {filteredItems.length > 0 ? (
            <div className="faq-list">
              {filteredItems.map(({ item, index }) => (
            <FAQItem
              key={item.question}
              item={item}
              index={index}
              isOpen={openIndex === index}
              onToggle={() =>
                setOpenIndex((current) => (current === index ? -1 : index))
              }
            />
              ))}
            </div>
          ) : (
            <div
              role="status"
              className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-5 py-10 text-center"
            >
              <CircleHelp
                size={22}
                aria-hidden="true"
                className="mx-auto text-slate-400"
              />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                No answers found
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Try a different keyword or browse all questions.
              </p>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-3 inline-flex min-h-9 items-center rounded-lg px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="faq-bottom-note">
        <span className="faq-bottom-icon">
          <Sparkles size={15} />
        </span>

        <p>
          Still figuring things out? Start with the workspace that fits your
          role.
        </p>
      </div>
    </section>
  );
}
