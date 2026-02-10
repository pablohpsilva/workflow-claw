import React from "react";
import { ProviderPresetKey } from "../../types";
import Modal from "../ui/Modal";
import SelectField from "../ui/SelectField";
import Field from "../ui/Field";
import TextArea from "../ui/TextArea";
import GhostButton from "../ui/GhostButton";
import PrimaryButton from "../ui/PrimaryButton";

export default function ProviderModal({
  title,
  open,
  onClose,
  providerPresetKey,
  setProviderPresetKey,
  providerName,
  setProviderName,
  providerCli,
  setProviderCli,
  providerTemplate,
  setProviderTemplate,
  providerModel,
  setProviderModel,
  providerEnvJson,
  setProviderEnvJson,
  editingProviderId,
  saveLabel,
  handleSaveProvider,
  configLocked
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  providerPresetKey: ProviderPresetKey;
  setProviderPresetKey: (value: ProviderPresetKey) => void;
  providerName: string;
  setProviderName: (value: string) => void;
  providerCli: string;
  setProviderCli: (value: string) => void;
  providerTemplate: string;
  setProviderTemplate: (value: string) => void;
  providerModel: string;
  setProviderModel: (value: string) => void;
  providerEnvJson: string;
  setProviderEnvJson: (value: string) => void;
  editingProviderId: string | null;
  saveLabel: string;
  handleSaveProvider: () => void;
  configLocked: boolean;
}) {
  return (
    <Modal title={title} open={open} onClose={onClose} testId="provider-modal">
      <SelectField
        label="Preset"
        value={providerPresetKey}
        onChange={(value) => setProviderPresetKey(value as ProviderPresetKey)}
        options={[
          { label: "Claude Code", value: "claude" },
          { label: "OpenAI Codex", value: "codex" },
          { label: "Custom", value: "custom" }
        ]}
        testId="provider-preset"
        disabled={configLocked}
      />
      <Field label="Name" value={providerName} onChange={setProviderName} testId="provider-name" disabled={configLocked} />
      <Field
        label="CLI Command"
        value={providerCli}
        onChange={setProviderCli}
        testId="provider-cli"
        disabled={configLocked}
      />
      <TextArea
        label="Command Template"
        value={providerTemplate}
        onChange={setProviderTemplate}
        placeholder='--model {{model}} --prompt "{{prompt}}"'
        testId="provider-template"
        disabled={configLocked}
      />
      <Field
        label="Default Model"
        value={providerModel}
        onChange={setProviderModel}
        placeholder="Leave empty for CLI default"
        testId="provider-model"
        disabled={configLocked}
      />
      <TextArea
        label={editingProviderId ? "Env Vars (JSON) - leave empty to keep existing" : "Env Vars (JSON)"}
        value={providerEnvJson}
        onChange={setProviderEnvJson}
        placeholder='{"KEY":"value"}'
        testId="provider-env"
        disabled={configLocked}
      />
      <div className="flex items-center justify-end gap-2 pt-2">
        <GhostButton label="Cancel" onClick={onClose} testId="provider-cancel" />
        <PrimaryButton label={saveLabel} onClick={handleSaveProvider} testId="provider-save" disabled={configLocked} />
      </div>
    </Modal>
  );
}
