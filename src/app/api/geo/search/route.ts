import { NextRequest, NextResponse } from "next/server";
import { searchPlaces } from "@/lib/geo/search";
import { checkRateLimit } from "@/lib/security/rateLimit";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Rate limit: 30 searches per minute per IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rateCheck = await checkRateLimit(`geo:search:${ip}`, 30, 60);

    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many search requests. Please slow down." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(
              (rateCheck.resetAt.getTime() - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

    const results = await searchPlaces(query);
    return NextResponse.json({ results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
