"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookmarkPlus,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

const TEMPLATE_STORAGE_KEY = "tester-report-templates-v1";
const MAX_CUSTOM_TEMPLATES = 20;
const MAX_TEMPLATE_NAME_LENGTH = 72;
const MAX_TEMPLATE_TITLE_LENGTH = 180;
const MAX_TEMPLATE_DESCRIPTION_LENGTH = 8_000;

const TEMPLATE_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "interface", label: "Interface" },
  { id: "functionality", label: "Functionality" },
  { id: "performance", label: "Performance" },
  { id: "accessibility", label: "Accessibility" },
  { id: "content", label: "Content" },
  { id: "custom", label: "My templates" },
];

const BUILT_IN_TEMPLATES = [
  {
    id: "broken-interaction",
    name: "Broken interaction",
    category: "functionality",
    summary: "Describe a control or workflow that does not respond correctly.",
    title: "[Control or workflow] does not [expected action]",
    description:
      "Issue summary:\n[What is not working?]\n\n" +
      "Steps to reproduce:\n1. [Starting page or state]\n2. [Action taken]\n3. [What happened next]\n\n" +
      "Expected behavior:\n[What should happen?]\n\n" +
      "Actual behavior:\n[What happened instead?]\n\n" +
      "Frequency:\n[Every time, sometimes, or once]",
    tags: ["controls", "workflow", "reproduction"],
  },
  {
    id: "visual-layout",
    name: "Visual or layout issue",
    category: "interface",
    summary: "Capture a visual mismatch and the viewport where it appears.",
    title: "[Page or component] layout is [misaligned, clipped, or overlapping]",
    description:
      "Affected page or component:\n[Identify the area]\n\n" +
      "Visual issue:\n[Describe what looks incorrect]\n\n" +
      "Expected appearance:\n[Describe the intended layout]\n\n" +
      "Viewport or zoom:\n[Screen size, browser zoom, and orientation]\n\n" +
      "Reproduction steps:\n1. [Open the page]\n2. [Resize or interact if needed]\n3. [Observe the visual issue]",
    tags: ["visual", "responsive", "layout"],
  },
  {
    id: "form-validation",
    name: "Form validation",
    category: "functionality",
    summary: "Report incorrect, missing, or confusing input validation.",
    title: "[Form name] validation [accepts or rejects] [input]",
    description:
      "Form and field:\n[Name the form and input]\n\n" +
      "Input used:\n[Use a safe example without real personal data]\n\n" +
      "Expected validation:\n[Describe the correct response]\n\n" +
      "Actual validation:\n[Describe the message or behavior shown]\n\n" +
      "Reproduction steps:\n1. [Open the form]\n2. [Enter the example input]\n3. [Submit or leave the field]\n\n" +
      "Does the issue block completion?\n[Yes or no, with details]",
    tags: ["forms", "validation", "input"],
  },
  {
    id: "slow-response",
    name: "Slow response",
    category: "performance",
    summary: "Describe a delay, the affected operation, and its frequency.",
    title: "[Page or action] takes [approximate time] to respond",
    description:
      "Affected page or action:\n[Identify what was loading]\n\n" +
      "Observed delay:\n[Approximate duration; do not include private network logs]\n\n" +
      "Expected response:\n[What timing or feedback did you expect?]\n\n" +
      "Frequency:\n[Every time, intermittent, or only once]\n\n" +
      "Steps to reproduce:\n1. [Starting state]\n2. [Action taken]\n3. [Describe the wait and eventual result]",
    tags: ["performance", "loading", "latency"],
  },
  {
    id: "keyboard-accessibility",
    name: "Keyboard accessibility",
    category: "accessibility",
    summary: "Document a keyboard navigation or focus-management problem.",
    title: "[Control or page] is not usable with [keyboard action]",
    description:
      "Affected control or page:\n[Identify the area]\n\n" +
      "Input method:\n[Keyboard only, screen reader, or other assistive technology]\n\n" +
      "Expected behavior:\n[Describe expected focus or keyboard operation]\n\n" +
      "Actual behavior:\n[Describe the barrier or unexpected focus movement]\n\n" +
      "Reproduction steps:\n1. [Starting focus location]\n2. [Keys pressed]\n3. [Where focus moved or what did not work]",
    tags: ["accessibility", "keyboard", "focus"],
  },
  {
    id: "content-clarity",
    name: "Content or wording",
    category: "content",
    summary: "Report unclear, incorrect, or inconsistent text.",
    title: "[Page or message] contains [unclear or incorrect] wording",
    description:
      "Affected page or message:\n[Identify where the text appears]\n\n" +
      "Current wording:\n[Quote only the relevant non-sensitive text]\n\n" +
      "What is confusing or incorrect?\n[Explain the problem]\n\n" +
      "Suggested wording or correction:\n[Optional suggestion]\n\n" +
      "Impact:\n[How does this affect a user's understanding or next action?]",
    tags: ["content", "copy", "clarity"],
  },
  {
    id: "browser-compatibility",
    name: "Browser compatibility",
    category: "functionality",
    summary: "Record the browser context and compare expected behavior.",
    title: "[Feature] behaves differently in [browser or device]",
    description:
      "Affected feature:\n[Identify the feature]\n\n" +
      "Browser and version:\n[Add if known]\n\n" +
      "Device or operating system:\n[Add if known]\n\n" +
      "Expected behavior:\n[Describe the behavior seen elsewhere or intended]\n\n" +
      "Actual behavior:\n[Describe what happens in this environment]\n\n" +
      "Reproduction steps:\n1. [Open the feature]\n2. [Perform the action]\n3. [Describe the result]",
    tags: ["browser", "compatibility", "device"],
  },
  {
    id: "custom-simple",
    name: "Simple issue summary",
    category: "custom",
    summary: "A lightweight structure for issues that do not fit another type.",
    title: "[Short description of the issue]",
    description:
      "What happened?\n[Describe the issue]\n\n" +
      "What did you expect?\n[Describe the intended result]\n\n" +
      "How can it be reproduced?\n1. [Step one]\n2. [Step two]\n3. [Step three]",
    tags: ["general", "starter"],
  },
];

function createTemplateId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `custom-${globalThis.crypto.randomUUID()}`;
  }

  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeTemplate(value) {
  const timestamp = new Date().toISOString();
  const categoryIds = new Set(
    TEMPLATE_CATEGORIES.map((category) => category.id),
  );
  const tags = Array.isArray(value.tags)
    ? value.tags
        .filter((tag) => typeof tag === "string")
        .map((tag) => tag.trim().slice(0, 24))
        .filter(Boolean)
        .slice(0, 8)
    : [];

  return {
    id:
      typeof value.id === "string" && value.id
        ? value.id.slice(0, 120)
        : createTemplateId(),
    name:
      typeof value.name === "string" && value.name.trim()
        ? value.name.trim().slice(0, MAX_TEMPLATE_NAME_LENGTH)
        : "Untitled template",
    category:
      typeof value.category === "string" && categoryIds.has(value.category)
        ? value.category
        : "custom",
    summary:
      typeof value.summary === "string"
        ? value.summary.trim().slice(0, 220)
        : "A reusable report structure.",
    title:
      typeof value.title === "string"
        ? value.title.slice(0, MAX_TEMPLATE_TITLE_LENGTH)
        : "",
    description:
      typeof value.description === "string"
        ? value.description.slice(0, MAX_TEMPLATE_DESCRIPTION_LENGTH)
        : "",
    tags,
    createdAt:
      typeof value.createdAt === "string" &&
      !Number.isNaN(Date.parse(value.createdAt))
        ? value.createdAt
        : timestamp,
    updatedAt:
      typeof value.updatedAt === "string" &&
      !Number.isNaN(Date.parse(value.updatedAt))
        ? value.updatedAt
        : timestamp,
    favorite: value.favorite === true,
    source: value.source === "custom" ? "custom" : "built-in",
  };
}

function isTemplateRecord(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value.name === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string"
  );
}

function readCustomTemplates() {
  const serializedTemplates = window.sessionStorage.getItem(TEMPLATE_STORAGE_KEY);
  if (!serializedTemplates) return [];

  const parsedTemplates = JSON.parse(serializedTemplates);
  if (!Array.isArray(parsedTemplates)) {
    throw new Error("Saved templates have an invalid format.");
  }

  return parsedTemplates
    .filter(isTemplateRecord)
    .slice(0, MAX_CUSTOM_TEMPLATES)
    .map((template) =>
      normalizeTemplate({ ...template, source: "custom", category: "custom" }),
    );
}

function writeCustomTemplates(templates) {
  window.sessionStorage.setItem(
    TEMPLATE_STORAGE_KEY,
    JSON.stringify(templates.slice(0, MAX_CUSTOM_TEMPLATES)),
  );
}

function formatUpdatedAt(value) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Date unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

function countTemplateWords(template) {
  return `${template.title} ${template.description}`
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function getCategoryLabel(categoryId) {
  return (
    TEMPLATE_CATEGORIES.find((category) => category.id === categoryId)?.label ||
    "Custom"
  );
}

function getTemplatePreview(template, maximumLength = 180) {
  const normalized = template.description.replace(/\s+/g, " ").trim();
  if (!normalized) return "This template has no description text.";
  if (normalized.length <= maximumLength) return normalized;

  return `${normalized.slice(0, maximumLength).trimEnd()}…`;
}

function buildTemplateSearchText(template) {
  return [
    template.name,
    template.category,
    template.summary,
    template.title,
    template.description,
    ...template.tags,
  ]
    .join(" ")
    .toLowerCase();
}

function makeTemplateExportPayload(templates) {
  return {
    format: "tester-report-templates",
    version: 1,
    exportedAt: new Date().toISOString(),
    templates: templates.map(({ name, category, summary, title, description, tags }) => ({
      name,
      category,
      summary,
      title,
      description,
      tags,
    })),
  };
}

function parseTemplateImport(serializedValue) {
  const parsedValue = JSON.parse(serializedValue);
  const records = Array.isArray(parsedValue)
    ? parsedValue
    : parsedValue?.format === "tester-report-templates" &&
        Array.isArray(parsedValue.templates)
      ? parsedValue.templates
      : null;

  if (!records) {
    throw new Error("Select a template-library JSON export.");
  }

  const validRecords = records.filter(isTemplateRecord);
  if (!validRecords.length) {
    throw new Error("The selected file contains no usable templates.");
  }

  return validRecords.map((record) =>
    normalizeTemplate({
      ...record,
      id: createTemplateId(),
      source: "custom",
      category: "custom",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  );
}

function getBuiltInTemplates() {
  return BUILT_IN_TEMPLATES.map((template) =>
    normalizeTemplate({ ...template, source: "built-in" }),
  );
}

function TemplateMetric({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-slate-800">
        {value}
      </p>
    </div>
  );
}

function TemplateStatus({ template }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-600">
        {getCategoryLabel(template.category)}
      </span>
      <span
        className={`rounded-full px-2 py-1 text-[9px] font-semibold ${
          template.source === "custom"
            ? "bg-violet-50 text-violet-700"
            : "bg-sky-50 text-sky-700"
        }`}
      >
        {template.source === "custom" ? "My template" : "Starter"}
      </span>
      {template.favorite && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-800">
          <Star size={9} aria-hidden="true" />
          Favorite
        </span>
      )}
    </div>
  );
}

function TemplateAction({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  tone = "neutral",
}) {
  const styles =
    tone === "danger"
      ? "border-rose-200 text-rose-700 hover:bg-rose-50"
      : tone === "primary"
        ? "border-violet-200 text-violet-700 hover:bg-violet-50"
        : "border-slate-200 text-slate-600 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}
    >
      <Icon size={12} aria-hidden="true" />
      {label}
    </button>
  );
}

function TemplateCard({
  template,
  expanded,
  pendingDelete,
  canAddCustom,
  onToggleExpanded,
  onApply,
  onToggleFavorite,
  onDuplicate,
  onEdit,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}) {
  return (
    <article
      className={`rounded-xl border bg-white p-3 transition ${
        expanded
          ? "border-violet-300 shadow-sm"
          : "border-slate-200 hover:border-violet-200"
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700">
          <FileText size={14} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onToggleExpanded(template.id)}
            aria-expanded={expanded}
            className="flex w-full items-start justify-between gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <span className="min-w-0">
              <span className="block break-words text-xs font-semibold text-slate-900">
                {template.name}
              </span>
              <span className="mt-1 block text-[10px] leading-4 text-slate-500">
                {template.summary}
              </span>
            </span>
            {expanded ? (
              <ChevronUp
                size={14}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-slate-400"
              />
            ) : (
              <ChevronDown
                size={14}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-slate-400"
              />
            )}
          </button>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <TemplateStatus template={template} />
            <span className="text-[9px] text-slate-400">
              {countTemplateWords(template)} words
            </span>
          </div>
          {template.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {template.tags.map((tag) => (
                <span
                  key={`${template.id}-${tag}`}
                  className="rounded bg-slate-50 px-1.5 py-0.5 text-[9px] text-slate-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {expanded && (
            <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                  Suggested title
                </p>
                <p className="mt-1 break-words text-[11px] font-medium text-slate-800">
                  {template.title || "No title"}
                </p>
                <p className="mt-3 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                  Description structure
                </p>
                <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words font-sans text-[10px] leading-5 text-slate-600">
                  {template.description || "No description"}
                </pre>
              </div>
              <p className="text-[9px] leading-4 text-slate-400">
                Applying a template never submits a report. Review the text and
                replace all bracketed prompts before submitting.
              </p>
            </div>
          )}
          {pendingDelete ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-rose-50 p-2">
              <p className="mr-auto text-[10px] text-rose-800">
                Delete this custom template?
              </p>
              <button
                type="button"
                onClick={onCancelDelete}
                className="rounded px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-white"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={() => onConfirmDelete(template.id)}
                className="rounded bg-rose-700 px-2 py-1 text-[10px] font-semibold text-white"
              >
                Delete
              </button>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <TemplateAction
                icon={Check}
                label="Use template"
                onClick={() => onApply(template)}
                tone="primary"
              />
              <TemplateAction
                icon={Star}
                label={template.favorite ? "Unfavorite" : "Favorite"}
                onClick={() => onToggleFavorite(template.id)}
              />
              <TemplateAction
                icon={BookmarkPlus}
                label="Make a copy"
                onClick={() => onDuplicate(template.id)}
                disabled={!canAddCustom}
              />
              {template.source === "custom" && (
                <>
                  <TemplateAction
                    icon={Pencil}
                    label="Edit"
                    onClick={() => onEdit(template)}
                  />
                  <TemplateAction
                    icon={Trash2}
                    label="Delete"
                    onClick={() => onRequestDelete(template.id)}
                    tone="danger"
                  />
                </>
              )}
            </div>
          )}
          {template.source === "custom" && (
            <p className="mt-2 text-[9px] text-slate-400">
              Updated {formatUpdatedAt(template.updatedAt)}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function TemplateEditor({
  initialTemplate,
  currentTitle,
  currentDescription,
  onSave,
  onCancel,
}) {
  const isEditing = Boolean(initialTemplate?.id);
  const [name, setName] = useState(initialTemplate?.name || "");
  const [summary, setSummary] = useState(initialTemplate?.summary || "");
  const [title, setTitle] = useState(
    initialTemplate?.title || currentTitle || "",
  );
  const [description, setDescription] = useState(
    initialTemplate?.description || currentDescription || "",
  );
  const [tagsText, setTagsText] = useState(
    initialTemplate?.tags?.join(", ") || "",
  );
  const [error, setError] = useState("");

  const submitEditor = (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setError("Enter a name for this template.");
      return;
    }
    if (!trimmedTitle && !trimmedDescription) {
      setError("Add a suggested title or description.");
      return;
    }

    const tags = [...new Set(
      tagsText
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    )].slice(0, 8);

    onSave({
      ...initialTemplate,
      id: initialTemplate?.id || createTemplateId(),
      name: trimmedName.slice(0, MAX_TEMPLATE_NAME_LENGTH),
      summary:
        summary.trim().slice(0, 220) ||
        "A reusable structure for a tester report.",
      category: "custom",
      title: trimmedTitle.slice(0, MAX_TEMPLATE_TITLE_LENGTH),
      description: trimmedDescription.slice(
        0,
        MAX_TEMPLATE_DESCRIPTION_LENGTH,
      ),
      tags,
      updatedAt: new Date().toISOString(),
      createdAt: initialTemplate?.createdAt || new Date().toISOString(),
      favorite: initialTemplate?.favorite === true,
      source: "custom",
    });
  };

  return (
    <form
      onSubmit={submitEditor}
      className="space-y-3 rounded-xl border border-violet-200 bg-white p-3"
      aria-label={isEditing ? "Edit report template" : "Create report template"}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold text-slate-900">
            {isEditing ? "Edit custom template" : "Create a template from this report"}
          </h4>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            Only template name, title, description, summary, and tags are saved.
            Email and screenshots are never included.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close template editor"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[10px] font-semibold text-slate-700">
          Template name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={MAX_TEMPLATE_NAME_LENGTH}
            required
            placeholder="e.g. Checkout flow regression"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </label>
        <label className="text-[10px] font-semibold text-slate-700">
          Short summary
          <input
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            maxLength={220}
            placeholder="When should this template be used?"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </label>
      </div>
      <label className="block text-[10px] font-semibold text-slate-700">
        Suggested title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={MAX_TEMPLATE_TITLE_LENGTH}
          placeholder="[Short summary of the issue]"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
      </label>
      <label className="block text-[10px] font-semibold text-slate-700">
        Description structure
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={MAX_TEMPLATE_DESCRIPTION_LENGTH}
          rows={7}
          placeholder={"Steps to reproduce:\n1. [Step one]\n\nExpected behavior:\n[Expected result]"}
          className="mt-1 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal leading-5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
      </label>
      <label className="block text-[10px] font-semibold text-slate-700">
        Tags
        <input
          value={tagsText}
          onChange={(event) => setTagsText(event.target.value)}
          placeholder="checkout, payment, regression"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-3 py-2 text-[10px] font-semibold text-white hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        >
          <Check size={12} aria-hidden="true" />
          {isEditing ? "Save changes" : "Save template"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        {error && (
          <p className="text-[10px] font-medium text-rose-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}

function ApplyTemplateDialog({ template, hasCurrentText, onApply, onCancel }) {
  if (!template) return null;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-template-heading"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700">
            <Sparkles size={16} aria-hidden="true" />
          </span>
          <div>
            <h3
              id="apply-template-heading"
              className="text-sm font-semibold text-slate-900"
            >
              Apply “{template.name}”?
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {hasCurrentText
                ? "Choose how to combine this template with the current report."
                : "This adds the suggested title and description to your report form. Nothing is submitted."}
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-semibold text-slate-700">
            {template.title || "No suggested title"}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[10px] leading-4 text-slate-500">
            {getTemplatePreview(template, 240)}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          {hasCurrentText && (
            <button
              type="button"
              onClick={() => onApply(template, "append")}
              className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-semibold text-violet-800 hover:bg-violet-100"
            >
              Append description
            </button>
          )}
          <button
            type="button"
            onClick={() => onApply(template, "replace")}
            className="rounded-lg bg-violet-700 px-3 py-2 text-[10px] font-semibold text-white hover:bg-violet-800"
          >
            {hasCurrentText ? "Replace current text" : "Use template"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function ReportTemplateLibrary({
  currentTitle,
  currentDescription,
  onApplyTemplate,
}) {
  const [customTemplates, setCustomTemplates] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("recommended");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [expandedTemplateId, setExpandedTemplateId] = useState("");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const [pendingApply, setPendingApply] = useState(null);
  const [showCreateEditor, setShowCreateEditor] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  useEffect(() => {
    try {
      setCustomTemplates(readCustomTemplates());
    } catch {
      toast.error("Could not load custom report templates for this session.");
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const allTemplates = useMemo(
    () => [...getBuiltInTemplates(), ...customTemplates],
    [customTemplates],
  );

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    return allTemplates
      .filter((template) => {
        if (
          category !== "all" &&
          (category === "custom"
            ? template.source !== "custom"
            : template.category !== category)
        ) {
          return false;
        }
        if (favoritesOnly && !template.favorite) return false;
        if (
          normalizedQuery &&
          !buildTemplateSearchText(template).includes(normalizedQuery)
        ) {
          return false;
        }
        return true;
      })
      .sort((left, right) => {
        if (sortBy === "name") return left.name.localeCompare(right.name);
        if (sortBy === "category") {
          return (
            getCategoryLabel(left.category).localeCompare(
              getCategoryLabel(right.category),
            ) || left.name.localeCompare(right.name)
          );
        }
        if (sortBy === "custom-first") {
          return (
            Number(right.source === "custom") -
              Number(left.source === "custom") ||
            left.name.localeCompare(right.name)
          );
        }
        return (
          Number(right.favorite) - Number(left.favorite) ||
          Number(right.source === "custom") - Number(left.source === "custom") ||
          left.name.localeCompare(right.name)
        );
      });
  }, [allTemplates, category, favoritesOnly, search, sortBy]);

  const persistTemplates = (nextTemplates) => {
    try {
      writeCustomTemplates(nextTemplates);
      setCustomTemplates(nextTemplates.slice(0, MAX_CUSTOM_TEMPLATES));
      return true;
    } catch {
      toast.error("Could not save custom templates in this browser session.");
      return false;
    }
  };

  const saveCustomTemplate = (template) => {
    const existing = customTemplates.find((item) => item.id === template.id);

    if (!existing && customTemplates.length >= MAX_CUSTOM_TEMPLATES) {
      toast.error(`Keep up to ${MAX_CUSTOM_TEMPLATES} custom templates per session.`);
      return;
    }

    const nextTemplates = existing
      ? customTemplates.map((item) =>
          item.id === template.id
            ? normalizeTemplate({ ...template, source: "custom" })
            : item,
        )
      : [normalizeTemplate({ ...template, source: "custom" }), ...customTemplates];

    if (persistTemplates(nextTemplates)) {
      setEditingTemplate(null);
      setShowCreateEditor(false);
      setCategory("custom");
      toast.success(existing ? "Template updated." : "Custom template saved.");
    }
  };

  const toggleFavorite = (templateId) => {
    const template = allTemplates.find((item) => item.id === templateId);
    if (!template) return;

    if (template.source === "custom") {
      const nextTemplates = customTemplates.map((item) =>
        item.id === templateId
          ? {
              ...item,
              favorite: !item.favorite,
              updatedAt: new Date().toISOString(),
            }
          : item,
      );

      if (persistTemplates(nextTemplates)) {
        toast.success(
          template.favorite ? "Removed from favorites." : "Added to favorites.",
        );
      }
      return;
    }

    const favoriteIds = new Set(
      JSON.parse(
        window.sessionStorage.getItem(`${TEMPLATE_STORAGE_KEY}-favorites`) ||
          "[]",
      ),
    );

    if (favoriteIds.has(templateId)) favoriteIds.delete(templateId);
    else favoriteIds.add(templateId);

    try {
      window.sessionStorage.setItem(
        `${TEMPLATE_STORAGE_KEY}-favorites`,
        JSON.stringify([...favoriteIds]),
      );
      setFavoriteBuiltInIds([...favoriteIds]);
      toast.success(
        favoriteIds.has(templateId)
          ? "Added to favorites."
          : "Removed from favorites.",
      );
    } catch {
      toast.error("Could not update template favorites for this session.");
    }
  };

  const [favoriteBuiltInIds, setFavoriteBuiltInIds] = useState([]);
  const templatesWithFavorites = useMemo(
    () =>
      allTemplates.map((template) => ({
        ...template,
        favorite:
          template.source === "custom"
            ? template.favorite
            : favoriteBuiltInIds.includes(template.id),
      })),
    [allTemplates, favoriteBuiltInIds],
  );

  const visibleTemplates = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    return templatesWithFavorites
      .filter((template) => {
        if (
          category !== "all" &&
          (category === "custom"
            ? template.source !== "custom"
            : template.category !== category)
        ) {
          return false;
        }

        if (favoritesOnly && !template.favorite) return false;

        return (
          !normalizedQuery ||
          buildTemplateSearchText(template).includes(normalizedQuery)
        );
      })
      .sort((left, right) => {
        if (sortBy === "name") return left.name.localeCompare(right.name);
        if (sortBy === "category") {
          return getCategoryLabel(left.category).localeCompare(
            getCategoryLabel(right.category),
          );
        }
        if (sortBy === "custom-first") {
          return Number(right.source === "custom") - Number(left.source === "custom");
        }

        return (
          Number(right.favorite) - Number(left.favorite) ||
          Number(right.source === "custom") - Number(left.source === "custom") ||
          left.name.localeCompare(right.name)
        );
      });
  }, [
    templatesWithFavorites,
    category,
    favoritesOnly,
    search,
    sortBy,
  ]);

  const handleApply = (template, mode) => {
    onApplyTemplate(template, mode);
    setPendingApply(null);
    setShowLibrary(false);
    toast.success(
      mode === "append"
        ? "Template sections added to the description."
        : "Template added to the report form.",
    );
  };

  const duplicateTemplate = (templateId) => {
    const template = templatesWithFavorites.find((item) => item.id === templateId);
    if (!template) return;

    if (customTemplates.length >= MAX_CUSTOM_TEMPLATES) {
      toast.error(`Keep up to ${MAX_CUSTOM_TEMPLATES} custom templates per session.`);
      return;
    }

    setEditingTemplate({
      ...template,
      id: createTemplateId(),
      name: `${template.name} copy`.slice(0, MAX_TEMPLATE_NAME_LENGTH),
      source: "custom",
      category: "custom",
      favorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setShowCreateEditor(true);
  };

  const deleteTemplate = (templateId) => {
    if (
      persistTemplates(customTemplates.filter((template) => template.id !== templateId))
    ) {
      setPendingDeleteId("");
      toast.success("Custom template deleted.");
    }
  };

  const clearSearchAndFilters = () => {
    setSearch("");
    setCategory("all");
    setFavoritesOnly(false);
  };

  const builtInCount = templatesWithFavorites.filter(
    (template) => template.source === "built-in",
  ).length;
  const customCount = customTemplates.length;
  const favoriteCount = templatesWithFavorites.filter(
    (template) => template.favorite,
  ).length;
  const hasCurrentText =
    Boolean(currentTitle.trim()) || Boolean(currentDescription.trim());

  return (
    <section
      className="mb-5 overflow-hidden rounded-2xl border border-sky-100 bg-sky-50/40"
      aria-labelledby="report-template-library-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 bg-white/80 px-4 py-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700">
            <FileText size={16} aria-hidden="true" />
          </span>
          <div>
            <h3
              id="report-template-library-heading"
              className="text-sm font-semibold text-slate-900"
            >
              Report templates
            </h3>
            <p className="mt-1 max-w-xl text-[10px] leading-5 text-slate-600">
              Start with a reusable structure, customize it in the form, and
              save your own templates for this browser session.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowLibrary((visible) => !visible)}
          aria-expanded={showLibrary}
          aria-controls="report-template-library-content"
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-[10px] font-semibold text-sky-800 transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          {showLibrary ? "Hide templates" : "Browse templates"}
        </button>
      </div>

      {showLibrary && (
        <div id="report-template-library-content" className="space-y-4 p-4">
          <div className="grid grid-cols-3 gap-2">
            <TemplateMetric label="Starter templates" value={builtInCount} />
            <TemplateMetric label="My templates" value={customCount} />
            <TemplateMetric label="Favorites" value={favoriteCount} />
          </div>

          <div className="rounded-xl border border-sky-100 bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="text-[11px] font-semibold text-slate-800">
                  Save the current report as a template
                </h4>
                <p className="mt-1 text-[10px] leading-4 text-slate-500">
                  Create a reusable starting point from the title and
                  description currently in the form.
                </p>
              </div>
              <button
                type="button"
                disabled={
                  !isLoaded ||
                  customTemplates.length >= MAX_CUSTOM_TEMPLATES ||
                  !hasCurrentText
                }
                onClick={() => {
                  setEditingTemplate(null);
                  setShowCreateEditor((visible) => !visible);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-semibold text-violet-800 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={12} aria-hidden="true" />
                Create from current report
              </button>
            </div>
          </div>

          {(showCreateEditor || editingTemplate) && (
            <TemplateEditor
              initialTemplate={editingTemplate}
              currentTitle={currentTitle}
              currentDescription={currentDescription}
              onSave={saveCustomTemplate}
              onCancel={() => {
                setShowCreateEditor(false);
                setEditingTemplate(null);
              }}
            />
          )}

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative">
              <Search
                size={13}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <label htmlFor="report-template-search" className="sr-only">
                Search report templates
              </label>
              <input
                id="report-template-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, description, summary, or tags"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[10px] text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-500">
              Sort
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                aria-label="Sort report templates"
                className="bg-transparent text-[10px] font-semibold text-slate-700 outline-none"
              >
                <option value="recommended">Recommended</option>
                <option value="name">Name A–Z</option>
                <option value="category">Category</option>
                <option value="custom-first">My templates first</option>
              </select>
            </label>
          </div>

          <div
            className="flex gap-2 overflow-x-auto pb-1"
            role="group"
            aria-label="Filter report templates by category"
          >
            {TEMPLATE_CATEGORIES.map((item) => {
              const isActive = category === item.id;
              const count = templatesWithFavorites.filter((template) =>
                item.id === "all"
                  ? true
                  : item.id === "custom"
                    ? template.source === "custom"
                    : template.category === item.id,
              ).length;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  aria-pressed={isActive}
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
                    isActive
                      ? "bg-sky-700 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700"
                  }`}
                >
                  {item.label} ({count})
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setFavoritesOnly((value) => !value)}
              aria-pressed={favoritesOnly}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition ${
                favoritesOnly
                  ? "bg-amber-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:text-amber-700"
              }`}
            >
              Favorites ({favoriteCount})
            </button>
          </div>

          {filteredTemplates.length > 0 && (
            <p className="text-[10px] text-slate-500" aria-live="polite">
              Showing {filteredTemplates.length} template
              {filteredTemplates.length === 1 ? "" : "s"}.
            </p>
          )}

          {visibleTemplates.length ? (
            <div className="space-y-2" aria-live="polite">
              {visibleTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  expanded={expandedTemplateId === template.id}
                  pendingDelete={pendingDeleteId === template.id}
                  canAddCustom={customTemplates.length < MAX_CUSTOM_TEMPLATES}
                  onToggleExpanded={(templateId) =>
                    setExpandedTemplateId((current) =>
                      current === templateId ? "" : templateId,
                    )
                  }
                  onApply={(selectedTemplate) => {
                    if (hasCurrentText) setPendingApply(selectedTemplate);
                    else handleApply(selectedTemplate, "replace");
                  }}
                  onToggleFavorite={toggleFavorite}
                  onDuplicate={duplicateTemplate}
                  onEdit={(templateToEdit) => {
                    setEditingTemplate(templateToEdit);
                    setShowCreateEditor(false);
                  }}
                  onRequestDelete={setPendingDeleteId}
                  onCancelDelete={() => setPendingDeleteId("")}
                  onConfirmDelete={deleteTemplate}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-7 text-center">
              <FileText
                size={18}
                aria-hidden="true"
                className="mx-auto text-slate-400"
              />
              <h4 className="mt-2 text-xs font-semibold text-slate-800">
                No templates found
              </h4>
              <p className="mx-auto mt-1 max-w-sm text-[10px] leading-4 text-slate-500">
                Try another search or category, or create a custom template
                from the current report.
              </p>
              <button
                type="button"
                onClick={clearSearchAndFilters}
                className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                Clear filters
              </button>
            </div>
          )}
          {!isLoaded && (
            <p className="text-[10px] text-slate-400" role="status">
              Loading your session templates…
            </p>
          )}
          {customTemplates.length >= MAX_CUSTOM_TEMPLATES && (
            <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-800">
              You reached the {MAX_CUSTOM_TEMPLATES}-template session limit.
              Delete a custom template to create another.
            </p>
          )}
        </div>
      )}

      <ApplyTemplateDialog
        template={pendingApply}
        hasCurrentText={hasCurrentText}
        onApply={handleApply}
        onCancel={() => setPendingApply(null)}
      />
    </section>
  );
}
