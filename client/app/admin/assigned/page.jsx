"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Pencil, Info } from "lucide-react"; // ✅ npm install lucide-react
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AssignedWorkloadOverview from "./AssignedWorkloadOverview";
import AssignedBugFilterBar from "./AssignedBugFilterBar";
import AssignedBugSearchBar from "./AssignedBugSearchBar";
import AssignedBugSortControl from "./AssignedBugSortControl";
import AssignedSeverityLegend from "./AssignedSeverityLegend";
import AssignedReportTextCell from "./AssignedReportTextCell";
import AssignedReportDateCell from "./AssignedReportDateCell";
import AssignedBugStatusCell from "./AssignedBugStatusCell";
import AssignedBugCategoryBadge from "./AssignedBugCategoryBadge";
import AssignedBugDetailsButton from "./AssignedBugDetailsButton";
import AssignedBugDetailsHeader from "./AssignedBugDetailsHeader";
import AssignedBugMetadataGrid from "./AssignedBugMetadataGrid";
import AssignedBugUrlActions from "./AssignedBugUrlActions";
import AssignedResolveChecklist from "./AssignedResolveChecklist";
import AssignedCodePreviewModal from "./AssignedCodePreviewModal";
import AssignedSeverityEditor from "./AssignedSeverityEditor";
import AssignedLogoutConfirm from "./AssignedLogoutConfirm";
import AssignedReportsEmptyState from "./AssignedReportsEmptyState";
import AssignedPageLoadingState from "./AssignedPageLoadingState";
import AssignedApplicationsHeader from "./AssignedApplicationsHeader";
import AssignedApplicationMetrics from "./AssignedApplicationMetrics";
import AssignedResolutionStatus from "./AssignedResolutionStatus";
import AssignedApplicationLink from "./AssignedApplicationLink";
import AssignedApplicationsEmptyState from "./AssignedApplicationsEmptyState";
import AssignedFilteredEmptyState from "./AssignedFilteredEmptyState";
import AssignedTableScrollHint from "./AssignedTableScrollHint";
import AssignedReportsTableCaption from "./AssignedReportsTableCaption";
import AssignedReportsKeyboardGuide from "./AssignedReportsKeyboardGuide";
import AssignedReportHealthPanel from "./AssignedReportHealthPanel";
const API_URL = process.env.NEXT_PUBLIC_API_URL;


export default function AssignedTickets() {
  const [editUrl, setEditUrl] = useState(null); // base url being edited
  const [subPath, setSubPath] = useState("");
  const [urlSections, setUrlSections] = useState({}); // { baseUrl: [subPaths] }
  const [viewUrl, setViewUrl] = useState(null); // base url being viewed
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
  const [bugFilter, setBugFilter] = useState("all");
  const [bugSearch, setBugSearch] = useState("");
  const [bugSort, setBugSort] = useState("newest");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("developer");
    router.push("/admin/login");
  };

  const handleResolve = async (bugId) => {
    try {
      await axios.patch(`https://ai-bug-tracker-1.onrender.com/api/bugs/${bugId}/resolve`, {
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
        .get(`https://ai-bug-tracker-1.onrender.com/api/developers/${dev._id}/bugs`)
        .then((res) => setBugs(res.data))
        .catch((err) => console.error(err));
    }
  }, []);

  const handleSeverityUpdate = async () => {
    if (!editBug) return;
    try {
      const res = await axios.patch(
        `https://ai-bug-tracker-1.onrender.com/api/bugs/${editBug._id}/severity`,
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

  const getBugCountForUrl = (url) =>
    bugs.filter((bug) => bug.testUrl?.startsWith(url)).length;

  const getResolvedBugCountForUrl = (baseUrl) =>
    bugs.filter(
      (bug) => bug.status === "Closed" && bug.testUrl?.startsWith(baseUrl),
    ).length;

  const getUnresolvedBugCountForUrl = (baseUrl) =>
    bugs.filter(
      (bug) => bug.status !== "Closed" && bug.testUrl?.startsWith(baseUrl),
    ).length;

  const visibleBugs = bugs.filter((bug) => {
    const search = bugSearch.trim().toLowerCase();
    const matchesSearch = !search || [bug.title, bug.category, bug.testUrl]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(search));
    if (!matchesSearch) return false;
    if (bugFilter === "open") return bug.status !== "Closed";
    if (bugFilter === "closed") return bug.status === "Closed";
    return true;
  }).sort((first, second) => {
    if (bugSort === "severity") {
      const rank = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      return (rank[second.severity] || 0) - (rank[first.severity] || 0);
    }
    const firstDate = new Date(first.createdAt).getTime();
    const secondDate = new Date(second.createdAt).getTime();
    return bugSort === "oldest" ? firstDate - secondDate : secondDate - firstDate;
  });

  if (!developer)
    return <AssignedPageLoadingState />;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex flex-col items-center py-6 px-4 md:py-12 md:px-6 font-sans relative">
      <div
        className="
          bg-white/90 backdrop-blur-md shadow-2xl rounded-3xl
          px-4 py-6 sm:px-8 sm:py-10 md:px-12 md:py-14
          max-w-[95%]
          w-full
          min-h-[85vh]
          flex flex-col gap-10
        "
      >
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Welcome, {developer.name}
        </h1>
        <AssignedWorkloadOverview
          urls={developer.assignedUrls}
          bugs={bugs}
        />
        <AssignedReportHealthPanel bugs={bugs} />
        <div className="mb-6">
          <AssignedApplicationsHeader count={developer.assignedUrls.length} />

          {developer.assignedUrls.length === 0 ? (
            <AssignedApplicationsEmptyState />
          ) : (
            developer.assignedUrls.map((url, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-6">
              {/* ================= LEFT CARD ================= */}
              <div className="col-span-1 md:col-span-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <AssignedApplicationLink url={url} />

                    <AssignedApplicationMetrics
                      total={getBugCountForUrl(url)}
                      resolved={getResolvedBugCountForUrl(url)}
                      pending={getUnresolvedBugCountForUrl(url)}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4 mt-1 flex-shrink-0">
                    <button
                      onClick={() => {
                        setEditUrl(url);
                        setSubPath("");
                      }}
                      className="flex items-center gap-1 text-gray-600 hover:text-black text-sm cursor-pointer"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>

                    <button
                      onClick={() => setViewUrl(url)}
                      className="flex items-center gap-1 text-blue-600 hover:underline text-sm cursor-pointer"
                    >
                      <Info size={14} />
                      View
                    </button>
                  </div>
                </div>
              </div>

              {/* ================= RIGHT CARD ================= */}
              <div className="col-span-1 bg-white border border-gray-200 rounded-xl px-4 py-4 sm:px-6 sm:py-5">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
                  Resolution Progress
                </p>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-green-600"
                    style={{
                      width: `${(getResolvedBugCountForUrl(url) /
                        Math.max(getBugCountForUrl(url), 1)) *
                        100
                        }%`,
                    }}
                  />
                </div>

                <div className="flex justify-between text-xs text-gray-600 mb-2">
                  <span>{getResolvedBugCountForUrl(url)} Resolved</span>
                  <span>{getUnresolvedBugCountForUrl(url)} Pending</span>
                </div>

                <AssignedResolutionStatus
                  total={getBugCountForUrl(url)}
                  pending={getUnresolvedBugCountForUrl(url)}
                />
              </div>
            </div>
          ))) }
        </div>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="px-6 py-2.5 bg-red-400 text-white rounded-xl cursor-pointer w-fit hover:bg-red-600 transition-colors"
        >
          Logout
        </button>

        {showLogoutConfirm && (
          <AssignedLogoutConfirm
            onConfirm={handleLogout}
            onCancel={() => setShowLogoutConfirm(false)}
          />
        )}

        {bugs.length === 0 ? (
          <AssignedReportsEmptyState />
        ) : bugs.every((b) => b.status === "Closed") ? (
          <p className="text-green-600 font-semibold text-center">
            All bugs resolved 🎉
          </p>
        ) : (
          <div className="overflow-x-auto">
            <AssignedBugSearchBar
              value={bugSearch}
              onChange={setBugSearch}
              resultCount={visibleBugs.length}
            />
            <AssignedBugFilterBar
              bugs={bugs}
              value={bugFilter}
              onChange={setBugFilter}
            />
            <AssignedBugSortControl value={bugSort} onChange={setBugSort} />
            <AssignedSeverityLegend />
            <AssignedReportsKeyboardGuide
              isFiltered={Boolean(bugSearch.trim()) || bugFilter !== "all" || bugSort !== "newest"}
              resultCount={visibleBugs.length}
            />
            {visibleBugs.length === 0 ? (
              <AssignedFilteredEmptyState
                hasSearch={Boolean(bugSearch.trim())}
                onClearSearch={() => setBugSearch("")}
                onShowAll={() => {
                  setBugFilter("all");
                  setBugSearch("");
                }}
              />
            ) : (
            <>
            <AssignedTableScrollHint />
            <AssignedReportsTableCaption
              visibleCount={visibleBugs.length}
              totalCount={bugs.length}
              filter={bugFilter}
              search={bugSearch}
            />
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
                {visibleBugs.map((bug) => (
                  <tr key={bug._id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <AssignedReportTextCell value={bug.title} label="Title" />
                    </td>
                    <td className="p-4">
                      <AssignedBugDetailsButton
                        bug={bug}
                        onSelect={setSelectedBug}
                      />
                    </td>
                    <td className="p-4">
                      <AssignedBugCategoryBadge category={bug.category} />
                    </td>
                    <td className="p-4">
                      <AssignedReportTextCell
                        value={bug.testUrl}
                        label="Test URL"
                        href={bug.testUrl}
                      />
                    </td>
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
                      <AssignedReportDateCell value={bug.createdAt} />
                    </td>

                    {/* ✅ New Resolved Section */}
                    <td className="p-4 text-center">
                      <AssignedBugStatusCell
                        bug={bug}
                        onResolve={setResolveBug}
                      />
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
            </>
            )}
          </div>
        )}
      </div>

      {/* ✅ Description Modal */}
      {selectedBug && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
            <AssignedBugDetailsHeader
              bug={selectedBug}
              onClose={() => setSelectedBug(null)}
            />
            <AssignedBugMetadataGrid bug={selectedBug} />
            <AssignedBugUrlActions url={selectedBug.testUrl} />
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
            <AssignedResolveChecklist bug={resolveBug} sendMail={sendMail} />

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
        <AssignedCodePreviewModal
          code={selectedCode}
          onClose={() => {
            setShowCodeModal(false);
            setSelectedCode("");
          }}
        />
      )}

      {/* ✅ Severity Edit Modal */}
      {editBug && (
        <AssignedSeverityEditor
          bug={editBug}
          value={newSeverity}
          onChange={setNewSeverity}
          onSave={handleSeverityUpdate}
          onCancel={() => setEditBug(null)}
        />
      )}

      {editUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Section</h2>

            <p className="text-sm text-gray-500 mb-2">Base URL: {editUrl}</p>

            <input
              type="text"
              placeholder="/bug-report"
              value={subPath}
              onChange={(e) => setSubPath(e.target.value)}
              className="w-full border px-4 py-2 rounded-lg mb-4"
            />

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setEditUrl(null)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!subPath.startsWith("/")) {
                    toast.error("Sub-path must start with /");
                    return;
                  }

                  setUrlSections((prev) => ({
                    ...prev,
                    [editUrl]: [...(prev[editUrl] || []), subPath],
                  }));

                  toast.success("Section added");
                  setEditUrl(null);
                  setSubPath("");
                }}
                className="px-4 py-2 bg-green-700 text-white rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {viewUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Available Sections</h2>

            <p className="text-sm text-gray-500 mb-4">Base URL: {viewUrl}</p>

            {urlSections[viewUrl]?.length > 0 ? (
              <ul className="space-y-2">
                {urlSections[viewUrl].map((path, idx) => (
                  <li
                    key={idx}
                    className="bg-gray-100 px-4 py-2 rounded-lg font-mono"
                  >
                    {path}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No sections added yet.</p>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setViewUrl(null)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
