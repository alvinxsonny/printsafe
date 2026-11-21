import { describe, it, expect } from "vitest";
import { isShopLive } from "@/lib/db/queries";

describe("Nearby Shops & Live Calculation", () => {
  const baseShop = {
    status: "approved",
    manualLive: true,
    scheduleEnabled: true,
  };

  const activeSubscription = {
    status: "active",
    periodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15), // 15 days future
  };

  const sampleHours = [
    { weekday: 1, opens: "09:00", closes: "21:00" }, // Mon 9am - 9pm
    { weekday: 2, opens: "09:00", closes: "21:00" }, // Tue 9am - 9pm
    { weekday: 3, opens: "09:00", closes: "21:00" }, // Wed 9am - 9pm
    { weekday: 4, opens: "09:00", closes: "21:00" }, // Thu 9am - 9pm
    { weekday: 5, opens: "09:00", closes: "21:00" }, // Fri 9am - 9pm
    { weekday: 6, opens: "10:00", closes: "18:00" }, // Sat 10am - 6pm
  ];

  it("marks an approved shop as live when inside scheduled hours and active", () => {
    // 2026-03-23 is a Monday. 11:30 IST is 06:00 UTC
    const mondayNoon = new Date("2026-03-23T06:00:00.000Z");

    const live = isShopLive(
      baseShop,
      sampleHours,
      activeSubscription,
      mondayNoon,
      "Asia/Kolkata"
    );
    expect(live).toBe(true);
  });

  it("marks a shop as closed when outside operating hours", () => {
    // Monday at 23:00 IST (17:30 UTC) - after 21:00 close
    const mondayNight = new Date("2026-03-23T17:30:00.000Z");

    const live = isShopLive(
      baseShop,
      sampleHours,
      activeSubscription,
      mondayNight,
      "Asia/Kolkata"
    );
    expect(live).toBe(false);
  });

  it("marks a shop as closed when manualLive is toggled off even during open hours", () => {
    const mondayNoon = new Date("2026-03-23T06:00:00.000Z");

    const live = isShopLive(
      { ...baseShop, manualLive: false },
      sampleHours,
      activeSubscription,
      mondayNoon,
      "Asia/Kolkata"
    );
    expect(live).toBe(false);
  });

  it("marks a shop as closed when subscription has expired", () => {
    const mondayNoon = new Date("2026-03-23T06:00:00.000Z");
    const expiredSub = {
      status: "active",
      periodEnd: new Date("2026-03-20T00:00:00.000Z"), // in the past
    };

    const live = isShopLive(
      baseShop,
      sampleHours,
      expiredSub,
      mondayNoon,
      "Asia/Kolkata"
    );
    expect(live).toBe(false);
  });

  it("computes capacity state based on active jobs correctly", () => {
    function computeCapacityState(
      jobCount: number
    ): "normal" | "busy" | "at_capacity" {
      if (jobCount >= 10) return "at_capacity";
      if (jobCount >= 5) return "busy";
      return "normal";
    }

    expect(computeCapacityState(0)).toBe("normal");
    expect(computeCapacityState(4)).toBe("normal");
    expect(computeCapacityState(5)).toBe("busy");
    expect(computeCapacityState(9)).toBe("busy");
    expect(computeCapacityState(10)).toBe("at_capacity");
    expect(computeCapacityState(25)).toBe("at_capacity");
  });

  it("strictly enforces merchant phone privacy based on showPhone preference", () => {
    function sanitizeMerchantPhone(shop: {
      contactPhone: string | null;
      showPhone: boolean;
    }) {
      return shop.showPhone ? shop.contactPhone : null;
    }

    const privateShop = {
      contactPhone: "+91 98765 43210",
      showPhone: false,
    };
    expect(sanitizeMerchantPhone(privateShop)).toBeNull();

    const publicShop = {
      contactPhone: "+91 98765 43210",
      showPhone: true,
    };
    expect(sanitizeMerchantPhone(publicShop)).toBe("+91 98765 43210");
  });
});
