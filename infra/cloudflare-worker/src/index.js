const API_ORIGIN = 'https://4cntwh9o4m.execute-api.ap-south-1.amazonaws.com';
const S3_HOST = 'paduchuandham-frontend-474476202047.s3-website.ap-south-1.amazonaws.com';
/** Product/combo images — serve from S3 directly (skip Lambda presigned redirect). */
const UPLOADS_S3_HOST = 'paduchuandham-uploads-474476202047.s3.ap-south-1.amazonaws.com';

/** Public GET APIs safe to cache at the edge (short TTL; origin Redis holds longer). */
const EDGE_CACHEABLE_API = new Set(['/api/products', '/api/site-settings', '/api/categories']);
const PRODUCT_DETAIL_API_RE = /^\/api\/products\/[a-fA-F0-9]{24}$/;

function isEdgeCacheableApi(pathname) {
  return EDGE_CACHEABLE_API.has(pathname) || PRODUCT_DETAIL_API_RE.test(pathname);
}

/** Razorpay checkout loads checkout.js plus auxiliary bundles (e.g. cdn.razorpay.com risk detection). */
const RAZORPAY_SOURCES =
  'https://checkout.razorpay.com https://api.razorpay.com https://*.razorpay.com';

function applyHtmlSecurityHeaders(headers) {
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com ${RAZORPAY_SOURCES}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https: http:",
      "font-src 'self' data:",
      `connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://4cntwh9o4m.execute-api.ap-south-1.amazonaws.com https://paduchuandham-uploads-474476202047.s3.ap-south-1.amazonaws.com ${RAZORPAY_SOURCES}`,
      "media-src 'self' blob:",
      `frame-src 'self' https://accounts.google.com ${RAZORPAY_SOURCES}`,
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  );
}

/** Stale hashed bundles removed from S3 — block CF edge cache serving old cross-origin API client. */
const STALE_ASSETS = new Set([
  '/assets/index-c0SKsICX.js',
  '/assets/index-Cq-Ck9sM.js',
  '/assets/index-C1_BliMs.js',
  '/assets/index-BzIWm9QA.js',
  '/assets/index-C8gipiOZ.js',
  // Cross-origin API Gateway client — breaks session cookies after Google OAuth
  '/assets/index-D1MmH86I.js',
]);

function proxyHeaders(request) {
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ray');
  headers.delete('cf-visitor');
  return headers;
}

async function fetchS3(path, search, method = 'GET') {
  const s3Url = `http://${S3_HOST}${path}${search}`;
  return fetch(s3Url, {
    method,
    headers: { Host: S3_HOST },
    redirect: 'follow',
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/uploads/')) {
      const s3Url = `https://${UPLOADS_S3_HOST}${url.pathname}`;
      const uploadResponse = await fetch(s3Url, {
        method: request.method,
        headers: { Accept: request.headers.get('Accept') || '*/*' },
      });
      const headers = new Headers(uploadResponse.headers);
      if (uploadResponse.ok) {
        headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      }
      return new Response(uploadResponse.body, { status: uploadResponse.status, headers });
    }

    if (url.pathname.startsWith('/api/')) {
      const cacheableGet = request.method === 'GET' && isEdgeCacheableApi(url.pathname);
      const cache = caches.default;

      if (cacheableGet) {
        const cached = await cache.match(request);
        if (cached) {
          const hitHeaders = new Headers(cached.headers);
          hitHeaders.set('X-Edge-Cache', 'HIT');
          return new Response(cached.body, { status: cached.status, headers: hitHeaders });
        }
      }

      const target = `${API_ORIGIN}${url.pathname}${url.search}`;
      const apiResponse = await fetch(target, {
        method: request.method,
        headers: proxyHeaders(request),
        body: request.body,
        redirect: 'manual',
      });

      const headers = new Headers(apiResponse.headers);
      // OAuth and presigned uploads must reach the browser as redirects, not proxied bodies.
      if (apiResponse.status >= 300 && apiResponse.status < 400) {
        return new Response(null, { status: apiResponse.status, headers });
      }

      if (cacheableGet && apiResponse.ok) {
        headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=600');
        headers.set('X-Edge-Cache', 'MISS');
        const response = new Response(apiResponse.body, { status: apiResponse.status, headers });
        ctx.waitUntil(cache.put(request, response.clone()));
        return response;
      }

      return new Response(apiResponse.body, { status: apiResponse.status, headers });
    }

    if (STALE_ASSETS.has(url.pathname)) {
      return new Response('Not found', {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    let response = await fetchS3(url.pathname, url.search, request.method);

    if (response.status === 404 && !url.pathname.includes('.')) {
      response = await fetchS3('/index.html', '');
    }

    if (url.pathname === '/index.html' || url.pathname.endsWith('.html') || (response.ok && !url.pathname.includes('.'))) {
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      applyHtmlSecurityHeaders(headers);
      return new Response(response.body, { status: response.status, headers });
    }

    if (response.ok && url.pathname.startsWith('/assets/')) {
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      return new Response(response.body, { status: response.status, headers });
    }

    return response;
  },
};
