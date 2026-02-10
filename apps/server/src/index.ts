import Fastify from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getDb } from "./db.js";
import { encryptSecret, unlock, lock, isUnlocked, decryptSecret } from "./crypto.js";
import { executeWorkflow } from "./workflows.js";

const server = Fastify({ logger: true });

await server.register(cors, {
  origin: true
});

server.get("/api/health", async () => ({ ok: true }));

server.get("/api/vault", async () => ({ unlocked: isUnlocked() }));

server.post("/api/unlock", async (request, reply) => {
  const schema = z.object({ passphrase: z.string().min(1) });
  const body = schema.parse(request.body);
  const ok = unlock(body.passphrase);
  if (!ok) {
    reply.code(401);
    return { ok: false };
  }
  return { ok: true };
});

server.post("/api/lock", async () => {
  lock();
  return { ok: true };
});

const providerSchema = z.object({
  name: z.string().min(1),
  cliCommand: z.string().min(1),
  template: z.string().min(1),
  defaultModel: z.string().nullable().optional(),
  envVars: z.record(z.string(), z.string()).optional()
});

function serializeProvider(row: any) {
  return {
    id: row.id,
    name: row.name,
    cliCommand: row.cli_command,
    template: row.template,
    defaultModel: row.default_model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hasEnv: !!row.env_enc
  };
}

server.get("/api/providers", async () => {
  const db = getDb();
  const rows = db.prepare("select * from providers").all();
  return rows.map(serializeProvider);
});

server.post("/api/providers", async (request, reply) => {
  const db = getDb();
  const body = providerSchema.parse(request.body);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  let envEnc: string | null = null;
  if (body.envVars && Object.keys(body.envVars).length > 0) {
    if (!isUnlocked()) {
      reply.code(423);
      return { error: "Vault locked" };
    }
    envEnc = encryptSecret(JSON.stringify(body.envVars));
  }
  db.prepare(
    "insert into providers (id, name, cli_command, template, default_model, env_enc, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, body.name, body.cliCommand, body.template, body.defaultModel ?? null, envEnc, now, now);
  return { id };
});

server.put("/api/providers/:id", async (request, reply) => {
  const db = getDb();
  const body = providerSchema.partial().parse(request.body);
  const id = z.string().parse((request.params as any).id);
  const existing = db.prepare("select * from providers where id = ?").get(id) as any;
  if (!existing) {
    reply.code(404);
    return { error: "Not found" };
  }
  let envEnc = existing.env_enc as string | null;
  if (body.envVars) {
    if (!isUnlocked()) {
      reply.code(423);
      return { error: "Vault locked" };
    }
    envEnc = encryptSecret(JSON.stringify(body.envVars));
  }
  db.prepare(
    "update providers set name = ?, cli_command = ?, template = ?, default_model = ?, env_enc = ?, updated_at = ? where id = ?"
  ).run(
    body.name ?? existing.name,
    body.cliCommand ?? existing.cli_command,
    body.template ?? existing.template,
    body.defaultModel ?? existing.default_model,
    envEnc,
    new Date().toISOString(),
    id
  );
  return { ok: true };
});

server.delete("/api/providers/:id", async (request, reply) => {
  const db = getDb();
  const id = z.string().parse((request.params as any).id);
  db.prepare("delete from providers where id = ?").run(id);
  reply.code(204);
});

const folderSchema = z.object({ path: z.string().min(1), label: z.string().nullable().optional() });

server.get("/api/folders", async () => {
  const db = getDb();
  return db.prepare("select * from folders").all();
});

server.post("/api/folders", async (request, reply) => {
  const db = getDb();
  const body = folderSchema.parse(request.body);
  if (!fs.existsSync(body.path)) {
    reply.code(400);
    return { error: "Path does not exist" };
  }
  const rulesDir = path.join(body.path, "rules");
  const skillsDir = path.join(body.path, "skills");
  if (!fs.existsSync(rulesDir)) fs.mkdirSync(rulesDir, { recursive: true });
  if (!fs.existsSync(skillsDir)) fs.mkdirSync(skillsDir, { recursive: true });
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare("insert into folders (id, path, label, created_at) values (?, ?, ?, ?)")
    .run(id, body.path, body.label ?? null, now);
  return { id };
});

server.put("/api/folders/:id", async (request, reply) => {
  const db = getDb();
  const id = z.string().parse((request.params as any).id);
  const body = folderSchema.partial().parse(request.body);
  const existing = db.prepare("select * from folders where id = ?").get(id) as any;
  if (!existing) {
    reply.code(404);
    return { error: "Not found" };
  }
  if (body.path && body.path !== existing.path) {
    if (!fs.existsSync(body.path)) {
      reply.code(400);
      return { error: "Path does not exist" };
    }
    const duplicate = db.prepare("select id from folders where path = ? and id != ?").get(body.path, id);
    if (duplicate) {
      reply.code(409);
      return { error: "Path already registered" };
    }
    const rulesDir = path.join(body.path, "rules");
    const skillsDir = path.join(body.path, "skills");
    if (!fs.existsSync(rulesDir)) fs.mkdirSync(rulesDir, { recursive: true });
    if (!fs.existsSync(skillsDir)) fs.mkdirSync(skillsDir, { recursive: true });
  }
  const nextPath = body.path ?? existing.path;
  const nextLabel = body.label === undefined ? existing.label : body.label;
  db.prepare("update folders set path = ?, label = ? where id = ?")
    .run(nextPath, nextLabel ?? null, id);
  return { ok: true };
});

server.delete("/api/folders/:id", async (request, reply) => {
  const db = getDb();
  const id = z.string().parse((request.params as any).id);
  const existing = db.prepare("select * from folders where id = ?").get(id);
  if (!existing) {
    reply.code(404);
    return { error: "Not found" };
  }
  const inUse = db.prepare("select id from workflows where folder_id = ? limit 1").get(id);
  if (inUse) {
    reply.code(409);
    return { error: "Folder in use" };
  }
  db.prepare("delete from folders where id = ?").run(id);
  reply.code(204);
});

const workflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  folderId: z.string().min(1),
  executionMode: z.enum(["sequential", "parallel"]).default("sequential")
});

server.get("/api/workflows", async () => {
  const db = getDb();
  return db.prepare("select * from workflows").all();
});

server.get("/api/workflows/:id", async (request, reply) => {
  const db = getDb();
  const id = z.string().parse((request.params as any).id);
  const workflow = db.prepare("select * from workflows where id = ?").get(id);
  if (!workflow) {
    reply.code(404);
    return { error: "Not found" };
  }
  const steps = db.prepare("select * from steps where workflow_id = ?").all(id);
  const edges = db.prepare("select * from edges where workflow_id = ?").all(id);
  return { workflow, steps, edges };
});

server.post("/api/workflows", async (request) => {
  const db = getDb();
  const body = workflowSchema.parse(request.body);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    "insert into workflows (id, name, description, folder_id, execution_mode, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, body.name, body.description ?? null, body.folderId, body.executionMode, now, now);
  return { id };
});

server.put("/api/workflows/:id", async (request, reply) => {
  const db = getDb();
  const id = z.string().parse((request.params as any).id);
  const body = workflowSchema.partial().parse(request.body);
  const existing = db.prepare("select * from workflows where id = ?").get(id) as any;
  if (!existing) {
    reply.code(404);
    return { error: "Not found" };
  }
  db.prepare(
    "update workflows set name = ?, description = ?, folder_id = ?, execution_mode = ?, updated_at = ? where id = ?"
  ).run(
    body.name ?? existing.name,
    body.description ?? existing.description,
    body.folderId ?? existing.folder_id,
    body.executionMode ?? existing.execution_mode,
    new Date().toISOString(),
    id
  );
  return { ok: true };
});

server.delete("/api/workflows/:id", async (request, reply) => {
  const db = getDb();
  const id = z.string().parse((request.params as any).id);
  db.prepare("delete from workflows where id = ?").run(id);
  reply.code(204);
});

const stepSchema = z.object({
  workflowId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  providerId: z.string().min(1),
  model: z.string().nullable().optional(),
  maxIterations: z.number().int().min(1).max(50).default(10),
  skills: z.array(z.string()).default([]),
  successCriteria: z.string().nullable().optional(),
  failureCriteria: z.string().nullable().optional(),
  posX: z.number().default(0),
  posY: z.number().default(0)
});

server.post("/api/steps", async (request) => {
  const db = getDb();
  const body = stepSchema.parse(request.body);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    "insert into steps (id, workflow_id, name, description, provider_id, model, max_iterations, skills_json, success_criteria, failure_criteria, pos_x, pos_y, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    body.workflowId,
    body.name,
    body.description,
    body.providerId,
    body.model ?? null,
    body.maxIterations,
    JSON.stringify(body.skills ?? []),
    body.successCriteria ?? null,
    body.failureCriteria ?? null,
    body.posX,
    body.posY,
    now,
    now
  );
  return { id };
});

server.put("/api/steps/:id", async (request, reply) => {
  const db = getDb();
  const id = z.string().parse((request.params as any).id);
  const body = stepSchema.partial().parse(request.body);
  const existing = db.prepare("select * from steps where id = ?").get(id) as any;
  if (!existing) {
    reply.code(404);
    return { error: "Not found" };
  }
  db.prepare(
    "update steps set name = ?, description = ?, provider_id = ?, model = ?, max_iterations = ?, skills_json = ?, success_criteria = ?, failure_criteria = ?, pos_x = ?, pos_y = ?, updated_at = ? where id = ?"
  ).run(
    body.name ?? existing.name,
    body.description ?? existing.description,
    body.providerId ?? existing.provider_id,
    body.model ?? existing.model,
    body.maxIterations ?? existing.max_iterations,
    body.skills ? JSON.stringify(body.skills) : existing.skills_json,
    body.successCriteria ?? existing.success_criteria,
    body.failureCriteria ?? existing.failure_criteria,
    body.posX ?? existing.pos_x,
    body.posY ?? existing.pos_y,
    new Date().toISOString(),
    id
  );
  return { ok: true };
});

server.delete("/api/steps/:id", async (request, reply) => {
  const db = getDb();
  const id = z.string().parse((request.params as any).id);
  db.prepare("delete from steps where id = ?").run(id);
  reply.code(204);
});

const edgeSchema = z.object({
  workflowId: z.string().min(1),
  fromStepId: z.string().min(1),
  toStepId: z.string().min(1),
  type: z.enum(["next", "support", "callback", "failure"])
});

server.post("/api/edges", async (request) => {
  const db = getDb();
  const body = edgeSchema.parse(request.body);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    "insert into edges (id, workflow_id, from_step_id, to_step_id, type, created_at) values (?, ?, ?, ?, ?, ?)"
  ).run(id, body.workflowId, body.fromStepId, body.toStepId, body.type, now);
  return { id };
});

server.delete("/api/edges/:id", async (request, reply) => {
  const db = getDb();
  const id = z.string().parse((request.params as any).id);
  db.prepare("delete from edges where id = ?").run(id);
  reply.code(204);
});

server.post("/api/workflows/:id/execute", async (request, reply) => {
  const db = getDb();
  const id = z.string().parse((request.params as any).id);
  const body = z.object({ goal: z.string().min(1) }).parse(request.body);
  const workflow = db.prepare("select * from workflows where id = ?").get(id);
  if (!workflow) {
    reply.code(404);
    return { error: "Not found" };
  }
  const runId = await executeWorkflow(id, body.goal);
  return { runId };
});

server.get("/api/runs/:id", async (request, reply) => {
  const db = getDb();
  const id = z.string().parse((request.params as any).id);
  const run = db.prepare("select * from runs where id = ?").get(id);
  if (!run) {
    reply.code(404);
    return { error: "Not found" };
  }
  const steps = db.prepare("select * from step_runs where run_id = ?").all(id);
  return { run, steps };
});

server.get("/api/providers/:id/env", async (request, reply) => {
  const db = getDb();
  const id = z.string().parse((request.params as any).id);
  const provider = db.prepare("select * from providers where id = ?").get(id) as any;
  if (!provider) {
    reply.code(404);
    return { error: "Not found" };
  }
  if (!provider.env_enc) return { envVars: {} };
  if (!isUnlocked()) {
    reply.code(423);
    return { error: "Vault locked" };
  }
  return { envVars: JSON.parse(decryptSecret(provider.env_enc)) };
});

const port = Number(process.env.PORT || 5179);
server.listen({ port, host: "0.0.0.0" });
