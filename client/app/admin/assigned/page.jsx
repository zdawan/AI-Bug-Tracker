"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function AssignedTickets() {
  const [developer, setDeveloper] = useState(null);
  const [bugs, setBugs] = useState([]);
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("developer");
    router.push("/admin/login");
  };
  useEffect(() => {
    const dev = JSON.parse(localStorage.getItem("developer"));
    if (dev) {
      setDeveloper(dev);
      axios
        .get(`http://localhost:5000/api/developers/${dev._id}/bugs`)
        .then((res) => setBugs(res.data))
        .catch((err) => console.error(err));
    }
  }, []);

  //back routing without logging out prvnts unauth access
  if (!developer)
    return <p className="text-center mt-20">Please login first</p>;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex flex-col items-center py-12 px-6 font-sans relative">
      <div className="bg-white/90 backdrop-blur-md shadow-2xl rounded-3xl p-10 max-w-7xl w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Welcome, {developer.name}
        </h1>
        <p className="text-gray-600 mb-6">
          You are assigned to bugs for: {developer.assignedUrls.join(", ")}
        </p>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-400 text-white rounded-xl cursor-pointer hover:bg-red-600"
        >
          Logout
        </button>

        {bugs.length === 0 ? (
          <p className="text-gray-500">No bugs reported yet 🎉</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-4">Title</th>
                  <th className="p-4">Test URL</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Reports</th>
                  <th className="p-4">Latest Report</th>
                  <th className="p-4">Screenshots</th>
                  <th className="p-4">Code</th>
                </tr>
              </thead>
              <tbody>
                {bugs.map((bug) => (
                  <tr key={bug._id} className="border-b hover:bg-gray-50">
                    <td className="p-4">{bug.title}</td>
                    <td className="p-4">{bug.testUrl}</td>
                    <td className="p-4">{bug.severity}</td>
                    <td className="p-4">{bug.reports}</td>
                    <td className="p-4">
                      {new Date(bug.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">Not Included</td>
                    <td className="p-4">
                      <a
                        href="vscode://"
                        className="p-4 text-blue-600
                        font-medium cursor-pointer underline"
                      >
                        Source Code
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
