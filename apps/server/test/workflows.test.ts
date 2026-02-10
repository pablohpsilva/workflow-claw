import { describe, expect, it, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

vi.mock("../src/cli.js", () => {
  return {
    runCli: vi.fn(async ({ stepName }: { stepName: string }) => {
      if (stepName === "Failing") {
        return {
          stdout: JSON.stringify({
            status: "fail",
            summary: "failed",
            files_modified: [],
            checks: [],
            next_actions: []
          }),
          stderr: "",
          exitCode: 0
        };
      }
      return {
        stdout: JSON.stringify({
          status: "success",
          summary: "ok",
          files_modified: [],
          checks: [],
          next_actions: []
        }),
        stderr: "",
        exitCode: 0
      };
    })
  };
});

vi.mock("../src/skills.js", () => {
  return {
    runSkill: vi.fn(async () => ({ name: "skill", status: "success", output: {} }))
  };
});

async function setupDb(tempHome: string) {
  vi.resetModules();
  process.env.WORKFLOW_CLAW_DATA_DIR = tempHome;
  const dbModule = await import("../src/db.js");
  const workflowsModule = await import("../src/workflows.js");
  const db = dbModule.getDb();
  return { db, workflowsModule };
}

function now() {
  return new Date().toISOString();
}

describe("workflow execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes sequential workflow and writes PRD updates", async () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "wf-"));
    const tempProject = fs.mkdtempSync(path.join(os.tmpdir(), "project-"));
    fs.writeFileSync(path.join(tempProject, "MEMORY.md"), "memory", "utf8");

    const { db, workflowsModule } = await setupDb(tempHome);

    const providerId = "provider-1";
    db.prepare(
      "insert into providers (id, name, cli_command, template, default_model, env_enc, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(providerId, "Claude", "claude", "--prompt {{prompt}}", null, null, now(), now());

    const folderId = "folder-1";
    db.prepare("insert into folders (id, path, label, created_at) values (?, ?, ?, ?)")
      .run(folderId, tempProject, null, now());

    const workflowId = "workflow-1";
    db.prepare(
      "insert into workflows (id, name, description, folder_id, execution_mode, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)"
    ).run(workflowId, "Test", null, folderId, "sequential", now(), now());

    const stepA = "step-a";
    const stepB = "step-b";
    db.prepare(
      "insert into steps (id, workflow_id, name, description, provider_id, model, max_iterations, skills_json, success_criteria, failure_criteria, pos_x, pos_y, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(stepA, workflowId, "Plan", "desc", providerId, null, 10, "[]", null, null, 0, 0, now(), now());
    db.prepare(
      "insert into steps (id, workflow_id, name, description, provider_id, model, max_iterations, skills_json, success_criteria, failure_criteria, pos_x, pos_y, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(stepB, workflowId, "Build", "desc", providerId, null, 10, "[]", null, null, 0, 0, now(), now());

    db.prepare(
      "insert into edges (id, workflow_id, from_step_id, to_step_id, type, created_at) values (?, ?, ?, ?, ?, ?)"
    ).run("edge-1", workflowId, stepA, stepB, "next", now());

    const runId = await workflowsModule.executeWorkflow(workflowId, "Ship feature");
    const run = db.prepare("select * from runs where id = ?").get(runId) as any;
    expect(run.status).toBe("success");

    const stepRuns = db.prepare("select * from step_runs where run_id = ?").all(runId) as any[];
    expect(stepRuns.length).toBe(2);

    const prdDir = path.join(tempProject, "PRDs");
    const prdFiles = fs.readdirSync(prdDir);
    expect(prdFiles.length).toBe(1);
    const prdContent = fs.readFileSync(path.join(prdDir, prdFiles[0]), "utf8");
    expect(prdContent).toContain("## Agent Updates");
    expect(prdContent).toContain("Plan");
    expect(prdContent).toContain("Build");
  });

  it("routes to failure edge and marks failed when none exists", async () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "wf-"));
    const tempProject = fs.mkdtempSync(path.join(os.tmpdir(), "project-"));
    fs.writeFileSync(path.join(tempProject, "MEMORY.md"), "memory", "utf8");

    const { db, workflowsModule } = await setupDb(tempHome);

    const providerId = "provider-1";
    db.prepare(
      "insert into providers (id, name, cli_command, template, default_model, env_enc, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(providerId, "Claude", "claude", "--prompt {{prompt}}", null, null, now(), now());

    const folderId = "folder-1";
    db.prepare("insert into folders (id, path, label, created_at) values (?, ?, ?, ?)")
      .run(folderId, tempProject, null, now());

    const workflowId = "workflow-1";
    db.prepare(
      "insert into workflows (id, name, description, folder_id, execution_mode, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)"
    ).run(workflowId, "Test", null, folderId, "sequential", now(), now());

    const stepA = "step-a";
    db.prepare(
      "insert into steps (id, workflow_id, name, description, provider_id, model, max_iterations, skills_json, success_criteria, failure_criteria, pos_x, pos_y, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(stepA, workflowId, "Failing", "desc", providerId, null, 10, "[]", null, null, 0, 0, now(), now());

    const runId = await workflowsModule.executeWorkflow(workflowId, "Ship feature");
    const run = db.prepare("select * from runs where id = ?").get(runId) as any;
    expect(run.status).toBe("failed");
  });
});
