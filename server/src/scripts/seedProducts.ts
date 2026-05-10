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

  const cleared = await ProductModel.deleteMany({});
  console.log(`Removed ${cleared.deletedCount} existing products (and their metadata).`);

  let inserted = 0;
  for (const row of SAMPLE_CATALOG) {
    await ProductModel.create({
      ...row,
      materials: row.materials ?? [],
      tags: row.tags ?? [],
      matchingBraceletIds: row.matchingBraceletIds?.map((id) => new mongoose.Types.ObjectId(id)),
      createdBy: admin._id,
      isActive: true,
    });
    inserted += 1;
  }

  console.log(`Seeded ${inserted} product(s) from sample catalog (${SAMPLE_CATALOG.length} rows).`);
  await mongoose.disconnect();
}

seedProducts().catch((e) => {
  console.error(e);
  process.exit(1);
});
