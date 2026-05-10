export const JEWELLERY_SUB_PRESETS = ['Bangles', 'Chains', 'Earrings', 'Rings', 'Necklaces'] as const;

export type JewellerySubcategoryPreset = (typeof JEWELLERY_SUB_PRESETS)[number];

/** `'all'` means no subtype filter; otherwise exact `Product.subcategory` (preset spelling or custom). */
export type JewellerySubFilterKey = 'all' | JewellerySubcategoryPreset | (string & {});

export function normalizeJewellerySubcategoryParam(raw: string): '' | JewellerySubcategoryPreset {
  const t = raw.trim().toLowerCase();
  for (const opt of JEWELLERY_SUB_PRESETS) {
    if (opt.toLowerCase() === t) return opt;
  }
  return '';
}

/** Maps URL/query value to the string sent to the API (canonical preset or custom text). */
export function parseJewellerySubcategoryForApi(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const asPreset = normalizeJewellerySubcategoryParam(t);
  if (asPreset) return asPreset;
  return t;
}

/** Presets in fixed order, then unique custom subcategories (case-insensitive dedupe), sorted A–Z. */
export function orderedJewellerySubtypeOptions(distinctSubcategories: Iterable<string>): string[] {
  const custom = new Map<string, string>();
  for (const raw of distinctSubcategories) {
    const t = raw.trim();
    if (!t) continue;
    if (normalizeJewellerySubcategoryParam(t)) continue;
    const k = t.toLowerCase();
    if (!custom.has(k)) custom.set(k, t);
  }
  const customSorted = Array.from(custom.values()).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );
  return [...JEWELLERY_SUB_PRESETS, ...customSorted];
}
