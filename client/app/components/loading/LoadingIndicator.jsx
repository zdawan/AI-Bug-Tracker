"use client";

export default function LoadingIndicator({
  label = "Loading",
  size = "md",
  tone = "current",
  showLabel = true,
}) {
  return (
    <span
      className={`bt-indicator bt-indicator-${size} bt-indicator-${tone}`}
      role="status"
    >
      <span className="bt-indicator-spinner" aria-hidden="true" />
      {showLabel && <span className="bt-indicator-label">{label}</span>}
    </span>
  );
}
