import { describe, it, expect } from "vitest";

describe("generateUniqueAlias logic", () => {
  it("generates alias in 'Customer XXXX' format", () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let randomPart = "";
    for (let i = 0; i < 4; i++) {
      randomPart += chars[Math.floor(Math.random() * chars.length)];
    }
    const alias = `Customer ${randomPart}`;

    expect(alias).toMatch(/^Customer [A-Z0-9]{4}$/);
    expect(alias).not.toMatch(/[01IO]/); // Excludes ambiguous characters
  });
});
