import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/guards";
import { reverseGeocode } from "@/lib/geo";
import { checkRateLimit } from "@/lib/security/rateLimit";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rateCheck = await checkRateLimit(`geo:reverse:${ip}`, 30, 60);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many reverse geocoding requests. Please wait." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");

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
        { error: "Invalid coordinate values." },
        { status: 400 }
      );
    }

    const result = await reverseGeocode(lat, lng);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Reverse geocoding failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { lat, lng } = body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json(
        { error: "Valid numeric 'lat' and 'lng' fields are required." },
        { status: 400 }
      );
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: "Invalid coordinate values." },
        { status: 400 }
      );
    }

    const result = await reverseGeocode(lat, lng);
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Reverse geocoding failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
