import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { UserModel } from '../models/User.js';
import { ProductModel } from '../models/Product.js';
import { SAMPLE_CATALOG, type SampleProductInput } from './sampleCatalog.js';
import { invalidateCatalogCache } from '../cache/catalog.js';

const STARTER_JEWELLERY_SUBCATEGORIES = [
  'Necklaces',
  'Earrings',
  'Bangles',
  'Rings',
  'Chains',
] as const;

function pickStarterProducts(): SampleProductInput[] {
  const picked: SampleProductInput[] = [];

  for (const sub of STARTER_JEWELLERY_SUBCATEGORIES) {
    const row = SAMPLE_CATALOG.find((p) => p.category === 'Jewellery' && p.subcategory === sub);
    if (row) picked.push(row);
  }

  for (const category of ['Watches', 'Bracelets'] as const) {
    const row = SAMPLE_CATALOG.find((p) => p.category === category);
    if (row) picked.push(row);
  }

  return picked;
}

const adminEmail = process.env.SEED_ADMIN_EMAIL?.toLowerCase() || 'admin@example.com';

async function seedStarterProducts() {
  await mongoose.connect(env.MONGODB_URI);

  const admin = await UserModel.findOne({ email: adminEmail, role: 'admin' }).exec();
  if (!admin) {
    console.error(`No admin user with email ${adminEmail}. Run: npm run seed`);
    process.exit(1);
  }

  const rows = pickStarterProducts();
  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const exists = await ProductModel.exists({ sku: row.sku });
    if (exists) {
      skipped += 1;
      continue;
    }
    await ProductModel.create({
      ...row,
      materials: row.materials ?? [],
      tags: row.tags ?? [],
      matchingBraceletIds: row.matchingBraceletIds?.map((id) => new mongoose.Types.ObjectId(id)),
      createdBy: admin._id,
      isActive: true,
    });
    inserted += 1;
    console.log(`  + ${row.category}${row.subcategory ? ` / ${row.subcategory}` : ''}: ${row.name}`);
  }

  await invalidateCatalogCache();
  console.log(`Inserted ${inserted} starter product(s). Skipped ${skipped} (SKU already exists).`);
  await mongoose.disconnect();
}

seedStarterProducts().catch((e) => {
  console.error(e);
  process.exit(1);
});
