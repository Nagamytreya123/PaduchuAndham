/** In production, set VITE_API_URL to your API origin (no trailing slash). Dev uses Vite proxy with this unset. */
function resolveApiBase(): string {
  const raw = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  if (!raw || typeof window === 'undefined') return raw;
  try {
    // Cross-origin API (e.g. onrender.com) cannot read cookies set on the shop domain.
    if (new URL(raw).origin !== window.location.origin) return '';
  } catch {
    return raw;
  }
  return raw;
}

const base = resolveApiBase();
async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit & { parseJson?: boolean },
): Promise<T> {
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type') && init?.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  });
  const data = await parseJson(res);
  if (!res.ok) {
    const msg =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : res.statusText;
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return data as T;
}
