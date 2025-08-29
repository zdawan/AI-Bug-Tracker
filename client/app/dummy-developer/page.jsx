"use client";
import { useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

export default function DeveloperPage() {
  const [email, setEmail] = useState("");
  const [developer, setDeveloper] = useState(null);
  const [bugs, setBugs] = useState([]);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email", { duration: 3000 });
      return;
    }

    try {
      const res = await axios.get(
        `http://localhost:5000/api/developers/email/${encodeURIComponent(
          email
        )}`
      );
      setDeveloper(res.data);

      const bugRes = await axios.get(
        `http://localhost:5000/api/developers/${res.data._id}/bugs`
      );
      setBugs(bugRes.data);

      toast.success("Logged in successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Developer not found or server error");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex flex-col items-center py-12 px-4 font-sans relative">
      <Toaster position="top-right" />

      {!developer ? (
        <div className="bg-white/80 backdrop-blur-md shadow-2xl rounded-3xl p-10 max-w-md w-full">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-6">
            Developer Login
          </h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Enter your developer email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-purple-400 shadow-sm"
            />
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-2xl bg-black text-white font-semibold text-lg shadow-lg hover:opacity-90 transition"
            >
              Continue
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-md shadow-2xl rounded-3xl p-10 max-w-5xl w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Welcome, {developer.name}
          </h1>
          <p className="text-gray-600 mb-6">
            You are assigned to bugs for: {developer.assignedUrls.join(", ")}
          </p>

          {bugs.length === 0 ? (
            <p className="text-gray-500">No bugs reported yet 🎉</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-3">Title</th>
                  <th className="p-3">Test URL</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Reports</th>
                  <th className="p-3">Created At</th>
                </tr>
              </thead>
              <tbody>
                {bugs.map((bug) => (
                  <tr key={bug._id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{bug.title}</td>
                    <td className="p-3">{bug.testUrl}</td>
                    <td className="p-3">{bug.severity}</td>
                    <td className="p-3">{bug.reports}</td>
                    <td className="p-3">
                      {new Date(bug.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </main>
  );
}
