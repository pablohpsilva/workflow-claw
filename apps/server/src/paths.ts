import path from "node:path";
import os from "node:os";
import fs from "node:fs";

export function getAppDataDir() {
  const override = process.env.WORKFLOW_CLAW_DATA_DIR;
  const dir = override ? override : path.join(os.homedir(), ".workflow-claw");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getDbPath() {
  return path.join(getAppDataDir(), "data.db");
}
