import React from "react";
import Section from "../ui/Section";
import TextArea from "../ui/TextArea";
import PrimaryButton from "../ui/PrimaryButton";
import GhostButton from "../ui/GhostButton";

export default function RunSection({
  goalText,
  setGoalText,
  handleExecute,
  runId,
  runStatus,
  runSteps,
  refreshRun
}: {
  goalText: string;
  setGoalText: (value: string) => void;
  handleExecute: () => void;
  runId: string | null;
  runStatus: string;
  runSteps: Array<{ id: string; step_id: string; status: string }>;
  refreshRun: (id: string) => void;
}) {
  return (
    <Section title="Run Workflow" testId="section-run">
      <TextArea label="Goal / Task" value={goalText} onChange={setGoalText} testId="run-goal" />
      <PrimaryButton label="Execute" onClick={handleExecute} testId="run-execute" />
      <div data-testid="run-status" className="rounded-lg border border-slate/10 p-3 text-xs">
        <p data-testid="run-status-text">Run: {runId ? `${runId} (${runStatus || "pending"})` : "No run"}</p>
      </div>
      <div data-testid="run-steps" className="space-y-2">
        {runSteps.map((step) => (
          <div data-testid={`run-step-${step.id}`} key={step.id} className="rounded-lg border border-slate/10 p-3">
            <p data-testid={`run-step-${step.id}-summary`} className="text-xs text-slate/70">
              {step.step_id} — {step.status}
            </p>
          </div>
        ))}
      </div>
      {runId && <GhostButton label="Refresh" onClick={() => refreshRun(runId)} testId="run-refresh" />}
    </Section>
  );
}
