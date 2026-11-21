import { describe, it, expect } from "vitest";
import {
  generateDataKey,
  wrapDataKey,
  unwrapDataKey,
  encryptBlob,
  decryptBlob,
} from "@/lib/storage/crypto";

describe("Storage Envelope Encryption (AES-256-GCM)", () => {
  it("generates a random 32-byte data key", () => {
    const key1 = generateDataKey();
    const key2 = generateDataKey();

    expect(key1.length).toBe(32);
    expect(key2.length).toBe(32);
    expect(key1.equals(key2)).toBe(false);
  });

  it("wraps and unwraps data key using FILE_MASTER_KEY", () => {
    const originalKey = generateDataKey();
    const wrappedKeyBase64 = wrapDataKey(originalKey);

    expect(typeof wrappedKeyBase64).toBe("string");
    expect(wrappedKeyBase64.length).toBeGreaterThan(0);

    const unwrappedKey = unwrapDataKey(wrappedKeyBase64);
    expect(unwrappedKey.equals(originalKey)).toBe(true);
  });

  it("encrypts and decrypts a plaintext document payload correctly", () => {
    const dataKey = generateDataKey();
    const plaintext = Buffer.from(
      "PrintSafe Zero-Trust Document: Confidential Identity Proof",
      "utf-8"
    );

    const encryptedBlob = encryptBlob(plaintext, dataKey);

    // Verify format: 12-byte IV + 16-byte AuthTag + ciphertext
    expect(encryptedBlob.length).toBe(12 + 16 + plaintext.length);

    // Verify ciphertext is not plaintext
    expect(encryptedBlob.includes(plaintext)).toBe(false);

    // Decrypt
    const decrypted = decryptBlob(encryptedBlob, dataKey);
    expect(decrypted.equals(plaintext)).toBe(true);
    expect(decrypted.toString("utf-8")).toBe(plaintext.toString("utf-8"));
  });

  it("rejects decryption if ciphertext has been tampered with", () => {
    const dataKey = generateDataKey();
    const plaintext = Buffer.from("Sensitive Tax Audit Document", "utf-8");

    const encryptedBlob = encryptBlob(plaintext, dataKey);

    // Tamper with one byte in the ciphertext portion
    const tamperedBlob = Buffer.from(encryptedBlob);
    tamperedBlob[tamperedBlob.length - 1] ^= 0x01; // flip last bit

    expect(() => {
      decryptBlob(tamperedBlob, dataKey);
    }).toThrow();
  });

  it("rejects decryption with a wrong data key", () => {
    const keyA = generateDataKey();
    const keyB = generateDataKey();
    const plaintext = Buffer.from("Important Medical Records", "utf-8");

    const encryptedBlob = encryptBlob(plaintext, keyA);

    expect(() => {
      decryptBlob(encryptedBlob, keyB);
    }).toThrow();
  });
});
