import type { LegalPageId } from '../components/LegalDialog';
import type { Sale } from '../types/sale';

export const DEFAULT_SEO = {
  siteName: 'Stoop',
  title: 'Stoop — Garage Sales, Yard Sales & Flea Markets Near You',
  description:
    'Find garage sales, yard sales, car boot sales and flea markets near you on a map. Search by item, see hours, save favorites, and post your own sale.',
  imagePath: '/src/assets/images/garage_sale_driveway_1795014651799.jpg',
  imageAlt: 'Neighborhood driveway garage sale table with household goods and finds',
} as const;

const LEGAL_PAGE_META: Record<LegalPageId, { title: string; description: string }> = {
  terms: {
    title: 'Terms & Conditions — Stoop',
    description:
      'Review Stoop terms of use, seller responsibilities, local permit guidance, DMCA takedown procedures, and safety policies.',
  },
  privacy: {
    title: 'Privacy Policy — Stoop',
    description:
      'Learn how Stoop handles location lookups, browser storage, Google sign-in profiles, and public sale listings with zero ad trackers.',
  },
  prohibited: {
    title: 'Prohibited Items Policy — Stoop',
    description:
      'See which recalled, unsafe, regulated, or restricted goods are prohibited from Stoop garage sale and flea market listings.',
  },
  guidelines: {
    title: 'Safety & Community Guidelines — Stoop',
    description:
      'Practical driveway safety, cash-handling, permit, and neighborly etiquette guidelines for Stoop hosts and shoppers.',
  },
  contact: {
    title: 'Contact & Listing Support — Stoop',
    description:
      'Reach Stoop support to report an inaccurate pin or prohibited listing, request data deletion, or ask about local sponsorships.',
  },
};

export interface SeoMetaState {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  url: string;
  canonical: string;
  type: 'website' | 'article';
}

export function resolveOriginUrl(pathOrUrl: string, origin?: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const cleanOrigin = (origin || '').replace(/\/+$/, '');
  if (!cleanOrigin) return pathOrUrl;
  const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${cleanOrigin}${cleanPath}`;
}

export function toIsoDateTime(date: string, time: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const hhmm = /^\d{2}:\d{2}$/.test(time) ? time : '08:00';
  return `${date}T${hhmm}:00`;
}

export function pickSaleOgImage(sale: Sale | null | undefined, origin?: string): string {
  const firstHttps = sale?.photos?.find(
    (p) => typeof p === 'string' && /^https:\/\//i.test(p),
  );
  if (firstHttps) return firstHttps;
  return resolveOriginUrl(DEFAULT_SEO.imagePath, origin);
}

export function buildSeoMeta({
  selected,
  legalPage,
  origin = '',
  pathname = '/',
}: {
  selected?: Sale | null;
  legalPage?: LegalPageId | null;
  origin?: string;
  pathname?: string;
}): SeoMetaState {
  const base = resolveOriginUrl(pathname || '/', origin);

  if (legalPage && LEGAL_PAGE_META[legalPage]) {
    const info = LEGAL_PAGE_META[legalPage];
    return {
      title: info.title,
      description: info.description,
      image: resolveOriginUrl(DEFAULT_SEO.imagePath, origin),
      imageAlt: DEFAULT_SEO.imageAlt,
      url: base,
      canonical: base,
      type: 'website',
    };
  }

  if (selected) {
    const saleType = selected.saleType || 'Garage Sale';
    const itemsPreview =
      selected.items && selected.items.length
        ? ` Featuring ${selected.items.slice(0, 4).join(', ')}.`
        : '';
    const desc = `${saleType} on ${selected.date} (${selected.start}–${selected.end}) at ${selected.address}.${itemsPreview}`.slice(
      0,
      160,
    );
    return {
      title: `${selected.title} — ${saleType} | Stoop`.slice(0, 70),
      description: desc,
      image: pickSaleOgImage(selected, origin),
      imageAlt: `${selected.title} — ${saleType} at ${selected.address}`,
      url: base,
      canonical: base,
      type: 'website',
    };
  }

  return {
    title: DEFAULT_SEO.title,
    description: DEFAULT_SEO.description,
    image: resolveOriginUrl(DEFAULT_SEO.imagePath, origin),
    imageAlt: DEFAULT_SEO.imageAlt,
    url: base,
    canonical: base,
    type: 'website',
  };
}

export function buildSaleJsonLd(sale: Sale, origin = ''): Record<string, unknown> {
  const startDate = toIsoDateTime(sale.date, sale.start) || sale.date;
  const endDate = toIsoDateTime(sale.date, sale.end) || sale.date;
  const streetPart = sale.address.split(',')[0]?.trim() || sale.address;

  return {
    '@type': 'Event',
    '@id': resolveOriginUrl(`#${encodeURIComponent(sale.id)}`, origin),
    name: sale.title,
    description:
      sale.desc ||
      `${sale.saleType || 'Garage Sale'} at ${sale.address} featuring ${(sale.items && sale.items.length ? sale.items : sale.cats).slice(0, 5).join(', ')}.`,
    startDate,
    endDate,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    isAccessibleForFree: true,
    image: pickSaleOgImage(sale, origin),
    location: {
      '@type': 'Place',
      name: streetPart,
      address: sale.address,
      geo: {
        '@type': 'GeoCoordinates',
        latitude: sale.lat,
        longitude: sale.lng,
      },
    },
  };
}

export function buildStructuredData({
  selected,
  sales,
  origin = '',
  pathname = '/',
}: {
  selected?: Sale | null;
  sales: Sale[];
  origin?: string;
  pathname?: string;
}): Record<string, unknown> {
  const appUrl = resolveOriginUrl(pathname || '/', origin);
  const webAppNode = {
    '@type': 'WebApplication',
    name: DEFAULT_SEO.siteName,
    url: appUrl,
    applicationCategory: 'ShoppingApplication',
    operatingSystem: 'All',
    description: DEFAULT_SEO.description,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  if (selected) {
    return {
      '@context': 'https://schema.org',
      '@graph': [webAppNode, buildSaleJsonLd(selected, origin)],
    };
  }

  const featured = sales.slice(0, 20);
  const listNode = {
    '@type': 'ItemList',
    name: 'Upcoming Garage Sales, Yard Sales & Flea Markets',
    numberOfItems: featured.length,
    itemListElement: featured.map((s, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: buildSaleJsonLd(s, origin),
    })),
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [webAppNode, listNode],
  };
}
