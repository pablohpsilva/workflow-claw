import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

async function loadCryptoWithHome(tempHome: string) {
  vi.resetModules();
  process.env.WORKFLOW_CLAW_DATA_DIR = tempHome;
  return await import("../src/crypto.js");
}

describe("crypto vault", () => {
  it("encrypts and decrypts secrets after unlock", async () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "vault-"));
    const cryptoModule = await loadCryptoWithHome(tempHome);
    const unlocked = cryptoModule.unlock("pass123");
    expect(unlocked).toBe(true);
    const enc = cryptoModule.encryptSecret("hello");
    const dec = cryptoModule.decryptSecret(enc);
    expect(dec).toBe("hello");
  });

  it("rejects invalid passphrase", async () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "vault-"));
    const cryptoModule = await loadCryptoWithHome(tempHome);
    cryptoModule.unlock("pass123");
    const cryptoModule2 = await loadCryptoWithHome(tempHome);
    const ok = cryptoModule2.unlock("wrong");
    expect(ok).toBe(false);
  });

  it("locks the vault and clears the active key", async () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "vault-"));
    const cryptoModule = await loadCryptoWithHome(tempHome);
    expect(cryptoModule.isUnlocked()).toBe(false);
    cryptoModule.unlock("pass123");
    expect(cryptoModule.isUnlocked()).toBe(true);
    cryptoModule.lock();
    expect(cryptoModule.isUnlocked()).toBe(false);
    expect(() => cryptoModule.encryptSecret("hello")).toThrow("Vault locked");
  });
});
