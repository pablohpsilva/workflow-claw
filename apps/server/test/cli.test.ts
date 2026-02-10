import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildCommand, resolveCommand } from "../src/cli.js";

describe("cli helpers", () => {
  it("buildCommand supports cliCommand with args plus template args", () => {
    const { command, args } = buildCommand("npx codex", "--model gpt-4");
    expect(command).toBe("npx");
    expect(args).toEqual(["codex", "--model", "gpt-4"]);
  });

  it("buildCommand treats template as full invocation when it starts with command", () => {
    const { command, args } = buildCommand("codex", "codex --model gpt-4");
    expect(command).toBe("codex");
    expect(args).toEqual(["--model", "gpt-4"]);
  });

  it("resolveCommand finds executables in provided PATH", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-cli-"));
    const exe = path.join(tempDir, "fakecmd");
    fs.writeFileSync(exe, "#!/bin/sh\necho ok\n", "utf8");
    fs.chmodSync(exe, 0o755);
    const resolved = resolveCommand("fakecmd", tempDir);
    expect(resolved).toBe(exe);
  });

  it("resolveCommand returns null when missing", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-cli-"));
    const resolved = resolveCommand("missingcmd", tempDir);
    expect(resolved).toBeNull();
  });
});
