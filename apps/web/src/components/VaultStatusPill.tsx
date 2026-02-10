import React from "react";
import LockIcon from "./icons/LockIcon";
import UnlockIcon from "./icons/UnlockIcon";

export default function VaultStatusPill({ unlocked }: { unlocked: boolean }) {
  const Icon = unlocked ? UnlockIcon : LockIcon;
  return (
    <div
      data-testid="vault-status-pill"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
        unlocked ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span data-testid="vault-status-text">{unlocked ? "Unlocked" : "Locked"}</span>
    </div>
  );
}
