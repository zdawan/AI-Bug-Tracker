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
    number: "1",
    title: "Report the issue",
    description:
      "Share what went wrong with relevant details and a quick UI snapshot.",
  },
  {
    number: "2",
    title: "Get AI insights",
    description:
      "Understand the issue type, severity, and possible duplicates.",
  },
  {
    number: "3",
    title: "Track to resolution",
    description:
      "Developers review, update, and close issues as work progresses.",
  },
];

function HandwrittenNote({ className = "", children, direction = "down" }) {
  return (
    <div className={`hiw-hand-note ${className}`}>
      <span>{children}</span>

      <svg
        viewBox="0 0 90 48"
        fill="none"
        aria-hidden="true"
        className={`hiw-note-arrow arrow-${direction}`}
      >
        {direction === "left" ? (
          <path
            d="M84 5 C54 1 30 13 10 37 M10 37 L12 25 M10 37 L23 34"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M8 5 C5 22 21 35 52 39 M52 39 L42 29 M52 39 L40 43"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
}

function Connector() {
  return (
    <svg
      className="hiw-connector"
      viewBox="0 0 900 60"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 18 C100 0 170 43 270 28 S440 7 510 25 S690 45 780 20 S850 15 890 28"
        stroke="#C9B8F7"
        strokeWidth="1.4"
        strokeDasharray="7 7"
        strokeLinecap="round"
      />

      <path
        d="M880 20 L890 28 L881 35"
        stroke="#9271D8"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

        <div className="hiw-preview-footer">
          <div className="hiw-tool-group">
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

          <span className="hiw-mini-button">Submit</span>
        </div>
      </div>
    </div>
  );
}

function AnalysisPreview() {
  return (
    <div className="hiw-window">
      <div className="hiw-window-header">
        <span className="hiw-analysis-heading">
          <Sparkles size={13} />
          AI Analysis
        </span>

        <span
          className="hiw-live-dot"
          aria-label="Illustrative preview"
          title="Illustrative preview"
        />
      </div>

      <div className="hiw-window-body hiw-analysis-body">
        <div className="hiw-analysis-row">
          <Tag size={12} className="hiw-muted-icon" />
          <span>Category</span>
          <span className="hiw-pill">UI Issue</span>
        </div>

        <div className="hiw-analysis-row">
          <TriangleAlert size={12} className="hiw-muted-icon" />
          <span>Severity</span>
          <span className="hiw-pill hiw-pill-high">High</span>
        </div>

        <div className="hiw-analysis-row">
          <Circle size={12} className="hiw-muted-icon" />
          <span>Possible Duplicate</span>
          <span className="hiw-pill">2 similar reports</span>
        </div>
      </div>
    </div>
  );
}

function ProgressPreview() {
  const statuses = [
    {
      label: "Open",
      date: "Just now",
      state: "done",
    },
    {
      label: "In Progress",
      date: "Being worked on",
      state: "active",
    },
    {
      label: "Fixed",
      date: "—",
      state: "pending",
    },
  ];

  return (
    <div className="hiw-window">
      <div className="hiw-window-header">
        <span>Issue Progress</span>

        <Clock3 size={13} className="hiw-muted-icon" />
      </div>

      <div className="hiw-window-body hiw-progress-body">
        {statuses.map((status, index) => (
          <div className="hiw-status-row" key={status.label}>
            <div className="hiw-status-track">
              <span className={`hiw-status-marker is-${status.state}`}>
                {status.state === "done" && <Check size={9} strokeWidth={3} />}
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
    <article className={`hiw-step hiw-step-${index + 1}`}>
      <div className="hiw-step-number">{step.number}</div>

      <h3 className="hiw-step-title">{step.title}</h3>

      <p className="hiw-step-description">{step.description}</p>

      <Preview />
    </article>
  );
}

export default function HowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works-title"
      className="hiw-section w-full self-stretch"
    >
      <div className="hiw-inner mx-auto">
        <header className="hiw-header">
          <p className="hiw-eyebrow">HOW IT WORKS</p>

          <h2 id="how-it-works-title" className="hiw-main-title">
            From a bug to a fix, in <span>a few simple steps</span>
          </h2>

          <p className="hiw-intro">
            A smooth flow for testers and developers to work together, with AI
            insights at every step.
          </p>
        </header>

        <div className="hiw-workflow">
          <Connector />

          <HandwrittenNote className="hiw-note-report">
            Capture
            <br />
            what you see
          </HandwrittenNote>

          <HandwrittenNote className="hiw-note-ai" direction="left">
            AI helps
            <br />
            you understand
            <br />
            faster
          </HandwrittenNote>

          <HandwrittenNote className="hiw-note-track">
            Keep track
            <br />
            until it's fixed
          </HandwrittenNote>

          {workflow.map((step, index) => (
            <WorkflowStep key={step.number} step={step} index={index} />
          ))}
        </div>

        <div className="hiw-bottom-note">
          <span className="hiw-note-star">
            <Sparkles size={15} />
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
