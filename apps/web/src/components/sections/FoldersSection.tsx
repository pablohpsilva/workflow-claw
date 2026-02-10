import React from "react";
import { Folder } from "../../types";
import Section from "../ui/Section";
import PrimaryButton from "../ui/PrimaryButton";
import GhostButton from "../ui/GhostButton";
import EmptyState from "../ui/EmptyState";

function truncatePathStart(value: string, maxChars = 60, maxSegments = 2): string {
  if (value.length <= maxChars) {
    return value;
  }
  const separator = value.includes("\\") ? "\\" : "/";
  const parts = value.split(/[\\/]+/).filter(Boolean);
  if (parts.length === 0) {
    return value.slice(Math.max(0, value.length - maxChars));
  }
  let tail = parts.slice(-Math.min(maxSegments, parts.length)).join(separator);
  let result = `...${separator}${tail}`;
  if (result.length <= maxChars || parts.length === 1) {
    if (result.length <= maxChars) {
      return result;
    }
    const keep = Math.max(1, maxChars - 3);
    return `...${parts[parts.length - 1].slice(-keep)}`;
  }
  tail = parts.slice(-1).join(separator);
  result = `...${separator}${tail}`;
  if (result.length <= maxChars) {
    return result;
  }
  const keep = Math.max(1, maxChars - 3);
  return `...${tail.slice(-keep)}`;
}

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
              <div className="flex flex-col gap-3">
                <div className="min-w-0">
                  <p data-testid={`folder-card-${folder.id}-label`} className="text-sm font-semibold text-slate/80">
                    {folder.label || "Untitled folder"}
                  </p>
                  <p
                    data-testid={`folder-card-${folder.id}-path`}
                    className="text-xs text-slate/70 whitespace-nowrap"
                    title={folder.path}
                    aria-label={folder.path}
                  >
                    {truncatePathStart(folder.path)}
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
