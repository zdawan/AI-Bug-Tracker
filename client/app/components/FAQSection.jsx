"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  CircleHelp,
  ShieldCheck,
  Sparkles,
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

        <div className="faq-list">
          {faqItems.map((item, index) => (
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
