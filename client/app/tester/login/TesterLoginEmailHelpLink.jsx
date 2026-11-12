"use client";

import { CircleHelp } from "lucide-react";

export default function TesterLoginEmailHelpLink() {
  return (
    <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-purple-700" role="note">
      <CircleHelp size={13} aria-hidden="true" />
      Need details? Open the sign-in help center below.
    </p>
  );
}
