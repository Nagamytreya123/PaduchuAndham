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

function nowIso(): string {
  return new Date().toISOString();
}

function stampCreateTimestamps(doc: EntityDoc): void {
  const now = nowIso();
  if (!doc.createdAt) doc.createdAt = now;
  if (!doc.updatedAt) doc.updatedAt = now;
}

function stampUpdateTimestamp(doc: EntityDoc): void {
  doc.updatedAt = nowIso();
}

function compareSortValues(av: unknown, bv: unknown): number {
  if (av == null && bv == null) return 0;
  if (av == null) return -1;
  if (bv == null) return 1;

  const toMs = (value: unknown): number | null => {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const ms = Date.parse(value);
      return Number.isNaN(ms) ? null : ms;
    }
    return null;
  };

  const ams = toMs(av);
  const bms = toMs(bv);
  if (ams != null && bms != null) return ams - bms;

  return String(av).localeCompare(String(bv));
}

function stripForStorage(doc: EntityDoc): EntityDoc {
  const out = { ...doc };
  delete (out as { save?: unknown }).save;
  delete (out as { set?: unknown }).set;
  delete (out as { toObject?: unknown }).toObject;
  if (Array.isArray(out.savedAddresses)) {
    out.savedAddresses = (out.savedAddresses as EntityDoc[]).map((addr) => {
      const clean = { ...addr };
      delete (clean as { set?: unknown }).set;
      delete (clean as { deleteOne?: unknown }).deleteOne;
      return clean;
    });
  }
  return out;
}

function buildPutItem(entityType: string, id: string, doc: EntityDoc): Record<string, unknown> {
  const normalized = stripForStorage(normalizeId(doc));
  const item: Record<string, unknown> = {
    pk: entityPk(entityType),
    sk: entitySk(id),
    entityType,
    data: normalized,
  };
  if (entityType === 'User' && normalized.email) {
    item.gsi1pk = `USER#EMAIL#${String(normalized.email).toLowerCase()}`;
    item.gsi1sk = 'PROFILE';
  }
  if (normalized.slug) {
    item.gsi1pk = `${entityType.toUpperCase()}#SLUG#${String(normalized.slug).toLowerCase()}`;
    item.gsi1sk = 'PROFILE';
  }
  if (entityType === 'Order') {
    if (normalized.user) {
      item.gsi1pk = `ORDER#USER#${String(normalized.user)}`;
      const createdAt = normalized.createdAt
        ? new Date(normalized.createdAt as string | number | Date).toISOString()
        : new Date().toISOString();
      item.gsi1sk = `CREATED#${createdAt}#${id}`;
    }
    if (normalized.razorpayOrderId) {
      item.gsi2pk = `ORDER#RAZORPAY#${String(normalized.razorpayOrderId)}`;
      item.gsi2sk = 'PROFILE';
    }
  }
  return item;
}

function hydrateSubdoc(sub: EntityDoc, removeFromParent: () => void): EntityDoc & {
  set: (key: string, value: unknown) => void;
  deleteOne: () => void;
} {
  const row = sub as EntityDoc & {
    set: (key: string, value: unknown) => void;
    deleteOne: () => void;
  };
  row.set = (key, value) => {
    row[key] = value;
  };
  row.deleteOne = () => {
    removeFromParent();
  };
  return row;
}

function getNestedValue(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const [head, ...rest] = path.split('.');
  if (obj == null || typeof obj !== 'object') return undefined;
  const record = obj as Record<string, unknown>;
  if (rest.length === 0) return record[head];
  return getNestedValue(record[head], rest.join('.'));
}

function getFilterFieldValues(doc: EntityDoc, key: string): unknown[] {
  if (!key.includes('.')) {
    const val = doc[key];
    if (val === undefined) return [];
    return Array.isArray(val) ? val : [val];
  }

  const [root, ...rest] = key.split('.');
  const subPath = rest.join('.');
  const rootVal = doc[root];

  if (Array.isArray(rootVal)) {
    return rootVal
      .map((item) => getNestedValue(item, subPath))
      .filter((v) => v !== undefined);
  }

  const nested = getNestedValue(rootVal, subPath);
  if (nested === undefined) return [];
  return Array.isArray(nested) ? nested : [nested];
}

function matchesDocField(doc: EntityDoc, key: string, expected: unknown): boolean {
  if (!key.includes('.')) {
    return matchesFieldValue(doc[key], expected);
  }
  const values = getFilterFieldValues(doc, key);
  if (values.length === 0) {
    return matchesFieldValue(undefined, expected);
  }
  return values.some((v) => matchesFieldValue(v, expected));
}

/** Wrap plain `{ field: value }` updates as `$set` (Mongoose-style shorthand). */
function normalizeUpdate(update: Record<string, unknown>): Record<string, unknown> {
  const hasOperator = Object.keys(update).some((k) => k.startsWith('$'));
  if (hasOperator) return update;
  return { $set: update };
}

function cloneEntityData(doc: EntityDoc): EntityDoc {
  const withToObject = doc as EntityDoc & { toObject?: () => EntityDoc };
  if (typeof withToObject.toObject === 'function') {
    return withToObject.toObject();
  }
  const out = { ...doc };
  delete (out as { save?: unknown }).save;
  delete (out as { set?: unknown }).set;
  delete (out as { toObject?: unknown }).toObject;
  return out;
}

function pullValuesFromArray(current: unknown, pullSpec: unknown): unknown[] {
  if (!Array.isArray(current)) return [];
  const remove = new Set<string>();
  if (pullSpec && typeof pullSpec === 'object' && '$in' in pullSpec) {
    for (const v of (pullSpec as { $in: unknown[] }).$in) {
      remove.add(String(v));
    }
  } else {
    remove.add(String(pullSpec));
  }
  return current.filter((item) => !remove.has(String(item)));
}

function applyUpdateOperators(merged: EntityDoc, update: Record<string, unknown>): void {
  const normalized = normalizeUpdate(update);
  if (normalized.$set) Object.assign(merged, normalized.$set as EntityDoc);
  if (normalized.$inc) {
    for (const [k, v] of Object.entries(normalized.$inc as Record<string, number>)) {
      merged[k] = Number(merged[k] ?? 0) + Number(v);
    }
  }
  if (normalized.$pull) {
    for (const [field, pullSpec] of Object.entries(normalized.$pull as Record<string, unknown>)) {
      merged[field] = pullValuesFromArray(merged[field], pullSpec);
    }
  }
  if (normalized.$unset) {
    for (const field of Object.keys(normalized.$unset as Record<string, unknown>)) {
      delete merged[field];
    }
  }
}

function matchesFieldValue(actual: unknown, expected: unknown): boolean {
  if (expected instanceof RegExp) {
    return expected.test(String(actual ?? ''));
  }
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    const op = expected as Record<string, unknown>;
    const hasOperator = ['$in', '$nin', '$exists', '$ne', '$not', '$size'].some((key) => key in op);
    if (hasOperator) {
      if ('$in' in op) {
        const list = op.$in as unknown[];
        const cmp = Array.isArray(actual) ? actual : [actual];
        if (!list.some((v) => cmp.some((a) => String(a) === String(v)))) return false;
      }
      if ('$nin' in op) {
        const list = op.$nin as unknown[];
        const cmp = Array.isArray(actual) ? actual : [actual];
        if (list.some((v) => cmp.some((a) => String(a) === String(v)))) return false;
      }
      if ('$exists' in op) {
        const exists = Boolean(op.$exists);
        const has = actual !== undefined && actual !== null;
        if (exists !== has) return false;
      }
      if ('$ne' in op) {
        if (String(actual) === String(op.$ne)) return false;
      }
      if ('$not' in op) {
        if (matchesFieldValue(actual, op.$not)) return false;
      }
      if ('$size' in op) {
        const size = Array.isArray(actual) ? actual.length : 0;
        if (size !== Number(op.$size)) return false;
      }
      return true;
    }
  }
  if (Array.isArray(actual) && Array.isArray(expected)) {
    return JSON.stringify(actual) === JSON.stringify(expected);
  }
  if (expected && typeof expected === 'object') {
    return String(actual) === String(expected);
  }
  return String(actual) === String(expected);
}

function matchesFilter(doc: EntityDoc, filter: Record<string, unknown>): boolean {
  for (const [key, expected] of Object.entries(filter)) {
    if (key === '$or') {
      const clauses = expected as Record<string, unknown>[];
      if (!clauses.some((c) => matchesFilter(doc, c))) return false;
      continue;
    }
    if (key === '$and') {
      const clauses = expected as Record<string, unknown>[];
      if (!clauses.every((c) => matchesFilter(doc, c))) return false;
      continue;
    }
    if (key === '$nor') {
      const clauses = expected as Record<string, unknown>[];
      if (clauses.some((c) => matchesFilter(doc, c))) return false;
      continue;
    }
    if (!matchesDocField(doc, key, expected)) return false;
  }
  return true;
}

class DynamoQuery<T extends EntityDoc> {
  private sortSpec: Record<string, 1 | -1> | null = null;
  private skipN: number | null = null;
  private limitN: number | null = null;
  private selectFields: string[] | null = null;
  private populateSpecs: { path: string; select?: string }[] = [];
  private leanMode = false;

  constructor(
    private readonly entityType: string,
    private readonly filter: Record<string, unknown> = {},
    private readonly hydrateDoc?: (doc: T) => T,
  ) {}

  sort(spec: Record<string, 1 | -1>): this {
    this.sortSpec = spec;
    return this;
  }

  skip(n: number): this {
    this.skipN = n;
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
    this.leanMode = true;
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

    if (this.entityType === 'Order' && this.filter.razorpayOrderId) {
      const razorpayId = String(this.filter.razorpayOrderId);
      const extraKeys = Object.keys(this.filter).filter((k) => k !== 'razorpayOrderId');
      if (extraKeys.length <= 1) {
        const res = await getDynamoDoc().send(
          new QueryCommand({
            TableName: table,
            IndexName: 'GSI2',
            KeyConditionExpression: 'gsi2pk = :pk AND gsi2sk = :sk',
            ExpressionAttributeValues: {
              ':pk': `ORDER#RAZORPAY#${razorpayId}`,
              ':sk': 'PROFILE',
            },
          }),
        );
        let rows = (res.Items ?? []).map((i) => i.data as T);
        if (rows.length > 0) {
          rows = rows.filter((d) => matchesFilter(d, this.filter));
          rows = await this.applyPopulate(rows);
          return this.finish(rows);
        }
      }
    }

    if (
      this.entityType === 'Order' &&
      this.filter.user &&
      !this.filter.razorpayOrderId &&
      !this.filter._id
    ) {
      const userId = String(this.filter.user);
      const res = await getDynamoDoc().send(
        new QueryCommand({
          TableName: table,
          IndexName: 'GSI1',
          KeyConditionExpression: 'gsi1pk = :pk',
          ExpressionAttributeValues: {
            ':pk': `ORDER#USER#${userId}`,
          },
        }),
      );
      let rows = (res.Items ?? []).map((i) => i.data as T);
      if (rows.length > 0) {
        rows = rows.filter((d) => matchesFilter(d, this.filter));
        rows = await this.applyPopulate(rows);
        return this.finish(rows);
      }
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
      const entries = Object.entries(this.sortSpec);
      rows.sort((a, b) => {
        for (const [field, dir] of entries) {
          const cmp = compareSortValues(a[field as keyof T], b[field as keyof T]);
          if (cmp !== 0) return dir === -1 ? -cmp : cmp;
        }
        return 0;
      });
    }
    if (this.skipN !== null) rows = rows.slice(this.skipN);
    if (this.limitN !== null) rows = rows.slice(0, this.limitN);
    if (this.selectFields) {
      const excludeId = this.selectFields.includes('-_id');
      rows = rows.map((r) => {
        const out: Partial<T> = {};
        for (const f of this.selectFields!) {
          if (f.startsWith('-')) continue;
          (out as Record<string, unknown>)[f] = r[f as keyof T];
        }
        // Match Mongoose: _id is included unless explicitly excluded with -_id.
        if (!excludeId) (out as EntityDoc)._id = r._id;
        return out as T;
      });
    }
    if (!this.leanMode && this.hydrateDoc) {
      rows = rows.map((r) => this.hydrateDoc!(r));
    }
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

class DynamoOneQuery<T extends EntityDoc> {
  private readonly query: DynamoQuery<T>;

  constructor(
    entityType: string,
    filter: Record<string, unknown>,
    hydrateDoc?: (doc: T) => T,
  ) {
    this.query = new DynamoQuery<T>(entityType, filter, hydrateDoc);
  }

  sort(spec: Record<string, 1 | -1>): this {
    this.query.sort(spec);
    return this;
  }

  select(fields: string): this {
    this.query.select(fields);
    return this;
  }

  lean(): this {
    this.query.lean();
    return this;
  }

  populate(path: string, select?: string): this {
    this.query.populate(path, select);
    return this;
  }

  async exec(): Promise<T | null> {
    const rows = await this.query.limit(1).exec();
    return rows[0] ?? null;
  }

  then<TResult1 = T | null, TResult2 = never>(
    onfulfilled?: ((value: T | null) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

class DynamoFindByIdQuery<T extends EntityDoc> {
  private leanMode = false;

  constructor(
    private readonly entityType: string,
    private readonly id: string,
    private readonly hydrateDoc?: (doc: T) => T,
  ) {}

  lean(): this {
    this.leanMode = true;
    return this;
  }

  async exec(): Promise<T | null> {
    const res = await getDynamoDoc().send(
      new GetCommand({
        TableName: env.DYNAMODB_TABLE!,
        Key: { pk: entityPk(this.entityType), sk: entitySk(this.id) },
      }),
    );
    const raw = (res.Item?.data as T) ?? null;
    if (!raw) return null;
    return this.leanMode || !this.hydrateDoc ? raw : this.hydrateDoc(raw);
  }

  then<TResult1 = T | null, TResult2 = never>(
    onfulfilled?: ((value: T | null) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

export class DynamoEntityModel<T extends EntityDoc = EntityDoc> {
  constructor(private readonly entityType: string) {}

  find(filter: Record<string, unknown> = {}): DynamoQuery<T> {
    return new DynamoQuery<T>(this.entityType, filter, (doc) => this.hydrate(doc));
  }

  findById(id: string): DynamoFindByIdQuery<T> {
    return new DynamoFindByIdQuery<T>(this.entityType, id, (doc) => this.hydrate(doc));
  }

  findOne(filter: Record<string, unknown>): DynamoOneQuery<T> {
    return new DynamoOneQuery<T>(this.entityType, filter, (doc) => this.hydrate(doc));
  }

  private hydrate(doc: T): T {
    const self = this;
    const wrapped = doc as T & {
      save: () => Promise<T>;
      set: (key: string, value: unknown) => void;
      toObject: () => T;
    };
    wrapped.set = (key, value) => {
      (doc as EntityDoc)[key] = value;
    };
    wrapped.toObject = () => {
      const out = { ...(doc as EntityDoc) } as T;
      delete (out as EntityDoc & { save?: unknown }).save;
      delete (out as EntityDoc & { set?: unknown }).set;
      delete (out as EntityDoc & { toObject?: unknown }).toObject;
      return out;
    };
    wrapped.save = async () => {
      stampUpdateTimestamp(doc as EntityDoc);
      await self.replace(String((doc as EntityDoc)._id), doc);
      return wrapped;
    };
    if (this.entityType === 'User') {
      const rawAddrs = Array.isArray((doc as EntityDoc).savedAddresses)
        ? [...((doc as EntityDoc).savedAddresses as EntityDoc[])]
        : [];
      const hydratedAddrs: Array<EntityDoc & { set: (key: string, value: unknown) => void; deleteOne: () => void }> = [];

      const syncAddresses = () => {
        (doc as EntityDoc).savedAddresses = list;
      };

      const hydrateAddress = (addr: EntityDoc) => {
        const normalized = { ...addr };
        if (!normalized._id) normalized._id = newEntityId();
        return hydrateSubdoc(normalized, () => {
          const rawIdx = rawAddrs.findIndex((a) => String(a._id) === String(normalized._id));
          if (rawIdx >= 0) rawAddrs.splice(rawIdx, 1);
          const hydratedIdx = hydratedAddrs.findIndex((a) => String(a._id) === String(normalized._id));
          if (hydratedIdx >= 0) hydratedAddrs.splice(hydratedIdx, 1);
          syncAddresses();
        });
      };

      for (const addr of rawAddrs) {
        hydratedAddrs.push(hydrateAddress(addr));
      }

      const list = hydratedAddrs as unknown as EntityDoc[] & {
        id: (oid: { toString: () => string }) => EntityDoc | undefined;
        push: (...items: EntityDoc[]) => number;
      };
      list.id = (oid) => hydratedAddrs.find((a) => String(a._id) === oid.toString());
      list.push = (...items: EntityDoc[]) => {
        for (const a of items) {
          const row = hydrateAddress(a);
          Array.prototype.push.call(rawAddrs, row);
          // hydratedAddrs === list; use native push to avoid recursive list.push
          Array.prototype.push.call(hydratedAddrs, row);
        }
        syncAddresses();
        return hydratedAddrs.length;
      };
      syncAddresses();
    }
    return wrapped;
  }

  async create(doc: Partial<T>): Promise<T> {
    const normalized = normalizeId(doc as EntityDoc) as T;
    stampCreateTimestamps(normalized as EntityDoc);
    const id = String((normalized as EntityDoc)._id);
    await getDynamoDoc().send(
      new PutCommand({ TableName: env.DYNAMODB_TABLE!, Item: buildPutItem(this.entityType, id, normalized as EntityDoc) }),
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
    const merged = cloneEntityData(doc as EntityDoc);
    applyUpdateOperators(merged, update);
    await this.replace(id, merged as T);
  }

  async updateMany(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<void> {
    const rows = await this.find(filter).exec();
    for (const row of rows) {
      await this.updateOne({ _id: row._id }, update);
    }
  }

  async replace(id: string, doc: T): Promise<void> {
    stampUpdateTimestamp(doc as EntityDoc);
    await getDynamoDoc().send(
      new PutCommand({
        TableName: env.DYNAMODB_TABLE!,
        Item: buildPutItem(this.entityType, id, doc as EntityDoc),
      }),
    );
  }

  async findByIdAndUpdate(
    id: string,
    update: Record<string, unknown>,
    opts?: Record<string, unknown>,
  ): Promise<T | null> {
    return this.findOneAndUpdate({ _id: id }, update, opts);
  }

  async findByIdAndDelete(id: string): Promise<T | null> {
    const existing = await this.findById(id).exec();
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
    return this.findOne(filter).exec();
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
        for (const row of result as EntityDoc[]) {
          let key = 'all';
          if (spec._id === null) {
            key = 'all';
          } else if (typeof spec._id === 'string' && spec._id.startsWith('$')) {
            const field = spec._id.slice(1);
            key = String(row[field] ?? '');
          } else if (spec._id && typeof spec._id === 'object') {
            const idSpec = spec._id as Record<string, unknown>;
            if (idSpec.$toString) key = String(row._id);
          }
          const g: EntityDoc = groups.get(key) ?? { _id: spec._id === null ? undefined : key };
          for (const [field, expr] of Object.entries(spec)) {
            if (field === '_id') continue;
            if (!expr || typeof expr !== 'object') continue;
            const op = expr as Record<string, unknown>;
            if ('$sum' in op) {
              const sumVal = op.$sum;
              if (sumVal === 1) {
                g[field] = Number(g[field] ?? 0) + 1;
              } else {
                g[field] = Number(g[field] ?? 0) + Number(sumVal ?? 0);
              }
              continue;
            }
            if ('$avg' in op && typeof op.$avg === 'string' && op.$avg.startsWith('$')) {
              const rowField = op.$avg.slice(1);
              const metaKey = `__avg__${field}`;
              const meta = (g[metaKey] as { sum: number; count: number } | undefined) ?? { sum: 0, count: 0 };
              meta.sum += Number(row[rowField] ?? 0);
              meta.count += 1;
              g[metaKey] = meta;
              g[field] = meta.count > 0 ? meta.sum / meta.count : null;
            }
          }
          if (spec.units && typeof spec.units === 'object' && '$sum' in (spec.units as object)) {
            g.units = Number(g.units ?? 0) + Number(row.qty ?? row.units ?? 1);
          }
          groups.set(key, g);
        }
        result = [...groups.values()].map((g) => {
          const out = { ...g } as EntityDoc;
          for (const key of Object.keys(out)) {
            if (key.startsWith('__avg__')) delete out[key];
          }
          return out;
        });
      }
    }
    return result as R[];
  }
}

export function createDynamoModel<T extends EntityDoc = EntityDoc>(entityType: string): DynamoEntityModel<T> {
  return new DynamoEntityModel<T>(entityType);
}
