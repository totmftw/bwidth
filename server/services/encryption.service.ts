/**
 * Encryption Service — AES-256-GCM for securing user API keys at rest.
 *
 * Uses a master key from env var AGENT_ENCRYPTION_KEY (64-char hex = 32 bytes).
 * Each value gets a unique random IV; the auth tag is stored alongside.
 */

import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getMasterKey(): Buffer {
  const hex = process.env.AGENT_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "AGENT_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

export interface EncryptedValue {
  encrypted: string; // hex-encoded ciphertext
  iv: string;        // hex-encoded IV
  tag: string;       // hex-encoded auth tag
}

export function encrypt(plaintext: string): EncryptedValue {
  const key = getMasterKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

export function decrypt(value: EncryptedValue): string {
  const key = getMasterKey();
  const iv = Buffer.from(value.iv, "hex");
  const tag = Buffer.from(value.tag, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(value.encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Check if the encryption key is configured.
 * Useful for graceful degradation when key isn't set.
 */
export function isEncryptionConfigured(): boolean {
  const hex = process.env.AGENT_ENCRYPTION_KEY;
  return !!hex && hex.length === 64;
}
