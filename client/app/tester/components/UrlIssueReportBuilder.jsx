"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  ClipboardCheck,
  Compass,
  Eye,
  EyeOff,
  Globe,
  Info,
  ListOrdered,
  Monitor,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";

const MAX_REPRODUCTION_STEPS = 12;
const MAX_STEP_LENGTH = 500;
const MAX_SUMMARY_LENGTH = 180;
const MAX_BEHAVIOR_LENGTH = 2_000;

const ISSUE_TYPES = [
  { id: "functionality", label: "Functionality", hint: "An action or workflow does not work as expected." },
  { id: "visual", label: "Visual or layout", hint: "A page looks incorrect, clipped, or misaligned." },
  { id: "performance", label: "Performance", hint: "A page or action is unusually slow or unresponsive." },
  { id: "navigation", label: "Navigation", hint: "A link, route, or browser navigation behaves incorrectly." },
  { id: "content", label: "Content", hint: "Text, labels, or displayed information are incorrect." },
  { id: "accessibility", label: "Accessibility", hint: "Keyboard, focus, contrast, or assistive technology behavior is blocked." },
  { id: "other", label: "Other", hint: "Describe the issue in your own words." },
];

const IMPACT_LEVELS = [
  {
    id: "blocking",
    label: "Blocks the task",
    description: "The affected task cannot be completed.",
  },
  {
    id: "major",
    label: "Major disruption",
    description: "A key feature is difficult to use or has no reasonable workaround.",
  },
  {
    id: "moderate",
    label: "Workaround available",
    description: "The task is possible, but the issue causes friction or confusion.",
  },
  {
    id: "minor",
    label: "Minor impact",
    description: "The issue is noticeable but does not prevent the task.",
  },
];

const FREQUENCIES = [
  { id: "every-time", label: "Every time" },
  { id: "often", label: "Often" },
  { id: "sometimes", label: "Sometimes" },
  { id: "once", label: "Only once" },
  { id: "unknown", label: "Not sure yet" },
];

const FIELD_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
const SMALL_BUTTON_CLASS =
  "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40";

function safeUrlContext(value, includePath) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;

    const safe = new URL(url.origin);
    if (includePath) {
      safe.pathname = url.pathname || "/";
      [...url.searchParams.keys()].forEach((key) => {
        safe.searchParams.append(key, "[redacted]");
      });
    }

    return {
      value: safe.href,
      includesPath: includePath,
      redactedParameters: includePath ? [...url.searchParams.keys()].length : 0,
    };
  } catch {
    return null;
  }
}

function captureBrowserSnapshot() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return null;
  }

  let browser = "Browser name unavailable";
  const brands = navigator.userAgentData?.brands;
  if (Array.isArray(brands) && brands.length) {
    const preferredBrand = brands.find(
      (brand) => !/not.?a.?brand/i.test(brand.brand),
    );
    if (preferredBrand) {
      browser = `${preferredBrand.brand} ${preferredBrand.version}`;
    }
  } else {
    const userAgent = navigator.userAgent || "";
    const match =
      userAgent.match(/(Edg|OPR|Chrome|Firefox|Version|Safari)\/([\d.]+)/) ||
      userAgent.match(/(MSIE\s|Trident\/.*rv:)([\d.]+)/);
    if (match) {
      const browserName =
        match[1] === "Version" ? "Safari" : match[1].replace(/\/$/, "");
      browser = `${browserName} ${match[2]}`;
    }
  }

  return {
    browser,
    viewport: `${window.innerWidth} × ${window.innerHeight} CSS pixels`,
    deviceScale: `${window.devicePixelRatio || 1}×`,
    language: navigator.language || "Not available",
    capturedAt: new Date().toISOString(),
  };
}

function formatCaptureTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "time unavailable";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getIssueType(id) {
  return ISSUE_TYPES.find((type) => type.id === id) || ISSUE_TYPES[0];
}

function getImpactLevel(id) {
  return IMPACT_LEVELS.find((impact) => impact.id === id) || IMPACT_LEVELS[2];
}

function getFrequency(id) {
  return FREQUENCIES.find((frequency) => frequency.id === id) || FREQUENCIES[4];
}

function FormSection({ icon: Icon, title, description, children, className = "" }) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-3 sm:p-4 ${className}`}
    >
      <div className="mb-3 flex items-start gap-2.5">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700">
          <Icon size={14} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h4 className="text-xs font-semibold text-slate-800">{title}</h4>
          {description && (
            <p className="mt-1 text-[10px] leading-4 text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function FieldHint({ children, id }) {
  return (
    <p id={id} className="mt-1.5 text-[9px] leading-4 text-slate-500">
      {children}
    </p>
  );
}

function CharacterCount({ value, limit }) {
  const remaining = limit - value.length;
  const isNearLimit = remaining <= Math.ceil(limit * 0.1);
  return (
    <p
      className={`mt-1 text-right text-[9px] tabular-nums ${
        remaining < 0
          ? "text-rose-700"
          : isNearLimit
            ? "text-amber-700"
            : "text-slate-400"
      }`}
      aria-live="polite"
      aria-atomic="true"
    >
      {value.length} / {limit}
    </p>
  );
}

function StepCard({
  step,
  index,
  total,
  onChange,
  onMove,
  onRemove,
  canEdit,
}) {
  const describedBy = `url-issue-step-hint-${index}`;
  return (
    <li className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
      <div className="flex items-start gap-2">
        <span
          className="mt-2 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[9px] font-semibold tabular-nums text-slate-600"
          aria-hidden="true"
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor={`url-issue-step-${index}`}>
            Reproduction step {index + 1}
          </label>
          <textarea
            id={`url-issue-step-${index}`}
            value={step}
            onChange={(event) => onChange(index, event.target.value)}
            maxLength={MAX_STEP_LENGTH}
            rows={2}
            aria-describedby={describedBy}
            placeholder={
              index === 0
                ? "Start from a page or state a tester can access..."
                : "Describe one action and its result..."
            }
            className={`${FIELD_CLASS} resize-y`}
          />
          <p
            id={describedBy}
            className="mt-1 text-right text-[9px] tabular-nums text-slate-400"
          >
            {step.length} / {MAX_STEP_LENGTH}
          </p>
        </div>
        <div
          className="flex shrink-0 flex-col gap-1"
          role="group"
          aria-label={`Actions for step ${index + 1}`}
        >
          <button
            type="button"
            onClick={() => onMove(index, -1)}
            disabled={!canEdit || index === 0}
            aria-label={`Move step ${index + 1} up`}
            className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-40"
          >
            <ArrowUp size={12} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 1)}
            disabled={!canEdit || index === total - 1}
            aria-label={`Move step ${index + 1} down`}
            className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-40"
          >
            <ArrowDown size={12} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            disabled={!canEdit}
            aria-label={`Remove step ${index + 1}`}
            className="grid h-7 w-7 place-items-center rounded-md border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-40"
          >
            <Trash2 size={12} aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  );
}

function ChoiceCard({ name, value, selected, title, description, onChange }) {
  return (
    <label
      className={`flex min-h-[66px] cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition focus-within:ring-2 focus-within:ring-violet-500 focus-within:ring-offset-1 ${
        selected
          ? "border-violet-300 bg-violet-50/70"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={onChange}
        className="mt-0.5 h-3.5 w-3.5 accent-violet-700"
      />
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold text-slate-800">
          {title}
        </span>
        {description && (
          <span className="mt-1 block text-[9px] leading-4 text-slate-500">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

function DestinationContext({ testUrl, includePath, onIncludePath }) {
  const safeContext = useMemo(
    () => safeUrlContext(testUrl, includePath),
    [includePath, testUrl],
  );

  if (!testUrl) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
        <AlertTriangle
          size={13}
          className="mt-0.5 shrink-0 text-amber-800"
          aria-hidden="true"
        />
        <p className="text-[9px] leading-4 text-amber-900">
          No test destination is selected. Choose a URL in the test checklist
          before applying this report context.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
        <input
          type="checkbox"
          checked={includePath}
          onChange={(event) => onIncludePath(event.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 accent-violet-700"
        />
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold text-slate-700">
            Include the page path
          </span>
          <span className="mt-1 block text-[9px] leading-4 text-slate-500">
            Query parameter values and URL fragments are always omitted. Check
            the path for private identifiers before including it.
          </span>
        </span>
      </label>
      <div className="flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50/70 p-2.5">
        {includePath ? (
          <Eye size={13} className="mt-0.5 shrink-0 text-emerald-800" />
        ) : (
          <EyeOff size={13} className="mt-0.5 shrink-0 text-emerald-800" />
        )}
        <p className="min-w-0 break-all text-[9px] leading-4 text-emerald-900">
          <span className="font-semibold">Preview: </span>
          {safeContext?.value || "Destination unavailable"}
          {safeContext?.redactedParameters > 0 &&
            ` (${safeContext.redactedParameters} query value${safeContext.redactedParameters === 1 ? "" : "s"} redacted)`}
        </p>
      </div>
    </div>
  );
}

function BrowserSnapshot({ snapshot, onCapture, onClear }) {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] leading-4 text-slate-600">
          Browser details are optional and are captured only when you choose.
          No full user-agent string is collected.
        </p>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={onCapture}
            className={`${SMALL_BUTTON_CLASS} border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100`}
          >
            <Monitor size={11} aria-hidden="true" />
            {snapshot ? "Refresh snapshot" : "Capture browser"}
          </button>
          {snapshot && (
            <button
              type="button"
              onClick={onClear}
              className={`${SMALL_BUTTON_CLASS} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
            >
              <X size={11} aria-hidden="true" />
              Remove
            </button>
          )}
        </div>
      </div>
      {snapshot ? (
        <dl className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 sm:grid-cols-2">
          <div>
            <dt className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
              Browser
            </dt>
            <dd className="mt-0.5 break-words text-[10px] text-slate-700">
              {snapshot.browser}
            </dd>
          </div>
          <div>
            <dt className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
              Viewport
            </dt>
            <dd className="mt-0.5 text-[10px] text-slate-700">
              {snapshot.viewport}
            </dd>
          </div>
          <div>
            <dt className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
              Display scale
            </dt>
            <dd className="mt-0.5 text-[10px] text-slate-700">
              {snapshot.deviceScale}
            </dd>
          </div>
          <div>
            <dt className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
              Language
            </dt>
            <dd className="mt-0.5 text-[10px] text-slate-700">
              {snapshot.language}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
              Captured locally
            </dt>
            <dd className="mt-0.5 text-[10px] text-slate-700">
              {formatCaptureTime(snapshot.capturedAt)}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-2.5 text-[9px] leading-4 text-slate-500">
          No browser information will be added to the report until you capture
          it here.
        </p>
      )}
    </div>
  );
}

function buildReportDescription({
  issueType,
  impact,
  frequency,
  destination,
  steps,
  expected,
  actual,
  snapshot,
}) {
  const sections = [
    `Issue type:\n${issueType.label}`,
    `Impact:\n${impact.label} — ${impact.description}`,
    `Frequency:\n${frequency.label}`,
  ];

  if (destination) {
    sections.push(
      `Test destination:\n${destination.value}${
        destination.redactedParameters > 0
          ? `\n(${destination.redactedParameters} query parameter value${destination.redactedParameters === 1 ? "" : "s"} redacted; fragment omitted)`
          : "\n(URL fragment and credentials omitted)"
      }`,
    );
  }

  const cleanSteps = steps.map((step) => step.trim()).filter(Boolean);
  if (cleanSteps.length) {
    sections.push(
      `Steps to reproduce:\n${cleanSteps
        .map((step, index) => `${index + 1}. ${step}`)
        .join("\n")}`,
    );
  }

  if (expected.trim()) {
    sections.push(`Expected behavior:\n${expected.trim()}`);
  }
  if (actual.trim()) {
    sections.push(`Actual behavior:\n${actual.trim()}`);
  }

  if (snapshot) {
    sections.push(
      [
        "Browser environment (captured locally)",
        `Browser: ${snapshot.browser}`,
        `Viewport: ${snapshot.viewport}`,
        `Display scale: ${snapshot.deviceScale}`,
        `Language: ${snapshot.language}`,
        `Captured: ${formatCaptureTime(snapshot.capturedAt)}`,
      ].join("\n"),
    );
  }

  sections.push(
    "Privacy note:\nQuery values and URL fragments are not included. Review the page path and report text before submitting.",
  );

  return sections.join("\n\n");
}

function ReportPreview({
  title,
  description,
  destination,
  stepCount,
  onApply,
  applyMode,
  onApplyModeChange,
  hasTestUrl,
}) {
  const canApply = Boolean(title.trim() && description.trim() && hasTestUrl);

  return (
    <section className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/60 p-3 sm:p-4">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-violet-700">
          <ClipboardCheck size={14} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-semibold text-slate-800">
            Review before applying
          </h4>
          <p className="mt-1 text-[9px] leading-4 text-slate-600">
            {stepCount} reproduction step{stepCount === 1 ? "" : "s"} ·{" "}
            {description.length.toLocaleString()} description characters
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[9px] font-semibold text-emerald-700">
          <ShieldCheck size={11} aria-hidden="true" />
          Query values hidden
        </span>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
            Generated title
          </p>
          <p className="mt-1 break-words text-xs font-semibold text-slate-800">
            {title || "Add a short issue summary to generate a title."}
          </p>
        </div>
        <div className="max-h-60 overflow-auto border-t border-slate-100 pt-2">
          <p className="whitespace-pre-wrap break-words text-[10px] leading-5 text-slate-700">
            {description}
          </p>
        </div>
        {destination && (
          <p className="border-t border-slate-100 pt-2 text-[9px] leading-4 text-slate-500">
            Destination included:{" "}
            <span className="break-all font-medium text-slate-700">
              {destination.value}
            </span>
          </p>
        )}
      </div>

      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-1 text-[10px] font-semibold text-slate-700">
          Apply generated details
        </legend>
        <ChoiceCard
          name="url-issue-apply-mode"
          value="replace"
          selected={applyMode === "replace"}
          title="Replace title and description"
          description="Use this generated report as the complete report text."
          onChange={() => onApplyModeChange("replace")}
        />
        <ChoiceCard
          name="url-issue-apply-mode"
          value="append"
          selected={applyMode === "append"}
          title="Append to description"
          description="Keep the current title and add these details after existing text."
          onChange={() => onApplyModeChange("append")}
        />
      </fieldset>

      {!hasTestUrl && (
        <p
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[9px] leading-4 text-amber-900"
        >
          Select a test URL before applying this URL-specific report.
        </p>
      )}
      <button
        type="button"
        onClick={onApply}
        disabled={!canApply}
        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Check size={14} aria-hidden="true" />
        Apply report details to form
      </button>
    </section>
  );
}

export default function UrlIssueReportBuilder({
  testUrl,
  currentDescription = "",
  onApply,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [issueTypeId, setIssueTypeId] = useState("functionality");
  const [impactId, setImpactId] = useState("moderate");
  const [frequencyId, setFrequencyId] = useState("unknown");
  const [steps, setSteps] = useState([""]);
  const [stepDraft, setStepDraft] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [includePath, setIncludePath] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [applyMode, setApplyMode] = useState(
    currentDescription.trim() ? "append" : "replace",
  );
  const [appliedReport, setAppliedReport] = useState("");

  const issueType = getIssueType(issueTypeId);
  const impact = getImpactLevel(impactId);
  const frequency = getFrequency(frequencyId);
  const destination = useMemo(
    () => safeUrlContext(testUrl, includePath),
    [includePath, testUrl],
  );
  const completeSteps = useMemo(
    () => steps.map((step) => step.trim()).filter(Boolean),
    [steps],
  );
  const generatedTitle = summary.trim()
    ? `[${issueType.label}] ${summary.trim()}`.slice(0, 240)
    : "";
  const generatedDescription = useMemo(
    () =>
      buildReportDescription({
        issueType,
        impact,
        frequency,
        destination,
        steps,
        expected,
        actual,
        snapshot,
      }),
    [actual, destination, expected, frequency, impact, issueType, snapshot, steps],
  );
  const generatedReportKey = JSON.stringify([
    generatedTitle,
    generatedDescription,
  ]);
  const hasApplied = appliedReport === generatedReportKey;

  const addStep = () => {
    const cleanStep = stepDraft.trim();
    if (!cleanStep) return;
    if (steps.length >= MAX_REPRODUCTION_STEPS) return;

    setSteps((current) => [...current, cleanStep.slice(0, MAX_STEP_LENGTH)]);
    setStepDraft("");
  };

  const updateStep = (index, value) => {
    setSteps((current) =>
      current.map((step, stepIndex) =>
        stepIndex === index ? value.slice(0, MAX_STEP_LENGTH) : step,
      ),
    );
  };

  const moveStep = (index, direction) => {
    setSteps((current) => {
      const destinationIndex = index + direction;
      if (destinationIndex < 0 || destinationIndex >= current.length) {
        return current;
      }

      const reordered = [...current];
      [reordered[index], reordered[destinationIndex]] = [
        reordered[destinationIndex],
        reordered[index],
      ];
      return reordered;
    });
  };

  const removeStep = (index) => {
    setSteps((current) => {
      const next = current.filter((_, stepIndex) => stepIndex !== index);
      return next.length ? next : [""];
    });
  };

  const handleCaptureSnapshot = () => {
    const nextSnapshot = captureBrowserSnapshot();
    if (!nextSnapshot) return;

    setSnapshot(nextSnapshot);
  };

  const handleApply = () => {
    if (!generatedTitle || !generatedDescription.trim() || !testUrl) return;

    onApply?.({
      title: generatedTitle,
      description: generatedDescription,
      mode: applyMode,
    });
    setAppliedReport(generatedReportKey);
  };

  const resetBuilder = () => {
    setSummary("");
    setIssueTypeId("functionality");
    setImpactId("moderate");
    setFrequencyId("unknown");
    setSteps([""]);
    setStepDraft("");
    setExpected("");
    setActual("");
    setIncludePath(false);
    setSnapshot(null);
    setAppliedReport("");
  };

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-controls="url-issue-report-builder"
        className="flex w-full cursor-pointer items-center gap-3 bg-violet-50/70 px-4 py-3 text-left transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 sm:px-5"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-violet-700 shadow-sm">
          <WandSparkles size={17} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-slate-900">
            Guided URL bug report
          </span>
          <span className="mt-0.5 block text-[10px] leading-4 text-slate-600">
            Build a clear reproduction report from the current test destination
          </span>
        </span>
        {completeSteps.length > 0 && (
          <span className="hidden rounded-full bg-white px-2 py-1 text-[9px] font-semibold text-violet-700 sm:inline">
            {completeSteps.length} step{completeSteps.length === 1 ? "" : "s"}
          </span>
        )}
        {isOpen ? (
          <ChevronUp size={16} className="shrink-0 text-slate-500" />
        ) : (
          <ChevronDown size={16} className="shrink-0 text-slate-500" />
        )}
      </button>

      {isOpen && (
        <div
          id="url-issue-report-builder"
          className="space-y-3 border-t border-violet-100 p-3 sm:p-5"
        >
          <div className="flex items-start gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2.5">
            <Info
              size={13}
              className="mt-0.5 shrink-0 text-sky-800"
              aria-hidden="true"
            />
            <p className="text-[9px] leading-4 text-sky-900">
              This builder prepares text for the report form; it does not
              submit anything. Review the generated content and remove private
              details before submitting.
            </p>
          </div>

          <FormSection
            icon={Sparkles}
            title="Summarize what went wrong"
            description="A concise summary becomes the report title. Keep it focused on the observed behavior."
          >
            <label
              htmlFor="url-issue-summary"
              className="mb-1 block text-[10px] font-semibold text-slate-700"
            >
              Issue summary
            </label>
            <input
              id="url-issue-summary"
              value={summary}
              onChange={(event) =>
                setSummary(event.target.value.slice(0, MAX_SUMMARY_LENGTH))
              }
              maxLength={MAX_SUMMARY_LENGTH}
              placeholder="e.g. Saving profile changes returns to the old values"
              className={FIELD_CLASS}
              aria-describedby="url-issue-summary-hint"
            />
            <FieldHint id="url-issue-summary-hint">
              Describe the visible problem, not a guess about its cause.
            </FieldHint>
            <CharacterCount value={summary} limit={MAX_SUMMARY_LENGTH} />
          </FormSection>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormSection
              icon={CircleHelp}
              title="Issue type"
              description="Choose the closest category."
            >
              <label className="sr-only" htmlFor="url-issue-type">
                Issue category
              </label>
              <select
                id="url-issue-type"
                value={issueTypeId}
                onChange={(event) => setIssueTypeId(event.target.value)}
                className={FIELD_CLASS}
              >
                {ISSUE_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
              <FieldHint>{issueType.hint}</FieldHint>
            </FormSection>

            <FormSection
              icon={AlertTriangle}
              title="How much does it affect the task?"
              description="This is included as tester context, not a server-side severity field."
            >
              <div className="grid gap-1.5">
                {IMPACT_LEVELS.map((level) => (
                  <label
                    key={level.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 ${
                      impactId === level.id
                        ? "border-violet-300 bg-violet-50/70"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="url-issue-impact"
                      value={level.id}
                      checked={impactId === level.id}
                      onChange={() => setImpactId(level.id)}
                      className="mt-0.5 h-3 w-3 accent-violet-700"
                    />
                    <span className="min-w-0">
                      <span className="block text-[9px] font-semibold text-slate-700">
                        {level.label}
                      </span>
                      <span className="mt-0.5 block text-[9px] leading-4 text-slate-500">
                        {level.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </FormSection>
          </div>

          <FormSection
            icon={Compass}
            title="Test destination"
            description="The report includes only the safe preview shown below. Query values and fragments are always omitted."
          >
            <DestinationContext
              testUrl={testUrl}
              includePath={includePath}
              onIncludePath={setIncludePath}
            />
          </FormSection>

          <FormSection
            icon={ListOrdered}
            title="Steps to reproduce"
            description={`Add up to ${MAX_REPRODUCTION_STEPS} short, ordered actions. Leave unused steps blank; they will not be added.`}
          >
            <ol className="space-y-2" aria-label="Reproduction steps">
              {steps.map((step, index) => (
                <StepCard
                  key={`url-report-step-${index}`}
                  step={step}
                  index={index}
                  total={steps.length}
                  onChange={updateStep}
                  onMove={moveStep}
                  onRemove={removeStep}
                  canEdit={steps.length > 1}
                />
              ))}
            </ol>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="url-issue-step-draft">
                Add another reproduction step
              </label>
              <input
                id="url-issue-step-draft"
                value={stepDraft}
                onChange={(event) =>
                  setStepDraft(event.target.value.slice(0, MAX_STEP_LENGTH))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    addStep();
                  }
                }}
                maxLength={MAX_STEP_LENGTH}
                placeholder="Add the next action..."
                className={`${FIELD_CLASS} min-w-0 flex-1`}
                disabled={steps.length >= MAX_REPRODUCTION_STEPS}
              />
              <button
                type="button"
                onClick={addStep}
                disabled={
                  !stepDraft.trim() || steps.length >= MAX_REPRODUCTION_STEPS
                }
                className={`${SMALL_BUTTON_CLASS} border-violet-200 bg-violet-50 px-3 text-violet-800 hover:bg-violet-100`}
              >
                <Plus size={12} aria-hidden="true" />
                Add step
              </button>
            </div>
            <FieldHint>
              Use one action per step. Press Enter to add; use the arrow buttons
              to reorder.
            </FieldHint>
            {steps.length >= MAX_REPRODUCTION_STEPS && (
              <p
                role="status"
                className="mt-1 text-[9px] text-amber-800"
              >
                The {MAX_REPRODUCTION_STEPS}-step limit has been reached.
              </p>
            )}
          </FormSection>

          <FormSection
            icon={Check}
            title="Expected and actual behavior"
            description="Describe the difference between what should happen and what you observed."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="url-issue-expected"
                  className="mb-1 block text-[10px] font-semibold text-slate-700"
                >
                  Expected behavior
                </label>
                <textarea
                  id="url-issue-expected"
                  value={expected}
                  onChange={(event) =>
                    setExpected(event.target.value.slice(0, MAX_BEHAVIOR_LENGTH))
                  }
                  maxLength={MAX_BEHAVIOR_LENGTH}
                  rows={4}
                  placeholder="What should happen after the steps?"
                  className={`${FIELD_CLASS} resize-y`}
                />
                <CharacterCount value={expected} limit={MAX_BEHAVIOR_LENGTH} />
              </div>
              <div>
                <label
                  htmlFor="url-issue-actual"
                  className="mb-1 block text-[10px] font-semibold text-slate-700"
                >
                  Actual behavior
                </label>
                <textarea
                  id="url-issue-actual"
                  value={actual}
                  onChange={(event) =>
                    setActual(event.target.value.slice(0, MAX_BEHAVIOR_LENGTH))
                  }
                  maxLength={MAX_BEHAVIOR_LENGTH}
                  rows={4}
                  placeholder="What happened instead? Include any visible error message."
                  className={`${FIELD_CLASS} resize-y`}
                />
                <CharacterCount value={actual} limit={MAX_BEHAVIOR_LENGTH} />
              </div>
            </div>
          </FormSection>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormSection
              icon={RotateCcw}
              title="How often does it happen?"
              description="Select the frequency you observed."
            >
              <div className="grid gap-1.5">
                {FREQUENCIES.map((frequency) => (
                  <label
                    key={frequency.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 ${
                      frequencyId === frequency.id
                        ? "border-violet-300 bg-violet-50/70"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="url-issue-frequency"
                      value={frequency.id}
                      checked={frequencyId === frequency.id}
                      onChange={() => setFrequencyId(frequency.id)}
                      className="h-3 w-3 accent-violet-700"
                    />
                    <span className="text-[9px] font-medium text-slate-700">
                      {frequency.label}
                    </span>
                  </label>
                ))}
              </div>
            </FormSection>

            <FormSection
              icon={Globe}
              title="Browser environment"
              description="Capture a small, optional browser snapshot for compatibility issues."
            >
              <BrowserSnapshot
                snapshot={snapshot}
                onCapture={handleCaptureSnapshot}
                onClear={() => setSnapshot(null)}
              />
            </FormSection>
          </div>

          <ReportPreview
            title={generatedTitle}
            description={generatedDescription}
            destination={destination}
            stepCount={completeSteps.length}
            onApply={handleApply}
            applyMode={applyMode}
            onApplyModeChange={setApplyMode}
            hasTestUrl={Boolean(testUrl)}
          />

          {hasApplied && (
            <p
              role="status"
              aria-live="polite"
              className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[9px] leading-4 text-emerald-900"
            >
              <Check size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
              Details added to the report form. You can edit them there before
              submitting.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-start gap-1.5 text-[9px] leading-4 text-slate-500">
              <EyeOff
                size={11}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              Nothing is submitted or saved by this builder.
            </p>
            <button
              type="button"
              onClick={resetBuilder}
              className={`${SMALL_BUTTON_CLASS} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
            >
              <Trash2 size={11} aria-hidden="true" />
              Clear builder
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
