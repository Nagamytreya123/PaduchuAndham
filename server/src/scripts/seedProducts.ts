import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { UserModel } from '../models/User.js';
import { ProductModel } from '../models/Product.js';
import { SAMPLE_CATALOG } from './sampleCatalog.js';

const adminEmail = process.env.SEED_ADMIN_EMAIL?.toLowerCase() || 'admin@example.com';

async function seedProducts() {
  await mongoose.connect(env.MONGODB_URI);

  const admin = await UserModel.findOne({ email: adminEmail, role: 'admin' }).exec();
  if (!admin) {
    console.error(`No admin user with email ${adminEmail}. Run: npm run seed`);
    process.exit(1);
  }

  let inserted = 0;
  let updated = 0;

  for (const row of SAMPLE_CATALOG) {
    const payload = {
      ...row,
      createdBy: admin._id,
      isActive: true,
    };

    const existing = await ProductModel.findOne({ sku: row.sku }).exec();
    if (existing) {
      await ProductModel.updateOne({ _id: existing._id }, { $set: payload });
      updated += 1;
    } else {
      await ProductModel.create(payload);
      inserted += 1;
    }
  }

  console.log(`Sample catalog: ${inserted} inserted, ${updated} updated by SKU (${SAMPLE_CATALOG.length} items).`);
  await mongoose.disconnect();
}

seedProducts().catch((e) => {
  console.error(e);
  process.exit(1);
});
