import React from "react";
import Section from "../ui/Section";
import TextArea from "../ui/TextArea";
import PrimaryButton from "../ui/PrimaryButton";
import GhostButton from "../ui/GhostButton";
import SelectField from "../ui/SelectField";
import type { Run, StepRun } from "../../types";

type OutputTab = "in-progress" | "completed";

export default function RunSection({
  goalText,
  setGoalText,
  handleExecute,
  runId,
  runStatus,
  runSteps,
  runs,
  selectedRunId,
  setSelectedRunId,
  stepNameById,
  refreshRun
}: {
  goalText: string;
  setGoalText: (value: string) => void;
  handleExecute: () => void;
  runId: string | null;
  runStatus: string;
  runSteps: StepRun[];
  runs: Run[];
  selectedRunId: string | null;
  setSelectedRunId: (id: string) => void;
  stepNameById: Record<string, string>;
  refreshRun: (id: string) => void;
}) {
  const [activeTab, setActiveTab] = React.useState<OutputTab>("in-progress");
  const [expandedMap, setExpandedMap] = React.useState<Record<string, boolean>>({});
  const [hiddenMap, setHiddenMap] = React.useState<Record<string, boolean>>({});

  const sortedSteps = [...runSteps].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const inProgressSteps = sortedSteps.filter((step) => step.status === "running");
  const completedSteps = sortedSteps.filter((step) => step.status !== "running");

  React.useEffect(() => {
    if (inProgressSteps.length > 0) {
      setActiveTab("in-progress");
    } else if (completedSteps.length > 0) {
      setActiveTab("completed");
    }
  }, [inProgressSteps.length, completedSteps.length]);

  function toggleExpanded(id: string) {
    setExpandedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleHidden(id: string) {
    setHiddenMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleCopy(text: string | null) {
    if (!text) return;
    navigator.clipboard?.writeText(text);
  }

  const runOptions = runs.length
    ? runs.map((run) => ({
        value: run.id,
        label: `${run.id.slice(0, 8)} • ${run.status} • ${new Date(run.started_at).toLocaleString()}`
      }))
    : [{ value: "", label: "No runs yet" }];

  const visibleSteps = activeTab === "in-progress" ? inProgressSteps : completedSteps;

  return (
    <Section title="Run Workflow" testId="section-run">
      <TextArea label="Goal / Task" value={goalText} onChange={setGoalText} testId="run-goal" />
      <PrimaryButton label="Execute" onClick={handleExecute} testId="run-execute" />
      <SelectField
        label="Run Selector"
        value={selectedRunId ?? ""}
        onChange={setSelectedRunId}
        options={runOptions}
        testId="run-selector"
        disabled={runs.length === 0}
      />
      <div data-testid="run-status" className="rounded-lg border border-slate/10 p-3 text-xs">
        <p data-testid="run-status-text">Run: {runId ? `${runId} (${runStatus || "pending"})` : "No run"}</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="run-tab-in-progress"
          onClick={() => setActiveTab("in-progress")}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            activeTab === "in-progress" ? "bg-slate-900 text-white" : "bg-slate/5 text-slate/70"
          }`}
        >
          In Progress ({inProgressSteps.length})
        </button>
        <button
          type="button"
          data-testid="run-tab-completed"
          onClick={() => setActiveTab("completed")}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            activeTab === "completed" ? "bg-slate-900 text-white" : "bg-slate/5 text-slate/70"
          }`}
        >
          Completed ({completedSteps.length})
        </button>
      </div>
      <div data-testid="run-steps" className="space-y-2">
        {visibleSteps.map((step) => {
          const stdout = step.stdout ?? "";
          const isExpanded = Boolean(expandedMap[step.id]);
          const isHidden = Boolean(hiddenMap[step.id]);
          const stepTitle = stepNameById[step.step_id] ?? step.step_id;
          return (
            <div data-testid={`run-step-${step.id}`} key={step.id} className="rounded-lg border border-slate/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p data-testid={`run-step-${step.id}-summary`} className="text-xs text-slate/70">
                  {stepTitle} — {step.status}
                </p>
                <div className="flex flex-wrap gap-2">
                  <GhostButton label="Copy" onClick={() => handleCopy(stdout)} testId={`run-step-${step.id}-copy`} />
                  <GhostButton
                    label={isExpanded ? "Collapse" : "Expand"}
                    onClick={() => toggleExpanded(step.id)}
                    testId={`run-step-${step.id}-expand`}
                  />
                  <GhostButton
                    label={isHidden ? "Show Output" : "Clear"}
                    onClick={() => toggleHidden(step.id)}
                    testId={`run-step-${step.id}-clear`}
                  />
                </div>
              </div>
              {!isHidden && (
                <div
                  className={`mt-2 whitespace-pre-wrap rounded-md border border-slate/10 bg-slate/5 px-3 py-2 text-xs text-slate/80 ${
                    isExpanded ? "max-h-none" : "max-h-40 overflow-y-auto"
                  }`}
                  data-testid={`run-step-${step.id}-output`}
                >
                  {stdout || "Waiting for output..."}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {runId && <GhostButton label="Refresh" onClick={() => refreshRun(runId)} testId="run-refresh" />}
    </Section>
  );
}
