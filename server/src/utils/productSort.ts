function createdAtMs(raw: unknown): number {
  if (raw instanceof Date) return raw.getTime();
  if (typeof raw === 'string') {
    const ms = Date.parse(raw);
    return Number.isNaN(ms) ? 0 : ms;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  return 0;
}

function productId(raw: { _id?: unknown; id?: unknown }): string {
  return String(raw._id ?? raw.id ?? '');
}

/** Newest created first; stable tie-break on id. */
export function compareProductsByCreatedDesc(
  a: { _id?: unknown; id?: unknown; createdAt?: unknown },
  b: { _id?: unknown; id?: unknown; createdAt?: unknown },
): number {
  const diff = createdAtMs(b.createdAt) - createdAtMs(a.createdAt);
  if (diff !== 0) return diff;
  return productId(b).localeCompare(productId(a));
}

export function sortProductsByCreatedDesc<T>(products: readonly T[]): T[] {
  return [...products].sort((a, b) =>
    compareProductsByCreatedDesc(
      a as { _id?: unknown; id?: unknown; createdAt?: unknown },
      b as { _id?: unknown; id?: unknown; createdAt?: unknown },
    ),
  );
}
