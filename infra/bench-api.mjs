#!/usr/bin/env node
/**
 * Quick API latency sweep for public GET endpoints.
 * Usage: node infra/bench-api.mjs [baseUrl]
 * Example: node infra/bench-api.mjs https://www.paduchuandham.com
 */

const baseUrl = (process.argv[2] ?? 'http://localhost:4000').replace(/\/$/, '');

const endpoints = [
  '/api/health',
  '/api/categories',
  '/api/products?limit=24',
  '/api/site-settings',
  '/api/jewellery-combos',
];

const runs = Number(process.env.BENCH_RUNS ?? 5);

function percentile(sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function timedFetch(path) {
  const url = `${baseUrl}${path}`;
  const start = performance.now();
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const elapsed = performance.now() - start;
  const cache = res.headers.get('x-cache');
  return { status: res.status, ms: elapsed, cache };
}

async function benchEndpoint(path) {
  const samples = [];
  for (let i = 0; i < runs; i += 1) {
    samples.push(await timedFetch(path));
  }
  const ok = samples.filter((s) => s.status >= 200 && s.status < 300);
  const times = ok.map((s) => s.ms).sort((a, b) => a - b);
  const last = samples[samples.length - 1];
  return {
    path,
    status: last?.status ?? 0,
    cache: last?.cache ?? null,
    p50: times.length ? percentile(times, 50) : null,
    p95: times.length ? percentile(times, 95) : null,
    errors: samples.length - ok.length,
  };
}

async function main() {
  console.log(`Benchmarking ${baseUrl} (${runs} runs per endpoint)\n`);
  const rows = [];
  for (const path of endpoints) {
    rows.push(await benchEndpoint(path));
  }

  const header = ['Endpoint', 'Status', 'p50 ms', 'p95 ms', 'X-Cache', 'Errors'];
  console.log(header.join('\t'));
  for (const row of rows) {
    console.log(
      [
        row.path,
        row.status,
        row.p50 != null ? row.p50.toFixed(1) : '—',
        row.p95 != null ? row.p95.toFixed(1) : '—',
        row.cache ?? '—',
        row.errors,
      ].join('\t'),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
