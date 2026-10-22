"use client";

function SkeletonBlock({ className = "", width, height, radius = "md" }) {
  return (
    <span
      aria-hidden="true"
      className={`bt-skeleton bt-skeleton-${radius} ${className}`}
      style={{ width, height }}
    />
  );
}
