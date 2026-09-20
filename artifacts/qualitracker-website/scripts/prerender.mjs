// Build-time static prerendering for the 8 real routes.
//
// This is a Vite SPA (React + wouter), not a framework with built-in SSR.
// A full server-rendering migration (Next.js/Remix/etc.) would be a much
// bigger architectural change than this site needs — it has a small, fixed
// set of routes and no per-request dynamic data (every page's content is
// either static copy or illustrative demo data). Build-time prerendering
// via a real headless browser gives every route its own fully-rendered
// static HTML file — correct <title>, meta description, canonical URL,
// Open Graph tags, and JSON-LD structured data baked in — without any of
// that architectural churn. (The same approach popularized by tools like
// react-snap; here it's a small script we own directly.)
//
// Runs after `vite build` (see package.json's `build` script). Requires
// puppeteer (devDependency) — its own Chromium is what actually renders
// each route, so framer-motion, IntersectionObserver, matchMedia, and
// everything else the app relies on behaves exactly as it would for a real
// visitor, unlike a Node-based renderToString approach which would need
// every browser-only API mocked or guarded.

import puppeteer from 'puppeteer';
import { preview } from 'vite';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// The site's own 8 real routes — see App.tsx's <Switch>. Kept as a literal
// list rather than derived from App.tsx to avoid this script depending on
// route internals; update both if a route is ever added or removed.
//
// "/" MUST be processed last. vite preview's SPA fallback serves
// dist/public/index.html for any unmatched path, and this script
// overwrites that same file with each route's captured snapshot as it
// goes. A real run of this script found the bug directly: prerendering "/"
// first baked its page-specific JSON-LD (from useStructuredData on the
// homepage) into index.html, and every subsequent route then inherited
// that stale script tag from the fallback shell it loaded — on top of its
// own, correct structured data, since document.head.appendChild has no way
// to know about a script tag that arrived via the static HTML rather than
// its own effect. Processing "/" last means every other route still sees
// the pristine, build-fresh index.html as its fallback shell.
const ROUTES = ['/product', '/solutions', '/docs', '/company', '/security', '/waitlist', '/talk-to-team', '/'];

const DEFAULT_TITLE = 'QualiTracker — Source-Cited AI Assistant & Digital QMS for Medical Laboratories';

async function main() {
  const server = await preview({
    configFile: join(ROOT, 'vite.config.ts'),
    preview: { port: 4321, host: '127.0.0.1', strictPort: false },
  });
  const base = server.resolvedUrls?.local?.[0];
  if (!base) throw new Error('Preview server did not report a local URL to prerender against.');
  const basePath = process.env.BASE_PATH || '/';
  const normalizedBasePath = `/${basePath.replace(/^\/+|\/+$/g, '')}`.replace(/^\/$/, '');

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const route of ROUTES) {
      // Vite serves project sites below their configured base path. Build the
      // browser URL from the preview origin so a route such as /product is
      // visited as /qualitrackerwebsite/product on GitHub Pages builds.
      const pathname = `${normalizedBasePath}${route}` || '/';
      const url = new URL(pathname, new URL(base).origin).toString();
      await page.goto(url, { waitUntil: 'networkidle0' });
      // Wait for the route's own useDocumentMeta effect to set a
      // route-specific title — the real signal that the lazy page chunk
      // mounted, not just App.tsx's brief RouteFallback spinner.
      await page
        .waitForFunction((fallback) => document.title !== fallback, { timeout: 10000 }, DEFAULT_TITLE)
        .catch(() => {});

      const html = await page.evaluate(() => '<!doctype html>\n' + document.documentElement.outerHTML);
      const outPath = route === '/' ? join(ROOT, 'dist/public/index.html') : join(ROOT, 'dist/public', route.slice(1), 'index.html');
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, html);
      console.log(`prerendered ${route.padEnd(16)} -> ${outPath.replace(ROOT + '/', '')} (${(html.length / 1024).toFixed(1)} KiB)`);
    }
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => server.httpServer.close((err) => (err ? reject(err) : resolve())));
  }
}

main().catch((err) => {
  console.error('Prerendering failed:', err);
  process.exit(1);
});
