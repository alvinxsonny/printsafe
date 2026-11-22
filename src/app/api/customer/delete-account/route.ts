import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import {
  users,
  sessions,
  accounts,
  customerProfiles,
  documents,
  documentPages,
  printJobs,
  payments,
  notifications,
  pushSubscriptions,
  auditLogs,
} from "@/lib/db/schema";
import { deleteObject } from "@/lib/storage/client";
import crypto from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json().catch(() => ({}));
    const confirm = body.confirmText;

    if (confirm !== "DELETE") {
      return NextResponse.json(
        {
          error:
            "Confirmation text must be 'DELETE' to permanently delete your account.",
        },
        { status: 400 }
      );
    }

    // 1. Purge all uploaded documents and rendered page caches from S3/R2 storage
    const userDocs = await db
      .select({ id: documents.id, storageKey: documents.storageKey })
      .from(documents)
      .where(eq(documents.ownerId, userId));

    for (const doc of userDocs) {
      // Delete page cache images
      const pages = await db
        .select({ storageKey: documentPages.storageKey })
        .from(documentPages)
        .where(eq(documentPages.documentId, doc.id));

      for (const page of pages) {
        if (page.storageKey) {
          try {
            await deleteObject(page.storageKey);
          } catch (delErr) {
            console.error(
              `Failed to delete page storage: ${page.storageKey}`,
              delErr
            );
          }
        }
      }

      // Delete document pages rows
      await db
        .delete(documentPages)
        .where(eq(documentPages.documentId, doc.id));

      // Delete vault ciphertext blob
      if (doc.storageKey) {
        try {
          await deleteObject(doc.storageKey);
        } catch (delErr) {
          console.error(
            `Failed to delete document storage: ${doc.storageKey}`,
            delErr
          );
        }
      }
    }

    // Delete documents rows
    await db.delete(documents).where(eq(documents.ownerId, userId));

    // 2. Anonymize historical print job records (Preserves shop revenue & platform accounting)
    await db
      .update(printJobs)
      .set({
        customerId: "anonymized_deleted_user",
      })
      .where(eq(printJobs.customerId, userId));

    // 3. Anonymize payment records
    await db
      .update(payments)
      .set({
        payerUserId: "anonymized_deleted_user",
      })
      .where(eq(payments.payerUserId, userId));

    // 4. Delete push subscriptions & notifications
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    await db.delete(notifications).where(eq(notifications.userId, userId));

    // 5. Delete customer profile
    await db
      .delete(customerProfiles)
      .where(eq(customerProfiles.userId, userId));

    // 6. Delete authentication sessions & accounts
    await db.delete(sessions).where(eq(sessions.userId, userId));

    await db.delete(accounts).where(eq(accounts.userId, userId));

    // 7. Write an audit log entry
    await db.insert(auditLogs).values({
      id: `audit_${crypto.randomUUID()}`,
      actorId: "anonymized_deleted_user",
      actorRole: session.user.role,
      action: "account_deleted",
      entity: "users",
      entityId: userId,
      meta: {
        reason: "User requested DPDP right to erasure",
        anonymizedAt: new Date().toISOString(),
      },
      createdAt: new Date(),
    });

    // 8. Delete user record
    await db.delete(users).where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      message:
        "Account, private vault documents, and sessions have been permanently deleted.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete account";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
