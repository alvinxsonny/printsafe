import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { getObject, putObject, deleteObject } from "@/lib/storage/client";
import { unwrapDataKey, encryptBlob } from "@/lib/storage/crypto";
import {
  warmDocumentPages,
  detectMagicMime,
  convertImageToPdf,
} from "@/lib/documents";
import { MAX_PAGES_PER_DOCUMENT } from "@/config/app";

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
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required." },
        { status: 400 }
      );
    }

    // 1. Fetch document record
    const docRows = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.ownerId, session.user.id)
        )
      )
      .limit(1);

    if (docRows.length === 0) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 }
      );
    }

    const doc = docRows[0];
    if (doc.status !== "processing") {
      return NextResponse.json(
        { error: `Document is already in '${doc.status}' state.` },
        { status: 400 }
      );
    }

    // 2. Fetch raw uploaded file from incoming/
    let rawBuffer: Buffer;
    try {
      rawBuffer = await getObject(doc.storageKey);
    } catch {
      return NextResponse.json(
        {
          error:
            "Uploaded file was not found in temporary storage. Please re-try upload.",
        },
        { status: 400 }
      );
    }

    // 3. Magic bytes validation
    const detectedType = detectMagicMime(rawBuffer);
    if (!detectedType) {
      // Clean up invalid incoming file
      await deleteObject(doc.storageKey);
      await db
        .update(documents)
        .set({ status: "failed" })
        .where(eq(documents.id, documentId));

      return NextResponse.json(
        {
          error:
            "Corrupted or invalid file format. Only valid PDF, JPG, PNG, and WebP files are supported.",
        },
        { status: 400 }
      );
    }

    // 4. Normalize to PDF & Count Pages
    let finalPdfBuffer: Buffer;
    let pageCount: number;

    if (detectedType === "pdf") {
      try {
        const pdfDoc = await PDFDocument.load(rawBuffer, {
          ignoreEncryption: false,
        });

        pageCount = pdfDoc.getPageCount();

        if (pageCount > MAX_PAGES_PER_DOCUMENT) {
          await deleteObject(doc.storageKey);
          await db
            .update(documents)
            .set({ status: "failed" })
            .where(eq(documents.id, documentId));

          return NextResponse.json(
            {
              error: `Document exceeds maximum limit of ${MAX_PAGES_PER_DOCUMENT} pages (uploaded document has ${pageCount} pages).`,
            },
            { status: 400 }
          );
        }

        finalPdfBuffer = rawBuffer;
      } catch (pdfErr: unknown) {
        await deleteObject(doc.storageKey);
        await db
          .update(documents)
          .set({ status: "failed" })
          .where(eq(documents.id, documentId));

        const msg =
          pdfErr instanceof Error && pdfErr.message.includes("encrypted")
            ? "Password-protected PDFs cannot be printed. Please remove the password and re-upload."
            : "The uploaded PDF appears to be corrupted or invalid.";

        return NextResponse.json({ error: msg }, { status: 400 });
      }
    } else {
      // Convert image (JPEG, PNG, WebP) to a 1-page A4 PDF
      try {
        finalPdfBuffer = await convertImageToPdf(rawBuffer, detectedType);
        pageCount = 1;
      } catch (imgErr) {
        console.error("Image to PDF conversion failed:", imgErr);
        await deleteObject(doc.storageKey);
        await db
          .update(documents)
          .set({ status: "failed" })
          .where(eq(documents.id, documentId));

        return NextResponse.json(
          { error: "Failed to process image file." },
          { status: 400 }
        );
      }
    }

    // 5. Envelope Encryption and Vault Storage
    const dataKey = unwrapDataKey(doc.wrappedKey);
    const encryptedVaultBlob = encryptBlob(finalPdfBuffer, dataKey);
    const vaultKey = `vault/${documentId}`;

    await putObject(vaultKey, encryptedVaultBlob, "application/octet-stream");

    // Delete temporary incoming/ object
    await deleteObject(doc.storageKey);

    // 6. Update database status to 'ready'
    await db
      .update(documents)
      .set({
        status: "ready",
        storageKey: vaultKey,
        mime: "application/pdf",
        sizeBytes: finalPdfBuffer.length,
        pageCount,
      })
      .where(eq(documents.id, documentId));

    // 7. Warm initial pages (pages 1 to 3) asynchronously
    try {
      await warmDocumentPages(documentId, pageCount, 3);
    } catch (warmErr) {
      console.warn("Warming pages completed with warnings:", warmErr);
    }

    return NextResponse.json({
      success: true,
      document: {
        id: documentId,
        displayName: doc.displayName,
        pageCount,
        sizeBytes: finalPdfBuffer.length,
        status: "ready",
      },
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Finalization processing failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
