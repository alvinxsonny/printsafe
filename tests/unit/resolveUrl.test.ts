import { describe, it, expect } from "vitest";
import {
  isAllowedGoogleHost,
  isPrivateOrReservedIp,
} from "@/lib/maps/resolveUrl";

describe("resolveUrl - SSRF Protection", () => {
  describe("isAllowedGoogleHost", () => {
    it("allows valid Google Maps domains", () => {
      expect(isAllowedGoogleHost("maps.app.goo.gl")).toBe(true);
      expect(isAllowedGoogleHost("goo.gl")).toBe(true);
      expect(isAllowedGoogleHost("google.com")).toBe(true);
      expect(isAllowedGoogleHost("www.google.com")).toBe(true);
      expect(isAllowedGoogleHost("maps.google.com")).toBe(true);
      expect(isAllowedGoogleHost("maps.google.co.in")).toBe(true);
      expect(isAllowedGoogleHost("google.co.in")).toBe(true);
    });

    it("rejects malicious or unrelated domains", () => {
      expect(isAllowedGoogleHost("evil-site.com")).toBe(false);
      expect(isAllowedGoogleHost("google.com.evil.com")).toBe(false);
      expect(isAllowedGoogleHost("169.254.169.254")).toBe(false);
      expect(isAllowedGoogleHost("localhost")).toBe(false);
    });
  });

  describe("isPrivateOrReservedIp", () => {
    it("identifies private and loopback IPv4 addresses", () => {
      expect(isPrivateOrReservedIp("127.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("10.0.0.5")).toBe(true);
      expect(isPrivateOrReservedIp("192.168.1.100")).toBe(true);
      expect(isPrivateOrReservedIp("172.16.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("172.31.255.254")).toBe(true);
      expect(isPrivateOrReservedIp("169.254.169.254")).toBe(true); // AWS/GCP metadata
      expect(isPrivateOrReservedIp("0.0.0.0")).toBe(true);
    });

    it("identifies IPv6 loopback and private addresses", () => {
      expect(isPrivateOrReservedIp("::1")).toBe(true);
      expect(isPrivateOrReservedIp("fe80::1")).toBe(true);
      expect(isPrivateOrReservedIp("fc00::1")).toBe(true);
      expect(isPrivateOrReservedIp("fd12:3456:789a::1")).toBe(true);
    });

    it("allows public IP addresses", () => {
      expect(isPrivateOrReservedIp("142.250.190.46")).toBe(false); // Google public IP
      expect(isPrivateOrReservedIp("8.8.8.8")).toBe(false);
      expect(isPrivateOrReservedIp("1.1.1.1")).toBe(false);
    });
  });
});
