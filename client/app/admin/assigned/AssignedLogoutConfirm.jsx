"use client";

import { LogOut, ShieldQuestion, X } from "lucide-react";

export default function AssignedLogoutConfirm({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <ShieldQuestion size={18} aria-hidden="true" className="text-violet-600" />
            Leave admin workspace?
          </div>
          <button type="button" onClick={onCancel} aria-label="Close logout confirmation" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
            <X size={17} aria-hidden="true" />
          </button>
        </header>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          You will need to sign in again to review assigned reports and manage bug status.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300">
            Stay here
          </button>
          <button type="button" onClick={onConfirm} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
            <LogOut size={14} aria-hidden="true" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
