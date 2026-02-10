import React from "react";
import { Provider, Step } from "../../types";
import Section from "../ui/Section";
import Field from "../ui/Field";
import TextArea from "../ui/TextArea";
import SelectField from "../ui/SelectField";
import TagInput from "../ui/TagInput";
import PrimaryButton from "../ui/PrimaryButton";
import GhostButton from "../ui/GhostButton";

export default function StepsSection({
  stepName,
  setStepName,
  stepDescription,
  setStepDescription,
  stepProviderId,
  setStepProviderId,
  stepModel,
  setStepModel,
  stepIterations,
  setStepIterations,
  stepSkills,
  setStepSkills,
  stepSuccess,
  setStepSuccess,
  stepFailure,
  setStepFailure,
  stepFormTitle,
  isEditingStep,
  stepPrimaryLabel,
  stepPrimaryAction,
  cancelStepEdit,
  steps,
  selectedStepId,
  beginEditStep,
  handleDeleteStep,
  providers,
  configLocked
}: {
  stepName: string;
  setStepName: (value: string) => void;
  stepDescription: string;
  setStepDescription: (value: string) => void;
  stepProviderId: string;
  setStepProviderId: (value: string) => void;
  stepModel: string;
  setStepModel: (value: string) => void;
  stepIterations: string;
  setStepIterations: (value: string) => void;
  stepSkills: string;
  setStepSkills: (value: string) => void;
  stepSuccess: string;
  setStepSuccess: (value: string) => void;
  stepFailure: string;
  setStepFailure: (value: string) => void;
  stepFormTitle: string;
  isEditingStep: boolean;
  stepPrimaryLabel: string;
  stepPrimaryAction: () => void;
  cancelStepEdit: () => void;
  steps: Step[];
  selectedStepId: string | null;
  beginEditStep: (step: Step) => void;
  handleDeleteStep: (id: string) => void;
  providers: Provider[];
  configLocked: boolean;
}) {
  return (
    <Section title="Steps" testId="section-steps">
      <div data-testid="steps-grid" className="grid gap-4 md:grid-cols-2">
        <div data-testid="steps-form" className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate/50">{stepFormTitle}</p>
          <Field
            label="Step Name"
            value={stepName}
            onChange={setStepName}
            testId="step-name"
            disabled={configLocked}
          />
          <TextArea
            label="Description"
            value={stepDescription}
            onChange={setStepDescription}
            testId="step-description"
            disabled={configLocked}
          />
          <SelectField
            label="Provider"
            value={stepProviderId}
            onChange={setStepProviderId}
            options={[{ label: "Select provider", value: "" }, ...providers.map((p) => ({ label: p.name, value: p.id }))]}
            testId="step-provider"
            disabled={configLocked}
          />
          <Field
            label="Model"
            value={stepModel}
            onChange={setStepModel}
            placeholder="Leave empty for provider default"
            testId="step-model"
            disabled={configLocked}
          />
          <Field
            label="Max Iterations"
            value={stepIterations}
            onChange={setStepIterations}
            testId="step-iterations"
            disabled={configLocked}
          />
          <TagInput
            label="Skills"
            value={stepSkills}
            onChange={setStepSkills}
            placeholder="build-report.sh, analyze.sh"
            testId="step-skills"
            disabled={configLocked}
          />
          <TextArea
            label="Success Criteria"
            value={stepSuccess}
            onChange={setStepSuccess}
            testId="step-success"
            disabled={configLocked}
          />
          <TextArea
            label="Failure Criteria"
            value={stepFailure}
            onChange={setStepFailure}
            testId="step-failure"
            disabled={configLocked}
          />
          <div className="flex items-center gap-2">
            <PrimaryButton
              label={stepPrimaryLabel}
              onClick={stepPrimaryAction}
              testId="step-add"
              disabled={configLocked}
            />
            {isEditingStep && (
              <GhostButton
                label="Cancel"
                onClick={cancelStepEdit}
                testId="step-cancel-edit"
                disabled={configLocked}
              />
            )}
          </div>
        </div>
        <div data-testid="steps-list" className="space-y-2">
          {steps.map((step) => (
            <div
              data-testid={`step-card-${step.id}`}
              key={step.id}
              className={`rounded-lg border p-3 ${
                selectedStepId === step.id ? "border-accent" : "border-slate/10"
              }`}
            >
              <button
                data-testid={`step-card-${step.id}-select`}
                onClick={() => beginEditStep(step)}
                className="w-full text-left"
              >
                <p data-testid={`step-card-${step.id}-name`} className="text-sm font-semibold">
                  {step.name}
                </p>
                <p data-testid={`step-card-${step.id}-desc`} className="text-xs text-slate/60">
                  {step.description}
                </p>
              </button>
              <GhostButton
                label="Delete"
                onClick={() => handleDeleteStep(step.id)}
                testId={`step-card-${step.id}-delete`}
                disabled={configLocked}
              />
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
