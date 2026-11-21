import { describe, it, expect } from "vitest";
import { isShopLive } from "@/lib/db/queries";

describe("isShopLive business logic", () => {
  const approvedShop = {
    status: "approved",
    manualLive: true,
    scheduleEnabled: true,
  };

  const sampleHours = [
    { weekday: 1, opens: "09:00", closes: "21:00" }, // Monday 9am - 9pm
    { weekday: 2, opens: "09:00", closes: "21:00" }, // Tuesday
    { weekday: 3, opens: "09:00", closes: "21:00" }, // Wednesday
    { weekday: 4, opens: "09:00", closes: "21:00" }, // Thursday
    { weekday: 5, opens: "09:00", closes: "21:00" }, // Friday
    { weekday: 6, opens: "10:00", closes: "18:00" }, // Saturday
  ];

  const futurePeriodEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days in future
  const pastPeriodEnd = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

  it("returns true when inside shop hours with active subscription", () => {
    // 2026-11-23 is Monday at 14:00 (2:00 PM IST)
    const monday2pm = new Date("2026-11-23T08:30:00Z"); // 08:30 UTC = 14:00 IST
    const result = isShopLive(
      approvedShop,
      sampleHours,
      { status: "active", periodEnd: futurePeriodEnd },
      monday2pm,
      "Asia/Kolkata"
    );
    expect(result).toBe(true);
  });

  it("returns false when outside shop hours (e.g. 11:00 PM)", () => {
    // 2026-11-23 is Monday at 23:00 (11:00 PM IST)
    const monday11pm = new Date("2026-11-23T17:30:00Z"); // 17:30 UTC = 23:00 IST
    const result = isShopLive(
      approvedShop,
      sampleHours,
      { status: "active", periodEnd: futurePeriodEnd },
      monday11pm,
      "Asia/Kolkata"
    );
    expect(result).toBe(false);
  });

  it("returns true when schedule_enabled is false regardless of time", () => {
    const mondayMidnight = new Date("2026-11-23T19:30:00Z"); // 01:00 AM IST next day
    const result = isShopLive(
      { ...approvedShop, scheduleEnabled: false },
      sampleHours,
      { status: "active", periodEnd: futurePeriodEnd },
      mondayMidnight,
      "Asia/Kolkata"
    );
    expect(result).toBe(true);
  });

  it("returns true during subscription grace period before periodEnd", () => {
    const monday2pm = new Date("2026-11-23T08:30:00Z");
    const result = isShopLive(
      approvedShop,
      sampleHours,
      { status: "grace", periodEnd: futurePeriodEnd },
      monday2pm,
      "Asia/Kolkata"
    );
    expect(result).toBe(true);
  });

  it("returns false when subscription status is expired", () => {
    const monday2pm = new Date("2026-11-23T08:30:00Z");
    const result = isShopLive(
      approvedShop,
      sampleHours,
      { status: "expired", periodEnd: pastPeriodEnd },
      monday2pm,
      "Asia/Kolkata"
    );
    expect(result).toBe(false);
  });

  it("returns false when past periodEnd even if marked active", () => {
    const monday2pm = new Date("2026-11-23T08:30:00Z");
    const result = isShopLive(
      approvedShop,
      sampleHours,
      { status: "active", periodEnd: pastPeriodEnd },
      monday2pm,
      "Asia/Kolkata"
    );
    expect(result).toBe(false);
  });

  it("returns false when manualLive toggle is switched OFF", () => {
    const monday2pm = new Date("2026-11-23T08:30:00Z");
    const result = isShopLive(
      { ...approvedShop, manualLive: false },
      sampleHours,
      { status: "active", periodEnd: futurePeriodEnd },
      monday2pm,
      "Asia/Kolkata"
    );
    expect(result).toBe(false);
  });

  it("returns false when shop is not approved (e.g. pending_review or suspended)", () => {
    const monday2pm = new Date("2026-11-23T08:30:00Z");
    expect(
      isShopLive(
        { ...approvedShop, status: "pending_review" },
        sampleHours,
        { status: "active", periodEnd: futurePeriodEnd },
        monday2pm,
        "Asia/Kolkata"
      )
    ).toBe(false);

    expect(
      isShopLive(
        { ...approvedShop, status: "suspended" },
        sampleHours,
        { status: "active", periodEnd: futurePeriodEnd },
        monday2pm,
        "Asia/Kolkata"
      )
    ).toBe(false);
  });

  it("returns false on days with no configured hours (e.g. closed Sunday)", () => {
    // 2026-11-22 is Sunday
    const sunday2pm = new Date("2026-11-22T08:30:00Z");
    const result = isShopLive(
      approvedShop,
      sampleHours, // Sunday (0) is omitted
      { status: "active", periodEnd: futurePeriodEnd },
      sunday2pm,
      "Asia/Kolkata"
    );
    expect(result).toBe(false);
  });
});
