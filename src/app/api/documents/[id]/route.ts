import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { documents, documentPages, auditLogs } from "@/lib/db/schema";
import { deleteObject } from "@/lib/storage/client";

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

    return NextResponse.json({ document: docRows[0] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load document";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
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
    const body = await req.json();
    const { displayName, defaultSettings, deleteAfterPrint, retentionDays } =
      body;

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
    const updatePayload: Record<string, unknown> = {};

    if (displayName && typeof displayName === "string") {
      updatePayload.displayName = displayName.trim();
    }
    if (defaultSettings && typeof defaultSettings === "object") {
      updatePayload.defaultSettings = defaultSettings;
    }
    if (typeof deleteAfterPrint === "boolean") {
      updatePayload.deleteAfterPrint = deleteAfterPrint;
    }
    if (typeof retentionDays === "number" && retentionDays > 0) {
      updatePayload.expiresAt = new Date(
        Date.now() + retentionDays * 24 * 60 * 60 * 1000
      );
    }

    await db
      .update(documents)
      .set(updatePayload)
      .where(eq(documents.id, doc.id));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to update document";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
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

    // 1. Delete original vault object from S3
    try {
      if (doc.storageKey) {
        await deleteObject(doc.storageKey);
      }
    } catch (s3Err) {
      console.warn(`Could not delete vault object ${doc.storageKey}:`, s3Err);
    }

    // 2. Fetch and delete all rendered page blobs from S3
    const pages = await db
      .select({ id: documentPages.id, storageKey: documentPages.storageKey })
      .from(documentPages)
      .where(eq(documentPages.documentId, doc.id));

    for (const page of pages) {
      try {
        await deleteObject(page.storageKey);
      } catch (pageDelErr) {
        console.warn(
          `Could not delete page object ${page.storageKey}:`,
          pageDelErr
        );
      }
    }

    // 3. Delete document_pages rows
    await db.delete(documentPages).where(eq(documentPages.documentId, doc.id));

    // 4. Mark document as deleted in DB
    await db
      .update(documents)
      .set({ status: "deleted" })
      .where(eq(documents.id, doc.id));

    // 5. Write audit log
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorId: session.user.id,
      actorRole: session.user.role || "customer",
      action: "document.deleted",
      entity: "document",
      entityId: doc.id,
      meta: {
        documentId: doc.id,
        hardDeleted: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Document hard deleted.",
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to delete document";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
