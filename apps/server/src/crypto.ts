import crypto from "node:crypto";
import { getDb } from "./db.js";

const CHECK_KEY = "unlock_check";
const CHECK_VALUE = "workflow-claw";
let activeKey: Buffer | null = null;

function deriveKey(passphrase: string, salt: Buffer) {
  return crypto.pbkdf2Sync(passphrase, salt, 120000, 32, "sha256");
}

function encryptWithKey(plaintext: string, key: Buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: enc.toString("base64")
  };
}

function decryptWithKey(payload: { iv: string; tag: string; data: string }, key: Buffer) {
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const data = Buffer.from(payload.data, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}

export function isUnlocked() {
  return !!activeKey;
}

export function lock() {
  activeKey = null;
}

export function unlock(passphrase: string) {
  const db = getDb();
  const existing = db
    .prepare("select value from settings where key = ?")
    .get(CHECK_KEY) as { value: string } | undefined;

  if (!existing) {
    const salt = crypto.randomBytes(16);
    const key = deriveKey(passphrase, salt);
    const enc = encryptWithKey(CHECK_VALUE, key);
    const payload = JSON.stringify({ salt: salt.toString("base64"), ...enc });
    db.prepare("insert into settings (key, value) values (?, ?)")
      .run(CHECK_KEY, payload);
    activeKey = key;
    return true;
  }

  const payload = JSON.parse(existing.value) as {
    salt: string;
    iv: string;
    tag: string;
    data: string;
  };
  const salt = Buffer.from(payload.salt, "base64");
  const key = deriveKey(passphrase, salt);
  let value: string;
  try {
    value = decryptWithKey(payload, key);
  } catch {
    return false;
  }
  if (value !== CHECK_VALUE) {
    return false;
  }
  activeKey = key;
  return true;
}

export function encryptSecret(plaintext: string) {
  if (!activeKey) throw new Error("Vault locked");
  const payload = encryptWithKey(plaintext, activeKey);
  return JSON.stringify(payload);
}

export function decryptSecret(ciphertext: string) {
  if (!activeKey) throw new Error("Vault locked");
  const payload = JSON.parse(ciphertext) as {
    iv: string;
    tag: string;
    data: string;
  };
  return decryptWithKey(payload, activeKey);
}
