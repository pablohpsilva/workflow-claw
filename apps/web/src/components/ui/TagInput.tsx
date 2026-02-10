import React from "react";

export default function TagInput({
  label,
  value,
  onChange,
  placeholder,
  testId,
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  testId: string;
  disabled?: boolean;
}) {
  return (
    <div data-testid={`${testId}-wrapper`} className="flex flex-col gap-1">
      <label data-testid={`${testId}-label`} className="text-xs font-semibold text-slate/70">
        {label}
      </label>
      <input
        data-testid={`${testId}-input`}
        className="w-full rounded-lg border border-slate/20 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate/5"
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
      <p data-testid={`${testId}-help`} className="text-[11px] text-slate/60">
        Separate with commas.
      </p>
    </div>
  );
}
