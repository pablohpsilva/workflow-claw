import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import slugify from "slugify";
import type { RuleFile } from "./rules.js";
import { listRules } from "./rules.js";
import { buildMemoryPrompt, scanProject } from "./memory.js";
import { runCli } from "./cli.js";
import { decryptSecret, isUnlocked } from "./crypto.js";
import { getDb } from "./db.js";
import type { StepOutput } from "@workflow-claw/shared";
import { runSkill } from "./skills.js";

const prdLocks = new Map<string, Promise<void>>();

async function withPrdLock(prdPath: string, fn: () => void) {
  const current = prdLocks.get(prdPath) ?? Promise.resolve();
  let nextResolve: (() => void) | undefined;
  const next = new Promise<void>((resolve) => {
    nextResolve = resolve;
  });
  prdLocks.set(prdPath, current.then(() => next));
  await current;
  try {
    fn();
  } finally {
    if (nextResolve) nextResolve();
  }
}

function now() {
  return new Date().toISOString();
}

function getProjectPaths(folderPath: string, goal: string) {
  const prdDir = path.join(folderPath, "PRDs");
  if (!fs.existsSync(prdDir)) fs.mkdirSync(prdDir, { recursive: true });
  const slug = slugify(goal, { lower: true, strict: true }).slice(0, 60) || "workflow";
  const date = new Date().toISOString().slice(0, 10);
  const prdPath = path.join(prdDir, `${date}_${slug}.md`);
  const memoryPath = fs.existsSync(path.join(folderPath, "MEMORY.md"))
    ? path.join(folderPath, "MEMORY.md")
    : path.join(folderPath, "CLAUDE.md");
  return { prdPath, memoryPath };
}

async function ensureMemory(folderPath: string, provider: ProviderRecord) {
  const memoryPath = path.join(folderPath, "MEMORY.md");
  const claudePath = path.join(folderPath, "CLAUDE.md");
  if (fs.existsSync(memoryPath) || fs.existsSync(claudePath)) return;

  const files = scanProject(folderPath);
  const prompt = buildMemoryPrompt(files);
  const result = await runCli({
    cliCommand: provider.cli_command,
    template: provider.template,
    env: getProviderEnv(provider),
    prompt,
    model: provider.default_model,
    cwd: folderPath,
    stepName: "memory-generator",
    prdPath: path.join(folderPath, "PRDs"),
    memoryPath
  });

  fs.writeFileSync(memoryPath, result.stdout, "utf8");
}

function loadMemoryText(folderPath: string) {
  const memoryPath = path.join(folderPath, "MEMORY.md");
  const claudePath = path.join(folderPath, "CLAUDE.md");
  if (fs.existsSync(memoryPath)) return fs.readFileSync(memoryPath, "utf8");
  if (fs.existsSync(claudePath)) return fs.readFileSync(claudePath, "utf8");
  return "";
}

function getMemoryPath(folderPath: string) {
  const memoryPath = path.join(folderPath, "MEMORY.md");
  const claudePath = path.join(folderPath, "CLAUDE.md");
  if (fs.existsSync(memoryPath)) return memoryPath;
  if (fs.existsSync(claudePath)) return claudePath;
  return memoryPath;
}

function ensureRulesAndSkills(folderPath: string) {
  const rulesDir = path.join(folderPath, "rules");
  const skillsDir = path.join(folderPath, "skills");
  if (!fs.existsSync(rulesDir)) fs.mkdirSync(rulesDir, { recursive: true });
  if (!fs.existsSync(skillsDir)) fs.mkdirSync(skillsDir, { recursive: true });
  return { rulesDir, skillsDir };
}

function getProviderEnv(provider: ProviderRecord) {
  if (!provider.env_enc) return undefined;
  if (!isUnlocked()) return undefined;
  const raw = decryptSecret(provider.env_enc);
  return JSON.parse(raw) as Record<string, string>;
}

function buildStepPrompt({
  goal,
  step,
  prdText,
  memoryText,
  rules
}: {
  goal: string;
  step: StepRecord;
  prdText: string;
  memoryText: string;
  rules: RuleFile[];
}) {
  const rulesBlock = rules.map((rule) => `# ${rule.header.name}\n${rule.body}`).join("\n\n");
  return `You are an autonomous LLM step in a workflow.\n\nGoal:\n${goal}\n\nStep Name: ${step.name}\nStep Description: ${step.description}\nSuccess Criteria: ${step.success_criteria ?? ""}\nFailure Criteria: ${step.failure_criteria ?? ""}\n\nPRD:\n${prdText}\n\nMEMORY:\n${memoryText}\n\nRULES:\n${rulesBlock}\n\nReturn JSON ONLY with:\n{\n  "status": "success"|"fail"|"needs_input",\n  "summary": string,\n  "files_modified": string[],\n  "checks": string[],\n  "next_actions": string[]\n}\n`;
}

async function selectRules({
  provider,
  folderPath,
  step,
  prdText,
  memoryText,
  rules
}: {
  provider: ProviderRecord;
  folderPath: string;
  step: StepRecord;
  prdText: string;
  memoryText: string;
  rules: RuleFile[];
}) {
  if (rules.length === 0) return [] as RuleFile[];
  const headerList = rules
    .map((rule) => `- ${rule.header.name}: ${rule.header.description}`)
    .join("\n");

  const prompt = `You are selecting relevant rules for a step.\n\nStep: ${step.name}\nDescription: ${step.description}\n\nPRD Summary:\n${prdText.slice(0, 1200)}\n\nMEMORY Summary:\n${memoryText.slice(0, 1200)}\n\nRules:\n${headerList}\n\nReturn JSON array of rule names to include.`;

  const result = await runCli({
    cliCommand: provider.cli_command,
    template: provider.template,
    env: getProviderEnv(provider),
    prompt,
    model: step.model ?? provider.default_model,
    cwd: folderPath,
    stepName: `${step.name}-rule-select`,
    prdPath: "",
    memoryPath: ""
  });

  try {
    const names = JSON.parse(result.stdout) as string[];
    return rules.filter((rule) => names.includes(rule.header.name));
  } catch {
    return rules;
  }
}

async function appendAgentUpdate(prdPath: string, stepName: string, output: StepOutput) {
  await withPrdLock(prdPath, () => {
    const sectionHeader = "## Agent Updates";
    let prd = fs.existsSync(prdPath) ? fs.readFileSync(prdPath, "utf8") : "";
    if (!prd.includes(sectionHeader)) {
      prd = `${prd.trim()}\n\n${sectionHeader}\n`;
    }
    const entry = `\n### ${stepName}\n- Status: ${output.status}\n- Summary: ${output.summary}\n- Files: ${output.files_modified.join(", ") || "none"}\n- Checks: ${output.checks.join(", ") || "none"}\n- Next: ${output.next_actions.join(", ") || "none"}\n`;
    fs.writeFileSync(prdPath, `${prd.trim()}\n${entry}`, "utf8");
  });
}

function parseStepOutput(raw: string): StepOutput {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return {
      status: "fail",
      summary: "Failed to parse JSON output",
      files_modified: [],
      checks: [],
      next_actions: []
    };
  }
  try {
    const parsed = JSON.parse(match[0]);
    return {
      status: parsed.status,
      summary: parsed.summary ?? "",
      files_modified: parsed.files_modified ?? [],
      checks: parsed.checks ?? [],
      next_actions: parsed.next_actions ?? []
    };
  } catch {
    return {
      status: "fail",
      summary: "Failed to parse JSON output",
      files_modified: [],
      checks: [],
      next_actions: []
    };
  }
}

function getStartSteps(steps: StepRecord[], edges: EdgeRecord[]) {
  const incoming = new Set(edges.filter((e) => e.type === "next").map((e) => e.to_step_id));
  return steps.filter((s) => !incoming.has(s.id));
}

export async function executeWorkflow(workflowId: string, goal: string) {
  const db = getDb();
  const workflow = db.prepare("select * from workflows where id = ?").get(workflowId) as WorkflowRecord;
  const folder = db.prepare("select * from folders where id = ?").get(workflow.folder_id) as FolderRecord;
  const steps = db.prepare("select * from steps where workflow_id = ?").all(workflowId) as StepRecord[];
  const edges = db.prepare("select * from edges where workflow_id = ?").all(workflowId) as EdgeRecord[];

  const runId = crypto.randomUUID();
  db.prepare("insert into runs (id, workflow_id, status, goal, started_at) values (?, ?, ?, ?, ?)")
    .run(runId, workflowId, "running", goal, now());

  const { rulesDir } = ensureRulesAndSkills(folder.path);
  const rules = listRules(rulesDir);

  const providerMap = new Map<string, ProviderRecord>();
  for (const step of steps) {
    if (!providerMap.has(step.provider_id)) {
      const provider = db.prepare("select * from providers where id = ?").get(step.provider_id) as ProviderRecord;
      providerMap.set(step.provider_id, provider);
    }
  }

  const startSteps = getStartSteps(steps, edges);
  for (const step of startSteps) {
    await executeStep({
      db,
      folderPath: folder.path,
      goal,
      runId,
      step,
      edges,
      providerMap,
      rules,
      executionMode: workflow.execution_mode,
      iteration: 1
    });
  }

  const runStatus = db.prepare("select status from runs where id = ?").get(runId) as { status: string };
  if (runStatus.status === "running") {
    db.prepare("update runs set status = ?, ended_at = ? where id = ?")
      .run("success", now(), runId);
  }

  return runId;
}

async function executeStep({
  db,
  folderPath,
  goal,
  runId,
  step,
  edges,
  providerMap,
  rules,
  executionMode,
  iteration
}: {
  db: ReturnType<typeof getDb>;
  folderPath: string;
  goal: string;
  runId: string;
  step: StepRecord;
  edges: EdgeRecord[];
  providerMap: Map<string, ProviderRecord>;
  rules: RuleFile[];
  executionMode: "sequential" | "parallel";
  iteration: number;
}) {
  const provider = providerMap.get(step.provider_id);
  if (!provider) throw new Error("Provider missing");

  if (iteration > step.max_iterations) {
    return;
  }

  await ensureMemory(folderPath, provider);
  const { prdPath } = getProjectPaths(folderPath, goal);
  if (!fs.existsSync(prdPath)) {
    fs.writeFileSync(prdPath, `# PRD\n\nGoal: ${goal}\n`, "utf8");
  }

  const prdText = fs.readFileSync(prdPath, "utf8");
  const memoryText = loadMemoryText(folderPath);
  const selectedRules = await selectRules({ provider, folderPath, step, prdText, memoryText, rules });
  const skillsDir = path.join(folderPath, "skills");
  const skills = JSON.parse(step.skills_json) as string[];
  const skillResults = [] as unknown[];
  for (const skill of skills) {
    const result = await runSkill({
      skillsDir,
      name: skill,
      input: { goal, step, prd: prdText, memory: memoryText }
    });
    skillResults.push(result);
  }
  const prompt = buildStepPrompt({ goal, step, prdText, memoryText, rules: selectedRules });

  const stepRunId = crypto.randomUUID();
  db.prepare(
    "insert into step_runs (id, run_id, step_id, status, iteration, created_at) values (?, ?, ?, ?, ?, ?)"
  ).run(stepRunId, runId, step.id, "running", iteration, now());

  let stdoutBuffer = "";
  let pendingBuffer = "";
  let lastFlush = 0;
  const flushOutput = (force = false) => {
    if (!force && pendingBuffer.length === 0) return;
    db.prepare("update step_runs set stdout = ? where id = ?").run(stdoutBuffer, stepRunId);
    pendingBuffer = "";
    lastFlush = Date.now();
  };

  const result = await runCli({
    cliCommand: provider.cli_command,
    template: provider.template,
    env: getProviderEnv(provider),
    prompt: `${prompt}\n\nSkill Outputs:\n${JSON.stringify(skillResults)}`,
    model: step.model ?? provider.default_model,
    cwd: folderPath,
    stepName: step.name,
    prdPath,
    memoryPath: getMemoryPath(folderPath),
    onData: (chunk) => {
      stdoutBuffer += chunk;
      pendingBuffer += chunk;
      const nowMs = Date.now();
      if (pendingBuffer.length >= 1024 || nowMs - lastFlush >= 250) {
        flushOutput();
      }
    }
  });

  flushOutput(true);
  const output = parseStepOutput(result.stdout);
  await appendAgentUpdate(prdPath, step.name, output);

  db.prepare(
    "update step_runs set status = ?, stdout = ?, stderr = ?, summary = ? where id = ?"
  ).run(output.status, result.stdout, result.stderr, output.summary, stepRunId);

  if (output.status === "needs_input") {
    db.prepare("update runs set status = ?, ended_at = ? where id = ?").run("needs_input", now(), runId);
    return;
  }

  if (output.status === "fail") {
    const failureEdges = edges.filter((e) => e.from_step_id === step.id && e.type === "failure");
    if (failureEdges.length === 0) {
      db.prepare("update runs set status = ?, ended_at = ? where id = ?").run("failed", now(), runId);
      return;
    }
    for (const edge of failureEdges) {
      const next = db.prepare("select * from steps where id = ?").get(edge.to_step_id) as StepRecord;
      await executeStep({
        db,
        folderPath,
        goal,
        runId,
        step: next,
        edges,
        providerMap,
        rules,
        executionMode,
        iteration: 1
      });
    }
    return;
  }

  const nextEdges = edges.filter((e) => e.from_step_id === step.id && e.type === "next");
  const supportEdges = edges.filter((e) => e.from_step_id === step.id && e.type === "support");
  const callbackEdges = edges.filter((e) => e.from_step_id === step.id && e.type === "callback");

  if (supportEdges.length > 0) {
    const supportTasks = supportEdges.map((edge) => {
      const next = db.prepare("select * from steps where id = ?").get(edge.to_step_id) as StepRecord;
      return executeStep({
        db,
        folderPath,
        goal,
        runId,
        step: next,
        edges,
        providerMap,
        rules,
        executionMode,
        iteration: 1
      });
    });
    if (executionMode === "parallel") {
      await Promise.all(supportTasks);
    } else {
      for (const task of supportTasks) {
        await task;
      }
    }
  }

  if (executionMode === "parallel") {
    await Promise.all(
      nextEdges.map((edge) => {
        const next = db.prepare("select * from steps where id = ?").get(edge.to_step_id) as StepRecord;
        return executeStep({
          db,
          folderPath,
          goal,
          runId,
          step: next,
          edges,
          providerMap,
          rules,
          executionMode,
          iteration: 1
        });
      })
    );
  } else {
    for (const edge of nextEdges) {
      const next = db.prepare("select * from steps where id = ?").get(edge.to_step_id) as StepRecord;
      await executeStep({
        db,
        folderPath,
        goal,
        runId,
        step: next,
        edges,
        providerMap,
        rules,
        executionMode,
        iteration: 1
      });
    }
  }

  for (const edge of callbackEdges) {
    const next = db.prepare("select * from steps where id = ?").get(edge.to_step_id) as StepRecord;
    await executeStep({
      db,
      folderPath,
      goal,
      runId,
      step: next,
      edges,
      providerMap,
      rules,
      executionMode,
      iteration: 1
    });
    await executeStep({
      db,
      folderPath,
      goal,
      runId,
      step,
      edges,
      providerMap,
      rules,
      executionMode,
      iteration: iteration + 1
    });
  }
}

export type ProviderRecord = {
  id: string;
  name: string;
  cli_command: string;
  template: string;
  default_model: string | null;
  env_enc: string | null;
  created_at: string;
  updated_at: string;
};

export type FolderRecord = {
  id: string;
  path: string;
  label: string | null;
  created_at: string;
};

export type WorkflowRecord = {
  id: string;
  name: string;
  description: string | null;
  folder_id: string;
  execution_mode: "sequential" | "parallel";
  created_at: string;
  updated_at: string;
};

export type StepRecord = {
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
  created_at: string;
  updated_at: string;
};

export type EdgeRecord = {
  id: string;
  workflow_id: string;
  from_step_id: string;
  to_step_id: string;
  type: "next" | "support" | "callback" | "failure";
  created_at: string;
};
