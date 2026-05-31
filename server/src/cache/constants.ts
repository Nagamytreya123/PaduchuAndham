export const KEY_PREFIX = 'paduchuandham';

/** Safety-net TTL when invalidation misses; catalog is invalidated on admin/order writes. */
export const CATALOG_TTL_SEC = 600;

/** Session user blob — short enough to pick up role changes without manual invalidation. */
export const SESSION_TTL_SEC = 600;

export const CATALOG_VERSION_KEY = `${KEY_PREFIX}:catalog:version`;
