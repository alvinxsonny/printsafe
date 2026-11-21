import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/guards";
import { parseGoogleLink, resolveGoogleShortLink } from "@/lib/maps";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (
      !session ||
      (session.user.role !== "merchant" && session.user.role !== "admin")
    ) {
      return NextResponse.json(
        { error: "Unauthorized. Merchant role required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "A valid Google Maps URL is required." },
        { status: 400 }
      );
    }

    const initialParsed = parseGoogleLink(url);

    let finalUrl = url;
    if (initialParsed.isShortLink) {
      try {
        const resolved = await resolveGoogleShortLink(url);
        finalUrl = resolved.finalUrl;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to resolve link";
        return NextResponse.json(
          {
            error: `This link could not be read. Check that it is a Google Maps share link. (${msg})`,
          },
          { status: 422 }
        );
      }
    }

    const parsed = parseGoogleLink(finalUrl);
    if (!parsed.isValid) {
      return NextResponse.json(
        {
          error:
            parsed.error ||
            "This link could not be read. Check that it is a valid Google Maps place link.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      resolvedUrl: finalUrl,
      parsed,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
