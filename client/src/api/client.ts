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

/** Retries for Render cold-start / hibernate 429s and transient 503s (GET only). */
const MAX_RETRIES = 4;
const INITIAL_RETRY_MS = 2000;
const MAX_RETRY_MS = 16000;
const RETRYABLE_STATUS = new Set([429, 503]);

function isIdempotentRequest(init?: RequestInit): boolean {
  const method = (init?.method ?? 'GET').toUpperCase();
  return method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
}

function parseRetryAfterMs(retryAfter: string | null): number | null {
  if (!retryAfter) return null;
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(retryAfter);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

function retryDelayMs(attempt: number, retryAfter: string | null): number {
  const fromHeader = parseRetryAfterMs(retryAfter);
  const baseDelay = fromHeader ?? Math.min(INITIAL_RETRY_MS * 2 ** attempt, MAX_RETRY_MS);
  const jitter = Math.random() * 0.25 * baseDelay;
  return Math.min(baseDelay + jitter, MAX_RETRY_MS);
}

function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
  });
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function responseErrorMessage(res: Response, data: unknown): string {
  if (typeof data === 'object' && data !== null && 'error' in data) {
    return String((data as { error: unknown }).error);
  }
  return res.statusText;
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
  const fetchInit: RequestInit = {
    ...init,
    credentials: 'include',
    headers,
  };
  const canRetry = isIdempotentRequest(init);
  const signal = init?.signal ?? null;

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, fetchInit);
    const data = await parseJson(res);

    if (res.ok) return data as T;

    if (
      canRetry &&
      RETRYABLE_STATUS.has(res.status) &&
      attempt < MAX_RETRIES &&
      !signal?.aborted
    ) {
      await sleep(retryDelayMs(attempt, res.headers.get('Retry-After')), signal);
      continue;
    }

    const msg = responseErrorMessage(res, data);
    throw new Error(msg || `HTTP ${res.status}`);
  }
}
