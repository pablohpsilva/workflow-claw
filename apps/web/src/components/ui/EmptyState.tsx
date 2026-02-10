import React from "react";

export default function EmptyState({
  title,
  description,
  testId
}: {
  title: string;
  description: string;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className="rounded-xl border border-dashed border-slate/20 bg-white/70 p-4 text-sm text-slate/70"
    >
      <p className="text-sm font-semibold text-slate/80">{title}</p>
      <p className="mt-1 text-xs text-slate/60">{description}</p>
    </div>
  );
}
