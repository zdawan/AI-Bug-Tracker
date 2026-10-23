"use client";

import {
  AlertCircle,
  Check,
  Circle,
  Clock3,
  Image as ImageIcon,
  Paperclip,
  Sparkles,
  Tag,
  TriangleAlert,
} from "lucide-react";

const workflow = [
  {
    number: "01",
    title: "Report the issue",
    description:
      "Share what went wrong with relevant details and a quick UI snapshot.",
  },
  {
    number: "02",
    title: "Get AI insights",
    description:
      "Understand the issue type, severity, and possible duplicates.",
  },
  {
    number: "03",
    title: "Track to resolution",
    description:
      "Developers review, update, and close issues as work progresses.",
  },
];

function ReportPreview() {
  return (
    <div className="hiw-window">
      <div className="hiw-window-header">
        <span>Report a Bug</span>
        <span className="hiw-window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>

      <div className="hiw-window-body">
        <div className="hiw-input-preview">
          Button not working on checkout page...
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-gray-400">
            <span className="hiw-tool-icon">
              <ImageIcon size={13} />
            </span>
            <span className="hiw-tool-icon">
              <Paperclip size={13} />
            </span>
            <span className="hiw-tool-icon">
              <AlertCircle size={13} />
            </span>
          </div>

          <span className="hiw-mini-button">Submit report</span>
        </div>
      </div>
    </div>
  );
}

function AnalysisPreview() {
  return (
    <div className="hiw-window">
      <div className="hiw-window-header">
        <span className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-500" />
          AI analysis
        </span>
        <span className="hiw-live-dot" title="Illustrative preview" />
      </div>

      <div className="hiw-window-body space-y-3">
        <div className="hiw-analysis-row">
          <Tag size={13} className="text-gray-400" />
          <span>Category</span>
          <span className="hiw-pill">UI issue</span>
        </div>

        <div className="hiw-analysis-row">
          <TriangleAlert size={13} className="text-gray-400" />
          <span>Severity</span>
          <span className="hiw-pill hiw-pill-high">High</span>
        </div>

        <div className="hiw-analysis-row">
          <Circle size={13} className="text-gray-400" />
          <span>Similar reports</span>
          <span className="hiw-pill">2 possible</span>
        </div>
      </div>
    </div>
  );
}

function ProgressPreview() {
  const statuses = [
    { label: "Open", date: "Just now", state: "done" },
    { label: "In progress", date: "Being worked on", state: "active" },
    { label: "Fixed", date: "Awaiting resolution", state: "pending" },
  ];

  return (
    <div className="hiw-window">
      <div className="hiw-window-header">
        <span>Issue progress</span>
        <Clock3 size={14} className="text-gray-400" />
      </div>

      <div className="hiw-window-body">
        {statuses.map((status, index) => (
          <div className="hiw-status-row" key={status.label}>
            <div className="hiw-status-track">
              <span className={`hiw-status-marker is-${status.state}`}>
                {status.state === "done" ? (
                  <Check size={10} strokeWidth={3} />
                ) : null}
              </span>

              {index < statuses.length - 1 && (
                <span className="hiw-status-line" />
              )}
            </div>

            <span
              className={`hiw-status-label ${
                status.state === "active" ? "is-current" : ""
              }`}
            >
              {status.label}
            </span>

            <span className="hiw-status-date">{status.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkflowStep({ step, index }) {
  const Preview = [ReportPreview, AnalysisPreview, ProgressPreview][index];

  return (
    <article className="hiw-step">
      <div className="hiw-step-number">{step.number}</div>

      <h3 className="hiw-step-title">{step.title}</h3>

      <p className="hiw-step-description">{step.description}</p>

      <Preview />
    </article>
  );
}

function Connector() {
  return (
    <svg
      className="hiw-connector"
      viewBox="0 0 400 50"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 15 C75 -3 120 43 200 25 S325 1 390 24"
        stroke="#C4B5FD"
        strokeWidth="1.5"
        strokeDasharray="6 7"
        strokeLinecap="round"
      />
      <path
        d="M382 17 L391 24 L382 31"
        stroke="#8B5CF6"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works-title"
      className="hiw-section relative mt-24 w-full self-stretch"
    >
      <div className="hiw-inner mx-auto max-w-6xl px-1 py-16 sm:px-4 sm:py-20">
        <header className="mx-auto mb-14 max-w-2xl text-center">
          <p className="hiw-eyebrow">HOW IT WORKS</p>

          <h2
            id="how-it-works-title"
            className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
          >
            From a bug to a fix, in{" "}
            <span className="hiw-heading-accent">a few simple steps</span>
          </h2>

          <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">
            A smoother way for testers and developers to work together, with AI
            insights along the way.
          </p>
        </header>

        <div className="hiw-workflow">
          <Connector />

          {workflow.map((step, index) => (
            <WorkflowStep key={step.number} step={step} index={index} />
          ))}
        </div>

        <div className="hiw-bottom-note">
          <span className="hiw-note-star">
            <Sparkles size={16} />
          </span>
          <p>
            Less time figuring out what went wrong.{" "}
            <span>More time getting it fixed.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
