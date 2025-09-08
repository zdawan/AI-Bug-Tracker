"use client";
import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function BugForm({ onBugCreated, testUrl }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [screenshot, setScreenshot] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !description) {
      toast.error("Please provide a title and description", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      if (email) formData.append("reporterEmail", email);
      if (testUrl) formData.append("testUrl", testUrl);
      if (screenshot) formData.append("screenshot", screenshot);

      const res = await axios.post("http://localhost:5000/api/bugs", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Bug reported successfully!", {
        position: "top-right",
        autoClose: 3000,
      });

      setTitle("");
      setDescription("");
      setEmail("");
      setScreenshot(null);

      if (onBugCreated) onBugCreated(res.data);
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.error || "Failed to submit bug. Try again.",
        {
          position: "top-right",
          autoClose: 3000,
        }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className=" relative w-full max-w-xl mx-auto mt-12">
      {/* Gradient glow behind card */}
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-pink-300/40 via-purple-300/40 to-blue-300/40 blur-2xl opacity-70"></div>

      {/* Card */}
      <form
        onSubmit={handleSubmit}
        className="relative bg-white/70 backdrop-blur-md shadow-2xl rounded-3xl p-8 border border-white/30"
      >
        {/* Heading */}
        <h2 className="text-center md:text-5xl mb-6 leading-tight">
          <span className="text-4xl font-bold text-center mb-6 text-gray-900">
            Report
          </span>{" "}
          <span
            className="text-5xl  font-extralight italic text-gray-900"
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
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black bg-white shadow-sm"
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
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black bg-white shadow-sm"
            rows="4"
          ></textarea>
        </div>

        {/* Email */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Email <span className="text-pink-500">*</span>
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black bg-white shadow-sm"
          />
        </div>

        {/* Screenshot */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Screenshot (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setScreenshot(e.target.files[0])}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black bg-white shadow-sm"
          />
        </div>

        {/* Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-2xl bg-black text-white font-semibold text-lg shadow-lg hover:bg-black cursor-pointer transition disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit "}
        </button>
      </form>
    </div>
  );
}
