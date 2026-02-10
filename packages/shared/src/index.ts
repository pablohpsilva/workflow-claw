export type ProviderConfig = {
  id: string;
  name: string;
  cliCommand: string;
  template: string;
  defaultModel: string | null;
  envVars?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type FolderConfig = {
  id: string;
  path: string;
  label: string | null;
  createdAt: string;
};

export type Workflow = {
  id: string;
  name: string;
  description: string | null;
  folderId: string;
  executionMode: "sequential" | "parallel";
  createdAt: string;
  updatedAt: string;
};

export type Step = {
  id: string;
  workflowId: string;
  name: string;
  description: string;
  providerId: string;
  model: string | null;
  maxIterations: number;
  skills: string[];
  successCriteria: string | null;
  failureCriteria: string | null;
  posX: number;
  posY: number;
  createdAt: string;
  updatedAt: string;
};

export type Edge = {
  id: string;
  workflowId: string;
  fromStepId: string;
  toStepId: string;
  type: "next" | "support" | "callback" | "failure";
  createdAt: string;
};

export type Run = {
  id: string;
  workflowId: string;
  status: "running" | "success" | "failed" | "needs_input";
  startedAt: string;
  endedAt: string | null;
};

export type StepRun = {
  id: string;
  runId: string;
  stepId: string;
  status: "running" | "success" | "failed" | "needs_input";
  iteration: number;
  stdout: string | null;
  stderr: string | null;
  summary: string | null;
  createdAt: string;
};

export type RuleHeader = {
  name: string;
  files: string[];
  description: string;
};

export type StepOutput = {
  status: "success" | "fail" | "needs_input";
  summary: string;
  files_modified: string[];
  checks: string[];
  next_actions: string[];
};

export type SkillResult = {
  status: "success" | "fail";
  summary: string;
  output?: Record<string, unknown>;
};
