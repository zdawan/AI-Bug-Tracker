export const LOADING_VARIANTS = {
  default: {
    label: "Preparing your workspace",
    detail: "Getting everything ready for you.",
    accent: "violet",
  },
  dashboard: {
    label: "Building your dashboard",
    detail: "Collecting your latest project activity.",
    accent: "blue",
  },
  bugs: {
    label: "Loading your bugs",
    detail: "Organizing issues by priority and status.",
    accent: "violet",
  },
  ai: {
    label: "Analyzing your bug report",
    detail: "Evaluating issue signals and context.",
    accent: "cyan",
  },
  auth: {
    label: "Verifying your identity",
    detail: "Securing your developer workspace.",
    accent: "violet",
  },
  upload: {
    label: "Uploading your attachment",
    detail: "Preparing your file.",
    accent: "blue",
  },
};

export const AI_ANALYSIS_STAGES = [
  {
    id: "collect",
    label: "Collecting bug context",
    description: "Reading the report and available metadata.",
  },
  {
    id: "classify",
    label: "Classifying the issue",
    description: "Evaluating likely category and severity.",
  },
  {
    id: "duplicate",
    label: "Checking for duplicates",
    description: "Looking for related issue patterns.",
  },
  {
    id: "recommend",
    label: "Preparing recommendations",
    description: "Organizing the analysis for review.",
  },
];

export const LOADING_DEFAULTS = {
  minimumDisplayMs: 250,
  slowOperationMs: 800,
  timeoutMs: 30_000,
  progressTickMs: 120,
};

export const LOADING_MESSAGES = {
  connecting: [
    "Connecting your workspace",
    "Preparing your issue feed",
    "Organizing project activity",
  ],
  analyzing: [
    "Reading the report",
    "Evaluating issue signals",
    "Preparing useful insights",
  ],
};
