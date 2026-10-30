"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Highlighter,
  LoaderCircle,
  Minus,
  Pencil,
  Redo2,
  RotateCcw,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

const MAX_IMAGE_DIMENSION = 10_000;
const MAX_IMAGE_PIXELS = 40_000_000;
const MAX_HISTORY_ACTIONS = 100;
const INITIAL_BRUSH_SIZE = 6;
const BRUSH_SIZE_STEPS = [3, 6, 10, 16, 24];
const ANNOTATION_COLORS = [
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Yellow", value: "#facc15" },
  { name: "Green", value: "#16a34a" },
  { name: "Blue", value: "#2563eb" },
  { name: "White", value: "#ffffff" },
  { name: "Black", value: "#111827" },
];

const EDITOR_TOOLS = [
  {
    id: "pen",
    label: "Pen",
    description: "Draw freehand annotations on the screenshot.",
    icon: Pencil,
  },
  {
    id: "highlighter",
    label: "Highlighter",
    description: "Mark an area with a translucent stroke.",
    icon: Highlighter,
  },
  {
    id: "redact",
    label: "Redact",
    description:
      "Drag over private information to cover it with a permanent solid block.",
    icon: Minus,
  },
];

function getDisplayDimensions(image, viewportWidth, viewportHeight) {
  const maxWidth = Math.max(240, viewportWidth - 64);
  const maxHeight = Math.max(180, viewportHeight * 0.52);
  const scale = Math.min(
    1,
    maxWidth / image.naturalWidth,
    maxHeight / image.naturalHeight,
  );

  return {
    width: Math.max(1, Math.round(image.naturalWidth * scale)),
    height: Math.max(1, Math.round(image.naturalHeight * scale)),
  };
}

function getCanvasPoint(event, canvas) {
  const bounds = canvas.getBoundingClientRect();

  return {
    x: Math.max(
      0,
      Math.min(
        canvas.width,
        ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      ),
    ),
    y: Math.max(
      0,
      Math.min(
        canvas.height,
        ((event.clientY - bounds.top) / bounds.height) * canvas.height,
      ),
    ),
  };
}

function getCanvasBrushSize(canvas, displaySize) {
  const bounds = canvas.getBoundingClientRect();

  if (!bounds.width) return displaySize;

  return displaySize * (canvas.width / bounds.width);
}

function getRectangle(start, end) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

function drawStroke(context, action) {
  if (!action.points.length) return;

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = action.size;
  context.strokeStyle = action.color;
  context.globalAlpha = action.tool === "highlighter" ? 0.32 : 1;
  context.beginPath();
  context.moveTo(action.points[0].x, action.points[0].y);

  if (action.points.length === 1) {
    context.lineTo(action.points[0].x + 0.1, action.points[0].y + 0.1);
  } else {
    action.points.slice(1).forEach((point) => {
      context.lineTo(point.x, point.y);
    });
  }

  context.stroke();
  context.restore();
}

function drawRedaction(context, action) {
  if (action.points.length < 2) return;

  const rectangle = getRectangle(action.points[0], action.points.at(-1));
  const minimumSize = Math.max(4, action.size);

  context.save();
  context.globalAlpha = 1;
  context.fillStyle = "#111827";
  context.fillRect(
    rectangle.x,
    rectangle.y,
    Math.max(rectangle.width, minimumSize),
    Math.max(rectangle.height, minimumSize),
  );
  context.restore();
}

function renderAction(context, action) {
  if (action.tool === "redact") {
    drawRedaction(context, action);
    return;
  }

  drawStroke(context, action);
}

function clearCanvas(canvas) {
  if (!canvas) return;

  const context = canvas.getContext("2d");
  if (!context) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
}

function ToolButton({ tool, active, onSelect }) {
  const Icon = tool.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(tool.id)}
      aria-pressed={active}
      title={tool.description}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
        active
          ? "border-violet-300 bg-violet-100 text-violet-800"
          : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700"
      }`}
    >
      <Icon size={14} aria-hidden="true" />
      {tool.label}
    </button>
  );
}

function ColorButton({ color, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(color.value)}
      aria-label={`${color.name} annotation color`}
      aria-pressed={selected}
      title={color.name}
      className={`grid h-7 w-7 place-items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
        selected ? "border-violet-700 ring-2 ring-violet-200" : "border-slate-300"
      }`}
    >
      <span
        aria-hidden="true"
        className="h-4 w-4 rounded-full border border-black/10"
        style={{ backgroundColor: color.value }}
      />
    </button>
  );
}

function EditorToolbarButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  active = false,
  destructive = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
        destructive
          ? "border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Icon size={13} aria-hidden="true" />
      {label}
    </button>
  );
}

function EditorInstructions({ tool }) {
  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
      <p className="text-[10px] leading-5 text-sky-900">
        <span className="font-semibold">{tool.label}:</span> {tool.description}
      </p>
    </div>
  );
}

function EditorStatus({ message, actionCount }) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500"
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
      <span className="tabular-nums">
        {actionCount} edit{actionCount === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function RedactionPreview({ preview, canvasSize }) {
  if (!preview || !canvasSize.width || !canvasSize.height) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute border-2 border-dashed border-rose-400 bg-slate-950/85"
      style={{
        left: `${(preview.x / canvasSize.width) * 100}%`,
        top: `${(preview.y / canvasSize.height) * 100}%`,
        width: `${(preview.width / canvasSize.width) * 100}%`,
        height: `${(preview.height / canvasSize.height) * 100}%`,
      }}
    />
  );
}

export default function ScreenshotEvidenceEditor({
  file,
  onSave,
  onCancel,
}) {
  const imageCanvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const imageRef = useRef(null);
  const activePointerRef = useRef(null);
  const latestActionRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isImageReady, setIsImageReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTool, setActiveTool] = useState("pen");
  const [activeColor, setActiveColor] = useState("#dc2626");
  const [brushSize, setBrushSize] = useState(INITIAL_BRUSH_SIZE);
  const [actions, setActions] = useState([]);
  const [actionIndex, setActionIndex] = useState(-1);
  const [redactionPreview, setRedactionPreview] = useState(null);
  const [statusMessage, setStatusMessage] = useState(
    "Loading screenshot for local editing…",
  );

  const selectedTool =
    EDITOR_TOOLS.find((tool) => tool.id === activeTool) || EDITOR_TOOLS[0];
  const visibleActions = actions.slice(0, actionIndex + 1);
  const canUndo = actionIndex >= 0;
  const canRedo = actionIndex < actions.length - 1;
  const hasEdits = visibleActions.length > 0;

  useEffect(() => {
    let disposed = false;
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      if (disposed) return;

      if (
        image.naturalWidth > MAX_IMAGE_DIMENSION ||
        image.naturalHeight > MAX_IMAGE_DIMENSION ||
        image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS
      ) {
        setStatusMessage("This image is too large to edit in the browser.");
        toast.error(
          "Screenshot must be no larger than 10,000 pixels per side or 40 megapixels total.",
        );
        return;
      }

      imageRef.current = image;
      setCanvasSize(
        getDisplayDimensions(image, window.innerWidth, window.innerHeight),
      );

      [imageCanvasRef.current, drawingCanvasRef.current].forEach((canvas) => {
        if (!canvas) return;
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
      });

      setIsImageReady(true);
      setStatusMessage("Screenshot ready. Edits stay on this device.");
    };

    image.onerror = () => {
      if (disposed) return;
      setStatusMessage("This screenshot could not be decoded.");
      toast.error("Could not open this screenshot for editing.");
    };

    image.src = objectUrl;

    return () => {
      disposed = true;
      image.onload = null;
      image.onerror = null;
      imageRef.current = null;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    if (!isImageReady || !imageRef.current || !canvasSize.width) return;

    const canvas = imageCanvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      setStatusMessage("Canvas editing is unavailable in this browser.");
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    visibleActions.forEach((action) => {
      renderAction(context, action);
    });
  }, [actions, actionIndex, canvasSize, isImageReady]);

  useEffect(() => {
    const resizeEditor = () => {
      const image = imageRef.current;
      if (!image) return;

      setCanvasSize(
        getDisplayDimensions(image, window.innerWidth, window.innerHeight),
      );
    };

    window.addEventListener("resize", resizeEditor);

    return () => window.removeEventListener("resize", resizeEditor);
  }, []);

  useEffect(() => {
    const handleEditorKeyDown = (event) => {
      if (event.key === "Escape" && !isSaving) {
        onCancel();
        return;
      }

      if (!(event.ctrlKey || event.metaKey)) return;

      if (event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        setActionIndex((current) => Math.min(actions.length - 1, current + 1));
      } else if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        setActionIndex((current) => Math.max(-1, current - 1));
      }
    };

    window.addEventListener("keydown", handleEditorKeyDown);

    return () => window.removeEventListener("keydown", handleEditorKeyDown);
  }, [actions.length, isSaving, onCancel]);

  const updatePreview = useCallback((action) => {
    const canvas = drawingCanvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    if (action.tool === "redact") {
      if (action.points.length < 2) return;

      const rectangle = getRectangle(action.points[0], action.points.at(-1));
      context.save();
      context.fillStyle = "rgba(17, 24, 39, 0.78)";
      context.fillRect(
        rectangle.x,
        rectangle.y,
        Math.max(rectangle.width, 2),
        Math.max(rectangle.height, 2),
      );
      context.strokeStyle = "#fb7185";
      context.lineWidth = Math.max(2, action.size / 2);
      context.setLineDash([8, 5]);
      context.strokeRect(
        rectangle.x,
        rectangle.y,
        rectangle.width,
        rectangle.height,
      );
      context.restore();
      return;
    }

    drawStroke(context, action);
  }, []);

  const handlePointerDown = (event) => {
    if (!isImageReady || event.button !== 0) return;

    const canvas = imageCanvasRef.current;
    if (!canvas) return;

    const point = getCanvasPoint(event, canvas);
    const action = {
      tool: activeTool,
      color: activeColor,
      size: getCanvasBrushSize(canvas, brushSize),
      points: [point],
    };

    activePointerRef.current = event.pointerId;
    latestActionRef.current = action;
    event.currentTarget.setPointerCapture(event.pointerId);
    setRedactionPreview(null);

    if (activeTool !== "redact") {
      updatePreview(action);
    }
  };

  const handlePointerMove = (event) => {
    if (activePointerRef.current !== event.pointerId) return;

    const canvas = imageCanvasRef.current;
    const action = latestActionRef.current;
    if (!canvas || !action) return;

    const point = getCanvasPoint(event, canvas);
    action.points.push(point);

    if (action.tool === "redact") {
      setRedactionPreview(getRectangle(action.points[0], point));
    } else {
      updatePreview(action);
    }
  };

  const handlePointerUp = (event) => {
    if (activePointerRef.current !== event.pointerId) return;

    const action = latestActionRef.current;
    activePointerRef.current = null;
    latestActionRef.current = null;
    setRedactionPreview(null);
    clearCanvas(drawingCanvasRef.current);

    if (!action || !action.points.length) return;

    if (action.tool === "redact" && action.points.length === 1) {
      const point = action.points[0];
      action.points.push({
        x: point.x + Math.max(action.size * 3, 18),
        y: point.y + Math.max(action.size * 3, 18),
      });
    }

    const nextActions = [
      ...actions.slice(0, actionIndex + 1),
      action,
    ];

    if (nextActions.length > MAX_HISTORY_ACTIONS) {
      nextActions.shift();
    }

    setActions(nextActions);
    setActionIndex(nextActions.length - 1);
    setStatusMessage(
      action.tool === "redact"
        ? "Redaction added. It will be permanently applied when attached."
        : `${selectedTool.label} annotation added.`,
    );
  };

  const handlePointerCancel = (event) => {
    if (activePointerRef.current !== event.pointerId) return;

    activePointerRef.current = null;
    latestActionRef.current = null;
    setRedactionPreview(null);
    clearCanvas(drawingCanvasRef.current);
  };

  const undoAction = () => {
    setActionIndex((current) => Math.max(-1, current - 1));
    setStatusMessage("Last edit undone.");
  };

  const redoAction = () => {
    setActionIndex((current) => Math.min(actions.length - 1, current + 1));
    setStatusMessage("Edit restored.");
  };

  const resetEdits = () => {
    if (!hasEdits) return;

    setActionIndex(-1);
    setStatusMessage("All edits cleared. The original screenshot is unchanged.");
  };

  const handleSave = () => {
    const canvas = imageCanvasRef.current;

    if (!canvas || !isImageReady) {
      toast.error("Wait for the screenshot to finish loading.");
      return;
    }

    setIsSaving(true);
    setStatusMessage("Applying edits to the attached screenshot…");

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setIsSaving(false);
          setStatusMessage("The edited screenshot could not be created.");
          toast.error("Could not create the edited screenshot.");
          return;
        }

        const extension = file.type === "image/png" ? "png" : "jpg";
        const safeBaseName = (file.name || "screenshot")
          .replace(/\.[^.]+$/, "")
          .replace(/[^\w.-]+/g, "-")
          .slice(0, 80);
        const editedFile = new File(
          [blob],
          `${safeBaseName || "screenshot"}-edited.${extension}`,
          { type: blob.type || file.type, lastModified: Date.now() },
        );

        onSave(editedFile);
        setIsSaving(false);
        toast.success(
          hasEdits
            ? "Edited screenshot attached. Redactions are baked into the image."
            : "Screenshot attached without changes.",
        );
      },
      file.type === "image/png" ? "image/png" : "image/jpeg",
      0.92,
    );
  };

  const chooseBrushSize = (event) => {
    const nextSize = Number(event.target.value);
    if (BRUSH_SIZE_STEPS.includes(nextSize)) setBrushSize(nextSize);
  };

  const handleToolSelect = (toolId) => {
    setActiveTool(toolId);
    const nextTool = EDITOR_TOOLS.find((tool) => tool.id === toolId);

    if (nextTool) setStatusMessage(`${nextTool.label} tool selected.`);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="screenshot-editor-heading"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onCancel();
      }}
    >
      <section className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2
              id="screenshot-editor-heading"
              className="text-sm font-semibold text-slate-900 sm:text-base"
            >
              Annotate and redact screenshot
            </h2>
            <p className="mt-1 break-all text-[10px] text-slate-500">
              {file.name || "Attached screenshot"} ·{" "}
              {Math.max(1, Math.round(file.size / 1024))} KB
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            aria-label="Close screenshot editor"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-5">
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Screenshot editing tools"
          >
            {EDITOR_TOOLS.map((tool) => (
              <ToolButton
                key={tool.id}
                tool={tool}
                active={activeTool === tool.id}
                onSelect={handleToolSelect}
              />
            ))}
            <div className="ml-auto flex flex-wrap gap-1.5">
              <EditorToolbarButton
                icon={Undo2}
                label="Undo"
                onClick={undoAction}
                disabled={!canUndo || isSaving}
              />
              <EditorToolbarButton
                icon={Redo2}
                label="Redo"
                onClick={redoAction}
                disabled={!canRedo || isSaving}
              />
              <EditorToolbarButton
                icon={RotateCcw}
                label="Reset"
                onClick={resetEdits}
                disabled={!hasEdits || isSaving}
                destructive
              />
            </div>
          </div>

          {activeTool !== "redact" && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-[10px] font-semibold text-slate-600">
                Color
              </span>
              <div
                className="flex items-center gap-1.5"
                role="group"
                aria-label="Annotation color"
              >
                {ANNOTATION_COLORS.map((color) => (
                  <ColorButton
                    key={color.value}
                    color={color}
                    selected={activeColor === color.value}
                    onSelect={setActiveColor}
                  />
                ))}
              </div>
              <label className="ml-auto flex items-center gap-2 text-[10px] font-medium text-slate-600">
                Brush size
                <select
                  value={brushSize}
                  onChange={chooseBrushSize}
                  aria-label="Brush size"
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-700"
                >
                  {BRUSH_SIZE_STEPS.map((size) => (
                    <option key={size} value={size}>
                      {size}px
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <EditorInstructions tool={selectedTool} />

          <div className="overflow-auto rounded-xl border border-slate-200 bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] p-2 sm:p-4">
            {!isImageReady && (
              <div className="flex min-h-48 items-center justify-center gap-2 text-xs text-slate-500">
                <LoaderCircle
                  size={15}
                  aria-hidden="true"
                  className="animate-spin"
                />
                Preparing screenshot…
              </div>
            )}
            <div
              className={`relative mx-auto select-none ${
                isImageReady ? "block" : "hidden"
              }`}
              style={{
                width: canvasSize.width || undefined,
                height: canvasSize.height || undefined,
              }}
            >
              <canvas
                ref={imageCanvasRef}
                aria-label="Screenshot editing canvas"
                className={`absolute inset-0 block max-w-none touch-none ${
                  activeTool === "redact" ? "cursor-crosshair" : "cursor-cell"
                }`}
                style={{
                  width: canvasSize.width || undefined,
                  height: canvasSize.height || undefined,
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
              />
              <canvas
                ref={drawingCanvasRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 block max-w-none"
                style={{
                  width: canvasSize.width || undefined,
                  height: canvasSize.height || undefined,
                }}
              />
              <RedactionPreview
                preview={redactionPreview}
                canvasSize={{
                  width: imageCanvasRef.current?.width || 0,
                  height: imageCanvasRef.current?.height || 0,
                }}
              />
            </div>
          </div>

          <EditorStatus
            message={statusMessage}
            actionCount={visibleActions.length}
          />

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-[10px] leading-5 text-amber-900">
              Redactions are drawn as opaque blocks and baked into the image
              when attached. The original selected file is not modified until
              you choose “Use edited screenshot.”
            </p>
          </div>
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isImageReady || isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <LoaderCircle
                size={14}
                aria-hidden="true"
                className="animate-spin"
              />
            ) : (
              <Check size={14} aria-hidden="true" />
            )}
            Use edited screenshot
          </button>
        </footer>
      </section>
    </div>
  );
}
