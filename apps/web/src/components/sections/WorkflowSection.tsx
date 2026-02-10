import React from "react";
import { Folder, Workflow } from "../../types";
import Section from "../ui/Section";
import Field from "../ui/Field";
import TextArea from "../ui/TextArea";
import SelectField from "../ui/SelectField";
import PrimaryButton from "../ui/PrimaryButton";
import GhostButton from "../ui/GhostButton";

export default function WorkflowSection({
  workflowName,
  setWorkflowName,
  workflowDescription,
  setWorkflowDescription,
  workflowFolderId,
  setWorkflowFolderId,
  workflowMode,
  setWorkflowMode,
  folders,
  workflows,
  selectedWorkflowId,
  loadWorkflow,
  handleCreateWorkflow,
  handleDeleteWorkflow,
  configLocked
}: {
  workflowName: string;
  setWorkflowName: (value: string) => void;
  workflowDescription: string;
  setWorkflowDescription: (value: string) => void;
  workflowFolderId: string;
  setWorkflowFolderId: (value: string) => void;
  workflowMode: "sequential" | "parallel";
  setWorkflowMode: (value: "sequential" | "parallel") => void;
  folders: Folder[];
  workflows: Workflow[];
  selectedWorkflowId: string | null;
  loadWorkflow: (id: string) => void;
  handleCreateWorkflow: () => void;
  handleDeleteWorkflow: (id: string) => void;
  configLocked: boolean;
}) {
  return (
    <Section title="Workflow Builder" testId="section-workflow">
      <Field
        label="Name"
        value={workflowName}
        onChange={setWorkflowName}
        testId="workflow-name"
        disabled={configLocked}
      />
      <TextArea
        label="Description"
        value={workflowDescription}
        onChange={setWorkflowDescription}
        testId="workflow-description"
        disabled={configLocked}
      />
      <SelectField
        label="Folder"
        value={workflowFolderId}
        onChange={setWorkflowFolderId}
        options={[{ label: "Select folder", value: "" }, ...folders.map((f) => ({ label: f.path, value: f.id }))]}
        testId="workflow-folder"
        disabled={configLocked}
      />
      <SelectField
        label="Execution Mode"
        value={workflowMode}
        onChange={(value) => setWorkflowMode(value as "sequential" | "parallel")}
        options={[
          { label: "Sequential", value: "sequential" },
          { label: "Parallel", value: "parallel" }
        ]}
        testId="workflow-mode"
        disabled={configLocked}
      />
      <PrimaryButton
        label="Create Workflow"
        onClick={handleCreateWorkflow}
        testId="workflow-create"
        disabled={configLocked}
      />
      <div data-testid="workflow-list" className="space-y-2">
        {workflows.map((workflow) => (
          <div
            data-testid={`workflow-card-${workflow.id}`}
            key={workflow.id}
            className={`rounded-lg border p-3 ${
              selectedWorkflowId === workflow.id ? "border-accent bg-white" : "border-slate/10 bg-white"
            }`}
          >
            <button
              data-testid={`workflow-card-${workflow.id}-select`}
              onClick={() => loadWorkflow(workflow.id)}
              className="w-full text-left"
            >
              <p data-testid={`workflow-card-${workflow.id}-name`} className="text-sm font-semibold">
                {workflow.name}
              </p>
              <p data-testid={`workflow-card-${workflow.id}-desc`} className="text-xs text-slate/60">
                {workflow.description || "No description"}
              </p>
            </button>
            <GhostButton
              label="Delete"
              onClick={() => handleDeleteWorkflow(workflow.id)}
              testId={`workflow-card-${workflow.id}-delete`}
              disabled={configLocked}
            />
          </div>
        ))}
      </div>
    </Section>
  );
}
