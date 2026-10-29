"use client";
import { useRef, useState } from "react";
import { useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function BugForm({ onBugCreated, testUrl }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stepDraft, setStepDraft] = useState("");
  const [email, setEmail] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiSourceFileUrl, setAiSourceFileUrl] = useState("");
  const [showPopupMode, setShowPopupMode] = useState(true);

  // NEW — AI Bug Popup
  const [aiBugs, setAiBugs] = useState([]);
  const [showBugPopup, setShowBugPopup] = useState(false);
  const [aiScreenshot, setAiScreenshot] = useState(null);

  const fileInputRef = useRef(null);

  const handleScreenshotChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setScreenshot(null);
      event.target.value = "";
      toast.error("Choose an image file for the screenshot.");
      return;
    }

    setScreenshot(file);
  };

  const addReproductionStep = () => {
    const step = stepDraft.trim();

    if (!step) {
      toast.error("Enter a reproduction step first.");
      return;
    }

    const currentDescription = description.trimEnd();
    const stepsHeadingIndex = currentDescription.search(/^steps to reproduce:$/im);
    const existingSteps =
      stepsHeadingIndex < 0
        ? []
        : currentDescription.slice(stepsHeadingIndex).match(/^\d+\.\s.+$/gm) ||
          [];
    const hasStepsHeading = stepsHeadingIndex >= 0;
    const heading = hasStepsHeading
      ? currentDescription
        ? `${currentDescription}\n`
        : ""
      : `${currentDescription ? `${currentDescription}\n\n` : ""}Steps to reproduce:\n`;

    setDescription(`${heading}${existingSteps.length + 1}. ${step}`);
    setStepDraft("");
  };

  useEffect(() => {
    if (!screenshot) {
      setScreenshotPreview("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(screenshot);
    setScreenshotPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [screenshot]);

  // Converts Base64 to File
  const dataURLToFile = async (dataUrl, filename = "screenshot.png") => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
  };

  // ----------------------------------------
  //            SUBMIT BUG
  // ----------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !description) {
      toast.error("Please provide a title and description");
      return;
    }
    if (!email) {
      toast.error("Please provide email");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("reporterEmail", email);
      if (testUrl) formData.append("testUrl", testUrl);
      if (screenshot) formData.append("screenshot", screenshot);

      const res = await axios.post(`https://ai-bug-tracker-1.onrender.com/api/bugs`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Bug reported successfully!");

      // Reset form
      setTitle("");
      setDescription("");
      setEmail("");
      setScreenshot(null);
      if (fileInputRef.current) fileInputRef.current.value = null;

      if (onBugCreated) onBugCreated(res.data);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to submit bug"
      );
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------
  //        AI ANALYZE BUGS FROM PAGE
  // ----------------------------------------
  const handleAIAnalyze = async () => {
    if (!testUrl) {
      toast.error("No test URL provided for analysis");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(`https://ai-bug-tracker-1.onrender.com/api/ai/analyze`, {
        websiteUrl: testUrl,
      });

      if (res.data.duplicate) {
        toast.info(res.data.message || "No new bugs found.");
        return;
      }

      const bugsFromAI = res.data.bugs || [];
      setAiBugs(bugsFromAI);

      // Screenshot
      let screenshotFile = null;

      if (res.data.screenshotBase64) {
        const dataUrl = `data:image/png;base64,${res.data.screenshotBase64}`;
        screenshotFile = await dataURLToFile(dataUrl, "ai-screenshot.png");
        setAiScreenshot(screenshotFile);
      }

      // Decide based on toggle
      if (showPopupMode) {
        // Show popup
        setShowBugPopup(true);
      } else {
        // Auto-fill the FIRST new bug
        const firstBug = bugsFromAI.find((b) => !b.duplicate) || bugsFromAI[0];

        if (firstBug) {
          setTitle(firstBug.title);
          setDescription(firstBug.description);
          if (aiScreenshot) setScreenshot(aiScreenshot);
          toast.success("AI auto-filled bug!");
        }
      }
    } catch (err) {
      console.error("AI analyze error:", err);
      toast.error("AI Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------
  //                   UI
  // ----------------------------------------
  return (
    <div className="relative w-full max-w-xl mx-auto mt-12">
      {/* Glow */}
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-pink-300/40 via-purple-300/40 to-blue-300/40 blur-2xl opacity-70"></div>
      {/* CARD */}
      <form
        onSubmit={handleSubmit}
        className="relative bg-white/70 backdrop-blur-md shadow-2xl rounded-3xl p-8 border border-white/30"
        encType="multipart/form-data" // ✅ important
      >
        {/* Heading */}
        <h2 className="text-center md:text-5xl mb-6 leading-tight">
          <span className="text-4xl font-semibold text-gray-900">Report</span>{" "}
          <span
            className="text-5xl font-extralight italic text-gray-900"
            style={{ fontFamily: "Times New Roman, Times, serif" }}
          >
            Bug
          </span>
        </h2>

        <p className="text-center text-gray-600 mb-8">
          Found something broken? Let’s fix it together.
        </p>

        {testUrl && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="min-w-0 flex-1 break-all text-xs leading-5 text-gray-600">
              Testing on: <span className="font-medium">{testUrl}</span>
            </p>
            <button
              type="button"
              onClick={async () => {
                try {
                  if (!navigator.clipboard?.writeText) {
                    throw new Error("Clipboard access is unavailable.");
                  }
                  await navigator.clipboard.writeText(testUrl);
                  toast.success("Test URL copied.");
                } catch {
                  toast.error("Could not copy the URL. Please copy it manually.");
                }
              }}
              className="shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-violet-700"
            >
              Copy URL
            </button>
          </div>
        )}

        {/* Title */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bug Title <span className="text-pink-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Login button not working"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-black bg-white shadow-sm"
          />
          <p
            className="mt-1 text-right text-xs text-gray-500"
            aria-live="polite"
          >
            {title.length} characters
          </p>
        </div>

        {/* Description */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description <span className="text-pink-500">*</span>
          </label>
          <textarea
            placeholder="Describe what happened..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-black bg-white shadow-sm"
            rows="4"
          ></textarea>
          <p
            className="mt-1 text-right text-xs text-gray-500"
            aria-live="polite"
          >
            {description.length} characters
          </p>
        </div>

        <div className="mb-5 rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
          <label
            htmlFor="reproduction-step"
            className="block text-sm font-medium text-gray-800"
          >
            Reproduction steps{" "}
            <span className="text-xs font-normal text-gray-500">
              (optional)
            </span>
          </label>
          <p className="mt-1 text-xs leading-5 text-gray-600">
            Add a numbered step to the description above so others can follow
            what you did.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              id="reproduction-step"
              type="text"
              value={stepDraft}
              onChange={(event) => setStepDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addReproductionStep();
                }
              }}
              placeholder="e.g. Open Settings and select Profile"
              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-300"
            />
            <button
              type="button"
              onClick={addReproductionStep}
              className="rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
            >
              Add step
            </button>
          </div>
        </div>

        {/* Email */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Email <span className="text-pink-500">*</span>
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-black bg-white shadow-sm"
          />
        </div>

        {/* Screenshot Upload */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Screenshot (optional)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            aria-describedby="screenshot-help"
            onChange={handleScreenshotChange}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-black bg-white shadow-sm cursor-pointer"
          />
          <p id="screenshot-help" className="mt-2 text-xs text-gray-500">
            Select an image file. Adding a screenshot is optional.
          </p>
          {screenshot && screenshotPreview && (
            <div className="mt-3 flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <img
                src={screenshotPreview}
                alt={`Preview of ${screenshot.name || "attached screenshot"}`}
                className="h-20 w-20 rounded-lg border border-gray-200 bg-white object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="break-all text-sm font-medium text-gray-800">
                  {screenshot.name || "Attached screenshot"}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {Math.max(1, Math.round(screenshot.size / 1024))} KB · Ready
                  to attach
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setScreenshot(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="mt-2 text-xs font-semibold text-rose-700 underline underline-offset-2 hover:text-rose-900"
                >
                  Remove screenshot
                </button>
              </div>
            </div>
          )}
        </div>

        <ReportReadinessPanel
          title={title}
          description={description}
          email={email}
          testUrl={testUrl}
        />

        {/* AI + Submit Buttons Row */}
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={showPopupMode}
            onChange={(e) => setShowPopupMode(e.target.checked)}
            className="cursor-pointer w-4 h-4"
          />
          <label className="text-gray-700 cursor-pointer">
            Show bug selection popup after AI analyze
          </label>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mt-6">
          {/* AI Analyze Button */}
          <button
            type="button"
            onClick={handleAIAnalyze}
            disabled={loading}
            className="w-full md:flex-1 py-3 px-4 cursor-pointer font-semibold rounded-2xl text-lg text-white relative overflow-hidden
              bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500
              before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-transparent
              before:-translate-x-full hover:before:translate-x-full before:transition-all before:duration-500
              shadow-[0_6px_28px_rgba(255,255,255,0.8)] transition-all duration-300"
          >
            {loading ? "Analyzing..." : "AI Analyze"}
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !title || !description}
            className="w-full md:flex-1 py-3 px-4 rounded-2xl cursor-pointer bg-black text-white font-semibold text-lg 
              shadow-lg hover:bg-gray-800 transition disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>
        {/* <p className="mt-2 text-xs text-gray-500">
          AI source file path:{" "}
          <span className="font-mono">{aiSourceFileUrl}</span>
        </p> */}
      </form>
      {/* ================================================= */}
      {/*                AI BUG LIST POPUP                  */}
      {/* ================================================= */}
      {showBugPopup && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-lg p-6 rounded-2xl shadow-xl">
            <h2 className="text-xl font-semibold mb-4 text-center">
              Bugs on {testUrl}
            </h2>

            <div className="max-h-80 overflow-y-auto space-y-4">
              {aiBugs.map((bug, index) => (
                <div
                  key={index}
                  className="border p-4 rounded-lg bg-gray-50 shadow"
                >
                  <h3 className="font-bold text-gray-900">{bug.title}</h3>
                  <p className="text-gray-700 text-sm mt-1">
                    {bug.description}
                  </p>

                  <button
                    onClick={() => {
                      setTitle(bug.title);
                      setDescription(bug.description);
                      if (aiScreenshot) setScreenshot(aiScreenshot);
                      setShowBugPopup(false);
                      toast.success("Bug applied to form!");
                    }}
                    className="mt-3 w-full py-2 cursor-pointer bg-orange-500 hover:bg-orange-400 text-white rounded-lg"
                  >
                    Use This Bug
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowBugPopup(false)}
              className="mt-4 w-full py-2 text-white cursor-pointer bg-black hover:bg-gray-800 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportReadinessPanel({ title, description, email, testUrl }) {
  const checks = [
    {
      label: "Clear issue title",
      complete: title.trim().length >= 12,
      hint: "Use a short title that identifies the problem.",
    },
    {
      label: "Useful issue description",
      complete: description.trim().length >= 40,
      hint: "Add what you expected and what happened instead.",
    },
    {
      label: "Valid contact email",
      complete: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
      hint: "Enter an email address so the report can be associated with you.",
    },
    {
      label: "Testing destination",
      complete: Boolean(testUrl?.trim()),
      hint: "Return to the previous step and add the page you tested.",
    },
  ];
  const completedChecks = checks.filter((check) => check.complete).length;
  const score = Math.round((completedChecks / checks.length) * 100);
  const nextCheck = checks.find((check) => !check.complete);

  return (
    <section
      aria-label="Report readiness"
      className="mb-6 rounded-2xl border border-violet-100 bg-violet-50/60 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Report readiness
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            A quick guide to making your report easier to investigate.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-violet-700">
          {completedChecks}/{checks.length} ready
        </span>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-white"
        role="progressbar"
        aria-label="Report readiness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
      >
        <div
          className="h-full rounded-full bg-violet-600 transition-all duration-300"
          style={{ width: `${score}%` }}
        />
      </div>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {checks.map((check) => (
          <li
            key={check.label}
            className="flex items-center gap-2 text-xs text-slate-700"
          >
            <span
              aria-hidden="true"
              className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                check.complete
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-white text-slate-400"
              }`}
            >
              {check.complete ? "✓" : "•"}
            </span>
            {check.label}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs leading-5 text-slate-600" aria-live="polite">
        {nextCheck
          ? nextCheck.hint
          : "Your report has the key details. A screenshot is optional but can help show the issue."}
      </p>
    </section>
  );
}
