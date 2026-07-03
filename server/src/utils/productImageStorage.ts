import fs from 'node:fs';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { uploadPublicPath } from './mediaUrl.js';

let configured = false;

export function isCloudinaryEnabled(): boolean {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME?.trim() &&
      env.CLOUDINARY_API_KEY?.trim() &&
      env.CLOUDINARY_API_SECRET?.trim(),
  );
}

function ensureCloudinary() {
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

/** Upload a multer-saved file; returns a public URL (Cloudinary or local /uploads path). */
export async function persistUploadedImageFile(
  uploadDir: string,
  filename: string,
): Promise<string> {
  const localPath = path.join(uploadDir, filename);

  if (ensureCloudinary()) {
    try {
      const result = await cloudinary.uploader.upload(localPath, {
        folder: 'paduchuandham/products',
        resource_type: 'image',
        overwrite: false,
        unique_filename: true,
      });
      try {
        fs.unlinkSync(localPath);
      } catch {
        /* best-effort cleanup */
      }
      return result.secure_url;
    } catch (err) {
      console.error('[cloudinary] upload failed, keeping local file', err);
    }
  }

  return uploadPublicPath(filename);
}

export async function persistUploadedImageFiles(
  uploadDir: string,
  filenames: string[],
): Promise<string[]> {
  const out: string[] = [];
  for (const name of filenames) {
    out.push(await persistUploadedImageFile(uploadDir, name));
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
