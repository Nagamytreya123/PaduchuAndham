import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ProductModel } from '../models/Product.js';
import { JewelleryComboModel } from '../models/JewelleryCombo.js';
import { normalizeStoredImageUrl } from '../utils/mediaUrl.js';
import { invalidateCatalogCache } from '../cache/catalog.js';
import { connectRedis, disconnectRedis } from '../redis/client.js';

async function migrateProductImageUrls() {
  await mongoose.connect(env.MONGODB_URI);

  const products = await ProductModel.find().lean();
  let updated = 0;

  for (const p of products) {
    const images = (p.images ?? []).map(normalizeStoredImageUrl).filter(Boolean);
    const same =
      (p.images ?? []).length === images.length &&
      (p.images ?? []).every((url, i) => url === images[i]);
    if (same) continue;
    await ProductModel.updateOne({ _id: p._id }, { $set: { images } });
    updated += 1;
  }

  const combos = await JewelleryComboModel.find().lean();
  let combosUpdated = 0;
  for (const c of combos) {
    const images = (c.images ?? []).map(normalizeStoredImageUrl).filter(Boolean);
    const same =
      (c.images ?? []).length === images.length &&
      (c.images ?? []).every((url, i) => url === images[i]);
    if (same) continue;
    await JewelleryComboModel.updateOne({ _id: c._id }, { $set: { images } });
    combosUpdated += 1;
  }

  await connectRedis();
  await invalidateCatalogCache();
  await disconnectRedis();

  const withoutImages = await ProductModel.countDocuments({
    $or: [{ images: { $exists: false } }, { images: { $size: 0 } }],
  });

  console.log(`Normalized image URLs on ${updated} product(s) and ${combosUpdated} combo(s).`);
  console.log(`${withoutImages} product(s) still have no images — upload photos in Admin → Products.`);
  await mongoose.disconnect();
}

migrateProductImageUrls().catch((e) => {
  console.error(e);
  process.exit(1);
});
