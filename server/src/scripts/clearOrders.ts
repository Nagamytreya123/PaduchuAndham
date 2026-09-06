import { connectDb } from '../db/connect.js';
import { OrderModel } from '../models/Order.js';
import { ReviewModel } from '../models/Review.js';

async function clearOrders() {
  await connectDb();

  const orders = await OrderModel.deleteMany({});
  const reviews = await ReviewModel.deleteMany({});

  console.log(`Removed ${orders.deletedCount} order(s).`);
  console.log(`Removed ${reviews.deletedCount} review(s) linked to orders.`);

}

clearOrders().catch((e) => {
  console.error(e);
  process.exit(1);
});
