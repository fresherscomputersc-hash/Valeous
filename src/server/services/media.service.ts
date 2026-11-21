import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { getEnv } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { getDb } from '@/server/db';
import { mediaAssets } from '@/server/db/schema';

const ALLOWED_IMAGE_TYPES: Record<string, { ext: string }> = {
  'image/jpeg': { ext: 'jpg' },
  'image/png': { ext: 'png' },
  'image/webp': { ext: 'webp' },
};

const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), 'storage/uploads');

export function detectImageMagicMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

export async function validateAndStoreImageUpload(params: {
  ownerUserId: string;
  fileName: string;
  declaredMimeType: string;
  buffer: Buffer;
  altText?: string | null;
}) {
  const env = getEnv();

  if (params.buffer.byteLength === 0) {
    throw new AppError('VALIDATION_ERROR', 'Uploaded file is empty.', 400);
  }

  if (params.buffer.byteLength > env.UPLOAD_MAX_BYTES) {
    const maxMb = (env.UPLOAD_MAX_BYTES / (1024 * 1024)).toFixed(1);
    throw new AppError(
      'FILE_TOO_LARGE',
      `Image exceeds the maximum allowed size of ${maxMb} MB.`,
      413
    );
  }

  const normalizedMime = params.declaredMimeType.toLowerCase().trim();
  const allowedEntry = ALLOWED_IMAGE_TYPES[normalizedMime];
  if (!allowedEntry) {
    throw new AppError(
      'UNSUPPORTED_MEDIA_TYPE',
      'Only JPEG, PNG, and WebP images are permitted.',
      415
    );
  }

  const detectedMagicMime = detectImageMagicMime(params.buffer);
  if (!detectedMagicMime || detectedMagicMime !== normalizedMime) {
    throw new AppError(
      'UNSUPPORTED_MEDIA_TYPE',
      'File binary signature does not match an allowed image format.',
      415
    );
  }

  const storageKey = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}.${allowedEntry.ext}`;
  let publicUrl = `/api/media/${storageKey}`;

  if (env.STORAGE_PROVIDER === 's3' && env.S3_ENDPOINT && env.S3_BUCKET) {
    // Production S3-compatible object storage adapter hook
    publicUrl = `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${storageKey}`;
  } else {
    await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
    const safeFilePath = path.join(LOCAL_UPLOAD_DIR, storageKey);
    await fs.writeFile(safeFilePath, params.buffer);
  }

  const db = getDb();
  const [asset] = await db
    .insert(mediaAssets)
    .values({
      ownerUserId: params.ownerUserId,
      storageKey,
      mimeType: detectedMagicMime,
      sizeBytes: params.buffer.byteLength,
      altText: params.altText?.trim() || null,
    })
    .returning();

  return {
    ...asset!,
    publicUrl,
  };
}

export async function readLocalMediaAsset(storageKey: string): Promise<{
  buffer: Buffer;
  mimeType: string;
}> {
  if (!/^[a-z0-9-]+\.(jpg|png|webp)$/i.test(storageKey)) {
    throw new AppError('NOT_FOUND', 'Media asset not found.', 404);
  }

  const db = getDb();
  const rows = await db
    .select({ mimeType: mediaAssets.mimeType })
    .from(mediaAssets)
    .where(eq(mediaAssets.storageKey, storageKey))
    .limit(1);

  if (!rows[0]) {
    throw new AppError('NOT_FOUND', 'Media asset not found.', 404);
  }

  const targetPath = path.join(LOCAL_UPLOAD_DIR, path.basename(storageKey));
  try {
    const buffer = await fs.readFile(targetPath);
    return { buffer, mimeType: rows[0].mimeType };
  } catch {
    throw new AppError('NOT_FOUND', 'Media file missing on storage adapter.', 404);
  }
}
