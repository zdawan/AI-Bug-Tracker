"use client";

import { PencilLine, X } from "lucide-react";

const SEVERITIES = ["Low", "Medium", "High", "Critical"];

export default function AssignedSeverityEditor({ bug, value, onChange, onSave, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <PencilLine size={17} aria-hidden="true" className="text-violet-600" />
              Update severity
            </div>
            <p className="mt-1 max-w-[280px] truncate text-xs text-slate-500" title={bug.title}>
              {bug.title}
            </p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close severity editor" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
            <X size={17} aria-hidden="true" />
          </button>
        </header>
        <label htmlFor="assigned-severity" className="mt-5 block text-xs font-semibold text-slate-700">
          Severity level
        </label>
        <select id="assigned-severity" value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100">
          {SEVERITIES.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
        </select>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">Cancel</button>
          <button type="button" onClick={onSave} className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">Save severity</button>
        </div>
      </div>
    </div>
  );
}
