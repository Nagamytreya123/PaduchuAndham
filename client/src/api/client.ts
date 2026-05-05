const base = typeof window !== 'undefined' ? '' : import.meta.env.VITE_API_URL ?? '';

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
