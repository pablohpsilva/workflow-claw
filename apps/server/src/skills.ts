import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

export type SkillExecution = {
  name: string;
  status: "success" | "fail";
  output?: Record<string, unknown>;
  error?: string;
};

export async function runSkill({
  skillsDir,
  name,
  input
}: {
  skillsDir: string;
  name: string;
  input: Record<string, unknown>;
}): Promise<SkillExecution> {
  const skillPath = path.join(skillsDir, name);
  if (!fs.existsSync(skillPath)) {
    return { name, status: "fail", error: `Skill not found: ${name}` };
  }

  return new Promise((resolve) => {
    const child = spawn(skillPath, [], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code !== 0) {
        resolve({ name, status: "fail", error: stderr || "Skill failed" });
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve({ name, status: "success", output: parsed });
      } catch (err) {
        resolve({ name, status: "fail", error: "Invalid JSON from skill" });
      }
    });

    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
}
