const ENTITY_ID_RE = /^[a-fA-F0-9]{24}$/;

/** 24-char hex entity ids (ObjectId-shaped, used by DynamoDB adapter). */
export function isValidEntityId(id: string): boolean {
  return ENTITY_ID_RE.test(id);
}

export type EntityId = string;

/** Ref for DynamoDB savedAddresses.id() lookups. */
export function entityIdRef(id: string): { toString: () => string } {
  return { toString: () => id };
}
