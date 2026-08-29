const AWS_API_ORIGIN = 'https://4cntwh9o4m.execute-api.ap-south-1.amazonaws.com';

const SAME_ORIGIN_API_HOSTS = new Set(['paduchuandham.com', 'www.paduchuandham.com']);

/**
 * API base URL for fetch(). On paduchuandham.com the Cloudflare Worker proxies /api/*
 * same-origin — required so the JWT cookie (Domain=.paduchuandham.com) is sent.
 * VITE_API_URL is only for local dev / preview without the worker proxy.
 */
function resolveApiBase(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (SAME_ORIGIN_API_HOSTS.has(host)) return '';
    if (host === 'localhost' || host === '127.0.0.1') {
      const raw = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
      return raw || AWS_API_ORIGIN;
    }
  }

  const raw = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  if (raw) return raw;
  if (import.meta.env.DEV) return '';
  return '';
}

/** Retries for transient 429/503 on GET requests (cold starts, rate limits). */
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

export function apiUrl(path: string): string {
  return path.startsWith('http') ? path : `${resolveApiBase()}${path}`;
}

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit & { parseJson?: boolean },
): Promise<T> {
  const url = apiUrl(path);
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
