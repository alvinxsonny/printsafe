import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { customerProfiles } from "@/lib/db/schema";
import { roundCoordinateToGrid } from "@/lib/notify/push";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [profile] = await db
      .select({
        notifyEnabled: customerProfiles.notifyEnabled,
        notifyArea: customerProfiles.notifyArea,
      })
      .from(customerProfiles)
      .where(eq(customerProfiles.userId, session.user.id))
      .limit(1);

    return NextResponse.json({
      notifyEnabled: Boolean(profile?.notifyEnabled),
      notifyArea: profile?.notifyArea || null,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : "Failed to fetch area alert settings";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { enabled, lat, lng, radiusM } = body;

    const [profile] = await db
      .select()
      .from(customerProfiles)
      .where(eq(customerProfiles.userId, session.user.id))
      .limit(1);

    if (!profile) {
      return NextResponse.json(
        { error: "Customer profile not found." },
        { status: 404 }
      );
    }

    if (!enabled) {
      await db
        .update(customerProfiles)
        .set({
          notifyEnabled: false,
          notifyArea: null,
        })
        .where(eq(customerProfiles.id, profile.id));

      return NextResponse.json({
        success: true,
        notifyEnabled: false,
        notifyArea: null,
      });
    }

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json(
        {
          error:
            "lat and lng numbers are required when enabling nearby shop alerts.",
        },
        { status: 400 }
      );
    }

    // Privacy rule: Store only a rounded location (~500 m grid)
    const roundedLat = roundCoordinateToGrid(lat);
    const roundedLng = roundCoordinateToGrid(lng);
    const radius = Math.min(10000, Math.max(500, Number(radiusM) || 3000));

    const area = {
      lat: roundedLat,
      lng: roundedLng,
      radiusM: radius,
    };

    await db
      .update(customerProfiles)
      .set({
        notifyEnabled: true,
        notifyArea: area,
      })
      .where(eq(customerProfiles.id, profile.id));

    return NextResponse.json({
      success: true,
      notifyEnabled: true,
      notifyArea: area,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : "Failed to update area alert settings";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db
      .update(customerProfiles)
      .set({
        notifyEnabled: false,
        notifyArea: null,
      })
      .where(eq(customerProfiles.userId, session.user.id));

    return NextResponse.json({ success: true, notifyEnabled: false });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to delete saved area";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
