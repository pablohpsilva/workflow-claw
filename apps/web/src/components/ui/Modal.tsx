import React, { useEffect } from "react";
import GhostButton from "./GhostButton";

export default function Modal({
  title,
  open,
  onClose,
  children,
  testId
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  testId: string;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div data-testid={testId} className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
      <button
        data-testid={`${testId}-backdrop`}
        onClick={onClose}
        aria-label="Close modal"
        className="absolute inset-0 bg-slate/40 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/50">Modal</p>
            <h3 className="font-display text-lg font-semibold text-slate/90">{title}</h3>
          </div>
          <GhostButton label="Close" onClick={onClose} testId={`${testId}-close`} />
        </div>
        <div className="mt-4 space-y-3">{children}</div>
      </div>
    </div>
  );
}
