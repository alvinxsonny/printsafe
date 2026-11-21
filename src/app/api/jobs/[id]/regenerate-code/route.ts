import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/guards";
import { transitionJob } from "@/lib/jobs/machine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: jobId } = await params;

    const result = await transitionJob({
      jobId,
      action: "regenerate_code",
      actor: {
        id: session.user.id,
        role: session.user.role as "customer" | "merchant" | "admin",
      },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      passcode: result.passcode,
      status: result.newStatus,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to regenerate passcode";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
