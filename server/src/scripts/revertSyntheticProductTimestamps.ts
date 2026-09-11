/**
 * Clears synthetic createdAt values assigned by backfillProductTimestamps when they
 * used near-now staggered timestamps (products should sort last when createdAt is unknown).
 */
import { connectDb } from '../db/connect.js';
import { ProductModel } from '../models/Product.js';
import { invalidateCatalogCache } from '../cache/catalog.js';

async function revertSyntheticProductTimestamps() {
  await connectDb();

  const products = await ProductModel.find().lean();
  let cleared = 0;

  for (const product of products) {
    const created = product.createdAt ? new Date(product.createdAt).toISOString() : '';
    if (!created.startsWith('2026-09-08T16:39:')) continue;

    await ProductModel.updateOne(
      { _id: product._id },
      { $unset: { createdAt: '' } },
    );
    cleared += 1;
    console.log('cleared', product.name, created);
  }

  await invalidateCatalogCache();
  console.log(`Cleared synthetic createdAt on ${cleared} product(s).`);
}

revertSyntheticProductTimestamps().catch((err) => {
  console.error(err);
  process.exit(1);
});
