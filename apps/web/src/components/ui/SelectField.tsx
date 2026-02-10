import React from "react";

export default function SelectField({
  label,
  value,
  onChange,
  options,
  testId,
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  testId: string;
  disabled?: boolean;
}) {
  return (
    <div data-testid={`${testId}-wrapper`} className="flex flex-col gap-1">
      <label data-testid={`${testId}-label`} className="text-xs font-semibold text-slate/70">
        {label}
      </label>
      <select
        data-testid={`${testId}-select`}
        className="w-full rounded-lg border border-slate/20 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate/5"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        {options.map((option) => (
          <option
            data-testid={`${testId}-option-${option.value}`}
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
