import React from "react";
import Modal from "../ui/Modal";
import Field from "../ui/Field";
import GhostButton from "../ui/GhostButton";
import PrimaryButton from "../ui/PrimaryButton";

export default function FolderModal({
  title,
  open,
  onClose,
  folderLabel,
  setFolderLabel,
  folderPath,
  setFolderPath,
  saveLabel,
  handleSaveFolder,
  configLocked
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  folderLabel: string;
  setFolderLabel: (value: string) => void;
  folderPath: string;
  setFolderPath: (value: string) => void;
  saveLabel: string;
  handleSaveFolder: () => void;
  configLocked: boolean;
}) {
  return (
    <Modal title={title} open={open} onClose={onClose} testId="folder-modal">
      <Field
        label="Label"
        value={folderLabel}
        onChange={setFolderLabel}
        placeholder="Team Alpha"
        testId="folder-label"
        disabled={configLocked}
      />
      <Field
        label="Folder Path"
        value={folderPath}
        onChange={setFolderPath}
        placeholder="/path/to/project"
        testId="folder-path"
        disabled={configLocked}
      />
      <div className="flex items-center justify-end gap-2 pt-2">
        <GhostButton label="Cancel" onClick={onClose} testId="folder-cancel" />
        <PrimaryButton label={saveLabel} onClick={handleSaveFolder} testId="folder-save" disabled={configLocked} />
      </div>
    </Modal>
  );
}
