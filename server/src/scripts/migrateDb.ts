/**
 * Copy all collections from SOURCE_MONGODB_URI to MONGODB_URI (target).
 * Usage: SOURCE_MONGODB_URI="mongodb+srv://..." MONGODB_URI="mongodb+srv://..." npm run migrate:db
 */
import mongoose from 'mongoose';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}.`);
    process.exit(1);
  }
  return value;
}

const sourceUri = requireEnv('SOURCE_MONGODB_URI');
const targetUri = requireEnv('MONGODB_URI');

if (sourceUri === targetUri) {
  console.error('SOURCE_MONGODB_URI and MONGODB_URI must be different.');
  process.exit(1);
}

async function main(): Promise<void> {
  const source = await mongoose.createConnection(sourceUri).asPromise();
  const target = await mongoose.createConnection(targetUri).asPromise();

  try {
    const dbName = source.db?.databaseName ?? 'ecommerce';
    console.log(`Migrating database "${dbName}"…`);

    const collections = await source.db!.listCollections().toArray();
    if (collections.length === 0) {
      console.log('Source database has no collections.');
      return;
    }

    for (const { name } of collections) {
      if (name.startsWith('system.')) continue;

      const srcCol = source.db!.collection(name);
      const tgtCol = target.db!.collection(name);
      const docs = await srcCol.find({}).toArray();

      await tgtCol.deleteMany({});
      if (docs.length > 0) {
        await tgtCol.insertMany(docs, { ordered: false });
      }

      const indexes = await srcCol.indexes();
      for (const idx of indexes) {
        if (idx.name === '_id_') continue;
        const { key, name: idxName, unique, sparse, expireAfterSeconds } = idx;
        const options: Record<string, unknown> = {};
        if (idxName) options.name = idxName;
        if (unique) options.unique = true;
        if (sparse) options.sparse = true;
        if (expireAfterSeconds !== undefined) options.expireAfterSeconds = expireAfterSeconds;
        try {
          await tgtCol.createIndex(key, options);
        } catch (e) {
          console.warn(`  index ${idxName} on ${name}:`, (e as Error).message);
        }
      }

      console.log(`  ${name}: ${docs.length} document(s)`);
    }

    console.log('Migration complete.');
  } finally {
    await source.close();
    await target.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
