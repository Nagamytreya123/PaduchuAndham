/**
 * One-time helper: assign createdAt/updatedAt to products missing them so catalog sort works.
 * Uses each product's updatedAt (or a fixed epoch) so recently edited items are not promoted.
 */
import { connectDb } from '../db/connect.js';
import { ProductModel } from '../models/Product.js';
import { invalidateCatalogCache } from '../cache/catalog.js';

async function backfillProductTimestamps() {
  await connectDb();

  const products = await ProductModel.find().lean();
  let updated = 0;
  const epochIso = new Date(0).toISOString();

  for (const product of products) {
    if (product.createdAt && product.updatedAt) continue;

    const createdAt = product.createdAt ?? product.updatedAt ?? epochIso;
    const updatedAt = product.updatedAt ?? product.createdAt ?? epochIso;

    await ProductModel.updateOne(
      { _id: product._id },
      {
        $set: {
          createdAt,
          updatedAt,
        },
      },
    );
    updated += 1;
  }

  await invalidateCatalogCache();
  console.log(`Backfilled timestamps on ${updated} of ${products.length} product(s).`);
}

backfillProductTimestamps().catch((err) => {
  console.error(err);
  process.exit(1);
});
