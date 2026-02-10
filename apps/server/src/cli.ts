import fs from "node:fs";
import path from "node:path";
import { spawn } from "node-pty";
import { renderTemplate } from "./templates.js";

export type CliRunInput = {
  cliCommand: string;
  template: string;
  env?: Record<string, string>;
  prompt: string;
  model?: string | null;
  cwd: string;
  stepName: string;
  prdPath: string;
  memoryPath: string;
  onData?: (chunk: string) => void;
};

export type CliRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
};

function splitCommand(command: string) {
  const parts = command.match(/[^\s"']+|"([^"]*)"|'([^']*)'/g) || [];
  return parts.map((part) => part.replace(/^"|"$/g, "").replace(/^'|'$/g, ""));
}

function uniq(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function buildFallbackPath(envPath?: string) {
  const current = envPath ?? process.env.PATH ?? "";
  const fallbackBins = [
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/opt/homebrew/sbin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin"
  ];
  return uniq([...current.split(path.delimiter), ...fallbackBins]).join(path.delimiter);
}

export function resolveCommand(command: string, envPath?: string) {
  if (command.includes("/")) {
    try {
      fs.accessSync(command, fs.constants.X_OK);
      return command;
    } catch {
      return null;
    }
  }

  const searchPath = buildFallbackPath(envPath);
  for (const dir of searchPath.split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, command);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // keep searching
    }
  }
  return null;
}

export function buildCommand(cliCommand: string, renderedTemplate: string) {
  const cliParts = splitCommand(cliCommand);
  const command = cliParts[0] ?? "";
  const baseArgs = cliParts.slice(1);

  const templateParts = splitCommand(renderedTemplate);
  if (templateParts.length > 0 && templateParts[0] === command) {
    return { command, args: templateParts.slice(1) };
  }
  return { command, args: [...baseArgs, ...templateParts] };
}

function failureOutput(message: string, stderr = ""): CliRunResult {
  return {
    stdout: JSON.stringify({
      status: "fail",
      summary: message,
      files_modified: [],
      checks: [],
      next_actions: []
    }),
    stderr,
    exitCode: 127
  };
}

export function runCli(input: CliRunInput): Promise<CliRunResult> {
  if (process.env.WORKFLOW_CLAW_FAKE_CLI === "1") {
    if (input.stepName.includes("rule-select")) {
      return Promise.resolve({ stdout: "[]", stderr: "", exitCode: 0 });
    }
    if (input.stepName === "memory-generator") {
      return Promise.resolve({ stdout: "# MEMORY\nFake memory", stderr: "", exitCode: 0 });
    }
    return Promise.resolve({
      stdout: JSON.stringify({
        status: "success",
        summary: "fake run",
        files_modified: [],
        checks: [],
        next_actions: []
      }),
      stderr: "",
      exitCode: 0
    });
  }

  const rendered = renderTemplate(input.template, {
    prompt: input.prompt,
    model: input.model ?? "",
    cwd: input.cwd,
    stepName: input.stepName,
    prdPath: input.prdPath,
    memoryPath: input.memoryPath
  });

  const { command, args } = buildCommand(input.cliCommand, rendered);
  if (!command) {
    return Promise.resolve(failureOutput("CLI command is empty."));
  }

  const envPathOverride = input.env?.PATH;
  const resolvedCommand = resolveCommand(command, envPathOverride ?? process.env.PATH);
  if (!resolvedCommand) {
    return Promise.resolve(
      failureOutput(
        `CLI command '${command}' not found on PATH. Install it or set provider CLI to an absolute path.`
      )
    );
  }

  const envPath = buildFallbackPath(envPathOverride ?? process.env.PATH);

  return new Promise((resolve) => {
    let pty;
    try {
      pty = spawn(resolvedCommand, args, {
        name: "xterm-color",
        cols: 120,
        rows: 30,
        cwd: input.cwd,
        env: {
          ...process.env,
          PATH: envPath,
          PROMPT: input.prompt,
          MODEL: input.model ?? "",
          STEP_NAME: input.stepName,
          PRD_PATH: input.prdPath,
          MEMORY_PATH: input.memoryPath,
          WORKDIR: input.cwd,
          ...input.env
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      resolve(
        failureOutput(
          `Failed to start CLI '${command}'. ${message || "Check your provider configuration."}`.trim(),
          message
        )
      );
      return;
    }

    let stdout = "";
    let stderr = "";

    pty.onData((data) => {
      stdout += data;
      input.onData?.(data);
    });

    pty.onExit(({ exitCode }) => {
      resolve({ stdout, stderr, exitCode });
    });

    if (!input.template.includes("{{prompt}}")) {
      pty.write(`${input.prompt}\r`);
    }
  });
}
