import { describe, it, expect, beforeEach } from "vitest";
import {
  isPlaceholderShopName,
  updateMerchantShopState,
  getCachedMerchantShopState,
  subscribeMerchantShopState,
  resetMerchantShopState,
} from "@/lib/merchant/merchantShopState";

describe("merchantShopState manager", () => {
  beforeEach(() => {
    resetMerchantShopState();
  });

  it("correctly identifies placeholder shop names", () => {
    expect(isPlaceholderShopName(undefined)).toBe(true);
    expect(isPlaceholderShopName(null)).toBe(true);
    expect(isPlaceholderShopName("")).toBe(true);
    expect(isPlaceholderShopName("   ")).toBe(true);
    expect(isPlaceholderShopName("Print Shop")).toBe(true);
    expect(isPlaceholderShopName("your print shop")).toBe(true);
    expect(isPlaceholderShopName("Print Queue")).toBe(true);
    expect(isPlaceholderShopName("Notifications")).toBe(true);
    expect(isPlaceholderShopName("Job Detail")).toBe(true);
    expect(isPlaceholderShopName("Job Inspection")).toBe(true);
    expect(isPlaceholderShopName("Shop Settings")).toBe(true);
    expect(isPlaceholderShopName("Billing & Plans")).toBe(true);

    expect(isPlaceholderShopName("Bandra Print Hub")).toBe(false);
    expect(isPlaceholderShopName("Quick Xerox & Color Prints")).toBe(false);
  });

  it("updates and caches shop state across accesses", () => {
    const updated = updateMerchantShopState({
      name: "Bandra Print Hub",
      isLive: true,
      manualLive: true,
    });

    expect(updated.name).toBe("Bandra Print Hub");
    expect(updated.isLive).toBe(true);
    expect(updated.isLoaded).toBe(true);

    const cached = getCachedMerchantShopState();
    expect(cached?.name).toBe("Bandra Print Hub");
    expect(cached?.isLive).toBe(true);
  });

  it("does not overwrite a real shop name with a placeholder name", () => {
    updateMerchantShopState({
      name: "Bandra Print Hub",
      isLive: true,
    });

    // Attempt to update with a placeholder name from a subpage
    const secondUpdate = updateMerchantShopState({
      name: "Print Queue",
      isLive: false,
    });

    expect(secondUpdate.name).toBe("Bandra Print Hub");
    expect(secondUpdate.isLive).toBe(false);
  });

  it("notifies active subscribers when state changes", () => {
    let notifiedLive: boolean | null = null;
    let callCount = 0;

    const unsubscribe = subscribeMerchantShopState((state) => {
      notifiedLive = state.isLive;
      callCount++;
    });

    updateMerchantShopState({ isLive: true });
    expect(notifiedLive).toBe(true);
    expect(callCount).toBe(1);

    updateMerchantShopState({ isLive: false });
    expect(notifiedLive).toBe(false);
    expect(callCount).toBe(2);

    unsubscribe();
    updateMerchantShopState({ isLive: true });
    // Should not receive further updates after unsubscribe
    expect(callCount).toBe(2);
  });
});
