export type ProviderInput = {
  name: string;
  cliCommand: string;
  template: string;
  defaultModel?: string | null;
  envVars?: Record<string, string>;
};

export type WorkflowInput = {
  name: string;
  description?: string | null;
  folderId: string;
  executionMode: "sequential" | "parallel";
};

export type StepInput = {
  workflowId: string;
  name: string;
  description: string;
  providerId: string;
  model?: string | null;
  maxIterations: number;
  skills: string[];
  successCriteria?: string | null;
  failureCriteria?: string | null;
  posX: number;
  posY: number;
};

export type EdgeInput = {
  workflowId: string;
  fromStepId: string;
  toStepId: string;
  type: "next" | "support" | "callback" | "failure";
};

const jsonHeaders = {
  "Content-Type": "application/json"
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function unlockVault(passphrase: string) {
  return request<{ ok: boolean }>("/api/unlock", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ passphrase })
  });
}

export async function lockVault() {
  return request<{ ok: boolean }>("/api/lock", {
    method: "POST"
  });
}

export async function getVaultStatus() {
  return request<{ unlocked: boolean }>("/api/vault");
}

export async function listProviders() {
  return request<any[]>("/api/providers");
}

export async function createProvider(input: ProviderInput) {
  return request<{ id: string }>("/api/providers", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input)
  });
}

export async function updateProvider(id: string, input: Partial<ProviderInput>) {
  return request<{ ok: boolean }>(`/api/providers/${id}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(input)
  });
}

export async function deleteProvider(id: string) {
  return request<void>(`/api/providers/${id}`, {
    method: "DELETE"
  });
}

export async function listFolders() {
  return request<any[]>("/api/folders");
}

export async function createFolder(path: string, label?: string | null) {
  return request<{ id: string }>("/api/folders", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ path, label })
  });
}

export async function updateFolder(id: string, input: { path?: string; label?: string | null }) {
  return request<{ ok: boolean }>(`/api/folders/${id}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(input)
  });
}

export async function deleteFolder(id: string) {
  return request<void>(`/api/folders/${id}`, {
    method: "DELETE"
  });
}

export async function listWorkflows() {
  return request<any[]>("/api/workflows");
}

export async function getWorkflow(id: string) {
  return request<{ workflow: any; steps: any[]; edges: any[] }>(`/api/workflows/${id}`);
}

export async function createWorkflow(input: WorkflowInput) {
  return request<{ id: string }>("/api/workflows", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input)
  });
}

export async function updateWorkflow(id: string, input: Partial<WorkflowInput>) {
  return request<{ ok: boolean }>(`/api/workflows/${id}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(input)
  });
}

export async function deleteWorkflow(id: string) {
  return request<void>(`/api/workflows/${id}`, {
    method: "DELETE"
  });
}

export async function createStep(input: StepInput) {
  return request<{ id: string }>("/api/steps", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input)
  });
}

export async function updateStep(id: string, input: Partial<StepInput>) {
  return request<{ ok: boolean }>(`/api/steps/${id}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(input)
  });
}

export async function deleteStep(id: string) {
  return request<void>(`/api/steps/${id}`, {
    method: "DELETE"
  });
}

export async function createEdge(input: EdgeInput) {
  return request<{ id: string }>("/api/edges", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(input)
  });
}

export async function deleteEdge(id: string) {
  return request<void>(`/api/edges/${id}`, {
    method: "DELETE"
  });
}

export async function executeWorkflow(workflowId: string, goal: string) {
  return request<{ runId: string }>(`/api/workflows/${workflowId}/execute`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ goal })
  });
}

export async function getRun(runId: string) {
  return request<{ run: any; steps: any[] }>(`/api/runs/${runId}`);
}
