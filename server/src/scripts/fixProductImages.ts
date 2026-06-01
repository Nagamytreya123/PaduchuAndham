import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ProductModel } from '../models/Product.js';
import { invalidateCatalogCache } from '../cache/catalog.js';
import { buildProductImages } from '../utils/catalogImageUrl.js';
import { connectRedis, disconnectRedis, isRedisCacheEnabled } from '../redis/client.js';
import { SAMPLE_CATALOG } from './sampleCatalog.js';

const skuToCatalogIndex = new Map(
  SAMPLE_CATALOG.map((row, index) => [row.sku.toUpperCase(), index]),
);

function fallbackCatalogIndex(sku: string): number {
  let h = 0;
  for (let i = 0; i < sku.length; i++) h = (h * 31 + sku.charCodeAt(i)) >>> 0;
  return h % SAMPLE_CATALOG.length;
}

async function fixProductImages() {
  await mongoose.connect(env.MONGODB_URI);

  const products = await ProductModel.find().sort({ sku: 1 }).lean();
  let updated = 0;

  for (const p of products) {
    const skuKey = (p.sku ?? '').toUpperCase();
    const index = skuToCatalogIndex.get(skuKey) ?? fallbackCatalogIndex(skuKey || String(p._id));
    const images = buildProductImages(index);

    const current = p.images ?? [];
    const same =
      current.length === images.length && current.every((url, i) => url === images[i]);
    if (same) continue;

    await ProductModel.updateOne({ _id: p._id }, { $set: { images } });
    updated += 1;
  }

  await connectRedis();
  await invalidateCatalogCache();
  if (isRedisCacheEnabled()) {
    console.log('Catalog cache version bumped (Redis).');
  } else {
    console.log(
      'Redis catalog cache not writable — restart the API server or fix REDIS_URL so clients see new images.',
    );
  }
  await disconnectRedis();

  console.log(
    `Updated images on ${updated} of ${products.length} product(s). Each has a unique primary URL.`,
  );
  await mongoose.disconnect();
}

fixProductImages().catch((e) => {
  console.error(e);
  process.exit(1);
});
