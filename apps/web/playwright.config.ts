import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(dirname, "../../.e2e-data");

export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure"
  },
  webServer: {
    command: `concurrently -k \"pnpm -C ../.. --filter server dev\" \"pnpm -C ../.. --filter web dev -- --host localhost --port 5173\"`,
    url: "http://localhost:5173",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      WORKFLOW_CLAW_DATA_DIR: dataDir,
      PORT: "5179",
      WORKFLOW_CLAW_FAKE_CLI: "1"
    }
  }
});
