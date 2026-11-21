import crypto from "node:crypto";
import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag
const DATA_KEY_LENGTH = 32; // 256-bit AES key

/**
 * Derives a reliable 32-byte Buffer for FILE_MASTER_KEY.
 * Handles base64 encoded 32-byte keys or falls back to SHA-256 digest.
 */
export function getMasterKey(): Buffer {
  const rawKey = env.FILE_MASTER_KEY;
  if (!rawKey) {
    throw new Error("FILE_MASTER_KEY is not defined in environment variables.");
  }

  // Attempt base64 decode
  try {
    const b64 = Buffer.from(rawKey, "base64");
    if (b64.length === DATA_KEY_LENGTH) {
      return b64;
    }
  } catch {
    // Ignore and fall through
  }

  // Attempt raw utf-8 32-byte match
  const utf = Buffer.from(rawKey, "utf-8");
  if (utf.length === DATA_KEY_LENGTH) {
    return utf;
  }

  // Deterministically hash to 32 bytes
  return crypto.createHash("sha256").update(rawKey).digest();
}

/**
 * Generates a random 32-byte AES key unique to a single document.
 */
export function generateDataKey(): Buffer {
  return crypto.randomBytes(DATA_KEY_LENGTH);
}

/**
 * Wraps (encrypts) a per-document data key using FILE_MASTER_KEY with AES-256-GCM.
 * Layout: iv (12 bytes) | authTag (16 bytes) | ciphertext (32 bytes)
 * Returns a base64 encoded string.
 */
export function wrapDataKey(dataKey: Buffer): string {
  if (dataKey.length !== DATA_KEY_LENGTH) {
    throw new Error(
      `Invalid data key length: expected ${DATA_KEY_LENGTH} bytes, got ${dataKey.length}`
    );
  }

  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);

  const ciphertext = Buffer.concat([cipher.update(dataKey), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const wrappedBuffer = Buffer.concat([iv, authTag, ciphertext]);
  return wrappedBuffer.toString("base64");
}

/**
 * Unwraps (decrypts) a per-document data key using FILE_MASTER_KEY.
 * Verifies authenticity before returning the plain 32-byte data key.
 */
export function unwrapDataKey(wrappedKeyBase64: string): Buffer {
  const masterKey = getMasterKey();
  const wrappedBuffer = Buffer.from(wrappedKeyBase64, "base64");

  if (wrappedBuffer.length !== IV_LENGTH + AUTH_TAG_LENGTH + DATA_KEY_LENGTH) {
    throw new Error("Invalid wrapped key buffer length or corruption.");
  }

  const iv = wrappedBuffer.subarray(0, IV_LENGTH);
  const authTag = wrappedBuffer.subarray(
    IV_LENGTH,
    IV_LENGTH + AUTH_TAG_LENGTH
  );
  const ciphertext = wrappedBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv);
  decipher.setAuthTag(authTag);

  const dataKey = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  if (dataKey.length !== DATA_KEY_LENGTH) {
    throw new Error("Unwrapped key failed length validation.");
  }

  return dataKey;
}

/**
 * Encrypts a binary document or image buffer using AES-256-GCM and the document data key.
 * Output format: [12-byte IV][16-byte AuthTag][Ciphertext]
 */
export function encryptBlob(plaintext: Buffer, dataKey: Buffer): Buffer {
  if (dataKey.length !== DATA_KEY_LENGTH) {
    throw new Error("Invalid document data key length.");
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, dataKey, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]);
}

/**
 * Decrypts and authenticates a stored blob using the document data key.
 * Expects format: [12-byte IV][16-byte AuthTag][Ciphertext]
 */
export function decryptBlob(encryptedBlob: Buffer, dataKey: Buffer): Buffer {
  if (dataKey.length !== DATA_KEY_LENGTH) {
    throw new Error("Invalid document data key length.");
  }

  if (encryptedBlob.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Encrypted blob is too short to contain IV and AuthTag.");
  }

  const iv = encryptedBlob.subarray(0, IV_LENGTH);
  const authTag = encryptedBlob.subarray(
    IV_LENGTH,
    IV_LENGTH + AUTH_TAG_LENGTH
  );
  const ciphertext = encryptedBlob.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, dataKey, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
