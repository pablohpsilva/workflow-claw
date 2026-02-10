import React from "react";
import { EdgeRecord, Step } from "../../types";
import Section from "../ui/Section";
import SelectField from "../ui/SelectField";
import PrimaryButton from "../ui/PrimaryButton";
import GhostButton from "../ui/GhostButton";

export default function EdgesSection({
  edgeFrom,
  setEdgeFrom,
  edgeTo,
  setEdgeTo,
  edgeType,
  setEdgeType,
  steps,
  edges,
  configLocked,
  handleCreateEdge,
  handleDeleteEdge
}: {
  edgeFrom: string;
  setEdgeFrom: (value: string) => void;
  edgeTo: string;
  setEdgeTo: (value: string) => void;
  edgeType: EdgeRecord["type"];
  setEdgeType: (value: EdgeRecord["type"]) => void;
  steps: Step[];
  edges: EdgeRecord[];
  configLocked: boolean;
  handleCreateEdge: () => void;
  handleDeleteEdge: (id: string) => void;
}) {
  return (
    <Section title="Connections" testId="section-edges">
      <div data-testid="edge-form" className="grid gap-3 md:grid-cols-3">
        <SelectField
          label="From"
          value={edgeFrom}
          onChange={setEdgeFrom}
          options={[{ label: "Select step", value: "" }, ...steps.map((s) => ({ label: s.name, value: s.id }))]}
          testId="edge-from"
          disabled={configLocked}
        />
        <SelectField
          label="To"
          value={edgeTo}
          onChange={setEdgeTo}
          options={[{ label: "Select step", value: "" }, ...steps.map((s) => ({ label: s.name, value: s.id }))]}
          testId="edge-to"
          disabled={configLocked}
        />
        <SelectField
          label="Type"
          value={edgeType}
          onChange={(value) => setEdgeType(value as EdgeRecord["type"])}
          options={[
            { label: "Next", value: "next" },
            { label: "Support", value: "support" },
            { label: "Callback", value: "callback" },
            { label: "Failure", value: "failure" }
          ]}
          testId="edge-type"
          disabled={configLocked}
        />
      </div>
      <PrimaryButton label="Add Connection" onClick={handleCreateEdge} testId="edge-add" disabled={configLocked} />
      <div data-testid="edge-list" className="space-y-2">
        {edges.map((edge) => (
          <div data-testid={`edge-card-${edge.id}`} key={edge.id} className="rounded-lg border border-slate/10 p-3">
            <p data-testid={`edge-card-${edge.id}-text`} className="text-xs text-slate/70">
              {edge.from_step_id} → {edge.to_step_id} ({edge.type})
            </p>
            <GhostButton
              label="Delete"
              onClick={() => handleDeleteEdge(edge.id)}
              testId={`edge-card-${edge.id}-delete`}
              disabled={configLocked}
            />
          </div>
        ))}
      </div>
    </Section>
  );
}
