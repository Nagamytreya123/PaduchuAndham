import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { uploadPublicPath } from './mediaUrl.js';
import { compressImageForStorage } from './productImageStorage.js';

let client: S3Client | null = null;

export function isS3UploadsEnabled(): boolean {
  return Boolean(env.S3_UPLOADS_BUCKET?.trim());
}

export function getS3Client(): S3Client {
  if (!client) {
    client = new S3Client({ region: env.AWS_REGION });
  }
  return client;
}

function uploadsBucket(): string {
  return env.S3_UPLOADS_BUCKET!.trim();
}

/** Upload bytes to S3 under uploads/; returns `/uploads/...` path. */
export async function uploadBufferToS3(
  buffer: Buffer,
  keySuffix: string,
  mimetype: string,
): Promise<string> {
  const bucket = uploadsBucket();
  const safe = keySuffix.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `uploads/${safe}`;
  const contentType = mimetype?.startsWith('image/') ? mimetype : 'image/jpeg';

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  return uploadPublicPath(safe);
}

/** Upload combo image bytes to S3 as WebP; returns `/uploads/...` path served via CDN. */
export async function uploadComboImageToS3(
  buffer: Buffer,
  originalName: string,
  _mimetype: string,
): Promise<string> {
  const { buffer: compressed, mimetype } = await compressImageForStorage(buffer);
  const base = originalName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  return uploadBufferToS3(compressed, `combo-${Date.now()}-${base}.webp`, mimetype);
}

/** Upload product image bytes to S3 as WebP; returns `/uploads/...` path. */
export async function uploadProductImageToS3(
  buffer: Buffer,
  originalName: string,
  _mimetype: string,
): Promise<string> {
  const { buffer: compressed, mimetype } = await compressImageForStorage(buffer);
  const base = originalName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  return uploadBufferToS3(compressed, `product-${Date.now()}-${base}.webp`, mimetype);
}

/** Presigned GET URL for a stored `/uploads/...` path (for email clients that cannot follow redirects). */
export async function getS3PresignedUrlForUploadPath(
  uploadPath: string,
  expiresIn = 3600,
): Promise<string | null> {
  if (!isS3UploadsEnabled()) return null;
  const match = uploadPath.match(/^\/uploads\/(.+)$/);
  if (!match?.[1]) return null;
  const key = `uploads/${match[1]}`;
  try {
    return await getSignedUrl(
      getS3Client(),
      new GetObjectCommand({ Bucket: uploadsBucket(), Key: key }),
      { expiresIn },
    );
  } catch (err) {
    console.error('[s3 uploads] presign failed', key, err instanceof Error ? err.message : err);
    return null;
  }
}

/** Serve GET /uploads/* from S3 when local disk has no file (Lambda). */
export async function serveUploadFromS3(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!isS3UploadsEnabled() || req.method !== 'GET') {
    next();
    return;
  }
  const match = req.path.match(/^\/uploads\/(.+)$/);
  if (!match?.[1]) {
    next();
    return;
  }
  const key = `uploads/${match[1]}`;
  try {
    const url = await getSignedUrl(
      getS3Client(),
      new GetObjectCommand({ Bucket: uploadsBucket(), Key: key }),
      { expiresIn: 3600 },
    );
    res.redirect(302, url);
  } catch (err) {
    console.error('[s3 uploads] GET failed', key, err instanceof Error ? err.message : err);
    next();
  }
}
