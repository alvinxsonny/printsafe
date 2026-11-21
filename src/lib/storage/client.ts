import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

export const s3Client = new S3Client({
  region: env.STORAGE_REGION || "auto",
  endpoint: env.STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

/**
 * Generates a presigned PUT URL for client-side direct uploads.
 */
export async function presignPut(
  key: string,
  contentType: string,
  expiresIn: number = 900 // 15 minutes
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.STORAGE_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generates a presigned GET URL for secure viewing.
 */
export async function presignGet(
  key: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.STORAGE_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Retrieves a raw object as a Buffer from storage.
 */
export async function getObject(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: env.STORAGE_BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);
  if (!response.Body) {
    throw new Error(`Object body is empty for key: ${key}`);
  }

  // Transform stream to buffer
  const byteArray = await response.Body.transformToByteArray();
  return Buffer.from(byteArray);
}

/**
 * Puts an object directly into storage.
 */
export async function putObject(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: env.STORAGE_BUCKET,
    Key: key,
    Body: typeof body === "string" ? Buffer.from(body) : body,
    ContentType: contentType,
  });

  await s3Client.send(command);
}

/**
 * Deletes an object from storage.
 */
export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: env.STORAGE_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}
