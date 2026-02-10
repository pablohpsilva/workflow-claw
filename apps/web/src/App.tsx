import React, { useEffect, useMemo, useState } from "react";
import {
  Node,
  Edge,
  MarkerType,
  Connection,
  OnNodesChange,
  OnEdgesChange,
  NodeChange,
  EdgeChange
} from "reactflow";
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
  updateStep
} from "./api";
import {
  EdgeRecord,
  Folder,
  Provider,
  ProviderPresetKey,
  Step,
  Workflow
} from "./types";
import AppHeader from "./components/layout/AppHeader";
import VaultSection from "./components/sections/VaultSection";
import ProvidersSection from "./components/sections/ProvidersSection";
import FoldersSection from "./components/sections/FoldersSection";
import WorkflowSection from "./components/sections/WorkflowSection";
import StepsSection from "./components/sections/StepsSection";
import EdgesSection from "./components/sections/EdgesSection";
import CanvasSection from "./components/sections/CanvasSection";
import RunSection from "./components/sections/RunSection";
import ProviderModal from "./components/modals/ProviderModal";
import FolderModal from "./components/modals/FolderModal";
import StepNode from "./components/flow/StepNode";

const providerPresets: Record<Exclude<ProviderPresetKey, "custom">, { name: string; cliCommand: string; template: string }> = {
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

  const [providerPresetKey, setProviderPresetKey] = useState<ProviderPresetKey>("claude");
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
    if (configLocked) return;
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
        style,
        markerEnd: {
          type: MarkerType.ArrowClosed
        }
      } as Edge;
    });
  }, [edges]);

  const nodeTypes = useMemo(
    () => ({
      default: StepNode
    }),
    []
  );

  const onNodesChange: OnNodesChange = (changes: NodeChange[]) => {
    if (configLocked) return;
    const positionChanges = changes.filter(
      (change) => change.type === "position" && !!change.position && !!change.id
    ) as Array<NodeChange & { position: { x: number; y: number } }>;
    if (positionChanges.length === 0) return;

    const changeMap = new Map(positionChanges.map((change) => [change.id, change.position]));
    setSteps((prev) =>
      prev.map((step) => {
        const position = changeMap.get(step.id);
        if (!position) return step;
        return {
          ...step,
          pos_x: position.x,
          pos_y: position.y
        };
      })
    );
  };

  const onNodeDragStop = async (_: React.MouseEvent | React.TouchEvent, node: Node) => {
    if (configLocked) return;
    await handleUpdateStepPosition(node.id, node.position.x, node.position.y);
  };

  const onEdgesChange: OnEdgesChange = async (changes: EdgeChange[]) => {
    if (configLocked) return;
    for (const change of changes) {
      if (change.type === "remove" && change.id) {
        await handleDeleteEdge(change.id);
      }
    }
  };

  const onConnect = async (connection: Connection) => {
    if (configLocked) return;
    if (!selectedWorkflowId || !connection.source || !connection.target) return;
    await createEdge({
      workflowId: selectedWorkflowId,
      fromStepId: connection.source,
      toStepId: connection.target,
      type: "next"
    });
    await loadWorkflow(selectedWorkflowId);
  };

  const providerModalTitle = editingProviderId ? "Edit Provider" : "Add Provider";
  const providerSaveLabel = editingProviderId ? "Save Provider" : "Add Provider";
  const folderModalTitle = editingFolderId ? "Edit Folder" : "Add Folder";
  const folderSaveLabel = editingFolderId ? "Save Folder" : "Add Folder";

  return (
    <div data-testid="app-root" className="min-h-screen">
      <AppHeader vaultUnlocked={vaultUnlocked} />

      <main data-testid="app-main" className="grid gap-6 px-8 py-8 lg:grid-cols-[360px_1fr]">
        <aside data-testid="sidebar" className="space-y-6">
          <VaultSection
            vaultUnlocked={vaultUnlocked}
            passphrase={passphrase}
            setPassphrase={setPassphrase}
            handleUnlock={handleUnlock}
            handleLock={handleLock}
          />

          {configLocked && (
            <div
              data-testid="vault-locked-banner"
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800"
            >
              Vault locked. Unlock to edit configurations.
            </div>
          )}

          <ProvidersSection
            providers={providers}
            configLocked={configLocked}
            openAddProviderModal={openAddProviderModal}
            openEditProviderModal={openEditProviderModal}
            handleDeleteProvider={handleDeleteProvider}
          />

          <FoldersSection
            folders={folders}
            configLocked={configLocked}
            openAddFolderModal={openAddFolderModal}
            openEditFolderModal={openEditFolderModal}
            handleDeleteFolder={handleDeleteFolder}
          />

          <WorkflowSection
            workflowName={workflowName}
            setWorkflowName={setWorkflowName}
            workflowDescription={workflowDescription}
            setWorkflowDescription={setWorkflowDescription}
            workflowFolderId={workflowFolderId}
            setWorkflowFolderId={setWorkflowFolderId}
            workflowMode={workflowMode}
            setWorkflowMode={setWorkflowMode}
            folders={folders}
            workflows={workflows}
            selectedWorkflowId={selectedWorkflowId}
            loadWorkflow={loadWorkflow}
            handleCreateWorkflow={handleCreateWorkflow}
            handleDeleteWorkflow={handleDeleteWorkflow}
            configLocked={configLocked}
          />
        </aside>

        <section data-testid="main-panel" className="space-y-6">
          <StepsSection
            stepName={stepName}
            setStepName={setStepName}
            stepDescription={stepDescription}
            setStepDescription={setStepDescription}
            stepProviderId={stepProviderId}
            setStepProviderId={setStepProviderId}
            stepModel={stepModel}
            setStepModel={setStepModel}
            stepIterations={stepIterations}
            setStepIterations={setStepIterations}
            stepSkills={stepSkills}
            setStepSkills={setStepSkills}
            stepSuccess={stepSuccess}
            setStepSuccess={setStepSuccess}
            stepFailure={stepFailure}
            setStepFailure={setStepFailure}
            handleCreateStep={handleCreateStep}
            steps={steps}
            selectedStepId={selectedStepId}
            setSelectedStepId={setSelectedStepId}
            handleDeleteStep={handleDeleteStep}
            providers={providers}
            configLocked={configLocked}
          />

          <EdgesSection
            edgeFrom={edgeFrom}
            setEdgeFrom={setEdgeFrom}
            edgeTo={edgeTo}
            setEdgeTo={setEdgeTo}
            edgeType={edgeType}
            setEdgeType={setEdgeType}
            steps={steps}
            edges={edges}
            configLocked={configLocked}
            handleCreateEdge={handleCreateEdge}
            handleDeleteEdge={handleDeleteEdge}
          />

          <CanvasSection
            nodes={nodes}
            flowEdges={flowEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onNodeDragStop={onNodeDragStop}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            configLocked={configLocked}
            setSelectedStepId={setSelectedStepId}
          />

          <RunSection
            goalText={goalText}
            setGoalText={setGoalText}
            handleExecute={handleExecute}
            runId={runId}
            runStatus={runStatus}
            runSteps={runSteps}
            refreshRun={refreshRun}
          />

          {errorMessage && (
            <div data-testid="error-banner" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
        </section>
      </main>

      <ProviderModal
        title={providerModalTitle}
        open={isProviderModalOpen}
        onClose={() => setIsProviderModalOpen(false)}
        providerPresetKey={providerPresetKey}
        setProviderPresetKey={setProviderPresetKey}
        providerName={providerName}
        setProviderName={setProviderName}
        providerCli={providerCli}
        setProviderCli={setProviderCli}
        providerTemplate={providerTemplate}
        setProviderTemplate={setProviderTemplate}
        providerModel={providerModel}
        setProviderModel={setProviderModel}
        providerEnvJson={providerEnvJson}
        setProviderEnvJson={setProviderEnvJson}
        editingProviderId={editingProviderId}
        saveLabel={providerSaveLabel}
        handleSaveProvider={handleSaveProvider}
        configLocked={configLocked}
      />

      <FolderModal
        title={folderModalTitle}
        open={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        folderLabel={folderLabel}
        setFolderLabel={setFolderLabel}
        folderPath={folderPath}
        setFolderPath={setFolderPath}
        saveLabel={folderSaveLabel}
        handleSaveFolder={handleSaveFolder}
        configLocked={configLocked}
      />
    </div>
  );
}
