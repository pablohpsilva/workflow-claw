import fs from "node:fs";
import path from "node:path";
import type { RuleHeader } from "@workflow-claw/shared";

const HEADER_MARKER = "--------------";

export type RuleFile = {
  filePath: string;
  header: RuleHeader;
  body: string;
};

export function parseRuleFile(filePath: string): RuleFile | null {
  const content = fs.readFileSync(filePath, "utf8");
  const parts = content.split(HEADER_MARKER).map((part) => part.trim());
  if (parts.length < 3) return null;
  const headerBlock = parts[1];
  const body = parts.slice(2).join(`\n${HEADER_MARKER}\n`).trim();

  const header: RuleHeader = {
    name: "",
    files: [],
    description: ""
  };

  for (const line of headerBlock.split("\n")) {
    const [rawKey, ...rest] = line.split(":");
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "name") header.name = value;
    if (key === "files") header.files = value.split(",").map((v) => v.trim()).filter(Boolean);
    if (key === "description") header.description = value;
  }

  if (!header.name || !header.description) return null;
  return { filePath, header, body };
}

export function listRules(rulesDir: string) {
  if (!fs.existsSync(rulesDir)) return [] as RuleFile[];
  const entries = fs.readdirSync(rulesDir);
  const rules: RuleFile[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const filePath = path.join(rulesDir, entry);
    const rule = parseRuleFile(filePath);
    if (rule) rules.push(rule);
  }
  return rules;
}
