"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  ClipboardList,
  FileCheck2,
  Gauge,
  Info,
  ListOrdered,
  MessageSquareText,
  Plus,
  RotateCcw,
  SearchCheck,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";

const COACH_FILTERS = [
  { id: "all", label: "All checks" },
  { id: "suggestions", label: "Suggestions" },
  { id: "ready", label: "Ready items" },
];

const REPORT_SECTIONS = [
  {
    id: "reproduction",
    label: "Reproduction steps",
    icon: ListOrdered,
    heading: "Steps to reproduce:",
    body: "1. [Starting page or state]\n2. [Action taken]\n3. [What happened next]",
    guidance:
      "Use one action per line, begin from a known state, and include the result that exposes the issue.",
  },
  {
    id: "outcomes",
    label: "Expected and actual behavior",
    icon: Target,
    heading: "Expected behavior:",
    body: "Expected behavior:\n[What should happen?]\n\nActual behavior:\n[What happened instead?]",
    guidance:
      "State the intended result separately from what you observed. Describe visible behavior rather than guessing at the cause.",
  },
  {
    id: "frequency",
    label: "Frequency",
    icon: RotateCcw,
    heading: "Frequency:",
    body: "Frequency:\n[Every time, often, sometimes, or once]",
    guidance:
      "A rough frequency helps distinguish consistent problems from intermittent ones.",
  },
  {
    id: "environment",
    label: "Environment",
    icon: Gauge,
    heading: "Environment:",
    body: "Environment:\n[Browser and version, device or operating system, viewport if relevant]",
    guidance:
      "Include only environment details that help reproduce the issue; avoid collecting unrelated device identifiers.",
  },
];

const VAGUE_TITLE_PATTERNS = [
  {
    expression: /^(bug|issue|problem|error|help|test|broken|not working)[.! ]*$/i,
    reason: "This title does not identify the affected page, control, or behavior.",
    suggestion: "Name the affected area and describe what it does incorrectly.",
  },
  {
    expression: /\b(doesn't work|not working|is broken|something wrong)\b/i,
    reason: "This phrase does not explain the behavior that was observed.",
    suggestion: "Replace it with a specific result, such as “does not save changes.”",
  },
  {
    expression: /\b(urgent|asap|please fix|fix this)\b/i,
    reason: "Urgency does not describe the issue or its impact.",
    suggestion: "Describe the user-visible behavior; record impact in the report details.",
  },
];

const VAGUE_DESCRIPTION_PHRASES = [
  {
    phrase: "it doesn't work",
    label: "“It doesn't work”",
    suggestion:
      "Name the action and what happened. For example, say whether it failed to respond, showed an error, or produced the wrong result.",
  },
  {
    phrase: "not working",
    label: "“Not working”",
    suggestion:
      "Explain which control or step fails and what you observed instead.",
  },
  {
    phrase: "something went wrong",
    label: "“Something went wrong”",
    suggestion:
      "Record the visible message or outcome, but remove any private data from error text.",
  },
  {
    phrase: "please fix",
    label: "“Please fix”",
    suggestion:
      "Describe the current and expected behavior so the assignee can investigate.",
  },
  {
    phrase: "same as above",
    label: "“Same as above”",
    suggestion:
      "Make each report self-contained by repeating the relevant page or action.",
  },
];

const FIELD_LABELS = {
  title: "Title",
  description: "Description",
};

const CHECK_STATUS = {
  ready: {
    label: "Looks good",
    icon: CheckCircle2,
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
    card: "border-emerald-100 bg-white",
  },
  suggestion: {
    label: "Suggestion",
    icon: Info,
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    card: "border-amber-100 bg-amber-50/30",
  },
  incomplete: {
    label: "Add details",
    icon: AlertCircle,
    badge: "border-slate-200 bg-slate-100 text-slate-700",
    card: "border-slate-200 bg-white",
  },
};

function isSectionPresent(description, heading) {
  if (!heading) return false;
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^\\s*${escapedHeading}\\s*$`, "im").test(description);
}

function isCoachSectionPresent(description, section) {
  if (section.id === "outcomes") {
    return (
      isSectionPresent(description, "Expected behavior:") &&
      isSectionPresent(description, "Actual behavior:")
    );
  }

  return isSectionPresent(description, section.heading);
}

function extractReproductionSteps(description) {
  const headingMatch = /^steps to reproduce:\s*$/im.exec(description);
  if (!headingMatch) return [];

  const contentStart = headingMatch.index + headingMatch[0].length;
  const tail = description.slice(contentStart);
  const nextSectionIndex = tail.search(
    /^\s*(?:expected behavior|actual behavior|frequency|environment|notes):\s*$/im,
  );
  const stepsBlock =
    nextSectionIndex >= 0 ? tail.slice(0, nextSectionIndex) : tail;
  return stepsBlock
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+[.)]\s+\S/.test(line));
}

function getWordCount(value) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function makeCheck({
  id,
  field,
  category,
  title,
  status,
  summary,
  detail,
  action,
  weight = 1,
}) {
  return {
    id,
    field,
    category,
    title,
    status,
    summary,
    detail,
    action,
    weight,
  };
}

function analyzeReport(title, description) {
  const normalizedTitle = title.trim();
  const normalizedDescription = description.trim();
  const checks = [];
  const words = getWordCount(normalizedDescription);
  const numberedSteps = extractReproductionSteps(description);
  const hasStepsHeading = isSectionPresent(
    description,
    "Steps to reproduce:",
  );
  const hasExpected = isSectionPresent(description, "Expected behavior:");
  const hasActual = isSectionPresent(description, "Actual behavior:");
  const hasFrequency = isSectionPresent(description, "Frequency:");
  const hasEnvironment = isSectionPresent(description, "Environment:");
  const hasExpectedSentence =
    /\b(expected|should|supposed to)\b/i.test(normalizedDescription);
  const hasActualSentence =
    /\b(actual|instead|observed|happened|shows|displayed|returned)\b/i.test(
      normalizedDescription,
    );

  if (!normalizedTitle) {
    checks.push(
      makeCheck({
        id: "title-empty",
        field: "title",
        category: "basics",
        title: "Add a report title",
        status: "incomplete",
        summary: "A title helps identify the issue in lists and notifications.",
        detail:
          "A short title should describe the affected page, feature, or control and the behavior you observed.",
        action: "Write a concise issue title.",
        weight: 3,
      }),
    );
  } else {
    checks.push(
      makeCheck({
        id: "title-present",
        field: "title",
        category: "basics",
        title: "Report title is present",
        status: "ready",
        summary: `${normalizedTitle.length} characters.`,
        detail:
          "A title is present. Check that it describes the behavior rather than only naming the page.",
        weight: 1,
      }),
    );
  }

  if (normalizedTitle && normalizedTitle.length < 12) {
    checks.push(
      makeCheck({
        id: "title-short",
        field: "title",
        category: "clarity",
        title: "Consider a more specific title",
        status: "suggestion",
        summary: "Very short titles may not provide enough context.",
        detail:
          "Add the affected feature and a few words describing the unexpected behavior.",
        action: "Expand the title with the affected feature and result.",
        weight: 2,
      }),
    );
  }

  if (normalizedTitle && normalizedTitle.length > 120) {
    checks.push(
      makeCheck({
        id: "title-long",
        field: "title",
        category: "clarity",
        title: "Shorten the report title",
        status: "suggestion",
        summary: "Long titles can be difficult to scan in an issue list.",
        detail:
          "Keep the title focused on the affected area and the most important unexpected result.",
        action: "Move reproduction details into the description.",
        weight: 1,
      }),
    );
  }

  const vagueTitle = VAGUE_TITLE_PATTERNS.find((item) =>
    item.expression.test(normalizedTitle),
  );
  if (vagueTitle) {
    checks.push(
      makeCheck({
        id: "title-vague",
        field: "title",
        category: "clarity",
        title: "Make the title more descriptive",
        status: "suggestion",
        summary: vagueTitle.reason,
        detail: vagueTitle.suggestion,
        action: "Describe the broken action or incorrect outcome.",
        weight: 2,
      }),
    );
  }

  if (!normalizedDescription) {
    checks.push(
      makeCheck({
        id: "description-empty",
        field: "description",
        category: "basics",
        title: "Describe the observed behavior",
        status: "incomplete",
        summary: "The description is empty.",
        detail:
          "Explain what you did, what happened, and what you expected to happen.",
        action: "Add a short description of the issue.",
        weight: 3,
      }),
    );
  } else {
    checks.push(
      makeCheck({
        id: "description-present",
        field: "description",
        category: "basics",
        title: "Report description is present",
        status: "ready",
        summary: `${words} word${words === 1 ? "" : "s"}.`,
        detail:
          "A description is present. Review the suggestions below to make the report easier to reproduce.",
        weight: 1,
      }),
    );
  }

  if (normalizedDescription && normalizedDescription.length < 40) {
    checks.push(
      makeCheck({
        id: "description-short",
        field: "description",
        category: "clarity",
        title: "Add a little more context",
        status: "suggestion",
        summary: "A short description may leave important questions unanswered.",
        detail:
          "Add the action you took, the result you saw, or the result you expected. There is no required minimum length.",
        action: "Add the missing context that helps someone reproduce the issue.",
        weight: 2,
      }),
    );
  }

  if (!hasStepsHeading && numberedSteps.length === 0) {
    checks.push(
      makeCheck({
        id: "steps-missing",
        field: "description",
        category: "reproduction",
        title: "Consider adding reproduction steps",
        status: normalizedDescription ? "suggestion" : "incomplete",
        summary: "No numbered reproduction steps were detected.",
        detail:
          "A short sequence that starts from a known page or state can help another tester reproduce the issue.",
        action: "Add a steps-to-reproduce section.",
        weight: 2,
      }),
    );
  } else if (numberedSteps.length === 0) {
    checks.push(
      makeCheck({
        id: "steps-empty",
        field: "description",
        category: "reproduction",
        title: "Fill in the reproduction steps",
        status: "suggestion",
        summary: "A steps heading is present, but no numbered steps were found.",
        detail:
          "Add at least one numbered action below the heading. Include the starting state if it matters.",
        action: "Add one action per numbered line.",
        weight: 2,
      }),
    );
  } else {
    checks.push(
      makeCheck({
        id: "steps-present",
        field: "description",
        category: "reproduction",
        title: "Reproduction steps are present",
        status: "ready",
        summary: `${numberedSteps.length} numbered step${numberedSteps.length === 1 ? "" : "s"} found.`,
        detail:
          "Review that the steps are in order, begin from a clear state, and do not rely on private account data.",
        weight: 2,
      }),
    );
    if (numberedSteps.length === 1) {
      checks.push(
        makeCheck({
          id: "steps-single",
          field: "description",
          category: "reproduction",
          title: "Check whether one step is enough",
          status: "suggestion",
          summary: "Only one numbered step was found.",
          detail:
            "If setup or follow-up actions matter, add them so the issue can be reproduced from the beginning.",
          action: "Add any missing setup or follow-up actions.",
          weight: 1,
        }),
      );
    }
    if (numberedSteps.length > 8) {
      checks.push(
        makeCheck({
          id: "steps-many",
          field: "description",
          category: "reproduction",
          title: "Review the number of steps",
          status: "suggestion",
          summary: `${numberedSteps.length} steps may make the issue hard to follow.`,
          detail:
            "Consider removing repeated navigation or splitting unrelated problems into separate reports.",
          action: "Keep only actions required to reproduce this issue.",
          weight: 1,
        }),
      );
    }
  }

  if (!hasExpected && !hasExpectedSentence) {
    checks.push(
      makeCheck({
        id: "expected-missing",
        field: "description",
        category: "outcome",
        title: "State the expected behavior",
        status: normalizedDescription ? "suggestion" : "incomplete",
        summary: "The intended result was not clearly detected.",
        detail:
          "Explain what the page or feature should do after the reproduction steps.",
        action: "Add an expected-behavior section.",
        weight: 2,
      }),
    );
  } else {
    checks.push(
      makeCheck({
        id: "expected-present",
        field: "description",
        category: "outcome",
        title: "Expected behavior is described",
        status: "ready",
        summary: "An expected outcome was detected.",
        detail:
          "Check that the expected outcome is clear and distinct from the actual result.",
        weight: 1,
      }),
    );
  }

  if (!hasActual && !hasActualSentence) {
    checks.push(
      makeCheck({
        id: "actual-missing",
        field: "description",
        category: "outcome",
        title: "State what actually happened",
        status: normalizedDescription ? "suggestion" : "incomplete",
        summary: "The observed result was not clearly detected.",
        detail:
          "Describe the visible result, error message, or lack of response after the steps.",
        action: "Add an actual-behavior section.",
        weight: 2,
      }),
    );
  } else {
    checks.push(
      makeCheck({
        id: "actual-present",
        field: "description",
        category: "outcome",
        title: "Observed behavior is described",
        status: "ready",
        summary: "An observed outcome was detected.",
        detail:
          "Include only the relevant visible behavior and remove private values from copied messages.",
        weight: 1,
      }),
    );
  }

  if (hasExpected !== hasActual) {
    checks.push(
      makeCheck({
        id: "outcome-pair",
        field: "description",
        category: "outcome",
        title: "Keep expected and actual outcomes together",
        status: "suggestion",
        summary: hasExpected
          ? "Expected behavior is labeled, but actual behavior is not."
          : "Actual behavior is labeled, but expected behavior is not.",
        detail:
          "Present both outcomes to make the difference easy to understand.",
        action: "Add the missing outcome section.",
        weight: 1,
      }),
    );
  }

  const vaguePhrase = VAGUE_DESCRIPTION_PHRASES.find((item) =>
    normalizedDescription.toLowerCase().includes(item.phrase),
  );
  if (vaguePhrase) {
    checks.push(
      makeCheck({
        id: "description-vague-phrase",
        field: "description",
        category: "clarity",
        title: "Replace a vague phrase with an observation",
        status: "suggestion",
        summary: `Found ${vaguePhrase.label} in the description.`,
        detail: vaguePhrase.suggestion,
        action: "Edit the phrase so it says what happened.",
        weight: 2,
      }),
    );
  }

  const placeholderMatches = normalizedDescription.match(
    /\[(?:step|expected|actual|what|describe|starting|action|result|page|browser)[^\]]*\]/gi,
  ) || [];
  if (placeholderMatches.length > 0) {
    checks.push(
      makeCheck({
        id: "placeholders",
        field: "description",
        category: "completion",
        title: "Replace template prompts",
        status: "suggestion",
        summary: `${placeholderMatches.length} bracketed prompt${placeholderMatches.length === 1 ? "" : "s"} remain.`,
        detail:
          "Starter templates use bracketed prompts. Replace each prompt with observed details or remove sections that do not apply.",
        action: "Review bracketed text before submitting.",
        weight: 2,
      }),
    );
  } else if (normalizedDescription) {
    checks.push(
      makeCheck({
        id: "placeholders-clear",
        field: "description",
        category: "completion",
        title: "No common template prompts remain",
        status: "ready",
        summary: "No common bracketed prompts were detected.",
        detail:
          "If you used a template, make sure all prompt text has been replaced with the relevant details.",
        weight: 1,
      }),
    );
  }

  const repeatedLines = getRepeatedMeaningfulLines(normalizedDescription);
  if (repeatedLines.length > 0) {
    checks.push(
      makeCheck({
        id: "repeated-lines",
        field: "description",
        category: "clarity",
        title: "Review repeated lines",
        status: "suggestion",
        summary: `${repeatedLines.length} repeated line${repeatedLines.length === 1 ? "" : "s"} detected.`,
        detail:
          "Repeated headings or steps can make it unclear which result belongs to which action.",
        action: "Remove duplicate lines or clarify why they repeat.",
        weight: 1,
      }),
    );
  }

  if (hasFrequency) {
    checks.push(
      makeCheck({
        id: "frequency-present",
        field: "description",
        category: "context",
        title: "Frequency information is included",
        status: "ready",
        summary: "A frequency section is present.",
        detail:
          "If the issue is intermittent, mention what you observed without implying unsupported certainty.",
        weight: 1,
      }),
    );
  }

  if (hasEnvironment) {
    checks.push(
      makeCheck({
        id: "environment-present",
        field: "description",
        category: "context",
        title: "Environment details are included",
        status: "ready",
        summary: "An environment section is present.",
        detail:
          "Keep only browser, device, or viewport details that are relevant to reproducing the issue.",
        weight: 1,
      }),
    );
  }

  if (/\b(always|never|everyone|nobody|completely broken)\b/i.test(normalizedDescription)) {
    checks.push(
      makeCheck({
        id: "absolute-language",
        field: "description",
        category: "precision",
        title: "Check absolute wording",
        status: "suggestion",
        summary: "The description contains an absolute statement.",
        detail:
          "If the behavior varies, state how often it occurred rather than using words such as “always” or “never.”",
        action: "Match certainty to what you tested.",
        weight: 1,
      }),
    );
  }

  const actionableCount = checks.filter(
    (check) => check.status !== "ready",
  ).length;
  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const readyWeight = checks
    .filter((check) => check.status === "ready")
    .reduce((sum, check) => sum + check.weight, 0);
  const score = totalWeight
    ? Math.round((readyWeight / totalWeight) * 100)
    : 0;

  return {
    checks,
    score,
    actionableCount,
    wordCount: words,
    numberedStepCount: numberedSteps.length,
    hasStepsHeading,
    hasExpected,
    hasActual,
    hasFrequency,
    hasEnvironment,
  };
}

function getRepeatedMeaningfulLines(value) {
  const seen = new Set();
  const repeated = new Set();
  value
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.length >= 12)
    .forEach((line) => {
      if (seen.has(line)) repeated.add(line);
      else seen.add(line);
    });
  return [...repeated];
}

function getCoachHeadline(score, actionableCount, title, description) {
  if (!title.trim() || !description.trim()) {
    return {
      title: "Start with the issue and the observed result",
      description:
        "The coach reviews only the title and description and never blocks submission.",
      tone: "neutral",
    };
  }
  if (actionableCount === 0) {
    return {
      title: "No writing suggestions right now",
      description:
        "The report has common reproduction and outcome details. Review the text manually before submitting.",
      tone: "ready",
    };
  }
  if (score >= 75) {
    return {
      title: "The report has a strong starting point",
      description:
        "A few optional suggestions may make the issue easier to investigate.",
      tone: "good",
    };
  }
  return {
    title: "A few details could make this easier to reproduce",
    description:
      "Use the suggestions as prompts, not as rules. Keep only details that match what you observed.",
    tone: "improve",
  };
}

function getStatusCounts(checks) {
  return checks.reduce(
    (counts, check) => {
      counts[check.status] += 1;
      return counts;
    },
    { ready: 0, suggestion: 0, incomplete: 0 },
  );
}

function ProgressRing({ score }) {
  const radius = 23;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const tone =
    score >= 75
      ? "text-emerald-600"
      : score >= 45
        ? "text-amber-600"
        : "text-violet-600";

  return (
    <div
      className="relative grid h-14 w-14 shrink-0 place-items-center"
      role="img"
      aria-label={`Report clarity score: ${score} out of 100`}
    >
      <svg
        viewBox="0 0 56 56"
        className="absolute inset-0 h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          className="text-slate-200"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${tone} transition-[stroke-dashoffset] duration-300`}
        />
      </svg>
      <span className="text-xs font-bold tabular-nums text-slate-800">
        {score}
      </span>
    </div>
  );
}

function CoachSummary({ analysis, headline }) {
  const counts = getStatusCounts(analysis.checks);
  return (
    <div className="rounded-xl border border-violet-100 bg-white p-3">
      <div className="flex items-center gap-3">
        <ProgressRing score={analysis.score} />
        <div className="min-w-0 flex-1">
          <h4 className="text-[11px] font-semibold text-slate-900">
            {headline.title}
          </h4>
          <p className="mt-1 text-[9px] leading-4 text-slate-500">
            {headline.description}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <SummaryCount
          label="Looks good"
          count={counts.ready}
          tone="ready"
        />
        <SummaryCount
          label="Suggestions"
          count={counts.suggestion}
          tone="suggestion"
        />
        <SummaryCount
          label="Add details"
          count={counts.incomplete}
          tone="incomplete"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[8px] text-slate-500">
        <span>{analysis.wordCount} description words</span>
        <span aria-hidden="true">·</span>
        <span>{analysis.numberedStepCount} numbered steps detected</span>
        <span aria-hidden="true">·</span>
        <span>{analysis.actionableCount} optional follow-up checks</span>
      </div>
    </div>
  );
}

function SummaryCount({ label, count, tone }) {
  const colors = {
    ready: "bg-emerald-50 text-emerald-800",
    suggestion: "bg-amber-50 text-amber-800",
    incomplete: "bg-slate-100 text-slate-700",
  };
  return (
    <div className={`rounded-lg px-2 py-1.5 text-center ${colors[tone]}`}>
      <p className="text-sm font-bold tabular-nums">{count}</p>
      <p className="text-[8px] font-medium">{label}</p>
    </div>
  );
}

function CheckCard({ check, expanded, onToggle, onFocusField }) {
  const status = CHECK_STATUS[check.status];
  const StatusIcon = status.icon;

  return (
    <li className={`rounded-xl border p-3 ${status.card}`}>
      <div className="flex items-start gap-2.5">
        <span
          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
            check.status === "ready"
              ? "bg-emerald-50 text-emerald-700"
              : check.status === "suggestion"
                ? "bg-amber-50 text-amber-800"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          <StatusIcon size={13} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h5 className="text-[10px] font-semibold text-slate-800">
              {check.title}
            </h5>
            <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-semibold ${status.badge}`}>
              {status.label}
            </span>
            <span className="rounded-full bg-white px-1.5 py-0.5 text-[8px] text-slate-500">
              {FIELD_LABELS[check.field]}
            </span>
          </div>
          <p className="mt-1 text-[9px] leading-4 text-slate-600">
            {check.summary}
          </p>
          <button
            type="button"
            onClick={() => onToggle(check.id)}
            aria-expanded={expanded}
            className="mt-1.5 inline-flex items-center gap-1 text-[8px] font-semibold text-violet-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            {expanded ? "Hide explanation" : "Why this matters"}
            {expanded ? (
              <ChevronUp size={10} aria-hidden="true" />
            ) : (
              <ChevronDown size={10} aria-hidden="true" />
            )}
          </button>
          {expanded && (
            <div className="mt-2 space-y-2 rounded-lg border border-slate-100 bg-white p-2.5">
              <p className="text-[9px] leading-4 text-slate-600">
                {check.detail}
              </p>
              {check.action && (
                <p className="flex items-start gap-1.5 text-[9px] leading-4 text-violet-800">
                  <ArrowRight
                    size={10}
                    className="mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  {check.action}
                </p>
              )}
              <button
                type="button"
                onClick={() => onFocusField(check.field)}
                className="inline-flex min-h-7 items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[8px] font-semibold text-violet-800 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <ArrowDown size={9} aria-hidden="true" />
                Edit {FIELD_LABELS[check.field].toLowerCase()}
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function SectionTemplateCard({
  section,
  isPresent,
  onAdd,
}) {
  const Icon = section.icon;
  return (
    <li className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-violet-50 text-violet-700">
        <Icon size={12} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h5 className="text-[9px] font-semibold text-slate-700">
          {section.label}
        </h5>
        <p className="mt-1 whitespace-pre-wrap break-words rounded-md bg-slate-50 p-2 font-mono text-[8px] leading-4 text-slate-500">
          {section.body}
        </p>
        <p className="mt-1 text-[8px] leading-4 text-slate-500">
          {section.guidance}
        </p>
      </div>
      {isPresent ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-1 text-[8px] font-semibold text-emerald-700">
          <Check size={9} aria-hidden="true" />
          Added
        </span>
      ) : (
        <button
          type="button"
          onClick={() => onAdd(section)}
          aria-label={`Add ${section.label} section`}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-violet-200 bg-violet-50 text-violet-800 transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <Plus size={12} aria-hidden="true" />
        </button>
      )}
    </li>
  );
}

function CoachFilterButton({ filter, active, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-7 rounded-lg border px-2.5 py-1 text-[8px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
        active
          ? "border-violet-700 bg-violet-700 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {filter.label} ({count})
    </button>
  );
}

function GuideCard({ icon: Icon, title, children }) {
  return (
    <li className="flex items-start gap-2 rounded-lg border border-slate-100 bg-white p-2.5">
      <Icon
        size={12}
        className="mt-0.5 shrink-0 text-violet-700"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <h5 className="text-[9px] font-semibold text-slate-700">{title}</h5>
        <p className="mt-1 text-[8px] leading-4 text-slate-500">{children}</p>
      </div>
    </li>
  );
}

export default function ReportClarityCoach({
  title,
  description,
  onDescriptionChange,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [expandedCheckId, setExpandedCheckId] = useState("");
  const [showSectionTemplates, setShowSectionTemplates] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const analysis = useMemo(
    () => analyzeReport(title, description),
    [description, title],
  );
  const headline = useMemo(
    () =>
      getCoachHeadline(
        analysis.score,
        analysis.actionableCount,
        title,
        description,
      ),
    [analysis.actionableCount, analysis.score, description, title],
  );
  const statusCounts = useMemo(
    () => getStatusCounts(analysis.checks),
    [analysis.checks],
  );
  const visibleChecks = useMemo(
    () =>
      analysis.checks.filter((check) => {
        if (filter === "suggestions") return check.status !== "ready";
        if (filter === "ready") return check.status === "ready";
        return true;
      }),
    [analysis.checks, filter],
  );

  const handleFocusField = (field) => {
    const targetId =
      field === "title" ? "bug-report-title" : "bug-report-description";
    const target = document.getElementById(targetId);
    target?.focus();
    target?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "center",
    });
  };

  const handleAddSection = (section) => {
    if (isCoachSectionPresent(description, section)) {
      setAnnouncement(`${section.label} is already in the description.`);
      return;
    }

    const sectionBody =
      section.id === "outcomes" &&
      (isSectionPresent(description, "Expected behavior:") ||
        isSectionPresent(description, "Actual behavior:"))
        ? [
            isSectionPresent(description, "Expected behavior:")
              ? ""
              : "Expected behavior:\n[What should happen?]",
            isSectionPresent(description, "Actual behavior:")
              ? ""
              : "Actual behavior:\n[What happened instead?]",
          ]
            .filter(Boolean)
            .join("\n\n")
        : section.body;
    const nextDescription = description.trim()
      ? `${description.trimEnd()}\n\n${sectionBody}`
      : sectionBody;
    onDescriptionChange?.(nextDescription);
    setAnnouncement(`${section.label} section added to the description.`);
  };

  const addAllMissingSections = () => {
    const missingSections = REPORT_SECTIONS.filter(
      (section) => !isCoachSectionPresent(description, section),
    );
    if (!missingSections.length) {
      setAnnouncement("All suggested sections are already present.");
      return;
    }

    const addition = missingSections
      .map((section) => {
        if (section.id !== "outcomes") return section.body;

        return [
          isSectionPresent(description, "Expected behavior:")
            ? ""
            : "Expected behavior:\n[What should happen?]",
          isSectionPresent(description, "Actual behavior:")
            ? ""
            : "Actual behavior:\n[What happened instead?]",
        ]
          .filter(Boolean)
          .join("\n\n");
      })
      .filter(Boolean)
      .join("\n\n");
    const nextDescription = description.trim()
      ? `${description.trimEnd()}\n\n${addition}`
      : addition;
    onDescriptionChange?.(nextDescription);
    setAnnouncement(
      `${missingSections.length} report section${missingSections.length === 1 ? "" : "s"} added. Edit or remove prompts that do not apply.`,
    );
  };

  const clearCoachFilters = () => {
    setFilter("all");
    setExpandedCheckId("");
    setAnnouncement("All clarity checks are shown.");
  };

  const filterCounts = {
    all: analysis.checks.length,
    suggestions: statusCounts.suggestion + statusCounts.incomplete,
    ready: statusCounts.ready,
  };

  const sectionState = {
    reproduction: analysis.hasStepsHeading,
    outcomes: analysis.hasExpected && analysis.hasActual,
    frequency: analysis.hasFrequency,
    environment: analysis.hasEnvironment,
  };
  const allSectionsPresent = REPORT_SECTIONS.every(
    (section) => sectionState[section.id],
  );

  return (
    <section
      className="mb-5 overflow-hidden rounded-2xl border border-violet-100 bg-violet-50/40"
      aria-labelledby="report-clarity-coach-heading"
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-controls="report-clarity-coach-content"
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-violet-700 shadow-sm">
          <WandSparkles size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            id="report-clarity-coach-heading"
            className="block text-xs font-semibold text-slate-900"
          >
            Report clarity coach
          </span>
          <span className="mt-0.5 block text-[9px] leading-4 text-slate-500">
            Local suggestions for making the issue easier to reproduce
          </span>
        </span>
        <span className="hidden items-center gap-1.5 rounded-full bg-white px-2 py-1 text-[8px] font-semibold text-violet-800 sm:inline-flex">
          <Gauge size={10} aria-hidden="true" />
          {analysis.score}/100
        </span>
        {isOpen ? (
          <ChevronUp
            size={15}
            className="shrink-0 text-slate-500"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            size={15}
            className="shrink-0 text-slate-500"
            aria-hidden="true"
          />
        )}
      </button>

      {isOpen && (
        <div
          id="report-clarity-coach-content"
          className="space-y-3 border-t border-violet-100 p-3 sm:p-4"
        >
          <div className="flex items-start gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2.5">
            <Info
              size={13}
              className="mt-0.5 shrink-0 text-sky-800"
              aria-hidden="true"
            />
            <p className="text-[9px] leading-4 text-sky-900">
              Checks run in this page using the report title and description.
              They are suggestions only: the score is not a quality guarantee,
              and nothing here blocks submission.
            </p>
          </div>

          <CoachSummary analysis={analysis} headline={headline} />

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="text-[10px] font-semibold text-slate-800">
                    Writing checks
                  </h4>
                  <p className="mt-1 text-[8px] leading-4 text-slate-500">
                    Automatic checks can miss context or misunderstand unusual
                    reports. Use your judgment.
                  </p>
                </div>
                {filter !== "all" && (
                  <button
                    type="button"
                    onClick={clearCoachFilters}
                    className="text-[8px] font-semibold text-violet-700 underline underline-offset-2"
                  >
                    Reset filter
                  </button>
                )}
              </div>

              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label="Filter report writing checks"
              >
                {COACH_FILTERS.map((item) => (
                  <CoachFilterButton
                    key={item.id}
                    filter={item}
                    active={filter === item.id}
                    count={filterCounts[item.id]}
                    onClick={() => setFilter(item.id)}
                  />
                ))}
              </div>

              <p className="text-[8px] text-slate-500" aria-live="polite">
                Showing {visibleChecks.length} of {analysis.checks.length} checks
              </p>

              {visibleChecks.length ? (
                <ul className="space-y-2" aria-label="Report clarity checks">
                  {visibleChecks.map((check) => (
                    <CheckCard
                      key={check.id}
                      check={check}
                      expanded={expandedCheckId === check.id}
                      onToggle={(checkId) =>
                        setExpandedCheckId((current) =>
                          current === checkId ? "" : checkId,
                        )
                      }
                      onFocusField={handleFocusField}
                    />
                  ))}
                </ul>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center">
                  <SearchCheck
                    size={15}
                    className="mx-auto text-slate-400"
                    aria-hidden="true"
                  />
                  <p className="mt-2 text-[9px] font-semibold text-slate-700">
                    No checks match this filter
                  </p>
                  <button
                    type="button"
                    onClick={clearCoachFilters}
                    className="mt-1 text-[8px] font-semibold text-violet-700 underline underline-offset-2"
                  >
                    Show all checks
                  </button>
                </div>
              )}
            </section>

            <div className="space-y-3">
              <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-start gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700">
                    <ClipboardList size={13} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[10px] font-semibold text-slate-800">
                      Add report structure
                    </h4>
                    <p className="mt-1 text-[8px] leading-4 text-slate-500">
                      Insert editable section prompts into the description.
                      Existing matching headings are not duplicated.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setShowSectionTemplates((current) => !current)
                  }
                  aria-expanded={showSectionTemplates}
                  aria-controls="report-clarity-sections"
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[8px] font-semibold text-violet-800 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  <Plus size={10} aria-hidden="true" />
                  {showSectionTemplates ? "Hide section prompts" : "Browse section prompts"}
                </button>
                {showSectionTemplates && (
                  <div id="report-clarity-sections" className="space-y-2">
                    <ul className="space-y-2">
                      {REPORT_SECTIONS.map((section) => (
                        <SectionTemplateCard
                          key={section.id}
                          section={section}
                          isPresent={sectionState[section.id]}
                          onAdd={handleAddSection}
                        />
                      ))}
                    </ul>
                    {!allSectionsPresent && (
                      <button
                        type="button"
                        onClick={addAllMissingSections}
                        className="inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-violet-700 px-3 py-1.5 text-[8px] font-semibold text-white hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                      >
                        <Plus size={10} aria-hidden="true" />
                        Add all missing sections
                      </button>
                    )}
                    <p className="text-[8px] leading-4 text-slate-500">
                      Prompt text is added only when you choose. Edit or delete
                      prompts that do not apply; never submit placeholders as
                      observations.
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-start gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                    <MessageSquareText size={13} aria-hidden="true" />
                  </span>
                  <div>
                    <h4 className="text-[10px] font-semibold text-slate-800">
                      A helpful report usually includes
                    </h4>
                    <p className="mt-1 text-[8px] leading-4 text-slate-500">
                      Use only the context relevant to this issue.
                    </p>
                  </div>
                </div>
                <ul className="mt-2 space-y-1.5">
                  <GuideCard icon={ListOrdered} title="Starting point and actions">
                    A known initial state followed by a short ordered sequence.
                  </GuideCard>
                  <GuideCard icon={Target} title="Expected and observed results">
                    A clear contrast between what should happen and what did.
                  </GuideCard>
                  <GuideCard icon={RotateCcw} title="Frequency and conditions">
                    Whether it repeats and any condition that changes the result.
                  </GuideCard>
                  <GuideCard icon={FileCheck2} title="Relevant environment">
                    Browser or viewport details only when they help explain the bug.
                  </GuideCard>
                </ul>
              </section>

              <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/70 p-3">
                <AlertCircle
                  size={12}
                  className="mt-0.5 shrink-0 text-amber-800"
                  aria-hidden="true"
                />
                <p className="text-[8px] leading-4 text-amber-900">
                  The clarity score is a writing aid, not a severity rating or
                  pass/fail decision. A short report can be excellent when it
                  fully explains a simple issue.
                </p>
              </div>
            </div>
          </div>

          {announcement && (
            <p
              className="sr-only"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {announcement}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
