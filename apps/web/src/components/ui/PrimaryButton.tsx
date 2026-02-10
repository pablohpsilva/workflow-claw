import React from "react";

export default function PrimaryButton({
  label,
  onClick,
  testId,
  type = "button",
  disabled = false
}: {
  label: string;
  onClick: () => void;
  testId: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      data-testid={testId}
      type={type}
      onClick={onClick}
      className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accentDark disabled:cursor-not-allowed disabled:bg-slate/40"
      disabled={disabled}
    >
      {label}
    </button>
  );
}
