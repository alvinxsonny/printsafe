import { describe, it, expect } from "vitest";
import {
  generatePasscode,
  encryptPasscode,
  decryptPasscode,
  verifyPasscode,
} from "@/lib/jobs/passcode";
import { isJobExpired } from "@/lib/jobs/machine";

describe("Job Handover Passcode & Expiry Logic", () => {
  it("generates a random 4-digit numeric passcode", () => {
    const code1 = generatePasscode();
    const code2 = generatePasscode();

    expect(code1).toMatch(/^\d{4}$/);
    expect(code2).toMatch(/^\d{4}$/);
    expect(code1.length).toBe(4);
  });

  it("encrypts and decrypts passcode reliably using master key", () => {
    const code = "7492";
    const encrypted = encryptPasscode(code);

    expect(typeof encrypted).toBe("string");
    expect(encrypted).not.toBe(code);

    const decrypted = decryptPasscode(encrypted);
    expect(decrypted).toBe(code);
  });

  it("verifies matching passcode successfully with constant-time equality", () => {
    const code = "3819";
    const encrypted = encryptPasscode(code);

    expect(verifyPasscode("3819", encrypted)).toBe(true);
    expect(verifyPasscode(" 3819 ", encrypted)).toBe(true);
    expect(verifyPasscode("0000", encrypted)).toBe(false);
    expect(verifyPasscode("381", encrypted)).toBe(false);
  });

  it("detects expired unanswered job requests after 10 minutes", () => {
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Expired
    expect(
      isJobExpired({ status: "requested", requestedAt: elevenMinutesAgo })
    ).toBe(true);

    // Still active
    expect(
      isJobExpired({ status: "requested", requestedAt: fiveMinutesAgo })
    ).toBe(false);

    // Non-requested jobs do not expire by this rule
    expect(
      isJobExpired({ status: "accepted", requestedAt: elevenMinutesAgo })
    ).toBe(false);
  });
});
