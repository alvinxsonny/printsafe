import crypto from "node:crypto";
import { PASSCODE_LENGTH } from "@/config/app";
import { getMasterKey, encryptBlob, decryptBlob } from "@/lib/storage/crypto";

/**
 * Generates a secure random N-digit numeric handover code.
 */
export function generatePasscode(length: number = PASSCODE_LENGTH): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += crypto.randomInt(0, 10).toString();
  }
  return code;
}

/**
 * Encrypts a handover passcode using the master key.
 */
export function encryptPasscode(code: string): string {
  const masterKey = getMasterKey();
  const encrypted = encryptBlob(Buffer.from(code, "utf-8"), masterKey);
  return encrypted.toString("base64");
}

/**
 * Decrypts an encrypted handover passcode using the master key.
 */
export function decryptPasscode(encryptedBase64: string): string {
  const masterKey = getMasterKey();
  const buf = Buffer.from(encryptedBase64, "base64");
  const decrypted = decryptBlob(buf, masterKey);
  return decrypted.toString("utf-8");
}

/**
 * Verifies a candidate passcode against the encrypted passcode using constant-time comparison.
 */
export function verifyPasscode(
  candidate: string,
  encryptedBase64: string
): boolean {
  try {
    const realCode = decryptPasscode(encryptedBase64);
    const candidateBuf = Buffer.from(candidate.trim(), "utf-8");
    const realBuf = Buffer.from(realCode.trim(), "utf-8");

    if (candidateBuf.length !== realBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(candidateBuf, realBuf);
  } catch {
    return false;
  }
}
