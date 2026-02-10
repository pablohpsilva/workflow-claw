import React from "react";
import { Folder } from "../../types";
import Section from "../ui/Section";
import PrimaryButton from "../ui/PrimaryButton";
import GhostButton from "../ui/GhostButton";
import EmptyState from "../ui/EmptyState";

export default function FoldersSection({
  folders,
  configLocked,
  openAddFolderModal,
  openEditFolderModal,
  handleDeleteFolder
}: {
  folders: Folder[];
  configLocked: boolean;
  openAddFolderModal: () => void;
  openEditFolderModal: (folder: Folder) => void;
  handleDeleteFolder: (id: string) => void;
}) {
  return (
    <Section title="Project Folders" testId="section-folders">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate/80">Folders</p>
          <p className="text-xs text-slate/60">Organize workflows by project folder.</p>
        </div>
        <PrimaryButton
          label="Add Folder"
          onClick={openAddFolderModal}
          testId="folder-open-add"
          disabled={configLocked}
        />
      </div>
      <div data-testid="folder-list" className="space-y-2">
        {folders.length === 0 ? (
          <EmptyState
            title="No folders yet"
            description="Add a folder to scope workflows to a project."
            testId="folder-empty-state"
          />
        ) : (
          folders.map((folder) => (
            <div
              data-testid={`folder-card-${folder.id}`}
              key={folder.id}
              className="rounded-lg border border-slate/10 bg-white p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p data-testid={`folder-card-${folder.id}-label`} className="text-sm font-semibold text-slate/80">
                    {folder.label || "Untitled folder"}
                  </p>
                  <p data-testid={`folder-card-${folder.id}-path`} className="text-xs text-slate/70">
                    {folder.path}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <GhostButton
                    label="Edit"
                    onClick={() => openEditFolderModal(folder)}
                    testId={`folder-card-${folder.id}-edit`}
                    disabled={configLocked}
                  />
                  <GhostButton
                    label="Delete"
                    onClick={() => handleDeleteFolder(folder.id)}
                    testId={`folder-card-${folder.id}-delete`}
                    disabled={configLocked}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Section>
  );
}
