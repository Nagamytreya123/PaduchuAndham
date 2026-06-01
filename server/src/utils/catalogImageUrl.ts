/** These picsum ids 404 at 800×800; all others in 1–194 work. */
const BROKEN_PICSUM_IDS = new Set([86, 97, 105, 138, 148, 150]);

const WORKING_PICSUM_IDS: number[] = [];
for (let id = 1; id <= 194; id++) {
  if (!BROKEN_PICSUM_IDS.has(id)) WORKING_PICSUM_IDS.push(id);
}

export function catalogPicsumUrl(slot: number, size = 800): string {
  const id = WORKING_PICSUM_IDS[slot % WORKING_PICSUM_IDS.length]!;
  return `https://picsum.photos/id/${id}/${size}/${size}`;
}

/** Four unique image URLs per catalogue row (primary + gallery). */
export function buildProductImages(catalogIndex: number): string[] {
  const slots = [
    catalogIndex,
    catalogIndex + 70,
    catalogIndex + 140,
    catalogIndex + 210,
  ];
  return slots.map((s) => catalogPicsumUrl(s));
}
