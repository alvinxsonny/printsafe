import { describe, it, expect } from "vitest";
import { parseGoogleLink } from "@/lib/maps/parseGoogleLink";

describe("parseGoogleLink", () => {
  it("parses place URL with pin coordinates, name, and ftid", () => {
    // Pin at 12.9715987, 77.5945627; viewport at 12.9700000, 77.5900000
    const url =
      "https://www.google.com/maps/place/Apex+Xerox+%26+Printers/@12.9700000,77.5900000,17z/data=!3m1!4b1!4m6!3m5!1s0x3bae1670c9b44e6d:0xf8dfc3e8517e4fe0!8m2!3d12.9715987!4d77.5945627!16s%2Fg%2F11b8z9j_5x";

    const result = parseGoogleLink(url);
    expect(result.isValid).toBe(true);
    expect(result.isShortLink).toBe(false);
    expect(result.name).toBe("Apex Xerox & Printers");
    // Should prefer !3d/!4d pin coordinates over @lat,lng viewport coordinates
    expect(result.latitude).toBeCloseTo(12.9715987, 6);
    expect(result.longitude).toBeCloseTo(77.5945627, 6);
    expect(result.googleFtid).toBe("0x3bae1670c9b44e6d:0xf8dfc3e8517e4fe0");
  });

  it("parses maps.google.com/?q=lat,lng", () => {
    const url = "https://maps.google.com/?q=12.9716,77.5946";
    const result = parseGoogleLink(url);
    expect(result.isValid).toBe(true);
    expect(result.latitude).toBeCloseTo(12.9716, 4);
    expect(result.longitude).toBeCloseTo(77.5946, 4);
  });

  it("parses google.com/maps?q=Name&ll=lat,lng", () => {
    const url =
      "https://www.google.com/maps?q=City+Print+Hub&ll=13.0827,80.2707";
    const result = parseGoogleLink(url);
    expect(result.isValid).toBe(true);
    expect(result.name).toBe("City Print Hub");
    expect(result.latitude).toBeCloseTo(13.0827, 4);
    expect(result.longitude).toBeCloseTo(80.2707, 4);
  });

  it("parses google.com/maps/search/Query/@lat,lng", () => {
    const url =
      "https://www.google.com/maps/search/Student+Copy+Center/@19.0760,72.8777,15z";
    const result = parseGoogleLink(url);
    expect(result.isValid).toBe(true);
    expect(result.name).toBe("Student Copy Center");
    expect(result.latitude).toBeCloseTo(19.076, 4);
    expect(result.longitude).toBeCloseTo(72.8777, 4);
  });

  it("parses ?cid= parameter", () => {
    const url = "https://maps.google.com/?cid=1234567890123456789";
    const result = parseGoogleLink(url);
    expect(result.isValid).toBe(true);
    expect(result.cid).toBe("1234567890123456789");
  });

  it("identifies short link maps.app.goo.gl", () => {
    const url = "https://maps.app.goo.gl/k9XyZ123FakeShort";
    const result = parseGoogleLink(url);
    expect(result.isValid).toBe(true);
    expect(result.isShortLink).toBe(true);
  });

  it("identifies short link goo.gl/maps", () => {
    const url = "https://goo.gl/maps/abcDEF123456";
    const result = parseGoogleLink(url);
    expect(result.isValid).toBe(true);
    expect(result.isShortLink).toBe(true);
  });

  it("falls back to @lat,lng when pin !3d/!4d is not in URL", () => {
    const url =
      "https://www.google.com/maps/place/Corner+Stationery/@12.9250,77.5938,16z";
    const result = parseGoogleLink(url);
    expect(result.isValid).toBe(true);
    expect(result.name).toBe("Corner Stationery");
    expect(result.latitude).toBeCloseTo(12.925, 4);
    expect(result.longitude).toBeCloseTo(77.5938, 4);
  });

  it("handles non-Google URLs cleanly", () => {
    const url = "https://example.com/not-a-map";
    const result = parseGoogleLink(url);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("Not a valid Google Maps URL");
  });

  it("handles empty or invalid strings", () => {
    expect(parseGoogleLink("").isValid).toBe(false);
    expect(parseGoogleLink("   ").isValid).toBe(false);
  });
});
