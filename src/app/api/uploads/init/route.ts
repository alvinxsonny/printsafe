import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { presignPut } from "@/lib/storage/client";
import { generateDataKey, wrapDataKey } from "@/lib/storage/crypto";
import { MAX_UPLOAD_MB, DEFAULT_RETENTION_DAYS } from "@/config/app";
import { canUpload } from "@/lib/payments";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (
      !session ||
      (session.user.role !== "customer" && session.user.role !== "admin")
    ) {
      return NextResponse.json(
        { error: "Unauthorized. Customer account required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { filename, mime, sizeBytes } = body;

    if (!filename || typeof filename !== "string") {
      return NextResponse.json(
        { error: "Filename is required." },
        { status: 400 }
      );
    }

    const normalizedMime = (mime || "").toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
      return NextResponse.json(
        {
          error:
            "Only PDF, JPG, PNG, and WebP files are supported. DOCX support is coming soon.",
        },
        { status: 400 }
      );
    }

    const maxBytes = MAX_UPLOAD_MB * 1024 * 1024;
    if (
      typeof sizeBytes !== "number" ||
      sizeBytes <= 0 ||
      sizeBytes > maxBytes
    ) {
      return NextResponse.json(
        {
          error: `File size exceeds the maximum limit of ${MAX_UPLOAD_MB} MB.`,
        },
        { status: 400 }
      );
    }

    // Check Plan & Vault Quotas via helper
    const uploadCheck = await canUpload(session.user.id, sizeBytes);
    if (!uploadCheck.allowed) {
      return NextResponse.json(
        {
          error:
            uploadCheck.reason || "Upload quota or storage limit exceeded.",
        },
        { status: 403 }
      );
    }

    // Generate Document ID, Data Key, and Envelope Wrapping
    const documentId = `doc_${crypto.randomUUID()}`;
    const dataKey = generateDataKey();
    const wrappedKey = wrapDataKey(dataKey);

    const incomingKey = `incoming/${documentId}`;
    const expiresAt = new Date(
      Date.now() + DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000
    );

    // Create document in processing state
    await db.insert(documents).values({
      id: documentId,
      ownerId: session.user.id,
      displayName: filename.trim(),
      mime: normalizedMime,
      sizeBytes,
      storageKey: incomingKey,
      wrappedKey,
      status: "processing",
      expiresAt,
    });

    // Generate direct presigned PUT URL to Cloudflare R2
    const uploadUrl = await presignPut(incomingKey, normalizedMime, 900);

    return NextResponse.json({
      success: true,
      documentId,
      uploadUrl,
      incomingKey,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Upload initialization failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
