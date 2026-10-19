import fs from 'node:fs';
import path from 'path';
import type { Connect, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import { visualizer } from 'rollup-plugin-visualizer';

const rawPort = process.env.PORT || '5000';
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || '/';

// `vite preview`'s default (appType: 'spa') behavior is to fall back to the
// root dist/public/index.html for ANY request path that doesn't exactly
// match a file on disk — including e.g. /security, even though this project
// now writes a real, fully-prerendered dist/public/security/index.html at
// build time (see scripts/prerender.mjs). That blanket fallback means
// `pnpm run serve` (and anyone using it to sanity-check the production build
// locally, e.g. for Lighthouse) silently gets served the homepage's content
// for every route except "/", misrepresenting what real static hosts
// (Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3) actually do — they
// perform standard directory+index.html resolution instead.
//
// Fixing this needs two pieces, both scoped ONLY to the standalone
// `pnpm run serve` preview server via the VITE_STATIC_PREVIEW env var it
// sets (see the "serve" script below) — never to `vite dev`, and NOT to
// scripts/prerender.mjs's own internal `preview()` call (which intentionally
// has no env var set and must keep the default SPA fallback: it renders
// routes in sequence and relies on the fallback to bootstrap the client app
// for routes whose own dist/public/<route>/index.html doesn't exist yet):
//
// 1. appType: 'mpa' disables that blanket index.html fallback, so a
//    genuinely unknown path now correctly 404s instead of silently serving
//    the homepage.
// 2. But 'mpa' alone isn't enough: Vite's built-in html-fallback middleware
//    only resolves a directory's index.html for URLs that already end in
//    "/" (e.g. /security/) — it does NOT try "<path>/index.html" for a
//    trailing-slash-less URL (e.g. /security), which is the URL format used
//    everywhere on this site. The staticPrerenderedRoutes() plugin below
//    closes that gap: for any extensionless, non-trailing-slash request, if
//    "<outDir>/<path>/index.html" exists it rewrites the request to that
//    file before Vite's own middleware run, so /security is served the same
//    prerendered file /security/ would be.
const isStaticPreviewServer = () => process.env.VITE_STATIC_PREVIEW === 'true';

function staticPrerenderedRoutes(outDir: string): Plugin {
  return {
    name: 'qualitracker:static-prerendered-routes',
    configurePreviewServer(server) {
      const middleware: Connect.NextHandleFunction = (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();

        const rawUrl = req.url ?? '/';
        const queryIndex = rawUrl.indexOf('?');
        const rawPathname = queryIndex === -1 ? rawUrl : rawUrl.slice(0, queryIndex);
        const search = queryIndex === -1 ? '' : rawUrl.slice(queryIndex);

        let pathname: string;
        try {
          pathname = decodeURIComponent(rawPathname);
        } catch {
          return next();
        }

        // Already a directory URL, already an explicit .html request, or has
        // some other extension (an asset) — nothing for us to resolve.
        if (pathname === '/' || pathname.endsWith('/') || path.extname(pathname) !== '') {
          return next();
        }

        // Resolve defensively within outDir before touching the filesystem —
        // decodeURIComponent can smuggle "../" segments.
        const resolvedDir = path.resolve(outDir, `.${pathname}`);
        if (resolvedDir !== outDir && !resolvedDir.startsWith(outDir + path.sep)) {
          return next();
        }

        const indexPath = path.join(resolvedDir, 'index.html');
        if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
          req.url = `${pathname}/index.html${search}`;
        }
        next();
      };
      // Register before Vite's own preview middleware (sirv + html-fallback)
      // so our rewrite happens first.
      server.middlewares.use(middleware);
    },
  };
}

const outDir = path.resolve(import.meta.dirname, 'dist/public');

export default defineConfig(async ({ isPreview }) => {
  const staticPreview = isPreview && isStaticPreviewServer();

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      ...(process.env.ANALYZE === 'true'
        ? [
            visualizer({
              filename: path.resolve(import.meta.dirname, 'dist/bundle-analysis.html'),
              gzipSize: true,
              brotliSize: true,
              template: 'treemap',
            }),
          ]
        : []),
      ...(staticPreview ? [staticPrerenderedRoutes(outDir)] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir,
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: true,
      fs: {
        strict: true,
      },
    },
    preview: {
      port,
      host: '0.0.0.0',
      allowedHosts: true,
    },
    // Only ever 'mpa' for the dedicated static-preview server (pnpm run
    // serve, via VITE_STATIC_PREVIEW=true) — never for `vite dev` (no
    // prerendered files exist yet; SPA fallback is required for direct
    // navigation to a client-side route) and never for prerender.mjs's own
    // internal preview() call (same reason, mid-run).
    appType: staticPreview ? 'mpa' : 'spa',
  };
});
