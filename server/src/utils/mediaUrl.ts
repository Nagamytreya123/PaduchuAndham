/** Relative path stored in DB — client prepends API origin when needed. */
export function uploadPublicPath(filename: string): string {
  return `/uploads/${filename}`;
}

/** Collapse absolute localhost/production URLs to `/uploads/...` for consistent serving. */
export function normalizeStoredImageUrl(url: string): string {
  const t = url.trim();
  if (!t) return t;
  if (t.startsWith('data:')) return t;
  if (t.startsWith('/uploads/')) return t;
  try {
    const parsed = new URL(t);
    if (parsed.pathname.startsWith('/uploads/')) return parsed.pathname;
  } catch {
    /* not an absolute URL */
  }
  return t;
}

export function normalizeImageList(urls: string[] | null | undefined): string[] {
  return (urls ?? []).map(normalizeStoredImageUrl).filter((u) => u.length > 0);
}
