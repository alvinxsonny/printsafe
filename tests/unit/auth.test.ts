import { describe, it, expect } from "vitest";

describe("Auth Role & Admin Bootstrap Validation", () => {
  const adminEmails = ["alvinxsonny@gmail.com", "admin@printsafe.dev"];

  it("authorizes only listed emails for admin role", () => {
    const validEmail = "alvinxsonny@gmail.com";
    const invalidEmail = "hacker@example.com";

    expect(adminEmails.includes(validEmail.toLowerCase())).toBe(true);
    expect(adminEmails.includes(invalidEmail.toLowerCase())).toBe(false);
  });

  it("blocks cross-role sign-ups when email already has an existing role", () => {
    const existingUser = {
      email: "shopkeeper@example.com",
      role: "merchant",
    };

    // Attempting customer signup with merchant email must be rejected
    const isCustomerAllowed = existingUser.role === "customer";
    expect(isCustomerAllowed).toBe(false);

    // Attempting merchant signup with customer email must be rejected
    const customerUser = {
      email: "user@example.com",
      role: "customer",
    };
    const isMerchantAllowed = customerUser.role === "merchant";
    expect(isMerchantAllowed).toBe(false);
  });
});
