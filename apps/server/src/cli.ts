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

  const parts = splitCommand(rendered);
  let command = input.cliCommand;
  let args = parts;
  if (parts.length > 0 && parts[0] === input.cliCommand) {
    command = parts[0];
    args = parts.slice(1);
  }

  return new Promise((resolve) => {
    const pty = spawn(command, args, {
      name: "xterm-color",
      cols: 120,
      rows: 30,
      cwd: input.cwd,
      env: {
        ...process.env,
        PROMPT: input.prompt,
        MODEL: input.model ?? "",
        STEP_NAME: input.stepName,
        PRD_PATH: input.prdPath,
        MEMORY_PATH: input.memoryPath,
        WORKDIR: input.cwd,
        ...input.env
      }
    });

    let stdout = "";
    let stderr = "";

    pty.onData((data) => {
      stdout += data;
    });

    pty.onExit(({ exitCode }) => {
      resolve({ stdout, stderr, exitCode });
    });

    if (!input.template.includes("{{prompt}}")) {
      pty.write(`${input.prompt}\r`);
    }
  });
}
