/** Unsplash photo IDs verified to return HTTP 200 (others in the old seed often 404). */
export const VERIFIED_UNSPLASH_IDS = [
  '1523275335684-37898b6baf30',
  '1524592094714-0f0654e20314',
  '1573408301185-9146fe634ad0',
  '1614164185128-e4ec99c436d7',
  '1594534475808-b18fc33b045e',
  '1434056886845-dac89ffe9b56',
  '1587836374828-4dbafa94cf0e',
  '1547996160-81dfa63595aa',
  '1617038220319-276d3cfab638',
  '1585123334904-845d60e97b29',
  '1599643478518-a784e5dc4c8f',
  '1526045431048-f857369baa09',
  '1509042239860-f550ce710b93',
  '1558618666-fcd25c85cd64',
] as const;

export function unsplashUrl(photoId: string, width = 800): string {
  return `https://images.unsplash.com/photo-${photoId}?w=${width}&q=80&auto=format`;
}

export function verifiedImageAt(index: number, width = 800): string {
  const id = VERIFIED_UNSPLASH_IDS[index % VERIFIED_UNSPLASH_IDS.length]!;
  return unsplashUrl(id, width);
}
