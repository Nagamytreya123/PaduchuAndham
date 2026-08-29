/**
 * Copy MongoDB Atlas data into DynamoDB (run once before switching DYNAMODB_TABLE).
 * Uploads embedded base64 images to S3 when S3_UPLOADS_BUCKET is set.
 *
 * Usage:
 *   MONGODB_URI=... DYNAMODB_TABLE=paduchuandham-main S3_UPLOADS_BUCKET=... npm run migrate:mongo-to-dynamo
 */
import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDoc, isDynamoDbEnabled } from '../db/dynamo/client.js';
import { env } from '../config/env.js';
import { isS3UploadsEnabled, uploadBufferToS3 } from '../utils/s3Upload.js';
import { normalizeStoredImageUrl } from '../utils/mediaUrl.js';

const ENTITIES = [
  'User',
  'Product',
  'Category',
  'Order',
  'Cart',
  'Wishlist',
  'Review',
  'JewelleryCombo',
  'SiteSettings',
] as const;

function toPlain(doc: Record<string, unknown>): Record<string, unknown> {
  const out = JSON.parse(JSON.stringify(doc));
  if (out._id) out._id = String(out._id);
  for (const key of Object.keys(out)) {
    if (Array.isArray(out[key])) {
      out[key] = (out[key] as unknown[]).map((v) =>
        typeof v === 'object' && v !== null && '_id' in (v as object)
          ? { ...v, _id: String((v as { _id: unknown })._id) }
          : v,
      );
    }
  }
  return out;
}

function parseDataUri(dataUri: string): { buffer: Buffer; mimetype: string } | null {
  const match = /^data:(image\/[^;]+);base64,([\s\S]+)$/i.exec(dataUri.trim());
  if (!match) return null;
  return { mimetype: match[1], buffer: Buffer.from(match[2], 'base64') };
}

function extForMime(mimetype: string): string {
  if (mimetype.includes('png')) return 'png';
  if (mimetype.includes('webp')) return 'webp';
  if (mimetype.includes('gif')) return 'gif';
  return 'jpg';
}

async function migrateImageUrl(
  url: string,
  entityType: string,
  entityId: string,
  slot: number,
): Promise<string> {
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('data:image/')) {
    if (!isS3UploadsEnabled()) return '';
    const parsed = parseDataUri(trimmed);
    if (!parsed) return '';
    const hash = createHash('sha256').update(parsed.buffer).digest('hex').slice(0, 16);
    const ext = extForMime(parsed.mimetype);
    const keySuffix = `${entityType.toLowerCase()}/${entityId}-${slot}-${hash}.${ext}`;
    return await uploadBufferToS3(parsed.buffer, keySuffix, parsed.mimetype);
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return normalizeStoredImageUrl(trimmed);
  }

  if (trimmed.startsWith('/uploads/')) {
    return trimmed;
  }

  return normalizeStoredImageUrl(trimmed);
}

async function migrateImageList(
  urls: unknown,
  entityType: string,
  entityId: string,
): Promise<string[]> {
  if (!Array.isArray(urls)) return [];
  const out: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    const migrated = await migrateImageUrl(String(urls[i] ?? ''), entityType, entityId, i);
    if (migrated) out.push(migrated);
  }
  return out;
}

async function migrateDocImages(
  entityType: string,
  doc: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const id = String(doc._id);
  const out = { ...doc };

  if (entityType === 'Product' || entityType === 'JewelleryCombo') {
    out.images = await migrateImageList(doc.images, entityType, id);
  }

  if (entityType === 'Category') {
    if (typeof doc.tileImageUrl === 'string' && doc.tileImageUrl.trim()) {
      out.tileImageUrl = await migrateImageUrl(doc.tileImageUrl, entityType, id, 0);
    }
  }

  return out;
}

function itemByteSize(doc: Record<string, unknown>): number {
  return Buffer.byteLength(JSON.stringify(doc), 'utf8');
}

async function putEntity(entityType: string, doc: Record<string, unknown>): Promise<void> {
  const id = String(doc._id);
  const item: Record<string, unknown> = {
    pk: `ENTITY#${entityType}`,
    sk: `ID#${id}`,
    entityType,
    data: doc,
  };
  if (entityType === 'User' && doc.email) {
    item.gsi1pk = `USER#EMAIL#${String(doc.email).toLowerCase()}`;
    item.gsi1sk = 'PROFILE';
  }
  if (doc.slug) {
    item.gsi1pk = `${entityType.toUpperCase()}#SLUG#${String(doc.slug).toLowerCase()}`;
    item.gsi1sk = 'PROFILE';
  }
  await getDynamoDoc().send(
    new PutCommand({ TableName: env.DYNAMODB_TABLE!, Item: item }),
  );
}

function collectionName(name: string): string {
  if (name === 'SiteSettings') return 'sitesettings';
  if (name === 'JewelleryCombo') return 'jewellerycombos';
  if (name === 'Category') return 'categories';
  return `${name.toLowerCase()}s`;
}

async function main() {
  if (!isDynamoDbEnabled()) {
    throw new Error('Set DYNAMODB_TABLE');
  }
  if (!env.MONGODB_URI) {
    throw new Error('Set MONGODB_URI for source export');
  }
  if (!isS3UploadsEnabled()) {
    console.warn('[migrate] S3_UPLOADS_BUCKET not set — embedded images will be dropped.');
  } else {
    console.log(`[migrate] Uploading embedded images to s3://${env.S3_UPLOADS_BUCKET}/uploads/`);
  }

  await mongoose.connect(env.MONGODB_URI!);
  const db = mongoose.connection.db!;
  let uploadedImages = 0;
  let skippedLarge = 0;
  let failed = 0;

  for (const name of ENTITIES) {
    const col = db.collection(collectionName(name));
    const docs = await col.find().toArray();
    console.log(`Migrating ${name}: ${docs.length} documents`);
    for (const raw of docs) {
      const plain = toPlain(raw as Record<string, unknown>);
      const withImages = await migrateDocImages(name, plain);
      const embeddedBefore = JSON.stringify(plain).includes('data:image/');
      const embeddedAfter = JSON.stringify(withImages).includes('data:image/');
      if (embeddedBefore && !embeddedAfter && isS3UploadsEnabled()) {
        uploadedImages += 1;
      }

      const size = itemByteSize(withImages);
      if (size > 380000) {
        console.warn(
          `SKIP ${name} ${withImages._id} — ${size} bytes (DynamoDB 400KB limit after image upload)`,
        );
        skippedLarge += 1;
        continue;
      }

      try {
        await putEntity(name, withImages);
      } catch (err) {
        failed += 1;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`FAIL ${name} ${withImages._id}: ${msg}`);
      }
    }
  }

  await mongoose.disconnect();
  console.log('');
  console.log('Migration complete');
  console.log(`  Products/combos with images uploaded to S3: ${uploadedImages}`);
  if (skippedLarge) console.log(`  Skipped (too large): ${skippedLarge}`);
  if (failed) console.log(`  Failed writes: ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
