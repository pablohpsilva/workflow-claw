import React, { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  NodeChange,
  EdgeChange
} from "reactflow";
import "reactflow/dist/style.css";
import {
  createEdge,
  createFolder,
  createProvider,
  createStep,
  createWorkflow,
  deleteEdge,
  deleteFolder,
  deleteProvider,
  deleteStep,
  deleteWorkflow,
  executeWorkflow,
  getVaultStatus,
  getRun,
  getWorkflow,
  lockVault,
  listFolders,
  listProviders,
  listWorkflows,
  unlockVault,
  updateFolder,
  updateProvider,
  updateStep,
  updateWorkflow
} from "./api";

const providerPresets = {
  claude: {
    name: "Claude Code",
    cliCommand: "claude",
    template: "--model {{model}} --prompt \"{{prompt}}\""
  },
  codex: {
    name: "OpenAI Codex",
    cliCommand: "codex",
    template: "--model {{model}} --prompt \"{{prompt}}\""
  }
};

type Provider = {
  id: string;
  name: string;
  cliCommand: string;
  template: string;
  defaultModel: string | null;
  createdAt: string;
  updatedAt: string;
  hasEnv: boolean;
};

type Folder = {
  id: string;
  path: string;
  label: string | null;
  created_at?: string;
};

type Workflow = {
  id: string;
  name: string;
  description: string | null;
  folder_id: string;
  execution_mode: "sequential" | "parallel";
};

type Step = {
  id: string;
  workflow_id: string;
  name: string;
  description: string;
  provider_id: string;
  model: string | null;
  max_iterations: number;
  skills_json: string;
  success_criteria: string | null;
  failure_criteria: string | null;
  pos_x: number;
  pos_y: number;
};

type EdgeRecord = {
  id: string;
  workflow_id: string;
  from_step_id: string;
  to_step_id: string;
  type: "next" | "support" | "callback" | "failure";
};

function Section({ title, children, testId }: { title: string; children: React.ReactNode; testId: string }) {
  return (
    <section data-testid={testId} className="mb-6 rounded-2xl border border-slate/10 bg-white/80 p-4 shadow-sm">
      <h2 data-testid={`${testId}-title`} className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-slate/70">
        {title}
      </h2>
      <div data-testid={`${testId}-body`} className="mt-3 space-y-3">
        {children}
      </div>
    </section>
  );
}

function Modal({
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

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.8a4 4 0 1 1 8 0v2.7" />
    </svg>
  );
}

function UnlockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M9 10.5V7.5a3.5 3.5 0 0 1 6.8-1.2" />
    </svg>
  );
}

function VaultStatusPill({ unlocked }: { unlocked: boolean }) {
  const Icon = unlocked ? UnlockIcon : LockIcon;
  return (
    <div
      data-testid="vault-status-pill"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
        unlocked ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span data-testid="vault-status-text">{unlocked ? "Unlocked" : "Locked"}</span>
    </div>
  );
}

function EmptyState({
  title,
  description,
  testId
}: {
  title: string;
  description: string;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className="rounded-xl border border-dashed border-slate/20 bg-white/70 p-4 text-sm text-slate/70"
    >
      <p className="text-sm font-semibold text-slate/80">{title}</p>
      <p className="mt-1 text-xs text-slate/60">{description}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  testId,
  type = "text",
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  testId: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div data-testid={`${testId}-wrapper`} className="flex flex-col gap-1">
      <label data-testid={`${testId}-label`} className="text-xs font-semibold text-slate/70">
        {label}
      </label>
      <input
        data-testid={`${testId}-input`}
        className="w-full rounded-lg border border-slate/20 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate/5"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  testId,
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  testId: string;
  disabled?: boolean;
}) {
  return (
    <div data-testid={`${testId}-wrapper`} className="flex flex-col gap-1">
      <label data-testid={`${testId}-label`} className="text-xs font-semibold text-slate/70">
        {label}
      </label>
      <textarea
        data-testid={`${testId}-input`}
        className="min-h-[80px] w-full rounded-lg border border-slate/20 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate/5"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  testId,
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  testId: string;
  disabled?: boolean;
}) {
  return (
    <div data-testid={`${testId}-wrapper`} className="flex flex-col gap-1">
      <label data-testid={`${testId}-label`} className="text-xs font-semibold text-slate/70">
        {label}
      </label>
      <select
        data-testid={`${testId}-select`}
        className="w-full rounded-lg border border-slate/20 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate/5"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        {options.map((option) => (
          <option
            data-testid={`${testId}-option-${option.value}`}
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TagInput({
  label,
  value,
  onChange,
  placeholder,
  testId,
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  testId: string;
  disabled?: boolean;
}) {
  return (
    <div data-testid={`${testId}-wrapper`} className="flex flex-col gap-1">
      <label data-testid={`${testId}-label`} className="text-xs font-semibold text-slate/70">
        {label}
      </label>
      <input
        data-testid={`${testId}-input`}
        className="w-full rounded-lg border border-slate/20 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate/5"
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
      <p data-testid={`${testId}-help`} className="text-[11px] text-slate/60">
        Separate with commas.
      </p>
    </div>
  );
}

function PrimaryButton({
  label,
  onClick,
  testId,
  type = "button",
  disabled = false
}: {
  label: string;
  onClick: () => void;
  testId: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      data-testid={testId}
      type={type}
      onClick={onClick}
      className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accentDark disabled:cursor-not-allowed disabled:bg-slate/40"
      disabled={disabled}
    >
      {label}
    </button>
  );
}

function GhostButton({
  label,
  onClick,
  testId,
  disabled = false
}: {
  label: string;
  onClick: () => void;
  testId: string;
  disabled?: boolean;
}) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className="rounded-lg border border-slate/20 px-3 py-2 text-xs font-semibold text-slate/80 hover:border-slate/40 disabled:cursor-not-allowed disabled:border-slate/10 disabled:text-slate/40"
      disabled={disabled}
    >
      {label}
    </button>
  );
}

function StepNode({ data }: { data: { name: string; provider: string; status?: string } }) {
  return (
    <div data-testid={`node-${data.name}`} className="flex flex-col gap-1">
      <p data-testid={`node-${data.name}-title`} className="text-sm font-semibold text-slate/90">
        {data.name}
      </p>
      <p data-testid={`node-${data.name}-provider`} className="text-xs text-slate/60">
        {data.provider}
      </p>
    </div>
  );
}

export default function App() {
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [edges, setEdges] = useState<EdgeRecord[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<string>("");
  const [runSteps, setRunSteps] = useState<any[]>([]);

  const [providerPresetKey, setProviderPresetKey] = useState<"claude" | "codex" | "custom">("claude");
  const [providerName, setProviderName] = useState(providerPresets.claude.name);
  const [providerCli, setProviderCli] = useState(providerPresets.claude.cliCommand);
  const [providerTemplate, setProviderTemplate] = useState(providerPresets.claude.template);
  const [providerModel, setProviderModel] = useState("");
  const [providerEnvJson, setProviderEnvJson] = useState("");
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);

  const [folderPath, setFolderPath] = useState("");
  const [folderLabel, setFolderLabel] = useState("");
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);

  const [workflowName, setWorkflowName] = useState("");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [workflowFolderId, setWorkflowFolderId] = useState("");
  const [workflowMode, setWorkflowMode] = useState<"sequential" | "parallel">("sequential");

  const [stepName, setStepName] = useState("");
  const [stepDescription, setStepDescription] = useState("");
  const [stepProviderId, setStepProviderId] = useState("");
  const [stepModel, setStepModel] = useState("");
  const [stepIterations, setStepIterations] = useState("10");
  const [stepSkills, setStepSkills] = useState("");
  const [stepSuccess, setStepSuccess] = useState("");
  const [stepFailure, setStepFailure] = useState("");

  const [edgeFrom, setEdgeFrom] = useState("");
  const [edgeTo, setEdgeTo] = useState("");
  const [edgeType, setEdgeType] = useState<EdgeRecord["type"]>("next");

  const [goalText, setGoalText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const configLocked = !vaultUnlocked;

  useEffect(() => {
    refreshAll();
  }, []);

  async function refreshAll() {
    setErrorMessage("");
    try {
      const [providerList, folderList, workflowList, vaultStatus] = await Promise.all([
        listProviders(),
        listFolders(),
        listWorkflows(),
        getVaultStatus()
      ]);
      setProviders(providerList);
      setFolders(folderList);
      setWorkflows(workflowList);
      setVaultUnlocked(vaultStatus.unlocked);
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  }

  useEffect(() => {
    if (providerPresetKey === "custom") return;
    const preset = providerPresets[providerPresetKey];
    setProviderName(preset.name);
    setProviderCli(preset.cliCommand);
    setProviderTemplate(preset.template);
  }, [providerPresetKey]);

  async function handleUnlock() {
    setErrorMessage("");
    try {
      await unlockVault(passphrase);
      setPassphrase("");
      const status = await getVaultStatus();
      setVaultUnlocked(status.unlocked);
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  }

  async function handleLock() {
    setErrorMessage("");
    try {
      await lockVault();
      setVaultUnlocked(false);
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  }

  function openAddProviderModal() {
    setErrorMessage("");
    setEditingProviderId(null);
    setProviderPresetKey("claude");
    const preset = providerPresets.claude;
    setProviderName(preset.name);
    setProviderCli(preset.cliCommand);
    setProviderTemplate(preset.template);
    setProviderModel("");
    setProviderEnvJson("");
    setIsProviderModalOpen(true);
  }

  function openEditProviderModal(provider: Provider) {
    setErrorMessage("");
    setEditingProviderId(provider.id);
    setProviderPresetKey("custom");
    setProviderName(provider.name);
    setProviderCli(provider.cliCommand);
    setProviderTemplate(provider.template);
    setProviderModel(provider.defaultModel || "");
    setProviderEnvJson("");
    setIsProviderModalOpen(true);
  }

  async function handleSaveProvider() {
    if (configLocked) return;
    setErrorMessage("");
    try {
      const envVars = providerEnvJson ? (JSON.parse(providerEnvJson) as Record<string, string>) : undefined;
      if (editingProviderId) {
        await updateProvider(editingProviderId, {
          name: providerName,
          cliCommand: providerCli,
          template: providerTemplate,
          defaultModel: providerModel || null,
          ...(envVars ? { envVars } : {})
        });
      } else {
        await createProvider({
          name: providerName,
          cliCommand: providerCli,
          template: providerTemplate,
          defaultModel: providerModel || null,
          envVars
        });
      }
      setProviderEnvJson("");
      setIsProviderModalOpen(false);
      await refreshAll();
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  }

  async function handleDeleteProvider(id: string) {
    if (configLocked) return;
    setErrorMessage("");
    try {
      await deleteProvider(id);
      await refreshAll();
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  }

  function openAddFolderModal() {
    setErrorMessage("");
    setEditingFolderId(null);
    setFolderPath("");
    setFolderLabel("");
    setIsFolderModalOpen(true);
  }

  function openEditFolderModal(folder: Folder) {
    setErrorMessage("");
    setEditingFolderId(folder.id);
    setFolderPath(folder.path);
    setFolderLabel(folder.label ?? "");
    setIsFolderModalOpen(true);
  }

  async function handleSaveFolder() {
    if (configLocked) return;
    setErrorMessage("");
    try {
      if (editingFolderId) {
        await updateFolder(editingFolderId, {
          path: folderPath,
          label: folderLabel || null
        });
      } else {
        await createFolder(folderPath, folderLabel || null);
      }
      setFolderPath("");
      setFolderLabel("");
      setIsFolderModalOpen(false);
      await refreshAll();
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  }

  async function handleDeleteFolder(id: string) {
    if (configLocked) return;
    setErrorMessage("");
    try {
      await deleteFolder(id);
      await refreshAll();
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  }

  async function handleCreateWorkflow() {
    if (configLocked) return;
    setErrorMessage("");
    try {
      const { id } = await createWorkflow({
        name: workflowName,
        description: workflowDescription || null,
        folderId: workflowFolderId,
        executionMode: workflowMode
      });
      setWorkflowName("");
      setWorkflowDescription("");
      setWorkflowFolderId("");
      setSelectedWorkflowId(id);
      await refreshAll();
      await loadWorkflow(id);
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  }

  async function handleDeleteWorkflow(id: string) {
    if (configLocked) return;
    setErrorMessage("");
    try {
      await deleteWorkflow(id);
      setSelectedWorkflowId(null);
      setSteps([]);
      setEdges([]);
      await refreshAll();
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  }

  async function loadWorkflow(id: string) {
    setErrorMessage("");
    try {
      const data = await getWorkflow(id);
      setSelectedWorkflowId(id);
      setSteps(data.steps);
      setEdges(data.edges);
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  }

  async function handleCreateStep() {
    if (!selectedWorkflowId) return;
    if (configLocked) return;
    setErrorMessage("");
    try {
      await createStep({
        workflowId: selectedWorkflowId,
        name: stepName,
        description: stepDescription,
        providerId: stepProviderId,
        model: stepModel || null,
        maxIterations: Number(stepIterations || 10),
        skills: stepSkills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        successCriteria: stepSuccess || null,
        failureCriteria: stepFailure || null,
        posX: Math.random() * 300,
        posY: Math.random() * 200
      });
      setStepName("");
      setStepDescription("");
      setStepProviderId("");
      setStepModel("");
      setStepIterations("10");
      setStepSkills("");
      setStepSuccess("");
      setStepFailure("");
      await loadWorkflow(selectedWorkflowId);
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  }

  async function handleUpdateStepPosition(stepId: string, posX: number, posY: number) {
    if (configLocked) return;
    setErrorMessage("");
    try {
      await updateStep(stepId, { posX, posY });
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  }

  async function handleDeleteStep(id: string) {
    if (configLocked) return;
    setErrorMessage("");
    try {
      await deleteStep(id);
      if (selectedStepId === id) setSelectedStepId(null);
      if (selectedWorkflowId) await loadWorkflow(selectedWorkflowId);
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  }

  async function handleCreateEdge() {
    if (!selectedWorkflowId) return;
    if (configLocked) return;
    setErrorMessage("");
    try {
      await createEdge({
        workflowId: selectedWorkflowId,
        fromStepId: edgeFrom,
        toStepId: edgeTo,
        type: edgeType
      });
      setEdgeFrom("");
      setEdgeTo("");
      if (selectedWorkflowId) await loadWorkflow(selectedWorkflowId);
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  }

  async function handleDeleteEdge(edgeId: string) {
    setErrorMessage("");
    try {
      await deleteEdge(edgeId);
      if (selectedWorkflowId) await loadWorkflow(selectedWorkflowId);
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  }

  async function handleExecute() {
    if (!selectedWorkflowId) return;
    setErrorMessage("");
    try {
      const { runId } = await executeWorkflow(selectedWorkflowId, goalText);
      setRunId(runId);
      await refreshRun(runId);
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  }

  async function refreshRun(id: string) {
    try {
      const data = await getRun(id);
      setRunStatus(data.run.status);
      setRunSteps(data.steps);
    } catch (err) {
      setErrorMessage((err as Error).message);
    }
  }

  const nodes = useMemo<Node[]>(() => {
    return steps.map((step) => ({
      id: step.id,
      type: "default",
      position: { x: step.pos_x, y: step.pos_y },
      data: {
        name: step.name,
        provider: providers.find((p) => p.id === step.provider_id)?.name || "provider"
      }
    }));
  }, [steps, providers]);

  const flowEdges = useMemo<Edge[]>(() => {
    return edges.map((edge) => {
      const style =
        edge.type === "callback"
          ? { strokeDasharray: "2 4" }
          : edge.type === "support"
          ? { strokeDasharray: "6 4" }
          : edge.type === "failure"
          ? { strokeDasharray: "1 6" }
          : { strokeDasharray: "4 4" };
      return {
        id: edge.id,
        source: edge.from_step_id,
        target: edge.to_step_id,
        style
      } as Edge;
    });
  }, [edges]);

  const nodeTypes = useMemo(() => ({
    default: StepNode
  }), []);

  const onNodesChange: OnNodesChange = async (changes: NodeChange[]) => {
    for (const change of changes) {
      if (change.type === "position" && change.position && change.id) {
        await handleUpdateStepPosition(change.id, change.position.x, change.position.y);
      }
    }
  };

  const onEdgesChange: OnEdgesChange = async (changes: EdgeChange[]) => {
    for (const change of changes) {
      if (change.type === "remove" && change.id) {
        await handleDeleteEdge(change.id);
      }
    }
  };

  const onConnect = async (connection: Connection) => {
    if (!selectedWorkflowId || !connection.source || !connection.target) return;
    await createEdge({
      workflowId: selectedWorkflowId,
      fromStepId: connection.source,
      toStepId: connection.target,
      type: "next"
    });
    await loadWorkflow(selectedWorkflowId);
  };

  const selectedStep = steps.find((step) => step.id === selectedStepId) || null;

  return (
    <div data-testid="app-root" className="min-h-screen">
      <header
        data-testid="app-header"
        className="flex items-center justify-between border-b border-slate/10 bg-white/70 px-8 py-6 backdrop-blur"
      >
        <div data-testid="header-left" className="flex flex-col">
          <h1 data-testid="header-title" className="font-display text-2xl font-semibold tracking-tight">
            Workflow Claw
          </h1>
          <p data-testid="header-subtitle" className="text-sm text-slate/60">
            Orchestrate local LLM workflows with clean context.
          </p>
        </div>
        <div data-testid="header-right" className="flex items-center gap-2">
          <span data-testid="header-lock" className="rounded-full border border-slate/20 px-3 py-1 text-xs">
            Vault: {unlocked ? "Unlocked" : "Locked"}
          </span>
        </div>
      </header>

      <main
        data-testid="app-main"
        className="grid gap-6 px-8 py-8 lg:grid-cols-[360px_1fr]"
      >
        <aside data-testid="sidebar" className="space-y-6">
          <Section title="Vault Unlock" testId="section-vault">
            <Field
              label="Passphrase"
              value={passphrase}
              onChange={setPassphrase}
              placeholder="Enter vault passphrase"
              testId="vault-passphrase"
              type="password"
            />
            <PrimaryButton label="Unlock" onClick={handleUnlock} testId="vault-unlock-button" />
          </Section>

          <Section title="Provider Setup" testId="section-providers">
            <SelectField
              label="Preset"
              value={providerPresetKey}
              onChange={(value) => setProviderPresetKey(value as "claude" | "codex")}
              options={[
                { label: "Claude Code", value: "claude" },
                { label: "OpenAI Codex", value: "codex" }
              ]}
              testId="provider-preset"
            />
            <Field label="Name" value={providerName} onChange={setProviderName} testId="provider-name" />
            <Field label="CLI Command" value={providerCli} onChange={setProviderCli} testId="provider-cli" />
            <TextArea
              label="Command Template"
              value={providerTemplate}
              onChange={setProviderTemplate}
              placeholder='--model {{model}} --prompt "{{prompt}}"'
              testId="provider-template"
            />
            <Field
              label="Default Model"
              value={providerModel}
              onChange={setProviderModel}
              placeholder="Leave empty for CLI default"
              testId="provider-model"
            />
            <TextArea
              label="Env Vars (JSON)"
              value={providerEnvJson}
              onChange={setProviderEnvJson}
              placeholder='{\"KEY\":\"value\"}'
              testId="provider-env"
            />
            <PrimaryButton label="Add Provider" onClick={handleCreateProvider} testId="provider-add" />
            <div data-testid="provider-list" className="space-y-2">
              {providers.map((provider) => (
                <div
                  data-testid={`provider-card-${provider.id}`}
                  key={provider.id}
                  className="rounded-lg border border-slate/10 bg-white p-3"
                >
                  <p data-testid={`provider-card-${provider.id}-name`} className="text-sm font-semibold">
                    {provider.name}
                  </p>
                  <p data-testid={`provider-card-${provider.id}-cli`} className="text-xs text-slate/60">
                    {provider.cliCommand}
                  </p>
                  <GhostButton
                    label="Delete"
                    onClick={() => handleDeleteProvider(provider.id)}
                    testId={`provider-card-${provider.id}-delete`}
                  />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Project Folders" testId="section-folders">
            <Field
              label="Folder Path"
              value={folderPath}
              onChange={setFolderPath}
              placeholder="/path/to/project"
              testId="folder-path"
            />
            <Field
              label="Label"
              value={folderLabel}
              onChange={setFolderLabel}
              placeholder="Optional label"
              testId="folder-label"
            />
            <PrimaryButton label="Add Folder" onClick={handleCreateFolder} testId="folder-add" />
            <div data-testid="folder-list" className="space-y-2">
              {folders.map((folder) => (
                <div
                  data-testid={`folder-card-${folder.id}`}
                  key={folder.id}
                  className="rounded-lg border border-slate/10 bg-white p-3"
                >
                  <p data-testid={`folder-card-${folder.id}-path`} className="text-xs text-slate/70">
                    {folder.path}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Workflow Builder" testId="section-workflow">
            <Field label="Name" value={workflowName} onChange={setWorkflowName} testId="workflow-name" />
            <TextArea
              label="Description"
              value={workflowDescription}
              onChange={setWorkflowDescription}
              testId="workflow-description"
            />
            <SelectField
              label="Folder"
              value={workflowFolderId}
              onChange={setWorkflowFolderId}
              options={[{ label: "Select folder", value: "" }, ...folders.map((f) => ({ label: f.path, value: f.id }))]}
              testId="workflow-folder"
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
            />
            <PrimaryButton label="Create Workflow" onClick={handleCreateWorkflow} testId="workflow-create" />
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
                  />
                </div>
              ))}
            </div>
          </Section>
        </aside>

        <section data-testid="main-panel" className="space-y-6">
          <Section title="Steps" testId="section-steps">
            <div data-testid="steps-grid" className="grid gap-4 md:grid-cols-2">
              <div data-testid="steps-form" className="space-y-3">
                <Field label="Step Name" value={stepName} onChange={setStepName} testId="step-name" />
                <TextArea
                  label="Description"
                  value={stepDescription}
                  onChange={setStepDescription}
                  testId="step-description"
                />
                <SelectField
                  label="Provider"
                  value={stepProviderId}
                  onChange={setStepProviderId}
                  options={[{ label: "Select provider", value: "" }, ...providers.map((p) => ({ label: p.name, value: p.id }))]}
                  testId="step-provider"
                />
                <Field
                  label="Model"
                  value={stepModel}
                  onChange={setStepModel}
                  placeholder="Leave empty for provider default"
                  testId="step-model"
                />
                <Field
                  label="Max Iterations"
                  value={stepIterations}
                  onChange={setStepIterations}
                  testId="step-iterations"
                />
                <TagInput
                  label="Skills"
                  value={stepSkills}
                  onChange={setStepSkills}
                  placeholder="build-report.sh, analyze.sh"
                  testId="step-skills"
                />
                <TextArea
                  label="Success Criteria"
                  value={stepSuccess}
                  onChange={setStepSuccess}
                  testId="step-success"
                />
                <TextArea
                  label="Failure Criteria"
                  value={stepFailure}
                  onChange={setStepFailure}
                  testId="step-failure"
                />
                <PrimaryButton label="Add Step" onClick={handleCreateStep} testId="step-add" />
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
                      onClick={() => setSelectedStepId(step.id)}
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
                    />
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Connections" testId="section-edges">
            <div data-testid="edge-form" className="grid gap-3 md:grid-cols-3">
              <SelectField
                label="From"
                value={edgeFrom}
                onChange={setEdgeFrom}
                options={[{ label: "Select step", value: "" }, ...steps.map((s) => ({ label: s.name, value: s.id }))]}
                testId="edge-from"
              />
              <SelectField
                label="To"
                value={edgeTo}
                onChange={setEdgeTo}
                options={[{ label: "Select step", value: "" }, ...steps.map((s) => ({ label: s.name, value: s.id }))]}
                testId="edge-to"
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
              />
            </div>
            <PrimaryButton label="Add Connection" onClick={handleCreateEdge} testId="edge-add" />
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
                  />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Workflow Canvas" testId="section-canvas">
            <div data-testid="canvas-wrapper" className="h-[480px] rounded-2xl border border-slate/10 bg-white">
              <ReactFlow
                data-testid="workflow-canvas"
                nodes={nodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={(_, node) => setSelectedStepId(node.id)}
                fitView
              >
                <Background data-testid="canvas-background" gap={24} size={1} />
                <Controls data-testid="canvas-controls" />
                <MiniMap data-testid="canvas-minimap" />
              </ReactFlow>
            </div>
          </Section>

          <Section title="Run Workflow" testId="section-run">
            <TextArea
              label="Goal / Task"
              value={goalText}
              onChange={setGoalText}
              testId="run-goal"
            />
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
            {runId && (
              <GhostButton label="Refresh" onClick={() => refreshRun(runId)} testId="run-refresh" />
            )}
          </Section>

          {errorMessage && (
            <div data-testid="error-banner" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
