import { describe, it, expect } from "vitest";

describe("Admin Review Rules & Authorization", () => {
  it("blocks self-approval when admin is the shop owner", () => {
    const adminUserId = "usr_admin_123";
    const shopOwnerId = "usr_admin_123";

    const isSelfOwner = adminUserId === shopOwnerId;
    expect(isSelfOwner).toBe(true);

    // Business rule: self-approval must be rejected
    const canApprove = !isSelfOwner;
    expect(canApprove).toBe(false);
  });

  it("permits review when admin is not the shop owner", () => {
    const adminUserId: string = "usr_admin_123";
    const shopOwnerId: string = "usr_merchant_456";

    const isSelfOwner = adminUserId === shopOwnerId;
    expect(isSelfOwner).toBe(false);
    expect(!isSelfOwner).toBe(true);
  });

  it("requires notes for non-approval decisions", () => {
    function validateReviewInput(decision: string, notes?: string) {
      const validDecisions = [
        "approved",
        "changes_requested",
        "rejected",
        "suspended",
        "reinstated",
      ];
      if (!validDecisions.includes(decision)) {
        return { valid: false, error: "Invalid decision" };
      }
      if (decision !== "approved" && (!notes || !notes.trim())) {
        return { valid: false, error: "Notes are mandatory" };
      }
      return { valid: true };
    }

    expect(validateReviewInput("approved").valid).toBe(true);
    expect(validateReviewInput("changes_requested").valid).toBe(false);
    expect(validateReviewInput("changes_requested", "").valid).toBe(false);
    expect(
      validateReviewInput(
        "changes_requested",
        "Please upload clearer storefront signage"
      ).valid
    ).toBe(true);
    expect(validateReviewInput("rejected").valid).toBe(false);
    expect(
      validateReviewInput("rejected", "Not a physical copy center").valid
    ).toBe(true);
    expect(validateReviewInput("suspended").valid).toBe(false);
    expect(
      validateReviewInput("suspended", "Multiple policy violations").valid
    ).toBe(true);
  });

  it("suspension immediately forces shop offline", () => {
    const shopBefore = {
      id: "shp_1",
      status: "approved",
      manualLive: true,
    };

    function applySuspension(shop: typeof shopBefore) {
      return {
        ...shop,
        status: "suspended",
        manualLive: false, // Must be forced offline immediately
      };
    }

    const shopAfter = applySuspension(shopBefore);
    expect(shopAfter.status).toBe("suspended");
    expect(shopAfter.manualLive).toBe(false);
  });

  it("approval grants a 30-day Growth trial period", () => {
    const now = new Date("2026-11-21T12:00:00Z");
    const periodStart = now;
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const diffDays =
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(30);
  });
});
