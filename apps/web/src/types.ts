export type Provider = {
  id: string;
  name: string;
  cliCommand: string;
  template: string;
  defaultModel: string | null;
  createdAt: string;
  updatedAt: string;
  hasEnv: boolean;
};

export type Folder = {
  id: string;
  path: string;
  label: string | null;
  created_at?: string;
};

export type Workflow = {
  id: string;
  name: string;
  description: string | null;
  folder_id: string;
  execution_mode: "sequential" | "parallel";
};

export type Step = {
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

export type EdgeRecord = {
  id: string;
  workflow_id: string;
  from_step_id: string;
  to_step_id: string;
  type: "next" | "support" | "callback" | "failure";
};

export type Run = {
  id: string;
  workflow_id: string;
  status: "running" | "success" | "failed" | "needs_input";
  goal: string;
  started_at: string;
  ended_at: string | null;
};

export type StepRun = {
  id: string;
  run_id: string;
  step_id: string;
  status: "running" | "success" | "failed" | "needs_input";
  iteration: number;
  stdout: string | null;
  stderr: string | null;
  summary: string | null;
  created_at: string;
};

export type StepStatusSummary = {
  run_id: string;
  step_id: string;
  status: "running" | "success" | "failed" | "needs_input";
  iteration: number;
  created_at: string;
};

export type ProviderPresetKey = "claude" | "codex" | "custom";
