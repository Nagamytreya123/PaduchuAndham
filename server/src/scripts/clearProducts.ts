import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ProductModel } from '../models/Product.js';
import { JewelleryComboModel } from '../models/JewelleryCombo.js';
import { CartModel } from '../models/Cart.js';
import { ReviewModel } from '../models/Review.js';
import { invalidateCatalogCache } from '../cache/catalog.js';

async function clearProducts() {
  await mongoose.connect(env.MONGODB_URI);

  const products = await ProductModel.deleteMany({});
  const combos = await JewelleryComboModel.deleteMany({});
  const carts = await CartModel.updateMany({}, { $set: { items: [] } });
  const reviews = await ReviewModel.deleteMany({});

  await invalidateCatalogCache();

  console.log(`Removed ${products.deletedCount} product(s).`);
  console.log(`Removed ${combos.deletedCount} jewellery combo(s).`);
  console.log(`Cleared items from ${carts.modifiedCount} cart(s).`);
  console.log(`Removed ${reviews.deletedCount} review(s).`);

  await mongoose.disconnect();
}

clearProducts().catch((e) => {
  console.error(e);
  process.exit(1);
});
