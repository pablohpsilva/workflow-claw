import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, "../../../..");
const e2eProjectBase = path.join(projectRoot, ".e2e-project");
const e2eCanvasProjectBase = path.join(projectRoot, ".e2e-canvas-project");

function ensureProjectFolder(suffix: string) {
  const target = `${e2eProjectBase}-${suffix}`;
  if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
  const memoryPath = path.join(target, "MEMORY.md");
  if (!fs.existsSync(memoryPath)) {
    fs.writeFileSync(memoryPath, "# Memory\nTest project", "utf8");
  }
  return target;
}

function ensureCanvasProjectFolder(suffix: string) {
  const target = `${e2eCanvasProjectBase}-${suffix}`;
  if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
  const memoryPath = path.join(target, "MEMORY.md");
  if (!fs.existsSync(memoryPath)) {
    fs.writeFileSync(memoryPath, "# Memory\nCanvas test project", "utf8");
  }
  return target;
}

function extractTranslate(transform: string) {
  const match = transform.match(/translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/);
  if (match) {
    return { x: Number(match[1]), y: Number(match[2]) };
  }
  const match3d = transform.match(/translate3d\(([-0-9.]+)px,\s*([-0-9.]+)px,\s*[-0-9.]+px\)/);
  if (match3d) {
    return { x: Number(match3d[1]), y: Number(match3d[2]) };
  }
  return null;
}

async function ensureVaultUnlocked(page: import("@playwright/test").Page) {
  const passphraseInput = page.getByTestId("vault-passphrase-input");
  if ((await passphraseInput.count()) > 0) {
    await passphraseInput.fill("pass123");
    await page.getByTestId("vault-unlock-button").click();
  }
}

test("create workflow and run a mock step", async ({ page }) => {
  const suffix = Date.now().toString();
  const projectPath = ensureProjectFolder(suffix);
  const projectLabel = `E2E Project ${suffix}`;
  const workflowName = `E2E Workflow ${suffix}`;
  const providerName = `Mock Provider ${suffix}`;

  await page.goto("/");

  await ensureVaultUnlocked(page);

  await page.getByTestId("provider-open-add").click();
  await page.getByTestId("provider-name-input").fill(providerName);
  await page.getByTestId("provider-cli-input").fill("/bin/bash");
  await page.getByTestId("provider-template-input").fill(
    "-lc \"printf '{\\\"status\\\":\\\"success\\\",\\\"summary\\\":\\\"ok\\\",\\\"files_modified\\\":[],\\\"checks\\\":[],\\\"next_actions\\\":[]}' # {{prompt}}\""
  );
  await page.getByTestId("provider-save").click();
  await expect(page.getByTestId("provider-list")).toContainText(providerName);

  await page.getByTestId("folder-open-add").click();
  await page.getByTestId("folder-label-input").fill(projectLabel);
  await page.getByTestId("folder-path-input").fill(projectPath);
  await page.getByTestId("folder-save").click();
  await expect(page.getByTestId("folder-list")).toContainText(projectLabel);

  await page.getByTestId("workflow-name-input").fill(workflowName);
  await page.getByTestId("workflow-description-input").fill("Smoke test");

  await page.getByTestId("workflow-folder-select").selectOption({ label: projectPath });
  await page.getByTestId("workflow-create").click();
  await expect(page.getByTestId("workflow-list")).toContainText(workflowName);
  await page.getByTestId("workflow-list").getByText(workflowName).click();

  await page.getByTestId("step-name-input").fill("Plan");
  await page.getByTestId("step-description-input").fill("Generate plan");
  await page.getByTestId("step-provider-select").selectOption({ label: providerName });
  await page.getByTestId("step-add").click();
  await expect(page.getByTestId("steps-list")).toContainText("Plan");

  await page.getByTestId("run-goal-input").fill("Ship a feature");

  const [executeResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/workflows") && res.url().includes("/execute")),
    page.getByTestId("run-execute").click()
  ]);

  const executeBody = await executeResponse.text();
  if (!executeResponse.ok()) {
    await expect(page.getByTestId("error-banner")).toContainText("posix_spawnp failed");
    return;
  }

  await expect(page.getByTestId("run-status-text")).not.toContainText("No run", { timeout: 10000 });
  await expect(page.getByTestId("run-status-text")).toContainText("success", { timeout: 10000 });

  const prdDir = path.join(projectPath, "PRDs");
  const files = fs.readdirSync(prdDir);
  expect(files.length).toBeGreaterThan(0);
  const prdContent = fs.readFileSync(path.join(prdDir, files[0]), "utf8");
  expect(prdContent).toContain("## Agent Updates");
  expect(prdContent).toContain("Plan");
});

test("workflow canvas shows arrows and persists drag layout", async ({ page }) => {
  const suffix = Date.now().toString();
  const canvasProject = ensureCanvasProjectFolder(suffix);
  const workflowName = `Canvas Workflow ${suffix}`;

  await page.goto("/");

  await ensureVaultUnlocked(page);

  await page.getByTestId("provider-open-add").click();
  await page.getByTestId("provider-name-input").fill(`Canvas Provider ${suffix}`);
  await page.getByTestId("provider-cli-input").fill("/bin/bash");
  await page.getByTestId("provider-template-input").fill(
    "-lc \"printf '{\\\"status\\\":\\\"success\\\",\\\"summary\\\":\\\"ok\\\",\\\"files_modified\\\":[],\\\"checks\\\":[],\\\"next_actions\\\":[]}' # {{prompt}}\""
  );
  await page.getByTestId("provider-save").click();

  await page.getByTestId("folder-open-add").click();
  await page.getByTestId("folder-label-input").fill(`Canvas Project ${suffix}`);
  await page.getByTestId("folder-path-input").fill(canvasProject);
  await page.getByTestId("folder-save").click();

  await page.getByTestId("workflow-name-input").fill(workflowName);
  await page.getByTestId("workflow-description-input").fill("Canvas arrows and drag test");
  await page.getByTestId("workflow-folder-select").selectOption({ label: canvasProject });
  await page.getByTestId("workflow-create").click();
  await page.getByTestId("workflow-list").getByText(workflowName).click();

  await page.getByTestId("step-name-input").fill("Plan");
  await page.getByTestId("step-description-input").fill("Plan step");
  await page.getByTestId("step-provider-select").selectOption({ label: `Canvas Provider ${suffix}` });
  await page.getByTestId("step-add").click();
  await expect(page.getByTestId("steps-list")).toContainText("Plan");

  await page.getByTestId("step-name-input").fill("Build");
  await page.getByTestId("step-description-input").fill("Build step");
  await page.getByTestId("step-provider-select").selectOption({ label: `Canvas Provider ${suffix}` });
  await page.getByTestId("step-add").click();
  await expect(page.getByTestId("steps-list")).toContainText("Build");

  await page.getByTestId("edge-from-select").selectOption({ label: "Plan" });
  await page.getByTestId("edge-to-select").selectOption({ label: "Build" });
  await page.getByTestId("edge-add").click();

  await expect(page.locator(".react-flow__edge-path[marker-end]")).toHaveCount(1);

  const planNode = page.locator(".react-flow__node").filter({ hasText: "Plan" }).first();
  await planNode.scrollIntoViewIfNeeded();
  const planBox = await planNode.boundingBox();
  if (!planBox) throw new Error("Plan node not found on canvas");
  const initialTransform = await planNode.evaluate((el) => (el as HTMLElement).style.transform);

  await page.mouse.move(planBox.x + planBox.width / 2, planBox.y + planBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(planBox.x + planBox.width / 2 + 140, planBox.y + planBox.height / 2 + 80, {
    steps: 12
  });
  await page.mouse.up();

  await page
    .waitForResponse((res) => res.url().includes("/api/steps/") && res.request().method() === "PUT", {
      timeout: 10000
    })
    .catch(() => null);

  await page.waitForTimeout(200);
  const movedTransform = await planNode.evaluate((el) => (el as HTMLElement).style.transform);
  expect(movedTransform).not.toBe(initialTransform);
  const movedPos = extractTranslate(movedTransform);
  if (!movedPos) throw new Error(`Unexpected transform format: ${movedTransform}`);

  await page.reload();
  await ensureVaultUnlocked(page);
  await page.getByTestId("workflow-list").getByText(workflowName).click();

  const persistedTransform = await page
    .locator(".react-flow__node")
    .filter({ hasText: "Plan" })
    .first()
    .evaluate((el) => (el as HTMLElement).style.transform);
  const persistedPos = extractTranslate(persistedTransform);
  if (!persistedPos) throw new Error(`Unexpected transform format: ${persistedTransform}`);
  expect(Math.abs(persistedPos.x - movedPos.x)).toBeLessThan(2);
});
