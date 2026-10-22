"use client";

import { useEffect, useState } from "react";
import { LOADING_VARIANTS, AI_ANALYSIS_STAGES } from "./loading.config";

function BugMark() {
  return (
    <svg className="bt-mark" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <g
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M23 22 17 16M41 22l6-6" />
        <path d="M19 31H11M45 31h8" />
        <path d="M22 42l-6 6M42 42l6 6" />
        <rect x="21" y="18" width="22" height="30" rx="11" />
        <path d="M26 35c2 3 10 3 12 0" />
      </g>
      <circle cx="27.5" cy="29" r="2" fill="currentColor" />
      <circle cx="36.5" cy="29" r="2" fill="currentColor" />
    </svg>
  );
}

function Orbit({ className }) {
  return (
    <span className={`bt-orbit ${className}`} aria-hidden="true">
      <span className="bt-orbit-dot" />
    </span>
  );
}

function StageList({ stages, activeStage }) {
  return (
    <ol className="bt-stage-list" aria-label="Loading stages">
      {stages.map((stage, index) => {
        const complete = index < activeStage;
        const active = index === activeStage;

        return (
          <li
            className={[
              "bt-stage",
              complete && "is-complete",
              active && "is-active",
            ]
              .filter(Boolean)
              .join(" ")}
            key={stage.id}
          >
            <span className="bt-stage-icon" aria-hidden="true">
              {complete ? "✓" : index + 1}
            </span>
            <span className="bt-stage-copy">
              <span className="bt-stage-label">{stage.label}</span>
              <span className="bt-stage-description">{stage.description}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function LoadingScreen({
  variant = "default",
  label,
  detail,
  fullScreen = true,
  progress,
  stages = [],
  activeStage = -1,
  showStages = false,
  onCancel,
}) {
  const preset = LOADING_VARIANTS[variant] || LOADING_VARIANTS.default;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const hasProgress = Number.isFinite(progress);
  const normalizedProgress = hasProgress
    ? Math.max(0, Math.min(100, progress))
    : null;

  const stageItems =
    stages.length > 0 ? stages : variant === "ai" ? AI_ANALYSIS_STAGES : [];

  return (
    <section
      className={[
        "bt-loading-screen",
        fullScreen ? "is-fullscreen" : "is-inline",
        `theme-${preset.accent}`,
      ].join(" ")}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label || preset.label}
    >
      <div className="bt-loading-grid" aria-hidden="true" />
      <div className="bt-loading-glow bt-loading-glow-one" />
      <div className="bt-loading-glow bt-loading-glow-two" />

      <div className="bt-loading-content">
        <div className="bt-animation-stage" aria-hidden="true">
          <Orbit className="bt-orbit-outer" />
          <Orbit className="bt-orbit-middle" />
          <Orbit className="bt-orbit-inner" />

          <div className="bt-logo-tile">
            <BugMark />
            <span className="bt-logo-status" />
          </div>

          <span className="bt-particle bt-particle-one" />
          <span className="bt-particle bt-particle-two" />
          <span className="bt-particle bt-particle-three" />
        </div>

        <div className="bt-loading-brand">
          <span className="bt-brand-ai">AI</span>
          <span> Bug Tracker</span>
        </div>

        <h2 className="bt-loading-title">{label || preset.label}</h2>

        <p className="bt-loading-detail">{detail || preset.detail}</p>

        <div className="bt-progress-region">
          <div className="bt-progress-track">
            <span
              className={[
                "bt-progress-fill",
                hasProgress ? "is-determinate" : "is-indeterminate",
              ].join(" ")}
              style={
                hasProgress ? { width: `${normalizedProgress}%` } : undefined
              }
            />
          </div>

          <div className="bt-progress-meta">
            <span>
              {hasProgress
                ? `${Math.round(normalizedProgress)}% complete`
                : "Working on it"}
            </span>
            <span>{Math.floor(elapsed / 1000)}s</span>
          </div>
        </div>

        {showStages && stageItems.length > 0 && (
          <StageList stages={stageItems} activeStage={activeStage} />
        )}

        {onCancel && (
          <button className="bt-cancel-button" type="button" onClick={onCancel}>
            Cancel operation
          </button>
        )}

        <p className="bt-loading-footnote">Your workspace is getting ready.</p>
      </div>
    </section>
  );
}
