import type { Express } from 'express';
import sharp from 'sharp';

/** Raw upload limit — large files are compressed before storing as base64. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Target max binary size per image after compression (before base64 overhead). */
const MAX_STORED_IMAGE_BYTES = 1.2 * 1024 * 1024;

const MAX_DIMENSION = 1600;

/** Leave headroom under MongoDB's 16 MB document cap for other product fields. */
export const MAX_PRODUCT_IMAGES_BYTES = 14 * 1024 * 1024;

function bufferToDataUri(buffer: Buffer, mimetype: string): string {
  const mime = mimetype?.startsWith('image/') ? mimetype : 'image/jpeg';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

export function imageListByteSize(images: string[]): number {
  return images.reduce((n, s) => n + Buffer.byteLength(s, 'utf8'), 0);
}

export function assertProductImagesFitDocument(images: string[]): void {
  const embedded = images.filter((s) => s.startsWith('data:image/'));
  const total = imageListByteSize(embedded);
  if (total > MAX_PRODUCT_IMAGES_BYTES) {
    const mb = (MAX_PRODUCT_IMAGES_BYTES / (1024 * 1024)).toFixed(0);
    throw new Error(
      `Total uploaded image data exceeds ${mb} MB for one product (MongoDB limit). Use fewer images.`,
    );
  }
}

/** Extract Google Drive file id from share / open / uc links. */
export function extractGoogleDriveFileId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (!u.hostname.includes('drive.google.com')) return null;

    const fileMatch = u.pathname.match(/\/file\/d\/([^/]+)/);
    if (fileMatch?.[1]) return fileMatch[1];

    const id = u.searchParams.get('id');
    if (id) return id;

    return null;
  } catch {
    return null;
  }
}

/** Direct embed URL for publicly shared Drive images. */
export function googleDriveEmbedUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

/** Add https:// for common pasted links; convert Google Drive share links to embed URLs. */
export function normalizeExternalImageUrl(url: string): string {
  const t = url.trim();
  if (!t) return t;
  if (t.startsWith('data:') || t.startsWith('/uploads/')) return t;

  let withProtocol = t;
  if (withProtocol.startsWith('http://') || withProtocol.startsWith('https://')) {
    /* keep */
  } else if (withProtocol.startsWith('//')) {
    withProtocol = `https:${withProtocol}`;
  } else if (/^[\w.-]+\.[a-z]{2,}/i.test(withProtocol) || withProtocol.startsWith('www.')) {
    withProtocol = `https://${withProtocol}`;
  }

  const driveId = extractGoogleDriveFileId(withProtocol);
  if (driveId) return googleDriveEmbedUrl(driveId);

  return withProtocol;
}

function resizedPipeline(buffer: Buffer, meta: sharp.Metadata) {
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  let pipeline = sharp(buffer).rotate();
  if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
    pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }
  return pipeline;
}

async function compressImageBuffer(buffer: Buffer): Promise<{ buffer: Buffer; mimetype: string }> {
  const meta = await sharp(buffer).metadata();
  if (!meta.format) {
    throw new Error('File is not a valid image');
  }

  const buildJpeg = async (quality: number) =>
    resizedPipeline(buffer, meta).jpeg({ quality, mozjpeg: true }).toBuffer();

  if (meta.hasAlpha) {
    let out = await resizedPipeline(buffer, meta)
      .png({ compressionLevel: 9, palette: (meta.width ?? 0) <= 512 })
      .toBuffer();
    if (out.length > MAX_STORED_IMAGE_BYTES * 1.5) {
      out = await buildJpeg(82);
      return { buffer: out, mimetype: 'image/jpeg' };
    }
    return { buffer: out, mimetype: 'image/png' };
  }

  let quality = 82;
  let out = await buildJpeg(quality);
  while (out.length > MAX_STORED_IMAGE_BYTES && quality > 45) {
    quality -= 10;
    out = await buildJpeg(quality);
  }
  return { buffer: out, mimetype: 'image/jpeg' };
}

/** Compress, then convert to base64 data URI for MongoDB storage. */
export async function persistUploadedBuffer(buffer: Buffer, _mimetype: string): Promise<string> {
  if (!buffer?.length) {
    throw new Error('Uploaded image data was empty');
  }
  const { buffer: compressed, mimetype } = await compressImageBuffer(buffer);
  return bufferToDataUri(compressed, mimetype);
}

export async function persistUploadedMulterFiles(files: Express.Multer.File[]): Promise<string[]> {
  const out: string[] = [];
  for (const file of files) {
    out.push(await persistUploadedBuffer(file.buffer, file.mimetype));
  }
  return out;
}

/** Accept embedded base64, local uploads, or direct HTTP image URLs. */
export function isDirectImageUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  if (t.startsWith('data:image/')) return true;
  if (t.startsWith('/uploads/')) return true;
  if (!t.startsWith('http://') && !t.startsWith('https://')) return false;
  try {
    const u = new URL(t);
    if (u.hostname.includes('drive.google.com')) {
      return u.pathname === '/uc' && Boolean(u.searchParams.get('id'));
    }
    if (u.hostname.includes('dropbox.com') && u.pathname.includes('/s/')) return false;
    return true;
  } catch {
    return false;
  }
}

export function filterValidImageUrls(urls: string[]): string[] {
  return urls
    .map((u) => normalizeExternalImageUrl(u.trim()))
    .filter((u) => u && isDirectImageUrl(u));
}

export function imageUrlValidationError(rawUrls: string[]): string | null {
  const trimmed = rawUrls.map((u) => u.trim()).filter(Boolean);
  if (trimmed.length === 0) return null;
  const valid = filterValidImageUrls(trimmed);
  if (valid.length > 0) return null;
  return 'No valid image URLs — use direct https:// image links or a public Google Drive share link';
}

export function mongoErrorMessage(err: unknown): string | null {
  if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
    return 'Duplicate SKU or slug — use a unique value';
  }
  return null;
}
