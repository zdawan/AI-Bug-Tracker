"use client";
import { useEffect, useState } from "react";
import axios from "axios";

export default function AdminDashboard() {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBugs = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/bugs"); // Make sure your backend URL is correct
        console.log("Fetched bugs:", res.data); // Debug: check fetched data
        setBugs(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch bugs. Check backend.");
      } finally {
        setLoading(false);
      }
    };

    fetchBugs();
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6">Admin Dashboard</h2>

      {loading ? (
        <p className="text-gray-700">Loading bugs...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : bugs.length === 0 ? (
        <p className="text-gray-700">No bugs reported yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border text-left">ID</th>
                <th className="px-4 py-2 border text-left">Title</th>
                <th className="px-4 py-2 border text-left">Description</th>
                <th className="px-4 py-2 border text-left">Reporter Email</th>
                <th className="px-4 py-2 border text-left">Date Submitted</th>
              </tr>
            </thead>
            <tbody>
              {bugs.map((bug) => (
                <tr key={bug._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">{bug._id}</td>
                  <td className="px-4 py-2 border">{bug.title}</td>
                  <td className="px-4 py-2 border">{bug.description}</td>
                  <td className="px-4 py-2 border">
                    {bug.reporterEmail || "N/A"}
                  </td>
                  <td className="px-4 py-2 border">
                    {new Date(bug.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
