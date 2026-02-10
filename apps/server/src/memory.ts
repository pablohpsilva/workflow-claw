import fs from "node:fs";
import path from "node:path";
import ignore from "ignore";

const MAX_FILE_BYTES = 200_000;
const MAX_TOTAL_BYTES = 2_000_000;

export type ScannedFile = {
  path: string;
  content: string;
};

function isBinary(buffer: Buffer) {
  for (let i = 0; i < buffer.length; i += 1) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

export function scanProject(folderPath: string) {
  const ig = ignore();
  const gitignorePath = path.join(folderPath, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    ig.add(fs.readFileSync(gitignorePath, "utf8"));
  }

  const results: ScannedFile[] = [];
  let total = 0;

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(folderPath, fullPath);
      if (ig.ignores(relPath)) continue;
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        if (total >= MAX_TOTAL_BYTES) return;
        const stat = fs.statSync(fullPath);
        if (stat.size > MAX_FILE_BYTES) continue;
        const buffer = fs.readFileSync(fullPath);
        if (isBinary(buffer)) continue;
        const content = buffer.toString("utf8");
        results.push({ path: relPath, content });
        total += buffer.length;
      }
    }
  }

  walk(folderPath);
  return results;
}

export function buildMemoryPrompt(files: ScannedFile[]) {
  const body = files
    .map((file) => `# ${file.path}\n\n${file.content}`)
    .join("\n\n");
  return `You are analyzing a codebase to produce a concise MEMORY.md for future LLM agents.\n\nSummarize architecture, conventions, key paths, commands, and guidelines. Keep it concise.\n\n${body}`;
}
