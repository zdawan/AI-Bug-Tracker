"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  EyeOff,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  Mail,
  Phone,
  ScanSearch,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

const FINDING_RULES = [
  {
    id: "email",
    label: "Email address",
    description: "An email-like value appears in the report text.",
    icon: Mail,
    tone: "amber",
    expression: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    captureGroup: 0,
    guidance:
      "Replace real addresses with a non-routable example if the address itself is not needed to reproduce the bug.",
  },
  {
    id: "phone",
    label: "Phone-like number",
    description: "A phone-like sequence of digits appears in the report text.",
    icon: Phone,
    tone: "amber",
    expression: /(?:\+?\d[\d\s().-]{7,}\d)/g,
    captureGroup: 0,
    minimumDigits: 9,
    guidance:
      "Remove personal phone numbers or replace them with a clearly fictional value.",
  },
  {
    id: "payment-card",
    label: "Possible payment-card number",
    description:
      "A number matching a common payment-card shape and checksum was found.",
    icon: Fingerprint,
    tone: "rose",
    expression: /\b(?:\d[ -]*?){13,19}\b/g,
    captureGroup: 0,
    requiresLuhn: true,
    guidance:
      "Never include real payment-card data. Keep only a processor-approved test value when essential.",
  },
  {
    id: "bearer-token",
    label: "Bearer token",
    description: "A value following a Bearer authorization marker was found.",
    icon: KeyRound,
    tone: "rose",
    expression: /\bBearer\s+([A-Za-z0-9._~+/-]+=*)/gi,
    captureGroup: 1,
    guidance:
      "Remove authorization tokens. They may grant access even after the report is submitted.",
  },
  {
    id: "secret-assignment",
    label: "Secret or credential assignment",
    description:
      "A value assigned to a password, token, secret, or API-key label was found.",
    icon: LockKeyhole,
    tone: "rose",
    expression:
      /\b(password|passwd|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret)\b\s*[:=]\s*(['"]?)([^,\s;'"`]+)/gi,
    captureGroup: 3,
    guidance:
      "Keep the field name only if useful, and remove the value. Do not include production credentials.",
  },
  {
    id: "jwt",
    label: "JWT-like token",
    description:
      "A three-part token with a JWT-like structure was found.",
    icon: Shield,
    tone: "rose",
    expression:
      /\beyJ[A-Za-z0-9_-]{5,}\.eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g,
    captureGroup: 0,
    guidance:
      "Remove the token and describe the authentication state without sharing the credential.",
  },
  {
    id: "cloud-key",
    label: "Cloud access-key identifier",
    description:
      "A value matching a common cloud access-key identifier prefix was found.",
    icon: KeyRound,
    tone: "rose",
    expression: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
    captureGroup: 0,
    guidance:
      "Remove cloud access-key identifiers and rotate any real key that has been exposed.",
  },
  {
    id: "url-query",
    label: "URL query value",
    description:
      "A query parameter value appears in a URL included in the report text.",
    icon: EyeOff,
    tone: "amber",
    expression: /([?&][^=?&#\s]+)=([^&#\s]*)/g,
    captureGroup: 2,
    minimumLength: 1,
    guidance:
      "Query values can contain session IDs or personal information. Replace the value or share only the page path.",
  },
];

const TONE_CLASSES = {
  amber: {
    card: "border-amber-200 bg-amber-50/60",
    icon: "bg-amber-100 text-amber-800",
    badge: "bg-amber-100 text-amber-900",
  },
  rose: {
    card: "border-rose-200 bg-rose-50/60",
    icon: "bg-rose-100 text-rose-800",
    badge: "bg-rose-100 text-rose-900",
  },
};

const FIELD_LABELS = {
  title: "Report title",
  description: "Description",
};

function isLuhnValid(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function getCaptureRange(match, captureGroup) {
  if (captureGroup === 0) {
    return {
      value: match[0],
      start: match.index,
      end: match.index + match[0].length,
    };
  }

  const capture = match[captureGroup];
  if (!capture) return null;

  const fullMatch = match[0];
  const matchStart = match.index;
  const groupPosition = fullMatch.lastIndexOf(capture);
  if (groupPosition < 0) return null;

  return {
    value: capture,
    start: matchStart + groupPosition,
    end: matchStart + groupPosition + capture.length,
  };
}

function scanField(field, text) {
  if (!text) return [];

  const findings = [];
  FINDING_RULES.forEach((rule) => {
    const expression = new RegExp(
      rule.expression.source,
      rule.expression.flags.includes("g")
        ? rule.expression.flags
        : `${rule.expression.flags}g`,
    );
    let match = expression.exec(text);

    while (match) {
      const range = getCaptureRange(
        match,
        rule.captureGroup ?? 0,
      );
      if (!range?.value) {
        if (match[0] === "") expression.lastIndex += 1;
        match = expression.exec(text);
        continue;
      }

      const digitCount = range.value.replace(/\D/g, "").length;
      const meetsMinimumDigits =
        !rule.minimumDigits || digitCount >= rule.minimumDigits;
      const meetsMinimumLength =
        rule.minimumLength === undefined ||
        range.value.length >= rule.minimumLength;
      const meetsChecksum =
        !rule.requiresLuhn || isLuhnValid(range.value);

      if (meetsMinimumDigits && meetsMinimumLength && meetsChecksum) {
        findings.push({
          id: `${field}:${rule.id}:${range.start}:${range.end}`,
          field,
          ruleId: rule.id,
          start: range.start,
          end: range.end,
          length: range.value.length,
          severity: rule.tone,
        });
      }

      if (match[0] === "") expression.lastIndex += 1;
      match = expression.exec(text);
    }
  });

  const sortedFindings = findings.sort(
    (left, right) =>
      left.start - right.start ||
      right.end - left.end ||
      (left.severity === "rose" ? -1 : 1) -
        (right.severity === "rose" ? -1 : 1) ||
      left.ruleId.localeCompare(right.ruleId),
  );
  const nonOverlappingFindings = [];
  let lastCoveredEnd = -1;
  sortedFindings.forEach((finding) => {
    if (finding.start < lastCoveredEnd) return;
    nonOverlappingFindings.push(finding);
    lastCoveredEnd = finding.end;
  });
  return nonOverlappingFindings;
}

function maskDetectedValue(length) {
  if (length <= 0) return "Hidden value";
  return `${"•".repeat(Math.min(12, Math.max(4, length)))}${length > 12 ? "…" : ""}`;
}

function groupFindings(findings) {
  const groups = new Map();
  findings.forEach((finding) => {
    const group = groups.get(finding.ruleId) || {
      rule: FINDING_RULES.find((item) => item.id === finding.ruleId),
      findings: [],
    };
    group.findings.push(finding);
    groups.set(finding.ruleId, group);
  });
  return [...groups.values()];
}

function applyRedactions(text, findings, selectedIds, field) {
  const replacements = findings
    .filter(
      (finding) =>
        finding.field === field && selectedIds.has(finding.id),
    )
    .sort((left, right) => right.start - left.start);

  let result = text;
  let appliedCount = 0;
  replacements.forEach((finding) => {
    if (finding.start < 0 || finding.end > result.length) return;
    result =
      result.slice(0, finding.start) +
      "[REDACTED]" +
      result.slice(finding.end);
    appliedCount += 1;
  });
  return { text: result, appliedCount };
}

function SeveritySummary({ findings }) {
  const criticalCount = findings.filter(
    (finding) => finding.severity === "rose",
  ).length;
  const reviewCount = findings.filter(
    (finding) => finding.severity === "amber",
  ).length;

  if (!findings.length) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <ShieldCheck
          size={14}
          className="mt-0.5 shrink-0 text-emerald-700"
          aria-hidden="true"
        />
        <p className="text-[10px] leading-4 text-emerald-900">
          No common sensitive patterns were detected in the report title or
          description. This is a local pattern check, not a guarantee that the
          report contains no private information.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
      <AlertTriangle
        size={14}
        className="mt-0.5 shrink-0 text-amber-800"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-amber-950">
          Review {findings.length} possible sensitive value
          {findings.length === 1 ? "" : "s"}
        </p>
        <p className="mt-1 text-[9px] leading-4 text-amber-900">
          {criticalCount} credential-like and {reviewCount} personal or URL
          value{criticalCount + reviewCount === 1 ? "" : "s"} detected. Nothing
          has been changed.
        </p>
      </div>
    </div>
  );
}

function FindingRow({ finding, selected, onToggle, index }) {
  const rule = FINDING_RULES.find((item) => item.id === finding.ruleId);
  if (!rule) return null;

  const Icon = rule.icon;
  const tone = TONE_CLASSES[rule.tone];
  return (
    <li className={`rounded-lg border p-2.5 ${tone.card}`}>
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={(event) => onToggle(finding.id, event.target.checked)}
          aria-label={`Select ${rule.label.toLowerCase()} in ${FIELD_LABELS[finding.field]}`}
          className="mt-1 h-3.5 w-3.5 shrink-0 accent-violet-700"
        />
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${tone.icon}`}>
          <Icon size={13} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h5 className="text-[10px] font-semibold text-slate-800">
              {rule.label}
            </h5>
            <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${tone.badge}`}>
              {finding.severity === "rose" ? "Sensitive" : "Review"}
            </span>
            <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[8px] text-slate-500">
              {FIELD_LABELS[finding.field]}
            </span>
          </div>
          <p className="mt-1 text-[9px] leading-4 text-slate-600">
            {rule.description}
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-white/80 px-2 py-1 font-mono text-[9px] text-slate-500">
            <EyeOff size={10} aria-hidden="true" />
            {maskDetectedValue(finding.length)}
          </p>
          <p className="mt-1.5 text-[8px] leading-4 text-slate-500">
            {rule.guidance}
          </p>
        </div>
        <span className="shrink-0 text-[8px] tabular-nums text-slate-400">
          {index + 1}
        </span>
      </div>
    </li>
  );
}

function FindingGroup({ group, findings, selectedIds, onToggle }) {
  const Icon = group.rule.icon;
  const selectedCount = group.findings.filter((finding) =>
    selectedIds.has(finding.id),
  ).length;
  const allSelected = selectedCount === group.findings.length;

  const toggleGroup = () => {
    group.findings.forEach((finding) => {
      onToggle(finding.id, !allSelected);
    });
  };

  return (
    <section className="space-y-2" aria-label={`${group.rule.label} findings`}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-700">
          <Icon size={12} aria-hidden="true" />
          {group.rule.label}
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-medium text-slate-500">
            {group.findings.length}
          </span>
        </h4>
        <button
          type="button"
          onClick={toggleGroup}
          className="text-[8px] font-semibold text-violet-700 underline underline-offset-2"
        >
          {allSelected ? "Deselect group" : "Select group"}
        </button>
      </div>
      <ul className="space-y-1.5">
        {group.findings.map((finding, index) => (
          <FindingRow
            key={finding.id}
            finding={finding}
            index={index}
            selected={selectedIds.has(finding.id)}
            onToggle={onToggle}
          />
        ))}
      </ul>
    </section>
  );
}

function PrivacyChecklist() {
  const checklistItems = [
    "Remove real account credentials and access tokens.",
    "Use fictional examples for personal details where possible.",
    "Review screenshots for private information before attaching them.",
    "Avoid including production data that is not needed to reproduce the issue.",
    "Check URLs, query strings, and copied error messages manually.",
  ];

  return (
    <details className="rounded-xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-[10px] font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
        <CircleHelp size={13} className="text-violet-700" aria-hidden="true" />
        <span className="flex-1">Manual privacy checklist</span>
        <ChevronDown size={13} className="text-slate-400" aria-hidden="true" />
      </summary>
      <ul className="space-y-2 border-t border-slate-100 px-3 py-3">
        {checklistItems.map((item) => (
          <li key={item} className="flex items-start gap-2 text-[9px] leading-4 text-slate-600">
            <Check
              size={11}
              className="mt-0.5 shrink-0 text-emerald-700"
              aria-hidden="true"
            />
            {item}
          </li>
        ))}
      </ul>
    </details>
  );
}

function ReviewActions({
  findings,
  selectedCount,
  onSelectAll,
  onClearSelection,
  onRedactSelected,
  onRedactAll,
}) {
  const allSelected = findings.length > 0 && selectedCount === findings.length;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
      <button
        type="button"
        onClick={allSelected ? onClearSelection : onSelectAll}
        disabled={!findings.length}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
      >
        {allSelected ? (
          <X size={11} aria-hidden="true" />
        ) : (
          <CheckCheck size={11} aria-hidden="true" />
        )}
        {allSelected ? "Clear selection" : "Select all"}
      </button>
      <button
        type="button"
        onClick={onRedactSelected}
        disabled={!selectedCount}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-violet-700 px-2.5 py-1.5 text-[9px] font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <EyeOff size={11} aria-hidden="true" />
        Redact selected ({selectedCount})
      </button>
      <button
        type="button"
        onClick={onRedactAll}
        disabled={!findings.length}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Trash2 size={11} aria-hidden="true" />
        Redact all
      </button>
      <span className="ml-auto text-[8px] tabular-nums text-slate-500">
        {findings.length} finding{findings.length === 1 ? "" : "s"}
      </span>
    </div>
  );
}

export default function ReportPrivacyReview({
  title,
  description,
  onApplyRedactions,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [notice, setNotice] = useState("");

  const findings = useMemo(
    () => [
      ...scanField("title", title),
      ...scanField("description", description),
    ],
    [description, title],
  );
  const groups = useMemo(() => groupFindings(findings), [findings]);
  const findingIds = useMemo(
    () => new Set(findings.map((finding) => finding.id)),
    [findings],
  );
  const activeSelection = useMemo(
    () => new Set([...selectedIds].filter((id) => findingIds.has(id))),
    [findingIds, selectedIds],
  );
  const activeSelectedCount = findings.filter((finding) =>
    activeSelection.has(finding.id),
  ).length;

  const toggleFinding = (id, selected) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
    setNotice("");
  };

  const selectAll = () => {
    setSelectedIds(new Set(findings.map((finding) => finding.id)));
    setNotice("");
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setNotice("");
  };

  const redactFindings = (targetFindings) => {
    if (!targetFindings.length) return;

    const targetIds = new Set(targetFindings.map((finding) => finding.id));
    const selected = new Set(
      targetFindings.map((finding) => finding.id),
    );
    const titleResult = applyRedactions(title, findings, selected, "title");
    const descriptionResult = applyRedactions(
      description,
      findings,
      selected,
      "description",
    );
    const totalApplied =
      titleResult.appliedCount + descriptionResult.appliedCount;

    if (!totalApplied) {
      setNotice("No matching values could be redacted. Run the scan again.");
      return;
    }

    onApplyRedactions?.({
      title: titleResult.text,
      description: descriptionResult.text,
      titleChanged: titleResult.appliedCount > 0,
      descriptionChanged: descriptionResult.appliedCount > 0,
    });
    setSelectedIds((current) => {
      const next = new Set(current);
      targetIds.forEach((id) => next.delete(id));
      return next;
    });
    setNotice(
      `Replaced ${totalApplied} value${totalApplied === 1 ? "" : "s"} with [REDACTED]. Review the updated text before submitting.`,
    );
  };

  const redactSelected = () => {
    redactFindings(
      findings.filter((finding) => activeSelection.has(finding.id)),
    );
  };

  const redactAll = () => redactFindings(findings);

  const safeSelectionCount = activeSelectedCount;
  const openButtonLabel = isOpen
    ? "Hide privacy review"
    : findings.length
      ? `Review privacy (${findings.length})`
      : "Review report privacy";

  return (
    <section
      className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70"
      aria-labelledby="report-privacy-review-heading"
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-controls="report-privacy-review-content"
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500"
      >
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
            findings.length
              ? "bg-amber-100 text-amber-800"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          <ScanSearch size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            id="report-privacy-review-heading"
            className="block text-xs font-semibold text-slate-800"
          >
            Report privacy review
          </span>
          <span className="mt-0.5 block text-[9px] leading-4 text-slate-500">
            Scan title and description locally for common sensitive patterns
          </span>
        </span>
        {findings.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-semibold text-amber-900">
            {findings.length} to review
          </span>
        )}
        {isOpen ? (
          <ChevronUp size={15} className="shrink-0 text-slate-500" aria-hidden="true" />
        ) : (
          <ChevronDown size={15} className="shrink-0 text-slate-500" aria-hidden="true" />
        )}
        <span className="sr-only">{openButtonLabel}</span>
      </button>

      {isOpen && (
        <div
          id="report-privacy-review-content"
          className="space-y-3 border-t border-slate-200 p-3 sm:p-4"
        >
          <div className="flex items-start gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2.5">
            <Sparkles
              size={13}
              className="mt-0.5 shrink-0 text-sky-800"
              aria-hidden="true"
            />
            <p className="text-[9px] leading-4 text-sky-900">
              This review runs only in your browser and checks the report title
              and description. It does not inspect your email or upload any
              content. Detected values are hidden in the results.
            </p>
          </div>

          <SeveritySummary findings={findings} />

          {findings.length > 0 ? (
            <>
              <ReviewActions
                findings={findings}
                selectedCount={activeSelectedCount}
                onSelectAll={selectAll}
                onClearSelection={clearSelection}
                onRedactSelected={redactSelected}
                onRedactAll={redactAll}
              />
              <div className="space-y-3">
                {groups.map((group) => (
                  <FindingGroup
                    key={group.rule.id}
                    group={group}
                    findings={findings}
                    selectedIds={activeSelection}
                    onToggle={toggleFinding}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-emerald-200 bg-white px-3 py-4 text-center">
              <ShieldCheck
                size={18}
                className="mx-auto text-emerald-700"
                aria-hidden="true"
              />
              <h4 className="mt-2 text-[10px] font-semibold text-slate-800">
                No common patterns found
              </h4>
              <p className="mx-auto mt-1 max-w-md text-[9px] leading-4 text-slate-500">
                Pattern scans can miss private information. Read the report
                manually and review attached screenshots before submitting.
              </p>
            </div>
          )}

          <PrivacyChecklist />

          {notice && (
            <p
              role="status"
              aria-live="polite"
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[9px] leading-4 text-emerald-900"
            >
              {notice}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2">
            <p className="flex items-start gap-1.5 text-[8px] leading-4 text-slate-500">
              <EyeOff
                size={10}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              Redaction is optional and changes only the report fields after
              you choose an action.
            </p>
            {findings.length > 0 && safeSelectionCount > 0 && (
              <span className="text-[8px] tabular-nums text-slate-400">
                {safeSelectionCount} selected
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
