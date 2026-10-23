"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Code2,
  FileText,
  Image as ImageIcon,
  Layers3,
  Paperclip,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  UserRound,
  UsersRound,
} from "lucide-react";

const featureDetails = [
  {
    id: "context",
    number: "01",
    eyebrow: "BETTER CONTEXT",
    title: "Give every bug a clearer story.",
    description:
      "A short description is a start. Supporting details and UI snapshots help developers understand what happened and where to look.",
  },
  {
    id: "insights",
    number: "02",
    eyebrow: "USEFUL AI INSIGHTS",
    title: "Spend less time sorting through reports.",
    description:
      "Use AI-assisted classification, severity suggestions, and duplicate hints to make incoming issues easier to review.",
  },
  {
    id: "progress",
    number: "03",
    eyebrow: "SHARED VISIBILITY",
    title: "Know what needs attention next.",
    description:
      "Keep the issue and its progress visible to the people responsible for reviewing and resolving it.",
  },
];

function SectionHeading() {
  return (
    <header className="wcd-heading">
      <p className="wcd-eyebrow">MADE FOR REAL-WORLD DEBUGGING</p>

      <h2 id="what-you-can-do-title" className="wcd-title">
        The details matter
        <br className="hidden sm:block" /> when something breaks.
      </h2>

      <p className="wcd-intro">
        From the first report to the final update, keep the important details in
        one place.
      </p>
    </header>
  );
}

function WindowHeader({ children, trailing }) {
  return (
    <div className="wcd-window-header">
      <div className="wcd-window-title">{children}</div>
      {trailing}
    </div>
  );
}

function SmallIconButton({ label, children }) {
  return (
    <span className="wcd-icon-button" title={label}>
      {children}
    </span>
  );
}

function BugReportPreview() {
  return (
    <div className="wcd-report-window">
      <WindowHeader
        trailing={
          <span className="wcd-status-badge">
            <CircleDot size={11} />
            Open issue
          </span>
        }
      >
        <FileText size={15} />
        <span>Bug report</span>
      </WindowHeader>

      <div className="wcd-report-content">
        <div className="wcd-report-meta">
          <span className="wcd-ticket-id">BUG-1042</span>
          <span className="wcd-meta-divider" />
          <span>Checkout flow</span>
        </div>

        <h4 className="wcd-report-title">Checkout button does not respond</h4>

        <p className="wcd-report-description">
          Clicking the button leaves the page unchanged. The issue appears after
          updating the delivery address.
        </p>

        <div className="wcd-report-labels">
          <span className="wcd-label wcd-label-purple">
            <Tag size={11} />
            UI
          </span>

          <span className="wcd-label wcd-label-amber">
            <AlertTriangle size={11} />
            Needs review
          </span>
        </div>

        <div className="wcd-snapshot">
          <div className="wcd-snapshot-topbar">
            <span />
            <span />
            <span />
            <div className="wcd-snapshot-address" />
          </div>

          <div className="wcd-snapshot-body">
            <div className="wcd-snapshot-sidebar">
              <span />
              <span />
              <span />
              <span />
            </div>

            <div className="wcd-snapshot-main">
              <span className="wcd-snapshot-heading" />
              <span className="wcd-snapshot-copy" />
              <span className="wcd-snapshot-copy short" />

              <div className="wcd-snapshot-field">
                <span />
              </div>

              <div className="wcd-snapshot-action">
                <span>Continue to payment</span>
                <span className="wcd-snapshot-error">!</span>
              </div>

              <span className="wcd-snapshot-caption">Example UI snapshot</span>
            </div>
          </div>
        </div>

        <div className="wcd-report-footer">
          <div className="wcd-reporter">
            <span className="wcd-avatar">
              <UserRound size={13} />
            </span>

            <span>
              <strong>Reported by</strong>
              <small>Tester</small>
            </span>
          </div>

          <div className="wcd-attachment-count">
            <ImageIcon size={13} />
            <span>Snapshot attached</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightRow({ icon: Icon, label, value, tone = "neutral" }) {
  return (
    <div className="wcd-insight-row">
      <span className="wcd-insight-icon">
        <Icon size={14} />
      </span>

      <span className="wcd-insight-label">{label}</span>

      <span className={`wcd-insight-value tone-${tone}`}>{value}</span>
    </div>
  );
}

function AIInsightsPreview() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="wcd-mini-window">
      <WindowHeader
        trailing={
          <span className="wcd-ai-mark">
            <Sparkles size={13} />
          </span>
        }
      >
        <span className="wcd-window-heading-icon">
          <Sparkles size={14} />
        </span>
        <span>AI insights</span>
      </WindowHeader>

      <div className="wcd-mini-content">
        <div className="wcd-insight-intro">
          <span className="wcd-insight-kicker">SUGGESTED REVIEW</span>

          <p>A quick overview to help prioritize this report.</p>
        </div>

        <div className="wcd-insight-list">
          <InsightRow
            icon={Layers3}
            label="Category"
            value="UI issue"
            tone="purple"
          />

          <InsightRow
            icon={AlertTriangle}
            label="Severity"
            value="High"
            tone="amber"
          />

          <InsightRow
            icon={Search}
            label="Similar reports"
            value="Possible match"
            tone="blue"
          />
        </div>

        {expanded && (
          <div className="wcd-insight-detail">
            <strong>Suggested next step</strong>
            <p>
              Review the checkout interaction and compare it with any related
              reports before assigning the issue.
            </p>
          </div>
        )}

        <button
          type="button"
          className="wcd-text-action"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Show less" : "View example insight"}
          <ChevronRight size={14} className={expanded ? "rotate-90" : ""} />
        </button>
      </div>
    </div>
  );
}

function ActivityItem({ status, title, time, tone }) {
  return (
    <div className="wcd-activity-item">
      <span className={`wcd-activity-marker ${tone}`}>
        {tone === "resolved" ? (
          <Check size={10} strokeWidth={2.8} />
        ) : (
          <CircleDot size={10} />
        )}
      </span>

      <div className="wcd-activity-copy">
        <span className="wcd-activity-status">{status}</span>
        <span className="wcd-activity-title">{title}</span>
      </div>

      <span className="wcd-activity-time">{time}</span>
    </div>
  );
}

function ProgressPreview() {
  return (
    <div className="wcd-mini-window">
      <WindowHeader
        trailing={
          <span className="wcd-team-count">
            <UsersRound size={13} />
            Team
          </span>
        }
      >
        <span className="wcd-window-heading-icon">
          <Clock3 size={14} />
        </span>
        <span>Issue activity</span>
      </WindowHeader>

      <div className="wcd-mini-content">
        <div className="wcd-progress-summary">
          <div>
            <span className="wcd-insight-kicker">CURRENT STATUS</span>
            <h4>Checkout issue</h4>
          </div>

          <span className="wcd-progress-open">Open</span>
        </div>

        <div className="wcd-activity-list">
          <ActivityItem
            status="Reported"
            title="Issue submitted"
            time="Step 1"
            tone="reported"
          />

          <ActivityItem
            status="In progress"
            title="Developer review"
            time="Step 2"
            tone="active"
          />

          <ActivityItem
            status="Resolved"
            title="Fix confirmed"
            time="Step 3"
            tone="resolved"
          />
        </div>

        <p className="wcd-preview-footnote">
          Illustrative workflow — not live issue activity.
        </p>
      </div>
    </div>
  );
}

function FeatureCard({ number, title, description, icon: Icon }) {
  return (
    <article className="wcd-feature-card">
      <div className="wcd-feature-card-top">
        <span className="wcd-feature-number">{number}</span>

        <span className="wcd-feature-icon">
          <Icon size={17} strokeWidth={1.7} />
        </span>
      </div>

      <h3>{title}</h3>

      <p>{description}</p>
    </article>
  );
}

function FeatureGrid() {
  return (
    <div className="wcd-feature-grid">
      <FeatureCard
        number="01"
        title="Keep the context"
        description="Descriptions, attachments, and screenshots help make a report easier to understand."
        icon={Paperclip}
      />

      <FeatureCard
        number="02"
        title="Spot what matters"
        description="Review suggested categories, severity, and potential duplicate reports."
        icon={ArrowUpRight}
      />

      <FeatureCard
        number="03"
        title="Follow the progress"
        description="Make it easier to see which issues need review and which have been resolved."
        icon={ShieldCheck}
      />
    </div>
  );
}

export default function WhatYouCanDo() {
  return (
    <section className="wcd-section" aria-labelledby="what-you-can-do-title">
      <div className="wcd-container">
        <SectionHeading />

        <div className="wcd-showcase">
          <div className="wcd-showcase-copy">
            <span className="wcd-section-index">THE IMPORTANT DETAILS</span>

            <h3>
              A bug report should tell you more than just what went wrong.
            </h3>

            <p>
              Keep the description, visual context, and follow-up information
              together, so the next person can get to the problem without
              starting from scratch.
            </p>

            <div className="wcd-benefit-note">
              <span>
                <Check size={14} />
              </span>
              <p>Clearer reports. Fewer missing details.</p>
            </div>

            <div className="wcd-showcase-foot">
              <span className="wcd-foot-icon">
                <Code2 size={15} />
              </span>
              <span>Made for the messy parts of software development.</span>
            </div>
          </div>

          <div className="wcd-showcase-preview">
            <span className="wcd-preview-decoration wcd-decoration-one" />
            <span className="wcd-preview-decoration wcd-decoration-two" />

            <BugReportPreview />
          </div>
        </div>

        <div className="wcd-supporting-grid">
          <div className="wcd-supporting-card">
            <div className="wcd-supporting-copy">
              <span className="wcd-section-index">WHEN REPORTS COME IN</span>

              <h3>Make the first review count.</h3>

              <p>
                AI-assisted insights can give developers another starting point
                for understanding an issue, without replacing their judgment.
              </p>
            </div>

            <AIInsightsPreview />
          </div>

          <div className="wcd-supporting-card">
            <div className="wcd-supporting-copy">
              <span className="wcd-section-index">AFTER THE REPORT</span>

              <h3>Keep the next step visible.</h3>

              <p>
                A clear status and review history help people understand where
                an issue stands and what still needs attention.
              </p>
            </div>

            <ProgressPreview />
          </div>
        </div>

        <div className="wcd-bottom-section">
          <div className="wcd-bottom-heading">
            <div>
              <span className="wcd-section-index">A LITTLE MORE CLARITY</span>

              <h3>Small details make debugging easier.</h3>
            </div>

            <ArrowDownRight size={22} strokeWidth={1.5} aria-hidden="true" />
          </div>

          <FeatureGrid />
        </div>
      </div>
    </section>
  );
}
