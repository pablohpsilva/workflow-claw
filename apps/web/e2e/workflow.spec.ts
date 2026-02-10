import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, "../../../..");
const e2eProject = path.join(projectRoot, ".e2e-project");

function ensureProjectFolder() {
  if (!fs.existsSync(e2eProject)) fs.mkdirSync(e2eProject, { recursive: true });
  const memoryPath = path.join(e2eProject, "MEMORY.md");
  if (!fs.existsSync(memoryPath)) {
    fs.writeFileSync(memoryPath, "# Memory\nTest project", "utf8");
  }
}

test("create workflow and run a mock step", async ({ page }) => {
  ensureProjectFolder();

  await page.goto("/");

  await page.getByTestId("vault-passphrase-input").fill("pass123");
  await page.getByTestId("vault-unlock-button").click();

  await page.getByTestId("provider-name-input").fill("Mock Provider");
  await page.getByTestId("provider-cli-input").fill("/bin/bash");
  await page.getByTestId("provider-template-input").fill(
    "-lc \"printf '{\\\"status\\\":\\\"success\\\",\\\"summary\\\":\\\"ok\\\",\\\"files_modified\\\":[],\\\"checks\\\":[],\\\"next_actions\\\":[]}' # {{prompt}}\""
  );
  await page.getByTestId("provider-add").click();
  await expect(page.getByTestId("provider-list")).toContainText("Mock Provider");

  await page.getByTestId("folder-path-input").fill(e2eProject);
  await page.getByTestId("folder-add").click();
  await expect(page.getByTestId("folder-list")).toContainText(e2eProject);

  await page.getByTestId("workflow-name-input").fill("E2E Workflow");
  await page.getByTestId("workflow-description-input").fill("Smoke test");

  await page.getByTestId("workflow-folder-select").selectOption({ label: e2eProject });
  await page.getByTestId("workflow-create").click();
  await expect(page.getByTestId("workflow-list")).toContainText("E2E Workflow");
  await page.getByTestId(/workflow-card-.*-select/).first().click();

  await page.getByTestId("step-name-input").fill("Plan");
  await page.getByTestId("step-description-input").fill("Generate plan");
  await page.getByTestId("step-provider-select").selectOption({ label: "Mock Provider" });
  await page.getByTestId("step-add").click();
  await expect(page.getByTestId("steps-list")).toContainText("Plan");

  await page.getByTestId("run-goal-input").fill("Ship a feature");
  await page.getByTestId(/workflow-card-.*-select/).first().click();

  const [executeResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/workflows") && res.url().includes("/execute")),
    page.getByTestId("run-execute").click()
  ]);

  const executeBody = await executeResponse.text();
  expect(executeResponse.ok()).toBeTruthy();

  await expect(page.getByTestId("run-status-text")).not.toContainText("No run", { timeout: 10000 });
  await expect(page.getByTestId("run-status-text")).toContainText("success", { timeout: 10000 });

  const prdDir = path.join(e2eProject, "PRDs");
  const files = fs.readdirSync(prdDir);
  expect(files.length).toBeGreaterThan(0);
  const prdContent = fs.readFileSync(path.join(prdDir, files[0]), "utf8");
  expect(prdContent).toContain("## Agent Updates");
  expect(prdContent).toContain("Plan");
});
