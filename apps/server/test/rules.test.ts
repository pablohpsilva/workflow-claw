import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { listRules, parseRuleFile } from "../src/rules.js";

describe("rules", () => {
  it("parses a valid rule file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rules-"));
    const filePath = path.join(dir, "test.md");
    fs.writeFileSync(
      filePath,
      `--------------\nName: Sample Rule\nFiles: src/a.ts, src/b.ts\ndescription: test rule\n--------------\n\nFollow the rule.\n`,
      "utf8"
    );
    const rule = parseRuleFile(filePath);
    expect(rule?.header.name).toBe("Sample Rule");
    expect(rule?.header.files).toEqual(["src/a.ts", "src/b.ts"]);
    expect(rule?.header.description).toBe("test rule");
    expect(rule?.body).toContain("Follow the rule");
  });

  it("lists rules from folder", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rules-"));
    fs.writeFileSync(
      path.join(dir, "one.md"),
      `--------------\nName: Rule One\nFiles: src/index.ts\ndescription: rule one\n--------------\n\nBody\n`,
      "utf8"
    );
    fs.writeFileSync(path.join(dir, "ignore.txt"), "not a rule", "utf8");
    const rules = listRules(dir);
    expect(rules.length).toBe(1);
    expect(rules[0].header.name).toBe("Rule One");
  });
});
