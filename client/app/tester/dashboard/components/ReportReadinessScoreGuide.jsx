"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleAlert,
  ClipboardCheck,
  Info,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from "lucide-react";

const SCORE_BANDS = [
  {
    id: "needs-details",
    label: "Needs details",
    range: "0–49%",
    minimum: 0,
    maximum: 49,
    summary: "Several core details may be missing.",
    recommendation:
      "Start with reproduction steps and expected/actual behavior. These carry the largest individual weights.",
    foreground: "text-rose-700",
    ring: "stroke-rose-500",
    surface: "bg-rose-50",
    border: "border-rose-200",
    fill: "bg-rose-500",
    icon: CircleAlert,
  },
  {
    id: "mostly-ready",
    label: "Mostly ready",
    range: "50–79%",
    minimum: 50,
    maximum: 79,
    summary: "The report has some useful details and may benefit from a few additions.",
    recommendation:
      "Check the missing items in the report checklist and add the most relevant information.",
    foreground: "text-amber-700",
    ring: "stroke-amber-500",
    surface: "bg-amber-50",
    border: "border-amber-200",
    fill: "bg-amber-500",
    icon: Info,
  },
  {
    id: "ready",
    label: "Ready to review",
    range: "80–100%",
    minimum: 80,
    maximum: 100,
    summary: "Most of the core checklist details are present.",
    recommendation:
      "This is a helpful starting point for review, not a guarantee that the issue is reproducible or complete.",
    foreground: "text-emerald-700",
    ring: "stroke-emerald-500",
    surface: "bg-emerald-50",
    border: "border-emerald-200",
    fill: "bg-emerald-500",
    icon: BadgeCheck,
  },
];

const EXAMPLE_CHECKS = {
  minimal: {
    title: true,
    description: false,
    steps: false,
    outcomes: false,
    target: false,
  },
  inProgress: {
    title: true,
    description: true,
    steps: true,
    outcomes: false,
    target: false,
  },
  detailed: {
    title: true,
    description: true,
    steps: true,
    outcomes: true,
    target: true,
  },
};

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function getCriterionWeightTotal(criteria) {
  return criteria.reduce(
    (total, criterion) => total + Math.max(0, Number(criterion.weight) || 0),
    0,
  );
}

function calculateScore(criteria, checks) {
  const totalWeight = getCriterionWeightTotal(criteria);
  if (!totalWeight) return 0;

  const earnedWeight = criteria.reduce((total, criterion) => {
    if (!checks[criterion.id]) return total;
    return total + Math.max(0, Number(criterion.weight) || 0);
  }, 0);

  return Math.round((earnedWeight / totalWeight) * 100);
}

function getBand(score) {
  return (
    SCORE_BANDS.find(
      (band) => score >= band.minimum && score <= band.maximum,
    ) || SCORE_BANDS[0]
  );
}

function getCriterionReason(criterion) {
  const reasons = {
    title:
      "A specific title helps someone quickly identify the page, feature, or behavior involved.",
    description:
      "Context gives reviewers a short explanation of what the report is about.",
    steps:
      "Reproducible actions help another person verify the behavior. This is one of the highest-weighted checks.",
    outcomes:
      "Separating expected from actual behavior makes the difference explicit. Both headings must be present.",
    target:
      "A valid HTTP or HTTPS page address can help locate the affected area. Only add it when it is safe to share.",
  };

  return reasons[criterion.id] || criterion.description;
}

function getCriterionExamples(criterion) {
  const examples = {
    title: {
      strong: "Checkout page: promo code is not applied",
      weak: "Bug",
    },
    description: {
      strong:
        "After entering a valid code, the order total stays unchanged and no error appears.",
      weak: "It does not work.",
    },
    steps: {
      strong:
        "1. Open checkout\n2. Enter a valid promo code\n3. Select Apply",
      weak: "Try the page.",
    },
    outcomes: {
      strong:
        "Expected behavior: The discount updates the total.\nActual behavior: The total remains unchanged.",
      weak: "It seems wrong.",
    },
    target: {
      strong: "https://example.com/checkout",
      weak: "No affected page was included.",
    },
  };

  return examples[criterion.id] || {
    strong: criterion.description,
    weak: "Not provided.",
  };
}

function ScoreRing({ score, band }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div
      className="relative grid h-20 w-20 shrink-0 place-items-center"
      aria-label={`Example score ${score}%`}
    >
      <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90">
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          className="stroke-slate-100"
          strokeWidth="6"
        />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          className={band.ring}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 250ms ease" }}
        />
      </svg>
      <span className="text-base font-bold tabular-nums text-slate-900">
        {score}%
      </span>
    </div>
  );
}

function ScoreBandCard({ band, active }) {
  const Icon = band.icon;

  return (
    <article
      className={`rounded-xl border p-3 transition ${
        active
          ? `${band.border} ${band.surface} shadow-sm`
          : "border-slate-200/80 bg-white"
      }`}
      aria-current={active ? "step" : undefined}
    >
      <div className="flex items-start gap-2">
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${band.surface} ${band.foreground}`}
        >
          <Icon size={14} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <h4 className="text-[10px] font-semibold text-slate-800">
              {band.label}
            </h4>
            <span
              className={`rounded-full px-2 py-0.5 text-[8px] font-semibold ${band.surface} ${band.foreground}`}
            >
              {band.range}
            </span>
          </div>
          <p className="mt-1 text-[9px] leading-4 text-slate-500">
            {band.summary}
          </p>
        </div>
      </div>
      <p className="mt-2 border-t border-slate-200/70 pt-2 text-[8px] leading-4 text-slate-500">
        {band.recommendation}
      </p>
    </article>
  );
}

function WeightBar({ criterion, totalWeight }) {
  const weight = Math.max(0, Number(criterion.weight) || 0);
  const width = totalWeight ? (weight / totalWeight) * 100 : 0;

  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-label={`${criterion.label}: ${weight} points out of ${totalWeight}`}
      aria-valuenow={weight}
      aria-valuemin={0}
      aria-valuemax={totalWeight}
    >
      <div
        className="h-full rounded-full bg-violet-500 transition-[width]"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function CriterionWeightCard({ criterion, totalWeight, selected, onToggle }) {
  const examples = getCriterionExamples(criterion);

  return (
    <article
      className={`rounded-xl border bg-white p-3 transition ${
        selected
          ? "border-violet-200 shadow-sm shadow-violet-900/[0.03]"
          : "border-slate-200/80"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={selected}
          aria-label={`${selected ? "Remove" : "Add"} ${criterion.label} in score example`}
          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            selected
              ? "border-violet-500 bg-violet-600 text-white"
              : "border-slate-300 bg-white text-transparent hover:border-violet-400"
          }`}
        >
          <Check size={11} strokeWidth={3} aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="truncate text-[10px] font-semibold text-slate-800">
                {criterion.label}
              </h4>
              <p className="mt-0.5 text-[8px] leading-4 text-slate-500">
                {getCriterionReason(criterion)}
              </p>
            </div>
            <span className="shrink-0 rounded-lg bg-violet-50 px-2 py-1 text-[9px] font-bold tabular-nums text-violet-700">
              +{formatNumber(criterion.weight)}
            </span>
          </div>
          <div className="mt-2">
            <WeightBar criterion={criterion} totalWeight={totalWeight} />
          </div>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            <p className="rounded-lg bg-emerald-50/70 px-2 py-1.5 text-[8px] leading-4 text-emerald-800">
              <span className="font-semibold">Helpful example: </span>
              {examples.strong}
            </p>
            <p className="rounded-lg bg-slate-50 px-2 py-1.5 text-[8px] leading-4 text-slate-500">
              <span className="font-semibold">Not enough by itself: </span>
              {examples.weak}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function ExamplePreset({ active, label, description, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
        active
          ? "border-violet-300 bg-violet-50"
          : "border-slate-200 bg-white hover:border-violet-200"
      }`}
    >
      <span
        className={`block text-[9px] font-semibold ${
          active ? "text-violet-700" : "text-slate-700"
        }`}
      >
        {label}
      </span>
      <span className="mt-0.5 block text-[8px] leading-4 text-slate-500">
        {description}
      </span>
    </button>
  );
}

function CalculatorResult({ score, totalWeight, earnedWeight }) {
  const band = getBand(score);
  const BandIcon = band.icon;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3">
      <div className="flex items-center gap-3">
        <ScoreRing score={score} band={band} />
        <div className="min-w-0">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold ${band.surface} ${band.foreground}`}
          >
            <BandIcon size={11} aria-hidden="true" />
            {band.label}
          </span>
          <p className="mt-1.5 text-[9px] leading-4 text-slate-500">
            Example points earned: {formatNumber(earnedWeight)} of{" "}
            {formatNumber(totalWeight)}.
          </p>
          <p className="mt-1 text-[8px] leading-4 text-slate-400">
            {band.recommendation}
          </p>
        </div>
      </div>
      <div className="mt-3 border-t border-slate-100 pt-2">
        <div className="flex items-center justify-between gap-2 text-[8px] text-slate-500">
          <span>0%</span>
          <span>Readiness scale</span>
          <span>100%</span>
        </div>
        <div className="mt-1.5 flex h-2 overflow-hidden rounded-full">
          <span className="w-1/2 bg-rose-300" />
          <span className="w-[30%] bg-amber-300" />
          <span className="flex-1 bg-emerald-300" />
        </div>
        <div className="relative mt-1 h-3">
          <span
            className="absolute -top-1 h-2 w-0.5 bg-slate-900"
            style={{ left: `${score}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}

function FormulaPanel({ criteria, totalWeight }) {
  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3">
      <div className="flex items-start gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-violet-700">
          <Target size={13} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h4 className="text-[9px] font-semibold text-slate-800">
            The score formula
          </h4>
          <p className="mt-1 text-[8px] leading-4 text-slate-600">
            Add the weights for criteria that pass, divide by the total
            available weight, then round to the nearest whole percent.
          </p>
        </div>
      </div>
      <div className="mt-2 rounded-lg border border-violet-100 bg-white px-2.5 py-2 text-center">
        <code className="break-words text-[9px] font-semibold text-violet-800">
          earned criterion weights ÷ {formatNumber(totalWeight)} × 100
        </code>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {criteria.map((criterion) => (
          <span
            key={criterion.id}
            className="rounded-md border border-violet-100 bg-white px-1.5 py-1 text-[8px] text-slate-500"
          >
            {criterion.label}: {formatNumber(criterion.weight)}
          </span>
        ))}
      </div>
    </div>
  );
}

function ScreenshotNote() {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/60 p-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white text-sky-700">
        <Info size={12} aria-hidden="true" />
      </span>
      <p className="text-[8px] leading-4 text-sky-900">
        Screenshots are optional supporting context. They are intentionally
        excluded from the readiness score, so a report is never penalized for
        not including one.
      </p>
    </div>
  );
}

function ScoreGuideHeader({ expanded, onToggle, totalWeight }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50/80 to-white px-3 py-2.5 text-left transition hover:border-violet-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-violet-700 shadow-sm">
          <ClipboardCheck size={14} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[10px] font-semibold text-slate-800">
            How readiness scores work
          </span>
          <span className="mt-0.5 block truncate text-[8px] text-slate-500">
            {formatNumber(totalWeight)} weighted points · transparent checklist
          </span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="hidden rounded-full border border-violet-100 bg-white px-2 py-1 text-[8px] font-semibold text-violet-700 sm:inline">
          {expanded ? "Hide guide" : "View scoring guide"}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </span>
    </button>
  );
}

function ScoreBandLegend() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SCORE_BANDS.map((band) => (
        <span
          key={band.id}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-semibold ${band.border} ${band.surface} ${band.foreground}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${band.fill}`} />
          {band.range}
          <span className="font-medium">{band.label}</span>
        </span>
      ))}
    </div>
  );
}

function ScoreExampleCalculator({ criteria, totalWeight }) {
  const [checks, setChecks] = useState(EXAMPLE_CHECKS.inProgress);
  const score = calculateScore(criteria, checks);
  const earnedWeight = criteria.reduce(
    (total, criterion) =>
      checks[criterion.id]
        ? total + Math.max(0, Number(criterion.weight) || 0)
        : total,
    0,
  );
  const selectedCount = criteria.filter(
    (criterion) => checks[criterion.id],
  ).length;

  const toggleCriterion = (criterionId) => {
    setChecks((current) => ({
      ...current,
      [criterionId]: !current[criterionId],
    }));
  };

  const selectPreset = (preset) => {
    setChecks({ ...EXAMPLE_CHECKS[preset] });
  };

  const reset = () => selectPreset("inProgress");

  return (
    <section className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-[10px] font-semibold text-slate-800">
            Try a score example
          </h4>
          <p className="mt-0.5 text-[8px] leading-4 text-slate-500">
            Toggle checklist items to see how each weight changes a sample
            score. This does not edit any report.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[8px] font-semibold text-slate-500 transition hover:bg-white hover:text-violet-700"
        >
          <RotateCcw size={10} aria-hidden="true" />
          Reset
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <ExamplePreset
          active={
            Object.keys(EXAMPLE_CHECKS.minimal).every(
              (key) => checks[key] === EXAMPLE_CHECKS.minimal[key],
            )
          }
          label="Starter"
          description="Specific title only"
          onClick={() => selectPreset("minimal")}
        />
        <ExamplePreset
          active={
            Object.keys(EXAMPLE_CHECKS.inProgress).every(
              (key) => checks[key] === EXAMPLE_CHECKS.inProgress[key],
            )
          }
          label="In progress"
          description="Title, context, and steps"
          onClick={() => selectPreset("inProgress")}
        />
        <ExamplePreset
          active={
            Object.keys(EXAMPLE_CHECKS.detailed).every(
              (key) => checks[key] === EXAMPLE_CHECKS.detailed[key],
            )
          }
          label="Detailed"
          description="All five criteria included"
          onClick={() => selectPreset("detailed")}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(220px,0.65fr)]">
        <div className="space-y-2">
          {criteria.map((criterion) => (
            <CriterionWeightCard
              key={criterion.id}
              criterion={criterion}
              totalWeight={totalWeight}
              selected={Boolean(checks[criterion.id])}
              onToggle={() => toggleCriterion(criterion.id)}
            />
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[8px] text-slate-500">
            <span>
              {formatNumber(selectedCount)} of {formatNumber(criteria.length)}{" "}
              criteria selected
            </span>
            <span>{formatNumber(earnedWeight)} points earned</span>
          </div>
        </div>
        <div className="space-y-2">
          <CalculatorResult
            score={score}
            totalWeight={totalWeight}
            earnedWeight={earnedWeight}
          />
          <FormulaPanel criteria={criteria} totalWeight={totalWeight} />
          <ScreenshotNote />
        </div>
      </div>
    </section>
  );
}

function CriterionWeightList({ criteria, totalWeight }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h4 className="text-[10px] font-semibold text-slate-800">
            What each criterion checks
          </h4>
          <p className="mt-0.5 text-[8px] text-slate-500">
            Each criterion contributes its fixed weight when its check passes.
          </p>
        </div>
        <Target size={13} className="text-violet-600" aria-hidden="true" />
      </div>
      <div className="space-y-2.5">
        {criteria.map((criterion) => (
          <div key={criterion.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <div className="min-w-0">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-[9px] font-medium text-slate-700">
                  {criterion.label}
                </span>
                <span className="shrink-0 text-[8px] font-semibold tabular-nums text-violet-700">
                  {formatNumber(criterion.weight)} pts
                </span>
              </div>
              <WeightBar criterion={criterion} totalWeight={totalWeight} />
              <p className="mt-1 text-[8px] leading-4 text-slate-500">
                {getCriterionReason(criterion)}
              </p>
            </div>
            <CheckCircle2
              size={13}
              className="text-emerald-500"
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoringMethodDetails({ criteria, totalWeight }) {
  const [showAll, setShowAll] = useState(false);

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white">
      <button
        type="button"
        onClick={() => setShowAll((current) => !current)}
        aria-expanded={showAll}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="inline-flex items-center gap-2">
          <ShieldCheck size={12} className="text-violet-600" aria-hidden="true" />
          <span className="text-[9px] font-semibold text-slate-700">
            Scoring rules and limits
          </span>
        </span>
        <ChevronDown
          size={12}
          className={`text-slate-400 transition-transform ${
            showAll ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      {showAll && (
        <div className="space-y-2 border-t border-slate-100 px-3 py-3 text-[8px] leading-4 text-slate-500">
          <p>
            The score is a local, heuristic checklist and does not decide
            whether a report is valid, important, or ready for engineering work.
          </p>
          <ul className="list-disc space-y-1 pl-4">
            <li>
              A criterion adds its weight only when its current check passes.
            </li>
            <li>
              Expected and actual behavior are treated as one criterion and
              require both headings.
            </li>
            <li>
              The affected page check accepts HTTP and HTTPS URLs only.
            </li>
            <li>
              Screenshot availability is displayed separately and has no score
              weight.
            </li>
            <li>
              {formatNumber(totalWeight)} available points currently span{" "}
              {formatNumber(criteria.length)} criteria.
            </li>
            <li>
              A report can be useful even when its score is low; the score is a
              guide for adding context, not a submission gate.
            </li>
          </ul>
        </div>
      )}
    </section>
  );
}

function ScoreGuideContent({ criteria, totalWeight }) {
  const [activeTab, setActiveTab] = useState("weights");
  const [expandedBand, setExpandedBand] = useState("mostly-ready");
  const [showCaveats, setShowCaveats] = useState(false);
  const selectedBand = useMemo(
    () => SCORE_BANDS.find((band) => band.id === expandedBand),
    [expandedBand],
  );

  const tabs = [
    { id: "weights", label: "Weights" },
    { id: "bands", label: "Score bands" },
    { id: "example", label: "Calculator" },
  ];

  return (
    <div className="space-y-3 pt-2">
      <div
        role="tablist"
        aria-label="Score guide sections"
        className="flex flex-wrap gap-1 rounded-xl border border-slate-200/80 bg-slate-50 p-1"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`readiness-score-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`readiness-score-panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`h-8 rounded-lg px-3 text-[9px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
              activeTab === tab.id
                ? "bg-white text-violet-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-auto hidden items-center gap-1 px-2 text-[8px] text-slate-400 sm:inline-flex">
          <Info size={10} aria-hidden="true" />
          Advisory only
        </span>
      </div>

      <div
        id="readiness-score-panel-weights"
        role="tabpanel"
        aria-labelledby="readiness-score-tab-weights"
        hidden={activeTab !== "weights"}
        className="space-y-3"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.75fr)]">
          <CriterionWeightList
            criteria={criteria}
            totalWeight={totalWeight}
          />
          <div className="space-y-2">
            <FormulaPanel criteria={criteria} totalWeight={totalWeight} />
            <ScreenshotNote />
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
              <div className="flex items-start gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white text-emerald-700">
                  <CheckCircle2 size={12} aria-hidden="true" />
                </span>
                <p className="text-[8px] leading-4 text-emerald-900">
                  Criteria have different weights because some details are
                  especially useful for investigation. Reproduction steps and
                  expected/actual behavior each account for{" "}
                  {formatNumber(
                    criteria.find((criterion) => criterion.id === "steps")
                      ?.weight || 0,
                  )}{" "}
                  and{" "}
                  {formatNumber(
                    criteria.find((criterion) => criterion.id === "outcomes")
                      ?.weight || 0,
                  )}{" "}
                  points respectively.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        id="readiness-score-panel-bands"
        role="tabpanel"
        aria-labelledby="readiness-score-tab-bands"
        hidden={activeTab !== "bands"}
        className="space-y-3"
      >
        <div className="grid gap-2 md:grid-cols-3">
          {SCORE_BANDS.map((band) => (
            <button
              key={band.id}
              type="button"
              onClick={() =>
                setExpandedBand((current) =>
                  current === band.id ? "" : band.id,
                )
              }
              aria-expanded={expandedBand === band.id}
              className="rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <ScoreBandCard
                band={band}
                active={expandedBand === band.id}
              />
            </button>
          ))}
        </div>
        {selectedBand && (
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
            <p className="text-[9px] font-semibold text-slate-700">
              What this range means
            </p>
            <p className="mt-1 text-[8px] leading-4 text-slate-500">
              {selectedBand.recommendation}
            </p>
          </div>
        )}
        <ScoreBandLegend />
      </div>

      <div
        id="readiness-score-panel-example"
        role="tabpanel"
        aria-labelledby="readiness-score-tab-example"
        hidden={activeTab !== "example"}
      >
        <ScoreExampleCalculator
          criteria={criteria}
          totalWeight={totalWeight}
        />
      </div>

      <ScoringMethodDetails
        criteria={criteria}
        totalWeight={totalWeight}
      />

      <div className="rounded-xl border border-slate-200/80 bg-white">
        <button
          type="button"
          onClick={() => setShowCaveats((current) => !current)}
          aria-expanded={showCaveats}
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
        >
          <span className="inline-flex items-center gap-2 text-[9px] font-semibold text-slate-600">
            <Info size={12} className="text-slate-400" aria-hidden="true" />
            What this score cannot tell you
          </span>
          <ChevronDown
            size={12}
            className={`text-slate-400 transition-transform ${
              showCaveats ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>
        {showCaveats && (
          <div className="grid gap-2 border-t border-slate-100 p-3 sm:grid-cols-2">
            {[
              "It cannot verify that the report is factually accurate.",
              "It does not determine severity, impact, or priority.",
              "It does not know your team's internal reporting standards.",
              "It does not guarantee that another person can reproduce the issue.",
            ].map((item) => (
              <p
                key={item}
                className="flex items-start gap-1.5 text-[8px] leading-4 text-slate-500"
              >
                <Circle
                  size={7}
                  className="mt-1 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                {item}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportReadinessScoreGuide({ criteria }) {
  const [expanded, setExpanded] = useState(false);
  const normalizedCriteria = useMemo(
    () =>
      Array.isArray(criteria)
        ? criteria.filter(
            (criterion) =>
              criterion &&
              typeof criterion.id === "string" &&
              Number.isFinite(Number(criterion.weight)) &&
              Number(criterion.weight) >= 0,
          )
        : [],
    [criteria],
  );
  const totalWeight = getCriterionWeightTotal(normalizedCriteria);

  if (!normalizedCriteria.length) return null;

  return (
    <section
      aria-label="Report readiness score guide"
      className="rounded-xl"
    >
      <ScoreGuideHeader
        expanded={expanded}
        onToggle={() => setExpanded((current) => !current)}
        totalWeight={totalWeight}
      />
      {expanded && (
        <ScoreGuideContent
          criteria={normalizedCriteria}
          totalWeight={totalWeight}
        />
      )}
    </section>
  );
}
