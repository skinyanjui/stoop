import { useEffect } from 'react';
import type { LegalPageId } from './LegalDialog';
import type { Sale } from '../types/sale';
import { buildSeoMeta, buildStructuredData } from '../utils/seo';

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(id: string, payload: Record<string, unknown>): void {
  let el = document.head.querySelector<HTMLScriptElement>(`script#${id}[type="application/ld+json"]`);
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(payload);
}

export function SeoHead({
  selected,
  sales,
  legalPage,
}: {
  selected?: Sale | null;
  sales: Sale[];
  legalPage?: LegalPageId | null;
}) {
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const meta = buildSeoMeta({ selected, legalPage, origin, pathname });

    document.title = meta.title;
    upsertCanonical(meta.canonical);
    upsertMeta('name', 'description', meta.description);

    upsertMeta('property', 'og:type', meta.type);
    upsertMeta('property', 'og:title', meta.title);
    upsertMeta('property', 'og:description', meta.description);
    upsertMeta('property', 'og:url', meta.url);
    upsertMeta('property', 'og:image', meta.image);
    upsertMeta('property', 'og:image:alt', meta.imageAlt);

    upsertMeta('name', 'twitter:title', meta.title);
    upsertMeta('name', 'twitter:description', meta.description);
    upsertMeta('name', 'twitter:image', meta.image);
    upsertMeta('name', 'twitter:image:alt', meta.imageAlt);

    upsertJsonLd(
      'stoop-dynamic-jsonld',
      buildStructuredData({ selected, sales, origin, pathname }),
    );
  }, [selected, sales, legalPage]);

  return null;
}
