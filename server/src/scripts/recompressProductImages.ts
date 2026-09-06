/**
 * Compress all product images to WebP on S3 and store `/uploads/...` paths in DynamoDB.
 * - Downloads http(s) sources (picsum, unsplash, etc.)
 * - Re-optimizes existing base64 or /uploads/ images
 * - Keeps DynamoDB items small (URLs only, not base64 blobs)
 *
 * Requires S3_UPLOADS_BUCKET and AWS credentials.
 */
import { connectDb } from '../db/connect.js';
import { env } from '../config/env.js';
import { ProductModel } from '../models/Product.js';
import { invalidateCatalogCache } from '../cache/catalog.js';
import { compressImageForStorage } from '../utils/productImageStorage.js';
import { normalizeStoredImageUrl } from '../utils/mediaUrl.js';
import { isS3UploadsEnabled, uploadBufferToS3 } from '../utils/s3Upload.js';
import { connectRedis, disconnectRedis, isRedisCacheEnabled } from '../redis/client.js';

const sourceCache = new Map<string, Buffer>();

function dataUriToBuffer(dataUri: string): Buffer | null {
  const match = /^data:image\/[^;]+;base64,(.+)$/i.exec(dataUri);
  if (!match?.[1]) return null;
  return Buffer.from(match[1], 'base64');
}

function resolveFetchUrl(url: string): string | null {
  const normalized = normalizeStoredImageUrl(url);
  if (normalized.startsWith('data:image/')) return null;
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
  if (normalized.startsWith('/uploads/')) {
    const bucket = env.S3_UPLOADS_BUCKET?.trim();
    if (!bucket) return null;
    return `https://${bucket}.s3.${env.AWS_REGION}.amazonaws.com${normalized}`;
  }
  return null;
}

async function loadImageBuffer(url: string): Promise<Buffer | null> {
  const normalized = normalizeStoredImageUrl(url);

  if (normalized.startsWith('data:image/')) {
    return dataUriToBuffer(normalized);
  }

  const fetchUrl = resolveFetchUrl(normalized);
  if (!fetchUrl) return null;

  const cached = sourceCache.get(fetchUrl);
  if (cached) return cached;

  try {
    const res = await fetch(fetchUrl, {
      signal: AbortSignal.timeout(30_000),
      headers: { Accept: 'image/*,*/*' },
    });
    if (!res.ok) {
      console.warn(`[recompress] fetch ${res.status} ${fetchUrl}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) return null;
    sourceCache.set(fetchUrl, buf);
    return buf;
  } catch (err) {
    console.warn('[recompress] fetch failed', fetchUrl, err instanceof Error ? err.message : err);
    return null;
  }
}

async function compressAllProductImages() {
  if (!isS3UploadsEnabled()) {
    throw new Error('Set S3_UPLOADS_BUCKET in .env before running compress-all');
  }

  await connectDb();

  const products = await ProductModel.find().select('_id sku images').lean();
  let updated = 0;
  let imagesUploaded = 0;
  let imagesSkipped = 0;

  for (const p of products) {
    const current = p.images ?? [];
    if (current.length === 0) continue;

    const productId = String(p._id);
    const nextUrls: string[] = [];
    let productChanged = false;

    for (let i = 0; i < current.length; i++) {
      const raw = current[i]!;
      const targetKey = `product-${productId}-${i}.webp`;
      const targetPath = `/uploads/${targetKey}`;

      if (normalizeStoredImageUrl(raw) === targetPath) {
        nextUrls.push(targetPath);
        imagesSkipped += 1;
        continue;
      }

      const source = await loadImageBuffer(raw);
      if (!source) {
        nextUrls.push(raw);
        continue;
      }

      try {
        const { buffer, mimetype } = await compressImageForStorage(source);
        const path = await uploadBufferToS3(buffer, targetKey, mimetype);
        nextUrls.push(path);
        imagesUploaded += 1;
        productChanged = true;
      } catch (err) {
        console.warn(
          `  ${p.sku ?? productId}[${i}]: compress/upload failed —`,
          err instanceof Error ? err.message : err,
        );
        nextUrls.push(raw);
      }
    }

    const same =
      !productChanged &&
      nextUrls.length === current.length &&
      nextUrls.every((u, idx) => u === normalizeStoredImageUrl(current[idx]!));
    if (same) continue;

    await ProductModel.updateOne({ _id: p._id }, { $set: { images: nextUrls } });
    updated += 1;
    console.log(`  ${p.sku ?? productId}: ${nextUrls.length} image(s) → S3 WebP`);
  }

  await connectRedis();
  await invalidateCatalogCache();
  if (isRedisCacheEnabled()) {
    console.log('Catalog cache version bumped (Redis).');
  }
  await disconnectRedis();

  console.log(
    `Done. Updated ${updated} of ${products.length} product(s). ` +
      `Uploaded ${imagesUploaded} WebP file(s), skipped ${imagesSkipped} already on S3.`,
  );
}

compressAllProductImages().catch((e) => {
  console.error(e);
  process.exit(1);
});
