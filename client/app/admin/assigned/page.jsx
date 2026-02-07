"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { CheckCircle, Pencil, Info } from "lucide-react"; // ✅ npm install lucide-react
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AssignedTickets() {
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");
  const [developer, setDeveloper] = useState(null);
  const [bugs, setBugs] = useState([]);
  const [showResolvePopup, setShowResolvePopup] = useState(false);
  const [selectedBug, setSelectedBug] = useState(null);
  const [sendMail, setSendMail] = useState(false); // ✅ State for send mail checkbox
  const [editBug, setEditBug] = useState(null); // ✅ For editing severity
  const [newSeverity, setNewSeverity] = useState("Medium");
  const [resolveBug, setResolveBug] = useState(null); // ✅ For resolving bugs
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("developer");
    router.push("/admin/login");
  };

  const handleResolve = async (bugId) => {
    try {
      await axios.patch(`http://localhost:5000/api/bugs/${bugId}/resolve`, {
        sendMail,
      });

      toast.success("Bug resolved successfully!", {
        position: "top-right",
        autoClose: 3000,
      });
      setShowResolvePopup(false);

      // update UI
      setBugs((prev) =>
        prev.map((b) => (b._id === bugId ? { ...b, status: "Closed" } : b)),
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to resolve bug.", {
        position: "top-right",
        autoClose: 3000,
      });
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
        { severity: newSeverity },
      );
      setBugs((prev) =>
        prev.map((b) =>
          b._id === editBug._id ? { ...b, severity: res.data.severity } : b,
        ),
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
      <div
        className="
          bg-white/90 backdrop-blur-md shadow-2xl rounded-3xl
          px-12 py-14
          max-w-[95%]
          w-full
          min-h-[85vh]
          flex flex-col gap-10
        "
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome, {developer.name}
        </h1>
        <p className="text-gray-600 mb-4">
          You are assigned to bugs for: {developer.assignedUrls.join(", ")}
        </p>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-400 text-white rounded-xl cursor-pointer max-w-[10%] hover:bg-red-600"
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
                  <th className="p-4">Detail</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Test URL</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Reports</th>
                  <th className="p-4">Date</th>
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
                  <th className="p-4">Screenshots</th>
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
                    <td className="p-4">
                      <span
                        className="px-3 py-1 rounded-full text-white text-xs font-semibold"
                        style={{
                          backgroundColor:
                            bug.category === "UI Bug"
                              ? "#3b82f6"
                              : bug.category === "Backend Bug"
                                ? "#6366f1"
                                : bug.category === "Security Bug"
                                  ? "#ef4444"
                                  : bug.category === "Performance Bug"
                                    ? "#f59e0b"
                                    : bug.category === "Database Bug"
                                      ? "#0d9488"
                                      : bug.category === "Developer Error"
                                        ? "#6b7280"
                                        : "#9ca3af",
                        }}
                      >
                        {bug.category || "General Bug"}
                      </span>
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
                      <button
                        onClick={() => {
                          setSelectedCode("Error in fetching the code"); // assuming ("Hi") is the code string
                          setShowCodeModal(true);
                        }}
                        className="text-blue-600 font-medium underline cursor-pointer"
                      >
                        Open
                      </button>
                    </td>
                    <td className="p-4">Not Included</td>
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
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setSelectedBug(null)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {resolveBug && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Mark bug as resolved?</h2>
            <p className="text-gray-600 mb-6">Bug: {resolveBug.title}</p>

            {/* ⚠️ Alert Box */}
            <div className="flex items-start gap-3 bg-red-50 border border-red-300 text-red-700 text-sm rounded-lg p-3 mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 mt-0.5 text-red-600 flex-shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3m0 4h.01m-6.938 4h13.856c1.054 0 1.62-1.144 1.05-2.05L13.05 4.05a1.2 1.2 0 00-2.1 0L4.032 17.95c-.57.906-.004 2.05 1.05 2.05z"
                />
              </svg>
              <span>
                This is a one-time action and cannot be revoked. Please verify
                the bug before marking it as resolved.
              </span>
            </div>

            {/* ✅ Checkbox to send email */}
            <div className="flex items-center mb-6">
              <input
                type="checkbox"
                id="sendMail"
                checked={sendMail}
                onChange={(e) => setSendMail(e.target.checked)}
                className="w-4 h-4 gap-2"
              />
              <label htmlFor="sendMail" className="text-gray-700 gap-2 ml-2">
                Send mail to tester
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
                onClick={() => {
                  handleResolve(resolveBug._id, sendMail);
                  setResolveBug(null); // ✅ close popup immediately after Yes
                }}
                className="px-4 py-2 bg-green-700 cursor-pointer text-white rounded-lg hover:bg-green-800"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {showCodeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
            <pre className="text-sm text-black whitespace-pre-wrap">
              {selectedCode}
            </pre>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowCodeModal(false);
                  setSelectedCode("");
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer"
              >
                Close
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
