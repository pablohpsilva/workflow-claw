import React from "react";

export default function Section({
  title,
  children,
  testId
}: {
  title: string;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <section data-testid={testId} className="mb-6 rounded-2xl border border-slate/10 bg-white/80 p-4 shadow-sm">
      <h2 data-testid={`${testId}-title`} className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-slate/70">
        {title}
      </h2>
      <div data-testid={`${testId}-body`} className="mt-3 space-y-3">
        {children}
      </div>
    </section>
  );
}
