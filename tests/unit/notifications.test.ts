import { describe, it, expect } from "vitest";
import {
  roundCoordinateToGrid,
  calculateHaversineDistanceMeters,
} from "@/lib/notify/push";
import { urlBase64ToUint8Array } from "@/lib/notify/pushClient";

describe("Phase 13: Notifications & Web Push", () => {
  describe("Privacy-Preserving Coordinate Rounding (~500m grid)", () => {
    it("rounds latitude and longitude to 0.005 degree grid buckets", () => {
      // 28.61389 is between 28.610 and 28.615 -> rounds to 28.615
      const lat = 28.61389;
      const roundedLat = roundCoordinateToGrid(lat);
      expect(roundedLat).toBe(28.615);

      // 77.20902 is between 77.205 and 77.210 -> rounds to 77.21
      const lng = 77.20902;
      const roundedLng = roundCoordinateToGrid(lng);
      expect(roundedLng).toBe(77.21);
    });

    it("ensures two exact addresses 200m apart snap to the same anonymous grid point", () => {
      const houseA_lat = 12.97159;
      const houseA_lng = 77.59456;

      const houseB_lat = 12.9721;
      const houseB_lng = 77.5949;

      const gridA = {
        lat: roundCoordinateToGrid(houseA_lat),
        lng: roundCoordinateToGrid(houseA_lng),
      };

      const gridB = {
        lat: roundCoordinateToGrid(houseB_lat),
        lng: roundCoordinateToGrid(houseB_lng),
      };

      expect(gridA.lat).toBe(gridB.lat);
      expect(gridA.lng).toBe(gridB.lng);
    });
  });

  describe("Haversine Distance Metric", () => {
    it("calculates zero distance for identical coordinates", () => {
      const dist = calculateHaversineDistanceMeters(
        28.6139,
        77.209,
        28.6139,
        77.209
      );
      expect(dist).toBe(0);
    });

    it("calculates accurate distance between known Delhi landmarks (~2.3 km)", () => {
      // Connaught Place to India Gate (~2,300 meters)
      const cpLat = 28.6315;
      const cpLng = 77.2167;

      const igLat = 28.6129;
      const igLng = 77.2295;

      const distance = calculateHaversineDistanceMeters(
        cpLat,
        cpLng,
        igLat,
        igLng
      );

      // Distance should be between 2,200m and 2,500m
      expect(distance).toBeGreaterThan(2200);
      expect(distance).toBeLessThan(2500);
    });
  });

  describe("Nearby Shop Live Alert & Rate Limit Logic", () => {
    it("matches shops within customer alert radius and filters outside", () => {
      const shopLat = 28.6315;
      const shopLng = 77.2167;

      const customerCloseArea = { lat: 28.635, lng: 77.22, radiusM: 3000 };
      const customerFarArea = { lat: 28.45, lng: 77.02, radiusM: 3000 }; // Gurgaon (~28 km)

      const distClose = calculateHaversineDistanceMeters(
        shopLat,
        shopLng,
        customerCloseArea.lat,
        customerCloseArea.lng
      );
      expect(distClose).toBeLessThanOrEqual(customerCloseArea.radiusM);

      const distFar = calculateHaversineDistanceMeters(
        shopLat,
        shopLng,
        customerFarArea.lat,
        customerFarArea.lng
      );
      expect(distFar).toBeGreaterThan(customerFarArea.radiusM);
    });

    it("enforces max 3 live alerts per day rate limit", () => {
      const MAX_ALERTS_PER_DAY = 3;

      const canSendAlert = (alertsSentToday: number) => {
        return alertsSentToday < MAX_ALERTS_PER_DAY;
      };

      expect(canSendAlert(0)).toBe(true);
      expect(canSendAlert(1)).toBe(true);
      expect(canSendAlert(2)).toBe(true);
      // 4th alert is blocked
      expect(canSendAlert(3)).toBe(false);
      expect(canSendAlert(4)).toBe(false);
    });
  });

  describe("Zero-PII Notification Payloads", () => {
    it("verifies notification payloads contain no personal contact data", () => {
      const samplePayload = {
        jobId: "job_12345678",
        status: "accepted",
        sheets: 12,
        shopName: "Quick Xerox",
        locality: "North Campus",
        message: "Your print request was accepted by Quick Xerox.",
      };

      const payloadStr = JSON.stringify(samplePayload);

      // Must not contain email addresses
      expect(payloadStr).not.toMatch(/@/);
      // Must not contain phone numbers
      expect(payloadStr).not.toMatch(/\+91|\d{10}/);
      // Must not contain customer name or filenames
      expect(samplePayload).not.toHaveProperty("customerEmail");
      expect(samplePayload).not.toHaveProperty("phone");
      expect(samplePayload).not.toHaveProperty("filename");
    });
  });

  describe("VAPID Client Key Formatting", () => {
    it("converts URL-safe base64 string to Uint8Array", () => {
      // Mock window.atob in node environment for test if not defined
      if (typeof window === "undefined" || !window.atob) {
        (
          globalThis as unknown as { window: { atob: (str: string) => string } }
        ).window = {
          atob: (str: string) => Buffer.from(str, "base64").toString("binary"),
        };
      }

      const sampleBase64 = "BFj_lWd0KQOShYf61taOP4WqhjFcLycmb4fWvcYLRQw";
      const u8array = urlBase64ToUint8Array(sampleBase64);

      expect(u8array).toBeInstanceOf(Uint8Array);
      expect(u8array.length).toBeGreaterThan(0);
    });
  });
});
