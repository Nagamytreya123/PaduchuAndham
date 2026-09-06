/**
 * Lighthouse performance sweep for key customer routes.
 * Usage: node infra/lighthouse-ui.mjs [baseUrl]
 *
 * Requires: npm install -D playwright lighthouse chrome-launcher
 * First run: npx playwright install chromium
 */

import { chromium } from 'playwright';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const baseUrl = (process.argv[2] ?? 'http://localhost:5173').replace(/\/$/, '');

const routes = ['/', '/shop', '/login', '/products/6a8fe4b18123ca1b583d195f'];

async function runLighthouse(url) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox'] });
  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['performance'],
      logLevel: 'error',
    });
    const perf = result?.lhr?.categories?.performance;
    const audits = result?.lhr?.audits ?? {};
    return {
      score: perf?.score != null ? Math.round(perf.score * 100) : null,
      lcp: audits['largest-contentful-paint']?.displayValue ?? '—',
      ttfb: audits['server-response-time']?.displayValue ?? '—',
      cls: audits['cumulative-layout-shift']?.displayValue ?? '—',
    };
  } finally {
    await chrome.kill();
  }
}

async function main() {
  console.log(`UI Lighthouse sweep: ${baseUrl}\n`);

  // Warm SPA shell once (helps local dev).
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await browser.close();

  console.log(['Route', 'Score', 'LCP', 'TTFB', 'CLS'].join('\t'));
  for (const route of routes) {
    const url = `${baseUrl}${route}`;
    const row = await runLighthouse(url);
    console.log([route, row.score ?? '—', row.lcp, row.ttfb, row.cls].join('\t'));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
