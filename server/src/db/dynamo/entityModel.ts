import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { env } from '../../config/env.js';
import { randomBytes } from 'node:crypto';

let doc: DynamoDBDocumentClient | null = null;

export function isDynamoDbEnabled(): boolean {
  return Boolean(env.DYNAMODB_TABLE?.trim());
}

export function getDynamoDoc(): DynamoDBDocumentClient {
  if (!doc) {
    const client = new DynamoDBClient({ region: env.AWS_REGION });
    doc = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return doc;
}

export function newEntityId(): string {
  return randomBytes(12).toString('hex');
}

type EntityDoc = Record<string, unknown> & { _id?: string };

function entityPk(entityType: string): string {
  return `ENTITY#${entityType}`;
}

function entitySk(id: string): string {
  return `ID#${id}`;
}

function normalizeId(doc: EntityDoc): EntityDoc {
  const id = String(doc._id ?? doc.id ?? newEntityId());
  return { ...doc, _id: id };
}

function matchesFilter(doc: EntityDoc, filter: Record<string, unknown>): boolean {
  for (const [key, expected] of Object.entries(filter)) {
    if (key === '$or') {
      const clauses = expected as Record<string, unknown>[];
      if (!clauses.some((c) => matchesFilter(doc, c))) return false;
      continue;
    }
    const actual = doc[key];
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      const op = expected as Record<string, unknown>;
      if ('$in' in op) {
        const list = op.$in as unknown[];
        const cmp = Array.isArray(actual) ? actual : [actual];
        if (!list.some((v) => cmp.some((a) => String(a) === String(v)))) return false;
        continue;
      }
      if ('$exists' in op) {
        const exists = Boolean(op.$exists);
        const has = actual !== undefined && actual !== null;
        if (exists !== has) return false;
        continue;
      }
      if ('$ne' in op) {
        if (String(actual) === String(op.$ne)) return false;
        continue;
      }
    }
    if (Array.isArray(actual) && Array.isArray(expected)) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) return false;
    } else if (String(actual) !== String(expected)) {
      return false;
    }
  }
  return true;
}

class DynamoQuery<T extends EntityDoc> {
  private sortSpec: Record<string, 1 | -1> | null = null;
  private limitN: number | null = null;
  private selectFields: string[] | null = null;
  private populateSpecs: { path: string; select?: string }[] = [];

  constructor(
    private readonly entityType: string,
    private readonly filter: Record<string, unknown> = {},
  ) {}

  sort(spec: Record<string, 1 | -1>): this {
    this.sortSpec = spec;
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  select(fields: string): this {
    this.selectFields = fields.split(/\s+/).filter(Boolean);
    return this;
  }

  populate(path: string, select?: string): this {
    this.populateSpecs.push({ path, select });
    return this;
  }

  lean(): this {
    return this;
  }

  async exec(): Promise<T[]> {
    return this.run();
  }

  then<TResult1 = T[], TResult2 = never>(
    onfulfilled?: ((value: T[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }

  private async run(): Promise<T[]> {
    const table = env.DYNAMODB_TABLE!;
    const pk = entityPk(this.entityType);

    // Direct GSI lookups
    if (this.filter.email && Object.keys(this.filter).length === 1) {
      const email = String(this.filter.email).toLowerCase();
      const res = await getDynamoDoc().send(
        new QueryCommand({
          TableName: table,
          IndexName: 'GSI1',
          KeyConditionExpression: 'gsi1pk = :pk AND gsi1sk = :sk',
          ExpressionAttributeValues: {
            ':pk': `USER#EMAIL#${email}`,
            ':sk': 'PROFILE',
          },
        }),
      );
      let rows = (res.Items ?? []).map((i) => i.data as T);
      rows = await this.applyPopulate(rows);
      return this.finish(rows);
    }

    if (this.filter.slug && Object.keys(this.filter).length <= 2) {
      const slug = String(this.filter.slug).toLowerCase();
      const res = await getDynamoDoc().send(
        new QueryCommand({
          TableName: table,
          IndexName: 'GSI1',
          KeyConditionExpression: 'gsi1pk = :pk AND gsi1sk = :sk',
          ExpressionAttributeValues: {
            ':pk': `${this.entityType.toUpperCase()}#SLUG#${slug}`,
            ':sk': 'PROFILE',
          },
        }),
      );
      let rows = (res.Items ?? []).map((i) => i.data as T);
      if (this.filter.isActive !== undefined) {
        rows = rows.filter((r) => r.isActive === this.filter.isActive);
      }
      rows = await this.applyPopulate(rows);
      return this.finish(rows);
    }

    const res = await getDynamoDoc().send(
      new QueryCommand({
        TableName: table,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': pk },
      }),
    );
    let rows = (res.Items ?? [])
      .map((i) => i.data as T)
      .filter((d) => matchesFilter(d, this.filter));
    rows = await this.applyPopulate(rows);
    return this.finish(rows);
  }

  private finish(rows: T[]): T[] {
    if (this.sortSpec) {
      const [[field, dir]] = Object.entries(this.sortSpec);
      rows.sort((a, b) => {
        const av = a[field as keyof T];
        const bv = b[field as keyof T];
        const cmp = String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0;
        return dir === -1 ? -cmp : cmp;
      });
    }
    if (this.selectFields) {
      rows = rows.map((r) => {
        const out: Partial<T> = {};
        for (const f of this.selectFields!) {
          if (f.startsWith('-')) continue;
          (out as Record<string, unknown>)[f] = r[f as keyof T];
        }
        if (this.selectFields!.includes('_id')) (out as EntityDoc)._id = r._id;
        return out as T;
      });
    }
    if (this.limitN !== null) rows = rows.slice(0, this.limitN);
    return rows;
  }

  private async applyPopulate(rows: T[]): Promise<T[]> {
    if (!this.populateSpecs.length) return rows;
    const out = [...rows];
    for (const spec of this.populateSpecs) {
      for (let i = 0; i < out.length; i++) {
        const row = out[i] as EntityDoc;
        const refId = row[spec.path];
        if (!refId) continue;
        const refEntity =
          spec.path === 'user' ? 'User' : spec.path === 'product' ? 'Product' : 'Order';
        const ref = await getDynamoDoc().send(
          new GetCommand({
            TableName: env.DYNAMODB_TABLE!,
            Key: { pk: entityPk(refEntity), sk: entitySk(String(refId)) },
          }),
        );
        if (ref.Item?.data) {
          const populated = ref.Item.data as EntityDoc;
          if (spec.select) {
            const fields = spec.select.split(/\s+/);
            const slim: EntityDoc = { _id: populated._id };
            for (const f of fields) slim[f] = populated[f];
            row[spec.path] = slim;
          } else {
            row[spec.path] = populated;
          }
        }
      }
    }
    return out;
  }
}

export class DynamoEntityModel<T extends EntityDoc = EntityDoc> {
  constructor(private readonly entityType: string) {}

  find(filter: Record<string, unknown> = {}): DynamoQuery<T> {
    return new DynamoQuery<T>(this.entityType, filter);
  }

  async findById(id: string): Promise<T | null> {
    const res = await getDynamoDoc().send(
      new GetCommand({
        TableName: env.DYNAMODB_TABLE!,
        Key: { pk: entityPk(this.entityType), sk: entitySk(id) },
      }),
    );
    const raw = (res.Item?.data as T) ?? null;
    return raw ? this.hydrate(raw) : null;
  }

  async findOne(filter: Record<string, unknown>): Promise<T | null> {
    const rows = await this.find(filter).limit(1).exec();
    const raw = rows[0] ?? null;
    return raw ? this.hydrate(raw) : null;
  }

  private hydrate(doc: T): T {
    const self = this;
    const wrapped = doc as T & { save: () => Promise<T> };
    wrapped.save = async () => {
      await self.replace(String((doc as EntityDoc)._id), doc);
      return wrapped;
    };
    if (this.entityType === 'User' && Array.isArray((doc as EntityDoc).savedAddresses)) {
      const addrs = [...((doc as EntityDoc).savedAddresses as EntityDoc[])];
      const list = addrs as EntityDoc[] & {
        id: (oid: { toString: () => string }) => EntityDoc | undefined;
        push: (a: EntityDoc) => void;
      };
      list.id = (oid) => addrs.find((a) => String(a._id) === oid.toString());
      list.push = (...items: EntityDoc[]) => {
        for (const a of items) {
          if (!a._id) a._id = newEntityId();
          addrs.push(a);
        }
        (doc as EntityDoc).savedAddresses = addrs;
        return addrs.length;
      };
      (wrapped as EntityDoc).savedAddresses = list;
    }
    return wrapped;
  }

  async create(doc: Partial<T>): Promise<T> {
    const normalized = normalizeId(doc as EntityDoc) as T;
    const id = String((normalized as EntityDoc)._id);
    const item: Record<string, unknown> = {
      pk: entityPk(this.entityType),
      sk: entitySk(id),
      entityType: this.entityType,
      data: normalized,
    };
    if (this.entityType === 'User' && (normalized as EntityDoc).email) {
      item.gsi1pk = `USER#EMAIL#${String((normalized as EntityDoc).email).toLowerCase()}`;
      item.gsi1sk = 'PROFILE';
    }
    if ((normalized as EntityDoc).slug) {
      item.gsi1pk = `${this.entityType.toUpperCase()}#SLUG#${String((normalized as EntityDoc).slug).toLowerCase()}`;
      item.gsi1sk = 'PROFILE';
    }
    await getDynamoDoc().send(
      new PutCommand({ TableName: env.DYNAMODB_TABLE!, Item: item }),
    );
    return this.hydrate(normalized);
  }

  async updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    opts?: { upsert?: boolean },
  ): Promise<void> {
    const doc = await this.findOne(filter);
    if (!doc) {
      if (opts?.upsert || update.$setOnInsert) {
        await this.create({
          ...(update.$setOnInsert as Partial<T>),
          ...(update.$set as Partial<T>),
          ...filter,
        } as Partial<T>);
      }
      return;
    }
    const id = String((doc as EntityDoc)._id);
    const merged = { ...doc } as EntityDoc;
    if (update.$set) Object.assign(merged, update.$set);
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc as Record<string, number>)) {
        merged[k] = Number(merged[k] ?? 0) + Number(v);
      }
    }
    await this.replace(id, merged as T);
  }

  async updateMany(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<void> {
    const rows = await this.find(filter).exec();
    for (const row of rows) {
      await this.updateOne({ _id: row._id }, update);
    }
  }

  async replace(id: string, doc: T): Promise<void> {
    const normalized = normalizeId(doc as EntityDoc) as T;
    await getDynamoDoc().send(
      new PutCommand({
        TableName: env.DYNAMODB_TABLE!,
        Item: {
          pk: entityPk(this.entityType),
          sk: entitySk(id),
          entityType: this.entityType,
          data: normalized,
        },
      }),
    );
  }

  async findByIdAndDelete(id: string): Promise<T | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await getDynamoDoc().send(
      new DeleteCommand({
        TableName: env.DYNAMODB_TABLE!,
        Key: { pk: entityPk(this.entityType), sk: entitySk(id) },
      }),
    );
    return existing;
  }

  async deleteOne(filter: Record<string, unknown>): Promise<void> {
    const doc = await this.findOne(filter);
    if (!doc) return;
    await getDynamoDoc().send(
      new DeleteCommand({
        TableName: env.DYNAMODB_TABLE!,
        Key: { pk: entityPk(this.entityType), sk: entitySk(String((doc as EntityDoc)._id)) },
      }),
    );
  }

  async deleteMany(filter: Record<string, unknown>): Promise<{ deletedCount: number }> {
    const rows = await this.find(filter).exec();
    for (const row of rows) {
      await getDynamoDoc().send(
        new DeleteCommand({
          TableName: env.DYNAMODB_TABLE!,
          Key: {
            pk: entityPk(this.entityType),
            sk: entitySk(String((row as EntityDoc)._id)),
          },
        }),
      );
    }
    return { deletedCount: rows.length };
  }

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    const rows = await this.find(filter).exec();
    return rows.length;
  }

  async exists(filter: Record<string, unknown>): Promise<{ _id: string } | null> {
    const doc = await this.findOne(filter);
    return doc ? { _id: String((doc as EntityDoc)._id) } : null;
  }

  async findOneAndUpdate(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    opts?: Record<string, unknown>,
  ): Promise<T | null> {
    const doc = await this.findOne(filter);
    if (!doc) {
      const shouldUpsert = Boolean(opts?.upsert) || Boolean(update.$setOnInsert);
      if (shouldUpsert) {
        const created = await this.create({
          ...(update.$setOnInsert as Partial<T>),
          ...(update.$set as Partial<T>),
          ...filter,
        } as Partial<T>);
        return created;
      }
      if (update.$setOnInsert && filter.user) {
        const created = await this.create({
          ...(update.$setOnInsert as Partial<T>),
          ...(update.$set as Partial<T>),
          ...filter,
        } as Partial<T>);
        return created;
      }
      return null;
    }
    await this.updateOne(filter, update);
    return this.findOne(filter);
  }

  async aggregate<R>(pipeline: Record<string, unknown>[]): Promise<R[]> {
    const rows = await this.find().exec();
    let result: unknown[] = rows;
    for (const stage of pipeline) {
      if (stage.$match) {
        result = (result as EntityDoc[]).filter((d) => matchesFilter(d, stage.$match as Record<string, unknown>));
      }
      if (stage.$group) {
        const groups = new Map<string, EntityDoc>();
        const spec = stage.$group as Record<string, unknown>;
        const idSpec = spec._id as Record<string, unknown>;
        for (const row of result as EntityDoc[]) {
          let key = 'all';
          if (idSpec?.$toString) key = String(row._id);
          if (typeof spec._id === 'string' && spec._id.startsWith('$')) {
            const field = spec._id.slice(1);
            key = String(row[field] ?? '');
          }
          const g = groups.get(key) ?? { _id: key };
          if (spec.units && typeof spec.units === 'object' && '$sum' in (spec.units as object)) {
            g.units = Number(g.units ?? 0) + Number(row.qty ?? row.units ?? 1);
          }
          groups.set(key, g);
        }
        result = [...groups.values()];
      }
    }
    return result as R[];
  }
}

export function createDynamoModel<T extends EntityDoc = EntityDoc>(entityType: string): DynamoEntityModel<T> {
  return new DynamoEntityModel<T>(entityType);
}
