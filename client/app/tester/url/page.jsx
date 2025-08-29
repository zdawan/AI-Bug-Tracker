"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function TesterPage() {
  const [url, setUrl] = useState("");
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!url.trim()) {
      toast.error("Please enter a URL", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    try {
      // Validate URL format
      new URL(url);
    } catch (err) {
      toast.error("Invalid URL, please enter a valid one", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    // ✅ Navigate to /url-bug-report instead of /user
    router.push(`/tester/url-bug-report?url=${encodeURIComponent(url)}`);
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center 
  font-sans
  bg-[radial-gradient(circle,_rgba(0,0,0,0.08)_1px,_transparent_1px)]
  [background-size:24px_24px]
  bg-gradient-to-br from-blue-50 to-purple-100 
  px-6 relative overflow-hidden "
    >
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 
    w-[160vw] h-[160vw] 
    bg-gradient-to-r from-pink-300/40 via-purple-300/40 to-blue-300/40
    blur-3xl opacity-40"
      ></div>

      <div className="relative z-10 bg-white/80 backdrop-blur-md shadow-2xl rounded-3xl p-10 max-w-lg w-full">
        <h1 className="text-4xl font-bold text-center mb-6 text-gray-900">
          Enter{" "}
          <span
            className="font-extralight italic text-gray-900"
            style={{ fontFamily: "Times New Roman, Times, serif" }}
          >
            Test URL
          </span>
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Paste the testing URL you’re testing.
          <br />
          We’ll attach it to your bug reports.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-purple-400 shadow-sm"
          />
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-2xl cursor-pointer text-white bg-black font-semibold text-lg shadow-lg hover:opacity-90 transition"
          >
            Continue
          </button>
        </form>
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </main>
  );
}
