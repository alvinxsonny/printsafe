import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/guards";
import { fetchMerchantDashboardData } from "@/lib/merchant/dashboard";

export async function GET() {
  try {
    const session = await getServerSession();
    if (
      !session ||
      (session.user.role !== "merchant" && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await fetchMerchantDashboardData(session.user.id);
    if (!data) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to load merchant dashboard";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
