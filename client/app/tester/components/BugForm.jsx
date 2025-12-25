"use client";
import { useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function BugForm({ onBugCreated, testUrl }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiSourceFileUrl, setAiSourceFileUrl] = useState("");
  const [showPopupMode, setShowPopupMode] = useState(true);

  // NEW — AI Bug Popup
  const [aiBugs, setAiBugs] = useState([]);
  const [showBugPopup, setShowBugPopup] = useState(false);
  const [aiScreenshot, setAiScreenshot] = useState(null);

  const fileInputRef = useRef(null);

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

      const res = await axios.post("http://localhost:5000/api/bugs", formData, {
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

      const res = await axios.post("http://localhost:5000/api/ai/analyze", {
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
          <span className="block">Your feedback makes this app lovable ❤️</span>
        </p>

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
            type="file"
            accept="image/*"
            onChange={(e) => setScreenshot(e.target.files[0])}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-black bg-white shadow-sm"
          />
        </div>

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

        <div className="flex flex-col md:flex-row items-center gap-4 mt-6">
          {/* AI Analyze Button */}
          <button
            type="button"
            onClick={handleAIAnalyze}
            disabled={loading}
            className="flex-1 py-3 px-4 cursor-pointer font-semibold rounded-2xl text-lg text-white relative overflow-hidden
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
            className="flex-1 py-3 px-4 rounded-2xl cursor-pointer bg-black text-white font-semibold text-lg 
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
