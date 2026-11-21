import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { renderPage } from "@/lib/documents/render";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pageNo: string }> }
) {
  try {
    const session = await getServerSession();
    if (
      !session ||
      (session.user.role !== "customer" && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: documentId, pageNo: pageNoStr } = await params;
    const pageNo = parseInt(pageNoStr, 10);

    if (isNaN(pageNo) || pageNo < 1) {
      return NextResponse.json(
        { error: "Invalid page number" },
        { status: 400 }
      );
    }

    // Verify ownership: customer can only fetch their own document pages
    const docRows = await db
      .select({
        id: documents.id,
        ownerId: documents.ownerId,
        pageCount: documents.pageCount,
        status: documents.status,
      })
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
    if (doc.status !== "ready") {
      return NextResponse.json(
        { error: `Document is not ready (status: ${doc.status})` },
        { status: 400 }
      );
    }

    if (doc.pageCount && pageNo > doc.pageCount) {
      return NextResponse.json(
        { error: `Page ${pageNo} exceeds total pages (${doc.pageCount})` },
        { status: 404 }
      );
    }

    const result = await renderPage(documentId, pageNo);

    return new NextResponse(new Uint8Array(result.pageBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to render page";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
