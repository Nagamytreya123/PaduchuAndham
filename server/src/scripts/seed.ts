import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { UserModel } from '../models/User.js';

const adminEmail = process.env.SEED_ADMIN_EMAIL?.toLowerCase() || 'admin@example.com';
const customerEmail = process.env.SEED_CUSTOMER_EMAIL?.toLowerCase() || 'customer@example.com';

const SEED_ADMIN_GID = 'seed-google-admin';
const SEED_CUSTOMER_GID = 'seed-google-customer';

async function upsertSeedUser(
  email: string,
  data: { name: string; role: 'admin' | 'customer'; googleId: string },
) {
  const existing = await UserModel.findOne({
    $or: [{ email }, { googleId: data.googleId }],
  }).exec();
  if (existing) {
    await UserModel.updateOne({ _id: existing._id }, { $set: { email, ...data } });
  } else {
    await UserModel.create({ email, ...data });
  }
}

async function seed() {
  await mongoose.connect(env.MONGODB_URI);

  await upsertSeedUser(adminEmail, {
    name: 'Seed Admin',
    role: 'admin',
    googleId: SEED_ADMIN_GID,
  });

  await upsertSeedUser(customerEmail, {
    name: 'Seed Customer',
    role: 'customer',
    googleId: SEED_CUSTOMER_GID,
  });

  console.log(`Seeded users: ${adminEmail} (admin), ${customerEmail} (customer)`);
  console.log('Use POST /api/auth/dev-login with { "email": "..." } in development.');
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
