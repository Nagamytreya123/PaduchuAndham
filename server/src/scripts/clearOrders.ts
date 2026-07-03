import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { OrderModel } from '../models/Order.js';
import { ReviewModel } from '../models/Review.js';

async function clearOrders() {
  await mongoose.connect(env.MONGODB_URI);

  const orders = await OrderModel.deleteMany({});
  const reviews = await ReviewModel.deleteMany({});

  console.log(`Removed ${orders.deletedCount} order(s).`);
  console.log(`Removed ${reviews.deletedCount} review(s) linked to orders.`);

  await mongoose.disconnect();
}

clearOrders().catch((e) => {
  console.error(e);
  process.exit(1);
});
