import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ProductModel } from '../models/Product.js';
import { normalizeStoredImageUrl } from '../utils/mediaUrl.js';

async function checkUrl(url: string): Promise<{ url: string; status: number | string }> {
  const resolved = url.startsWith('http')
    ? url
    : `https://paduchuandham.onrender.com${normalizeStoredImageUrl(url)}`;
  try {
    const res = await fetch(resolved, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
    return { url: resolved, status: res.status };
  } catch (e) {
    return { url: resolved, status: e instanceof Error ? e.message : 'error' };
  }
}

async function main() {
  await mongoose.connect(env.MONGODB_URI);

  const products = await ProductModel.find({ 'images.0': { $exists: true } })
    .select('name images')
    .lean();

  console.log(`\nChecking ${products.length} product(s) with images:\n`);
  for (const p of products) {
    console.log(p.name);
    for (const raw of p.images ?? []) {
      const normalized = normalizeStoredImageUrl(raw);
      if (normalized.startsWith('data:image/')) {
        const kb = Math.round(Buffer.byteLength(normalized, 'utf8') / 1024);
        console.log(`  embedded base64  (~${kb} KB)`);
        continue;
      }
      const result = await checkUrl(normalized);
      console.log(`  ${result.status}  ${result.url}`);
    }
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
