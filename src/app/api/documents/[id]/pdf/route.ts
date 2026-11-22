import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { getObject } from "@/lib/storage/client";
import { unwrapDataKey, decryptBlob } from "@/lib/storage/crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (
      !session ||
      (session.user.role !== "customer" && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: documentId } = await params;

    const docRows = await db
      .select()
      .from(documents)
      .where(
        session.user.role === "admin"
          ? eq(documents.id, documentId)
          : and(
              eq(documents.id, documentId),
              eq(documents.ownerId, session.user.id)
            )
      )
      .limit(1);

    if (docRows.length === 0) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const doc = docRows[0];
    if (doc.status === "deleted") {
      return NextResponse.json(
        { error: "Document has been deleted" },
        { status: 404 }
      );
    }

    const rawPdf = await getObject(doc.storageKey);
    let plainPdfBuffer = rawPdf;

    // Backward-compatibility: if stored with legacy encryption, decrypt it
    if (
      doc.wrappedKey &&
      rawPdf.length >= 28 &&
      rawPdf.subarray(0, 4).toString() !== "%PDF"
    ) {
      try {
        const dataKey = unwrapDataKey(doc.wrappedKey);
        plainPdfBuffer = decryptBlob(rawPdf, dataKey);
      } catch {
        plainPdfBuffer = rawPdf;
      }
    }

    return new NextResponse(new Uint8Array(plainPdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.displayName || "document")}.pdf"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load PDF";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
