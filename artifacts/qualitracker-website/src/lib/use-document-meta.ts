import { useEffect } from 'react';

const SITE_ORIGIN = 'https://qualitracker.com';

/**
 * Per-route <title>, meta description, canonical link, and Open Graph tags
 * for this SPA. index.html only ships one static set (fine for a single-page
 * site, a real SEO gap once the site became 8 routes) — this sets all of
 * them on mount without adding a head-management dependency the existing
 * stack doesn't need.
 *
 * `path` is the route's own absolute path (e.g. "/security") — used to build
 * a correct per-route canonical URL and og:url instead of every route
 * pointing back at the homepage, which is what index.html's static tags do
 * before this hook runs.
 */
export function useDocumentMeta(title: string, description: string, path: string = '/') {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const descTag = document.querySelector('meta[name="description"]');
    const previousDescription = descTag?.getAttribute('content') ?? '';
    descTag?.setAttribute('content', description);

    const canonicalUrl = `${SITE_ORIGIN}${path === '/' ? '/' : path}`;
    const canonicalTag = document.querySelector('link[rel="canonical"]');
    const previousCanonical = canonicalTag?.getAttribute('href') ?? '';
    canonicalTag?.setAttribute('href', canonicalUrl);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    const previousOgUrl = ogUrl?.getAttribute('content') ?? '';
    ogTitle?.setAttribute('content', title);
    ogDescription?.setAttribute('content', description);
    ogUrl?.setAttribute('content', canonicalUrl);

    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    twitterTitle?.setAttribute('content', title);
    twitterDescription?.setAttribute('content', description);

    return () => {
      document.title = previousTitle;
      descTag?.setAttribute('content', previousDescription);
      canonicalTag?.setAttribute('href', previousCanonical);
      ogUrl?.setAttribute('content', previousOgUrl);
    };
  }, [title, description, path]);
}

/**
 * Injects a page-specific JSON-LD structured-data block, removed on
 * unmount. Every field passed in must already be a real, established fact
 * elsewhere on the site — this hook doesn't validate that, the caller must.
 * The site-wide Organization schema lives statically in index.html since it
 * doesn't change per route; this is only for schemas specific to one page.
 */
export function useStructuredData(data: Record<string, unknown>) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [data]);
}
