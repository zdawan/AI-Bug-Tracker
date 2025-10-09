"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { CheckCircle, Pencil, Info } from "lucide-react"; // ✅ npm install lucide-react
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AssignedTickets() {
  const [developer, setDeveloper] = useState(null);
  const [bugs, setBugs] = useState([]);
  const [selectedBug, setSelectedBug] = useState(null);
  const [editBug, setEditBug] = useState(null); // ✅ For editing severity
  const [newSeverity, setNewSeverity] = useState("Medium");
  const [resolveBug, setResolveBug] = useState(null); // ✅ For resolving bugs
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("developer");
    router.push("/admin/login");
  };

  const handleResolve = async (bugId, sendMail = false) => {
    try {
      await axios.patch(`http://localhost:5000/api/bugs/${bugId}/resolve`, {
        sendMail, // include this in the body
      });
      setBugs((prev) =>
        prev.map((b) => (b._id === bugId ? { ...b, status: "Closed" } : b))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setResolveBug(null);
    }
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

  const handleSeverityUpdate = async () => {
    if (!editBug) return;
    try {
      const res = await axios.patch(
        `http://localhost:5000/api/bugs/${editBug._id}/severity`,
        { severity: newSeverity }
      );
      setBugs((prev) =>
        prev.map((b) =>
          b._id === editBug._id ? { ...b, severity: res.data.severity } : b
        )
      );
      setEditBug(null);
    } catch (err) {
      console.error("Error updating severity", err);
    }
  };

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
                  <th className="p-4">Desc</th>
                  <th className="p-4">Test URL</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Reports</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Screenshots</th>
                  <th className="p-4 relative">
                    <div className="flex items-center justify-start gap-2">
                      <span>Resolve</span>
                      <div className="relative group">
                        <Info
                          size={16}
                          className="text-red-500 cursor-pointer hover:text-gray-700"
                        />
                        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-gray-900 text-white text-xs rounded-lg px-3 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-64 text-center shadow-lg">
                          This is a one-time action and cannot be revoked.
                          Please verify the bug before marking as resolved.
                        </span>
                      </div>
                    </div>
                  </th>
                  <th className="p-8">Code</th>
                </tr>
              </thead>
              <tbody>
                {bugs.map((bug) => (
                  <tr key={bug._id} className="border-b hover:bg-gray-50">
                    <td className="p-4">{bug.title}</td>
                    <td
                      className="p-4 text-blue-600 font-medium cursor-pointer underline"
                      onClick={() => setSelectedBug(bug)}
                    >
                      View
                    </td>
                    <td className="p-4">{bug.testUrl}</td>
                    <td className="p-4 flex items-center gap-2">
                      <span>{bug.severity}</span>
                      <Pencil
                        size={16}
                        className="cursor-pointer text-gray-500 hover:text-black"
                        onClick={() => {
                          setEditBug(bug);
                          setNewSeverity(bug.severity);
                        }}
                      />
                    </td>
                    <td className="p-4">{bug.reports}</td>
                    <td className="p-4">
                      {new Date(bug.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">Not Included</td>
                    {/* ✅ New Resolved Section */}
                    <td className="p-4 text-center">
                      {bug.status === "Closed" ? (
                        <CheckCircle
                          className="text-green-600 mx-auto"
                          size={20}
                        />
                      ) : (
                        <button
                          onClick={() => setResolveBug(bug)}
                          className="text-blue-600 underline cursor-pointer"
                        >
                          Mark
                        </button>
                      )}
                    </td>
                    {/* ✅ New Code Link Section */}
                    <td className="p-4">
                      <a
                        href="vscode://"
                        className="p-4 text-blue-600 font-medium cursor-pointer underline"
                      >
                        Open
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ✅ Description Modal */}
      {selectedBug && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-4">{selectedBug.title}</h2>
            <p className="text-gray-700 whitespace-pre-line">
              {selectedBug.description}
            </p>
            <button
              onClick={() => setSelectedBug(null)}
              className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {resolveBug && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Mark bug as resolved?</h2>
            <p className="text-gray-600 mb-6">{resolveBug.title}</p>

            {/* ✅ Checkbox to send email */}
            <div className="flex items-center mb-6">
              <input
                type="checkbox"
                id="sendMail"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                onChange={(e) => (resolveBug.sendMail = e.target.checked)}
                disabled
              />
              <label
                htmlFor="sendMail"
                className="ml-2 text-gray-700 text-sm cursor-pointer select-none"
              >
                Send mail to tester{" "}
                <span className="text-red-600">(Coming Soon)</span>
              </label>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setResolveBug(null)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg cursor-pointer"
              >
                No
              </button>
              <button
                onClick={() =>
                  handleResolve(resolveBug._id, resolveBug.sendMail)
                }
                className="px-4 py-2 bg-green-700 cursor-pointer text-white rounded-lg hover:bg-green-800"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Severity Edit Modal */}
      {editBug && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              Update for: <span className="font-medium">{editBug.title}</span>
            </h2>
            <select
              value={newSeverity}
              onChange={(e) => setNewSeverity(e.target.value)}
              className="w-full border px-4 py-2 rounded-lg mb-4"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setEditBug(null)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSeverityUpdate}
                className="px-4 py-2 bg-green-700 cursor-pointer text-white rounded-lg hover:bg-green-800"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
