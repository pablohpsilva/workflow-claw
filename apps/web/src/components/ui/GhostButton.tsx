import React from "react";

export default function GhostButton({
  label,
  onClick,
  testId,
  disabled = false
}: {
  label: string;
  onClick: () => void;
  testId: string;
  disabled?: boolean;
}) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className="rounded-lg border border-slate/20 px-3 py-2 text-xs font-semibold text-slate/80 hover:border-slate/40 disabled:cursor-not-allowed disabled:border-slate/10 disabled:text-slate/40"
      disabled={disabled}
    >
      {label}
    </button>
  );
}
