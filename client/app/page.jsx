"use client";
import { useState, useEffect } from "react";
import AssignedTickets from "./admin/assigned/page";
import BugForm from "./tester/components/BugForm";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Link from "next/link";

export default function HomePage() {
  const [showTracker, setShowTracker] = useState(false);
  const [role, setRole] = useState("");
  const [animateCards, setAnimateCards] = useState(false);
  const [showUpgradesModal, setShowUpgradesModal] = useState(false);

  useEffect(() => {
    // Trigger fade-in animation for cards
    const timeout = setTimeout(() => setAnimateCards(true), 300);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-white to-purple-100 font-sans overflow-hidden">
      {/* Radial dot background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(0,0,0,0.08)_1px,_transparent_1px)] [background-size:24px_24px]" />
      {/* Circular multi-color gradient */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[160vw] h-[160vw] bg-[radial-gradient(circle_at_bottom,rgba(249,115,22,0.55) 0%,rgba(147,51,234,0.55) 15%,rgba(236,72,153,0.55) 20%,rgba(59,130,246,0.55) 35%,transparent 100%)] blur-3xl opacity-90" />

      <ToastContainer position="top-right" autoClose={3000} />

      <div className="relative z-10 flex flex-col items-center justify-center px-6 py-20">
        {!showTracker ? (
          <>
            {/* Hero Section */}
            <div className="text-center mb-10 max-w-4xl animate-fadeIn">
              <h1 className="text-6xl md:text-7xl font-extrabold text-gray-900 mb-4">
                <span className="bg-gradient-to-bl from-blue-500 via-purple-500 to-orange-600 text-transparent bg-clip-text font-sans font-bold">
                  AI
                </span>
                -Powered {""}
                <span
                  className="font-extralight italic text-gray-900"
                  style={{ fontFamily: "Times New Roman, Times, serif" }}
                >
                  Bug Tracker
                </span>
              </h1>
              <p className="text-gray-700 text-lg md:text-xl">
                Submit, preview, and monitor bugs in your web apps seamlessly.
                Powered by AI insights to make testing faster and smarter.
              </p>
              <div className="mt-8 flex justify-center gap-4 flex-wrap">
                <p className="text-sm text-gray-500">
                  Select your role below to get started
                </p>
              </div>
            </div>

            {/* Role Cards */}
            <div className="grid md:grid-cols-2 gap-12 max-w-5xl w-full">
              {/* User Card */}

              <div className="p-16  bg-white/90 rounded-4xl shadow-2xl hover:scale-105 transform transition duration-300 text-center flex flex-col justify-between">
                <h2 className="text-3xl font-bold mb-2">Tester / User</h2>
                <p className="text-gray-700 mb-8 text-lg">
                  Submit bugs, get AI insights, and preview UI snapshots
                  instantly.
                </p>
                <Link href="/tester/url">
                  <button className="mx-auto px-12 py-4 cursor-pointer hover:bg-amber-600 transition-all rounded-3xl bg-black text-white font-semibold text-lg">
                    Enter as Tester
                  </button>
                </Link>
              </div>

              {/* Admin Card */}
              <div className="p-16 bg-white/90 rounded-4xl shadow-2xl hover:scale-105 transform transition duration-300 text-center flex flex-col justify-between">
                <h2 className="text-3xl font-bold mb-2">Developer</h2>
                <p className="text-gray-700 mb-8 text-lg">
                  Manage submitted bugs and track progress.
                </p>
                <Link href="/admin/login">
                  <button className="mx-auto px-12 py-4 cursor-pointer  rounded-3xl  hover:bg-blue-600 bg-black text-white font-semibold text-lg">
                    Enter as Developer
                  </button>
                </Link>
              </div>
            </div>

            {/* Future Upgrades Button */}
            <div className="mt-16">
              <button
                onClick={() => setShowUpgradesModal(true)}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
              >
                List of future upgrades
              </button>
            </div>
          </>
        ) : (
          // Role-based view after selection
          <div className="w-full max-w-6xl flex flex-col items-center gap-6 mt-10">
            {/* Back Button */}
            <button
              onClick={() => setShowTracker(false)}
              className="self-start px-4 py-2 rounded-xl  bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
            >
              Back to Landing
            </button>

            {/* User/Tester's BugForm */}
            {role === "user" ? <BugForm /> : <AssignedTickets />}
          </div>
        )}
      </div>

      {/* Future Upgrades Modal */}
      {showUpgradesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 transform transition-all scale-100">
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Future Upgrades</h3>
            <ul className="space-y-4 mb-8 text-gray-700">
              <li className="flex items-start">
                <span className="text-indigo-500 mr-2 text-xl leading-none">&bull;</span>
                <span>AI-driven automatic test case generation</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-2 text-xl leading-none">&bull;</span>
                <span>Seamless CI/CD pipeline integration</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-2 text-xl leading-none">&bull;</span>
                <span>Advanced real-time collaborative debugging</span>
              </li>
            </ul>
            <button
              onClick={() => setShowUpgradesModal(false)}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Animation styles */}
      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 1s ease forwards;
        }
        @keyframes fadeIn {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
