import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/guards";
import { presignPut } from "@/lib/storage";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (
      !session ||
      (session.user.role !== "merchant" && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { contentType, shopId } = body;

    if (!contentType || !ALLOWED_MIME_TYPES[contentType]) {
      return NextResponse.json(
        {
          error:
            "Invalid image format. Only JPG, PNG, and WebP files are accepted.",
        },
        { status: 400 }
      );
    }

    const ext = ALLOWED_MIME_TYPES[contentType];
    const targetFolder = shopId
      ? `shops/${shopId}`
      : `shops/${session.user.id}`;
    const key = `${targetFolder}/${crypto.randomUUID()}.${ext}`;

    const uploadUrl = await presignPut(key, contentType, 900); // 15 mins

    return NextResponse.json({
      success: true,
      uploadUrl,
      key,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to presign upload URL";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
