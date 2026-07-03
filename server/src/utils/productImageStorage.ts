import fs from 'node:fs';
import path from 'node:path';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import type { Express } from 'express';
import { env } from '../config/env.js';
import { uploadPublicPath } from './mediaUrl.js';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

let configured = false;

export function isCloudinaryEnabled(): boolean {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME?.trim() &&
      env.CLOUDINARY_API_KEY?.trim() &&
      env.CLOUDINARY_API_SECRET?.trim(),
  );
}

function ensureCloudinary(): boolean {
  if (!isCloudinaryEnabled()) return false;
  if (!configured) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME!,
      api_key: env.CLOUDINARY_API_KEY!,
      api_secret: env.CLOUDINARY_API_SECRET!,
      secure: true,
    });
    configured = true;
  }
  return true;
}

function safeFilename(originalname: string): string {
  return `${Date.now()}-${originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

function uploadBufferToCloudinary(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'paduchuandham/products',
        resource_type: 'image',
        overwrite: false,
        unique_filename: true,
      },
      (err, result: UploadApiResponse | undefined) => {
        if (err || !result?.secure_url) {
          reject(err ?? new Error('Cloudinary returned no URL'));
          return;
        }
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

function writeBufferToDisk(uploadDir: string, originalname: string, buffer: Buffer): string {
  fs.mkdirSync(uploadDir, { recursive: true });
  const filename = safeFilename(originalname);
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  return uploadPublicPath(filename);
}

/** Persist in-memory multer file → Cloudinary URL or local /uploads path. */
export async function persistUploadedBuffer(
  uploadDir: string,
  buffer: Buffer,
  originalname: string,
): Promise<string> {
  if (ensureCloudinary()) {
    try {
      return await uploadBufferToCloudinary(buffer);
    } catch (err) {
      const detail =
        err && typeof err === 'object' && 'error' in err
          ? String((err as { error?: { message?: string } }).error?.message ?? '')
          : err instanceof Error
            ? err.message
            : 'Cloudinary upload failed';
      throw new Error(
        detail.includes('cloud_name')
          ? 'Cloudinary cloud name is wrong — check CLOUDINARY_CLOUD_NAME on the server'
          : `Image upload failed: ${detail}`,
      );
    }
  }
  return writeBufferToDisk(uploadDir, originalname, buffer);
}

export async function persistUploadedMulterFiles(
  uploadDir: string,
  files: Express.Multer.File[],
): Promise<string[]> {
  const out: string[] = [];
  for (const file of files) {
    if (!file.buffer?.length) {
      throw new Error('Uploaded image data was empty');
    }
    out.push(await persistUploadedBuffer(uploadDir, file.buffer, file.originalname));
  }
  return out;
}

/** @deprecated disk path — use persistUploadedMulterFiles */
export async function persistUploadedImageFiles(
  uploadDir: string,
  filenames: string[],
): Promise<string[]> {
  const out: string[] = [];
  for (const name of filenames) {
    const localPath = path.join(uploadDir, name);
    const buffer = fs.readFileSync(localPath);
    const url = await persistUploadedBuffer(uploadDir, buffer, name);
    try {
      fs.unlinkSync(localPath);
    } catch {
      /* ignore */
    }
    out.push(url);
  }
  return out;
}

/** Reject share links (Google Drive, etc.) that cannot be used as <img src>. */
export function isDirectImageUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  if (t.startsWith('/uploads/')) return true;
  if (!t.startsWith('http://') && !t.startsWith('https://')) return false;
  try {
    const u = new URL(t);
    if (u.hostname.includes('drive.google.com')) return false;
    if (u.hostname.includes('dropbox.com') && u.pathname.includes('/s/')) return false;
    return true;
  } catch {
    return false;
  }
}

export function filterValidImageUrls(urls: string[]): string[] {
  return urls.map((u) => u.trim()).filter((u) => u && isDirectImageUrl(u));
}

export function mongoErrorMessage(err: unknown): string | null {
  if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
    return 'Duplicate SKU or slug — use a unique value';
  }
  return null;
}
