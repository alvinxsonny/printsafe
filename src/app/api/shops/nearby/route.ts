import { NextRequest, NextResponse } from "next/server";
import { findNearbyShops } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");
    const radiusStr = searchParams.get("radius");
    const includeClosed = searchParams.get("includeClosed") === "true";

    if (!latStr || !lngStr) {
      return NextResponse.json(
        { error: "Query parameters 'lat' and 'lng' are required." },
        { status: 400 }
      );
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return NextResponse.json(
        { error: "Invalid geographic coordinates." },
        { status: 400 }
      );
    }

    let radiusM = 5000;
    if (radiusStr) {
      const parsedRadius = parseInt(radiusStr, 10);
      if (!isNaN(parsedRadius) && parsedRadius > 0) {
        radiusM = Math.min(parsedRadius, 50000); // Cap radius to 50 km
      }
    }

    const shops = await findNearbyShops({
      lat,
      lng,
      radiusM,
      includeClosed,
    });

    return NextResponse.json(
      { shops },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch nearby shops.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
